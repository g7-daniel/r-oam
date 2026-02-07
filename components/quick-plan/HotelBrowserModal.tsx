'use client';

/**
 * HotelBrowserModal - Premium hotel selection experience
 *
 * Features:
 * - List view with large images, details, and pricing in columns
 * - Sort bar with pill-style buttons (Recommended, Lowest Price, Guest Rating)
 * - Slide-in filter panel with comprehensive options
 * - Map/List view toggle (placeholder)
 * - Value badges and urgency indicators
 * - Detailed hotel page with image gallery and benefits
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  MapPin,
  ExternalLink,
  Check,
  Clock,
  ImageIcon,
  Award,
  AlertCircle,
  Filter,
  ArrowLeft,
  ChevronDown,
  Loader2,
} from 'lucide-react';
// getPlaceholderImage available but not currently used - FallbackImage handles placeholders
import FallbackImage from '@/components/ui/FallbackImage';
import { Skeleton } from '@/components/ui/Skeleton';
import type { HotelCandidate } from '@/types/quick-plan';

// ============================================================================
// TYPES
// ============================================================================

type SortOption = 'recommended' | 'price-low' | 'price-high' | 'rating' | 'stars';

// Number of hotels to show initially and per "load more" click
const HOTELS_PER_PAGE = 20;

interface FilterState {
  searchQuery: string;
  priceRange: { min: number; max: number };
  totalPriceRange: { min: number; max: number };
  starRatings: number[];
  minGuestRating: number;
  amenities: string[];
  propertyTypes: string[];
  neighborhoods: string[];
  showPromotions: boolean;
  accessibilityFeatures: string[];
}

interface HotelBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotels: HotelCandidate[];
  areaName?: string;
  onSelectHotel: (hotel: HotelCandidate) => void;
  selectedHotelId?: string | null;
  tripDates?: { start: string; end: string };
  guests?: { adults: number; children: number };
  nightCount?: number;
  isLoading?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AMENITY_OPTIONS = [
  { key: 'pool', label: 'Pool' },
  { key: 'spa', label: 'Spa' },
  { key: 'gym', label: 'Gym/Fitness' },
  { key: 'wifi', label: 'Free WiFi' },
  { key: 'parking', label: 'Parking' },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'beach', label: 'Beach Access' },
  { key: 'breakfast', label: 'Breakfast Included' },
  { key: 'airport_shuttle', label: 'Airport Shuttle' },
  { key: 'pet_friendly', label: 'Pet Friendly' },
  { key: 'casino', label: 'Casino' },
  { key: 'water_park', label: 'Water Park' },
];

const PROPERTY_TYPES = [
  { key: 'hotel', label: 'Hotel' },
  { key: 'resort', label: 'Resort' },
  { key: 'boutique', label: 'Boutique Hotel' },
  { key: 'all-inclusive', label: 'All-Inclusive Property' },
  { key: 'bed_breakfast', label: 'Bed & Breakfast' },
  { key: 'villa', label: 'Villa' },
  { key: 'apartment', label: 'Aparthotel' },
];

const SORT_OPTIONS: { value: SortOption; label: string; icon?: string }[] = [
  { value: 'recommended', label: 'Recommended', icon: '⭐' },
  { value: 'price-low', label: 'Lowest Price', icon: '💰' },
  { value: 'rating', label: 'Guest Rating', icon: '👍' },
  { value: 'stars', label: 'Star Rating', icon: '✨' },
];

// ============================================================================
// SKELETON HOTEL LIST CARD (matches HotelListCard layout)
// ============================================================================

function SkeletonHotelListCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in" role="presentation" aria-hidden="true">
      <div className="flex flex-col lg:flex-row">
        {/* Image section skeleton */}
        <div className="relative w-full lg:w-72 xl:w-80 flex-shrink-0 aspect-[4/3] lg:aspect-auto lg:h-56 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-pulse" />

        {/* Content section skeleton */}
        <div className="flex-1 p-3 sm:p-4 lg:p-5 flex flex-col lg:flex-row">
          {/* Hotel details skeleton */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <Skeleton variant="text" className="w-3/4 h-6 mb-2" />

            {/* Stars and location */}
            <div className="flex items-center gap-2 mb-2">
              <Skeleton variant="text" className="w-20 h-4" />
              <Skeleton variant="text" className="w-24 h-4" />
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-3">
              <Skeleton variant="rounded" width={60} height={24} />
              <Skeleton variant="text" className="w-16 h-4" />
            </div>

            {/* Perks - hidden on small mobile */}
            <div className="space-y-1 mb-3 hidden sm:block">
              <Skeleton variant="text" className="w-4/5 h-4" />
              <Skeleton variant="text" className="w-3/5 h-4" />
            </div>

            {/* Links */}
            <div className="flex items-center gap-4">
              <Skeleton variant="text" className="w-20 h-4" />
              <Skeleton variant="text" className="w-12 h-4" />
            </div>
          </div>

          {/* Pricing section skeleton */}
          <div className="mt-3 lg:mt-0 lg:ml-6 lg:w-52 lg:flex-shrink-0 lg:border-l lg:border-slate-200 dark:lg:border-slate-700 lg:pl-6 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-start gap-3 sm:gap-4 lg:gap-0 pt-3 sm:pt-0 border-t sm:border-t-0 lg:border-t-0 border-slate-100 dark:border-slate-700">
            <div className="flex-1 sm:flex-initial">
              {/* Price */}
              <Skeleton variant="text" className="w-24 h-8 mb-1" />
              <Skeleton variant="text" className="w-16 h-3" />

              {/* Total price */}
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 hidden sm:block">
                <Skeleton variant="text" className="w-28 h-5 mb-1" />
                <Skeleton variant="text" className="w-14 h-3" />
              </div>
            </div>

            {/* Select button skeleton */}
            <Skeleton variant="rounded" className="w-full sm:w-auto lg:w-full lg:mt-4 h-11" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HotelBrowserModal({
  isOpen,
  onClose,
  hotels,
  areaName,
  onSelectHotel,
  selectedHotelId,
  tripDates,
  guests,
  nightCount = 1,
  isLoading = false,
}: HotelBrowserModalProps) {
  // View state
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Pagination state for performance with large lists
  const [visibleCount, setVisibleCount] = useState(HOTELS_PER_PAGE);

  // Calculate price stats
  const priceStats = useMemo(() => {
    const prices = hotels.filter(h => h.pricePerNight).map(h => h.pricePerNight!);
    if (prices.length === 0) return { min: 0, max: 1000, avgMin: 0, avgMax: 1000 };
    // FIX: Use reduce to avoid call stack overflow with large arrays
    const min = Math.floor(prices.reduce((a, b) => a < b ? a : b, prices[0]));
    const max = Math.ceil(prices.reduce((a, b) => a > b ? a : b, prices[0]));
    return {
      min,
      max,
      avgMin: min,
      avgMax: max,
    };
  }, [hotels]);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    priceRange: { min: priceStats.min, max: priceStats.max },
    totalPriceRange: { min: priceStats.min * nightCount, max: priceStats.max * nightCount },
    starRatings: [],
    minGuestRating: 0,
    amenities: [],
    propertyTypes: [],
    neighborhoods: [],
    showPromotions: false,
    accessibilityFeatures: [],
  });

  // Detail view state - store ID and look up from hotels array to avoid stale data
  const [detailHotelId, setDetailHotelId] = useState<string | null>(null);
  // FIX: Derive detailHotel from hotels array so it stays fresh when hotels prop updates
  const detailHotel = useMemo(
    () => (detailHotelId ? hotels.find(h => h.id === detailHotelId) ?? null : null),
    [detailHotelId, hotels]
  );

  // Ref to track child dialog state for escape handler (avoids stale closure issues)
  const childDialogOpenRef = useRef(false);
  childDialogOpenRef.current = showFilterPanel || !!detailHotel;

  // Focus trap ref for the modal container
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap: keep focus inside the modal when tabbing
  useEffect(() => {
    if (!isOpen) return;
    const modal = modalRef.current;
    if (!modal) return;

    // Auto-focus the close button on open
    const closeBtn = modal.querySelector<HTMLElement>('button[aria-label="Close hotel browser"]');
    closeBtn?.focus();

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      // Skip trap if a child dialog is open (they manage their own focus)
      if (childDialogOpenRef.current) return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabTrap);
    return () => document.removeEventListener('keydown', handleTabTrap);
  }, [isOpen]);

  // Update price filters when priceStats change
  useEffect(() => {
    setFilters(f => ({
      ...f,
      priceRange: { min: priceStats.min, max: priceStats.max },
      totalPriceRange: { min: priceStats.min * nightCount, max: priceStats.max * nightCount },
    }));
  }, [priceStats, nightCount]);

  // Escape key to close modal (skip if child dialog is open)
  // Uses ref to always read latest child dialog state, avoiding stale closures
  // where the parent handler fires before re-registering with updated state.
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (childDialogOpenRef.current) return;
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Filter and sort hotels
  const filteredHotels = useMemo(() => {
    let result = [...hotels];

    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(h =>
        h.name.toLowerCase().includes(query) ||
        h.address?.toLowerCase().includes(query) ||
        h.city?.toLowerCase().includes(query)
      );
    }

    // Price filter
    // FIX: Hotels with null pricePerNight should always be shown (not silently filtered out)
    result = result.filter(h => {
      if (h.pricePerNight == null) return true;
      return h.pricePerNight >= filters.priceRange.min && h.pricePerNight <= filters.priceRange.max;
    });

    // Star filter
    if (filters.starRatings.length > 0) {
      result = result.filter(h => filters.starRatings.includes(h.stars || 0));
    }

    // Guest rating filter
    if (filters.minGuestRating > 0) {
      result = result.filter(h => (h.googleRating || 0) >= filters.minGuestRating);
    }

    // Amenity filter - use some() so hotels with ANY selected amenity match
    if (filters.amenities.length > 0) {
      result = result.filter(h => {
        const hotelAmenities = (h.amenities || []).join(' ').toLowerCase();
        const hotelName = h.name.toLowerCase();
        return filters.amenities.some(amenity => {
          switch (amenity) {
            case 'pool': return hotelAmenities.includes('pool') || hotelAmenities.includes('swimming');
            case 'spa': return hotelAmenities.includes('spa') || hotelAmenities.includes('wellness');
            case 'gym': return hotelAmenities.includes('gym') || hotelAmenities.includes('fitness');
            case 'wifi': return hotelAmenities.includes('wifi') || hotelAmenities.includes('internet');
            case 'parking': return hotelAmenities.includes('parking') || hotelAmenities.includes('valet');
            case 'restaurant': return hotelAmenities.includes('restaurant') || hotelAmenities.includes('dining');
            case 'beach': return hotelAmenities.includes('beach') || hotelName.includes('beach');
            case 'breakfast': return hotelAmenities.includes('breakfast');
            case 'airport_shuttle': return hotelAmenities.includes('shuttle') || hotelAmenities.includes('airport');
            case 'pet_friendly': return hotelAmenities.includes('pet');
            // FIX: Added missing cases for casino and water_park (default was true, matching all hotels)
            case 'casino': return hotelAmenities.includes('casino');
            case 'water_park': return hotelAmenities.includes('water park') || hotelAmenities.includes('waterpark');
            default: return false;
          }
        });
      });
    }

    // Property type filter
    if (filters.propertyTypes.length > 0) {
      result = result.filter(h => {
        const name = h.name.toLowerCase();
        const amenities = (h.amenities || []).join(' ').toLowerCase();
        return filters.propertyTypes.some(type => {
          switch (type) {
            case 'hotel': return name.includes('hotel') || name.includes('inn') || name.includes('lodge');
            case 'resort': return name.includes('resort') || amenities.includes('resort');
            case 'boutique': return name.includes('boutique');
            case 'all-inclusive': return h.isAllInclusive || name.includes('all-inclusive') || amenities.includes('all-inclusive');
            case 'bed_breakfast': return name.includes('b&b') || name.includes('bed and breakfast') || name.includes('bed & breakfast') || name.includes('guesthouse') || name.includes('guest house');
            case 'villa': return name.includes('villa') || name.includes('villas');
            case 'apartment': return name.includes('apart') || name.includes('aparthotel') || name.includes('residence') || name.includes('suites');
            default: return false;
          }
        });
      });
    }

    // Promotions filter - show only hotels with special offers/deals
    if (filters.showPromotions) {
      result = result.filter(h => h.isAllInclusive || h.priceConfidence === 'real');
    }

    // Accessibility filter
    if (filters.accessibilityFeatures.length > 0) {
      result = result.filter(h => {
        const amenities = (h.amenities || []).join(' ').toLowerCase();
        return filters.accessibilityFeatures.every(feature => {
          switch (feature) {
            case 'elevator': return amenities.includes('elevator') || amenities.includes('lift');
            case 'stair_free': return amenities.includes('wheelchair') || amenities.includes('accessible') || amenities.includes('stair-free');
            case 'wheelchair': return amenities.includes('wheelchair') || amenities.includes('accessible parking');
            default: return false;
          }
        });
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.pricePerNight || 999999) - (b.pricePerNight || 999999);
        case 'price-high':
          return (b.pricePerNight || 0) - (a.pricePerNight || 0);
        case 'rating':
          return (b.googleRating || 0) - (a.googleRating || 0);
        case 'stars': {
          const starDiff = (b.stars || 0) - (a.stars || 0);
          if (starDiff !== 0) return starDiff;
          return (b.googleRating || 0) - (a.googleRating || 0);
        }
        case 'recommended':
        default: {
          const aScore = (a.redditScore || 0) * 10 + (a.googleRating || 0) * 5 + (a.stars || 0) * 2;
          const bScore = (b.redditScore || 0) * 10 + (b.googleRating || 0) * 5 + (b.stars || 0) * 2;
          return bScore - aScore;
        }
      }
    });

    return result;
  }, [hotels, filters, sortBy]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.priceRange.min > priceStats.min || filters.priceRange.max < priceStats.max) count++;
    if (filters.starRatings.length > 0) count++;
    if (filters.minGuestRating > 0) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.propertyTypes.length > 0) count++;
    if (filters.showPromotions) count++;
    if (filters.accessibilityFeatures.length > 0) count++;
    return count;
  }, [filters, priceStats]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(HOTELS_PER_PAGE);
  }, [filters, sortBy]);

  // Paginated hotels for performance
  const visibleHotels = useMemo(() => {
    return filteredHotels.slice(0, visibleCount);
  }, [filteredHotels, visibleCount]);

  const hasMoreHotels = visibleCount < filteredHotels.length;

  const loadMoreHotels = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + HOTELS_PER_PAGE, filteredHotels.length));
  }, [filteredHotels.length]);

  const clearAllFilters = () => {
    setFilters({
      searchQuery: '',
      priceRange: { min: priceStats.min, max: priceStats.max },
      totalPriceRange: { min: priceStats.min * nightCount, max: priceStats.max * nightCount },
      starRatings: [],
      minGuestRating: 0,
      amenities: [],
      propertyTypes: [],
      neighborhoods: [],
      showPromotions: false,
      accessibilityFeatures: [],
    });
  };

  // Use portal to render at document.body level, escaping any ancestor
  // transform context (e.g., Framer Motion motion.div) that would break
  // fixed positioning and cause the modal to appear off-center.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
      <>
      {/* Backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container - flexbox centering wrapper (translate-based centering
          breaks because Framer Motion's inline transform overrides Tailwind's) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 30 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.8 }}
        ref={modalRef}
        className="bg-slate-50 dark:bg-slate-900 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full h-full sm:w-[90vw] md:w-[85vw] lg:w-[80vw] sm:max-w-6xl sm:h-[90vh] sm:max-h-[900px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotel-browser-title"
      >
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-7xl mx-auto">
            {/* Top row: Back button + title */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white safe-area-inset-top">
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Close hotel browser"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 id="hotel-browser-title" className="text-base sm:text-lg font-semibold truncate flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Finding Hotels{areaName ? ` in ${areaName}` : ''}...</span>
                    </>
                  ) : (
                    <span>{filteredHotels.length} Hotels{areaName ? ` in ${areaName}` : ''}</span>
                  )}
                </h1>
                {tripDates && (
                  <p className="text-xs sm:text-sm text-orange-100 truncate">
                    {tripDates.start} - {tripDates.end}
                    {guests && ` · ${guests.adults} adult${guests.adults > 1 ? 's' : ''}${guests.children ? `, ${guests.children} child${guests.children > 1 ? 'ren' : ''}` : ''}`}
                  </p>
                )}
              </div>
            </div>

            {/* Sort bar */}
            <div className={`relative flex items-center justify-between px-2 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto no-scrollbar ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Filter button */}
                <button
                  onClick={() => setShowFilterPanel(true)}
                  disabled={isLoading}
                  className={`min-h-[44px] flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-full border transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed ${
                    activeFilterCount > 0
                      ? 'bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300'
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                  aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
                  aria-expanded={showFilterPanel}
                >
                  <Filter className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center bg-orange-500 text-white text-[10px] sm:text-xs rounded-full" aria-hidden="true">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Sort options */}
                <div className="flex items-center gap-1 sm:gap-1.5" role="group" aria-label="Sort options">
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      disabled={isLoading}
                      title={option.label}
                      className={`min-h-[44px] px-2.5 sm:px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 disabled:cursor-not-allowed ${
                        sortBy === option.value
                          ? 'bg-orange-500 text-white shadow-md scale-[1.02]'
                          : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                      aria-pressed={sortBy === option.value}
                      aria-label={`Sort by ${option.label}`}
                    >
                      <span aria-hidden="true">{option.icon}</span> <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/*
                Map/List view toggle - PLACEHOLDER: Map view is not yet implemented.
                Keeping this code commented out for future implementation.
                To enable: add viewMode state and implement HotelMapView with actual map integration.

              <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-slate-700 rounded-full p-1 border border-slate-200 dark:border-slate-600 ml-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Map
                </button>
              </div>
              */}
            </div>
          </div>
        </header>

        {/* Info banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 border-b border-amber-200/50 dark:border-amber-900/20" role="note">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-400/90 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />
              <span>Prices shown are estimates per night. Actual prices may vary based on your dates and room selection.</span>
            </p>
          </div>
        </div>

        {/* Main content - scrollable with iOS momentum scrolling */}
        <main
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
          aria-label="Hotel listings"
          aria-busy={isLoading}
        >
          <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 safe-area-inset-bottom">
            {/*
              Map view is currently disabled - see HotelMapView component below.
              This is a placeholder for future map integration.
            */}
            <div className="space-y-3">
              {isLoading ? (
                /* Loading skeleton state */
                <>
                  <div className="py-3 text-center" role="status" aria-live="polite">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" aria-hidden="true" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Searching for the best hotels...</span>
                    </div>
                  </div>
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonHotelListCard key={i} />
                  ))}
                </>
              ) : filteredHotels.length === 0 ? (
                <div className="text-center py-16 sm:py-20 px-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700" role="status">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shadow-inner">
                    <span className="text-4xl" aria-hidden="true">🏨</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    No hotels match your filters
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                    Try adjusting your filters, expanding your price range, or clearing your search query to see more results.
                  </p>
                  {activeFilterCount > 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
                      {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} currently active
                    </p>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                    Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Virtualized list - only render visible hotels for performance */}
                  {visibleHotels.map((hotel) => (
                    <HotelListCard
                      key={hotel.id}
                      hotel={hotel}
                      isSelected={hotel.id === selectedHotelId}
                      nightCount={nightCount}
                      onSelect={() => onSelectHotel(hotel)}
                      onViewDetails={() => setDetailHotelId(hotel.id)}
                    />
                  ))}

                  {/* Load More button for pagination */}
                  {hasMoreHotels && (
                    <div className="py-6 text-center">
                      <button
                        onClick={loadMoreHotels}
                        className="min-h-[48px] inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-750 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:from-orange-50 hover:to-orange-50/50 dark:hover:from-slate-700 dark:hover:to-slate-700 hover:border-orange-300 dark:hover:border-orange-700 transition-all font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 active:scale-[0.97]"
                        aria-label={`Load more hotels. ${filteredHotels.length - visibleCount} remaining`}
                      >
                        <ChevronDown className="w-5 h-5" aria-hidden="true" />
                        <span>Show More Hotels</span>
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full font-semibold">{filteredHotels.length - visibleCount}</span>
                      </button>
                    </div>
                  )}

                  {/* Results count footer */}
                  <div className="py-6 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{visibleHotels.length}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredHotels.length}</span> hotel{filteredHotels.length !== 1 ? 's' : ''}
                    </p>
                    {activeFilterCount > 0 && (
                      <button onClick={clearAllFilters} className="min-h-[44px] text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-2 py-2 inline-flex items-center gap-1">
                        <X className="w-3 h-3" aria-hidden="true" />
                        Clear {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        {/* Filter Panel (slides in from right) */}
        <FilterPanel
          isOpen={showFilterPanel}
          onClose={() => setShowFilterPanel(false)}
          filters={filters}
          setFilters={setFilters}
          priceStats={priceStats}
          nightCount={nightCount}
          activeFilterCount={activeFilterCount}
          onClearAll={clearAllFilters}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        {/* Hotel Detail Modal */}
        <HotelDetailModal
          hotel={detailHotel}
          isOpen={!!detailHotel}
          onClose={() => setDetailHotelId(null)}
          onSelect={() => {
            if (detailHotel) {
              onSelectHotel(detailHotel);
              setDetailHotelId(null);
            }
          }}
          isSelected={detailHotel?.id === selectedHotelId}
          nightCount={nightCount}
        />
      </motion.div>
      </div>
      </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ============================================================================
// HOTEL LIST CARD (AMEX Style)
// ============================================================================

function HotelListCard({
  hotel,
  isSelected,
  nightCount,
  onSelect,
  onViewDetails,
}: {
  hotel: HotelCandidate;
  isSelected: boolean;
  nightCount: number;
  onSelect: () => void;
  onViewDetails: () => void;
}) {
  // Determine badges
  const hasRedditPick = hotel.redditScore && hotel.redditScore > 2;
  const hasExceptionalValue = hotel.priceConfidence === 'real' && hotel.googleRating && hotel.googleRating >= 4.5;
  const hasSpecialOffer = hotel.isAllInclusive;

  // Calculate total price
  const totalPrice = hotel.pricePerNight ? hotel.pricePerNight * nightCount : null;

  return (
    <article
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border overflow-hidden ${
        isSelected
          ? 'ring-2 ring-orange-500 border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/10'
          : 'border-slate-200 dark:border-slate-700'
      }`}
      aria-label={`${hotel.name}${isSelected ? ', currently selected' : ''}`}
    >
      {/* Top badge bar */}
      {(hasRedditPick || hotel.isAllInclusive || hotel.isAdultsOnly) && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-700 dark:to-slate-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap" aria-label="Hotel badges">
          {hasRedditPick && (
            <span className="flex items-center gap-1 sm:gap-1.5 bg-orange-500/20 px-1.5 sm:px-2 py-0.5 rounded-full">
              <span aria-hidden="true">🔥</span> <span className="hidden sm:inline">Reddit</span> Favorite
            </span>
          )}
          {hotel.isAllInclusive && (
            <span className="flex items-center gap-1 sm:gap-1.5 bg-purple-500/20 px-1.5 sm:px-2 py-0.5 rounded-full">
              <span aria-hidden="true">✨</span> All-Inclusive
            </span>
          )}
          {hotel.isAdultsOnly && (
            <span className="flex items-center gap-1 sm:gap-1.5 bg-amber-500/20 px-1.5 sm:px-2 py-0.5 rounded-full">
              <span aria-hidden="true">💎</span> Adults Only
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        {/* Image section */}
        <div className="relative w-full lg:w-72 xl:w-80 flex-shrink-0 aspect-[16/10] lg:aspect-auto lg:h-56 bg-slate-100 dark:bg-slate-700 overflow-hidden group/image">
          <FallbackImage
            src={hotel.imageUrl}
            alt={`${hotel.name} hotel exterior`}
            fill
            fallbackType="hotel"
            className="transition-transform duration-500 ease-out group-hover/image:scale-110"
            sizes="(max-width: 1024px) 100vw, 320px"
            showSkeleton
          />

          {/* Selected indicator */}
          {isSelected && (
            <div className="absolute top-2 left-2 bg-orange-500 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg" aria-hidden="true">
              <Check className="w-3.5 h-3.5" />
              Selected
            </div>
          )}

          {/* View details overlay */}
          <button
            onClick={onViewDetails}
            className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
            aria-label={`View details for ${hotel.name}`}
          >
            <span className="bg-white/95 dark:bg-slate-800/95 px-4 py-2 rounded-xl text-sm font-medium text-slate-800 dark:text-white shadow-lg transform scale-90 hover:scale-100 transition-transform">
              View Details
            </span>
          </button>
        </div>

        {/* Content section */}
        <div className="flex-1 p-3 sm:p-4 lg:p-5 flex flex-col lg:flex-row">
          {/* Hotel details */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-1 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer truncate transition-colors"
              onClick={onViewDetails}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewDetails(); } }}
              aria-label={`View details for ${hotel.name}`}
            >
              {hotel.name}
            </h3>

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2 flex-wrap">
              {hotel.stars > 0 && (
                <span className="text-amber-500">{'★'.repeat(hotel.stars)} <span className="hidden sm:inline">{hotel.stars}-star</span></span>
              )}
              {hotel.city && (
                <>
                  <span className="text-slate-300 hidden sm:inline">|</span>
                  <span className="truncate max-w-[100px] sm:max-w-none">{hotel.city}</span>
                </>
              )}
              {hotel.distanceToCenter !== undefined && hotel.distanceToCenter > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>{hotel.distanceToCenter.toFixed(1)} mi</span>
                </>
              )}
            </div>

            {/* Rating */}
            {hotel.googleRating && hotel.googleRating > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 sm:px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-emerald-500 text-emerald-500" />
                  <span className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {hotel.googleRating.toFixed(1)}
                  </span>
                </div>
                {hotel.reviewCount > 0 && (
                  <span className="text-xs sm:text-sm text-slate-500">
                    ({hotel.reviewCount.toLocaleString()}<span className="hidden sm:inline"> reviews</span>)
                  </span>
                )}
              </div>
            )}

            {/* Reddit evidence */}
            {hasRedditPick && hotel.evidence && hotel.evidence.length > 0 && (
              <div className="mb-2 sm:mb-3">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  🔥 Mentioned {hotel.redditScore}x on Reddit
                </p>
              </div>
            )}

            {/* Perks - hidden on small mobile */}
            {hotel.reasons && hotel.reasons.length > 0 && (
              <div className="space-y-1 mb-2 sm:mb-3 hidden sm:block">
                {hotel.reasons.slice(0, 2).map((reason, i) => (
                  <p key={i} className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <span className="text-green-500">✓</span>
                    <span className="line-clamp-1">{reason}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Links */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <button
                onClick={onViewDetails}
                className="min-h-[44px] text-orange-600 hover:text-orange-700 hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-1"
                aria-label={`View details for ${hotel.name}`}
              >
                View Details
              </button>
              {hotel.googleMapsUrl && (
                <a
                  href={hotel.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] flex items-center text-slate-500 hover:text-slate-700 hover:underline gap-1 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-1"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`View ${hotel.name} on Google Maps (opens in new tab)`}
                >
                  <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                  Map
                </a>
              )}
            </div>
          </div>

          {/* Pricing section (right column) */}
          <div className="mt-3 lg:mt-0 lg:ml-6 lg:w-52 lg:flex-shrink-0 lg:border-l lg:border-slate-200 dark:lg:border-slate-700 lg:pl-6 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-start gap-3 sm:gap-4 lg:gap-0 pt-3 sm:pt-0 border-t sm:border-t-0 lg:border-t-0 border-slate-100 dark:border-slate-700">
            {/* Pricing and badges */}
            <div className="flex-1 sm:flex-initial">
              {/* Value badge */}
              {hasExceptionalValue && (
                <div className="mb-2 sm:mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-medium rounded-full">
                    ✓ Great Value
                  </span>
                </div>
              )}

              {/* Pricing */}
              {hotel.pricePerNight ? (
                <div className="space-y-0.5 sm:space-y-1">
                  <p className={`text-xl sm:text-2xl font-bold tabular-nums ${
                    hotel.priceConfidence === 'real' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    ${hotel.pricePerNight.toLocaleString()}
                    {hotel.priceConfidence !== 'real' && (
                      <span className="text-[10px] sm:text-xs font-normal text-slate-400 ml-0.5" title="Estimated price">~</span>
                    )}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500">
                    per night{hotel.priceConfidence !== 'real' && ' (est.)'}
                  </p>

                  {totalPrice && nightCount > 1 && (
                    <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        ${totalPrice.toLocaleString()} <span className="text-xs font-normal text-slate-500">total</span>
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-400">
                        {nightCount} night{nightCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {/* Urgency indicator - only for verified prices */}
                  {hotel.priceConfidence === 'real' && (
                    <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-1 sm:mt-2">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" aria-hidden="true" />
                      <span>Limited availability</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">Price on request</p>
                  <p className="text-[10px] text-slate-300 dark:text-slate-600">Check hotel for rates</p>
                </div>
              )}
            </div>

            {/* Select button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className={`min-h-[44px] w-full sm:w-auto lg:w-full lg:mt-4 px-4 sm:px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                isSelected
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-300 dark:ring-orange-700'
                  : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md hover:shadow-lg'
              }`}
              aria-pressed={isSelected}
              aria-label={isSelected ? `${hotel.name} is selected. Click to deselect` : `Select ${hotel.name}`}
            >
              {isSelected ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]" aria-hidden="true">✓</span> Selected
                </span>
              ) : (
                <span className="whitespace-nowrap">Select<span className="hidden sm:inline"> Hotel</span></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ============================================================================
// FILTER PANEL (AMEX Style - slides in from right)
// ============================================================================

function FilterPanel({
  isOpen,
  onClose,
  filters,
  setFilters,
  priceStats,
  nightCount,
  activeFilterCount,
  onClearAll,
  sortBy,
  setSortBy,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  priceStats: { min: number; max: number };
  nightCount: number;
  activeFilterCount: number;
  onClearAll: () => void;
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
}) {
  const toggleStarRating = (star: number) => {
    setFilters(f => ({
      ...f,
      starRatings: f.starRatings.includes(star)
        ? f.starRatings.filter(s => s !== star)
        : [...f.starRatings, star],
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setFilters(f => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter(a => a !== amenity)
        : [...f.amenities, amenity],
    }));
  };

  const togglePropertyType = (type: string) => {
    setFilters(f => ({
      ...f,
      propertyTypes: f.propertyTypes.includes(type)
        ? f.propertyTypes.filter(t => t !== type)
        : [...f.propertyTypes, type],
    }));
  };

  const toggleAccessibilityFeature = (feature: string) => {
    setFilters(f => ({
      ...f,
      accessibilityFeatures: f.accessibilityFeatures.includes(feature)
        ? f.accessibilityFeatures.filter(a => a !== feature)
        : [...f.accessibilityFeatures, feature],
    }));
  };

  // Ref for focus trap
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Escape key to close filter panel (stopImmediatePropagation prevents also closing parent modal)
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap: keep focus inside the filter panel when tabbing
  useEffect(() => {
    if (!isOpen) return;
    const panel = filterPanelRef.current;
    if (!panel) return;

    // Auto-focus the close button on open
    const closeBtn = panel.querySelector<HTMLElement>('button[aria-label="Close filter panel"]');
    closeBtn?.focus();

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabTrap);
    return () => document.removeEventListener('keydown', handleTabTrap);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={filterPanelRef}
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.8 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-800 z-[60] flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-panel-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-orange-500 to-amber-500 text-white safe-area-inset-top">
              <div>
                <h2 id="filter-panel-title" className="text-base sm:text-lg font-semibold">Filters & Sort</h2>
                {activeFilterCount > 0 && (
                  <p className="text-xs sm:text-sm text-orange-100" aria-live="polite">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Close filter panel"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Filter content - with iOS momentum scrolling */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 sm:space-y-6 pb-8"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {/* Search */}
              <div>
                <label htmlFor="hotel-search" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Search Hotels
                </label>
                <input
                  id="hotel-search"
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
                  placeholder="Hotel name, city, or amenity..."
                  className="w-full min-h-[44px] px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-base text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
                  aria-describedby="hotel-search-hint"
                />
                <span id="hotel-search-hint" className="sr-only">Search by hotel name, city, or amenity</span>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Sort By */}
              <div>
                <label htmlFor="hotel-sort" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Sort By
                </label>
                <select
                  id="hotel-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full min-h-[44px] px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-base text-slate-900 dark:text-white bg-white dark:bg-slate-700 focus:ring-2 focus:ring-orange-500 transition-shadow"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Price */}
              <fieldset>
                <legend className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  Price Range <span className="font-normal text-xs text-slate-500">(per night)</span>
                </legend>
                <div className="mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label htmlFor="price-min" className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Min</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm" aria-hidden="true">$</span>
                        <input
                          id="price-min"
                          type="number"
                          value={filters.priceRange.min}
                          onChange={(e) => {
                            // FIX: Clamp min to not exceed max
                            const val = Number(e.target.value);
                            setFilters(f => ({ ...f, priceRange: { ...f.priceRange, min: Math.min(val, f.priceRange.max) } }));
                          }}
                          min={priceStats.min}
                          max={filters.priceRange.max}
                          className="w-full min-h-[44px] pl-7 pr-2 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-base text-slate-900 dark:text-white bg-white dark:bg-slate-700 focus:ring-2 focus:ring-orange-500 tabular-nums"
                          aria-label="Minimum price per night in dollars"
                        />
                      </div>
                    </div>
                    <span className="text-slate-300 dark:text-slate-600 mt-5 text-lg" aria-hidden="true">&ndash;</span>
                    <div className="flex-1">
                      <label htmlFor="price-max" className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Max</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm" aria-hidden="true">$</span>
                        <input
                          id="price-max"
                          type="number"
                          value={filters.priceRange.max}
                          onChange={(e) => {
                            // FIX: Clamp max to not go below min
                            const val = Number(e.target.value);
                            setFilters(f => ({ ...f, priceRange: { ...f.priceRange, max: Math.max(val, f.priceRange.min) } }));
                          }}
                          min={filters.priceRange.min}
                          max={priceStats.max}
                          className="w-full min-h-[44px] pl-7 pr-2 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-base text-slate-900 dark:text-white bg-white dark:bg-slate-700 focus:ring-2 focus:ring-orange-500 tabular-nums"
                          aria-label="Maximum price per night in dollars"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Price sliders - stacked for min and max control */}
                <div className="px-1 space-y-2">
                  <div className="relative">
                    <label htmlFor="price-slider-min" className="sr-only">Minimum price slider</label>
                    <input
                      id="price-slider-min"
                      type="range"
                      min={priceStats.min}
                      max={priceStats.max}
                      value={filters.priceRange.min}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFilters(f => ({ ...f, priceRange: { ...f.priceRange, min: Math.min(val, f.priceRange.max) } }));
                      }}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
                      aria-label={`Minimum price: $${filters.priceRange.min} per night`}
                      aria-valuemin={priceStats.min}
                      aria-valuemax={priceStats.max}
                      aria-valuenow={filters.priceRange.min}
                    />
                  </div>
                  <div className="relative -mt-2">
                    <label htmlFor="price-slider-max" className="sr-only">Maximum price slider</label>
                    <input
                      id="price-slider-max"
                      type="range"
                      min={priceStats.min}
                      max={priceStats.max}
                      value={filters.priceRange.max}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFilters(f => ({ ...f, priceRange: { ...f.priceRange, max: Math.max(val, f.priceRange.min) } }));
                      }}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-orange-500 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
                      aria-label={`Maximum price: $${filters.priceRange.max} per night`}
                      aria-valuemin={priceStats.min}
                      aria-valuemax={priceStats.max}
                      aria-valuenow={filters.priceRange.max}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                    <span>${priceStats.min}</span>
                    <span>${priceStats.max}+</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center">Drag blue slider for min, orange for max</p>
                </div>
              </fieldset>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Promotions */}
              <div>
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Promotions
                </span>
                <label className="min-h-[44px] flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors -mx-3">
                  <input
                    type="checkbox"
                    checked={filters.showPromotions}
                    onChange={(e) => setFilters(f => ({ ...f, showPromotions: e.target.checked }))}
                    className="w-5 h-5 text-orange-500 border-slate-300 dark:border-slate-600 rounded focus:ring-orange-500 accent-orange-500 flex-shrink-0"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Special offers or discounts</span>
                </label>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Hotel Class (Stars) */}
              <fieldset>
                <legend className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  Hotel Class
                </legend>
                <div className="space-y-1" role="group" aria-label="Filter by star rating">
                  {[5, 4, 3].map(star => (
                    <label key={star} className="min-h-[44px] flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors -mx-3">
                      <input
                        type="checkbox"
                        checked={filters.starRatings.includes(star)}
                        onChange={() => toggleStarRating(star)}
                        className="w-5 h-5 text-orange-500 border-slate-300 dark:border-slate-600 rounded focus:ring-orange-500 accent-orange-500 flex-shrink-0"
                        aria-label={`${star} star hotels`}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="text-amber-500" aria-hidden="true">{'★'.repeat(star)}</span>
                        {star} stars
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Guest Rating */}
              <fieldset>
                <legend className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  Guest Rating
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1" role="radiogroup" aria-label="Filter by guest rating">
                  {[
                    { value: 4.5, label: '4.5+ Exceptional' },
                    { value: 4.0, label: '4.0+ Excellent' },
                    { value: 3.5, label: '3.5+ Very Good' },
                    { value: 0, label: 'Any Rating' },
                  ].map(option => (
                    <label key={option.value} className="min-h-[44px] flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors -mx-3 sm:mx-0">
                      <input
                        type="radio"
                        name="guestRating"
                        checked={filters.minGuestRating === option.value}
                        onChange={() => setFilters(f => ({ ...f, minGuestRating: option.value }))}
                        className="w-5 h-5 text-orange-500 border-slate-300 dark:border-slate-600 focus:ring-orange-500 accent-orange-500 flex-shrink-0"
                        aria-label={option.label}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Amenities */}
              <fieldset>
                <legend className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  Amenities
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1" role="group" aria-label="Filter by amenities">
                  {AMENITY_OPTIONS.slice(0, 8).map(amenity => (
                    <label key={amenity.key} className="min-h-[44px] flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors -mx-3 sm:mx-0">
                      <input
                        type="checkbox"
                        checked={filters.amenities.includes(amenity.key)}
                        onChange={() => toggleAmenity(amenity.key)}
                        className="w-5 h-5 text-orange-500 border-slate-300 dark:border-slate-600 rounded focus:ring-orange-500 accent-orange-500 flex-shrink-0"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{amenity.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Property Type */}
              <fieldset>
                <legend className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  Property Type
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1" role="group" aria-label="Filter by property type">
                  {PROPERTY_TYPES.map(type => (
                    <label key={type.key} className="min-h-[44px] flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors -mx-3 sm:mx-0">
                      <input
                        type="checkbox"
                        checked={filters.propertyTypes.includes(type.key)}
                        onChange={() => togglePropertyType(type.key)}
                        className="w-5 h-5 text-orange-500 border-slate-300 dark:border-slate-600 rounded focus:ring-orange-500 accent-orange-500 flex-shrink-0"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{type.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Traveler Experience / Accessibility */}
              <fieldset>
                <legend className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Traveler Experience
                </legend>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Accessibility features</p>
                <div className="grid grid-cols-1 gap-1" role="group" aria-label="Filter by accessibility features">
                  {[
                    { key: 'elevator', label: 'Elevator' },
                    { key: 'stair_free', label: 'Stair-free path to entrance' },
                    { key: 'wheelchair', label: 'Wheelchair-accessible parking' },
                  ].map(item => (
                    <label key={item.key} className="min-h-[44px] flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors -mx-3">
                      <input
                        type="checkbox"
                        checked={filters.accessibilityFeatures.includes(item.key)}
                        onChange={() => toggleAccessibilityFeature(item.key)}
                        className="w-5 h-5 text-orange-500 border-slate-300 dark:border-slate-600 rounded focus:ring-orange-500 accent-orange-500 flex-shrink-0"
                        aria-label={item.label}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-white dark:bg-slate-800 safe-area-inset-bottom">
              <button
                onClick={onClearAll}
                disabled={activeFilterCount === 0}
                className={`min-h-[44px] px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  activeFilterCount > 0
                    ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                }`}
                aria-label="Clear all filters"
              >
                Clear All{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
              <button
                onClick={onClose}
                className="min-h-[44px] px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Show Results
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// HOTEL MAP VIEW - PLACEHOLDER / NOT YET IMPLEMENTED
// ============================================================================
/**
 * PLACEHOLDER: This component is a stub for future map integration.
 *
 * To implement:
 * 1. Integrate a map library (e.g., Mapbox, Google Maps, or Leaflet)
 * 2. Add hotel markers with popups showing name, price, and rating
 * 3. Enable click-to-select functionality
 * 4. Add viewMode state to the parent component
 * 5. Uncomment the view toggle in the header
 *
 * This component is NOT currently rendered in the UI as the toggle is disabled.
 */
function HotelMapView({
  hotels,
  selectedHotelId,
  onSelectHotel,
  onViewDetails,
}: {
  hotels: HotelCandidate[];
  selectedHotelId?: string | null;
  onSelectHotel: (hotel: HotelCandidate) => void;
  onViewDetails: (hotel: HotelCandidate) => void;
}) {
  return (
    <div className="h-96 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
      <div className="text-center p-8">
        <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
          Map View Coming Soon
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Interactive map view with {hotels.length} hotel markers is planned for a future release.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HOTEL DETAIL MODAL (AMEX Style)
// ============================================================================

function HotelDetailModal({
  hotel,
  isOpen,
  onClose,
  onSelect,
  isSelected,
  nightCount,
}: {
  hotel: HotelCandidate | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
  isSelected: boolean;
  nightCount: number;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'amenities' | 'location'>('details');
  const detailModalRef = useRef<HTMLDivElement>(null);

  // Reset tab to 'details' when a different hotel is opened
  useEffect(() => {
    if (hotel) {
      setActiveTab('details');
    }
  }, [hotel?.id]);

  // Escape key to close detail modal (stopImmediatePropagation prevents closing parent modal)
  useEffect(() => {
    if (!isOpen || !hotel) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, hotel, onClose]);

  // Focus trap for detail modal
  useEffect(() => {
    if (!isOpen || !hotel) return;
    const modal = detailModalRef.current;
    if (!modal) return;

    // Auto-focus the close button on open
    const closeBtn = modal.querySelector<HTMLElement>('button[aria-label="Close hotel details"]');
    closeBtn?.focus();

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabTrap);
    return () => document.removeEventListener('keydown', handleTabTrap);
  }, [isOpen, hotel]);

  const totalPrice = hotel?.pricePerNight ? hotel.pricePerNight * nightCount : null;

  return (
    <AnimatePresence>
      {isOpen && hotel && (
        <motion.div
          ref={detailModalRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 420, mass: 0.8 }}
        className="relative bg-white dark:bg-slate-800 w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-auto overscroll-contain rounded-none sm:rounded-2xl shadow-2xl safe-area-inset"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotel-detail-title"
      >
        {/* Header */}
        <div className="px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between safe-area-inset-top">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close hotel details"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <span className="font-medium text-sm sm:text-base">Hotel Details</span>
          </div>
          <button
            onClick={onClose}
            className="hidden sm:flex min-w-[44px] min-h-[44px] items-center justify-center hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Badges */}
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {hotel.priceConfidence === 'real' && hotel.googleRating && hotel.googleRating >= 4.5 && (
            <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-medium rounded-full">
              ✓ Great Value
            </span>
          )}
          {hotel.redditScore && hotel.redditScore > 2 && (
            <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-[10px] sm:text-xs font-medium rounded-full">
              🔥 Reddit Favorite
            </span>
          )}
          {hotel.isAllInclusive && (
            <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 text-[10px] sm:text-xs font-medium rounded-full">
              ✨ All-Inclusive
            </span>
          )}
        </div>

        {/* Hotel name */}
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <h1 id="hotel-detail-title" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{hotel.name}</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {hotel.stars > 0 && (
              <>
                <span className="text-amber-500" aria-hidden="true">{'★'.repeat(hotel.stars)}</span>
                <span className="sr-only">{hotel.stars} star hotel</span>
              </>
            )}
            {hotel.stars > 0 && ' · '}
            {hotel.city}
          </p>
        </div>

        {/* Image gallery */}
        <div className="px-3 sm:px-6 grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2" role="region" aria-label="Hotel photos">
          <div className="col-span-2 sm:row-span-2 relative aspect-[4/3] sm:aspect-[4/3] rounded-lg overflow-hidden bg-slate-200">
            <FallbackImage
              src={hotel.imageUrl}
              alt={`${hotel.name} main photo`}
              fill
              fallbackType="hotel"
              sizes="(max-width: 640px) 100vw, 66vw"
              showSkeleton
              priority
              fallbackContent={
                <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl bg-slate-200" role="img" aria-label="Hotel placeholder">
                  <span aria-hidden="true">🏨</span>
                </div>
              }
            />
          </div>
          <div className="hidden sm:flex aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 items-center justify-center" role="img" aria-label="Additional hotel photo">
            <div className="text-center text-slate-400 dark:text-slate-400">
              <ImageIcon className="w-8 h-8 mx-auto mb-1" aria-hidden="true" />
              <span className="text-xs">More photos</span>
            </div>
          </div>
          <div className="hidden sm:block aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 relative" role="img" aria-label="Additional hotel photo">
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-400">
              <div className="text-center">
                <ImageIcon className="w-8 h-8 mx-auto mb-1" aria-hidden="true" />
                <span className="text-xs">Gallery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits box */}
        {(hotel.isAllInclusive || (hotel.redditScore && hotel.redditScore > 2)) && (
          <div className="mx-3 sm:mx-6 mt-4 sm:mt-6 bg-slate-800 dark:bg-slate-700 text-white rounded-xl p-4 sm:p-6">
            <div className="text-center mb-3 sm:mb-4">
              <Award className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 text-amber-400" />
              <h3 className="font-semibold text-sm sm:text-base">Why travelers love this hotel</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-center text-xs sm:text-sm">
              {hotel.reasons?.slice(0, 3).map((reason, i) => (
                <div key={i}>
                  <p className="text-slate-300">{reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 mt-4 sm:mt-6">
          <div className="px-3 sm:px-6 flex gap-4 sm:gap-6" role="tablist" aria-label="Hotel information tabs">
            {['Details', 'Amenities', 'Location'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase() as any)}
                role="tab"
                aria-selected={activeTab === tab.toLowerCase()}
                aria-controls={`tabpanel-${tab.toLowerCase()}`}
                id={`tab-${tab.toLowerCase()}`}
                className={`min-h-[44px] py-2 sm:py-3 px-1 text-xs sm:text-sm font-medium border-b-2 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset ${
                  activeTab === tab.toLowerCase()
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-semibold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-3 sm:p-6">
          {activeTab === 'details' && (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8"
              role="tabpanel"
              id="tabpanel-details"
              aria-labelledby="tab-details"
            >
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white mb-2 sm:mb-3">Property Details</h3>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <p className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Check-in</span>
                    <span className="text-slate-900 dark:text-white">starts at 3:00 PM</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Check-out</span>
                    <span className="text-slate-900 dark:text-white">before 12:00 PM</span>
                  </p>
                  {hotel.address && (
                    <p className="flex justify-between gap-2">
                      <span className="text-slate-600 dark:text-slate-400 flex-shrink-0">Address</span>
                      <span className="text-slate-900 dark:text-white text-right truncate">{hotel.address}</span>
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white mb-2 sm:mb-3">Top amenities</h3>
                {hotel.amenities && hotel.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    {hotel.amenities.slice(0, 8).map((amenity, i) => (
                      <p key={i} className="flex items-center gap-1.5 sm:gap-2 text-slate-700 dark:text-slate-300">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span className="truncate">{amenity}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 italic">Amenity information not available.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'amenities' && (
            <div role="tabpanel" id="tabpanel-amenities" aria-labelledby="tab-amenities">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white mb-3 sm:mb-4">All Amenities</h3>
              {hotel.amenities && hotel.amenities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                  {hotel.amenities.map((amenity, i) => (
                    <p key={i} className="flex items-center gap-1.5 sm:gap-2 text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">•</span>
                      <span className="truncate">{amenity}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Check className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Amenity details are not yet available for this hotel.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Check the hotel website for a full list of amenities.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'location' && (
            <div role="tabpanel" id="tabpanel-location" aria-labelledby="tab-location">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white mb-3 sm:mb-4">Location</h3>
              {hotel.address ? (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 sm:mb-4 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {hotel.address}
                </p>
              ) : (
                <div className="text-center py-6 mb-4">
                  <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">Address not available</p>
                </div>
              )}
              {hotel.distanceToCenter !== undefined && hotel.distanceToCenter > 0 && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3 sm:mb-4">
                  {hotel.distanceToCenter.toFixed(1)} miles from city center
                </p>
              )}
              {hotel.googleMapsUrl && (
                <a
                  href={hotel.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-xs sm:text-sm text-slate-700 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                  aria-label={`View ${hotel.name} on Google Maps (opens in new tab)`}
                >
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                  View on Google Maps
                </a>
              )}
            </div>
          )}
        </div>

        {/* Reddit evidence */}
        {hotel.evidence && hotel.evidence.filter(e => e.type === 'reddit_thread').length > 0 && (
          <div className="mx-3 sm:mx-6 mb-4 sm:mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl p-3 sm:p-4">
            <h3 className="font-medium text-sm sm:text-base text-orange-800 dark:text-orange-300 mb-2 sm:mb-3 flex items-center gap-2">
              🔥 What Reddit travelers say
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {hotel.evidence
                .filter(e => e.type === 'reddit_thread')
                .slice(0, 2)
                .map((ev, i) => (
                  <div key={i} className="border-l-2 border-orange-300 pl-2 sm:pl-3">
                    {ev.snippet && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic line-clamp-2 sm:line-clamp-none">"{ev.snippet}"</p>
                    )}
                    {ev.subreddit && (
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-1">r/{ev.subreddit}{ev.score != null ? ` · ${ev.score} upvotes` : ''}</p>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Sticky footer with pricing and select */}
        <div className="sticky bottom-0 bg-white/98 dark:bg-slate-800/98 backdrop-blur-lg border-t-2 border-slate-200 dark:border-slate-700 px-3 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] safe-area-inset-bottom">
          <div>
            {hotel.pricePerNight ? (
              <>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  <span aria-label={`${hotel.pricePerNight} dollars per night`}>
                    ${hotel.pricePerNight.toLocaleString()}
                  </span>
                  <span className="text-xs sm:text-sm font-normal text-slate-500" aria-hidden="true"> /night</span>
                </p>
                {totalPrice && nightCount > 1 && (
                  <p className="text-xs sm:text-sm text-slate-500 tabular-nums">
                    ${totalPrice.toLocaleString()} total for {nightCount} night{nightCount > 1 ? 's' : ''}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">Price on request</p>
            )}
          </div>
          <button
            onClick={onSelect}
            className={`min-h-[48px] sm:min-h-[44px] w-full sm:w-auto px-6 sm:px-8 py-3 rounded-xl font-semibold text-sm sm:text-base transition-all active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
              isSelected
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-300 dark:ring-orange-700'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md hover:shadow-xl'
            }`}
            aria-pressed={isSelected}
            aria-label={isSelected ? `${hotel.name} is selected` : `Select ${hotel.name}`}
          >
            {isSelected ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center" aria-hidden="true">✓</span> Selected
              </span>
            ) : (
              'Select This Hotel'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
