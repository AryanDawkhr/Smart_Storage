from fastapi import APIRouter
from app.schemas.schemas import SimulationControlRequest, SimulationStatusResponse
from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/api/simulation", tags=["Simulation & Demo Mode"])

@router.get("/status", response_model=SimulationStatusResponse)
def get_simulation_status():
    """Retrieve current hardware simulation variables and override states."""
    return simulation_service.get_status()

@router.post("/control", response_model=SimulationStatusResponse)
def control_simulation(payload: SimulationControlRequest):
    """
    Demo controls for judges:
    - force_temperature: spike or drop temperature to trigger alert
    - force_door_open: simulate open door
    - force_battery_pct: test low battery warnings
    - force_offline: test internet failure & local cooling preservation
    """
    status = simulation_service.override_controls(
        force_temperature=payload.force_temperature,
        force_door_open=payload.force_door_open,
        force_battery_pct=payload.force_battery_pct,
        force_offline=payload.force_offline
    )
    return status
