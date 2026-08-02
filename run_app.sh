#!/bin/bash

# Terminate all background processes if the main script is interrupted or exits
trap 'echo "🛑 Stopping all services..."; kill $(jobs -p) 2>/dev/null' EXIT

echo "=================================================="
echo "🌱 AgriVision Neural Crop & Fruit Classifier"
echo "=================================================="

# Get the directory of the current script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 1. Start Backend FastAPI Server
echo "🚀 Starting FastAPI Backend on http://localhost:8000..."
cd "$SCRIPT_DIR/backend"
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found in backend/. Run setup first."
    exit 1
fi
source venv/bin/activate
# Run uvicorn in background
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 2. Start Frontend Vite Server
echo "🚀 Starting Vite React Frontend on http://localhost:3005..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "❌ Node modules not found in frontend/. Run npm install first."
    exit 1
fi
# Run dev server in background
npm run dev -- --port 3005 &
FRONTEND_PID=$!

echo "--------------------------------------------------"
echo "✅ AgriVision is running!"
echo "   - Frontend: http://localhost:3005"
echo "   - Backend API Docs: http://localhost:8000/docs"
echo "Press Ctrl+C to terminate both servers."
echo "--------------------------------------------------"

# Keep script running and wait for background jobs
wait
