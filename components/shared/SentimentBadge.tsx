'use client';

import { MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import type { SentimentData } from '@/types';
import {
  getSentimentColor,
  getSentimentBgColor,
  getSentimentLabel,
  getSentimentEmoji,
  formatMentionCount,
} from '@/lib/sentiment';

interface SentimentBadgeProps {
  sentiment: SentimentData | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showMentions?: boolean;
  className?: string;
}

export default function SentimentBadge({
  sentiment,
  size = 'md',
  showMentions = true,
  className,
}: SentimentBadgeProps) {
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const label = getSentimentLabel(sentiment);
  const emoji = getSentimentEmoji(sentiment);
  const bgColor = getSentimentBgColor(sentiment);
  const textColor = getSentimentColor(sentiment);

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        bgColor,
        textColor,
        sizes[size],
        className
      )}
    >
      <span>{emoji}</span>
      <span>{label}</span>
      {showMentions && sentiment && sentiment.mentionCount > 0 && (
        <span className="flex items-center gap-0.5 opacity-75">
          <MessageCircle className="w-3 h-3" />
          <span className="text-xs">{formatMentionCount(sentiment.mentionCount)}</span>
        </span>
      )}
    </div>
  );
}
