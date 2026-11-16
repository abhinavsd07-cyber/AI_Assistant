import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthLayout, AuthRouteLink } from '../components/AuthLayout';
import { GoogleAuthSection, PasswordStrengthMeter } from '../components/AuthSharedFields';
import { useAuth } from '../context/useAuth';
import { EMAIL_REGEX, readQueryParam } from '../utils/authHelpers';

export const SignupPage: React.FC = () => {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => readQueryParam('email'));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    const normalizedEmail = email.trim();
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
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start exploring next-generation cognitive intelligence"
      headerAction={{ label: 'Sign In', view: 'login', href: '/login' }}
      errorMessage={errorMessage}
      successMessage={successMessage}
      footer={
        <span>
          Already have an account?{' '}
          <AuthRouteLink
            to="login"
            href="/login"
            className="text-[#D97736] font-semibold hover:text-[#C26224] hover:underline transition-colors no-underline"
          >
            Sign in here →
          </AuthRouteLink>
        </span>
      }
    >
      <GoogleAuthSection
        mode="signup"
        rememberMe={true}
        disabled={isSubmitting}
        onBusyChange={setIsSubmitting}
        onError={setErrorMessage}
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2.5 text-xs">
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-name" className="text-[11px] font-semibold text-[#1F1E1B]">
            Full Name
          </label>
          <div className="relative flex items-center">
            <User size={13} className="absolute left-3.5 text-[#8C827A]" />
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              placeholder="Alex Mercer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FDFCFB] hover:bg-white focus:bg-white border border-[#E5DFD3] text-[#1F1E1B] placeholder-[#A39E93] text-xs focus:outline-none focus:border-[#D97736] focus:ring-1 focus:ring-[#D97736]/20 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="signup-email" className="text-[11px] font-semibold text-[#1F1E1B]">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail size={13} className="absolute left-3.5 text-[#8C827A]" />
            <input
              id="signup-email"
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
          <label htmlFor="signup-password" className="text-[11px] font-semibold text-[#1F1E1B]">
            Password
          </label>
          <div className="relative flex items-center">
            <Lock size={13} className="absolute left-3.5 text-[#8C827A]" />
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
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
          <PasswordStrengthMeter password={password} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="signup-confirm-password" className="text-[11px] font-semibold text-[#1F1E1B]">
            Confirm Password
          </label>
          <div className="relative flex items-center">
            <Lock size={13} className="absolute left-3.5 text-[#8C827A]" />
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full h-9.5 pl-9.5 pr-9.5 rounded-xl bg-[#FDFCFB] hover:bg-white focus:bg-white border text-[#1F1E1B] placeholder-[#A39E93] text-xs focus:outline-none focus:ring-1 transition-all ${
                passwordsMismatch
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-[#E5DFD3] focus:border-[#D97736] focus:ring-[#D97736]/20'
              }`}
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 text-[#8C827A] hover:text-[#1F1E1B] transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          {passwordsMismatch && (
            <span className="text-[10px] text-rose-600 font-medium">Passwords do not match</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 mt-1 rounded-xl text-xs font-semibold text-white bg-[#D97736] hover:bg-[#C26224] shadow-xs transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={14} className="animate-spin text-white" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create Free Account</span>
              <ArrowRight size={13} className="text-white" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default SignupPage;
