import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  MoreHorizontal, 
  Menu, 
  Check, 
  Share, 
  LogOut,
  User as UserIcon
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
  { id: 'Nebula 4.0e', name: 'Nebula 4.0e (Gemini 3.8)', tag: 'Fast & Smart', badge: 'Default' },
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
  const { isAuthenticated, navigateTo, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);

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
        // Fallback
      }
    };
    fetchModels();
  }, []);

  return (
    <div className="relative z-30 flex items-center justify-between px-4 md:px-6 h-13 border-b border-[#E5E5E5] bg-[#FCFCFC] text-[#0D0D0D]">
      {/* Left Model Selector & Mobile Trigger */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden text-gray-600 hover:text-black p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu size={18} />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-[#ECECEC]/70 text-sm font-semibold text-[#0D0D0D] transition-colors"
          >
            <span className="text-base font-bold">Nebula AI</span>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)} 
              />
              
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-[#E5E5E5] shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Model Engine
                </div>
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectModel(m.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                      selectedModel === m.id
                        ? 'bg-[#F4F4F4] text-[#0D0D0D] font-semibold'
                        : 'text-gray-700 hover:text-black hover:bg-[#F9F9F9]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{m.name}</span>
                      <span className="text-[11px] text-gray-500">{m.tag}</span>
                    </div>
                    {selectedModel === m.id && <Check size={14} className="text-[#0D0D0D] shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Action Icons (Matching screenshot: More ... and Share button) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'Nebula AI', url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }
          }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-black hover:bg-[#ECECEC]/70 transition-colors cursor-pointer"
        >
          <Share size={14} className="text-gray-600" />
          <span>Share</span>
        </button>

        {!isAuthenticated && (
          <button
            onClick={() => navigateTo('login')}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white bg-[#0D0D0D] hover:bg-[#262626] shadow-xs transition-colors cursor-pointer"
          >
            <span>Log in</span>
          </button>
        )}

        {/* More Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 rounded-lg hover:bg-[#ECECEC]/70 flex items-center justify-center text-gray-600 hover:text-black transition-colors"
          >
            <MoreHorizontal size={18} />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-[#E5E5E5] shadow-xl p-1.5 z-50 flex flex-col gap-0.5">
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (onOpenSettings) onOpenSettings();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-gray-700 hover:bg-[#F4F4F4] transition-colors"
                  >
                    <UserIcon size={14} />
                    <span>Account Settings</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onClearChat();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <span>Clear Conversation</span>
                </button>
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-gray-700 hover:bg-[#F4F4F4] transition-colors"
                >
                  <span>Refresh Session</span>
                </button>
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-rose-600 hover:bg-rose-50 transition-colors border-t border-[#E5E5E5] mt-1"
                  >
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
