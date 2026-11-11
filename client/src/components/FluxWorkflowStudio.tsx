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
    'A pastel mint-green vintage classic car overflowing with blooming pink and peach flowers, soft studio lighting, ultra-detailed 8k photorealistic render.'
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
      label: '🌸 Vintage Flower Car',
      text: 'A pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers on the roof, soft studio lighting, minimalist pastel background, 8k photorealistic',
    },
    {
      label: '🏎️ Cyberpunk Hypercar',
      text: 'Futuristic matte-black cyberpunk hypercar drifting through neon-lit Tokyo rain at night, glowing cyan rim lights, 8k unreal engine 5 render',
    },
    {
      label: '🌴 Kerala Backwaters 2050',
      text: 'Futuristic solar-powered luxury houseboat gliding through emerald Kerala backwaters at golden sunset, palm trees, cinematic 8k photography',
    },
  ];

  const pipelineStages = [
    { step: 1, title: 'Step 1: Load AI Models', sub: 'FLUX.1 + DualCLIP' },
    { step: 2, title: 'Step 2: Smart Prompt NLP', sub: 'Text Understanding' },
    { step: 3, title: 'Step 3: Image Sampler', sub: `${steps}-Step HD Render` },
    { step: 4, title: 'Step 4: Final Output', sub: `${width}×${height} Cloud CDN` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F8FAFC] text-[#0F172A] flex flex-col overflow-hidden select-none"
      style={{
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Top Clean Light Studio Header Bar */}
      <div className="h-15 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs">
              <Zap size={15} className="text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-extrabold tracking-tight text-slate-900">
                Nebula FLUX.1 Studio
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-semibold">
                Visual Node Pipeline
              </span>
            </div>
          </div>

          {/* Preset Quick Switchers */}
          <div className="hidden xl:flex items-center gap-2">
            {presetPrompts.map((preset, i) => (
              <button
                key={i}
                onClick={() => setPrompt(preset.text)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center Pipeline Flow Indicator */}
        <div className="hidden md:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium">
          {isRunning ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
              <span className="text-indigo-700 font-semibold">
                {activeStep === 1 && 'Step 1/4: Loading FLUX.1 & DualCLIP Models...'}
                {activeStep === 2 && 'Step 2/4: Enhancing Prompt with Gemini NLP...'}
                {activeStep === 3 && `Step 3/4: Generating ${width}×${height} HD Image...`}
                {activeStep === 4 && 'Step 4/4: Saving to Cloudinary Global CDN...'}
              </span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-700">
                Last Render:{' '}
                <strong className="text-emerald-600 font-bold">
                  {(lastLatencyMs / 1000).toFixed(2)}s
                </strong>{' '}
                <span className="text-slate-300">|</span>{' '}
                <span className="text-indigo-600 font-bold">
                  1,600× faster than 8GB local swap (85m)
                </span>
              </span>
            </>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              isRunning
                ? 'bg-indigo-100 text-indigo-700 cursor-wait border border-indigo-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95'
            }`}
          >
            <Play size={14} fill="currentColor" />
            <span>{isRunning ? 'Running Pipeline...' : 'Run Workflow'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Close Studio (Back to Chat)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Sub-Header: Easy-to-Understand 4-Step Pipeline Progress Bar */}
      <div className="bg-white/90 backdrop-blur-xs border-b border-slate-200/80 px-6 py-3 hidden lg:flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          {pipelineStages.map((s, idx) => {
            const isStageActive = activeStep === s.step;
            return (
              <React.Fragment key={s.step}>
                <div
                  className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs transition-all ${
                    isStageActive
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs font-bold'
                      : 'bg-slate-50 border-slate-200/90 text-slate-700 font-semibold'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isStageActive ? 'bg-indigo-600 animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  <span>{s.title}</span>
                  <span className="text-[11px] text-slate-500 font-normal">({s.sub})</span>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <ArrowRight size={15} className="text-slate-400" />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Interactive Visual Pipeline • Easy Step-by-Step Flow
        </span>
      </div>

      {/* Main Light Dotted Node-Graph Canvas */}
      <div
        className="flex-1 relative overflow-auto p-6 flex items-start justify-between gap-6"
        style={{
          backgroundColor: '#F8FAFC',
          backgroundImage: 'radial-gradient(#CBD5E1 1.35px, transparent 1.35px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* High-Contrast Colorful SVG Connection Wires */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden xl:block"
          viewBox="0 0 1440 760"
          preserveAspectRatio="none"
        >
          {/* Wire 1: Step 1 (UNet Model) -> Step 3 (KSampler) */}
          <path
            d="M 325 140 C 385 140, 315 480, 375 480"
            fill="none"
            stroke="#6366F1"
            strokeWidth={activeStep === 1 ? '4' : '3'}
            strokeDasharray={isRunning ? '8 5' : undefined}
          />

          {/* Wire 2: Step 1 (DualCLIP) -> Step 2 (Smart Prompt) */}
          <path
            d="M 325 250 C 350 250, 350 150, 375 150"
            fill="none"
            stroke="#F59E0B"
            strokeWidth={activeStep === 2 ? '4' : '3'}
            strokeDasharray={isRunning ? '8 5' : undefined}
          />

          {/* Wire 3: Step 1 (VAE) -> Step 4 (Final Image Output) */}
          <path
            d="M 325 345 C 520 345, 560 125, 755 125"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="2.5"
            strokeDasharray="5 5"
          />

          {/* Wire 4: Image Size -> Step 3 (KSampler) */}
          <path
            d="M 325 540 C 350 540, 350 540, 375 540"
            fill="none"
            stroke="#EC4899"
            strokeWidth="3"
          />

          {/* Wire 5: Step 2 (Prompt Embeddings) -> Step 3 (KSampler) */}
          <path
            d="M 705 235 C 735 235, 345 435, 375 435"
            fill="none"
            stroke="#10B981"
            strokeWidth={activeStep === 3 ? '4' : '3'}
          />

          {/* Wire 6: Step 3 (KSampler) -> Step 4 (Final Image Output) */}
          <path
            d="M 705 500 C 735 500, 725 275, 755 275"
            fill="none"
            stroke="#0284C7"
            strokeWidth={activeStep >= 3 ? '4' : '3.5'}
            strokeDasharray={isRunning ? '8 5' : undefined}
          />
        </svg>

        {/* Left & Center Connected Node Columns */}
        <div className="relative z-10 flex flex-wrap xl:flex-nowrap items-start gap-10 w-full">
          {/* COLUMN 1: Step 1 (Load AI Models) + Image Size */}
          <div className="flex flex-col gap-6 w-full xl:w-[325px] shrink-0">
            {/* NODE 1: Load AI Models */}
            <div
              className={`rounded-2xl bg-white border-2 transition-all shadow-lg shadow-slate-200/80 ${
                activeStep === 1 ? 'border-indigo-600 ring-4 ring-indigo-500/15' : 'border-slate-200'
              }`}
            >
              <div className="px-4 py-3.5 bg-indigo-50/70 rounded-t-2xl border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
                    <Cpu size={15} />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-slate-900">
                      1. Load AI Models
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500">
                      Selects the AI brain & text reader
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700">
                  GGUF / FP8
                </span>
              </div>

              <div className="p-4 space-y-3.5">
                {/* UNet Backbone */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      Image Generator Model (UNet)
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-indigo-600">
                      MODEL <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block ring-4 ring-indigo-200" />
                    </span>
                  </div>
                  <select
                    value={unetModel}
                    onChange={(e) => setUnetModel(e.target.value)}
                    className="w-full bg-white text-xs font-semibold text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-600 outline-hidden cursor-pointer"
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
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      Text Reader (DualCLIP)
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-600">
                      CLIP <span className="w-3 h-3 rounded-full bg-amber-500 inline-block ring-4 ring-amber-200" />
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="truncate">{clipModel}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                      Ready
                    </span>
                  </div>
                </div>

                {/* VAE Decoder */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      HD Image Decoder (VAE)
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-rose-600">
                      VAE <span className="w-3 h-3 rounded-full bg-rose-500 inline-block ring-4 ring-rose-200" />
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    {vaeModel}
                  </div>
                </div>
              </div>
            </div>

            {/* Image Resolution Node */}
            <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-lg shadow-slate-200/80">
              <div className="px-4 py-3 bg-pink-50/70 rounded-t-2xl border-b border-pink-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-pink-600 flex items-center justify-center text-white">
                    <Layers size={14} />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-slate-900">
                      Image Resolution
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500">
                      Sets output width & height
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-pink-600">
                  SIZE <span className="w-3 h-3 rounded-full bg-pink-500 inline-block ring-4 ring-pink-200" />
                </span>
              </div>

              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Width
                  </label>
                  <select
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full bg-slate-50 text-xs font-bold text-slate-900 px-3 py-2 rounded-lg border border-slate-300 outline-hidden cursor-pointer"
                  >
                    <option value={1024}>1024 px (HD)</option>
                    <option value={768}>768 px</option>
                    <option value={512}>512 px</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Height
                  </label>
                  <select
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-slate-50 text-xs font-bold text-slate-900 px-3 py-2 rounded-lg border border-slate-300 outline-hidden cursor-pointer"
                  >
                    <option value={1024}>1024 px (HD)</option>
                    <option value={768}>768 px</option>
                    <option value={512}>512 px</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: Step 2 (Prompt) + Step 3 (KSampler) */}
          <div className="flex flex-col gap-6 w-full xl:w-[345px] shrink-0">
            {/* NODE 2: Prompt & NLP Conditioning */}
            <div
              className={`rounded-2xl bg-white border-2 transition-all shadow-lg shadow-slate-200/80 ${
                activeStep === 2 ? 'border-amber-500 ring-4 ring-amber-500/15' : 'border-slate-200'
              }`}
            >
              <div className="px-4 py-3.5 bg-amber-50/80 rounded-t-2xl border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-2xs">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-slate-900">
                      2. Smart Prompt Input
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500">
                      Describe what you want to create
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-600">
                  PROMPT <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block ring-4 ring-emerald-200" />
                </span>
              </div>

              <div className="p-4 space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Connected to Text Reader
                  </span>
                  <span className="text-slate-500 font-semibold">Editable</span>
                </div>

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white p-3 text-[13px] font-medium text-slate-900 leading-relaxed outline-hidden resize-none transition-all"
                  placeholder="Type any image description here..."
                />

                {expandedPrompt && (
                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-700 text-xs mb-1">
                      <Sparkles size={13} />
                      <span>AI Auto-Enhanced Description:</span>
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-medium">
                      {expandedPrompt}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-700 font-bold">Prompt Guidance Strength</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={guidance}
                    onChange={(e) => setGuidance(Number(e.target.value))}
                    className="w-16 text-right bg-white px-2 py-1 rounded border border-slate-300 font-extrabold text-indigo-700 outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* NODE 3: KSampler & FlowMatch Scheduler */}
            <div
              className={`rounded-2xl bg-white border-2 transition-all shadow-lg shadow-slate-200/80 ${
                activeStep === 3
                  ? 'border-emerald-500 ring-4 ring-emerald-500/15'
                  : 'border-slate-200'
              }`}
            >
              <div className="px-4 py-3.5 bg-emerald-50/80 rounded-t-2xl border-b border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-2xs">
                    <Sliders size={15} />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-slate-900">
                      3. Image Sampler Engine
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500">
                      Combines Model + Prompt + Size
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-sky-600">
                  RENDER <span className="w-3 h-3 rounded-full bg-sky-500 inline-block ring-4 ring-sky-200" />
                </span>
              </div>

              <div className="p-4 space-y-3 text-xs">
                <div className="flex items-center gap-3 pb-1 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Model
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Prompt
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Size
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">
                      Sampling Method
                    </span>
                    <select
                      value={sampler}
                      onChange={(e) => setSampler(e.target.value)}
                      className="w-full bg-transparent font-extrabold text-slate-900 outline-hidden cursor-pointer text-xs"
                    >
                      <option value="Euler FlowMatch">Euler FlowMatch</option>
                      <option value="DPM++ 2M SDE">DPM++ 2M SDE</option>
                      <option value="Heun">Heun</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">
                      Scheduler
                    </span>
                    <select
                      value={scheduler}
                      onChange={(e) => setScheduler(e.target.value)}
                      className="w-full bg-transparent font-extrabold text-slate-900 outline-hidden cursor-pointer text-xs"
                    >
                      <option value="Simple">Simple</option>
                      <option value="SGM Uniform">SGM Uniform</option>
                      <option value="Beta">Beta</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-700 font-bold">Generation Steps (Speed)</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-16 text-right bg-white px-2 py-1 rounded border border-slate-300 font-extrabold text-emerald-700 outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 3: Step 4 (Final HD Image Output Node) */}
          <div className="flex flex-col gap-5 w-full xl:w-[400px] shrink-0">
            <div
              className={`rounded-2xl bg-white border-2 transition-all shadow-xl shadow-slate-200/90 ${
                activeStep === 4 ? 'border-sky-500 ring-4 ring-sky-500/15' : 'border-slate-200'
              }`}
            >
              <div className="px-4 py-3.5 bg-sky-50/80 rounded-t-2xl border-b border-sky-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-2xs">
                    <ImageIcon size={15} />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-slate-900">
                      4. Final HD Image Output
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500">
                      Live Preview & Cloudinary CDN
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-full">
                  {width}×{height} HD
                </span>
              </div>

              <div className="p-4 space-y-3.5">
                {/* Image Preview Frame */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center group shadow-inner">
                  <img
                    src={currentImage}
                    alt="FLUX Workflow Output"
                    className={`w-full h-full object-cover transition-all duration-500 ${
                      isRunning ? 'scale-95 opacity-40 blur-xs' : 'scale-100 opacity-100'
                    }`}
                  />

                  {isRunning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs p-4 text-center">
                      <RotateCcw size={30} className="text-indigo-600 animate-spin mb-2.5" />
                      <span className="text-sm font-extrabold text-slate-900">
                        Generating {width}×{height} HD Image...
                      </span>
                      <span className="text-xs font-bold text-indigo-600 mt-1">
                        Step {activeStep} of 4 • Hybrid Cloud Acceleration
                      </span>
                    </div>
                  )}

                  {/* Bottom Resolution & Speed Overlay */}
                  {!isRunning && (
                    <div className="absolute bottom-3 left-3 right-3 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center justify-between text-xs">
                      <span className="text-emerald-700 font-extrabold flex items-center gap-1.5">
                        <Zap size={14} className="text-emerald-600" /> {(lastLatencyMs / 1000).toFixed(2)}s ({width}×{height})
                      </span>
                      <span className="text-slate-700 font-bold">Cloudinary CDN ✓</span>
                    </div>
                  )}
                </div>

                {/* Output Node Action Buttons */}
                <div className="grid grid-cols-3 gap-2.5">
                  <a
                    href={currentImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span>Open HD</span>
                  </a>
                  <a
                    href={currentImage}
                    download="Nebula_FLUX_1024.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold transition-colors"
                  >
                    <Download size={14} />
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
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    >
                      <Send size={14} />
                      <span>To Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Floating Job Queue & Benchmark Panel */}
        <div className="relative z-10 w-full xl:w-[295px] shrink-0 flex flex-col gap-5">
          {/* Job Queue Panel */}
          <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-lg shadow-slate-200/80 p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <span className="text-[13px] font-extrabold text-slate-900 flex items-center gap-2">
                <Clock size={15} className="text-indigo-600" />
                Completed Renders
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                {jobQueue.length} Done
              </span>
            </div>

            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {jobQueue.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setCurrentImage(job.imageUrl)}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 cursor-pointer transition-all"
                >
                  <img
                    src={job.imageUrl}
                    alt={job.filename}
                    className="w-11 h-11 rounded-lg object-cover shrink-0 border border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {job.filename}
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {(job.latencyMs / 1000).toFixed(2)}s • {job.resolution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Benchmark Card vs 8GB Local MacBook */}
          <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-lg shadow-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-slate-900">
                ⚡ Speed Comparison
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                1,600× Faster
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
                <div className="flex justify-between text-xs text-slate-800 mb-1.5">
                  <span className="font-bold">Local 8GB RAM (MacBook)</span>
                  <span className="text-rose-600 font-extrabold">~85 mins</span>
                </div>
                <div className="w-full bg-rose-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-600 h-full w-full" />
                </div>
                <span className="text-[11px] font-medium text-slate-600 block mt-1.5">
                  512×512 px • Slow SSD memory swap
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                <div className="flex justify-between text-xs text-slate-900 mb-1.5">
                  <span className="font-extrabold">Your Nebula FLUX.1</span>
                  <span className="text-emerald-700 font-extrabold">
                    {(lastLatencyMs / 1000).toFixed(1)} secs
                  </span>
                </div>
                <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full w-[8%]" />
                </div>
                <span className="text-[11px] font-bold text-emerald-800 block mt-1.5">
                  1024×1024 HD (4× pixels) + Cloud CDN
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
