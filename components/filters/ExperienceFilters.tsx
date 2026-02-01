'use client';

import { useState } from 'react';
import { Sliders, X, ChevronDown, Star } from 'lucide-react';
import clsx from 'clsx';
import type { ExperienceCategory } from '@/types';

export interface ExperienceFiltersState {
  categories: ExperienceCategory[];
  priceRange: { min: number; max: number };
  duration: ('short' | 'half_day' | 'full_day')[];
  minRating: number;
  redditRecommendedOnly: boolean;
}

interface ExperienceFiltersProps {
  filters: ExperienceFiltersState;
  onFiltersChange: (filters: ExperienceFiltersState) => void;
  totalCount?: number;
  filteredCount?: number;
}

const categoryOptions: { value: ExperienceCategory; label: string; emoji: string }[] = [
  { value: 'beaches', label: 'Beaches', emoji: '🏖️' },
  { value: 'museums', label: 'Museums', emoji: '🏛️' },
  { value: 'food_tours', label: 'Food & Dining', emoji: '🍽️' },
  { value: 'nightlife', label: 'Nightlife', emoji: '🎉' },
  { value: 'day_trips', label: 'Day Trips', emoji: '🚗' },
  { value: 'hidden_gems', label: 'Hidden Gems', emoji: '💎' },
  { value: 'outdoor', label: 'Outdoor', emoji: '🥾' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'cultural', label: 'Cultural', emoji: '⛩️' },
  { value: 'wellness', label: 'Wellness', emoji: '🧘' },
];

const durationOptions: { value: 'short' | 'half_day' | 'full_day'; label: string }[] = [
  { value: 'short', label: '1-2 hours' },
  { value: 'half_day', label: 'Half day' },
  { value: 'full_day', label: 'Full day' },
];

export const defaultExperienceFilters: ExperienceFiltersState = {
  categories: [],
  priceRange: { min: 0, max: 500 },
  duration: [],
  minRating: 0,
  redditRecommendedOnly: false,
};

export default function ExperienceFilters({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: ExperienceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleCategory = (category: ExperienceCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const toggleDuration = (duration: 'short' | 'half_day' | 'full_day') => {
    const newDurations = filters.duration.includes(duration)
      ? filters.duration.filter((d) => d !== duration)
      : [...filters.duration, duration];
    onFiltersChange({ ...filters, duration: newDurations });
  };

  const resetFilters = () => {
    onFiltersChange(defaultExperienceFilters);
  };

  const activeFilterCount =
    filters.categories.length +
    filters.duration.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.redditRecommendedOnly ? 1 : 0) +
    (filters.priceRange.max < 500 || filters.priceRange.min > 0 ? 1 : 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Sliders className="w-5 h-5 text-slate-500" />
          <span className="font-medium text-slate-900">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-medium rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {filteredCount !== undefined && totalCount !== undefined && (
            <span className="text-sm text-slate-500">
              {filteredCount} of {totalCount}
            </span>
          )}
          <ChevronDown
            className={clsx(
              'w-5 h-5 text-slate-400 transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-5 border-t border-slate-100">
          {/* Categories */}
          <div className="pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleCategory(option.value)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                    filters.categories.includes(option.value)
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  <span>{option.emoji}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              Price Range: ${filters.priceRange.min} - ${filters.priceRange.max}
            </h4>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={filters.priceRange.max}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    priceRange: { ...filters.priceRange, max: parseInt(e.target.value) },
                  })
                }
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-sm text-slate-500 w-16 text-right">
                ${filters.priceRange.max}
              </span>
            </div>
          </div>

          {/* Duration */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">Duration</h4>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleDuration(option.value)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    filters.duration.includes(option.value)
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">Minimum Rating</h4>
            <div className="flex gap-2">
              {[0, 3, 3.5, 4, 4.5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => onFiltersChange({ ...filters, minRating: rating })}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1',
                    filters.minRating === rating
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  {rating === 0 ? (
                    'Any'
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {rating}+
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reddit Recommended */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.redditRecommendedOnly}
                onChange={(e) =>
                  onFiltersChange({ ...filters, redditRecommendedOnly: e.target.checked })
                }
                className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Reddit Recommended Only
              </span>
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                Highly rated by travelers
              </span>
            </label>
          </div>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Reset all filters
            </button>
          )}
        </div>
      )}

      {/* Quick filters (always visible) */}
      {!isExpanded && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {categoryOptions.slice(0, 6).map((option) => (
            <button
              key={option.value}
              onClick={() => toggleCategory(option.value)}
              className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1',
                filters.categories.includes(option.value)
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <span>{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
