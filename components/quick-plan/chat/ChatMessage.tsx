'use client';

import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import SnooAgent, { TypingIndicator } from './SnooAgent';
import type { ChatMessage as ChatMessageType, RedditEvidence, SnooState } from '@/types/quick-plan';

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest?: boolean;
  showTyping?: boolean;
}

export default function ChatMessage({ message, isLatest = false, showTyping = false }: ChatMessageProps) {
  const isSnoo = message.type === 'snoo';
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${isSystem ? 'justify-center' : ''}`}
    >
      {/* Avatar */}
      {isSnoo && (
        <div className="flex-shrink-0">
          <SnooAgent
            state={showTyping ? 'typing' : (message.snooState || 'idle')}
            size="sm"
            showLabel={false}
          />
        </div>
      )}

      {/* User avatar - simpler circle without text to avoid confusion */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30" />
      )}

      {/* Message content */}
      <div className={`flex-1 max-w-[75%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block px-4 py-3 rounded-2xl break-words ${
            isSnoo
              ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              : isUser
              ? 'bg-orange-500 text-white max-w-full'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm'
          }`}
        >
          {showTyping && isLatest ? (
            <TypingIndicator />
          ) : (
            <>
              {/* Message text */}
              <p className="whitespace-pre-wrap">{message.content}</p>

              {/* Reddit evidence */}
              {message.evidence && message.evidence.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                    From Reddit:
                  </p>
                  <div className="space-y-2">
                    {message.evidence.slice(0, 3).map((ev, idx) => (
                      <EvidenceChip key={idx} evidence={ev} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Timestamp - only shown on hover */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

// Evidence chip component
function EvidenceChip({ evidence }: { evidence: RedditEvidence }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-orange-500 font-medium">r/{evidence.subreddit}</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500 dark:text-slate-400">{evidence.upvotes} upvotes</span>
        {evidence.postUrl && (
          <a
            href={evidence.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 ml-auto"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      {evidence.quote && (
        <p className="text-slate-600 dark:text-slate-300 italic line-clamp-2">
          "{evidence.quote}"
        </p>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Snoo message bubble with optional structured content
interface SnooMessageProps {
  content: string;
  snooState?: SnooState;
  evidence?: RedditEvidence[];
  showTyping?: boolean;
  children?: React.ReactNode; // For reply card
}

export function SnooMessage({ content, snooState = 'idle', evidence, showTyping, children }: SnooMessageProps) {
  return (
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex gap-3"
      >
        <div className="flex-shrink-0">
          <SnooAgent
            state={showTyping ? 'typing' : snooState}
            size="sm"
            showLabel={false}
          />
        </div>

        <div className="flex-1 max-w-[80%]">
          <div className="inline-block px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
            {showTyping ? (
              <TypingIndicator />
            ) : (
              <>
                <p className="whitespace-pre-wrap">{content}</p>

                {evidence && evidence.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                      From Reddit:
                    </p>
                    <div className="space-y-2">
                      {evidence.slice(0, 3).map((ev, idx) => (
                        <EvidenceChip key={idx} evidence={ev} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Reply card slot */}
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="ml-13 pl-[52px]"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

// User response bubble
interface UserResponseProps {
  content: string;
}

export function UserResponse({ content }: UserResponseProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3 flex-row-reverse"
    >
      {/* Simple avatar indicator */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30" />

      <div className="flex-1 max-w-[75%] text-right">
        <div className="inline-block px-4 py-3 rounded-2xl bg-orange-500 text-white break-words max-w-full">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </motion.div>
  );
}
