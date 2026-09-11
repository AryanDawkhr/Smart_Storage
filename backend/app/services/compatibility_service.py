from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import StorageUnit, StorageRecord, Crop, CropProfile

class CompatibilityService:
    @staticmethod
    def check_compatibility(
        db: Session, 
        storage_unit_id: int, 
        candidate_crop_id: int, 
        quantity_kg: float
    ) -> Dict[str, Any]:
        """
        Calculates thermal and humidity intersection between candidate crop 
        and all active crops currently in the physical storage chamber.
        """
        # 1. Fetch Storage Unit
        unit = db.query(StorageUnit).filter(StorageUnit.id == storage_unit_id).first()
        if not unit:
            return {
                "compatible": False,
                "candidate_crop": "",
                "currently_stored_crops": [],
                "capacity_available": False,
                "available_capacity_kg": 0.0,
                "message": "Storage unit not found.",
                "conflict_reason": "Invalid storage unit."
            }

        # 2. Check Capacity Availability
        active_records = db.query(StorageRecord).filter(
            StorageRecord.storage_unit_id == storage_unit_id,
            StorageRecord.status == "stored"
        ).all()

        current_occupied = sum(rec.quantity_kg for rec in active_records)
        available_capacity = max(0.0, unit.total_capacity - current_occupied)

        if quantity_kg > available_capacity:
            return {
                "compatible": False,
                "candidate_crop": "",
                "currently_stored_crops": [rec.crop.name for rec in active_records if rec.crop],
                "common_min_temp": None,
                "common_max_temp": None,
                "recommended_target_temp": None,
                "common_min_humidity": None,
                "common_max_humidity": None,
                "capacity_available": False,
                "available_capacity_kg": round(available_capacity, 1),
                "message": f"Storage limit reached. Only {available_capacity:.1f} kg space is available in {unit.unit_code}.",
                "conflict_reason": "Capacity exceeded"
            }

        # 3. Fetch Candidate Crop Profile
        candidate_crop = db.query(Crop).filter(Crop.id == candidate_crop_id).first()
        if not candidate_crop or not candidate_crop.profile:
            return {
                "compatible": False,
                "candidate_crop": candidate_crop.name if candidate_crop else "Unknown",
                "currently_stored_crops": [],
                "capacity_available": True,
                "available_capacity_kg": round(available_capacity, 1),
                "message": "Candidate crop storage profile is not configured.",
                "conflict_reason": "Missing crop profile"
            }

        cand_prof = candidate_crop.profile

        # If chamber is empty, candidate crop is 100% compatible
        if not active_records:
            target_temp = round((cand_prof.min_temp + cand_prof.max_temp) / 2.0, 1)
            return {
                "compatible": True,
                "candidate_crop": candidate_crop.name,
                "currently_stored_crops": [],
                "common_min_temp": cand_prof.min_temp,
                "common_max_temp": cand_prof.max_temp,
                "recommended_target_temp": target_temp,
                "common_min_humidity": cand_prof.min_humidity,
                "common_max_humidity": cand_prof.max_humidity,
                "capacity_available": True,
                "available_capacity_kg": round(available_capacity, 1),
                "message": f"Storage unit is empty. Safe temperature range set to {cand_prof.min_temp}–{cand_prof.max_temp}°C (target: {target_temp}°C).",
                "conflict_reason": None
            }

        # 4. Gather active crops and their profiles
        stored_profiles = []
        stored_names = []
        for rec in active_records:
            if rec.crop and rec.crop.profile:
                stored_profiles.append(rec.crop.profile)
                if rec.crop.name not in stored_names:
                    stored_names.append(rec.crop.name)

        # 5. Calculate Temperature Intersection
        all_min_temps = [p.min_temp for p in stored_profiles] + [cand_prof.min_temp]
        all_max_temps = [p.max_temp for p in stored_profiles] + [cand_prof.max_temp]

        common_min_temp = max(all_min_temps)
        common_max_temp = min(all_max_temps)

        # 6. Calculate Humidity Intersection
        all_min_hum = [p.min_humidity for p in stored_profiles] + [cand_prof.min_humidity]
        all_max_hum = [p.max_humidity for p in stored_profiles] + [cand_prof.max_humidity]

        common_min_hum = max(all_min_hum)
        common_max_hum = min(all_max_hum)

        # 7. Evaluate Compatibility
        is_temp_compatible = common_min_temp <= common_max_temp
        is_hum_compatible = common_min_hum <= (common_max_hum + 5.0) # 5% tolerance on humidity

        if not is_temp_compatible:
            # Find conflicting stored crops for clear farmer explanation
            conflicts = []
            for p in stored_profiles:
                if cand_prof.min_temp > p.max_temp or cand_prof.max_temp < p.min_temp:
                    conflicts.append(f"{p.crop.name} ({p.min_temp}–{p.max_temp}°C)")
            
            conflict_str = ", ".join(conflicts) if conflicts else "existing produce"
            return {
                "compatible": False,
                "candidate_crop": candidate_crop.name,
                "currently_stored_crops": stored_names,
                "common_min_temp": None,
                "common_max_temp": None,
                "recommended_target_temp": None,
                "common_min_humidity": None,
                "common_max_humidity": None,
                "capacity_available": True,
                "available_capacity_kg": round(available_capacity, 1),
                "message": f"{candidate_crop.name} ({cand_prof.min_temp}–{cand_prof.max_temp}°C) cannot share the chamber with {conflict_str}.",
                "conflict_reason": "No overlapping safe temperature range."
            }

        # Safe common range exists!
        recommended_target = round((common_min_temp + common_max_temp) / 2.0, 1)

        return {
            "compatible": True,
            "candidate_crop": candidate_crop.name,
            "currently_stored_crops": stored_names,
            "common_min_temp": round(common_min_temp, 1),
            "common_max_temp": round(common_max_temp, 1),
            "recommended_target_temp": recommended_target,
            "common_min_humidity": round(common_min_hum, 1),
            "common_max_humidity": round(common_max_hum, 1),
            "capacity_available": True,
            "available_capacity_kg": round(available_capacity, 1),
            "message": f"Compatible! Common safe temperature is {common_min_temp}–{common_max_temp}°C. Recommended cooling target is {recommended_target}°C.",
            "conflict_reason": None
        }
