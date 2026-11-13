import React from 'react';
import { Code2, Compass, Lightbulb, Sparkles } from 'lucide-react';
import type { SuggestionPrompt } from '../types';
import { NebulaLogo } from './NebulaLogo';

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
      subtitle: '"/image Futuristic cosmic AI metropolis with neon holograms..."',
      prompt: '/image Futuristic cosmic AI metropolis with flying vehicles and neon holograms, cinematic 8k render',
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
      {/* Clean Vector Polar Bear Brand Logo */}
      <div className="relative mb-3 group cursor-pointer">
        <div className="absolute -inset-3 bg-gradient-to-tr from-purple-500/15 via-fuchsia-500/10 to-indigo-500/15 rounded-full blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          <NebulaLogo
            className="w-full h-full text-[#0F172A] dark:text-white animate-cosmic-orb"
            title="Nebula AI"
          />
        </div>
      </div>

      {/* Main Heading */}
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-[#0D0D0D] dark:text-[#F0F0F0] mb-1.5 break-words w-full">
        Welcome to your cognitive co-pilot
      </h1>

      {/* Subtitle */}
      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-lg mb-6 leading-relaxed font-normal">
        I am Nebula. You can ask me to write, code, plan, generate visuals, or explore any idea.
      </p>

      {/* Suggestion Cards — container-responsive so resizing Canvas never crushes cards */}
      <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-2.5 sm:gap-3 w-full min-w-0">
        {suggestions.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectSuggestion(item.prompt)}
            className="group relative flex flex-col items-start w-full min-w-0 overflow-hidden p-3.5 sm:p-4 rounded-2xl text-left
              bg-white dark:bg-[#1A1A1A] hover:bg-[#F9FAFB] dark:hover:bg-[#222222]
              border border-[#E5E5E5] dark:border-[#2C2C2C] hover:border-gray-400 dark:hover:border-gray-600
              shadow-2xs hover:shadow-md hover:shadow-black/5
              transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            {/* Card Header with Icon Badge + Title */}
            <div className="flex items-center gap-2.5 mb-2 w-full min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-[#0D0D0D] dark:group-hover:bg-white border border-gray-200 dark:border-gray-700 group-hover:border-[#0D0D0D] dark:group-hover:border-white flex items-center justify-center shrink-0 transition-colors">
                {item.icon === 'code' && <Code2 size={15} className="text-gray-700 dark:text-gray-300 group-hover:text-white dark:group-hover:text-black transition-colors" />}
                {item.icon === 'trip' && <Compass size={15} className="text-gray-700 dark:text-gray-300 group-hover:text-white dark:group-hover:text-black transition-colors" />}
                {item.icon === 'brainstorm' && <Lightbulb size={15} className="text-gray-700 dark:text-gray-300 group-hover:text-white dark:group-hover:text-black transition-colors" />}
                {item.icon === 'sparkles' && <Sparkles size={15} className="text-purple-600 dark:text-purple-400 group-hover:text-white dark:group-hover:text-black transition-colors" />}
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
