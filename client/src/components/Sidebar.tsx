import React, { useState, useMemo, useEffect } from 'react';
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
  Brain,
  ChevronRight,
  Sparkles,
  Sliders,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Pin,
  Pencil,
  Check,
  FolderPlus,
  Folder,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  FileCode
} from 'lucide-react';
import type { ChatSession } from '../types';
import { useAuth } from '../context/AuthContext';

interface ProjectFolder {
  id: string;
  name: string;
  sessionIds: string[];
}

interface ExtractedArtifact {
  id: string;
  title: string;
  language: string;
  code: string;
  sessionId: string;
}

interface SidebarProps {
  currentSessionId: string | null;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onRenameSession?: (id: string, newTitle: string) => void;
  onOpenArtifact?: (code: string, language: string, title?: string) => void;
  onOpenSettings: () => void;
  onOpenUpgrade: () => void;
  onOpenLibrary: () => void;
  onOpenExplore: () => void;
  onOpenCodex: () => void;
  onOpenFluxStudio?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSessionId,
  sessions,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onOpenArtifact,
  onOpenSettings,
  onOpenUpgrade,
  onOpenLibrary,
  onOpenExplore,
  onOpenCodex,
  onOpenFluxStudio,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, isAuthenticated, navigateTo, logout } = useAuth();
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showArtifactsDrawer, setShowArtifactsDrawer] = useState(false);

  // Per-user Pinned Session IDs & Custom Project Folders (ChatGPT Projects feature)
  const storageKeyPrefix = user?.id ? `nebula_${user.id}` : 'nebula_guest';

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKeyPrefix}_pinned`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [projects, setProjects] = useState<ProjectFolder[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKeyPrefix}_projects`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [assigningSessionId, setAssigningSessionId] = useState<string | null>(null);

  // Inline session rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKeyPrefix}_pinned`, JSON.stringify(pinnedIds));
    } catch {
      // ignore
    }
  }, [pinnedIds, storageKeyPrefix]);

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKeyPrefix}_projects`, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects, storageKeyPrefix]);

  // Extract all code/HTML/React/Python artifacts across user's chat sessions
  const extractedArtifacts = useMemo<ExtractedArtifact[]>(() => {
    const list: ExtractedArtifact[] = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
    for (const s of sessions) {
      if (!Array.isArray(s.messages)) continue;
      for (const m of s.messages) {
        if (m.sender !== 'assistant' || !m.text) continue;
        let match;
        let idx = 0;
        while ((match = codeBlockRegex.exec(m.text)) !== null) {
          const lang = (match[1] || 'code').toLowerCase();
          const code = match[2]?.trim() || '';
          if (code.length > 40) {
            list.push({
              id: `${s.id}-${m.id}-${idx++}`,
              title: `${s.title.slice(0, 22)} (${lang.toUpperCase()})`,
              language: lang,
              code,
              sessionId: s.id,
            });
          }
        }
      }
    }
    return list.slice(0, 12);
  }, [sessions]);

  // Filter sessions by search query (title or message contents)
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.messages && s.messages.some((m) => m.text && m.text.toLowerCase().includes(q)))
    );
  }, [sessions, searchQuery]);

  // Chronological & Pinned ChatGPT-style grouping
  const groupedSessions = useMemo(() => {
    const pinned: ChatSession[] = [];
    const today: ChatSession[] = [];
    const previous7Days: ChatSession[] = [];
    const older: ChatSession[] = [];

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;

    filteredSessions.forEach((s, index) => {
      if (pinnedIds.includes(s.id)) {
        pinned.push(s);
        return;
      }
      const updatedTime = s.updatedAt ? new Date(s.updatedAt).getTime() : NaN;
      if (!isNaN(updatedTime)) {
        const diff = now - updatedTime;
        if (diff <= oneDayMs) today.push(s);
        else if (diff <= sevenDaysMs) previous7Days.push(s);
        else older.push(s);
      } else {
        if (index < 5) today.push(s);
        else if (index < 15) previous7Days.push(s);
        else older.push(s);
      }
    });

    return { pinned, today, previous7Days, older };
  }, [filteredSessions, pinnedIds]);

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev]
    );
  };

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const saveEditing = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    if (editingTitle.trim() && onRenameSession) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const folder: ProjectFolder = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      sessionIds: [],
    };
    setProjects((prev) => [folder, ...prev]);
    setExpandedProjectIds((prev) => [...prev, folder.id]);
    setNewProjectName('');
    setIsCreatingProject(false);
  };

  const toggleSessionInProject = (projectId: string, sessionId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const exists = p.sessionIds.includes(sessionId);
        return {
          ...p,
          sessionIds: exists
            ? p.sessionIds.filter((id) => id !== sessionId)
            : [...p.sessionIds, sessionId],
        };
      })
    );
    setAssigningSessionId(null);
  };

  const deleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const displayName = user?.name || 'Nebula User';
  const displayEmail = user?.email || 'Not signed in';
  const avatarUrl =
    user?.avatar && user.avatar !== '/avatar.jpg' && !user.avatar.includes('dicebear.com')
      ? user.avatar
      : null;
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  const initials =
    displayName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'NU';

  const renderSessionItem = (item: ChatSession) => {
    const isActive = currentSessionId === item.id;
    const isPinned = pinnedIds.includes(item.id);
    const isEditing = editingSessionId === item.id;

    return (
      <div
        key={item.id}
        onClick={() => {
          if (!isEditing) {
            onSelectSession(item.id);
            onCloseMobile();
          }
        }}
        className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer transition-colors ${
          isActive
            ? 'bg-[#ECECEC] dark:bg-[#262626] text-[#0D0D0D] dark:text-white font-medium'
            : 'text-[#383838] dark:text-[#B8B8B8] hover:text-[#0D0D0D] dark:hover:text-white hover:bg-[#ECECEC]/65 dark:hover:bg-[#212121]'
        }`}
      >
        {isEditing ? (
          <form
            onSubmit={(e) => saveEditing(item.id, e)}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 w-full"
          >
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingSessionId(null);
              }}
              className="w-full px-1.5 py-0.5 text-xs rounded bg-white dark:bg-[#141414] border border-blue-500 text-[#0D0D0D] dark:text-white outline-none"
            />
            <button
              type="submit"
              className="p-1 text-emerald-600 hover:text-emerald-500 shrink-0"
              title="Save"
            >
              <Check size={13} />
            </button>
          </form>
        ) : (
          <>
            <span className="truncate pr-1 flex-1 leading-snug">{item.title}</span>

            {/* ChatGPT-style Hover Action Strip */}
            <div
              className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              {projects.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAssigningSessionId(assigningSessionId === item.id ? null : item.id);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                  title="Move to Project Folder"
                >
                  <Folder size={12} />
                </button>
              )}
              <button
                onClick={(e) => togglePin(item.id, e)}
                className={`p-1 rounded transition-colors ${
                  isPinned
                    ? 'text-amber-500 hover:text-amber-600'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title={isPinned ? 'Unpin chat' : 'Pin chat'}
              >
                <Pin size={12} />
              </button>
              <button
                onClick={(e) => startEditing(item, e)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded transition-colors"
                title="Rename chat"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={(e) => onDeleteSession(item.id, e)}
                className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                title="Delete chat"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}

        {/* Folder assignment mini-dropdown */}
        {assigningSessionId === item.id && projects.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-full mt-1 z-50 w-44 rounded-xl bg-white dark:bg-[#1F1F1F] border border-[#E5E5E5] dark:border-[#333] shadow-xl p-1 text-xs"
          >
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase">
              Add to Project
            </div>
            {projects.map((p) => {
              const inFolder = p.sessionIds.includes(item.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleSessionInProject(p.id, item.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A] text-left"
                >
                  <span className="truncate">{p.name}</span>
                  {inFolder && <Check size={12} className="text-emerald-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Collapsed Floating Rail Trigger (Identical to ChatGPT Desktop) */}
      {isCollapsedDesktop && (
        <div className="hidden md:flex fixed top-2.5 left-3 z-40 items-center gap-1 bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-md border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-xl p-1 shadow-xs">
          <button
            onClick={() => setIsCollapsedDesktop(false)}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
            title="Open sidebar"
          >
            <PanelLeftOpen size={17} />
          </button>
          <button
            onClick={onNewChat}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
            title="New chat"
          >
            <SquarePen size={17} />
          </button>
        </div>
      )}

      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/30 backdrop-blur-2xs z-40 md:hidden"
        />
      )}

      <aside
        className={`
          fixed md:static top-0 left-0 bottom-0 z-50
          ${isCollapsedDesktop ? 'md:w-0 md:border-r-0 md:overflow-hidden' : 'w-[260px] border-r border-[#E5E5E5] dark:border-[#262626]'}
          bg-[#F9F9F9] dark:bg-[#171717] flex flex-col justify-between
          transition-all duration-200 ease-in-out
          ${isOpenMobile ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0'}
          h-full select-none
        `}
      >
        {/* Top Action Bar (ChatGPT Authentic Header) */}
        <div className="px-2.5 pt-2.5 pb-1 flex items-center justify-between shrink-0">
          <button
            onClick={() => setIsCollapsedDesktop(true)}
            className="hidden md:flex p-2 rounded-lg text-[#5D5D5D] dark:text-[#B4B4B4] hover:bg-[#ECECEC] dark:hover:bg-[#242424] transition-colors cursor-pointer"
            title="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>

          {/* Mobile brand header */}
          <div className="flex md:hidden items-center gap-2 px-1">
            <img src="/cosmic_orb.jpg" alt="Nebula" className="w-6 h-6 rounded-full object-cover" />
            <span className="font-bold text-sm text-[#0D0D0D] dark:text-white">Nebula AI</span>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowSearch((prev) => !prev)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                showSearch
                  ? 'bg-[#ECECEC] dark:bg-[#262626] text-[#0D0D0D] dark:text-white'
                  : 'text-[#5D5D5D] dark:text-[#B4B4B4] hover:bg-[#ECECEC] dark:hover:bg-[#242424]'
              }`}
              title="Search conversations"
            >
              <Search size={17} />
            </button>
            <button
              onClick={() => {
                onNewChat();
                onCloseMobile();
              }}
              className="p-2 rounded-lg text-[#5D5D5D] dark:text-[#B4B4B4] hover:bg-[#ECECEC] dark:hover:bg-[#242424] transition-colors cursor-pointer"
              title="New chat"
            >
              <SquarePen size={17} />
            </button>
            <button
              onClick={onCloseMobile}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-[#ECECEC] dark:hover:bg-[#242424]"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation + History Container */}
        <div className="px-2.5 py-1.5 flex-1 flex flex-col gap-1 overflow-y-auto">
          {/* Expandable Search Input */}
          {showSearch && (
            <div className="mb-1.5">
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  placeholder="Search chats..."
                  className="w-full pl-8 pr-6 py-1.5 rounded-lg bg-white dark:bg-[#222222] text-xs text-[#0D0D0D] dark:text-[#ECECEC] placeholder-gray-400 border border-[#E5E5E5] dark:border-[#333] outline-hidden transition-all"
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
          )}

          {/* ChatGPT-Style Primary GPT & Workspace Stack */}
          <div className="flex flex-col gap-0.5 text-[13px] font-medium text-[#1F1F1F] dark:text-[#E3E3E3]">
            {/* Primary Model Row (Identical to ChatGPT top row) */}
            <button
              onClick={() => {
                onNewChat();
                onCloseMobile();
              }}
              className="group w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-[#ECECEC] dark:hover:bg-[#242424] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0 shadow-2xs">
                  <img
                    src="/cosmic_orb.jpg"
                    alt="Nebula AI"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-semibold truncate">Nebula AI</span>
              </div>
              <SquarePen
                size={14}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-opacity shrink-0"
              />
            </button>

            {/* FLUX.1 Visual Studio */}
            {onOpenFluxStudio && (
              <button
                onClick={() => {
                  onOpenFluxStudio();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-[#ECECEC] dark:hover:bg-[#242424] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Sparkles size={13} />
                  </div>
                  <span className="truncate">FLUX.1 Visual Studio</span>
                </div>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                  HD
                </span>
              </button>
            )}

            {/* Canvas & Artifacts Studio + Expandable Saved Artifacts */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between rounded-lg hover:bg-[#ECECEC] dark:hover:bg-[#242424] transition-colors">
                <button
                  onClick={() => {
                    onOpenCodex();
                    onCloseMobile();
                  }}
                  className="flex-1 flex items-center gap-2.5 px-2 py-2 cursor-pointer text-left min-w-0"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Code size={13} />
                  </div>
                  <span className="truncate">Canvas & Artifacts</span>
                </button>
                {extractedArtifacts.length > 0 && (
                  <button
                    onClick={() => setShowArtifactsDrawer((prev) => !prev)}
                    className="px-2 py-1.5 text-xs text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    title="View generated code artifacts"
                  >
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-gray-200/80 dark:bg-[#2E2E2E]">
                      {extractedArtifacts.length}
                    </span>
                    {showArtifactsDrawer ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
              </div>

              {showArtifactsDrawer && extractedArtifacts.length > 0 && (
                <div className="ml-5 pl-2.5 border-l border-[#E2E2E2] dark:border-[#2C2C2C] my-1 flex flex-col gap-0.5">
                  {extractedArtifacts.map((art) => (
                    <button
                      key={art.id}
                      onClick={() => {
                        if (onOpenArtifact) {
                          onOpenArtifact(art.code, art.language, art.title);
                        } else {
                          onOpenCodex();
                        }
                        onCloseMobile();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-[#ECECEC]/70 dark:hover:bg-[#242424] transition-colors text-left cursor-pointer"
                    >
                      <FileCode size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{art.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Explore GPTs / Specialized Personas */}
            <button
              onClick={() => {
                onOpenExplore();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#ECECEC] dark:hover:bg-[#242424] transition-colors cursor-pointer text-left"
            >
              <div className="w-6 h-6 rounded-full bg-gray-200/70 dark:bg-[#262626] text-[#424242] dark:text-[#B4B4B4] flex items-center justify-center shrink-0">
                <Compass size={13} />
              </div>
              <span>Explore GPTs</span>
            </button>

            {/* Prompt Library */}
            <button
              onClick={() => {
                onOpenLibrary();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#ECECEC] dark:hover:bg-[#242424] transition-colors cursor-pointer text-left"
            >
              <div className="w-6 h-6 rounded-full bg-gray-200/70 dark:bg-[#262626] text-[#424242] dark:text-[#B4B4B4] flex items-center justify-center shrink-0">
                <Library size={13} />
              </div>
              <span>Prompt Library</span>
            </button>

            {/* AI Memory (MemGPT) */}
            <button
              onClick={() => {
                onOpenSettings();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#ECECEC] dark:hover:bg-[#242424] transition-colors cursor-pointer text-left"
            >
              <div className="w-6 h-6 rounded-full bg-gray-200/70 dark:bg-[#262626] text-[#424242] dark:text-[#B4B4B4] flex items-center justify-center shrink-0">
                <Brain size={13} />
              </div>
              <span>Memory Core</span>
            </button>
          </div>

          {/* ChatGPT Projects (Custom Folders) Section */}
          <div className="mt-3 pt-2 border-t border-[#E5E5E5]/70 dark:border-[#262626]">
            <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              <span>Projects</span>
              <button
                onClick={() => setIsCreatingProject((prev) => !prev)}
                className="text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors cursor-pointer"
                title="Create new project folder"
              >
                <FolderPlus size={13} />
              </button>
            </div>

            {isCreatingProject && (
              <form onSubmit={handleCreateProject} className="px-2 py-1 flex items-center gap-1">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  autoFocus
                  className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#333] text-[#0D0D0D] dark:text-white outline-none"
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-lg bg-[#0D0D0D] dark:bg-white text-white dark:text-black text-xs font-semibold shrink-0 cursor-pointer"
                >
                  <Check size={12} />
                </button>
              </form>
            )}

            {projects.map((proj) => {
              const isExpanded = expandedProjectIds.includes(proj.id);
              const folderSessions = sessions.filter((s) => proj.sessionIds.includes(s.id));
              return (
                <div key={proj.id} className="flex flex-col">
                  <div
                    onClick={() =>
                      setExpandedProjectIds((prev) =>
                        prev.includes(proj.id)
                          ? prev.filter((id) => id !== proj.id)
                          : [...prev, proj.id]
                      )
                    }
                    className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] text-[#383838] dark:text-[#C0C0C0] hover:bg-[#ECECEC]/70 dark:hover:bg-[#222222] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? (
                        <FolderOpen size={14} className="text-amber-500 shrink-0" />
                      ) : (
                        <Folder size={14} className="text-gray-400 shrink-0" />
                      )}
                      <span className="truncate font-medium">{proj.name}</span>
                      <span className="text-[10px] text-gray-400">({folderSessions.length})</span>
                    </div>
                    <button
                      onClick={(e) => deleteProject(proj.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 rounded"
                      title="Delete project folder"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="ml-4 pl-2 border-l border-[#E5E5E5] dark:border-[#2A2A2A] flex flex-col gap-0.5 my-0.5">
                      {folderSessions.length === 0 ? (
                        <span className="px-2 py-1 text-[11px] text-gray-400 italic">
                          Hover any chat and click the folder icon to add
                        </span>
                      ) : (
                        folderSessions.map((s) => renderSessionItem(s))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Chronological & Pinned Chat History (Identical to Original ChatGPT) */}
          <div className="flex flex-col gap-3 mt-2">
            {filteredSessions.length === 0 ? (
              <div className="px-2.5 py-3 text-xs text-gray-400 italic">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </div>
            ) : (
              <>
                {groupedSessions.pinned.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Pin size={11} className="text-amber-500" />
                      <span>Pinned</span>
                    </div>
                    {groupedSessions.pinned.map((s) => renderSessionItem(s))}
                  </div>
                )}

                {groupedSessions.today.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Today
                    </div>
                    {groupedSessions.today.map((s) => renderSessionItem(s))}
                  </div>
                )}

                {groupedSessions.previous7Days.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Previous 7 Days
                    </div>
                    {groupedSessions.previous7Days.map((s) => renderSessionItem(s))}
                  </div>
                )}

                {groupedSessions.older.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Previous 30 Days
                    </div>
                    {groupedSessions.older.map((s) => renderSessionItem(s))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div className="relative p-2.5 border-t border-[#E5E5E5] dark:border-[#262626] flex flex-col gap-1.5 bg-[#F9F9F9] dark:bg-[#171717] shrink-0">
          {/* Popover Menu */}
          {isUserMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />

              <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 bg-white dark:bg-[#202020] rounded-2xl border border-[#E5E5E5] dark:border-[#2E2E2E] shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150 text-[#0D0D0D] dark:text-[#ECECEC]">
                <div
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-[#2A2A2A] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {avatarUrl && !avatarError ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarError(true)}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700 shadow-2xs"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#10A37F] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {initials}
                      </div>
                    )}
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
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-[#2A2A2A] transition-colors text-left text-[13px] font-medium text-[#0D0D0D] dark:text-[#ECECEC] cursor-pointer"
                >
                  <Sparkles size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Upgrade plan</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-[#2A2A2A] transition-colors text-left text-[13px] font-medium text-[#0D0D0D] dark:text-[#ECECEC] cursor-pointer"
                >
                  <Sliders size={16} className="text-gray-500 shrink-0" />
                  <span>Customize Nebula</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-[#2A2A2A] transition-colors text-left text-[13px] font-medium text-[#0D0D0D] dark:text-[#ECECEC] cursor-pointer"
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
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#F4F4F4] dark:hover:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 transition-colors text-left text-[13px] font-medium cursor-pointer"
                  >
                    <LogIn size={16} className="shrink-0" />
                    <span>Log in / Sign up</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Profile Trigger Button */}
          <div
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-[#ECECEC] dark:hover:bg-[#242424] transition-colors cursor-pointer text-[#0D0D0D] dark:text-[#ECECEC]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700 shadow-2xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#10A37F] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {initials}
                </div>
              )}
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
