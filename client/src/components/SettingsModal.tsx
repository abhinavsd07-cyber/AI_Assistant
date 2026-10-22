import React from 'react';
import { X, Server, Globe, Shield, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiUrl,
  setApiUrl,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-[#141024] border border-purple-500/25 shadow-2xl p-6 text-white flex flex-col gap-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
              <Server size={16} className="text-purple-300" />
            </div>
            <h2 className="text-base font-semibold text-white">System Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Settings Form */}
        <div className="flex flex-col gap-4 text-xs">
          <div>
            <label className="text-white/70 font-medium block mb-1.5">Backend API Endpoint</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:5000/api/chat"
              className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-purple-500"
            />
            <p className="text-[11px] text-white/40 mt-1">Live Express backend running with Google Gemini</p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-purple-300" />
              <div>
                <span className="font-medium text-white/80 block">Language Auto-Detection</span>
                <span className="text-[11px] text-white/40">Malayalam & English supported</span>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
              <Check size={10} className="text-emerald-400" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-purple-300" />
              <div>
                <span className="font-medium text-white/80 block">Active AI Engine</span>
                <span className="text-[11px] text-white/40">Gemini 3.5 Flash + Fallback Pool</span>
              </div>
            </div>
            <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">ONLINE</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-950/40 transition-all active:scale-[0.98]"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};
