@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Online Library System Setup ^& Seeding Script
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/6] Configuring environment (.env) files...
if not exist "%~dp0backend\.env" (
    if exist "%~dp0backend\.env.example" (
        copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
        echo ✓ Created backend\.env from .env.example
    ) else (
        echo [WARNING] backend\.env.example not found.
    )
) else (
    echo - backend\.env already exists.
)

if not exist "%~dp0frontend\.env" (
    if exist "%~dp0frontend\.env.example" (
        copy "%~dp0frontend\.env.example" "%~dp0frontend\.env" >nul
        echo ✓ Created frontend\.env from .env.example
    ) else (
        echo [WARNING] frontend\.env.example not found.
    )
) else (
    echo - frontend\.env already exists.
)
echo.

echo [2/6] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend npm install failed.
    pause
    exit /b %errorlevel%
)
echo ✓ Backend dependencies installed.
echo.

echo [3/6] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend npm install failed.
    pause
    exit /b %errorlevel%
)
echo ✓ Frontend dependencies installed.
echo.

echo [4/6] Seeding books into MongoDB...
cd /d "%~dp0backend"
call node seed-books.js
if %errorlevel% neq 0 (
    echo [WARNING] Book seeding encountered an issue. Please verify MongoDB is running.
) else (
    echo ✓ Books seeded successfully.
)
echo.

echo [5/6] Seeding users with password: 1234
echo   - Seeding admin...
call node seed.js admin 1234 admin

echo   - Seeding student1...
call node seed.js student1 1234 student

echo   - Seeding student2...
call node seed.js student2 1234 student

echo   - Seeding library...
call node seed.js library 1234 library
echo.

echo ===================================================
echo   Setup ^& Seeding Complete!
echo.
echo   Created Users (Password: 1234):
echo     - admin    (Role: admin)
echo     - student1 (Role: student)
echo     - student2 (Role: student)
echo     - library  (Role: library)
echo ===================================================
echo.
pause
