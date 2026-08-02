# 🌱 AgriVision | AI Fruit & Crop Classifier

A modern, full-stack neural web application designed to classify fruits and crops from images. Powered by a pre-trained **PyTorch ResNet-18 model** and **FastAPI**, featuring a premium glassmorphic dark-mode **React** interface.

---

## 🛠️ Built With

Here is the tech stack and tools used to build AgriVision:

[![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=for-the-badge&logo=PyTorch&logoColor=white)](https://pytorch.org/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Railway](https://img.shields.io/badge/Railway-%23130B21.svg?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)
[![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)](https://github.com/)

---

## ✨ Features

- 🧠 **Neural Classification**: Loads a PyTorch ResNet-18 model to predict the top category and outputs the top 5 alternative classes with visual probability meters.
- ⚡ **Real-Time Inference**: Processes uploaded images under 1 second (resizing to 256, center-cropping to 224, and normalizing to ImageNet standards).
- 📁 **Drag-and-Drop Dropzone**: Sleek React file upload region with interactive hover animations.
- 💾 **Persistent Prediction Logs**: Stores prediction records, timestamps, and thumbnails locally using a SQLite database backed by persistent volume mounting on Railway.
- 🎨 **Premium Glassmorphic UI**: High-end dark theme containing blurred overlay cards, SVG circular progress badge meters, and custom responsive viewport styling.
- 🔄 **Logs Audit Viewer**: Clicking on any historical scan list item instantly reloads the image and classifications into the main terminal for audit review.

---

## 📐 Architecture

```mermaid
graph TD
    A[Frontend: Vite + React] -- "1. Upload Image (POST /api/predict)" --> B[Backend: FastAPI]
    B -- "2. Preprocess Image (224x224, Normalize)" --> C[PyTorch Model (ResNet-18)]
    C -- "3. Perform Inference" --> B
    B -- "4. Save Record" --> D[(SQLite Database)]
    B -- "5. Return JSON (Top 5 + confidence)" --> A
    A -- "Get History (GET /api/history)" --> B
    B -- "Query Records" --> D
```

---

## 📂 Project Structure

```text
AgriVision/
├── backend/
│   ├── main.py              # FastAPI server, API routes, DB setup, PyTorch model loading
│   ├── requirements.txt     # Python backend dependencies
│   └── test_backend.py      # Automated unittest suites (TestClient image mock tests)
├── frontend/
│   ├── public/
│   │   ├── favicon.svg      # Custom brand favicon logo
│   │   └── icons.svg        # Lucide vector sprite assets
│   ├── src/
│   │   ├── App.css          # CSS styles for widgets, dropzone, meters, history logs
│   │   ├── App.jsx          # Main React component, state, drag-drop, fetch requests
│   │   ├── index.css        # Global CSS stylesheet, Outfit typography, gradients
│   │   └── main.jsx         # React root bootstrapping
│   ├── index.html           # HTML wrapper template
│   ├── vite.config.js       # Vite bundler parameters
│   └── package.json         # Node.js frontend manifest & dependencies
└── run_app.sh               # Unified bash script to run full-stack concurrently
```

---

## 🚀 Local Installation & Run

Make sure you have **Python 3.9+** and **Node.js 18+** installed.

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/HiNacho/AgriVision.git
   cd AgriVision
   ```

2. **Initialize Backend Environment**:
   Create a virtual environment inside the `backend` folder and install dependencies:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cd ..
   ```

3. **Initialize Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Launch the Application**:
   Run the unified startup script from the root folder:
   ```bash
   ./run_app.sh
   ```
   Access the web app at **[http://localhost:3005](http://localhost:3005)** and view backend API documentation at **[http://localhost:8000/docs](http://localhost:8000/docs)**.

---

## ☁️ Deployment

### 1. Frontend (Vercel)
- Set **Root Directory** to `frontend`.
- Set Environment Variable:
  - `VITE_API_URL` = `https://your-railway-url.up.railway.app` *(no trailing slash, no `/api`)*

### 2. Backend (Railway)
- Set **Root Directory** to `backend`.
- Add a **Volume** mounted at `/app/data` to persist your SQLite history database.
- Set Environment Variables:
  - `DATABASE_PATH` = `/app/data/history.db`
- Set **Start Command** to: `uvicorn main:app --host 0.0.0.0 --port $PORT`
