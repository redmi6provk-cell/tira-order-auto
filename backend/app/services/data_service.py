
import json
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any, TypeVar, Generic
from datetime import datetime
import uuid
from sqlalchemy import text
from app.database import get_db, AsyncSessionLocal
from app.config import settings
from app.utils.logger import get_logger
from app.utils.json_utils import to_json


logger = get_logger("data_service")

class ProductDataService:
    """Product-specific data service using PostgreSQL"""
    
    async def get_all_products(self) -> List[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT * FROM products"))
            rows = result.mappings().all()
            return [dict(row) for row in rows]
    
    async def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM products WHERE id = :id"), 
                {"id": product_id}
            )
            row = result.mappings().first()
            return dict(row) if row else None
    
    async def create_product(self, product: Dict[str, Any]) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            # Prepare fields
            if 'id' not in product:
                product['id'] = str(uuid.uuid4())
            
            # Convert Url objects to strings
            if 'url' in product and product['url']:
                product['url'] = str(product['url'])
            
            # Simple query construction (for now, or use ORM later)
            # Using raw SQL for direct mapping to the provided schema
            columns = list(product.keys())
            values = list(product.values())
            placeholders = [f":{col}" for col in columns]
            
            query = f"INSERT INTO products ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
            
            try:
                result = await session.execute(text(query), product)
                await session.commit()
                row = result.mappings().first()
                logger.info(f"[OK] Created product with ID: {product['id']}")
                return dict(row)
            except Exception as e:
                logger.error(f"Error creating product: {e}")
                await session.rollback()
                raise
    
    async def update_product(self, product_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            if not updates:
                return await self.get_product(product_id)
            
            # Convert Url objects to strings
            if 'url' in updates and updates['url']:
                updates['url'] = str(updates['url'])
                
            set_clauses = [f"{k} = :{k}" for k in updates.keys()]
            query = f"UPDATE products SET {', '.join(set_clauses)} WHERE id = :id RETURNING *"
            updates['id'] = product_id
            
            try:
                result = await session.execute(text(query), updates)
                await session.commit()
                row = result.mappings().first()
                if row:
                    logger.info(f"[OK] Updated product with ID: {product_id}")
                    return dict(row)
                return None
            except Exception as e:
                logger.error(f"Error updating product: {e}")
                await session.rollback()
                return None
    
    async def delete_product(self, product_id: str) -> bool:
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    text("DELETE FROM products WHERE id = :id"), 
                    {"id": product_id}
                )
                await session.commit()
                return result.rowcount > 0
            except Exception as e:
                logger.error(f"Error deleting product: {e}")
                await session.rollback()
                return False


class AddressDataService:
    """Address-specific data service using PostgreSQL"""
    
    async def get_all_addresses(self) -> List[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT * FROM addresses"))
            rows = result.mappings().all()
            return [dict(row) for row in rows]
    
    async def get_address(self, address_id: str) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM addresses WHERE id = :id"), 
                {"id": address_id}
            )
            row = result.mappings().first()
            return dict(row) if row else None
    
    async def create_address(self, address: Dict[str, Any]) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            # Handle default address logic
            if address.get('is_default'):
                await session.execute(
                    text("UPDATE addresses SET is_default = false WHERE is_default = true")
                )
            
            if 'id' not in address:
                address['id'] = str(uuid.uuid4())
                
            columns = list(address.keys())
            placeholders = [f":{col}" for col in columns]
            
            query = f"INSERT INTO addresses ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
            
            try:
                result = await session.execute(text(query), address)
                await session.commit()
                row = result.mappings().first()
                return dict(row)
            except Exception as e:
                logger.error(f"Error creating address: {e}")
                await session.rollback()
                raise
    
    async def update_address(self, address_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            if updates.get('is_default'):
                await session.execute(
                    text("UPDATE addresses SET is_default = false WHERE is_default = true AND id != :id"),
                    {"id": address_id}
                )
            
            set_clauses = [f"{k} = :{k}" for k in updates.keys()]
            query = f"UPDATE addresses SET {', '.join(set_clauses)} WHERE id = :id RETURNING *"
            updates['id'] = address_id
            
            try:
                result = await session.execute(text(query), updates)
                await session.commit()
                row = result.mappings().first()
                return dict(row) if row else None
            except Exception as e:
                logger.error(f"Error updating address: {e}")
                await session.rollback()
                return None
    
    async def delete_address(self, address_id: str) -> bool:
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    text("DELETE FROM addresses WHERE id = :id"), 
                    {"id": address_id}
                )
                await session.commit()
                return result.rowcount > 0
            except Exception as e:
                logger.error(f"Error deleting address: {e}")
                await session.rollback()
                return False
    
    async def get_default_address(self) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT * FROM addresses WHERE is_default = true"))
            row = result.mappings().first()
            return dict(row) if row else None


