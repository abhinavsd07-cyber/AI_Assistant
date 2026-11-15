import React, { useState, useEffect, useCallback } from 'react';
import {
  AuthContext,
  type ViewType,
  getStoredToken,
  getStoredUser,
  persistAuthSession,
  updateStoredUser,
  clearAuthStorage,
} from './useAuth';
import type { UserProfile, AuthResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

function getDefaultPathForView(view: ViewType): string {
  switch (view) {
    case 'login':
      return '/login';
    case 'signup':
      return '/signup';
    case 'forgot-password':
      return '/forgot-password';
    case 'reset-password':
      return '/reset-password';
    case 'chat':
    default:
      return '/';
  }
}

function getViewFromLocation(): ViewType {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  if (path === '/login' || hash.includes('login')) return 'login';
  if (path === '/signup' || hash.includes('signup')) return 'signup';
  if (path === '/forgot-password' || hash.includes('forgot-password')) return 'forgot-password';
  if (path === '/reset-password' || hash.includes('reset-password')) return 'reset-password';
  return 'chat';
}

function isPublicSharePath(): boolean {
  const path = window.location.pathname.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  return path.startsWith('/share/') || params.has('share');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<ViewType>(getViewFromLocation);

  useEffect(() => {
    const handlePopState = () => {
      const nextView = getViewFromLocation();
      if (getStoredToken() && (nextView === 'login' || nextView === 'signup')) {
        setCurrentView('chat');
        window.history.replaceState({ view: 'chat' }, '', '/');
        return;
      }
      setCurrentView(nextView);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((view: ViewType, urlPath?: string) => {
    setCurrentView(view);
    const targetUrl = urlPath || getDefaultPathForView(view);
    const currentFull = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentFull !== targetUrl) {
      window.history.pushState({ view }, '', targetUrl);
    }
  }, []);

  const redirectToLoginUrlIfNeeded = useCallback(() => {
    if (isPublicSharePath()) return;
    const viewFromUrl = getViewFromLocation();
    if (viewFromUrl === 'chat') {
      setCurrentView('login');
      window.history.replaceState({ view: 'login' }, '', '/login');
    } else {
      setCurrentView(viewFromUrl);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearAuthStorage();
    setCurrentView('login');
    if (window.location.pathname !== '/login' || window.location.search) {
      window.history.pushState({ view: 'login' }, '', '/login');
    }
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setToken(null);
        setUser(null);
        clearAuthStorage();
        redirectToLoginUrlIfNeeded();
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
            updateStoredUser(data.user);
            const urlView = getViewFromLocation();
            if (urlView === 'login' || urlView === 'signup') {
              setCurrentView('chat');
              window.history.replaceState({ view: 'chat' }, '', '/');
            }
          } else {
            logout();
          }
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Backend auth check skipped:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [logout, redirectToLoginUrlIfNeeded]);

  const handleAuthSuccess = (newToken: string, newUser: UserProfile, rememberMe = true) => {
    setToken(newToken);
    setUser(newUser);
    persistAuthSession(newToken, newUser, rememberMe);
    navigateTo('chat', '/');
  };

  const login = async (
    email: string,
    password: string,
    rememberMe = true
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });

      const data: AuthResponse = await res.json();
      if (!res.ok || !data.success || !data.token || !data.user) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }

      handleAuthSuccess(data.token, data.user, rememberMe);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection to authentication service failed' };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    rememberMe = true
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data: AuthResponse = await res.json();
      if (!res.ok || !data.success || !data.token || !data.user) {
        return { success: false, error: data.error || 'Failed to create account' };
      }

      handleAuthSuccess(data.token, data.user, rememberMe);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection to authentication service failed' };
    }
  };

  const loginWithGoogle = async (
    credential?: string,
    profile?: Partial<UserProfile>,
    accessToken?: string,
    rememberMe = true
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, profile, accessToken, rememberMe }),
      });

      const data: AuthResponse = await res.json();
      if (!res.ok || !data.success || !data.token || !data.user) {
        return { success: false, error: data.error || 'Google sign-in could not be completed' };
      }

      handleAuthSuccess(data.token, data.user, rememberMe);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to authentication server' };
    }
  };

  const requestPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; error?: string; message?: string; code?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          code: data.code,
          error: data.error || 'Could not send reset code.',
        };
      }
      return {
        success: true,
        message: data.message || 'Check your inbox for the reset code.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Unable to reach authentication server.',
      };
    }
  };

  const confirmPasswordReset = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim().toUpperCase(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not reset password.' };
      }
      return {
        success: true,
        message: data.message || 'Password updated! You can now sign in with your new password.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Unable to reach authentication server.',
      };
    }
  };

  const refreshUser = useCallback(async () => {
    const storedToken = getStoredToken();
    if (!storedToken) return;
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
          updateStoredUser(data.user);
        }
      }
    } catch {
      // ignore transient network failures
    }
  }, []);

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
      updateStoredUser(resData.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch(`${API_BASE}/api/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || 'Failed to update password' };
      }
      if (resData.user) {
        setUser(resData.user);
        updateStoredUser(resData.user);
      }
      return { success: true, message: resData.message || 'Password updated successfully.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update password' };
    }
  };

  const cancelSubscription = async () => {
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch(`${API_BASE}/api/payments/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || 'Could not cancel subscription' };
      }
      if (resData.user) {
        setUser(resData.user);
        updateStoredUser(resData.user);
        localStorage.removeItem(`nebula_is_pro_${resData.user.id}`);
      }
      localStorage.removeItem('nebula_is_pro');
      return { success: true, message: resData.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to cancel subscription' };
    }
  };

  const deleteAccount = async () => {
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch(`${API_BASE}/api/auth/account`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || 'Could not delete account' };
      }
      logout();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete account' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        currentView,
        navigateTo,
        login,
        register,
        loginWithGoogle,
        requestPasswordReset,
        confirmPasswordReset,
        logout,
        refreshUser,
        updateProfile,
        changePassword,
        cancelSubscription,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
