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
  updateProfile: (data: string | { name?: string; address?: string; contactNo?: string; email?: string }) => Promise<{ success: boolean; user: User }>;
  updateAddress: (address: string) => Promise<{ success: boolean; user: User; message: string }>;
  updateContactNo: (contactNo: string) => Promise<{ success: boolean; user: User; message: string }>;
  updateDeliveryInfo: (address: string, contactNo: string) => Promise<{ success: boolean; user: User }>;
  adminLogin: (username: string, password: string) => Promise<{ success: boolean; user: User }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateAvatar: (avatarUrl: string, file?: File, remove?: boolean) => Promise<{ success: boolean; user: User; url?: string | null }>;
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
          const cachedContact = localStorage.getItem('aurra_user_contact');
          const cachedAddress = localStorage.getItem('aurra_user_address');
          if (cachedContact && !parsed.contact_no) parsed.contact_no = cachedContact;
          if (cachedAddress && !parsed.delivery_address) parsed.delivery_address = cachedAddress;

          setUser(parsed);
          setCartUser(parsed);

          // Background Supabase sync to ensure fresh profile info (contact number, address, role)
          if (parsed?.email) {
            (async () => {
              try {
                const { supabase } = await import('../services/supabase.js');
                const { data } = await supabase
                  .from('users')
                  .select('*')
                  .ilike('email', parsed.email.trim())
                  .maybeSingle();

                if (data) {
                  const rawContact = data['contact_no.'] ?? data.contact_no ?? parsed.contact_no;
                  const freshContact = rawContact != null ? String(rawContact) : '';
                  const freshAddress = data.delivery_address ?? parsed.delivery_address ?? '';
                  const freshName = data.name || parsed.name;
                  const refreshed: User = {
                    ...parsed,
                    id: data.id ? String(data.id) : parsed.id,
                    name: freshName,
                    contact_no: freshContact,
                    delivery_address: freshAddress,
                    user_profile: data.user_profile || parsed.user_profile,
                    avatar_url: data.avatar_url || data.user_profile || parsed.avatar_url,
                  };
                  setUser(refreshed);
                  setCartUser(refreshed);
                  try {
                    localStorage.setItem('aurra_auth_user', JSON.stringify(refreshed));
                    if (freshContact) localStorage.setItem('aurra_user_contact', freshContact);
                    else localStorage.removeItem('aurra_user_contact');
                    if (freshAddress) localStorage.setItem('aurra_user_address', freshAddress);
                    else localStorage.removeItem('aurra_user_address');
                  } catch {}
                }
              } catch {
                // ignore
              }
            })();
          }
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
      try { localStorage.setItem('aurra_auth_user', JSON.stringify(res.user)); } catch {}
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
      try { localStorage.setItem('aurra_auth_user', JSON.stringify(res.user)); } catch {}
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

  const updateProfile = async (data: string | { name?: string; address?: string; contactNo?: string; email?: string }) => {
    const payload = typeof data === 'string' ? { name: data } : data;
    const res = await api.updateProfile(payload);
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
      try { localStorage.setItem('aurra_auth_user', JSON.stringify(res.user)); } catch {}
    }
    return res;
  };

  const updateAddress = async (address: string) => {
    const res = await api.updateAddress({ address });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
      try { localStorage.setItem('aurra_auth_user', JSON.stringify(res.user)); } catch {}
    }
    return res;
  };

  const updateContactNo = async (contactNo: string) => {
    const res = await api.updateContactNo({ contactNo });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
      try { localStorage.setItem('aurra_auth_user', JSON.stringify(res.user)); } catch {}
    }
    return res;
  };

  const updateDeliveryInfo = async (address: string, contactNo: string) => {
    const res = await api.updateDeliveryInfo({ address, contactNo });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
      try { localStorage.setItem('aurra_auth_user', JSON.stringify(res.user)); } catch {}
    }
    return res as { success: boolean; user: User };
  };

  const adminLogin = async (username: string, password: string) => {
    const res = await api.adminLogin({ username, password });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
      try { localStorage.setItem('aurra_auth_user', JSON.stringify(res.user)); } catch {}
    }
    return res;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    return await api.changePassword({ currentPassword, newPassword });
  };

  const updateAvatar = async (avatarUrl: string, file?: File, remove?: boolean) => {
    const res = await api.updateAvatar({ avatarUrl, file, remove });
    if (res.user) {
      setUser(res.user);
      setCartUser(res.user);
      localStorage.setItem('aurra_auth_user', JSON.stringify(res.user));
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
        updateContactNo,
        updateDeliveryInfo,
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
