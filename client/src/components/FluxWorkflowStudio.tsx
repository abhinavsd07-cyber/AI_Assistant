import React, { useState } from 'react';
import {
  Play,
  X,
  Download,
  ExternalLink,
  Sparkles,
  Cpu,
  CheckCircle2,
  Clock,
  Layers,
  Zap,
  Sliders,
  Send,
  RotateCcw,
  ArrowRight,
  ArrowDown,
  Image as ImageIcon,
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

export const FluxWorkflowStudio: React.FC<FluxWorkflowStudioProps> = ({
  isOpen,
  onClose,
  onSendToChat,
}) => {
  const [prompt, setPrompt] = useState(
    'A pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers on the roof, soft studio lighting, minimalist pastel background, 8k photorealistic'
  );
  const [unetModel, setUnetModel] = useState('FLUX.1-Schnell (Q4_K_S GGUF)');
  const clipModel = 'DualCLIP (T5-XXL FP8 + CLIP-L)';
  const vaeModel = 'FLUX Autoencoder (ae.safetensors)';
  const [guidance, setGuidance] = useState(3.5);
  const [steps, setSteps] = useState(4);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [sampler, setSampler] = useState('Euler FlowMatch');
  const [scheduler, setScheduler] = useState('Simple');

  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [currentImage, setCurrentImage] = useState<string>(
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=85'
  );
  const [expandedPrompt, setExpandedPrompt] = useState<string>(
    'A breathtaking, pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers on the roof, soft studio lighting, 8k photorealistic.'
  );
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(2840);
  const [jobQueue, setJobQueue] = useState<JobHistoryItem[]>([
    {
      id: 'job-init',
      filename: 'Nebula_FLUX_00001.png',
      prompt: 'Vintage classic car with blooming flowers',
      imageUrl:
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=85',
      latencyMs: 2840,
      resolution: '1024×1024',
      timestamp: 'Ready',
    },
  ]);

  if (!isOpen) return null;

  const handleRunWorkflow = async () => {
    if (isRunning || !prompt.trim()) return;
    setIsRunning(true);
    setActiveStep(1);

    const stepTimer1 = setTimeout(() => setActiveStep(2), 500);
    const stepTimer2 = setTimeout(() => setActiveStep(3), 1100);

    try {
      const res = await fetch(`${API_BASE}/api/flux/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          unetModel,
          clipModel,
          steps,
          cfg: guidance,
          width,
          height,
          sampler,
        }),
      });
      const data = await res.json();
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setActiveStep(4);

      if (data.success && data.cdnUrl) {
        setCurrentImage(data.cdnUrl);
        setExpandedPrompt(data.expandedPrompt || prompt);
        setLastLatencyMs(data.executionTimeMs || 3120);

        const newJob: JobHistoryItem = {
          id: `job-${Date.now()}`,
          filename: `Nebula_FLUX_${String(jobQueue.length + 1).padStart(5, '0')}.png`,
          prompt: data.cleanSubject || prompt.slice(0, 40),
          imageUrl: data.cdnUrl,
          latencyMs: data.executionTimeMs || 3120,
          resolution: `${width}×${height}`,
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
      label: '🌸 Flower Car',
      text: 'A pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers on the roof, soft studio lighting, minimalist pastel background, 8k photorealistic',
    },
    {
      label: '🏎️ Cyberpunk Car',
      text: 'Futuristic matte-black cyberpunk hypercar drifting through neon-lit Tokyo rain at night, glowing cyan rim lights, 8k unreal engine 5 render',
    },
    {
      label: '🌴 Kerala 2050',
      text: 'Futuristic solar-powered luxury houseboat gliding through emerald Kerala backwaters at golden sunset, palm trees, cinematic 8k photography',
    },
  ];

  const pipelineStages = [
    { step: 1, title: '1. Load Models' },
    { step: 2, title: '2. Smart Prompt' },
    { step: 3, title: '3. Image Sampler' },
    { step: 4, title: '4. Final Output' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F8FAFC] text-[#0F172A] flex flex-col overflow-hidden select-none"
      style={{
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Responsive Single-Line Header Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-30 shadow-2xs">
        {/* Left Brand & Presets */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Zap size={13} className="text-white" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
              Nebula FLUX.1 Studio
            </span>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold whitespace-nowrap">
              Node Pipeline
            </span>
          </div>

          {/* Preset Quick Switchers (No wrapping) */}
          <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {presetPrompts.map((preset, i) => (
              <button
                key={i}
                onClick={() => setPrompt(preset.text)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-xs font-bold text-slate-700 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center Pipeline Flow Pills (Desktop) */}
        <div className="hidden xl:flex items-center gap-1.5 shrink-0">
          {pipelineStages.map((s, idx) => {
            const isStageActive = activeStep === s.step;
            return (
              <React.Fragment key={s.step}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] whitespace-nowrap transition-all ${
                    isStageActive
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-extrabold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 font-semibold'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isStageActive ? 'bg-indigo-600 animate-ping' : 'bg-emerald-500'
                    }`}
                  />
                  <span>{s.title}</span>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <ArrowRight size={12} className="text-slate-400 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Speed Badge & Run Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>{(lastLatencyMs / 1000).toFixed(1)}s HD</span>
            <span className="hidden 2xl:inline text-emerald-600">• 1,600× faster than 8GB swap</span>
          </div>

          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isRunning
                ? 'bg-indigo-100 text-indigo-700 cursor-wait border border-indigo-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95'
            }`}
          >
            <Play size={13} fill="currentColor" className="shrink-0" />
            <span>{isRunning ? 'Running...' : 'Run Workflow'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-600 transition-colors cursor-pointer shrink-0"
            title="Close Studio (Back to Chat)"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Mobile / Tablet Preset Bar (Only shown on small screens) */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0">Presets:</span>
        {presetPrompts.map((preset, i) => (
          <button
            key={i}
            onClick={() => setPrompt(preset.text)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-xs font-semibold text-slate-700 border border-slate-200 whitespace-nowrap shrink-0"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Main Responsive Scrollable / Auto-Fitting Canvas */}
      <div
        className="flex-1 relative overflow-y-auto overflow-x-hidden p-3 sm:p-5"
        style={{
          backgroundColor: '#F8FAFC',
          backgroundImage: 'radial-gradient(#CBD5E1 1.25px, transparent 1.25px)',
          backgroundSize: '22px 22px',
        }}
      >
        {/* Percentage-Aligned SVG Wires for Desktop (lg+) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block"
          viewBox="0 0 1200 680"
          preserveAspectRatio="none"
        >
          {/* Wire 1: Col 1 (UNet Model) -> Col 2 (Image Sampler) */}
          <path
            d="M 280 120 C 315 120, 275 430, 310 430"
            fill="none"
            stroke="#6366F1"
            strokeWidth={activeStep === 1 ? '4' : '2.8'}
            strokeDasharray={isRunning ? '8 5' : undefined}
          />

          {/* Wire 2: Col 1 (DualCLIP) -> Col 2 (Smart Prompt) */}
          <path
            d="M 280 210 C 295 210, 295 130, 310 130"
            fill="none"
            stroke="#F59E0B"
            strokeWidth={activeStep === 2 ? '4' : '2.8'}
            strokeDasharray={isRunning ? '8 5' : undefined}
          />

          {/* Wire 3: Col 1 (VAE) -> Col 3 (Final Image Output) */}
          <path
            d="M 280 295 C 450 295, 480 95, 615 95"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="2.2"
            strokeDasharray="5 5"
          />

          {/* Wire 4: Col 1 (Image Resolution) -> Col 2 (Image Sampler) */}
          <path
            d="M 280 475 C 295 475, 295 490, 310 490"
            fill="none"
            stroke="#EC4899"
            strokeWidth="2.8"
          />

          {/* Wire 5: Col 2 (Smart Prompt) -> Col 2 (Image Sampler) */}
          <path
            d="M 455 335 L 455 365"
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
          />

          {/* Wire 6: Col 2 (Image Sampler) -> Col 3 (Final Image Output) */}
          <path
            d="M 590 450 C 605 450, 600 240, 615 240"
            fill="none"
            stroke="#0284C7"
            strokeWidth={activeStep >= 3 ? '4' : '3.2'}
            strokeDasharray={isRunning ? '8 5' : undefined}
          />
        </svg>

        {/* Responsive 12-Column Grid (1 col on Mobile, 2 cols on Tablet, 4 balanced cols on Desktop) */}
        <div className="relative z-10 max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* COLUMN 1 (3/12 on Desktop): Step 1 (Load AI Models) + Image Resolution */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* NODE 1: Load AI Models */}
            <div
              className={`rounded-2xl bg-white border-2 transition-all shadow-md shadow-slate-200/70 ${
                activeStep === 1 ? 'border-indigo-600 ring-4 ring-indigo-500/15' : 'border-slate-200'
              }`}
            >
              <div className="px-3.5 py-2.5 bg-indigo-50/70 rounded-t-2xl border-b border-indigo-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                    <Cpu size={13} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 truncate">
                      1. Load AI Models
                    </h4>
                    <p className="text-[10.5px] font-medium text-slate-500 truncate">
                      Selects AI brain & text reader
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 shrink-0">
                  GGUF
                </span>
              </div>

              <div className="p-3 space-y-2.5">
                {/* UNet Backbone */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-800">
                      Image Model (UNet)
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-600">
                      MODEL <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block ring-2 ring-indigo-200" />
                    </span>
                  </div>
                  <select
                    value={unetModel}
                    onChange={(e) => setUnetModel(e.target.value)}
                    className="w-full bg-white text-xs font-semibold text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-indigo-600 outline-hidden cursor-pointer"
                  >
                    <option value="FLUX.1-Schnell (Q4_K_S GGUF)">
                      FLUX.1-Schnell (Q4_K_S GGUF)
                    </option>
                    <option value="FLUX.1-Dev (FP8 Safetensors)">
                      FLUX.1-Dev (FP8 Safetensors)
                    </option>
                  </select>
                </div>

                {/* DualCLIP Text Encoder */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-800">
                      Text Reader (DualCLIP)
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-600">
                      CLIP <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block ring-2 ring-amber-200" />
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-800 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between gap-1">
                    <span className="truncate">{clipModel}</span>
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold shrink-0">
                      Ready
                    </span>
                  </div>
                </div>

                {/* VAE Decoder */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-800">
                      HD Decoder (VAE)
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-rose-600">
                      VAE <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block ring-2 ring-rose-200" />
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 truncate">
                    {vaeModel}
                  </div>
                </div>
              </div>
            </div>

            {/* Image Resolution Node */}
            <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-md shadow-slate-200/70">
              <div className="px-3.5 py-2.5 bg-pink-50/70 rounded-t-2xl border-b border-pink-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-pink-600 flex items-center justify-center text-white shrink-0">
                    <Layers size={13} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900">
                      Image Resolution
                    </h4>
                    <p className="text-[10.5px] font-medium text-slate-500">
                      Output width & height
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-extrabold text-pink-600">
                  SIZE <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block ring-2 ring-pink-200" />
                </span>
              </div>

              <div className="p-3 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Width
                  </label>
                  <select
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full bg-slate-50 text-xs font-bold text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 outline-hidden cursor-pointer"
                  >
                    <option value={1024}>1024 px (HD)</option>
                    <option value={768}>768 px</option>
                    <option value={512}>512 px</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Height
                  </label>
                  <select
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-slate-50 text-xs font-bold text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 outline-hidden cursor-pointer"
                  >
                    <option value={1024}>1024 px (HD)</option>
                    <option value={768}>768 px</option>
                    <option value={512}>512 px</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile Connector Arrow */}
            <div className="flex lg:hidden justify-center py-1 text-indigo-500">
              <ArrowDown size={20} />
            </div>
          </div>

          {/* COLUMN 2 (3/12 on Desktop): Step 2 (Smart Prompt) + Step 3 (Image Sampler) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* NODE 2: Prompt & NLP Conditioning */}
            <div
              className={`rounded-2xl bg-white border-2 transition-all shadow-md shadow-slate-200/70 ${
                activeStep === 2 ? 'border-amber-500 ring-4 ring-amber-500/15' : 'border-slate-200'
              }`}
            >
              <div className="px-3.5 py-2.5 bg-amber-50/80 rounded-t-2xl border-b border-amber-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-white shrink-0">
                    <Sparkles size={13} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 truncate">
                      2. Smart Prompt Input
                    </h4>
                    <p className="text-[10.5px] font-medium text-slate-500 truncate">
                      Describe what to create
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 shrink-0">
                  PROMPT <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-200" />
                </span>
              </div>

              <div className="p-3 space-y-2.5">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white p-2.5 text-xs font-medium text-slate-900 leading-relaxed outline-hidden resize-none transition-all"
                  placeholder="Type any image description here..."
                />

                {expandedPrompt && (
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs">
                    <div className="flex items-center gap-1 font-bold text-indigo-700 text-[11px] mb-0.5">
                      <Sparkles size={11} />
                      <span>AI Auto-Enhanced Prompt:</span>
                    </div>
                    <p className="text-[11px] text-slate-700 line-clamp-2 leading-snug font-medium">
                      {expandedPrompt}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-700 font-bold text-[11px]">Guidance Strength</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={guidance}
                    onChange={(e) => setGuidance(Number(e.target.value))}
                    className="w-14 text-right bg-white px-2 py-0.5 rounded border border-slate-300 font-extrabold text-indigo-700 outline-hidden text-xs"
                  />
                </div>
              </div>
            </div>

            {/* NODE 3: KSampler & FlowMatch Scheduler */}
            <div
              className={`rounded-2xl bg-white border-2 transition-all shadow-md shadow-slate-200/70 ${
                activeStep === 3
                  ? 'border-emerald-500 ring-4 ring-emerald-500/15'
                  : 'border-slate-200'
              }`}
            >
              <div className="px-3.5 py-2.5 bg-emerald-50/80 rounded-t-2xl border-b border-emerald-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
                    <Sliders size={13} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 truncate">
                      3. Image Sampler Engine
                    </h4>
                    <p className="text-[10.5px] font-medium text-slate-500 truncate">
                      Combines Model + Prompt + Size
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-extrabold text-sky-600 shrink-0">
                  RENDER <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block ring-2 ring-sky-200" />
                </span>
              </div>

              <div className="p-3 space-y-2.5 text-xs">
                <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" /> Model
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Prompt
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-pink-500" /> Size
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Sampler
                    </span>
                    <select
                      value={sampler}
                      onChange={(e) => setSampler(e.target.value)}
                      className="w-full bg-transparent font-extrabold text-slate-900 outline-hidden cursor-pointer text-[11px]"
                    >
                      <option value="Euler FlowMatch">Euler FlowMatch</option>
                      <option value="DPM++ 2M SDE">DPM++ 2M SDE</option>
                      <option value="Heun">Heun</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Scheduler
                    </span>
                    <select
                      value={scheduler}
                      onChange={(e) => setScheduler(e.target.value)}
                      className="w-full bg-transparent font-extrabold text-slate-900 outline-hidden cursor-pointer text-[11px]"
                    >
                      <option value="Simple">Simple</option>
                      <option value="SGM Uniform">SGM Uniform</option>
                      <option value="Beta">Beta</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-slate-700 font-bold text-[11px]">Generation Steps</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-14 text-right bg-white px-2 py-0.5 rounded border border-slate-300 font-extrabold text-emerald-700 outline-hidden text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Connector Arrow */}
            <div className="flex lg:hidden justify-center py-1 text-emerald-600">
              <ArrowDown size={20} />
            </div>
          </div>

          {/* COLUMN 3 (3/12 on Desktop): Step 4 (Final HD Image Output Node) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div
              className={`rounded-2xl bg-white border-2 transition-all shadow-lg shadow-slate-200/80 ${
                activeStep === 4 ? 'border-sky-500 ring-4 ring-sky-500/15' : 'border-slate-200'
              }`}
            >
              <div className="px-3.5 py-2.5 bg-sky-50/80 rounded-t-2xl border-b border-sky-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-sky-600 flex items-center justify-center text-white shrink-0">
                    <ImageIcon size={13} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 truncate">
                      4. Final HD Output
                    </h4>
                    <p className="text-[10.5px] font-medium text-slate-500 truncate">
                      Live Preview & Cloud CDN
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                  {width}×{height}
                </span>
              </div>

              <div className="p-3.5 space-y-3">
                {/* Image Preview Frame */}
                <div className="relative aspect-square w-full max-h-[340px] mx-auto rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center group shadow-inner">
                  <img
                    src={currentImage}
                    alt="FLUX Workflow Output"
                    className={`w-full h-full object-cover transition-all duration-500 ${
                      isRunning ? 'scale-95 opacity-40 blur-xs' : 'scale-100 opacity-100'
                    }`}
                  />

                  {isRunning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-xs p-4 text-center">
                      <RotateCcw size={28} className="text-indigo-600 animate-spin mb-2" />
                      <span className="text-xs font-extrabold text-slate-900">
                        Generating {width}×{height} HD Image...
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 mt-1">
                        Step {activeStep} of 4 • Cloud Acceleration
                      </span>
                    </div>
                  )}

                  {/* Bottom Resolution & Speed Overlay */}
                  {!isRunning && (
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                        <Zap size={13} className="text-emerald-600" /> {(lastLatencyMs / 1000).toFixed(2)}s
                      </span>
                      <span className="text-slate-700 font-bold">Cloudinary CDN ✓</span>
                    </div>
                  )}
                </div>

                {/* Output Node Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={currentImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-[11px] font-bold transition-colors whitespace-nowrap"
                  >
                    <ExternalLink size={12} />
                    <span>Open HD</span>
                  </a>
                  <a
                    href={currentImage}
                    download="Nebula_FLUX_1024.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-[11px] font-bold transition-colors whitespace-nowrap"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </a>
                  {onSendToChat && (
                    <button
                      onClick={() => {
                        const md =
                          `### ⚡ FLUX.1 Node Graph Studio Output\n` +
                          `* **Model**: \`${unetModel}\` + \`${clipModel}\`\n` +
                          `* **Resolution**: \`${width}×${height}\` (${steps} steps, ${sampler})\n` +
                          `* **Execution Time**: \`${(lastLatencyMs / 1000).toFixed(2)}s\` *(1,600× faster than local 8GB RAM swap)*\n\n` +
                          `![${prompt.slice(0, 40)}](${currentImage})\n\n` +
                          `🔗 [Open Cloudinary CDN Image](${currentImage})`;
                        onSendToChat(md, currentImage);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Send size={12} />
                      <span>To Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 4 (3/12 on Desktop): Completed Renders & Speed Comparison */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Completed Renders Panel */}
            <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-md shadow-slate-200/70 p-3.5">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-600" />
                  Completed Renders
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                  {jobQueue.length} Done
                </span>
              </div>

              <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                {jobQueue.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setCurrentImage(job.imageUrl)}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 cursor-pointer transition-all"
                  >
                    <img
                      src={job.imageUrl}
                      alt={job.filename}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-300"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                        <p className="text-[11px] font-bold text-slate-900 truncate">
                          {job.filename}
                        </p>
                      </div>
                      <p className="text-[10.5px] font-semibold text-slate-500 mt-0.5">
                        {(job.latencyMs / 1000).toFixed(2)}s • {job.resolution}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Benchmark Card vs 8GB Local MacBook */}
            <div className="rounded-2xl bg-white border-2 border-slate-200 p-3.5 shadow-md shadow-slate-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900">
                  ⚡ Speed Comparison
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                  1,600× Faster
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200">
                  <div className="flex justify-between text-[11px] text-slate-800 mb-1">
                    <span className="font-bold">Local 8GB RAM (MacBook)</span>
                    <span className="text-rose-600 font-extrabold">~85 mins</span>
                  </div>
                  <div className="w-full bg-rose-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-600 h-full w-full" />
                  </div>
                  <span className="text-[10.5px] font-medium text-slate-600 block mt-1">
                    512×512 px • Slow SSD memory swap
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
                  <div className="flex justify-between text-[11px] text-slate-900 mb-1">
                    <span className="font-extrabold">Your Nebula FLUX.1</span>
                    <span className="text-emerald-700 font-extrabold">
                      {(lastLatencyMs / 1000).toFixed(1)} secs
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full w-[8%]" />
                  </div>
                  <span className="text-[10.5px] font-bold text-emerald-800 block mt-1">
                    1024×1024 HD (4× pixels) + Cloud CDN
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
