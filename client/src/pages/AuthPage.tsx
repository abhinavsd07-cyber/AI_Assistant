import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Lock,
  User,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth, type ViewType } from '../context/useAuth';

type AuthViewMode = 'login' | 'signup' | 'forgot-password';

interface AuthPageProps {
  initialMode?: AuthViewMode;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: '', color: 'bg-transparent' };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 10) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    case 2:
      return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    case 3:
      return { score: 3, label: 'Good', color: 'bg-sky-600' };
    case 4:
    default:
      return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  }
}

const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
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

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const {
    isAuthenticated,
    currentView,
    navigateTo,
    login,
    register,
    loginWithGoogle,
    requestPasswordReset,
    confirmPasswordReset,
  } = useAuth();

  const mode: AuthViewMode =
    currentView === 'signup'
      ? 'signup'
      : currentView === 'forgot-password'
        ? 'forgot-password'
        : currentView === 'login'
          ? 'login'
          : initialMode;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const rememberMeRef = useRef(rememberMe);
  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '966040753081-ni3e6p4sen6pau4mb6eeeglmmfdjbe8g.apps.googleusercontent.com';

  useEffect(() => {
    rememberMeRef.current = rememberMe;
  }, [rememberMe]);

  const switchView = (
    nextMode: AuthViewMode,
    options?: { keepSuccess?: boolean; step?: 'request' | 'confirm' }
  ) => {
    setErrorMessage(null);
    if (!options?.keepSuccess) {
      setSuccessMessage(null);
    }
    setIsSubmitting(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowResetPassword(false);
    if (nextMode !== 'forgot-password') {
      setResetStep('request');
      setResetCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
    } else if (options?.step) {
      setResetStep(options.step);
    }
    navigateTo(nextMode as ViewType);
  };

  // Google Identity Services (GIS) initialization for Sign In & Create Account views
  useEffect(() => {
    if (!googleClientId || mode === 'forgot-password') return;

    let attempts = 0;
    const initGis = () => {
      const win = window as any;
      if (win.google?.accounts?.id && googleBtnRef.current) {
        try {
          win.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              if (response.credential) {
                setIsSubmitting(true);
                setErrorMessage(null);
                const result = await loginWithGoogle(
                  response.credential,
                  undefined,
                  undefined,
                  rememberMeRef.current
                );
                setIsSubmitting(false);
                if (!result.success) {
                  setErrorMessage(result.error || 'Google login failed');
                }
              }
            },
          });

          win.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            width: 360,
            text: mode === 'login' ? 'continue_with' : 'signup_with',
          });
        } catch (err) {
          console.warn('Google GIS init notice:', err);
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
  }, [mode, googleClientId, loginWithGoogle]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim();

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (password.length < 6 || password.length > 128) {
        setErrorMessage('Password must be between 6 and 128 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify both fields.');
        return;
      }

      setIsSubmitting(true);
      const res = await register(name.trim(), normalizedEmail, password, true);
      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account.');
      } else {
        setSuccessMessage('Account created successfully! Redirecting...');
      }
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const res = await login(normalizedEmail, password, rememberMe);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Invalid email or password.');
    } else {
      setSuccessMessage('Welcome back! Redirecting...');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (resetStep === 'request') {
      setIsSubmitting(true);
      const res = await requestPasswordReset(normalizedEmail);
      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Could not send reset code.');
      } else {
        setSuccessMessage(res.message || 'Check your inbox for the 8-character reset code.');
        setResetStep('confirm');
      }
      return;
    }

    const trimmedCode = resetCode.trim().toUpperCase();
    if (!trimmedCode) {
      setErrorMessage('Please enter the reset code sent to your email.');
      return;
    }
    if (resetNewPassword.length < 6 || resetNewPassword.length > 128) {
      setErrorMessage('New password must be between 6 and 128 characters long.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage('New passwords do not match. Please verify both fields.');
      return;
    }

    setIsSubmitting(true);
    const res = await confirmPasswordReset(normalizedEmail, trimmedCode, resetNewPassword);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Could not reset password.');
    } else {
      setSuccessMessage(res.message || 'Password updated! Sign in with your new password.');
      switchView('login', { keepSuccess: true });
    }
  };

  const handleGoogleClick = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

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
                setErrorMessage(
                  `Google Sign-In error: ${tokenResponse.error_description || tokenResponse.error}`
                );
              }
              return;
            }
            if (tokenResponse?.access_token) {
              setIsSubmitting(true);
              setErrorMessage(null);
              const result = await loginWithGoogle(
                undefined,
                undefined,
                tokenResponse.access_token,
                mode === 'login' ? rememberMe : true
              );
              setIsSubmitting(false);
              if (!result.success) {
                setErrorMessage(result.error || 'Google login failed');
              }
            }
          },
          error_callback: (err: any) => {
            if (err?.type && err.type !== 'popup_closed') {
              setErrorMessage('Google Sign-In popup was blocked. Please allow popups for this site.');
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

    setErrorMessage(
      'Google Sign-In service is still loading. Please wait a second and try clicking again.'
    );
  };

  const headingTitle =
    mode === 'forgot-password'
      ? resetStep === 'request'
        ? 'Reset your password'
        : 'Set a new password'
      : mode === 'login'
        ? 'Welcome back'
        : 'Create your account';

  const headingSubtitle =
    mode === 'forgot-password'
      ? resetStep === 'request'
        ? "Enter your account email and we'll send an 8-character reset code"
        : 'Enter the code sent to your email and choose a new password'
      : mode === 'login'
        ? 'Sign in to access your saved conversations and models'
        : 'Start exploring next-generation cognitive intelligence';

  const signupPasswordsMismatch =
    mode === 'signup' && confirmPassword.length > 0 && password !== confirmPassword;
  const resetPasswordsMismatch =
    mode === 'forgot-password' &&
    resetStep === 'confirm' &&
    resetConfirmPassword.length > 0 &&
    resetNewPassword !== resetConfirmPassword;

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#FCFCFC] text-[#0D0D0D] relative overflow-x-hidden selection:bg-[#E5E5E5] selection:text-[#0D0D0D]">
      {/* Ambient neutral backdrop gradient */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40 select-none"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 25%, rgba(15, 23, 42, 0.04) 0%, transparent 65%)`,
        }}
      />

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full px-6 py-2.5 md:px-10 flex items-center justify-between border-b border-[#E5E5E5]/60 bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <img
              src="/nebula-logo.png"
              alt="Nebula Logo"
              className="w-full h-full object-contain drop-shadow-[0_1px_4px_rgba(15,23,42,0.16)]"
            />
          </div>
          <span className="font-bold text-base tracking-tight text-[#0D0D0D]">Nebula AI</span>
        </div>

        <button
          type="button"
          onClick={() => switchView(mode === 'login' ? 'signup' : 'login')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-black py-1.5 px-3.5 rounded-full bg-white border border-[#E5E5E5] hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
        >
          <span>{mode === 'login' ? 'Create Account' : 'Sign In'}</span>
          <ArrowRight size={13} />
        </button>
      </header>

      {/* Main Centered Auth Studio */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-3 sm:py-5">
        <div className="w-full max-w-[410px] mx-auto flex flex-col items-center">
          {/* Card Container */}
          <div className="w-full bg-white rounded-3xl border border-[#E5E5E5] shadow-xl shadow-black/[0.03] p-5 sm:p-7 flex flex-col gap-3.5">
            {/* Centered Brand & Glowing Orb */}
            <div className="flex flex-col items-center text-center">
              <button
                type="button"
                aria-label="Nebula AI"
                onClick={() => (isAuthenticated ? navigateTo('chat') : switchView('login'))}
                className="relative mb-2 group cursor-pointer bg-transparent border-0 p-0"
              >
                <div className="absolute -inset-3 bg-radial from-slate-200/50 via-transparent to-transparent rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <img
                    src="/nebula-logo.png"
                    alt="Nebula AI Logo"
                    className="w-full h-full object-contain animate-cosmic-orb"
                  />
                </div>
              </button>

              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0D0D0D]">
                {headingTitle}
              </h1>
              <p className="text-[11.5px] text-gray-500 mt-0.5 max-w-[320px]">{headingSubtitle}</p>
            </div>

            {/* Segmented Mode Switcher: Sign In / Create Account (hidden on Forgot Password screen) */}
            {mode !== 'forgot-password' ? (
              <>
                <div className="grid grid-cols-2 p-1 bg-[#F4F4F5] rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                      mode === 'login'
                        ? 'bg-white text-[#0D0D0D] font-semibold shadow-xs'
                        : 'text-gray-500 hover:text-[#0D0D0D]'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => switchView('signup')}
                    className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                      mode === 'signup'
                        ? 'bg-white text-[#0D0D0D] font-semibold shadow-xs'
                        : 'text-gray-500 hover:text-[#0D0D0D]'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Google Authentication Button */}
                <div className="flex flex-col gap-1 w-full">
                  <div ref={googleBtnRef} className="w-full hidden" />
                  <button
                    type="button"
                    onClick={handleGoogleClick}
                    disabled={isSubmitting}
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
                    <span>Continue with Google</span>
                  </button>
                </div>

                {/* Subtle Divider */}
                <div className="flex items-center gap-2.5 text-[9.5px] text-gray-400 font-medium tracking-wider uppercase select-none">
                  <div className="flex-1 h-[1px] bg-[#E5E5E5]" />
                  <span>or with email</span>
                  <div className="flex-1 h-[1px] bg-[#E5E5E5]" />
                </div>
              </>
            ) : (
              /* Two-Step Progress Switcher on Forgot Password View */
              <div className="grid grid-cols-2 p-1 bg-[#F4F4F5] rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setResetStep('request');
                  }}
                  className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                    resetStep === 'request'
                      ? 'bg-white text-[#0D0D0D] font-semibold shadow-xs'
                      : 'text-gray-500 hover:text-[#0D0D0D]'
                  }`}
                >
                  1. Request Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setResetStep('confirm');
                  }}
                  className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                    resetStep === 'confirm'
                      ? 'bg-white text-[#0D0D0D] font-semibold shadow-xs'
                      : 'text-gray-500 hover:text-[#0D0D0D]'
                  }`}
                >
                  2. New Password
                </button>
              </div>
            )}

            {/* Error & Success Feedback Alerts */}
            {errorMessage && (
              <div
                role="alert"
                className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-150"
              >
                <AlertCircle size={14} className="shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div
                role="status"
                className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in duration-150"
              >
                <CheckCircle2 size={14} className="shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Dedicated View 1 & 2: Sign In / Create Account Form */}
            {mode !== 'forgot-password' ? (
              <form onSubmit={handleAuthSubmit} noValidate className="flex flex-col gap-2.5 text-xs">
                {mode === 'signup' && (
                  <div className="flex flex-col gap-1 animate-in fade-in">
                    <label htmlFor="auth-name" className="text-[11px] font-semibold text-gray-700">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <User size={13} className="absolute left-3.5 text-gray-400" />
                      <input
                        id="auth-name"
                        type="text"
                        autoComplete="name"
                        placeholder="Alex Mercer"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label htmlFor="auth-email" className="text-[11px] font-semibold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={13} className="absolute left-3.5 text-gray-400" />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auth-password" className="text-[11px] font-semibold text-gray-700">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchView('forgot-password', { step: 'request' })}
                        className="text-[10.5px] text-gray-500 hover:text-black hover:underline transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <Lock size={13} className="absolute left-3.5 text-gray-400" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-9.5 pl-9.5 pr-9.5 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>

                  {mode === 'signup' && <PasswordStrengthMeter password={password} />}
                </div>

                {mode === 'signup' && (
                  <div className="flex flex-col gap-1 animate-in fade-in">
                    <label
                      htmlFor="auth-confirm-password"
                      className="text-[11px] font-semibold text-gray-700"
                    >
                      Confirm Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock size={13} className="absolute left-3.5 text-gray-400" />
                      <input
                        id="auth-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full h-9.5 pl-9.5 pr-9.5 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:ring-1 transition-all ${
                          signupPasswordsMismatch
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                            : 'border-[#E5E5E5] focus:border-black focus:ring-black/10'
                        }`}
                      />
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    {signupPasswordsMismatch && (
                      <span className="text-[10px] text-rose-600 font-medium">
                        Passwords do not match
                      </span>
                    )}
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      type="checkbox"
                      id="rememberMeCheckbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-[#0D0D0D] cursor-pointer"
                    />
                    <label
                      htmlFor="rememberMeCheckbox"
                      className="text-[11px] text-gray-600 cursor-pointer select-none"
                    >
                      Remember my session on this device
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 mt-1 rounded-xl text-xs font-semibold text-white bg-[#0D0D0D] hover:bg-[#262626] shadow-xs transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Sign In to Nebula' : 'Create Free Account'}</span>
                      <ArrowRight size={13} className="text-white" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Dedicated View 3: Focused Forgot / Reset Password Form */
              <form onSubmit={handleForgotSubmit} noValidate className="flex flex-col gap-2.5 text-xs">
                <div className="flex flex-col gap-1">
                  <label htmlFor="reset-email" className="text-[11px] font-semibold text-gray-700">
                    Account Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={13} className="absolute left-3.5 text-gray-400" />
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                    />
                  </div>
                </div>

                {resetStep === 'confirm' && (
                  <>
                    <div className="flex flex-col gap-1 animate-in fade-in">
                      <label htmlFor="reset-code" className="text-[11px] font-semibold text-gray-700">
                        8-Character Reset Code
                      </label>
                      <div className="relative flex items-center">
                        <KeyRound size={13} className="absolute left-3.5 text-gray-400" />
                        <input
                          id="reset-code"
                          type="text"
                          autoComplete="one-time-code"
                          placeholder="E.g. A1B2C3D4"
                          maxLength={12}
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                          className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs font-mono tracking-wider uppercase focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 animate-in fade-in">
                      <label
                        htmlFor="reset-new-password"
                        className="text-[11px] font-semibold text-gray-700"
                      >
                        New Password
                      </label>
                      <div className="relative flex items-center">
                        <Lock size={13} className="absolute left-3.5 text-gray-400" />
                        <input
                          id="reset-new-password"
                          type={showResetPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Minimum 6 characters"
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          className="w-full h-9.5 pl-9.5 pr-9.5 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                        />
                        <button
                          type="button"
                          aria-label={showResetPassword ? 'Hide new password' : 'Show new password'}
                          onClick={() => setShowResetPassword((v) => !v)}
                          className="absolute right-3 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                        >
                          {showResetPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      <PasswordStrengthMeter password={resetNewPassword} />
                    </div>

                    <div className="flex flex-col gap-1 animate-in fade-in">
                      <label
                        htmlFor="reset-confirm-password"
                        className="text-[11px] font-semibold text-gray-700"
                      >
                        Confirm New Password
                      </label>
                      <div className="relative flex items-center">
                        <Lock size={13} className="absolute left-3.5 text-gray-400" />
                        <input
                          id="reset-confirm-password"
                          type={showResetPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Repeat new password"
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          className={`w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:ring-1 transition-all ${
                            resetPasswordsMismatch
                              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                              : 'border-[#E5E5E5] focus:border-black focus:ring-black/10'
                          }`}
                        />
                      </div>
                      {resetPasswordsMismatch && (
                        <span className="text-[10px] text-rose-600 font-medium">
                          Passwords do not match
                        </span>
                      )}
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 mt-1 rounded-xl text-xs font-semibold text-white bg-[#0D0D0D] hover:bg-[#262626] shadow-xs transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{resetStep === 'request' ? 'Send Reset Code' : 'Update Password'}</span>
                      <ArrowRight size={13} className="text-white" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500">
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="inline-flex items-center gap-1 hover:text-black font-medium cursor-pointer"
                  >
                    <ArrowLeft size={12} />
                    <span>Back to Sign In</span>
                  </button>

                  {resetStep === 'request' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setResetStep('confirm');
                      }}
                      className="text-gray-600 hover:text-black underline cursor-pointer"
                    >
                      Have a code?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setResetStep('request');
                      }}
                      className="text-gray-600 hover:text-black underline cursor-pointer"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Mode Switcher Footer */}
            <div className="text-center text-xs text-gray-500 pt-1 border-t border-[#E5E5E5]/60">
              {mode === 'forgot-password' ? (
                <span>
                  Remembered your password?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="text-[#0D0D0D] font-semibold hover:underline transition-colors cursor-pointer"
                  >
                    Sign in here →
                  </button>
                </span>
              ) : mode === 'login' ? (
                <span>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('signup')}
                    className="text-[#0D0D0D] font-semibold hover:underline transition-colors cursor-pointer"
                  >
                    Sign up for free →
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="text-[#0D0D0D] font-semibold hover:underline transition-colors cursor-pointer"
                  >
                    Sign in here →
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Trust and Security Details */}
          <div className="flex flex-col items-center gap-1.5 mt-4 text-center">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>256-bit TLS Encryption • Cloud Synced with MongoDB Atlas</span>
            </div>
            <p className="text-[10px] text-gray-400 max-w-xs">
              By continuing, you agree to Nebula&apos;s{' '}
              <button
                type="button"
                onClick={() => setLegalModal('terms')}
                className="underline hover:text-gray-600 cursor-pointer"
              >
                Terms
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setLegalModal('privacy')}
                className="underline hover:text-gray-600 cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </div>
      </main>

      {legalModal && (
        <div
          onClick={() => setLegalModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white border border-[#E5E5E5] p-5 shadow-2xl text-xs text-gray-700 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-[#0D0D0D]">
                {legalModal === 'terms' ? 'Nebula AI Terms of Service' : 'Nebula AI Privacy Policy'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="text-gray-400 hover:text-black font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            {legalModal === 'terms' ? (
              <p className="leading-relaxed">
                Nebula AI provides conversational AI, visual node-graph synthesis, and in-browser code execution tools. Do not submit sensitive credentials, payment card numbers, or regulated data you do not intend to process.
              </p>
            ) : (
              <p className="leading-relaxed">
                Account credentials and chat sessions are transmitted over TLS and stored in MongoDB Atlas. You can inspect, clear, or delete persisted MemGPT memories and your full account anytime inside Settings.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full py-2.5 text-center text-[10.5px] text-gray-400 border-t border-[#E5E5E5]/50">
        © 2026 Nebula AI • Powered by Google Gemini 3.8 Flash
      </footer>
    </div>
  );
};

export default AuthPage;
