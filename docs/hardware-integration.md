# Hardware Integration & ESP32 Telemetry Specifications

## 1. Physical Hardware Components
- **ESP32 Microcontroller:** Core IoT node with Wi-Fi/BLE and dual-core 240MHz Xtensa LX6.
- **DS18B20:** Precision waterproof digital 1-Wire temperature sensor placed inside the core chamber.
- **SHT31:** High-accuracy digital temperature and humidity sensor (I2C) measuring relative humidity.
- **Magnetic Reed Switch:** Detects chamber door status via hardware interrupts.
- **INA226:** High-side I2C bi-directional current/power monitor measuring battery voltage (V) and charging/discharging current (A).
- **TEC1-12706 Peltier Thermoelectric Module:** Solid-state heat pump driven by 12V LiFePO4 battery via logic-level N-channel MOSFET / heavy-duty relay.
- **Dual Brushless DC Cooling Fans:** Cold-side internal circulation fan and hot-side external heat dissipation fan.

---

## 2. Autonomous Local Control Loop (No Internet Dependency)
In rural NER hills (e.g. Mayong, Mawkynrew, Teok), broadband and cellular connectivity can drop for hours or days. 

The software strictly enforces that:
> **Cloud connectivity is for monitoring, coordination, and analytics. Physical cooling is 100% autonomous on the ESP32.**

```
[DS18B20 Temp Probe]
        |
        v
 [ESP32 Local Loop]
        |
        +---> Is Current Temp > (Target + 0.8°C)? ---> YES ---> Turn ON Peltier & Fan
        |
        +---> Is Current Temp < (Target - 0.8°C)? ---> YES ---> Turn OFF Peltier & Fan
        |
        +---> Is Chamber Door Open?             ---> YES ---> Maintain Cooling & Alert
```

---

## 3. Power Budget & Solar System Sizing
- **Peltier TEC1-12706:** 12V @ 3.0A peak ($36\text{W}$) with $50\%$ duty cycle average ($18\text{W}$).
- **Fans & Sensors:** $12\text{V} @ 0.35\text{A} = 4.2\text{W}$.
- **ESP32 Node:** $5\text{V} @ 0.12\text{A} = 0.6\text{W}$.
- **Total Daily Energy Consumption:**
  $$E_{\text{daily}} \approx (18\text{W} + 4.2\text{W} + 0.6\text{W}) \times 24\text{ hours} \approx 547\text{ Wh/day}$$
- **LiFePO4 Battery Bank:** $12.8\text{V}, 40\text{Ah} = 512\text{ Wh}$ (Provides $\sim 24\text{ hours}$ autonomy without sunlight at $80\%$ depth of discharge).
- **Solar PV Array:** $1 \times 150\text{W}$ or $2 \times 100\text{W}$ monocrystalline panels producing $\sim 650–800\text{ Wh/day}$ during NER peak sun hours ($4.5\text{ peak hours}$).

---

## 4. Hardware Simulation vs. Real Hardware Toggle
The backend includes a continuous simulation engine (`simulation_service.py`) that emulates sensor dynamics with gradual thermal dissipation, battery charging curves, and door switch interrupts.

- **To connect actual physical ESP32:**
  1. Open `esp32/esp32_firmware.ino` in Arduino IDE.
  2. Set `WIFI_SSID`, `WIFI_PASSWORD`, and `BACKEND_URL` to your local machine IP.
  3. Flash to ESP32.
  4. The ESP32 will immediately post live telemetry to `/api/device/ESP32-NER-001/telemetry`, and the web application will display physical sensor data seamlessly!
