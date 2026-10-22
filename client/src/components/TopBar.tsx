import React, { useState } from 'react';
import { 
  ChevronDown, 
  MoreHorizontal, 
  Menu, 
  Check, 
  Share2, 
  Lock, 
  RotateCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface TopBarProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onToggleMobileSidebar: () => void;
  onClearChat: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  selectedModel,
  onSelectModel,
  onToggleMobileSidebar,
  onClearChat,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const models = [
    { id: 'Nebula 4.0e', name: 'Nebula 4.0e', tag: 'Fast & Smart' },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'High Speed' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', tag: 'Ultralight' },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Pro Reasoning' },
  ];

  return (
    <div className="relative z-30 flex flex-col border-b border-white/[0.08] bg-[#0E0B1A]/90 backdrop-blur-xl">
      {/* Browser Simulated Header Bar (matches macOS Safari in screenshot) */}
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
          <span>nebula.com</span>
          <Lock size={11} className="text-white/40 ml-1" />
        </div>

        {/* Browser right actions */}
        <div className="flex items-center gap-3 text-white/40">
          <RotateCw size={13} className="cursor-pointer hover:text-white" />
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
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#120E22] border border-purple-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-2 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-purple-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Select AI Engine</span>
                    <span className="text-[10px] text-white/40 lowercase">Active</span>
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
                        <span className="font-medium text-white/95">{m.name}</span>
                        <span className="text-[10.5px] text-white/45">{m.tag}</span>
                      </div>
                      {selectedModel === m.id && <Check size={15} className="text-purple-300" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Menu Options */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#120E22] border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl p-1.5 z-50 flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    onClearChat();
                    setIsMenuOpen(false);
                  }}
                  className="px-3 py-2 rounded-xl text-xs text-left text-red-300 hover:bg-red-500/15 transition-colors"
                >
                  Clear Current Conversation
                </button>
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="px-3 py-2 rounded-xl text-xs text-left text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  Refresh Session
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
