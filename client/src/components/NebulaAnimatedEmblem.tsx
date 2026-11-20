import React, { useEffect, useId, useRef } from 'react';

export type EmblemStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

const STATUS_MOTION: Record<
  EmblemStatus,
  { splitFreq: number; carrierSpeed: number; breathAmp: number; pulseAmp: number }
> = {
  idle: { splitFreq: 0.14, carrierSpeed: 0.28, breathAmp: 1.0, pulseAmp: 0 },
  listening: { splitFreq: 0.22, carrierSpeed: 0.48, breathAmp: 2.6, pulseAmp: 0.45 },
  thinking: { splitFreq: 0.34, carrierSpeed: 0.85, breathAmp: 1.5, pulseAmp: 0.65 },
  speaking: { splitFreq: 0.28, carrierSpeed: 0.62, breathAmp: 2.2, pulseAmp: 1.25 },
};

function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export const NebulaAnimatedEmblem: React.FC<{ status?: EmblemStatus; className?: string }> = ({
  status = 'idle',
  className = 'w-60 h-60',
}) => {
  const uid = useId().replace(/:/g, '');
  const gooFilterId = `${uid}-metaball-goo`;

  const ball1Ref = useRef<SVGCircleElement | null>(null);
  const ball2Ref = useRef<SVGCircleElement | null>(null);
  const centerGroupRef = useRef<SVGGElement | null>(null);
  const statusRef = useRef<EmblemStatus>(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    // Start directly at the iconic top-left NB black dot position (-124 deg)
    let baseAngle = (-124 * Math.PI) / 180;
    let cycle = 0.04;
    let elapsed = 0;

    let curSplitFreq = STATUS_MOTION[statusRef.current].splitFreq;
    let curCarrierSpeed = STATUS_MOTION[statusRef.current].carrierSpeed;
    let curBreathAmp = STATUS_MOTION[statusRef.current].breathAmp;
    let curPulseAmp = STATUS_MOTION[statusRef.current].pulseAmp;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const target = STATUS_MOTION[statusRef.current];
      const damp = Math.min(1, dt * 4.5);
      curSplitFreq += (target.splitFreq - curSplitFreq) * damp;
      curCarrierSpeed += (target.carrierSpeed - curCarrierSpeed) * damp;
      curBreathAmp += (target.breathAmp - curBreathAmp) * damp;
      curPulseAmp += (target.pulseAmp - curPulseAmp) * damp;

      baseAngle += dt * curCarrierSpeed;
      cycle = (cycle + dt * curSplitFreq) % 1;

      // Smooth Split -> Encircle both sides of N & B -> Organic Liquid Merge
      let deltaAngle = 0;
      if (cycle < 0.08) {
        deltaAngle = 0;
      } else if (cycle < 0.44) {
        deltaAngle = smootherstep(0.08, 0.44, cycle) * Math.PI;
      } else if (cycle < 0.56) {
        deltaAngle = Math.PI;
      } else if (cycle < 0.92) {
        deltaAngle = Math.PI + smootherstep(0.56, 0.92, cycle) * Math.PI;
      } else {
        deltaAngle = Math.PI * 2;
      }

      const orbitRadius = 80 + Math.sin(elapsed * 2.8) * curBreathAmp;
      const separation = Math.abs(Math.sin(deltaAngle));
      const voicePulse = Math.sin(elapsed * 7.5) * curPulseAmp;
      // Conservation of mass: unified single ball is fuller (13.2), splits cleanly into two balanced spheres (10.2)
      const ballRadius = Math.max(8.8, 13.2 - 3.0 * Math.pow(separation, 0.65) + voicePulse);

      const angle1 = baseAngle + deltaAngle;
      const angle2 = baseAngle - deltaAngle;

      const x1 = Math.cos(angle1) * orbitRadius;
      const y1 = Math.sin(angle1) * orbitRadius;
      const x2 = Math.cos(angle2) * orbitRadius;
      const y2 = Math.sin(angle2) * orbitRadius;

      if (ball1Ref.current) {
        ball1Ref.current.setAttribute('cx', x1.toFixed(2));
        ball1Ref.current.setAttribute('cy', y1.toFixed(2));
        ball1Ref.current.setAttribute('r', ballRadius.toFixed(2));
      }
      if (ball2Ref.current) {
        ball2Ref.current.setAttribute('cx', x2.toFixed(2));
        ball2Ref.current.setAttribute('cy', y2.toFixed(2));
        ball2Ref.current.setAttribute('r', ballRadius.toFixed(2));
      }
      if (centerGroupRef.current) {
        const floatY = Math.sin(elapsed * 1.8) * 2.0;
        const centerScale =
          statusRef.current === 'speaking'
            ? 1 + Math.sin(elapsed * 6.0) * 0.022
            : 1 + Math.sin(elapsed * 1.8) * 0.008;
        centerGroupRef.current.setAttribute(
          'transform',
          `translate(0 ${floatY.toFixed(2)}) scale(${centerScale.toFixed(4)})`
        );
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <svg
      viewBox="-140 -140 280 280"
      className={`${className} overflow-visible select-none pointer-events-none text-[#1F1E1B] dark:text-[#F0ECE1]`}
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
          <feGaussianBlur in="SourceGraphic" stdDeviation="5.8" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>

      {/* Pure Liquid Black Ball Split -> Dual Orbit Around N & B -> Merge (Zero Rings, Zero Orange Glow) */}
      <g filter={`url(#${gooFilterId})`}>
        <circle ref={ball1Ref} cx="-44.7" cy="-66.3" r="13.2" fill="currentColor" />
        <circle ref={ball2Ref} cx="-44.7" cy="-66.3" r="13.2" fill="currentColor" />
      </g>

      {/* Crisp Central NB Monogram — Pure Spotless Background */}
      <g ref={centerGroupRef}>
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
