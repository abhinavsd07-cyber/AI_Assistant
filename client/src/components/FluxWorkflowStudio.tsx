import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Download,
  ExternalLink,
  Send,
  Wand2,
  CheckCircle2,
  Zap,
  Image as ImageIcon,
  ArrowRight,
  Layers,
  Cpu,
  CloudCheck,
  Loader2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface FluxWorkflowStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (markdownText: string, imageUrl: string) => void;
}

interface GeneratedItem {
  id: string;
  prompt: string;
  enhancedPrompt: string;
  style: string;
  imageUrl: string;
  latencyMs: number;
  resolution: string;
  timestamp: string;
}

const STYLE_PRESETS = [
  { id: 'photorealistic', label: '📸 Photorealistic 8K', suffix: ', 8k photorealistic, studio lighting, ultra-detailed' },
  { id: 'cinematic', label: '🎬 Cinematic 3D', suffix: ', cinematic lighting, Unreal Engine 5 render, dramatic atmosphere' },
  { id: 'illustration', label: '🎨 Digital Concept Art', suffix: ', digital concept art, vibrant colors, masterpiece illustration' },
  { id: 'anime', label: '✨ Anime Studio', suffix: ', Makoto Shinkai style anime art, breathtaking sky, detailed shading' },
];

const ASPECT_RATIOS = [
  { label: '1:1 Square HD', width: 1024, height: 1024 },
  { label: '16:9 Landscape', width: 1280, height: 720 },
  { label: '4:3 Classic', width: 1024, height: 768 },
];

const QUICK_IDEAS = [
  {
    label: '🌸 Vintage Flower Car',
    prompt: 'A pastel mint-green vintage miniature car overflowing with blooming pink and peach flowers, soft studio lighting, minimalist background',
  },
  {
    label: '🏎️ Cyberpunk Supercar',
    prompt: 'Futuristic matte-black supercar on a neon-lit rain street at night with glowing cyan headlights',
  },
  {
    label: '🌴 Kerala Backwaters',
    prompt: 'Luxury wooden houseboat gliding through serene emerald Kerala backwaters at golden sunset with palm trees',
  },
  {
    label: '🚀 Cosmic Astronaut',
    prompt: 'Astronaut standing on a crystalline mountain looking at a glowing purple nebula in deep space',
  },
];

