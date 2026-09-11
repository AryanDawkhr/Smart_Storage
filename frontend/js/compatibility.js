// ==============================================================================
// SMART STORAGE - CROP COMPATIBILITY EXPLORER (compatibility.js)
// ==============================================================================

const compatibility = {
  unitId: window.app.activeUnitId,
  crops: [],

  async init() {
    this.crops = await window.api.getCrops();
    this.populateSelectors();
    await this.renderChamberCropsSummary();
  },

  populateSelectors() {
    const selectA = document.getElementById('cropASelect');
    const selectB = document.getElementById('cropBSelect');

    const options = this.crops.map(c => `
      <option value="${c.id}">${c.name} (${c.profile?.min_temp}–${c.profile?.max_temp}°C)</option>
    `).join('');

    if (selectA) selectA.innerHTML = '<option value="">-- Select Crop 1 --</option>' + options;
    if (selectB) selectB.innerHTML = '<option value="">-- Select Crop 2 --</option>' + options;
  },

  async renderChamberCropsSummary() {
    const container = document.getElementById('activeChamberCropsBox');
    if (!container) return;

    try {
      const records = await window.api.getChamberProduce(this.unitId);
      if (!records || records.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.88rem;">Chamber currently empty. Any crop safe operating band can be initialized.</div>`;
        return;
      }

      container.innerHTML = records.map(r => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 0.9rem;">
          <span>📦 <strong>${r.crop_name}</strong> (${r.quantity_kg} kg)</span>
          <span style="font-weight: 600; color: var(--primary-dark);">Safe: 10–13°C</span>
        </div>
      `).join('');
    } catch (e) {
      console.warn(e);
    }
  },

  checkPair() {
    const cropAId = parseInt(document.getElementById('cropASelect')?.value);
    const cropBId = parseInt(document.getElementById('cropBSelect')?.value);
    const resultBox = document.getElementById('pairCheckResult');

    if (!cropAId || !cropBId || !resultBox) return;

    const cropA = this.crops.find(c => c.id === cropAId);
    const cropB = this.crops.find(c => c.id === cropBId);

    if (!cropA || !cropB) return;

    const minTemp = Math.max(cropA.profile.min_temp, cropB.profile.min_temp);
    const maxTemp = Math.min(cropA.profile.max_temp, cropB.profile.max_temp);

    const isCompatible = minTemp <= maxTemp;

    resultBox.style.display = 'block';
    if (isCompatible) {
      const target = ((minTemp + maxTemp) / 2.0).toFixed(1);
      resultBox.style.background = 'var(--primary-light)';
      resultBox.style.borderLeft = '5px solid var(--primary)';
      resultBox.innerHTML = `
        <div style="font-weight: 800; color: var(--primary-dark); font-size: 1.05rem; margin-bottom: 4px;">✓ COMPATIBLE</div>
        <div style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 8px;">
          ${cropA.name} and ${cropB.name} share an overlapping safe temperature band of <strong>${minTemp}–${maxTemp}°C</strong>.
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          Recommended cooling target: <strong>${target}°C</strong>
        </div>
      `;
    } else {
      resultBox.style.background = '#ffebee';
      resultBox.style.borderLeft = '5px solid var(--status-critical)';
      resultBox.innerHTML = `
        <div style="font-weight: 800; color: var(--status-critical); font-size: 1.05rem; margin-bottom: 4px;">⛔ INCOMPATIBLE</div>
        <div style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 8px;">
          ${cropA.name} (${cropA.profile.min_temp}–${cropA.profile.max_temp}°C) and ${cropB.name} (${cropB.profile.min_temp}–${cropB.profile.max_temp}°C) have no common safe range.
        </div>
        <div style="font-size: 0.85rem; color: #b71c1c;">
          Storable in separate chambers to avoid chilling injury or rapid decay.
        </div>
      `;
    }
  }
};

window.compatibility = compatibility;
