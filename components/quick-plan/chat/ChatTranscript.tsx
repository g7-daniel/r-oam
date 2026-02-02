'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/types/quick-plan';

interface ChatTranscriptProps {
  messages: ChatMessageType[];
  isTyping?: boolean;
  className?: string;
}

export default function ChatTranscript({ messages, isTyping = false, className = '' }: ChatTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isTyping]);

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto px-4 py-6 space-y-4 ${className}`}
    >
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLatest={index === messages.length - 1}
            showTyping={isTyping && index === messages.length - 1 && message.type === 'snoo'}
          />
        ))}
      </AnimatePresence>

      {/* Typing indicator when waiting for Snoo */}
      {isTyping && (messages.length === 0 || messages[messages.length - 1]?.type !== 'snoo') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex gap-3"
        >
          <div className="flex-shrink-0 w-10 h-10" />
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-orange-400 rounded-full"
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Scroll anchor */}
      <div ref={endRef} />
    </div>
  );
}

// Empty state for when there are no messages yet
export function EmptyTranscript() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-24 h-24 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-16 h-16"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Simplified Snoo head */}
            <circle cx="50" cy="55" r="35" fill="#FF4500" />
            <ellipse cx="50" cy="60" rx="25" ry="22" fill="white" />
            <circle cx="40" cy="55" r="5" fill="#1a1a1a" />
            <circle cx="60" cy="55" r="5" fill="#1a1a1a" />
            <ellipse cx="50" cy="70" rx="6" ry="4" fill="#1a1a1a" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Welcome to Quick Plan!
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          I'm Snoo, your AI travel buddy. Let's plan an amazing trip together!
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
  };

  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
        {phaseLabels[phase] || phase}
      </span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}
