# REST API & Real-Time WebSocket Specifications

Base URL: `http://localhost:8000/api`  
WebSocket Stream: `ws://localhost:8000/ws/telemetry`

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Registers a new farmer account.
```json
{
  "name": "Ramesh Bora",
  "mobile": "9876543210",
  "password": "farmerpassword",
  "village": "Mayong Village",
  "district": "Morigaon",
  "state": "Assam",
  "preferred_language": "en"
}
```
**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Ramesh Bora",
    "mobile": "9876543210",
    "role": "farmer",
    "village": "Mayong Village",
    "district": "Morigaon",
    "state": "Assam"
  }
}
```

### `POST /api/auth/login`
Authenticates a registered farmer.
```json
{
  "mobile": "9876543210",
  "password": "farmerpassword"
}
```

---

## 2. Storage & Capacity Endpoints

### `GET /api/storage`
Returns a list of all decentralized storage units with occupancy, live temperature, and online status.

### `GET /api/storage/qr/{code}`
Looks up storage unit details via QR code or unit code (e.g. `NER-CS-001`).

### `GET /api/storage/{id}/capacity`
Returns capacity metrics:
```json
{
  "storage_unit_id": 1,
  "unit_code": "NER-CS-001",
  "total_capacity": 50.0,
  "occupied_capacity": 35.0,
  "available_capacity": 15.0,
  "occupancy_percentage": 70.0,
  "is_full": false
}
```

---

## 3. Produce Intake & Compatibility

### `POST /api/compatibility/check`
Calculates thermal and humidity intersection between candidate crop and crops currently stored in the chamber.
```json
{
  "storage_unit_id": 1,
  "candidate_crop_id": 2,
  "quantity_kg": 10.0
}
```
**Response (200 OK):**
```json
{
  "compatible": true,
  "candidate_crop": "Cucumber",
  "currently_stored_crops": ["Tomato"],
  "common_min_temp": 10.0,
  "common_max_temp": 13.0,
  "recommended_target_temp": 11.5,
  "common_min_humidity": 90.0,
  "common_max_humidity": 95.0,
  "capacity_available": true,
  "available_capacity_kg": 15.0,
  "message": "Compatible! Common safe temperature is 10.0–13.0°C. Recommended cooling target is 11.5°C."
}
```

### `POST /api/storage/{id}/produce`
Intakes produce into cold storage after capacity and compatibility verification.
```json
{
  "crop_id": 1,
  "quantity_kg": 25.0,
  "initial_condition": "Fresh",
  "harvest_date": "2026-09-10",
  "farmer_notes": "Harvested from riverbank field; firm red ripe."
}
```

### `POST /api/produce/{id}/checkout`
Releases produce from cold storage and restores available chamber capacity.

---

## 4. Hardware Telemetry & IoT Endpoints

### `POST /api/device/{device_id}/telemetry`
ESP32 sensor payload ingestion:
```json
{
  "temperature": 11.6,
  "humidity": 78.0,
  "outside_temperature": 28.2,
  "outside_humidity": 71.0,
  "door_open": false,
  "battery_voltage": 13.25,
  "battery_current": 2.4,
  "battery_percentage": 82.0,
  "cooling": true
}
```

### `GET /api/storage/{id}/telemetry`
Returns current sensor values and recent time-series readings for sparkline charting.

---

## 5. Decision Support & Recommendations

### `GET /api/recommendations/{storage_record_id}`
Returns explainable **STORE**, **SELL**, or **TRANSPORT** decision with factor scorecard:
```json
{
  "id": 1,
  "storage_record_id": 1,
  "crop_name": "Tomato",
  "quantity_kg": 25.0,
  "decision": "STORE",
  "confidence_score": 88,
  "primary_reason": "Storage conditions are safe (11.6°C) and Guwahati Mandi price is rising (+12% this week). Storing 2 more days is recommended.",
  "factors": {
    "is_temp_safe": true,
    "storage_age_days": 2.2,
    "max_safe_days": 14,
    "modal_price_per_qtl": 2550.0,
    "price_trend": "rising",
    "transport_available": true
  }
}
```

---

## 6. Real-Time WebSocket Telemetry
- **Endpoint:** `ws://localhost:8000/ws/telemetry`
- Automatically pushes telemetry updates to connected browser clients every time a sensor reading is processed or simulated.
```json
{
  "type": "telemetry_update",
  "storage_unit_id": 1,
  "unit_code": "NER-CS-001",
  "inside_temp": 11.6,
  "inside_humidity": 78.0,
  "outside_temp": 28.2,
  "door_open": false,
  "battery_percentage": 82.0,
  "cooling_active": true,
  "timestamp": "2026-09-11T04:15:00Z"
}
```
