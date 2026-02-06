"""
WebSocket API Routes
Real-time log streaming endpoint
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.utils.websocket_manager import ws_manager
from app.utils.logger import get_logger

logger = get_logger("websocket_api")

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/logs")
async def websocket_logs_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for streaming real-time logs
    
    Clients connect to: ws://localhost:8000/ws/logs
    """
    await ws_manager.connect(websocket)
    
    try:
        # Send initial connection message
        import json
        await websocket.send_text(json.dumps({
            "type": "connection",
            "message": "Connected to Tira Automation log stream",
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }))
        
        # Keep connection alive and listen for client messages
        while True:
            # Wait for messages from client (keepalive, ping, etc.)
            try:
                data = await websocket.receive_text()
                # Echo back if needed, or handle client commands
                logger.debug(f"Received from client: {data}")
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        logger.info("Client disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await ws_manager.disconnect(websocket)


@router.get("/stats")
async def websocket_stats():
    """
    Get WebSocket connection statistics
    """
    return {
        "active_connections": ws_manager.get_connection_count(),
        "status": "operational"
    }