#!/bin/bash
echo "============================================================"
echo "  AttendAI v2.0 — Setup  (Python 3.12+ / 3.14 compatible)"
echo "============================================================"
echo ""

echo "[1/3] Setting up Python backend..."
cd backend
python3 -m venv venv
source venv/bin/activate

echo "Installing Python packages (no dlib/cmake needed!)..."
pip install --upgrade pip
pip install flask==3.1.0 flask-cors==5.0.0 numpy==2.1.0 opencv-contrib-python==4.10.0.84 Pillow==10.4.0

echo ""
echo "[2/3] Setting up React frontend..."
cd ../frontend
npm install

echo ""
echo "[3/3] Done!"
echo ""
echo "============================================================"
echo "  HOW TO RUN:"
echo "  Terminal 1 (Backend):"
echo "    cd backend && source venv/bin/activate && python app.py"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && npm start"
echo ""
echo "  Open: http://localhost:3000"
echo ""
echo "  Student URL : http://localhost:3000/"
echo "  Admin Login : http://localhost:3000/admin/login"
echo "  Credentials : admin / admin123"
echo "============================================================"
