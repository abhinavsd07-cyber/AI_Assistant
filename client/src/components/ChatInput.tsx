import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Image as ImageIcon, Lightbulb, Mic, Send, X } from 'lucide-react';

export interface ImageAttachment {
  data: string; // base64
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
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

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition warning:', event.error);
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

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !imageAttachment) || isLoading) return;

    onSendMessage(input.trim(), isReasoning, imageAttachment);
    setInput('');
    setImageAttachment(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Your browser does not support voice input. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Could not start recognition:', err);
        setIsRecording(false);
      }
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
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 pb-4 pt-1">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-[22px] bg-[#171329]/95 hover:bg-[#19152D]/95 border border-white/[0.1] hover:border-purple-500/30 
          backdrop-blur-2xl shadow-2xl shadow-black/60 transition-all p-3 flex flex-col gap-2"
      >
        {/* Hidden inputs */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files?.[0]) {
              setInput(prev => `${prev} [Attached file: ${e.target.files![0].name}] `);
            }
          }}
        />

        <input 
          type="file" 
          ref={imageInputRef} 
          accept="image/*"
          className="hidden" 
          onChange={handleImageSelect}
        />

        {/* Image Attachment Preview */}
        {imageAttachment && (
          <div className="relative inline-flex items-center gap-2 p-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 w-fit animate-in fade-in zoom-in-95">
            <img 
              src={imageAttachment.previewUrl} 
              alt="Attachment" 
              className="w-14 h-14 rounded-lg object-cover ring-1 ring-purple-400/40"
            />
            <div className="flex flex-col pr-2">
              <span className="text-[11px] text-purple-200 font-medium">Image attached</span>
              <span className="text-[10px] text-white/40">Ready for Multimodal Vision</span>
            </div>
            <button
              type="button"
              onClick={() => setImageAttachment(null)}
              className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Input Text Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording 
              ? "Listening to your voice... Speak now..." 
              : imageAttachment 
                ? "Ask a question about this image..." 
                : "Send a message or drop a file..."
          }
          rows={1}
          disabled={isLoading}
          className="w-full bg-transparent text-white placeholder-white/40 text-sm md:text-[14.5px] 
            resize-none outline-none px-2 py-1 leading-relaxed max-h-36 disabled:opacity-50"
        />

        {/* Bottom Actions Row */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
          {/* Left Action Pill Chips */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium 
                text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
            >
              <Paperclip size={13} className="text-white/50" />
              <span>Files</span>
            </button>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                imageAttachment
                  ? 'bg-purple-600/30 text-purple-200 border-purple-400/50 shadow-sm'
                  : 'text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06]'
              }`}
            >
              <ImageIcon size={13} className={imageAttachment ? 'text-purple-300' : 'text-white/50'} />
              <span>Images</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReasoning(!isReasoning)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                isReasoning
                  ? 'bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-sm shadow-purple-500/20'
                  : 'text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06]'
              }`}
            >
              <Lightbulb size={13} className={isReasoning ? 'text-purple-300' : 'text-white/50'} />
              <span>Reasoning</span>
              {isReasoning && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse ml-0.5" />}
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Mic Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isRecording 
                  ? 'bg-red-500/25 text-red-400 border border-red-500/50 animate-pulse shadow-md shadow-red-500/30' 
                  : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={isRecording ? 'Listening... click to stop' : 'Voice Input (Speech to text)'}
            >
              <Mic size={17} />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!input.trim() && !imageAttachment) || isLoading}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                (input.trim() || imageAttachment) && !isLoading
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40 active:scale-95'
                  : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={15} className="translate-x-[1px]" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
