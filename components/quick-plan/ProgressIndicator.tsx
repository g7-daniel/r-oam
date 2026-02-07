'use client';

/**
 * FIX 4.12: Progress Indicator for Quick Plan
 * Shows users where they are in the planning process
 *
 * UX-R1 audit fixes:
 * - Added aria-live region for screen reader phase change announcements
 * - Added aria-current="step" on the active step
 * - Replaced role="progressbar" with proper list semantics (ol/li) for stepper pattern
 * - Added prefers-reduced-motion support for Framer Motion animations
 * - Fixed last step flex-1 causing uneven spacing (only flex-1 on items with connectors)
 * - Improved future step visual clarity with step number instead of ambiguous circle icon
 * - Added sr-only text for completed/current/upcoming step states
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

export type PlanningPhase = 'gathering' | 'enriching' | 'generating' | 'reviewing' | 'satisfied';

interface ProgressIndicatorProps {
  currentPhase: PlanningPhase;
  className?: string;
}

const PHASES: { id: PlanningPhase; label: string; shortLabel: string }[] = [
  { id: 'gathering', label: 'Gathering Preferences', shortLabel: 'Preferences' },
  { id: 'enriching', label: 'Finding Options', shortLabel: 'Options' },
  { id: 'generating', label: 'Building Itinerary', shortLabel: 'Itinerary' },
  { id: 'reviewing', label: 'Review & Adjust', shortLabel: 'Review' },
  { id: 'satisfied', label: 'Ready!', shortLabel: 'Done' },
];

function getPhaseIndex(phase: PlanningPhase): number {
  return PHASES.findIndex(p => p.id === phase);
}

export default function ProgressIndicator({ currentPhase, className = '' }: ProgressIndicatorProps) {
  const currentIndex = getPhaseIndex(currentPhase);
  const prefersReducedMotion = useReducedMotion();
  const prevPhaseRef = useRef(currentPhase);
  const [phaseAnnouncement, setPhaseAnnouncement] = useState('');

  // Announce phase changes to screen readers
  useEffect(() => {
    if (prevPhaseRef.current !== currentPhase) {
      prevPhaseRef.current = currentPhase;
      const label = PHASES[currentIndex]?.label || 'Planning';
      setPhaseAnnouncement(`Step ${currentIndex + 1} of ${PHASES.length}: ${label}`);
    }
  }, [currentPhase, currentIndex]);

  return (
    <nav aria-label={`Planning progress: step ${currentIndex + 1} of ${PHASES.length}`} className={className}>
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {phaseAnnouncement}
      </div>
      <ol className="flex items-center justify-between px-2" role="list">
        {PHASES.map((phase, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const hasConnector = index < PHASES.length - 1;

          return (
            <li
              key={phase.id}
              className={`flex items-center ${hasConnector ? 'flex-1' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <motion.div
                  className={`
                    w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium
                    transition-colors duration-300
                    ${isComplete
                      ? 'bg-green-500 text-white shadow-sm shadow-green-500/25'
                      : isCurrent
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25 ring-2 ring-orange-200 dark:ring-orange-900/50'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }
                  `}
                  animate={isCurrent && !prefersReducedMotion ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 2, repeat: isCurrent && !prefersReducedMotion ? Infinity : 0, repeatDelay: 1.5, ease: 'easeInOut' }}
                  aria-hidden="true"
                >
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </motion.div>
                <span
                  className={`
                    text-[10px] mt-1.5 text-center whitespace-nowrap leading-tight
                    ${isComplete
                      ? 'text-green-600 dark:text-green-400 font-medium'
                      : isCurrent
                      ? 'text-slate-700 dark:text-slate-200 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                    }
                  `}
                >
                  <span className="hidden sm:inline">{phase.label}</span>
                  <span className="sm:hidden">{phase.shortLabel}</span>
                  {/* Screen reader status */}
                  <span className="sr-only">
                    {isComplete ? ' (completed)' : isCurrent ? ' (current step)' : ' (upcoming)'}
                  </span>
                </span>
              </div>

              {/* Connector line (except for last item) - now with visible track */}
              {hasConnector && (
                <div className="flex-1 h-0.5 mx-1.5 sm:mx-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" aria-hidden="true">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: isComplete ? '100%' : isCurrent ? '50%' : '0%',
                      backgroundColor: isComplete
                        ? 'rgb(34 197 94)' // green-500
                        : 'rgb(249 115 22)', // orange-500
                    }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Compact version for mobile or narrow spaces
 */
export function ProgressIndicatorCompact({ currentPhase, className = '' }: ProgressIndicatorProps) {
  const currentIndex = getPhaseIndex(currentPhase);
  const currentLabel = PHASES[currentIndex]?.label || 'Planning';
  const progress = PHASES.length > 0 ? Math.round(((currentIndex) / (PHASES.length - 1)) * 100) : 0;
  const prefersReducedMotion = useReducedMotion();
  const prevPhaseRef = useRef(currentPhase);
  const [phaseAnnouncement, setPhaseAnnouncement] = useState('');

  // Announce phase changes to screen readers
  useEffect(() => {
    if (prevPhaseRef.current !== currentPhase) {
      prevPhaseRef.current = currentPhase;
      setPhaseAnnouncement(`Progress: ${progress}% - ${currentLabel}`);
    }
  }, [currentPhase, currentLabel, progress]);

  return (
    <div className={`flex items-center gap-2.5 ${className}`} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Planning progress: ${currentLabel}`}>
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {phaseAnnouncement}
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {PHASES.map((phase, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <motion.div
              key={phase.id}
              className={`
                rounded-full transition-colors duration-300
                ${isComplete
                  ? 'w-2.5 h-2.5 bg-green-500'
                  : isCurrent
                  ? 'w-2.5 h-2.5 bg-orange-500 ring-2 ring-orange-200 dark:ring-orange-900/50'
                  : 'w-2 h-2 bg-slate-300 dark:bg-slate-600'
                }
              `}
              animate={isCurrent && !prefersReducedMotion ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 2, repeat: isCurrent && !prefersReducedMotion ? Infinity : 0, repeatDelay: 2, ease: 'easeInOut' }}
            />
          );
        })}
      </div>
      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
        {currentLabel}
      </span>
    </div>
  );
}
