# """
# WebSocket Manager and Data Initialization Scripts
# """

# # ===== utils/websocket_manager.py =====

# from typing import List
# from fastapi import WebSocket
# from app.utils.logger import get_logger

# logger = get_logger("websocket")


# class WebSocketManager:
#     """
#     Manages WebSocket connections for real-time log streaming
#     """
    
#     def __init__(self):
#         self.active_connections: List[WebSocket] = []
    
#     async def connect(self, websocket: WebSocket):
#         """Connect a new WebSocket client"""
#         await websocket.accept()
#         self.active_connections.append(websocket)
#         logger.info(f"[WS] WebSocket connected. Total connections: {len(self.active_connections)}")
    
#     def disconnect(self, websocket: WebSocket):
#         """Disconnect a WebSocket client"""
#         if websocket in self.active_connections:
#             self.active_connections.remove(websocket)
#         logger.info(f"[WS] WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
#     async def broadcast(self, message: str):
#         """Broadcast message to all connected clients"""
#         disconnected = []
#         for connection in self.active_connections:
#             try:
#                 await connection.send_text(message)
#             except Exception as e:
#                 logger.error(f"Error broadcasting to client: {e}") # This line was not part of the instruction to change, but the instruction's snippet implies a change here. Reverting to original as per "faithfully and without making any unrelated edits" and "syntactically correct".
#                 disconnected.append(connection)
        
#         # Remove disconnected clients
#         for conn in disconnected:
#             self.disconnect(conn)
    
#     async def send_log(self, level: str, message: str, source: str = "automation"):
#         """Send formatted log message to all clients"""
#         import json
#         from datetime import datetime
        
#         log_data = {
#             "timestamp": datetime.now().isoformat(),
#             "level": level,
#             "source": source,
#             "message": message
#         }
        
#         await self.broadcast(json.dumps(log_data))


# # Global WebSocket manager instance
# ws_manager = WebSocketManager()
"""
WebSocket Manager for Real-time Log Streaming
"""

from typing import List, Dict, Any
from fastapi import WebSocket
from datetime import datetime
import json
import asyncio
from app.utils.logger import get_logger

logger = get_logger("websocket")


class WebSocketManager:
    """
    Manages WebSocket connections for real-time log streaming
    """
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        """Connect a new WebSocket client"""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info(f"[WS] Client connected. Total connections: {len(self.active_connections)}")
    
    async def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket client"""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(f"[WS] Client disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: str):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections[:]:  # Create a copy to iterate
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        if disconnected:
            async with self._lock:
                for conn in disconnected:
                    if conn in self.active_connections:
                        self.active_connections.remove(conn)
            logger.info(f"[WS] Removed {len(disconnected)} disconnected clients")
    
    async def send_log(
        self,
        level: str,
        message: str,
        session_id: str = None,
        order_id: str = None,
        step: str = None,
        metadata: Dict[str, Any] = None
    ):
        """
        Send formatted log message to all clients
        
        Args:
            level: Log level (INFO, ERROR, WARN, DEBUG)
            message: Log message
            session_id: Browser session ID
            order_id: Order ID
            step: Current step (INIT, AUTH, CART, CHECKOUT, etc.)
            metadata: Additional metadata
        """
        log_data = {
            "type": "log",
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
            "session_id": session_id,
            "order_id": order_id,
            "step": step,
            "metadata": metadata or {}
        }
        
        await self.broadcast(json.dumps(log_data))
    
    async def send_order_update(
        self,
        order_id: str,
        status: str,
        session_id: str = None,
        tira_order_number: str = None,
        total: float = None,
        batch_id: str = None,
        error: str = None
    ):
        """
        Send order status update to all clients
        
        Args:
            order_id: Order ID
            status: Order status (pending, processing, completed, failed)
            session_id: Browser session ID
            tira_order_number: Tira's order number (if completed)
            total: Order total amount
            error: Error message (if failed)
        """
        update_data = {
            "type": "order_update",
            "timestamp": datetime.now().isoformat(),
            "order_id": order_id,
            "status": status,
            "session_id": session_id,
            "session_id": session_id,
            "tira_order_number": tira_order_number,
            "total": total,
            "batch_id": batch_id,
            "error": error
        }
        
        await self.broadcast(json.dumps(update_data))
    
    async def send_progress(
        self,
        session_id: str,
        current_step: str,
        total_steps: int,
        completed_steps: int,
        message: str = None
    ):
        """
        Send progress update for multi-step processes
        
        Args:
            session_id: Browser session ID
            current_step: Current step name
            total_steps: Total number of steps
            completed_steps: Number of completed steps
            message: Optional progress message
        """
        progress_data = {
            "type": "progress",
            "timestamp": datetime.now().isoformat(),
            "session_id": session_id,
            "current_step": current_step,
            "total_steps": total_steps,
            "completed_steps": completed_steps,
            "percentage": round((completed_steps / total_steps) * 100, 1) if total_steps > 0 else 0,
            "message": message
        }
        
        await self.broadcast(json.dumps(progress_data))
    
    def get_connection_count(self) -> int:
        """Get current number of active connections"""
        return len(self.active_connections)


# Global WebSocket manager instance
ws_manager = WebSocketManager()