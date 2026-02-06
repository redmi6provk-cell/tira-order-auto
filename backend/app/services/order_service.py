"""
Order business logic service
Handles orchestration of order execution and status updates
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import json

from app.models.order import Order, OrderStatus, OrderProduct, OrderConfig
from app.services.data_service import order_service as order_db, session_service, product_service
from app.utils.logger import get_logger
from app.utils.websocket_manager import ws_manager
from app.config import settings

logger = get_logger("order_service")

class OrderService:
    """Service for managing order business logic"""
    
    async def create_bulk_orders(self, config: OrderConfig) -> List[str]:
        """Create initial order records from configuration"""
        order_ids = []
        
        # Get address for the orders
        from app.services.data_service import address_service
        address = await address_service.get_address(config.address_id)
        if not address:
            raise ValueError(f"Address with ID {config.address_id} not found")
            
        for i in range(config.order_count):
            # content.profile_ids is gone. We assign sessions.
            # Simple round-robin assignment of sessions
            session_idx = (i % settings.TOTAL_SESSIONS) + 1
            session_id = f"session_{session_idx}"
                
            # Calculate totals (simple version)
            subtotal = sum(p.price * p.quantity for p in config.products)
            # In a real app, discount logic would go here
            total = subtotal
            
            order_data = {
                "session_id": session_id,
                "order_number": i + 1,
                "products": [p.model_dump() for p in config.products],
                "address": address,
                "payment_method": config.payment_method,
                "status": OrderStatus.PENDING,
                "subtotal": subtotal,
                "discount": 0.0,
                "total": total,
                "created_at": datetime.now().isoformat(),
                "logs": [f"[{datetime.now().isoformat()}] Order created and pending"]
            }
            
            new_order = await order_db.create_order(order_data)
            order_ids.append(new_order["id"])
            
            # Notify via WebSocket
            await ws_manager.broadcast(json.dumps({
                "type": "order_update",
                "order_id": new_order["id"],
                "status": OrderStatus.PENDING,
                "message": f"Order #{i+1} created for {session_id}"
            }))
            
        return order_ids

    async def update_order_status(self, order_id: str, status: OrderStatus, message: Optional[str] = None):
        """Update order status and notify"""
        updates = {"status": status}
        if message:
            # Append to logs
            order = await order_db.get_order(order_id)
            if order:
                logs = order.get("logs", [])
                logs.append(f"[{datetime.now().isoformat()}] {message}")
                updates["logs"] = logs
        
        if status == OrderStatus.COMPLETED:
            updates["completed_at"] = datetime.now()
        
        await order_db.update_order(order_id, updates)
        
        # Broadcast update
        await ws_manager.broadcast(json.dumps({
            "type": "order_update",
            "order_id": order_id,
            "status": status,
            "message": message or f"Order status updated to {status}"
        }))

# Singleton instance
order_logic_service = OrderService()
