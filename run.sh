#!/usr/bin/env bash
# Startup script for CraveDrop Food Delivery Application

set -e

echo "=========================================="
echo "⚡ Starting CraveDrop Food Delivery Test Repo"
echo "=========================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 could not be found. Please install Python 3.9+."
    exit 1
fi

# Optional virtual environment activation if exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment 'venv'..."
    source venv/bin/activate
fi

# Run pytest to guarantee project integrity
echo "🧪 Running test suite..."
python3 -m pytest -q

echo "🚀 Starting server at http://127.0.0.1:5001 ..."
python3 app.py
