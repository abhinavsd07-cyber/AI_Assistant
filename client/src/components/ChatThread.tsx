import React, { useRef, useEffect, useState } from 'react';
import { Copy, Check, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { Message } from '../types';

interface ChatThreadProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatThread: React.FC<ChatThreadProps> = ({ messages, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSpeech = (text: string, id: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown code blocks from speech
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Code block omitted.');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Helper to format code blocks cleanly
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const code = language ? lines.slice(1).join('\n') : lines.join('\n');

        return (
          <div key={index} className="my-3 rounded-xl overflow-hidden border border-purple-500/20 bg-[#0D0B18] shadow-lg">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.04] border-b border-white/[0.06] text-xs text-white/50">
              <span className="font-mono text-[11px] uppercase tracking-wider">{language || 'code'}</span>
              <button
                onClick={() => copyToClipboard(code, `code-${index}`)}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedId === `code-${index}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedId === `code-${index}` ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3.5 text-xs md:text-sm font-mono text-purple-200 overflow-x-auto leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 max-w-4xl mx-auto w-full">
      {messages.map((message) => {
        const isUser = message.sender === 'user';

        return (
          <div
            key={message.id}
            className={`flex items-start gap-3 md:gap-4 animate-in fade-in duration-200 ${
              isUser ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            {isUser ? (
              <img
                src="/avatar.jpg"
                alt="User"
                className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover ring-1 ring-purple-400/40 flex-shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-md flex-shrink-0 mt-0.5">
                <img
                  src="/cosmic_orb.jpg"
                  alt="Nebula"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            )}

            {/* Bubble Container */}
            <div
              className={`relative group max-w-[85%] md:max-w-[78%] rounded-2xl px-4 py-3 text-sm md:text-[14.5px] leading-relaxed shadow-lg ${
                isUser
                  ? 'bg-gradient-to-r from-purple-700/80 to-indigo-700/80 text-white border border-purple-400/25 rounded-tr-sm'
                  : 'bg-[#151126]/90 border border-white/[0.08] text-white/90 rounded-tl-sm backdrop-blur-xl'
              }`}
            >
              {/* Optional Attached Image in user bubble */}
              {message.imageUrl && (
                <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 max-w-sm">
                  <img src={message.imageUrl} alt="Attached" className="w-full max-h-60 object-cover" />
                </div>
              )}

              {renderMessageContent(message.text)}

              {/* Timestamp, Copy & Audio buttons */}
              <div className={`flex items-center gap-2 mt-2 pt-1 border-t border-white/[0.04] text-[10.5px] ${
                isUser ? 'text-purple-200/60 justify-end' : 'text-white/40 justify-between'
              }`}>
                <span>{message.timestamp}</span>

                {!isUser && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {/* Speaker Voice button */}
                    <button
                      onClick={() => toggleSpeech(message.text, message.id)}
                      className={`flex items-center gap-1 transition-colors ${
                        speakingId === message.id ? 'text-purple-300 animate-pulse' : 'hover:text-white'
                      }`}
                      title={speakingId === message.id ? "Stop voice" : "Read aloud"}
                    >
                      {speakingId === message.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      <span>{speakingId === message.id ? 'Stop' : 'Listen'}</span>
                    </button>

                    {/* Copy button */}
                    <button
                      onClick={() => copyToClipboard(message.text, message.id)}
                      className="flex items-center gap-1 hover:text-white transition-all ml-1"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check size={11} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isLoading && (
        <div className="flex items-start gap-3 md:gap-4 animate-in fade-in duration-200">
          <div className="w-8 h-8 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-purple-500 to-indigo-500 animate-spin">
            <img src="/cosmic_orb.jpg" alt="Nebula" className="w-full h-full rounded-full object-cover" />
          </div>
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-[#151126]/90 border border-purple-500/20 backdrop-blur-xl flex items-center gap-2 text-xs text-purple-300">
            <Sparkles size={13} className="animate-spin text-purple-400" />
            <span>Nebula is thinking & composing response...</span>
            <div className="flex gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
