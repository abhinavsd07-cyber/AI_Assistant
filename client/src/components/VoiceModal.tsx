import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, AlertCircle, Square, Globe } from 'lucide-react';
import { NebulaAnimatedEmblem } from './NebulaAnimatedEmblem';
export { NebulaAnimatedEmblem } from './NebulaAnimatedEmblem';
export type { EmblemStatus } from './NebulaAnimatedEmblem';

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
  const selectedLangRef = useRef<VoiceLangCode>(selectedLang);
  const onSendMessageRef = useRef(onSendMessage);
  const startListeningRef = useRef<(langOverride?: string) => void>(() => {});
  const processUserSpeechRef = useRef<(speechText: string) => Promise<void>>(async () => {});
  const speakResponseRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    isOpenRef.current = isOpen;
    selectedLangRef.current = selectedLang;
    onSendMessageRef.current = onSendMessage;
  }, [isOpen, selectedLang, onSendMessage]);

  const updateStatus = React.useCallback((s: 'idle' | 'listening' | 'thinking' | 'speaking') => {
    statusRef.current = s;
    if (isMountedRef.current) {
      setStatus(s);
    }
  }, []);

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
  }, [updateStatus]);

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

  const fallbackBrowserSpeak = React.useCallback((cleanText: string, langCode: string, onDone: () => void) => {
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
  }, []);

  const speakResponse = React.useCallback((text: string) => {
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
      .replace(/[*#_`~>[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      startListeningRef.current(activeSttLangRef.current);
      return;
    }

    const detected = detectLanguageFromText(cleanText);
    setDetectedLangLabel(detected.label);
    if (selectedLangRef.current === 'auto') {
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
          startListeningRef.current(activeSttLangRef.current);
        }
      }, 350);
    };

    const estimatedMs = Math.max(4000, Math.min(35000, cleanText.length * 95));
    speechWatchdogRef.current = window.setTimeout(() => {
      if (statusRef.current === 'speaking') {
        finishSpeakingAndListen();
      }
    }, estimatedMs);

    try {
      const ttsAudioUrl = `${API_BASE}/api/tts?lang=${encodeURIComponent(detected.ttsLang)}&text=${encodeURIComponent(cleanText.slice(0, 750))}`;
      const audio = new Audio(ttsAudioUrl);
      audioRef.current = audio;
      audio.onended = finishSpeakingAndListen;
      audio.onerror = () => {
        fallbackBrowserSpeak(cleanText, detected.sttLang, finishSpeakingAndListen);
      };
      audio.play().catch(() => {
        fallbackBrowserSpeak(cleanText, detected.sttLang, finishSpeakingAndListen);
      });
    } catch {
      fallbackBrowserSpeak(cleanText, detected.sttLang, finishSpeakingAndListen);
    }
  }, [fallbackBrowserSpeak, updateStatus]);

  const processUserSpeech = React.useCallback(async (speechText: string) => {
    updateStatus('thinking');
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    try {
      const reply = await onSendMessageRef.current(speechText);
      if (!isMountedRef.current || !isOpenRef.current) return;
      if (reply) {
        setLastAiReply(reply);
        speakResponseRef.current(reply);
      } else {
        startListeningRef.current(activeSttLangRef.current);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setErrorMessage(err.message || 'Error processing response');
        updateStatus('idle');
      }
    }
  }, [updateStatus]);

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
                startListeningRef.current(activeLang);
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
          await processUserSpeechRef.current(finalPrompt);
        } else {
          if (isMountedRef.current && isOpenRef.current && statusRef.current === 'listening') {
            restartTimerRef.current = window.setTimeout(() => {
              if (isMountedRef.current && isOpenRef.current) {
                startListeningRef.current(activeLang);
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
  }, [updateStatus]);

  useEffect(() => {
    startListeningRef.current = startListening;
    processUserSpeechRef.current = processUserSpeech;
    speakResponseRef.current = speakResponse;
  }, [startListening, processUserSpeech, speakResponse]);

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
    if (!isOpen) {
      return;
    }
    transcriptRef.current = '';
    const timer = window.setTimeout(() => {
      if (isMountedRef.current) {
        setTranscript('');
        setLastAiReply('');
        setErrorMessage('');
        startListening(activeSttLangRef.current);
      }
    }, 150);
    return () => {
      window.clearTimeout(timer);
      stopAll();
    };
  }, [isOpen, startListening, stopAll]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-[28px] bg-[#FAF8F5] dark:bg-[#1F1E1B] border border-[#EAE4D9] dark:border-[#38352F] shadow-[0_28px_70px_-16px_rgba(31,30,27,0.35)] p-6 sm:p-7 text-[#1F1E1B] dark:text-[#F0ECE1] flex flex-col items-center justify-between min-h-[520px] relative overflow-hidden"
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#2A2723] border border-[#EAE4D9] dark:border-[#38352F] flex items-center justify-center shrink-0 p-1 shadow-2xs">
              <img
                src="/nebula-logo.png"
                alt="Nebula AI"
                className="w-full h-full object-contain dark:hidden"
              />
              <img
                src="/nebula-logo-dark.png"
                alt="Nebula AI"
                className="w-full h-full object-contain hidden dark:block"
              />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[14px] font-bold tracking-tight text-[#1F1E1B] dark:text-[#F0ECE1] truncate">
                Nebula Voice
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#736B63] dark:text-[#A39E93] truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97736] shrink-0" />
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
            className="w-8 h-8 rounded-full bg-[#F3EFE6] hover:bg-[#EAE4D8] dark:bg-[#2A2723] dark:hover:bg-[#34302B] border border-[#E5DFD3] dark:border-[#38352F] flex items-center justify-center text-[#736B63] dark:text-[#A39E93] hover:text-[#1F1E1B] dark:hover:text-white transition-all cursor-pointer shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Sleek Segmented Language Selector */}
        <div
          role="tablist"
          aria-label="Voice language"
          className="inline-flex flex-wrap items-center justify-center gap-0.5 p-1 mt-5 rounded-2xl sm:rounded-full bg-[#F3EFE6] dark:bg-[#282622] border border-[#E5DFD3] dark:border-[#38352F]"
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
                    ? 'bg-[#D97736] text-white font-semibold shadow-2xs'
                    : 'text-[#736B63] dark:text-[#A39E93] hover:text-[#1F1E1B] dark:hover:text-white hover:bg-[#EAE4D8]/70 dark:hover:bg-[#322F2A] font-medium'
                }`}
              >
                {l.code === 'auto' && <Globe size={11} className={isSelected ? 'text-white' : 'text-[#8C827A]'} />}
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>

        {/* Central Open-Stage Living Nebula NB Emblem & Dual Generative Orbits */}
        <div className="relative flex items-center justify-center my-5 h-60 w-60">
          {/* Subtle atmospheric warm Claude terracotta backlight */}
          <div
            className={`absolute inset-4 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
              status === 'listening'
                ? 'bg-[#D97736]/20 scale-110'
                : status === 'thinking'
                  ? 'bg-amber-500/25 scale-115'
                  : status === 'speaking'
                    ? 'bg-[#E07A5F]/25 scale-120'
                    : 'bg-[#D97736]/12 scale-100'
            }`}
          />

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
                  ? 'Tap emblem to start talking'
                  : 'Nebula Voice Emblem'
            }
            className="relative flex items-center justify-center w-56 h-56 bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
          >
            <NebulaAnimatedEmblem status={status} className="w-56 h-56" />
          </button>
        </div>

        {/* Status Indicator & Transcript Subtitles */}
        <div className="w-full flex flex-col items-center text-center px-4 gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-[#FBF3EC] dark:bg-[#2E2620] border border-[#F3D8C6] dark:border-[#4B3A2C] text-xs font-semibold uppercase tracking-wider text-[#D97736] dark:text-[#E07A5F] inline-flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
              {status === 'listening' && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#D97736] opacity-75 animate-ping" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  status === 'listening'
                    ? 'bg-[#D97736]'
                    : status === 'thinking'
                      ? 'bg-amber-500 animate-spin'
                      : status === 'speaking'
                        ? 'bg-[#C26224] animate-pulse'
                        : 'bg-[#8C827A]'
                }`}
              />
            </span>
            <span>
              {status === 'listening' ? 'Listening to you...' :
               status === 'thinking' ? 'Nebula is thinking...' :
               status === 'speaking' ? 'Speaking (Click orb to interrupt)...' :
               'Tap Emblem to Start'}
            </span>
          </div>

          <p className="text-[14px] font-medium text-[#554E46] dark:text-[#D5CFC4] line-clamp-3 min-h-[44px] leading-relaxed max-w-sm">
            {transcript || lastAiReply.slice(0, 160) || 'Start speaking naturally — Nebula will reply automatically...'}
          </p>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/40">
              <AlertCircle size={13} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="w-full flex items-center justify-center gap-3 mt-5 pt-4 border-t border-[#EAE4D9] dark:border-[#38352F]">
          {status === 'speaking' && (
            <button
              onClick={interruptSpeech}
              className="px-4 py-2.5 rounded-full flex items-center gap-1.5 text-xs font-semibold bg-[#F3EFE6] hover:bg-[#EAE4D8] dark:bg-[#2A2723] dark:hover:bg-[#34302B] border border-[#E5DFD3] dark:border-[#38352F] text-[#1F1E1B] dark:text-white transition-all cursor-pointer"
            >
              <Square size={12} className="text-[#D97736] fill-[#D97736]" />
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
                ? 'bg-[#D97736] hover:bg-[#C26224] text-white shadow-md shadow-orange-950/15'
                : 'bg-[#1F1E1B] dark:bg-[#F0ECE1] text-white dark:text-[#1F1E1B] hover:opacity-90 shadow-md'
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
