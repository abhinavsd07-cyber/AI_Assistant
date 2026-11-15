import React from 'react';
import { Code2, Compass, Lightbulb, Sparkles, ArrowUpRight, Globe } from 'lucide-react';
import type { SuggestionPrompt } from '../types';

interface HeroProps {
  onSelectSuggestion: (prompt: string) => void;
}

const SUGGESTION_ICONS: Record<SuggestionPrompt['icon'], React.FC<{ size?: number; className?: string }>> = {
  code: Code2,
  trip: Compass,
  brainstorm: Lightbulb,
  globe: Globe,
  sparkles: Sparkles,
};

const SUGGESTIONS: SuggestionPrompt[] = [
  {
    id: 'sugg-1',
    icon: 'code',
    title: 'Explain this Code',
    subtitle: 'Find bugs in a TypeScript snippet and apply clean fixes',
    prompt: 'Can you find the bug in this TypeScript snippet and explain how to fix it with best practices?',
  },
  {
    id: 'sugg-2',
    icon: 'sparkles',
    title: 'AI Image Generator',
    subtitle: 'Minimalist glass pavilion by a calm alpine lake at sunrise',
    prompt: '/image Minimalist glass and warm oak pavilion overlooking a calm misty alpine lake at sunrise, natural editorial photography, 8k',
  },
  {
    id: 'sugg-3',
    icon: 'brainstorm',
    title: 'Brainstorm Ideas',
    subtitle: 'Explore 5 startup concepts built with generative AI',
    prompt: 'Suggest 5 viral startup ideas using modern Generative AI and explain their business model.',
  },
];

export const Hero: React.FC<HeroProps> = ({ onSelectSuggestion }) => {
  return (
    <div className="@container my-auto flex flex-col items-center justify-center px-4 sm:px-6 py-6 md:py-8 max-w-3xl mx-auto w-full min-w-0 text-center">
      {/* Floating 3D Metallic Nebula Logo */}
      <div className="relative mb-4 flex items-center justify-center group cursor-pointer">
        <div className="absolute -inset-4 bg-radial from-slate-300/45 via-transparent to-transparent dark:from-white/[0.08] rounded-full blur-xl opacity-80 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-[72px] md:h-[72px] flex items-center justify-center dark:brightness-125 transition-transform duration-300 group-hover:scale-105">
          <img
            src="/nebula-logo.png"
            alt="Nebula AI Logo"
            className="w-full h-full object-contain animate-cosmic-orb drop-shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
          />
        </div>
      </div>

      {/* Main Heading */}
      <h1 className="text-2xl sm:text-[28px] md:text-[32px] font-semibold tracking-[-0.025em] leading-tight text-[#0D0D0D] dark:text-[#F4F4F5] mb-2 text-balance w-full">
        Welcome to your cognitive copilot
      </h1>

      {/* Subtitle */}
      <p className="text-[13.5px] sm:text-[14.5px] text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto mb-7 leading-relaxed font-normal text-pretty">
        I am Nebula. Ask me to write, code, plan, generate visuals, or explore any idea.
      </p>

      {/* Suggestion Cards — balanced 3-up executive grid with centered headers */}
      <div className="grid grid-cols-1 @lg:grid-cols-3 gap-3 w-full min-w-0">
        {SUGGESTIONS.map((item) => {
          const IconComponent = SUGGESTION_ICONS[item.icon] || Sparkles;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="group relative flex flex-col items-center justify-start w-full min-w-0 overflow-hidden p-4 sm:p-5 rounded-2xl text-center
                bg-white dark:bg-[#18181B] hover:bg-[#FAFAFC] dark:hover:bg-[#1F1F24]
                border border-[#E5E7EB] dark:border-[#2A2A30] hover:border-zinc-300 dark:hover:border-zinc-600
                shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:shadow-[0_10px_24px_-8px_rgba(15,23,42,0.09)] dark:hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.45)]
                transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer"
            >
              <ArrowUpRight
                size={13}
                className="absolute top-3.5 right-3.5 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-all"
              />

              {/* Centered Icon Badge + Card Title */}
              <div className="flex flex-col items-center gap-2.5 mb-1.5 w-full min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#F4F4F5] dark:bg-[#242429] group-hover:bg-[#18181B] dark:group-hover:bg-white border border-[#E4E4E7] dark:border-[#32323A] group-hover:border-[#18181B] dark:group-hover:border-white flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                  <IconComponent size={15} className="text-zinc-700 dark:text-zinc-300 group-hover:text-white dark:group-hover:text-black transition-colors" />
                </div>
                <span className="w-full min-w-0 text-[13.5px] font-semibold tracking-[-0.01em] text-[#0D0D0D] dark:text-[#F0F0F2] group-hover:text-black dark:group-hover:text-white transition-colors truncate">
                  {item.title}
                </span>
              </div>

              {/* Clean, unclipped subtitle */}
              <p className="w-full min-w-0 text-[12px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 leading-relaxed transition-colors break-words">
                {item.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
