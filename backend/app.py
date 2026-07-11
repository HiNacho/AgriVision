import io
import os
import json
import base64
import sqlite3
import urllib.request
from datetime import datetime
from typing import List, Dict, Any

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

import torch
import torchvision.models as models
import torchvision.transforms as transforms

# Define FastAPI app
app = FastAPI(title="AgriVision Fruit Classifier API")

# Enable CORS for cross-origin development (Vite frontend on different port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "history.db"

# ----------------- Database Setup -----------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            prediction TEXT,
            confidence REAL,
            top_5 TEXT,
            image_base64 TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ----------------- Model Loading & Labels -----------------
print("🚀 Loading pre-trained ResNet-18 model...")
device = torch.device("cpu")

# Load model weights dynamically with standard fallbacks
categories = []
try:
    from torchvision.models import ResNet18_Weights
    model = models.resnet18(weights=ResNet18_Weights.DEFAULT)
    categories = ResNet18_Weights.DEFAULT.meta["categories"]
    print("✅ Model loaded successfully using modern ResNet18_Weights.")
except Exception as e:
    print(f"⚠️ Could not load modern weights ({e}). Falling back to legacy pretrained=True.")
    try:
        model = models.resnet18(pretrained=True)
        # Download standard ImageNet labels as fallback
        url = "https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt"
        with urllib.request.urlopen(url) as response:
            categories = [line.decode("utf-8").strip() for line in response.readlines()]
        print("✅ Model loaded successfully with downloaded ImageNet labels.")
    except Exception as ex:
        print(f"❌ Failed to load fallback model ({ex}). Initializing un-trained ResNet18.")
        model = models.resnet18()
        categories = [f"Class {i}" for i in range(1000)]

model.eval()

# ----------------- Image Preprocessing -----------------
# Preprocessing pipeline matching ResNet-18 ImageNet requirements
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# Utility to clean ImageNet category names for prettier display
# e.g., "Granny Smith" -> "Granny Smith Apple" or just cleaner title case
def clean_class_name(name: str) -> str:
    # Capitalize words
    name = name.replace("_", " ").title()
    # Simple maps to make fruit names sound more natural
    if "banana" in name.lower() and "banana" == name.lower():
        return "Banana"
    return name

# ----------------- Request/Response Schemas -----------------
class PredictionResult(BaseModel):
    class_name: str
    confidence: float

class PredictResponse(BaseModel):
    success: bool
    prediction: str
    confidence: float
    top_5: List[PredictionResult]
    filename: str

class HistoryItem(BaseModel):
    id: int
    filename: str
    prediction: str
    confidence: float
    top_5: List[PredictionResult]
    image_base64: str
    timestamp: str

# ----------------- Routes -----------------

@app.post("/api/predict", response_model=PredictResponse)
async def predict_image(file: UploadFile = File(...)):
    try:
        # 1. Read uploaded file bytes
        image_bytes = await file.read()
        
        # Convert to Base64 to store in history database
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")
        mime_type = file.content_type or "image/jpeg"
        image_base64 = f"data:{mime_type};base64,{encoded_image}"
        
        # 2. Open image in PIL
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PNG/RGBA/etc. to standard 3-channel RGB for ResNet
        if image.mode != "RGB":
            image = image.convert("RGB")
            
        # 3. Apply ImageNet standard preprocessing
        input_tensor = preprocess(image)
        input_batch = input_tensor.unsqueeze(0) # add batch size dimension [1, 3, 224, 224]
        
        # 4. Perform Inference (no gradients needed)
        with torch.no_grad():
            output = model(input_batch)
            
        # 5. Apply Softmax to get class probabilities
        probabilities = torch.nn.functional.softmax(output[0], dim=0)
        
        # 6. Retrieve top 5 predictions
        top5_prob, top5_catid = torch.topk(probabilities, 5)
        
        predictions_list = []
        for i in range(top5_prob.size(0)):
            cat_idx = top5_catid[i].item()
            raw_name = categories[cat_idx] if cat_idx < len(categories) else f"Class {cat_idx}"
            clean_name = clean_class_name(raw_name)
            prob = top5_prob[i].item()
            predictions_list.append(PredictionResult(class_name=clean_name, confidence=prob))
            
        # Extract main prediction
        main_prediction = predictions_list[0].class_name
        main_confidence = predictions_list[0].confidence
        
        # 7. Log to SQLite database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO history (filename, prediction, confidence, top_5, image_base64)
            VALUES (?, ?, ?, ?, ?)
            """,
            (file.filename, main_prediction, main_confidence, json.dumps([p.dict() for p in predictions_list]), image_base64)
        )
        conn.commit()
        conn.close()
        
        return PredictResponse(
            success=True,
            prediction=main_prediction,
            confidence=main_confidence,
            top_5=predictions_list,
            filename=file.filename
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prediction Error: {str(e)}")

@app.get("/api/history", response_model=List[HistoryItem])
async def get_history():
    try:
        conn = sqlite3.connect(DB_PATH)
        # Use Row factory to load columns as dictionaries
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, filename, prediction, confidence, top_5, image_base64, timestamp FROM history ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        conn.close()
        
        history_list = []
        for row in rows:
            # Parse the top_5 JSON list
            top_5_raw = json.loads(row["top_5"])
            top_5_parsed = [PredictionResult(**p) for p in top_5_raw]
            
            history_list.append(HistoryItem(
                id=row["id"],
                filename=row["filename"],
                prediction=row["prediction"],
                confidence=row["confidence"],
                top_5=top_5_parsed,
                image_base64=row["image_base64"],
                timestamp=row["timestamp"]
            ))
            
        return history_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@app.post("/api/history/clear")
async def clear_history():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM history")
        conn.commit()
        conn.close()
        return {"success": True, "message": "History cleared successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear history: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
