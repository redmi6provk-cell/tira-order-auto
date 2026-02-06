"""
Delay manager for human-like automation behavior
"""

import asyncio
import random
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("delay_manager")

class DelayManager:
    """
    Manages random delays to mimic human behavior
    """
    
    def __init__(self):
        self.delays = {
            "page_load": settings.DELAY_AFTER_PAGE_LOAD,
            "click": settings.DELAY_AFTER_CLICK,
            "input": settings.DELAY_AFTER_INPUT,
            "between_products": settings.DELAY_BETWEEN_PRODUCTS,
            "before_checkout": settings.DELAY_BEFORE_CHECKOUT
        }
    
    async def random_delay(self, delay_type: str = "click"):
        """
        Sleep for a random amount of time based on delay type
        """
        base_delay = self.delays.get(delay_type, 1.0)
        
        # Add some randomness (+/- 20%)
        variation = base_delay * 0.2
        actual_delay = base_delay + random.uniform(-variation, variation)
        
        # Ensure it's not negative
        actual_delay = max(0.1, actual_delay)
        
        logger.debug(f"[WAIT] Sleeping for {actual_delay:.2f}s ({delay_type})")
        await asyncio.sleep(actual_delay)
    
    async def wait(self, seconds: float):
        """Wait for specific number of seconds"""
        await asyncio.sleep(seconds)
