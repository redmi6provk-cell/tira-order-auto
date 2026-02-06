"""
Centralized logging configuration
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional
import asyncio
import contextvars
from app.config import settings

# Context variables for propagating session and order context to all logs
session_context = contextvars.ContextVar("session_id", default=None)
order_context = contextvars.ContextVar("order_id", default=None)
step_context = contextvars.ContextVar("step", default=None)


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for console output"""
    
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record):
        # Format the record using the base class first
        msg = super().format(record)
        
        # Add color only to the final string, without touching the record object
        levelname = record.levelname
        if levelname in self.COLORS:
            color = self.COLORS[levelname]
            # Replace the first occurrence of levelname with colored version
            return msg.replace(levelname, f"{color}{levelname}{self.RESET}", 1)
        
        return msg


class WebSocketHandler(logging.Handler):
    """Custom logging handler to broadcast logs via WebSocket"""
    
    def emit(self, record):
        try:
            # Get the running loop
            loop = asyncio.get_running_loop()
            
            # Avoid broadcasting websocket-related logs to prevent recursion
            if record.name.startswith("tira_automation.websocket"):
                return
                
            # Avoid double-broadcasting if already handled by AutomationLogger
            if getattr(record, "_ui_handled", False):
                return
            
            # Local import to avoid circular dependency
            from app.utils.websocket_manager import ws_manager
            
            # Use the record's formatting if available, otherwise just message
            msg = self.format(record)
            
            # Check for session_id or order_id in context or extra
            session_id = getattr(record, "session_id", None) or session_context.get()
            order_id = getattr(record, "order_id", None) or order_context.get()
            step = getattr(record, "step", None) or step_context.get()
            
            # Broadcast via WebSocket (fire and forget task)
            loop.create_task(ws_manager.send_log(
                level=record.levelname,
                message=msg,
                session_id=str(session_id) if session_id else None,
                order_id=str(order_id) if order_id else None,
                step=step
            ))
        except (RuntimeError, Exception):
            # No running loop or other issue, just skip
            pass


def setup_logging() -> logging.Logger:
    """
    Setup centralized logging with file, console, and websocket handlers
    
    Returns:
        logging.Logger: Configured logger instance
    """
    
    # Create logger
    logger = logging.getLogger("tira_automation")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Console handler with colors
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = ColoredFormatter(
        '%(levelname)s | %(name)s | %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    
    # WebSocket handler for real-time UI updates
    ws_handler = WebSocketHandler()
    ws_handler.setLevel(logging.INFO)
    ws_handler.setFormatter(logging.Formatter('%(message)s'))
    
    # Add handlers
    logger.addHandler(console_handler)
    logger.addHandler(ws_handler)
    
    return logger

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name
    """
    return logging.getLogger(f"tira_automation.{name}")


class AutomationLogger:
    """
    Context manager for logging automation processes.
    Broadcasts logs to WebSockets and saves them to the database.
    """
    
    def __init__(self, session_id: str, order_id: Optional[str] = None):
        self.session_id = session_id
        self.order_id = order_id
        self.logger = get_logger("automation")
        self.start_time = None
        self._tokens = []
        self._loop = None
        try:
            self._loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
    
    def _broadcast_and_save(self, level: str, message: str, step: str = None, metadata: dict = None):
        """Helper to explicitly save log to database (broadcast is now handled by WebSocketHandler)"""
        
        # Local imports inside method to avoid circular dependencies
        try:
            from app.services.data_service import log_service
            
            # Save to Database if loop is available
            if self._loop and self._loop.is_running():
                self._loop.create_task(log_service.create_log({
                    "level": level,
                    "logger_name": "automation",
                    "message": message,
                    "session_id": str(self.session_id) if self.session_id else None,
                    "order_id": str(self.order_id) if self.order_id else None,
                    "extra_data": {"step": step, **(metadata or {})}
                }))
        except Exception as e:
            self.logger.debug(f"Failed to save log to DB: {e}")

    def __enter__(self):
        # Set context variables
        self._tokens = [
            session_context.set(self.session_id),
            order_context.set(self.order_id)
        ]
        
        self.start_time = datetime.now()
        ctx_msg = f" | Order: {self.order_id}" if self.order_id else ""
        message = f"Starting automation | Session: {self.session_id}{ctx_msg}"
        
        # Log to standard logger (it will be broadcasted by WebSocketHandler)
        self.logger.info(f"[START] {message}")
        
        # Explicitly save to DB
        self._broadcast_and_save("INFO", message, step="START")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()
        
        if exc_type is None:
            message = f"Automation completed successfully | Duration: {duration:.2f}s"
            self.logger.info(f"[OK] {message}")
            self._broadcast_and_save("INFO", message, step="COMPLETE", metadata={"duration": duration})
        else:
            message = f"Automation failed | Duration: {duration:.2f}s | Error: {str(exc_val)}"
            self.logger.error(f"[ERROR] {message}")
            self._broadcast_and_save("ERROR", message, step="ERROR", metadata={"duration": duration, "error": str(exc_val)})
        
        # Reset context variables
        for token in reversed(self._tokens):
            if token:
                if session_context == token.var: session_context.reset(token)
                elif order_context == token.var: order_context.reset(token)
                elif step_context == token.var: step_context.reset(token)

        return False  # Don't suppress exceptions
    
    def log_step(self, step: str, message: str, level: str = "INFO"):
        """Log an automation step and sync with UI/DB"""
        # Set step context temporarily
        token = step_context.set(step)
        try:
            # Log to standard logger
            log_func = getattr(self.logger, level.lower())
            log_func(message)
            
            # Explicitly save to DB
            self._broadcast_and_save(level, message, step=step)
        finally:
            step_context.reset(token)
    
    def log_error(self, step: str, error: Exception):
        """Log an error during automation and sync with UI/DB"""
        # Set step context temporarily
        token = step_context.set(step)
        try:
            err_msg = f"ERROR: {str(error)}"
            self.logger.error(err_msg, exc_info=True)
            self._broadcast_and_save("ERROR", err_msg, step=step)
        finally:
            step_context.reset(token)
