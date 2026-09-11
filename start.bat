@echo off
TITLE GeoVerse Launcher
echo ==========================================
echo         GeoVerse Startup Script
echo ==========================================

echo.
echo [1/3] Starting PostgreSQL + PostGIS Database via Docker...
docker-compose up -d

echo.
echo [2/3] Starting FastAPI Backend...
:: Open a new command prompt window, activate the virtual environment, and start the backend
start "GeoVerse Backend" cmd /k "cd backend && .\venv\Scripts\activate && uvicorn main:app --reload"

echo.
echo [3/3] Starting React Frontend...
:: Open a new command prompt window and start the frontend
start "GeoVerse Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo GeoVerse is starting! 
echo Keep the new terminal windows open.
echo.
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:8000
echo ==========================================
pause
