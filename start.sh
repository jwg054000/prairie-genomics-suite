#!/bin/bash

# Prairie Genomics Suite - Easy Startup Script
# This script starts both backend and frontend automatically

set -e  # Exit on any error

echo "🧬 Starting Prairie Genomics Suite..."
echo "========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Please run this script from the prairie_genomics_suite directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Function to check if dependencies are installed
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    if [ ! -d "backend/node_modules" ]; then
        echo "📦 Installing backend dependencies..."
        cd backend
        npm install
        cd ..
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        cd frontend  
        npm install
        cd ..
    fi
    
    echo "✅ Dependencies ready"
}

# Function to check configuration
check_config() {
    echo "🔧 Checking configuration..."
    
    if [ ! -f "backend/.env" ]; then
        echo "⚠️  Creating backend .env file from example..."
        cp backend/.env.example backend/.env
        echo "🔴 Please edit backend/.env with your MongoDB connection string!"
        echo "   Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/prairie-genomics"
    fi
    
    if [ ! -f "frontend/.env.local" ]; then
        echo "⚠️  Creating frontend .env.local file from example..."
        cp frontend/.env.local.example frontend/.env.local
    fi
    
    echo "✅ Configuration ready"
}

# Function to start backend
start_backend() {
    echo "🚀 Starting backend server..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    echo "Backend PID: $BACKEND_PID"
    
    # Wait a moment for backend to start
    sleep 3
    
    # Check if backend started successfully
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "✅ Backend server started successfully"
    else
        echo "❌ Backend server failed to start"
        exit 1
    fi
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting frontend application..."
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    echo "Frontend PID: $FRONTEND_PID"
    
    # Wait a moment for frontend to start
    sleep 5
    
    # Check if frontend started successfully
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "✅ Frontend application started successfully"
    else
        echo "❌ Frontend application failed to start"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    echo "🛑 Shutting down services..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo "Backend stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "Frontend stopped"
    fi
    
    echo "👋 Prairie Genomics Suite stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM EXIT

# Main execution
main() {
    check_dependencies
    check_config
    start_backend
    start_frontend
    
    echo "🎉 Prairie Genomics Suite is running!"
    echo "========================================="
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend:  http://localhost:4000"
    echo "🎮 GraphQL:  http://localhost:4000/graphql"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo "========================================="
    
    # Wait for processes
    wait
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Prairie Genomics Suite Startup Script"
        echo ""
        echo "Usage: ./start.sh [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --check, -c    Check system requirements only"
        echo "  --reset, -r    Reset and reinstall dependencies"
        echo ""
        exit 0
        ;;
    --check|-c)
        echo "🔍 System Requirements Check"
        echo "============================"
        
        # Check Node.js
        if command -v node &> /dev/null; then
            echo "✅ Node.js: $(node --version)"
        else
            echo "❌ Node.js: Not installed"
        fi
        
        # Check npm
        if command -v npm &> /dev/null; then
            echo "✅ npm: $(npm --version)"
        else
            echo "❌ npm: Not installed"
        fi
        
        # Check directories
        if [ -d "backend" ] && [ -d "frontend" ]; then
            echo "✅ Project structure: OK"
        else
            echo "❌ Project structure: Missing directories"
        fi
        
        # Check config files
        if [ -f "backend/.env" ]; then
            echo "✅ Backend config: Found"
        else
            echo "⚠️  Backend config: Missing (will be created)"
        fi
        
        if [ -f "frontend/.env.local" ]; then
            echo "✅ Frontend config: Found"
        else
            echo "⚠️  Frontend config: Missing (will be created)"
        fi
        
        exit 0
        ;;
    --reset|-r)
        echo "🔄 Resetting dependencies..."
        rm -rf backend/node_modules backend/package-lock.json
        rm -rf frontend/node_modules frontend/package-lock.json
        echo "✅ Dependencies reset. Run ./start.sh to reinstall."
        exit 0
        ;;
    *)
        main
        ;;
esac