class CardDataService:
    """Credit card data service using PostgreSQL"""
    
    async def get_all_cards(self) -> List[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT * FROM credit_cards ORDER BY created_at DESC"))
            rows = result.mappings().all()
            return [dict(row) for row in rows]
    
    async def get_card(self, card_id: str) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM credit_cards WHERE id = :id"), 
                {"id": card_id}
            )
            row = result.mappings().first()
            return dict(row) if row else None
    
    async def create_card(self, card: Dict[str, Any]) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            # Handle default card logic
            if card.get('is_default'):
                await session.execute(
                    text("UPDATE credit_cards SET is_default = false WHERE is_default = true")
                )
            
            if 'id' not in card:
                card['id'] = str(uuid.uuid4())
                
            columns = list(card.keys())
            placeholders = [f":{col}" for col in columns]
            
            query = f"INSERT INTO credit_cards ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
            
            try:
                result = await session.execute(text(query), card)
                await session.commit()
                row = result.mappings().first()
                logger.info(f"Created credit card: {card.get('card_name')}")
                return dict(row)
            except Exception as e:
                logger.error(f"Error creating card: {e}")
                await session.rollback()
                raise
    
    async def update_card(self, card_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            if updates.get('is_default'):
                await session.execute(
                    text("UPDATE credit_cards SET is_default = false WHERE is_default = true AND id != :id"),
                    {"id": card_id}
                )
            
            set_clauses = [f"{k} = :{k}" for k in updates.keys()]
            query = f"UPDATE credit_cards SET {', '.join(set_clauses)} WHERE id = :id RETURNING *"
            updates['id'] = card_id
            
            try:
                result = await session.execute(text(query), updates)
                await session.commit()
                row = result.mappings().first()
                return dict(row) if row else None
            except Exception as e:
                logger.error(f"Error updating card: {e}")
                await session.rollback()
                return None
    
    async def delete_card(self, card_id: str) -> bool:
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    text("DELETE FROM credit_cards WHERE id = :id"), 
                    {"id": card_id}
                )
                await session.commit()
                return result.rowcount > 0
            except Exception as e:
                logger.error(f"Error deleting card: {e}")
                await session.rollback()
                return False
    
    async def get_default_card(self) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT * FROM credit_cards WHERE is_default = true"))
            row = result.mappings().first()
            return dict(row) if row else None


