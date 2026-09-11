# Smart Solar Mini Cold Storage

> **An IoT-Driven Decentralized Community Cold-Storage Network & Decision Support Engine for Smallholder Farmers in the North Eastern Region (NER) of India.**

Developed for the **Smart India Hackathon (SIH)** problem statement addressing post-harvest perishable crop losses and cold chain deficits in rural and hilly agrarian clusters.

---

## 1. Project Overview & Product Philosophy

In the North Eastern Region (NER) of India, small farmers face severe post-harvest losses (30–40%) due to inadequate, inaccessible, and unreliable cold storage infrastructure. Conventional large cold-storage facilities are centralized, expensive, distant, and dependent on unstable grid electricity.

**Smart Solar Mini Cold Storage** combines:
1. **Solar-Powered Mini Cold Storage:** Decentralized 50–75 kg modular chambers with Peltier thermoelectric cooling.
2. **LiFePO4 Battery Backup:** 24-hour uninterrupted thermal preservation.
3. **ESP32 Autonomous Controller:** Local hysteresis cooling control that continues uninterrupted even if the internet fails.
4. **Multi-Farmer Shared Storage:** Multiple farmers share a single physical chamber with separated digital ledgers.
5. **QR-Based Unit Identification:** Fast physical unit discovery and intake via QR code scanning.
6. **Crop Compatibility Intersection Engine:** Prevents mixing incompatible produce by calculating safe thermal and humidity overlap.
7. **Storage Capacity Management:** Real-time occupancy tracking preventing chamber overload.
8. **Storage-Age Tracking:** Monitors elapsed storage duration against recommended safe thresholds.
9. **Multi-Level Alert System:** Real-time INFO, WARNING, and CRITICAL alerts for temperature excursions, open doors, and power drain.
10. **Explainable Decision Engine:** Delivers transparent **STORE**, **SELL**, or **TRANSPORT** recommendations based on storage stability, crop shelf-life, regional APMC Mandi prices, and rural freight availability.
11. **Offline-First Operation:** Local cache and offline queue allow farmers to record produce and inspect data without cellular connectivity.
12. **Hardware Simulation Mode:** Built-in sensor simulation engine for live judge demonstrations without requiring physical hardware.

> **Design Philosophy:** *"Simple for the farmer, intelligent in the background."*

---

## 2. Technology Stack

### Backend
- **Language & Framework:** Python 3.11+, FastAPI (REST APIs & WebSocket Stream)
- **Validation:** Pydantic v2
- **ORM & Database:** SQLAlchemy 2.0 with native PostgreSQL DDL/DML and automatic SQLite zero-setup fallback
- **Authentication:** JWT Bearer tokens with Bcrypt password hashing
- **Real-Time Stream:** WebSockets (`/ws/telemetry`)

### Frontend
- **Structure & Logic:** HTML5, Modern Vanilla JavaScript (ES6+ Modules, zero heavy frameworks)
- **Styling:** Custom Vanilla CSS3 with high-contrast rules, mobile-first responsive grid/flexbox
- **Offline / PWA:** Service Worker (`sw.js`) and Web App Manifest (`manifest.json`)
- **QR Scanner:** Lightweight camera stream scanner with manual Unit ID fallback

### Hardware (Physical & Simulated)
- **Microcontroller:** ESP32-WROOM-32
- **Sensors:** DS18B20 (Chamber temp), SHT31 (Relative humidity & ambient temp), Magnetic Reed Switch (Door), INA226 (LiFePO4 voltage & solar current)
- **Actuators:** TEC1-12706 Peltier Thermoelectric cooler + Dual Brushless DC circulation fans

---

## 3. Project Structure

