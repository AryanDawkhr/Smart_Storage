from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.models import Crop
from app.schemas.schemas import CropResponse, CompatibilityCheckRequest, CompatibilityCheckResponse
from app.services.compatibility_service import CompatibilityService

router = APIRouter(prefix="/api", tags=["Crop Compatibility"])

@router.get("/crops", response_model=List[CropResponse])
def list_crops(db: Session = Depends(get_db)):
    """Retrieve catalog of crops with safe storage profiles."""
    crops = db.query(Crop).all()
    return crops

@router.post("/compatibility/check", response_model=CompatibilityCheckResponse)
def check_crop_compatibility(
    payload: CompatibilityCheckRequest, 
    db: Session = Depends(get_db)
):
    """
    Performs real-time thermal & humidity intersection analysis between candidate 
    crop and crops currently residing inside the physical storage unit.
    """
    result = CompatibilityService.check_compatibility(
        db=db,
        storage_unit_id=payload.storage_unit_id,
        candidate_crop_id=payload.candidate_crop_id,
        quantity_kg=payload.quantity_kg
    )
    return result
