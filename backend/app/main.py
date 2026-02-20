"""
Tira Beauty Automation - FastAPI Backend
Main application entry point
"""

import sys
import asyncio

# Force ProactorEventLoop on Windows for Playwright support
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import traceback
from pathlib import Path

from app.config import settings
from app.utils.logger import setup_logging
from app.utils.websocket_manager import ws_manager
from app.api import addresses, auth, products, orders, automation, tira_users, checkpoints, cards
from app.services.auth_service import auth_service
from app.exceptions import (
    TiraAutomationException,
    AuthenticationError,
    BrowserError,
    ValidationError,
    DataNotFoundError,
    OrderProcessingError,
    NetworkError,
    FileOperationError
)

# Setup logging
logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("[START] Starting Tira Automation Backend")
    
    # Directories should be created manually before running the application
    # Path(settings.DATA_DIR).mkdir(parents=True, exist_ok=True)
    # Path(settings.LOGS_DIR).mkdir(parents=True, exist_ok=True)
    # Path(settings.ORDERS_DIR).mkdir(parents=True, exist_ok=True)
    
    logger.info("[OK] Application initialized")
    
    yield
    
    logger.info("[STOP] Shutting down Tira Automation Backend")


# Initialize FastAPI app
app = FastAPI(
    title="Tira Beauty Automation API",
    description="Backend API for automated Tira beauty orders",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "https://tone.vkshivshakti.in", "http://tone.vkshivshakti.in"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    logger.warning(f"[VALIDATION] Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "message": "Invalid input data",
            "details": exc.errors()
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.warning(f"[HTTP] {exc.status_code} on {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP Error",
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(DataNotFoundError)
async def data_not_found_handler(request: Request, exc: DataNotFoundError):
    """Handle resource not found errors"""
    logger.warning(f"[NOT_FOUND] {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": exc.message,
            "details": exc.details
        }
    )


@app.exception_handler(AuthenticationError)
async def authentication_error_handler(request: Request, exc: AuthenticationError):
    """Handle authentication errors"""
    logger.warning(f"[AUTH] Authentication failed on {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=401,
        content={
            "error": "Authentication Failed",
            "message": exc.message,
            "details": exc.details
        }
    )


@app.exception_handler(ValidationError)
async def custom_validation_error_handler(request: Request, exc: ValidationError):
    """Handle custom validation errors"""
    logger.warning(f"[VALIDATION] {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "Validation Error",
            "message": exc.message,
            "details": exc.details
        }
    )


@app.exception_handler(TiraAutomationException)
async def tira_automation_exception_handler(request: Request, exc: TiraAutomationException):
    """Handle all custom Tira automation exceptions"""
    logger.error(f"[ERROR] {type(exc).__name__} on {request.url.path}: {exc.message}")
    
    # Map exception types to status codes
    status_code_map = {
        BrowserError: 500,
        OrderProcessingError: 500,
        NetworkError: 503,
        FileOperationError: 500,
    }
    
    status_code = status_code_map.get(type(exc), 500)
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": type(exc).__name__,
            "message": exc.message,
            "details": exc.details
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    error_trace = traceback.format_exc()
    logger.error(f"[CRITICAL] Unhandled exception on {request.url.path}:\n{error_trace}")
    
    # Don't expose internal error details in production
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            "request_id": str(id(request))  # For debugging
        }
    )


# Health check endpoint
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Tira Automation API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "profiles_available": settings.TOTAL_SESSIONS,
        "max_concurrent_browsers": settings.MAX_CONCURRENT_BROWSERS
    }


# WebSocket endpoint for real-time logs
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint for streaming logs to frontend"""
    await ws_manager.connect(websocket)
    logger.info("[WS] WebSocket client connected")
    
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
        logger.info("[WS] WebSocket client disconnected")


# Include routers
from app.api import auth
from app.services.auth_service import auth_service
from fastapi import Depends

app.include_router(auth.router, prefix="/api", tags=["Authentication"])

# Protect dashboard routes with auth dependency
app.include_router(
    products.router, 
    prefix="/api/products", 
    tags=["Products"],
    dependencies=[Depends(auth_service.get_current_admin)]
)
app.include_router(
    orders.router, 
    prefix="/api/orders", 
    tags=["Orders"],
    dependencies=[Depends(auth_service.get_current_admin)]
)
app.include_router(
    addresses.router, 
    prefix="/api/addresses", 
    tags=["Addresses"],
    dependencies=[Depends(auth_service.get_current_admin)]
)
app.include_router(
    automation.router, 
    prefix="/api/automation", 
    tags=["Automation"],
    dependencies=[Depends(auth_service.get_current_admin)]
)
app.include_router(
    tira_users.router, 
    prefix="/api/tira_users", 
    tags=["Tira Users"],
    dependencies=[Depends(auth_service.get_current_admin)]
)
app.include_router(
    checkpoints.router,
    prefix="/api/checkpoints",
    tags=["Checkpoints"],
    dependencies=[Depends(auth_service.get_current_admin)]
)
app.include_router(
    cards.router,
    prefix="/api/cards",
    tags=["Cards"],
    dependencies=[Depends(auth_service.get_current_admin)]
)


# System Stats WebSocket
@app.websocket("/ws/system")
async def websocket_system_stats(websocket: WebSocket):
    """WebSocket endpoint for streaming system stats"""
    import psutil
    import asyncio
    
    await websocket.accept()
    logger.info("[WS] System stats client connected")
    
    try:
        while True:
            # Gather system stats
            cpu_percent = psutil.cpu_percent(interval=None)
            memory = psutil.virtual_memory()
            
            stats = {
                "cpu": cpu_percent,
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "percent": memory.percent,
                    "used": memory.used
                },
                "timestamp": asyncio.get_event_loop().time()
            }
            
            try:
                await websocket.send_json(stats)
            except Exception:
                # Client disconnected during send
                break
            
            await asyncio.sleep(2)  # Update every 2 seconds
                
    except WebSocketDisconnect:
        logger.info("[WS] System stats client disconnected")
    except Exception as e:
        # Filter out normal disconnects if they reach here
        if "disconnected" not in str(e).lower():
            logger.error(f"[WS] Error in system stats: {e}")
        try:
            await websocket.close()
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"[HOST] Starting server on {settings.API_HOST}:{settings.API_PORT}")
    
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    )
