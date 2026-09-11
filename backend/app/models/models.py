import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, 
    DateTime, ForeignKey, Date
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    mobile = Column(String(20), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="farmer") # 'farmer', 'operator', 'admin'
    village = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    preferred_language = Column(String(20), default="en")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    storage_records = relationship("StorageRecord", back_populates="user")
    sync_items = relationship("SyncQueue", back_populates="user")

class StorageUnit(Base):
    __tablename__ = "storage_units"

    id = Column(Integer, primary_key=True, index=True)
    unit_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. NER-CS-001
    qr_code = Column(String(100), unique=True, nullable=False)
    village = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    total_capacity = Column(Float, default=50.0, nullable=False) # kg
    target_temperature = Column(Float, default=11.5)
    min_safe_temp = Column(Float, default=10.0)
    max_safe_temp = Column(Float, default=13.0)
    status = Column(String(50), default="active") # 'active', 'maintenance', 'offline'
    installation_date = Column(Date, default=datetime.date.today)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    devices = relationship("Device", back_populates="storage_unit")
    storage_records = relationship("StorageRecord", back_populates="storage_unit")
    sensor_readings = relationship("SensorReading", back_populates="storage_unit")
    alerts = relationship("Alert", back_populates="storage_unit")

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. ESP32-NER-001
    storage_unit_id = Column(Integer, ForeignKey("storage_units.id", ondelete="CASCADE"))
    firmware_version = Column(String(50), default="v1.2.0")
    mac_address = Column(String(50), nullable=True)
    is_online = Column(Boolean, default=True)
    last_heartbeat = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    storage_unit = relationship("StorageUnit", back_populates="devices")

class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(50), default="vegetable") # 'vegetable', 'fruit', 'spice'
    local_ner_name = Column(String(150), nullable=True)
    image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("CropProfile", back_populates="crop", uselist=False)
    storage_records = relationship("StorageRecord", back_populates="crop")
    market_entries = relationship("MarketData", back_populates="crop")

class CropProfile(Base):
    __tablename__ = "crop_profiles"

    id = Column(Integer, primary_key=True, index=True)
    crop_id = Column(Integer, ForeignKey("crops.id", ondelete="CASCADE"), unique=True)
    min_temp = Column(Float, nullable=False) # e.g. 10.0
    max_temp = Column(Float, nullable=False) # e.g. 13.0
    min_humidity = Column(Float, nullable=False) # e.g. 85.0
    max_humidity = Column(Float, nullable=False) # e.g. 95.0
    max_storage_days = Column(Integer, nullable=False) # e.g. 14
    chilling_sensitive = Column(Boolean, default=False)
    ethylene_producer = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    crop = relationship("Crop", back_populates="profile")

class StorageRecord(Base):
    __tablename__ = "storage_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    storage_unit_id = Column(Integer, ForeignKey("storage_units.id", ondelete="RESTRICT"), nullable=False)
    crop_id = Column(Integer, ForeignKey("crops.id", ondelete="RESTRICT"), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    initial_condition = Column(String(50), default="Fresh")
    current_condition = Column(String(50), default="Good")
    harvest_date = Column(Date, nullable=False)
    storage_start = Column(DateTime, default=datetime.datetime.utcnow)
    expected_storage_days = Column(Integer, nullable=False)
    removal_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="stored") # 'stored', 'dispatched', 'retrieved'
    farmer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="storage_records")
    storage_unit = relationship("StorageUnit", back_populates="storage_records")
    crop = relationship("Crop", back_populates="storage_records")
    recommendations = relationship("Recommendation", back_populates="storage_record")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    storage_unit_id = Column(Integer, ForeignKey("storage_units.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(String(100), nullable=False)
    inside_temp = Column(Float, nullable=False)
    inside_humidity = Column(Float, nullable=False)
    outside_temp = Column(Float, default=28.0)
    outside_humidity = Column(Float, default=70.0)
    door_open = Column(Boolean, default=False)
    battery_voltage = Column(Float, default=13.2)
    battery_current = Column(Float, default=2.4)
    battery_percentage = Column(Float, default=85.0)
    cooling_active = Column(Boolean, default=False)
    power_source = Column(String(50), default="solar_battery") # 'solar', 'battery', 'grid'
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    storage_unit = relationship("StorageUnit", back_populates="sensor_readings")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    storage_unit_id = Column(Integer, ForeignKey("storage_units.id", ondelete="CASCADE"), nullable=False)
    severity = Column(String(20), nullable=False) # 'INFO', 'WARNING', 'CRITICAL'
    alert_type = Column(String(50), nullable=False) # 'HIGH_TEMP', 'LOW_TEMP', 'DOOR_OPEN', 'LOW_BATTERY', 'DEVICE_OFFLINE'
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    storage_unit = relationship("StorageUnit", back_populates="alerts")

class MarketData(Base):
    __tablename__ = "market_data"

    id = Column(Integer, primary_key=True, index=True)
    crop_id = Column(Integer, ForeignKey("crops.id", ondelete="CASCADE"), nullable=False)
    market_name = Column(String(150), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    min_price = Column(Float, nullable=False) # INR / Quintal
    max_price = Column(Float, nullable=False)
    modal_price = Column(Float, nullable=False)
    arrival_tonnes = Column(Float, default=10.0)
    price_trend = Column(String(20), default="stable") # 'rising', 'stable', 'falling'
    distance_km = Column(Float, nullable=True)
    reported_date = Column(Date, default=datetime.date.today)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    crop = relationship("Crop", back_populates="market_entries")

class TransportData(Base):
    __tablename__ = "transport_data"

    id = Column(Integer, primary_key=True, index=True)
    origin_village = Column(String(100), nullable=False)
    destination_market = Column(String(150), nullable=False)
    distance_km = Column(Float, nullable=False)
    estimated_hours = Column(Float, nullable=False)
    transport_mode = Column(String(50), default="Mini Truck (Tata Ace)")
    cost_per_quintal = Column(Float, nullable=False)
    provider_name = Column(String(150), nullable=False)
    provider_phone = Column(String(20), nullable=False)
    is_available = Column(Boolean, default=True)
    departure_time = Column(String(50), default="Daily 05:00 AM")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    storage_record_id = Column(Integer, ForeignKey("storage_records.id", ondelete="CASCADE"), nullable=False)
    decision = Column(String(20), nullable=False) # 'STORE', 'SELL', 'TRANSPORT'
    confidence_score = Column(Integer, default=85)
    primary_reason = Column(Text, nullable=False)
    factors_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    storage_record = relationship("StorageRecord", back_populates="recommendations")

class SyncQueue(Base):
    __tablename__ = "sync_queue"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String(50), nullable=False)
    payload_json = Column(Text, nullable=False)
    synced = Column(Boolean, default=False)
    synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="sync_items")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    actor_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