```
smart-mini-cold-storage/
├── backend/
│   ├── main.py                      # FastAPI app entry point & WebSocket hub
│   ├── requirements.txt             # Python dependencies
│   ├── .env.example                 # Configuration template
│   └── app/
│       ├── core/                    # Config & security (JWT, Bcrypt)
│       ├── database/                # Session, engine, auto-migration & seeder
│       ├── models/                  # 13 SQLAlchemy ORM models
│       ├── schemas/                 # Pydantic validation schemas
│       ├── services/                # Compatibility, Telemetry, Alerts, Decision engine
│       ├── websocket/               # Active WebSocket connection pool
│       └── api/                     # 11 Modular REST API route handlers
├── frontend/
│   ├── index.html                   # Farmer Login
│   ├── register.html                # Farmer Registration (NER States)
│   ├── home.html                    # Home Dashboard
│   ├── scan.html                    # QR Storage Unit Scanner
│   ├── storage.html                 # Storage Details & Occupancy
│   ├── add-produce.html             # Multi-Step Produce Intake
│   ├── compatibility.html           # Thermal Intersection Checker
│   ├── live-storage.html            # Live Telemetry & Gauge Monitor
│   ├── alerts.html                  # Active & Resolved Alerts Engine
│   ├── history.html                 # Storage History & Age Tracking
│   ├── market.html                  # NER Mandi Rates & Transport Logistics
│   ├── recommendation.html          # Explainable Decision Support Engine
│   ├── profile.html                 # Farmer Profile
│   ├── settings.html                # Language (i18n), Units & Demo Controls
│   ├── sw.js                        # Offline Service Worker
│   ├── manifest.json                # PWA Manifest
│   ├── css/                         # Custom style.css & responsive.css
│   └── js/                          # Modular Vanilla JS controllers
├── database/
│   ├── schema.sql                   # Full PostgreSQL DDL (13 tables & indexes)
│   └── seed.sql                     # Realistic NER seed data (farmers, crops, units)
├── esp32/
│   ├── esp32_firmware.ino           # Complete C++ Arduino firmware for ESP32
│   └── README.md                    # Hardware wiring & pinout diagrams
├── docs/
│   ├── architecture.md              # Decentralized architecture & math flow
│   ├── api.md                       # Complete REST & WebSocket documentation
│   └── hardware-integration.md      # ESP32 integration, power budget & circuit design
└── README.md                        # Master Project Documentation
```

---

## 4. Quickstart Setup & Execution

### Prerequisites
- Python 3.10+ (Python 3.11 recommended)
- Any modern web browser (Chrome, Edge, Firefox, Safari)

### Step 1: Install Dependencies
```bash
cd "a:/aryan all/SIH/Smart_Storage"
pip install -r backend/requirements.txt
```

### Step 2: Start the Application
Run the FastAPI backend server:
```bash
python backend/main.py
```
*Note: The backend automatically creates database tables and populates realistic demo seed data on startup. The built-in hardware simulation service starts immediately.*

### Step 3: Open the Web Application
Navigate in your browser to:
```
http://localhost:8000
```
*(Or open `http://localhost:8000/home.html` for direct dashboard access).*

---

## 5. Judge Demonstration Walkthrough (15-Step Script)

1. **Farmer Authentication:**
   - Open `http://localhost:8000`.
   - Use the **"Judge Demo Quick-Login"** button to log in instantly as **Farmer Ramesh Bora** (or enter mobile `9876543210` with password `farmer123`).
2. **Review Home Dashboard:**
   - Observe the clean, high-contrast dashboard showing:
     - **Capacity Bar:** 50 kg total, 35 kg occupied, 15 kg available (70% occupied).
     - **Live Sensor Metrics:** Inside Temp: 11.6°C, Humidity: 78%, Battery: 82%, Door: Closed.
     - **Active Produce:** 25 kg Tomato (stored 2 days) and 10 kg Cucumber (stored 1 day).
     - **Decision Support Banner:** "STORE" recommendation based on rising Mandi prices.
3. **Inspect Storage Unit & Shared Farmers:**
   - Tap **"Storage"** in the bottom navigation.
   - View chamber occupants showing that **Ramesh Bora** (25 kg Tomato) and **Pranab Das** (10 kg Cucumber) share the same physical unit (`NER-CS-001`) with segregated digital ownership.
4. **Test QR Unit Scanner:**
   - Tap **"Scan Storage"** or the camera icon.
   - Observe camera scanner mode and manual Unit ID fallback (e.g. `NER-CS-001`, `NER-CS-002`, `NER-CS-003`).
