-- ==============================================================================
-- SMART SOLAR MINI COLD STORAGE - POSTGRESQL SCHEMA (DDL)
-- Decentralized Community Cold Storage System for North Eastern Region (NER)
-- ==============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Farmers, Storage Operators, Admins)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'farmer', -- 'farmer', 'operator', 'admin'
    village VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    preferred_language VARCHAR(20) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Storage Units Table (Decentralized physical cold-storage units)
CREATE TABLE IF NOT EXISTS storage_units (
    id SERIAL PRIMARY KEY,
    unit_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'NER-CS-001'
    qr_code VARCHAR(100) UNIQUE NOT NULL,  -- QR identifier matching unit_code
    village VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    total_capacity DECIMAL(8, 2) NOT NULL DEFAULT 50.00, -- in kg
    target_temperature DECIMAL(4, 2) DEFAULT 11.50,      -- in °C
    min_safe_temp DECIMAL(4, 2) DEFAULT 10.00,           -- in °C
    max_safe_temp DECIMAL(4, 2) DEFAULT 13.00,           -- in °C
    status VARCHAR(50) DEFAULT 'active',                 -- 'active', 'maintenance', 'offline'
    installation_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ESP32 Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'ESP32-NER-001'
    storage_unit_id INT REFERENCES storage_units(id) ON DELETE CASCADE,
    firmware_version VARCHAR(50) DEFAULT 'v1.0.4',
    mac_address VARCHAR(50),
    is_online BOOLEAN DEFAULT TRUE,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Crops Table (Master catalogue of crops)
CREATE TABLE IF NOT EXISTS crops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'vegetable', 'fruit', 'spice'
    local_ner_name VARCHAR(150),
    image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Crop Storage Profiles (Safe operating bands & guidelines)
CREATE TABLE IF NOT EXISTS crop_profiles (
    id SERIAL PRIMARY KEY,
    crop_id INT UNIQUE REFERENCES crops(id) ON DELETE CASCADE,
    min_temp DECIMAL(4, 2) NOT NULL,            -- e.g. 10.00 °C
    max_temp DECIMAL(4, 2) NOT NULL,            -- e.g. 13.00 °C
    min_humidity DECIMAL(4, 2) NOT NULL,        -- e.g. 85.00 %
    max_humidity DECIMAL(4, 2) NOT NULL,        -- e.g. 95.00 %
    max_storage_days INT NOT NULL,              -- e.g. 14 days
    chilling_sensitive BOOLEAN DEFAULT FALSE,
    ethylene_producer BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Storage Records (Multi-farmer produce batches inside units)
CREATE TABLE IF NOT EXISTS storage_records (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE RESTRICT,
    storage_unit_id INT REFERENCES storage_units(id) ON DELETE RESTRICT,
    crop_id INT REFERENCES crops(id) ON DELETE RESTRICT,
    quantity_kg DECIMAL(8, 2) NOT NULL,
    initial_condition VARCHAR(50) NOT NULL, -- 'Fresh', 'Good', 'Slightly damaged', 'Damaged'
    current_condition VARCHAR(50) DEFAULT 'Good',
    harvest_date DATE NOT NULL,
    storage_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expected_storage_days INT NOT NULL,
    removal_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'stored', -- 'stored', 'dispatched', 'retrieved'
    farmer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Sensor Readings / Telemetry Table
CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    storage_unit_id INT REFERENCES storage_units(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    inside_temp DECIMAL(4, 2) NOT NULL,
    inside_humidity DECIMAL(4, 2) NOT NULL,
    outside_temp DECIMAL(4, 2),
    outside_humidity DECIMAL(4, 2),
    door_open BOOLEAN DEFAULT FALSE,
    battery_voltage DECIMAL(5, 2) DEFAULT 13.2,
    battery_current DECIMAL(5, 2) DEFAULT 2.1,
    battery_percentage DECIMAL(5, 2) DEFAULT 85.0,
    cooling_active BOOLEAN DEFAULT FALSE,
    power_source VARCHAR(50) DEFAULT 'solar_battery', -- 'solar', 'battery', 'grid'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    storage_unit_id INT REFERENCES storage_units(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL, -- 'INFO', 'WARNING', 'CRITICAL'
    alert_type VARCHAR(50) NOT NULL, -- 'HIGH_TEMP', 'LOW_TEMP', 'DOOR_OPEN', 'LOW_BATTERY', 'DEVICE_OFFLINE'
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 9. Market Data Table (NER Local Mandis & APMCs)
CREATE TABLE IF NOT EXISTS market_data (
    id SERIAL PRIMARY KEY,
    crop_id INT REFERENCES crops(id) ON DELETE CASCADE,
    market_name VARCHAR(150) NOT NULL, -- e.g. 'Guwahati APMC', 'Shillong Bara Bazar'
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    min_price DECIMAL(8, 2) NOT NULL,   -- Price in INR per Quintal (100 kg)
    max_price DECIMAL(8, 2) NOT NULL,
    modal_price DECIMAL(8, 2) NOT NULL,
    arrival_tonnes DECIMAL(8, 2) DEFAULT 10.0,
    price_trend VARCHAR(20) DEFAULT 'stable', -- 'rising', 'stable', 'falling'
    distance_km DECIMAL(6, 2),
    reported_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Transport Logistics Table
CREATE TABLE IF NOT EXISTS transport_data (
    id SERIAL PRIMARY KEY,
    origin_village VARCHAR(100) NOT NULL,
    destination_market VARCHAR(150) NOT NULL,
    distance_km DECIMAL(6, 2) NOT NULL,
    estimated_hours DECIMAL(4, 2) NOT NULL,
    transport_mode VARCHAR(50) DEFAULT 'Mini Truck (Tata Ace)',
    cost_per_quintal DECIMAL(8, 2) NOT NULL,
    provider_name VARCHAR(150) NOT NULL,
    provider_phone VARCHAR(20) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    departure_time VARCHAR(50) DEFAULT 'Daily 05:00 AM & 02:00 PM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Recommendations Table (Stored Decision Engine Outputs)
CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    storage_record_id INT REFERENCES storage_records(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL, -- 'STORE', 'SELL', 'TRANSPORT'
    confidence_score INT NOT NULL, -- 0 to 100
    primary_reason TEXT NOT NULL,
    factors_json TEXT NOT NULL,    -- Detailed breakdown for transparency
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Sync Queue Table (Offline-First Synchronization)
CREATE TABLE IF NOT EXISTS sync_queue (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    payload_json TEXT NOT NULL,
    synced BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    actor_id INT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_storage_unit_code ON storage_units(unit_code);
CREATE INDEX IF NOT EXISTS idx_storage_records_unit ON storage_records(storage_unit_id);
CREATE INDEX IF NOT EXISTS idx_storage_records_user ON storage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_unit_time ON sensor_readings(storage_unit_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unit_active ON alerts(storage_unit_id, is_active);
