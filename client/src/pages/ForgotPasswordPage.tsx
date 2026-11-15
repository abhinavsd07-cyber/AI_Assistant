import React, { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { AuthLayout, AuthRouteLink } from '../components/AuthLayout';
import { useAuth } from '../context/useAuth';
import { EMAIL_REGEX, buildPathWithQuery, readQueryParam } from '../utils/authHelpers';

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset, navigateTo } = useAuth();

  const [email, setEmail] = useState(() => readQueryParam('email'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    const normalizedEmail = email.trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid account email address.');
      return;
    }

    setIsSubmitting(true);
    const res = await requestPasswordReset(normalizedEmail);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Could not send reset code.');
      return;
    }

    navigateTo(
      'reset-password',
      buildPathWithQuery('/reset-password', { email: normalizedEmail, sent: '1' })
    );
  };

  const resetHref = buildPathWithQuery('/reset-password', { email });
  const backToLoginHref = buildPathWithQuery('/login', { email });

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your account email address and we'll send an 8-character reset code."
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
            Back to Sign In →
          </AuthRouteLink>
        </span>
      }
    >
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
              <span>Sending code...</span>
            </>
          ) : (
            <>
              <span>Send Reset Code</span>
              <ArrowRight size={13} className="text-white" />
            </>
          )}
        </button>

        <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500">
          <AuthRouteLink
            to="login"
            href={backToLoginHref}
            className="inline-flex items-center gap-1 text-gray-600 hover:text-black font-medium no-underline"
          >
            <ArrowLeft size={12} />
            <span>Back to Sign In</span>
          </AuthRouteLink>

          <AuthRouteLink
            to="reset-password"
            href={resetHref}
            className="text-gray-600 hover:text-black underline"
          >
            Already have a code?
          </AuthRouteLink>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
