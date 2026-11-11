import React, { useMemo } from 'react';
import {
  X,
  Image as ImageIcon,
  Compass,
  Code2,
  Sparkles,
  Download,
  ExternalLink,
  Terminal,
  Brain,
  Globe,
  Briefcase,
  Languages,
  ArrowUpRight,
} from 'lucide-react';
import type { ChatSession, PersonaType } from '../types';

interface HubModalProps {
  isOpen: boolean;
  activeView: 'library' | 'explore';
  onClose: () => void;
  sessions: ChatSession[];
  onLaunchPrompt: (prompt: string, persona?: PersonaType) => void;
  onOpenCanvas: (code: string, language: string, title?: string) => void;
}

interface ExtractedImage {
  url: string;
  alt: string;
  sessionTitle: string;
  timestamp: string;
}

interface ExtractedCode {
  language: string;
  code: string;
  sessionTitle: string;
}

export const HubModal: React.FC<HubModalProps> = ({
  isOpen,
  activeView,
  onClose,
  sessions,
  onLaunchPrompt,
  onOpenCanvas,
}) => {
  // Extract all generated markdown images and code blocks across all saved sessions
  const { images, codeSnippets } = useMemo(() => {
    const imgs: ExtractedImage[] = [];
    const codes: ExtractedCode[] = [];
    const seenUrls = new Set<string>();

    sessions.forEach((session) => {
      (session.messages || []).forEach((msg) => {
        if (msg.sender !== 'assistant' || !msg.text) return;

        // Match markdown images ![alt](url)
        const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
        let match;
        while ((match = imgRegex.exec(msg.text)) !== null) {
          const url = match[2];
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            imgs.push({
              alt: match[1] || session.title || 'Generated Visual',
              url,
              sessionTitle: session.title,
              timestamp: msg.timestamp || 'Recent',
            });
          }
        }

        // Match fenced code blocks ```lang ... ```
        const codeRegex = /```([a-zA-Z0-9_-]+)\n([\s\S]*?)```/g;
        let cMatch;
        while ((cMatch = codeRegex.exec(msg.text)) !== null) {
          if (cMatch[2].trim().length > 40) {
            codes.push({
              language: cMatch[1].toLowerCase(),
              code: cMatch[2].trim(),
              sessionTitle: session.title,
            });
          }
        }
      });
    });

    return { images: imgs, codeSnippets: codes.slice(0, 12) };
  }, [sessions]);

  if (!isOpen) return null;

  const exploreAgents: Array<{
    title: string;
    badge: string;
    description: string;
    persona: PersonaType;
    prompt: string;
    icon: React.ReactNode;
    gradient: string;
  }> = [
    {
      title: 'Full-Stack UI & React Architect',
      badge: 'Canvas Live Preview',
      description: 'Generates complete HTML/Tailwind/React interfaces that automatically render inside the Split-Screen Canvas Studio.',
      persona: 'coder',
      prompt: 'Build a modern interactive Pomodoro Timer & Task Tracker dashboard in a single HTML file using Tailwind CSS and JavaScript.',
      icon: <Code2 size={18} className="text-indigo-500" />,
      gradient: 'from-indigo-500/10 to-purple-500/10 border-indigo-500/20',
    },
    {
      title: 'Python Data Science & WASM Analyst',
      badge: 'Pyodide 3.11 Sandbox',
      description: 'Writes runnable Python data analysis & statistics scripts that execute directly in your browser via WebAssembly.',
      persona: 'math_tutor',
      prompt: 'Write a Python script that simulates 12 months of startup revenue growth, calculates CAGR and standard deviation, and prints an ASCII bar chart.',
      icon: <Terminal size={18} className="text-emerald-500" />,
      gradient: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
    },
    {
      title: 'Zero-Shot AI Visual Studio',
      badge: 'Cloudinary CDN + NLP',
      description: 'Creates high-resolution cinematic artwork, realistic portraits, and concept designs with automatic prompt enhancement.',
      persona: 'general',
      prompt: '/image Futuristic cybernetic astronaut standing on an alien glass mountain under a glowing purple nebula, 8k cinematic photorealistic',
      icon: <Sparkles size={18} className="text-fuchsia-500" />,
      gradient: 'from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/20',
    },
    {
      title: 'Live Web & Deep Research Analyst',
      badge: 'Google Search Grounding',
      description: 'Performs real-time web verification for current events, global tech breakthroughs, market trends, and cited research.',
      persona: 'general',
      prompt: 'What are the most important breakthroughs in AI Agents and WebAssembly in 2026? Summarize with key takeaways.',
      icon: <Globe size={18} className="text-blue-500" />,
      gradient: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
    },
    {
      title: 'System Architecture & Cloud DevOps Agent',
      badge: 'Cloud + Microservices',
      description: 'Designs scalable system architectures, Docker/Kubernetes pipelines, database schemas, and enterprise API blueprints.',
      persona: 'coder',
      prompt: 'Design a production-ready microservices architecture for a high-traffic SaaS platform with Redis caching, MongoDB sharding, and CI/CD.',
      icon: <Languages size={18} className="text-amber-500" />,
      gradient: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
    },
    {
      title: 'FAANG Technical Interview Coach',
      badge: 'Career & DSA Prep',
      description: 'Conducts mock system design and coding interviews with actionable feedback and complexity analysis.',
      persona: 'coder',
      prompt: 'Ask me a system design interview question about designing a scalable AI chat platform like ChatGPT and guide me step by step.',
      icon: <Briefcase size={18} className="text-rose-500" />,
      gradient: 'from-rose-500/10 to-orange-500/10 border-rose-500/20',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#181818] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[86vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#262626]">
          <div className="flex items-center gap-2.5">
            {activeView === 'library' ? (
              <>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <ImageIcon size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0D0D0D] dark:text-white">
                    Nebula Media & Artifact Library
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    All AI-generated visuals (Cloudinary CDN) and code artifacts from your sessions
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Compass size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0D0D0D] dark:text-white">
                    Explore Specialized AI Agents
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Launch pre-configured workflows for Canvas UI, Python WASM, Vision, and Bilingual Research
                  </p>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeView === 'library' ? (
            <>
              {/* Generated Images Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-purple-500" />
                    Generated AI Visuals ({images.length})
                  </h4>
                </div>

                {images.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center">
                    <ImageIcon size={28} className="mx-auto mb-2 text-gray-400 opacity-60" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      No generated images in your current history yet
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
                      Try generating an image and it will automatically appear here backed by Cloudinary CDN.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        onLaunchPrompt('/image Futuristic cyberpunk metropolis during a neon rainstorm at night, reflections on wet asphalt, 8k');
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D] hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Generate Sample Artwork Now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#121212] flex flex-col"
                      >
                        <div className="aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
                          <img
                            src={img.url}
                            alt={img.alt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white/90 text-gray-900 hover:bg-white transition-colors"
                              title="Open Full Resolution"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <a
                              href={img.url}
                              download={`nebula_art_${idx + 1}.jpg`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                              title="Download Image"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                            {img.sessionTitle}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {img.alt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Code Artifacts Section */}
              {codeSnippets.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-3">
                    <Code2 size={13} className="text-indigo-500" />
                    Saved Code Artifacts ({codeSnippets.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {codeSnippets.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1E1E1E] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                              {item.language}
                            </span>
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {item.sessionTitle}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate mt-1">
                            {item.code.split('\n')[0]}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onOpenCanvas(item.code, item.language, item.sessionTitle);
                          }}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                        >
                          Open in Canvas
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Explore AI Agents Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {exploreAgents.map((agent, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onClose();
                    onLaunchPrompt(agent.prompt, agent.persona);
                  }}
                  className={`group text-left p-4 rounded-2xl border bg-gradient-to-br ${agent.gradient} hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="p-2 rounded-xl bg-white dark:bg-[#1E1E1E] shadow-2xs border border-gray-100 dark:border-gray-800">
                        {agent.icon}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/40 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700">
                        {agent.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-[#0D0D0D] dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                      {agent.title}
                      <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      {agent.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-200/50 dark:border-gray-800/60 flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    <span>Click to launch agent</span>
                    <Brain size={13} className="text-purple-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
