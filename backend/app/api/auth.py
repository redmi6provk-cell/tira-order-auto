"""
Authentication API Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.models.admin import AdminLogin, Token
from app.services.auth_service import auth_service
from app.utils.logger import get_logger

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login endpoint for admin users
    Supports standard OAuth2 password request form
    """
    admin_login = AdminLogin(
        username_or_email=form_data.username,
        password=form_data.password
    )
    
    admin = await auth_service.authenticate_admin(admin_login)
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = auth_service.create_access_token(
        data={"sub": admin['username']}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def get_me(current_admin=Depends(auth_service.get_current_admin)):
    """
    Get current admin user details (protected)
    """
    return current_admin