class SessionDataService:
    """Session data service using PostgreSQL"""
    
    def __init__(self):
        # Trigger initialization in background is risky in constructors with async, 
        # but for compatibility we'll keep the structure or rely on init_db script
        pass

    async def get_all_sessions(self) -> List[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT * FROM sessions"))
            rows = result.mappings().all()
            return [dict(row) for row in rows]
            
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM sessions WHERE session_id = :id"), # Note: schema uses session_id column, assuming that matches logical id
                {"id": session_id}
            )
            row = result.mappings().first()
            return dict(row) if row else None

    async def update_session_cookies(self, session_id: str, cookies: list):
        # We need to store cookies. Schema has a 'cookies' table and a 'sessions' table.
        # But instructions imply session logic. 
        # Let's check schema: 'sessions' table has status etc. 'cookies' table stores cookies.
        # But this method seems to expect cookies as part of session object or linked.
        # For simple migration matching previous logic:
        # The previous JSON data had 'cookies' inside the session object.
        # The new SQL schema has a separate 'cookies' table.
        # However, to keep it simple and match the 'json' field potential or just store in cookies table.
        # Wait, the SQL schema for 'sessions' does NOT have a cookies column.
        # It has 'cookies' table. 
        # So we should insert/update into 'cookies' table.
        
        async with AsyncSessionLocal() as session:
            # First update session usage
            await session.execute(
                text("UPDATE sessions SET updated_at = NOW() WHERE session_id = :id"),
                {"id": session_id}
            )
            
            # Then update cookies
            # This is a bit complex mapping from list of cookies to cookies table
            # For now, let's assume we just want to save them.
            # But the schema 'cookies' table is flat.
            # Maybe we can just store them as JSON if we strictly followed the old pattern, 
            # OR we map them properly. Use 'cookies' table implies mapping.
            # BUT, to be safe and quick, if the old code expects 'cookies' list in session object,
            # we might need to query them back.
            
            # To avoid complex logic rewrite right now, I will use 'cookies' table.
            # Delete old cookies for this session? Schema doesn't link cookie to session_id directly?
            # Schema: cookies table has domain, name, value etc. No session_id. 
            # It seems cookies are global in the new schema? "Store authentication cookies"
            
            # If the user wants to migrate to THIS schema, I must follow it.
            # Schema 'cookies' table seems to represent a cookie jar.
            
            try:
                # Clear existing active cookies for simplicity or merge?
                # The method receives a list of dicts (cookies).
                for cookie in cookies:
                    # Upsert cookie
                    query = """
                    INSERT INTO cookies (name, value, domain, path, expires, http_only, secure, same_site, is_active)
                    VALUES (:name, :value, :domain, :path, :expires, :httpOnly, :secure, :sameSite, true)
                    ON CONFLICT (name, domain) WHERE is_active = true
                    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                    """
                    # Key mapping might be needed (camelCase to snake_case)
                    params = {
                        "name": cookie.get("name"),
                        "value": cookie.get("value"),
                        "domain": cookie.get("domain"),
                        "path": cookie.get("path", "/"),
                        "expires": int(cookie.get("expires", 0)) if cookie.get("expires") else None,
                        "httpOnly": cookie.get("httpOnly", False),
                        "secure": cookie.get("secure", False),
                        "sameSite": cookie.get("sameSite", "Lax")
                    }
                    await session.execute(text(query), params)
                
                await session.commit()
            except Exception as e:
                logger.error(f"Error updating cookies: {e}")
                await session.rollback()


