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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-800 flex flex-col gap-5 relative overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <Sparkles size={16} />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">Nebula Pro</span>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Pricing Banner */}
        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">$9.99</span>
              <span className="text-xs text-slate-400 line-through">$32.00</span>
              <span className="text-xs text-slate-600 font-medium">/ month</span>
            </div>
            <span className="text-[11px] text-purple-700 font-semibold">69% OFF + 3 Months Free</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-purple-100 border border-purple-200 text-[11px] font-bold text-purple-800">
            LIMITED TIME
          </span>
        </div>

        {/* Features List */}
        <div className="flex flex-col gap-2.5 text-xs">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2.5 text-slate-700 font-medium">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <Check size={10} />
              </div>
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-1">
          <button
            onClick={() => {
              alert('Thank you! Upgrade simulation activated.');
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            Claim 69% Discount Now
          </button>
          <span className="text-[10.5px] text-center text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck size={12} className="text-emerald-600" /> 14-day money-back guarantee. Cancel anytime.
          </span>
        </div>
      </div>
    </div>
  );
};
