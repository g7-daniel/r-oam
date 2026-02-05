'use client';

/**
 * FIX 4.12: Progress Indicator for Quick Plan
 * Shows users where they are in the planning process
 */

import { motion } from 'framer-motion';
import { Check, Circle } from 'lucide-react';

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

  return (
    <div className={`flex items-center justify-between px-2 ${className}`}>
      {PHASES.map((phase, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={phase.id} className="flex items-center flex-1">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <motion.div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                  transition-colors duration-300
                  ${isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-400'
                  }
                `}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: isCurrent ? Infinity : 0, repeatDelay: 1 }}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : isCurrent ? (
                  <span className="text-xs font-bold">{index + 1}</span>
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </motion.div>
              <span
                className={`
                  text-[10px] mt-1 text-center whitespace-nowrap
                  ${isComplete || isCurrent
                    ? 'text-slate-700 dark:text-slate-300 font-medium'
                    : 'text-slate-400 dark:text-slate-400'
                  }
                `}
              >
                <span className="hidden sm:inline">{phase.label}</span>
                <span className="sm:hidden">{phase.shortLabel}</span>
              </span>
            </div>

            {/* Connector line (except for last item) */}
            {index < PHASES.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 rounded">
                <motion.div
                  className="h-full rounded"
                  initial={{ width: 0 }}
                  animate={{
                    width: isComplete ? '100%' : '0%',
                    backgroundColor: isComplete
                      ? 'rgb(34 197 94)' // green-500
                      : 'rgb(226 232 240)', // slate-200
                  }}
                  transition={{ duration: 0.5 }}
                  style={{
                    backgroundColor: isComplete
                      ? 'rgb(34 197 94)'
                      : isCurrent
                      ? 'rgb(249 115 22)' // orange-500
                      : 'rgb(226 232 240)',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact version for mobile or narrow spaces
 */
export function ProgressIndicatorCompact({ currentPhase, className = '' }: ProgressIndicatorProps) {
  const currentIndex = getPhaseIndex(currentPhase);
  const currentLabel = PHASES[currentIndex]?.label || 'Planning';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex gap-1">
        {PHASES.map((phase, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <motion.div
              key={phase.id}
              className={`
                w-2 h-2 rounded-full
                ${isComplete
                  ? 'bg-green-500'
                  : isCurrent
                  ? 'bg-orange-500'
                  : 'bg-slate-300 dark:bg-slate-600'
                }
              `}
              animate={isCurrent ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 1, repeat: isCurrent ? Infinity : 0, repeatDelay: 1 }}
            />
          );
        })}
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {currentLabel}
      </span>
    </div>
  );
}
