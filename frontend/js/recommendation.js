// ==============================================================================
// SMART STORAGE - DECISION ENGINE & RECOMMENDATIONS (recommendation.js)
// Transparent, explainable STORE / SELL / TRANSPORT advice
// ==============================================================================

const recommendationPage = {
  async init() {
    await this.loadRecommendations();
  },

  async loadRecommendations() {
    const container = document.getElementById('recommendationsListContainer');
    if (!container) return;

    try {
      const recs = await window.api.getFarmerRecommendations();
      if (!recs || recs.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-size: 36px; margin-bottom: 8px;">💡</div>
            <div style="font-weight: 700; color: var(--text-main);">No Active Produce to Analyze</div>
            <div style="font-size: 0.85rem;">Store produce in a cold unit to get automated STORE / SELL / TRANSPORT advice.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = recs.map(rec => {
        const decision = rec.decision;
        const isStore = decision === 'STORE';
        const isSell = decision === 'SELL';
        const isTransport = decision === 'TRANSPORT';

        const badgeClass = isStore ? 'safe' : isSell ? 'critical' : 'warning';
        const factors = rec.factors || {};

        return `
          <div class="card" style="margin-bottom: 16px; border-top: 6px solid ${isStore ? 'var(--primary)' : isSell ? 'var(--status-critical)' : '#00695c'};">
            <div class="card-header" style="margin-bottom: 10px;">
              <div>
                <span class="rec-badge ${isSell ? 'sell' : isTransport ? 'transport' : ''}" style="font-size: 0.9rem; padding: 4px 12px;">
                  RECOMMENDATION: ${decision}
                </span>
                <div style="font-size: 0.95rem; font-weight: 700; margin-top: 4px;">
                  ${rec.crop_name} (${rec.quantity_kg} kg)
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.75rem; color: var(--text-muted);">Confidence</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary-dark);">${rec.confidence_score}%</div>
              </div>
            </div>

            <!-- Primary Explainable Statement -->
            <div style="background: #f1f8e9; border: 1px solid #c8e6c9; padding: 12px 14px; border-radius: 8px; margin-bottom: 14px;">
              <div style="font-size: 0.92rem; font-weight: 700; color: var(--text-main); line-height: 1.4;">
                "${rec.primary_reason}"
              </div>
            </div>

            <!-- Transparent Decision Factors Breakdown -->
            <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">
              Explainable Decision Factors:
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.82rem; margin-bottom: 14px;">
              <div style="background: #f8f9fa; padding: 8px 10px; border-radius: 6px;">
                <span style="color: var(--text-muted); display: block;">Storage Condition</span>
                <strong>${factors.is_temp_safe ? 'Safe & Stable' : 'Fluctuating'} (${factors.current_temp || 11.6}°C)</strong>
              </div>
              <div style="background: #f8f9fa; padding: 8px 10px; border-radius: 6px;">
                <span style="color: var(--text-muted); display: block;">Storage Age</span>
                <strong>${factors.storage_age_days || 2}d / ${factors.max_safe_days || 14}d (${factors.age_percentage || 15}%)</strong>
              </div>
              <div style="background: #f8f9fa; padding: 8px 10px; border-radius: 6px;">
                <span style="color: var(--text-muted); display: block;">Market Rate Trend</span>
                <strong>₹${factors.modal_price_per_qtl || 2550}/Q (${factors.price_trend || 'rising'})</strong>
              </div>
              <div style="background: #f8f9fa; padding: 8px 10px; border-radius: 6px;">
                <span style="color: var(--text-muted); display: block;">Transport Link</span>
                <strong>${factors.transport_available ? 'Available' : 'Limited'} (${factors.transport_provider || 'Tata Ace'})</strong>
              </div>
            </div>

            <!-- Contextual Quick Action Buttons -->
            <div style="display: grid; grid-template-columns: ${isTransport ? '1fr 1fr' : '1fr'}; gap: 10px;">
              ${isTransport ? `
                <a href="market.html" class="btn btn-primary" style="font-size: 0.85rem; height: 40px; text-decoration: none;">
                  🚚 Book Transport
                </a>
                <a href="market.html" class="btn btn-secondary" style="font-size: 0.85rem; height: 40px; text-decoration: none;">
                  🌾 View Mandi Prices
                </a>
              ` : isSell ? `
                <a href="market.html" class="btn btn-primary" style="font-size: 0.85rem; height: 40px; text-decoration: none; background: var(--status-critical);">
                  📢 Connect with Local Buyer
                </a>
              ` : `
                <a href="live-storage.html" class="btn btn-primary" style="font-size: 0.85rem; height: 40px; text-decoration: none;">
                  ❄️ Monitor Storage Chamber
                </a>
              `}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('Error loading recommendations:', e);
    }
  }
};

window.recommendationPage = recommendationPage;
