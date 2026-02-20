"""
Pydantic models for Checkpoint Automation
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class CheckpointConfig(BaseModel):
    """Configuration for checkpoint execution"""
    user_range_start: int
    user_range_end: int
    headless: bool = True
    concurrent_browsers: int = 1

class CheckpointResult(BaseModel):
    """Result of a single checkpoint check"""
    user_id: int
    username: Optional[str] = None
    status: str = Field(..., description="'success', 'failed', 'logged_out'")
    points: Optional[str] = None
    account_name: Optional[str] = None
    error: Optional[str] = None
    checked_at: datetime = Field(default_factory=datetime.now)

class CheckpointTaskStatus(BaseModel):
    """Status of a background checkpoint task"""
    task_id: str
    status: str
    total_users: int
    processed_users: int
    total_points: float = 0.0
    results: List[CheckpointResult] = []
    created_at: datetime = Field(default_factory=datetime.now)
