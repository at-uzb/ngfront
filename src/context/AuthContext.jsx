import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../lib/service';
import { useMemo } from 'react';

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

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = authService.getUser();
      
      if (storedUser && authService.isAuthenticated()) {
        try {
          const response = await authService.getCurrentUser();
          const userData = response.user || response;
          setUser(userData);
          setError(null);
        } catch (err) {
          console.error('Failed to load user:', err);
          if (err.status === 401) {
            await logout();
          }
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (credentials) => {
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
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Call the logout endpoint to clear HttpOnly cookies
      await authService.logout();
      setUser(null);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear user state even if logout API fails
      setUser(null);
      setError(null);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = useMemo(() => ({
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin === true,
    isVerified: user?.is_verified === true,
  }), [user, loading, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};