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
          'flex items-start gap-2 p-2 bg-gradient-to-r from-reddit-50 to-white dark:from-reddit-900/30 dark:to-slate-800 rounded-lg border border-reddit-100 dark:border-reddit-800',
          className
        )}
        role="article"
        aria-label={`Reddit review from r/${subreddit}`}
      >
        <div className="flex items-center gap-1 flex-shrink-0" aria-label={upvotes ? `${upvotes} upvotes` : 'No upvote data'}>
          <ArrowBigUp className="w-4 h-4 text-reddit fill-reddit" aria-hidden="true" />
          <span className="text-xs font-bold text-reddit" aria-hidden="true">
            {upvotes ? upvotes.toLocaleString() : '—'}
          </span>
        </div>
        <blockquote className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2">"{quote}"</blockquote>
      </div>
    );
  }

  if (variant === 'prominent') {
    return (
      <article
        className={clsx(
          'bg-gradient-to-br from-reddit-50 via-white to-reddit-50 dark:from-reddit-900/30 dark:via-slate-800 dark:to-reddit-900/30 border-2 border-reddit-200 dark:border-reddit-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm',
          className
        )}
        aria-label={`Reddit review from r/${subreddit}`}
      >
        {/* Header with Reddit branding */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-reddit flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm">r/</span>
            </div>
            <span className="font-semibold text-sm sm:text-base text-reddit">r/{subreddit}</span>
          </div>
          {upvotes !== undefined && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-reddit/10 rounded-full">
              <ArrowBigUp className="w-4 h-4 sm:w-5 sm:h-5 text-reddit fill-reddit" />
              <span className="font-bold text-sm sm:text-base text-reddit">{upvotes.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Quote */}
        <blockquote className="text-slate-700 dark:text-slate-300 text-sm sm:text-lg leading-relaxed mb-2 sm:mb-3">
          "{quote}"
        </blockquote>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {author && <span>— u/{author}</span>}
          {date && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{date}</span>
            </>
          )}
        </div>
      </article>
    );
  }

  // Default variant
  return (
    <article
      className={clsx(
        'bg-gradient-to-r from-reddit-50 to-white dark:from-reddit-900/30 dark:to-slate-800 border border-reddit-200 dark:border-reddit-800 rounded-lg sm:rounded-xl p-3 sm:p-4',
        className
      )}
      aria-label={`Reddit review from r/${subreddit}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-reddit" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-medium text-reddit">r/{subreddit}</span>
        </div>
        {upvotes !== undefined && (
          <span className="flex items-center gap-1 text-xs sm:text-sm font-bold text-reddit" aria-label={`${upvotes} upvotes`}>
            <ArrowBigUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-reddit" aria-hidden="true" />
            <span aria-hidden="true">{upvotes.toLocaleString()}</span>
          </span>
        )}
      </div>

      {/* Quote */}
      <blockquote className="text-xs sm:text-base text-slate-700 dark:text-slate-300 italic">"{quote}"</blockquote>

      {/* Footer */}
      {(author || date) && (
        <footer className="flex items-center gap-2 mt-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
          {author && <span>— u/{author}</span>}
          {date && (
            <>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">•</span>
              <time>{date}</time>
            </>
          )}
        </footer>
      )}
    </article>
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
      role="status"
      aria-label={`${upvotes ? `${upvotes} upvotes` : 'No upvotes'}${subreddit ? ` from r/${subreddit}` : ''}`}
    >
      <ArrowBigUp className="w-3.5 h-3.5 fill-reddit" aria-hidden="true" />
      <span aria-hidden="true">{upvotes ? upvotes.toLocaleString() : '—'}</span>
      {subreddit && (
        <span className="text-reddit/70 font-normal" aria-hidden="true">r/{subreddit}</span>
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
      role="status"
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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
