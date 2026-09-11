// ==============================================================================
// SMART STORAGE - AUTHENTICATION CONTROLLER (auth.js)
// ==============================================================================

const auth = {
  getUser() {
    const userStr = localStorage.getItem('smart_storage_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    // Fallback default for demo convenience: Farmer Ramesh Bora
    return {
      id: 1,
      name: "Ramesh Bora",
      mobile: "9876543210",
      village: "Mayong Village",
      district: "Morigaon",
      state: "Assam",
      preferred_language: "en"
    };
  },

  setUser(user) {
    localStorage.setItem('smart_storage_user', JSON.stringify(user));
  },

  isLoggedIn() {
    return !!window.api.getToken() || !!localStorage.getItem('smart_storage_user');
  },

  async login(mobile, password) {
    try {
      const res = await window.api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ mobile, password })
      });

      window.api.setToken(res.access_token);
      this.setUser(res.user);
      return res;
    } catch (err) {
      throw err;
    }
  },

  async register(data) {
    try {
      const res = await window.api.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      window.api.setToken(res.access_token);
      this.setUser(res.user);
      return res;
    } catch (err) {
      throw err;
    }
  },

  // Judge Demo Quick Login Shortcut
  async quickDemoLogin(farmerCode = 'A') {
    let mobile = '9876543210'; // Farmer A: Ramesh Bora
    if (farmerCode === 'B') {
      mobile = '9876543211'; // Farmer B: Pranab Das
    } else if (farmerCode === 'C') {
      mobile = '9876543212'; // Farmer C: Mary Lyngdoh
    }

    try {
      await this.login(mobile, 'farmer123');
      window.location.href = 'home.html';
    } catch (e) {
      // Offline fallback demo user set
      const dummyUsers = {
        'A': { id: 1, name: "Ramesh Bora", mobile: "9876543210", village: "Mayong Village", district: "Morigaon", state: "Assam" },
        'B': { id: 2, name: "Pranab Das", mobile: "9876543211", village: "Mayong Village", district: "Morigaon", state: "Assam" },
        'C': { id: 3, name: "Mary Lyngdoh", mobile: "9876543212", village: "Mawkynrew Village", district: "East Khasi Hills", state: "Meghalaya" }
      };
      this.setUser(dummyUsers[farmerCode] || dummyUsers['A']);
      window.location.href = 'home.html';
    }
  },

  logout() {
    window.api.clearToken();
    window.location.href = 'index.html';
  }
};

window.auth = auth;
