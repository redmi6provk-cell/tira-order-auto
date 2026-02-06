"""
Checkpoint Executor - Automation for checking Tira points and account status
Strictly follows the logic of the user's working 'a.py' script.
Updated to handle Tira Beauty cookie format: f.session=s%3AbK_88JTBaOkxr4ffBru3WDnXOQnXp_Mf...
"""

import asyncio
import uuid
import json
import requests
from typing import List, Dict, Any
from datetime import datetime

from app.models.checkpoint import CheckpointConfig, CheckpointResult
from app.config import settings
from app.utils.logger import get_logger
from app.services.data_service import user_service

logger = get_logger("checkpoint_executor")

# Exact URL from a.py
TIRA_ACCOUNT_API = "https://www.tirabeauty.com/ext/reward-engine/application/api/v1.0/user/account"

# Exact Headers from a.py
# Note: 'Referer' is often required by Tira's WAF
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.tirabeauty.com/",
    "Origin": "https://www.tirabeauty.com",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}

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
            "total": config.user_range_end - config.user_range_start + 1
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
            
            self.active_tasks[task_id]["status"] = "completed"
            self.active_tasks[task_id]["completed_at"] = datetime.now()
            
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
        """Check a single user using requests (in thread)"""
        async with semaphore:
            try:
                # Run the blocking request in a thread
                result = await asyncio.to_thread(self._make_request, user)
                
                # Append result
                self.results[task_id].append(result)
                
                # Save points to DB if found
                if result.points and result.points != "N/A":
                    # Note: update_user_points is async
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

    def _parse_cookies(self, raw_cookies: Any, user_id: int) -> Dict[str, str]:
        """
        Parse cookies from various formats:
        1. Cookie string format: "f.session=value; Path=/; Expires=..."
        2. JSON array: [{"name": "f.session", "value": "..."}]
        3. JSON dict: {"f.session": "value"}
        """
        cookie_dict = {}
        
        if not raw_cookies:
            return cookie_dict
            
        logger.info(f"[{user_id}] Raw cookies type: {type(raw_cookies)}")
        
        if isinstance(raw_cookies, str):
            try:
                # Try parsing as cookie string format first
                # Format: "f.session=s%3AbK_88JTBaOkxr4ffBru3WDnXOQnXp_Mf...; Path=/; Expires=..."
                if '=' in raw_cookies:
                    logger.info(f"[{user_id}] Parsing cookie string format...")
                    # Split by semicolon and parse each cookie
                    for cookie_pair in raw_cookies.split(';'):
                        cookie_pair = cookie_pair.strip()
                        if '=' in cookie_pair:
                            parts = cookie_pair.split('=', 1)
                            name = parts[0].strip()
                            value = parts[1].strip() if len(parts) > 1 else ''
                            # Skip cookie attributes (Path, Expires, Domain, etc.)
                            if name.lower() not in ['path', 'expires', 'domain', 'secure', 'httponly', 'samesite', 'max-age']:
                                cookie_dict[name] = value
                                logger.info(f"[{user_id}] Parsed cookie: {name}={value[:20]}...")
                else:
                    # Try parsing as JSON
                    logger.info(f"[{user_id}] Parsing JSON cookies...")
                    parsed = json.loads(raw_cookies)
                    if isinstance(parsed, list):
                        for c in parsed:
                            if isinstance(c, dict) and 'name' in c and 'value' in c:
                                cookie_dict[c['name']] = c['value']
                    elif isinstance(parsed, dict):
                        cookie_dict = parsed
            except json.JSONDecodeError:
                logger.error(f"[{user_id}] Failed to parse cookies as JSON")
            except Exception as e:
                logger.error(f"[{user_id}] Cookie parsing failed: {e}")
                
        elif isinstance(raw_cookies, list):
            logger.info(f"[{user_id}] Processing list cookies...")
            for c in raw_cookies:
                if isinstance(c, dict) and 'name' in c and 'value' in c:
                    cookie_dict[c['name']] = c['value']
                    
        elif isinstance(raw_cookies, dict):
            logger.info(f"[{user_id}] Using dict cookies...")
            cookie_dict = raw_cookies
            
        return cookie_dict

    def _make_request(self, user: Dict[str, Any]) -> CheckpointResult:
        """
        Blocking request function matching a.py logic.
        Makes API call to Tira Beauty to fetch user points and account status.
        """
        user_id = user['id']
        points = "N/A"
        account_name = "N/A"
        status = "success"
        error_msg = None

        logger.info(f"[{user_id}] Starting API check...")

        try:
            # 1. Prepare Cookies
            logger.info(f"[{user_id}] Preparing cookies...")
            raw_cookies = user.get('cookies')
            cookie_dict = self._parse_cookies(raw_cookies, user_id)

            if not cookie_dict:
                logger.warning(f"[{user_id}] No cookies found after parsing")
                return CheckpointResult(
                    user_id=user_id,
                    username=user.get('name'),
                    email=user.get('email'),
                    status="failed",
                    error="No cookies found"
                )
            
            # Log specific important cookies presence
            if 'f.session' in cookie_dict:
                session_cookie = cookie_dict['f.session']
                logger.info(f"[{user_id}] Found 'f.session' cookie: {session_cookie[:30]}...")
            else:
                logger.warning(f"[{user_id}] 'f.session' cookie MISSING!")
            
            logger.info(f"[{user_id}] Total cookies prepared: {len(cookie_dict)}")
            logger.info(f"[{user_id}] Cookie names: {list(cookie_dict.keys())}")

            # 2. Make Request (Exact copy of a.py logic)
            # ot
            
            response = requests.get(
                TIRA_ACCOUNT_API,
                headers=HEADERS,
                cookies=cookie_dict,
                timeout=15,
                allow_redirects=False  # Don't follow redirects automatically
            )
            
            # logger.info(f"[{user_id}] Response Status: {response.status_code}")
            # logger.info(f"[{user_id}] Response Headers: {dict(response.headers)}")
            
            # Log first 500 chars of response body
            #response_preview = response.text[:500] if response.text else "(empty)"
            #logger.info(f"[{user_id}] Response Body Preview: {response_preview}")
            
            # 3. Handle Response
            if response.status_code == 200:
                try:
                    data = response.json()
                    logger.info(f"[{user_id}] Response JSON Success field: {data.get('success')}")
                    
                    # Validate success flag
                    if data.get('success') is True:
                        # Extract data object
                        data_obj = data.get('data', {})
                        logger.info(f"[{user_id}] Data object keys: {list(data_obj.keys())}")
                        
                        # Extract Points from data.pointSummary (not userTier.pointSummary)
                        point_summary = data_obj.get('pointSummary', {})
                        if 'earned' in point_summary:
                            points = str(point_summary['earned'])
                            logger.info(f"[{user_id}] Earned points found: {points}")
                        else:
                            logger.warning(f"[{user_id}] pointSummary.earned not found. pointSummary: {point_summary}")
                            
                        # Extract Tier Name from data.userTier.name
                        user_tier = data_obj.get('userTier', {})
                        tier_name = user_tier.get('name')
                        if tier_name:
                            account_name = tier_name
                            logger.info(f"[{user_id}] Tier/Name found: {account_name}")
                        else:
                            logger.warning(f"[{user_id}] userTier.name not found. userTier: {user_tier}")
                        
                    else:
                        # 200 OK but success=False
                        status = "failed"
                        error_msg = f"API returned success=False: {data.get('message', 'Unknown error')}"
                        logger.warning(f"[{user_id}] success=False. Full response: {data}")
                        
                except json.JSONDecodeError as jde:
                    status = "failed"
                    error_msg = f"Invalid JSON response: {str(jde)}"
                    logger.error(f"[{user_id}] Invalid JSON body. Response text: {response.text[:200]}")
                    
            elif response.status_code in [401, 403]:
                status = "logged_out"
                error_msg = f"Authentication failed (HTTP {response.status_code}). User needs to re-login."
                logger.warning(f"[{user_id}] Auth failed. Response: {response.text[:200]}")
                
            elif response.status_code == 302:
                # Redirect - might indicate session expired
                redirect_location = response.headers.get('Location', 'unknown')
                status = "logged_out"
                error_msg = f"Redirect detected (session expired?). Location: {redirect_location}"
                logger.warning(f"[{user_id}] Redirect to: {redirect_location}")
                
            else:
                status = "failed"
                error_msg = f"API Error HTTP {response.status_code}"
                logger.error(f"[{user_id}] API Failed with status {response.status_code}. Body: {response.text[:200]}")
            
            # Add delay between API calls to avoid rate limiting
            import time
            delay_seconds = 3  # Reduced from 5 to 3 seconds for faster processing
            logger.info(f"[{user_id}] Waiting {delay_seconds} seconds before next request...")
            time.sleep(delay_seconds)

        except requests.exceptions.Timeout:
            status = "failed"
            error_msg = "Request timeout (15s)"
            logger.error(f"[{user_id}] Request timed out")
            
        except requests.exceptions.ConnectionError as ce:
            status = "failed"
            error_msg = f"Connection error: {str(ce)}"
            logger.error(f"[{user_id}] Connection error: {ce}")
            
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
            "started_at": task.get("started_at"),
            "completed_at": task.get("completed_at"),
            "error": task.get("error")
        }

# Global instance
checkpoint_executor = CheckpointExecutor()