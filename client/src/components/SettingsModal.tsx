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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-800 flex flex-col gap-5 relative overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Server size={16} />
            </div>
            <h2 className="text-base font-bold text-slate-900">Settings & Account</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Settings Form */}
        <div className="flex flex-col gap-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
          {/* User Account / Profile Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-700 font-semibold text-xs">
                <User size={14} />
                <span>Account Profile</span>
              </div>
              {isAuthenticated ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold font-mono">
                  {user?.provider?.toUpperCase()} USER
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-semibold font-mono">
                  GUEST SESSION
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-600 block text-[10.5px] font-semibold mb-1">Display Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                />
              </div>
              <div>
                <label className="text-slate-600 block text-[10.5px] font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={userEmail}
                  disabled={isAuthenticated}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none ${
                    isAuthenticated ? 'opacity-60 cursor-not-allowed' : 'focus:border-purple-600 focus:ring-1 focus:ring-purple-600'
                  }`}
                />
              </div>
            </div>

            {/* Account Quick Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-rose-600 hover:text-rose-700 font-medium transition-colors cursor-pointer"
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
                  className="flex items-center gap-1.5 text-[11px] text-purple-700 hover:text-purple-800 font-semibold transition-colors cursor-pointer"
                >
                  <LogIn size={13} />
                  <span>Sign In or Register Now →</span>
                </button>
              )}

              {user?.plan && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Sparkles size={11} className="text-purple-600" />
                  Plan: <span className="font-bold text-slate-900 uppercase">{user.plan}</span>
                </span>
              )}
            </div>
          </div>

          {/* Usage Metrics (if authenticated) */}
          {isAuthenticated && user?.usage && (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-purple-700" />
                <span className="text-slate-800 font-medium text-xs">Total Usage</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-700">
                <span>{user.usage.totalRequests || 0} reqs</span>
                <span className="text-slate-300">•</span>
                <span>{user.usage.totalTokens || 0} tokens</span>
              </div>
            </div>
          )}

          {/* Backend API Endpoint */}
          <div>
            <label className="text-slate-700 font-semibold block mb-1">Backend AI Endpoint</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:5000/api/chat"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-purple-600"
            />
          </div>

          {/* MongoDB Status Info */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={15} className="text-purple-600" />
              <div>
                <span className="font-semibold text-slate-800 block">Database Storage</span>
                <span className="text-[11px] text-slate-500">MongoDB Atlas Production Cluster</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono">CONNECTED</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-purple-600" />
              <div>
                <span className="font-semibold text-slate-800 block">Language Support</span>
                <span className="text-[11px] text-slate-500">Malayalam & English native synthesis</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold font-mono">ACTIVE</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-purple-600" />
              <div>
                <span className="font-semibold text-slate-800 block">AI Models Pool</span>
                <span className="text-[11px] text-slate-500">Gemini 3.8 Flash, 3.5 Flash, 3.5 Pro</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold font-mono">ONLINE</span>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
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
