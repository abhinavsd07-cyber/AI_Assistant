import React, { useState, useEffect } from 'react';
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
  BarChart2,
  Brain,
  Trash2,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

interface MemoryItem {
  _id: string;
  category: string;
  key: string;
  value: string;
}

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
  userName,
  setUserName,
  userEmail,
  setUserEmail,
}) => {
  const { user, token, isAuthenticated, logout, navigateTo, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'memory'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live backend health telemetry
  const [healthStatus, setHealthStatus] = useState<{
    database: string;
    modelsReady: boolean;
    status: string;
  }>({ database: 'Checking...', modelsReady: true, status: 'checking' });

  // MemGPT Memory state
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE}/api/health`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setHealthStatus({
              database: data.database || 'Connected',
              modelsReady: Boolean(data.modelsReady),
              status: data.status || 'healthy',
            });
          }
        })
        .catch(() => {
          setHealthStatus({ database: 'Offline', modelsReady: false, status: 'offline' });
        });
    }
  }, [isOpen]);

  const fetchMemories = async () => {
    setIsLoadingMemories(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/memories`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.memories)) {
        setMemories(data.memories);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMemories(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'memory') {
      fetchMemories();
    }
  }, [isOpen, activeTab]);

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

  const handleAddMemory = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/memories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: 'preference',
          key: newKey.trim(),
          value: newValue.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewKey('');
        setNewValue('');
        fetchMemories();
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${API_BASE}/api/memories/${id}`, { method: 'DELETE', headers });
      setMemories((prev) => prev.filter((m) => m._id !== id));
    } catch {
      // ignore
    }
  };

  const handleClearAllMemories = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${API_BASE}/api/memories`, { method: 'DELETE', headers });
      setMemories([]);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] shadow-2xl p-6 text-[#0D0D0D] dark:text-[#ECECEC] flex flex-col gap-4 relative overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5] dark:border-[#2C2C2C]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center">
              <Server size={16} />
            </div>
            <h2 className="text-base font-bold text-[#0D0D0D] dark:text-white">Settings & AI Memory</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-[#222222] text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-[#2E2E2E] text-black dark:text-white shadow-2xs'
                : 'text-gray-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <User size={13} />
            <span>Profile & System</span>
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'memory'
                ? 'bg-white dark:bg-[#2E2E2E] text-black dark:text-white shadow-2xs'
                : 'text-gray-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <Brain size={13} className="text-purple-500" />
            <span>AI Memory (MemGPT)</span>
          </button>
        </div>

        {activeTab === 'profile' ? (
          <>
            {/* Profile & System Settings */}
            <div className="flex flex-col gap-3.5 text-xs max-h-[60vh] overflow-y-auto pr-1">
              {/* User Account / Profile Box */}
              <div className="p-4 rounded-2xl bg-[#FBFBFB] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#2C2C2C] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold text-xs">
                    <User size={14} className="text-gray-500" />
                    <span>Account Profile</span>
                  </div>
                  {isAuthenticated ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold font-mono">
                      {user?.provider?.toUpperCase() || 'EMAIL'} USER
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-semibold font-mono">
                      GUEST SESSION
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-gray-600 dark:text-gray-400 block text-[10.5px] font-semibold mb-1">Display Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333] text-[#0D0D0D] dark:text-[#ECECEC] text-xs outline-none focus:border-black dark:focus:border-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 dark:text-gray-400 block text-[10.5px] font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      value={userEmail}
                      disabled={isAuthenticated}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333] text-[#0D0D0D] dark:text-[#ECECEC] text-xs outline-none transition-all ${
                        isAuthenticated ? 'opacity-60 cursor-not-allowed' : 'focus:border-black dark:focus:border-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium text-xs transition-colors cursor-pointer"
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
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#0D0D0D] dark:bg-white hover:bg-[#262626] dark:hover:bg-gray-100 text-white dark:text-black font-medium text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      <LogIn size={13} />
                      <span>Sign In or Register Account →</span>
                    </button>
                  )}
                </div>
              </div>

              {isAuthenticated && user?.usage && (
                <div className="p-3.5 rounded-2xl bg-[#FBFBFB] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart2 size={15} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-[#0D0D0D] dark:text-white font-medium text-xs">Total Usage</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] font-mono text-gray-700 dark:text-gray-300">
                    <span>{user.usage.totalRequests || 0} reqs</span>
                    <span className="text-gray-400">•</span>
                    <span>{user.usage.totalTokens || 0} tokens</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-gray-700 dark:text-gray-300 font-semibold block mb-1">Verified Backend AI Endpoint</label>
                <input
                  type="text"
                  value={apiUrl}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F4F4] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] text-gray-500 dark:text-gray-400 text-xs cursor-not-allowed select-all"
                />
              </div>

              <div className="p-3 rounded-2xl bg-[#FBFBFB] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={15} className="text-gray-600 dark:text-gray-400" />
                  <div>
                    <span className="font-semibold text-[#0D0D0D] dark:text-white block">Database Storage</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">MongoDB Atlas Production Cluster</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono border ${
                  healthStatus.database === 'Connected'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}>
                  {healthStatus.database.toUpperCase()}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FBFBFB] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={15} className="text-gray-600 dark:text-gray-400" />
                  <div>
                    <span className="font-semibold text-[#0D0D0D] dark:text-white block">Language & Speech Engine</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Real-time conversational voice & NLP synthesis</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-bold font-mono">ACTIVE</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FBFBFB] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu size={15} className="text-gray-600 dark:text-gray-400" />
                  <div>
                    <span className="font-semibold text-[#0D0D0D] dark:text-white block">AI Models Pool</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Gemini 3.8, 3.5 Flash & Local Ollama</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-bold font-mono">
                  {healthStatus.modelsReady ? 'ONLINE' : 'STANDBY'}
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-[#0D0D0D] dark:bg-white hover:bg-[#262626] dark:hover:bg-gray-100 text-white dark:text-black font-semibold text-xs shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check size={14} className="text-emerald-500 dark:text-emerald-600" />
                  <span>Saved Successfully</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </>
        ) : (
          /* MemGPT AI Memory Manager Tab */
          <div className="flex flex-col gap-3 text-xs max-h-[64vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50 text-gray-700 dark:text-gray-300 leading-relaxed">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  Persistent Semantic Memory
                </span>
                {memories.length > 0 && (
                  <button
                    onClick={handleClearAllMemories}
                    className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              Nebula automatically remembers key facts about your preferences, role, and projects across sessions to personalize responses.
            </div>

            {/* Add New Custom Memory */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Topic (e.g. role)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-1/3 px-2.5 py-2 rounded-xl bg-gray-50 dark:bg-[#222222] border border-gray-200 dark:border-gray-700 text-xs outline-none"
              />
              <input
                type="text"
                placeholder="Fact (e.g. Full-Stack Architect)"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="flex-1 px-2.5 py-2 rounded-xl bg-gray-50 dark:bg-[#222222] border border-gray-200 dark:border-gray-700 text-xs outline-none"
              />
              <button
                onClick={handleAddMemory}
                className="p-2 rounded-xl bg-[#0D0D0D] dark:bg-white text-white dark:text-black hover:opacity-90 cursor-pointer shrink-0"
                title="Add Memory"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Memories List */}
            <div className="flex flex-col gap-2 mt-1">
              {isLoadingMemories ? (
                <div className="py-8 text-center text-gray-400">Loading stored memories...</div>
              ) : memories.length === 0 ? (
                <div className="py-8 text-center text-gray-400 italic border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                  No memories stored yet. Tell Nebula about yourself in chat or add one above!
                </div>
              ) : (
                memories.map((m) => (
                  <div
                    key={m._id}
                    className="p-3 rounded-xl bg-[#FBFBFB] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono uppercase font-bold">
                          {m.category}
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 truncate">{m.key}</span>
                      </div>
                      <span className="text-gray-600 dark:text-gray-400 text-xs mt-0.5 truncate">{m.value}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(m._id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      title="Delete memory"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
