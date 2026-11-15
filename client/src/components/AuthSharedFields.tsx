import React, { useEffect, useRef } from 'react';
import { getPasswordStrength } from '../utils/authHelpers';
import { useAuth } from '../context/useAuth';

export const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  const strength = getPasswordStrength(password);
  return (
    <div className="flex flex-col gap-1 mt-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-gray-500">Password strength:</span>
        <span className="font-semibold text-gray-700">{strength.label}</span>
      </div>
      <div className="grid grid-cols-4 gap-1 h-1">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              step <= strength.score ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

interface GoogleAuthSectionProps {
  mode: 'login' | 'signup';
  rememberMe?: boolean;
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
  onError: (msg: string | null) => void;
}

export const GoogleAuthSection: React.FC<GoogleAuthSectionProps> = ({
  mode,
  rememberMe = true,
  disabled = false,
  onBusyChange,
  onError,
}) => {
  const { loginWithGoogle } = useAuth();
  const rememberMeRef = useRef(rememberMe);
  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '966040753081-ni3e6p4sen6pau4mb6eeeglmmfdjbe8g.apps.googleusercontent.com';

  useEffect(() => {
    rememberMeRef.current = rememberMe;
  }, [rememberMe]);

  useEffect(() => {
    if (!googleClientId) return;

    let attempts = 0;
    const initGis = () => {
      const win = window as any;
      if (win.google?.accounts?.id) {
        if (!win.__nebulaGisInitialized) {
          try {
            win.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: async (response: any) => {
                if (response.credential) {
                  onBusyChange(true);
                  onError(null);
                  const result = await loginWithGoogle(
                    response.credential,
                    undefined,
                    undefined,
                    rememberMeRef.current
                  );
                  onBusyChange(false);
                  if (!result.success) {
                    onError(result.error || 'Google authentication failed');
                  }
                }
              },
            });
            win.__nebulaGisInitialized = true;
          } catch (err) {
            console.warn('Google GIS init notice:', err);
          }
        }
        return true;
      }
      return false;
    };

    if (!initGis()) {
      const timer = setInterval(() => {
        attempts += 1;
        if (initGis() || attempts > 25) {
          clearInterval(timer);
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [googleClientId, loginWithGoogle, onBusyChange, onError]);

  const handleGoogleClick = () => {
    onError(null);
    const win = window as any;
    if (googleClientId && win.google?.accounts?.oauth2) {
      try {
        const tokenClient = win.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              if (
                tokenResponse.error !== 'popup_closed_by_user' &&
                tokenResponse.error !== 'access_denied'
              ) {
                onError(
                  `Google Sign-In error: ${tokenResponse.error_description || tokenResponse.error}`
                );
              }
              return;
            }
            if (tokenResponse?.access_token) {
              onBusyChange(true);
              onError(null);
              const result = await loginWithGoogle(
                undefined,
                undefined,
                tokenResponse.access_token,
                rememberMeRef.current
              );
              onBusyChange(false);
              if (!result.success) {
                onError(result.error || 'Google authentication failed');
              }
            }
          },
          error_callback: (err: any) => {
            if (err?.type && err.type !== 'popup_closed') {
              onError('Google Sign-In popup was blocked. Please allow popups for this site.');
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (e) {
        console.warn('Google OAuth2 popup notice:', e);
      }
    }

    if (googleClientId && win.google?.accounts?.id) {
      try {
        win.google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn('Google prompt notice:', e);
      }
    }

    onError('Google Sign-In service is still loading. Please wait a second and try clicking again.');
  };

  return (
    <>
      <div className="flex flex-col gap-1 w-full">
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={disabled}
          className="w-full h-9.5 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E5E5] hover:border-gray-300 text-xs font-semibold text-[#0D0D0D] shadow-2xs transition-all duration-150 active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2.5 text-[9.5px] text-gray-400 font-medium tracking-wider uppercase select-none">
        <div className="flex-1 h-[1px] bg-[#E5E5E5]" />
        <span>or with email</span>
        <div className="flex-1 h-[1px] bg-[#E5E5E5]" />
      </div>
    </>
  );
};
