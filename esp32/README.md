# ESP32 IoT Microcontroller Node & Sensor Wiring Guide

## 1. Hardware Overview
The Smart Solar Mini Cold Storage unit utilizes an **ESP32-WROOM-32** as an autonomous controller that interfaces with internal/external temperature sensors, humidity sensors, door reed switches, power management ICs, and Peltier cooling drivers.

```
       +-------------------------------------------------------+
       |                  Solar PV Panel (150W)                |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |             MPPT Solar Charge Controller              |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |             12.8V 40Ah LiFePO4 Battery                |
       +---------------------------+---------------------------+
                                   |
                      +------------+------------+
                      |                         |
                      v                         v
               +--------------+          +--------------+
               | Buck (12V->5V|          | INA226 Power |
               | for ESP32)   |          | Monitor IC   |
               +-------+------+          +-------+------+
                       |                         |
                       v                         v
       +-------------------------------------------------------+
       |                     ESP32-WROOM                       |
       |  GPIO 4: DS18B20 1-Wire Probe                         |
       |  GPIO 21 (SDA) / 22 (SCL): SHT31 & INA226 (I2C)       |
       |  GPIO 14: Magnetic Reed Switch (Door)                 |
       |  GPIO 27: Logic-Level MOSFET (Peltier & Fan Relay)    |
       +---------------------------+---------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |      TEC1-12706 Peltier Cooler + Dual Heatsink Fans   |
       +-------------------------------------------------------+
```

---

## 2. Pin Mapping Table

| Component | Pin / Interface | ESP32 GPIO | Notes |
|---|---|---|---|
| **DS18B20 Temp Sensor** | 1-Wire Signal (Yellow) | `GPIO 4` | Pull-up resistor: 4.7kΩ between VCC (3.3V) & Data |
| **SHT31 Temp/Humidity** | I2C SDA | `GPIO 21` | Pull-ups integrated on module board |
| **SHT31 Temp/Humidity** | I2C SCL | `GPIO 22` | Pull-ups integrated on module board |
| **INA226 Voltage/Current** | I2C SDA / SCL | `GPIO 21 / 22` | Shunt resistor: 0.01Ω on battery positive lead |
| **Door Reed Switch** | Digital Input | `GPIO 14` | Configured with `INPUT_PULLUP`. LOW when magnet closed |
| **Peltier & Fan Relay** | Gate / Trigger | `GPIO 27` | IRLZ44N N-Channel MOSFET or 5V Optocoupled Relay |
| **Onboard Status LED** | Digital Output | `GPIO 2` | Active HIGH when cooling Peltier is active |

---

## 3. Autonomous Local Cooling Philosophy
- **Internet Independence:** The ESP32 implements local temperature hysteresis with a configurable deadband ($\pm 0.8^\circ\text{C}$).
- When temperature exceeds $T_{\text{target}} + 0.8^\circ\text{C}$, the cooling relay activates.
- When temperature reaches $T_{\text{target}} - 0.8^\circ\text{C}$, cooling turns OFF.
- **Fail-Safe Operation:** If Wi-Fi is lost, the loop maintains cold conditions autonomously. Telemetry is logged locally and automatically transmitted when connectivity returns.
