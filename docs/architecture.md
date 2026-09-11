# System Architecture & Technical Design

## 1. Executive Summary
Smallholder farmers across the North Eastern Region (NER) of India face severe post-harvest losses (up to 35–40% for perishable horticultural crops like tomato, cucumber, king chilli, and ginger) due to lack of localized cold storage and unreliable grid connectivity. 

The **Smart Solar Mini Cold Storage** system solves this via a decentralized, community-shared network of 50–75 kg solar-powered micro cold-storage units managed by intelligent software:

1. **Physical Shared Chamber:** A single solar mini cold storage unit located in a village hub.
2. **Independent Digital Ledgers:** Multiple farmers share chamber capacity without mixing digital records or ownership.
3. **Crop Compatibility Intersection Engine:** Automatically verifies thermal and humidity boundaries before accepting produce.
4. **Explainable Decision Engine:** Combines chamber stability, produce age, regional Mandi prices, and rural freight availability to output actionable **STORE**, **SELL**, or **TRANSPORT** recommendations.
5. **Offline-First Resilience:** Microcontroller cooling operates autonomously with local hysteresis even during total network failure.

---

## 2. End-to-End Data Flow

```
                      +-----------------------------+
                      |     FARMER USER INTERFACE   |
                      |   (Mobile-First Vanilla JS) |
                      +--------------+--------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v (REST API & Auth)                           v (WebSocket Stream)
+-----------------------------+               +-----------------------------+
|       FastAPI Backend       |               |    WebSocket Connection     |
|   (Authentication, Logic,   |               |          Manager            |
|   Compatibility, Decisions) |               +--------------+--------------+
+--------------+--------------+                              |
               |                                             |
               v                                             |
+-----------------------------+                              |
|   PostgreSQL / SQLite DB    |<-----------------------------+
| (13 Normalized Relational   |
|           Tables)           |
+--------------+--------------+
               ^
               | (Telemetry Ingestion: POST /api/device/{id}/telemetry)
+--------------+--------------+
|     ESP32 Microcontroller   | <==== Autonomous Local Cooling Hysteresis
|  (DS18B20, SHT31, Reed SW,  |
|       INA226, Peltier)      |
+-----------------------------+
```

---

## 3. Crop Compatibility Mathematical Algorithm
When farmer $f$ attempts to intake crop $C_{\text{new}}$ with quantity $Q$ into storage unit $U$:

### Step 1: Capacity Constraint
$$\sum_{i \in \text{stored}} Q_i + Q \le \text{Capacity}_{\text{total}}$$
If capacity is exceeded, the transaction is rejected immediately with a friendly explanation.

### Step 2: Safe Thermal Intersection
Let $S = \{C_1, C_2, \dots, C_k\}$ be the set of crops currently inside the chamber.
$$\text{Common Min Temp} = \max\left(\min(C_1), \min(C_2), \dots, \min(C_{\text{new}})\right)$$
$$\text{Common Max Temp} = \min\left(\max(C_1), \max(C_2), \dots, \max(C_{\text{new}})\right)$$

- **Compatibility Condition:**
  $$\text{Common Min Temp} \le \text{Common Max Temp}$$
- **Recommended Target Temperature:**
  $$T_{\text{target}} = \frac{\text{Common Min Temp} + \text{Common Max Temp}}{2.0}$$

---

## 4. Multi-Farmer Shared Storage Model
```
Physical Storage Chamber (50 kg Capacity)
+-------------------------------------------------------------+
| Farmer A: Ramesh Bora (25 kg Tomato) - Safe Band: 10–13°C  |
+-------------------------------------------------------------+
| Farmer B: Pranab Das (10 kg Cucumber) - Safe Band: 10–13°C |
+-------------------------------------------------------------+
| Available Space: 15 kg                                      |
+-------------------------------------------------------------+
Common Chamber Temperature: 11.5°C
Status: 100% Compatible | Shared Power: 82% LiFePO4
```
Digital records remain private to each farmer while chamber telemetry and aggregate capacity are shared.

---

## 5. Future AI / ML Evolution Pipeline
The software architecture is deliberately built AI-ready:
1. **Raw Telemetry & Market Streams:** Historical temperatures, humidity, solar charging profiles, and daily mandi arrivals.
2. **Feature Store:** Storage duration ratios, thermal fluctuation volatility, regional mandi price momentum, and freight travel time.
3. **Model Interchangeability:** The current explainable rule-based decision engine (`recommendation_service.py`) can be swapped seamlessly for an ML model (e.g., LightGBM / XGBoost multi-class classifier or RL dispatch agent) without altering frontend APIs.
