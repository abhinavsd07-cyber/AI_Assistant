import React, { useState } from 'react';
import { Mail, KeyRound, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { AuthLayout, AuthRouteLink } from '../components/AuthLayout';
import { PasswordStrengthMeter } from '../components/AuthSharedFields';
import { useAuth } from '../context/useAuth';
import { EMAIL_REGEX, buildPathWithQuery, readQueryParam } from '../utils/authHelpers';

export const ResetPasswordPage: React.FC = () => {
  const { confirmPasswordReset, navigateTo } = useAuth();

  const [email, setEmail] = useState(() => readQueryParam('email'));
  const [code, setCode] = useState(() => readQueryParam('code').toUpperCase());
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(() =>
    readQueryParam('sent') === '1'
      ? 'If an account exists for that email, an 8-character reset code has been sent.'
      : null
  );

  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim();
    const normalizedCode = code.trim().toUpperCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!normalizedCode) {
      setErrorMessage('Please enter the 8-character reset code from your email.');
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      setErrorMessage('New password must be between 6 and 128 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsSubmitting(true);
    const res = await confirmPasswordReset(normalizedEmail, normalizedCode, newPassword);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Invalid or expired reset code.');
      return;
    }

    navigateTo(
      'login',
      buildPathWithQuery('/login', { email: normalizedEmail, reset: 'success' })
    );
  };

  const resendHref = buildPathWithQuery('/forgot-password', { email });
  const backToLoginHref = buildPathWithQuery('/login', { email });

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Enter the 8-character reset code from your email and choose a new password."
      headerAction={{ label: 'Sign In', view: 'login', href: '/login' }}
      errorMessage={errorMessage}
      successMessage={successMessage}
      footer={
        <span>
          Didn&apos;t receive a code?{' '}
          <AuthRouteLink
            to="forgot-password"
            href={resendHref}
            className="text-[#0D0D0D] font-semibold hover:underline transition-colors no-underline"
          >
            Request a new one →
          </AuthRouteLink>
        </span>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2.5 text-xs">
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

        <div className="flex flex-col gap-1">
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
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs font-mono tracking-wider uppercase focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="reset-new-password" className="text-[11px] font-semibold text-gray-700">
            New Password
          </label>
          <div className="relative flex items-center">
            <Lock size={13} className="absolute left-3.5 text-gray-400" />
            <input
              id="reset-new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
          <PasswordStrengthMeter password={newPassword} />
        </div>

        <div className="flex flex-col gap-1">
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
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full h-9.5 pl-9.5 pr-9.5 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:ring-1 transition-all ${
                passwordsMismatch
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
          {passwordsMismatch && (
            <span className="text-[10px] text-rose-600 font-medium">Passwords do not match</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 mt-1 rounded-xl text-xs font-semibold text-white bg-[#0D0D0D] hover:bg-[#262626] shadow-xs transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={14} className="animate-spin text-white" />
              <span>Updating password...</span>
            </>
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight size={13} className="text-white" />
            </>
          )}
        </button>

        <div className="flex items-center justify-start pt-1 text-[11px]">
          <AuthRouteLink
            to="login"
            href={backToLoginHref}
            className="inline-flex items-center gap-1 text-gray-600 hover:text-black font-medium no-underline"
          >
            <ArrowLeft size={12} />
            <span>Back to Sign In</span>
          </AuthRouteLink>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
