import React, { useState, useMemo } from 'react';
import { 
  SquarePen, 
  ChevronDown, 
  ChevronUp, 
  Trash2,
  X,
  LogIn,
  Library,
  Compass,
  Code,
  Calendar,
  AtSign,
  ChevronRight,
  Sparkles,
  Sliders,
  Settings as SettingsIcon,
  LogOut,
  Search
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
  const { user, isAuthenticated, navigateTo, logout } = useAuth();
  const [showMore, setShowMore] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sessions by search query (title or message contents)
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(s => 
      s.title.toLowerCase().includes(q) ||
      (s.messages && s.messages.some(m => m.text && m.text.toLowerCase().includes(q)))
    );
  }, [sessions, searchQuery]);

  const displayList = filteredSessions.map(s => ({ id: s.id, title: s.title }));
  const visibleItems = showMore ? displayList : displayList.slice(0, 10);

  const displayName = user?.name || 'Abhinav SD';
  const displayEmail = user?.email || 'Go';

  // Extract initials
  const initials = displayName
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AS';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/30 backdrop-blur-2xs z-40 md:hidden"
        />
      )}

      <aside className={`
        fixed md:static top-0 left-0 bottom-0 z-50
        w-[260px] bg-[#FCFCFC] dark:bg-[#161616] border-r border-[#E5E5E5] dark:border-[#282828] flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        h-full select-none
      `}>
        {/* Top Section */}
        <div className="p-3 flex flex-col gap-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <span className="font-bold text-lg tracking-tight text-[#0D0D0D] dark:text-[#F0F0F0]">Nebula AI</span>
            
            {/* Mobile close button */}
            <button 
              onClick={onCloseMobile}
              className="md:hidden text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 p-1 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-0.5 text-[13px] font-medium text-[#212121] dark:text-[#D4D4D4]">
            <button
              onClick={() => {
                onNewChat();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 dark:hover:bg-[#242424] transition-colors cursor-pointer text-left"
            >
              <SquarePen size={16} className="text-[#5D5D5D] dark:text-[#A0A0A0]" />
              <span>New chat</span>
            </button>

            <button
              onClick={() => onOpenSettings()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 dark:hover:bg-[#242424] transition-colors cursor-pointer text-left text-gray-700 dark:text-gray-300"
            >
              <Calendar size={16} className="text-[#5D5D5D] dark:text-[#A0A0A0]" />
              <span>Scheduled</span>
            </button>

            <button
              onClick={() => onOpenSettings()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 dark:hover:bg-[#242424] transition-colors cursor-pointer text-left text-gray-700 dark:text-gray-300"
            >
              <Library size={16} className="text-[#5D5D5D] dark:text-[#A0A0A0]" />
              <span>Library</span>
            </button>

            <button
              onClick={() => onOpenSettings()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 dark:hover:bg-[#242424] transition-colors cursor-pointer text-left text-gray-700 dark:text-gray-300"
            >
              <AtSign size={16} className="text-[#5D5D5D] dark:text-[#A0A0A0]" />
              <span>Plugins</span>
            </button>

            <button
              onClick={() => onOpenSettings()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 dark:hover:bg-[#242424] transition-colors cursor-pointer text-left text-gray-700 dark:text-gray-300"
            >
              <Code size={16} className="text-[#5D5D5D] dark:text-[#A0A0A0]" />
              <span>Codex</span>
            </button>

            <button
              onClick={() => onOpenSettings()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 dark:hover:bg-[#242424] transition-colors cursor-pointer text-left text-gray-700 dark:text-gray-300"
            >
              <Compass size={16} className="text-[#5D5D5D] dark:text-[#A0A0A0]" />
              <span>Explore</span>
            </button>
          </div>

          {/* Search Bar for Chat History */}
          <div className="mt-3 px-1">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-6 py-1.5 rounded-lg bg-[#F0F0F0] dark:bg-[#202020] text-xs text-[#0D0D0D] dark:text-[#ECECEC] placeholder-gray-400 border border-transparent focus:border-gray-300 dark:focus:border-gray-700 outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Pinned & Recent Section */}
          <div className="flex flex-col gap-1 mt-3 pt-2 border-t border-[#E5E5E5]/70 dark:border-[#282828]">
            <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-gray-400">
              <span>{searchQuery ? 'Search Results' : 'Recent Chats'}</span>
              <span className="text-[10px] font-normal">{filteredSessions.length}</span>
            </div>

            <div className="flex flex-col gap-0.5">
              {visibleItems.length === 0 ? (
                <div className="px-2.5 py-3 text-xs text-gray-400 italic">
                  {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                </div>
              ) : (
                visibleItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectSession(item.id);
                      onCloseMobile();
                    }}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer transition-colors ${
                      currentSessionId === item.id
                        ? 'bg-[#ECECEC] dark:bg-[#262626] text-[#0D0D0D] dark:text-white font-medium'
                        : 'text-[#424242] dark:text-[#B0B0B0] hover:text-[#0D0D0D] dark:hover:text-white hover:bg-[#ECECEC]/60 dark:hover:bg-[#222222]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2.5 h-2.5 rounded-full border border-gray-400 dark:border-gray-600 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>

                    <button
                      onClick={(e) => onDeleteSession(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 transition-all rounded shrink-0 ml-1"
                      title="Delete Conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}

              {displayList.length > 10 && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  {showMore ? (
                    <>
                      <ChevronUp size={13} />
                      <span>Show less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={13} />
                      <span>Show {displayList.length - 10} more</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div className="relative p-3 border-t border-[#E5E5E5] dark:border-[#282828] flex flex-col gap-2 bg-[#FCFCFC] dark:bg-[#161616]">
          {/* Popover Menu */}
          {isUserMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsUserMenuOpen(false)} 
              />

              <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-[#E5E5E5] dark:border-[#2E2E2E] shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150 text-[#0D0D0D] dark:text-[#ECECEC]">
                <div 
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-[#282828] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#10A37F] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-semibold text-[#0D0D0D] dark:text-[#ECECEC] truncate leading-tight">
                        {displayName}
                      </span>
                      <span className="text-[11px] text-gray-500 truncate leading-tight">
                        {displayEmail}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-gray-400 shrink-0" />
                </div>

                <div className="my-1 border-t border-[#E5E5E5] dark:border-[#2E2E2E]" />

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenUpgrade();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-[#282828] transition-colors text-left text-[13px] font-medium text-[#0D0D0D] dark:text-[#ECECEC] cursor-pointer"
                >
                  <Sparkles size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Upgrade plan</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-[#282828] transition-colors text-left text-[13px] font-medium text-[#0D0D0D] dark:text-[#ECECEC] cursor-pointer"
                >
                  <Sliders size={16} className="text-gray-500 shrink-0" />
                  <span>Personalize</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-[#282828] transition-colors text-left text-[13px] font-medium text-[#0D0D0D] dark:text-[#ECECEC] cursor-pointer"
                >
                  <SettingsIcon size={16} className="text-gray-500 shrink-0" />
                  <span>Settings</span>
                </button>

                <div className="my-1 border-t border-[#E5E5E5] dark:border-[#2E2E2E]" />

                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors text-left text-[13px] font-medium cursor-pointer"
                  >
                    <LogOut size={16} className="shrink-0" />
                    <span>Log out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigateTo('login');
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-[#282828] text-blue-600 dark:text-blue-400 transition-colors text-left text-[13px] font-medium cursor-pointer"
                  >
                    <LogIn size={16} className="shrink-0" />
                    <span>Log in / Sign up</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Trigger button */}
          <div 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-[#ECECEC]/70 dark:hover:bg-[#252525] transition-colors cursor-pointer text-[#0D0D0D] dark:text-[#ECECEC]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#10A37F] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold truncate leading-tight text-[#0D0D0D] dark:text-[#ECECEC]">
                  {displayName}
                </span>
                <span className="text-[11px] text-gray-500 truncate leading-tight">
                  {displayEmail}
                </span>
              </div>
            </div>
            <ChevronRight size={14} className="text-gray-400 shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
};
