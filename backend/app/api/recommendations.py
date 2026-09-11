from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from app.database.session import get_db
from app.models.models import Recommendation, StorageRecord
from app.schemas.schemas import RecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/recommendations", tags=["Decision Support Engine"])

@router.get("/{storage_record_id}", response_model=RecommendationResponse)
def get_recommendation_for_batch(
    storage_record_id: int, 
    db: Session = Depends(get_db)
):
    """
    Generate or fetch latest explainable STORE / SELL / TRANSPORT 
    recommendation for a specific produce record.
    """
    rec_dict = RecommendationService.generate_recommendation_for_record(db, storage_record_id)
    return rec_dict

@router.get("", response_model=List[RecommendationResponse])
def get_farmer_recommendations(
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """Get recommendations for all active stored produce of current farmer."""
    active_records = db.query(StorageRecord).filter(
        StorageRecord.user_id == current_user.id,
        StorageRecord.status == "stored"
    ).all()

    recommendations = []
    for r in active_records:
        rec_data = RecommendationService.generate_recommendation_for_record(db, r.id)
        recommendations.append(rec_data)

    return recommendations
