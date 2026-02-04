'use client';

import { MapPin, Check } from 'lucide-react';
import type { LocationSuggestion } from '@/types';
import clsx from 'clsx';

interface SuggestionCardProps {
  suggestion: LocationSuggestion;
  isSelected: boolean;
  onSelect: () => void;
}

export default function SuggestionCard({
  suggestion,
  isSelected,
  onSelect,
}: SuggestionCardProps) {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'relative p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[44px]',
        isSelected
          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-md'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1 pr-2">
          <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white truncate">{suggestion.name}</h4>
          <div className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="capitalize truncate">{suggestion.type}</span>
          </div>
        </div>
        {suggestion.imageUrl && (
          <img
            src={suggestion.imageUrl}
            alt={suggestion.name}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
          />
        )}
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2 sm:line-clamp-none">{suggestion.description}</p>

      {/* Reddit Quote */}
      {suggestion.redditQuote && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 sm:p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold flex-shrink-0">
              r/
            </div>
            <span className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-medium truncate">
              {suggestion.redditSubreddit}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic line-clamp-2 sm:line-clamp-none">
            "{suggestion.redditQuote}"
          </p>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 sm:mt-3">
        {suggestion.recommendedFor.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className={clsx(
              'px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded-full capitalize',
              isSelected
                ? 'bg-teal-200 dark:bg-teal-800 text-teal-700 dark:text-teal-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            )}
          >
            {tag}
          </span>
        ))}
        {suggestion.recommendedFor.length > 3 && (
          <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
            +{suggestion.recommendedFor.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}
