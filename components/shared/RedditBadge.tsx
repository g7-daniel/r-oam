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
          'flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium',
          className
        )}
      >
        <span className="font-bold">r/</span>
        {mentionCount && mentionCount > 0 && (
          <span>{mentionCount}</span>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 text-orange-600 text-sm',
          className
        )}
      >
        <span className="font-bold">r/</span>
        <span>Recommended</span>
        {mentionCount && mentionCount > 0 && (
          <span className="text-orange-500">({mentionCount})</span>
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
    >
      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
        <span className="text-xs font-bold">r/</span>
      </div>
      <span className="text-sm font-medium">Reddit Recommended</span>
      {mentionCount && mentionCount > 0 && (
        <span className="flex items-center gap-1 text-xs text-orange-100">
          <MessageCircle className="w-3 h-3" />
          {mentionCount}
        </span>
      )}
    </div>
  );
}
