"""
Pydantic models for Credit Card management
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class CreditCardBase(BaseModel):
    card_name: str = Field(..., description="Name on the card")
    bank_name: str = Field(..., description="Bank name")
    card_number: str = Field(..., min_length=13, max_length=19, description="Card number (13-19 digits)")
    expiry_date: str = Field(..., pattern=r"^\d{2}/\d{4}$", description="Expiry date in MM/YYYY format")
    cvv: str = Field(..., min_length=3, max_length=4, description="CVV (3-4 digits)")
    is_default: bool = Field(default=False, description="Is this the default card")

    @validator('card_number')
    def validate_card_number(cls, v):
        # Remove spaces and dashes
        cleaned = v.replace(' ', '').replace('-', '')
        if not cleaned.isdigit():
            raise ValueError('Card number must contain only digits')
        if len(cleaned) < 13 or len(cleaned) > 19:
            raise ValueError('Card number must be between 13 and 19 digits')
        return cleaned

    @validator('cvv')
    def validate_cvv(cls, v):
        if not v.isdigit():
            raise ValueError('CVV must contain only digits')
        return v


class CreditCardCreate(CreditCardBase):
    pass


class CreditCardUpdate(BaseModel):
    card_name: Optional[str] = None
    bank_name: Optional[str] = None
    card_number: Optional[str] = None
    expiry_date: Optional[str] = None
    cvv: Optional[str] = None
    is_default: Optional[bool] = None


class CreditCard(CreditCardBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
