@echo off
setlocal

echo ===================================================
echo   Starting Online Library System
echo ===================================================
echo.

cd /d "%~dp0"

echo Starting Backend server (npm run dev)...
start "Library Backend (Port 3000)" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo Starting Frontend server (npm run dev)...
start "Library Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ===================================================
echo   Both servers launched in separate windows!
echo   - Backend:  http://localhost:3000
echo   - Frontend: http://localhost:5173
echo ===================================================
echo.
