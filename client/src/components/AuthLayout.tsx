import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth, type ViewType } from '../context/useAuth';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  headerAction: {
    label: string;
    view: ViewType;
    href: string;
  };
  errorMessage?: string | null;
  successMessage?: string | null;
  footer: React.ReactNode;
  children: React.ReactNode;
}

export const AuthRouteLink: React.FC<{
  to: ViewType;
  href: string;
  className?: string;
  children: React.ReactNode;
}> = ({ to, href, className, children }) => {
  const { navigateTo } = useAuth();
  return (
    <a
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigateTo(to, href);
      }}
      className={className}
    >
      {children}
    </a>
  );
};

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  headerAction,
  errorMessage,
  successMessage,
  footer,
  children,
}) => {
  const { isAuthenticated, navigateTo } = useAuth();
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#FCFCFC] text-[#0D0D0D] relative overflow-x-hidden selection:bg-[#E5E5E5] selection:text-[#0D0D0D]">
      <div
        className="fixed inset-0 pointer-events-none opacity-40 select-none"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 25%, rgba(15, 23, 42, 0.04) 0%, transparent 65%)`,
        }}
      />

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full px-6 py-2.5 md:px-10 flex items-center justify-between border-b border-[#E5E5E5]/60 bg-white/70 backdrop-blur-md">
        <a
          href={isAuthenticated ? '/' : '/login'}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            navigateTo(isAuthenticated ? 'chat' : 'login');
          }}
          className="flex items-center gap-2.5 select-none no-underline text-[#0D0D0D]"
        >
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <img
              src="/nebula-logo.png"
              alt="Nebula Logo"
              className="w-full h-full object-contain drop-shadow-[0_1px_4px_rgba(15,23,42,0.16)]"
            />
          </div>
          <span className="font-bold text-base tracking-tight text-[#0D0D0D]">Nebula AI</span>
        </a>

        <AuthRouteLink
          to={headerAction.view}
          href={headerAction.href}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-black py-1.5 px-3.5 rounded-full bg-white border border-[#E5E5E5] hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer shadow-2xs no-underline"
        >
          <span>{headerAction.label}</span>
          <ArrowRight size={13} />
        </AuthRouteLink>
      </header>

      {/* Main Centered Auth Studio */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-4 sm:py-6">
        <div className="w-full max-w-[410px] mx-auto flex flex-col items-center">
          <div className="w-full bg-white rounded-3xl border border-[#E5E5E5] shadow-xl shadow-black/[0.03] p-5 sm:p-7 flex flex-col gap-3.5">
            {/* Brand Orb & Page Heading */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-2">
                <div className="absolute -inset-3 bg-radial from-slate-200/50 via-transparent to-transparent rounded-full blur-xl opacity-75" />
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <img
                    src="/nebula-logo.png"
                    alt="Nebula AI Logo"
                    className="w-full h-full object-contain animate-cosmic-orb"
                  />
                </div>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0D0D0D]">{title}</h1>
              <p className="text-[11.5px] text-gray-500 mt-0.5 max-w-[320px]">{subtitle}</p>
            </div>

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

            {children}

            <div className="text-center text-xs text-gray-500 pt-2 border-t border-[#E5E5E5]/60">
              {footer}
            </div>
          </div>

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

      <footer className="relative z-10 w-full py-2.5 text-center text-[10.5px] text-gray-400 border-t border-[#E5E5E5]/50">
        © 2026 Nebula AI • Powered by Google Gemini 3.8 Flash
      </footer>
    </div>
  );
};