5. **Intake Produce with Capacity Rejection:**
   - Tap **"+ Add Produce"**.
   - Select **Tomato** and enter **25 kg**.
   - Observe instant validation: **⛔ Capacity Exceeded** ("Only 15.0 kg space is available in NER-CS-001"). System strictly protects against physical chamber overload!
6. **Intake Incompatible Produce:**
   - Change crop to **Cabbage (0–2°C)**.
   - Observe compatibility engine response: **⚠️ Incompatible Produce** ("Cabbage [0–2°C] cannot share chamber with Tomato [10–13°C]"). Shows clear conflict explanation to the farmer.
7. **Intake Compatible Produce:**
   - Select **Cucumber (10–13°C)** with **10 kg**.
   - Observe verification response: **✓ Produce Compatible & Space Confirmed** (Safe common band 10.0–13.0°C, target 11.5°C).
   - Tap **"Confirm & Store Produce"** to intake.
8. **Live Telemetry & WebSocket Streaming:**
   - Tap **"Live Status"** or navigate to `live-storage.html`.
   - Observe dominant digital gauges updating in real-time via WebSocket without page refreshing.
   - View smooth SVG trend sparklines for temperature, humidity, and battery reserves.
9. **Interactive Hardware Simulation (Demo Controls):**
   - Tap **"Demo Controls"** on the top yellow simulation banner.
   - Click **"🔥 Force 16.5°C (High Alert)"**.
   - Notice the temperature gauge spike, cooling automatically trigger ON, and a **CRITICAL ALERT** generated on the dashboard!
   - Click **"🚪 Open Door"** to simulate magnetic reed switch trigger.
   - Click **"🪫 Drain to 22%"** to trigger low battery alert.
   - Click **"❄️ Reset 11.5°C"** to restore optimal conditions.
10. **Inspect Alerts Engine:**
    - Tap **"Alerts"** in the bottom navigation.
    - View the generated alerts with severity pills (**CRITICAL / WARNING / INFO**).
    - Tap **"Acknowledge & Resolve"** on an alert to clear it.
11. **Review Storage Aging & Retrieval:**
    - Tap **"History"** in the bottom navigation.
    - Inspect elapsed storage duration (e.g. *"2d 4h ago"*), remaining safe shelf life, and harvest dates.
    - Tap **"Retrieve / Checkout"** on a stored batch to simulate farmer pickup and free up storage capacity.
12. **Check Regional Mandi Prices:**
    - Navigate to **Market & Logistics** (`market.html`).
    - View live Mandi rates across Guwahati APMC, Shillong Bara Bazar, and Jorhat Mandi with price trends (📈 Rising / 📉 Falling) and arrival volumes.
13. **Review Rural Logistics Options:**
    - On the same page, view scheduled rural freight options (Tata Ace / Bolero Pickup) with departure times, cost per quintal, and one-tap **"Call Driver"** action.
14. **Inspect Explainable Decision Support Engine:**
    - Tap **Decision Support** (`recommendation.html`).
    - Review the transparent **STORE**, **SELL**, or **TRANSPORT** advice with confidence scores and explainable factor breakdown cards (chamber stability, age percentage, mandi price trend, freight pickup).
15. **Simulate Offline Operation:**
    - Click **"Demo Controls"** and toggle **"📡 Simulate Disconnect"** (or turn off Wi-Fi).
    - The top offline notification banner displays immediately.
    - Notice that autonomous local cooling continues uninterrupted, and farmer actions are stored locally in the offline queue to sync automatically when connectivity returns.

---

## 6. Real ESP32 Hardware Integration

To connect physical ESP32 microcontrollers instead of simulation mode:
1. Open [esp32_firmware.ino](file:///a:/aryan%20all/SIH/Smart_Storage/esp32/esp32_firmware.ino) in Arduino IDE.
2. Update `WIFI_SSID`, `WIFI_PASSWORD`, and `BACKEND_URL`.
3. Wire sensors according to [esp32/README.md](file:///a:/aryan%20all/SIH/Smart_Storage/esp32/README.md).
4. Flash the sketch to the ESP32. The node will autonomously control cooling and stream live telemetry to the backend!

---

## 7. License & Attribution
Developed for Smart India Hackathon (SIH). Tailored for the agricultural empowerment of smallholder farming communities across the North Eastern Region of India.
"# SIH" 
