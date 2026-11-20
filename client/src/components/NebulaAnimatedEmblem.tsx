import React, { useId } from 'react';

export type EmblemStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export const NebulaAnimatedEmblem: React.FC<{ status?: EmblemStatus; className?: string }> = ({
  status = 'idle',
  className = 'w-60 h-60',
}) => {
  const uid = useId().replace(/:/g, '');
  const gooFilterId = `${uid}-metaball-goo`;

  return (
    <svg
      viewBox="-140 -140 280 280"
      className={`${className} overflow-visible select-none pointer-events-none text-[#181715] dark:text-[#F5F2EB]`}
      aria-hidden="true"
    >
      <defs>
        {/* Crisp liquid metaball filter for authentic black-ball split & merge physics */}
        <filter
          id={gooFilterId}
          x="-140"
          y="-140"
          width="280"
          height="280"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>

      {/* Pure Liquid Black Ball Split -> Dual Orbit Around N & B -> Merge (Zero Rings, Zero Glow) */}
      <g transform="rotate(-34)">
        <g className={`nebula-carrier-${status}`}>
          <g filter={`url(#${gooFilterId})`}>
            {/* Ball 1: Sweeps clockwise around B */}
            <g className={`nebula-ball-cw-${status}`}>
              <circle
                cx="0"
                cy="-82"
                r="11.5"
                fill="currentColor"
                className={`nebula-ball-mass-${status}`}
              />
            </g>

            {/* Ball 2: Splits seamlessly from Ball 1, sweeps counter-clockwise around N, merges cleanly */}
            <g className={`nebula-ball-ccw-${status}`}>
              <circle
                cx="0"
                cy="-82"
                r="11.5"
                fill="currentColor"
                className={`nebula-ball-mass-${status}`}
              />
            </g>
          </g>
        </g>
      </g>

      {/* Crisp Central NB Monogram — Pure Background, Zero Orange Haze */}
      <g className={status === 'speaking' ? 'nebula-nb-center-speaking' : 'nebula-nb-center'}>
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
