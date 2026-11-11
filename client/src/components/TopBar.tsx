import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  MoreHorizontal, 
  Menu, 
  Check, 
  LogOut,
  Zap,
  Download,
  Printer,
  Sun,
  Moon,
  Mic,
  Bot,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AiModelInfo, PersonaType } from '../types';

interface TopBarProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  selectedPersona: PersonaType;
  onSelectPersona: (persona: PersonaType) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenVoiceMode?: () => void;
  onToggleMobileSidebar: () => void;
  onClearChat: () => void;
  onOpenSettings?: () => void;
  onExportMarkdown?: () => void;
  onExportText?: () => void;
}

const DEFAULT_MODELS = [
  { id: 'gemini-3.5-flash-lite', name: 'Nebula 4.0e (Instant Lite)', tag: 'Sub-second Latency (<1s)', badge: 'Default' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'Balanced Assistant', badge: 'Fast' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Deep Thinking Preview', badge: 'Reasoning' },
];

const PERSONAS: { id: PersonaType; name: string; icon: string; desc: string }[] = [
  { id: 'general', name: 'General AI', icon: '🤖', desc: 'Standard balanced assistant' },
  { id: 'coder', name: 'Code Architect', icon: '💻', desc: 'Production TypeScript, Python, Clean Architecture' },
  { id: 'kerala_scholar', name: 'Kerala Scholar', icon: '🌴', desc: 'Kerala History, Politics & 2026 Facts' },
  { id: 'malayalam_writer', name: 'Malayalam Writer', icon: '✍️', desc: 'Creative Malayalam literary writer' },
  { id: 'math_tutor', name: 'Math & Science', icon: '📐', desc: 'Step-by-step formulas & STEM tutor' },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const TopBar: React.FC<TopBarProps> = ({
  selectedModel,
  onSelectModel,
  selectedPersona,
  onSelectPersona,
  theme,
  onToggleTheme,
  onOpenVoiceMode,
  onToggleMobileSidebar,
  onClearChat,
  onOpenSettings,
  onExportMarkdown,
  onExportText,
}) => {
  const { isAuthenticated, navigateTo, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);

  const currentPersona = PERSONAS.find(p => p.id === selectedPersona) || PERSONAS[0];

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/models`);
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
    <div className="relative z-30 flex items-center justify-between px-3 md:px-6 h-13 border-b border-[#E5E5E5] dark:border-[#282828] bg-[#FCFCFC] dark:bg-[#141414] text-[#0D0D0D] dark:text-[#ECECEC]">
      {/* Left Model Selector & Mobile Trigger */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Menu size={18} />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              setIsPersonaOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-[#ECECEC]/70 dark:hover:bg-[#252525] text-sm font-semibold text-[#0D0D0D] dark:text-[#ECECEC] transition-colors cursor-pointer"
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
              
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2E2E2E] shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Model Engine</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold lowercase text-[10px]">
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
                        ? 'bg-[#F4F4F4] dark:bg-[#2A2A2A] text-[#0D0D0D] dark:text-white font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-[#F9F9F9] dark:hover:bg-[#252525]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{m.name}</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">{m.tag}</span>
                    </div>
                    {selectedModel === m.id && <Check size={14} className="text-[#0D0D0D] dark:text-white shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Persona Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsPersonaOpen(!isPersonaOpen);
              setIsDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0F0F0] dark:bg-[#222222] hover:bg-[#E5E5E5] dark:hover:bg-[#2B2B2B] text-xs font-medium text-[#222222] dark:text-[#E0E0E0] border border-gray-200 dark:border-gray-750 transition-colors cursor-pointer"
            title="Select AI Persona & Role"
          >
            <span>{currentPersona.icon}</span>
            <span className="hidden sm:inline font-semibold">{currentPersona.name}</span>
            <ChevronDown size={12} className={`text-gray-400 transition-transform ${isPersonaOpen ? 'rotate-180' : ''}`} />
          </button>

          {isPersonaOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsPersonaOpen(false)} 
              />
              
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2E2E2E] shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>AI Persona / Role</span>
                  <Bot size={12} className="text-blue-500" />
                </div>
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectPersona(p.id);
                      setIsPersonaOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                      selectedPersona === p.id
                        ? 'bg-[#F4F4F4] dark:bg-[#2A2A2A] text-[#0D0D0D] dark:text-white font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-[#F9F9F9] dark:hover:bg-[#252525]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{p.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{p.name}</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">{p.desc}</span>
                      </div>
                    </div>
                    {selectedPersona === p.id && <Check size={14} className="text-[#0D0D0D] dark:text-white shrink-0 ml-1" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Real-time Voice Mode Trigger */}
        {onOpenVoiceMode && (
          <button
            onClick={onOpenVoiceMode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Open Hands-Free Voice Conversation"
          >
            <Mic size={14} className="animate-pulse" />
            <span className="hidden sm:inline">Voice Mode</span>
          </button>
        )}

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
        </button>

        {/* Share / Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-[#ECECEC]/70 dark:hover:bg-[#252525] text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            title="Options & Export"
          >
            <MoreHorizontal size={17} />
          </button>

          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)} 
              />
              
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2E2E2E] shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 text-xs text-[#0D0D0D] dark:text-[#ECECEC]">
                <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Export Conversation
                </div>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportMarkdown?.();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-left"
                >
                  <Download size={14} className="text-blue-500" />
                  <span>Export as Markdown (.md)</span>
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportText?.();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-left"
                >
                  <Download size={14} className="text-emerald-500" />
                  <span>Export as Text (.txt)</span>
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.print();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-left"
                >
                  <Printer size={14} className="text-gray-500" />
                  <span>Print / Save as PDF</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettings?.();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-left"
                >
                  <Settings size={14} className="text-gray-500" />
                  <span>Settings & Preferences</span>
                </button>

                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onClearChat();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left"
                >
                  <span>Clear Conversation</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Auth / Profile Button */}
        {isAuthenticated ? (
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => navigateTo('login')}
            className="px-3.5 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity text-xs font-semibold cursor-pointer shadow-2xs"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
};
