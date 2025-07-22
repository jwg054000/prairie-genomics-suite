@echo off
REM 🧬 Prairie Genomics Suite - Windows Launcher
REM Double-click this file to run the web application on Windows

echo.
echo 🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬
echo 🚀 PRAIRIE GENOMICS SUITE - WEB LAUNCHER
echo 🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬
echo Making genomics analysis accessible to every researcher!
echo.

echo 📦 Checking Python installation...

REM Check if python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo.
    echo Please install Python from https://python.org/downloads
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo ✅ Python found!
echo.

echo 🚀 Starting Prairie Genomics Suite...
echo.
echo 📝 Instructions:
echo 1. Wait for the app to start (may take 30-60 seconds)
echo 2. Your web browser will open automatically
echo 3. If browser doesn't open, go to: http://localhost:8501
echo 4. Keep this window open while using the app
echo.
echo 🌐 Loading web application...
echo ============================================

python run_web_app.py

echo.
echo 👋 Thanks for using Prairie Genomics Suite!
echo 🧬 Making genomics analysis accessible to every researcher!
pause