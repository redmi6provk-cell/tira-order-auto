"""
Checkout Handler for Tira Beauty
Handles checkout process including address selection/addition and payment
FIXED: Proper scrolling and Cash on Delivery selection
"""

from typing import Optional
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

from app.models.address import Address
from app.models.order import PaymentMethod
from app.utils.logger import AutomationLogger
from app.utils.delay_manager import DelayManager
from app.config import settings


class CheckoutHandler:
    """
    Handles checkout operations on Tira Beauty
    """
    
    def __init__(self, page: Page, logger: AutomationLogger, delay_manager: DelayManager):
        self.page = page
        self.logger = logger
        self.delay_manager = delay_manager
    
    

        
    async def _select_cod_payment(self) -> bool:
        """Find and select Cash on Delivery option"""
        try:
            self.logger.log_step("CHECKOUT", "Scrolling payment slider to bottom to find COD")

            # Scroll multiple times with delays to ensure we reach the bottom
            for scroll_attempt in range(3):
                await self.page.evaluate("""() => {
                    const slider = document.querySelector('div.sliderContent--S8Hdp');
                    if (!slider) return;
                    slider.scrollTop = slider.scrollHeight;
                }""")
                await self.delay_manager.wait(0.5)

            # --------------------------------------------------
            # Find and Select Cash on Delivery
            # --------------------------------------------------
            self.logger.log_step("CHECKOUT", "Looking for 'Cash on Delivery' option")

            # Try multiple selector strategies for COD
            cod_found = False
            cod_selectors = [
                "div.sliderContent--S8Hdp >> text='Cash on Delivery'",
                "div.sliderContent--S8Hdp >> text=/Cash.*Delivery/i",
                "div.titleText--UvMR9:has-text('Cash on Delivery')",
                "text='Cash on Delivery'",
                "div[class*='paymentTableItem']:has-text('Cash on Delivery')",
            ]

            cod_element = None
            for selector in cod_selectors:
                try:
                    cod_element = await self.page.wait_for_selector(selector, state="visible", timeout=3000)
                    if cod_element:
                        self.logger.log_step("CHECKOUT", f"[OK] COD found with selector: {selector}")
                        cod_found = True
                        break
                except:
                    continue

            if not cod_found or not cod_element:
                self.logger.log_error("CHECKOUT", "Could not find Cash on Delivery option")
                await self.page.screenshot(path="/tmp/cod_not_found.png")
                return False

            # Scroll COD option into view and click it
            await cod_element.scroll_into_view_if_needed()
            await self.delay_manager.wait(0.5)

            # Try clicking with multiple methods
            click_success = False
            
            # Method 1: Regular click
            try:
                await cod_element.click()
                click_success = True
            except:
                pass

            # Method 2: Force click
            if not click_success:
                try:
                    await cod_element.click(force=True)
                    click_success = True
                except:
                    pass

            # Method 3: JS click
            if not click_success:
                try:
                    await self.page.evaluate("(el) => el.click()", cod_element)
                    click_success = True
                except:
                    pass

            if not click_success:
                self.logger.log_error("CHECKOUT", "All click methods failed for COD")
                return False

            self.logger.log_step("CHECKOUT", "Cash on Delivery selected successfully")
            await self.delay_manager.wait(1.0)
            return True

        except Exception as e:
            self.logger.log_error("CHECKOUT", f"COD selection failed: {str(e)}")
            return False

    async def _select_card_payment(self, card_details: Optional[dict] = None) -> bool:
        """Select Credit/Debit Card payment method and enter details"""
        if not card_details:
             self.logger.log_error("CHECKOUT", "Card details missing")
             return False
             
        try:
            self.logger.log_step("CHECKOUT", "Selecting Credit/Debit Card option")
            
            # 1. Find and click "Pay By Credit/Debit card" or "Add a new card"
            selectors = [
                 "text=Pay By Credit/Debit card",
                 "text='Credit/Debit Card'",
                 "text='Add a new card'"]
            
            card_found = False
            for selector in selectors:
                try:
                    card_section = await self.page.wait_for_selector(selector, timeout=3000)
                    if card_section:
                        await card_section.scroll_into_view_if_needed()
                        await card_section.click()
                        card_found = True
                        break
                except:
                    continue
            
            # 2. Wait for inputs
            self.logger.log_step("CHECKOUT", "Filling card details")
            await self.delay_manager.wait(1.0)
            
            # Card Number
            card_num_selectors = ["input[placeholder*='card number']", "input[name='cardnumber']", "input[id*='card']"]
            for sel in card_num_selectors:
                try:
                    await self.page.fill(sel, card_details['number'])
                    break
                except: continue
            
            # Name
            name_selectors = ["input[placeholder*='name on the card']", "input[name='name']", "input[placeholder*='Cardholder']"]
            for sel in name_selectors:
                try:
                    await self.page.fill(sel, card_details['name'])
                    break
                except: continue
            
            # Expiry - Expecting MM/YY or separate MM and YY
            if '/' in card_details['expiry']:
                val = card_details['expiry']
                mm = val.split('/')[0]
                yy = val.split('/')[1]
            else:
                mm = card_details['expiry'][:2]
                yy = card_details['expiry'][-2:]
                
            # Try MM/YY single input first
            try:
                await self.page.fill("input[placeholder*='MM/YY']", f"{mm}/{yy}")
            except:
                # Try separate
                try:
                    await self.page.fill("input[placeholder='MM']", mm)
                    await self.page.fill("input[placeholder='YY']", yy)
                except:
                    # Generic expiry
                    try:
                        await self.page.fill("input[placeholder*='Expiry']", f"{mm}{yy}")
                    except: pass
                
            # CVV
            cvv_selectors = ["input[placeholder*='CVV']", "input[name='cvv']", "input[type='password']"]
            for sel in cvv_selectors:
                try:
                    # CVV is often the only password field or has CVV in name
                    await self.page.fill(sel, card_details['cvv'])
                    break
                except: continue
            
            self.logger.log_step("CHECKOUT", "Card details filled successfully")
            await self.delay_manager.wait(1.0)
            return True
            
        except Exception as e:
            self.logger.log_error("CHECKOUT", f"Card selection failed: {str(e)}")
            return False

    async def _select_upi_payment(self) -> bool:
        """Select UPI payment method"""
        self.logger.log_error("CHECKOUT", "UPI payment method not implemented yet")
        # Placeholder for UPI logic
        return False

    async def _handle_otp_wait(self) -> bool:
        """Wait for OTP screen and handle 'Skip' if requested"""
        self.logger.log_step("CHECKOUT", "Waiting 20 seconds for OTP input or screen appearance...")
        
        # 20 second wait as requested
        # We also check for a 'Skip' button during this wait
        for _ in range(20):
            await self.delay_manager.wait(1.0)
            
            # Check for "Skip" button (it might be in an iframe or main page)
            try:
                # Common "Skip" button selectors
                skip_selectors = [
                    "button:has-text('Skip')",
                    "text='Skip'",
                    "div:has-text('Skip')",
                    "a:has-text('Skip')"
                ]
                for selector in skip_selectors:
                    skip_btn = await self.page.query_selector(selector)
                    if skip_btn and await skip_btn.is_visible():
                        self.logger.log_step("CHECKOUT", f"Found 'Skip' button, clicking it...")
                        await skip_btn.click()
                        return True
            except:
                pass
                
        self.logger.log_step("CHECKOUT", "OTP wait period finished")
        return True

    async def place_order(
        self, 
        payment_method: PaymentMethod = PaymentMethod.CASH_ON_DELIVERY,
        card_details: Optional[dict] = None
    ):
        self.logger.log_step("CHECKOUT", f"Starting order placement flow with {payment_method.value}")

        try:
            # 1. Locate & click "Select Payment Method"
            self.logger.log_step("CHECKOUT", "Waiting for 'Select Payment Method' button")
            await self.page.click("button:has-text('Select Payment Method')")
            self.logger.log_step("CHECKOUT", "Clicked 'Select Payment Method'")

            # 2. Wait for payment slider to be fully visible
            await self.page.wait_for_selector("div.sliderWrapper--PE_Bz", state="visible", timeout=10000)
            await self.page.wait_for_selector("div.sliderContent--S8Hdp", state="visible", timeout=10000)
            self.logger.log_step("CHECKOUT", "Payment slider opened")
            await self.delay_manager.wait(1.0)

            # 3. Select Payment Method
            selection_success = False
            if payment_method == PaymentMethod.CASH_ON_DELIVERY:
                selection_success = await self._select_cod_payment()
            elif payment_method == PaymentMethod.CARD:
                selection_success = await self._select_card_payment(card_details)
            elif payment_method == PaymentMethod.UPI:
                selection_success = await self._select_upi_payment()
            else:
                self.logger.log_error("CHECKOUT", f"Unsupported payment method: {payment_method}")

            if not selection_success:
                self.logger.log_error("CHECKOUT", "Failed to select payment method. Aborting.")
                return None

            # 4. Click Back Icon to close payment slider
            back_btn = await self.page.wait_for_selector("button.sliderIcon--sQuwa", state="visible", timeout=10000)
            await back_btn.click()
            self.logger.log_step("CHECKOUT", "Payment slider closed")
            await self.delay_manager.wait(1.0)

            # 5. Click Buy Now button
            self.logger.log_step("CHECKOUT", "Looking for 'Buy Now' button")
            buy_now_btn = await self.page.wait_for_selector("button.customBtn--gNano.primary--HPfPc", state="visible", timeout=10000)
            
            is_disabled = await buy_now_btn.evaluate("(btn) => btn.disabled")
            if is_disabled:
                self.logger.log_error("CHECKOUT", "Buy Now button is disabled")
                return None

            self.logger.log_step("CHECKOUT", "Clicking 'Buy Now' button")
            try:
                await buy_now_btn.click()
            except:
                await buy_now_btn.click(force=True)

            # 6. Handle OTP Wait for Card Payments
            if payment_method == PaymentMethod.CARD:
                await self._handle_otp_wait()

            # 7. Wait for order confirmation
            self.logger.log_step("CHECKOUT", "Waiting for order confirmation")
            await self.delay_manager.wait(5)

            success = await self._verify_order_success()
            if success:
                self.logger.log_step("CHECKOUT", "[OK] Order placed successfully")
                order_number = await self._extract_order_number()
                if order_number:
                    self.logger.log_step("CHECKOUT", f"Order Number: {order_number}")
                    return f"ORDER_PLACED:{order_number}"
                else:
                    return "ORDER_PLACED"
            else:
                self.logger.log_error("CHECKOUT", "Could not verify order success")
                # Final check after longer wait
                await self.delay_manager.wait(5)
                if await self._verify_order_success():
                    self.logger.log_step("CHECKOUT", "[OK] Order confirmed after extended wait")
                    return "ORDER_PLACED"
                return None

        except Exception as e:
            self.logger.log_error("CHECKOUT", f"Order placement failed: {str(e)}")
            try:
                await self.page.screenshot(path="/tmp/order_error.png")
            except:
                pass
            return None

    
    async def _verify_order_success(self) -> bool:
        """Verify that order was placed successfully"""
        try:
            # Check URL for confirmation page
            try:
                await self.page.wait_for_url("**/order-confirmation**", timeout=10000)
                self.logger.log_step("CHECKOUT", "Order confirmation page loaded")
                return True
            except:
                pass
            
            # Check for success indicators
            success_indicators = [
                "text=Order placed",
                "text=Order Placed",
                "text=Thank you",
                "text=Order confirmed",
                "text=Order Confirmed",
                "text=Success",
                "[data-testid='order-success']",
                ".order-success"
            ]
            
            for indicator in success_indicators:
                try:
                    element = await self.page.wait_for_selector(indicator, timeout=5000)
                    if element:
                        self.logger.log_step("CHECKOUT", "Found order success indicator")
                        return True
                except:
                    continue
            
            return False
            
        except:
            return False
    
    async def _extract_order_number(self) -> Optional[str]:
        """Extract order number from confirmation page"""
        try:
            # Common patterns for order number/ID
            order_selectors = [
                "[data-testid='order-number']",
                "[data-testid='order-id']",
                ".order-number",
                ".order-id"
            ]
            
            for selector in order_selectors:
                try:
                    element = await self.page.wait_for_selector(selector, timeout=3000)
                    if element:
                        text = await element.text_content()
                        # Extract alphanumeric order ID
                        import re
                        matches = re.findall(r'[A-Z0-9]{6,}', text.strip())
                        if matches:
                            return matches[0]
                except:
                    continue
            
            # Try to find in page text
            try:
                page_text = await self.page.content()
                import re
                # Look for patterns like "Order #ABC123" or "Order ID: ABC123"
                matches = re.findall(r'Order\s*(?:#|ID|Number)?[:\s]*([A-Z0-9]{6,})', page_text, re.IGNORECASE)
                if matches:
                    return matches[0]
            except:
                pass
            
            return None
            
        except:
            return None