#!/bin/bash

set -e

line="============================================================"
echo "$line"
echo "  BC Cancer Foundation - Donor Management CRM"
echo "  Starting the application..."
echo "$line"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "[ERR] Node.js is not installed. Install Node.js v18 or later and retry."
  exit 1
fi

echo "[OK] Node.js version: $(node --version)"
echo ""

if [ ! -d "backend/node_modules" ]; then
  echo "[INFO] Installing backend dependencies..."
  pushd backend >/dev/null
  npm install
  popd >/dev/null
  echo ""
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "[INFO] Installing frontend dependencies..."
  pushd frontend >/dev/null
  npm install --legacy-peer-deps
  popd >/dev/null
  echo ""
fi

echo "[RUN] Starting backend server..."
pushd backend >/dev/null
npm start &
BACKEND_PID=$!
popd >/dev/null

echo "[INFO] Waiting for backend to start..."
sleep 8

echo "[RUN] Starting frontend server..."
pushd frontend >/dev/null
npm run dev -- --host --port 3000 &
FRONTEND_PID=$!
popd >/dev/null

echo ""
echo "$line"
echo "  Application is running!"
echo "$line"
echo "  Backend API:  http://localhost:3001"
echo "  Frontend:     http://localhost:3000"
echo "  API Docs:     http://localhost:3001/api/docs"
echo ""
echo "  Demo Credentials:"
echo "    Admin:   admin / password123"
echo "    Manager: manager / password123"
echo "    Staff:   staff / password123"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "$line"
echo ""

wait $BACKEND_PID $FRONTEND_PID
