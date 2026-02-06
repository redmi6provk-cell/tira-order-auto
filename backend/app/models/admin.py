"""
Admin Pydantic models
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime


class AdminBase(BaseModel):
    """Base Admin model"""
    username: str = Field(..., description="Unique username")
    email: EmailStr = Field(..., description="Unique email address")
    is_active: bool = True


class AdminCreate(AdminBase):
    """Model for creating an admin"""
    password: str = Field(..., description="Plain text password")


class Admin(AdminBase):
    """Complete Admin model as stored in DB"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminLogin(BaseModel):
    """Request model for admin login"""
    username_or_email: str = Field(..., description="Username or Email address")
    password: str = Field(..., description="Plain text password")


class Token(BaseModel):
    """Response model for auth token"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Payload data for JWT token"""
    username: Optional[str] = None
    email: Optional[str] = None
