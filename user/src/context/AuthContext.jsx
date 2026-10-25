import React, { createContext, useState, useCallback, useMemo } from 'react';
import { authService } from '../services';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (studentId, password) => {
    setLoading(true);
    try {
      const result = await authService.login(studentId, password);
      if (result.success && result.user) {
        const isStaffOrAdmin = result.user.role === 'admin' || result.user.role === 'staff';
        if (isStaffOrAdmin) {
          return {
            success: false,
            message: 'This portal is for students only. Staff must access the Admin Dashboard at http://localhost:5500.',
          };
        }
        setCurrentUser(result.user);
        if (result.token) setToken(result.token);
        return { success: true, user: result.user, token: result.token };
      }
      return { success: false, message: result.message || 'Login failed' };
    } catch (err) {
      return { success: false, message: err.message || 'Network error' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      setCurrentUser(null);
      setToken(null);
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((patch) => {
    setCurrentUser(prev => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      token,
      loading,
      isAuthenticated: !!currentUser,
      login,
      logout,
      updateUser,
    }),
    [currentUser, token, loading, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
