"""
F1 Analytics & Live Companion Dashboard
Single-command entry point: python main.py
"""
import subprocess
import sys
import os

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, os.getcwd())

    # Check if frontend build exists
    build_dir = os.path.join("frontend", "dist")
    if not os.path.isdir(build_dir):
        print("WARNING: Frontend build not found at frontend/dist/")
        print("Run: cd frontend && npm install && npm run build")
        print("Starting backend only...\n")

    # Start the FastAPI server
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)

if __name__ == "__main__":
    main()
