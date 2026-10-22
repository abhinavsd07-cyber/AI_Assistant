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
    <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-2 md:py-4 max-w-4xl mx-auto w-full text-center">
      {/* Glowing 3D Cosmic Orb */}
      <div className="relative mb-2.5 group cursor-pointer">
        <div className="absolute -inset-3 bg-gradient-to-tr from-purple-600/40 via-fuchsia-500/30 to-indigo-600/40 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden p-1 bg-gradient-to-b from-purple-400/40 via-purple-600/20 to-transparent shadow-2xl shadow-purple-900/50">
          <img
            src="/cosmic_orb.jpg"
            alt="Nebula Cosmic Orb"
            className="w-full h-full rounded-full object-cover animate-cosmic-orb"
          />
        </div>
      </div>

      {/* Main Heading */}
      <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight text-white mb-1.5">
        Welcome to your cognitive co-pilot
      </h1>

      {/* Subtitle */}
      <p className="text-xs md:text-sm text-white/60 max-w-lg mb-4 md:mb-5 leading-relaxed font-normal">
        I am Nebula. You can ask me to write, code, plan, or explore any idea.
      </p>

      {/* 3 Suggestion Cards matching the screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3.5 w-full">
        {suggestions.map((item) => {
          return (
            <button
              key={item.id}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="group relative flex flex-col items-start p-4 md:p-5 rounded-2xl text-left
                bg-gradient-to-b from-white/[0.05] to-white/[0.02] hover:from-white/[0.09] hover:to-purple-950/20
                border border-white/[0.08] hover:border-purple-400/40 shadow-lg hover:shadow-purple-900/20
                backdrop-blur-xl transition-all duration-200 active:scale-[0.98]"
            >
              {/* Card Header with Icon */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/[0.06] group-hover:bg-purple-500/20 border border-white/[0.08] group-hover:border-purple-400/30 flex items-center justify-center transition-colors">
                  {item.icon === 'code' && <Code2 size={15} className="text-purple-300" />}
                  {item.icon === 'trip' && <Compass size={15} className="text-indigo-300" />}
                  {item.icon === 'brainstorm' && <Lightbulb size={15} className="text-fuchsia-300" />}
                </div>
                <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                  {item.title}
                </span>
              </div>

              {/* Subtitle text */}
              <p className="text-xs text-white/50 group-hover:text-white/70 leading-relaxed transition-colors">
                {item.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
