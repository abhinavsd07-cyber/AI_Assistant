import React, { useState, useRef, useEffect } from 'react';
import { Plus, Lightbulb, Mic, ArrowUp, X, FileText, Globe } from 'lucide-react';

export interface FileAttachment {
  name: string;
  data: string;
  mimeType: string;
  previewUrl: string;
  isImage: boolean;
}

interface ChatInputProps {
  onSendMessage: (text: string, isReasoning: boolean, file?: FileAttachment | null, isWebSearch?: boolean) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'ml-IN';

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          if (transcript) {
            setInput(transcript);
          }
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Speech recognition setup failed:', e);
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch {
        setIsRecording(false);
      }
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

    onSendMessage(input.trim(), isReasoning, attachment, isWebSearch);
    setInput('');
    setAttachment(null);

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

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-3 pt-1 flex flex-col items-center">
      {/* Floating Pill Input Box */}
      <form
        onSubmit={handleSubmit}
        className="w-full relative rounded-[30px] bg-white border border-[#E5E5E5] hover:border-gray-400 
          shadow-[0_2px_12px_rgba(0,0,0,0.04)] focus-within:shadow-[0_2px_16px_rgba(0,0,0,0.08)] 
          transition-all px-4 py-2 flex flex-col gap-1.5"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*,.pdf,.txt,.md,.json,.js,.ts,.py"
          className="hidden" 
          onChange={handleFileSelect}
        />

        {/* Attachment preview */}
        {attachment && (
          <div className="relative inline-flex items-center gap-2 p-1.5 px-2.5 rounded-xl bg-gray-50 border border-gray-200 w-fit">
            {attachment.isImage ? (
              <img 
                src={attachment.previewUrl} 
                alt="Attachment" 
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <FileText size={18} />
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-gray-800 max-w-[180px] truncate">
                {attachment.name}
              </span>
              <span className="text-[10px] text-gray-500 uppercase">
                {attachment.isImage ? 'Image' : attachment.mimeType.split('/')[1] || 'Document'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors ml-1 cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5 w-full">
          {/* Plus icon on the left */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording 
                ? 'സംസാരിക്കൂ, ഞാൻ കേൾക്കുന്നുണ്ട്... (Listening in Malayalam)' 
                : 'Ask Nebula anything... (മലയാളത്തിലും ചോദിക്കാം)'
            }
            rows={1}
            className="flex-1 bg-transparent border-0 outline-hidden resize-none text-[15px] text-[#0D0D0D] placeholder-gray-400 py-1.5 max-h-[140px] leading-relaxed font-normal"
          />

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Live Web Search toggle */}
            <button
              type="button"
              onClick={() => setIsWebSearch(!isWebSearch)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isWebSearch
                  ? 'bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-transparent'
              }`}
              title="Toggle Live Web Search (Real-time Internet Grounding)"
            >
              <Globe size={13} className={isWebSearch ? 'text-blue-600' : ''} />
              <span className="hidden sm:inline">Search</span>
            </button>

            {/* Reasoning / Thinking toggle */}
            <button
              type="button"
              onClick={() => setIsReasoning(!isReasoning)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isReasoning
                  ? 'bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-transparent'
              }`}
              title="Toggle Deep Reasoning (CoT)"
            >
              <Lightbulb size={13} className={isReasoning ? 'text-purple-600 fill-purple-600' : ''} />
              <span className="hidden sm:inline">Thinking</span>
            </button>

            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Speak in Malayalam or English"
            >
              <Mic size={17} />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!input.trim() && !attachment) || isLoading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                (input.trim() || attachment) && !isLoading
                  ? 'bg-[#0D0D0D] text-white hover:bg-black active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title="Send prompt"
            >
              <ArrowUp size={17} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
