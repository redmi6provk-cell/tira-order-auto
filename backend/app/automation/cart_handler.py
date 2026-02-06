"""
Cart Handler for Tira Beauty
Handles all cart-related operations
"""

from typing import Optional
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

from app.utils.logger import AutomationLogger
from app.utils.delay_manager import DelayManager
from app.config import settings


class CartHandler:
    """
    Handles cart operations on Tira Beauty
    """
    
    def __init__(self, page: Page, logger: AutomationLogger, delay_manager: DelayManager):
        self.page = page
        self.logger = logger
        self.delay_manager = delay_manager
    
    async def clear_cart(self) -> int:
        """
        Clears all items from Tira cart by:
        - Decreasing quantity till 1
        - Clicking minus once more to trigger remove modal
        - Clicking Remove
        """

        self.logger.log_step("CART", "Opening cart page")

        removed_count = 0

        try:
            await self.page.goto(settings.TIRA_CART_URL, wait_until="domcontentloaded")
            await self.delay_manager.random_delay("page_load")

            while True:
                # Locate any cart item
                cart_item = await self.page.query_selector("div[class*='bag-']")
                if not cart_item:
                    self.logger.log_step("CART", f"Cart empty. Total removed: {removed_count}")
                    break

                # Quantity text (center number)
                qty_el = await cart_item.query_selector("div[class*='quantityAmount']")
                if not qty_el:
                    self.logger.log_error("CART", "Quantity element not found")
                    break

                qty_text = (await qty_el.inner_text()).strip()
                try:
                    quantity = int(qty_text)
                except:
                    self.logger.log_error("CART", f"Invalid quantity text: {qty_text}")
                    break

                # Decrease button ("-")
                decrease_btn = await cart_item.query_selector(
                    "button[aria-label*='Decrease Quantity']"
                )

                if not decrease_btn:
                    self.logger.log_error("CART", "Decrease button not found")
                    break

                # Step 1: Reduce quantity till 1
                while quantity > 1:
                    await decrease_btn.click()
                    self.logger.log_step("CART", f"Decreased quantity to {quantity - 1}")
                    await self.delay_manager.wait(0.6)

                    qty_text = (await qty_el.inner_text()).strip()
                    quantity = int(qty_text)

                # Step 2: Quantity == 1 → click "-" to open remove modal
                await decrease_btn.click()
                self.logger.log_step("CART", "Triggered remove modal")
                await self.delay_manager.wait(0.8)

                # Step 3: Click Remove in sidebar/modal
                remove_btn = await self.page.wait_for_selector(
                    "button.remove--gLSGR",
                    timeout=5000
                )
                await remove_btn.click()
                self.logger.log_step("CART", "Clicked Remove")
                await self.delay_manager.wait(1)

                removed_count += 1

            return removed_count

        except Exception as e:
            self.logger.log_error("CART", f"Clear cart failed: {str(e)}")
            return removed_count

    async def add_product_to_cart(self, product_url: str, quantity: int = 1) -> bool:
        """
        Add a product to cart by navigating to its URL.
        If quantity > 1, clicks the "Add to Bag" button multiple times with delay.
        
        Args:
            product_url: Product page URL
            quantity: Quantity to add (default: 1)
            
        Returns:
            bool: True if product was added successfully
        """
        self.logger.log_step("CART", f"Opening product page: {product_url}")
        
        try:
            # Navigate to product page
            await self.page.goto(product_url, wait_until="domcontentloaded")
            await self.delay_manager.random_delay("page_load")
            
            # Find "Add to Bag" button
            add_to_bag_selectors = [
                "button:has-text('Add to Bag')",
                "button:has-text('ADD TO BAG')",
                "button:has-text('Add to Cart')",
                "button:has-text('ADD TO CART')",
                "[data-testid='add-to-cart']",
                ".add-to-cart-btn"
            ]
            
            add_button = None
            for selector in add_to_bag_selectors:
                try:
                    add_button = await self.page.wait_for_selector(selector, timeout=5000)
                    if add_button:
                        break
                except:
                    continue
            
            if not add_button:
                self.logger.log_error("CART", "Could not find 'Add to Bag' button")
                return False
            
            # Click Add to Bag "quantity" times
            for i in range(quantity):
                await add_button.click()
                self.logger.log_step("CART", f"Clicked 'Add to Bag' ({i + 1}/{quantity})")
                await self.delay_manager.wait(2)  # fixed 2-second delay between clicks
            
            # Optional: check for success indicators
            success_indicators = [
                "text=Added to bag",
                "text=Item added",
                "[data-testid='add-to-cart-success']"
            ]
            
            for indicator in success_indicators:
                try:
                    await self.page.wait_for_selector(indicator, timeout=2000)
                    self.logger.log_step("CART", "Product added successfully")
                    return True
                except:
                    continue
            
            # Even if no success message, assume it worked if no error
            self.logger.log_step("CART", "Product likely added (no error detected)")
            return True
            
        except Exception as e:
            self.logger.log_error("CART", f"Failed to add product: {str(e)}")
            return False



    async def apply_coupon(self) -> bool:
        """
        Automatically apply the best available coupon from the Tira drawer.
        No code required; it clicks the first 'Apply' button found.
        """
        self.logger.log_step("CART", "Attempting automatic coupon application")

        try:
            # 1️⃣ Get price BEFORE coupon
            price_before = await self.get_cart_total()
            self.logger.log_step("CART", f"Price before coupon: Rs.{price_before}")
            
            if price_before <= 0:
                self.logger.log_step("WARN", "Cart total is 0, skipping coupon application")
                return False

            # 2️⃣ Locate Apply Coupon button
            apply_btn_selectors = [
                "button.couponButton--HZnLd",
                "button:has-text('Apply Coupons')",
                "button:has-text('Apply Coupons & Bank Offers')"
            ]
            
            apply_btn = None
            for selector in apply_btn_selectors:
                try:
                    apply_btn = await self.page.wait_for_selector(selector, timeout=5000)
                    if apply_btn: break
                except: continue
                
            if not apply_btn:
                self.logger.log_step("CART", "No 'Apply Coupon' button found (none available?)")
                return False

            await apply_btn.click()
            self.logger.log_step("CART", "Opened Coupon Drawer")
            await self.delay_manager.wait(2.0)

            # 3️⃣ In the drawer, find the first 'Apply' button
            # We look for ANY button with 'Apply' text inside the drawer
            try:
                drawer_apply_btn = await self.page.wait_for_selector(
                    "div.sliderContent--S8Hdp button:has-text('Apply')",
                    timeout=5000
                )
                if drawer_apply_btn:
                    await drawer_apply_btn.click()
                    self.logger.log_step("CART", "Clicked automatic Apply button in drawer")
                else:
                    self.logger.log_step("CART", "No active coupons found in drawer")
                    # Try to close the drawer
                    close_btn = await self.page.query_selector("button.sliderIcon--sQuwa")
                    if close_btn: await close_btn.click()
                    return False
            except:
                self.logger.log_step("CART", "Timed out waiting for coupons or no coupons available")
                # Try to close the drawer
                close_btn = await self.page.query_selector("button.sliderIcon--sQuwa")
                if close_btn: await close_btn.click()
                return False

            # 4️⃣ Wait for the drawer to close (it usually does on success) or just wait for price update
            await self.delay_manager.wait(3.0)

            # 5️⃣ Verify price update with retries (up to 5 seconds)
            price_after = price_before
            for i in range(5):
                price_after = await self.get_cart_total()
                if price_after < price_before:
                    self.logger.log_step("CART", f"[SUCCESS] Coupon applied automatically! Price updated: Rs.{price_before} -> Rs.{price_after}")
                    return True
                await self.page.wait_for_timeout(1000)
                
            self.logger.log_step("WARN", f"Coupon drawer interaction finished, but price remained Rs.{price_before}")
            return False

        except Exception as e:
            self.logger.log_error("CART", f"Failed to apply automatic coupon: {str(e)}")
            return False

    async def get_cart_total(self) -> float:
        """
        Extract final payable cart total (after discount) from Price Details section.
        Specifically targets the 'Total' amount, NOT 'Total MRP'.
        """
        self.logger.log_step("CART", "Extracting cart total (payable amount)")

        try:
            # Let dynamic content load
            await self.delay_manager.wait(1.0)
            
            # Strategy: Find the "Total" label (NOT "Total MRP") and get its associated value
            # Based on the HTML structure, we need to:
            # 1. Find div containing ONLY "Total" text (not "Total MRP")
            # 2. Get the sibling div with the price value
            
            raw_text = await self.page.evaluate("""() => {
                // Find all divs that might contain price labels
                const allDivs = Array.from(document.querySelectorAll('div'));
                
                // Look for the "Total" label (exact match, not "Total MRP")
                const totalLabel = allDivs.find(el => {
                    const text = el.innerText?.trim();
                    // Must be exactly "Total" and visible
                    return text === 'Total' && el.offsetParent !== null;
                });
                
                if (totalLabel) {
                    // Try to find the value in the parent container
                    const parent = totalLabel.parentElement;
                    if (parent) {
                        // Look for sibling div with class containing 'value' or 'effectivePrice'
                        const valueDiv = parent.querySelector('div[class*="value"], div[class*="effectivePrice"]');
                        if (valueDiv) {
                            return valueDiv.innerText?.trim();
                        }
                        
                        // Fallback: check next sibling
                        const nextSibling = totalLabel.nextElementSibling;
                        if (nextSibling && nextSibling.innerText?.includes('₹')) {
                            return nextSibling.innerText.trim();
                        }
                    }
                }
                
                // Fallback: Look for class-based selectors
                // Based on screenshot: div.totals--hp4Ix containing "Total" + div.value--Wjao0
                const totalsContainer = allDivs.find(el => 
                    el.className?.includes('totals') && 
                    el.innerText?.trim() === 'Total'
                );
                
                if (totalsContainer && totalsContainer.parentElement) {
                    const valueDiv = totalsContainer.parentElement.querySelector('[class*="value"][class*="effectivePrice"]');
                    if (valueDiv) {
                        return valueDiv.innerText?.trim();
                    }
                }
                
                return null;
            }""")

            if not raw_text:
                self.logger.log_error("CART", "Could not find 'Total' price element")
                return 0.0

            # Clean and parse price string
            # Handle formats like "₹2,516", "₹ 2,516", "2516", etc.
            import re
            match = re.search(r'₹?\s*([\d,]+(?:\.\d{2})?)', raw_text)

            if not match:
                self.logger.log_error("CART", f"Unable to parse price from string: {raw_text}")
                return 0.0

            clean_val = match.group(1).replace(",", "")
            total = float(clean_val)
            
            self.logger.log_step("CART", f"✓ Cart total (after discount): ₹{total}")
            return total

        except Exception as e:
            self.logger.log_error("CART", f"get_cart_total failed: {str(e)}")
            return 0.0

