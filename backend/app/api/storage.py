from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.models import StorageUnit, StorageRecord, SensorReading, Alert, Device
from app.schemas.schemas import StorageUnitResponse, CapacityResponse

router = APIRouter(prefix="/api/storage", tags=["Storage Units"])

def _enrich_unit_response(unit: StorageUnit, db: Session) -> dict:
    """Helper to compute occupancy, crops, farmers, and latest telemetry for a unit."""
    active_records = db.query(StorageRecord).filter(
        StorageRecord.storage_unit_id == unit.id,
        StorageRecord.status == "stored"
    ).all()

    occupied = sum(r.quantity_kg for r in active_records)
    available = max(0.0, unit.total_capacity - occupied)
    occupancy_pct = min(100.0, (occupied / unit.total_capacity) * 100.0) if unit.total_capacity > 0 else 0.0

    active_crops = list({r.crop.name for r in active_records if r.crop})
    unique_farmers = len({r.user_id for r in active_records})

    latest_reading = db.query(SensorReading).filter(
        SensorReading.storage_unit_id == unit.id
    ).order_by(SensorReading.recorded_at.desc()).first()

    device = db.query(Device).filter(Device.storage_unit_id == unit.id).first()
    active_alerts = db.query(Alert).filter(
        Alert.storage_unit_id == unit.id,
        Alert.is_active == True
    ).count()

    return {
        "id": unit.id,
        "unit_code": unit.unit_code,
        "qr_code": unit.qr_code,
        "village": unit.village,
        "district": unit.district,
        "state": unit.state,
        "latitude": unit.latitude,
        "longitude": unit.longitude,
        "total_capacity": unit.total_capacity,
        "occupied_capacity": round(occupied, 1),
        "available_capacity": round(available, 1),
        "occupancy_percentage": round(occupancy_pct, 1),
        "target_temperature": unit.target_temperature,
        "min_safe_temp": unit.min_safe_temp,
        "max_safe_temp": unit.max_safe_temp,
        "status": unit.status,
        "is_online": device.is_online if device else True,
        "current_temp": latest_reading.inside_temp if latest_reading else 11.5,
        "current_humidity": latest_reading.inside_humidity if latest_reading else 78.0,
        "battery_percentage": latest_reading.battery_percentage if latest_reading else 82.0,
        "door_open": latest_reading.door_open if latest_reading else False,
        "active_crops": active_crops,
        "farmer_count": unique_farmers,
        "active_alerts_count": active_alerts
    }

@router.get("", response_model=List[StorageUnitResponse])
def list_storage_units(db: Session = Depends(get_db)):
    """List all decentralized storage units with live status."""
    units = db.query(StorageUnit).all()
    return [_enrich_unit_response(u, db) for u in units]

@router.get("/qr/{code}", response_model=StorageUnitResponse)
def get_unit_by_qr(code: str, db: Session = Depends(get_db)):
    """Retrieve storage unit details by QR code or Unit code (e.g. NER-CS-001)."""
    unit = db.query(StorageUnit).filter(
        (StorageUnit.qr_code == code.strip()) | (StorageUnit.unit_code == code.strip())
    ).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Storage unit with QR code '{code}' was not found."
        )
    return _enrich_unit_response(unit, db)

@router.get("/{id}", response_model=StorageUnitResponse)
def get_storage_unit(id: int, db: Session = Depends(get_db)):
    """Get storage unit details by ID."""
    unit = db.query(StorageUnit).filter(StorageUnit.id == id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storage unit not found."
        )
    return _enrich_unit_response(unit, db)

@router.get("/{id}/capacity", response_model=CapacityResponse)
def get_unit_capacity(id: int, db: Session = Depends(get_db)):
    """Get capacity and occupancy metrics for a storage unit."""
    unit = db.query(StorageUnit).filter(StorageUnit.id == id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storage unit not found."
        )

    active_records = db.query(StorageRecord).filter(
        StorageRecord.storage_unit_id == unit.id,
        StorageRecord.status == "stored"
    ).all()

    occupied = sum(r.quantity_kg for r in active_records)
    available = max(0.0, unit.total_capacity - occupied)
    occupancy_pct = (occupied / unit.total_capacity) * 100.0 if unit.total_capacity > 0 else 0.0

    return {
        "storage_unit_id": unit.id,
        "unit_code": unit.unit_code,
        "total_capacity": unit.total_capacity,
        "occupied_capacity": round(occupied, 1),
        "available_capacity": round(available, 1),
        "occupancy_percentage": round(occupancy_pct, 1),
        "is_full": available <= 0.0
    }
