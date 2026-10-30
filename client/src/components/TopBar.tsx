import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  MoreHorizontal, 
  Menu, 
  Check, 
  Share2, 
  Lock, 
  RotateCw,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  User as UserIcon,
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AiModelInfo } from '../types';

interface TopBarProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onToggleMobileSidebar: () => void;
  onClearChat: () => void;
  onOpenSettings?: () => void;
}

const DEFAULT_MODELS = [
  { id: 'Nebula 4.0e', name: 'Nebula 4.0e (Gemini 3.8)', tag: 'Fast & Smart', badge: 'Recommended' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'High Speed Assistant', badge: 'Fast' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', tag: 'Ultralight Latency', badge: 'Instant' },
  { id: 'gemini-3.5-pro', name: 'Gemini 3.5 Pro', tag: 'Deep Reasoning & Code', badge: 'Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tag: '1M Context Champion', badge: 'Stable' },
];

export const TopBar: React.FC<TopBarProps> = ({
  selectedModel,
  onSelectModel,
  onToggleMobileSidebar,
  onClearChat,
  onOpenSettings,
}) => {
  const { user, isAuthenticated, openLoginModal, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);

  // Fetch models from backend if available
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/models');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.models) && data.models.length > 0) {
            const mapped = data.models.map((m: AiModelInfo) => ({
              id: m.modelId === 'gemini-3.8-flash' ? 'Nebula 4.0e' : m.modelId,
              name: m.displayName,
              tag: m.tag,
              badge: m.badge,
            }));
            setModels(mapped);
          }
        }
      } catch {
        // Fallback to DEFAULT_MODELS smoothly
      }
    };
    fetchModels();
  }, []);

  return (
    <div className="relative z-30 flex flex-col border-b border-white/[0.08] bg-[#0E0B1A]/90 backdrop-blur-xl">
      {/* Browser Simulated Header Bar (matches macOS Safari) */}
      <div className="hidden lg:flex items-center justify-between px-4 py-2 border-b border-white/[0.05] text-white/50 text-xs">
        {/* Window controls */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/50" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/50" />
          <div className="flex items-center gap-1.5 ml-4 text-white/40">
            <ChevronLeft size={14} className="cursor-pointer hover:text-white" />
            <ChevronRight size={14} className="cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Center URL Pill */}
        <div className="flex items-center gap-2 px-6 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-white/70 text-[11px] font-mono tracking-wide">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
          <span>nebula.ai</span>
          <Lock size={11} className="text-white/40 ml-1" />
        </div>

        {/* Browser right actions */}
        <div className="flex items-center gap-3 text-white/40">
          <RotateCw size={13} className="cursor-pointer hover:text-white" onClick={() => window.location.reload()} />
          <Share2 size={13} className="cursor-pointer hover:text-white" />
        </div>
      </div>

      {/* Main Canvas Top Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden text-white/70 hover:text-white p-1.5 rounded-lg bg-white/[0.05]"
          >
            <Menu size={18} />
          </button>

          {/* Model Selector Dropdown Pill */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] 
                border border-white/[0.1] text-sm font-medium text-white/90 transition-all active:scale-[0.98]"
            >
              <Cpu size={14} className="text-purple-400" />
              <span>{selectedModel}</span>
              <ChevronDown size={14} className={`text-white/50 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <>
                {/* Backdrop to focus dropdown and dismiss when clicking outside */}
                <div 
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" 
                  onClick={() => setIsDropdownOpen(false)} 
                />
                
                {/* Dropdown Menu */}
                <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-[#120E22] border border-purple-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-2 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-purple-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Configured AI Engine Pool</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Gemini GenAI</span>
                  </div>
                  {models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectModel(m.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-left transition-all ${
                        selectedModel === m.id
                          ? 'bg-purple-600/35 text-white font-semibold border border-purple-400/40 shadow-sm'
                          : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white/95">{m.name}</span>
                          {m.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] text-white/45">{m.tag}</span>
                      </div>
                      {selectedModel === m.id && <Check size={15} className="text-purple-300 shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Section: Auth State & Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              <div 
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] cursor-pointer transition-all"
              >
                <img
                  src={user.avatar || '/avatar.jpg'}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-purple-400/50"
                />
                <span className="text-xs font-medium text-white/90 hidden sm:inline">{user.name}</span>
                {user.plan === 'pro' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 font-semibold border border-purple-400/30">
                    PRO
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white 
                bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500
                border border-purple-400/30 shadow-md shadow-purple-900/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <LogIn size={13} className="text-purple-200" />
              <span>Sign In</span>
            </button>
          )}

          {/* More Options Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#120E22] border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl p-1.5 z-50 flex flex-col gap-0.5">
                  {isAuthenticated && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (onOpenSettings) onOpenSettings();
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-white/80 hover:bg-white/[0.06] transition-colors"
                    >
                      <UserIcon size={14} className="text-purple-300" />
                      <span>Account Settings</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onClearChat();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-red-300 hover:bg-red-500/15 transition-colors"
                  >
                    <span>Clear Conversation</span>
                  </button>
                  <button
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <span>Refresh Session</span>
                  </button>
                  {isAuthenticated && (
                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-red-400 hover:bg-red-500/15 transition-colors border-t border-white/[0.06] mt-1"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
