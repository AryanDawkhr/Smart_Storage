import datetime
import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    StorageRecord, StorageUnit, Crop, CropProfile, 
    MarketData, TransportData, Recommendation, SensorReading
)

class RecommendationService:
    @staticmethod
    def generate_recommendation_for_record(db: Session, record_id: int) -> Dict[str, Any]:
        """
        Calculates an explainable STORE / SELL / TRANSPORT decision for a farmer's produce batch.
        Transparent scoring based on storage safety, age, market prices, and logistics.
        """
        record = db.query(StorageRecord).filter(StorageRecord.id == record_id).first()
        if not record:
            return {
                "decision": "STORE",
                "confidence_score": 50,
                "primary_reason": "Produce record not found.",
                "factors": {}
            }

        crop = record.crop
        profile = crop.profile if crop else None
        unit = record.storage_unit

        # 1. Evaluate Storage Age Factor
        now = datetime.datetime.utcnow()
        elapsed_seconds = (now - record.storage_start).total_seconds()
        elapsed_days = max(0.1, elapsed_seconds / 86400.0)
        max_safe_days = profile.max_storage_days if profile else 14
        age_ratio = elapsed_days / float(max_safe_days) # 0.0 (just stored) to 1.0 (limit reached)

        # 2. Evaluate Chamber Health / Temperature Factor
        latest_reading = db.query(SensorReading).filter(
            SensorReading.storage_unit_id == unit.id
        ).order_by(SensorReading.recorded_at.desc()).first()

        current_temp = latest_reading.inside_temp if latest_reading else 11.5
        min_safe_temp = profile.min_temp if profile else 10.0
        max_safe_temp = profile.max_temp if profile else 13.0
        is_temp_safe = (min_safe_temp <= current_temp <= max_safe_temp)

        # 3. Evaluate Market Data (Mandi price & trend)
        market_entry = db.query(MarketData).filter(
            MarketData.crop_id == record.crop_id
        ).order_by(MarketData.reported_date.desc()).first()

        mandi_name = market_entry.market_name if market_entry else "Local Mandi"
        modal_price = market_entry.modal_price if market_entry else 2000.0
        price_trend = market_entry.price_trend if market_entry else "stable" # 'rising', 'stable', 'falling'

        # 4. Evaluate Transport Logistics
        transport_entry = db.query(TransportData).filter(
            TransportData.is_available == True
        ).first()

        transport_available = bool(transport_entry)
        transport_hours = transport_entry.estimated_hours if transport_entry else 2.0
        transport_provider = transport_entry.provider_name if transport_entry else "Local Mini-Truck"
        transport_cost = transport_entry.cost_per_quintal if transport_entry else 100.0

        # 5. Transparent Rule-Based Decision Logic
        decision = "STORE"
        confidence = 85
        reason = ""

        if not is_temp_safe and age_ratio > 0.4:
            # Temperature is unstable and produce has some age -> evacuate produce
            decision = "SELL"
            confidence = 92
            reason = f"Chamber temperature ({current_temp:.1f}°C) is fluctuating outside safe band ({min_safe_temp}–{max_safe_temp}°C). Liquidate at {mandi_name} immediately to prevent spoilage."

        elif age_ratio >= 0.80:
            # Age is near recommended limit (>80%)
            if transport_available:
                decision = "TRANSPORT"
                confidence = 94
                reason = f"{crop.name} has been stored for {elapsed_days:.1f} days (limit: {max_safe_days} days). {transport_provider} is ready for dispatch to {mandi_name}."
            else:
                decision = "SELL"
                confidence = 89
                reason = f"{crop.name} is nearing its safe storage threshold ({elapsed_days:.1f}/{max_safe_days} days). Sell to local buyers before quality diminishes."

        elif price_trend == "rising" and age_ratio < 0.60:
            # Favorable storage: safe temp, low age, rising prices -> hold for maximum return
            decision = "STORE"
            confidence = 90
            reason = f"Storage conditions are optimal ({current_temp:.1f}°C) and {crop.name} mandi price is rising (₹{modal_price:.0f}/Q). Holding for 2–3 more days is projected to maximize profit."

        elif price_trend == "falling" and modal_price > 2200.0:
            # High price but starting to drop -> capitalize now
            if transport_available:
                decision = "TRANSPORT"
                confidence = 87
                reason = f"Market price at {mandi_name} is currently high (₹{modal_price:.0f}/Q) but trending downward. Dispatch via {transport_provider} today."
            else:
                decision = "SELL"
                confidence = 82
                reason = f"Market prices are beginning to decline. Offload stock locally while prices remain profitable."

        else:
            # Normal holding state
            if age_ratio < 0.5:
                decision = "STORE"
                confidence = 85
                reason = f"Storage environment is stable at {current_temp:.1f}°C. Fresh produce is safely preserved with ample shelf life remaining ({max_safe_days - int(elapsed_days)} days left)."
            else:
                decision = "TRANSPORT"
                confidence = 80
                reason = f"Produce has reached mid-storage duration ({elapsed_days:.1f} days). Schedule transport to regional market within the next 24 hours."

        factors = {
            "crop_name": crop.name,
            "quantity_kg": record.quantity_kg,
            "storage_age_days": round(elapsed_days, 1),
            "max_safe_days": max_safe_days,
            "age_percentage": round(age_ratio * 100, 1),
            "current_temp": current_temp,
            "is_temp_safe": is_temp_safe,
            "mandi_name": mandi_name,
            "modal_price_per_qtl": modal_price,
            "price_trend": price_trend,
            "transport_available": transport_available,
            "transport_provider": transport_provider,
            "transport_hours": transport_hours,
            "transport_cost_qtl": transport_cost
        }

        # Persist recommendation
        rec_obj = db.query(Recommendation).filter(
            Recommendation.storage_record_id == record.id
        ).first()

        if rec_obj:
            rec_obj.decision = decision
            rec_obj.confidence_score = confidence
            rec_obj.primary_reason = reason
            rec_obj.factors_json = json.dumps(factors)
        else:
            rec_obj = Recommendation(
                storage_record_id=record.id,
                decision=decision,
                confidence_score=confidence,
                primary_reason=reason,
                factors_json=json.dumps(factors),
                created_at=datetime.datetime.utcnow()
            )
            db.add(rec_obj)

        db.commit()

        return {
            "id": rec_obj.id,
            "storage_record_id": record.id,
            "crop_name": crop.name,
            "quantity_kg": record.quantity_kg,
            "decision": decision,
            "confidence_score": confidence,
            "primary_reason": reason,
            "factors": factors,
            "created_at": rec_obj.created_at
        }
