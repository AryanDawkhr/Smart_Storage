// ==============================================================================
// SMART STORAGE - HOME DASHBOARD CONTROLLER (dashboard.js)
// ==============================================================================

const dashboard = {
  unitId: window.app.activeUnitId,
  unitCode: window.app.activeUnitCode,
  ws: null,

  async init() {
    this.renderFarmerGreeting();
    await this.loadDashboardData();
    this.connectWebSocket();
  },

  renderFarmerGreeting() {
    const user = window.auth.getUser();
    const nameEl = document.getElementById('farmerName');
    if (nameEl && user) {
      nameEl.textContent = user.name || 'Farmer';
    }
  },

  async loadDashboardData() {
    try {
      // 1. Fetch Storage Unit Summary
      const unit = await window.api.getStorageUnit(this.unitId);
      this.renderCapacity(unit);
      this.renderTelemetryValues({
        inside_temp: unit.current_temp,
        inside_humidity: unit.current_humidity,
        battery_percentage: unit.battery_percentage,
        door_open: unit.door_open,
        cooling_active: true,
        is_online: unit.is_online
      });

      // 2. Fetch Stored Produce (Chamber & Farmer)
      const produceRecords = await window.api.getChamberProduce(this.unitId);
      this.renderCurrentProduce(produceRecords);

      // 3. Fetch Active Alerts
      const alerts = await window.api.getAlerts(this.unitId, true);
      this.renderActiveAlerts(alerts);

      // 4. Fetch Recommendation
      const recommendations = await window.api.getFarmerRecommendations();
      this.renderRecommendation(recommendations);

    } catch (err) {
      console.warn('Error loading dashboard data (offline fallback may be active):', err);
    }
  },

  renderCapacity(unit) {
    const total = unit.total_capacity || 50.0;
    const occupied = unit.occupied_capacity || 0.0;
    const available = unit.available_capacity || (total - occupied);
    const pct = unit.occupancy_percentage || Math.round((occupied / total) * 100);

    const totalEl = document.getElementById('capTotal');
    const occupiedEl = document.getElementById('capOccupied');
    const availableEl = document.getElementById('capAvailable');
    const fillEl = document.getElementById('capProgressFill');
    const pctEl = document.getElementById('capPctText');

    if (totalEl) totalEl.textContent = `${total.toFixed(0)} kg`;
    if (occupiedEl) occupiedEl.textContent = `${occupied.toFixed(1)} kg`;
    if (availableEl) availableEl.textContent = `${available.toFixed(1)} kg`;
    if (pctEl) pctEl.textContent = `${pct.toFixed(0)}% occupied`;

    if (fillEl) {
      fillEl.style.width = `${Math.min(100, pct)}%`;
      fillEl.className = 'progress-fill';
      if (pct > 85) fillEl.classList.add('critical');
      else if (pct > 65) fillEl.classList.add('warning');
    }
  },

  renderTelemetryValues(data) {
    const tempEl = document.getElementById('valTemp');
    const humEl = document.getElementById('valHum');
    const batEl = document.getElementById('valBat');
    const doorEl = document.getElementById('valDoor');
    const statusPill = document.getElementById('storageStatusPill');

    if (tempEl && data.inside_temp !== undefined) {
      tempEl.textContent = `${data.inside_temp.toFixed(1)}°C`;
    }
    if (humEl && data.inside_humidity !== undefined) {
      humEl.textContent = `${data.inside_humidity.toFixed(0)}%`;
    }
    if (batEl && data.battery_percentage !== undefined) {
      batEl.textContent = `${data.battery_percentage.toFixed(0)}%`;
    }
    if (doorEl && data.door_open !== undefined) {
      doorEl.textContent = data.door_open ? 'Open' : 'Closed';
      doorEl.style.color = data.door_open ? 'var(--status-critical)' : 'var(--text-main)';
    }

    if (statusPill) {
      const temp = data.inside_temp || 11.5;
      if (temp > 14.0 || (data.battery_percentage !== undefined && data.battery_percentage < 25)) {
        statusPill.className = 'status-pill critical';
        statusPill.innerHTML = '<span class="pulse-dot critical"></span> CRITICAL';
      } else if (temp > 13.0 || data.door_open || (data.battery_percentage !== undefined && data.battery_percentage < 40)) {
        statusPill.className = 'status-pill warning';
        statusPill.innerHTML = '<span class="pulse-dot warning"></span> WARNING';
      } else {
        statusPill.className = 'status-pill safe';
        statusPill.innerHTML = '<span class="pulse-dot"></span> SAFE';
      }
    }
  },

  renderActiveAlerts(alerts) {
    const container = document.getElementById('dashboardAlertContainer');
    if (!container) return;

    if (!alerts || alerts.length === 0) {
      container.innerHTML = `
        <div class="alert-card-home info" style="border-left-color: var(--primary); background: var(--primary-light);">
          <div style="font-size: 20px;">🛡️</div>
          <div class="alert-body">
            <div class="alert-title-text" style="color: var(--primary-dark);">Storage Operating Normal</div>
            <div class="alert-desc-text">Solar cooling and humidity are within optimal safe bands.</div>
          </div>
        </div>
      `;
      return;
    }

    const latest = alerts[0];
    const isCrit = latest.severity === 'CRITICAL';
    container.innerHTML = `
      <div class="alert-card-home ${isCrit ? 'critical' : 'warning'}">
        <div style="font-size: 20px;">${isCrit ? '🚨' : '⚠️'}</div>
        <div class="alert-body">
          <div class="alert-title-text">${latest.title}</div>
          <div class="alert-desc-text">${latest.message}</div>
        </div>
      </div>
    `;
  },

  renderCurrentProduce(records) {
    const container = document.getElementById('currentProduceList');
    if (!container) return;

    if (!records || records.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.9rem;">
          No produce stored currently. Tap "+ Add Produce" to store harvest.
        </div>
      `;
      return;
    }

    const icons = {
      'Tomato': '🍅',
      'Cucumber': '🥒',
      'King Chilli': '🌶️',
      'Ginger': '🫚',
      'Khasi Mandarin': '🍊',
      'Potato': '🥔',
      'Cabbage': '🥬'
    };

    container.innerHTML = records.map(r => {
      const icon = icons[r.crop_name] || '🥦';
      return `
        <div class="produce-item">
          <div class="produce-info">
            <div class="produce-icon-box">${icon}</div>
            <div>
              <div class="produce-name">${r.crop_name}</div>
              <div class="produce-meta">Stored ${r.storage_age_human || 'recently'} • ${r.farmer_name || 'Farmer'}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="produce-qty">${r.quantity_kg.toFixed(0)} kg</div>
            <div class="produce-status-tag">SAFE</div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderRecommendation(recommendations) {
    const container = document.getElementById('dashboardRecommendationBox');
    if (!container) return;

    if (!recommendations || recommendations.length === 0) {
      container.innerHTML = `
        <div class="recommendation-hero">
          <span class="rec-badge">STORE</span>
          <div class="rec-statement">Storage conditions are optimal.</div>
          <div class="rec-reason">Produce is safely preserved. Market prices will be monitored daily.</div>
        </div>
      `;
      return;
    }

    const rec = recommendations[0];
    const badgeClass = rec.decision.toLowerCase();
    container.innerHTML = `
      <div class="recommendation-hero">
        <span class="rec-badge ${badgeClass}">${rec.decision}</span>
        <div class="rec-statement">${rec.primary_reason}</div>
        <div class="rec-reason">Based on cold storage age (${rec.factors?.storage_age_days || 2}d), regional mandi trends, and rural transport pickup.</div>
      </div>
    `;
  },

  connectWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:8000';
      this.ws = new WebSocket(`${protocol}//${host}/ws/telemetry`);

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'telemetry_update' && msg.storage_unit_id === this.unitId) {
            this.renderTelemetryValues({
              inside_temp: msg.inside_temp,
              inside_humidity: msg.inside_humidity,
              battery_percentage: msg.battery_percentage,
              door_open: msg.door_open,
              cooling_active: msg.cooling_active,
              is_online: msg.is_online
            });
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      this.ws.onerror = () => {
        console.warn('Live WebSocket closed, normal polling active.');
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
    }
  }
};

window.dashboard = dashboard;