class OrderDataService:
    """Order-specific data service using PostgreSQL"""
    
    async def create_order(self, order: Dict[str, Any]) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            # Handle JSON fields
            if 'products' in order and not isinstance(order['products'], str):
                order['products'] = to_json(order['products'])
            if 'address_snapshot' in order and not isinstance(order['address_snapshot'], str):
                order['address_snapshot'] = to_json(order['address_snapshot'])
            if 'logs' in order and not isinstance(order['logs'], str):
                order['logs'] = to_json(order['logs'])
            
            if 'id' not in order:
                order['id'] = str(uuid.uuid4())
                
            columns = list(order.keys())
            placeholders = [f":{col}" for col in columns]
            
            query = f"INSERT INTO orders ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
            
            try:
                result = await session.execute(text(query), order)
                await session.commit()
                row = result.mappings().first()
                # Convert JSON strings back to objects if needed, but dict(row) usually returns dict for JSONB
                return dict(row)
            except Exception as e:
                logger.error(f"Error creating order: {e}")
                await session.rollback()
                raise
    
    async def update_order(self, order_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            # Handle JSON fields
            for json_field in ['products', 'address_snapshot', 'logs']:
                if json_field in updates and not isinstance(updates[json_field], str):
                    updates[json_field] = to_json(updates[json_field])

            set_clauses = [f"{k} = :{k}" for k in updates.keys()]
            query = f"UPDATE orders SET {', '.join(set_clauses)} WHERE id = :id RETURNING *"
            updates['id'] = order_id
            
            try:
                result = await session.execute(text(query), updates)
                await session.commit()
                row = result.mappings().first()
                return dict(row) if row else None
            except Exception as e:
                logger.error(f"Error updating order: {e}")
                await session.rollback()
                return None
    
    async def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM orders WHERE id = :id"), 
                {"id": order_id}
            )
            row = result.mappings().first()
            return dict(row) if row else None
    
    async def get_orders_by_session(self, session_id: str) -> List[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM orders WHERE session_id = :session_id"),
                {"session_id": session_id}
            )
            rows = result.mappings().all()
            return [dict(row) for row in rows]
    
    async def get_all_orders(self) -> List[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT * FROM orders ORDER BY created_at DESC"))
            rows = result.mappings().all()
            return [dict(row) for row in rows]

    async def delete_order(self, order_id: str) -> bool:
        """Delete an order and its associated logs"""
        async with AsyncSessionLocal() as session:
            try:
                # Delete logs first (foreign key)
                await session.execute(
                    text("DELETE FROM logs WHERE order_id = :order_id"),
                    {"order_id": order_id}
                )
                # Delete order
                result = await session.execute(
                    text("DELETE FROM orders WHERE id = :id"),
                    {"id": order_id}
                )
                await session.commit()
                return result.rowcount > 0
            except Exception as e:
                logger.error(f"Error deleting order {order_id}: {e}")
                await session.rollback()
                return False

    async def delete_batch(self, batch_id: str) -> bool:
        """Delete all orders and logs associated with a batch"""
        async with AsyncSessionLocal() as session:
            try:
                # 1. Delete all logs for all orders in this batch
                query_logs = """
                DELETE FROM logs 
                WHERE order_id IN (SELECT id FROM orders WHERE batch_id = :batch_id)
                """
                await session.execute(text(query_logs), {"batch_id": batch_id})
                
                # 2. Delete all orders for this batch
                result = await session.execute(
                    text("DELETE FROM orders WHERE batch_id = :batch_id"),
                    {"batch_id": batch_id}
                )
                
                await session.commit()
                logger.info(f"[OK] Deleted batch {batch_id} ({result.rowcount} orders)")
                return result.rowcount > 0
            except Exception as e:
                logger.error(f"Error deleting batch {batch_id}: {e}")
                await session.rollback()
                return False

    async def get_all_batches(self) -> List[Dict[str, Any]]:
        """Get summary of all order batches"""
        async with AsyncSessionLocal() as session:
            query = """
                SELECT 
                    batch_id, 
                    MIN(created_at) as created_at,
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_orders,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders,
                    SUM(total) as total_amount
                FROM orders 
                WHERE batch_id IS NOT NULL 
                GROUP BY batch_id 
                ORDER BY MIN(created_at) DESC
            """
            result = await session.execute(text(query))
            rows = result.mappings().all()
            return [dict(row) for row in rows]

    async def get_batch_stats(self, batch_id: str) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT status, COUNT(*) as count FROM orders WHERE batch_id = :batch_id GROUP BY status"),
                {"batch_id": batch_id}
            )
            rows = result.mappings().all()
            stats = {row['status']: row['count'] for row in rows}
            
            total = sum(stats.values())
            return {
                "batch_id": batch_id,
                "total": total,
                "successful": stats.get('completed', 0),
                "failed": stats.get('failed', 0),
                "processing": stats.get('processing', 0),
                "pending": stats.get('pending', 0)
            }

    async def clear_all_history(self) -> bool:
        """Delete all orders and logs from database"""
        async with AsyncSessionLocal() as session:
            try:
                # Delete logs first (foreign key)
                await session.execute(text("DELETE FROM logs"))
                # Delete orders
                await session.execute(text("DELETE FROM orders"))
                # Clear sessions
                await session.execute(text("DELETE FROM sessions"))
                await session.commit()
                return True
            except Exception as e:
                logger.error(f"Error clearing history: {e}")
                await session.rollback()
                return False


