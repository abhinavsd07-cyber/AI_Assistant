import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const { currentView, navigateTo, login, register, loginWithGoogle } = useAuth();
  
  // Track active mode: 'login' | 'signup'
  const [internalMode, setInternalMode] = useState<'login' | 'signup'>(
    currentView === 'signup' ? 'signup' : (currentView === 'login' ? 'login' : initialMode)
  );

  useEffect(() => {
    if (currentView === 'signup' || currentView === 'login') {
      setInternalMode(currentView);
    }
  }, [currentView]);

  const mode = internalMode;

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

  // Clear alerts on mode switch
  const switchMode = (newMode: 'login' | 'signup') => {
    setInternalMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
  };

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
  }, [mode, googleClientId, loginWithGoogle]);

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
        return { score: 3, label: 'Good', color: 'bg-indigo-500' };
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
    setErrorMessage(null);

    const win = window as any;
    if (googleClientId && win.google?.accounts?.id) {
      try {
        win.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setErrorMessage(
              'Please click the Google Sign-In button above or sign in with your email and password.'
            );
          }
        });
        return;
      } catch (e) {
        console.warn('Google prompt notice:', e);
      }
    }

    setErrorMessage(
      'Google OAuth popup could not be opened. Please use the Google button or sign in with your email and password.'
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#FCFCFC] text-[#0D0D0D] relative overflow-x-hidden selection:bg-[#E5E5E5] selection:text-[#0D0D0D]">
      {/* Ambient background glow matching the Cosmic Orb */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40 select-none"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 28%, rgba(147, 51, 234, 0.05) 0%, rgba(59, 130, 246, 0.03) 40%, transparent 70%)`,
        }}
      />

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full px-6 py-2.5 md:px-10 flex items-center justify-between border-b border-[#E5E5E5]/60 bg-white/70 backdrop-blur-md">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-gray-200 shrink-0">
            <img src="/cosmic_orb.jpg" alt="Nebula Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-base tracking-tight text-[#0D0D0D]">Nebula AI</span>
        </div>

        {/* Switch between Sign In & Sign Up */}
        <button
          type="button"
          onClick={() => {
            const target = mode === 'login' ? 'signup' : 'login';
            switchMode(target);
            navigateTo(target);
          }}
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
              <div className="relative mb-2 group cursor-pointer" onClick={() => navigateTo('chat')}>
                <div className="absolute -inset-2 bg-gradient-to-tr from-purple-500/20 via-indigo-500/15 to-blue-500/20 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-12 h-12 rounded-full overflow-hidden p-0.5 bg-gradient-to-b from-purple-400/30 via-indigo-500/15 to-transparent border border-gray-200 shadow-md">
                  <img
                    src="/cosmic_orb.jpg"
                    alt="Nebula Cosmic Orb"
                    className="w-full h-full rounded-full object-cover animate-cosmic-orb"
                  />
                </div>
              </div>

              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0D0D0D]">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-[11.5px] text-gray-500 mt-0.5">
                {mode === 'login'
                  ? 'Sign in to access your saved conversations and models'
                  : 'Start exploring next-generation cognitive intelligence'}
              </p>
            </div>

            {/* Segmented Switcher Pill: Sign In / Create Account */}
            <div className="grid grid-cols-2 p-1 bg-[#F4F4F5] rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => switchMode('login')}
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
                onClick={() => switchMode('signup')}
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

            {/* Error & Success Feedback Alerts */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2.5 text-xs">
              {/* Full Name (Sign Up only) */}
              {mode === 'signup' && (
                <div className="flex flex-col gap-1 animate-in fade-in">
                  <label className="text-[11px] font-semibold text-gray-700">Full Name</label>
                  <div className="relative flex items-center">
                    <User size={13} className="absolute left-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Linda Pewtersmith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-700">Email Address</label>
                <div className="relative flex items-center">
                  <Mail size={13} className="absolute left-3.5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-gray-700">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => alert('Password reset instructions sent to your email.')}
                      className="text-[10.5px] text-gray-500 hover:text-black hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock size={13} className="absolute left-3.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-9.5 pl-9.5 pr-9.5 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>

                {/* Password Strength Meter (Signup only) */}
                {mode === 'signup' && password && (
                  <div className="flex flex-col gap-1 mt-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-500">Strength:</span>
                      <span className="font-semibold text-gray-700">{passwordStrength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full rounded-full transition-all duration-300 ${
                            step <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
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
                  <label className="text-[11px] font-semibold text-gray-700">Confirm Password</label>
                  <div className="relative flex items-center">
                    <Lock size={13} className="absolute left-3.5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
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
                    className="w-3.5 h-3.5 rounded border-gray-300 accent-[#0D0D0D] cursor-pointer"
                  />
                  <label htmlFor="rememberMeCheckbox" className="text-[11px] text-gray-600 cursor-pointer select-none">
                    Remember my session on this device
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 mt-1 rounded-xl text-xs font-semibold text-white 
                  bg-[#0D0D0D] hover:bg-[#262626] shadow-xs transition-all duration-200 active:scale-[0.98] 
                  flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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

            {/* Mode Switcher Footer */}
            <div className="text-center text-xs text-gray-500 pt-1 border-t border-[#E5E5E5]/60">
              {mode === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
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
                    onClick={() => switchMode('login')}
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
              By continuing, you agree to Nebula's{' '}
              <span className="underline hover:text-gray-600 cursor-pointer">Terms</span> and{' '}
              <span className="underline hover:text-gray-600 cursor-pointer">Privacy Policy</span>.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-2.5 text-center text-[10.5px] text-gray-400 border-t border-[#E5E5E5]/50">
        © 2026 Nebula AI • Powered by Google Gemini 3.8 Flash
      </footer>
    </div>
  );
};

export default AuthPage;
