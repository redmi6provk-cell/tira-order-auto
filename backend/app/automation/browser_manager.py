"""
Browser Manager for Playwright Chromium
Uses cookie-based authentication instead of Chrome profiles
FIXED: Proper zoom implementation without flickering/looping
"""

import asyncio
from typing import Optional, List, Dict, Any

from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("browser_manager")


class BrowserManager:
    """
    Manages Playwright Chromium browser instances
    Uses cookie-based authentication (no persistent profiles)
    """
    
    def __init__(self):
        self.playwright = None
        self.active_browsers: Dict[str, Browser] = {}
        
    async def start(self):
        """Start Playwright"""
        if not self.playwright:
            self.playwright = await async_playwright().start()
            logger.info("[INIT] Playwright started successfully")
            
    async def stop(self):
        """Stop Playwright and close all browsers"""
        # Close all active browsers
        for session_id, browser in list(self.active_browsers.items()):
            try:
                await browser.close()
                logger.info(f"[CLEANUP] Closed browser for session: {session_id}")
            except:
                pass
        
        self.active_browsers.clear()
        
        if self.playwright:
            await self.playwright.stop()
            logger.info("[STOP] Playwright stopped")
            
    async def launch_browser(
        self, 
        session_id: str,
        headless: bool = False,
        zoom_level: float = 0.8  # 80% zoom by default
    ) -> BrowserContext:
        """
        Launch a Chromium browser with anti-detection measures
        
        Args:
            session_id: Unique identifier for this browser session
            headless: Whether to run in headless mode
            zoom_level: Browser zoom level (0.8 = 80%, 1.0 = 100%)
            
        Returns:
            BrowserContext: The launched browser context
        """
        await self.start()
        
        logger.info(f"[LAUNCH] Launching Chromium browser for session: {session_id}")
        logger.info(f"[ZOOM] Setting zoom level to {zoom_level * 100}%")
        
        # Launch browser with proper fullscreen args
        browser = await self.playwright.chromium.launch(
            headless=headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--start-maximized',
                '--window-size=1920,1080',
                # Force device scale factor at launch (most effective)
                f'--force-device-scale-factor={zoom_level}',
            ]
        )
        
        # Store browser reference
        self.active_browsers[session_id] = browser
        
        # Create context with proper viewport and zoom settings
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            device_scale_factor=zoom_level,  # This applies zoom at browser level
            user_agent=settings.USER_AGENT,
            locale='en-US',
            timezone_id='Asia/Kolkata',
            permissions=['geolocation'],
            geolocation={'latitude': 19.0760, 'longitude': 72.8777},  # Mumbai coordinates
            color_scheme='light',
            ignore_https_errors=True,
            java_script_enabled=True,
        )
        
        # Add anti-detection scripts (NO CSS ZOOM - that causes the flickering)
        await context.add_init_script("""
            // Override the navigator.webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Override the navigator.plugins property
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            // Override the navigator.languages property
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
            
            // Add Chrome object
            window.chrome = {
                runtime: {}
            };
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        """)
        
        logger.info(f"[OK] Browser launched successfully for session: {session_id}")
        
        return context
    
    async def set_page_zoom(self, page: Page, zoom_level: float = 0.8):
        """
        Set zoom for a specific page using Chrome DevTools Protocol
        This is an alternative method if device_scale_factor doesn't work
        
        Args:
            page: The page to set zoom on
            zoom_level: Zoom level (0.8 = 80%, 1.0 = 100%)
        """
        try:
            client = await page.context.new_cdp_session(page)
            await client.send('Emulation.setPageScaleFactor', {
                'pageScaleFactor': zoom_level
            })
            logger.info(f"[ZOOM] Set page zoom to {zoom_level * 100}% via CDP")
        except Exception as e:
            logger.error(f"[ERROR] Failed to set page zoom: {e}")
    
    async def close_browser(self, session_id: str):
        """Close a specific browser session"""
        if session_id in self.active_browsers:
            try:
                await self.active_browsers[session_id].close()
                del self.active_browsers[session_id]
                logger.info(f"[CLEANUP] Closed browser for session: {session_id}")
            except Exception as e:
                logger.error(f"[ERROR] Failed to close browser {session_id}: {e}")
    
    def get_active_sessions(self) -> List[str]:
        """Get list of active session IDs"""
        return list(self.active_browsers.keys())
    
    def get_session_count(self) -> int:
        """Get count of active browser sessions"""
        return len(self.active_browsers)