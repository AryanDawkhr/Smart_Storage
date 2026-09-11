// ==============================================================================
// SMART STORAGE - ALERTS CONTROLLER (alerts.js)
// ==============================================================================

const alertsPage = {
  unitId: window.app.activeUnitId,

  async init() {
    await this.loadAlerts();
  },

  async loadAlerts(activeOnly = false) {
    const container = document.getElementById('alertsListContainer');
    if (!container) return;

    try {
      const list = await window.api.getAlerts(null, activeOnly);
      if (!list || list.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-size: 36px; margin-bottom: 8px;">🛡️</div>
            <div style="font-weight: 700; color: var(--text-main);">No Active Alerts</div>
            <div style="font-size: 0.85rem;">All monitored cold storage units operating within safe boundaries.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = list.map(a => {
        const isCrit = a.severity === 'CRITICAL';
        const isWarn = a.severity === 'WARNING';
        const borderCol = isCrit ? 'var(--status-critical)' : isWarn ? 'var(--status-warning)' : 'var(--accent-blue)';
        const icon = isCrit ? '🚨' : isWarn ? '⚠️' : 'ℹ️';

        return `
          <div class="card" style="border-left: 5px solid ${borderCol}; margin-bottom: 12px; opacity: ${a.is_active ? '1' : '0.6'};">
            <div class="card-header" style="margin-bottom: 6px;">
              <div class="card-title" style="font-size: 0.95rem;">
                <span>${icon}</span> ${a.title}
              </div>
              <span class="status-pill ${isCrit ? 'critical' : isWarn ? 'warning' : 'safe'}">
                ${a.severity}
              </span>
            </div>
            <div style="font-size: 0.88rem; color: var(--text-main); margin-bottom: 8px;">
              ${a.message}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--text-muted);">
              <span>Unit: ${a.unit_code} • ${new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              ${a.is_active ? `
                <button class="btn btn-secondary" style="height: 32px; padding: 0 12px; font-size: 0.78rem; width: auto;" onclick="alertsPage.resolveAlert(${a.id})">
                  Acknowledge & Resolve
                </button>
              ` : `
                <span style="color: var(--primary);">✓ Resolved</span>
              `}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn(e);
    }
  },

  async resolveAlert(id) {
    try {
      await window.api.resolveAlert(id);
      window.app.showToast('Alert resolved successfully.', 'success');
      await this.loadAlerts();
    } catch (e) {
      window.app.showToast('Failed to resolve alert', 'error');
    }
  }
};

window.alertsPage = alertsPage;
