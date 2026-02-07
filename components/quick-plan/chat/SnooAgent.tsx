'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { SnooState } from '@/types/quick-plan';

interface SnooAgentProps {
  state: SnooState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Check for reduced motion preference
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// Animation variants for different states
const snooVariants = {
  idle: {
    scale: 1,
    rotate: 0,
    y: 0,
  },
  thinking: {
    scale: 1.02,
    rotate: [-2, 2, -2],
    transition: {
      rotate: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' as const },
      scale: { duration: 0.3 },
    },
  },
  typing: {
    scale: [1, 0.97, 1],
    transition: {
      scale: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' as const },
    },
  },
  celebrating: {
    scale: [1, 1.1, 1],
    y: [0, -8, 0],
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
  concerned: {
    rotate: -5,
    scale: 0.98,
    transition: { duration: 0.3 },
  },
};

// Reduced motion variants
const reducedMotionVariants = {
  idle: { opacity: 1 },
  thinking: { opacity: [1, 0.7, 1], transition: { repeat: Infinity, duration: 1.5 } },
  typing: { opacity: 1 },
  celebrating: { opacity: 1 },
  concerned: { opacity: 1 },
};

// Eye animation variants
const eyeVariants = {
  idle: {
    scaleY: 1,
  },
  thinking: {
    scaleY: [1, 0.1, 1],
    transition: { repeat: Infinity, duration: 3, repeatDelay: 1 },
  },
  typing: {
    scaleY: 1,
  },
  celebrating: {
    scaleY: [1, 0.1, 1, 0.1, 1],
    transition: { duration: 0.5 },
  },
  concerned: {
    scaleY: 0.7,
  },
};

// Antenna animation
const antennaVariants = {
  idle: {
    rotate: 0,
  },
  thinking: {
    rotate: [0, 15, -15, 0],
    transition: { repeat: Infinity, duration: 2 },
  },
  typing: {
    rotate: [0, 5, -5, 0],
    transition: { repeat: Infinity, duration: 0.5 },
  },
  celebrating: {
    rotate: [0, 30, -30, 0],
    transition: { duration: 0.5 },
  },
  concerned: {
    rotate: -10,
  },
};

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

const stateLabels: Record<SnooState, string> = {
  idle: '',
  thinking: 'Thinking...',
  typing: 'Typing...',
  celebrating: 'Done!',
  concerned: 'Hmm...',
};

export default function SnooAgent({ state, size = 'md', showLabel = true }: SnooAgentProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const variants = prefersReducedMotion ? reducedMotionVariants : snooVariants;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`relative ${sizeClasses[size]} overflow-visible`}
        variants={variants}
        animate={state}
        initial="idle"
      >
        {/* Snoo SVG */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Antenna */}
          <motion.g
            variants={prefersReducedMotion ? {} : antennaVariants}
            animate={state}
            style={{ transformOrigin: '50px 30px' }}
          >
            <line
              x1="50"
              y1="30"
              x2="50"
              y2="10"
              stroke="#FF4500"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="50" cy="8" r="5" fill="#FF4500" />
          </motion.g>

          {/* Head */}
          <circle
            cx="50"
            cy="55"
            r="35"
            fill="#FF4500"
            className="transition-colors"
          />

          {/* Ears */}
          <circle cx="20" cy="40" r="10" fill="#FF4500" />
          <circle cx="80" cy="40" r="10" fill="#FF4500" />

          {/* Face */}
          <ellipse cx="50" cy="60" rx="25" ry="22" fill="white" />

          {/* Eyes */}
          <motion.g
            variants={prefersReducedMotion ? {} : eyeVariants}
            animate={state}
          >
            <circle cx="40" cy="55" r="5" fill="#1a1a1a" />
            <circle cx="60" cy="55" r="5" fill="#1a1a1a" />
            {/* Eye highlights */}
            <circle cx="42" cy="53" r="1.5" fill="white" />
            <circle cx="62" cy="53" r="1.5" fill="white" />
          </motion.g>

          {/* Mouth - changes based on state */}
          {state === 'celebrating' ? (
            <path
              d="M 38 68 Q 50 78 62 68"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          ) : state === 'concerned' ? (
            <path
              d="M 38 72 Q 50 66 62 72"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <ellipse cx="50" cy="70" rx="6" ry="4" fill="#1a1a1a" />
          )}
        </svg>

        {/* Thinking dots */}
        <AnimatePresence>
          {state === 'thinking' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -right-1 -top-1 flex gap-0.5"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-orange-400 rounded-full"
                  animate={prefersReducedMotion ? {} : { y: [0, -4, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebration sparkles */}
        <AnimatePresence>
          {state === 'celebrating' && !prefersReducedMotion && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, (i % 2 ? 1 : -1) * 20],
                    y: [0, -20 - i * 5],
                  }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  style={{
                    left: '50%',
                    top: '20%',
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* State label */}
      {showLabel && stateLabels[state] && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-slate-500 dark:text-slate-400 font-medium"
        >
          {stateLabels[state]}
        </motion.span>
      )}
    </div>
  );
}

// Typing indicator component (can be used separately)
// Note: When used inside a chat bubble that already has padding, the indicator
// provides only minimal internal spacing to avoid double-padding.
export function TypingIndicator() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex gap-1.5 items-center min-h-[20px]" role="status" aria-label="Typing">
      <div className="flex gap-1.5 items-center" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-orange-400 dark:bg-orange-500 rounded-full"
            animate={prefersReducedMotion ? { opacity: [0.4, 1, 0.4] } : { y: [0, -5, 0] }}
            transition={{
              repeat: Infinity,
              duration: 0.7,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className="sr-only">Snoo is typing</span>
    </div>
  );
}
