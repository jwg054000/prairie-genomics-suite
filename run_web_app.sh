#!/bin/bash
# 🧬 Prairie Genomics Suite - Mac/Linux Launcher
# Double-click this file to run the web application on Mac/Linux

echo "🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬"
echo "🚀 PRAIRIE GENOMICS SUITE - WEB LAUNCHER"
echo "🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬🧬"
echo "Making genomics analysis accessible to every researcher!"
echo ""

echo "📦 Checking Python installation..."

# Check if python3 is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    echo "✅ Python3 found!"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    echo "✅ Python found!"
else
    echo "❌ Python is not installed"
    echo ""
    echo "Please install Python from https://python.org/downloads"
    echo "Or on Mac with Homebrew: brew install python3"
    echo "Or on Linux: sudo apt install python3 python3-pip"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(${PYTHON_CMD} -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "Python version: ${PYTHON_VERSION}"
echo ""

echo "🚀 Starting Prairie Genomics Suite..."
echo ""
echo "📝 Instructions:"
echo "1. Wait for the app to start (may take 30-60 seconds)"
echo "2. Your web browser will open automatically"
echo "3. If browser doesn't open, go to: http://localhost:8501"
echo "4. Keep this terminal window open while using the app"
echo "5. Press Ctrl+C here to stop the app"
echo ""
echo "🌐 Loading web application..."
echo "============================================"

# Navigate to the directory containing this script
cd "$(dirname "$0")"

# Run the launcher
${PYTHON_CMD} run_web_app.py

echo ""
echo "👋 Thanks for using Prairie Genomics Suite!"
echo "🧬 Making genomics analysis accessible to every researcher!"