class TiraUserService:
    """Tira user data service using PostgreSQL"""
    
    async def get_all_users(self, offset: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM tira_users ORDER BY id ASC LIMIT :limit OFFSET :offset"),
                {"limit": limit, "offset": offset}
            )
            rows = result.mappings().all()
            return [dict(row) for row in rows]

    async def get_user_count(self) -> int:
        """Get total count of Tira users"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT COUNT(*) FROM tira_users"))
            return result.scalar() or 0

    async def get_users_by_range(self, start_index: int, end_index: int) -> List[Dict[str, Any]]:
        """
        Get users within a specific row index range (1-based index)
        Example: start=1, end=10 gets the first 10 users sequentially, regardless of ID gaps.
        """
        if start_index < 1:
            start_index = 1
        
        offset = start_index - 1
        limit = end_index - start_index + 1
        
        if limit <= 0:
            return []

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM tira_users ORDER BY id ASC LIMIT :limit OFFSET :offset"),
                {"limit": limit, "offset": offset}
            )
            rows = result.mappings().all()
            return [dict(row) for row in rows]
    
    async def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM tira_users WHERE id = :id"), 
                {"id": user_id}
            )
            row = result.mappings().first()
            return dict(row) if row else None

    async def create_tira_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            if 'cookies' in user_data and not isinstance(user_data['cookies'], str):
                user_data['cookies'] = to_json(user_data['cookies'])
            if 'extra_data' in user_data and not isinstance(user_data['extra_data'], str):
                user_data['extra_data'] = to_json(user_data['extra_data'])
                
            columns = list(user_data.keys())
            placeholders = [f":{col}" for col in columns]
            
            query = f"INSERT INTO tira_users ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
            
            try:
                result = await session.execute(text(query), user_data)
                await session.commit()
                row = result.mappings().first()
                return dict(row)
            except Exception as e:
                logger.error(f"Error creating tira user: {e}")
                await session.rollback()
                raise

    async def update_tira_user(self, user_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            # Handle JSON fields
            for json_field in ['cookies', 'extra_data']:
                if json_field in updates and not isinstance(updates[json_field], str):
                    updates[json_field] = to_json(updates[json_field])

            if not updates:
                return await self.get_user(user_id)

            set_clauses = [f"{k} = :{k}" for k in updates.keys()]
            query = f"UPDATE tira_users SET {', '.join(set_clauses)} WHERE id = :id RETURNING *"
            updates['id'] = user_id
            
            try:
                result = await session.execute(text(query), updates)
                await session.commit()
                row = result.mappings().first()
                return dict(row) if row else None
            except Exception as e:
                logger.error(f"Error updating tira user: {e}")
                await session.rollback()
                return None

    async def delete_tira_user(self, user_id: int) -> bool:
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    text("DELETE FROM tira_users WHERE id = :id"), 
                    {"id": user_id}
                )
                await session.commit()
                return result.rowcount > 0
            except Exception as e:
                logger.error(f"Error deleting tira user: {e}")
                await session.rollback()
                return False

    async def bulk_upsert_tira_users(self, users_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Bulk create or update users based on email or phone"""
        success_count = 0
        error_count = 0
        errors = []

        async with AsyncSessionLocal() as session:
            for user_data in users_list:
                try:
                    # Prepare JSON fields
                    if 'cookies' in user_data and not isinstance(user_data['cookies'], str):
                        user_data['cookies'] = to_json(user_data['cookies'])
                    if 'extra_data' in user_data and not isinstance(user_data['extra_data'], str):
                        user_data['extra_data'] = to_json(user_data['extra_data'])
                    
                    # Clean up data to only include schema columns
                    valid_columns = ['name', 'email', 'phone', 'points', 'cookies', 'extra_data', 'is_active']
                    cleaned_data = {k: v for k, v in user_data.items() if k in valid_columns}
                    
                    if not cleaned_data.get('email') and not cleaned_data.get('phone'):
                        raise ValueError("Email or Phone is required for each user")

                    # Upsert logic using ON CONFLICT on email (if exists) or manual check
                    # Since we don't have a unique constraint on email/phone yet in schema (based on init_db output), 
                    # let's do a manual check or use ON CONFLICT if we add it.
                    # Looking at init_db: CREATE INDEX IF NOT EXISTS idx_tira_users_email ON tira_users(email);
                    # It's an index, not a UNIQUE constraint.
                    
                    # For safety, let's check by email first
                    existing = None
                    if cleaned_data.get('email'):
                        res = await session.execute(text("SELECT id FROM tira_users WHERE email = :email"), {"email": cleaned_data['email']})
                        existing = res.mappings().first()
                    elif cleaned_data.get('phone'):
                        res = await session.execute(text("SELECT id FROM tira_users WHERE phone = :phone"), {"phone": cleaned_data['phone']})
                        existing = res.mappings().first()

                    if existing:
                        # Update
                        set_clauses = [f"{k} = :{k}" for k in cleaned_data.keys()]
                        query = f"UPDATE tira_users SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = :id"
                        cleaned_data['id'] = existing['id']
                        await session.execute(text(query), cleaned_data)
                    else:
                        # Insert
                        cols = list(cleaned_data.keys())
                        placeholders = [f":{col}" for col in cols]
                        query = f"INSERT INTO tira_users ({', '.join(cols)}) VALUES ({', '.join(placeholders)})"
                        await session.execute(text(query), cleaned_data)
                    
                    success_count += 1
                except Exception as e:
                    error_count += 1
                    errors.append(f"Error processing user {user_data.get('email', user_data.get('phone', 'unknown'))}: {str(e)}")
            
            await session.commit()
            return {
                "success_count": success_count,
                "error_count": error_count,
                "errors": errors
            }

    async def update_user_cookies(self, user_id: int, cookies: list):
        await self.update_tira_user(user_id, {"cookies": cookies})

    async def update_user_points(self, user_id: int, points: str):
        """Update Tira points for a specific user"""
        await self.update_tira_user(user_id, {"points": points})


