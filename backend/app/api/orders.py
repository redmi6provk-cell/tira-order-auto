"""
Orders API router
"""

from fastapi import APIRouter, HTTPException
from typing import List

from app.models.order import Order
from app.models.product import OrderStatistics
from app.services.data_service import order_service
from app.utils.logger import get_logger

logger = get_logger("api.orders")

router = APIRouter()

@router.get("", response_model=List[Order])
async def get_orders():
    """Get all orders"""
    return await order_service.get_all_orders()

@router.get("/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Get order by ID"""
    order = await order_service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.get("/session/{session_id}", response_model=List[Order])
async def get_orders_by_session(session_id: str):
    """Get all orders for a session"""
    orders = await order_service.get_orders_by_session(session_id)
    return orders

@router.get("/batch/{batch_id}/stats")
async def get_batch_stats(batch_id: str):
    """Get statistics for a specific batch"""
    return await order_service.get_batch_stats(batch_id)

@router.delete("")
async def clear_orders():
    """Delete all orders and logs"""
    success = await order_service.clear_all_history()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear history")
    return {"message": "Success"}

@router.delete("/{order_id}")
async def delete_order(order_id: str):
    """Delete a specific order"""
    success = await order_service.delete_order(order_id)
    if not success:
        raise HTTPException(status_code=404, detail="Order not found or failed to delete")
    return {"message": "Order deleted successfully", "id": order_id}

@router.delete("/batch/{batch_id}")
async def delete_batch(batch_id: str):
    """Delete an entire batch of orders"""
    success = await order_service.delete_batch(batch_id)
    if not success:
        raise HTTPException(status_code=404, detail="Batch not found or failed to delete")
    return {"message": "Batch deleted successfully", "id": batch_id}

@router.get("/batches/history")
async def get_batch_history():
    """Get history of all order batches"""
    return await order_service.get_all_batches()

@router.get("/{order_id}/logs")
async def get_order_logs(order_id: str):
    """Get logs for a specific order"""
    from app.services.data_service import log_service
    logs = await log_service.get_logs_by_order(order_id)
    return logs

@router.get("/statistics/all", response_model=OrderStatistics)
async def get_order_statistics():
    """Get overall order statistics"""
    orders = await order_service.get_all_orders()
    
    total = len(orders)
    successful = sum(1 for o in orders if o['status'] == 'completed')
    failed = sum(1 for o in orders if o['status'] == 'failed')
    pending = sum(1 for o in orders if o['status'] in ['pending', 'processing'])
    
    total_amount = sum(o.get('total', 0) for o in orders if o['status'] == 'completed')
    avg_order_value = total_amount / successful if successful > 0 else 0
    success_rate = (successful / total * 100) if total > 0 else 0
    
    return OrderStatistics(
        total_orders=total,
        successful_orders=successful,
        failed_orders=failed,
        pending_orders=pending,
        total_amount_spent=total_amount,
        average_order_value=avg_order_value,
        success_rate=success_rate
    )
