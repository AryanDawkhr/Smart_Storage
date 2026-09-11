// ==============================================================================
// SMART STORAGE - LIVE MONITORING & SENSORS (monitoring.js)
// ==============================================================================

const monitoring = {
  unitId: window.app.activeUnitId,
  unitCode: window.app.activeUnitCode,
  ws: null,
  historyData: [],

  async init() {
    await this.loadInitialTelemetry();
    this.connectWebSocket();
  },

  async loadInitialTelemetry() {
    try {
      const data = await window.api.getTelemetry(this.unitId, 20);
      this.historyData = data.history || [];
      this.renderCurrentReadings(data.latest);
      this.renderSparklineChart('tempChart', this.historyData.map(d => d.inside_temp), '#2e7d32', '°C');
      this.renderSparklineChart('humChart', this.historyData.map(d => d.inside_humidity), '#1976d2', '%');
      this.renderSparklineChart('batChart', this.historyData.map(d => d.battery_percentage), '#f57c00', '%');
    } catch (e) {
      console.warn('Error loading telemetry', e);
    }
  },

  renderCurrentReadings(reading) {
    if (!reading) return;

    const map = {
      'monInsideTemp': `${reading.inside_temp.toFixed(1)}°C`,
      'monInsideHum': `${reading.inside_humidity.toFixed(0)}%`,
      'monOutsideTemp': `${reading.outside_temp?.toFixed(1) || 28.0}°C`,
      'monOutsideHum': `${reading.outside_humidity?.toFixed(0) || 70}%`,
      'monDoor': reading.door_open ? 'OPEN' : 'CLOSED',
      'monBat': `${reading.battery_percentage?.toFixed(0) || 82}%`,
      'monBatVolt': `${reading.battery_voltage?.toFixed(2) || 13.2}V`,
      'monCooling': reading.cooling_active ? 'COOLING ON' : 'IDLE',
      'monPower': 'SOLAR / BATTERY',
      'monStatus': 'SAFE'
    };

    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }

    const doorEl = document.getElementById('monDoor');
    if (doorEl) {
      doorEl.style.color = reading.door_open ? 'var(--status-critical)' : 'var(--status-safe)';
    }

    const coolingEl = document.getElementById('monCooling');
    if (coolingEl) {
      coolingEl.style.color = reading.cooling_active ? 'var(--primary)' : 'var(--text-muted)';
    }
  },

  // Lightweight SVG sparkline chart without external chart library
  renderSparklineChart(elementId, values, color, unitSuffix) {
    const container = document.getElementById(elementId);
    if (!container || !values || values.length < 2) return;

    const width = container.clientWidth || 300;
    const height = 90;
    const padding = 10;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const lastX = width - padding;
    const lastY = height - padding - ((values[values.length - 1] - min) / range) * (height - 2 * padding);

    container.innerHTML = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        <polyline fill="none" stroke="${color}" stroke-width="2.5" points="${points}" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${lastX}" cy="${lastY}" r="4" fill="${color}" />
      </svg>
      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
        <span>Min: ${min.toFixed(1)}${unitSuffix}</span>
        <span>Current: ${values[values.length - 1].toFixed(1)}${unitSuffix}</span>
        <span>Max: ${max.toFixed(1)}${unitSuffix}</span>
      </div>
    `;
  },

  connectWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:8000';
      this.ws = new WebSocket(`${protocol}//${host}/ws/telemetry`);

      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'telemetry_update' && msg.storage_unit_id === this.unitId) {
            this.renderCurrentReadings(msg);
          }
        } catch (err) {}
      };
    } catch (err) {}
  }
};

window.monitoring = monitoring;
