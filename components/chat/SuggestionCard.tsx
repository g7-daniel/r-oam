'use client';

import { MapPin, Check, MessageCircle } from 'lucide-react';
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
        'relative p-4 rounded-xl border-2 cursor-pointer transition-all',
        isSelected
          ? 'border-teal-500 bg-teal-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
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
        <div>
          <h4 className="font-semibold text-slate-800">{suggestion.name}</h4>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="w-3 h-3" />
            <span className="capitalize">{suggestion.type}</span>
          </div>
        </div>
        {suggestion.imageUrl && (
          <img
            src={suggestion.imageUrl}
            alt={suggestion.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 mb-3">{suggestion.description}</p>

      {/* Reddit Quote */}
      {suggestion.redditQuote && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
              r/
            </div>
            <span className="text-xs text-orange-600 font-medium">
              {suggestion.redditSubreddit}
            </span>
          </div>
          <p className="text-sm text-slate-600 italic">
            "{suggestion.redditQuote}"
          </p>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {suggestion.recommendedFor.map((tag) => (
          <span
            key={tag}
            className={clsx(
              'px-2 py-0.5 text-xs rounded-full capitalize',
              isSelected
                ? 'bg-teal-200 text-teal-700'
                : 'bg-slate-100 text-slate-600'
            )}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
