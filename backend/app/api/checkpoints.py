"""
Checkpoints API router
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from app.models.checkpoint import CheckpointConfig, CheckpointResult
from app.automation.checkpoint_executor import checkpoint_executor
from app.utils.logger import get_logger

logger = get_logger("api.checkpoints")

router = APIRouter()

@router.post("/execute")
async def execute_checkpoints(request_body: Dict[str, Any]):
    """
    Start a checkpoint execution task
    Checks Tira user points across a range of users
    """
    try:
        # Extract config from request body (frontend sends {config: {...}})
        config_data = request_body.get("config")
        if not config_data:
            raise HTTPException(status_code=400, detail="Missing 'config' in request body")
        
        # Parse config
        config = CheckpointConfig(**config_data)
        
        logger.info(f"Starting checkpoint execution for users {config.user_range_start} to {config.user_range_end}")
        task_id = await checkpoint_executor.execute_bulk_check(config)
        return {
            "task_id": task_id,
            "status": "started",
            "message": "Checkpoint task initiated"
        }
    except Exception as e:
        logger.error(f"Failed to start checkpoint task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{task_id}")
async def get_checkpoint_status(task_id: str):
    """Get current status of a checkpoint task"""
    status = checkpoint_executor.get_task_status(task_id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Task not found")
    return status

@router.get("/results/{task_id}", response_model=List[CheckpointResult])
async def get_checkpoint_results(task_id: str):
    """Get results of a checkpoint task"""
    results = checkpoint_executor.get_results(task_id)
    if results is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return results

@router.get("/tasks")
async def get_all_tasks():
    """Get all checkpoint tasks"""
    return {
        "tasks": list(checkpoint_executor.active_tasks.keys()),
        "count": len(checkpoint_executor.active_tasks)
    }
