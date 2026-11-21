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
    <div className="@container my-auto flex flex-col items-center justify-center px-3.5 sm:px-6 py-4 sm:py-6 md:py-8 max-w-3xl mx-auto w-full min-w-0 text-center">
      {/* Primary Nebula NB Brand Logo */}
      <div className="relative mb-3.5 sm:mb-5 flex items-center justify-center group cursor-pointer select-none">
        <img
          src="/nebula-logo.png"
          alt="Nebula AI"
          className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-[0_8px_20px_rgba(255,61,30,0.14)] dark:hidden transition-transform duration-300 group-hover:scale-105"
        />
        <img
          src="/nebula-logo-dark.png"
          alt="Nebula AI"
          className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-[0_8px_20px_rgba(255,61,30,0.22)] hidden dark:block transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Main Heading */}
      <h1 className="text-[21px] sm:text-[28px] md:text-[32px] font-semibold tracking-[-0.025em] leading-tight text-[#1F1E1B] dark:text-[#F0ECE1] mb-1.5 sm:mb-2 text-balance w-full">
        Welcome to your cognitive copilot
      </h1>

      {/* Subtitle */}
      <p className="text-[13px] sm:text-[14.5px] text-[#736B63] dark:text-[#A39E93] max-w-lg mx-auto mb-5 sm:mb-7 leading-relaxed font-normal text-pretty">
        I am Nebula. Ask me to write, code, plan, generate visuals, or explore any idea.
      </p>

      {/* Suggestion Cards — balanced 3-up executive grid with centered headers */}
      <div className="grid grid-cols-1 @lg:grid-cols-3 gap-2.5 sm:gap-3 w-full min-w-0">
        {SUGGESTIONS.map((item) => {
          const IconComponent = SUGGESTION_ICONS[item.icon] || Sparkles;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="group relative flex flex-col items-center justify-start w-full min-w-0 overflow-hidden p-3.5 sm:p-5 rounded-2xl text-center
                bg-white dark:bg-[#252320] hover:bg-[#FAF8F5] dark:hover:bg-[#2D2A26]
                border border-[#EAE4D9] dark:border-[#38352F] hover:border-[#D97736]/50 dark:hover:border-[#D97736]/50
                shadow-[0_1px_2px_rgba(217,119,54,0.04)] hover:shadow-[0_10px_24px_-8px_rgba(217,119,54,0.12)] dark:hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.45)]
                transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer"
            >
              <ArrowUpRight
                size={13}
                className="absolute top-3.5 right-3.5 text-[#B8AEA2] dark:text-[#6E675D] opacity-0 group-hover:opacity-100 group-hover:text-[#D97736] transition-all"
              />

              {/* Centered Icon Badge + Card Title */}
              <div className="flex flex-col items-center gap-2.5 mb-1.5 w-full min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#FBF3EC] dark:bg-[#342D26] group-hover:bg-[#D97736] border border-[#F3D8C6] dark:border-[#4B3E34] group-hover:border-[#D97736] flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                  <IconComponent size={15} className="text-[#D97736] dark:text-[#E07A5F] group-hover:text-white transition-colors" />
                </div>
                <span className="w-full min-w-0 text-[13.5px] font-semibold tracking-[-0.01em] text-[#1F1E1B] dark:text-[#F0ECE1] group-hover:text-[#D97736] dark:group-hover:text-[#E07A5F] transition-colors truncate">
                  {item.title}
                </span>
              </div>

              {/* Clean, unclipped subtitle */}
              <p className="w-full min-w-0 text-[12px] text-[#736B63] dark:text-[#A39E93] group-hover:text-[#1F1E1B] dark:group-hover:text-white leading-relaxed transition-colors break-words">
                {item.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
