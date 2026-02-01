'use client';

import { ArrowBigUp, MessageCircle } from 'lucide-react';
import clsx from 'clsx';

interface RedditReviewCardProps {
  quote: string;
  subreddit?: string;
  upvotes?: number;
  author?: string;
  date?: string;
  variant?: 'default' | 'compact' | 'prominent';
  className?: string;
}

export default function RedditReviewCard({
  quote,
  subreddit = 'travel',
  upvotes,
  author,
  date,
  variant = 'default',
  className,
}: RedditReviewCardProps) {
  if (variant === 'compact') {
    return (
      <div
        className={clsx(
          'flex items-start gap-2 p-2 bg-gradient-to-r from-reddit-50 to-white rounded-lg border border-reddit-100',
          className
        )}
      >
        <div className="flex items-center gap-1 flex-shrink-0">
          <ArrowBigUp className="w-4 h-4 text-reddit fill-reddit" />
          <span className="text-xs font-bold text-reddit">
            {upvotes ? upvotes.toLocaleString() : '—'}
          </span>
        </div>
        <p className="text-xs text-slate-600 italic line-clamp-2">"{quote}"</p>
      </div>
    );
  }

  if (variant === 'prominent') {
    return (
      <div
        className={clsx(
          'bg-gradient-to-br from-reddit-50 via-white to-reddit-50 border-2 border-reddit-200 rounded-2xl p-5 shadow-sm',
          className
        )}
      >
        {/* Header with Reddit branding */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-reddit flex items-center justify-center">
              <span className="text-white font-bold text-sm">r/</span>
            </div>
            <span className="font-semibold text-reddit">r/{subreddit}</span>
          </div>
          {upvotes !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-reddit/10 rounded-full">
              <ArrowBigUp className="w-5 h-5 text-reddit fill-reddit" />
              <span className="font-bold text-reddit">{upvotes.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Quote */}
        <blockquote className="text-slate-700 text-lg leading-relaxed mb-3">
          "{quote}"
        </blockquote>

        {/* Footer */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {author && <span>— u/{author}</span>}
          {date && (
            <>
              <span className="text-slate-300">•</span>
              <span>{date}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={clsx(
        'bg-gradient-to-r from-reddit-50 to-white border border-reddit-200 rounded-xl p-4',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-reddit" />
          <span className="text-sm font-medium text-reddit">r/{subreddit}</span>
        </div>
        {upvotes !== undefined && (
          <span className="flex items-center gap-1 text-sm font-bold text-reddit">
            <ArrowBigUp className="w-4 h-4 fill-reddit" />
            {upvotes.toLocaleString()}
          </span>
        )}
      </div>

      {/* Quote */}
      <p className="text-slate-700 italic">"{quote}"</p>

      {/* Footer */}
      {(author || date) && (
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
          {author && <span>— u/{author}</span>}
          {date && (
            <>
              <span className="text-slate-300">•</span>
              <span>{date}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Compact upvote badge for use inline
export function RedditUpvoteBadge({
  upvotes,
  subreddit,
  className,
}: {
  upvotes?: number;
  subreddit?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-1 bg-reddit/10 text-reddit rounded-full text-xs font-semibold',
        className
      )}
    >
      <ArrowBigUp className="w-3.5 h-3.5 fill-reddit" />
      <span>{upvotes ? upvotes.toLocaleString() : '—'}</span>
      {subreddit && (
        <span className="text-reddit/70 font-normal">r/{subreddit}</span>
      )}
    </div>
  );
}

// Verified by community badge
export function CommunityVerifiedBadge({
  count,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-1 bg-trust/10 text-trust rounded-full text-xs font-medium',
        className
      )}
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      <span>
        Verified by {count ? count.toLocaleString() : ''} Reddit travelers
      </span>
    </div>
  );
}
