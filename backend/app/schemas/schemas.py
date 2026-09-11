from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date

# ----------------- Authentication & User Schemas -----------------
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    mobile: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=6)
    village: str
    district: str
    state: str
    preferred_language: Optional[str] = "en"

class UserLogin(BaseModel):
    mobile: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    mobile: str
    role: str
    village: str
    district: str
    state: str
    preferred_language: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ----------------- Storage Unit & Capacity Schemas -----------------
class StorageUnitResponse(BaseModel):
    id: int
    unit_code: str
    qr_code: str
    village: str
    district: str
    state: str
    latitude: Optional[float]
    longitude: Optional[float]
    total_capacity: float
    occupied_capacity: float = 0.0
    available_capacity: float = 50.0
    occupancy_percentage: float = 0.0
    target_temperature: float
    min_safe_temp: float
    max_safe_temp: float
    status: str
    is_online: bool = True
    current_temp: Optional[float] = None
    current_humidity: Optional[float] = None
    battery_percentage: Optional[float] = None
    door_open: Optional[bool] = None
    active_crops: List[str] = []
    farmer_count: int = 0
    active_alerts_count: int = 0

    class Config:
        from_attributes = True

class CapacityResponse(BaseModel):
    storage_unit_id: int
    unit_code: str
    total_capacity: float
    occupied_capacity: float
    available_capacity: float
    occupancy_percentage: float
    is_full: bool

# ----------------- Crop & Profile Schemas -----------------
class CropProfileResponse(BaseModel):
    id: int
    min_temp: float
    max_temp: float
    min_humidity: float
    max_humidity: float
    max_storage_days: int
    chilling_sensitive: bool
    ethylene_producer: bool
    notes: Optional[str]

    class Config:
        from_attributes = True

class CropResponse(BaseModel):
    id: int
    name: str
    category: str
    local_ner_name: Optional[str]
    image_url: Optional[str]
    profile: Optional[CropProfileResponse] = None

    class Config:
        from_attributes = True

# ----------------- Crop Compatibility Schemas -----------------
class CompatibilityCheckRequest(BaseModel):
    storage_unit_id: int
    candidate_crop_id: int
    quantity_kg: float

class CompatibilityCheckResponse(BaseModel):
    compatible: bool
    candidate_crop: str
    currently_stored_crops: List[str]
    common_min_temp: Optional[float] = None
    common_max_temp: Optional[float] = None
    recommended_target_temp: Optional[float] = None
    common_min_humidity: Optional[float] = None
    common_max_humidity: Optional[float] = None
    capacity_available: bool
    available_capacity_kg: float
    message: str
    conflict_reason: Optional[str] = None

# ----------------- Produce & Storage Record Schemas -----------------
class ProduceCreate(BaseModel):
    storage_unit_id: int
    crop_id: int
    quantity_kg: float = Field(..., gt=0)
    initial_condition: str = "Fresh" # Fresh, Good, Slightly damaged, Damaged
    harvest_date: date
    expected_storage_days: Optional[int] = None
    farmer_notes: Optional[str] = None

class StorageRecordResponse(BaseModel):
    id: int
    user_id: int
    farmer_name: Optional[str] = None
    storage_unit_id: int
    unit_code: Optional[str] = None
    crop_id: int
    crop_name: Optional[str] = None
    local_ner_name: Optional[str] = None
    quantity_kg: float
    initial_condition: str
    current_condition: str
    harvest_date: date
    storage_start: datetime
    storage_age_hours: float = 0.0
    storage_age_human: str = ""
    remaining_safe_hours: float = 0.0
    remaining_safe_human: str = ""
    is_nearing_limit: bool = False
    expected_storage_days: int
    removal_date: Optional[datetime]
    status: str
    farmer_notes: Optional[str]

    class Config:
        from_attributes = True

# ----------------- Sensor Telemetry & Device Schemas -----------------
class TelemetryPayload(BaseModel):
    temperature: float
    humidity: float
    outside_temperature: Optional[float] = 28.0
    outside_humidity: Optional[float] = 70.0
    door_open: bool = False
    battery_voltage: Optional[float] = 13.2
    battery_current: Optional[float] = 2.4
    battery_percentage: Optional[float] = 85.0
    cooling: Optional[bool] = False
    power_source: Optional[str] = "solar_battery"

class SensorReadingResponse(BaseModel):
    id: int
    storage_unit_id: int
    device_id: str
    inside_temp: float
    inside_humidity: float
    outside_temp: Optional[float]
    outside_humidity: Optional[float]
    door_open: bool
    battery_voltage: Optional[float]
    battery_percentage: Optional[float]
    cooling_active: bool
    power_source: str
    recorded_at: datetime

    class Config:
        from_attributes = True

class DeviceStatusResponse(BaseModel):
    device_id: str
    storage_unit_code: str
    is_online: bool
    last_heartbeat: datetime
    firmware_version: str
    latest_reading: Optional[SensorReadingResponse] = None

# ----------------- Alert Schemas -----------------
class AlertResponse(BaseModel):
    id: int
    storage_unit_id: int
    unit_code: Optional[str] = None
    severity: str # INFO, WARNING, CRITICAL
    alert_type: str
    title: str
    message: str
    is_active: bool
    created_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True

# ----------------- Market & Transport Schemas -----------------
class MarketDataResponse(BaseModel):
    id: int
    crop_id: int
    crop_name: Optional[str] = None
    market_name: str
    district: str
    state: str
    min_price: float
    max_price: float
    modal_price: float
    arrival_tonnes: float
    price_trend: str
    distance_km: Optional[float]
    reported_date: date

    class Config:
        from_attributes = True

class TransportDataResponse(BaseModel):
    id: int
    origin_village: str
    destination_market: str
    distance_km: float
    estimated_hours: float
    transport_mode: str
    cost_per_quintal: float
    provider_name: str
    provider_phone: str
    is_available: bool
    departure_time: str

    class Config:
        from_attributes = True

# ----------------- Recommendation Schemas -----------------
class RecommendationResponse(BaseModel):
    id: int
    storage_record_id: int
    crop_name: str
    quantity_kg: float
    decision: str # STORE, SELL, TRANSPORT
    confidence_score: int
    primary_reason: str
    factors: Dict[str, Any]
    created_at: datetime

# ----------------- Simulation Control Schemas -----------------
class SimulationControlRequest(BaseModel):
    temperature_offset: Optional[float] = 0.0 # Force temp up or down
    force_temperature: Optional[float] = None
    force_door_open: Optional[bool] = None
    force_battery_pct: Optional[float] = None
    force_offline: Optional[bool] = None

class SimulationStatusResponse(BaseModel):
    simulation_mode: bool
    simulated_temp: float
    simulated_humidity: float
    simulated_door_open: bool
    simulated_battery_pct: float
    simulated_cooling: bool
    is_simulated_offline: bool
    active_unit_code: str
