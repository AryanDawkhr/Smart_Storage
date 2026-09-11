-- ==============================================================================
-- SMART SOLAR MINI COLD STORAGE - POSTGRESQL SEED DATA
-- Realistic North Eastern Region (NER) dataset for judge demonstration
-- Default demo login password for all seeded farmers: 'farmer123'
-- ==============================================================================

-- 1. Seed Users (Bcrypt hash for 'farmer123' is '$2b$12$eX8m6eJ65wXlQ1R.kZ5LXeH6E2yRrnGkWf6aC3t4kQ4M2Uf.8n.1W')
INSERT INTO users (id, name, mobile, hashed_password, role, village, district, state, preferred_language)
VALUES 
(1, 'Ramesh Bora', '9876543210', '$2b$12$eX8m6eJ65wXlQ1R.kZ5LXeH6E2yRrnGkWf6aC3t4kQ4M2Uf.8n.1W', 'farmer', 'Mayong Village', 'Morigaon', 'Assam', 'en'),
(2, 'Pranab Das', '9876543211', '$2b$12$eX8m6eJ65wXlQ1R.kZ5LXeH6E2yRrnGkWf6aC3t4kQ4M2Uf.8n.1W', 'farmer', 'Mayong Village', 'Morigaon', 'Assam', 'en'),
(3, 'Mary Lyngdoh', '9876543212', '$2b$12$eX8m6eJ65wXlQ1R.kZ5LXeH6E2yRrnGkWf6aC3t4kQ4M2Uf.8n.1W', 'farmer', 'Mawkynrew Village', 'East Khasi Hills', 'Meghalaya', 'en')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Storage Units
INSERT INTO storage_units (id, unit_code, qr_code, village, district, state, latitude, longitude, total_capacity, target_temperature, min_safe_temp, max_safe_temp, status)
VALUES
(1, 'NER-CS-001', 'NER-CS-001', 'Mayong Village', 'Morigaon', 'Assam', 26.2485, 92.0381, 50.00, 11.50, 10.00, 13.00, 'active'),
(2, 'NER-CS-002', 'NER-CS-002', 'Teok Village', 'Jorhat', 'Assam', 26.7509, 94.2037, 50.00, 11.50, 10.00, 13.00, 'active'),
(3, 'NER-CS-003', 'NER-CS-003', 'Mawkynrew Village', 'East Khasi Hills', 'Meghalaya', 25.5788, 91.8933, 75.00, 8.00, 6.00, 10.00, 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed ESP32 Devices
INSERT INTO devices (id, device_id, storage_unit_id, firmware_version, mac_address, is_online, last_heartbeat)
VALUES
(1, 'ESP32-NER-001', 1, 'v1.2.0', '24:6F:28:A1:B2:C1', TRUE, CURRENT_TIMESTAMP),
(2, 'ESP32-NER-002', 2, 'v1.2.0', '24:6F:28:A1:B2:C2', TRUE, CURRENT_TIMESTAMP),
(3, 'ESP32-NER-003', 3, 'v1.2.0', '24:6F:28:A1:B2:C3', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Crops Master
INSERT INTO crops (id, name, category, local_ner_name)
VALUES
(1, 'Tomato', 'vegetable', 'Bilahi (বিলাহী)'),
(2, 'Cucumber', 'vegetable', 'Tiyoh (তিয়ঁহ)'),
(3, 'King Chilli', 'spice', 'Bhut Jolokia (ভূত জলকীয়া)'),
(4, 'Ginger', 'spice', 'Ada (আদা)'),
(5, 'Khasi Mandarin', 'fruit', 'Soh Niamtra (কমলা)'),
(6, 'Potato', 'vegetable', 'Alu (আলু)'),
(7, 'Cabbage', 'vegetable', 'Bandhakobi (বন্ধাকবি)')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Crop Profiles (Thermal and relative humidity boundaries)
INSERT INTO crop_profiles (id, crop_id, min_temp, max_temp, min_humidity, max_humidity, max_storage_days, chilling_sensitive, ethylene_producer, notes)
VALUES
(1, 1, 10.00, 13.00, 85.00, 95.00, 14, TRUE, TRUE, 'Chilling sensitive below 10°C. Best held at 11-12°C for mature green/turning.'),
(2, 2, 10.00, 13.00, 90.00, 95.00, 12, TRUE, FALSE, 'High humidity prevents shriveling. Highly compatible with tomato.'),
(3, 3, 8.00, 10.00, 85.00, 90.00, 21, FALSE, FALSE, 'GI tagged NER specialty. High capsaicin preservation at steady 8-10°C.'),
(4, 4, 12.00, 14.00, 75.00, 85.00, 60, TRUE, FALSE, 'Prevent sprouting and rhizome dehydration. Moderate humidity.'),
(5, 5, 5.00, 7.00, 85.00, 90.00, 30, TRUE, FALSE, 'Premium citrus of Meghalaya/Assam. Cold storage delays senescence.'),
(6, 6, 8.00, 10.00, 85.00, 90.00, 90, FALSE, FALSE, 'Keep away from light to prevent solanine greening.'),
(7, 7, 0.00, 2.00, 95.00, 98.00, 45, FALSE, FALSE, 'Cold hardy crop. Incompatible with warm-storage vegetables like tomato.')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Current Shared Storage Records (NER-CS-001: 25 kg Tomato + 10 kg Cucumber = 35 kg / 50 kg)
INSERT INTO storage_records (id, user_id, storage_unit_id, crop_id, quantity_kg, initial_condition, current_condition, harvest_date, storage_start, expected_storage_days, status, farmer_notes)
VALUES
(1, 1, 1, 1, 25.00, 'Fresh', 'Good', CURRENT_DATE - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days 6 hours', 5, 'stored', 'Harvested from riverbank field; firm red ripe.'),
(2, 2, 1, 2, 10.00, 'Fresh', 'Good', CURRENT_DATE - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day 3 hours', 4, 'stored', 'Crisp green slicing cucumbers; morning harvest.')
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Recent Sensor Telemetry for NER-CS-001
INSERT INTO sensor_readings (storage_unit_id, device_id, inside_temp, inside_humidity, outside_temp, outside_humidity, door_open, battery_voltage, battery_current, battery_percentage, cooling_active, power_source, recorded_at)
VALUES
(1, 'ESP32-NER-001', 11.60, 78.00, 28.00, 71.00, FALSE, 13.20, 2.40, 82.00, TRUE, 'solar_battery', CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
(1, 'ESP32-NER-001', 11.50, 78.50, 28.20, 70.80, FALSE, 13.25, 2.35, 82.00, TRUE, 'solar_battery', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
(1, 'ESP32-NER-001', 11.60, 78.20, 28.10, 71.00, FALSE, 13.18, 2.42, 82.00, TRUE, 'solar_battery', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Alerts
INSERT INTO alerts (id, storage_unit_id, severity, alert_type, title, message, is_active, created_at)
VALUES
(1, 1, 'INFO', 'SYSTEM_ONLINE', 'Storage Operating Normal', 'Unit NER-CS-001 solar cooling operating within target temperature band (11.6°C).', TRUE, CURRENT_TIMESTAMP - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- 9. Seed NER Market Mandi Data
INSERT INTO market_data (id, crop_id, market_name, district, state, min_price, max_price, modal_price, arrival_tonnes, price_trend, distance_km, reported_date)
VALUES
(1, 1, 'Guwahati APMC (Pamohi)', 'Kamrup Metro', 'Assam', 2200.00, 2800.00, 2550.00, 45.0, 'rising', 48.0, CURRENT_DATE),
(2, 1, 'Morigaon Daily Haat', 'Morigaon', 'Assam', 1800.00, 2200.00, 2000.00, 12.0, 'stable', 12.0, CURRENT_DATE),
(3, 2, 'Guwahati APMC (Pamohi)', 'Kamrup Metro', 'Assam', 1400.00, 1900.00, 1700.00, 28.0, 'rising', 48.0, CURRENT_DATE),
(4, 3, 'Shillong Bara Bazar', 'East Khasi Hills', 'Meghalaya', 35000.00, 42000.00, 39000.00, 3.5, 'rising', 95.0, CURRENT_DATE),
(5, 4, 'Jorhat Central Mandi', 'Jorhat', 'Assam', 4500.00, 5200.00, 4900.00, 18.0, 'stable', 210.0, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Transport Logistics
INSERT INTO transport_data (id, origin_village, destination_market, distance_km, estimated_hours, transport_mode, cost_per_quintal, provider_name, provider_phone, is_available, departure_time)
VALUES
(1, 'Mayong Village', 'Guwahati APMC (Pamohi)', 48.0, 1.5, 'Mini Truck (Tata Ace)', 120.00, 'NER Agri-Logistics (Biren Deka)', '+91-9435012345', TRUE, 'Today 02:00 PM & Tomorrow 05:00 AM'),
(2, 'Mayong Village', 'Morigaon Daily Haat', 12.0, 0.5, 'E-Rickshaw / Mini Van', 40.00, 'Local Farmer Pool (Kalyan)', '+91-9435098765', TRUE, 'Every 2 Hours'),
(3, 'Mayong Village', 'Shillong Bara Bazar', 115.0, 3.5, 'Bolero Maxi Truck (Cold-lined)', 260.00, 'Meghalaya Link Freight', '+91-9863011223', TRUE, 'Tomorrow 04:00 AM')
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Initial Explainable Recommendation
INSERT INTO recommendations (id, storage_record_id, decision, confidence_score, primary_reason, factors_json)
VALUES
(1, 1, 'STORE', 88, 'Storage conditions are safe (11.6°C) and Guwahati Mandi price is rising (+12% this week). Storing 2 more days is recommended.', '{"temperature_status":"safe","storage_age_hours":54,"max_storage_hours":336,"price_trend":"rising","transport_available":true}')
ON CONFLICT (id) DO NOTHING;

-- Reset serial sequences
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('storage_units_id_seq', (SELECT MAX(id) FROM storage_units));
SELECT setval('devices_id_seq', (SELECT MAX(id) FROM devices));
SELECT setval('crops_id_seq', (SELECT MAX(id) FROM crops));
SELECT setval('crop_profiles_id_seq', (SELECT MAX(id) FROM crop_profiles));
SELECT setval('storage_records_id_seq', (SELECT MAX(id) FROM storage_records));
SELECT setval('alerts_id_seq', (SELECT MAX(id) FROM alerts));
SELECT setval('market_data_id_seq', (SELECT MAX(id) FROM market_data));
SELECT setval('transport_data_id_seq', (SELECT MAX(id) FROM transport_data));
SELECT setval('recommendations_id_seq', (SELECT MAX(id) FROM recommendations));