class LogDataService:
    """Log-specific data service using PostgreSQL"""
    
    async def create_log(self, log_entry: Dict[str, Any]) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            if 'id' not in log_entry:
                log_entry['id'] = str(uuid.uuid4())
                
            # Handle extra_data if present
            if 'extra_data' in log_entry and log_entry['extra_data'] and not isinstance(log_entry['extra_data'], str):
                log_entry['extra_data'] = to_json(log_entry['extra_data'])
                
            columns = list(log_entry.keys())
            placeholders = [f":{col}" for col in columns]
            
            query = f"INSERT INTO logs ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
            
            try:
                result = await session.execute(text(query), log_entry)
                await session.commit()
                row = result.mappings().first()
                return dict(row)
            except Exception as e:
                logger.error(f"Error creating log entry: {e}")
                await session.rollback()
                raise

    async def get_logs_by_order(self, order_id: str) -> List[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM logs WHERE order_id = :order_id ORDER BY created_at ASC"),
                {"order_id": order_id}
            )
            rows = result.mappings().all()
            return [dict(row) for row in rows]


class AdminDataService:
    """Admin data service using PostgreSQL"""
    
    async def get_admin_by_email_or_username(self, identifier: str) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM admins WHERE email = :id OR username = :id"),
                {"id": identifier}
            )
            row = result.mappings().first()
            return dict(row) if row else None
            
    async def get_admin_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT * FROM admins WHERE id = :id"),
                {"id": admin_id}
            )
            row = result.mappings().first()
            return dict(row) if row else None


# Service instances
product_service = ProductDataService()
address_service = AddressDataService()
card_service = CardDataService()
session_service = SessionDataService()
order_service = OrderDataService()
user_service = TiraUserService()
log_service = LogDataService()
admin_service = AdminDataService()
