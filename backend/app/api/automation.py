"""
Automation API router
Updated for cookie-based authentication (no Chrome profiles)
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any

from app.models.order import BulkOrderRequest, OrderResponse, TestLoginConfig
from app.services.data_service import address_service, product_service, card_service
from app.automation.order_executor import order_executor
from app.utils.logger import get_logger

logger = get_logger("api.automation")

router = APIRouter()


@router.post("/execute", response_model=OrderResponse)
async def execute_order(
    request: BulkOrderRequest,
    background_tasks: BackgroundTasks
):
    """
    Execute bulk order automation using a range of users from the database.
    Runs in background and returns immediately.
    """
    logger.info(f"[START] Received order request for user range {request.config.user_range_start}-{request.config.user_range_end}")
    
    # Validate address exists
    address = await address_service.get_address(request.config.address_id)
    if not address:
        raise HTTPException(
            status_code=404,
            detail=f"Address not found: {request.config.address_id}"
        )
    
    # Validate products exist
    for product in request.config.products:
        prod = await product_service.get_product(product.product_id)
        if not prod:
            raise HTTPException(
                status_code=404,
                detail=f"Product not found: {product.product_id}"
            )
            
    # Validate card exists if payment method is card
    if request.config.payment_method == "card" and request.config.card_id:
        card = await card_service.get_card(request.config.card_id)
        if not card:
            raise HTTPException(
                status_code=404,
                detail=f"Credit card not found: {request.config.card_id}"
            )
        # Populate card_details for the executor
        request.config.card_details = {
            "number": card["card_number"],
            "name": card["card_name"],
            "expiry": card["expiry_date"],
            "cvv": card["cvv"]
        }
    elif request.config.payment_method == "card" and not request.config.card_details:
        raise HTTPException(
            status_code=400,
            detail="Card details or card_id must be provided for card payment method"
        )
    
    # Execute in background
    background_tasks.add_task(
        order_executor.execute_bulk_order,
        request.config
    )
    
    return OrderResponse(
        order_id="bulk",
        status="processing",
        message=f"Order execution started for user range {request.config.user_range_start}-{request.config.user_range_end}",
        details={
            "user_range": f"{request.config.user_range_start}-{request.config.user_range_end}",
            "concurrent_browsers": request.config.concurrent_browsers,
            "authentication": "tira_users-database"
        }
    )



@router.get("/active")
async def get_active_orders():
    """Get currently active/running orders"""
    active = order_executor.get_active_orders()
    return {
        "count": len(active),
        "orders": active
    }

@router.post("/test-login/{user_id}")
async def test_user_login(user_id: int):
    """Test if a user's cookies are valid"""
    result = await order_executor.test_user_login(user_id)
    return result

@router.post("/test-login")
async def execute_test_login_bulk(
    config: TestLoginConfig,
    background_tasks: BackgroundTasks
):
    """
    Execute bulk test login for a range of users.
    Returns immediately and runs in background.
    """
    logger.info(f"[START] Received test login request for user range {config.user_range_start}-{config.user_range_end}")
    
    background_tasks.add_task(
        order_executor.execute_test_login_bulk,
        config
    )
    
    return {
        "status": "processing",
        "message": f"Test login execution started for {config.user_range_end - config.user_range_start + 1} users",
        "details": {
            "user_range": [config.user_range_start, config.user_range_end],
            "concurrent_browsers": config.concurrent_browsers
        }
    }
