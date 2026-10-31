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
  const { user, isAuthenticated, logout, navigateTo, updateProfile } = useAuth();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white border border-[#E5E5E5] shadow-2xl p-6 text-[#0D0D0D] flex flex-col gap-4 relative overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
              <Server size={16} />
            </div>
            <h2 className="text-base font-bold text-[#0D0D0D]">Settings & Profile</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-black transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Settings Form */}
        <div className="flex flex-col gap-3.5 text-xs max-h-[68vh] overflow-y-auto pr-1">
          {/* User Account / Profile Box */}
          <div className="p-4 rounded-2xl bg-[#FBFBFB] border border-[#E5E5E5] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800 font-semibold text-xs">
                <User size={14} className="text-gray-500" />
                <span>Account Profile</span>
              </div>
              {isAuthenticated ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold font-mono">
                  {user?.provider?.toUpperCase() || 'EMAIL'} USER
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold font-mono">
                  GUEST SESSION
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-gray-600 block text-[10.5px] font-semibold mb-1">Display Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#E5E5E5] text-[#0D0D0D] text-xs outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
                />
              </div>
              <div>
                <label className="text-gray-600 block text-[10.5px] font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={userEmail}
                  disabled={isAuthenticated}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl bg-white border border-[#E5E5E5] text-[#0D0D0D] text-xs outline-none transition-all ${
                    isAuthenticated ? 'opacity-60 cursor-not-allowed' : 'focus:border-black focus:ring-1 focus:ring-black/10'
                  }`}
                />
              </div>
            </div>

            {/* Account Action: Sign Out or Sign In */}
            <div className="pt-2 border-t border-[#E5E5E5]">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Sign Out of Account</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigateTo('login');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#0D0D0D] hover:bg-[#262626] text-white font-medium text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <LogIn size={13} />
                  <span>Sign In or Register Account →</span>
                </button>
              )}
            </div>

            {user?.plan && (
              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                <span className="flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-500" />
                  Subscription Plan:
                </span>
                <span className="font-bold text-[#0D0D0D] uppercase">{user.plan}</span>
              </div>
            )}
          </div>

          {/* Usage Metrics (if authenticated) */}
          {isAuthenticated && user?.usage && (
            <div className="p-3.5 rounded-2xl bg-[#FBFBFB] border border-[#E5E5E5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-gray-600" />
                <span className="text-[#0D0D0D] font-medium text-xs">Total Usage</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] font-mono text-gray-700">
                <span>{user.usage.totalRequests || 0} reqs</span>
                <span className="text-gray-300">•</span>
                <span>{user.usage.totalTokens || 0} tokens</span>
              </div>
            </div>
          )}

          {/* Backend AI Endpoint */}
          <div>
            <label className="text-gray-700 font-semibold block mb-1">Backend AI Endpoint</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:5000/api/chat"
              className="w-full px-3 py-2 rounded-xl bg-[#FBFBFB] border border-[#E5E5E5] text-[#0D0D0D] placeholder-gray-400 text-xs focus:outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black/10 transition-all"
            />
          </div>

          {/* MongoDB Status Info */}
          <div className="p-3 rounded-2xl bg-[#FBFBFB] border border-[#E5E5E5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={15} className="text-gray-600" />
              <div>
                <span className="font-semibold text-[#0D0D0D] block">Database Storage</span>
                <span className="text-[11px] text-gray-500">MongoDB Atlas Production Cluster</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold font-mono">CONNECTED</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#FBFBFB] border border-[#E5E5E5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-gray-600" />
              <div>
                <span className="font-semibold text-[#0D0D0D] block">Language Support</span>
                <span className="text-[11px] text-gray-500">Malayalam & English native synthesis</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-bold font-mono">ACTIVE</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#FBFBFB] border border-[#E5E5E5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-gray-600" />
              <div>
                <span className="font-semibold text-[#0D0D0D] block">AI Models Pool</span>
                <span className="text-[11px] text-gray-500">Gemini 3.8 Flash, 3.5 Flash, 3.5 Pro</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-bold font-mono">ONLINE</span>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="w-full py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-[#262626] text-white font-semibold text-xs shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          {saveSuccess ? (
            <>
              <Check size={14} className="text-white" />
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
