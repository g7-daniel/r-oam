'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import SnooAgent, { TypingIndicator } from './SnooAgent';
import type { SnooChatMessage as ChatMessageType, RedditEvidence, SnooState } from '@/types/quick-plan';

// PHASE 6 FIX: Simple markdown renderer for chat messages
// Handles **bold**, *italic*, and line breaks without external dependencies
function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for **bold**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for *italic*
    const italicMatch = remaining.match(/^\*(.+?)\*/);
    if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Find next markdown marker or end of string
    const nextBold = remaining.indexOf('**');
    const nextItalic = remaining.indexOf('*');
    let nextMarker = remaining.length;

    if (nextBold > 0) nextMarker = Math.min(nextMarker, nextBold);
    if (nextItalic > 0) nextMarker = Math.min(nextMarker, nextItalic);

    // Add plain text up to next marker
    if (nextMarker > 0) {
      parts.push(remaining.slice(0, nextMarker));
      remaining = remaining.slice(nextMarker);
    } else {
      // No more markers, add remaining text
      parts.push(remaining);
      break;
    }
  }

  return parts;
}

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest?: boolean;
  showTyping?: boolean;
}

export default function ChatMessage({ message, isLatest = false, showTyping = false }: ChatMessageProps) {
  const prefersReducedMotion = useReducedMotion();
  const isSnoo = message.type === 'snoo';
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group flex gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${isSystem ? 'justify-center' : ''}`}
    >
      {/* Avatar */}
      {isSnoo && (
        <div className="flex-shrink-0 self-end mb-1">
          <SnooAgent
            state={showTyping ? 'typing' : (message.snooState || 'idle')}
            size="sm"
            showLabel={false}
          />
        </div>
      )}

      {/* User avatar - aligned to bottom of bubble for natural chat feel */}
      {isUser && (
        <div className="flex-shrink-0 self-end mb-1 w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 shadow-sm ring-2 ring-white dark:ring-slate-900" role="img" aria-label="Your message" />
      )}

      {/* Message content - responsive width */}
      <div className={`min-w-0 max-w-[85%] sm:max-w-[75%] ${isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
        <div
          className={`px-4 py-3 break-words ${
            isSnoo
              ? 'rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
              : isUser
              ? message.content === '(Skipped)'
                ? 'rounded-2xl rounded-br-md bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 italic text-sm'
                : 'rounded-2xl rounded-br-md bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-sm shadow-orange-500/20'
              : 'rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm'
          }`}
        >
          {showTyping && isLatest ? (
            <TypingIndicator />
          ) : (
            <>
              {/* Message text with markdown support - responsive text size */}
              <p className="whitespace-pre-wrap text-[15px] sm:text-base leading-relaxed break-words [overflow-wrap:anywhere]">{renderMarkdown(message.content)}</p>

              {/* Reddit evidence */}
              {message.evidence && message.evidence.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-600/80">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5 font-semibold uppercase tracking-wide">
                    From Reddit
                  </p>
                  <div className="space-y-2.5">
                    {message.evidence.slice(0, 3).map((ev, idx) => (
                      <EvidenceChip key={idx} evidence={ev} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Timestamp - visible on mobile, hover-enhanced on desktop */}
        <p className={`text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 px-2 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 select-none ${isUser ? 'text-right' : 'text-left'}`}>
          <time dateTime={new Date(message.timestamp).toISOString()}>{formatTime(message.timestamp)}</time>
        </p>
      </div>
    </motion.div>
  );
}

// Evidence chip component
function EvidenceChip({ evidence }: { evidence: RedditEvidence }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-xs border border-slate-100 dark:border-slate-600 hover:border-slate-200 dark:hover:border-slate-500 transition-colors duration-150" role="article" aria-label={`Reddit post from r/${evidence.subreddit}`}>
      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-1.5">
        <span className="text-orange-500 dark:text-orange-400 font-semibold">r/{evidence.subreddit}</span>
        <span className="text-slate-300 dark:text-slate-500 hidden sm:inline" aria-hidden="true">&middot;</span>
        <span className="text-slate-500 dark:text-slate-400 font-medium">{evidence.upvotes} upvotes</span>
        {evidence.postUrl && (
          <a
            href={evidence.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 ml-auto min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-md transition-colors duration-150"
            aria-label={`View original post on Reddit (opens in new tab)`}
          >
            <ExternalLink className="w-4 h-4 sm:w-3 sm:h-3" aria-hidden="true" />
          </a>
        )}
      </div>
      {evidence.quote && (
        <blockquote className="text-slate-600 dark:text-slate-300 italic line-clamp-2 text-xs sm:text-sm leading-relaxed mt-1.5 pl-2.5 border-l-2 border-orange-300 dark:border-orange-600">
          &ldquo;{evidence.quote}&rdquo;
        </blockquote>
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
    <div className="space-y-3 sm:space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex gap-2.5 sm:gap-3.5"
      >
        <div className="flex-shrink-0 self-end mb-1">
          <SnooAgent
            state={showTyping ? 'typing' : snooState}
            size="sm"
            showLabel={false}
          />
        </div>

        <div className="min-w-0 max-w-[85%] sm:max-w-[80%]">
          <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-sm">
            {showTyping ? (
              <TypingIndicator />
            ) : (
              <>
                <p className="whitespace-pre-wrap text-[15px] sm:text-base leading-relaxed break-words [overflow-wrap:anywhere]">{renderMarkdown(content)}</p>

                {evidence && evidence.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-600/80">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5 font-semibold uppercase tracking-wide">
                      From Reddit
                    </p>
                    <div className="space-y-2.5">
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

      {/* Reply card slot - responsive left margin matching avatar + gap */}
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
          className="ml-[50px] sm:ml-[54px]"
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-2.5 sm:gap-3.5 flex-row-reverse"
    >
      {/* Simple avatar indicator - aligned to bottom */}
      <div className="flex-shrink-0 self-end mb-1 w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 shadow-sm ring-2 ring-white dark:ring-slate-900" role="img" aria-label="Your message" />

      <div className="min-w-0 max-w-[85%] sm:max-w-[75%] flex flex-col items-end">
        <div className="px-4 py-3 rounded-2xl rounded-br-md bg-gradient-to-r from-orange-500 to-orange-400 text-white break-words shadow-sm shadow-orange-500/20">
          <p className="whitespace-pre-wrap text-[15px] sm:text-base leading-relaxed break-words [overflow-wrap:anywhere]">{renderMarkdown(content)}</p>
        </div>
      </div>
    </motion.div>
  );
}
