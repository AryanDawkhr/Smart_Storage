// ==============================================================================
// SMART STORAGE - STORAGE HISTORY & AGE TRACKING (history.js)
// ==============================================================================

const historyPage = {
  async init() {
    await this.loadHistory();
  },

  async loadHistory(allFarmers = false) {
    const container = document.getElementById('historyListContainer');
    if (!container) return;

    try {
      const records = await window.api.getHistory(null, allFarmers);
      if (!records || records.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-size: 36px; margin-bottom: 8px;">📜</div>
            <div style="font-weight: 700; color: var(--text-main);">No Storage History</div>
            <div style="font-size: 0.85rem;">You haven't stored any produce batches yet.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = records.map(r => {
        const isStored = r.status === 'stored';
        const nearing = r.is_nearing_limit;

        return `
          <div class="card" style="margin-bottom: 14px; border-left: 5px solid ${nearing ? 'var(--status-warning)' : isStored ? 'var(--primary)' : '#9e9e9e'};">
            <div class="card-header" style="margin-bottom: 8px;">
              <div class="card-title">
                <span>📦</span> ${r.crop_name} (${r.quantity_kg} kg)
              </div>
              <span class="status-pill ${isStored ? (nearing ? 'warning' : 'safe') : 'offline'}">
                ${isStored ? (nearing ? 'LIMIT NEARING' : 'SAFE') : 'RETRIEVED'}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px;">
              <div>
                <div>Unit: <strong>${r.unit_code}</strong></div>
                <div>Stored: <strong>${r.storage_age_human} ago</strong></div>
              </div>
              <div>
                <div>Safe Shelf-Life Left: <strong style="color: ${nearing ? 'var(--status-warning)' : 'var(--primary-dark)'};">${r.remaining_safe_human}</strong></div>
                <div>Condition: <strong>${r.current_condition}</strong></div>
              </div>
            </div>

            ${r.farmer_notes ? `
              <div style="font-size: 0.8rem; background: #f8f9fa; padding: 6px 10px; border-radius: 6px; margin-bottom: 10px; font-style: italic; color: var(--text-muted);">
                "${r.farmer_notes}"
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; pt: 8px; border-top: 1px solid var(--border-color);">
              <span style="font-size: 0.78rem; color: var(--text-muted);">Intake Date: ${r.harvest_date}</span>
              ${isStored ? `
                <button class="btn btn-secondary" style="height: 34px; padding: 0 14px; font-size: 0.82rem; width: auto;" onclick="historyPage.checkout(${r.id}, '${r.crop_name}')">
                  Retrieve / Checkout
                </button>
              ` : `
                <span style="font-size: 0.78rem; color: var(--text-muted);">Checked out</span>
              `}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('Error loading history:', e);
    }
  },

  async checkout(recordId, cropName) {
    if (!confirm(`Are you retrieving ${cropName} from cold storage? This will release the chamber space.`)) return;

    try {
      await window.api.checkoutProduce(recordId);
      window.app.showToast(`Produce retrieved successfully. Chamber capacity updated.`, 'success');
      await this.loadHistory();
    } catch (e) {
      window.app.showToast(e.message || 'Failed to checkout produce', 'error');
    }
  }
};

window.historyPage = historyPage;
