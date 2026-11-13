import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { NebulaLogo } from './NebulaLogo';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

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
    'Futuristic cybernetic astronaut standing before a glowing violet and deep-blue cosmic nebula, holographic neural interface, cinematic lighting, 8k photorealistic octane render'
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
    'https://res.cloudinary.com/drxsezyyl/image/upload/v1794420498/nebula_ai/generated/j4mnifyb1pcwi3nshita.jpg'
  );
  const [expandedPrompt, setExpandedPrompt] = useState<string>(
    'A futuristic cybernetic astronaut standing before a glowing violet and deep-blue cosmic nebula, holographic neural interface, dramatic volumetric lighting, ultra-detailed 8k photorealistic render.'
  );
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(2840);
  const [jobQueue, setJobQueue] = useState<JobHistoryItem[]>([
    {
      id: 'job-init',
      filename: 'Nebula_FLUX_00001.png',
      prompt: 'Cosmic Nebula Cybernetic Astronaut',
      imageUrl:
        'https://res.cloudinary.com/drxsezyyl/image/upload/v1794420498/nebula_ai/generated/j4mnifyb1pcwi3nshita.jpg',
      latencyMs: 2840,
      resolution: '1024×1024',
      timestamp: 'Ready',
    },
  ]);

  // Refs for dynamic responsive SVG Node-Graph Wire Connections
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const modelOutRef = useRef<HTMLSpanElement>(null);
  const clipOutRef = useRef<HTMLSpanElement>(null);
  const vaeOutRef = useRef<HTMLSpanElement>(null);
  const sizeOutRef = useRef<HTMLSpanElement>(null);
  const clipInRef = useRef<HTMLSpanElement>(null);
  const promptOutRef = useRef<HTMLSpanElement>(null);
  const samplerModelInRef = useRef<HTMLSpanElement>(null);
  const samplerPromptInRef = useRef<HTMLSpanElement>(null);
  const samplerSizeInRef = useRef<HTMLSpanElement>(null);
  const samplerOutRef = useRef<HTMLSpanElement>(null);
  const outputInRef = useRef<HTMLSpanElement>(null);

  const [wires, setWires] = useState<
    Array<{
      id: string;
      d: string;
      x2: number;
      y2: number;
      targetStep: number;
      dir: 'right' | 'down';
    }>
  >([]);

  // Clean, minimal step-to-step flow connectors (Step 1 → 2 → 3 → 4), drawn only on the 4-column desktop layout
  const computeWires = useCallback(() => {
    const container = gridContainerRef.current;
    if (!container) return;
    if (window.innerWidth < 1280) {
      setWires([]);
      return;
    }
    const cRect = container.getBoundingClientRect();
    if (cRect.width === 0) return;

    const getCard = (el: HTMLElement | null) =>
      (el?.closest('.flux-node-card') as HTMLElement | null) || null;

    // Anchor on the card edge, vertically centred on the card's header bar
    const edgeAnchor = (el: HTMLElement | null, side: 'left' | 'right') => {
      const card = getCard(el);
      if (!card) return null;
      const r = card.getBoundingClientRect();
      const header = card.firstElementChild as HTMLElement | null;
      const hr = header ? header.getBoundingClientRect() : r;
      return {
        x: (side === 'right' ? r.right : r.left) - cRect.left,
        y: hr.top - cRect.top + hr.height / 2,
      };
    };

    const verticalAnchor = (el: HTMLElement | null, side: 'top' | 'bottom') => {
      const card = getCard(el);
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return {
        x: r.left - cRect.left + r.width / 2,
        y: (side === 'bottom' ? r.bottom : r.top) - cRect.top,
      };
    };

    // Orthogonal elbow connector with rounded corners — always ends with a straight horizontal segment
    const ARROW_LEN = 6;
    const hCurve = (p1: { x: number; y: number } | null, p2: { x: number; y: number } | null) => {
      if (!p1 || !p2) return '';
      const endX = p2.x - ARROW_LEN + 1;
      const midX = (p1.x + endX) / 2;
      const dy = p2.y - p1.y;
      if (Math.abs(dy) < 2) return `M ${p1.x} ${p1.y} H ${endX}`;
      const dir = dy > 0 ? 1 : -1;
      const r = Math.max(0, Math.min(8, Math.abs(dy) / 2, (endX - p1.x) / 2 - 2));
      return [
        `M ${p1.x} ${p1.y}`,
        `H ${midX - r}`,
        `Q ${midX} ${p1.y} ${midX} ${p1.y + dir * r}`,
        `V ${p2.y - dir * r}`,
        `Q ${midX} ${p2.y} ${midX + r} ${p2.y}`,
        `H ${endX}`,
      ].join(' ');
    };

    const vLine = (p1: { x: number; y: number } | null, p2: { x: number; y: number } | null) => {
      if (!p1 || !p2) return '';
      return `M ${p1.x} ${p1.y} V ${p2.y - ARROW_LEN + 1}`;
    };

    const models = edgeAnchor(modelOutRef.current, 'right');
    const promptIn = edgeAnchor(promptOutRef.current, 'left');
    const promptBottom = verticalAnchor(promptOutRef.current, 'bottom');
    const samplerTop = verticalAnchor(samplerOutRef.current, 'top');
    const resolution = edgeAnchor(sizeOutRef.current, 'right');
    const samplerIn = edgeAnchor(samplerOutRef.current, 'left');
    const samplerOut = edgeAnchor(samplerOutRef.current, 'right');
    const outputIn = edgeAnchor(outputInRef.current, 'left');

    const raw = [
      { id: 'models-prompt', p1: models, p2: promptIn, d: hCurve(models, promptIn), targetStep: 2, dir: 'right' as const },
      { id: 'prompt-sampler', p1: promptBottom, p2: samplerTop, d: vLine(promptBottom, samplerTop), targetStep: 3, dir: 'down' as const },
      { id: 'size-sampler', p1: resolution, p2: samplerIn, d: hCurve(resolution, samplerIn), targetStep: 3, dir: 'right' as const },
      { id: 'sampler-output', p1: samplerOut, p2: outputIn, d: hCurve(samplerOut, outputIn), targetStep: 4, dir: 'right' as const },
    ];

    setWires(
      raw
        .filter((w) => w.d !== '' && w.p2)
        .map((w) => ({ id: w.id, d: w.d, x2: w.p2!.x, y2: w.p2!.y, targetStep: w.targetStep, dir: w.dir }))
    );
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(computeWires);
    const timer = setTimeout(computeWires, 120);
    window.addEventListener('resize', computeWires);

    let observer: ResizeObserver | null = null;
    if (gridContainerRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => computeWires());
      observer.observe(gridContainerRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('resize', computeWires);
      observer?.disconnect();
    };
  }, [isOpen, expandedPrompt, computeWires]);

  if (!isOpen) return null;

  const handleRunWorkflow = async () => {
    if (isRunning || !prompt.trim()) return;
    setIsRunning(true);
    setActiveStep(1);

    const stepTimer1 = setTimeout(() => setActiveStep(2), 500);
    const stepTimer2 = setTimeout(() => setActiveStep(3), 1100);

    try {
      const token = localStorage.getItem('nebula_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/flux/workflow`, {
        method: 'POST',
        headers,
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
      label: '🌌 Cosmic Cyborg',
      text: 'Futuristic cybernetic astronaut standing before a glowing violet and deep-blue cosmic nebula, holographic neural interface, cinematic lighting, 8k photorealistic octane render',
    },
    {
      label: '🏎️ Cyberpunk Hypercar',
      text: 'Futuristic matte-black cyberpunk hypercar drifting through neon-lit rain at night, glowing cyan rim lights, reflections on wet asphalt, 8k unreal engine 5 render',
    },
    {
      label: '🤖 Quantum AI Core',
      text: 'Bioluminescent quantum supercomputer core floating inside a sleek glass architectural chamber, golden neural light streams, volumetric fog, 8k concept art',
    },
    {
      label: '🏰 Sky Citadel',
      text: 'Majestic futuristic solarpunk crystal citadel floating above golden clouds at sunrise, waterfalls cascading into the sky, cinematic 8k masterpiece',
    },
  ];

  const styleEnhancers = [
    { label: '+ 8K Photorealistic', tag: ', ultra-detailed 8k photorealistic, ray-traced lighting' },
    { label: '+ Unreal Engine 5', tag: ', Unreal Engine 5 render, volumetric fog, global illumination' },
    { label: '+ Cyberpunk Neon', tag: ', cyberpunk neon magenta and cyan glow, rainy reflections' },
    { label: '+ Cinematic Lens', tag: ', shot on 85mm f/1.4 lens, shallow depth of field, cinematic color grading' },
    { label: '+ Isometric 3D', tag: ', cute isometric 3D diorama, Blender Cycles render, soft clay textures' },
    { label: '+ Anime Studio', tag: ', Makoto Shinkai anime movie style, vibrant sky, intricate details' },
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
      {/* Top Clean Light Studio Header Bar (100% Responsive, Zero Wrapping) */}
      <div className="min-h-[56px] bg-white border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
              <NebulaLogo className="w-full h-full text-[#0F172A]" title="Nebula AI Logo" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm sm:text-[15px] font-extrabold tracking-tight text-slate-900 truncate">
                Nebula FLUX.1 Studio
              </span>
              <span className="hidden sm:inline-block text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-semibold whitespace-nowrap shrink-0">
                Visual Node Pipeline
              </span>
            </div>
          </div>
        </div>

        {/* Center Pipeline Flow Status Badge (No-Wrap) */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium whitespace-nowrap shrink-0">
          {isRunning ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping shrink-0" />
              <span className="text-indigo-700 font-semibold">
                {activeStep === 1 && 'Step 1/4: Loading FLUX.1 & DualCLIP Models...'}
                {activeStep === 2 && 'Step 2/4: Enhancing Prompt with Gemini NLP...'}
                {activeStep === 3 && `Step 3/4: Generating ${width}×${height} HD Image...`}
                {activeStep === 4 && 'Step 4/4: Saving to Cloudinary Global CDN...'}
              </span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-700">
                Last Render:{' '}
                <strong className="text-emerald-600 font-bold">
                  {(lastLatencyMs / 1000).toFixed(2)}s
                </strong>{' '}
                <span className="text-slate-300">|</span>{' '}
                <span className="text-indigo-600 font-bold">
                  Cloud GPU Pipeline • Cloudinary CDN
                </span>
              </span>
            </>
          )}
        </div>

        {/* Right Action Buttons (No-Wrap) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              isRunning
                ? 'bg-indigo-100 text-indigo-700 cursor-wait border border-indigo-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95'
            }`}
          >
            <Play size={13} fill="currentColor" className="shrink-0" />
            <span>{isRunning ? 'Running Pipeline...' : 'Run Workflow'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-600 transition-colors cursor-pointer shrink-0"
            title="Close Studio (Back to Chat)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Sub-Header: Presets + 4-Step Pipeline Progress Bar (Horizontally Scrollable on Smaller Screens) */}
      <div className="bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 z-20 shrink-0">
        {/* Preset Quick Switchers */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 hidden sm:inline">
            Presets:
          </span>
          {presetPrompts.map((preset, i) => (
            <button
              key={i}
              onClick={() => setPrompt(preset.text)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-[11px] font-semibold text-slate-700 whitespace-nowrap transition-all cursor-pointer shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* 4-Step Pipeline Badges */}
        <div className="hidden xl:flex items-center gap-2 shrink-0">
          {pipelineStages.map((s, idx) => {
            const isStageActive = activeStep === s.step;
            return (
              <React.Fragment key={s.step}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] whitespace-nowrap transition-all ${
                    isStageActive
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs font-bold'
                      : 'bg-slate-50 border-slate-200/90 text-slate-700 font-semibold'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isStageActive ? 'bg-indigo-600 animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  <span>{s.title}</span>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <ArrowRight size={13} className="text-slate-400 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Responsive 12-Column Node-Graph Workspace (Mobile 1-Col -> Tablet 2-Col -> Desktop 4-Col) */}
      <div
        onScroll={computeWires}
        className="flex-1 relative overflow-y-auto overflow-x-hidden p-3 sm:p-5"
        style={{
          backgroundColor: '#F8FAFC',
          backgroundImage: 'radial-gradient(#CBD5E1 1.35px, transparent 1.35px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          ref={gridContainerRef}
          className="relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 xl:gap-7 max-w-[1640px] mx-auto w-full items-start"
        >
          {/* Minimal Step-Flow Connectors (Neutral Slate; Active Step Highlighted) */}
          <svg className="hidden xl:block absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
            {wires.map((w) => {
              const isActive = isRunning && activeStep === w.targetStep;
              const color = isActive ? '#6366F1' : '#94A3B8';
              // Fixed-orientation arrowhead whose tip sits exactly on the target card edge
              const arrow =
                w.dir === 'down'
                  ? `${w.x2},${w.y2} ${w.x2 - 4.5},${w.y2 - 6} ${w.x2 + 4.5},${w.y2 - 6}`
                  : `${w.x2},${w.y2} ${w.x2 - 6},${w.y2 - 4.5} ${w.x2 - 6},${w.y2 + 4.5}`;
              return (
                <g key={w.id} className="transition-all duration-300">
                  <path
                    d={w.d}
                    fill="none"
                    stroke={isActive ? '#6366F1' : '#CBD5E1'}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    strokeDasharray={isActive ? '5 4' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polygon points={arrow} fill={color} strokeLinejoin="round" />
                </g>
              );
            })}
          </svg>

          {/* COLUMN 1: Step 1 (Load AI Models) + Image Size */}
          <div className="relative z-10 md:col-span-1 xl:col-span-3 flex flex-col gap-5 w-full min-w-0">
            {/* NODE 1: Load AI Models */}
            <div
              className={`flux-node-card rounded-2xl bg-white border-2 transition-all shadow-lg shadow-slate-200/80 ${
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
                      MODEL{' '}
                      <span
                        ref={modelOutRef}
                        className="w-3 h-3 rounded-full bg-indigo-600 inline-block ring-4 ring-indigo-200"
                      />
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
                      CLIP{' '}
                      <span
                        ref={clipOutRef}
                        className="w-3 h-3 rounded-full bg-amber-500 inline-block ring-4 ring-amber-200"
                      />
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
                      VAE{' '}
                      <span
                        ref={vaeOutRef}
                        className="w-3 h-3 rounded-full bg-rose-500 inline-block ring-4 ring-rose-200"
                      />
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    {vaeModel}
                  </div>
                </div>
              </div>
            </div>

            {/* Image Resolution Node */}
            <div className="flux-node-card rounded-2xl bg-white border-2 border-slate-200 shadow-lg shadow-slate-200/80">
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
                  SIZE{' '}
                  <span
                    ref={sizeOutRef}
                    className="w-3 h-3 rounded-full bg-pink-500 inline-block ring-4 ring-pink-200"
                  />
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
          <div className="relative z-10 md:col-span-1 xl:col-span-3 flex flex-col gap-5 w-full min-w-0">
            {/* NODE 2: Prompt & NLP Conditioning */}
            <div
              className={`flux-node-card rounded-2xl bg-white border-2 transition-all shadow-lg shadow-slate-200/80 ${
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
                  PROMPT{' '}
                  <span
                    ref={promptOutRef}
                    className="w-3 h-3 rounded-full bg-emerald-500 inline-block ring-4 ring-emerald-200"
                  />
                </span>
              </div>

              <div className="p-4 space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                    <span ref={clipInRef} className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />{' '}
                    Connected to Text Reader
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
              className={`flux-node-card rounded-2xl bg-white border-2 transition-all shadow-lg shadow-slate-200/80 ${
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
                  RENDER{' '}
                  <span
                    ref={samplerOutRef}
                    className="w-3 h-3 rounded-full bg-sky-500 inline-block ring-4 ring-sky-200"
                  />
                </span>
              </div>

              <div className="p-4 space-y-3 text-xs">
                <div className="flex items-center gap-3 pb-1 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span ref={samplerModelInRef} className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200" />{' '}
                    Model
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span ref={samplerPromptInRef} className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />{' '}
                    Prompt
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span ref={samplerSizeInRef} className="w-2.5 h-2.5 rounded-full bg-pink-500 ring-2 ring-pink-200" />{' '}
                    Size
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
          <div className="relative z-10 md:col-span-1 xl:col-span-3 flex flex-col gap-5 w-full min-w-0">
            <div
              className={`flux-node-card rounded-2xl bg-white border-2 transition-all shadow-xl shadow-slate-200/90 ${
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

              <div className="p-4 space-y-3">
                {/* Input Connection Port Row for Output Node */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-bold text-sky-700">
                    <span
                      ref={outputInRef}
                      className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-sky-200"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" />
                    <span>Connected: Sampler + VAE Decoder</span>
                  </span>
                </div>
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
                          `* **Execution Time**: \`${(lastLatencyMs / 1000).toFixed(2)}s\` *(Nebula Cloud GPU + Cloudinary CDN)*\n\n` +
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
          {/* COLUMN 4: Completed Renders & Style Enhancers */}
          <div className="md:col-span-1 xl:col-span-3 flex flex-col gap-4 w-full min-w-0">
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

          {/* Creative Style Enhancers & Studio Ideas Card */}
          <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-lg shadow-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={15} className="text-indigo-600" />
                Style & Idea Enhancers
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold">
                1-Click Boost
              </span>
            </div>

            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              Click any modifier below to instantly enrich your active prompt with studio lighting and render styles:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {styleEnhancers.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (!prompt.includes(item.tag)) {
                      setPrompt((prev) => `${prev.trim()}${item.tag}`);
                    }
                  }}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 text-[11px] font-bold text-slate-700 text-left transition-all cursor-pointer truncate"
                  title={`Add "${item.tag}"`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <div className="flex justify-between text-xs text-slate-900 mb-1">
                <span className="font-extrabold">Nebula Cloud FLUX.1</span>
                <span className="text-emerald-700 font-extrabold">
                  {(lastLatencyMs / 1000).toFixed(1)}s Render
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 block">
                {width}×{height} HD • Auto-Saved to Library CDN
              </span>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
