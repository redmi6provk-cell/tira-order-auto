"""
Credit Cards API router
"""

from fastapi import APIRouter, HTTPException
from typing import List

from app.models.card import CreditCard, CreditCardCreate, CreditCardUpdate
from app.services.data_service import card_service
from app.utils.logger import get_logger

logger = get_logger("api.cards")

router = APIRouter()

@router.get("", response_model=List[CreditCard])
async def get_cards():
    """Get all credit cards"""
    return await card_service.get_all_cards()

@router.get("/default", response_model=CreditCard)
async def get_default_card():
    """Get the default credit card"""
    card = await card_service.get_default_card()
    if not card:
        raise HTTPException(status_code=404, detail="No default card found")
    return card

@router.get("/{card_id}", response_model=CreditCard)
async def get_card(card_id: str):
    """Get card by ID"""
    card = await card_service.get_card(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card

@router.post("", response_model=CreditCard)
async def create_card(card: CreditCardCreate):
    """Create a new credit card"""
    try:
        return await card_service.create_card(card.dict())
    except Exception as e:
        logger.error(f"Failed to create card: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{card_id}", response_model=CreditCard)
async def update_card(card_id: str, card: CreditCardUpdate):
    """Update a credit card"""
    updates = card.dict(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await card_service.update_card(card_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Card not found")
    return result

@router.delete("/{card_id}")
async def delete_card(card_id: str):
    """Delete a credit card"""
    success = await card_service.delete_card(card_id)
    if not success:
        raise HTTPException(status_code=404, detail="Card not found")
    return {"message": "Card deleted successfully"}
