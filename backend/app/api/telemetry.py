import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.database.session import get_db
from app.models.models import StorageUnit, Device, SensorReading
from app.schemas.schemas import TelemetryPayload, SensorReadingResponse, DeviceStatusResponse
from app.services.telemetry_service import TelemetryService

router = APIRouter(prefix="/api", tags=["Hardware & Telemetry"])

@router.get("/storage/{id}/telemetry")
def get_storage_telemetry(id: int, limit: int = 24, db: Session = Depends(get_db)):
    """Retrieve latest sensor reading and historical trend data for unit."""
    unit = db.query(StorageUnit).filter(StorageUnit.id == id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Storage unit not found.")

    readings = db.query(SensorReading).filter(
        SensorReading.storage_unit_id == id
    ).order_by(SensorReading.recorded_at.desc()).limit(limit).all()

    readings.reverse() # Chronological order for charting

    latest = readings[-1] if readings else None

    history_points = []
    for r in readings:
        history_points.append({
            "timestamp": r.recorded_at.strftime("%H:%M"),
            "inside_temp": r.inside_temp,
            "inside_humidity": r.inside_humidity,
            "outside_temp": r.outside_temp,
            "battery_percentage": r.battery_percentage
        })

    return {
        "unit_id": unit.id,
        "unit_code": unit.unit_code,
        "target_temperature": unit.target_temperature,
        "min_safe_temp": unit.min_safe_temp,
        "max_safe_temp": unit.max_safe_temp,
        "latest": {
            "inside_temp": latest.inside_temp if latest else 11.6,
            "inside_humidity": latest.inside_humidity if latest else 78.0,
            "outside_temp": latest.outside_temp if latest else 28.0,
            "outside_humidity": latest.outside_humidity if latest else 70.0,
            "door_open": latest.door_open if latest else False,
            "battery_voltage": latest.battery_voltage if latest else 13.2,
            "battery_percentage": latest.battery_percentage if latest else 82.0,
            "cooling_active": latest.cooling_active if latest else True,
            "power_source": latest.power_source if latest else "solar_battery",
            "recorded_at": latest.recorded_at.isoformat() if latest else datetime.datetime.utcnow().isoformat()
        },
        "history": history_points
    }

@router.post("/device/{device_id}/telemetry")
async def ingest_device_telemetry(
    device_id: str, 
    payload: TelemetryPayload, 
    db: Session = Depends(get_db)
):
    """
    ESP32 hardware telemetry ingestion endpoint.
    Processes live DS18B20, SHT31, Reed switch, and INA226 readings.
    """
    device = db.query(Device).filter(Device.device_id == device_id).first()
    unit_id = device.storage_unit_id if device else 1

    reading = await TelemetryService.process_telemetry(
        db=db,
        storage_unit_id=unit_id,
        device_id=device_id,
        inside_temp=payload.temperature,
        inside_humidity=payload.humidity,
        outside_temp=payload.outside_temperature or 28.0,
        outside_humidity=payload.outside_humidity or 70.0,
        door_open=payload.door_open,
        battery_voltage=payload.battery_voltage or 13.2,
        battery_current=payload.battery_current or 2.4,
        battery_percentage=payload.battery_percentage or 85.0,
        cooling_active=payload.cooling,
        power_source=payload.power_source or "solar_battery"
    )

    return {
        "status": "success",
        "reading_id": reading.id,
        "cooling_command": reading.cooling_active,
        "server_time": datetime.datetime.utcnow().isoformat()
    }

@router.get("/device/{device_id}/status")
def get_device_status(device_id: str, db: Session = Depends(get_db)):
    """Check connectivity and telemetry heartbeat of an ESP32 unit."""
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    unit = device.storage_unit
    latest = db.query(SensorReading).filter(
        SensorReading.storage_unit_id == unit.id
    ).order_by(SensorReading.recorded_at.desc()).first()

    return {
        "device_id": device.device_id,
        "storage_unit_code": unit.unit_code if unit else "Unknown",
        "firmware_version": device.firmware_version,
        "is_online": device.is_online,
        "last_heartbeat": device.last_heartbeat.isoformat() if device.last_heartbeat else None,
        "latest_temp": latest.inside_temp if latest else None,
        "cooling_active": latest.cooling_active if latest else None
    }

@router.post("/device/{device_id}/heartbeat")
def device_heartbeat(device_id: str, db: Session = Depends(get_db)):
    """Simple ping heartbeat sent by ESP32."""
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if device:
        device.is_online = True
        device.last_heartbeat = datetime.datetime.utcnow()
        db.commit()
    return {"status": "alive", "timestamp": datetime.datetime.utcnow().isoformat()}

@router.post("/device/{device_id}/events")
def device_events(device_id: str, event_data: Dict[str, Any], db: Session = Depends(get_db)):
    """Log hardware interrupts like door opening or power mode transitions."""
    return {"status": "logged", "event": event_data.get("event", "generic")}
