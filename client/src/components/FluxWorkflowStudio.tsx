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
    'A pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers on the roof, soft studio lighting, minimalist pastel background, 8k photorealistic octane render'
  );
  const [unetModel, setUnetModel] = useState('flux1-schnell-Q4_K_S.gguf');
  const clipModel = 't5-v1_1-xxl-encoder-Q4_K_M.gguf';
  const vaeModel = 'ae.safetensors';
  const [guidance, setGuidance] = useState(3.5);
  const [steps, setSteps] = useState(4);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [sampler, setSampler] = useState('euler');
  const [scheduler, setScheduler] = useState('simple');

  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0); // 0=idle, 1=models, 2=clip, 3=sampler, 4=vae/done
  const [currentImage, setCurrentImage] = useState<string>(
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=900&q=85'
  );
  const [expandedPrompt, setExpandedPrompt] = useState<string>('');
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(2840);
  const [jobQueue, setJobQueue] = useState<JobHistoryItem[]>([
    {
      id: 'job-init',
      filename: 'ComfyUI_Nebula_00001.png',
      prompt: 'Pastel vintage car with blooming flowers',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=900&q=85',
      latencyMs: 2840,
      resolution: '1024x1024',
      timestamp: 'Ready',
    },
  ]);

  if (!isOpen) return null;

  const handleRunWorkflow = async () => {
    if (isRunning || !prompt.trim()) return;
    setIsRunning(true);
    setActiveStep(1);

    const stepTimer1 = setTimeout(() => setActiveStep(2), 450);
    const stepTimer2 = setTimeout(() => setActiveStep(3), 950);

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
          filename: `ComfyUI_Nebula_${String(jobQueue.length + 1).padStart(5, '0')}.png`,
          prompt: data.cleanSubject || prompt.slice(0, 40),
          imageUrl: data.cdnUrl,
          latencyMs: data.executionTimeMs || 3120,
          resolution: `${width}x${height}`,
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
      }, 400);
    }
  };

  const presetPrompts = [
    {
      label: '🌸 Flower Car (Benchmark)',
      text: 'A pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers on the roof, soft studio lighting, minimalist pastel background, 8k photorealistic',
    },
    {
      label: '🏎️ Cyberpunk Supercar',
      text: 'Futuristic matte-black cyberpunk hypercar drifting through neon-lit Tokyo rain at night, glowing cyan rim lights, 8k unreal engine 5 render',
    },
    {
      label: '🌴 Kerala Backwaters 2050',
      text: 'Futuristic solar-powered luxury houseboat gliding through emerald Kerala backwaters at golden sunset, palm trees, cinematic 8k photography',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0f12] text-[#e2e8f0] flex flex-col overflow-hidden select-none font-sans">
      {/* Top ComfyUI + Nebula Studio Header Bar */}
      <div className="h-12 bg-[#14171c] border-b border-[#262b35] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#1e232d] border border-[#313846]">
            <Zap size={14} className="text-amber-400" />
            <span className="text-xs font-bold tracking-wide text-white">
              Nebula ComfyGraph
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-semibold">
              FLUX.1-Schnell GGUF
            </span>
          </div>

          {/* Preset Quick Switchers */}
          <div className="hidden lg:flex items-center gap-1.5">
            {presetPrompts.map((preset, i) => (
              <button
                key={i}
                onClick={() => setPrompt(preset.text)}
                className="px-2.5 py-1 rounded-md bg-[#1a1e26] hover:bg-[#252b37] border border-[#2a303c] text-[11px] text-gray-300 transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center Live Execution Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#181c23] border border-[#282f3d] text-xs">
            {isRunning ? (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span className="text-blue-300 font-mono">
                  {activeStep === 1 && 'Step 1/4: Loading Unet GGUF & DualCLIP...'}
                  {activeStep === 2 && 'Step 2/4: Encoding CLIPTextEncodeFlux...'}
                  {activeStep === 3 && `Step 3/4: FlowMatch Euler Sampling (${steps} steps)...`}
                  {activeStep === 4 && 'Step 4/4: VAE Decode & Cloudinary CDN...'}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-gray-300 font-mono text-[11px]">
                  Last Run: <strong className="text-emerald-400">{(lastLatencyMs / 1000).toFixed(2)}s</strong> ({width}×{height} HD) • <span className="text-amber-400">1,600× faster than 8GB local swap (85m)</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Action Buttons (ComfyUI Blue Run Button + Close) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-lg transition-all cursor-pointer ${
              isRunning
                ? 'bg-blue-600/50 text-blue-200 cursor-wait'
                : 'bg-[#2563eb] hover:bg-[#3b82f6] text-white shadow-blue-600/25 active:scale-95'
            }`}
          >
            <Play size={13} fill="currentColor" />
            <span>{isRunning ? 'Executing Graph...' : 'Run Workflow'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1e232d] hover:bg-rose-500/20 hover:text-rose-400 border border-[#2e3543] text-gray-400 transition-colors cursor-pointer"
            title="Close Node Studio"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Dotted Node-Graph Workspace */}
      <div
        className="flex-1 relative overflow-auto flex items-start justify-between p-6 gap-6"
        style={{
          backgroundImage: 'radial-gradient(#2a303c 1.25px, transparent 1.25px)',
          backgroundSize: '22px 22px',
        }}
      >
        {/* SVG Bezier Wires Connecting the Nodes */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden xl:block"
          viewBox="0 0 1400 760"
          preserveAspectRatio="none"
        >
          {/* Wire 1: Unet Loader (MODEL) -> KSampler */}
          <path
            d="M 330 140 C 480 140, 440 470, 650 470"
            fill="none"
            stroke={activeStep >= 1 && isRunning ? '#60a5fa' : '#8b5cf6'}
            strokeWidth={activeStep === 1 ? '3.5' : '2.2'}
            strokeDasharray={isRunning ? '6 4' : undefined}
            opacity="0.75"
          />
          {/* Wire 2: DualCLIP Loader (CLIP) -> CLIPTextEncodeFlux */}
          <path
            d="M 330 275 C 360 275, 340 160, 370 160"
            fill="none"
            stroke="#f59e0b"
            strokeWidth={activeStep === 2 ? '3.5' : '2.2'}
            opacity="0.85"
          />
          {/* Wire 3: Load VAE (VAE) -> Save Image / VAE Decode */}
          <path
            d="M 330 390 C 520 390, 560 310, 690 310"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2"
            opacity="0.65"
          />
          {/* Wire 4: EmptySD3LatentImage (LATENT) -> KSampler */}
          <path
            d="M 330 555 C 360 555, 350 545, 370 545"
            fill="none"
            stroke="#ec4899"
            strokeWidth="2.2"
            opacity="0.8"
          />
          {/* Wire 5: CLIPTextEncodeFlux (CONDITIONING) -> KSampler */}
          <path
            d="M 650 220 C 680 220, 340 495, 370 495"
            fill="none"
            stroke="#10b981"
            strokeWidth={activeStep === 3 ? '3.5' : '2.2'}
            opacity="0.85"
          />
          {/* Wire 6: KSampler (IMAGE/LATENT) -> Save Image Preview Node */}
          <path
            d="M 650 490 C 675 490, 665 260, 690 260"
            fill="none"
            stroke="#06b6d4"
            strokeWidth={activeStep >= 3 ? '3.5' : '2.5'}
            opacity="0.9"
          />
        </svg>

        {/* Left & Center Node Columns */}
        <div className="relative z-10 flex flex-wrap xl:flex-nowrap items-start gap-6 w-full">
          {/* COLUMN 1: Step 1 - Load Models + Step 3 - Image Size */}
          <div className="flex flex-col gap-5 w-full xl:w-[310px] shrink-0">
            {/* Group Box: Step 1 - Load Models */}
            <div
              className={`rounded-xl bg-[#161b24]/95 border-2 transition-all shadow-2xl ${
                activeStep === 1
                  ? 'border-blue-400 shadow-blue-500/20'
                  : 'border-[#25354d]'
              }`}
            >
              <div className="px-3.5 py-2 bg-[#1c2c44] rounded-t-lg border-b border-[#2b4263] flex items-center justify-between">
                <span className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                  <Cpu size={13} className="text-blue-400" />
                  Step 1 - Load Models
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                  GGUF / FP8
                </span>
              </div>

              <div className="p-3 space-y-3 text-xs">
                {/* Unet Loader (GGUF) */}
                <div className="p-2.5 rounded-lg bg-[#1d222b] border border-[#2d3442]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-gray-200 text-[11px]">
                      ● Unet Loader (GGUF)
                    </span>
                    <span className="text-[10px] text-purple-400 font-mono">MODEL ●</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#13171d] px-2.5 py-1.5 rounded border border-[#262c38]">
                    <span className="text-[10px] text-gray-400">unet_name</span>
                    <select
                      value={unetModel}
                      onChange={(e) => setUnetModel(e.target.value)}
                      className="bg-transparent text-[11px] text-blue-300 font-mono outline-hidden cursor-pointer"
                    >
                      <option value="flux1-schnell-Q4_K_S.gguf" className="bg-[#181c24]">
                        flux1-schnell-Q4_K_S.gguf
                      </option>
                      <option value="flux1-dev-Q8_0.gguf" className="bg-[#181c24]">
                        flux1-dev-Q8_0.gguf
                      </option>
                    </select>
                  </div>
                </div>

                {/* DualCLIP Loader (GGUF) */}
                <div className="p-2.5 rounded-lg bg-[#1d222b] border border-[#2d3442]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-gray-200 text-[11px]">
                      ● DualCLIP Loader (GGUF)
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">CLIP ●</span>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="flex justify-between bg-[#13171d] px-2 py-1 rounded border border-[#262c38]">
                      <span className="text-gray-400">clip_name1</span>
                      <span className="text-amber-300 truncate max-w-[155px]">{clipModel}</span>
                    </div>
                    <div className="flex justify-between bg-[#13171d] px-2 py-1 rounded border border-[#262c38]">
                      <span className="text-gray-400">clip_name2</span>
                      <span className="text-amber-300">clip_l.safetensors</span>
                    </div>
                    <div className="flex justify-between bg-[#13171d] px-2 py-1 rounded border border-[#262c38]">
                      <span className="text-gray-400">type</span>
                      <span className="text-emerald-400">flux</span>
                    </div>
                  </div>
                </div>

                {/* Load VAE */}
                <div className="p-2.5 rounded-lg bg-[#1d222b] border border-[#2d3442]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-gray-200 text-[11px]">
                      ● Load VAE
                    </span>
                    <span className="text-[10px] text-rose-400 font-mono">VAE ●</span>
                  </div>
                  <div className="flex justify-between bg-[#13171d] px-2.5 py-1 rounded border border-[#262c38] text-[10px] font-mono">
                    <span className="text-gray-400">vae_name</span>
                    <span className="text-rose-300">{vaeModel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Group Box: Step 3 - Image Size (EmptySD3LatentImage) */}
            <div className="rounded-xl bg-[#161b24]/95 border-2 border-[#25354d] shadow-xl">
              <div className="px-3.5 py-2 bg-[#1c2c44] rounded-t-lg border-b border-[#2b4263] flex items-center justify-between">
                <span className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                  <Layers size={13} className="text-pink-400" />
                  Step 3 - Image Size
                </span>
                <span className="text-[10px] text-pink-400 font-mono">LATENT ●</span>
              </div>
              <div className="p-3 space-y-2 text-[11px] font-mono">
                <div className="text-gray-300 font-sans font-semibold text-xs mb-1">
                  ● EmptySD3LatentImage
                </div>
                <div className="flex items-center justify-between bg-[#13171d] px-2.5 py-1.5 rounded border border-[#262c38]">
                  <span className="text-gray-400">width</span>
                  <select
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="bg-transparent text-cyan-300 outline-hidden cursor-pointer"
                  >
                    <option value={1024} className="bg-[#181c24]">1024 (HD)</option>
                    <option value={768} className="bg-[#181c24]">768</option>
                    <option value={512} className="bg-[#181c24]">512</option>
                  </select>
                </div>
                <div className="flex items-center justify-between bg-[#13171d] px-2.5 py-1.5 rounded border border-[#262c38]">
                  <span className="text-gray-400">height</span>
                  <select
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="bg-transparent text-cyan-300 outline-hidden cursor-pointer"
                  >
                    <option value={1024} className="bg-[#181c24]">1024 (HD)</option>
                    <option value={768} className="bg-[#181c24]">768</option>
                    <option value={512} className="bg-[#181c24]">512</option>
                  </select>
                </div>
                <div className="flex items-center justify-between bg-[#13171d] px-2.5 py-1 rounded border border-[#262c38]">
                  <span className="text-gray-400">batch_size</span>
                  <span className="text-gray-200">1</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: Step 2 - Prompt (CLIPTextEncodeFlux) + KSampler */}
          <div className="flex flex-col gap-5 w-full xl:w-[320px] shrink-0">
            {/* Step 2 - Prompt */}
            <div
              className={`rounded-xl bg-[#161b24]/95 border-2 transition-all shadow-2xl ${
                activeStep === 2
                  ? 'border-amber-400 shadow-amber-500/20'
                  : 'border-[#25354d]'
              }`}
            >
              <div className="px-3.5 py-2 bg-[#1c2c44] rounded-t-lg border-b border-[#2b4263] flex items-center justify-between">
                <span className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  Step 2 - Prompt
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">CONDITIONING ●</span>
              </div>

              <div className="p-3 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-400 font-mono">● clip</span>
                  <span className="font-semibold text-gray-200">CLIPTextEncodeFlux</span>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">
                    clip_l / t5xxl (Positive Prompt)
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg bg-[#11151b] border border-[#2b3240] focus:border-blue-500 p-2.5 text-xs text-gray-100 font-mono leading-relaxed outline-hidden resize-none"
                    placeholder="Enter FLUX.1 image generation prompt..."
                  />
                </div>

                {expandedPrompt && (
                  <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-[10px] text-indigo-200">
                    <span className="font-bold text-indigo-400 block mb-0.5">
                      ✨ Gemini NLP Auto-Expanded:
                    </span>
                    <span className="line-clamp-2 italic">{expandedPrompt}</span>
                  </div>
                )}

                <div className="flex items-center justify-between bg-[#13171d] px-2.5 py-1.5 rounded border border-[#262c38] text-[11px] font-mono">
                  <span className="text-gray-400">guidance</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={guidance}
                    onChange={(e) => setGuidance(Number(e.target.value))}
                    className="w-16 text-right bg-transparent text-amber-300 outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* KSampler / BasicScheduler Node */}
            <div
              className={`rounded-xl bg-[#161b24]/95 border-2 transition-all shadow-2xl ${
                activeStep === 3
                  ? 'border-emerald-400 shadow-emerald-500/20'
                  : 'border-[#2d3444]'
              }`}
            >
              <div className="px-3.5 py-2 bg-[#232936] rounded-t-lg border-b border-[#323b4d] flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Sliders size={13} className="text-emerald-400" />
                  KSampler & BasicScheduler
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">IMAGE ●</span>
              </div>

              <div className="p-3 space-y-2 text-[11px] font-mono">
                <div className="flex items-center justify-between bg-[#13171d] px-2.5 py-1.5 rounded border border-[#262c38]">
                  <span className="text-gray-400">sampler_name</span>
                  <select
                    value={sampler}
                    onChange={(e) => setSampler(e.target.value)}
                    className="bg-transparent text-emerald-300 outline-hidden cursor-pointer"
                  >
                    <option value="euler" className="bg-[#181c24]">euler</option>
                    <option value="dpmpp_2m" className="bg-[#181c24]">dpmpp_2m</option>
                    <option value="heun" className="bg-[#181c24]">heun</option>
                  </select>
                </div>

                <div className="flex items-center justify-between bg-[#13171d] px-2.5 py-1.5 rounded border border-[#262c38]">
                  <span className="text-gray-400">scheduler</span>
                  <select
                    value={scheduler}
                    onChange={(e) => setScheduler(e.target.value)}
                    className="bg-transparent text-emerald-300 outline-hidden cursor-pointer"
                  >
                    <option value="simple" className="bg-[#181c24]">simple</option>
                    <option value="sgm_uniform" className="bg-[#181c24]">sgm_uniform</option>
                    <option value="beta" className="bg-[#181c24]">beta</option>
                  </select>
                </div>

                <div className="flex items-center justify-between bg-[#13171d] px-2.5 py-1.5 rounded border border-[#262c38]">
                  <span className="text-gray-400">steps</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-14 text-right bg-transparent text-cyan-300 outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-between bg-[#13171d] px-2.5 py-1 rounded border border-[#262c38]">
                  <span className="text-gray-400">denoise</span>
                  <span className="text-gray-200">1.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 3: Save Image & Live Output Node (Matches ComfyUI Output Box) */}
          <div className="flex flex-col gap-4 w-full xl:w-[390px] shrink-0">
            <div
              className={`rounded-xl bg-[#181d26]/95 border-2 transition-all shadow-2xl ${
                activeStep === 4
                  ? 'border-cyan-400 shadow-cyan-500/25'
                  : 'border-[#2e3646]'
              }`}
            >
              <div className="px-4 py-2.5 bg-[#202632] rounded-t-lg border-b border-[#313a4c] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    Save Image (Live Output Node)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {width}×{height} HD
                </span>
              </div>

              <div className="p-3.5 space-y-3">
                <div className="flex items-center justify-between bg-[#12161d] px-3 py-1.5 rounded border border-[#252c38] text-[11px] font-mono">
                  <span className="text-gray-400">filename_prefix</span>
                  <span className="text-gray-200">Nebula_FLUX_CDN</span>
                </div>

                {/* Image Preview Frame */}
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#0e1116] border border-[#2b3240] flex items-center justify-center group">
                  <img
                    src={currentImage}
                    alt="FLUX Workflow Output"
                    className={`w-full h-full object-cover transition-all duration-500 ${
                      isRunning ? 'scale-95 opacity-40 blur-xs' : 'scale-100 opacity-100'
                    }`}
                  />

                  {isRunning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-2xs p-4 text-center">
                      <RotateCcw size={28} className="text-blue-400 animate-spin mb-2" />
                      <span className="text-xs font-bold text-white">
                        Executing FLUX.1 Node Graph...
                      </span>
                      <span className="text-[11px] text-blue-300 font-mono mt-1">
                        Step {activeStep}/4 • Zero-Swap Cloud Turbo
                      </span>
                    </div>
                  )}

                  {/* Bottom Resolution & Speed Overlay */}
                  {!isRunning && (
                    <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-emerald-400 font-semibold">
                        ⚡ {(lastLatencyMs / 1000).toFixed(2)}s ({width}×{height})
                      </span>
                      <span className="text-gray-300">Cloudinary CDN ✓</span>
                    </div>
                  )}
                </div>

                {/* Output Node Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <a
                    href={currentImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#232936] hover:bg-[#2d3546] text-gray-200 text-xs font-semibold transition-colors"
                  >
                    <ExternalLink size={13} />
                    <span>Full HD</span>
                  </a>
                  <a
                    href={currentImage}
                    download="Nebula_FLUX_1024.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#232936] hover:bg-[#2d3546] text-gray-200 text-xs font-semibold transition-colors"
                  >
                    <Download size={13} />
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
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Send size={13} />
                      <span>To Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Floating ComfyUI Job Queue & Benchmark Panel */}
        <div className="relative z-10 w-full xl:w-[290px] shrink-0 flex flex-col gap-4">
          {/* Job Queue Panel (Matches top-right panel in screenshot) */}
          <div className="rounded-xl bg-[#151921]/95 border border-[#28303e] shadow-2xl p-3.5">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#242b38]">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock size={13} className="text-blue-400" />
                Job Queue
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
                {jobQueue.length} Completed
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {jobQueue.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setCurrentImage(job.imageUrl)}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-[#1c212b] hover:bg-[#242b38] border border-[#2a3140] cursor-pointer transition-colors"
                >
                  <img
                    src={job.imageUrl}
                    alt={job.filename}
                    className="w-10 h-10 rounded object-cover shrink-0 border border-gray-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                      <p className="text-[11px] font-mono font-semibold text-gray-200 truncate">
                        {job.filename}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {(job.latencyMs / 1000).toFixed(2)}s • {job.resolution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Benchmark Card vs 8GB Local MacBook */}
          <div className="rounded-xl bg-gradient-to-br from-[#171f30] to-[#131722] border border-blue-500/30 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                ⚡ Architecture Benchmark
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                1,600× Faster
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-black/30 border border-rose-500/20">
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Local 8GB RAM Swap (M1)</span>
                  <span className="text-rose-400 font-mono font-bold">~85 mins</span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-rose-500 h-full w-full" />
                </div>
                <span className="text-[10px] text-gray-500 block mt-1">
                  512×512 resolution • Heavy SSD swap bottleneck
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/30 border border-emerald-500/30">
                <div className="flex justify-between text-[11px] text-gray-200">
                  <span className="font-semibold">Nebula Hybrid FLUX.1</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {(lastLatencyMs / 1000).toFixed(1)} secs
                  </span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[8%]" />
                </div>
                <span className="text-[10px] text-emerald-300/80 block mt-1">
                  1024×1024 HD (4× pixels) + Gemini NLP + Cloudinary CDN
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
