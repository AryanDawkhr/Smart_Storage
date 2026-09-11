// ==============================================================================
// SMART STORAGE - MARKET & TRANSPORT LOGISTICS (market.js)
// ==============================================================================

const marketPage = {
  async init() {
    await this.loadMarketPrices();
    await this.loadTransportOptions();
  },

  async loadMarketPrices() {
    const container = document.getElementById('marketPricesContainer');
    if (!container) return;

    try {
      const items = await window.api.getMarketData();
      container.innerHTML = items.map(m => {
        const isRising = m.price_trend === 'rising';
        const isFalling = m.price_trend === 'falling';
        const trendIcon = isRising ? '📈 Rising' : isFalling ? '📉 Falling' : '➡️ Stable';
        const trendCol = isRising ? 'var(--primary)' : isFalling ? 'var(--status-critical)' : 'var(--text-muted)';

        return `
          <div class="card" style="margin-bottom: 12px;">
            <div class="card-header" style="margin-bottom: 6px;">
              <div class="card-title" style="font-size: 1rem;">
                <span>🌾</span> ${m.crop_name}
              </div>
              <span style="font-size: 0.78rem; font-weight: 700; color: ${trendCol};">
                ${trendIcon}
              </span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
              📍 ${m.market_name}, ${m.district} (${m.distance_km || 40} km away)
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; background: #f8f9fa; padding: 8px 12px; border-radius: 8px;">
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Modal Mandi Rate</span>
                <span style="font-size: 1.35rem; font-weight: 800; color: var(--primary-dark);">₹${m.modal_price.toFixed(0)}</span>
                <span style="font-size: 0.78rem; color: var(--text-muted);">/ Quintal</span>
              </div>
              <div style="text-align: right; font-size: 0.82rem; color: var(--text-muted);">
                <div>Range: ₹${m.min_price.toFixed(0)} - ₹${m.max_price.toFixed(0)}</div>
                <div>Arrivals: ${m.arrival_tonnes} tonnes</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('Error loading market prices:', e);
    }
  },

  async loadTransportOptions() {
    const container = document.getElementById('transportOptionsContainer');
    if (!container) return;

    try {
      const options = await window.api.getTransportData();
      container.innerHTML = options.map(t => `
        <div class="card" style="margin-bottom: 12px; border-left: 5px solid var(--accent-blue);">
          <div class="card-header" style="margin-bottom: 6px;">
            <div class="card-title" style="font-size: 0.95rem;">
              <span>🚚</span> ${t.transport_mode}
            </div>
            <span class="status-pill safe">AVAILABLE</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 6px;">
            Route: <strong>${t.origin_village} ➔ ${t.destination_market}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">
            <span>⏱️ Est. Travel: ${t.estimated_hours} hours (${t.distance_km} km)</span>
            <span>💰 Cost: ₹${t.cost_per_quintal}/qtl</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px;">
            📅 Departure: ${t.departure_time}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); pt: 8px;">
            <span style="font-size: 0.82rem; font-weight: 600;">${t.provider_name}</span>
            <a href="tel:${t.provider_phone}" class="btn btn-secondary" style="height: 32px; padding: 0 12px; font-size: 0.8rem; width: auto; text-decoration: none;">
              📞 Call Driver
            </a>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.warn('Error loading transport options:', e);
    }
  }
};

window.marketPage = marketPage;
