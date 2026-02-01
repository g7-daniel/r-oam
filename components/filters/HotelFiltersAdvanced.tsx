'use client';

import { useState, useCallback } from 'react';
import {
  Sliders,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  Wifi,
  Car,
  Dumbbell,
  Coffee,
  Waves,
  UtensilsCrossed,
  Dog,
  AirVent,
  Bath,
  Tv,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';

export interface HotelFiltersAdvancedState {
  priceRange: { min: number; max: number };
  starRatings: number[];
  minGuestRating: number;
  amenities: string[];
  propertyTypes: string[];
  maxDistanceKm: number | null;
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  redditRecommendedOnly: boolean;
  distanceFromExperiences: number | null;
}

interface HotelFiltersAdvancedProps {
  filters: HotelFiltersAdvancedState;
  onFiltersChange: (filters: HotelFiltersAdvancedState) => void;
  maxPrice?: number;
  totalCount?: number;
  filteredCount?: number;
  showExperienceDistance?: boolean;
}

const amenityOptions = [
  { value: 'wifi', label: 'Free WiFi', icon: Wifi },
  { value: 'parking', label: 'Free Parking', icon: Car },
  { value: 'gym', label: 'Fitness Center', icon: Dumbbell },
  { value: 'breakfast', label: 'Breakfast', icon: Coffee },
  { value: 'pool', label: 'Pool', icon: Waves },
  { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { value: 'pet_friendly', label: 'Pet Friendly', icon: Dog },
  { value: 'air_conditioning', label: 'Air Conditioning', icon: AirVent },
  { value: 'spa', label: 'Spa', icon: Bath },
  { value: 'tv', label: 'Flat-screen TV', icon: Tv },
];

const propertyTypeOptions = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'resort', label: 'Resort' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'boutique', label: 'Boutique Hotel' },
  { value: 'guesthouse', label: 'Guest House' },
];

export const defaultHotelFilters: HotelFiltersAdvancedState = {
  priceRange: { min: 0, max: 1000 },
  starRatings: [],
  minGuestRating: 0,
  amenities: [],
  propertyTypes: [],
  maxDistanceKm: null,
  freeCancellation: false,
  breakfastIncluded: false,
  redditRecommendedOnly: false,
  distanceFromExperiences: null,
};

