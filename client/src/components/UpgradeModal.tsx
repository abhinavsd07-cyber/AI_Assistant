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
    'High-resolution AI Image Generation with Cloudinary CDN',
    'Real-time streaming responses with zero queue time',
    'Hands-free real-time Voice Mode with continuous conversation',
    'Extended context window for complex programming projects',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] shadow-2xl p-6 text-[#0D0D0D] dark:text-[#ECECEC] flex flex-col gap-4 relative overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shadow-2xs">
              <Sparkles size={16} />
            </div>
            <span className="text-base font-bold text-[#0D0D0D] dark:text-white tracking-tight">Nebula Pro</span>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Pricing Banner */}
        <div className="p-4 rounded-2xl bg-[#FBFBFB] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#0D0D0D] dark:text-white">$9.99</span>
              <span className="text-xs text-gray-400 line-through">$32.00</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">/ month</span>
            </div>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">69% OFF + 3 Months Free</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[10.5px] font-bold text-purple-700 dark:text-purple-300">
            PRO ACCESS
          </span>
        </div>

        {/* Features List */}
        <div className="flex flex-col gap-2.5 text-xs py-1">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300 font-medium">
              <div className="w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                <Check size={10} />
              </div>
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
          <button
            onClick={() => {
              alert('🎉 Nebula Pro unlocked! You now have unlimited access, AI Image Gen, and Real-time Voice.');
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-[#0D0D0D] dark:bg-white hover:bg-[#262626] dark:hover:bg-gray-100 text-white dark:text-black font-semibold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            Claim Pro Access Now
          </button>
          <span className="text-[10.5px] text-center text-gray-400 flex items-center justify-center gap-1">
            <ShieldCheck size={12} className="text-emerald-600" /> 14-day money-back guarantee. Cancel anytime.
          </span>
        </div>
      </div>
    </div>
  );
};
