import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, Sparkles, AlertCircle } from 'lucide-react';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => Promise<string | void>;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({ isOpen, onClose, onSendMessage }) => {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastAiReply, setLastAiReply] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isMountedRef = useRef(true);

  const stopAll = React.useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    } catch {
      // Ignore
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setStatus('idle');
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      isMountedRef.current = false;
      stopAll();
    };
  }, [stopAll]);

  const startListening = () => {
    setErrorMessage('');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
      setStatus('idle');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Or auto/multi-language

      recognition.onstart = () => {
        if (isMountedRef.current) setStatus('listening');
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        if (isMountedRef.current) setTranscript(currentText);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && isMountedRef.current) {
          setErrorMessage(`Mic error: ${event.error}`);
        }
      };

      recognition.onend = async () => {
        if (!isMountedRef.current) return;
        const finalPrompt = transcript.trim();
        if (finalPrompt) {
          await processUserSpeech(finalPrompt);
        } else {
          setStatus('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || 'Could not start microphone.');
        setStatus('idle');
      }
    }
  };

  const processUserSpeech = async (speechText: string) => {
    setStatus('thinking');
    try {
      const reply = await onSendMessage(speechText);
      if (!isMountedRef.current) return;
      if (reply) {
        setLastAiReply(reply);
        speakResponse(reply);
      } else {
        setStatus('idle');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || 'Error processing response');
        setStatus('idle');
      }
    }
  };

  const speakResponse = (text: string) => {
    if (!synthRef.current) {
      setStatus('idle');
      return;
    }

    synthRef.current.cancel();
    // Clean markdown code blocks for voice playback
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Code block omitted.').replace(/[#*_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;

    utterance.onstart = () => {
      if (isMountedRef.current) setStatus('speaking');
    };

    utterance.onend = () => {
      if (!isMountedRef.current) return;
      setTranscript('');
      setStatus('idle');
      // Auto-listen again for hands-free natural back-and-forth conversation
      setTimeout(() => {
        if (isMountedRef.current && isOpen) {
          startListening();
        }
      }, 500);
    };

    utterance.onerror = () => {
      if (isMountedRef.current) setStatus('idle');
    };

    synthRef.current.speak(utterance);
  };

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setLastAiReply('');
      startListening();
    } else {
      stopAll();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-[#111111] border border-[#2B2B2B] shadow-2xl p-8 text-white flex flex-col items-center justify-between min-h-[460px] relative overflow-hidden"
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-sm font-bold tracking-tight">Nebula Voice Assistant</span>
          </div>
          <button 
            onClick={() => {
              stopAll();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Central Animated Orb */}
        <div className="relative flex items-center justify-center my-6">
          {/* Outer glow rings based on state */}
          <div className={`absolute w-48 h-48 rounded-full blur-2xl transition-all duration-700 ${
            status === 'listening' ? 'bg-blue-600/30 scale-125' :
            status === 'thinking' ? 'bg-amber-600/30 scale-110 animate-pulse' :
            status === 'speaking' ? 'bg-purple-600/40 scale-135' :
            'bg-gray-700/20 scale-90'
          }`} />

          {/* Main Cosmic Orb */}
          <div className={`w-32 h-32 rounded-full flex items-center justify-center relative shadow-2xl transition-all duration-500 ${
            status === 'listening' ? 'bg-radial from-blue-400 via-indigo-600 to-blue-900 animate-pulse' :
            status === 'thinking' ? 'bg-radial from-amber-300 via-orange-600 to-amber-900 animate-spin' :
            status === 'speaking' ? 'bg-radial from-purple-400 via-fuchsia-600 to-indigo-950 scale-105' :
            'bg-radial from-gray-500 via-gray-700 to-gray-900'
          }`}>
            {status === 'listening' ? (
              <Mic size={36} className="text-white drop-shadow-md animate-bounce" />
            ) : status === 'thinking' ? (
              <Sparkles size={36} className="text-white drop-shadow-md" />
            ) : status === 'speaking' ? (
              <Volume2 size={36} className="text-white drop-shadow-md animate-pulse" />
            ) : (
              <MicOff size={36} className="text-gray-400" />
            )}
          </div>
        </div>

        {/* Status Indicator & Transcript */}
        <div className="w-full flex flex-col items-center text-center px-4 gap-2">
          <div className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              status === 'listening' ? 'bg-blue-400 animate-ping' :
              status === 'thinking' ? 'bg-amber-400 animate-spin' :
              status === 'speaking' ? 'bg-purple-400 animate-pulse' :
              'bg-gray-500'
            }`} />
            <span>
              {status === 'listening' ? 'Listening to you...' :
               status === 'thinking' ? 'Nebula is thinking...' :
               status === 'speaking' ? 'Speaking...' :
               'Tap Mic to Start'}
            </span>
          </div>

          <p className="text-sm font-medium text-gray-200 line-clamp-3 min-h-[42px] leading-relaxed">
            {transcript || lastAiReply.slice(0, 160) || "Start speaking in English or Malayalam..."}
          </p>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-800/40">
              <AlertCircle size={13} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="w-full flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/10">
          <button
            onClick={() => {
              if (status === 'listening') {
                stopAll();
              } else {
                startListening();
              }
            }}
            className={`px-5 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
              status === 'listening'
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/30'
                : 'bg-white text-black hover:bg-gray-200 shadow-lg'
            }`}
          >
            {status === 'listening' ? (
              <>
                <MicOff size={15} />
                <span>Pause Mic</span>
              </>
            ) : (
              <>
                <Mic size={15} />
                <span>Talk Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
