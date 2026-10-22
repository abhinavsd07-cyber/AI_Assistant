import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Hero } from './components/Hero';
import { ChatThread } from './components/ChatThread';
import { ChatInput } from './components/ChatInput';
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

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState('Nebula 4.0e');
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
    } catch (e) {
      console.error('Error saving sessions:', e);
    }
  }, [sessions]);

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

  // Send message to live backend API
  const handleSendMessage = async (text: string, isReasoning: boolean) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Prompt prefix if reasoning mode is toggled
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
        }),
      });

      const data = await response.json();

      let replyText = '';
      if (data.success && data.reply) {
        replyText = data.reply;
      } else {
        replyText = `❌ Error: ${data.details || data.error || 'Failed to get response from AI model.'}`;
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      // Save/update session
      if (!currentSessionId) {
        const newId = `session-${Date.now()}`;
        const newSession: ChatSession = {
          id: newId,
          title: text.length > 28 ? `${text.slice(0, 28)}...` : text,
          messages: finalMessages,
          updatedAt: new Date().toISOString(),
        };
        setCurrentSessionId(newId);
        setSessions((prev) => [newSession, ...prev]);
      } else {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId ? { ...s, messages: finalMessages } : s
          )
        );
      }
    } catch (err: any) {
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: `❌ Connection error: Could not connect to backend server at ${apiUrl}.\n\nPlease ensure your backend server is running with 'npm run dev'. (${err.message})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
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

      {/* Main Glass Application Container (Matches screenshot browser frame) */}
      <div className="relative z-10 w-full max-w-[1400px] h-full max-h-[96vh] rounded-none md:rounded-[24px] 
        bg-[#0D0B1A]/90 backdrop-blur-2xl border-0 md:border border-white/[0.12] shadow-[0_25px_80px_rgba(0,0,0,0.85)]
        flex overflow-hidden transition-all duration-300">
        
        {/* Left Sidebar */}
        <Sidebar
          currentSessionId={currentSessionId}
          sessions={sessions}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenUpgrade={() => setIsUpgradeOpen(true)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Right Main Chat Stage */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#100D22]/60 to-[#0A0815]/90">
          {/* Top Bar with Simulated macOS Header & Model Selector */}
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
                <Hero onSelectSuggestion={(prompt) => handleSendMessage(prompt, false)} />
              ) : (
                <ChatThread messages={messages} isLoading={isLoading} />
              )}
            </div>

            {/* Bottom Floating Chat Input */}
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
      />

      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />
    </div>
  );
};

export default App;
