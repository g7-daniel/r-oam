'use client';

/**
 * LoadingMessage Component
 * Displays contextual loading messages during async operations
 * Shows users exactly what's happening during long loads
 *
 * UX-R1 audit fixes:
 * - Added role="status" and aria-live="polite" to main LoadingMessage for screen reader announcements
 * - Added ARIA attributes to progress bars (role="progressbar", aria-valuenow, etc.)
 * - Added prefers-reduced-motion support for Framer Motion pulse animations
 * - Added sr-only text in RotatingMessage so screen readers get message updates
 * - Added aria-live to MultiStepLoading for step status changes
 * - Improved skeleton animation delay to use proper staggered approach
 */

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Loading message configurations for different operations
export type LoadingOperation =
  | 'areas'
  | 'hotels'
  | 'restaurants'
  | 'experiences'
  | 'reddit'
  | 'itinerary'
  | 'pricing'
  | 'general';

interface LoadingConfig {
  icon: string;
  messages: string[];
  color: string;
}

const LOADING_CONFIGS: Record<LoadingOperation, LoadingConfig> = {
  areas: {
    icon: '🗺️',
    messages: [
      'Discovering the best areas...',
      'Analyzing neighborhood vibes...',
      'Finding hidden gems...',
    ],
    color: '#3b82f6',
  },
  hotels: {
    icon: '🏨',
    messages: [
      'Searching for hotels...',
      'Finding the best stays...',
      'Checking availability...',
    ],
    color: '#a855f7',
  },
  restaurants: {
    icon: '🍽️',
    messages: [
      'Finding restaurants...',
      'Discovering local favorites...',
      'Checking top-rated spots...',
    ],
    color: '#f97316',
  },
  experiences: {
    icon: '🎯',
    messages: [
      'Finding experiences...',
      'Searching for activities...',
      'Discovering adventures...',
    ],
    color: '#22c55e',
  },
  reddit: {
    icon: '🔍',
    messages: [
      'Searching Reddit for tips...',
      'Finding traveler insights...',
      'Reading local recommendations...',
    ],
    color: '#ea580c',
  },
  itinerary: {
    icon: '📅',
    messages: [
      'Building your itinerary...',
      'Optimizing your schedule...',
      'Creating your perfect trip...',
    ],
    color: '#f59e0b',
  },
  pricing: {
    icon: '💰',
    messages: [
      'Checking real-time prices...',
      'Finding the best deals...',
      'Comparing rates...',
    ],
    color: '#10b981',
  },
  general: {
    icon: '⏳',
    messages: [
      'Loading...',
      'Just a moment...',
      'Almost there...',
    ],
    color: '#64748b',
  },
};

interface LoadingMessageProps {
  operation: LoadingOperation;
  customMessage?: string;
  showProgress?: boolean;
  progress?: number; // 0-100
  className?: string;
}

export default function LoadingMessage({
  operation,
  customMessage,
  showProgress = false,
  progress = 0,
  className = '',
}: LoadingMessageProps) {
  const config = LOADING_CONFIGS[operation];
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Icon with pulse animation */}
      <div className="relative flex-shrink-0 w-9 h-9 flex items-center justify-center" aria-hidden="true">
        <span className="text-2xl relative z-10">{config.icon}</span>
        {!prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: config.color }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Message and progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: config.color }} aria-hidden="true" />
          <RotatingMessage
            messages={customMessage ? [customMessage] : config.messages}
          />
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div
            className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Loading progress: ${Math.round(progress)}%`}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Rotating message that cycles through messages
 * Includes sr-only live region so screen readers are informed of message changes
 */
function RotatingMessage({ messages }: { messages: string[] }) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (messages.length <= 1) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <span className="inline-flex overflow-hidden">
      {/* Screen reader text for message changes (announced by parent role="status") */}
      <span className="sr-only">
        {messages[index]}
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
          aria-hidden="true"
        >
          {messages[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// React is imported at the top of the file

/**
 * Inline loading indicator for smaller contexts
 */
export function LoadingIndicatorInline({
  message,
  className = '',
}: {
  message: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`} role="status" aria-label={message}>
      <Loader2 className="w-4 h-4 animate-spin text-orange-500" aria-hidden="true" />
      <span className="text-sm text-slate-600 dark:text-slate-400">{message}</span>
    </div>
  );
}

/**
 * Contextual loading indicator that shows what's currently being loaded
 * Use this in the main chat area to show users what's happening
 */
