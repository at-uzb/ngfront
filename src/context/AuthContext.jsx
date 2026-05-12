import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import authService from '../lib/service';

const AuthContext = createContext(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── logout defined first ──────────────────────────────────────────────────
  // Must be above useEffect since loadUser calls it on 401.
  // useCallback ensures its reference is stable across renders.
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout(); // always resolves — see service.js
      setUser(null);
      setError(null);
      return { success: true };
    } catch (err) {
      // authService.logout() shouldn't throw, but guard anyway
      console.error('Logout error:', err);
      setUser(null);
      setError(null);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Initial session restore ───────────────────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      // Fast-path: no session cookie means no active session.
      // Skips the network call entirely — no flicker, no wasted request.
      if (!authService.hasSessionCookie()) {
        setLoading(false);
        return;
      }

      try {
        const response = await authService.getCurrentUser();
        // Normalise response shape — handle both { user: {...} } and flat objects
        const userData = response.user ?? response;
        setUser(userData);

        // Keep localStorage in sync as a cache (not source of truth)
        localStorage.setItem('user', JSON.stringify(userData));
        setError(null);
      } catch (err) {
        console.error('Failed to restore session:', err);
        if (err.status === 401) {
          // Token is dead — full logout cleanup
          await logout();
        }
        // For other errors (network, 500) keep loading:false
        // but don't log the user out — might be a temporary outage
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [logout]); // logout is stable due to useCallback — safe dep

  // ─── Auth actions ──────────────────────────────────────────────────────────

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      const userData = response.user;
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── User update ──────────────────────────────────────────────────────────
  // localStorage write here is intentional — it's a cache update, not
  // the source of truth. The cookie + React state are the real authority.
  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  // ─── Context value ─────────────────────────────────────────────────────────
  // useMemo is now effective — login/logout/updateUser are stable references
  // so this object only re-creates when user/loading/error actually change.
  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
      updateUser,
      isAuthenticated: !!user,
      isAdmin: user?.is_admin === true,
      isVerified: user?.is_verified === true,
      isTasker: user?.is_tasker === true,
    }),
    [user, loading, error, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};