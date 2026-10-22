import React, { useState } from 'react';
import { 
  MessageSquarePlus, 
  Clock, 
  Settings, 
  HelpCircle, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ChevronsRight,
  X
} from 'lucide-react';
import type { ChatSession } from '../types';

interface SidebarProps {
  currentSessionId: string | null;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenUpgrade: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSessionId,
  sessions,
  onSelectSession,
  onNewChat,
  onOpenSettings,
  onOpenUpgrade,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [showMore, setShowMore] = useState(false);

  // Default recent items matching the screenshot
  const defaultRecent = [
    { id: 'rec-1', title: 'Explain this Code' },
    { id: 'rec-2', title: 'Kyoto Solo Trip Itinerary' },
    { id: 'rec-3', title: 'Podcast Ideas: Sustainable Tech' },
    { id: 'rec-4', title: 'Debugging JavaScript snippet' },
    { id: 'rec-5', title: 'How to shave my cat safely' },
    { id: 'rec-6', title: 'Machine Learning Optimization' },
    { id: 'rec-7', title: 'React 19 Server Actions guide' },
  ];

  const displayList = sessions.length > 0
    ? sessions.map(s => ({ id: s.id, title: s.title }))
    : defaultRecent;

  const visibleItems = showMore ? displayList : displayList.slice(0, 5);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <aside className={`
        fixed md:static top-0 left-0 bottom-0 z-50
        w-72 bg-[#0C0A17]/95 md:bg-[#0C0A17]/80 backdrop-blur-2xl
        border-r border-white/[0.08] flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        h-full select-none
      `}>
        {/* Top Section */}
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-500 to-fuchsia-400 p-[1.5px] shadow-lg shadow-purple-500/25">
                <div className="w-full h-full bg-[#0F0D1C] rounded-[7px] flex items-center justify-center">
                  <div className="w-4 h-4 rounded-sm rotate-45 bg-gradient-to-tr from-purple-500 to-fuchsia-400 shadow-sm" />
                </div>
              </div>
              <span className="font-semibold text-lg tracking-tight text-white/90">Nebula</span>
            </div>
            
            {/* Mobile close button */}
            <button 
              onClick={onCloseMobile}
              className="md:hidden text-white/60 hover:text-white p-1 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white 
              bg-gradient-to-r from-[#6D28D9]/90 to-[#4C1D95]/90 hover:from-[#7C3AED] hover:to-[#5B21B6] 
              border border-purple-500/30 shadow-lg shadow-purple-900/40 transition-all duration-200 active:scale-[0.98]"
          >
            <MessageSquarePlus size={18} className="text-purple-200" />
            <span>New Chat</span>
          </button>

          {/* Recent Chats Section */}
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-white/50 tracking-wider">
              <Clock size={14} className="text-white/40" />
              <span>Recent</span>
            </div>

            <div className="flex flex-col gap-0.5 mt-1">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSession(item.id);
                    onCloseMobile();
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-[13.5px] truncate transition-all ${
                    currentSessionId === item.id
                      ? 'bg-white/[0.08] text-white font-medium shadow-sm border border-purple-500/20'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {item.title}
                </button>
              ))}

              {displayList.length > 5 && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors mt-1"
                >
                  <span>{showMore ? 'Less' : 'More'}</span>
                  {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}
            </div>
          </div>

          {/* Settings & Help Navigation */}
          <div className="flex flex-col gap-0.5 pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => {
                onOpenSettings();
                onCloseMobile();
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <Settings size={16} className="text-white/50" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                window.open('https://ai.google.dev/gemini-api/docs', '_blank');
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <HelpCircle size={16} className="text-white/50" />
              <span>Help & Updates</span>
            </button>
          </div>
        </div>

        {/* Bottom Section: Pro Upgrade Card & User Profile */}
        <div className="p-4 flex flex-col gap-3 border-t border-white/[0.06] bg-[#0A0814]/40">
          {/* Upgrade to Pro Card */}
          <div className="relative rounded-2xl p-3.5 bg-gradient-to-b from-[#1C1736]/90 to-[#120F24]/90 border border-purple-500/25 shadow-xl shadow-purple-950/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                <Sparkles size={13} className="text-purple-300" />
              </div>
              <span className="text-sm font-semibold text-white tracking-wide">Upgrade to Pro</span>
            </div>

            <p className="text-[11.5px] leading-relaxed text-white/60 mb-3">
              Unlock Nebula's full power with a 69% discount and get 3 months free! (first time user only)
            </p>

            <button
              onClick={onOpenUpgrade}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-white 
                bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-600 hover:to-indigo-500
                border border-purple-400/30 shadow-md shadow-purple-900/30 transition-all active:scale-[0.98]"
            >
              Upgrade today!
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer">
            <div className="flex items-center gap-2.5 min-w-0">
              <img 
                src="/avatar.jpg" 
                alt="Linda Pewtersmith"
                className="w-9 h-9 rounded-full object-cover ring-1 ring-purple-400/40"
              />
              <div className="min-w-0 flex flex-col">
                <span className="text-[13px] font-medium text-white/90 truncate">Linda Pewtersmith</span>
                <span className="text-[11px] text-white/40 truncate">linda.h13@gmail.com</span>
              </div>
            </div>

            <button 
              onClick={onOpenSettings}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
