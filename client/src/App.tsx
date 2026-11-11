import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Hero } from './components/Hero';
import { ChatThread } from './components/ChatThread';
import { ChatInput, type FileAttachment } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { UpgradeModal } from './components/UpgradeModal';
import { VoiceModal } from './components/VoiceModal';
import { CanvasStudio } from './components/CanvasStudio';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './context/AuthContext';
import type { Message, ChatSession, PersonaType } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const App: React.FC = () => {
  const { user, token, isAuthenticated, currentView } = useAuth();

  // Dark / Light Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem('nebula_theme') as 'light' | 'dark' | null;
      if (savedTheme) return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('nebula_theme', theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // AI Persona state
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>('general');

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('nebula_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userName, setUserName] = useState<string>(() => {
    return user?.name || localStorage.getItem('nebula_user_name') || 'Guest User';
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    return user?.email || localStorage.getItem('nebula_user_email') || 'Sign in to sync history';
  });

  useEffect(() => {
    if (user) {
      setUserName(user.name);
      setUserEmail(user.email);
    }
  }, [user]);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash-lite');
  const [isLoading, setIsLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState(`${API_BASE}/api/chat`);

  // Modals & responsive drawer
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Interactive Canvas Studio state
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasCode, setCanvasCode] = useState('');
  const [canvasLanguage, setCanvasLanguage] = useState('html');
  const [canvasTitle, setCanvasTitle] = useState('Interactive Canvas');

  const handleOpenCanvas = (code: string, language: string, title?: string) => {
    setCanvasCode(code);
    setCanvasLanguage(language);
    setCanvasTitle(title || `Artifact: ${language.toUpperCase()}`);
    setIsCanvasOpen(true);
  };

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nebula_sessions', JSON.stringify(sessions));
      if (!isAuthenticated) {
        localStorage.setItem('nebula_user_name', userName);
        localStorage.setItem('nebula_user_email', userEmail);
      }
    } catch (e) {
      console.error('Error saving storage:', e);
    }
  }, [sessions, userName, userEmail, isAuthenticated]);

  // Sync from backend MongoDB sessions if available
  useEffect(() => {
    const fetchMongoSessions = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/api/sessions`, { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
          const mapped: ChatSession[] = data.sessions.map((s: any) => ({
            id: s.sessionId || s._id,
            title: s.title,
            messages: s.messages || [],
            updatedAt: s.updatedAt || new Date().toISOString(),
          }));
          setSessions((prev) => {
            const combined = [...mapped, ...prev.filter(p => !mapped.some(m => m.id === p.id))];
            return combined;
          });
        }
      } catch {
        // Backend offline fallback to localStorage
      }
    };
    fetchMongoSessions();
  }, [token]);

  // Select a past session from sidebar
  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    const session = sessions.find((s) => s.id === id);
    if (session) {
      setMessages(session.messages);
    }
  };

  // Start fresh chat session
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  // Delete chat session
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      handleNewChat();
    }
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${API_BASE}/api/sessions/${id}`, { method: 'DELETE', headers });
    } catch {
      // Handled silently
    }
  };

  // Send message to live backend API with Multi-turn history, attachments, personas, and sub-second SSE streaming
  const handleSendMessage = async (
    text: string, 
    isReasoning: boolean = false, 
    attachment?: FileAttachment | null,
    isWebSearch: boolean = false,
    isImageGen: boolean = false,
    historyOverride?: Message[]
  ): Promise<string> => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text || (attachment ? `[Analyzing ${attachment.name}...]` : ''),
      timestamp,
      imageUrl: attachment?.isImage ? attachment.previewUrl : undefined,
      fileName: attachment?.name,
      fileType: attachment?.mimeType,
    };

    const baseHistory = historyOverride || messages;
    const newMessages = [...baseHistory, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const activeSessionId = currentSessionId || `session-${Date.now()}`;
    if (!currentSessionId) {
      setCurrentSessionId(activeSessionId);
    }

    try {
      const formattedMessage = isReasoning
        ? `[DEEP REASONING ACTIVATED: Think step-by-step and provide deep insights] ${text}`
        : text;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Sanitize history turns
      const sanitizedHistory = baseHistory.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          message: formattedMessage,
          model: selectedModel,
          history: sanitizedHistory,
          image: attachment ? {
            mimeType: attachment.mimeType,
            data: attachment.data,
            previewUrl: attachment.previewUrl,
            name: attachment.name,
          } : null,
          sessionId: activeSessionId,
          isReasoning,
          isWebSearch,
          persona: selectedPersona,
          isImageGen,
          stream: true,
        }),
      });

      const assistantId = `msg-${Date.now() + 1}`;
      const assistantTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Handle Real-Time Server-Sent Events (SSE) Streaming
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let hasStarted = false;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.fullText) {
                  fullText = parsed.fullText;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, text: fullText, imageUrl: parsed.imageUrl } : m
                    )
                  );
                } else if (parsed.chunk) {
                  if (!hasStarted) {
                    hasStarted = true;
                    setIsLoading(false);
                    fullText = parsed.chunk;
                    setMessages([
                      ...newMessages,
                      {
                        id: assistantId,
                        sender: 'assistant',
                        text: fullText,
                        timestamp: assistantTimestamp,
                      },
                    ]);
                  } else {
                    fullText += parsed.chunk;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId ? { ...m, text: fullText } : m
                      )
                    );
                  }
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e: any) {
                if (e.message && e.message.includes('Failed to generate')) {
                  throw e;
                }
              }
            }
          }
        }

        const finalAssistantMsg: Message = {
          id: assistantId,
          sender: 'assistant',
          text: fullText || 'No response generated.',
          timestamp: assistantTimestamp,
        };

        const updatedHistory = [...newMessages, finalAssistantMsg];
        setMessages(updatedHistory);
        setIsLoading(false);

        // Update session in sidebar
        const sessionTitle = text.slice(0, 30) || (attachment ? attachment.name.slice(0, 30) : 'Chat');
        setSessions((prev) => {
          const exists = prev.find((s) => s.id === activeSessionId);
          if (exists) {
            return prev.map((s) =>
              s.id === activeSessionId
                ? { ...s, messages: updatedHistory, updatedAt: new Date().toISOString() }
                : s
            );
          }
          return [
            {
              id: activeSessionId,
              title: sessionTitle,
              messages: updatedHistory,
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ];
        });

        return fullText;
      }

      // Fallback JSON handling
      const data = await response.json();
      setIsLoading(false);

      if (data.success && data.reply) {
        const assistantMsg: Message = {
          id: assistantId,
          sender: 'assistant',
          text: data.reply,
          timestamp: assistantTimestamp,
          imageUrl: data.imageUrl,
        };
        const updatedHistory = [...newMessages, assistantMsg];
        setMessages(updatedHistory);

        const sessionTitle = text.slice(0, 30) || (attachment ? attachment.name.slice(0, 30) : 'Chat');
        setSessions((prev) => {
          const exists = prev.find((s) => s.id === activeSessionId);
          if (exists) {
            return prev.map((s) =>
              s.id === activeSessionId
                ? { ...s, messages: updatedHistory, updatedAt: new Date().toISOString() }
                : s
            );
          }
          return [
            {
              id: activeSessionId,
              title: sessionTitle,
              messages: updatedHistory,
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ];
        });

        return data.reply;
      } else {
        throw new Error(data.error || 'Failed to generate response.');
      }
    } catch (err: any) {
      setIsLoading(false);
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: `⚠️ **Error:** ${err.message || 'Unable to connect to Nebula AI service.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, errorMessage]);
      return '';
    }
  };

  // Edit in-place user prompt & regenerate
  const handleEditMessage = (messageId: string, newText: string) => {
    const targetIndex = messages.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) return;

    // Retain conversations prior to this message
    const prior = messages.slice(0, targetIndex);
    handleSendMessage(newText, false, null, false, false, prior);
  };

  // Regenerate response for the last assistant turn
  const handleRegenerate = (messageId: string) => {
    const assistantIndex = messages.findIndex((m) => m.id === messageId);
    if (assistantIndex === -1) return;

    let userPrompt = '';
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        userPrompt = messages[i].text;
        break;
      }
    }

    if (!userPrompt) return;
    const historyBefore = messages.slice(0, assistantIndex);
    setMessages(historyBefore);
    handleSendMessage(userPrompt, false, null, false, false, historyBefore.slice(0, -1));
  };

  // Export Chat as Markdown (.md)
  const handleExportMarkdown = () => {
    if (messages.length === 0) {
      alert('No messages to export.');
      return;
    }
    const title = sessions.find((s) => s.id === currentSessionId)?.title || 'Nebula AI Conversation';
    const content = `# ${title}\n*Exported from Nebula AI on ${new Date().toLocaleString()}*\n\n---\n\n` +
      messages.map((m) => `### ${m.sender === 'user' ? '👤 User' : '✨ Nebula AI'} (${m.timestamp})\n\n${m.text}\n`).join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Chat as Plain Text (.txt)
  const handleExportText = () => {
    if (messages.length === 0) {
      alert('No messages to export.');
      return;
    }
    const title = sessions.find((s) => s.id === currentSessionId)?.title || 'Nebula AI Conversation';
    const content = `${title}\nExported on ${new Date().toLocaleString()}\n\n` +
      messages.map((m) => `[${m.timestamp}] ${m.sender === 'user' ? 'You' : 'Nebula AI'}:\n${m.text}\n`).join('\n----------------------------------------\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Authentication views
  if (currentView === 'login' || currentView === 'signup') {
    return <AuthPage initialMode={currentView} />;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#FCFCFC] dark:bg-[#121212] text-[#0D0D0D] dark:text-[#ECECEC] transition-colors duration-200">
      {/* Left Sidebar */}
      <Sidebar
        currentSessionId={currentSessionId}
        sessions={sessions}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Right Main Chat Stage */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FCFCFC] dark:bg-[#121212]">
        {/* Top Bar */}
        <TopBar
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          selectedPersona={selectedPersona}
          onSelectPersona={setSelectedPersona}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenVoiceMode={() => setIsVoiceModalOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onClearChat={handleNewChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onExportMarkdown={handleExportMarkdown}
          onExportText={handleExportText}
        />

        {/* Center Stage: Hero Welcome Screen OR Chat Message Thread + Split-Screen Canvas */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
              {messages.length === 0 ? (
                <Hero onSelectSuggestion={(prompt) => handleSendMessage(prompt, false, null)} />
              ) : (
                <ChatThread
                  messages={messages}
                  isLoading={isLoading}
                  onRegenerate={handleRegenerate}
                  onEditMessage={handleEditMessage}
                  onOpenCanvas={handleOpenCanvas}
                />
              )}
            </div>

            {/* Bottom Floating Chat Input with Vision, Documents & Speech */}
            <div className="flex-shrink-0">
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            </div>
          </div>

          {/* Interactive Split-Screen Canvas Studio */}
          {isCanvasOpen && (
            <CanvasStudio
              initialCode={canvasCode}
              initialLanguage={canvasLanguage}
              title={canvasTitle}
              onClose={() => setIsCanvasOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Hands-free Voice Mode Modal */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSendMessage={(speechText) => handleSendMessage(speechText, false, null)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiUrl={apiUrl}
        setApiUrl={setApiUrl}
        userName={userName}
        setUserName={setUserName}
        userEmail={userEmail}
        setUserEmail={setUserEmail}
      />

      {/* Upgrade Plan Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />
    </div>
  );
};

export default App;
