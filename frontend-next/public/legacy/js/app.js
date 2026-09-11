// ==============================================================================
// SMART STORAGE - GLOBAL APPLICATION SHELL (app.js)
// ==============================================================================

const app = {
  activeUnitCode: localStorage.getItem('smart_storage_unit') || 'NER-CS-001',
  activeUnitId: parseInt(localStorage.getItem('smart_storage_unit_id') || '1'),
  language: localStorage.getItem('smart_storage_lang') || 'en',

  init() {
    this.setupNetworkMonitoring();
    this.highlightActiveNavigation();
    this.registerServiceWorker();
    this.injectSimulationModal();
    this.updateHeaderUI();
  },

  setLanguage(lang) {
    this.language = lang;
    localStorage.setItem('smart_storage_lang', lang);
    window.location.reload();
  },

  setActiveUnit(unitCode, unitId) {
    this.activeUnitCode = unitCode;
    this.activeUnitId = unitId;
    localStorage.setItem('smart_storage_unit', unitCode);
    localStorage.setItem('smart_storage_unit_id', unitId.toString());
  },

  setupNetworkMonitoring() {
    const banner = document.getElementById('offlineBanner');
    const updateStatus = () => {
      if (!navigator.onLine) {
        if (banner) banner.classList.add('visible');
        this.showToast('You are currently offline. Local cache active.', 'warning');
      } else {
        if (banner) banner.classList.remove('visible');
        window.api.syncOfflineQueue();
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  },

  highlightActiveNavigation() {
    const currentPath = window.location.pathname.split('/').pop() || 'home.html';
    const navLinks = document.querySelectorAll('.bottom-nav .nav-item');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  },

  updateHeaderUI() {
    const unitEl = document.getElementById('headerUnitCode');
    if (unitEl) {
      unitEl.textContent = this.activeUnitCode;
    }
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Interactive Hardware Simulation Modal for Judge Demos
  injectSimulationModal() {
    if (document.getElementById('simModal')) return;

    const modalHtml = `
      <div id="simModal" class="modal-overlay">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3 class="card-title">⚙️ Hardware Demo Controls</h3>
            <button class="modal-close-btn" onclick="app.closeSimModal()">✕</button>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
            Simulate physical sensors & cold storage conditions for live judge demonstration without physical ESP32.
          </p>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label class="form-label">Chamber Temperature Spike / Drop</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button class="btn btn-secondary" onclick="simulation.setTemp(16.5)" style="background: #ffebee; color: #b71c1c;">
                  🔥 Force 16.5°C (High Alert)
                </button>
                <button class="btn btn-secondary" onclick="simulation.setTemp(11.5)" style="background: #e8f5e9; color: #1b5e20;">
                  ❄️ Reset 11.5°C (Safe)
                </button>
              </div>
            </div>

            <div>
              <label class="form-label">Door Magnetic Reed Switch</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button class="btn btn-secondary" onclick="simulation.toggleDoor(true)">
                  🚪 Open Door
                </button>
                <button class="btn btn-secondary" onclick="simulation.toggleDoor(false)">
                  🔒 Seal Door
                </button>
              </div>
            </div>

            <div>
              <label class="form-label">Battery Power Reserve</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button class="btn btn-secondary" onclick="simulation.setBattery(22.0)" style="background: #fff3e0; color: #e65100;">
                  🪫 Drain to 22% (Warning)
                </button>
                <button class="btn btn-secondary" onclick="simulation.setBattery(85.0)">
                  🔋 Restore 85% (Solar)
                </button>
              </div>
            </div>

            <div>
              <label class="form-label">Rural Network Connectivity</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button class="btn btn-secondary" onclick="simulation.toggleOffline(true)">
                  📡 Simulate Disconnect
                </button>
                <button class="btn btn-secondary" onclick="simulation.toggleOffline(false)">
                  📶 Reconnect Online
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);
  },

  openSimModal() {
    const modal = document.getElementById('simModal');
    if (modal) modal.classList.add('open');
  },

  closeSimModal() {
    const modal = document.getElementById('simModal');
    if (modal) modal.classList.remove('open');
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        // Service worker optional for local file testing
      });
    }
  }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
