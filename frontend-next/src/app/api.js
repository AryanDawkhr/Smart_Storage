const API_URL = process.env.NEXT_PUBLIC_API_URL || (
  typeof window === 'undefined'
    ? 'http://localhost:8000'
    : `${window.location.protocol}//${window.location.hostname}:8000`
);

export const API_BASE = API_URL.replace(/\/+$/, '');

export function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('smart_storage_token') || '';
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('smart_storage_user') || 'null'); } catch { return null; }
}

export function setSession(data) {
  localStorage.setItem('smart_storage_token', data.access_token);
  localStorage.setItem('smart_storage_user', JSON.stringify(data.user));
}

export function clearSession() {
  localStorage.removeItem('smart_storage_token');
  localStorage.removeItem('smart_storage_user');
}

export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.message || `Request failed (${response.status})`);
  return data;
}

export const api = {
  login: (mobile, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ mobile, password }) }),
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  units: () => request('/api/storage'),
  unit: (id) => request(`/api/storage/${id}`),
  unitByQr: (code) => request(`/api/storage/qr/${encodeURIComponent(code)}`),
  produce: (id) => request(`/api/storage/${id}/produce`),
  farmerProduce: () => request('/api/produce/farmer'),
  crops: () => request('/api/crops'),
  compatibility: (payload) => request('/api/compatibility/check', { method: 'POST', body: JSON.stringify(payload) }),
  addProduce: (id, payload) => request(`/api/storage/${id}/produce`, { method: 'POST', body: JSON.stringify(payload) }),
  checkout: (id) => request(`/api/produce/${id}/checkout`, { method: 'POST' }),
  telemetry: (id) => request(`/api/storage/${id}/telemetry?limit=20`),
  alerts: (unitId, activeOnly) => request(`/api/alerts?${unitId ? `unit_id=${unitId}&` : ''}active_only=${activeOnly}`),
  resolveAlert: (id) => request(`/api/alerts/${id}/resolve`, { method: 'PATCH' }),
  history: (allFarmers) => request(`/api/history?all_farmers=${allFarmers}`),
  market: () => request('/api/market'),
  transport: () => request('/api/transport'),
  recommendations: () => request('/api/recommendations'),
  simulation: () => request('/api/simulation/status'),
  controlSimulation: (payload) => request('/api/simulation/control', { method: 'POST', body: JSON.stringify(payload) }),
};

export function connectTelemetry(onMessage) {
  const socket = new WebSocket(`${API_BASE.replace('http', 'ws')}/ws/telemetry`);
  socket.onmessage = (event) => { try { onMessage(JSON.parse(event.data)); } catch {} };
  return socket;
}
