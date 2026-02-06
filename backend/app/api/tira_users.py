"""
Tira Users API router
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any

from app.services.data_service import user_service
from app.models.tira_user import TiraUser, TiraUserCreate, TiraUserUpdate
from app.services.auth_service import auth_service

router = APIRouter()

@router.get("")
async def get_tira_users(page: int = 1, limit: int = 50):
    """Get Tira users with pagination"""
    offset = (page - 1) * limit
    users = await user_service.get_all_users(offset=offset, limit=limit)
    total = await user_service.get_user_count()
    return {
        "users": users,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/{user_id}", response_model=Dict[str, Any])
async def get_tira_user(user_id: int):
    """Get Tira user by ID"""
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Tira user not found")
    return user

@router.post("", response_model=Dict[str, Any])
async def create_tira_user(user: TiraUserCreate):
    """Create new Tira user"""
    return await user_service.create_tira_user(user.model_dump())

@router.put("/{user_id}", response_model=Dict[str, Any])
async def update_tira_user(user_id: int, user: TiraUserUpdate):
    """Update existing Tira user"""
    updated = await user_service.update_tira_user(user_id, user.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Tira user not found")
    return updated

@router.delete("/{user_id}")
async def delete_tira_user(user_id: int):
    """Delete Tira user"""
    success = await user_service.delete_tira_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tira user not found")
    return {"message": "Tira user deleted successfully"}

@router.post("/bulk")
async def bulk_upsert_tira_users(users: List[Dict[str, Any]]):
    """Bulk create or update Tira users"""
    return await user_service.bulk_upsert_tira_users(users)

@router.get("/export/all")
async def export_all_tira_users():
    """Get all Tira users for CSV export (no pagination)"""
    users = await user_service.get_all_users(offset=0, limit=999999)
    return {"users": users}
