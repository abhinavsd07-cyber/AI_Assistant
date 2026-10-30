import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile, AuthResponse } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  openLoginModal: () => void;
  openSignupModal: () => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'signup') => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (credential?: string, profile?: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: { name?: string; avatar?: string; preferences?: Record<string, any> }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('nebula_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('nebula_token') || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Verify token on mount with /api/auth/me
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('nebula_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            setToken(storedToken);
            localStorage.setItem('nebula_user', JSON.stringify(data.user));
          } else {
            // Token rejected
            logout();
          }
        } else {
          logout();
        }
      } catch (err) {
        // Backend offline or network error: retain local cache if present
        console.warn('Backend auth check skipped:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const openLoginModal = useCallback(() => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  }, []);

  const openSignupModal = useCallback(() => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const handleAuthSuccess = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('nebula_token', newToken);
    localStorage.setItem('nebula_user', JSON.stringify(newUser));
    localStorage.setItem('nebula_user_name', newUser.name);
    localStorage.setItem('nebula_user_email', newUser.email);
    setIsAuthModalOpen(false);
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await res.json();
      if (!res.ok || !data.success || !data.token || !data.user) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }

      handleAuthSuccess(data.token, data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection to authentication service failed' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data: AuthResponse = await res.json();
      if (!res.ok || !data.success || !data.token || !data.user) {
        return { success: false, error: data.error || 'Failed to create account' };
      }

      handleAuthSuccess(data.token, data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection to authentication service failed' };
    }
  };

  const loginWithGoogle = async (credential?: string, profile?: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, profile }),
      });

      const data: AuthResponse = await res.json();
      if (!res.ok || !data.success || !data.token || !data.user) {
        return { success: false, error: data.error || 'Google sign-in could not be completed' };
      }

      handleAuthSuccess(data.token, data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to authentication server' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('nebula_token');
    localStorage.removeItem('nebula_user');
  };

  const updateProfile = async (data: { name?: string; avatar?: string; preferences?: Record<string, any> }) => {
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success || !resData.user) {
        return { success: false, error: resData.error || 'Failed to update profile' };
      }

      setUser(resData.user);
      localStorage.setItem('nebula_user', JSON.stringify(resData.user));
      if (resData.user.name) localStorage.setItem('nebula_user_name', resData.user.name);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        openLoginModal,
        openSignupModal,
        closeAuthModal,
        setAuthModalMode,
        login,
        register,
        loginWithGoogle,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

