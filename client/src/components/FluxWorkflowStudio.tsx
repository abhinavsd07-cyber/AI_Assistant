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
import { getStoredToken } from '../context/useAuth';

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
    'Minimalist glass and warm wood architectural pavilion overlooking a serene alpine mountain lake at sunrise'
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
  const [currentImage, setCurrentImage] = useState<string>('/flux-showcase.jpg');
  const [expandedPrompt, setExpandedPrompt] = useState<string>(
    'An editorial architectural photograph of a minimalist glass and warm travertine stone pavilion cantilevered above a tranquil misty mountain lake at golden sunrise, soft interior glow reflecting across still water.'
  );
  const [detectedIssues, setDetectedIssues] = useState<string[]>([]);
  const [reasoningSummary, setReasoningSummary] = useState<string>('');
  const [generationSource, setGenerationSource] = useState<string>('studio-preset');
  const [qualityCheck, setQualityCheck] = useState<{
    checked: boolean;
    matchesPrompt: boolean;
    score: number | null;
    issues: string;
    retried: boolean;
  } | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(2840);
  const [jobQueue, setJobQueue] = useState<JobHistoryItem[]>([
    {
      id: 'job-init',
      filename: 'Nebula_FLUX_00001.png',
      prompt: 'Alpine Glass Architectural Pavilion',
      imageUrl: '/flux-showcase.jpg',
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
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      targetStep: number;
      dir: 'right' | 'down';
    }>
  >([]);

  // Clean, high-contrast orthogonal flow connectors (Step 1 → 2 → 3 → 4) on desktop 4-column layout
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

    // Anchor on the card outer edge, vertically centred on the card's header bar
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

    // Orthogonal elbow connector with rounded corners — finishes seamlessly into a sleek open chevron
    const TIP_OFFSET = 2;
    const hCurve = (p1: { x: number; y: number } | null, p2: { x: number; y: number } | null) => {
      if (!p1 || !p2) return '';
      const tipX = p2.x - TIP_OFFSET;
      const midX = (p1.x + tipX) / 2;
      const dy = p2.y - p1.y;
      if (Math.abs(dy) < 2) return `M ${p1.x} ${p1.y} H ${tipX}`;
      const dir = dy > 0 ? 1 : -1;
      const r = Math.max(0, Math.min(8, Math.abs(dy) / 2, (tipX - p1.x) / 2 - 2));
      return [
        `M ${p1.x} ${p1.y}`,
        `H ${midX - r}`,
        `Q ${midX} ${p1.y} ${midX} ${p1.y + dir * r}`,
        `V ${p2.y - dir * r}`,
        `Q ${midX} ${p2.y} ${midX + r} ${p2.y}`,
        `H ${tipX}`,
      ].join(' ');
    };

    const vLine = (p1: { x: number; y: number } | null, p2: { x: number; y: number } | null) => {
      if (!p1 || !p2) return '';
      return `M ${p1.x} ${p1.y} V ${p2.y - TIP_OFFSET}`;
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
        .filter((w) => w.d !== '' && w.p1 && w.p2)
        .map((w) => ({
          id: w.id,
          d: w.d,
          x1: w.p1!.x,
          y1: w.p1!.y,
          x2: w.dir === 'right' ? w.p2!.x - TIP_OFFSET : w.p2!.x,
          y2: w.dir === 'down' ? w.p2!.y - TIP_OFFSET : w.p2!.y,
          targetStep: w.targetStep,
          dir: w.dir,
        }))
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
  }, [isOpen, expandedPrompt, prompt, reasoningSummary, computeWires]);

  if (!isOpen) return null;

  const handleRunWorkflow = async () => {
    if (isRunning || !prompt.trim()) return;
    setIsRunning(true);
    setWorkflowError(null);
    setActiveStep(1);

    const stepTimer1 = setTimeout(() => setActiveStep(2), 500);
    const stepTimer2 = setTimeout(() => setActiveStep(3), 1100);

    try {
      const token = getStoredToken();
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

      if (res.ok && data.success && data.cdnUrl) {
        setCurrentImage(data.cdnUrl);
        setExpandedPrompt(data.expandedPrompt || prompt);
        setDetectedIssues(Array.isArray(data.detectedIssues) ? data.detectedIssues : []);
        setReasoningSummary(typeof data.reasoningSummary === 'string' ? data.reasoningSummary : '');
        setGenerationSource(data.generationSource || 'pollinations-flux');
        setQualityCheck(data.qualityCheck || null);
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
      } else {
        setWorkflowError(data.error || `Workflow execution failed (${res.status}).`);
      }
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setWorkflowError(err?.message || 'Unable to execute workflow.');
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
      label: 'Glass Pavilion',
      text: 'Minimalist glass and warm wood architectural pavilion overlooking a serene alpine mountain lake at sunrise',
    },
    {
      label: 'Product Studio',
      text: 'Minimalist luxury wireless headphones in brushed aluminum and walnut resting on cream travertine stone, soft studio lighting',
    },
    {
      label: 'Botanical Loft',
      text: 'Sunlit Scandinavian glass courtyard living room with indoor olive trees and oak furniture, warm morning sunlight',
    },
    {
      label: 'Ceramic & Brass',
      text: 'Handcrafted matte white ceramic vase and minimalist brass lamp on a warm oak console, soft window light',
    },
  ];

  const styleEnhancers = [
    { label: '+ Editorial Photo', tag: ', architectural magazine editorial photography' },
    { label: '+ Studio Softbox', tag: ', soft diffused studio key light' },
    { label: '+ 85mm f/1.4 Lens', tag: ', 85mm prime lens shallow depth of field' },
    { label: '+ Golden Hour Light', tag: ', warm golden morning sunlight shadows' },
    { label: '+ Minimal Framing', tag: ', clean minimalist symmetrical composition' },
    { label: '+ Warm Film Look', tag: ', warm natural analog film tones' },
  ];

  const pipelineStages = [
    { step: 1, title: 'Step 1: Load AI Models', sub: 'FLUX.1 + DualCLIP' },
    { step: 2, title: 'Step 2: Smart Prompt NLP', sub: 'Text Understanding' },
    { step: 3, title: 'Step 3: Image Sampler', sub: `${steps}-Step HD Render` },
    { step: 4, title: 'Step 4: Final Output', sub: `${width}×${height} Cloud CDN` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#FAF8F5] dark:bg-[#1F1E1B] text-[#1F1E1B] dark:text-[#F0ECE1] flex flex-col overflow-hidden select-none transition-colors duration-200"
      style={{
        fontFamily:
          "'Söhne', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Top Clean Light Studio Header Bar (100% Responsive, Zero Wrapping) */}
      <div className="min-h-[56px] bg-[#FAF8F5]/95 dark:bg-[#1F1E1B]/95 backdrop-blur-md border-b border-[#EAE4D9] dark:border-[#38352F] px-3 sm:px-6 py-2 flex items-center justify-between gap-2 shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#25221E] border border-[#EAE4D9] dark:border-[#38352F] shadow-2xs min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
              <img
                src="/nebula-logo.png"
                alt="Nebula AI Logo"
                className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(31,30,27,0.12)]"
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm sm:text-[15px] font-extrabold tracking-tight text-[#1F1E1B] dark:text-[#F0ECE1] truncate">
                Nebula FLUX.1 Studio
              </span>
              <span className="hidden sm:inline-block text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full bg-[#2D2A26] dark:bg-[#EAE4D9] text-[#FAF8F5] dark:text-[#1F1E1B] font-semibold whitespace-nowrap shrink-0">
                Visual Node Pipeline
              </span>
            </div>
          </div>
        </div>

        {/* Center Pipeline Flow Status Badge (No-Wrap) */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3EFE6] dark:bg-[#2A2723] border border-[#E5DFD3] dark:border-[#38352F] text-xs font-medium whitespace-nowrap shrink-0">
          {isRunning ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97736] animate-ping shrink-0" />
              <span className="text-[#1F1E1B] dark:text-[#F0ECE1] font-semibold">
                {activeStep === 1 && 'Step 1/4: Loading FLUX.1 & DualCLIP Models...'}
                {activeStep === 2 && 'Step 2/4: Enhancing Prompt with Gemini NLP...'}
                {activeStep === 3 && `Step 3/4: Generating ${width}×${height} HD Image...`}
                {activeStep === 4 && 'Step 4/4: Saving to Cloudinary Global CDN...'}
              </span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[#554E46] dark:text-[#C5BFB5]">
                Last Render:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {(lastLatencyMs / 1000).toFixed(2)}s
                </strong>{' '}
                <span className="text-[#D4CCC0] dark:text-[#4A453D]">|</span>{' '}
                <span className="text-[#1F1E1B] dark:text-[#F0ECE1] font-bold">
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
                ? 'bg-[#FAF0E6] dark:bg-[#34241B] text-[#D97736] cursor-wait border border-[#EAC4A8] dark:border-[#5C3822]'
                : 'bg-[#D97736] hover:bg-[#C26224] text-white shadow-md shadow-orange-950/15 active:scale-95'
            }`}
          >
            <Play size={13} fill="currentColor" className="shrink-0" />
            <span>{isRunning ? 'Running Pipeline...' : 'Run Workflow'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#F3EFE6] hover:bg-[#EAE4D8] dark:bg-[#2A2723] dark:hover:bg-[#34302A] border border-[#E5DFD3] dark:border-[#38352F] text-[#736B63] dark:text-[#C5BFB5] hover:text-[#1F1E1B] dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Close Studio (Back to Chat)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Sub-Header: Presets + 4-Step Pipeline Progress Bar (Horizontally Scrollable on Smaller Screens) */}
      <div className="bg-[#FAF8F5]/90 dark:bg-[#1F1E1B]/90 backdrop-blur-xs border-b border-[#EAE4D9] dark:border-[#38352F] px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 z-20 shrink-0">
        {/* Preset Quick Switchers */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
          <span className="text-[11px] font-bold text-[#8C827A] dark:text-[#9E958C] uppercase tracking-wider mr-1 shrink-0 hidden sm:inline">
            Presets:
          </span>
          {presetPrompts.map((preset, i) => (
            <button
              key={i}
              onClick={() => setPrompt(preset.text)}
              className="px-2.5 py-1 rounded-lg bg-[#F3EFE6] hover:bg-[#EAE4D8] dark:bg-[#2A2723] dark:hover:bg-[#34302A] hover:text-[#1F1E1B] dark:hover:text-white border border-[#E5DFD3] dark:border-[#38352F] text-[11px] font-semibold text-[#554E46] dark:text-[#C5BFB5] whitespace-nowrap transition-all cursor-pointer shrink-0"
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
                      ? 'bg-white dark:bg-[#2D2A25] border-[#D97736] text-[#D97736] dark:text-[#E88848] shadow-xs font-bold'
                      : 'bg-[#F3EFE6] dark:bg-[#262420] border-[#E5DFD3] dark:border-[#38352F] text-[#736B63] dark:text-[#A39B91] font-semibold'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isStageActive ? 'bg-[#D97736] animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  <span>{s.title}</span>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <ArrowRight size={13} className="text-[#B5ACA0] dark:text-[#555047] shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Responsive 12-Column Node-Graph Workspace (Mobile 1-Col -> Tablet 2-Col -> Desktop 4-Col) */}
      <div
        onScroll={computeWires}
        className="flex-1 relative overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-[#F5F1E9] dark:bg-[#181715]"
      >
        <div
          ref={gridContainerRef}
          className="relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 xl:gap-x-9 xl:gap-y-6 max-w-[1680px] mx-auto w-full items-start"
        >
          {/* Refined Step-Flow Connectors (Sleek Open Chevrons, Non-Clunky Stroke) */}
          <svg className="hidden xl:block absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
            {wires.map((w) => {
              const isActive = isRunning && activeStep === w.targetStep;
              const strokeColor = isActive ? '#D97736' : '#9C9388';
              const chevronPath =
                w.dir === 'down'
                  ? `M ${w.x2 - 4} ${w.y2 - 5} L ${w.x2} ${w.y2} L ${w.x2 + 4} ${w.y2 - 5}`
                  : `M ${w.x2 - 5} ${w.y2 - 4} L ${w.x2} ${w.y2} L ${w.x2 - 5} ${w.y2 + 4}`;
              return (
                <g key={w.id} className="transition-all duration-300">
                  <path
                    d={w.d}
                    fill="none"
                    stroke="#F5F1E9"
                    className="dark:stroke-[#181715]"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={w.d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isActive ? 2.2 : 1.5}
                    strokeDasharray={isActive ? '5 4' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={w.x1}
                    cy={w.y1}
                    r={2.75}
                    fill={strokeColor}
                    stroke="#FAF8F5"
                    className="dark:stroke-[#1F1E1B]"
                    strokeWidth={1.25}
                  />
                  <path
                    d={chevronPath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </svg>

          {/* COLUMN 1: Step 1 (Load AI Models) + Image Size */}
          <div className="relative z-10 md:col-span-1 xl:col-span-3 flex flex-col gap-6 w-full min-w-0">
            {/* NODE 1: Load AI Models */}
            <div
              className={`flux-node-card rounded-2xl bg-white dark:bg-[#25221E] border-2 transition-all shadow-[0_4px_20px_-4px_rgba(31,30,27,0.06)] ${
                activeStep === 1
                  ? 'border-[#D97736] ring-4 ring-[#D97736]/15'
                  : 'border-[#EAE4D9] dark:border-[#38352F]'
              }`}
            >
              <div className="px-4 py-3.5 bg-[#F8F5EE] dark:bg-[#2A2723] rounded-t-2xl border-b border-[#EAE4D9] dark:border-[#38352F] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2D2A26] dark:bg-[#3E3A33] flex items-center justify-center text-[#FAF8F5] shadow-2xs">
                    <Cpu size={15} />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1]">
                      1. Load AI Models
                    </h4>
                    <p className="text-[11px] font-medium text-[#736B63] dark:text-[#A39B91]">
                      Selects the AI brain & text reader
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#EFEAE0] dark:bg-[#34302A] text-[#554E46] dark:text-[#C5BFB5]">
                  GGUF / FP8
                </span>
              </div>

              <div className="p-4 space-y-3.5">
                {/* UNet Backbone */}
                <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1F1D1A] border border-[#EAE4D9] dark:border-[#38352F]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#1F1E1B] dark:text-[#F0ECE1]">
                      Image Generator Model (UNet)
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#736B63] dark:text-[#A39B91]">
                      MODEL{' '}
                      <span
                        ref={modelOutRef}
                        className="w-3 h-3 rounded-full bg-[#554E46] dark:bg-[#A39B91] inline-block ring-4 ring-[#EAE4D9] dark:ring-[#38352F]"
                      />
                    </span>
                  </div>
                  <select
                    value={unetModel}
                    onChange={(e) => setUnetModel(e.target.value)}
                    className="w-full bg-white dark:bg-[#2A2723] text-xs font-semibold text-[#1F1E1B] dark:text-[#F0ECE1] px-3 py-2 rounded-lg border border-[#E5DFD3] dark:border-[#38352F] focus:border-[#D97736] outline-hidden cursor-pointer"
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
                <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1F1D1A] border border-[#EAE4D9] dark:border-[#38352F]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#1F1E1B] dark:text-[#F0ECE1]">
                      Text Reader (DualCLIP)
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#D97736]">
                      CLIP{' '}
                      <span
                        ref={clipOutRef}
                        className="w-3 h-3 rounded-full bg-[#D97736] inline-block ring-4 ring-[#FBE5D5] dark:ring-[#472E1E]"
                      />
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#1F1E1B] dark:text-[#F0ECE1] bg-white dark:bg-[#2A2723] px-3 py-2 rounded-lg border border-[#E5DFD3] dark:border-[#38352F] flex items-center justify-between">
                    <span className="truncate">{clipModel}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                      Ready
                    </span>
                  </div>
                </div>

                {/* VAE Decoder */}
                <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1F1D1A] border border-[#EAE4D9] dark:border-[#38352F]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#1F1E1B] dark:text-[#F0ECE1]">
                      HD Image Decoder (VAE)
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#C05621] dark:text-[#E2804E]">
                      VAE{' '}
                      <span
                        ref={vaeOutRef}
                        className="w-3 h-3 rounded-full bg-[#C05621] inline-block ring-4 ring-[#FADAC7] dark:ring-[#442B1F]"
                      />
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#554E46] dark:text-[#C5BFB5] bg-white dark:bg-[#2A2723] px-3 py-2 rounded-lg border border-[#E5DFD3] dark:border-[#38352F]">
                    {vaeModel}
                  </div>
                </div>
              </div>
            </div>

            {/* Image Resolution Node */}
            <div className="flux-node-card rounded-2xl bg-white dark:bg-[#25221E] border-2 border-[#EAE4D9] dark:border-[#38352F] shadow-[0_4px_20px_-4px_rgba(31,30,27,0.06)]">
              <div className="px-4 py-3 bg-[#FAF3F5] dark:bg-[#2D2126] rounded-t-2xl border-b border-[#F0DCE4] dark:border-[#422B35] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#C05621] dark:bg-[#A8481A] flex items-center justify-center text-white">
                    <Layers size={14} />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1]">
                      Image Resolution
                    </h4>
                    <p className="text-[11px] font-medium text-[#736B63] dark:text-[#A39B91]">
                      Sets output width & height
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#C05621] dark:text-[#E2804E]">
                  SIZE{' '}
                  <span
                    ref={sizeOutRef}
                    className="w-3 h-3 rounded-full bg-[#C05621] inline-block ring-4 ring-[#FADAC7] dark:ring-[#442B1F]"
                  />
                </span>
              </div>

              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#554E46] dark:text-[#C5BFB5] mb-1">
                    Width
                  </label>
                  <select
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full bg-[#FAF8F5] dark:bg-[#1F1D1A] text-xs font-bold text-[#1F1E1B] dark:text-[#F0ECE1] px-3 py-2 rounded-lg border border-[#E5DFD3] dark:border-[#38352F] focus:border-[#D97736] outline-hidden cursor-pointer"
                  >
                    <option value={1024}>1024 px (HD)</option>
                    <option value={768}>768 px</option>
                    <option value={512}>512 px</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#554E46] dark:text-[#C5BFB5] mb-1">
                    Height
                  </label>
                  <select
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-[#FAF8F5] dark:bg-[#1F1D1A] text-xs font-bold text-[#1F1E1B] dark:text-[#F0ECE1] px-3 py-2 rounded-lg border border-[#E5DFD3] dark:border-[#38352F] focus:border-[#D97736] outline-hidden cursor-pointer"
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
          <div className="relative z-10 md:col-span-1 xl:col-span-3 flex flex-col gap-6 w-full min-w-0">
            {/* NODE 2: Prompt & NLP Conditioning */}
            <div
              className={`flux-node-card rounded-2xl bg-white dark:bg-[#25221E] border-2 transition-all shadow-[0_4px_20px_-4px_rgba(31,30,27,0.06)] ${
                activeStep === 2
                  ? 'border-[#D97736] ring-4 ring-[#D97736]/15'
                  : 'border-[#EAE4D9] dark:border-[#38352F]'
              }`}
            >
              <div className="px-4 py-3.5 bg-[#FDF6EE] dark:bg-[#2E2822] rounded-t-2xl border-b border-[#F2DECE] dark:border-[#42352B] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#D97736] flex items-center justify-center text-white shadow-2xs">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1]">
                      2. Smart Prompt Input
                    </h4>
                    <p className="text-[11px] font-medium text-[#736B63] dark:text-[#A39B91]">
                      Describe what you want to create
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#D97736]">
                  PROMPT{' '}
                  <span
                    ref={promptOutRef}
                    className="w-3 h-3 rounded-full bg-[#D97736] inline-block ring-4 ring-[#FBE5D5] dark:ring-[#472E1E]"
                  />
                </span>
              </div>

              <div className="p-4 space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#D97736] font-bold">
                    <span ref={clipInRef} className="w-2.5 h-2.5 rounded-full bg-[#D97736] ring-2 ring-[#FBE5D5] dark:ring-[#472E1E]" />{' '}
                    Connected to Text Reader
                  </span>
                  <span className="text-[#8C827A] dark:text-[#9E958C] font-semibold">Editable</span>
                </div>

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-[#FAF8F5] dark:bg-[#1F1D1A] border border-[#E5DFD3] dark:border-[#38352F] focus:border-[#D97736] focus:bg-white dark:focus:bg-[#25221E] p-3 text-[13px] font-medium text-[#1F1E1B] dark:text-[#F0ECE1] leading-relaxed outline-hidden resize-none transition-all placeholder-[#8C827A]"
                  placeholder="Type any image description here..."
                />

                {expandedPrompt && (
                  <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1F1D1A] border border-[#EAE4D9] dark:border-[#38352F] text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-[#1F1E1B] dark:text-[#F0ECE1] text-xs">
                      <Sparkles size={13} className="text-[#D97736]" />
                      <span>AI Logical Prompt Conditioning:</span>
                    </div>
                    <p className="text-xs text-[#554E46] dark:text-[#C5BFB5] line-clamp-2 leading-relaxed font-medium">
                      {expandedPrompt}
                    </p>
                    {(reasoningSummary || detectedIssues.length > 0) && (
                      <div className="pt-1.5 border-t border-[#EAE4D9] dark:border-[#38352F] space-y-1">
                        {reasoningSummary && (
                          <p className="text-[11px] text-[#736B63] dark:text-[#A39B91] leading-snug">
                            <span className="font-bold text-[#1F1E1B] dark:text-[#F0ECE1]">Intent Logic:</span> {reasoningSummary}
                          </p>
                        )}
                        {detectedIssues.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {detectedIssues.map((issue, idx) => (
                              <span
                                key={idx}
                                className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold"
                              >
                                ✓ {issue}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between bg-[#FAF8F5] dark:bg-[#1F1D1A] px-3.5 py-2.5 rounded-xl border border-[#EAE4D9] dark:border-[#38352F] text-xs">
                  <span className="text-[#554E46] dark:text-[#C5BFB5] font-bold">Prompt Guidance Strength</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={guidance}
                    onChange={(e) => setGuidance(Number(e.target.value))}
                    className="w-16 text-right bg-white dark:bg-[#25221E] px-2 py-1 rounded border border-[#E5DFD3] dark:border-[#38352F] font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1] outline-hidden focus:border-[#D97736]"
                  />
                </div>
              </div>
            </div>

            {/* NODE 3: KSampler & FlowMatch Scheduler */}
            <div
              className={`flux-node-card rounded-2xl bg-white dark:bg-[#25221E] border-2 transition-all shadow-[0_4px_20px_-4px_rgba(31,30,27,0.06)] ${
                activeStep === 3
                  ? 'border-emerald-600 ring-4 ring-emerald-500/15'
                  : 'border-[#EAE4D9] dark:border-[#38352F]'
              }`}
            >
              <div className="px-4 py-3.5 bg-[#F4F8F4] dark:bg-[#222B24] rounded-t-2xl border-b border-[#D5E6D7] dark:border-[#2D3F31] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-2xs">
                    <Sliders size={15} />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1]">
                      3. Image Sampler Engine
                    </h4>
                    <p className="text-[11px] font-medium text-[#736B63] dark:text-[#A39B91]">
                      Combines Model + Prompt + Size
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-sky-600 dark:text-sky-400">
                  RENDER{' '}
                  <span
                    ref={samplerOutRef}
                    className="w-3 h-3 rounded-full bg-sky-500 inline-block ring-4 ring-sky-200 dark:ring-sky-900"
                  />
                </span>
              </div>

              <div className="p-4 space-y-3 text-xs">
                <div className="flex items-center gap-3 pb-1 text-xs font-bold text-[#736B63] dark:text-[#A39B91]">
                  <span className="flex items-center gap-1.5">
                    <span ref={samplerModelInRef} className="w-2.5 h-2.5 rounded-full bg-[#554E46] dark:bg-[#A39B91] ring-2 ring-[#EAE4D9] dark:ring-[#38352F]" />{' '}
                    Model
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span ref={samplerPromptInRef} className="w-2.5 h-2.5 rounded-full bg-[#D97736] ring-2 ring-[#FBE5D5] dark:ring-[#472E1E]" />{' '}
                    Prompt
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span ref={samplerSizeInRef} className="w-2.5 h-2.5 rounded-full bg-[#C05621] ring-2 ring-[#FADAC7] dark:ring-[#442B1F]" />{' '}
                    Size
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#FAF8F5] dark:bg-[#1F1D1A] p-2.5 rounded-xl border border-[#EAE4D9] dark:border-[#38352F]">
                    <span className="text-[11px] font-bold text-[#8C827A] dark:text-[#9E958C] block mb-1">
                      Sampling Method
                    </span>
                    <select
                      value={sampler}
                      onChange={(e) => setSampler(e.target.value)}
                      className="w-full bg-transparent font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1] outline-hidden cursor-pointer text-xs"
                    >
                      <option value="Euler FlowMatch" className="dark:bg-[#25221E]">Euler FlowMatch</option>
                      <option value="DPM++ 2M SDE" className="dark:bg-[#25221E]">DPM++ 2M SDE</option>
                      <option value="Heun" className="dark:bg-[#25221E]">Heun</option>
                    </select>
                  </div>

                  <div className="bg-[#FAF8F5] dark:bg-[#1F1D1A] p-2.5 rounded-xl border border-[#EAE4D9] dark:border-[#38352F]">
                    <span className="text-[11px] font-bold text-[#8C827A] dark:text-[#9E958C] block mb-1">
                      Scheduler
                    </span>
                    <select
                      value={scheduler}
                      onChange={(e) => setScheduler(e.target.value)}
                      className="w-full bg-transparent font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1] outline-hidden cursor-pointer text-xs"
                    >
                      <option value="Simple" className="dark:bg-[#25221E]">Simple</option>
                      <option value="SGM Uniform" className="dark:bg-[#25221E]">SGM Uniform</option>
                      <option value="Beta" className="dark:bg-[#25221E]">Beta</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#FAF8F5] dark:bg-[#1F1D1A] px-3.5 py-2.5 rounded-xl border border-[#EAE4D9] dark:border-[#38352F]">
                  <span className="text-[#554E46] dark:text-[#C5BFB5] font-bold">Generation Steps (Speed)</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-16 text-right bg-white dark:bg-[#25221E] px-2 py-1 rounded border border-[#E5DFD3] dark:border-[#38352F] font-extrabold text-emerald-700 dark:text-emerald-400 outline-hidden focus:border-[#D97736]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 3: Step 4 (Final HD Image Output Node) */}
          <div className="relative z-10 md:col-span-1 xl:col-span-3 flex flex-col gap-6 w-full min-w-0">
            <div
              className={`flux-node-card rounded-2xl bg-white dark:bg-[#25221E] border-2 transition-all shadow-[0_4px_20px_-4px_rgba(31,30,27,0.06)] ${
                activeStep === 4
                  ? 'border-sky-500 ring-4 ring-sky-500/15'
                  : 'border-[#EAE4D9] dark:border-[#38352F]'
              }`}
            >
              <div className="px-4 py-3.5 bg-[#F3F7FA] dark:bg-[#202830] rounded-t-2xl border-b border-[#D6E3EE] dark:border-[#2B3B4A] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-2xs">
                    <ImageIcon size={15} />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1]">
                      4. Final HD Image Output
                    </h4>
                    <p className="text-[11px] font-medium text-[#736B63] dark:text-[#A39B91]">
                      Live Preview & Cloudinary CDN
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-2.5 py-1 rounded-full">
                  {width}×{height} HD
                </span>
              </div>

              <div className="p-4 space-y-3">
                {/* Input Connection Port Row for Output Node */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-bold text-sky-700 dark:text-sky-300">
                    <span
                      ref={outputInRef}
                      className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-sky-200 dark:ring-sky-900"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C05621] ring-2 ring-[#FADAC7] dark:ring-[#442B1F]" />
                    <span>Connected: Sampler + VAE Decoder</span>
                  </span>
                </div>
                {/* Image Preview Frame */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#FAF8F5] dark:bg-[#181715] border border-[#EAE4D9] dark:border-[#38352F] flex items-center justify-center group shadow-inner">
                  <img
                    src={currentImage}
                    alt="FLUX Workflow Output"
                    className={`w-full h-full object-cover transition-all duration-500 ${
                      isRunning ? 'scale-95 opacity-40 blur-xs' : 'scale-100 opacity-100'
                    }`}
                  />

                  {isRunning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs p-4 text-center">
                      <RotateCcw size={30} className="text-[#D9383A] animate-spin mb-2.5" />
                      <span className="text-sm font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1]">
                        Generating {width}×{height} HD Image...
                      </span>
                      <span className="text-xs font-bold text-[#736B63] dark:text-[#A39B91] mt-1">
                        Step {activeStep} of 4 • Hybrid Cloud Acceleration
                      </span>
                    </div>
                  )}

                  {/* Bottom Resolution & Verification Overlay */}
                  {!isRunning && (
                    <div className="absolute bottom-3 left-3 right-3 px-3.5 py-2 rounded-xl bg-white/95 dark:bg-[#25221E]/95 backdrop-blur-md border border-[#EAE4D9] dark:border-[#38352F] shadow-md flex items-center justify-between gap-2 text-xs">
                      <span className="text-emerald-700 font-extrabold flex items-center gap-1.5 whitespace-nowrap">
                        <Zap size={14} className="text-emerald-600" /> {(lastLatencyMs / 1000).toFixed(2)}s ({width}×{height})
                      </span>
                      <span className="text-[#554E46] dark:text-[#C5BFB5] font-bold truncate">
                        {generationSource === 'curated-fallback-photo'
                          ? 'Photo Fallback • CDN ✓'
                          : generationSource === 'offline-svg-card'
                            ? 'Safe Poster Fallback'
                            : qualityCheck?.checked && typeof qualityCheck.score === 'number'
                              ? `${qualityCheck.matchesPrompt ? 'Vision' : 'Partial Match'} ${qualityCheck.score}/10${qualityCheck.retried ? ' (Refined)' : ''} • CDN ✓`
                              : 'Cloudinary CDN ✓'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Output Node Action Buttons */}
                <div className="grid grid-cols-3 gap-2.5">
                  <a
                    href={currentImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#F3EFE6] hover:bg-[#EAE4D8] dark:bg-[#2A2723] dark:hover:bg-[#34302A] border border-[#E5DFD3] dark:border-[#38352F] text-[#1F1E1B] dark:text-[#F0ECE1] text-xs font-bold transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span>Open HD</span>
                  </a>
                  <a
                    href={currentImage}
                    download="Nebula_FLUX_1024.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#F3EFE6] hover:bg-[#EAE4D8] dark:bg-[#2A2723] dark:hover:bg-[#34302A] border border-[#E5DFD3] dark:border-[#38352F] text-[#1F1E1B] dark:text-[#F0ECE1] text-xs font-bold transition-colors"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </a>
                  {onSendToChat && (
                    <button
                      onClick={() => {
                        const md =
                          `Here is your **Nebula FLUX.1 Studio** visual (${width}×${height}):\n\n` +
                          `![${prompt.slice(0, 48)}](${currentImage})`;
                        onSendToChat(md, currentImage);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#1F1E1B] hover:bg-black dark:bg-[#FAF8F5] dark:hover:bg-white text-white dark:text-[#1F1E1B] text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    >
                      <Send size={14} />
                      <span>To Chat</span>
                    </button>
                  )}
                </div>

                {workflowError && (
                  <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-medium text-rose-700 leading-snug">
                    <span className="font-bold">Workflow Error:</span> {workflowError}
                  </div>
                )}

                {!isRunning && qualityCheck?.checked && !qualityCheck.matchesPrompt && qualityCheck.issues && (
                  <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800 leading-snug">
                    <span className="font-bold">AI Vision Note:</span> {qualityCheck.issues}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* COLUMN 4: Completed Renders & Style Enhancers */}
          <div className="relative z-10 md:col-span-1 xl:col-span-3 flex flex-col gap-6 w-full min-w-0">
            {/* Job Queue Panel */}
          <div className="rounded-2xl bg-white dark:bg-[#25221E] border-2 border-[#EAE4D9] dark:border-[#38352F] shadow-[0_4px_20px_-4px_rgba(31,30,27,0.06)] p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EAE4D9] dark:border-[#38352F]">
              <span className="text-[13px] font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1] flex items-center gap-2">
                <Clock size={15} className="text-[#736B63] dark:text-[#A39B91]" />
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
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] dark:bg-[#1F1D1A] dark:hover:bg-[#2A2723] border border-[#EAE4D9] dark:border-[#38352F] cursor-pointer transition-all"
                >
                  <img
                    src={job.imageUrl}
                    alt={job.filename}
                    className="w-11 h-11 rounded-lg object-cover shrink-0 border border-[#E5DFD3] dark:border-[#38352F]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <p className="text-xs font-bold text-[#1F1E1B] dark:text-[#F0ECE1] truncate">
                        {job.filename}
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold text-[#736B63] dark:text-[#A39B91] mt-0.5">
                      {(job.latencyMs / 1000).toFixed(2)}s • {job.resolution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Creative Style Enhancers & Studio Ideas Card */}
          <div className="rounded-2xl bg-white dark:bg-[#25221E] border-2 border-[#EAE4D9] dark:border-[#38352F] p-4 shadow-[0_4px_20px_-4px_rgba(31,30,27,0.06)] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-[#1F1E1B] dark:text-[#F0ECE1] flex items-center gap-1.5">
                <Sparkles size={15} className="text-[#D97736]" />
                Style & Idea Enhancers
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F3EFE6] dark:bg-[#2A2723] text-[#554E46] dark:text-[#C5BFB5] border border-[#E5DFD3] dark:border-[#38352F] font-extrabold">
                1-Click Boost
              </span>
            </div>

            <p className="text-[11px] font-medium text-[#736B63] dark:text-[#A39B91] leading-relaxed">
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
                  className="px-2.5 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] dark:bg-[#1F1D1A] dark:hover:bg-[#2A2723] hover:text-[#1F1E1B] dark:hover:text-[#F0ECE1] border border-[#EAE4D9] dark:border-[#38352F] text-[11px] font-bold text-[#554E46] dark:text-[#C5BFB5] text-left transition-all cursor-pointer truncate"
                  title={`Add "${item.tag}"`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <div className="flex justify-between text-xs text-[#1F1E1B] dark:text-[#F0ECE1] mb-1">
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
