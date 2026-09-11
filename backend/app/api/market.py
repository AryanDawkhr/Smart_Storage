from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.models.models import MarketData, Crop
from app.schemas.schemas import MarketDataResponse

router = APIRouter(prefix="/api/market", tags=["Market & Mandi"])

@router.get("", response_model=List[MarketDataResponse])
def get_market_data(crop_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Retrieve market mandi prices across NER."""
    query = db.query(MarketData)
    if crop_id:
        query = query.filter(MarketData.crop_id == crop_id)

    items = query.order_by(MarketData.reported_date.desc()).all()
    results = []
    for m in items:
        results.append({
            "id": m.id,
            "crop_id": m.crop_id,
            "crop_name": m.crop.name if m.crop else "Produce",
            "market_name": m.market_name,
            "district": m.district,
            "state": m.state,
            "min_price": m.min_price,
            "max_price": m.max_price,
            "modal_price": m.modal_price,
            "arrival_tonnes": m.arrival_tonnes,
            "price_trend": m.price_trend,
            "distance_km": m.distance_km,
            "reported_date": m.reported_date
        })
    return results
