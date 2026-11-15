import { createContext, useContext } from 'react';
import type { UserProfile } from '../types';

export type ViewType =
  | 'chat'
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'verify-otp'
  | 'reset-password';

const AUTH_KEYS = [
  'nebula_token',
  'nebula_user',
  'nebula_user_name',
  'nebula_user_email',
] as const;

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('nebula_token') || sessionStorage.getItem('nebula_token') || null;
  } catch {
    return null;
  }
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem('nebula_user') || sessionStorage.getItem('nebula_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isPersistentAuthSession(): boolean {
  try {
    return Boolean(localStorage.getItem('nebula_token'));
  } catch {
    return true;
  }
}

export function persistAuthSession(token: string, user: UserProfile, rememberMe = true): void {
  const primary = rememberMe ? localStorage : sessionStorage;
  const secondary = rememberMe ? sessionStorage : localStorage;

  try {
    for (const key of AUTH_KEYS) {
      secondary.removeItem(key);
    }
    primary.setItem('nebula_token', token);
    primary.setItem('nebula_user', JSON.stringify(user));
    primary.setItem('nebula_user_name', user.name);
    primary.setItem('nebula_user_email', user.email);
  } catch {
    // Ignore storage quota errors
  }
}

export function updateStoredUser(user: UserProfile): void {
  try {
    const target = localStorage.getItem('nebula_token') ? localStorage : sessionStorage;
    target.setItem('nebula_user', JSON.stringify(user));
    if (user.name) target.setItem('nebula_user_name', user.name);
    if (user.email) target.setItem('nebula_user_email', user.email);
  } catch {
    // Ignore storage errors
  }
}

export function clearAuthStorage(): void {
  try {
    for (const key of [...AUTH_KEYS, 'nebula_is_pro', 'nebula_sessions']) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentView: ViewType;
  navigateTo: (view: ViewType, urlPath?: string) => void;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (
    credential?: string,
    profile?: Partial<UserProfile>,
    accessToken?: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (
    email: string
  ) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
    code?: string;
    deliveredTo?: string;
    sandboxRedirected?: boolean;
  }>;
  verifyPasswordResetOtp: (
    email: string,
    otp: string
  ) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
    resetSessionToken?: string;
  }>;
  confirmPasswordReset: (
    email: string,
    resetSessionToken: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: {
    name?: string;
    avatar?: string;
    preferences?: Record<string, any>;
  }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string; message?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
