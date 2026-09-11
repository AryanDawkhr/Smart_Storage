import asyncio
import random
import math
import datetime
from typing import Dict, Any, Optional
from app.database.session import SessionLocal
from app.models.models import StorageUnit, Device
from app.services.telemetry_service import TelemetryService
from app.websocket.connection_manager import ws_manager

class HardwareSimulationService:
    def __init__(self):
        self.is_running: bool = False
        self.tick_interval: int = 4 # seconds
        self.unit_code: str = "NER-CS-001"
        self.device_id: str = "ESP32-NER-001"

        # Current internal state variables
        self.inside_temp: float = 11.6
        self.inside_humidity: float = 78.0
        self.outside_temp: float = 28.2
        self.outside_humidity: float = 71.0
        self.door_open: bool = False
        self.battery_voltage: float = 13.25
        self.battery_percentage: float = 82.0
        self.cooling_active: bool = True
        self.power_source: str = "solar_battery"
        self.is_offline: bool = False

        # Demo override flags
        self.override_temp: Optional[float] = None
        self.override_door: Optional[bool] = None
        self.override_battery: Optional[float] = None
        self.tick_counter: int = 0

    async def start(self):
        """Starts background simulation loop."""
        if self.is_running:
            return
        self.is_running = True
        asyncio.create_task(self._simulation_loop())

    def stop(self):
        self.is_running = False

    def override_controls(
        self,
        force_temperature: Optional[float] = None,
        force_door_open: Optional[bool] = None,
        force_battery_pct: Optional[float] = None,
        force_offline: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Allows interactive judge demo overrides."""
        if force_temperature is not None:
            self.override_temp = force_temperature
            self.inside_temp = force_temperature
        if force_door_open is not None:
            self.override_door = force_door_open
            self.door_open = force_door_open
        if force_battery_pct is not None:
            self.override_battery = force_battery_pct
            self.battery_percentage = force_battery_pct
        if force_offline is not None:
            self.is_offline = force_offline

        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        return {
            "simulation_mode": True,
            "simulated_temp": round(self.inside_temp, 1),
            "simulated_humidity": round(self.inside_humidity, 1),
            "simulated_door_open": self.door_open,
            "simulated_battery_pct": round(self.battery_percentage, 1),
            "simulated_cooling": self.cooling_active,
            "is_simulated_offline": self.is_offline,
            "active_unit_code": self.unit_code
        }

    async def _simulation_loop(self):
        while self.is_running:
            try:
                await asyncio.sleep(self.tick_interval)
                self.tick_counter += 1

                if self.is_offline:
                    # Device simulated offline: notify UI but do not record telemetry
                    await ws_manager.broadcast({
                        "type": "device_status",
                        "unit_code": self.unit_code,
                        "device_id": self.device_id,
                        "is_online": False,
                        "message": "Storage unit connection interrupted. Local autonomous cooling active."
                    })
                    continue

                # 1. Update door state
                if self.override_door is not None:
                    self.door_open = self.override_door

                # 2. Update Inside Temperature dynamics
                target_temp = 11.5
                if self.override_temp is not None:
                    # User manually forced temp: gradually drift back if cooling engages
                    if self.cooling_active:
                        self.inside_temp -= 0.15
                    else:
                        self.inside_temp += 0.1
                    if abs(self.inside_temp - target_temp) < 0.2:
                        self.override_temp = None # Clear override once target reached
                else:
                    if self.door_open:
                        # Door open warms the chamber rapidly
                        self.inside_temp = min(19.0, self.inside_temp + 0.3)
                        self.cooling_active = True
                    else:
                        if self.cooling_active:
                            # Cooling Peltier active: cool down towards 11.0°C
                            self.inside_temp = max(10.8, self.inside_temp - random.uniform(0.05, 0.12))
                            if self.inside_temp <= 11.0:
                                self.cooling_active = False # Turn off Peltier (hysteresis low)
                        else:
                            # Passive thermal leakage: warm up gently towards 12.3°C
                            self.inside_temp = min(13.5, self.inside_temp + random.uniform(0.04, 0.09))
                            if self.inside_temp >= 12.2:
                                self.cooling_active = True # Turn on Peltier (hysteresis high)

                # Add tiny natural sensor noise (+-0.03°C)
                self.inside_temp += random.uniform(-0.03, 0.03)

                # 3. Update Humidity dynamics
                if self.door_open:
                    self.inside_humidity = max(60.0, self.inside_humidity - 0.4)
                else:
                    self.inside_humidity = min(88.0, max(75.0, self.inside_humidity + random.uniform(-0.2, 0.2)))

                # 4. Update Battery & Solar
                if self.override_battery is not None:
                    self.battery_percentage = self.override_battery
                else:
                    # Gentle solar charging during simulated daytime
                    if self.cooling_active:
                        self.battery_percentage = max(20.0, min(100.0, self.battery_percentage - 0.05))
                    else:
                        self.battery_percentage = min(98.0, self.battery_percentage + 0.08)

                self.battery_voltage = 12.8 + (self.battery_percentage / 100.0) * 1.4

                # 5. Outside ambient diurnal variation
                time_now = datetime.datetime.utcnow()
                hour_of_day = time_now.hour + (time_now.minute / 60.0)
                ambient_variation = math.sin((hour_of_day - 9.0) * math.pi / 12.0) * 4.0
                self.outside_temp = 28.0 + ambient_variation + random.uniform(-0.1, 0.1)

                # 6. Save reading and evaluate alerts every tick or every 2 ticks
                db = SessionLocal()
                try:
                    unit = db.query(StorageUnit).filter(StorageUnit.unit_code == self.unit_code).first()
                    unit_id = unit.id if unit else 1

                    await TelemetryService.process_telemetry(
                        db=db,
                        storage_unit_id=unit_id,
                        device_id=self.device_id,
                        inside_temp=self.inside_temp,
                        inside_humidity=self.inside_humidity,
                        outside_temp=self.outside_temp,
                        outside_humidity=self.outside_humidity,
                        door_open=self.door_open,
                        battery_voltage=self.battery_voltage,
                        battery_current=2.4 if self.cooling_active else 0.4,
                        battery_percentage=self.battery_percentage,
                        cooling_active=self.cooling_active,
                        power_source="solar_battery"
                    )
                except Exception as e:
                    print(f"[Simulation Error]: {e}")
                finally:
                    db.close()

            except Exception as loop_err:
                print(f"[Simulation Loop Error]: {loop_err}")

simulation_service = HardwareSimulationService()
