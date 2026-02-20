
import asyncio
import sys
import uvicorn
import os

# Ensure backend directory is in path (though running from it includes it by default)
sys.path.append(os.getcwd())

# Configuration
# Hardcoded to avoid import issues if running from weird paths, 
# but ideally we should import from app.config
HOST = "127.0.0.1"
PORT = 8005

if __name__ == "__main__":
    print(f"Starting Tira Automation Backend on {HOST}:{PORT}")
    
    # Force ProactorEventLoop on Windows for Playwright support
    # SelectorEventLoop (default on Windows) doesn't support subprocesses
    if sys.platform == 'win32':
        print("Detected Windows environment: Using ProactorEventLoop for Playwright compatibility")
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=False,
        loop="asyncio",
        log_level="info"
    )
