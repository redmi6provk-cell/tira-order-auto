"""
Order Pydantic models
Updated to use session-based ordering instead of Chrome profiles
"""

from pydantic import BaseModel, Field, HttpUrl, model_validator
from typing import List, Optional
from enum import Enum
from datetime import datetime
from uuid import UUID


class PaymentMethod(str, Enum):
    """Available payment methods"""
    CASH_ON_DELIVERY = "cash_on_delivery"
    UPI = "upi"
    CARD = "card"


class OrderStatus(str, Enum):
    """Order status values"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class OrderProduct(BaseModel):
    """Product in an order"""
    product_id: str = Field(..., description="Product ID from catalog")
    product_name: str = Field(..., description="Product Name")
    product_url: HttpUrl = Field(..., description="Product URL")
    quantity: int = Field(default=1, ge=1, description="Quantity to order")
    price: float = Field(..., ge=0, description="Product price")


class CardDetails(BaseModel):
    """Credit/Debit Card Details"""
    number: str = Field(..., description="Card Number")
    name: str = Field(..., description="Name on Card")
    expiry: str = Field(..., description="Expiry Date (MM/YY)")
    cvv: str = Field(..., description="CVV")


class ExecutionMode(str, Enum):
    """Execution Modes"""
    FULL_AUTOMATION = "full_automation"
    TEST_LOGIN = "test_login"


class OrderConfig(BaseModel):
    """Configuration for bulk order execution"""
    user_range_start: int = Field(..., ge=1, description="Starting User ID")
    user_range_end: int = Field(..., ge=1, description="Ending User ID")
    products: List[OrderProduct] = Field(..., min_items=1, description="Products to order")
    address_id: str = Field(..., description="Delivery address ID")
    payment_method: PaymentMethod = Field(default=PaymentMethod.CASH_ON_DELIVERY)
    card_id: Optional[str] = Field(None, description="Saved card ID if payment method is CARD")
    card_details: Optional[CardDetails] = Field(None, description="Card details if payment method is CARD")
    max_cart_value: Optional[float] = Field(None, ge=0, description="Maximum cart value limit")
    name_suffix: Optional[str] = Field(None, description="Suffix to append to the random name")
    concurrent_browsers: int = Field(default=3, ge=1, le=10, description="Number of concurrent browsers")
    repetition_count: int = Field(default=1, ge=1, description="Number of times to repeat the order per user")
    headless: bool = Field(default=False, description="Run browsers in headless mode")
    mode: ExecutionMode = Field(default=ExecutionMode.FULL_AUTOMATION, description="Execution mode")


class TestLoginConfig(BaseModel):
    """Configuration for test login execution"""
    user_range_start: int = Field(..., ge=1, description="Starting User ID")
    user_range_end: int = Field(..., ge=1, description="Ending User ID")
    concurrent_browsers: int = Field(default=3, ge=1, le=10, description="Number of concurrent browsers")
    headless: bool = Field(default=False, description="Run browsers in headless mode")


class Order(BaseModel):
    """Complete order model"""
    id: UUID
    session_id: str = Field(..., description="Browser session ID")
    order_number: int = Field(..., description="Sequential order number")
    products: List[dict]
    address_snapshot: dict = Field(..., alias="address")
    payment_method: str
    status: str
    subtotal: float
    discount: float = 0.0
    total: float
    batch_id: Optional[UUID] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    tira_order_number: Optional[str] = None
    profile_name: Optional[str] = Field(None, description="Name extracted from profile")
    tira_user_id: Optional[int] = Field(None, description="Id of the Tira User info used for this order")
    error_message: Optional[str] = None
    logs: List[dict] = []

    class Config:
        populate_by_name = True


class OrderResponse(BaseModel):
    """API response for order execution"""
    order_id: str
    status: str
    message: str
    details: Optional[dict] = None


class BulkOrderRequest(BaseModel):
    """Request body for bulk order execution"""
    config: OrderConfig


class OrderStatistics(BaseModel):
    """Order statistics"""
    total_orders: int
    successful_orders: int
    failed_orders: int
    pending_orders: int
    total_amount_spent: float
    average_order_value: float
    success_rate: float