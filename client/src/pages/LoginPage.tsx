import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthLayout, AuthRouteLink } from '../components/AuthLayout';
import { GoogleAuthSection } from '../components/AuthSharedFields';
import { useAuth } from '../context/useAuth';
import { EMAIL_REGEX, buildPathWithQuery, readQueryParam } from '../utils/authHelpers';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [email, setEmail] = useState(() => readQueryParam('email'));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(() =>
    readQueryParam('reset') === 'success'
      ? 'Password updated successfully! Sign in with your new password.'
      : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim();
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
      setSuccessMessage('Signed in successfully! Redirecting...');
    }
  };

  const forgotPasswordHref = buildPathWithQuery('/forgot-password', { email });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your saved conversations and models"
      headerAction={{ label: 'Create Account', view: 'signup', href: '/signup' }}
      errorMessage={errorMessage}
      successMessage={successMessage}
      footer={
        <span>
          Don&apos;t have an account?{' '}
          <AuthRouteLink
            to="signup"
            href="/signup"
            className="text-[#D97736] font-semibold hover:text-[#C26224] hover:underline transition-colors no-underline"
          >
            Create one for free →
          </AuthRouteLink>
        </span>
      }
    >
      <GoogleAuthSection
        mode="login"
        rememberMe={rememberMe}
        disabled={isSubmitting}
        onBusyChange={setIsSubmitting}
        onError={setErrorMessage}
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <label htmlFor="login-email" className="text-[11px] font-semibold text-[#1F1E1B]">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail size={13} className="absolute left-3.5 text-[#8C827A]" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FDFCFB] hover:bg-white focus:bg-white border border-[#E5DFD3] text-[#1F1E1B] placeholder-[#A39E93] text-xs focus:outline-none focus:border-[#D97736] focus:ring-1 focus:ring-[#D97736]/20 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-[11px] font-semibold text-[#1F1E1B]">
              Password
            </label>
            <AuthRouteLink
              to="forgot-password"
              href={forgotPasswordHref}
              className="text-[10.5px] text-[#736B63] hover:text-[#D97736] hover:underline transition-colors no-underline"
            >
              Forgot password?
            </AuthRouteLink>
          </div>
          <div className="relative flex items-center">
            <Lock size={13} className="absolute left-3.5 text-[#8C827A]" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9.5 pl-9.5 pr-9.5 rounded-xl bg-[#FDFCFB] hover:bg-white focus:bg-white border border-[#E5DFD3] text-[#1F1E1B] placeholder-[#A39E93] text-xs focus:outline-none focus:border-[#D97736] focus:ring-1 focus:ring-[#D97736]/20 transition-all"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 text-[#8C827A] hover:text-[#1F1E1B] transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="checkbox"
            id="login-remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-[#E5DFD3] accent-[#D97736] cursor-pointer"
          />
          <label
            htmlFor="login-remember"
            className="text-[11px] text-[#736B63] cursor-pointer select-none"
          >
            Remember my session on this device
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 mt-1 rounded-xl text-xs font-semibold text-white bg-[#D97736] hover:bg-[#C26224] shadow-xs transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={14} className="animate-spin text-white" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={13} className="text-white" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
