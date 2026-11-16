import React, { useState, useRef, useEffect } from 'react';
import { Plus, Lightbulb, Mic, ArrowUp, X, FileText, Globe, Image as ImageIcon } from 'lucide-react';

export interface FileAttachment {
  name: string;
  data: string;
  mimeType: string;
  previewUrl: string;
  isImage: boolean;
}

interface ChatInputProps {
  onSendMessage: (
    text: string, 
    isReasoning: boolean, 
    file?: FileAttachment | null, 
    isWebSearch?: boolean,
    isImageGen?: boolean
  ) => void;
  isLoading: boolean;
  onOpenVoiceMode?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, onOpenVoiceMode }) => {
  const [input, setInput] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [isImageGen, setIsImageGen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const speechLang = 'en-US';
  const [micError, setMicError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef<string>('');

  const stopRecording = React.useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  const startRecording = (lang: 'ml-IN' | 'en-US') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    stopRecording();
    setMicError(null);
    baseInputRef.current = input.trim() ? `${input.trim()} ` : '';

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          const nextValue = `${baseInputRef.current}${transcript}`;
          setInput(nextValue);
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'aborted') return;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError('Microphone permission denied. Allow mic access in your browser address bar.');
        } else if (event.error === 'network') {
          setMicError('Speech network error: Use Google Chrome or Microsoft Edge (Brave/Firefox block Web Speech API).');
        } else if (event.error === 'audio-capture') {
          setMicError('No microphone detected. Check your Windows microphone settings.');
        } else if (event.error === 'no-speech') {
          setMicError(lang === 'ml-IN' ? 'ശബ്ദം ലഭിച്ചില്ല (No speech detected). Please speak clearly.' : 'No speech detected.');
        } else {
          setMicError(`Mic error: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn('Speech recognition start failed:', e);
      setMicError(e.message || 'Could not start microphone.');
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(speechLang);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;

    if (isRecording) {
      stopRecording();
    }
    setMicError(null);
    onSendMessage(input.trim(), isReasoning, attachment, isWebSearch, isImageGen);
    setInput('');
    setAttachment(null);
    setIsImageGen(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setAttachment({
        name: file.name,
        data: base64Data,
        mimeType: file.type || 'application/octet-stream',
        previewUrl: result,
        isImage,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleImageGen = () => {
    const nextState = !isImageGen;
    setIsImageGen(nextState);
    if (nextState && !input.startsWith('/image')) {
      setInput((prev) => prev ? `/image ${prev}` : '/image ');
    } else if (!nextState && input.startsWith('/image')) {
      setInput((prev) => prev.replace(/^\/image\s*/i, ''));
    }
    textareaRef.current?.focus();
  };

  return (
    <div className="@container w-full max-w-3xl mx-auto px-3 sm:px-4 pb-4 min-w-0">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,text/*,.py,.js,.ts,.tsx,.json,.md,.txt"
        className="hidden"
        onChange={handleFileSelect}
      />

      <form
        onSubmit={handleSubmit}
        className="relative flex flex-col bg-white dark:bg-[#212124] rounded-[26px] border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 focus-within:border-gray-400 dark:focus-within:border-zinc-500 focus-within:shadow-md dark:focus-within:shadow-black/30 p-2 sm:p-2.5 shadow-xs transition-all overflow-hidden"
      >
        {/* Attachment preview banner */}
        {attachment && (
          <div className="mb-2 p-1.5 px-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 flex items-center gap-2.5 max-w-fit shadow-2xs">
            {attachment.isImage ? (
              <img
                src={attachment.previewUrl}
                alt="Upload preview"
                className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-zinc-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 flex items-center justify-center text-gray-700 dark:text-zinc-300">
                <FileText size={18} />
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 max-w-[180px] truncate">
                {attachment.name}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase">
                {attachment.isImage ? 'Image' : attachment.mimeType.split('/')[1] || 'Document'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-700 dark:text-zinc-200 flex items-center justify-center transition-colors ml-1 cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 w-full min-w-0">
          {/* Plus icon on the left */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Add images, PDFs or documents"
          >
            <Plus size={19} />
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value.startsWith('/image') && !isImageGen) {
                setIsImageGen(true);
              }
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording 
                ? 'Listening to your voice...'
                : isImageGen 
                ? 'Describe the image to generate with AI...' 
                : 'Ask Nebula anything...'
            }
            rows={1}
            className="flex-1 min-w-[110px] bg-transparent border-0 outline-hidden resize-none text-[15px] text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 py-1.5 max-h-[140px] leading-relaxed font-normal"
          />

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
            {/* AI Image Gen toggle */}
            <button
              type="button"
              onClick={toggleImageGen}
              className={`flex items-center gap-1 px-2 @md:px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isImageGen
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-zinc-900 dark:border-white shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-transparent'
              }`}
              title="Generate AI Images with Cloudinary CDN (/image <prompt>)"
            >
              <ImageIcon size={13} />
              <span className="hidden @lg:inline">Image</span>
            </button>

            {/* Live Web Search toggle */}
            <button
              type="button"
              onClick={() => setIsWebSearch(!isWebSearch)}
              className={`flex items-center gap-1 px-2 @md:px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isWebSearch
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-zinc-900 dark:border-white shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-transparent'
              }`}
              title="Toggle Live Web Search (Real-time Internet Grounding)"
            >
              <Globe size={13} />
              <span className="hidden @lg:inline">Search</span>
            </button>

            {/* Reasoning / Thinking toggle */}
            <button
              type="button"
              onClick={() => setIsReasoning(!isReasoning)}
              className={`flex items-center gap-1 px-2 @md:px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isReasoning
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-zinc-900 dark:border-white shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-transparent'
              }`}
              title="Toggle Deep Reasoning (CoT)"
            >
              <Lightbulb size={13} />
              <span className="hidden @lg:inline">Thinking</span>
            </button>

            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
              title={isRecording ? 'Stop voice recording' : 'Dictate voice into chat'}
            >
              <Mic size={17} />
            </button>

            {/* Hands-Free Conversational Voice Mode Button */}
            {onOpenVoiceMode && !input.trim() && (
              <button
                type="button"
                onClick={onOpenVoiceMode}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                title="Start Hands-Free Voice Conversation"
              >
                <div className="flex items-center gap-[2px] h-3.5">
                  <span className="w-[1.8px] h-2 bg-current rounded-full" />
                  <span className="w-[1.8px] h-3.5 bg-current rounded-full" />
                  <span className="w-[1.8px] h-2.5 bg-current rounded-full" />
                  <span className="w-[1.8px] h-1.5 bg-current rounded-full" />
                </div>
              </button>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!input.trim() && !attachment) || isLoading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                (input.trim() || attachment) && !isLoading
                  ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-95 shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
              title="Send prompt"
            >
              <ArrowUp size={17} />
            </button>
          </div>
        </div>

        {micError && (
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
            <span>{micError}</span>
            <button
              type="button"
              onClick={() => setMicError(null)}
              className="ml-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
