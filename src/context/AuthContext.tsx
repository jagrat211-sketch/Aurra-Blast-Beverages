import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { useCartStore } from '../store/useCartStore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; requiresVerification?: boolean; email?: string; devVerificationCode?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success?: boolean; user?: User; requiresVerification?: boolean; email?: string; message: string; devVerificationCode?: string; redirectTo?: string }>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; user: User }>;
  resendCode: (email: string) => Promise<{ success: boolean; devVerificationCode?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (name: string) => Promise<{ success: boolean; user: User }>;
  updateAddress: (address: string) => Promise<{ success: boolean; user: User; message: string }>;
  adminLogin: (username: string, password: string) => Promise<{ success: boolean; user: User }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateAvatar: (avatarUrl: string) => Promise<{ success: boolean; user: User }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const setCartUser = useCartStore((state) => state.setUser);

  const fetchCurrentUser = useCallback(async () => {
    try {
      try {
        const res = await api.getMe();
        if (res?.user) {
          setUser(res.user);
          setCartUser(res.user);
          return;
        }
      } catch {
        // ignore
      }

      try {
        const cached = localStorage.getItem('aurra_auth_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          setUser(parsed);
          setCartUser(parsed);
          return;
        }
      } catch {
        // ignore
      }

      setUser(null);
      setCartUser(null);
    } finally {
      setLoading(false);
    }
  }, [setCartUser]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
    }
    return res;
  };

  // FLOW FIX: After successful signup, user is NOT automatically logged in.
  // Instead, redirected to login page to manually enter credentials.
  const signup = async (name: string, email: string, password: string) => {
    const res = await api.signup({ name, email, password });
    // Do NOT set user session here!
    return res;
  };

  const verifyEmail = async (email: string, code: string) => {
    const res = await api.verifyEmail({ email, code });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
    }
    return res;
  };

  const resendCode = async (email: string) => {
    return await api.resendCode(email);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setUser(null);
      setCartUser(null);
    }
  };

  const updateProfile = async (name: string) => {
    const res = await api.updateProfile({ name });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
    }
    return res;
  };

  const updateAddress = async (address: string) => {
    const res = await api.updateAddress({ address });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
    }
    return res;
  };

  const adminLogin = async (username: string, password: string) => {
    const res = await api.adminLogin({ username, password });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
    }
    return res;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    return await api.changePassword({ currentPassword, newPassword });
  };

  const updateAvatar = async (avatarUrl: string) => {
    const res = await api.updateAvatar({ avatarUrl });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        verifyEmail,
        resendCode,
        logout,
        refreshUser: fetchCurrentUser,
        updateProfile,
        updateAddress,
        adminLogin,
        changePassword,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