export default function HotelFiltersAdvanced({
  filters,
  onFiltersChange,
  maxPrice = 1000,
  totalCount,
  filteredCount,
  showExperienceDistance = false,
}: HotelFiltersAdvancedProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    price: true,
    stars: true,
    rating: true,
    amenities: false,
    propertyType: false,
    distance: false,
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toggleStarRating = (rating: number) => {
    const newRatings = filters.starRatings.includes(rating)
      ? filters.starRatings.filter((r) => r !== rating)
      : [...filters.starRatings, rating];
    onFiltersChange({ ...filters, starRatings: newRatings });
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    onFiltersChange({ ...filters, amenities: newAmenities });
  };

  const togglePropertyType = (type: string) => {
    const newTypes = filters.propertyTypes.includes(type)
      ? filters.propertyTypes.filter((t) => t !== type)
      : [...filters.propertyTypes, type];
    onFiltersChange({ ...filters, propertyTypes: newTypes });
  };

  const resetFilters = () => {
    onFiltersChange(defaultHotelFilters);
  };

  const activeFilterCount =
    filters.starRatings.length +
    filters.amenities.length +
    filters.propertyTypes.length +
    (filters.minGuestRating > 0 ? 1 : 0) +
    (filters.freeCancellation ? 1 : 0) +
    (filters.breakfastIncluded ? 1 : 0) +
    (filters.redditRecommendedOnly ? 1 : 0) +
    (filters.maxDistanceKm !== null ? 1 : 0) +
    (filters.priceRange.max < maxPrice || filters.priceRange.min > 0 ? 1 : 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-slate-500" />
          <span className="font-semibold text-slate-900">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-medium rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-sm text-sky-600 hover:text-sky-700 font-medium"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Results count */}
      {filteredCount !== undefined && totalCount !== undefined && (
        <div className="px-4 py-2 bg-slate-50 text-sm text-slate-600">
          Showing <span className="font-medium">{filteredCount}</span> of{' '}
          <span className="font-medium">{totalCount}</span> properties
        </div>
      )}

      {/* Price Range */}
      <FilterSection
        title="Price per night"
        isExpanded={expandedSections.price}
        onToggle={() => toggleSection('price')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              ${filters.priceRange.min} - ${filters.priceRange.max}
            </span>
          </div>
          <div className="relative pt-1">
            {/* Track */}
            <div className="h-2 bg-slate-200 rounded-full">
              <div
                className="absolute h-2 bg-sky-500 rounded-full"
                style={{
                  left: `${(filters.priceRange.min / maxPrice) * 100}%`,
                  width: `${((filters.priceRange.max - filters.priceRange.min) / maxPrice) * 100}%`,
                }}
              />
            </div>
            {/* Min slider */}
            <input
              type="range"
              min="0"
              max={maxPrice}
              step="10"
              value={filters.priceRange.min}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceRange: {
                    min: Math.min(parseInt(e.target.value), filters.priceRange.max - 10),
                    max: filters.priceRange.max,
                  },
                })
              }
              className="absolute top-0 w-full h-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
            />
            {/* Max slider */}
            <input
              type="range"
              min="0"
              max={maxPrice}
              step="10"
              value={filters.priceRange.max}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceRange: {
                    min: filters.priceRange.min,
                    max: Math.max(parseInt(e.target.value), filters.priceRange.min + 10),
                  },
                })
              }
              className="absolute top-0 w-full h-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>$0</span>
            <span>${maxPrice}+</span>
          </div>
        </div>
      </FilterSection>

      {/* Star Rating */}
      <FilterSection
        title="Star rating"
        isExpanded={expandedSections.stars}
        onToggle={() => toggleSection('stars')}
      >
        <div className="flex flex-wrap gap-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => toggleStarRating(rating)}
              className={clsx(
                'flex items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all',
                filters.starRatings.includes(rating)
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              )}
            >
              {Array.from({ length: rating }).map((_, i) => (
                <Star
                  key={i}
                  className={clsx(
                    'w-4 h-4',
                    filters.starRatings.includes(rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-amber-400 fill-amber-400'
                  )}
                />
              ))}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Guest Rating */}
      <FilterSection
        title="Guest rating"
        isExpanded={expandedSections.rating}
        onToggle={() => toggleSection('rating')}
      >
        <div className="flex flex-wrap gap-2">
          {[
            { value: 9, label: 'Wonderful (9+)' },
            { value: 8, label: 'Very Good (8+)' },
            { value: 7, label: 'Good (7+)' },
            { value: 0, label: 'Any' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onFiltersChange({ ...filters, minGuestRating: option.value })}
              className={clsx(
                'px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                filters.minGuestRating === option.value
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Popular Amenities */}
      <FilterSection
        title="Popular amenities"
        isExpanded={expandedSections.amenities}
        onToggle={() => toggleSection('amenities')}
        count={filters.amenities.length}
      >
        <div className="grid grid-cols-2 gap-2">
          {amenityOptions.map((amenity) => {
            const Icon = amenity.icon;
            return (
              <button
                key={amenity.value}
                onClick={() => toggleAmenity(amenity.value)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left',
                  filters.amenities.includes(amenity.value)
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{amenity.label}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Property Type */}
      <FilterSection
        title="Property type"
        isExpanded={expandedSections.propertyType}
        onToggle={() => toggleSection('propertyType')}
        count={filters.propertyTypes.length}
      >
        <div className="space-y-2">
          {propertyTypeOptions.map((type) => (
            <label key={type.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.propertyTypes.includes(type.value)}
                onChange={() => togglePropertyType(type.value)}
                className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Distance */}
      <FilterSection
        title="Distance from center"
        isExpanded={expandedSections.distance}
        onToggle={() => toggleSection('distance')}
      >
        <div className="space-y-3">
          {[
            { value: 1, label: 'Less than 1 km' },
            { value: 3, label: 'Less than 3 km' },
            { value: 5, label: 'Less than 5 km' },
            { value: null, label: 'Any distance' },
          ].map((option) => (
            <label key={option.label} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="distance"
                checked={filters.maxDistanceKm === option.value}
                onChange={() => onFiltersChange({ ...filters, maxDistanceKm: option.value })}
                className="w-5 h-5 border-slate-300 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                {option.label}
              </span>
            </label>
          ))}
        </div>

        {showExperienceDistance && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.distanceFromExperiences !== null}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    distanceFromExperiences: e.target.checked ? 5 : null,
                  })
                }
                className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700">Near my selected experiences</span>
            </label>
          </div>
        )}
      </FilterSection>

      {/* Quick Options */}
      <div className="px-4 py-3 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.freeCancellation}
            onChange={(e) => onFiltersChange({ ...filters, freeCancellation: e.target.checked })}
            className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
          />
          <div>
            <span className="text-sm font-medium text-slate-700">Free cancellation</span>
            <p className="text-xs text-slate-500">Flexible booking options</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.breakfastIncluded}
            onChange={(e) => onFiltersChange({ ...filters, breakfastIncluded: e.target.checked })}
            className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
          />
          <div>
            <span className="text-sm font-medium text-slate-700">Breakfast included</span>
            <p className="text-xs text-slate-500">Start your day right</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.redditRecommendedOnly}
            onChange={(e) =>
              onFiltersChange({ ...filters, redditRecommendedOnly: e.target.checked })
            }
            className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Reddit recommended</span>
            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Popular
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}

// Filter Section Component
function FilterSection({
  title,
  isExpanded,
  onToggle,
  count,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 text-xs font-medium rounded-full">
              {count}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
