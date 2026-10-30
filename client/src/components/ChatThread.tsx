import React, { useRef, useEffect, useState } from 'react';
import { 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  ThumbsDown, 
  RotateCw, 
  Share, 
  MoreHorizontal 
} from 'lucide-react';
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
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Code block omitted.');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const code = language ? lines.slice(1).join('\n') : lines.join('\n');

        return (
          <div key={index} className="my-3 rounded-2xl overflow-hidden border border-[#E5E5E5] bg-[#F7F7F8] shadow-2xs text-[#0D0D0D]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#EFEFEF] border-b border-[#E5E5E5] text-xs text-gray-600">
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">{language || 'code'}</span>
              <button
                onClick={() => copyToClipboard(code, `code-${index}`)}
                className="flex items-center gap-1 hover:text-black transition-colors cursor-pointer"
              >
                {copiedId === `code-${index}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedId === `code-${index}` ? 'Copied' : 'Copy code'}</span>
              </button>
            </div>
            <pre className="p-4 text-xs md:text-sm font-mono text-[#0D0D0D] overflow-x-auto leading-relaxed bg-[#F7F7F8]">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed text-[#0D0D0D] text-[15.5px]">
          {part}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 space-y-7 max-w-3xl mx-auto w-full">
      {messages.map((message) => {
        const isUser = message.sender === 'user';

        return (
          <div
            key={message.id}
            className={`flex flex-col animate-in fade-in duration-150 ${
              isUser ? 'items-end' : 'items-start'
            }`}
          >
            {/* User message (matching ChatGPT clean light gray pill) */}
            {isUser ? (
              <div className="max-w-[85%] md:max-w-[75%] rounded-[24px] px-5 py-2.5 text-[15px] leading-relaxed bg-[#F4F4F4] text-[#0D0D0D] border border-[#E5E5E5]/60 shadow-2xs">
                {message.imageUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
                    <img src={message.imageUrl} alt="Attached" className="w-full max-h-60 object-cover" />
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.text}</div>
              </div>
            ) : (
              /* Assistant message (matching exact clean text on white in screenshot) */
              <div className="w-full text-[#0D0D0D] leading-relaxed group">
                <div className="text-[15.5px] leading-relaxed">
                  {renderMessageContent(message.text)}
                </div>

                {/* Bottom Action Icon Bar (Copy, Thumbs down, Speaker, Share, Reload) */}
                <div className="flex items-center gap-1.5 mt-2.5 text-gray-400">
                  {/* Copy */}
                  <button
                    onClick={() => copyToClipboard(message.text, message.id)}
                    className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    title="Copy"
                  >
                    {copiedId === message.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  </button>

                  {/* Dislike */}
                  <button
                    onClick={() => alert('Feedback noted.')}
                    className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    title="Bad response"
                  >
                    <ThumbsDown size={15} />
                  </button>

                  {/* Speaker */}
                  <button
                    onClick={() => toggleSpeech(message.text, message.id)}
                    className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors cursor-pointer ${
                      speakingId === message.id ? 'text-[#0D0D0D] font-bold animate-pulse' : 'hover:text-gray-700'
                    }`}
                    title={speakingId === message.id ? "Stop voice" : "Read aloud"}
                  >
                    {speakingId === message.id ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>

                  {/* Share */}
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: 'Nebula AI', text: message.text });
                      } else {
                        copyToClipboard(message.text, `share-${message.id}`);
                      }
                    }}
                    className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    title="Share response"
                  >
                    <Share size={15} />
                  </button>

                  {/* Regenerate */}
                  <button
                    onClick={() => alert('Regenerating response...')}
                    className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    title="Regenerate response"
                  >
                    <RotateCw size={15} />
                  </button>

                  {/* More */}
                  <button
                    onClick={() => copyToClipboard(message.text, `more-${message.id}`)}
                    className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    title="More actions"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 animate-in fade-in duration-200">
          <div className="w-2 h-2 rounded-full bg-[#0D0D0D] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#0D0D0D] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#0D0D0D] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
