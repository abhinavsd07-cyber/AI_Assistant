import React, { useState } from 'react';
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
  AtSign
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
  const { user, isAuthenticated, navigateTo } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const displayList = sessions.map(s => ({ id: s.id, title: s.title }));
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
          className="fixed inset-0 bg-black/20 backdrop-blur-2xs z-40 md:hidden"
        />
      )}

      <aside className={`
        fixed md:static top-0 left-0 bottom-0 z-50
        w-[260px] bg-[#FCFCFC] border-r border-[#E5E5E5] flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        h-full select-none
      `}>
        {/* Top Section */}
        <div className="p-3 flex flex-col gap-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <span className="font-bold text-lg tracking-tight text-[#0D0D0D]">Nebula AI</span>
            
            {/* Mobile close button */}
            <button 
              onClick={onCloseMobile}
              className="md:hidden text-gray-500 hover:text-gray-800 p-1 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Actions (matching screenshot) */}
          <div className="flex flex-col gap-0.5 text-[13px] font-medium text-[#212121]">
            <button
              onClick={() => {
                onNewChat();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 transition-colors cursor-pointer text-left"
            >
              <SquarePen size={16} className="text-[#5D5D5D]" />
              <span>New chat</span>
            </button>

            <button
              onClick={() => onOpenSettings()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 transition-colors cursor-pointer text-left text-gray-700"
            >
              <Calendar size={16} className="text-[#5D5D5D]" />
              <span>Scheduled</span>
            </button>

            <button
              onClick={() => onOpenSettings()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 transition-colors cursor-pointer text-left text-gray-700"
            >
              <Library size={16} className="text-[#5D5D5D]" />
              <span>Library</span>
            </button>

            <button
              onClick={() => onOpenSettings()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 transition-colors cursor-pointer text-left text-gray-700"
            >
              <AtSign size={16} className="text-[#5D5D5D]" />
              <span>Plugins</span>
            </button>

            <button
              onClick={() => onOpenSettings()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 transition-colors cursor-pointer text-left text-gray-700"
            >
              <Code size={16} className="text-[#5D5D5D]" />
              <span>Codex</span>
            </button>

            <button
              onClick={() => onOpenSettings()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#ECECEC]/70 transition-colors cursor-pointer text-left text-gray-700"
            >
              <Compass size={16} className="text-[#5D5D5D]" />
              <span>Explore</span>
            </button>
          </div>

          {/* Pinned & Recent Section */}
          <div className="flex flex-col gap-1 mt-4 pt-2 border-t border-[#E5E5E5]/70">
            <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-400">
              Pinned
            </div>

            <div className="flex flex-col gap-0.5">
              {visibleItems.length === 0 ? (
                <div className="px-2.5 py-3 text-xs text-gray-400 italic">
                  No conversations yet
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
                        ? 'bg-[#ECECEC] text-[#0D0D0D] font-medium'
                        : 'text-[#424242] hover:text-[#0D0D0D] hover:bg-[#ECECEC]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2.5 h-2.5 rounded-full border border-gray-400 shrink-0" />
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
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
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

        {/* Bottom User Profile Section (Matching Screenshot) */}
        <div className="p-3 border-t border-[#E5E5E5] flex flex-col gap-2 bg-[#FCFCFC]">
          <div 
            onClick={onOpenSettings}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#ECECEC]/60 transition-colors cursor-pointer"
          >
            {/* Green Initial Circle matching screenshot (AS in green) */}
            <div className="w-8 h-8 rounded-full bg-[#10A37F] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {initials}
            </div>
            
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-[#0D0D0D] truncate leading-tight">
                {displayName}
              </span>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenUpgrade();
                }}
                className="text-[11px] text-gray-500 hover:text-[#0D0D0D] truncate leading-tight transition-colors"
                title="Upgrade Plan"
              >
                {displayEmail}
              </span>
            </div>
          </div>

          {!isAuthenticated && (
            <button
              onClick={() => {
                navigateTo('login');
                onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#0D0D0D] hover:bg-[#262626] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              <LogIn size={13} />
              <span>Sign In / Sync</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
