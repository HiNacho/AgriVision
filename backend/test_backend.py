import io
import json
import unittest
from fastapi.testclient import TestClient
from PIL import Image

# Import the FastAPI app from app.py
from main import app, DB_PATH

class TestAgriVisionBackend(unittest.TestCase):
    def setUp(self):
        # Create a TestClient instance
        self.client = TestClient(app)
        
    def create_dummy_image(self) -> bytes:
        # Create a simple green image in memory to simulate a Granny Smith apple
        img = Image.new('RGB', (256, 256), color='green')
        byte_arr = io.BytesIO()
        img.save(byte_arr, format='JPEG')
        return byte_arr.getvalue()

    def test_predict_endpoint(self):
        # 1. Create a dummy image
        image_bytes = self.create_dummy_image()
        
        # 2. Call the prediction API with the image payload
        response = self.client.post(
            "/api/predict",
            files={"file": ("test_apple.jpg", image_bytes, "image/jpeg")}
        )
        
        # 3. Assert response is successful
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("prediction", data)
        self.assertIn("confidence", data)
        self.assertEqual(len(data["top_5"]), 5)
        print(f"✅ Prediction Test Succeeded! Top Category: '{data['prediction']}' (Confidence: {data['confidence']:.2%})")

    def test_history_endpoints(self):
        # 1. First, call predict to ensure there is at least one item in the database
        image_bytes = self.create_dummy_image()
        self.client.post(
            "/api/predict",
            files={"file": ("test_history.jpg", image_bytes, "image/jpeg")}
        )
        
        # 2. Get the history log
        response = self.client.get("/api/history")
        self.assertEqual(response.status_code, 200)
        history_list = response.json()
        self.assertGreater(len(history_list), 0)
        
        # Verify schema
        first_item = history_list[0]
        self.assertIn("id", first_item)
        self.assertIn("filename", first_item)
        self.assertIn("prediction", first_item)
        self.assertIn("confidence", first_item)
        self.assertIn("top_5", first_item)
        self.assertIn("image_base64", first_item)
        self.assertIn("timestamp", first_item)
        print(f"✅ History Fetch Test Succeeded! Retrieved {len(history_list)} records from database.")
        
        # 3. Test clear history endpoint
        clear_response = self.client.post("/api/history/clear")
        self.assertEqual(clear_response.status_code, 200)
        clear_data = clear_response.json()
        self.assertTrue(clear_data["success"])
        
        # 4. History log should now be empty
        empty_history_response = self.client.get("/api/history")
        self.assertEqual(len(empty_history_response.json()), 0)
        print("✅ History Clear Test Succeeded! Database reset successfully.")

if __name__ == "__main__":
    unittest.main()
