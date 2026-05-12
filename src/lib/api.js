import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fulminar.pythonanywhere.com';

// Keys owned by auth — the only ones we ever clear on session expiry
const AUTH_STORAGE_KEYS = ['user', 'access_token', 'refresh_token'];

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Token Refresh Queue ───────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve();
  });
  failedQueue = [];
};

const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint =
      originalRequest.url.includes('/logout/') ||
      originalRequest.url.includes('/refresh/');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      // Queue up requests that arrive while a refresh is already in-flight
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ Raw axios call — no authService import, no circular dependency
        await axios.post(
          `${API_BASE_URL}/users/refresh/`,
          {},
          { withCredentials: true }
        );

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        // ✅ Surgical cleanup — only auth keys, not the entire localStorage
        clearAuthStorage();

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?expired=true';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { clearAuthStorage };
export default api;