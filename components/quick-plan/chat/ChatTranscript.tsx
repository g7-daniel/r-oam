'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ChatMessage from './ChatMessage';
import SnooAgent from './SnooAgent';
import type { SnooChatMessage as ChatMessageType } from '@/types/quick-plan';

interface ChatTranscriptProps {
  messages: ChatMessageType[];
  isTyping?: boolean;
  className?: string;
}

export default function ChatTranscript({ messages, isTyping = false, className = '' }: ChatTranscriptProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Auto-scroll to bottom when new messages arrive
  // Parent container handles primary scrolling, this provides a backup mechanism
  useEffect(() => {
    if (endRef.current && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
      });
    }
  }, [messages.length, isTyping]);

  return (
    <div
      className={`px-3 sm:px-5 py-5 sm:py-6 space-y-4 sm:space-y-5 ${className}`}
      role="log"
      aria-label="Chat messages"
    >
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLatest={index === messages.length - 1}
            showTyping={isTyping && index === messages.length - 1 && message.type === 'snoo'}
          />
        ))}
      </AnimatePresence>

      {/* Typing indicator when waiting for Snoo - shows Snoo avatar for visual consistency */}
      <AnimatePresence>
        {isTyping && (messages.length === 0 || messages[messages.length - 1]?.type !== 'snoo') && (
          <motion.div
            key="typing-indicator"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex gap-2.5 sm:gap-3 items-end"
          >
            <div className="flex-shrink-0 self-end mb-1">
              <SnooAgent state="typing" size="sm" showLabel={false} />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm" role="status" aria-label="Snoo is typing">
              <div className="flex gap-1.5 items-center min-h-[20px]" aria-hidden="true">
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
              <span className="sr-only">Snoo is typing a response</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll anchor with padding to prevent last message from being clipped */}
      <div ref={endRef} className="h-2 shrink-0" aria-hidden="true" />
    </div>
  );
}

// Empty state for when there are no messages yet
export function EmptyTranscript() {
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-center max-w-md"
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-5 bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/30 rounded-full flex items-center justify-center shadow-sm ring-1 ring-orange-200/50 dark:ring-orange-700/50">
          <svg
            viewBox="0 0 100 100"
            className="w-14 h-14 sm:w-16 sm:h-16"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Snoo the mascot"
          >
            {/* Simplified Snoo head */}
            <circle cx="50" cy="55" r="35" fill="#FF4500" />
            <ellipse cx="50" cy="60" rx="25" ry="22" fill="white" />
            <circle cx="40" cy="55" r="5" fill="#1a1a1a" />
            <circle cx="60" cy="55" r="5" fill="#1a1a1a" />
            {/* Eye highlights */}
            <circle cx="42" cy="53" r="1.5" fill="white" />
            <circle cx="62" cy="53" r="1.5" fill="white" />
            <ellipse cx="50" cy="70" rx="6" ry="4" fill="#1a1a1a" />
          </svg>
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Welcome to Quick Plan!
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
          I&apos;m Snoo, your AI travel buddy. Let&apos;s plan an amazing trip together!
        </p>
      </motion.div>
    </div>
  );
}

// Conversation phase divider
interface PhaseDividerProps {
  phase: string;
}

export function PhaseDivider({ phase }: PhaseDividerProps) {
  const phaseLabels: Record<string, string> = {
    gathering: 'Getting to know your trip',
    enriching: 'Researching options',
    generating: 'Building your itinerary',
    reviewing: 'Final review',
    satisfied: 'Trip complete',
  };

  return (
    <div className="flex items-center gap-3 sm:gap-4 py-4 sm:py-5 my-1 sm:my-2" role="separator" aria-label={phaseLabels[phase] || phase}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-600" aria-hidden="true" />
      <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-full border border-slate-100 dark:border-slate-700 whitespace-nowrap">
        {phaseLabels[phase] || phase}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-600" aria-hidden="true" />
    </div>
  );
}
