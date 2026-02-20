"""
Checkpoint Executor - Automation for checking Tira points and account status
Strictly follows the logic of the user's working 'a.py' script.
Updated to handle Tira Beauty cookie format: f.session=s%3AbK_88JTBaOkxr4ffBru3WDnXOQnXp_Mf...
"""

import asyncio
import sys
import uuid
import json
from typing import List, Dict, Any
from playwright.sync_api import sync_playwright
from datetime import datetime

from app.models.checkpoint import CheckpointConfig, CheckpointResult
from app.config import settings
from app.utils.logger import get_logger
from app.services.data_service import user_service

logger = get_logger("checkpoint_executor")

# Exact URL from a.py
TIRA_ACCOUNT_API = "https://www.tirabeauty.com/ext/reward-engine/application/api/v1.0/user/account"
TIRA_HOME = "https://www.tirabeauty.com/"

class CheckpointExecutor:
    """
    Orchestrates the process of checking points for multiple users
    Uses direct API calls matching a.py
    """
    
    def __init__(self):
        self.active_tasks: Dict[str, Dict] = {}
        self.results: Dict[str, List[CheckpointResult]] = {}
        
    async def execute_bulk_check(self, config: CheckpointConfig) -> str:
        """
        Execute checkpoint checks across a range of users
        """
        task_id = str(uuid.uuid4())
        self.active_tasks[task_id] = {
            "status": "processing",
            "config": config,
            "started_at": datetime.now(),
            "total": config.user_range_end - config.user_range_start + 1,
            "total_points": 0.0
        }
        self.results[task_id] = []
        
        # Start the background task
        asyncio.create_task(self._run_bulk_check(task_id, config))
        
        return task_id

    async def _run_bulk_check(self, task_id: str, config: CheckpointConfig):
        """Background task for bulk checking"""
        try:
            users = await user_service.get_users_by_range(config.user_range_start, config.user_range_end)
            
            if not users:
                self.active_tasks[task_id]["status"] = "failed"
                self.active_tasks[task_id]["error"] = "No users found in range"
                return

            # Update total based on actual users found
            self.active_tasks[task_id]["total"] = len(users)
            
            # Use a semaphore to control concurrency (default 5 or from config)
            concurrency = config.concurrent_browsers if config.concurrent_browsers > 0 else 5
            semaphore = asyncio.Semaphore(concurrency)
            tasks = []
            
            for idx, user in enumerate(users):
                tasks.append(self._check_single_user(task_id, user, semaphore))
                
            await asyncio.gather(*tasks)
            
            # Calculate total points
            total_points = 0.0
            for r in self.results.get(task_id, []):
                try:
                    if r.points and r.points.replace('.', '', 1).isdigit():
                        total_points += float(r.points)
                except (ValueError, TypeError):
                    pass
            
            self.active_tasks[task_id]["status"] = "completed"
            self.active_tasks[task_id]["completed_at"] = datetime.now()
            self.active_tasks[task_id]["total_points"] = total_points
            
        except Exception as e:
            logger.error(f"Bulk check failed: {e}")
            self.active_tasks[task_id]["status"] = "failed"
            self.active_tasks[task_id]["error"] = str(e)

    async def _check_single_user(
        self, 
        task_id: str, 
        user: Dict[str, Any], 
        semaphore: asyncio.Semaphore
    ) -> CheckpointResult:
        """Check a single user using Playwright browser (sync, in thread)"""
        async with semaphore:
            try:
                # Run sync Playwright in a thread to avoid Windows event loop issue
                result = await asyncio.to_thread(self._make_request, user)
                
                # Append result
                self.results[task_id].append(result)
                
                # Save points to DB if found
                if result.points and result.points != "N/A":
                    await user_service.update_user_points(result.user_id, result.points)
                
                logger.info(f"User {user['id']} checked: {result.points} points ({result.account_name}) - Status: {result.status}")
                return result

            except Exception as e:
                error_msg = str(e)
                logger.error(f"Checkpoint for user {user['id']} failed: {error_msg}")
                result = CheckpointResult(
                    user_id=user['id'],
                    username=user.get('name'),
                    email=user.get('email'),
                    status="failed",
                    error=error_msg
                )
                self.results[task_id].append(result)
                return result

    def _prepare_playwright_cookies(self, raw_cookies: Any, user_id: int) -> list:
        """
        Parse cookies from DB and convert to Playwright cookie format.
        Playwright expects: [{name, value, domain, path, expires, httpOnly, secure, sameSite}]
        """
        cookies = []
        
        if not raw_cookies:
            return cookies
            
        logger.info(f"[{user_id}] Raw cookies type: {type(raw_cookies)}")
        
        # Parse raw cookies into a list of dicts
        cookie_list = []
        if isinstance(raw_cookies, str):
            try:
                parsed = json.loads(raw_cookies)
                if isinstance(parsed, list):
                    cookie_list = parsed
                elif isinstance(parsed, dict):
                    cookie_list = [parsed]
            except json.JSONDecodeError:
                logger.error(f"[{user_id}] Failed to parse cookies JSON string")
                return cookies
        elif isinstance(raw_cookies, list):
            cookie_list = raw_cookies
        elif isinstance(raw_cookies, dict):
            cookie_list = [raw_cookies]
        
        # Map sameSite values to Playwright format
        same_site_map = {
            "no_restriction": "None",
            "none": "None",
            "lax": "Lax",
            "strict": "Strict",
        }
        
        for c in cookie_list:
            if not isinstance(c, dict) or 'name' not in c or 'value' not in c:
                continue
            
            pw_cookie = {
                "name": c["name"],
                "value": c["value"],
                "domain": c.get("domain", ".www.tirabeauty.com"),
                "path": c.get("path", "/"),
            }
            
            # Handle expires/expirationDate
            expires = c.get("expirationDate") or c.get("expires")
            if expires and expires != -1:
                pw_cookie["expires"] = float(expires)
            
            if "httpOnly" in c:
                pw_cookie["httpOnly"] = bool(c["httpOnly"])
            if "secure" in c:
                pw_cookie["secure"] = bool(c["secure"])
            
            raw_ss = str(c.get("sameSite", "Lax")).lower()
            pw_cookie["sameSite"] = same_site_map.get(raw_ss, "Lax")
            
            cookies.append(pw_cookie)
            logger.info(f"[{user_id}] Prepared cookie: {pw_cookie['name']}={pw_cookie['value'][:20]}...")
        
        return cookies

    def _make_request(self, user: Dict[str, Any]) -> CheckpointResult:
        """
        Uses Playwright headless browser to make API call.
        This bypasses WAF by letting anti-bot JS run naturally.
        """
        user_id = user['id']
        points = "N/A"
        account_name = "N/A"
        status = "success"
        error_msg = None

        logger.info(f"[{user_id}] Starting Playwright API check...")

        try:
            # 1. Prepare Cookies
            logger.info(f"[{user_id}] Preparing cookies...")
            raw_cookies = user.get('cookies')
            pw_cookies = self._prepare_playwright_cookies(raw_cookies, user_id)

            if not pw_cookies:
                logger.warning(f"[{user_id}] No cookies found after parsing")
                return CheckpointResult(
                    user_id=user_id,
                    username=user.get('name'),
                    email=user.get('email'),
                    status="failed",
                    error="No cookies found"
                )
            
            # Check for f.session
            has_session = any(c['name'] == 'f.session' for c in pw_cookies)
            if has_session:
                session_val = next(c['value'] for c in pw_cookies if c['name'] == 'f.session')
                logger.info(f"[{user_id}] Found 'f.session' cookie: {session_val[:30]}...")
            else:
                logger.warning(f"[{user_id}] 'f.session' cookie MISSING!")
            
            logger.info(f"[{user_id}] Total cookies prepared: {len(pw_cookies)}")
            logger.info(f"[{user_id}] Cookie names: {[c['name'] for c in pw_cookies]}")

            # 2. Force ProactorEventLoop on Windows (required for subprocess creation)
            if sys.platform == 'win32':
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            
            # Launch Playwright browser and make request (sync API)
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                
                # Add cookies to context
                context.add_cookies(pw_cookies)
                
                page = context.new_page()
                
                # Visit homepage first to let WAF JS generate anti-bot cookies
                logger.info(f"[{user_id}] Visiting Tira homepage to pass WAF...")
                try:
                    page.goto(TIRA_HOME, wait_until="domcontentloaded", timeout=30000)
                    # Wait a moment for WAF scripts to execute
                    page.wait_for_timeout(3000)
                    logger.info(f"[{user_id}] Homepage loaded, WAF cookies should be set")
                except Exception as e:
                    logger.warning(f"[{user_id}] Homepage load warning (continuing anyway): {e}")
                
                # Now make the actual API call
                logger.info(f"[{user_id}] Making API request via Playwright...")
                response = page.goto(TIRA_ACCOUNT_API, wait_until="domcontentloaded", timeout=15000)
                
                resp_status = response.status if response else 0
                logger.info(f"[{user_id}] Response status: {resp_status}")
                
                # 3. Handle Response
                if resp_status == 200:
                    try:
                        body = response.text()
                        data = json.loads(body)
                        logger.info(f"[{user_id}] Response JSON Success field: {data.get('success')}")
                        logger.info(f"[{user_id}] Response JSON Data field: {data.get('data')}")    
                        
                        if data.get('success') is True:
                            data_obj = data.get('data', {})
                            logger.info(f"[{user_id}] Data object keys: {list(data_obj.keys())}")
                            
                            # Extract Points
                            point_summary = data_obj.get('pointSummary', {})
                            if 'available' in point_summary:
                                points = str(point_summary['available'])
                                logger.info(f"[{user_id}] Available points found: {points}")
                            else:
                                logger.warning(f"[{user_id}] pointSummary.available not found. pointSummary: {point_summary}")
                                
                            # Extract Tier Name
                            user_tier = data_obj.get('userTier', {})
                            tier_name = user_tier.get('name')
                            if tier_name:
                                account_name = tier_name
                                logger.info(f"[{user_id}] Tier/Name found: {account_name}")
                            else:
                                logger.warning(f"[{user_id}] userTier.name not found. userTier: {user_tier}")
                        else:
                            status = "failed"
                            error_msg = f"API returned success=False: {data.get('message', 'Unknown error')}"
                            logger.warning(f"[{user_id}] success=False. Full response: {data}")
                            
                    except json.JSONDecodeError as jde:
                        status = "failed"
                        body_text = response.text() if response else "(no response)"
                        error_msg = f"Invalid JSON response: {str(jde)}"
                        logger.error(f"[{user_id}] Invalid JSON body. Response text: {body_text[:200]}")
                        
                elif resp_status in [401, 403]:
                    status = "logged_out"
                    body_text = response.text() if response else "(no response)"
                    error_msg = f"Authentication failed (HTTP {resp_status}). User needs to re-login."
                    logger.warning(f"[{user_id}] Auth failed. Response: {body_text[:200]}")
                    
                elif resp_status == 302:
                    status = "logged_out"
                    error_msg = f"Redirect detected (session expired?)"
                    logger.warning(f"[{user_id}] Redirect detected")
                    
                else:
                    status = "failed"
                    body_text = response.text() if response else "(no response)"
                    error_msg = f"API Error HTTP {resp_status}"
                    logger.error(f"[{user_id}] API Failed with status {resp_status}. Body: {body_text[:200]}")
                
                browser.close()
            
            # Delay between checks to avoid rate limiting
            import time
            delay_seconds = 3
            logger.info(f"[{user_id}] Waiting {delay_seconds} seconds before next request...")
            time.sleep(delay_seconds)

        except Exception as e:
            status = "failed"
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"[{user_id}] Exception during check: {e}", exc_info=True)
            
        return CheckpointResult(
            user_id=user_id,
            username=user.get('name'),
            email=user.get('email'),
            points=points,
            account_name=account_name if account_name != "N/A" else user.get('name', 'N/A'),
            status=status,
            error=error_msg
        )

    def get_results(self, task_id: str) -> List[CheckpointResult]:
        """Get all results for a task"""
        return self.results.get(task_id, [])

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get current status of a task"""
        task = self.active_tasks.get(task_id, {})
        if not task:
            return {"status": "not_found"}
        return {
            "status": task["status"],
            "progress": len(self.results.get(task_id, [])),
            "total": task.get("total", 0),
            "total_points": task.get("total_points", 0.0),
            "started_at": task.get("started_at"),
            "completed_at": task.get("completed_at"),
            "error": task.get("error")
        }

# Global instance
checkpoint_executor = CheckpointExecutor()