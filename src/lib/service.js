import api, { clearAuthStorage } from './api';

// Non-HttpOnly flag cookie your backend sets alongside the HttpOnly auth cookies.
// JS can read this — it contains no sensitive data, just a presence signal.
const SESSION_FLAG_COOKIE = 'is_logged_in';

class AuthService {
  // ─── Cookie Helpers ────────────────────────────────────────────────────────

  /**
   * Check for the lightweight session flag cookie set by the backend.
   * Since the actual JWT is HttpOnly, this is the only JS-readable signal
   * that a session exists without making a network request.
   */
  hasSessionCookie() {
    return document.cookie
      .split(';')
      .some((c) => c.trim().startsWith(`${SESSION_FLAG_COOKIE}=`));
  }

  /**
   * Clear the session flag cookie client-side on logout.
   * The HttpOnly JWT cookies are cleared by the backend logout endpoint.
   */
  clearSessionCookie() {
    document.cookie = `${SESSION_FLAG_COOKIE}=;expires=${new Date(0).toUTCString()};path=/`;
  }

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
      // regardless of whether the server-side call worked
      console.error('Logout endpoint failed:', error);
    } finally {
      // ✅ Always runs — clears auth keys surgically, never the whole storage
      clearAuthStorage();
      this.clearSessionCookie();
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

  // ─── Error Normalizer ──────────────────────────────────────────────────────

  handleError(error) {
    // Preserve the stack trace by extending a real Error object
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