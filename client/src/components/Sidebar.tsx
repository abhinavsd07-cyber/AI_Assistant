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
  Trash2,
  X,
  LogIn,
  ShieldCheck
} from 'lucide-react';
import type { ChatSession } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentSessionId: string | null;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
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
  onDeleteSession,
  onOpenSettings,
  onOpenUpgrade,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const displayList = sessions.map(s => ({ id: s.id, title: s.title }));
  const visibleItems = showMore ? displayList : displayList.slice(0, 6);

  const displayName = user?.name || 'Guest User';
  const displayEmail = user?.email || 'Sign in to sync history';
  const displayAvatar = user?.avatar || '/avatar.jpg';

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
              <div className="flex flex-col">
                <span className="font-semibold text-lg tracking-tight text-white/90">Nebula</span>
                <span className="text-[10px] text-purple-400 font-mono -mt-1">Cognitive AI</span>
              </div>
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
              border border-purple-500/30 shadow-lg shadow-purple-900/40 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <MessageSquarePlus size={18} className="text-purple-200" />
            <span>New Chat</span>
          </button>

          {/* Recent Conversations List */}
          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-white/40 tracking-wider uppercase">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-purple-400" />
                <span>Recent Chats</span>
              </div>
              <span className="text-[11px] font-mono text-purple-400/80">{sessions.length}</span>
            </div>

            <div className="flex flex-col gap-0.5 mt-1">
              {visibleItems.length === 0 ? (
                <div className="px-3 py-4 text-xs text-white/40 italic flex flex-col items-center justify-center text-center gap-1 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <span>No conversations yet</span>
                  <span className="text-[10.5px] text-white/30">Start asking Nebula anything</span>
                </div>
              ) : (
                visibleItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectSession(item.id);
                      onCloseMobile();
                    }}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] cursor-pointer transition-all ${
                      currentSessionId === item.id
                        ? 'bg-purple-600/25 text-white font-medium shadow-sm border border-purple-500/30'
                        : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="truncate flex-1">{item.title}</span>
                    <button
                      onClick={(e) => onDeleteSession(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-all rounded"
                      title="Delete Conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}

              {displayList.length > 6 && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-purple-300/80 hover:text-purple-200 hover:bg-white/[0.03] rounded-lg transition-colors mt-0.5 cursor-pointer"
                >
                  {showMore ? (
                    <>
                      <ChevronUp size={14} />
                      <span>Show less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      <span>Show {displayList.length - 6} more</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Quick Settings & Info */}
          <div className="flex flex-col gap-0.5 pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => {
                onOpenSettings();
                onCloseMobile();
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <Settings size={16} className="text-white/50" />
              <span>Settings & API</span>
            </button>
            <button
              onClick={() => {
                alert('Nebula AI Assistant v2.0\nPowered by Google Gemini 3.8 Flash & MongoDB Atlas.');
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <HelpCircle size={16} className="text-white/50" />
              <span>About Nebula</span>
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
              <span className="text-sm font-semibold text-white tracking-wide">
                {user?.plan === 'pro' ? 'Nebula Pro Active' : 'Upgrade to Pro'}
              </span>
            </div>

            <p className="text-[11.5px] leading-relaxed text-white/60 mb-3">
              {user?.plan === 'pro'
                ? 'Enjoy unlimited Gemini 3.8 Pro reasoning and highest priority tokens.'
                : 'Unlock Gemini 3.8 Pro, extended 2M tokens context, and instant high-load processing!'}
            </p>

            <button
              onClick={onOpenUpgrade}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-white 
                bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-600 hover:to-indigo-500
                border border-purple-400/30 shadow-md shadow-purple-900/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              {user?.plan === 'pro' ? 'Manage Pro Plan' : 'Upgrade today!'}
            </button>
          </div>

          {/* User Profile / Auth Sign In */}
          {isAuthenticated && user ? (
            <div 
              onClick={onOpenSettings}
              className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img 
                  src={displayAvatar} 
                  alt={displayName}
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-purple-400/40 shrink-0"
                />
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-white/90 truncate">{displayName}</span>
                    <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                  </div>
                  <span className="text-[11px] text-white/40 truncate">{displayEmail}</span>
                </div>
              </div>

              <div className="w-7 h-7 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] flex items-center justify-center text-white/50 group-hover:text-white transition-colors">
                <ChevronsRight size={14} />
              </div>
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 
                border border-purple-500/30 text-white transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                <LogIn size={15} className="text-purple-300" />
                <span>Sign In / Register</span>
              </div>
              <span className="text-[10px] text-purple-300/80 font-mono">Sync History</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
