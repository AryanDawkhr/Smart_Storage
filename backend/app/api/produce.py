import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.models import StorageUnit, StorageRecord, Crop, User
from app.schemas.schemas import ProduceCreate, StorageRecordResponse
from app.services.compatibility_service import CompatibilityService
from app.services.recommendation_service import RecommendationService
from app.api.auth import get_current_user

router = APIRouter(prefix="/api", tags=["Produce Storage"])

def _format_record_response(rec: StorageRecord) -> dict:
    now = datetime.datetime.utcnow()
    age_seconds = (now - rec.storage_start).total_seconds()
    age_hours = round(age_seconds / 3600.0, 1)
    age_days = int(age_seconds // 86400)
    rem_hours = int((age_seconds % 86400) // 3600)

    max_days = rec.crop.profile.max_storage_days if (rec.crop and rec.crop.profile) else 14
    max_seconds = max_days * 86400.0
    safe_rem_seconds = max(0.0, max_seconds - age_seconds)
    safe_rem_hours = round(safe_rem_seconds / 3600.0, 1)
    safe_rem_days = int(safe_rem_seconds // 86400)
    safe_rem_rem_hours = int((safe_rem_seconds % 86400) // 3600)

    is_nearing_limit = (age_seconds / max_seconds) >= 0.75

    return {
        "id": rec.id,
        "user_id": rec.user_id,
        "farmer_name": rec.user.name if rec.user else "Farmer",
        "storage_unit_id": rec.storage_unit_id,
        "unit_code": rec.storage_unit.unit_code if rec.storage_unit else "",
        "crop_id": rec.crop_id,
        "crop_name": rec.crop.name if rec.crop else "Unknown",
        "local_ner_name": rec.crop.local_ner_name if rec.crop else "",
        "quantity_kg": rec.quantity_kg,
        "initial_condition": rec.initial_condition,
        "current_condition": rec.current_condition,
        "harvest_date": rec.harvest_date,
        "storage_start": rec.storage_start,
        "storage_age_hours": age_hours,
        "storage_age_human": f"{age_days}d {rem_hours}h" if age_days > 0 else f"{int(age_hours)} hours",
        "remaining_safe_hours": safe_rem_hours,
        "remaining_safe_human": f"{safe_rem_days}d {safe_rem_rem_hours}h" if safe_rem_days > 0 else f"{int(safe_rem_hours)} hours",
        "is_nearing_limit": is_nearing_limit,
        "expected_storage_days": rec.expected_storage_days,
        "removal_date": rec.removal_date,
        "status": rec.status,
        "farmer_notes": rec.farmer_notes
    }

@router.post("/storage/{id}/produce", response_model=StorageRecordResponse)
def add_produce_to_storage(
    id: int, 
    payload: ProduceCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Intake produce into cold storage unit after strict 
    capacity and crop compatibility validation.
    """
    unit = db.query(StorageUnit).filter(StorageUnit.id == id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Storage unit not found.")

    crop = db.query(Crop).filter(Crop.id == payload.crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop type not found.")

    # 1. Compatibility & Capacity Check
    compat_result = CompatibilityService.check_compatibility(
        db, id, payload.crop_id, payload.quantity_kg
    )

    if not compat_result["capacity_available"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=compat_result["message"]
        )

    if not compat_result["compatible"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=compat_result["message"]
        )

    # 2. Update storage chamber safe operating band if compatible common range calculated
    if compat_result.get("recommended_target_temp"):
        unit.target_temperature = compat_result["recommended_target_temp"]
        unit.min_safe_temp = compat_result["common_min_temp"]
        unit.max_safe_temp = compat_result["common_max_temp"]

    # 3. Create Storage Record
    expected_days = payload.expected_storage_days or (crop.profile.max_storage_days if crop.profile else 7)
    record = StorageRecord(
        user_id=current_user.id,
        storage_unit_id=unit.id,
        crop_id=crop.id,
        quantity_kg=payload.quantity_kg,
        initial_condition=payload.initial_condition,
        current_condition=payload.initial_condition,
        harvest_date=payload.harvest_date,
        storage_start=datetime.datetime.utcnow(),
        expected_storage_days=expected_days,
        status="stored",
        farmer_notes=payload.farmer_notes
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # 4. Generate initial explainable recommendation
    RecommendationService.generate_recommendation_for_record(db, record.id)

    return _format_record_response(record)

@router.get("/storage/{id}/produce", response_model=List[StorageRecordResponse])
def get_chamber_produce(id: int, db: Session = Depends(get_db)):
    """List all produce currently stored inside physical chamber."""
    records = db.query(StorageRecord).filter(
        StorageRecord.storage_unit_id == id,
        StorageRecord.status == "stored"
    ).all()
    return [_format_record_response(r) for r in records]

@router.get("/produce/farmer", response_model=List[StorageRecordResponse])
def get_farmer_stored_produce(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """List all active produce records belonging to the authenticated farmer."""
    records = db.query(StorageRecord).filter(
        StorageRecord.user_id == current_user.id,
        StorageRecord.status == "stored"
    ).order_by(StorageRecord.storage_start.desc()).all()
    return [_format_record_response(r) for r in records]

@router.post("/produce/{id}/checkout", response_model=StorageRecordResponse)
def checkout_produce(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Retrieve or dispatch produce from cold storage (releases capacity)."""
    record = db.query(StorageRecord).filter(
        StorageRecord.id == id,
        StorageRecord.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Produce record not found or unauthorized.")

    if record.status != "stored":
        raise HTTPException(status_code=400, detail="Produce is already retrieved or dispatched.")

    record.status = "retrieved"
    record.removal_date = datetime.datetime.utcnow()
    db.commit()
    db.refresh(record)

    return _format_record_response(record)
