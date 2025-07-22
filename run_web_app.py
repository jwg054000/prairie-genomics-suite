#!/usr/bin/env python3
"""
🚀 Prairie Genomics Suite - Easy Web App Launcher

This script makes it super easy to run the Prairie Genomics web application.
No technical knowledge required - just run this file!
"""

import os
import sys
import subprocess
import time

def print_header():
    """Print a beautiful header"""
    print("🧬" * 20)
    print("🚀 PRAIRIE GENOMICS SUITE - WEB LAUNCHER")
    print("🧬" * 20)
    print("Making genomics analysis accessible to every researcher!")
    print()

def check_and_install_packages():
    """Check and install required packages"""
    print("📦 Checking required packages...")
    
    packages = {
        'streamlit': 'streamlit',
        'pandas': 'pandas',
        'numpy': 'numpy', 
        'plotly': 'plotly',
        'seaborn': 'seaborn',
        'matplotlib': 'matplotlib',
        'scikit-learn': 'scikit-learn',
        'scipy': 'scipy',
        'mygene': 'mygene',
        'requests': 'requests'
    }
    
    missing_packages = []
    
    for package_name, pip_name in packages.items():
        try:
            __import__(package_name)
            print(f"✅ {package_name}")
        except ImportError:
            print(f"❌ {package_name} (will install)")
            missing_packages.append(pip_name)
    
    if missing_packages:
        print(f"\n🔄 Installing {len(missing_packages)} missing packages...")
        for package in missing_packages:
            print(f"Installing {package}...")
            try:
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', package, '-q'])
                print(f"✅ {package} installed successfully")
            except subprocess.CalledProcessError as e:
                print(f"❌ Failed to install {package}: {e}")
                return False
    
    print("\n✅ All packages ready!")
    return True

def launch_streamlit_app():
    """Launch the Streamlit web application"""
    print("🚀 Launching Prairie Genomics Suite Web Application...")
    print()
    print("📝 Instructions:")
    print("1. Wait for the app to start (may take 30-60 seconds)")
    print("2. Look for the message: 'You can now view your Streamlit app in your browser'")  
    print("3. Click the URL that appears (usually http://localhost:8501)")
    print("4. Your web browser will open with the Prairie Genomics Suite interface")
    print()
    print("🌐 The web app will open in your default browser automatically!")
    print()
    print("=" * 60)
    
    # Get the current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    app_file = os.path.join(current_dir, 'prairie_genomics_web_app.py')
    
    # Check if app file exists
    if not os.path.exists(app_file):
        print(f"❌ Error: Could not find {app_file}")
        print("Make sure prairie_genomics_web_app.py is in the same folder as this launcher.")
        return False
    
    try:
        # Launch Streamlit
        subprocess.run([
            sys.executable, '-m', 'streamlit', 'run', app_file,
            '--server.address', 'localhost',
            '--server.port', '8501',
            '--browser.gatherUsageStats', 'false'
        ])
    except KeyboardInterrupt:
        print("\n\n👋 Thanks for using Prairie Genomics Suite!")
        print("🧬 Making genomics analysis accessible to every researcher!")
        return True
    except Exception as e:
        print(f"❌ Error launching app: {e}")
        return False

def main():
    """Main launcher function"""
    print_header()
    
    # Check Python version
    if sys.version_info < (3, 7):
        print("❌ Python 3.7 or higher is required")
        print(f"Current version: {sys.version}")
        return
    
    print(f"✅ Python version: {sys.version.split()[0]}")
    print()
    
    # Install packages
    if not check_and_install_packages():
        print("❌ Failed to install required packages")
        return
    
    print()
    
    # Launch app
    print("🌐 Starting web application...")
    launch_streamlit_app()

if __name__ == "__main__":
    main()