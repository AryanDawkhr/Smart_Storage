from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.models import TransportData
from app.schemas.schemas import TransportDataResponse

router = APIRouter(prefix="/api/transport", tags=["Logistics & Transport"])

@router.get("", response_model=List[TransportDataResponse])
def get_transport_options(db: Session = Depends(get_db)):
    """Retrieve regional logistics and rural transport options."""
    options = db.query(TransportData).filter(TransportData.is_available == True).all()
    return options
