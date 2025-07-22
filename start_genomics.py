#!/usr/bin/env python3
"""
Simple script to run the Prairie Genomics Suite reliably
"""
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

def run_streamlit():
    print("🧬 Starting Prairie Genomics Suite...")
    print("=" * 50)
    
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    app_file = script_dir / "streamlit_app.py"
    
    if not app_file.exists():
        print("❌ Error: streamlit_app.py not found!")
        return
    
    # Start Streamlit
    cmd = [
        sys.executable, "-m", "streamlit", "run", 
        str(app_file),
        "--server.port", "8507",
        "--server.address", "localhost",
        "--browser.gatherUsageStats", "false"
    ]
    
    try:
        print("🚀 Launching Streamlit server...")
        process = subprocess.Popen(cmd, cwd=script_dir)
        
        # Wait a moment for server to start
        print("⏳ Waiting for server to start...")
        time.sleep(3)
        
        # Open browser
        url = "http://localhost:8507"
        print(f"🌐 Opening browser at: {url}")
        webbrowser.open(url)
        
        print("✅ Prairie Genomics Suite is running!")
        print("📍 URL: http://localhost:8507")
        print("🛑 Press Ctrl+C to stop")
        print("=" * 50)
        
        # Keep the process running
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Stopping Prairie Genomics Suite...")
        process.terminate()
        print("👋 Goodbye!")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    run_streamlit()