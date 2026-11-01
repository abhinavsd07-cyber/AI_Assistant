import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  ThumbsDown, 
  RotateCw, 
  Share, 
  MoreHorizontal,
  ExternalLink,
  FileText
} from 'lucide-react';
import type { Message } from '../types';

interface ChatThreadProps {
  messages: Message[];
  isLoading: boolean;
  onRegenerate?: (messageId: string) => void;
}

export const ChatThread: React.FC<ChatThreadProps> = ({ messages, isLoading, onRegenerate }) => {
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
            {/* User message */}
            {isUser ? (
              <div className="max-w-[85%] md:max-w-[75%] rounded-[24px] px-5 py-2.5 text-[15px] leading-relaxed bg-[#F4F4F4] text-[#0D0D0D] border border-[#E5E5E5]/60 shadow-2xs">
                {message.imageUrl ? (
                  <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
                    <img src={message.imageUrl} alt="Attached" className="w-full max-h-60 object-cover" />
                  </div>
                ) : message.fileName ? (
                  <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-gray-200 text-xs text-gray-800">
                    <FileText size={16} className="text-blue-600" />
                    <span className="font-semibold truncate max-w-[200px]">{message.fileName}</span>
                  </div>
                ) : null}
                <div className="whitespace-pre-wrap">{message.text}</div>
              </div>
            ) : (
              /* Assistant message with rich Markdown rendering */
              <div className="w-full text-[#0D0D0D] leading-relaxed group">
                <div className="text-[15px] leading-relaxed markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl md:text-2xl font-bold mt-4 mb-2 text-[#0D0D0D] tracking-tight">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg md:text-xl font-bold mt-3.5 mb-2 text-[#0D0D0D] tracking-tight">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold mt-3 mb-1 text-[#0D0D0D]">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-3.5 last:mb-0 leading-relaxed text-[#1A1A1A]">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 mb-3.5 space-y-1 text-[#1A1A1A]">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 mb-3.5 space-y-1 text-[#1A1A1A]">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-3 bg-[#F9F9FB] rounded-r-lg italic text-gray-700">
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4 rounded-xl border border-[#E5E5E5]">
                          <table className="w-full text-left text-xs md:text-sm border-collapse">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-[#F4F4F6] border-b border-[#E5E5E5] text-[#0D0D0D] font-semibold">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-[#EFEFEF] bg-white">
                          {children}
                        </tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="hover:bg-gray-50/70 transition-colors">{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-3 py-2.5 font-semibold text-gray-800">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="px-3 py-2 text-gray-700">{children}</td>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-0.5"
                        >
                          {children}
                          <ExternalLink size={12} className="inline ml-0.5 opacity-70" />
                        </a>
                      ),
                      code: ({ className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const isInline = !className && !codeString.includes('\n');

                        if (isInline) {
                          return (
                            <code className="px-1.5 py-0.5 bg-[#F0F0F2] text-[#0D0D0D] rounded-md font-mono text-[13px] border border-[#E5E5E5]/70" {...props}>
                              {children}
                            </code>
                          );
                        }

                        const language = match ? match[1] : '';
                        const codeBlockId = `code-${message.id}-${Math.random().toString(36).substring(7)}`;

                        return (
                          <div className="my-3 rounded-2xl overflow-hidden border border-[#E5E5E5] bg-[#F7F7F8] shadow-2xs text-[#0D0D0D]">
                            <div className="flex items-center justify-between px-4 py-2 bg-[#EFEFEF] border-b border-[#E5E5E5] text-xs text-gray-600">
                              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">
                                {language || 'code'}
                              </span>
                              <button
                                onClick={() => copyToClipboard(codeString, codeBlockId)}
                                className="flex items-center gap-1 hover:text-black transition-colors cursor-pointer"
                              >
                                {copiedId === codeBlockId ? (
                                  <Check size={12} className="text-emerald-600" />
                                ) : (
                                  <Copy size={12} />
                                )}
                                <span>{copiedId === codeBlockId ? 'Copied' : 'Copy code'}</span>
                              </button>
                            </div>
                            <pre className="p-4 text-xs md:text-sm font-mono text-[#0D0D0D] overflow-x-auto leading-relaxed bg-[#F7F7F8]">
                              <code>{codeString}</code>
                            </pre>
                          </div>
                        );
                      },
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>

                {/* Bottom Action Icon Bar */}
                <div className="flex items-center gap-1.5 mt-3 text-gray-400">
                  <button
                    onClick={() => copyToClipboard(message.text, message.id)}
                    className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    title="Copy"
                  >
                    {copiedId === message.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  </button>

                  <button
                    onClick={() => alert('Feedback noted.')}
                    className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    title="Bad response"
                  >
                    <ThumbsDown size={15} />
                  </button>

                  <button
                    onClick={() => toggleSpeech(message.text, message.id)}
                    className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors cursor-pointer ${
                      speakingId === message.id ? 'text-[#0D0D0D] font-bold animate-pulse' : 'hover:text-gray-700'
                    }`}
                    title={speakingId === message.id ? "Stop voice" : "Read aloud"}
                  >
                    {speakingId === message.id ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>

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

                  <button
                    onClick={() => onRegenerate && onRegenerate(message.id)}
                    className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    title="Regenerate response"
                  >
                    <RotateCw size={15} />
                  </button>

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
