import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.models import StorageRecord, User
from app.schemas.schemas import StorageRecordResponse
from app.api.auth import get_current_user
from app.api.produce import _format_record_response

router = APIRouter(prefix="/api/history", tags=["Storage History"])

@router.get("", response_model=List[StorageRecordResponse])
def get_storage_history(
    storage_unit_id: Optional[int] = None,
    all_farmers: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve comprehensive storage history.
    By default returns records for the logged-in farmer to preserve privacy;
    if all_farmers=True, returns chamber history.
    """
    query = db.query(StorageRecord)

    if not all_farmers:
        query = query.filter(StorageRecord.user_id == current_user.id)
    if storage_unit_id:
        query = query.filter(StorageRecord.storage_unit_id == storage_unit_id)

    records = query.order_by(StorageRecord.storage_start.desc()).all()
    return [_format_record_response(r) for r in records]
