import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  MoreHorizontal, 
  Menu, 
  Check, 
  Share, 
  LogOut,
  Zap
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
  { id: 'gemini-3.5-flash-lite', name: 'Nebula 4.0e (Instant Lite)', tag: 'Sub-second Latency (<1s)', badge: 'Default' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'Balanced Assistant', badge: 'Fast' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Deep Thinking Preview', badge: 'Reasoning' },
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
              id: m.modelId,
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
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Model Engine</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-bold lowercase text-[10px]">
                    <Zap size={10} /> low-latency
                  </span>
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

      {/* Right Action Icons */}
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
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#0D0D0D] text-white hover:bg-black transition-colors cursor-pointer"
          >
            Sign in
          </button>
        )}

        {/* More Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-600 hover:text-black p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            title="Options"
          >
            <MoreHorizontal size={18} />
          </button>

          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)} 
              />
              
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-[#E5E5E5] shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    onClearChat();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:text-black hover:bg-[#F4F4F4] rounded-xl transition-colors cursor-pointer"
                >
                  Clear active conversation
                </button>

                {onOpenSettings && (
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:text-black hover:bg-[#F4F4F4] rounded-xl transition-colors cursor-pointer"
                  >
                    API & Model Settings
                  </button>
                )}

                {isAuthenticated && (
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>Sign out</span>
                    <LogOut size={13} />
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
