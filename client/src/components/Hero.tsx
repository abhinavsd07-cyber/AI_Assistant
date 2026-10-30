import React from 'react';
import { Code2, Compass, Lightbulb } from 'lucide-react';
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
      subtitle: '"Can you find the bug in this JavaScript snippet..."',
      prompt: 'Can you find the bug in this JavaScript snippet and explain how to fix it with best practices?',
    },
    {
      id: 'sugg-2',
      icon: 'trip',
      title: 'Plan a Trip',
      subtitle: '"Create a 5-day, budget-friendly itinerary for Kyoto..."',
      prompt: 'Create a 5-day, budget-friendly travel itinerary for Kyoto with must-visit temples and local food.',
    },
    {
      id: 'sugg-3',
      icon: 'brainstorm',
      title: 'Brainstorm Ideas',
      subtitle: '"I want to start a podcast about sustainable tech..."',
      prompt: 'I want to start a podcast about sustainable tech. Can you suggest 5 catchy names and 3 episode topics?',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-4 md:py-6 max-w-3xl mx-auto w-full text-center">
      {/* Glowing 3D Cosmic Orb Logo */}
      <div className="relative mb-3 group cursor-pointer">
        <div className="absolute -inset-3 bg-gradient-to-tr from-purple-500/20 via-fuchsia-500/15 to-indigo-500/20 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden p-0.5 bg-gradient-to-b from-purple-400/30 via-indigo-500/15 to-transparent shadow-xl shadow-purple-900/10 border border-gray-200">
          <img
            src="/cosmic_orb.jpg"
            alt="Nebula Cosmic Orb"
            className="w-full h-full rounded-full object-cover animate-cosmic-orb"
          />
        </div>
      </div>

      {/* Main Heading */}
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-[#0D0D0D] mb-1.5">
        Welcome to your cognitive co-pilot
      </h1>

      {/* Subtitle */}
      <p className="text-xs md:text-sm text-gray-500 max-w-lg mb-6 leading-relaxed font-normal">
        I am Nebula. You can ask me to write, code, plan, or explore any idea.
      </p>

      {/* 3 Suggestion Cards with Original Header Layout & Crisp Light Styling */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {suggestions.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectSuggestion(item.prompt)}
            className="group relative flex flex-col items-start p-4 rounded-2xl text-left
              bg-white hover:bg-[#F9FAFB]
              border border-[#E5E5E5] hover:border-gray-400
              shadow-2xs hover:shadow-md hover:shadow-black/5
              transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            {/* Card Header with Icon Badge + Title */}
            <div className="flex items-center gap-2.5 mb-2 w-full">
              <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-[#0D0D0D] border border-gray-200 group-hover:border-[#0D0D0D] flex items-center justify-center shrink-0 transition-colors">
                {item.icon === 'code' && <Code2 size={15} className="text-gray-700 group-hover:text-white transition-colors" />}
                {item.icon === 'trip' && <Compass size={15} className="text-gray-700 group-hover:text-white transition-colors" />}
                {item.icon === 'brainstorm' && <Lightbulb size={15} className="text-gray-700 group-hover:text-white transition-colors" />}
              </div>
              <span className="text-sm font-semibold text-[#0D0D0D] group-hover:text-black transition-colors truncate">
                {item.title}
              </span>
            </div>

            {/* Subtitle text */}
            <p className="text-xs text-gray-500 group-hover:text-gray-700 leading-relaxed transition-colors line-clamp-2">
              {item.subtitle}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
