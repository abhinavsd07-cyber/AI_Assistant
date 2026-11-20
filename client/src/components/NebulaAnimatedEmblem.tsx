import React, { useId } from 'react';

export type EmblemStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

const EMBLEM_ACCENTS: Record<
  EmblemStatus,
  { primaryOrb: string; secondaryOrb: string; ringGlow: string; glint: string; ringClass: string }
> = {
  idle: {
    primaryOrb: '#FF3D1E',
    secondaryOrb: '#FF6A3D',
    ringGlow: '#FF3D1E',
    glint: '#FFF1EE',
    ringClass: 'nebula-ring-idle',
  },
  listening: {
    primaryOrb: '#FF3D1E',
    secondaryOrb: '#FF7A29',
    ringGlow: '#FF5722',
    glint: '#FFF0EB',
    ringClass: 'nebula-ring-listening',
  },
  thinking: {
    primaryOrb: '#FF7A29',
    secondaryOrb: '#FF3D1E',
    ringGlow: '#FF7A29',
    glint: '#FFF8E1',
    ringClass: 'nebula-ring-thinking',
  },
  speaking: {
    primaryOrb: '#E62E00',
    secondaryOrb: '#FF3D1E',
    ringGlow: '#FF3D1E',
    glint: '#FFFFFF',
    ringClass: 'nebula-ring-speaking',
  },
};

export const NebulaAnimatedEmblem: React.FC<{ status?: EmblemStatus; className?: string }> = ({
  status = 'idle',
  className = 'w-56 h-56',
}) => {
  const uid = useId().replace(/:/g, '');
  const primarySweepId = `${uid}-primary-sweep`;
  const secondarySweepId = `${uid}-secondary-sweep`;
  const centerAuraId = `${uid}-center-aura`;
  const orbGrad1Id = `${uid}-orb-1`;
  const orbGrad2Id = `${uid}-orb-2`;
  const accent = EMBLEM_ACCENTS[status];
  const isIdle = status === 'idle';

  return (
    <svg
      viewBox="-140 -140 280 280"
      className={`${className} overflow-visible select-none pointer-events-none drop-shadow-[0_10px_24px_rgba(255,61,30,0.20)]`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={centerAuraId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent.ringGlow} stopOpacity="0.16" />
          <stop offset="65%" stopColor={accent.ringGlow} stopOpacity="0.05" />
          <stop offset="100%" stopColor={accent.ringGlow} stopOpacity="0" />
        </radialGradient>

        <linearGradient id={primarySweepId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={accent.primaryOrb} stopOpacity="0.95" />
          <stop offset="55%" stopColor={accent.secondaryOrb} stopOpacity="0.45" />
          <stop offset="100%" stopColor={accent.ringGlow} stopOpacity="0.05" />
        </linearGradient>

        <linearGradient id={secondarySweepId} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={accent.secondaryOrb} stopOpacity="0.9" />
          <stop offset="50%" stopColor={accent.primaryOrb} stopOpacity="0.4" />
          <stop offset="100%" stopColor={accent.ringGlow} stopOpacity="0.04" />
        </linearGradient>

        <radialGradient id={orbGrad1Id} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFF5F2" />
          <stop offset="35%" stopColor={accent.primaryOrb} />
          <stop offset="100%" stopColor="#B32000" />
        </radialGradient>

        <radialGradient id={orbGrad2Id} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFF8F5" />
          <stop offset="40%" stopColor={accent.secondaryOrb} />
          <stop offset="100%" stopColor="#D93800" />
        </radialGradient>
      </defs>

      {/* Soft ambient aura behind the central NB monogram */}
      <circle cx="0" cy="0" r="76" fill={`url(#${centerAuraId})`} />

      {/* Static subtle guide ring for Primary Orbit (R1 = 84) around NB */}
      <circle
        cx="0"
        cy="0"
        r="84"
        fill="none"
        stroke={accent.ringGlow}
        strokeWidth="1.6"
        strokeOpacity="0.22"
      />

      {/* Rotating Primary Orbit System (Circle 1 + Generated Circle 2 & Ring 2) */}
      <g transform="rotate(-42)">
        <g className={accent.ringClass}>
          {/* Ring 1 glowing orbital sweep following Circle 1 around NB */}
          <circle
            cx="0"
            cy="0"
            r="84"
            fill="none"
            stroke={`url(#${primarySweepId})`}
            strokeWidth="3.5"
            strokeDasharray="190 340"
            strokeLinecap="round"
            transform="rotate(-90)"
          />

          {/* Generated Ring 2 (വളയം 2): spawns out from Ring 1 (r=84 -> r=110) and revolves around NB */}
          <g className={isIdle ? 'nebula-spawn-ring-idle' : 'nebula-spawn-ring-active'}>
            <circle
              cx="0"
              cy="0"
              r="110"
              fill="none"
              stroke={accent.secondaryOrb}
              strokeWidth="1.4"
              strokeOpacity="0.28"
            />
            <circle
              cx="0"
              cy="0"
              r="110"
              fill="none"
              stroke={`url(#${secondarySweepId})`}
              strokeWidth="3"
              strokeDasharray="220 472"
              strokeLinecap="round"
              transform="rotate(-85)"
            />
          </g>

          {/* Generated Circle 2: literally buds out from Circle 1 at (0, -84), expands to Ring 2 (0, -110), and orbits 360° around NB */}
          <g className={isIdle ? 'nebula-spawn-angle-idle' : 'nebula-spawn-angle-active'}>
            <g className={isIdle ? 'nebula-spawn-radius-idle' : 'nebula-spawn-radius-active'}>
              <circle cx="0" cy="0" r="14" fill={accent.secondaryOrb} opacity="0.22" />
              <circle
                cx="0"
                cy="0"
                r="8.5"
                fill={`url(#${orbGrad2Id})`}
                stroke="#FAF8F5"
                strokeWidth="1.5"
              />
            </g>
          </g>

          {/* Primary Circle 1 (The NB Logo's Circle Orb) orbiting at (0, -84) around NB */}
          <g transform="translate(0, -84)">
            <circle cx="0" cy="0" r="16" fill={accent.primaryOrb} opacity="0.24" />
            <circle
              cx="0"
              cy="0"
              r="10.5"
              fill={`url(#${orbGrad1Id})`}
              stroke="#FAF8F5"
              strokeWidth="1.8"
            />
            <circle cx="-3" cy="-3" r="2.6" fill="#FFFFFF" opacity="0.85" />
          </g>
        </g>
      </g>

      {/* Large Central NB Logo (replaces the old 'N') */}
      <g className="nebula-nb-center">
        <image
          href="/nebula-nb-body.png"
          x="-58"
          y="-58"
          width="116"
          height="116"
          preserveAspectRatio="xMidYMid meet"
          className="dark:hidden"
        />
        <image
          href="/nebula-nb-body-dark.png"
          x="-58"
          y="-58"
          width="116"
          height="116"
          preserveAspectRatio="xMidYMid meet"
          className="hidden dark:block"
        />
      </g>
    </svg>
  );
};
