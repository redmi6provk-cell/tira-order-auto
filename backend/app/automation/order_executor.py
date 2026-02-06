"""
Order Executor - Main Automation Orchestrator
Complete workflow for Tira Beauty order automation using Playwright Chromium with cookies
Enhanced with WebSocket real-time logging
"""

import asyncio
import uuid
from typing import List, Dict, Any
from datetime import datetime

from playwright.async_api import BrowserContext

from app.models.order import OrderConfig, OrderStatus, PaymentMethod, ExecutionMode, TestLoginConfig, CardDetails
from app.models.address import Address
from app.config import settings
from app.utils.logger import get_logger, AutomationLogger
from app.utils.delay_manager import DelayManager
from app.services.data_service import order_service, address_service, card_service
from app.automation.browser_manager import BrowserManager
from app.automation.address_handler import AddressHandler
from app.automation.cart_handler import CartHandler
from app.automation.checkout_handler import CheckoutHandler

# Import WebSocket manager (optional - graceful fallback if not available)
try:
    from app.utils.websocket_manager import ws_manager
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False
    ws_manager = None

logger = get_logger("order_executor")


class OrderExecutor:
    """
    Main order executor class
    Orchestrates the complete order workflow across multiple sessions
    
    Complete Workflow (Cookie-Based Authentication):
    1. Launch Playwright Chromium browser
    2. Create new browser context
    3. Load and set authentication cookies
    4. Navigate to Tira Beauty
    5. Verify cookies are working (check if logged in)
    6. Navigate to address page
    7. Remove all saved addresses
    8. Navigate to cart
    9. Remove all cart items
    10. Add products to cart (one by one via URL)
    11. Apply coupon code (if provided)
    12. Verify cart total against max limit
    13. Proceed to checkout
    14. Add new delivery address
    15. Select payment method (COD/UPI/Card)
    16. Scroll down and click Buy Now
    17. Verify order success
    18. Extract order number
    """
    
    def __init__(self):
        self.browser_manager = BrowserManager()
        self.delay_manager = DelayManager()
        self.active_orders: Dict[str, Dict] = {}
        self._session_counter = 0
    
    def _get_next_session_id(self) -> str:
        """Generate unique session ID"""
        self._session_counter += 1
        return f"session_{self._session_counter}_{uuid.uuid4().hex[:8]}"
    
    async def _broadcast_log(self, level: str, message: str, **kwargs):
        """Broadcast log to WebSocket clients if available"""
        if WEBSOCKET_AVAILABLE and ws_manager:
            try:
                await ws_manager.send_log(level=level, message=message, **kwargs)
            except Exception as e:
                logger.debug(f"Failed to broadcast log: {e}")
    
    async def _broadcast_order_update(self, **kwargs):
        """Broadcast order update to WebSocket clients if available"""
        if WEBSOCKET_AVAILABLE and ws_manager:
            try:
                await ws_manager.send_order_update(**kwargs)
            except Exception as e:
                logger.debug(f"Failed to broadcast order update: {e}")
    
    async def execute_bulk_order(self, config: OrderConfig) -> List[Dict[str, Any]]:
        """
        Execute orders across a range of users with concurrency control
        
        Args:
            config: Order configuration with user range, products, etc.
            
        Returns:
            List of order results for each user
        """
        logger.info("="*70)
        logger.info("[START] BULK ORDER EXECUTION (RANGE-BASED)")
        logger.info("="*70)
        
        batch_id = str(uuid.uuid4())
        logger.info(f"[INFO] User Range: {config.user_range_start} - {config.user_range_end}")
        logger.info(f"[INFO] Concurrent Browsers: {config.concurrent_browsers}")
        logger.info(f"[INFO] Products to Order: {len(config.products)}")
        logger.info(f"[INFO] Payment Method: {config.payment_method.value}")
        logger.info(f"[INFO] Authentication: tira_users database")
        logger.info("="*70)
        
        # Broadcast bulk order start
        await self._broadcast_log(
            level="INFO",
            message=f"Starting bulk order execution for {config.user_range_end - config.user_range_start + 1} users",
            step="BULK_START",
            metadata={
                "batch_id": batch_id,
                "user_range": [config.user_range_start, config.user_range_end],
                "concurrent_browsers": config.concurrent_browsers,
                "products_count": len(config.products)
            }
        )
        
        # 1. Fetch users in range
        from app.services.data_service import user_service
        users = await user_service.get_users_by_range(config.user_range_start, config.user_range_end)
        
        if not users:
            error_msg = f"No active users found in range {config.user_range_start}-{config.user_range_end}"
            logger.error(f"[ERROR] {error_msg}")
            await self._broadcast_log(level="ERROR", message=error_msg, step="USER_FETCH")
            return []
            
        logger.info(f"[INFO] Found {len(users)} users in range. Starting execution...")

        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(config.concurrent_browsers)
        
        # Create tasks for each user
        tasks = []
        for idx, user in enumerate(users, 1):
            session_id = f"user_{user['id']}_{uuid.uuid4().hex[:8]}"
            logger.info(f"[QUEUE] User {idx}/{len(users)} (ID: {user['id']}): Session {session_id}")
            task = self._execute_single_order_with_semaphore(
                config, session_id, idx, semaphore, user, batch_id
            )
            tasks.append(task)
        
        # Execute all tasks concurrently (with semaphore limiting)
        logger.info(f"[START] Executing orders for {len(tasks)} users...")
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Calculate statistics and log detailed errors
        successful = 0
        failed = 0
        errors = 0
        
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                errors += 1
                logger.error(f"[ERROR] Task {i+1} failed with exception: {type(res).__name__}: {res}")
                import traceback
                error_trace = "".join(traceback.format_exception(type(res), res, res.__traceback__))
                logger.error(f"Traceback for Task {i+1}:\n{error_trace}")
            elif isinstance(res, dict):
                if res.get('status') == 'completed':
                    successful += 1
                else:
                    failed += 1
                    logger.warning(f"[WARN] Task {i+1} finished with status: {res.get('status')}. Error: {res.get('error')}")
            else:
                errors += 1
                logger.error(f"[ERROR] Task {i+1} returned unexpected result type: {type(res)}")
        
        logger.info("="*70)
        logger.info("[COMPLETE] BULK ORDER EXECUTION FINISHED")
        logger.info(f"[STATS] Successful: {successful}")
        logger.info(f"[STATS] Failed: {failed}")
        logger.info(f"[STATS] Errors: {errors}")
        logger.info("="*70)
        
        # Broadcast completion
        await self._broadcast_log(
            level="INFO",
            message=f"Bulk order execution completed: {successful} successful, {failed} failed, {errors} errors",
            step="BULK_COMPLETE",
            metadata={
                "batch_id": batch_id,
                "successful": successful,
                "failed": failed,
                "errors": errors,
                "total": len(results)
            }
        )
        
        return results
    
    async def _execute_single_order_with_semaphore(
        self,
        config: OrderConfig,
        session_id: str,
        order_number: int,
        semaphore: asyncio.Semaphore,
        user: Dict[str, Any],
        batch_id: str = None
    ) -> Dict[str, Any]:
        """Execute single order with concurrency control"""
        async with semaphore:
            return await self.execute_single_order(config, session_id, order_number, user, batch_id)

    
    async def execute_single_order(
        self,
        config: OrderConfig,
        session_id: str,
        order_number: int,
        user: Dict[str, Any],
        batch_id: str = None
    ) -> List[Dict[str, Any]]:
        """
        Execute complete order workflow for a single session/user
        
        Args:
            config: Order configuration
            session_id: Unique session identifier
            order_number: Order number for logging
            user: User dictionary from tira_users table
            
        Returns:
            Dict or List[Dict] with order result(s)
        """
        start_order_num = order_number 
        results = []
        context = None
        
        try:
            # ===== STEP 1: Launch Browser & Authenticate (Once per session) =====
            # We do this OUTSIDE the repetition loop to reuse the session
            
            with AutomationLogger(session_id) as setup_logger:
                setup_logger.log_step("INIT", f"Launching browser for User ID: {user['id']}")
                context = await self.browser_manager.launch_browser(
                    session_id=session_id,
                    headless=config.headless
                )
                page = await context.new_page()
                setup_logger.log_step("INIT", "Browser launched successfully")
                
                # Load Cookies
                setup_logger.log_step("AUTH", f"Loading cookies for user: {user['name'] or user['email']}")
                user_cookies = user.get('cookies')
                if isinstance(user_cookies, str):
                    import json
                    user_cookies = json.loads(user_cookies)
                
                if not user_cookies:
                    raise Exception(f"Authentication cookies not found for user ID {user['id']}")
                
                normalized_cookies = []
                for cookie in user_cookies:
                    if 'sameSite' in cookie:
                        ss = str(cookie['sameSite']).capitalize()
                        if ss not in ['Strict', 'Lax', 'None']:
                            cookie['sameSite'] = 'Lax'
                        else:
                            cookie['sameSite'] = ss
                    normalized_cookies.append(cookie)

                await context.add_cookies(normalized_cookies)
                setup_logger.log_step("AUTH", "[OK] Cookies loaded")

                # Navigate & Verify Login
                setup_logger.log_step("AUTH", "Navigating to Tira Beauty")
                try:
                    await page.goto(settings.TIRA_BASE_URL, wait_until="domcontentloaded", timeout=60000)
                except Exception as e:
                    logger.warning(f"Navigation to base URL timed out: {e}")
                
                await self.delay_manager.random_delay("page_load")
                
                is_logged_in = await self._verify_login_status(page)
                if not is_logged_in:
                    setup_logger.log_step("WARN", "May not be logged in - proceeding anyway")
                else:
                    setup_logger.log_step("AUTH", "[OK] Successfully authenticated")

                # check for Test Login Mode
                if config.mode == ExecutionMode.TEST_LOGIN:
                    setup_logger.log_step("INFO", "TEST LOGIN COMPLETE - Stopping execution")
                    await self.delay_manager.wait(2.0)
                    return [{'status': 'completed', 'message': 'Test Login Successful', 'user_id': user['id']}]
            
            
            # ===== REPETITION LOOP =====
            for i in range(config.repetition_count):
                current_order_id = str(uuid.uuid4())
                current_order_num = start_order_num  # Keep same order number for logs or increment? 
                # Let's use a composite display for logs if needed, but db needs unique?
                # Actually, the caller passed `order_number` which suggests a linear sequence.
                # But here we are splitting one "task" into multiple orders.
                # We'll just log it as Repetition X/Y.
                
                logger.info(f"User {user['id']}: Starting Repetition {i+1}/{config.repetition_count}")
                
                # Get address data again just in case (cheap op)
                address_data = await address_service.get_address(config.address_id)
                if not address_data:
                    raise Exception(f"Address not found: {config.address_id}")
                
                # --- Fetch Card Details if card_id is provided ---
                card_details_dict = None
                if config.payment_method == PaymentMethod.CARD:
                    if config.card_id:
                        # Fetch card from database
                        card_data = await card_service.get_card(config.card_id)
                        if not card_data:
                            raise Exception(f"Card not found: {config.card_id}")
                        
                        # Convert database card to CardDetails format expected by checkout handler
                        # Database has: card_number, card_name, expiry_date (MM/YYYY), cvv
                        # Checkout handler expects: number, name, expiry (MM/YY), cvv
                        expiry_date = card_data.get('expiry_date', '')
                        # Convert MM/YYYY to MM/YY
                        if '/' in expiry_date and len(expiry_date) == 7:
                            month, year = expiry_date.split('/')
                            expiry_formatted = f"{month}/{year[-2:]}"  # Take last 2 digits of year
                        else:
                            expiry_formatted = expiry_date
                        
                        card_details_dict = {
                            'number': card_data.get('card_number', ''),
                            'name': card_data.get('card_name', ''),
                            'expiry': expiry_formatted,
                            'cvv': card_data.get('cvv', '')
                        }
                        logger.info(f"User {user['id']}: Using saved card {card_data.get('card_name')} from {card_data.get('bank_name')}")
                    elif config.card_details:
                        # Use card details provided directly in config
                        card_details_dict = config.card_details.model_dump()
                    else:
                        raise Exception("Card payment method selected but no card_id or card_details provided")
                
                # --- Random Name Logic ---
                try:
                    import json
                    import random
                    from pathlib import Path
                    
                    # Try to load names.json
                    names_path = Path("names.json")
                    if not names_path.exists():
                        # Fallback to backend/names.json if we are in app/automation
                        names_path = Path("../names.json")
                    
                    if names_path.exists():
                        with open(names_path, 'r') as f:
                            names_list = json.load(f)
                        
                        if names_list and isinstance(names_list, list):
                            random_name = random.choice(names_list)
                            
                            # Append Suffix if configured
                            if config.name_suffix:
                                random_name = f"{random_name} {config.name_suffix}"
                                
                            logger.info(f"User {user['id']}: Using random name '{random_name}' for address")
                            # Override name in address snapshot
                            address_data['full_name'] = random_name.strip()
                except Exception as e:
                    logger.warning(f"Failed to generate random name: {e}")
                # -------------------------

                # Create Order Record
                order_data = {
                    'id': current_order_id,
                    'session_id': session_id,
                    'order_number': current_order_num, # Keeping same base number, maybe confusing?
                    # Ideally we should get a new number, but we are inside the method.
                    # For now, let's append repetition to order_number if it's stored as int?
                    # The model says order_number is int. 
                    # So we can't make it "1-1". We will stick to the passed number 
                    # and rely on ID/Batch ID to distinguish.
                    # OR we just treat them as separate orders in DB.
                    'address_id': config.address_id,
                    'address_snapshot': address_data,
                    'batch_id': batch_id,
                    'profile_name': user.get('name', 'Unknown User'),
                    'tira_user_id': user.get('id'),
                    'products': [p.model_dump(mode='json') for p in config.products],
                    'payment_method': config.payment_method.value,
                    'status': OrderStatus.PENDING.value,
                    'subtotal': sum(p.price * p.quantity for p in config.products),
                    'discount': 0.0,
                    'total': 0.0,
                    'started_at': None,
                    'completed_at': None,
                    'tira_order_number': None,
                    'error_message': None,
                    'logs': []
                }
                
                await order_service.create_order(order_data)
                self.active_orders[current_order_id] = order_data
                
                try:
                    with AutomationLogger(session_id, current_order_id) as auto_logger:
                         # Broadcast Start
                        await self._update_order_status(
                            current_order_id, OrderStatus.PROCESSING,
                            started_at=datetime.now()
                        )
                        await self._broadcast_order_update(
                            order_id=current_order_id,
                            status="processing",
                            session_id=session_id
                        )
                        
                        auto_logger.log_step("INFO", f"=== STARTING ORDER REPETITION {i+1}/{config.repetition_count} ===")
                        
                        # Initialize handlers
                        address_handler = AddressHandler(page, auto_logger, self.delay_manager)
                        cart_handler = CartHandler(page, auto_logger, self.delay_manager)
                        checkout_handler = CheckoutHandler(page, auto_logger, self.delay_manager)
                        
                        # EXECUTE ORDER LOGIC
                        
                        # Address Cleanup
                        auto_logger.log_step("ADDRESS", "Navigating to address management page")
                        removed_addresses = await address_handler.clear_all_addresses()
                        auto_logger.log_step("ADDRESS", f"[OK] Removed {removed_addresses} saved addresses")
                        
                        # Cart Cleanup
                        auto_logger.log_step("CART", "Navigating to cart page")
                        removed_items = await cart_handler.clear_cart()
                        auto_logger.log_step("CART", f"[OK] Removed {removed_items} cart items")
                        
                        # Add Products
                        auto_logger.log_step("CART", f"Adding {len(config.products)} products to cart")
                        for idx, product in enumerate(config.products, 1):
                            auto_logger.log_step("CART", f"Adding product {idx}/{len(config.products)}")
                            success = await cart_handler.add_product_to_cart(
                                product_url=str(product.product_url),
                                quantity=product.quantity
                            )
                            if not success:
                                raise Exception(f"Failed to add product: {product.product_url}")
                            if idx < len(config.products):
                                await self.delay_manager.random_delay("between_products")
                        
                        # Verify Cart
                        auto_logger.log_step("CART", "Verifying cart items")
                        await page.goto(settings.TIRA_CART_URL, wait_until="domcontentloaded", timeout=60000)
                        await self.delay_manager.random_delay("page_load")
                        
                        # Apply Coupon
                        auto_logger.log_step("CART", "Applying best available coupon")
                        await cart_handler.apply_coupon()
                        
                        # Check Total
                        cart_total = await cart_handler.get_cart_total()
                        auto_logger.log_step("CART", f"[OK] Final cart total: Rs.{cart_total}")
                        
                        if config.max_cart_value and cart_total > config.max_cart_value:
                             raise ValueError(f"Cart total (Rs.{cart_total}) exceeds limit Rs.{config.max_cart_value}")
                        if cart_total <= 0:
                             raise ValueError("Cart total is invalid or zero")

                        # Add Address
                        auto_logger.log_step("CHECKOUT", "Adding delivery address")
                        address = Address(**address_data)
                        if not await address_handler.add_address(address):
                             raise Exception("Failed to add delivery address")
                        
                        # Place Order
                        auto_logger.log_step("CHECKOUT", f"Placing order with {config.payment_method.value}")
                        tira_order_number = await checkout_handler.place_order(
                            payment_method=config.payment_method,
                            card_details=card_details_dict
                        )
                        
                        if not tira_order_number:
                            raise Exception("Failed to place order")
                        
                        # Success
                        auto_logger.log_step("SUCCESS", f"[SUCCESS] REPETITION {i+1} COMPLETE! Order: {tira_order_number}")
                        
                        await self._update_order_status(
                            current_order_id, OrderStatus.COMPLETED,
                            completed_at=datetime.now(),
                            tira_order_number=tira_order_number,
                            total=cart_total
                        )
                        await self._broadcast_order_update(
                            order_id=current_order_id,
                            status="completed",
                            session_id=session_id,
                            tira_order_number=tira_order_number,
                            total=cart_total
                        )
                        
                        results.append({
                            'order_id': current_order_id,
                            'session_id': session_id,
                            'order_number': current_order_num,
                            'status': 'completed',
                            'tira_order_number': tira_order_number,
                            'total': cart_total
                        })
                        
                        # Small delay between repetitions
                        if i < config.repetition_count - 1:
                            auto_logger.log_step("WAIT", "Waiting before next repetition...")
                            await self.delay_manager.random_delay("page_load")

                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"[ERROR] Repetition {i+1} failed: {error_msg}")
                    
                    await self._update_order_status(
                        current_order_id, OrderStatus.FAILED,
                        completed_at=datetime.now(),
                        error_message=error_msg
                    )
                    await self._broadcast_order_update(
                        order_id=current_order_id,
                        status="failed",
                        session_id=session_id,
                        error=error_msg
                    )
                    
                    results.append({
                        'order_id': current_order_id,
                        'session_id': session_id,
                        'order_number': current_order_num,
                        'status': 'failed',
                        'error': error_msg
                    })
                    # If one fails, should we stop? The user asked to "repeat", implied sequence.
                    # Usually if one fails (e.g. account banned, out of stock), next might also fail.
                    # But if it's a random glitch, next might work.
                    # I will CONTINUE to next repetition unless it's a critical auth failure.
                    # Auth failure would have been caught at start, but if session dies?
                    # checking context
                    if context.pages and context.pages[0].is_closed():
                         logger.error("Browser page closed unexpectedly. Aborting repetitions.")
                         break

        except Exception as e:
            logger.error(f"[CRITICAL] Session failed: {e}")
            # If setup failed, we register a generic failure for this user
            # OR we just return empty results?
            # Better to return a failed result so it's counted
            return {
                'order_id': str(uuid.uuid4()),
                'session_id': session_id,
                'order_number': order_number,
                'status': 'failed',
                'error': f"Session initialization failed: {str(e)}"
            }
            
        finally:
            if context:
                try:
                    await self.browser_manager.close_browser(session_id)
                    logger.info(f"[CLEANUP] Browser closed for session: {session_id}")
                except Exception as e:
                    logger.error(f"[ERROR] Failed to close browser {session_id}: {e}")
            
            # Clean up active orders
            for res in results:
                if res.get('order_id') in self.active_orders:
                    del self.active_orders[res.get('order_id')]

        # Return single dict if 1 result (for compat) or find better way?
        # The caller expects Dict[str, Any]. 
        # But wait, execute_bulk_order does gather(*tasks).
        # And then iterates over results.
        # If I return a list, execute_bulk_order needs to handle it.
        # I should simply return the LAST result or a summary? 
        # NO, I should probably update `execute_bulk_order` to handle a LIST of results from each task.
        
        return results # Returning list now

    
    async def _verify_login_status(self, page) -> bool:
        """Verify if user is logged in by checking for login indicators"""
        try:
            # Check for generic Login button or "Sign In"
            try:
                login_indicators = [
                    "button:has-text('Login')",
                    "a:has-text('Login')",
                    "text=Sign In"
                ]
                for indicator in login_indicators:
                    if await page.is_visible(indicator, timeout=1000):
                        logger.debug(f"[AUTH] Found login/signin indicator '{indicator}' - Assuming logged out")
                        return False
            except:
                pass

            # Common indicators of logged-in state (POSITIVE CHECK)
            logged_in_indicators = [
                "text=My Account",
                "a[href*='/profile']",
                "button[aria-label='Account']",
                ".profile-icon", 
                "text=Hi,",
                "text=Hello,"
            ]
            
            for indicator in logged_in_indicators:
                try:
                    if await page.is_visible(indicator, timeout=2000):
                        logger.debug(f"[AUTH] Found logged-in indicator: {indicator}")
                        return True
                except:
                    continue
            
            logger.debug("[AUTH] No positive logged-in indicators found")
            return False
            
        except Exception as e:
            logger.warning(f"[AUTH] Error checking login status: {e}")
            return False
    
    async def _update_order_status(
        self,
        order_id: str,
        status: OrderStatus,
        **kwargs
    ):
        """Update order status and additional fields"""
        updates = {
            'status': status.value,
            **kwargs
        }
        await order_service.update_order(order_id, updates)
        
        # Update in-memory cache
        if order_id in self.active_orders:
            self.active_orders[order_id].update(updates)
    
    def get_active_orders(self) -> List[Dict[str, Any]]:
        """Get currently active/running orders"""
        return list(self.active_orders.values())
    
    async def test_user_login(self, user_id: int, headless: bool = True) -> Dict[str, Any]:
        """
        Test if a user's cookies are valid by attempting to log in
        """
        session_id = f"test_login_{user_id}_{uuid.uuid4().hex[:8]}"
        logger.info(f"[TEST] Testing login for User ID: {user_id}")
        
        try:
            # 1. Fetch user
            from app.services.data_service import user_service
            user = await user_service.get_user(user_id)
            if not user:
                return {"success": False, "message": "User not found", "cookies_valid": False}
            
            # 2. Launch Browser
            context = await self.browser_manager.launch_browser(session_id=session_id, headless=headless)
            page = await context.new_page()
            
            # 3. Load Cookies
            user_cookies = user.get('cookies')
            if isinstance(user_cookies, str):
                import json
                user_cookies = json.loads(user_cookies)
                
            if not user_cookies:
                await self.browser_manager.close_browser(session_id)
                return {"success": False, "message": "No cookies found for user", "cookies_valid": False}
            
            normalized_cookies = []
            for cookie in user_cookies:
                # Fix sameSite (Playwright expects Strict, Lax, or None)
                if 'sameSite' in cookie:
                    ss = str(cookie['sameSite']).capitalize()
                    if ss not in ['Strict', 'Lax', 'None']:
                        cookie['sameSite'] = 'Lax'
                    else:
                        cookie['sameSite'] = ss
                normalized_cookies.append(cookie)

            await context.add_cookies(normalized_cookies)
            
            # 4. Navigate & Verify
            await page.goto(settings.TIRA_BASE_URL, wait_until="domcontentloaded", timeout=30000)
            await self.delay_manager.random_delay("page_load")
            
            is_logged_in = await self._verify_login_status(page)
            
            if is_logged_in:
                # Extract User Details (Email/Phone)
                try:
                    logger.info(f"[TEST] Extracting user details for user {user_id}")
                    details = await self._extract_user_details(page)
                    
                    if details:
                        updates = {}
                        if details.get('email'):
                            updates['email'] = details['email']
                        if details.get('phone'):
                            updates['phone'] = details['phone']
                        if details.get('name'):
                            updates['name'] = details['name']
                            
                        if updates:
                            logger.info(f"[TEST] Updating user {user_id} with: {updates}")
                            await user_service.update_tira_user(user_id, updates)
                            # Update local user object for return
                            user.update(updates)
                except Exception as e:
                    logger.error(f"[TEST] Failed to extract/update user details: {e}")
            
            if not is_logged_in:
                # Take debug screenshot if failed
                screenshot_path = f"debug_login_fail_{user_id}_{uuid.uuid4().hex[:6]}.png"
                try:
                    await page.screenshot(path=screenshot_path)
                    logger.info(f"[TEST] Login verification failed. Saved debug screenshot: {screenshot_path}")
                except Exception as s_e:
                    logger.error(f"[TEST] Failed to take screenshot: {s_e}")
            
            await self.browser_manager.close_browser(session_id)
            
            return {
                "success": True,
                "message": "Login successful" if is_logged_in else "Login failed (cookies may be expired or verification failed)",
                "cookies_valid": is_logged_in,
                "user_name": user.get('name'),
                # Return updated details if any
                "email": user.get('email'),
                "phone": user.get('phone')
            }
            
        except Exception as e:
            logger.error(f"[TEST] Login test failed: {e}")
            try:
                await self.browser_manager.close_browser(session_id)
            except:
                pass
            return {"success": False, "message": str(e), "cookies_valid": False}

    async def _extract_user_details(self, page) -> Dict[str, str]:
        """
        Extract user details (Email, Phone, Name) from profile page:
        https://www.tirabeauty.com/profile/details
        """
        details = {}
        try:
            target_url = f"{settings.TIRA_BASE_URL}/profile/details"
            # Only navigate if not already there
            if page.url != target_url:
                await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
                await self.delay_manager.random_delay("page_load")
            
            # Wait for form to govern visibility (specifically email or phone)
            try:
                # Wait for email input specifically, this confirms the form is loaded
                await page.wait_for_selector("input[name='email'], input[type='email']", state="visible", timeout=10000)
                # Small delay to allow value hydration (React often sets value after mount)
                await self.delay_manager.wait(2.0)
            except Exception as e:
                logger.warning(f"Timeout waiting for profile inputs: {e}")

            # 1. Extract Email
            # Selectors based on likely attributes
            email_selectors = [
                "input[name='email']",
                "input[type='email']",
                "input[placeholder*='Email']",
                "input[id*='email']"
            ]
            
            for selector in email_selectors:
                if await page.is_visible(selector):
                    val = await page.input_value(selector)
                    logger.debug(f"[EXTRACT] Found email input ({selector}): '{val}'")
                    if val and '@' in val:
                        details['email'] = val
                        break

            # 2. Extract Phone
            phone_selectors = [
                "input[placeholder='Phone Number']",
                "input[name='mobile']",
                "input[name='phone']",
                "input[type='tel']",
                "input[placeholder*='Phone']",
                "input[placeholder*='Mobile']",
                "input[aria-label='Phone Number']"
            ]
            
            for selector in phone_selectors:
                if await page.is_visible(selector):
                    val = await page.input_value(selector)
                    logger.debug(f"[EXTRACT] Found phone input ({selector}): '{val}'")
                    # Simple validation/cleaning
                    if val and len(val.strip()) >= 10:
                        details['phone'] = val.strip()
                        break
            
            # 3. Extract Name (First + Last)
            first_name = ""
            if await page.is_visible("input[name='firstName']"):
                first_name = await page.input_value("input[name='firstName']")
            elif await page.is_visible("input[placeholder*='First Name']"):
                 first_name = await page.input_value("input[placeholder*='First Name']")
                 
            last_name = ""
            if await page.is_visible("input[name='lastName']"):
                last_name = await page.input_value("input[name='lastName']")
            elif await page.is_visible("input[placeholder*='Last Name']"):
                 last_name = await page.input_value("input[placeholder*='Last Name']")
            
            if first_name or last_name:
                details['name'] = f"{first_name} {last_name}".strip()
            
            if not details:
                # Take debug screenshot if extraction failed but we are on the page
                screenshot_path = f"debug_profile_extract_fail_{uuid.uuid4().hex[:6]}.png"
                await page.screenshot(path=screenshot_path)
                logger.warning(f"Failed to extract any user details. Screenshot: {screenshot_path}")
                # Log HTML for analysis
                # html = await page.content()
                # logger.debug(f"Page HTML: {html[:1000]}...")
                
            return details
            
        except Exception as e:
            logger.warning(f"Error extracting user details: {e}")
            return {}

    async def cleanup(self):
        """Cleanup all resources"""
        await self.browser_manager.stop()


    async def execute_test_login_bulk(self, config: "TestLoginConfig") -> List[Dict[str, Any]]:
        """
        Execute test login for a range of users
        """
        logger.info("="*70)
        logger.info("[START] BULK TEST LOGIN EXECUTION")
        logger.info(f"[INFO] User Range: {config.user_range_start} - {config.user_range_end}")
        logger.info(f"[INFO] Concurrent Browsers: {config.concurrent_browsers}")
        logger.info("="*70)

        # 1. Fetch users in range
        from app.services.data_service import user_service
        users = await user_service.get_users_by_range(config.user_range_start, config.user_range_end)
        
        if not users:
            logger.error(f"[ERROR] No active users found in range {config.user_range_start}-{config.user_range_end}")
            return []
            
        logger.info(f"[INFO] Found {len(users)} users in range. Starting login tests...")

        semaphore = asyncio.Semaphore(config.concurrent_browsers)
        tasks = []
        
        async def bounded_test_login(user_id):
            async with semaphore:
                return await self.test_user_login(user_id, headless=config.headless)

        for user in users:
            tasks.append(bounded_test_login(user['id']))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

# Global executor instance
order_executor = OrderExecutor()