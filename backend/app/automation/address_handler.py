

"""
Address Handler for Tira Beauty
Handles address-related operations like clearing existing addresses
"""

from typing import Optional
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

from app.utils.logger import AutomationLogger
from app.utils.delay_manager import DelayManager
from app.config import settings
from app.models.address import Address


class AddressHandler:
    """
    Handles address operations on Tira Beauty
    """
    
    def __init__(self, page: Page, logger: AutomationLogger, delay_manager: DelayManager):
        self.page = page
        self.logger = logger
        self.delay_manager = delay_manager
    
    async def clear_all_addresses(self) -> int:
        """
        Remove all saved addresses by:
        Edit → Delete → Confirm in modal (Remove button)
        """
        self.logger.log_step("ADDRESS", "Opening address page")

        removed_count = 0

        try:
            await self.page.goto(settings.TIRA_ADDRESS_URL, wait_until="domcontentloaded")
            await self.delay_manager.random_delay("page_load")
            
            # Additional wait to ensure page is fully loaded
            await self.page.wait_for_timeout(2000)
            
            # Debug: Log page content to see what's actually there
            self.logger.log_step("ADDRESS", f"Current URL: {self.page.url}")
            
            while True:
                # Try multiple possible selectors for edit buttons
                edit_button_selectors = [
                    "button.editButton--j2He_",
                    
                ]
                
                edit_btn = None
                found_selector = None
                
                for selector in edit_button_selectors:
                    try:
                        # Check if any elements exist
                        count = await self.page.locator(selector).count()
                        self.logger.log_step("ADDRESS", f"Found {count} elements with selector: {selector}")
                        
                        if count > 0:
                            edit_btn = self.page.locator(selector).first
                            found_selector = selector
                            break
                    except Exception as e:
                        self.logger.log_step("ADDRESS", f"Error with selector {selector}: {e}")
                        continue
                
                if not edit_btn:
                    self.logger.log_step(
                        "ADDRESS", f"No addresses left. Total removed: {removed_count}"
                    )
                    
                    # Debug: Take screenshot and log HTML if no addresses found
                    if removed_count == 0:
                        screenshot_path = f"/home/claude/address_debug_{removed_count}.png"
                        await self.page.screenshot(path=screenshot_path)
                        self.logger.log_step("ADDRESS", f"Saved debug screenshot: {screenshot_path}")
                        
                        # Log the HTML structure
                        html_content = await self.page.content()
                        self.logger.log_step("ADDRESS", f"Page HTML length: {len(html_content)}")
                    
                    break

                # Click the edit button
                self.logger.log_step("ADDRESS", f"Clicking edit button (selector: {found_selector})")
                await edit_btn.click()
                await self.delay_manager.random_delay("click")

                # 2️⃣ Wait for Delete button - try multiple selectors
                delete_selectors = [
                    "button.btnOutlined--B54uV:has-text('Delete')",
                    "button:has-text('Delete')",
                    "[class*='btnOutlined']:has-text('Delete')"
                ]
                
                delete_btn = None
                for selector in delete_selectors:
                    try:
                        delete_btn = await self.page.wait_for_selector(selector, timeout=5000)
                        if delete_btn:
                            self.logger.log_step("ADDRESS", f"Found Delete button with: {selector}")
                            break
                    except PlaywrightTimeout:
                        continue
                
                if not delete_btn:
                    self.logger.log_error("ADDRESS", "Could not find Delete button")
                    # Take screenshot for debugging
                    await self.page.screenshot(path=f"/home/claude/delete_not_found_{removed_count}.png")
                    break

                await delete_btn.click()
                self.logger.log_step("ADDRESS", "Clicked Delete")
                await self.delay_manager.random_delay("click")

                # 3️⃣ Wait for confirmation modal and click "Remove" button
                try:
                    # Multiple selectors for the Remove button
                    remove_selectors = [
                        "button.strokedBtn--EydH4.specialBtn--ug5KP:has-text('Remove')",
                        "button:has-text('Remove')",
                        "button.strokedBtn--EydH4:has-text('Remove')",
                        "[class*='specialBtn']:has-text('Remove')"
                    ]
                    
                    remove_btn = None
                    for selector in remove_selectors:
                        try:
                            remove_btn = await self.page.wait_for_selector(selector, timeout=3000)
                            if remove_btn:
                                self.logger.log_step("ADDRESS", f"Found Remove button with: {selector}")
                                break
                        except PlaywrightTimeout:
                            continue
                    
                    if not remove_btn:
                        raise Exception("Could not find Remove button")
                    
                    await remove_btn.click()
                    self.logger.log_step("ADDRESS", "Confirmed deletion with Remove button")
                    await self.delay_manager.random_delay("click")
                    
                except Exception as e:
                    self.logger.log_error("ADDRESS", f"Error clicking Remove: {e}")
                    # Take screenshot
                    await self.page.screenshot(path=f"/home/claude/remove_error_{removed_count}.png")
                    break

                removed_count += 1
                self.logger.log_step("ADDRESS", f"Successfully removed address {removed_count}")

                # 4️⃣ Wait for modal to close & list refresh
                await self.page.wait_for_timeout(2000)

            return removed_count

        except Exception as e:
            self.logger.log_error("ADDRESS", f"Failed clearing addresses: {e}")
            # Take final screenshot
            try:
                await self.page.screenshot(path=f"/home/claude/address_final_error.png")
            except:
                pass
            return removed_count




    async def add_address(self, address: Address) -> bool:
        """
        Add new delivery address in checkout sidebar
        
        Args:
            address: Address object with delivery details
            
        Returns:
            bool: True if address was added successfully
        """
        self.logger.log_step("CHECKOUT", "Adding new delivery address")
        
        try:
            # Wait for address section to load
            await self.delay_manager.random_delay("page_load")
            
            # Click "Add New Address" button - try the specific selector from screenshot first
            add_new_selectors = [
                "button.customBtn--gNano.primary--HPfPc.lg--vOMzj.undefined.custom-btn:has-text('Add Address')",
                "button:has-text('Add Address')",
                "button:has-text('Add New Address')",
                "button:has-text('ADD NEW ADDRESS')",
                "[data-testid='add-new-address']",
                ".custom-btn:has-text('Add')"
            ]
            
            add_clicked = False
            for selector in add_new_selectors:
                try:
                    element = await self.page.wait_for_selector(selector, timeout=5000)
                    if element:
                        await element.scroll_into_view_if_needed()
                        await element.click()
                        self.logger.log_step("CHECKOUT", f"Clicked 'Add Address' button using: {selector}")
                        add_clicked = True
                        break
                except:
                    continue
            
            if not add_clicked:
                self.logger.log_error("CHECKOUT", "Could not find 'Add New Address' button")
                return False
            
            await self.delay_manager.random_delay("click")
            
            # Fill address form fields using actual field names from screenshots
            
            # Flat No/House No/Building No
            flat_filled = await self._fill_form_field(
                field_name="Flat/House Number",
                value=address.flat_number or "",
                selectors=[
                    "input[name='address']",  # From screenshot
                    "input[placeholder*='Flat No/House No/Building No']",
                    "input[name*='flat']",
                    "input[name*='house']"
                ]
            )
            
            # Building Name/Street/Society
            street_filled = await self._fill_form_field(
                field_name="Street/Building/Society",
                value=address.street or "",
                selectors=[
                    "input[placeholder*='Building Name/Street/Society']",
                    "input[name*='street']",
                    "input[name*='building']",
                    "input[name*='area']"
                ]
            )
            
            # Pincode (this usually triggers auto-fill of city/state)
            pincode_filled = await self._fill_form_field(
                field_name="Pincode",
                value=address.pincode,
                selectors=[
                    "input[id='pincode']",  # From screenshot
                    "input[name='pincode']",
                    "input[placeholder*='Pincode']",
                    "input[type='text'][maxlength='6']"
                ]
            )
            
            if not pincode_filled:
                self.logger.log_error("CHECKOUT", "Failed to fill pincode - this is critical")
                return False
            
            # Wait for city/state auto-fill
            await self.delay_manager.random_delay("page_load")
            
            # Full Name (if provided and field exists)
            if address.full_name:
                await self._fill_form_field(
                    field_name="Full Name",
                    value=address.full_name,
                    selectors=[
                        "input[placeholder*='Full Name']",
                        "input[name*='fullname']",
                        "input[name*='name']"
                    ]
                )
            
            
            # Select "Home" address type - use exact selector from screenshot
            home_selectors = [
                "button:has-text('Home')",
                ".formItem--jiVvq button:has-text('Home')",
                "label:has-text('Home')",
                "input[value='home']"
            ]
            
            for selector in home_selectors:
                try:
                    element = await self.page.wait_for_selector(selector, timeout=3000)
                    if element:
                        # Check if it's already selected
                        classes = await element.get_attribute("class") or ""
                        
                        # If not selected (look for active/selected class)
                        if "active" not in classes.lower() and "selected" not in classes.lower():
                            await element.click()
                            self.logger.log_step("CHECKOUT", "Selected 'Home' address type")
                            await self.delay_manager.random_delay("click")
                        else:
                            self.logger.log_step("CHECKOUT", "'Home' already selected")
                        break
                except:
                    continue
            
            # Click "Review Order Detail" button (the actual save button from screenshot)
            save_selectors = [
                "button:has-text('Review Order Detail')",
                "button[type='submit']",
                "button:has-text('Save')",
                "button:has-text('SAVE')",
                ".primary:has-text('Review')"
            ]
            
            save_clicked = False
            for selector in save_selectors:
                try:
                    element = await self.page.wait_for_selector(selector, timeout=3000)
                    if element:
                        # Scroll to button
                        await element.scroll_into_view_if_needed()
                        await self.delay_manager.wait(0.5)
                        
                        await element.click()
                        self.logger.log_step("CHECKOUT", f"Clicked save button using: {selector}")
                        save_clicked = True
                        break
                except:
                    continue
            
            if not save_clicked:
                self.logger.log_error("CHECKOUT", "Could not find Save/Review button")
                return False
            
            await self.delay_manager.random_delay("page_load")
            
            self.logger.log_step("CHECKOUT", "Address saved successfully")
            return True
            
        except Exception as e:
            self.logger.log_error("CHECKOUT", f"Failed to add address: {str(e)}")
            return False
    
    async def _fill_form_field(self, field_name: str, value: str, selectors: list) -> bool:
        """
        Helper to fill a form field with multiple selector fallbacks
        
        Returns:
            bool: True if field was filled successfully
        """
        for selector in selectors:
            try:
                element = await self.page.wait_for_selector(selector, timeout=3000)
                if element:
                    # Clear existing value first
                    await element.click(click_count=3)  # Triple click to select all
                    await element.fill("")  # Clear
                    await element.fill(value)  # Fill new value
                    self.logger.log_step("CHECKOUT", f"Filled {field_name}: {value}")
                    await self.delay_manager.random_delay("input")
                    return True
            except Exception as e:
                self.logger.log_step("DEBUG", f"Selector {selector} failed: {e}")
                continue
        
        self.logger.log_step("WARN", f"Could not fill {field_name} (field not found)")
        return False