import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Hero } from './components/Hero';
import { ChatThread } from './components/ChatThread';
import { ChatInput, type ImageAttachment } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { UpgradeModal } from './components/UpgradeModal';
import type { Message, ChatSession } from './types';

export const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('nebula_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('nebula_user_name') || 'Linda Pewtersmith';
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('nebula_user_email') || 'linda.h13@gmail.com';
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState('Nebula 4.0e');
  const [isLoading, setIsLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:5000/api/chat');

  // Modals & responsive drawer
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sync profile & sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nebula_sessions', JSON.stringify(sessions));
      localStorage.setItem('nebula_user_name', userName);
      localStorage.setItem('nebula_user_email', userEmail);
    } catch (e) {
      console.error('Error saving storage:', e);
    }
  }, [sessions, userName, userEmail]);

  // Sync from backend MongoDB sessions if available
  useEffect(() => {
    const fetchMongoSessions = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/sessions');
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
      } catch (err) {
        // Backend not ready or offline - fallback to localStorage smoothly
      }
    };
    fetchMongoSessions();
  }, []);

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
      await fetch(`http://localhost:5000/api/sessions/${id}`, { method: 'DELETE' });
    } catch (err) {
      // Handled silently
    }
  };

  // Send message to live backend API with Multi-turn history, image, and streaming typewriter
  const handleSendMessage = async (
    text: string, 
    isReasoning: boolean, 
    imageAttachment?: ImageAttachment | null
  ) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text || (imageAttachment ? '[Analyzing Image...]' : ''),
      timestamp,
      imageUrl: imageAttachment?.previewUrl,
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

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: formattedMessage,
          model: selectedModel,
          history: messages.slice(-8),
          image: imageAttachment ? {
            mimeType: imageAttachment.mimeType,
            data: imageAttachment.data,
            previewUrl: imageAttachment.previewUrl,
          } : null,
          sessionId: activeSessionId,
        }),
      });

      const data = await response.json();
      setIsLoading(false);

      let replyText = '';
      if (data.success && data.reply) {
        replyText = data.reply;
      } else {
        replyText = `❌ Error: ${data.details || data.error || 'Failed to get response from AI model.'}`;
      }

      // Smooth typewriter streaming animation
      const assistantId = `msg-${Date.now() + 1}`;
      const initialAssistantMessage: Message = {
        id: assistantId,
        sender: 'assistant',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...newMessages, initialAssistantMessage]);

      let charIndex = 0;
      const fullText = replyText;
      const step = Math.max(3, Math.floor(fullText.length / 50));
      
      const streamTimer = setInterval(() => {
        charIndex += step;
        if (charIndex >= fullText.length) {
          charIndex = fullText.length;
          clearInterval(streamTimer);
        }

        const currentStream = fullText.slice(0, charIndex);

        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === assistantId ? { ...m, text: currentStream } : m
          );

          // Update session storage on completion
          if (charIndex >= fullText.length) {
            setSessions((sessionList) => {
              const existing = sessionList.find((s) => s.id === activeSessionId);
              if (!existing) {
                const newSession: ChatSession = {
                  id: activeSessionId,
                  title: text.length > 28 ? `${text.slice(0, 28)}...` : text || 'Image Analysis',
                  messages: updated,
                  updatedAt: new Date().toISOString(),
                };
                return [newSession, ...sessionList];
              }
              return sessionList.map((s) =>
                s.id === activeSessionId ? { ...s, messages: updated } : s
              );
            });
          }

          return updated;
        });
      }, 18);

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

  return (
    <div 
      className="h-screen w-screen flex items-center justify-center p-0 md:p-2 lg:p-3 relative overflow-hidden bg-[#06050C]"
      style={{
        backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.15) 0%, transparent 70%), url('/mountain_bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
      }}
    >
      {/* Background dark atmosphere overlay */}
      <div className="absolute inset-0 bg-[#06050C]/60 backdrop-blur-[1px] pointer-events-none" />

      {/* Main Glass Application Container */}
      <div className="relative z-10 w-full max-w-[1400px] h-full max-h-[96vh] rounded-none md:rounded-[24px] 
        bg-[#0D0B1A]/90 backdrop-blur-2xl border-0 md:border border-white/[0.12] shadow-[0_25px_80px_rgba(0,0,0,0.85)]
        flex overflow-hidden transition-all duration-300">
        
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
          userName={userName}
          userEmail={userEmail}
        />

        {/* Right Main Chat Stage */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#100D22]/60 to-[#0A0815]/90">
          {/* Top Bar */}
          <TopBar
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onClearChat={handleNewChat}
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

            {/* Bottom Floating Chat Input with Vision & Speech */}
            <div className="flex-shrink-0">
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            </div>
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
