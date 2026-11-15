import React, { useState } from 'react';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { AuthLayout, AuthRouteLink } from '../components/AuthLayout';
import { useAuth } from '../context/useAuth';
import {
  EMAIL_REGEX,
  buildPathWithQuery,
  readQueryParam,
  savePendingOtpSession,
  clearVerifiedResetSession,
} from '../utils/authHelpers';

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset, navigateTo } = useAuth();

  const [email, setEmail] = useState(() => readQueryParam('email'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }

    setIsSubmitting(true);
    clearVerifiedResetSession();
    const res = await requestPasswordReset(normalizedEmail);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Could not send 6-digit OTP.');
      return;
    }

    savePendingOtpSession({
      email: normalizedEmail,
      deliveredTo: res.deliveredTo,
      sandboxRedirected: res.sandboxRedirected,
      message: res.message,
    });

    navigateTo(
      'verify-otp',
      buildPathWithQuery('/verify-otp', { email: normalizedEmail })
    );
  };

  const backToLoginHref = buildPathWithQuery('/login', { email });

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Step 1 of 3 — Enter your registered account email to receive a 6-digit verification OTP."
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
        <span className="text-[#0D0D0D]">1. Request OTP</span>
        <span>→</span>
        <span>2. Verify OTP</span>
        <span>→</span>
        <span>3. New Password</span>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <label htmlFor="forgot-email" className="text-[11px] font-semibold text-gray-700">
            Account Email Address
          </label>
          <div className="relative flex items-center">
            <Mail size={13} className="absolute left-3.5 text-gray-400" />
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9.5 pl-9.5 pr-3 rounded-xl bg-[#FBFBFB] hover:bg-white focus:bg-white border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 mt-1 rounded-xl text-xs font-semibold text-white bg-[#0D0D0D] hover:bg-[#262626] shadow-xs transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={14} className="animate-spin text-white" />
              <span>Sending 6-Digit OTP...</span>
            </>
          ) : (
            <>
              <span>Send 6-Digit OTP</span>
              <ArrowRight size={13} className="text-white" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
