// ==============================================================================
// SMART STORAGE - SIMULATION CONTROLLER (simulation.js)
// ==============================================================================

const simulation = {
  async setTemp(tempVal) {
    try {
      await window.api.controlSimulation({ force_temperature: tempVal });
      window.app.showToast(`Simulated temperature set to ${tempVal}°C. Cooling responding.`, 'info');
      window.app.closeSimModal();
    } catch (e) {
      window.app.showToast('Failed to update simulation temp', 'error');
    }
  },

  async toggleDoor(openState) {
    try {
      await window.api.controlSimulation({ force_door_open: openState });
      window.app.showToast(`Door simulated as ${openState ? 'OPEN' : 'CLOSED'}.`, openState ? 'warning' : 'success');
      window.app.closeSimModal();
    } catch (e) {
      window.app.showToast('Failed to toggle door simulation', 'error');
    }
  },

  async setBattery(batPct) {
    try {
      await window.api.controlSimulation({ force_battery_pct: batPct });
      window.app.showToast(`Battery reserve simulated at ${batPct}%.`, batPct < 30 ? 'warning' : 'info');
      window.app.closeSimModal();
    } catch (e) {
      window.app.showToast('Failed to update battery simulation', 'error');
    }
  },

  async toggleOffline(isOffline) {
    try {
      await window.api.controlSimulation({ force_offline: isOffline });
      window.app.showToast(
        isOffline ? 'Internet disconnected. Local cooling continues autonomously.' : 'Internet connection restored. Synced.',
        isOffline ? 'warning' : 'success'
      );
      window.app.closeSimModal();
    } catch (e) {
      window.app.showToast('Failed to toggle connectivity simulation', 'error');
    }
  }
};

window.simulation = simulation;
