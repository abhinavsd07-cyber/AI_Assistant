import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, Sparkles, AlertCircle, Square } from 'lucide-react';

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
  const voiceLang: 'en-US' | 'ml-IN' = 'en-US';

  const statusRef = useRef<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const isOpenRef = useRef(isOpen);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isMountedRef = useRef(true);
  const restartTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const speechWatchdogRef = useRef<number | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  isOpenRef.current = isOpen;

  const updateStatus = (s: 'idle' | 'listening' | 'thinking' | 'speaking') => {
    statusRef.current = s;
    if (isMountedRef.current) {
      setStatus(s);
    }
  };

  const stopAll = React.useCallback(() => {
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (speechWatchdogRef.current) {
      window.clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
    activeUtteranceRef.current = null;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    } catch {
      // Ignore
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    updateStatus('idle');
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => {
        if (synthRef.current) {
          availableVoicesRef.current = synthRef.current.getVoices();
        }
      };
      loadVoices();
      synthRef.current.onvoiceschanged = loadVoices;
    }
    return () => {
      isMountedRef.current = false;
      stopAll();
    };
  }, [stopAll]);

  const processUserSpeech = async (speechText: string) => {
    updateStatus('thinking');
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    try {
      const reply = await onSendMessage(speechText);
      if (!isMountedRef.current || !isOpenRef.current) return;
      if (reply) {
        setLastAiReply(reply);
        speakResponse(reply);
      } else {
        startListening(voiceLang);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || 'Error processing response');
        updateStatus('idle');
      }
    }
  };

  const speakResponse = (text: string) => {
    if (!synthRef.current) {
      startListening(voiceLang);
      return;
    }

    if (speechWatchdogRef.current) {
      window.clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }

    synthRef.current.cancel();

    let cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*#_`~>\[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      startListening(voiceLang);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtteranceRef.current = utterance;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = availableVoicesRef.current.length > 0
      ? availableVoicesRef.current
      : synthRef.current.getVoices();

    const hasMalayalam = /[\u0D00-\u0D7F]/.test(cleanText);

    let chosenVoice: SpeechSynthesisVoice | null = null;
    if (hasMalayalam) {
      chosenVoice = voices.find((v) => v.lang.startsWith('ml')) || null;
    }

    if (!chosenVoice) {
      chosenVoice =
        voices.find((v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online')) && (v.lang.startsWith('en-IN') || v.lang.startsWith('en-US') || v.lang.startsWith('en'))) ||
        voices.find((v) => v.lang.startsWith('en-IN')) ||
        voices.find((v) => v.lang.startsWith('en-US')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0] ||
        null;
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    // Immediately update status to speaking so the visualizer starts animating
    updateStatus('speaking');

    const finishSpeakingAndListen = () => {
      if (speechWatchdogRef.current) {
        window.clearTimeout(speechWatchdogRef.current);
        speechWatchdogRef.current = null;
      }
      activeUtteranceRef.current = null;
      if (!isMountedRef.current || !isOpenRef.current) return;
      transcriptRef.current = '';
      setTranscript('');
      restartTimerRef.current = window.setTimeout(() => {
        if (isMountedRef.current && isOpenRef.current) {
          startListening(voiceLang);
        }
      }, 350);
    };

    utterance.onend = finishSpeakingAndListen;
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      finishSpeakingAndListen();
    };

    // Watchdog timer: If browser TTS hangs or drops onend, automatically resume listening
    const estimatedMs = Math.max(3000, Math.min(30000, cleanText.length * 85));
    speechWatchdogRef.current = window.setTimeout(() => {
      if (statusRef.current === 'speaking') {
        finishSpeakingAndListen();
      }
    }, estimatedMs);

    if (synthRef.current.paused) {
      synthRef.current.resume();
    }
    synthRef.current.speak(utterance);
  };

  const startListening = React.useCallback((langOverride?: 'en-US' | 'ml-IN') => {
    setErrorMessage('');
    const activeLang = langOverride || voiceLang;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      updateStatus('idle');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }

      transcriptRef.current = '';
      setTranscript('');

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = activeLang;

      recognition.onstart = () => {
        updateStatus('listening');
      };

      recognition.onresult = (event: any) => {
        if (synthRef.current && synthRef.current.speaking) {
          synthRef.current.cancel();
          updateStatus('listening');
        }

        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }

        transcriptRef.current = currentText;
        if (isMountedRef.current) setTranscript(currentText);

        // Auto-submit 1.3s after user finishes speaking
        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = window.setTimeout(() => {
          if (recognitionRef.current && transcriptRef.current.trim()) {
            try {
              recognitionRef.current.stop();
            } catch {
              // Ignore
            }
          }
        }, 1300);
      };

      recognition.onerror = (event: any) => {
        if (!isMountedRef.current) return;
        if (event.error === 'aborted') return;
        if (event.error === 'no-speech') {
          if (isMountedRef.current && isOpenRef.current && statusRef.current === 'listening') {
            restartTimerRef.current = window.setTimeout(() => {
              if (isMountedRef.current && isOpenRef.current) {
                startListening(activeLang);
              }
            }, 200);
          }
          return;
        }

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMessage('Microphone permission denied. Please allow microphone access in your browser address bar.');
        } else if (event.error === 'network') {
          setErrorMessage('Network error: Browser speech service blocked. Use Google Chrome or Edge with internet.');
        } else if (event.error === 'audio-capture') {
          setErrorMessage('No microphone found. Please check your system audio input settings.');
        } else {
          setErrorMessage(`Mic error: ${event.error}`);
        }
      };

      recognition.onend = async () => {
        if (!isMountedRef.current) return;
        const finalPrompt = transcriptRef.current.trim();
        if (finalPrompt) {
          transcriptRef.current = '';
          await processUserSpeech(finalPrompt);
        } else {
          if (isMountedRef.current && isOpenRef.current && statusRef.current === 'listening') {
            restartTimerRef.current = window.setTimeout(() => {
              if (isMountedRef.current && isOpenRef.current) {
                startListening(activeLang);
              }
            }, 300);
          } else if (statusRef.current !== 'thinking' && statusRef.current !== 'speaking') {
            updateStatus('idle');
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || 'Could not start microphone.');
        updateStatus('idle');
      }
    }
  }, [voiceLang]);

  const interruptSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    transcriptRef.current = '';
    setTranscript('');
    startListening(voiceLang);
  };

  useEffect(() => {
    if (isOpen) {
      transcriptRef.current = '';
      setTranscript('');
      setLastAiReply('');
      setErrorMessage('');
      const timer = window.setTimeout(() => {
        if (isMountedRef.current) {
          startListening(voiceLang);
        }
      }, 150);
      return () => {
        window.clearTimeout(timer);
        stopAll();
      };
    } else {
      stopAll();
    }
  }, [isOpen, voiceLang]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-[#111111] border border-[#2B2B2B] shadow-2xl p-8 text-white flex flex-col items-center justify-between min-h-[500px] relative overflow-hidden"
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-sm font-bold tracking-tight">Nebula Conversational Voice</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 text-xs font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Auto-Reply</span>
            </span>

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
        </div>

        {/* Central Animated Liquid Orb */}
        <div className="relative flex items-center justify-center my-6">
          {/* Outer glow rings based on state */}
          <div className={`absolute w-52 h-52 rounded-full blur-3xl transition-all duration-700 ${
            status === 'listening' ? 'bg-blue-600/40 scale-125 animate-pulse' :
            status === 'thinking' ? 'bg-amber-500/40 scale-115 animate-spin' :
            status === 'speaking' ? 'bg-purple-600/50 scale-140' :
            'bg-gray-700/20 scale-90'
          }`} />

          {/* Main Cosmic Orb */}
          <div className={`w-36 h-36 rounded-full flex flex-col items-center justify-center relative shadow-2xl transition-all duration-500 cursor-pointer ${
            status === 'listening' ? 'bg-radial from-blue-400 via-indigo-600 to-blue-950 animate-pulse' :
            status === 'thinking' ? 'bg-radial from-amber-300 via-orange-600 to-amber-950 animate-spin' :
            status === 'speaking' ? 'bg-radial from-purple-400 via-fuchsia-600 to-indigo-950 scale-105' :
            'bg-radial from-gray-500 via-gray-700 to-gray-900'
          }`}
          onClick={status === 'speaking' ? interruptSpeech : () => {}}
          >
            {status === 'listening' ? (
              <Mic size={40} className="text-white drop-shadow-md animate-bounce" />
            ) : status === 'thinking' ? (
              <Sparkles size={40} className="text-white drop-shadow-md" />
            ) : status === 'speaking' ? (
              <Volume2 size={40} className="text-white drop-shadow-md animate-pulse" />
            ) : (
              <MicOff size={40} className="text-gray-400" />
            )}

            {/* Soundwave Bars */}
            {(status === 'listening' || status === 'speaking') && (
              <div className="flex items-center gap-1 mt-2">
                <span className="w-1 h-3 bg-white/80 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-1 h-5 bg-white/80 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1 h-3 bg-white/80 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            )}
          </div>
        </div>

        {/* Status Indicator & Transcript Subtitles */}
        <div className="w-full flex flex-col items-center text-center px-4 gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              status === 'listening' ? 'bg-blue-400 animate-ping' :
              status === 'thinking' ? 'bg-amber-400 animate-spin' :
              status === 'speaking' ? 'bg-purple-400 animate-pulse' :
              'bg-gray-500'
            }`} />
            <span>
              {status === 'listening' ? 'Listening to you...' :
               status === 'thinking' ? 'Nebula is thinking...' :
               status === 'speaking' ? 'Speaking (Click orb to interrupt)...' :
               'Tap Mic to Start'}
            </span>
          </div>

          <p className="text-[14px] font-medium text-gray-200 line-clamp-3 min-h-[44px] leading-relaxed max-w-sm">
            {transcript || lastAiReply.slice(0, 160) || 'Start speaking naturally — Nebula will reply automatically...'}
          </p>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-800/40">
              <AlertCircle size={13} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="w-full flex items-center justify-center gap-3 mt-4 pt-4 border-t border-white/10">
          {status === 'speaking' && (
            <button
              onClick={interruptSpeech}
              className="px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
            >
              <Square size={13} className="text-amber-400" />
              <span>Interrupt AI</span>
            </button>
          )}

          <button
            onClick={() => {
              if (status === 'listening') {
                if (transcriptRef.current.trim() && recognitionRef.current) {
                  recognitionRef.current.stop();
                } else {
                  stopAll();
                }
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
