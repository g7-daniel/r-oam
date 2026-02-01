'use client';

import { Star, Clock, MapPin, DollarSign, MessageSquare, Check, Plus } from 'lucide-react';
import type { Experience } from '@/types';
import clsx from 'clsx';

interface ExperienceCardProps {
  experience: Experience;
  isSelected?: boolean;
  onSelect?: () => void;
  onViewDetails?: () => void;
  compact?: boolean;
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  beaches: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  museums: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  food_tours: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  nightlife: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  day_trips: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  hidden_gems: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  outdoor: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  shopping: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  cultural: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  wellness: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
};

const categoryLabels: Record<string, string> = {
  beaches: 'Beach',
  museums: 'Museum',
  food_tours: 'Food Tour',
  nightlife: 'Nightlife',
  day_trips: 'Day Trip',
  hidden_gems: 'Hidden Gem',
  outdoor: 'Outdoor',
  shopping: 'Shopping',
  cultural: 'Cultural',
  wellness: 'Wellness',
};

export default function ExperienceCard({
  experience,
  isSelected = false,
  onSelect,
  onViewDetails,
  compact = false,
}: ExperienceCardProps) {
  const colors = categoryColors[experience.category] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };
  const categoryLabel = categoryLabels[experience.category] || experience.category;

  if (compact) {
    return (
      <div
        onClick={onSelect}
        className={clsx(
          'p-3 rounded-xl border-2 cursor-pointer transition-all',
          isSelected
            ? 'border-sky-500 bg-sky-50 shadow-md'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
            style={{ backgroundImage: `url(${experience.imageUrl})` }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-slate-900 line-clamp-1">{experience.name}</h4>
              {isSelected && <Check className="w-5 h-5 text-sky-500 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className={clsx('px-1.5 py-0.5 rounded', colors.bg, colors.text)}>
                {categoryLabel}
              </span>
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {experience.rating.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {experience.duration}
              </span>
              <span className="font-medium text-slate-700">
                {experience.price > 0 ? `$${experience.price}` : 'Free'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-2xl border-2 overflow-hidden transition-all bg-white',
        isSelected
          ? 'border-sky-500 shadow-lg ring-2 ring-sky-200'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      )}
    >
      {/* Image */}
      <div className="relative h-48 bg-slate-200">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${experience.imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={clsx(
              'px-2.5 py-1 rounded-full text-xs font-medium',
              colors.bg,
              colors.text
            )}
          >
            {categoryLabel}
          </span>
        </div>

        {/* Rating */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-white/90 rounded-full">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-sm font-medium text-slate-900">
            {experience.rating.toFixed(1)}
          </span>
          <span className="text-xs text-slate-500">({experience.reviewCount})</span>
        </div>

        {/* Price */}
        <div className="absolute bottom-3 right-3">
          <span className="px-3 py-1.5 bg-white rounded-full text-sm font-semibold text-slate-900">
            {experience.price > 0 ? `$${experience.price}` : 'Free'}
          </span>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shadow-lg">
            <Check className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-slate-900 line-clamp-1">{experience.name}</h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
          <MapPin className="w-3.5 h-3.5" />
          <span className="line-clamp-1">{experience.address}</span>
        </div>

        {/* Description */}
        <p className="mt-2 text-sm text-slate-600 line-clamp-2">{experience.description}</p>

        {/* Reddit Tips */}
        {experience.redditTips && experience.redditTips.length > 0 && (
          <div className="mt-3 p-2.5 bg-orange-50 rounded-lg border border-orange-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700 mb-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Reddit tip
            </div>
            <p className="text-xs text-orange-900 italic line-clamp-2">
              "{experience.redditTips[0]}"
            </p>
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>{experience.duration}</span>
          </div>
          {experience.bestTimeToVisit && (
            <div className="text-sm text-slate-500">
              Best: {experience.bestTimeToVisit}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onSelect}
            className={clsx(
              'flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
              isSelected
                ? 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                : 'bg-sky-500 text-white hover:bg-sky-600'
            )}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4" />
                Selected
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add to Trip
              </>
            )}
          </button>
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="px-4 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
