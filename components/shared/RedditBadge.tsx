'use client';

import { MessageCircle } from 'lucide-react';
import clsx from 'clsx';

interface RedditBadgeProps {
  mentionCount?: number;
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

export default function RedditBadge({
  mentionCount,
  variant = 'default',
  className,
}: RedditBadgeProps) {
  if (variant === 'compact') {
    return (
      <div
        className={clsx(
          'flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium',
          className
        )}
        role="status"
        aria-label={mentionCount && mentionCount > 0 ? `Reddit recommended with ${mentionCount} mentions` : 'Reddit recommended'}
      >
        <span className="font-bold" aria-hidden="true">r/</span>
        {mentionCount && mentionCount > 0 && (
          <span aria-hidden="true">{mentionCount}</span>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 text-sm',
          className
        )}
        role="status"
        aria-label={mentionCount && mentionCount > 0 ? `Reddit recommended with ${mentionCount} mentions` : 'Reddit recommended'}
      >
        <span className="font-bold" aria-hidden="true">r/</span>
        <span aria-hidden="true">Recommended</span>
        {mentionCount && mentionCount > 0 && (
          <span className="text-orange-500 dark:text-orange-400" aria-hidden="true">({mentionCount})</span>
        )}
      </span>
    );
  }

  // Default variant
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-sm',
        className
      )}
      role="status"
      aria-label={mentionCount && mentionCount > 0 ? `Reddit recommended with ${mentionCount} mentions` : 'Reddit recommended'}
    >
      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center" aria-hidden="true">
        <span className="text-xs font-bold">r/</span>
      </div>
      <span className="text-sm font-medium" aria-hidden="true">Reddit Recommended</span>
      {mentionCount && mentionCount > 0 && (
        <span className="flex items-center gap-1 text-xs text-orange-100" aria-hidden="true">
          <MessageCircle className="w-3 h-3" />
          {mentionCount}
        </span>
      )}
    </div>
  );
}
