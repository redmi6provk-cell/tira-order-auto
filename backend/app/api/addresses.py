"""
Addresses API router
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from app.services.data_service import address_service
from app.models.address import Address, AddressCreate

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
async def get_addresses():
    """Get all addresses"""
    return await address_service.get_all_addresses()

@router.get("/{address_id}", response_model=Dict[str, Any])
async def get_address(address_id: str):
    """Get address by ID"""
    address = await address_service.get_address(address_id)
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    return address

@router.post("", response_model=Dict[str, Any])
async def create_address(address: AddressCreate):
    """Create new address"""
    return await address_service.create_address(address.model_dump())

@router.put("/{address_id}", response_model=Dict[str, Any])
async def update_address(address_id: str, address: AddressCreate):
    """Update existing address"""
    updated = await address_service.update_address(address_id, address.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="Address not found")
    return updated

@router.delete("/{address_id}")
async def delete_address(address_id: str):
    """Delete address"""
    success = await address_service.delete_address(address_id)
    if not success:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"message": "Address deleted successfully"}

@router.get("/default", response_model=Dict[str, Any])
async def get_default_address():
    """Get default address"""
    address = await address_service.get_default_address()
    if not address:
        raise HTTPException(status_code=404, detail="Default address not found")
    return address
