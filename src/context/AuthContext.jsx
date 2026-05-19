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
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
      setError(null);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Initial session restore ───────────────────────────────────────────────
  // Always calls /users/me/ — the HttpOnly cookie is sent automatically
  // by the browser. Server is the single source of truth for session validity.
  // No localStorage gate, no cookie sniffing — just ask the server.
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await authService.getCurrentUser();
        const userData = response.user ?? response;
        setUser(userData);
        setError(null);
      } catch (err) {
        // 401 = no valid session, stay logged out silently
        // 5xx / network error = also fail silently, don't boot the user
        if (err.status !== 401) {
          console.error('Failed to restore session:', err);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

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

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser()
      const userData = response.user ?? response
      setUser(userData)
    } catch (err) {
      console.error('refreshUser failed:', err)
    }
  }, [])

  // ─── Context value ─────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
      updateUser,
      refreshUser,
      isAuthenticated: !!user,
      isAdmin: user?.is_admin === true,
      isVerified: user?.is_verified === true,
      isTasker: user?.status === 'tasker',
    }),
    [user, loading, error, login, logout, updateUser, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};