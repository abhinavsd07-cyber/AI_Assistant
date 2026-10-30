import React, { useState } from 'react';
import { 
  X, 
  Server, 
  Globe, 
  Database, 
  User, 
  LogOut, 
  LogIn, 
  Check, 
  Cpu, 
  Sparkles,
  BarChart2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiUrl,
  setApiUrl,
  userName,
  setUserName,
  userEmail,
  setUserEmail,
}) => {
  const { user, isAuthenticated, logout, openLoginModal, updateProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    if (isAuthenticated) {
      await updateProfile({ name: userName });
    } else {
      localStorage.setItem('nebula_user_name', userName);
      localStorage.setItem('nebula_user_email', userEmail);
    }

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
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
            <h2 className="text-base font-semibold text-white">Settings & Account</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Settings Form */}
        <div className="flex flex-col gap-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
          {/* User Account / Profile Box */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
                <User size={14} />
                <span>Account Profile</span>
              </div>
              {isAuthenticated ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  AUTHENTICATED ({user?.provider?.toUpperCase()})
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  GUEST SESSION
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-white/50 block text-[10.5px] mb-1">Display Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-white/50 block text-[10.5px] mb-1">Email Address</label>
                <input
                  type="email"
                  value={userEmail}
                  disabled={isAuthenticated}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs outline-none ${
                    isAuthenticated ? 'opacity-60 cursor-not-allowed' : 'focus:border-purple-400'
                  }`}
                />
              </div>
            </div>

            {/* Account Quick Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-red-300 hover:text-red-200 transition-colors cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Sign Out of Account</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openLoginModal();
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-purple-300 hover:text-purple-200 font-medium transition-colors cursor-pointer"
                >
                  <LogIn size={13} />
                  <span>Sign In or Register Now →</span>
                </button>
              )}

              {user?.plan && (
                <span className="text-[11px] text-white/50 flex items-center gap-1">
                  <Sparkles size={11} className="text-purple-400" />
                  Plan: <span className="font-semibold text-white uppercase">{user.plan}</span>
                </span>
              )}
            </div>
          </div>

          {/* Usage Metrics (if authenticated) */}
          {isAuthenticated && user?.usage && (
            <div className="p-3 rounded-xl bg-purple-500/[0.05] border border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-purple-300" />
                <span className="text-white/70 text-xs">Total Usage</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-white/80">
                <span>{user.usage.totalRequests || 0} reqs</span>
                <span className="text-white/30">•</span>
                <span>{user.usage.totalTokens || 0} tokens</span>
              </div>
            </div>
          )}

          {/* Backend API Endpoint */}
          <div>
            <label className="text-white/70 font-medium block mb-1">Backend AI Endpoint</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:5000/api/chat"
              className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* MongoDB Status Info */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={15} className="text-purple-300" />
              <div>
                <span className="font-medium text-white/80 block">Database Storage</span>
                <span className="text-[11px] text-white/40">MongoDB Atlas Production Cluster</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">CONNECTED</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-purple-300" />
              <div>
                <span className="font-medium text-white/80 block">Language Support</span>
                <span className="text-[11px] text-white/40">Malayalam & English native contextual synthesis</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">ACTIVE</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-purple-300" />
              <div>
                <span className="font-medium text-white/80 block">Active AI Models Pool</span>
                <span className="text-[11px] text-white/40">Gemini 3.8 Flash, 3.5 Flash, 3.5 Pro, 1.5 Flash</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">ONLINE</span>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-950/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          {saveSuccess ? (
            <>
              <Check size={14} className="text-emerald-300" />
              <span>Saved Successfully</span>
            </>
          ) : (
            <span>Save Settings</span>
          )}
        </button>
      </div>
    </div>
  );
};
