"""
Products API router
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any

from app.services.data_service import product_service
from app.models.product import Product, ProductCreate, ProductUpdate

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
async def get_products():
    """Get all products"""
    return await product_service.get_all_products()

@router.get("/{product_id}", response_model=Dict[str, Any])
async def get_product(product_id: str):
    """Get product by ID"""
    product = await product_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("", response_model=Dict[str, Any])
async def create_product(product: ProductCreate):
    """Create new product"""
    return await product_service.create_product(product.model_dump(mode='json'))

@router.put("/{product_id}", response_model=Dict[str, Any])
async def update_product(product_id: str, product_update: ProductUpdate):
    """Update product"""
    updated = await product_service.update_product(product_id, product_update.model_dump(exclude_unset=True, mode='json'))
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated

@router.delete("/{product_id}")
async def delete_product(product_id: str):
    """Delete product"""
    success = await product_service.delete_product(product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}
