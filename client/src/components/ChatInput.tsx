import React, { useState, useRef, useEffect } from 'react';
import { Plus, Lightbulb, Mic, ArrowUp, X } from 'lucide-react';

export interface ImageAttachment {
  data: string;
  mimeType: string;
  previewUrl: string;
}

interface ChatInputProps {
  onSendMessage: (text: string, isReasoning: boolean, image?: ImageAttachment | null) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imageAttachment, setImageAttachment] = useState<ImageAttachment | null>(null);

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
      } catch (e) {
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
    if ((!input.trim() && !imageAttachment) || isLoading) return;

    onSendMessage(input.trim(), isReasoning, imageAttachment);
    setInput('');
    setImageAttachment(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setImageAttachment({
        data: base64Data,
        mimeType: file.type,
        previewUrl: result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-3 pt-1 flex flex-col items-center">
      {/* Floating Pill Input Box (Matching screenshot) */}
      <form
        onSubmit={handleSubmit}
        className="w-full relative rounded-[30px] bg-white border border-[#E5E5E5] hover:border-gray-400 
          shadow-[0_2px_12px_rgba(0,0,0,0.04)] focus-within:shadow-[0_2px_16px_rgba(0,0,0,0.08)] 
          transition-all px-4 py-2 flex flex-col gap-1.5"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden" 
          onChange={handleImageSelect}
        />

        {/* Attachment preview */}
        {imageAttachment && (
          <div className="relative inline-flex items-center gap-2 p-1.5 rounded-xl bg-gray-50 border border-gray-200 w-fit">
            <img 
              src={imageAttachment.previewUrl} 
              alt="Attachment" 
              className="w-12 h-12 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => setImageAttachment(null)}
              className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5 w-full">
          {/* Plus icon on the left (matches screenshot) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Add files or photos"
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
            placeholder={isRecording ? "Listening..." : "Ask Nebula AI..."}
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent text-[#0D0D0D] placeholder-gray-400 text-[15px] 
              resize-none outline-none py-1.5 leading-normal max-h-36 disabled:opacity-50"
          />

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Think Button (Reasoning) */}
            <button
              type="button"
              onClick={() => setIsReasoning(!isReasoning)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                isReasoning 
                  ? 'bg-black text-white' 
                  : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
            >
              <Lightbulb size={14} className={isReasoning ? 'text-amber-300' : 'text-gray-500'} />
              <span>Think</span>
            </button>

            {/* Microphone Icon */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isRecording 
                  ? 'bg-rose-100 text-rose-600 animate-pulse' 
                  : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
              title="Voice dictation"
            >
              <Mic size={18} />
            </button>

            {/* Circular Action Button (Signature ChatGPT Black / Gray Pill) */}
            <button
              type="submit"
              disabled={(!input.trim() && !imageAttachment) || isLoading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                (input.trim() || imageAttachment) && !isLoading
                  ? 'bg-[#0D0D0D] hover:bg-[#2F2F2F] text-white shadow-xs cursor-pointer active:scale-95'
                  : 'bg-[#E5E5E5] text-[#8E8E93] cursor-not-allowed'
              }`}
              title="Send message"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp size={17} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Footer warning text */}
      <div className="text-[11px] text-gray-400 mt-2 select-none text-center">
        Nebula AI can make mistakes. Check important info.
      </div>
    </div>
  );
};
