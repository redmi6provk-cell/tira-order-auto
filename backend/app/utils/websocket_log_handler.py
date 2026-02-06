"""
WebSocket Log Handler
Broadcasts log messages to connected WebSocket clients in real-time
"""

import logging
import asyncio
from typing import Optional
from app.utils.websocket_manager import ws_manager


class WebSocketLogHandler(logging.Handler):
    """
    Custom logging handler that broadcasts logs to WebSocket clients
    """
    
    def __init__(self, level=logging.INFO):
        super().__init__(level)
        self.loop: Optional[asyncio.AbstractEventLoop] = None
    
    def emit(self, record: logging.LogRecord):
        """
        Emit a log record to WebSocket clients
        """
        try:
            # Format the log message
            msg = self.format(record)
            
            # Extract session_id and order_id from log message if present
            session_id = None
            order_id = None
            step = None
            
            # Parse log message for session/order IDs
            # Format: [session_id] [order_id] STEP - message
            if '[' in msg and ']' in msg:
                parts = msg.split(']', 2)
                if len(parts) >= 2:
                    session_id = parts[0].strip('[').strip()
                    if len(parts) >= 3:
                        order_id = parts[1].strip('[').strip()
                        # Extract step
                        remaining = parts[2].strip()
                        if ' - ' in remaining:
                            step = remaining.split(' - ')[0].strip()
            
            # Get or create event loop
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            # Send log to WebSocket clients
            if loop and loop.is_running():
                # Schedule coroutine in running loop
                asyncio.create_task(
                    ws_manager.send_log(
                        level=record.levelname,
                        message=msg,
                        session_id=session_id,
                        order_id=order_id,
                        step=step
                    )
                )
            else:
                # Run coroutine synchronously
                loop.run_until_complete(
                    ws_manager.send_log(
                        level=record.levelname,
                        message=msg,
                        session_id=session_id,
                        order_id=order_id,
                        step=step
                    )
                )
        except Exception as e:
            # Don't let logging errors crash the app
            self.handleError(record)


def add_websocket_handler(logger: logging.Logger):
    """
    Add WebSocket handler to a logger
    
    Args:
        logger: Logger instance to add handler to
    """
    ws_handler = WebSocketLogHandler(level=logging.INFO)
    
    # Use simple formatter for WebSocket (no colors)
    formatter = logging.Formatter(
        '%(levelname)s | %(name)s | %(message)s'
    )
    ws_handler.setFormatter(formatter)
    
    logger.addHandler(ws_handler)
    return ws_handler