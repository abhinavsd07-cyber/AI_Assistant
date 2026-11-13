import React, { useId } from 'react';

export type NebulaLogoExpression = 'normal' | 'idle' | 'listening' | 'thinking' | 'speaking';

interface NebulaLogoProps {
  className?: string;
  expression?: NebulaLogoExpression;
  title?: string;
}

/**
 * Clean, background-free vector Polar Bear Nebula brand mark.
 * Renders via an alpha mask so eyes, inner ears, nose, and expressions stay
 * truly transparent on any light or dark surface using `currentColor`.
 */
export const NebulaLogo: React.FC<NebulaLogoProps> = ({
  className = 'w-8 h-8 text-[#0F172A] dark:text-white',
  expression = 'normal',
  title = 'Nebula AI',
}) => {
  const uid = useId().replace(/:/g, '');
  const maskId = `nebula-bear-${uid}`;

  const isSmiley = expression === 'listening' || expression === 'speaking';
  const isSpeaking = expression === 'speaking';
  const isThinking = expression === 'thinking';

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <mask id={maskId}>
          <rect width="100" height="100" fill="black" />
          {/* Bear head & rounded ears outer silhouette */}
          <path
            fill="white"
            d="M 50 12.6
              C 41.2 12.6, 34.4 15.1, 29.6 18.1
              A 10.7 10.7 0 1 0 11.4 31.8
              C 9.6 35.4, 9.1 38.0, 9.1 41.5
              C 9.1 49.0, 10.4 58.5, 11.9 65.5
              C 12.6 68.9, 14.3 71.2, 18.6 74.3
              C 28.5 81.2, 40.5 87.2, 46.6 88.1
              C 48.9 88.5, 51.1 88.5, 53.4 88.1
              C 59.5 87.2, 71.5 81.2, 81.4 74.3
              C 85.7 71.2, 87.4 68.9, 88.1 65.5
              C 89.6 58.5, 90.9 49.0, 90.9 41.5
              C 90.9 38.0, 90.4 35.4, 88.6 31.8
              A 10.7 10.7 0 1 0 70.4 18.1
              C 65.6 15.1, 58.8 12.6, 50 12.6 Z"
          />

          {/* Ear inner crescent cutouts */}
          <path
            fill="black"
            d="M 15.7 28.0 A 5.65 5.65 0 1 1 24.3 20.6 C 21.8 22.8, 18.5 25.3, 15.7 28.0 Z"
          />
          <path
            fill="black"
            d="M 84.3 28.0 A 5.65 5.65 0 1 0 75.7 20.6 C 78.2 22.8, 81.5 25.3, 84.3 28.0 Z"
          />

          {/* Eyes: joyful arched smiley eyes when recording/speaking */}
          {isSmiley ? (
            <>
              <path
                stroke="black"
                strokeWidth="3.3"
                strokeLinecap="round"
                fill="none"
                d="M 28.4 42.6 Q 33.3 35.8, 38.2 42.6"
              />
              <path
                stroke="black"
                strokeWidth="3.3"
                strokeLinecap="round"
                fill="none"
                d="M 61.8 42.6 Q 66.7 35.8, 71.6 42.6"
              />
            </>
          ) : (
            <>
              <circle cx="33.3" cy="41.3" r="4.5" fill="black" />
              <circle
                cx="66.7"
                cy={isThinking ? 40.4 : 41.3}
                r={isThinking ? 4.1 : 4.5}
                fill="black"
              />
            </>
          )}

          {/* Classic rounded inverted-triangle bear nose */}
          <path
            fill="black"
            d="M 50 51.8
              C 45.0 51.8, 43.2 52.7, 43.2 54.4
              C 43.2 56.6, 47.4 60.5, 50 60.5
              C 52.6 60.5, 56.8 56.6, 56.8 54.4
              C 56.8 52.7, 55.0 51.8, 50 51.8 Z"
          />

          {/* Mouth: joyful smiley grin when recording/speaking, classic :3 otherwise */}
          {isSmiley ? (
            <path
              fill="black"
              className={isSpeaking ? 'nebula-bear-mouth-talk' : ''}
              d="M 38.2 62.6 C 42.0 64.5, 58.0 64.5, 61.8 62.6 C 60.4 73.4, 39.6 73.4, 38.2 62.6 Z"
            />
          ) : isThinking ? (
            <path
              stroke="black"
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
              d="M 44.5 64.8 Q 50.5 66.6, 56.0 63.4"
            />
          ) : (
            <path
              stroke="black"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              d="M 50 59.5 L 50 63.9 M 41.1 63.3 C 42.3 66.8, 47.7 67.1, 50 63.9 C 52.3 67.1, 57.7 66.8, 58.9 63.3"
            />
          )}
        </mask>
      </defs>

      <rect width="100" height="100" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
};

export default NebulaLogo;
