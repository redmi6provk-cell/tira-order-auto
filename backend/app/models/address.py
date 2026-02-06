"""
Address Pydantic models
"""

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class AddressCreate(BaseModel):
    """Model for creating a new address"""
    full_name: Optional[str] = Field(None, description="Full name for delivery")
    flat_number: Optional[str] = Field(None, description="Flat No/House No/Building No")
    street: str = Field(..., description="Building Name/Street/Society")
    pincode: str = Field(..., min_length=6, max_length=6, description="6-digit pincode")
    city: Optional[str] = Field(None, description="City (auto-filled from pincode)")
    state: Optional[str] = Field(None, description="State (auto-filled from pincode)")
    is_default: bool = Field(default=False, description="Set as default address")



class Address(AddressCreate):
    id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AddressUpdate(BaseModel):
    """Model for updating an address"""
    full_name: Optional[str] = None
    flat_number: Optional[str] = None
    street: Optional[str] = None
    pincode: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_default: Optional[bool] = None