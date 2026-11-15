import React from 'react';
import { Code2, Compass, Lightbulb, Sparkles } from 'lucide-react';
import type { SuggestionPrompt } from '../types';

interface HeroProps {
  onSelectSuggestion: (prompt: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onSelectSuggestion }) => {
  const suggestions: SuggestionPrompt[] = [
    {
      id: 'sugg-1',
      icon: 'code',
      title: 'Explain this Code',
      subtitle: '"Can you find the bug in this TypeScript snippet..."',
      prompt: 'Can you find the bug in this TypeScript snippet and explain how to fix it with best practices?',
    },
    {
      id: 'sugg-2',
      icon: 'sparkles',
      title: 'AI Image Generator',
      subtitle: '"/image Minimalist glass pavilion overlooking a calm alpine lake at sunrise..."',
      prompt: '/image Minimalist glass and warm oak pavilion overlooking a calm misty alpine lake at sunrise, natural editorial photography, 8k',
    },
    {
      id: 'sugg-3',
      icon: 'brainstorm',
      title: 'Brainstorm Ideas',
      subtitle: '"Suggest 5 viral startup ideas using Generative AI..."',
      prompt: 'Suggest 5 viral startup ideas using modern Generative AI and explain their business model.',
    },
  ];

  return (
    <div className="@container my-auto flex flex-col items-center px-3 sm:px-6 py-4 md:py-6 max-w-3xl mx-auto w-full min-w-0 text-center">
      {/* Floating 3D Metallic Nebula Logo */}
      <div className="relative mb-3 group cursor-pointer">
        <div className="absolute -inset-4 bg-radial from-slate-200/50 via-transparent to-transparent dark:from-white/[0.08] rounded-full blur-xl opacity-80 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center dark:brightness-125">
          <img
            src="/nebula-logo.png"
            alt="Nebula AI Logo"
            className="w-full h-full object-contain animate-cosmic-orb"
          />
        </div>
      </div>

      {/* Main Heading */}
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-[#0D0D0D] dark:text-[#F0F0F0] mb-1.5 break-words w-full">
        Welcome to your cognitive co-pilot
      </h1>

      {/* Subtitle */}
      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-xl mb-6 leading-relaxed font-normal">
        I am Nebula. You can ask me to write, code, plan, generate visuals, or explore any idea.
      </p>

      {/* Suggestion Cards — container-responsive so resizing Canvas never crushes cards */}
      <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-2.5 sm:gap-3 w-full min-w-0">
        {suggestions.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectSuggestion(item.prompt)}
            className="group relative flex flex-col items-start w-full min-w-0 overflow-hidden p-3.5 sm:p-4 rounded-2xl text-left
              bg-white dark:bg-[#19191B] hover:bg-[#FAFAFB] dark:hover:bg-[#202024]
              border border-[#E5E5E5] dark:border-[#2C2C30] hover:border-zinc-300 dark:hover:border-zinc-600
              shadow-2xs hover:shadow-sm hover:shadow-black/[0.04]
              transition-all duration-200 active:scale-[0.99] cursor-pointer"
          >
            {/* Card Header with Icon Badge + Title */}
            <div className="flex items-center gap-2.5 mb-2 w-full min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#F4F4F5] dark:bg-[#242428] group-hover:bg-[#18181B] dark:group-hover:bg-white border border-[#E4E4E7] dark:border-[#323238] group-hover:border-[#18181B] dark:group-hover:border-white flex items-center justify-center shrink-0 transition-colors">
                {item.icon === 'code' && <Code2 size={14} className="text-zinc-700 dark:text-zinc-300 group-hover:text-white dark:group-hover:text-black transition-colors" />}
                {item.icon === 'trip' && <Compass size={14} className="text-zinc-700 dark:text-zinc-300 group-hover:text-white dark:group-hover:text-black transition-colors" />}
                {item.icon === 'brainstorm' && <Lightbulb size={14} className="text-zinc-700 dark:text-zinc-300 group-hover:text-white dark:group-hover:text-black transition-colors" />}
                {item.icon === 'sparkles' && <Sparkles size={14} className="text-zinc-700 dark:text-zinc-300 group-hover:text-white dark:group-hover:text-black transition-colors" />}
              </div>
              <span className="flex-1 min-w-0 text-sm font-semibold text-[#0D0D0D] dark:text-[#E8E8E8] group-hover:text-black dark:group-hover:text-white transition-colors truncate">
                {item.title}
              </span>
            </div>

            {/* Subtitle text */}
            <p className="w-full min-w-0 text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 leading-relaxed transition-colors line-clamp-2 break-words">
              {item.subtitle}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
