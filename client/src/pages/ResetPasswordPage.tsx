import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { AuthLayout, AuthRouteLink } from '../components/AuthLayout';
import { PasswordStrengthMeter } from '../components/AuthSharedFields';
import { useAuth } from '../context/useAuth';
import {
  buildPathWithQuery,
  getVerifiedResetSession,
  clearVerifiedResetSession,
  clearPendingOtpSession,
} from '../utils/authHelpers';

export const ResetPasswordPage: React.FC = () => {
  const { confirmPasswordReset, navigateTo } = useAuth();

  const verifiedSession = getVerifiedResetSession();
  const verifiedEmail = verifiedSession?.email || '';
  const resetSessionToken = verifiedSession?.resetSessionToken || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Strict route guard: setting a new password is ONLY allowed after OTP verification
  useEffect(() => {
    if (!verifiedEmail || !resetSessionToken) {
      window.history.replaceState({ view: 'forgot-password' }, '', '/forgot-password');
      navigateTo('forgot-password', '/forgot-password');
    }
  }, [verifiedEmail, resetSessionToken, navigateTo]);

  if (!verifiedEmail || !resetSessionToken) {
    return null;
  }

  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (newPassword.length < 6 || newPassword.length > 128) {
      setErrorMessage('New password must be between 6 and 128 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsSubmitting(true);
    const res = await confirmPasswordReset(verifiedEmail, resetSessionToken, newPassword);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Could not update password. Please verify your OTP again.');
      return;
    }

    clearVerifiedResetSession();
    clearPendingOtpSession();

    navigateTo(
      'login',
      buildPathWithQuery('/login', { email: verifiedEmail, reset: 'success' })
    );
  };

  const backToLoginHref = buildPathWithQuery('/login', { email: verifiedEmail });

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Step 3 of 3 — Your 6-digit OTP is verified. Enter and confirm your new password below."
      headerAction={{ label: 'Sign In', view: 'login', href: '/login' }}
      errorMessage={errorMessage}
      footer={
        <span>
          Remembered your password?{' '}
          <AuthRouteLink
            to="login"
            href={backToLoginHref}
            className="text-[#0D0D0D] font-semibold hover:underline transition-colors no-underline"
          >
            Sign in here →
          </AuthRouteLink>
        </span>
      }
    >
      <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 mb-3">
        <span className="text-emerald-600">✓ 1. OTP Sent</span>
        <span>→</span>
        <span className="text-emerald-600">✓ 2. OTP Verified</span>
        <span>→</span>
        <span className="text-[#0D0D0D]">3. New Password</span>
      </div>

      <div className="flex items-center gap-2 bg-[#FDFCFB] border border-[#E5DFD3] rounded-xl px-3 py-2 mb-3 text-[11px] text-[#736B63]">
        <ShieldCheck size={14} className="text-[#D97736] shrink-0" />
        <span className="truncate">
          OTP verified for <strong className="text-[#1F1E1B]">{verifiedEmail}</strong>
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2.5 text-xs">
        <div className="flex flex-col gap-1">
          <label htmlFor="reset-new-password" className="text-[11px] font-semibold text-[#1F1E1B]">
            New Password
          </label>
          <div className="relative flex items-center">
            <Lock size={13} className="absolute left-3.5 text-[#8C827A]" />
            <input
              id="reset-new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
          <PasswordStrengthMeter password={newPassword} />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="reset-confirm-password"
            className="text-[11px] font-semibold text-[#1F1E1B]"
          >
            Confirm New Password
          </label>
          <div className="relative flex items-center">
            <Lock size={13} className="absolute left-3.5 text-[#8C827A]" />
            <input
              id="reset-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter new password"
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
              <span>Saving new password...</span>
            </>
          ) : (
            <>
              <span>Set New Password & Sign In</span>
              <ArrowRight size={13} className="text-white" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
