import { createContext, useContext } from 'react';
import type { UserProfile } from '../types';

export type ViewType = 'chat' | 'login' | 'signup';

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentView: ViewType;
  navigateTo: (view: ViewType) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (
    credential?: string,
    profile?: Partial<UserProfile>,
    accessToken?: string
  ) => Promise<{ success: boolean; error?: string }>;
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
