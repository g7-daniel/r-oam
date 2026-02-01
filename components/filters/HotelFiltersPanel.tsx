'use client';

import { Filter, X, Star, MapPin, MessageCircle } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import PriceRangeSlider from './PriceRangeSlider';
import AmenitiesMultiSelect from './AmenitiesMultiSelect';
import clsx from 'clsx';

interface HotelFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  priceRange?: { min: number; max: number };
}

export default function HotelFiltersPanel({
  isOpen,
  onClose,
  priceRange = { min: 0, max: 1000 },
}: HotelFiltersPanelProps) {
  const { hotelFilters, setHotelFilters, resetHotelFilters } = useTripStore();

  const toggleStarRating = (stars: number) => {
    const current = hotelFilters.starRatings;
    if (current.includes(stars)) {
      setHotelFilters({ starRatings: current.filter((s) => s !== stars) });
    } else {
      setHotelFilters({ starRatings: [...current, stars].sort() });
    }
  };

  const activeFilterCount = [
    hotelFilters.priceRange !== null,
    hotelFilters.starRatings.length > 0,
    hotelFilters.amenities.length > 0,
    hotelFilters.maxDistanceFromCenter !== null,
    hotelFilters.minGuestRating !== null,
    hotelFilters.redditRecommendedOnly,
  ].filter(Boolean).length;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Hotel Filters</h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-medium rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Reddit Recommended Toggle */}
          <div>
            <button
              onClick={() => setHotelFilters({ redditRecommendedOnly: !hotelFilters.redditRecommendedOnly })}
              className={clsx(
                'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                hotelFilters.redditRecommendedOnly
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <div className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold',
                hotelFilters.redditRecommendedOnly
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-500'
              )}>
                r/
              </div>
              <div className="text-left flex-1">
                <div className={clsx(
                  'font-medium',
                  hotelFilters.redditRecommendedOnly ? 'text-orange-700' : 'text-slate-700'
                )}>
                  Reddit Recommended Only
                </div>
                <div className="text-sm text-slate-500">
                  Show only hotels mentioned positively on Reddit
                </div>
              </div>
              <div className={clsx(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                hotelFilters.redditRecommendedOnly
                  ? 'bg-orange-500 border-orange-500'
                  : 'border-slate-300'
              )}>
                {hotelFilters.redditRecommendedOnly && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          </div>

          {/* Price Range */}
          <div>
            <PriceRangeSlider
              min={priceRange.min}
              max={priceRange.max}
              value={hotelFilters.priceRange}
              onChange={(range) => setHotelFilters({ priceRange: range })}
              label="Price per Night"
              formatValue={(v) => `$${v}`}
            />
          </div>

          {/* Star Rating */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
              <Star className="w-4 h-4" />
              Star Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((stars) => {
                const isSelected = hotelFilters.starRatings.includes(stars);
                return (
                  <button
                    key={stars}
                    onClick={() => toggleStarRating(stars)}
                    className={clsx(
                      'flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-1',
                      isSelected
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className={clsx(
                      'font-medium',
                      isSelected ? 'text-sky-700' : 'text-slate-700'
                    )}>
                      {stars}
                    </span>
                    <Star className={clsx(
                      'w-4 h-4',
                      isSelected ? 'text-sky-500 fill-sky-500' : 'text-slate-400'
                    )} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Distance from Center */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
              <MapPin className="w-4 h-4" />
              Distance from Center
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 1, label: 'Under 1 km' },
                { value: 2, label: 'Under 2 km' },
                { value: 5, label: 'Under 5 km' },
                { value: 10, label: 'Under 10 km' },
                { value: null, label: 'Any' },
              ].map((option) => {
                const isSelected = hotelFilters.maxDistanceFromCenter === option.value;
                return (
                  <button
                    key={option.label}
                    onClick={() => setHotelFilters({ maxDistanceFromCenter: option.value })}
                    className={clsx(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all',
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest Rating */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
              <MessageCircle className="w-4 h-4" />
              Minimum Guest Rating
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: null, label: 'Any' },
                { value: 0.6, label: '6+' },
                { value: 0.7, label: '7+' },
                { value: 0.8, label: '8+ Good' },
                { value: 0.9, label: '9+ Excellent' },
              ].map((option) => {
                const isSelected = hotelFilters.minGuestRating === option.value;
                return (
                  <button
                    key={option.label}
                    onClick={() => setHotelFilters({ minGuestRating: option.value })}
                    className={clsx(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all',
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amenities */}
          <AmenitiesMultiSelect
            value={hotelFilters.amenities}
            onChange={(amenities) => setHotelFilters({ amenities })}
          />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
          <button
            onClick={() => {
              resetHotelFilters();
            }}
            className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Reset All
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
