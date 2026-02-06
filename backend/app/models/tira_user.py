"""
Tira User Pydantic models
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class TiraUserBase(BaseModel):
    """Base model for Tira user fields"""
    name: Optional[str] = Field(None, description="Full name of the user")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    points: Optional[str] = Field(None, description="Tira Treats points")
    is_active: bool = Field(default=True, description="Whether the user is active")
    extra_data: Optional[dict] = Field(default={}, description="Additional metadata")

class TiraUserCreate(TiraUserBase):
    """Model for creating a new Tira user"""
    cookies: Optional[List[Any]] = []

class TiraUserUpdate(BaseModel):
    """Model for updating a Tira user"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    points: Optional[str] = None
    is_active: Optional[bool] = None
    extra_data: Optional[dict] = None
    cookies: Optional[List[Any]] = None

class TiraUser(TiraUserBase):
    """Full Tira user model with ID and timestamps"""
    id: int
    cookies: List[Any] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
