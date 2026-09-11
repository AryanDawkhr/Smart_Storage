import datetime
from sqlalchemy.orm import Session
from app.database.session import Base, engine, SessionLocal
from app.models.models import (
    User, StorageUnit, Device, Crop, CropProfile, 
    StorageRecord, SensorReading, Alert, MarketData, TransportData, Recommendation
)
from app.core.security import hash_password

def init_db():
    """Initializes database schema and populates initial seed records if empty."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if users exist
        user_count = db.query(User).count()
        if user_count == 0:
            print("[Init DB] Populating initial demo seed data...")
            default_pwd = hash_password("farmer123")

            # 1. Farmers
            farmer_a = User(
                id=1, name="Ramesh Bora", mobile="9876543210", 
                hashed_password=default_pwd, role="farmer",
                village="Mayong Village", district="Morigaon", state="Assam",
                preferred_language="en"
            )
            farmer_b = User(
                id=2, name="Pranab Das", mobile="9876543211", 
                hashed_password=default_pwd, role="farmer",
                village="Mayong Village", district="Morigaon", state="Assam",
                preferred_language="en"
            )
            farmer_c = User(
                id=3, name="Mary Lyngdoh", mobile="9876543212", 
                hashed_password=default_pwd, role="farmer",
                village="Mawkynrew Village", district="East Khasi Hills", state="Meghalaya",
                preferred_language="en"
            )
            db.add_all([farmer_a, farmer_b, farmer_c])
            db.commit()

            # 2. Storage Units
            unit_1 = StorageUnit(
                id=1, unit_code="NER-CS-001", qr_code="NER-CS-001",
                village="Mayong Village", district="Morigaon", state="Assam",
                latitude=26.2485, longitude=92.0381, total_capacity=50.0,
                target_temperature=11.5, min_safe_temp=10.0, max_safe_temp=13.0,
                status="active"
            )
            unit_2 = StorageUnit(
                id=2, unit_code="NER-CS-002", qr_code="NER-CS-002",
                village="Teok Village", district="Jorhat", state="Assam",
                latitude=26.7509, longitude=94.2037, total_capacity=50.0,
                target_temperature=11.5, min_safe_temp=10.0, max_safe_temp=13.0,
                status="active"
            )
            unit_3 = StorageUnit(
                id=3, unit_code="NER-CS-003", qr_code="NER-CS-003",
                village="Mawkynrew Village", district="East Khasi Hills", state="Meghalaya",
                latitude=25.5788, longitude=91.8933, total_capacity=75.0,
                target_temperature=8.0, min_safe_temp=6.0, max_safe_temp=10.0,
                status="active"
            )
            db.add_all([unit_1, unit_2, unit_3])
            db.commit()

            # 3. Devices
            dev_1 = Device(id=1, device_id="ESP32-NER-001", storage_unit_id=1, is_online=True)
            dev_2 = Device(id=2, device_id="ESP32-NER-002", storage_unit_id=2, is_online=True)
            dev_3 = Device(id=3, device_id="ESP32-NER-003", storage_unit_id=3, is_online=True)
            db.add_all([dev_1, dev_2, dev_3])
            db.commit()

            # 4. Crops
            crops_data = [
                (1, "Tomato", "vegetable", "Bilahi (বিলাহী)"),
                (2, "Cucumber", "vegetable", "Tiyoh (তিয়ঁহ)"),
                (3, "King Chilli", "spice", "Bhut Jolokia (ভূত জলকীয়া)"),
                (4, "Ginger", "spice", "Ada (আদা)"),
                (5, "Khasi Mandarin", "fruit", "Soh Niamtra (কমলা)"),
                (6, "Potato", "vegetable", "Alu (আলু)"),
                (7, "Cabbage", "vegetable", "Bandhakobi (বন্ধাকবি)")
            ]
            for cid, cname, ccat, clocal in crops_data:
                db.add(Crop(id=cid, name=cname, category=ccat, local_ner_name=clocal))
            db.commit()

            # 5. Crop Profiles
            profiles_data = [
                (1, 10.0, 13.0, 85.0, 95.0, 14, True, True, "Chilling sensitive below 10°C. Best at 11-12°C."),
                (2, 10.0, 13.0, 90.0, 95.0, 12, True, False, "High humidity prevents shriveling. Highly compatible with tomato."),
                (3, 8.0, 10.0, 85.0, 90.0, 21, False, False, "NER specialty. High capsaicin preservation at 8-10°C."),
                (4, 12.0, 14.0, 75.0, 85.0, 60, True, False, "Prevent sprouting and rhizome dehydration."),
                (5, 5.0, 7.0, 85.0, 90.0, 30, True, False, "Meghalaya/Assam mandarin. Cold storage delays drying."),
                (6, 8.0, 10.0, 85.0, 90.0, 90, False, False, "Keep in dark to prevent solanine greening."),
                (7, 0.0, 2.0, 95.0, 98.0, 45, False, False, "Cold hardy. Incompatible with warm-storage crops like tomato.")
            ]
            for pid, pmin, pmax, phmin, phmax, pdays, pcs, pep, pnotes in profiles_data:
                db.add(CropProfile(
                    id=pid, crop_id=pid, min_temp=pmin, max_temp=pmax,
                    min_humidity=phmin, max_humidity=phmax, max_storage_days=pdays,
                    chilling_sensitive=pcs, ethylene_producer=pep, notes=pnotes
                ))
            db.commit()

            # 6. Storage Records (Multi-farmer sharing NER-CS-001: 25 kg + 10 kg = 35 kg / 50 kg)
            rec_1 = StorageRecord(
                id=1, user_id=1, storage_unit_id=1, crop_id=1, quantity_kg=25.0,
                initial_condition="Fresh", current_condition="Good",
                harvest_date=datetime.date.today() - datetime.timedelta(days=2),
                storage_start=datetime.datetime.utcnow() - datetime.timedelta(days=2, hours=4),
                expected_storage_days=5, status="stored",
                farmer_notes="Harvested from Brahmaputra alluvial bank; firm red ripe."
            )
            rec_2 = StorageRecord(
                id=2, user_id=2, storage_unit_id=1, crop_id=2, quantity_kg=10.0,
                initial_condition="Fresh", current_condition="Good",
                harvest_date=datetime.date.today() - datetime.timedelta(days=1),
                storage_start=datetime.datetime.utcnow() - datetime.timedelta(days=1, hours=2),
                expected_storage_days=4, status="stored",
                farmer_notes="Crisp slicing cucumbers."
            )
            db.add_all([rec_1, rec_2])
            db.commit()

            # 7. Recent Sensor Readings for charts
            for i in range(12, 0, -1):
                hist_time = datetime.datetime.utcnow() - datetime.timedelta(minutes=i*15)
                db.add(SensorReading(
                    storage_unit_id=1, device_id="ESP32-NER-001",
                    inside_temp=round(11.4 + (i % 3) * 0.15, 2),
                    inside_humidity=round(78.0 + (i % 4) * 0.5, 1),
                    outside_temp=round(28.0 + (i % 2) * 0.3, 1),
                    outside_humidity=71.0, door_open=False,
                    battery_voltage=13.22, battery_percentage=82.0,
                    cooling_active=True, power_source="solar_battery",
                    recorded_at=hist_time
                ))
            db.commit()

            # 8. Alert
            db.add(Alert(
                id=1, storage_unit_id=1, severity="INFO", alert_type="SYSTEM_ONLINE",
                title="Storage Operating Safe",
                message="Unit NER-CS-001 solar cooling operating within target temperature band (11.6°C).",
                is_active=True, created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
            ))
            db.commit()

            # 9. Market Mandi Data
            mkt_1 = MarketData(
                id=1, crop_id=1, market_name="Guwahati APMC (Pamohi)",
                district="Kamrup Metro", state="Assam", min_price=2200.0, max_price=2800.0,
                modal_price=2550.0, arrival_tonnes=45.0, price_trend="rising", distance_km=48.0
            )
            mkt_2 = MarketData(
                id=2, crop_id=1, market_name="Morigaon Daily Haat",
                district="Morigaon", state="Assam", min_price=1800.0, max_price=2200.0,
                modal_price=2000.0, arrival_tonnes=12.0, price_trend="stable", distance_km=12.0
            )
            mkt_3 = MarketData(
                id=3, crop_id=2, market_name="Guwahati APMC (Pamohi)",
                district="Kamrup Metro", state="Assam", min_price=1400.0, max_price=1900.0,
                modal_price=1700.0, arrival_tonnes=28.0, price_trend="rising", distance_km=48.0
            )
            mkt_4 = MarketData(
                id=4, crop_id=3, market_name="Shillong Bara Bazar",
                district="East Khasi Hills", state="Meghalaya", min_price=35000.0, max_price=42000.0,
                modal_price=39000.0, arrival_tonnes=3.5, price_trend="rising", distance_km=95.0
            )
            mkt_5 = MarketData(
                id=5, crop_id=4, market_name="Jorhat Central Mandi",
                district="Jorhat", state="Assam", min_price=4500.0, max_price=5200.0,
                modal_price=4900.0, arrival_tonnes=18.0, price_trend="stable", distance_km=210.0
            )
            db.add_all([mkt_1, mkt_2, mkt_3, mkt_4, mkt_5])
            db.commit()

            # 10. Transport Data
            tr_1 = TransportData(
                id=1, origin_village="Mayong Village", destination_market="Guwahati APMC (Pamohi)",
                distance_km=48.0, estimated_hours=1.5, transport_mode="Mini Truck (Tata Ace)",
                cost_per_quintal=120.0, provider_name="NER Agri-Logistics (Biren Deka)",
                provider_phone="+91-9435012345", is_available=True, departure_time="Today 02:00 PM & Tomorrow 05:00 AM"
            )
            tr_2 = TransportData(
                id=2, origin_village="Mayong Village", destination_market="Morigaon Daily Haat",
                distance_km=12.0, estimated_hours=0.5, transport_mode="E-Rickshaw / Mini Van",
                cost_per_quintal=40.0, provider_name="Local Farmer Pool (Kalyan)",
                provider_phone="+91-9435098765", is_available=True, departure_time="Every 2 Hours"
            )
            tr_3 = TransportData(
                id=3, origin_village="Mayong Village", destination_market="Shillong Bara Bazar",
                distance_km=115.0, estimated_hours=3.5, transport_mode="Bolero Maxi Truck (Cold-lined)",
                cost_per_quintal=260.0, provider_name="Meghalaya Link Freight",
                provider_phone="+91-9863011223", is_available=True, departure_time="Tomorrow 04:00 AM"
            )
            db.add_all([tr_1, tr_2, tr_3])
            db.commit()

            # 11. Initial Recommendation
            rec_1 = Recommendation(
                id=1, storage_record_id=1, decision="STORE", confidence_score=88,
                primary_reason="Storage conditions are safe (11.6°C) and Guwahati Mandi price is rising (+12% this week). Storing 2 more days is recommended.",
                factors_json='{"temperature_status":"safe","storage_age_hours":52,"max_storage_hours":336,"price_trend":"rising","transport_available":true}'
            )
            db.add(rec_1)
            db.commit()
            print("[Init DB] Demo seed data successfully populated!")
    except Exception as e:
        db.rollback()
        print(f"[Init DB Error]: {e}")
    finally:
        db.close()
