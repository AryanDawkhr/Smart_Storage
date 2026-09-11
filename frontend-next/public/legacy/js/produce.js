// ==============================================================================
// SMART STORAGE - ADD PRODUCE INTAKE FLOW (produce.js)
// 4-Step Farmer Flow: Input -> Capacity -> Compatibility -> Confirm
// ==============================================================================

const produce = {
  unitId: window.app.activeUnitId,
  crops: [],
  selectedCrop: null,

  async init() {
    await this.loadCrops();
    this.setupEventListeners();
  },

  async loadCrops() {
    try {
      this.crops = await window.api.getCrops();
      const select = document.getElementById('cropSelect');
      if (!select) return;

      select.innerHTML = '<option value="">-- Select Harvested Crop --</option>' + 
        this.crops.map(c => `
          <option value="${c.id}" data-min="${c.profile?.min_temp}" data-max="${c.profile?.max_temp}">
            ${c.name} ${c.local_ner_name ? `(${c.local_ner_name})` : ''} [${c.profile?.min_temp}–${c.profile?.max_temp}°C]
          </option>
        `).join('');
    } catch (e) {
      console.warn('Error loading crops:', e);
    }
  },

  setupEventListeners() {
    const cropSelect = document.getElementById('cropSelect');
    const qtyInput = document.getElementById('quantityInput');

    if (cropSelect) {
      cropSelect.addEventListener('change', () => this.validateStep1());
    }
    if (qtyInput) {
      qtyInput.addEventListener('input', () => this.validateStep1());
    }
  },

  async validateStep1() {
    const cropId = document.getElementById('cropSelect')?.value;
    const qty = parseFloat(document.getElementById('quantityInput')?.value || '0');
    const resultBox = document.getElementById('verificationResultBox');

    if (!cropId || qty <= 0) {
      if (resultBox) resultBox.style.display = 'none';
      return;
    }

    try {
      // Live Check with Backend Compatibility Service
      const check = await window.api.checkCompatibility(this.unitId, cropId, qty);
      this.displayVerificationResult(check);
    } catch (err) {
      console.error(err);
    }
  },

  displayVerificationResult(check) {
    const resultBox = document.getElementById('verificationResultBox');
    const submitBtn = document.getElementById('submitProduceBtn');
    if (!resultBox) return;

    resultBox.style.display = 'block';

    if (!check.capacity_available) {
      resultBox.className = 'card';
      resultBox.style.borderLeft = '5px solid var(--status-critical)';
      resultBox.style.background = '#ffebee';
      resultBox.innerHTML = `
        <div style="font-weight: 700; color: #b71c1c; margin-bottom: 4px;">⛔ Capacity Exceeded</div>
        <div style="font-size: 0.88rem; color: #b71c1c;">${check.message}</div>
      `;
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    if (!check.compatible) {
      resultBox.className = 'card';
      resultBox.style.borderLeft = '5px solid var(--status-critical)';
      resultBox.style.background = '#ffebee';
      resultBox.innerHTML = `
        <div style="font-weight: 700; color: #b71c1c; margin-bottom: 4px;">⚠️ Incompatible Produce</div>
        <div style="font-size: 0.88rem; color: #b71c1c; margin-bottom: 6px;">${check.message}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">
          Currently stored in chamber: <strong>${check.currently_stored_crops.join(', ')}</strong>.
        </div>
      `;
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    // Success: Compatible & Space Available!
    resultBox.className = 'card';
    resultBox.style.borderLeft = '5px solid var(--primary)';
    resultBox.style.background = 'var(--primary-light)';
    resultBox.innerHTML = `
      <div style="font-weight: 700; color: var(--primary-dark); margin-bottom: 4px;">✓ Produce Compatible & Space Confirmed</div>
      <div style="font-size: 0.88rem; color: var(--primary-dark); margin-bottom: 6px;">${check.message}</div>
      <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; justify-content: space-between;">
        <span>Common Safe Band: <strong>${check.common_min_temp}–${check.common_max_temp}°C</strong></span>
        <span>Target Cooling: <strong>${check.recommended_target_temp}°C</strong></span>
      </div>
    `;
    if (submitBtn) submitBtn.disabled = false;
  },

  async submitProduce(e) {
    if (e) e.preventDefault();
    const cropId = parseInt(document.getElementById('cropSelect').value);
    const quantityKg = parseFloat(document.getElementById('quantityInput').value);
    const condition = document.getElementById('conditionSelect').value;
    const harvestDate = document.getElementById('harvestDateInput').value || new Date().toISOString().split('T')[0];
    const farmerNotes = document.getElementById('notesInput').value;

    const payload = {
      storage_unit_id: this.unitId,
      crop_id: cropId,
      quantity_kg: quantityKg,
      initial_condition: condition,
      harvest_date: harvestDate,
      farmer_notes: farmerNotes
    };

    try {
      const res = await window.api.addProduce(this.unitId, payload);
      window.app.showToast(`Successfully stored ${quantityKg} kg produce in ${window.app.activeUnitCode}!`, 'success');
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1000);
    } catch (err) {
      window.app.showToast(err.message || 'Failed to add produce', 'error');
    }
  }
};

window.produce = produce;
document.addEventListener('DOMContentLoaded', () => produce.init());
