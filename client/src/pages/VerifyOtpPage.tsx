import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { AuthLayout, AuthRouteLink } from '../components/AuthLayout';
import { useAuth } from '../context/useAuth';
import {
  EMAIL_REGEX,
  buildPathWithQuery,
  readQueryParam,
  getPendingOtpSession,
  savePendingOtpSession,
  saveVerifiedResetSession,
} from '../utils/authHelpers';

export const VerifyOtpPage: React.FC = () => {
  const { verifyPasswordResetOtp, requestPasswordReset, navigateTo } = useAuth();

  const pendingSession = getPendingOtpSession();
  const initialEmail = (pendingSession?.email || readQueryParam('email') || '').trim().toLowerCase();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(() => {
    if (pendingSession?.message) return pendingSession.message;
    if (initialEmail) return `A 6-digit verification OTP has been sent to ${initialEmail}.`;
    return null;
  });

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Strict route guard: require a valid email from Step 1 (/forgot-password)
  useEffect(() => {
    if (!EMAIL_REGEX.test(initialEmail)) {
      window.history.replaceState({ view: 'forgot-password' }, '', '/forgot-password');
      navigateTo('forgot-password', '/forgot-password');
    }
  }, [initialEmail, navigateTo]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  if (!EMAIL_REGEX.test(initialEmail)) {
    return null;
  }

  const handleDigitChange = (index: number, rawValue: string) => {
    const clean = rawValue.replace(/\D/g, '');
    if (!clean) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    // Handle multi-digit paste or autofill into a single input
    if (clean.length > 1) {
      const sliced = clean.slice(0, 6).split('');
      setDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < 6; i += 1) {
          next[i] = sliced[i] || '';
        }
        return next;
      });
      const focusIdx = Math.min(clean.length, 5);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const digit = clean[clean.length - 1];
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i += 1) {
      nextDigits[i] = pasted[i];
    }
    setDigits(nextDigits);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const otpCode = digits.join('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!/^\d{6}$/.test(otpCode)) {
      setErrorMessage('Please enter all 6 digits of the OTP sent to your email.');
      return;
    }

    setIsVerifying(true);
    const res = await verifyPasswordResetOtp(initialEmail, otpCode);
    setIsVerifying(false);

    if (!res.success || !res.resetSessionToken) {
      setErrorMessage(res.error || 'Invalid or expired 6-digit OTP. Please try again.');
      return;
    }

    saveVerifiedResetSession({
      email: initialEmail,
      resetSessionToken: res.resetSessionToken,
    });

    navigateTo(
      'reset-password',
      buildPathWithQuery('/reset-password', { email: initialEmail })
    );
  };

  const handleResendOtp = async () => {
    if (isResending || cooldown > 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsResending(true);

    const res = await requestPasswordReset(initialEmail);
    setIsResending(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to resend OTP.');
      return;
    }

    setDigits(['', '', '', '', '', '']);
    setCooldown(30);
    savePendingOtpSession({
      email: initialEmail,
      deliveredTo: res.deliveredTo,
      sandboxRedirected: res.sandboxRedirected,
      message: res.message,
    });
    setSuccessMessage(res.message || `A new 6-digit OTP has been sent to ${initialEmail}.`);
    inputRefs.current[0]?.focus();
  };

  const changeEmailHref = buildPathWithQuery('/forgot-password', { email: initialEmail });
  const backToLoginHref = buildPathWithQuery('/login', { email: initialEmail });

  return (
    <AuthLayout
      title="Verify 6-Digit OTP"
      subtitle="Step 2 of 3 — Enter the 6-digit OTP sent to your email to unlock setting a new password."
      headerAction={{ label: 'Sign In', view: 'login', href: '/login' }}
      errorMessage={errorMessage}
      successMessage={successMessage}
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
      <div className="flex items-center justify-between text-[10px] font-semibold text-[#8C827A] bg-[#FAF8F5] border border-[#EAE4D9] rounded-xl px-3 py-1.5 mb-3">
        <span className="text-emerald-600 font-semibold">✓ 1. OTP Sent</span>
        <span>→</span>
        <span className="text-[#D97736] font-bold">2. Verify OTP</span>
        <span>→</span>
        <span>3. New Password</span>
      </div>

      <div className="flex items-center justify-between bg-[#FDFCFB] border border-[#E5DFD3] rounded-xl px-3 py-2 mb-3 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck size={13} className="text-[#D97736] shrink-0" />
          <span className="text-[#736B63] truncate">
            Account: <strong className="text-[#1F1E1B]">{initialEmail}</strong>
          </span>
        </div>
        <AuthRouteLink
          to="forgot-password"
          href={changeEmailHref}
          className="text-[10.5px] font-semibold text-[#736B63] hover:text-[#D97736] hover:underline shrink-0 ml-2 no-underline"
        >
          Change email
        </AuthRouteLink>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="otp-digit-0" className="text-[11px] font-semibold text-[#1F1E1B]">
              6-Digit Verification OTP
            </label>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResending || cooldown > 0}
              className="text-[10.5px] font-medium text-[#736B63] hover:text-[#D97736] disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw size={10} className={isResending ? 'animate-spin' : ''} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                id={`otp-digit-${index}`}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={6}
                aria-label={`OTP digit ${index + 1}`}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-full h-11 text-center rounded-xl bg-[#FDFCFB] hover:bg-white focus:bg-white border border-[#E5DFD3] text-[#1F1E1B] text-sm font-mono font-bold focus:outline-none focus:border-[#D97736] focus:ring-1 focus:ring-[#D97736]/20 transition-all"
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isVerifying || otpCode.length !== 6}
          className="w-full h-10 mt-1 rounded-xl text-xs font-semibold text-white bg-[#D97736] hover:bg-[#C26224] shadow-xs transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {isVerifying ? (
            <>
              <Loader2 size={14} className="animate-spin text-white" />
              <span>Verifying OTP...</span>
            </>
          ) : (
            <>
              <span>Verify OTP & Continue</span>
              <ArrowRight size={13} className="text-white" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default VerifyOtpPage;
