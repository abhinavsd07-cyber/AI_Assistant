import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Hero } from './components/Hero';
import { ChatThread } from './components/ChatThread';
import { ChatInput, type FileAttachment } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { UpgradeModal } from './components/UpgradeModal';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './context/AuthContext';
import type { Message, ChatSession } from './types';

export const App: React.FC = () => {
  const { user, token, isAuthenticated, currentView } = useAuth();

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

  // Keep state updated when user context changes
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
  const [apiUrl, setApiUrl] = useState('http://localhost:5000/api/chat');

  // Modals & responsive drawer
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
        const res = await fetch('http://localhost:5000/api/sessions', { headers });
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

  // Load selected session messages
  const handleSelectSession = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (session) {
      setCurrentSessionId(session.id);
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
      await fetch(`http://localhost:5000/api/sessions/${id}`, { method: 'DELETE', headers });
    } catch {
      // Handled silently
    }
  };

  // Send message to live backend API with Multi-turn history, attachments, and sub-second SSE streaming
  const handleSendMessage = async (
    text: string, 
    isReasoning: boolean, 
    attachment?: FileAttachment | null,
    isWebSearch?: boolean
  ) => {
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

    const newMessages = [...messages, userMessage];
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

      // Sanitize history so that we only send text (no huge base64 images repeatedly in every message)
      const sanitizedHistory = messages.slice(-6).map((m) => ({
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
          stream: true,
        }),
      });

      const assistantId = `msg-${Date.now() + 1}`;
      const assistantTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Handle Real-Time Server-Sent Events (SSE) Streaming with Line Buffering
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
          // Retain any incomplete trailing chunk in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.chunk) {
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

        setIsLoading(false);

        // Update local session storage
        setSessions((sessionList) => {
          const existing = sessionList.find((s) => s.id === activeSessionId);
          const finalAssistantMsg: Message = {
            id: assistantId,
            sender: 'assistant',
            text: fullText,
            timestamp: assistantTimestamp,
          };
          const finalMessages: Message[] = [
            ...newMessages,
            finalAssistantMsg,
          ];
          const sessionTitle = text.length > 28 
            ? `${text.slice(0, 28)}...` 
            : text || (attachment ? attachment.name : 'Conversation');

          if (!existing) {
            const newSession: ChatSession = {
              id: activeSessionId,
              title: sessionTitle,
              messages: finalMessages,
              updatedAt: new Date().toISOString(),
            };
            return [newSession, ...sessionList];
          }
          return sessionList.map((s) =>
            s.id === activeSessionId ? { ...s, messages: finalMessages } : s
          );
        });

      } else {
        // Standard JSON Fallback
        const data = await response.json();
        setIsLoading(false);

        let replyText = '';
        if (data.success && data.reply) {
          replyText = data.reply;
        } else {
          replyText = `❌ Error: ${data.details || data.error || 'Failed to get response from AI model.'}`;
        }

        const initialAssistantMessage: Message = {
          id: assistantId,
          sender: 'assistant',
          text: replyText,
          timestamp: assistantTimestamp,
        };

        setMessages([...newMessages, initialAssistantMessage]);

        setSessions((sessionList) => {
          const existing = sessionList.find((s) => s.id === activeSessionId);
          const sessionTitle = text.length > 28 
            ? `${text.slice(0, 28)}...` 
            : text || (attachment ? attachment.name : 'Conversation');

          if (!existing) {
            const newSession: ChatSession = {
              id: activeSessionId,
              title: sessionTitle,
              messages: [...newMessages, initialAssistantMessage],
              updatedAt: new Date().toISOString(),
            };
            return [newSession, ...sessionList];
          }
          return sessionList.map((s) =>
            s.id === activeSessionId ? { ...s, messages: [...newMessages, initialAssistantMessage] } : s
          );
        });
      }

    } catch (err: any) {
      setIsLoading(false);
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: `❌ Connection error: Could not connect to backend server at ${apiUrl}.\n\nPlease ensure your backend server is running with 'npm start'. (${err.message})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, errorMessage]);
    }
  };

  // Dedicated Full-Page Professional Authentication
  if (currentView === 'login' || currentView === 'signup') {
    return <AuthPage initialMode={currentView} />;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#FCFCFC] text-[#0D0D0D]">
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
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FCFCFC]">
        {/* Top Bar */}
        <TopBar
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onClearChat={handleNewChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Center Stage: Hero Welcome Screen OR Chat Message Thread */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
            {messages.length === 0 ? (
              <Hero onSelectSuggestion={(prompt) => handleSendMessage(prompt, false, null)} />
            ) : (
              <ChatThread messages={messages} isLoading={isLoading} />
            )}
          </div>

          {/* Bottom Floating Chat Input with Vision, Documents & Speech */}
          <div className="flex-shrink-0">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {/* Modals */}
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

      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />
    </div>
  );
};

export default App;
