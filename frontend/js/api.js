// ==============================================================================
// SMART STORAGE - API CLIENT & OFFLINE QUEUE (api.js)
// ==============================================================================

const API_BASE = 'http://127.0.0.1:8000';

const api = {
  getToken() {
    return localStorage.getItem('smart_storage_token') || '';
  },

  setToken(token) {
    localStorage.setItem('smart_storage_token', token);
  },

  clearToken() {
    localStorage.removeItem('smart_storage_token');
    localStorage.removeItem('smart_storage_user');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/register', {
        ...options,
        headers
      });

      // Handle 401 Unauthorized
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        console.warn('Authentication expired.');
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || data.message || `Request failed (${response.status})`);
      }

      // Cache successful GET responses in localStorage for offline access
      if (!options.method || options.method === 'GET') {
        try {
          localStorage.setItem(`cache_${endpoint}`, JSON.stringify(data));
        } catch (e) {
          // Ignore cache quota errors
        }
      }

      return data;
    } catch (err) {
      // If offline or network error on GET request, serve cached data if available
      if (!options.method || options.method === 'GET') {
        const cached = localStorage.getItem(`cache_${endpoint}`);
        if (cached) {
          console.warn(`[Offline Fallback] Serving cached data for ${endpoint}`);
          return JSON.parse(cached);
        }
      }

      // If offline on POST/write request, queue action for future sync
      if (options.method && options.method !== 'GET') {
        this.queueOfflineAction(endpoint, options);
      }

      throw err;
    }
  },

  // Offline queue management
  queueOfflineAction(endpoint, options) {
    try {
      const queue = JSON.parse(localStorage.getItem('smart_storage_offline_queue') || '[]');
      queue.push({
        id: Date.now(),
        endpoint,
        options,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('smart_storage_offline_queue', JSON.stringify(queue));
      if (window.app) {
        window.app.showToast('You are offline. Action saved locally and will sync when online.', 'warning');
      }
    } catch (e) {
      console.error('Failed to queue offline action', e);
    }
  },

  async syncOfflineQueue() {
    const queueStr = localStorage.getItem('smart_storage_offline_queue');
    if (!queueStr) return;

    try {
      const queue = JSON.parse(queueStr);
      if (!queue.length) return;

      console.log(`[Offline Sync] Attempting to sync ${queue.length} pending actions...`);
      const remaining = [];

      for (const item of queue) {
        try {
          await this.request(item.endpoint, item.options);
          console.log(`[Offline Sync] Synced action: ${item.endpoint}`);
        } catch (e) {
          remaining.push(item);
        }
      }

      localStorage.setItem('smart_storage_offline_queue', JSON.stringify(remaining));
      if (remaining.length === 0 && window.app) {
        window.app.showToast('All offline changes synced with storage unit!', 'success');
      }
    } catch (err) {
      console.error('Offline sync error', err);
    }
  },

  // Storage Unit Endpoints
  getStorageUnits() {
    return this.request('/api/storage');
  },

  getStorageUnit(id) {
    return this.request(`/api/storage/${id}`);
  },

  getStorageUnitByQR(code) {
    return this.request(`/api/storage/qr/${encodeURIComponent(code)}`);
  },

  getUnitCapacity(id) {
    return this.request(`/api/storage/${id}/capacity`);
  },

  // Produce Endpoints
  addProduce(unitId, payload) {
    return this.request(`/api/storage/${unitId}/produce`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getChamberProduce(unitId) {
    return this.request(`/api/storage/${unitId}/produce`);
  },

  getFarmerProduce() {
    return this.request('/api/produce/farmer');
  },

  checkoutProduce(recordId) {
    return this.request(`/api/produce/${recordId}/checkout`, {
      method: 'POST'
    });
  },

  // Compatibility Endpoints
  getCrops() {
    return this.request('/api/crops');
  },

  checkCompatibility(unitId, cropId, quantityKg) {
    return this.request('/api/compatibility/check', {
      method: 'POST',
      body: JSON.stringify({
        storage_unit_id: parseInt(unitId),
        candidate_crop_id: parseInt(cropId),
        quantity_kg: parseFloat(quantityKg)
      })
    });
  },

  // Telemetry Endpoints
  getTelemetry(unitId, limit = 24) {
    return this.request(`/api/storage/${unitId}/telemetry?limit=${limit}`);
  },

  // Alerts
  getAlerts(unitId = null, activeOnly = false) {
    let url = '/api/alerts?';
    if (unitId) url += `unit_id=${unitId}&`;
    if (activeOnly) url += `active_only=true`;
    return this.request(url);
  },

  resolveAlert(alertId) {
    return this.request(`/api/alerts/${alertId}/resolve`, {
      method: 'PATCH'
    });
  },

  // History
  getHistory(unitId = null, allFarmers = false) {
    let url = '/api/history?';
    if (unitId) url += `storage_unit_id=${unitId}&`;
    if (allFarmers) url += `all_farmers=true`;
    return this.request(url);
  },

  // Market & Transport
  getMarketData(cropId = null) {
    let url = '/api/market';
    if (cropId) url += `?crop_id=${cropId}`;
    return this.request(url);
  },

  getTransportData() {
    return this.request('/api/transport');
  },

  // Recommendations
  getRecommendation(recordId) {
    return this.request(`/api/recommendations/${recordId}`);
  },

  getFarmerRecommendations() {
    return this.request('/api/recommendations');
  },

  // Hardware Simulation Controls
  getSimulationStatus() {
    return this.request('/api/simulation/status');
  },

  controlSimulation(payload) {
    return this.request('/api/simulation/control', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

window.api = api;