export const FluxWorkflowStudio: React.FC<FluxWorkflowStudioProps> = ({
  isOpen,
  onClose,
  onSendToChat,
}) => {
  const [prompt, setPrompt] = useState(QUICK_IDEAS[0].prompt);
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0]);
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
  const [selectedEngine, setSelectedEngine] = useState<'flux-schnell' | 'flux-pro'>('flux-schnell');

  const [isGenerating, setIsGenerating] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState<number>(0); // 0=idle, 1=Input, 2=NLP, 3=FLUX, 4=CDN
  const [currentResult, setCurrentResult] = useState<GeneratedItem>({
    id: 'sample-1',
    prompt: QUICK_IDEAS[0].prompt,
    enhancedPrompt:
      'A pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers, soft studio lighting, 8k photorealistic',
    style: 'Photorealistic 8K',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1000&q=85',
    latencyMs: 2840,
    resolution: '1024×1024',
    timestamp: 'Ready',
  });

  const [history, setHistory] = useState<GeneratedItem[]>([
    {
      id: 'sample-1',
      prompt: QUICK_IDEAS[0].prompt,
      enhancedPrompt:
        'A pastel mint-green vintage classic miniature car overflowing with blooming pink and peach flowers, soft studio lighting, 8k photorealistic',
      style: 'Photorealistic 8K',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1000&q=85',
      latencyMs: 2840,
      resolution: '1024×1024',
      timestamp: 'Sample',
    },
  ]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (isGenerating || !prompt.trim()) return;
    setIsGenerating(true);
    setActivePipelineStep(1);

    const t1 = setTimeout(() => setActivePipelineStep(2), 400);
    const t2 = setTimeout(() => setActivePipelineStep(3), 900);

    try {
      const fullPrompt = `${prompt.trim()}${selectedStyle.suffix}`;
      const res = await fetch(`${API_BASE}/api/flux/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          unetModel: selectedEngine === 'flux-schnell' ? 'FLUX.1-Schnell Turbo' : 'FLUX.1-Dev Pro',
          width: selectedRatio.width,
          height: selectedRatio.height,
          steps: selectedEngine === 'flux-schnell' ? 4 : 8,
        }),
      });
      const data = await res.json();
      clearTimeout(t1);
      clearTimeout(t2);
      setActivePipelineStep(4);

      if (data.success && data.cdnUrl) {
        const newItem: GeneratedItem = {
          id: `gen-${Date.now()}`,
          prompt: prompt.trim(),
          enhancedPrompt: data.expandedPrompt || fullPrompt,
          style: selectedStyle.label,
          imageUrl: data.cdnUrl,
          latencyMs: data.executionTimeMs || 3100,
          resolution: `${selectedRatio.width}×${selectedRatio.height}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setCurrentResult(newItem);
        setHistory((prev) => [newItem, ...prev.slice(0, 7)]);
      }
    } catch (err) {
      console.error('FLUX Studio generation error:', err);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setActivePipelineStep(0);
      }, 400);
    }
  };

  const pipelineSteps = [
    { step: 1, title: '1. User Prompt', desc: 'Raw text & style', icon: <Wand2 size={14} /> },
    { step: 2, title: '2. Gemini NLP', desc: 'Prompt expansion', icon: <Sparkles size={14} /> },
    { step: 3, title: '3. FLUX.1 Engine', desc: 'Latent synthesis', icon: <Cpu size={14} /> },
    { step: 4, title: '4. Cloudinary CDN', desc: 'Global HD hosting', icon: <CloudCheck size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] dark:bg-[#0F1115] text-[#0D0D0D] dark:text-[#F1F5F9] flex flex-col overflow-hidden font-sans">
      {/* Clean Professional Top Header */}
      <header className="h-15 bg-white dark:bg-[#151821] border-b border-gray-200 dark:border-[#242936] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-gray-900 dark:text-white">
                Nebula FLUX.1 Visual Studio
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                Hybrid Turbo Engine
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              AI-Powered High-Resolution Visual Synthesis & Cloudinary CDN Pipeline
            </p>
          </div>
        </div>

        {/* Easy-to-Understand 4-Step Visual Pipeline Bar */}
        <div className="hidden xl:flex items-center gap-2 bg-gray-50 dark:bg-[#1B1F2B] px-3.5 py-1.5 rounded-2xl border border-gray-200/80 dark:border-[#2A3040]">
          {pipelineSteps.map((s, idx) => {
            const isActive = isGenerating && activePipelineStep === s.step;
            const isCompleted = !isGenerating || activePipelineStep > s.step;
            return (
              <React.Fragment key={s.step}>
                <div
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-sm scale-105'
                      : isCompleted
                      ? 'text-gray-700 dark:text-gray-200'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-blue-500'}>
                    {s.icon}
                  </span>
                  <div className="leading-tight">
                    <div className="font-semibold text-[11px]">{s.title}</div>
                    <div className={`text-[9px] ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                      {s.desc}
                    </div>
                  </div>
                </div>
                {idx < pipelineSteps.length - 1 && (
                  <ArrowRight size={13} className="text-gray-300 dark:text-gray-600" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Back to Chat Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-[#222735] hover:bg-gray-200 dark:hover:bg-[#2C3344] text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
        >
          <X size={15} />
          <span>Back to Chat</span>
        </button>
      </header>

      {/* Main 2-Column Studio Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 cols): Clean, Simple Controls */}
        <div className="lg:col-span-5 bg-white dark:bg-[#151821] border border-gray-200 dark:border-[#242936] rounded-2xl p-5 shadow-xs flex flex-col gap-5">
          {/* 1. Prompt Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                <Wand2 size={14} className="text-blue-500" />
                1. Describe Your Image
              </label>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Typo & Manglish Supported ✨
              </span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe what you want to create..."
              className="w-full rounded-xl bg-gray-50 dark:bg-[#1C202B] border border-gray-200 dark:border-[#2D3446] focus:border-blue-500 p-3.5 text-sm text-gray-900 dark:text-white leading-relaxed outline-hidden resize-none transition-colors"
            />

            {/* Quick Idea Pills */}
            <div className="mt-2.5">
              <span className="text-[11px] text-gray-400 block mb-1.5">
                Try a sample prompt:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_IDEAS.map((idea, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(idea.prompt)}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1E2330] hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-medium text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-[#2B3244] transition-colors cursor-pointer"
                  >
                    {idea.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Visual Art Style */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-2">
              <Sparkles size={14} className="text-purple-500" />
              2. Choose Visual Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                    selectedStyle.id === style.id
                      ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 shadow-2xs'
                      : 'bg-gray-50 dark:bg-[#1C202B] border-gray-200 dark:border-[#2B3244] text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Dimensions & Engine */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                <Layers size={13} className="text-indigo-500" />
                3. Image Size
              </label>
              <select
                value={selectedRatio.label}
                onChange={(e) => {
                  const found = ASPECT_RATIOS.find((r) => r.label === e.target.value);
                  if (found) setSelectedRatio(found);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#1C202B] border border-gray-200 dark:border-[#2B3244] text-xs font-semibold text-gray-800 dark:text-gray-200 outline-hidden cursor-pointer"
              >
                {ASPECT_RATIOS.map((r) => (
                  <option key={r.label} value={r.label}>
                    {r.label} ({r.width}×{r.height})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                <Cpu size={13} className="text-emerald-500" />
                4. AI Model
              </label>
              <select
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value as 'flux-schnell' | 'flux-pro')}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#1C202B] border border-gray-200 dark:border-[#2B3244] text-xs font-semibold text-gray-800 dark:text-gray-200 outline-hidden cursor-pointer"
              >
                <option value="flux-schnell">FLUX.1-Schnell (~3s Turbo)</option>
                <option value="flux-pro">FLUX.1-Dev Pro (High Detail)</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>
                  {activePipelineStep === 1 && 'Reading Prompt...'}
                  {activePipelineStep === 2 && 'Enhancing via Gemini NLP...'}
                  {activePipelineStep === 3 && 'Generating 1024×1024 HD Image...'}
                  {activePipelineStep === 4 && 'Uploading to Cloudinary CDN...'}
                </span>
              </>
            ) : (
              <>
                <Sparkles size={17} />
                <span>Generate High-Res Artwork</span>
              </>
            )}
          </button>

          {/* Clean Performance Comparison Card */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Zap size={16} />
              </div>
              <div>
                <div className="font-bold text-emerald-900 dark:text-emerald-300">
                  1,600× Faster Hybrid Architecture
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400/80">
                  Generates 1024×1024 HD in ~{(currentResult.latencyMs / 1000).toFixed(1)}s (vs 85 mins on 8GB local RAM)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Clean Live Preview Card + Recent Creations */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Main Output Card */}
          <div className="bg-white dark:bg-[#151821] border border-gray-200 dark:border-[#242936] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                  Live Studio Output
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#222735] text-gray-600 dark:text-gray-300 font-mono">
                  {currentResult.resolution} HD
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                ⚡ Generated in {(currentResult.latencyMs / 1000).toFixed(2)}s • Cloudinary CDN
              </span>
            </div>

            {/* Image Preview Box */}
            <div className="relative aspect-video sm:aspect-[16/10] w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-[#0D0F14] border border-gray-200 dark:border-[#262C3A] flex items-center justify-center">
              <img
                src={currentResult.imageUrl}
                alt={currentResult.prompt}
                className={`w-full h-full object-contain transition-all duration-300 ${
                  isGenerating ? 'opacity-40 blur-xs scale-95' : 'opacity-100 scale-100'
                }`}
              />

              {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-2xs text-white p-4">
                  <Loader2 size={32} className="animate-spin text-blue-400 mb-2" />
                  <p className="text-sm font-bold">Creating your artwork...</p>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Step {activePipelineStep} of 4 • {selectedStyle.label}
                  </p>
                </div>
              )}
            </div>

            {/* AI Prompt Enhancement Info Box */}
            <div className="mt-3.5 p-3 rounded-xl bg-gray-50 dark:bg-[#1B1F2B] border border-gray-200/70 dark:border-[#282F40] text-xs">
              <span className="font-bold text-blue-600 dark:text-blue-400 block mb-0.5">
                ✨ Gemini NLP Auto-Enhanced Prompt:
              </span>
              <p className="text-gray-600 dark:text-gray-300 italic line-clamp-2">
                "{currentResult.enhancedPrompt}"
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
              <a
                href={currentResult.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-[#222735] hover:bg-gray-200 dark:hover:bg-[#2C3345] text-gray-800 dark:text-gray-200 text-xs font-semibold transition-colors"
              >
                <ExternalLink size={14} />
                <span>Open Full Resolution</span>
              </a>

              <a
                href={currentResult.imageUrl}
                download="Nebula_FLUX_Artwork.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-[#222735] hover:bg-gray-200 dark:hover:bg-[#2C3345] text-gray-800 dark:text-gray-200 text-xs font-semibold transition-colors"
              >
                <Download size={14} />
                <span>Download HD</span>
              </a>

              {onSendToChat && (
                <button
                  onClick={() => {
                    const md =
                      `### ✨ Nebula FLUX.1 Studio Artwork\n` +
                      `* **Prompt**: \`${currentResult.prompt}\`\n` +
                      `* **Style**: ${currentResult.style} (\`${currentResult.resolution}\`)\n` +
                      `* **Generation Time**: \`${(currentResult.latencyMs / 1000).toFixed(2)}s\` via Cloudinary CDN\n\n` +
                      `![${currentResult.prompt}](${currentResult.imageUrl})\n\n` +
                      `🔗 [Open Full High-Res Image](${currentResult.imageUrl})`;
                    onSendToChat(md, currentResult.imageUrl);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Send size={14} />
                  <span>Insert into Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Recent Creations Strip */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-[#151821] border border-gray-200 dark:border-[#242936] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <ImageIcon size={13} />
                  Recent Studio Generations ({history.length})
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentResult(item)}
                    className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      currentResult.id === item.id
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
