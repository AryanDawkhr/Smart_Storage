from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.models import Alert
from app.schemas.schemas import AlertResponse
from app.services.alert_service import AlertService

router = APIRouter(prefix="/api/alerts", tags=["Alerts Engine"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    unit_id: Optional[int] = None, 
    active_only: bool = False, 
    db: Session = Depends(get_db)
):
    """Retrieve alerts, optionally filtered by storage unit and active state."""
    query = db.query(Alert)
    if unit_id:
        query = query.filter(Alert.storage_unit_id == unit_id)
    if active_only:
        query = query.filter(Alert.is_active == True)

    alerts = query.order_by(Alert.created_at.desc()).all()
    
    result = []
    for a in alerts:
        result.append({
            "id": a.id,
            "storage_unit_id": a.storage_unit_id,
            "unit_code": a.storage_unit.unit_code if a.storage_unit else "NER-CS-001",
            "severity": a.severity,
            "alert_type": a.alert_type,
            "title": a.title,
            "message": a.message,
            "is_active": a.is_active,
            "created_at": a.created_at,
            "resolved_at": a.resolved_at
        })
    return result

@router.patch("/{id}/resolve", response_model=dict)
def resolve_alert(id: int, db: Session = Depends(get_db)):
    """Mark an active alert as resolved."""
    success = AlertService.resolve_alert_by_id(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or already resolved.")
    return {"status": "resolved", "alert_id": id}