export function ContextualLoadingIndicator({
  operations,
  className = '',
}: {
  operations: { key: LoadingOperation; label?: string; status: 'pending' | 'loading' | 'done' | 'error' }[];
  className?: string;
}) {
  const currentOperation = operations.find(op => op.status === 'loading');
  const completedCount = operations.filter(op => op.status === 'done').length;
  const totalCount = operations.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const prefersReducedMotion = useReducedMotion();

  if (!currentOperation) return null;

  const config = LOADING_CONFIGS[currentOperation.key];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading: ${currentOperation.label || config.messages[0]} - ${completedCount} of ${totalCount} complete`}
    >
      {/* Current operation */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <span className="text-2xl relative z-10">{config.icon}</span>
          {!prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: config.color }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: config.color }} aria-hidden="true" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
              {currentOperation.label || config.messages[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${completedCount} of ${totalCount} operations complete`}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Steps summary */}
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{completedCount} of {totalCount} complete</span>
        <span className="font-medium tabular-nums">{progress}%</span>
      </div>
    </motion.div>
  );
}

/**
 * Loading card that shows skeleton content while data loads
 */
export function LoadingCard({
  type,
  count = 3,
  className = '',
}: {
  type: 'hotel' | 'restaurant' | 'experience' | 'area' | 'itinerary';
  count?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const typeConfig = {
    hotel: {
      icon: '🏨',
      title: 'Finding hotels...',
      color: 'from-purple-500 to-indigo-500',
    },
    restaurant: {
      icon: '🍽️',
      title: 'Finding restaurants...',
      color: 'from-orange-500 to-amber-500',
    },
    experience: {
      icon: '🎯',
      title: 'Finding experiences...',
      color: 'from-green-500 to-emerald-500',
    },
    area: {
      icon: '🗺️',
      title: 'Discovering areas...',
      color: 'from-blue-500 to-cyan-500',
    },
    itinerary: {
      icon: '📅',
      title: 'Building your itinerary...',
      color: 'from-amber-500 to-orange-500',
    },
  };

  const config = typeConfig[type];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}
      role="status"
      aria-label={config.title}
    >
      {/* Header */}
      <div className={`p-4 bg-gradient-to-r ${config.color} text-white`}>
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">{config.icon}</span>
          <span className="font-medium">{config.title}</span>
          <Loader2 className="w-4 h-4 animate-spin ml-auto" aria-hidden="true" />
        </div>
      </div>

      {/* Skeleton cards */}
      <div className="p-4 space-y-3" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            className="flex gap-3"
            initial={{ opacity: prefersReducedMotion ? 0.6 : 0.4 }}
            animate={prefersReducedMotion ? { opacity: 0.6 } : { opacity: [0.4, 1, 0.4] }}
            transition={prefersReducedMotion ? {} : {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.2,
            }}
          >
            <div className="w-20 h-16 bg-slate-200 dark:bg-slate-700/70 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2 py-0.5">
              <div className="h-4 bg-slate-200 dark:bg-slate-700/70 rounded w-3/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700/70 rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-5 w-12 bg-slate-200 dark:bg-slate-700/70 rounded-full" />
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700/70 rounded-full" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/50" aria-hidden="true">
        <div className="h-10 bg-slate-200 dark:bg-slate-700/70 rounded-xl animate-pulse" />
      </div>
    </motion.div>
  );
}

/**
 * Loading dots animation
 */
export function LoadingDots({ className = '' }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <span className={`inline-flex gap-1 items-center ${className}`} role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 bg-orange-400 dark:bg-orange-500 rounded-full"
          animate={prefersReducedMotion ? {} : { y: [0, -4, 0] }}
          transition={prefersReducedMotion ? {} : {
            repeat: Infinity,
            duration: 0.7,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
}

/**
 * Multi-step loading indicator for showing progress through multiple operations
 */
interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'done' | 'error';
}

export function MultiStepLoading({
  steps,
  className = '',
}: {
  steps: LoadingStep[];
  className?: string;
}) {
  const completedCount = steps.filter(s => s.status === 'done').length;
  const currentStep = steps.find(s => s.status === 'loading');

  return (
    <div className={`space-y-2 ${className}`} role="status" aria-live="polite">
      {/* Screen reader summary */}
      <div className="sr-only">
        {currentStep
          ? `Loading ${currentStep.label}. ${completedCount} of ${steps.length} steps complete.`
          : `${completedCount} of ${steps.length} steps complete.`
        }
      </div>
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center" aria-hidden="true">
            {step.status === 'pending' && (
              <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full" />
            )}
            {step.status === 'loading' && (
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            )}
            {step.status === 'done' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
            )}
            {step.status === 'error' && (
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            )}
          </div>

          {/* Label */}
          <span
            className={`text-sm transition-colors duration-200 ${
              step.status === 'done'
                ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600'
                : step.status === 'loading'
                ? 'text-slate-800 dark:text-slate-200 font-medium'
                : step.status === 'error'
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {step.label}
            <span className="sr-only">
              {step.status === 'done' ? ' - complete' :
               step.status === 'loading' ? ' - loading' :
               step.status === 'error' ? ' - error' :
               ' - pending'}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton pulse animation for loading states
 */
export function SkeletonPulse({
  className = '',
  width,
  height,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
}) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}
      style={style}
    />
  );
}
