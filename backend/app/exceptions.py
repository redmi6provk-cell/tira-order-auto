"""
Custom exceptions for Tira Automation
"""

from typing import Optional, Any


class TiraAutomationException(Exception):
    """Base exception for all Tira Automation errors"""
    
    def __init__(self, message: str, details: Optional[Any] = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class AuthenticationError(TiraAutomationException):
    """Raised when authentication fails"""
    pass


class BrowserError(TiraAutomationException):
    """Raised when browser/Selenium operations fail"""
    pass


class ValidationError(TiraAutomationException):
    """Raised when input validation fails"""
    pass


class DataNotFoundError(TiraAutomationException):
    """Raised when requested resource is not found"""
    pass


class OrderProcessingError(TiraAutomationException):
    """Raised when order execution fails"""
    pass


class NetworkError(TiraAutomationException):
    """Raised when network operations fail"""
    pass


class FileOperationError(TiraAutomationException):
    """Raised when file I/O operations fail"""
    pass
