// ==============================================================================
// SMART STORAGE - STORAGE DETAILS & NETWORK CONTROLLER (storage.js)
// ==============================================================================

const storage = {
  activeUnitId: window.app.activeUnitId,

  async init() {
    await this.loadCurrentUnitDetails();
    await this.loadAllStorageUnits();
  },

  async loadCurrentUnitDetails() {
    try {
      const unit = await window.api.getStorageUnit(this.activeUnitId);
      this.renderUnitDetails(unit);
      
      const produce = await window.api.getChamberProduce(this.activeUnitId);
      this.renderChamberOccupants(produce);
    } catch (err) {
      console.warn('Error loading storage details:', err);
    }
  },

  renderUnitDetails(unit) {
    const codeEl = document.getElementById('unitCode');
    const locEl = document.getElementById('unitLocation');
    const capEl = document.getElementById('unitCapacityText');
    const fillEl = document.getElementById('unitCapacityFill');
    const tempEl = document.getElementById('unitSafeBand');

    if (codeEl) codeEl.textContent = unit.unit_code;
    if (locEl) locEl.textContent = `${unit.village}, ${unit.district}, ${unit.state}`;
    if (capEl) capEl.textContent = `${unit.occupied_capacity} kg / ${unit.total_capacity} kg (${unit.occupancy_percentage}% occupied)`;
    if (fillEl) fillEl.style.width = `${Math.min(100, unit.occupancy_percentage)}%`;
    if (tempEl) tempEl.textContent = `${unit.min_safe_temp}–${unit.max_safe_temp}°C (Target: ${unit.target_temperature}°C)`;

    // Update global app state
    window.app.setActiveUnit(unit.unit_code, unit.id);
  },

  renderChamberOccupants(records) {
    const container = document.getElementById('chamberFarmersList');
    if (!container) return;

    if (!records || records.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.88rem; padding: 10px 0;">Chamber is empty.</div>`;
      return;
    }

    container.innerHTML = records.map(r => `
      <div class="produce-item">
        <div class="produce-info">
          <div class="produce-icon-box">📦</div>
          <div>
            <div class="produce-name">${r.farmer_name} • ${r.crop_name}</div>
            <div class="produce-meta">Stored: ${r.storage_age_human} ago • Condition: ${r.current_condition}</div>
          </div>
        </div>
        <div class="produce-qty">${r.quantity_kg} kg</div>
      </div>
    `).join('');
  },

  async loadAllStorageUnits() {
    const container = document.getElementById('decentralizedUnitsList');
    if (!container) return;

    try {
      const units = await window.api.getStorageUnits();
      container.innerHTML = units.map(u => `
        <div class="card" style="margin-bottom: 12px; cursor: pointer;" onclick="storage.selectUnit(${u.id}, '${u.unit_code}')">
          <div class="card-header" style="margin-bottom: 8px;">
            <div class="card-title">
              <span>❄️</span> ${u.unit_code}
            </div>
            <span class="status-pill safe">${u.available_capacity.toFixed(0)} kg available</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
            📍 ${u.village}, ${u.district}, ${u.state}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600;">
            <span>Temp: ${u.current_temp.toFixed(1)}°C</span>
            <span>Occupancy: ${u.occupied_capacity}/${u.total_capacity} kg</span>
            <span>Solar: ${u.battery_percentage}%</span>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.warn('Error loading units list', e);
    }
  },

  selectUnit(id, code) {
    window.app.setActiveUnit(code, id);
    window.location.reload();
  }
};

window.storage = storage;
