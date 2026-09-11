import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.models import Alert, StorageUnit, SensorReading, StorageRecord

class AlertService:
    @staticmethod
    def evaluate_telemetry_for_alerts(
        db: Session, 
        storage_unit: StorageUnit, 
        reading: SensorReading
    ) -> List[Alert]:
        """
        Evaluates real-time sensor reading against storage unit boundaries and active crops.
        Generates or resolves alerts accordingly.
        """
        generated_alerts = []
        now = datetime.datetime.utcnow()

        # 1. Temperature Threshold Checks
        min_temp = storage_unit.min_safe_temp or 10.0
        max_temp = storage_unit.max_safe_temp or 13.0

        if reading.inside_temp > (max_temp + 1.5):
            # Critical high temperature
            alert = AlertService._get_or_create_alert(
                db, storage_unit.id, "CRITICAL", "HIGH_TEMP",
                "Critical High Temperature",
                f"Chamber temperature reached {reading.inside_temp:.1f}°C (Safe limit: {max_temp:.1f}°C). Risk of crop spoilage."
            )
            if alert: generated_alerts.append(alert)
        elif reading.inside_temp > max_temp:
            # Warning high temperature
            alert = AlertService._get_or_create_alert(
                db, storage_unit.id, "WARNING", "HIGH_TEMP",
                "Temperature Above Safe Band",
                f"Chamber temperature is {reading.inside_temp:.1f}°C (Target: {storage_unit.target_temperature:.1f}°C). Cooling active."
            )
            if alert: generated_alerts.append(alert)
        elif reading.inside_temp < (min_temp - 1.0):
            # Critical low temperature / chilling injury
            alert = AlertService._get_or_create_alert(
                db, storage_unit.id, "WARNING", "LOW_TEMP",
                "Low Temperature Warning",
                f"Chamber temperature dropped to {reading.inside_temp:.1f}°C (Min safe: {min_temp:.1f}°C). Chilling injury danger."
            )
            if alert: generated_alerts.append(alert)
        else:
            # Temperature is safe, resolve active temperature alerts
            AlertService._resolve_alert_type(db, storage_unit.id, "HIGH_TEMP")
            AlertService._resolve_alert_type(db, storage_unit.id, "LOW_TEMP")

        # 2. Door Open Check
        if reading.door_open:
            alert = AlertService._get_or_create_alert(
                db, storage_unit.id, "WARNING", "DOOR_OPEN",
                "Door Open Detected",
                "Storage chamber door is currently open. Ensure door is sealed to preserve cooling efficiency."
            )
            if alert: generated_alerts.append(alert)
        else:
            AlertService._resolve_alert_type(db, storage_unit.id, "DOOR_OPEN")

        # 3. Battery State of Charge Check
        bat_pct = reading.battery_percentage or 85.0
        if bat_pct < 25.0:
            alert = AlertService._get_or_create_alert(
                db, storage_unit.id, "CRITICAL", "LOW_BATTERY",
                "Critical Low Battery",
                f"LiFePO4 battery at {bat_pct:.0f}%. Insufficient solar energy or power failure. Connect backup generator."
            )
            if alert: generated_alerts.append(alert)
        elif bat_pct < 40.0:
            alert = AlertService._get_or_create_alert(
                db, storage_unit.id, "WARNING", "LOW_BATTERY",
                "Battery Reserve Warning",
                f"Battery reserves at {bat_pct:.0f}%. Peltier cooling operating in power-saving mode."
            )
            if alert: generated_alerts.append(alert)
        else:
            AlertService._resolve_alert_type(db, storage_unit.id, "LOW_BATTERY")

        db.commit()
        return generated_alerts

    @staticmethod
    def check_storage_age_alerts(db: Session, storage_unit_id: int):
        """Checks for crops nearing their maximum recommended storage limit."""
        now = datetime.datetime.utcnow()
        records = db.query(StorageRecord).filter(
            StorageRecord.storage_unit_id == storage_unit_id,
            StorageRecord.status == "stored"
        ).all()

        for rec in records:
            if not rec.crop or not rec.crop.profile:
                continue
            max_days = rec.crop.profile.max_storage_days
            elapsed_days = (now - rec.storage_start).total_seconds() / 86400.0
            
            if elapsed_days >= (max_days * 0.8):
                AlertService._get_or_create_alert(
                    db, storage_unit_id, "WARNING", "STORAGE_LIMIT",
                    f"{rec.crop.name} Nearing Storage Limit",
                    f"{rec.quantity_kg:.0f} kg of {rec.crop.name} stored for {elapsed_days:.1f} days (Safe limit: {max_days} days). Dispatch recommended."
                )
        db.commit()

    @staticmethod
    def _get_or_create_alert(
        db: Session, 
        storage_unit_id: int, 
        severity: str, 
        alert_type: str, 
        title: str, 
        message: str
    ) -> Optional[Alert]:
        """Prevents creating duplicate active alerts of the same type."""
        existing = db.query(Alert).filter(
            Alert.storage_unit_id == storage_unit_id,
            Alert.alert_type == alert_type,
            Alert.is_active == True
        ).first()

        if existing:
            # Update message if needed
            existing.message = message
            existing.severity = severity
            return None

        new_alert = Alert(
            storage_unit_id=storage_unit_id,
            severity=severity,
            alert_type=alert_type,
            title=title,
            message=message,
            is_active=True,
            created_at=datetime.datetime.utcnow()
        )
        db.add(new_alert)
        return new_alert

    @staticmethod
    def _resolve_alert_type(db: Session, storage_unit_id: int, alert_type: str):
        """Resolves all active alerts of a specific type for a storage unit."""
        active_alerts = db.query(Alert).filter(
            Alert.storage_unit_id == storage_unit_id,
            Alert.alert_type == alert_type,
            Alert.is_active == True
        ).all()

        for alert in active_alerts:
            alert.is_active = False
            alert.resolved_at = datetime.datetime.utcnow()

    @staticmethod
    def resolve_alert_by_id(db: Session, alert_id: int) -> bool:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if alert and alert.is_active:
            alert.is_active = False
            alert.resolved_at = datetime.datetime.utcnow()
            db.commit()
            return True
        return False
