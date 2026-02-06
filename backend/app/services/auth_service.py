"""
Authentication Service for Admin Users
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from app.config import settings
from app.models.admin import AdminLogin, TokenData, Admin
from app.services.data_service import admin_service
from app.utils.logger import get_logger

logger = get_logger("auth_service")

# Token setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


class AuthService:
    """Service for handling authentication and authorization"""
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create a new JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    async def authenticate_admin(self, login_data: AdminLogin) -> Optional[Dict[str, Any]]:
        """
        Authenticate an admin user
        NOTE: Uses plain text password comparison as requested
        """
        admin = await admin_service.get_admin_by_email_or_username(login_data.username_or_email)
        
        if not admin:
            logger.warning(f"Failed login attempt: User not found ({login_data.username_or_email})")
            return None
        
        if admin['password'] != login_data.password:
            logger.warning(f"Failed login attempt: Invalid password for user {admin['username']}")
            return None
        
        if not admin.get('is_active', True):
            logger.warning(f"Failed login attempt: User {admin['username']} is inactive")
            return None
            
        logger.info(f"[OK] Admin authenticated: {admin['username']}")
        return admin

    async def get_current_admin(self, token: str = Depends(oauth2_scheme)) -> Admin:
        """
        Dependency to get current authenticated admin from JWT
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            username: str = payload.get("sub") # sub typically stores username
            if username is None:
                raise credentials_exception
            token_data = TokenData(username=username)
        except JWTError:
            raise credentials_exception
            
        admin_data = await admin_service.get_admin_by_email_or_username(token_data.username)
        if admin_data is None:
            raise credentials_exception
            
        return Admin(**admin_data)


# Service instance
auth_service = AuthService()
