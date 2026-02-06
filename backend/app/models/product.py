"""
Pydantic models for Tira Automation
"""

from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# ===== PRODUCT MODELS =====

class Product(BaseModel):
    """Product model"""
    id: str = Field(..., description="Unique product identifier")
    name: str = Field(..., description="Product name")
    url: HttpUrl = Field(..., description="Product URL on Tira website")
    price: float = Field(..., gt=0, description="Product price")
    image_url: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    in_stock: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class ProductCreate(BaseModel):
    """Product creation model"""
    name: str
    url: HttpUrl
    price: float = Field(gt=0)
    image_url: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None


class ProductUpdate(BaseModel):
    """Product update model"""
    name: Optional[str] = None
    url: Optional[HttpUrl] = None
    price: Optional[float] = Field(None, gt=0)
    image_url: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    in_stock: Optional[bool] = None



# ===== STATISTICS MODELS =====

class OrderStatistics(BaseModel):
    """Order statistics"""
    total_orders: int
    successful_orders: int
    failed_orders: int
    pending_orders: int
    total_amount_spent: float
    average_order_value: float
    success_rate: float


class SessionStatistics(BaseModel):
    """Session statistics"""
    session_id: str
    status: str
    total_orders: int
    successful_orders: int
    failed_orders: int
    success_rate: float
    total_spent: float
    last_used: Optional[datetime] = None