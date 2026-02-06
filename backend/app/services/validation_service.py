"""
Validation service for input data
Ensures data integrity before processing
"""

from typing import List, Optional, Dict, Any
from app.models.order import OrderConfig, OrderProduct
from app.models.product import Product
from app.models.address import Address
from app.utils.logger import get_logger

logger = get_logger("validation_service")

class ValidationService:
    """Service for validating various entities"""
    
    @staticmethod
    def validate_order_config(config: OrderConfig) -> List[str]:
        """Enhanced validation for order configuration"""
        errors = []
        
        # Basic Pydantic validation is already done by FastAPI, 
        # but we can add business rule validations here
        
        if config.max_cart_value and sum(p.price * p.quantity for p in config.products) > config.max_cart_value:
            errors.append(f"Total order value exceeds max_cart_value ({config.max_cart_value})")
            
        # Check if all products have valid URLs
        for product in config.products:
            if not product.product_url.startswith("https://"):
                errors.append(f"Invalid product URL: {product.product_url}")
                
        return errors

    @staticmethod
    def validate_address(address: Dict[str, Any]) -> List[str]:
        """Validate an address dictionary"""
        required_fields = ["name", "phone", "pincode", "address_line", "city", "state"]
        return [f"Missing field: {field}" for field in required_fields if not address.get(field)]

# Singleton instance
validation_service = ValidationService()
