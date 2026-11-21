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
  FileText,
  Pencil,
  Download,
  Sparkles
} from 'lucide-react';
import type { Message } from '../types';

interface ChatThreadProps {
  messages: Message[];
  isLoading: boolean;
  onRegenerate?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onOpenCanvas?: (code: string, language: string, title?: string) => void;
}

export const ChatThread: React.FC<ChatThreadProps> = ({ 
  messages, 
  isLoading, 
  onRegenerate,
  onEditMessage,
  onOpenCanvas
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadCode = (code: string, lang: string) => {
    const extMap: Record<string, string> = {
      python: 'py', py: 'py',
      javascript: 'js', js: 'js',
      typescript: 'ts', ts: 'ts',
      tsx: 'tsx', jsx: 'jsx',
      html: 'html', css: 'css',
      json: 'json', markdown: 'md', md: 'md',
      sql: 'sql', sh: 'sh', bash: 'sh',
      c: 'c', cpp: 'cpp', java: 'java', rust: 'rs',
    };
    const ext = extMap[lang.toLowerCase()] || 'txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nebula_${lang || 'code'}_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSpeech = (text: string, id: string) => {
    if (ttsAudioRef.current) {
      try {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.src = '';
      } catch {
        // Ignore
      }
      ttsAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }

    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*#_`~>[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    setSpeakingId(id);
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
    const audio = new Audio(`${apiBase}/api/tts?lang=auto&text=${encodeURIComponent(cleanText.slice(0, 750))}`);
    ttsAudioRef.current = audio;
    audio.onended = () => setSpeakingId(null);
    audio.onerror = () => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = /[\u0D00-\u0D7F]/.test(cleanText)
          ? 'ml-IN'
          : /[\u0B80-\u0BFF]/.test(cleanText)
          ? 'ta-IN'
          : /[\u0900-\u097F]/.test(cleanText)
          ? 'hi-IN'
          : 'en-IN';
        utterance.onend = () => setSpeakingId(null);
        utterance.onerror = () => setSpeakingId(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setSpeakingId(null);
      }
    };
    audio.play().catch(() => {
      setSpeakingId(null);
    });
  };

  const handleStartEdit = (message: Message) => {
    setEditingId(message.id);
    setEditText(message.text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSaveEdit = (messageId: string) => {
    if (editText.trim() && onEditMessage) {
      onEditMessage(messageId, editText.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="@container flex-1 px-3 sm:px-5 @lg:px-12 py-4 sm:py-8 space-y-5 sm:space-y-7 max-w-3xl mx-auto w-full min-w-0">
      {messages.map((message) => {
        const isUser = message.sender === 'user';

        return (
          <div
            key={message.id}
            className={`flex flex-col w-full min-w-0 animate-in fade-in duration-150 ${
              isUser ? 'items-end' : 'items-start'
            }`}
          >
            {/* User message */}
            {isUser ? (
              <div className="relative group max-w-[92%] @md:max-w-[78%] min-w-0 flex flex-col items-end">
                {editingId === message.id ? (
                  <div className="w-full max-w-full min-w-[200px] sm:min-w-[260px] rounded-[20px] p-3 bg-white dark:bg-[#1E1E1E] border border-blue-500 shadow-md flex flex-col gap-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={Math.min(6, Math.max(2, editText.split('\n').length))}
                      className="w-full text-[16px] sm:text-[14.5px] leading-relaxed bg-transparent text-[#0D0D0D] dark:text-[#ECECEC] outline-hidden resize-none p-1"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(message.id)}
                        disabled={!editText.trim() || isLoading}
                        className="px-3.5 py-1 rounded-lg text-xs font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                      >
                        Save & Submit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 max-w-full min-w-0">
                    {onEditMessage && !isLoading && (
                      <button
                        onClick={() => handleStartEdit(message)}
                        title="Edit Prompt"
                        className="opacity-65 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-all cursor-pointer shrink-0"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    <div className="rounded-[20px] sm:rounded-[24px] px-3.5 sm:px-5 py-2 sm:py-2.5 text-[14.5px] sm:text-[15px] leading-relaxed bg-[#F3EFE6] dark:bg-[#2A2723] text-[#1F1E1B] dark:text-[#F0ECE1] border border-[#E5DFD3] dark:border-[#3E3A33] shadow-2xs max-w-full min-w-0 overflow-hidden">
                      {message.imageUrl ? (
                        <div className="mb-2 rounded-xl overflow-hidden max-w-full sm:max-w-sm">
                          <img src={message.imageUrl} alt="Attached" className="w-full max-h-60 object-cover" />
                        </div>
                      ) : message.fileName ? (
                        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-black/40 border border-[#EAE4D9] dark:border-[#3E3A33] text-xs text-[#1F1E1B] dark:text-[#F0ECE1] max-w-full">
                          <FileText size={16} className="text-[#D97736] shrink-0" />
                          <span className="font-semibold truncate max-w-[170px] sm:max-w-[200px]">{message.fileName}</span>
                        </div>
                      ) : null}
                      <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.text}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Assistant message with rich Markdown rendering */
              <div className="w-full min-w-0 text-[#1F1E1B] dark:text-[#F0ECE1] leading-relaxed group">
                <div className="text-[14.5px] sm:text-[15px] leading-relaxed markdown-content w-full min-w-0">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl md:text-2xl font-bold mt-4 mb-2 text-[#0D0D0D] dark:text-[#F0F0F0] tracking-tight">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg md:text-xl font-bold mt-3.5 mb-2 text-[#0D0D0D] dark:text-[#F0F0F0] tracking-tight">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold mt-3 mb-1 text-[#0D0D0D] dark:text-[#F0F0F0]">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="my-2 leading-relaxed text-[#212121] dark:text-[#D8D8D8] text-[15px]">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 my-2.5 space-y-1 text-[#212121] dark:text-[#D8D8D8]">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 my-2.5 space-y-1 text-[#212121] dark:text-[#D8D8D8]">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed pl-1">{children}</li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-3 border-gray-300 dark:border-gray-700 pl-4 py-1 my-3 text-gray-600 dark:text-gray-400 italic bg-gray-50/60 dark:bg-gray-900/40 rounded-r-lg">
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="my-4 w-full max-w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-xs sm:text-sm">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold text-xs uppercase tracking-wider">
                          {children}
                        </thead>
                      ),
                      th: ({ children }) => (
                        <th className="px-3 sm:px-4 py-2 sm:py-2.5 text-left whitespace-nowrap">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="px-3 sm:px-4 py-2 border-t border-gray-100 dark:border-gray-850 text-gray-700 dark:text-gray-300">{children}</td>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline items-center gap-1 text-zinc-900 dark:text-zinc-100 underline decoration-zinc-300 dark:decoration-zinc-600 underline-offset-4 hover:decoration-zinc-900 dark:hover:decoration-zinc-100 font-medium transition-colors break-all"
                        >
                          <span>{children}</span>
                          <ExternalLink size={12} className="inline ml-1 opacity-70 align-baseline" />
                        </a>
                      ),
                      img: ({ src, alt }) => (
                        <div className="my-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-[#2A2A32] bg-[#F4F4F6] dark:bg-[#111215] shadow-sm w-full max-w-full sm:max-w-lg">
                          <img src={src} alt={alt || 'Generated visual'} className="w-full max-h-[440px] object-contain" />
                          <div className="px-3 py-2 bg-white dark:bg-[#16161A] border-t border-gray-200 dark:border-[#26262C] flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className="truncate min-w-0 flex-1 font-medium">{alt || 'Generated Visual'}</span>
                            {src && (
                              <a
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors font-medium shrink-0"
                              >
                                <Download size={13} />
                                <span>Save</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ),
                      code: ({ className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        const codeString = String(children).replace(/\n$/, '');
                        const isBlock = match || codeString.includes('\n');

                        if (!isBlock) {
                          return (
                            <code className="px-1.5 py-0.5 rounded-md text-[12.5px] sm:text-[13px] font-mono bg-[#F1F5F9] dark:bg-[#242429] text-[#0F172A] dark:text-[#E2E8F0] border border-black/[0.06] dark:border-white/[0.08] break-words [overflow-wrap:anywhere]" {...props}>
                              {children}
                            </code>
                          );
                        }

                        const hashCode = Array.from(codeString).reduce(
                          (acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0,
                          0
                        );
                        const codeId = `code-${message.id}-${language || 'txt'}-${(hashCode >>> 0).toString(36)}`;

                        return (
                          <div className="relative my-4 w-full max-w-full rounded-2xl overflow-hidden border border-gray-800 bg-[#0D1117] text-gray-100 shadow-md">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#161B22] border-b border-gray-800/80 text-xs text-gray-400 font-mono">
                              <span className="uppercase tracking-wider font-semibold text-gray-300 truncate">
                                {language || 'code'}
                              </span>
                              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                                <button
                                  onClick={() => onOpenCanvas?.(codeString, language || 'html', `Artifact: ${language || 'Code'}`)}
                                  className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all text-[11px] font-sans font-medium cursor-pointer"
                                  title="Open in Interactive Canvas Preview"
                                >
                                  <Sparkles size={12} className="text-emerald-400 shrink-0" />
                                  <span>Canvas</span>
                                </button>
                                <button
                                  onClick={() => handleDownloadCode(codeString, language)}
                                  className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-gray-800/70 hover:bg-gray-700 text-gray-300 hover:text-white transition-all text-[11px] font-sans cursor-pointer"
                                  title="Download code as file"
                                >
                                  <Download size={12} className="shrink-0" />
                                  <span className="hidden sm:inline">Save file</span>
                                  <span className="sm:hidden">Save</span>
                                </button>
                                <button
                                  onClick={() => copyToClipboard(codeString, codeId)}
                                  className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-gray-800/70 hover:bg-gray-700 text-gray-300 hover:text-white transition-all text-[11px] font-sans cursor-pointer"
                                >
                                  {copiedId === codeId ? (
                                    <>
                                      <Check size={12} className="text-emerald-400 shrink-0" />
                                      <span className="text-emerald-400 font-medium">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} className="shrink-0" />
                                      <span className="hidden sm:inline">Copy code</span>
                                      <span className="sm:hidden">Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                            <pre className="p-3 sm:p-4 overflow-x-auto max-w-full text-[12.5px] sm:text-[13.5px] font-mono leading-relaxed text-[#E6EDF3]">
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

                {/* Bottom Action Toolbar */}
                <div className="flex flex-wrap items-center gap-1 mt-3 text-gray-400 dark:text-gray-500">
                  <button
                    onClick={() => copyToClipboard(message.text, message.id)}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    title="Copy response"
                  >
                    {copiedId === message.id ? (
                      <Check size={15} className="text-emerald-600" />
                    ) : (
                      <Copy size={15} />
                    )}
                  </button>

                  <button
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    title="Bad response"
                  >
                    <ThumbsDown size={15} />
                  </button>

                  <button
                    onClick={() => toggleSpeech(message.text, message.id)}
                    className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                      speakingId === message.id ? 'text-[#0D0D0D] dark:text-white font-bold animate-pulse' : 'hover:text-gray-700 dark:hover:text-gray-300'
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
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    title="Share response"
                  >
                    <Share size={15} />
                  </button>

                  <button
                    onClick={() => onRegenerate && onRegenerate(message.id)}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    title="Regenerate response"
                  >
                    <RotateCw size={15} />
                  </button>

                  <button
                    onClick={() => copyToClipboard(message.text, `more-${message.id}`)}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
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
          <div className="w-2 h-2 rounded-full bg-[#0D0D0D] dark:bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#0D0D0D] dark:bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#0D0D0D] dark:bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
