import React, { useState } from 'react';
import {
  Play,
  X,
  Download,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  Zap,
  Send,
  RotateCcw,
  ArrowRight,
  Image as ImageIcon,
  Wand2,
  Palette,
  Cpu,
  HelpCircle,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface FluxWorkflowStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (markdownText: string, imageUrl: string) => void;
}

interface JobHistoryItem {
  id: string;
  filename: string;
  prompt: string;
  imageUrl: string;
  latencyMs: number;
  resolution: string;
  timestamp: string;
}

const DEFAULT_CAR_IMAGE =
  'https://res.cloudinary.com/drxsezyyl/image/upload/v1793590905/nebula_ai/generated/wpzjfcdjsmby3pgla1id.jpg';

export const FluxWorkflowStudio: React.FC<FluxWorkflowStudioProps> = ({
  isOpen,
  onClose,
  onSendToChat,
}) => {
  const [prompt, setPrompt] = useState(
    'A pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers on the roof, soft studio lighting, 8k photorealistic'
  );
  const [selectedStyle, setSelectedStyle] = useState('Photorealistic 8K');
  const [unetModel, setUnetModel] = useState('FLUX.1-Schnell (Fast 3s Turbo)');
  const clipModel = 'DualCLIP (T5-XXL + CLIP-L)';
  const [steps, setSteps] = useState(4);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);

  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0); // 0=idle, 1=idea, 2=style, 3=ai-brain, 4=done
  const [currentImage, setCurrentImage] = useState<string>(DEFAULT_CAR_IMAGE);
  const [expandedPrompt, setExpandedPrompt] = useState<string>(
    'A pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers on the roof, soft studio lighting, ultra-detailed 8k photorealistic render.'
  );
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(2840);
  const [jobQueue, setJobQueue] = useState<JobHistoryItem[]>([
    {
      id: 'job-init',
      filename: 'Vintage_Flower_Car.jpg',
      prompt: 'Pastel vintage car with blooming flowers',
      imageUrl: DEFAULT_CAR_IMAGE,
      latencyMs: 2840,
      resolution: '1024×1024 HD',
      timestamp: 'Ready',
    },
  ]);

  if (!isOpen) return null;

  const artStyles = [
    { id: 'Photorealistic 8K', label: '📸 Realistic Photo', suffix: ', 8k photorealistic DSLR photography, natural lighting' },
    { id: 'Cinematic Movie', label: '🎬 Cinematic Movie', suffix: ', cinematic movie scene, dramatic lighting, IMAX 8k' },
    { id: '3D Digital Art', label: '✨ 3D Pixar / Render', suffix: ', 3d octane render, Pixar style, vibrant studio lighting' },
    { id: 'Anime Studio', label: '🌸 Anime & Illustration', suffix: ', Makoto Shinkai anime art style, vibrant colors, detailed illustration' },
  ];

  const handleRunWorkflow = async () => {
    if (isRunning || !prompt.trim()) return;
    setIsRunning(true);
    setActiveStep(1);

    const stepTimer1 = setTimeout(() => setActiveStep(2), 450);
    const stepTimer2 = setTimeout(() => setActiveStep(3), 1000);

    const styleObj = artStyles.find((s) => s.id === selectedStyle);
    const fullPrompt = styleObj ? `${prompt}${styleObj.suffix}` : prompt;

    try {
      const res = await fetch(`${API_BASE}/api/flux/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          unetModel,
          clipModel,
          steps,
          cfg: 3.5,
          width,
          height,
          sampler: 'euler',
        }),
      });
      const data = await res.json();
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setActiveStep(4);

      if (data.success && data.cdnUrl) {
        setCurrentImage(data.cdnUrl);
        setExpandedPrompt(data.expandedPrompt || fullPrompt);
        setLastLatencyMs(data.executionTimeMs || 3100);

        const newJob: JobHistoryItem = {
          id: `job-${Date.now()}`,
          filename: `Nebula_Art_${String(jobQueue.length + 1).padStart(2, '0')}.jpg`,
          prompt: data.cleanSubject || prompt.slice(0, 36),
          imageUrl: data.cdnUrl,
          latencyMs: data.executionTimeMs || 3100,
          resolution: `${width}×${height} HD`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setJobQueue((prev) => [newJob, ...prev]);
      }
    } catch (err) {
      console.error('Workflow error:', err);
    } finally {
      setTimeout(() => {
        setIsRunning(false);
        setActiveStep(0);
      }, 450);
    }
  };

  const presetPrompts = [
    {
      label: '🌸 Vintage Flower Car',
      text: 'A pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers on the roof, soft studio lighting, 8k photorealistic',
    },
    {
      label: '🏎️ Red Sports Supercar',
      text: 'A sleek metallic red Ferrari supercar driving on a coastal highway at sunset, dramatic reflections, 8k photography',
    },
    {
      label: '🌴 Kerala Houseboat Sunset',
      text: 'Traditional luxury wooden houseboat gliding through calm emerald Kerala backwaters at golden sunset with coconut palms, 8k photo',
    },
    {
      label: '🦁 Royal Golden Lion',
      text: 'Majestic lion portrait with a glowing golden mane in warm morning sunlight, ultra-detailed wildlife photography',
    },
  ];

  const simpleSteps = [
    { num: 1, title: '1. Write Your Idea', desc: 'Type what you want to see' },
    { num: 2, title: '2. Pick Art Style', desc: 'Photo, 3D, or Cinematic' },
    { num: 3, title: '3. AI Brain Pipeline', desc: 'FLUX.1 & Gemini NLP' },
    { num: 4, title: '4. Final HD Picture', desc: 'Ready in ~3 Seconds' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F8FAFC] dark:bg-[#0F1420] text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden select-none"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif" }}
    >
      {/* Top Friendly Header Bar */}
      <div className="h-16 bg-white/95 dark:bg-[#151C2C]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Wand2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Nebula Visual AI Studio
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold">
                FLUX.1 Visual Flow
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              See step-by-step how AI connects your words and paints an HD image in 3 seconds
            </p>
          </div>
        </div>

        {/* Quick Try Ideas */}
        <div className="hidden xl:flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">Try an idea:</span>
          {presetPrompts.map((preset, i) => (
            <button
              key={i}
              onClick={() => setPrompt(preset.text)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800/80 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Right Primary Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              isRunning
                ? 'bg-indigo-500/50 text-white cursor-wait'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/25 active:scale-95'
            }`}
          >
            <Play size={14} fill="currentColor" />
            <span>{isRunning ? 'Creating Picture...' : 'Generate Picture Now'}</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Back to Chat"
          >
            <X size={15} />
            <span className="hidden sm:inline">Back to Chat</span>
          </button>
        </div>
      </div>

      {/* Friendly 4-Step Guide Bar (Makes it 100% clear for everyone!) */}
      <div className="bg-indigo-50/70 dark:bg-[#111726] border-b border-indigo-100 dark:border-slate-800/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
          {simpleSteps.map((s, idx) => {
            const isActive = activeStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold scale-105'
                      : 'bg-white dark:bg-[#192236] border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isActive
                        ? 'bg-white text-indigo-600'
                        : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300'
                    }`}
                  >
                    {s.num}
                  </span>
                  <div>
                    <span className="font-bold">{s.title}</span>
                    <span className={`hidden md:inline ml-1.5 text-[11px] ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                      — {s.desc}
                    </span>
                  </div>
                </div>
                {idx < simpleSteps.length - 1 && (
                  <ArrowRight size={14} className="text-indigo-400 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-3 py-1 rounded-lg">
          <HelpCircle size={13} />
          <span>Follow the glowing cables from left to right!</span>
        </div>
      </div>

      {/* Main Connected Canvas Workspace */}
      <div
        className="flex-1 relative overflow-auto p-6 flex items-start justify-between gap-6"
        style={{
          backgroundImage: 'radial-gradient(rgba(99, 102, 241, 0.14) 1.25px, transparent 1.25px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Smooth Glowing Connection Cables Between Cards */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden xl:block"
          viewBox="0 0 1440 720"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cable1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="cable2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="cable3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Cable A: Step 1 (Your Idea) -> Step 3 (AI Brain Pipeline) */}
          <path
            d="M 340 190 C 375 190, 345 190, 380 190"
            fill="none"
            stroke="url(#cable1)"
            strokeWidth="4"
            strokeDasharray={isRunning ? '8 5' : undefined}
          />

          {/* Cable B: Step 2 (Style & Size) -> Step 3 (AI Brain Pipeline) */}
          <path
            d="M 340 500 C 370 500, 350 340, 380 340"
            fill="none"
            stroke="url(#cable2)"
            strokeWidth="3.5"
            strokeDasharray={isRunning ? '8 5' : undefined}
          />

          {/* Cable C: Step 3 (AI Brain Pipeline) -> Step 4 (Final Picture) */}
          <path
            d="M 710 270 C 745 270, 725 270, 760 270"
            fill="none"
            stroke="url(#cable3)"
            strokeWidth="4"
            strokeDasharray={isRunning ? '8 5' : undefined}
          />
        </svg>

        {/* Connected Columns (Left -> Middle -> Right) */}
        <div className="relative z-10 flex flex-wrap xl:flex-nowrap items-start gap-8 w-full">
          {/* COLUMN 1: STEP 1 (Your Idea) + STEP 2 (Style & Size) */}
          <div className="flex flex-col gap-6 w-full xl:w-[340px] shrink-0">
            {/* STEP 1 CARD: Write Your Idea */}
            <div
              className={`rounded-2xl bg-white dark:bg-[#161F30] border-2 transition-all shadow-lg ${
                activeStep === 1
                  ? 'border-indigo-500 ring-4 ring-indigo-500/15'
                  : 'border-slate-200/90 dark:border-slate-700/80'
              }`}
            >
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent rounded-t-2xl border-b border-slate-100 dark:border-slate-700/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Write Your Picture Idea
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Type in simple English or Manglish
                    </p>
                  </div>
                </div>
                {/* Connection Dot */}
                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 px-2 py-0.5 rounded-full">
                  IDEA <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                </span>
              </div>

              <div className="p-4 space-y-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0F1624] border border-slate-200 dark:border-slate-700 focus:border-indigo-500 p-3 text-xs text-slate-800 dark:text-slate-100 leading-relaxed outline-hidden resize-none transition-colors"
                  placeholder="Example: A cute vintage green car with flowers on top..."
                />

                {/* Smart AI Improvement Box */}
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-500/30">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 text-[11px] mb-1">
                    <Sparkles size={13} />
                    <span>Smart AI Prompt Booster (Auto-Active)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {expandedPrompt}
                  </p>
                </div>
              </div>
            </div>

            {/* STEP 2 CARD: Pick Style & Picture Size */}
            <div
              className={`rounded-2xl bg-white dark:bg-[#161F30] border-2 transition-all shadow-lg ${
                activeStep === 2
                  ? 'border-violet-500 ring-4 ring-violet-500/15'
                  : 'border-slate-200/90 dark:border-slate-700/80'
              }`}
            >
              <div className="px-4 py-3 bg-gradient-to-r from-violet-500/10 via-pink-500/5 to-transparent rounded-t-2xl border-b border-slate-100 dark:border-slate-700/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-violet-600 text-white font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Choose Style & Picture Size
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select how your artwork should look
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/15 px-2 py-0.5 rounded-full">
                  STYLE <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
                </span>
              </div>

              <div className="p-4 space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <Palette size={13} className="text-violet-500" />
                    Picture Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {artStyles.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStyle(st.id)}
                        className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border text-left transition-all cursor-pointer ${
                          selectedStyle === st.id
                            ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-[#0F1624] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Picture Width
                    </label>
                    <select
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-[#0F1624] text-xs font-bold text-slate-800 dark:text-white px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-hidden cursor-pointer"
                    >
                      <option value={1024}>1024 px (Full HD)</option>
                      <option value={768}>768 px (Medium)</option>
                      <option value={512}>512 px (Small)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Picture Height
                    </label>
                    <select
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-[#0F1624] text-xs font-bold text-slate-800 dark:text-white px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-hidden cursor-pointer"
                    >
                      <option value={1024}>1024 px (Full HD)</option>
                      <option value={768}>768 px (Medium)</option>
                      <option value={512}>512 px (Small)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: STEP 3 (How the AI Brain Connects & Builds It) */}
          <div className="flex flex-col gap-6 w-full xl:w-[345px] shrink-0">
            <div
              className={`rounded-2xl bg-white dark:bg-[#161F30] border-2 transition-all shadow-lg ${
                activeStep === 3
                  ? 'border-emerald-500 ring-4 ring-emerald-500/15'
                  : 'border-slate-200/90 dark:border-slate-700/80'
              }`}
            >
              <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent rounded-t-2xl border-b border-slate-100 dark:border-slate-700/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      AI Brain Pipeline (Connected Nodes)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      How AI turns your words into a photo
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full">
                  ENGINE <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                </span>
              </div>

              <div className="p-4 space-y-3">
                {/* Connected Node A: Word Reader */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1624] border border-slate-200 dark:border-slate-700/80 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      Stage A: Word Reader
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                      DualCLIP T5
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Reads your prompt and understands the objects, colors, and lighting you asked for.
                  </p>
                </div>

                {/* Visual Downward Connector Arrow */}
                <div className="flex justify-center -my-1">
                  <div className="w-0.5 h-4 bg-gradient-to-b from-indigo-500 to-violet-500" />
                </div>

                {/* Connected Node B: FLUX Image Painter */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1624] border border-slate-200 dark:border-slate-700/80 relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                      Stage B: AI Image Painter
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-300">
                      FLUX.1 GGUF
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                    Generates the image from scratch using high-speed diffusion sampling.
                  </p>
                  <select
                    value={unetModel}
                    onChange={(e) => setUnetModel(e.target.value)}
                    className="w-full bg-white dark:bg-[#161F30] text-xs font-semibold text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-hidden cursor-pointer"
                  >
                    <option value="FLUX.1-Schnell (Fast 3s Turbo)">
                      ⚡ FLUX.1-Schnell (Fast 3-Second Turbo)
                    </option>
                    <option value="FLUX.1-Dev (Ultra Detail)">
                      💎 FLUX.1-Dev (Ultra Detailed Mode)
                    </option>
                  </select>
                </div>

                {/* Visual Downward Connector Arrow */}
                <div className="flex justify-center -my-1">
                  <div className="w-0.5 h-4 bg-gradient-to-b from-violet-500 to-emerald-500" />
                </div>

                {/* Connected Node C: HD Polisher & Cloud Storage */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1624] border border-slate-200 dark:border-slate-700/80 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Stage C: HD Sharpener & Cloud
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      VAE + CDN
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Sharpens the final picture into crystal-clear {width}×{height} HD and saves it to Cloudinary CDN.
                  </p>
                </div>

                {/* Speed Control Slider */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-[#0F1624] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <Cpu size={13} className="text-emerald-500" />
                    AI Refining Passes (Steps)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-14 text-right bg-transparent font-bold text-emerald-600 dark:text-emerald-400 outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 3: STEP 4 (Your Finished HD Picture) */}
          <div className="flex flex-col gap-5 w-full xl:w-[395px] shrink-0">
            <div
              className={`rounded-2xl bg-white dark:bg-[#161F30] border-2 transition-all shadow-xl ${
                activeStep === 4
                  ? 'border-cyan-500 ring-4 ring-cyan-500/15'
                  : 'border-slate-200/90 dark:border-slate-700/80'
              }`}
            >
              <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent rounded-t-2xl border-b border-slate-100 dark:border-slate-700/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">
                    4
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Your Finished HD Picture
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Download or send directly to your chat
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-500/30">
                  {width}×{height} HD
                </span>
              </div>

              <div className="p-4 space-y-3.5">
                {/* Large Crisp Image Frame */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 flex items-center justify-center group">
                  <img
                    src={currentImage}
                    alt="Generated Artwork"
                    className={`w-full h-full object-cover transition-all duration-500 ${
                      isRunning ? 'scale-95 opacity-35 blur-xs' : 'scale-100 opacity-100'
                    }`}
                  />

                  {isRunning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 text-center text-white">
                      <RotateCcw size={30} className="text-indigo-400 animate-spin mb-2.5" />
                      <span className="text-sm font-bold">
                        AI is Painting Your Picture...
                      </span>
                      <span className="text-xs text-indigo-200 mt-1">
                        Step {activeStep} of 4 • Takes only ~3 seconds!
                      </span>
                    </div>
                  )}

                  {/* Bottom Speed Badge */}
                  {!isRunning && (
                    <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/15 flex items-center justify-between text-xs text-white">
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Zap size={13} /> Created in {(lastLatencyMs / 1000).toFixed(1)}s
                      </span>
                      <span className="text-slate-200 font-medium flex items-center gap-1">
                        <ImageIcon size={12} /> Saved to Cloud ✓
                      </span>
                    </div>
                  )}
                </div>

                {/* Friendly Action Buttons */}
                <div className="grid grid-cols-3 gap-2.5">
                  <a
                    href={currentImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                  >
                    <ExternalLink size={13} />
                    <span>Full Screen</span>
                  </a>
                  <a
                    href={currentImage}
                    download="Nebula_AI_Picture.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </a>
                  {onSendToChat && (
                    <button
                      onClick={() => {
                        const md =
                          `### 🎨 Created in Nebula Visual AI Studio\n` +
                          `* **Style**: \`${selectedStyle}\` (\`${width}×${height} HD\`)\n` +
                          `* **Speed**: Created in \`${(lastLatencyMs / 1000).toFixed(1)} seconds\`\n\n` +
                          `![${prompt.slice(0, 40)}](${currentImage})\n\n` +
                          `🔗 [Open Full HD Picture](${currentImage})`;
                        onSendToChat(md, currentImage);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      <Send size={13} />
                      <span>Send to Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Panel: Recent Pictures & Speed Comparison */}
        <div className="relative z-10 w-full xl:w-[285px] shrink-0 flex flex-col gap-5">
          {/* Recent Pictures History */}
          <div className="rounded-2xl bg-white dark:bg-[#161F30] border border-slate-200 dark:border-slate-700/80 shadow-lg p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-700/70">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={14} className="text-indigo-500" />
                Your Recent Pictures
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                {jobQueue.length} Saved
              </span>
            </div>

            <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
              {jobQueue.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setCurrentImage(job.imageUrl)}
                  className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/50 dark:bg-[#0F1624] dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 cursor-pointer transition-all"
                >
                  <img
                    src={job.imageUrl}
                    alt={job.filename}
                    className="w-11 h-11 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {job.prompt}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {(job.latencyMs / 1000).toFixed(1)}s • {job.resolution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Simple Speed Comparison Card */}
          <div className="rounded-2xl bg-white dark:bg-[#161F30] border border-slate-200 dark:border-slate-700/80 p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                ⚡ Why Nebula is Faster
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold">
                1,600× Faster
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-500/20">
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                  <span className="font-semibold">Normal 8GB Laptop (Offline)</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">85 mins</span>
                </div>
                <div className="w-full bg-rose-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full w-full" />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                  Very slow • Small 512×512 size
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-500/30">
                <div className="flex justify-between text-xs text-slate-900 dark:text-white mb-1">
                  <span className="font-bold">Nebula Hybrid Cloud Studio</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {(lastLatencyMs / 1000).toFixed(1)} secs
                  </span>
                </div>
                <div className="w-full bg-emerald-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[8%]" />
                </div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block mt-1 font-medium">
                  Instant 1024×1024 Full HD quality!
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
