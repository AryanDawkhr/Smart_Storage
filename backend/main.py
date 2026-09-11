import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.database.init_db import init_db
from app.services.simulation_service import simulation_service
from app.websocket.connection_manager import ws_manager

# API Routers
from app.api.auth import router as auth_router
from app.api.storage import router as storage_router
from app.api.produce import router as produce_router
from app.api.compatibility import router as compatibility_router
from app.api.telemetry import router as telemetry_router
from app.api.alerts import router as alerts_router
from app.api.history import router as history_router
from app.api.market import router as market_router
from app.api.transport import router as transport_router
from app.api.recommendations import router as recommendations_router
from app.api.simulation import router as simulation_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database & Seed data
    print("[Server Startup] Initializing Database...")
    init_db()

    # Startup: Hardware Simulation Service
    if settings.SIMULATION_MODE:
        print("[Server Startup] Starting Hardware Simulation Mode...")
        await simulation_service.start()

    yield

    # Shutdown: Clean up simulation background task
    print("[Server Shutdown] Stopping Hardware Simulation...")
    simulation_service.stop()

app = FastAPI(
    title=settings.APP_NAME,
    description="Decentralized Solar-Powered Cold Storage Network for North Eastern Region (NER)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(storage_router)
app.include_router(produce_router)
app.include_router(compatibility_router)
app.include_router(telemetry_router)
app.include_router(alerts_router)
app.include_router(history_router)
app.include_router(market_router)
app.include_router(transport_router)
app.include_router(recommendations_router)
app.include_router(simulation_router)

# Real-time WebSocket Endpoint
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """Real-time sensor telemetry stream."""
    await ws_manager.connect(websocket)
    try:
        # Send initial status
        await websocket.send_json({
            "type": "connection_established",
            "message": "Connected to Smart Cold Storage Telemetry Stream"
        })
        while True:
            # Keep connection open and accept optional client heartbeats
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Mount Frontend static files
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.isdir(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")
    app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="frontend_css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="frontend_js")

    @app.get("/manifest.json")
    def serve_manifest():
        return FileResponse(os.path.join(frontend_dir, "manifest.json"))

    @app.get("/sw.js")
    def serve_service_worker():
        return FileResponse(os.path.join(frontend_dir, "sw.js"), media_type="application/javascript")

    @app.get("/")
    def serve_frontend_root():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/{page}.html")
    def serve_html_page(page: str):
        page_path = os.path.join(frontend_dir, f"{page}.html")
        if os.path.isfile(page_path):
            return FileResponse(page_path)
        return FileResponse(os.path.join(frontend_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
