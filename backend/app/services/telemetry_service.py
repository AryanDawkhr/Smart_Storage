import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import StorageUnit, Device, SensorReading
from app.services.alert_service import AlertService
from app.websocket.connection_manager import ws_manager

class TelemetryService:
    @staticmethod
    async def process_telemetry(
        db: Session,
        storage_unit_id: int,
        device_id: str,
        inside_temp: float,
        inside_humidity: float,
        outside_temp: float = 28.0,
        outside_humidity: float = 70.0,
        door_open: bool = False,
        battery_voltage: float = 13.2,
        battery_current: float = 2.4,
        battery_percentage: float = 85.0,
        cooling_active: Optional[bool] = None,
        power_source: str = "solar_battery"
    ) -> SensorReading:
        """
        Processes and records sensor telemetry from either physical ESP32 or simulation.
        Applies local hysteresis cooling control logic and threshold alert checks.
        """
        unit = db.query(StorageUnit).filter(StorageUnit.id == storage_unit_id).first()
        if not unit:
            unit = db.query(StorageUnit).first() # Fallback to first unit if not specified

        target_temp = unit.target_temperature if unit else 11.5

        # Local Hysteresis Cooling Controller (0.8°C deadband)
        if cooling_active is None:
            if inside_temp > (target_temp + 0.5):
                cooling_active = True
            elif inside_temp < (target_temp - 0.4):
                cooling_active = False
            else:
                cooling_active = True # Maintain cooling state

        # Create Reading Record
        reading = SensorReading(
            storage_unit_id=unit.id if unit else 1,
            device_id=device_id,
            inside_temp=round(inside_temp, 2),
            inside_humidity=round(inside_humidity, 1),
            outside_temp=round(outside_temp, 1),
            outside_humidity=round(outside_humidity, 1),
            door_open=door_open,
            battery_voltage=round(battery_voltage, 2),
            battery_current=round(battery_current, 2),
            battery_percentage=round(battery_percentage, 1),
            cooling_active=cooling_active,
            power_source=power_source,
            recorded_at=datetime.datetime.utcnow()
        )
        db.add(reading)

        # Update Device Heartbeat and Online Status
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if device:
            device.is_online = True
            device.last_heartbeat = datetime.datetime.utcnow()

        db.commit()
        db.refresh(reading)

        # Threshold Alert Evaluation
        if unit:
            AlertService.evaluate_telemetry_for_alerts(db, unit, reading)
            AlertService.check_storage_age_alerts(db, unit.id)

        # Real-time WebSocket Broadcast
        broadcast_payload = {
            "type": "telemetry_update",
            "storage_unit_id": unit.id if unit else 1,
            "unit_code": unit.unit_code if unit else "NER-CS-001",
            "device_id": device_id,
            "inside_temp": reading.inside_temp,
            "inside_humidity": reading.inside_humidity,
            "outside_temp": reading.outside_temp,
            "outside_humidity": reading.outside_humidity,
            "door_open": reading.door_open,
            "battery_percentage": reading.battery_percentage,
            "battery_voltage": reading.battery_voltage,
            "cooling_active": reading.cooling_active,
            "power_source": reading.power_source,
            "is_online": True,
            "timestamp": reading.recorded_at.isoformat()
        }
        await ws_manager.broadcast(broadcast_payload)

        return reading
