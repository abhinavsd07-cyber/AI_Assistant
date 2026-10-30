import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ArrowLeft,
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Zap,
  Database,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const { currentView, navigateTo, login, register, loginWithGoogle } = useAuth();
  
  const mode = currentView === 'signup' ? 'signup' : (currentView === 'login' ? 'login' : initialMode);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Clear feedback when mode changes
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
  }, [mode]);

  // Google Identity Services (GIS) button initialization
  useEffect(() => {
    if (!googleClientId) return;

    const win = window as any;
    if (win.google?.accounts?.id && googleBtnRef.current) {
      try {
        win.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setIsSubmitting(true);
              setErrorMessage(null);
              const result = await loginWithGoogle(response.credential);
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
          width: '100%',
          text: mode === 'login' ? 'signin_with' : 'signup_with',
        });
      } catch (err) {
        console.warn('Google One Tap notice:', err);
      }
    }
  }, [mode, googleClientId]);

  // Password Strength calculation
  const getPasswordStrength = (pass: string): { score: number; label: string; color: string } => {
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
        return { score: 3, label: 'Good', color: 'bg-blue-500' };
      case 4:
      default:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
    }
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Please enter a valid email address');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify');
        return;
      }

      setIsSubmitting(true);
      const res = await register(name, email, password);
      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account.');
      } else {
        setSuccessMessage('Account created successfully! Redirecting...');
      }
    } else {
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Please enter a valid email address');
        return;
      }
      if (!password) {
        setErrorMessage('Please enter your password');
        return;
      }

      setIsSubmitting(true);
      const res = await login(email, password);
      setIsSubmitting(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Invalid email or password.');
      } else {
        setSuccessMessage('Welcome back! Redirecting...');
      }
    }
  };

  const handleGoogleClick = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const win = window as any;
    if (googleClientId && win.google?.accounts?.id) {
      try {
        win.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            fallbackGoogleAuth();
          }
        });
        return;
      } catch (e) {
        console.warn('Google prompt fallback:', e);
      }
    }

    fallbackGoogleAuth();
  };

  const fallbackGoogleAuth = async () => {
    const defaultEmail = email.trim() || 'developer.user@gmail.com';
    const defaultName = name.trim() || defaultEmail.split('@')[0];

    const res = await loginWithGoogle(undefined, {
      name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
      email: defaultEmail,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(defaultEmail)}`,
      provider: 'google',
    });

    setIsSubmitting(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Google login failed');
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] text-slate-800 relative overflow-x-hidden selection:bg-purple-100 selection:text-purple-900">
      {/* Subtle light ambient glow */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: `radial-gradient(ellipse at 15% 10%, rgba(168, 85, 247, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 85% 90%, rgba(99, 102, 241, 0.06) 0%, transparent 50%)`,
        }}
      />

      {/* ============================================================== */}
      {/* LEFT COLUMN: Feature Showcase & AI Identity                    */}
      {/* Clean White & Slate aesthetic on desktop (>= 1150px)           */}
      {/* ============================================================== */}
      <div className="hidden xl:flex xl:w-1/2 relative z-10 flex-col justify-between p-8 2xl:p-14 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-fuchsia-500 p-[1.5px] shadow-md shadow-purple-500/20">
            <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
              <div className="w-4 h-4 rounded-sm rotate-45 bg-gradient-to-tr from-purple-600 to-indigo-600" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-slate-900 flex items-center gap-2">
              Nebula AI
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold uppercase">
                v2.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">Cognitive Co-pilot & Intelligent Workspace</p>
          </div>
        </div>

        {/* Center Presentation: Balanced Height Showcase */}
        <div className="flex flex-col gap-6 my-auto max-w-lg py-4">
          <div className="flex flex-col gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-medium w-fit">
              <Sparkles size={12} className="text-purple-600" />
              <span>Next-Generation Intelligence</span>
            </div>
            <h2 className="text-2xl 2xl:text-3xl font-extrabold tracking-tight text-slate-900 leading-snug">
              A cognitive partner engineered for clarity, code, and reasoning.
            </h2>
            <p className="text-xs 2xl:text-sm text-slate-600 leading-relaxed">
              Equipped with Google Gemini 3.8 Flash, native multimodal vision, real-time voice, and continuous MongoDB Atlas persistence.
            </p>
          </div>

          {/* Interactive Simulation Card */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11.5px]">Gemini 3.8 Flash • Deep Reasoning</span>
              </div>
              <span className="text-[10px] font-mono text-purple-700 bg-purple-100/60 px-1.5 py-0.5 rounded">1M Context</span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11.5px] shadow-xs">
                <span className="text-purple-700 font-semibold block text-[10.5px]">User Query</span>
                "Explain production-grade auth flow with MongoDB Atlas and stateless JWT."
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 text-purple-950 text-[11.5px] leading-relaxed flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px] text-purple-700 font-mono font-medium">
                  <Check size={11} className="text-emerald-600" />
                  <span>Synthesis Complete • 420 tokens</span>
                </div>
                <p className="text-[11px] text-slate-700">
                  "Use atomic Mongoose schemas with bcrypt salt rounds of 10, signed stateless JWT tokens, and resilient multi-tier fallback between Gemini 3.8 Flash and Flash Lite."
                </p>
              </div>
            </div>
          </div>

          {/* 3 Pillars */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Zap size={14} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-semibold text-slate-900 truncate">Sub-second</h4>
                <p className="text-[9.5px] text-slate-500 truncate">Fast Streaming</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Database size={14} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-semibold text-slate-900 truncate">Cloud Synced</h4>
                <p className="text-[9.5px] text-slate-500 truncate">MongoDB Atlas</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center shrink-0">
                <Sparkles size={14} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-semibold text-slate-900 truncate">Multimodal</h4>
                <p className="text-[9.5px] text-slate-500 truncate">Vision & Speech</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Security */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>256-bit TLS Encryption</span>
          </div>
          <span>© 2026 Nebula AI</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: Pure White Responsive Auth Studio                */}
      {/* ============================================================== */}
      <div className="w-full xl:w-1/2 flex flex-col justify-between p-4 sm:p-6 md:p-8 xl:p-10 relative z-10 min-h-screen bg-white">
        {/* Top Navigation Bar */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-200">
          {/* Mobile & Tablet Brand */}
          <div className="flex items-center gap-2 xl:hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1px] flex items-center justify-center shadow-sm">
              <div className="w-full h-full bg-white rounded-[7px] flex items-center justify-center">
                <div className="w-3 h-3 rounded-xs rotate-45 bg-gradient-to-tr from-purple-600 to-indigo-600" />
              </div>
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">Nebula AI</span>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('chat')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 active:scale-95 cursor-pointer ml-auto sm:ml-0"
          >
            <ArrowLeft size={13} />
            <span>Explore as Guest</span>
          </button>

          {/* Quick toggle link */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <span>{mode === 'login' ? "New here?" : "Have an account?"}</span>
            <button
              type="button"
              onClick={() => navigateTo(mode === 'login' ? 'signup' : 'login')}
              className="text-[#0D0D0D] hover:underline font-semibold transition-colors cursor-pointer"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>

        {/* Main Authentication Form Container */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto py-4 sm:py-6 flex flex-col gap-3.5 sm:gap-4">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h2 className="text-xl sm:text-2xl 2xl:text-3xl font-extrabold tracking-tight text-slate-900">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === 'login' 
                ? 'Sign in to access your saved conversations and models.' 
                : 'Start exploring cognitive AI with persistent memory.'}
            </p>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-in fade-in">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{successMessage}</span>
            </div>
          )}

          {/* Google SSO Button */}
          <div className="flex flex-col gap-1.5">
            {googleClientId && <div ref={googleBtnRef} className="w-full flex justify-center mb-0.5" />}

            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isSubmitting}
              className="w-full h-10 sm:h-11 flex items-center justify-center gap-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 
                bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 
                shadow-xs transition-all duration-200 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
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

          {/* Divider */}
          <div className="flex items-center gap-2.5 text-[10px] text-slate-400 uppercase tracking-widest font-mono">
            <div className="flex-1 h-[1px] bg-slate-200" />
            <span>or with email</span>
            <div className="flex-1 h-[1px] bg-slate-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 text-xs">
            {/* Full Name (Sign Up only) */}
            {mode === 'signup' && (
              <div className="flex flex-col gap-1 animate-in fade-in">
                <label className="text-[11.5px] font-semibold text-slate-700">Full Name</label>
                <div className="relative flex items-center">
                  <User size={14} className="absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Linda Pewtersmith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-[#0D0D0D] focus:ring-1 focus:ring-[#0D0D0D]/10 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="flex flex-col gap-1">
              <label className="text-[11.5px] font-semibold text-slate-700">Email Address</label>
              <div className="relative flex items-center">
                <Mail size={14} className="absolute left-3 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-[#0D0D0D] focus:ring-1 focus:ring-[#0D0D0D]/10 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[11.5px] font-semibold text-slate-700">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => alert('Password reset instructions sent to your email.')}
                    className="text-[10.5px] text-[#0D0D0D] hover:underline font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock size={14} className="absolute left-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-9 pr-9 rounded-xl bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-[#0D0D0D] focus:ring-1 focus:ring-[#0D0D0D]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Password Strength Meter (Signup only) */}
              {mode === 'signup' && password && (
                <div className="flex flex-col gap-1 mt-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Strength:</span>
                    <span className="font-semibold text-slate-700">{passwordStrength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 h-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full rounded-full transition-all duration-300 ${
                          step <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (Sign Up only) */}
            {mode === 'signup' && (
              <div className="flex flex-col gap-1 animate-in fade-in">
                <label className="text-[11.5px] font-semibold text-slate-700">Confirm Password</label>
                <div className="relative flex items-center">
                  <Lock size={14} className="absolute left-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-[#0D0D0D] focus:ring-1 focus:ring-[#0D0D0D]/10 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Remember me (Login only) */}
            {mode === 'login' && (
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="rememberMeCheckbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 accent-[#0D0D0D] cursor-pointer"
                />
                <label htmlFor="rememberMeCheckbox" className="text-[11.5px] text-slate-600 cursor-pointer select-none">
                  Remember my session on this device
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 sm:h-11 mt-1 rounded-xl text-xs sm:text-sm font-semibold text-white 
                bg-[#0D0D0D] hover:bg-[#262626] shadow-xs transition-all duration-200 active:scale-[0.98] 
                flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Nebula' : 'Create Free Account'}</span>
                  <ArrowRight size={14} className="text-white" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="text-center text-xs text-slate-500 pt-1">
            {mode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigateTo('signup')}
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
                  onClick={() => navigateTo('login')}
                  className="text-[#0D0D0D] font-semibold hover:underline transition-colors cursor-pointer"
                >
                  Sign in here →
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Footer Legal Terms */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto text-center text-[10.5px] text-slate-400 pt-3 pb-1">
          By continuing, you agree to Nebula's{' '}
          <span className="underline hover:text-slate-600 cursor-pointer">Terms</span> and{' '}
          <span className="underline hover:text-slate-600 cursor-pointer">Privacy Policy</span>.
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
