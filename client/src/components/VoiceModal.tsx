import React, { useState, useEffect, useRef, useId } from 'react';
import { X, Mic, MicOff, AlertCircle, Square, Globe } from 'lucide-react';

type EmblemStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

const EMBLEM_ACCENTS: Record<EmblemStatus, { ringGlow: string; glint: string; nClass: string; ringClass: string }> = {
  idle: { ringGlow: '#CBD5E1', glint: '#F8FAFC', nClass: 'nebula-n-idle', ringClass: 'nebula-ring-idle' },
  listening: { ringGlow: '#7DD3FC', glint: '#E0F2FE', nClass: 'nebula-n-listening', ringClass: 'nebula-ring-listening' },
  thinking: { ringGlow: '#FCD34D', glint: '#FEF3C7', nClass: 'nebula-n-thinking', ringClass: 'nebula-ring-thinking' },
  speaking: { ringGlow: '#FFFFFF', glint: '#FFFFFF', nClass: 'nebula-n-speaking', ringClass: 'nebula-ring-speaking' },
};

const NebulaAnimatedEmblem: React.FC<{ status: EmblemStatus }> = ({ status }) => {
  const uid = useId().replace(/:/g, '');
  const backClipId = `${uid}-back`;
  const frontClipId = `${uid}-front`;
  const metalGradId = `${uid}-metal`;
  const diagonalGradId = `${uid}-diag`;
  const darkBevelId = `${uid}-bevel`;
  const ringTrackId = `${uid}-track`;
  const ringSweepId = `${uid}-sweep`;
  const accent = EMBLEM_ACCENTS[status];

  const renderOrbitGroup = () => (
    <g className={accent.ringClass}>
      <circle cx="0" cy="0" r="112" fill="none" stroke="none" />
      <circle cx="0" cy="0" r="102" fill="none" stroke={`url(#${ringTrackId})`} strokeWidth="13" />
      <circle cx="0" cy="0" r="97.5" fill="none" stroke="#1E293B" strokeWidth="3.5" strokeOpacity="0.85" />
      <circle
        cx="0"
        cy="0"
        r="102"
        fill="none"
        stroke={`url(#${ringSweepId})`}
        strokeWidth="8"
        strokeDasharray="128 192 88 232"
        strokeLinecap="round"
      />
      <circle
        cx="0"
        cy="0"
        r="105.5"
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2"
        strokeDasharray="105 215 70 250"
        strokeLinecap="round"
      />
      <circle cx="102" cy="0" r="4" fill={accent.glint} opacity="0.95" />
      <circle cx="-102" cy="0" r="2.8" fill="#E2E8F0" opacity="0.75" />
    </g>
  );

  return (
    <svg
      viewBox="-145 -135 290 270"
      className="w-48 h-48 overflow-visible select-none pointer-events-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.65)]"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={backClipId}>
          <rect x="-150" y="-150" width="300" height="150" />
        </clipPath>
        <clipPath id={frontClipId}>
          <rect x="-150" y="0" width="300" height="150" />
        </clipPath>
        <linearGradient id={metalGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="28%" stopColor="#CBD5E1" />
          <stop offset="72%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id={diagonalGradId} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="45%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id={darkBevelId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#090D16" />
          <stop offset="55%" stopColor="#283548" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id={ringTrackId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="35%" stopColor="#94A3B8" />
          <stop offset="70%" stopColor="#334155" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id={ringSweepId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
          <stop offset="50%" stopColor={accent.ringGlow} stopOpacity="0.92" />
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* Rear half of tilted orbital ring passing smoothly behind the 'N' */}
      <g transform="translate(0, 10) rotate(-22) scale(1, 0.36)">
        <g clipPath={`url(#${backClipId})`}>{renderOrbitGroup()}</g>
      </g>

      {/* Sculpted metallic 3D 'N' moving strictly up and down */}
      <g className={accent.nClass}>
        <path
          d="M -22 -64 L -12 -30 Q -26 24 -44 68 Q -32 6 -22 -64 Z"
          fill={`url(#${darkBevelId})`}
        />
        <path
          d="M -21 -44 Q -6 -10 18 52 L 28 62 Q 4 12 -22 -30 Z"
          fill={`url(#${darkBevelId})`}
        />
        <path
          d="M -56 76 Q -42 10 -24 -70 L -14 -70 Q -28 8 -44 70 Q -50 75 -56 76 Z"
          fill={`url(#${metalGradId})`}
        />
        <path
          d="M -24 -70 C -10 -70 4 -40 28 40 L 22 64 C 2 8 -14 -40 -24 -70 Z"
          fill={`url(#${diagonalGradId})`}
        />
        <path
          d="M 22 64 Q 30 -32 62 -76 Q 48 -14 34 62 L 22 64 Z"
          fill={`url(#${darkBevelId})`}
        />
        <path
          d="M 32 60 Q 44 -20 62 -76 Q 42 -44 26 42 Q 24 54 22 64 Z"
          fill={`url(#${metalGradId})`}
        />
      </g>

      {/* Front half of tilted orbital ring sweeping in front of the 'N' */}
      <g transform="translate(0, 10) rotate(-22) scale(1, 0.36)">
        <g clipPath={`url(#${frontClipId})`}>{renderOrbitGroup()}</g>
      </g>
    </svg>
  );
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-[28px] bg-gradient-to-b from-[#16171E] via-[#101116] to-[#0B0C10] border border-white/[0.08] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.9)] p-6 sm:p-7 text-white flex flex-col items-center justify-between min-h-[510px] relative overflow-hidden"
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 p-1">
              <img
                src="/nebula-logo.png"
                alt="Nebula AI"
                className="w-full h-full object-contain brightness-125 drop-shadow-[0_0_6px_rgba(255,255,255,0.22)]"
              />
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

        {/* Central Open-Stage Living Nebula Emblem (No Outer Circle Ring) */}
        <div className="relative flex items-center justify-center my-6 h-52 w-52">
          {/* Subtle atmospheric ambient backlight (soft glow only, zero ring border) */}
          <div
            className={`absolute inset-4 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
              status === 'listening'
                ? 'bg-sky-400/20 scale-110'
                : status === 'thinking'
                  ? 'bg-amber-400/20 scale-115'
                  : status === 'speaking'
                    ? 'bg-slate-200/25 scale-120'
                    : 'bg-slate-400/10 scale-100'
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
            className="relative flex items-center justify-center w-48 h-48 bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
          >
            <NebulaAnimatedEmblem status={status} />
          </button>
        </div>

        {/* Status Indicator & Transcript Subtitles */}
        <div className="w-full flex flex-col items-center text-center px-4 gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider text-gray-300 inline-flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
              {status === 'listening' && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  status === 'listening'
                    ? 'bg-sky-400'
                    : status === 'thinking'
                      ? 'bg-amber-400 animate-spin'
                      : status === 'speaking'
                        ? 'bg-white animate-pulse'
                        : 'bg-gray-500'
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
