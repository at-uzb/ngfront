import api, { clearAuthStorage } from './api';

class AuthService {

  // ─── Auth Actions ──────────────────────────────────────────────────────────

  async login(credentials) {
    try {
      const response = await api.post('/users/login/', credentials);
      if (response.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCurrentUser() {
    try {
      const response = await api.get('/users/me/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async refreshToken() {
    try {
      const response = await api.post('/users/refresh/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      await api.post('/users/logout/');
    } catch (error) {
      // Log but don't re-throw — local cleanup must always succeed
      console.error('Logout endpoint failed:', error);
    } finally {
      // Always runs regardless of API success/failure
      clearAuthStorage();
      this._clearSessionCookie();
    }
  }

  // ─── User Helpers ──────────────────────────────────────────────────────────

  getUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // ─── Cookie Helpers ────────────────────────────────────────────────────────

  // Clears the JS-readable session flag cookie set by the backend.
  // The HttpOnly JWT cookies are cleared by the backend logout endpoint.
  _clearSessionCookie() {
    document.cookie = `is_logged_in=;expires=${new Date(0).toUTCString()};path=/`;
  }

  // ─── Error Normalizer ──────────────────────────────────────────────────────

  handleError(error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'An unexpected error occurred';

    const normalized = new Error(message);
    normalized.status = error.response?.status ?? null;
    normalized.data = error.response?.data ?? null;

    return normalized;
  }
}

export default new AuthService();