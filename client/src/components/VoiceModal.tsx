import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, AlertCircle, Square, Globe } from 'lucide-react';
import { NebulaLogo } from './NebulaLogo';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

export type VoiceLangCode = 'auto' | 'ml-IN' | 'ta-IN' | 'hi-IN' | 'en-IN';

const VOICE_LANGUAGES: { code: VoiceLangCode; label: string; sttLang: string }[] = [
  { code: 'auto', label: 'Auto', sttLang: 'en-IN' },
  { code: 'ml-IN', label: 'മലയാളം', sttLang: 'ml-IN' },
  { code: 'ta-IN', label: 'தமிழ்', sttLang: 'ta-IN' },
  { code: 'hi-IN', label: 'हिन्दी', sttLang: 'hi-IN' },
  { code: 'en-IN', label: 'English', sttLang: 'en-IN' },
];

function detectLanguageFromText(text: string): { ttsLang: string; sttLang: string; label: string } {
  if (/[\u0D00-\u0D7F]/.test(text)) return { ttsLang: 'ml', sttLang: 'ml-IN', label: 'മലയാളം (Malayalam)' };
  if (/[\u0B80-\u0BFF]/.test(text)) return { ttsLang: 'ta', sttLang: 'ta-IN', label: 'தமிழ் (Tamil)' };
  if (/[\u0900-\u097F]/.test(text)) return { ttsLang: 'hi', sttLang: 'hi-IN', label: 'हिन्दी (Hindi)' };
  if (/[\u0C00-\u0C7F]/.test(text)) return { ttsLang: 'te', sttLang: 'te-IN', label: 'తెలుగు (Telugu)' };
  if (/[\u0C80-\u0CFF]/.test(text)) return { ttsLang: 'kn', sttLang: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' };
  if (/[\u0600-\u06FF]/.test(text)) return { ttsLang: 'ar', sttLang: 'ar-SA', label: 'العربية (Arabic)' };
  return { ttsLang: 'en', sttLang: 'en-IN', label: 'English' };
}

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
  const [selectedLang, setSelectedLang] = useState<VoiceLangCode>('auto');
  const [detectedLangLabel, setDetectedLangLabel] = useState<string>('Auto Multilingual');

  const statusRef = useRef<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const isOpenRef = useRef(isOpen);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const restartTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const speechWatchdogRef = useRef<number | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const activeSttLangRef = useRef<string>('en-IN');

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
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
      } catch {
        // Ignore
      }
      audioRef.current = null;
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
        startListening(activeSttLangRef.current);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || 'Error processing response');
        updateStatus('idle');
      }
    }
  };

  const speakResponse = (text: string) => {
    if (speechWatchdogRef.current) {
      window.clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
      } catch {
        // Ignore
      }
      audioRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*#_`~>\[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      startListening(activeSttLangRef.current);
      return;
    }

    const detected = detectLanguageFromText(cleanText);
    setDetectedLangLabel(detected.label);
    if (selectedLang === 'auto') {
      activeSttLangRef.current = detected.sttLang;
    }

    updateStatus('speaking');

    const finishSpeakingAndListen = () => {
      if (speechWatchdogRef.current) {
        window.clearTimeout(speechWatchdogRef.current);
        speechWatchdogRef.current = null;
      }
      activeUtteranceRef.current = null;
      audioRef.current = null;
      if (!isMountedRef.current || !isOpenRef.current) return;
      transcriptRef.current = '';
      setTranscript('');
      restartTimerRef.current = window.setTimeout(() => {
        if (isMountedRef.current && isOpenRef.current) {
          startListening(activeSttLangRef.current);
        }
      }, 350);
    };

    // Watchdog timer: If TTS takes too long, automatically resume listening
    const estimatedMs = Math.max(4000, Math.min(35000, cleanText.length * 95));
    speechWatchdogRef.current = window.setTimeout(() => {
      if (statusRef.current === 'speaking') {
        finishSpeakingAndListen();
      }
    }, estimatedMs);

    // Primary: Play high-clarity Multilingual Neural TTS stream from backend (/api/tts)
    // Works for Malayalam (ml), Tamil (ta), Hindi (hi), Telugu (te), Kannada (kn), Arabic (ar), and English (en) on ALL devices!
    try {
      const ttsAudioUrl = `${API_BASE}/api/tts?lang=${encodeURIComponent(detected.ttsLang)}&text=${encodeURIComponent(cleanText.slice(0, 750))}`;
      const audio = new Audio(ttsAudioUrl);
      audioRef.current = audio;
      audio.onended = finishSpeakingAndListen;
      audio.onerror = () => {
        // Fallback to browser SpeechSynthesis if offline
        fallbackBrowserSpeak(cleanText, detected.sttLang, finishSpeakingAndListen);
      };
      audio.play().catch(() => {
        fallbackBrowserSpeak(cleanText, detected.sttLang, finishSpeakingAndListen);
      });
      return;
    } catch {
      fallbackBrowserSpeak(cleanText, detected.sttLang, finishSpeakingAndListen);
    }
  };

  const fallbackBrowserSpeak = (cleanText: string, langCode: string, onDone: () => void) => {
    if (!synthRef.current) {
      onDone();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtteranceRef.current = utterance;
    utterance.rate = 1.03;
    utterance.pitch = 1.0;

    const voices =
      availableVoicesRef.current.length > 0
        ? availableVoicesRef.current
        : synthRef.current.getVoices();

    const langPrefix = langCode.split('-')[0];
    const chosenVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
      voices.find((v) => v.lang.startsWith('en-IN')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0] ||
      null;

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    } else {
      utterance.lang = langCode;
    }

    utterance.onend = onDone;
    utterance.onerror = onDone;
    if (synthRef.current.paused) synthRef.current.resume();
    synthRef.current.speak(utterance);
  };

  const startListening = React.useCallback((langOverride?: string) => {
    setErrorMessage('');
    const activeLang = langOverride || activeSttLangRef.current || 'en-IN';
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
        if (audioRef.current) {
          try {
            audioRef.current.pause();
            audioRef.current.src = '';
          } catch {
            // Ignore
          }
          audioRef.current = null;
          updateStatus('listening');
        }
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
  }, []);

  const interruptSpeech = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
      } catch {
        // Ignore
      }
      audioRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    transcriptRef.current = '';
    setTranscript('');
    startListening(activeSttLangRef.current);
  };

  const handleLanguageSelect = (langObj: { code: VoiceLangCode; label: string; sttLang: string }) => {
    setSelectedLang(langObj.code);
    activeSttLangRef.current = langObj.sttLang;
    setDetectedLangLabel(langObj.code === 'auto' ? 'Auto Multilingual' : langObj.label);
    if (statusRef.current === 'listening' || statusRef.current === 'idle') {
      startListening(langObj.sttLang);
    }
  };

  useEffect(() => {
    if (isOpen) {
      transcriptRef.current = '';
      setTranscript('');
      setLastAiReply('');
      setErrorMessage('');
      const timer = window.setTimeout(() => {
        if (isMountedRef.current) {
          startListening(activeSttLangRef.current);
        }
      }, 150);
      return () => {
        window.clearTimeout(timer);
        stopAll();
      };
    } else {
      stopAll();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-[28px] bg-gradient-to-b from-[#16171E] via-[#101116] to-[#0B0C10] border border-white/[0.08] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.9)] p-6 sm:p-7 text-white flex flex-col items-center justify-between min-h-[510px] relative overflow-hidden"
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 p-1.5">
              <NebulaLogo className="w-full h-full text-white" title="Nebula Voice" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[14px] font-semibold tracking-tight text-white/95 truncate">
                Nebula Voice
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">{detectedLangLabel}</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              stopAll();
              onClose();
            }}
            aria-label="Close voice mode"
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Sleek Segmented Language Selector */}
        <div
          role="tablist"
          aria-label="Voice language"
          className="inline-flex flex-wrap items-center justify-center gap-0.5 p-1 mt-5 rounded-2xl sm:rounded-full bg-white/[0.04] border border-white/[0.07]"
        >
          {VOICE_LANGUAGES.map((l) => {
            const isSelected = selectedLang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleLanguageSelect(l)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#0B0C10] font-semibold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.06] font-medium'
                }`}
              >
                {l.code === 'auto' && <Globe size={11} className={isSelected ? 'text-[#0B0C10]/75' : 'text-gray-400'} />}
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>

        {/* Central Living Nebula Cosmic Orb */}
        <div className="relative flex items-center justify-center my-8 h-44 w-44">
          {/* Outer atmospheric aurora glow */}
          <div
            className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${
              status === 'listening'
                ? 'bg-indigo-500/45 scale-125 animate-pulse'
                : status === 'thinking'
                  ? 'bg-amber-500/45 scale-130 animate-pulse'
                  : status === 'speaking'
                    ? 'bg-fuchsia-500/55 scale-140 animate-pulse'
                    : 'bg-purple-600/25 scale-100'
            }`}
          />

          {/* Bouncing / Jumping Cosmic Container */}
          <button
            type="button"
            onClick={() => {
              if (status === 'speaking') {
                interruptSpeech();
              } else if (status === 'idle') {
                startListening();
              }
            }}
            aria-label={
              status === 'speaking'
                ? 'Interrupt Nebula speech'
                : status === 'idle'
                  ? 'Tap orb to start talking'
                  : 'Nebula Voice Orb'
            }
            className={`relative w-36 h-36 rounded-full p-[3px] cursor-pointer focus:outline-none transition-shadow duration-500 ${
              status === 'listening'
                ? 'nebula-orb-listening shadow-[0_0_45px_rgba(99,102,241,0.65)]'
                : status === 'thinking'
                  ? 'nebula-orb-thinking shadow-[0_0_50px_rgba(245,158,11,0.65)]'
                  : status === 'speaking'
                    ? 'nebula-orb-speaking shadow-[0_0_55px_rgba(192,38,211,0.75)]'
                    : 'nebula-orb-idle shadow-[0_0_28px_rgba(147,51,234,0.35)]'
            }`}
          >
            {/* Spinning conic cosmic border ring */}
            <div
              className={`absolute inset-0 rounded-full ${
                status === 'thinking'
                  ? 'bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-cyan-400 nebula-logo-spin-thinking'
                  : status === 'speaking'
                    ? 'bg-gradient-to-tr from-purple-400 via-pink-500 to-indigo-400 nebula-logo-spin-speaking'
                    : status === 'listening'
                      ? 'bg-gradient-to-tr from-blue-400 via-purple-500 to-cyan-400 nebula-logo-spin-listening'
                      : 'bg-gradient-to-tr from-purple-500/70 via-indigo-500/70 to-fuchsia-500/70 nebula-logo-spin-idle'
              }`}
            />

            {/* Bouncing & Smiling Polar Bear Voice Mascot */}
            <div className="relative w-full h-full rounded-full overflow-hidden bg-gradient-to-b from-[#151B28] via-[#0E131D] to-[#080B12] flex items-center justify-center">
              <div
                className={`w-24 h-24 select-none pointer-events-none transition-transform duration-300 ${
                  status === 'listening'
                    ? 'nebula-bear-listening'
                    : status === 'thinking'
                      ? 'nebula-bear-thinking'
                      : status === 'speaking'
                        ? 'nebula-bear-speaking'
                        : 'nebula-bear-idle'
                }`}
              >
                <NebulaLogo
                  expression={status}
                  className="w-full h-full text-white drop-shadow-[0_4px_14px_rgba(168,85,247,0.35)]"
                  title="Nebula Polar Bear Voice Co-pilot"
                />
              </div>
              {/* Subtle living inner glass sheen */}
              <div className="absolute inset-0 rounded-full bg-radial from-white/10 via-transparent to-black/35 pointer-events-none" />
            </div>
          </button>
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
               'Tap Orb to Start'}
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
        <div className="w-full flex items-center justify-center gap-3 mt-5 pt-4 border-t border-white/[0.08]">
          {status === 'speaking' && (
            <button
              onClick={interruptSpeech}
              className="px-4 py-2.5 rounded-full flex items-center gap-1.5 text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-white transition-all cursor-pointer"
            >
              <Square size={12} className="text-amber-400 fill-amber-400" />
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
            className={`px-5 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
              status === 'listening'
                ? 'bg-rose-500/90 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50 border border-rose-400/30'
                : 'bg-white text-[#0B0C10] hover:bg-gray-100 shadow-lg'
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
