import React from 'react';
import { X, Sparkles, Check, ShieldCheck } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const perks = [
    'Unlimited messages with Nebula 4.0e & Gemini Pro models',
    'Deep Reasoning & multi-modal image/file analysis',
    'Real-time streaming responses with zero queue time',
    'Priority high-throughput API endpoints',
    'Extended context window for complex projects',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1B1433] to-[#0F0B1E] border border-purple-500/30 shadow-2xl p-6 text-white flex flex-col gap-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center shadow-lg">
              <Sparkles size={16} className="text-purple-300" />
            </div>
            <span className="text-base font-bold text-white tracking-wide">Nebula Pro</span>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Pricing Banner */}
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-purple-500/25 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white">$9.99</span>
              <span className="text-xs text-white/40 line-through">$32.00</span>
              <span className="text-xs text-white/60">/ month</span>
            </div>
            <span className="text-[11px] text-purple-300 font-medium">69% OFF + 3 Months Free</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-[11px] font-semibold text-purple-200">
            LIMITED TIME
          </span>
        </div>

        {/* Features List */}
        <div className="flex flex-col gap-2.5 text-xs">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2.5 text-white/80">
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center flex-shrink-0">
                <Check size={10} className="text-emerald-400" />
              </div>
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={() => {
              alert('Thank you! Upgrade simulation activated.');
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-xl shadow-purple-950/50 transition-all active:scale-[0.98]"
          >
            Claim 69% Discount Now
          </button>
          <span className="text-[10.5px] text-center text-white/40 flex items-center justify-center gap-1">
            <ShieldCheck size={12} className="text-emerald-400" /> 14-day money-back guarantee. Cancel anytime.
          </span>
        </div>
      </div>
    </div>
  );
};
