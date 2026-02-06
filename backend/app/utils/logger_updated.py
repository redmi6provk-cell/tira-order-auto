"""
Centralized logging configuration with WebSocket support
"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime
from typing import Optional

from app.config import settings


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
        # Add color to level name
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"
        return super().format(record)


class SafeFormatter(logging.Formatter):
    """Formatter that handles Unicode encoding issues on Windows"""
    
    def format(self, record):
        # Replace Unicode characters that might cause issues on Windows console
        try:
            result = super().format(record)
            # Replace common problematic Unicode characters
            result = result.replace('⚠', '[WARN]')
            result = result.replace('✓', '[OK]')
            result = result.replace('✗', '[FAIL]')
            result = result.replace('🚀', '[START]')
            return result
        except UnicodeEncodeError:
            # Fallback to ASCII-only version
            record.msg = str(record.msg).encode('ascii', 'replace').decode('ascii')
            return super().format(record)


def setup_logging() -> logging.Logger:
    """
    Setup centralized logging with file, console, and WebSocket handlers
    
    Returns:
        logging.Logger: Configured logger instance
    """
    
    # Logs directory should be created manually before running the application
    # settings.LOGS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Create logger
    logger = logging.getLogger("tira_automation")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Console handler with safe formatter (no Unicode issues)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Use SafeFormatter instead of ColoredFormatter to avoid encoding issues
    console_formatter = SafeFormatter(
        '%(levelname)s | %(name)s | %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    
    # File handler - General logs
    app_log_file = settings.LOGS_DIR / "app.log"
    file_handler = RotatingFileHandler(
        app_log_file,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'  # Explicitly set UTF-8 encoding for file
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        settings.LOG_FORMAT,
        datefmt=settings.LOG_DATE_FORMAT
    )
    file_handler.setFormatter(file_formatter)
    
    # Automation logs
    automation_log_file = settings.LOGS_DIR / "automation.log"
    automation_handler = RotatingFileHandler(
        automation_log_file,
        maxBytes=10*1024*1024,
        backupCount=5,
        encoding='utf-8'
    )
    automation_handler.setLevel(logging.DEBUG)
    automation_handler.setFormatter(file_formatter)
    automation_handler.addFilter(lambda record: 'automation' in record.name.lower())
    
    # Error logs
    error_log_file = settings.LOGS_DIR / "errors.log"
    error_handler = RotatingFileHandler(
        error_log_file,
        maxBytes=10*1024*1024,
        backupCount=5,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_formatter)
    
    # Add handlers
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    logger.addHandler(automation_handler)
    logger.addHandler(error_handler)
    
    # Add WebSocket handler (will be initialized when WebSocket is available)
    try:
        from app.utils.websocket_log_handler import add_websocket_handler
        add_websocket_handler(logger)
    except ImportError:
        # WebSocket handler not available yet (during initial setup)
        pass
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name
    
    Args:
        name: Logger name
        
    Returns:
        logging.Logger: Logger instance
    """
    return logging.getLogger(f"tira_automation.{name}")


class AutomationLogger:
    """
    Context manager for logging automation processes with WebSocket support
    """
    
    def __init__(self, session_id: str, order_id: str):
        self.session_id = session_id
        self.order_id = order_id
        self.logger = get_logger("automation")
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        self.logger.info(
            f"[START] Starting automation | Session: {self.session_id} | Order: {self.order_id}"
        )
        
        # Send WebSocket notification
        try:
            import asyncio
            from app.utils.websocket_manager import ws_manager
            
            # Try to send order update
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(
                        ws_manager.send_order_update(
                            order_id=self.order_id,
                            status="processing",
                            session_id=self.session_id
                        )
                    )
            except:
                pass
        except:
            pass
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()
        
        if exc_type is None:
            self.logger.info(
                f"[OK] Automation completed | Session: {self.session_id} | "
                f"Order: {self.order_id} | Duration: {duration:.2f}s"
            )
        else:
            self.logger.error(
                f"[ERROR] Automation failed | Session: {self.session_id} | "
                f"Order: {self.order_id} | Duration: {duration:.2f}s | "
                f"Error: {exc_val}"
            )
        
        return False  # Don't suppress exceptions
    
    def log_step(self, step: str, message: str, level: str = "INFO"):
        """Log an automation step"""
        # Remove Unicode characters that might cause encoding issues
        safe_message = message.replace('⚠', '[WARN]').replace('✓', '[OK]').replace('✗', '[FAIL]')
        
        log_func = getattr(self.logger, level.lower())
        log_func(
            f"[{self.session_id}] [{self.order_id}] {step} - {safe_message}"
        )
    
    def log_error(self, step: str, error: Exception):
        """Log an error during automation"""
        self.logger.error(
            f"[{self.session_id}] [{self.order_id}] {step} - ERROR: {str(error)}",
            exc_info=True
        )