#!/bin/bash

echo "🧬 Prairie Genomics Suite - Easy Launcher"
echo "========================================="

# Navigate to the app directory
cd "$(dirname "$0")"

# Check if streamlit_app.py exists
if [ ! -f "streamlit_app.py" ]; then
    echo "❌ Error: streamlit_app.py not found!"
    exit 1
fi

# Kill any existing streamlit processes
pkill -f streamlit 2>/dev/null

# Start the application
echo "🚀 Starting Prairie Genomics Suite..."
echo "⏳ Please wait..."

# Use system python to run streamlit
/usr/bin/python3 -m streamlit run streamlit_app.py --server.port 8508 --server.address localhost &

# Wait for server to start
sleep 5

# Open in browser
echo "🌐 Opening in browser..."
open http://localhost:8508

echo "✅ Prairie Genomics Suite is running!"
echo "📍 URL: http://localhost:8508"
echo ""
echo "If it doesn't open automatically, copy and paste this URL:"
echo "http://localhost:8508"
echo ""
echo "🛑 To stop: Press Ctrl+C in this terminal"

# Keep script running
wait