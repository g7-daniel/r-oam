'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  MapPin,
  Plus,
  Trash2,
  Search,
  X,
  Moon,
  Users,
  Sparkles,
  ArrowRight,
  Send,
  Globe,
  Loader2,
} from 'lucide-react';

// Dynamic import for DateRangePicker - reduces initial bundle size
const DateRangePicker = dynamic(
  () => import('@/components/ui/DateRangePicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    ),
  }
);
import clsx from 'clsx';
import type { Place } from '@/lib/schemas/trip';
import {
  searchDestinations,
  getPopularDestinations,
  type DestinationData,
} from '@/lib/data/destinations';

// Trip style tags
const TRIP_STYLE_TAGS = [
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'mid-range', label: 'Mid-Range', icon: '✨' },
  { id: 'premium', label: 'Premium', icon: '💎' },
  { id: 'luxury', label: 'Luxury', icon: '👑' },
];

export default function StartPage() {
  const router = useRouter();
  const {
    trip,
    addDestination,
    removeDestination,
    setDates,
    setTripTypeTags,
    setDestinationHeroImage,
    updateDestinationNights,
  } = useTripStore(useShallow((state) => ({
    trip: state.trip,
    addDestination: state.addDestination,
    removeDestination: state.removeDestination,
    setDates: state.setDates,
    setTripTypeTags: state.setTripTypeTags,
    setDestinationHeroImage: state.setDestinationHeroImage,
    updateDestinationNights: state.updateDestinationNights,
  })));
  const { destinations, basics } = trip;

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(destinations.length === 0);
  const [searchResults, setSearchResults] = useState<DestinationData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStyleTags, setSelectedStyleTags] = useState<string[]>(basics.tripTypeTags || []);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<DestinationData | null>(null);
  const [pendingNights, setPendingNights] = useState(3);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate total nights
  const totalNights = destinations.reduce((sum, d) => sum + d.nights, 0);
  const tripNights = basics.startDate && basics.endDate
    ? Math.ceil((new Date(basics.endDate).getTime() - new Date(basics.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get popular destinations on initial load
  const popularDestinations = getPopularDestinations();

  // Search destinations when query changes - use live Google Places API
  useEffect(() => {
    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length < 2) {
      // Show popular destinations when no search query
      const filtered = popularDestinations.filter(
        (p) => !destinations.some((d) => d.place.name.toLowerCase() === p.name.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 8));
      setIsSearching(false);
      return;
    }

    // First, show local results immediately for responsiveness
    const localResults = searchDestinations(searchQuery, 8);
    const filteredLocal = localResults.filter(
      (r) => !destinations.some((d) => d.place.name.toLowerCase() === r.name.toLowerCase())
    );
    if (filteredLocal.length > 0) {
      setSearchResults(filteredLocal);
    }

    // Then debounce the API call
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/destinations/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.destinations && data.destinations.length > 0) {
            // Merge API results with local results, prioritizing API
            const apiResults = data.destinations.filter(
              (r: DestinationData) => !destinations.some((d) => d.place.name.toLowerCase() === r.name.toLowerCase())
            );
            // Combine: API results first, then unique local results
            const combined = [...apiResults];
            for (const local of filteredLocal) {
              if (!combined.some((c: DestinationData) => c.name.toLowerCase() === local.name.toLowerCase())) {
                combined.push(local);
              }
            }
            setSearchResults(combined.slice(0, 8));
          }
        }
      } catch (error) {
        console.error('Search API error:', error);
        // Keep showing local results on error
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, destinations, popularDestinations]);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  const handleAddDestination = useCallback(
    (destData: DestinationData) => {
      // If this is the first destination, add directly
      if (destinations.length === 0) {
        const place: Place = {
          name: destData.name,
          countryCode: destData.countryCode,
          lat: destData.lat,
          lng: destData.lng,
        };
        const nightsToAllocate = tripNights > 0 ? tripNights : 3;
        const destId = addDestination(place, nightsToAllocate);
        setDestinationHeroImage(destId, destData.imageUrl);
        setShowSearch(false);
        setSearchQuery('');
        return;
      }

      // For 2nd+ destination, show the nights selection modal
      const currentTotalNights = destinations.reduce((sum, d) => sum + d.nights, 0);
      const suggestedNights = tripNights > 0
        ? Math.max(2, Math.floor((tripNights - currentTotalNights + 2) / 2))
        : 3;
      setPendingNights(Math.min(suggestedNights, tripNights > 0 ? tripNights : 7));
      setPendingDestination(destData);
      setShowSearch(false);
      setSearchQuery('');
    },
    [addDestination, setDestinationHeroImage, destinations, tripNights]
  );

  const confirmAddDestination = useCallback(() => {
    if (!pendingDestination) return;

    const place: Place = {
      name: pendingDestination.name,
      countryCode: pendingDestination.countryCode,
      lat: pendingDestination.lat,
      lng: pendingDestination.lng,
    };

    const destId = addDestination(place, pendingNights);
    setDestinationHeroImage(destId, pendingDestination.imageUrl);
    setPendingDestination(null);
  }, [pendingDestination, pendingNights, addDestination, setDestinationHeroImage]);

  const handleCustomDestination = useCallback(() => {
    if (!searchQuery.trim()) return;

    const results = searchDestinations(searchQuery, 1);
    if (results.length > 0) {
      handleAddDestination(results[0]);
      return;
    }

    // Create custom destination and use handleAddDestination
    const customDest: DestinationData = {
      name: searchQuery.trim(),
      countryCode: 'XX',
      country: 'Custom',
      lat: 0,
      lng: 0,
      imageUrl: `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop`,
    };
    handleAddDestination(customDest);
  }, [searchQuery, handleAddDestination]);

  const handleNightsChange = (destId: string, delta: number, currentNights: number) => {
    const otherDestNights = destinations
      .filter(d => d.destinationId !== destId)
      .reduce((sum, d) => sum + d.nights, 0);
    const maxForThisDest = tripNights > 0 ? Math.max(1, tripNights - otherDestNights) : 30;
    const newNights = Math.max(1, Math.min(maxForThisDest, currentNights + delta));
    updateDestinationNights(destId, newNights);
  };

  const handleStyleTagToggle = (tagId: string) => {
    setSelectedStyleTags(prev => {
      const newTags = prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId];
      setTripTypeTags(newTags);
      return newTags;
    });
  };

  const handleDateChange = (startDate: string | null, endDate: string | null) => {
    setDates(startDate, endDate);

    // If we have destinations, update their nights to match the new trip duration
    if (startDate && endDate && destinations.length > 0) {
      const newTripNights = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (newTripNights > 0) {
        // Distribute nights across destinations
        if (destinations.length === 1) {
          // Single destination gets all nights
          updateDestinationNights(destinations[0].destinationId, newTripNights);
        } else {
          // Multiple destinations: try to keep proportions or distribute evenly
          const currentTotal = destinations.reduce((sum, d) => sum + d.nights, 0);
          destinations.forEach((dest) => {
            const proportion = currentTotal > 0 ? dest.nights / currentTotal : 1 / destinations.length;
            const newNights = Math.max(1, Math.round(newTripNights * proportion));
            updateDestinationNights(dest.destinationId, newNights);
          });
        }
      }
    }
  };

  const handleInviteTripmates = () => {
    // In production, this would send invites via API
    setShowInviteModal(false);
    setInviteEmails('');
  };

  const handleStartPlanning = () => {
    if (destinations.length === 0) return;
    // Navigate to the itinerary builder using window.location for reliability
    window.location.href = `/plan/${trip.id}`;
  };

  const canStartPlanning = destinations.length > 0 && tripNights > 0;

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        {/* Header - compact on mobile */}
        <div className="text-center mb-6 sm:mb-10">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary-500" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Plan a Trip</h1>
          </div>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 hidden sm:block">
            Build your perfect itinerary with AI-powered recommendations
          </p>
        </div>

        {/* Destination Section */}
        <Card className="mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">Where to?</h2>
          </div>

          {/* Current Destinations */}
          {destinations.length > 0 && (
            <div className="space-y-2 sm:space-y-3 mb-4">
              {destinations.map((dest, index) => (
                <div
                  key={dest.destinationId}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg sm:rounded-xl"
                >
                  {/* Destination image */}
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-600 flex-shrink-0">
                    {dest.heroImageUrl && (
                      <img
                        src={dest.heroImageUrl}
                        alt={dest.place.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Destination info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">{dest.place.name}</h3>
                    </div>
                    {/* Nights adjuster */}
                    {tripNights > 0 && (
                      <div className="flex items-center gap-2 ml-7 mt-1">
                        <button
                          type="button"
                          onClick={() => handleNightsChange(dest.destinationId, -1, dest.nights)}
                          disabled={dest.nights <= 1}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          aria-label="Decrease nights"
                        >
                          <span className="text-sm font-bold">−</span>
                        </button>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-16 text-center">
                          {dest.nights} nights
                        </span>
                        <button
                          type="button"
                          onClick={() => handleNightsChange(dest.destinationId, 1, dest.nights)}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          aria-label="Increase nights"
                        >
                          <span className="text-sm font-bold">+</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeDestination(dest.destinationId)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    aria-label={`Remove ${dest.place.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search/Add destination */}
          {showSearch ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city, country, region..."
                  className="w-full pl-9 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-400 dark:placeholder-slate-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomDestination();
                    if (e.key === 'Escape') {
                      if (destinations.length > 0) {
                        setShowSearch(false);
                        setSearchQuery('');
                      }
                    }
                  }}
                />
                {destinations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
                    aria-label="Close search"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Search results */}
              {isSearching && searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Searching destinations...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="relative">
                  {isSearching && (
                    <div className="absolute top-2 right-2 z-10">
                      <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    {searchResults.slice(0, 8).map((dest, index) => (
                      <button
                        key={`${dest.name}-${index}`}
                        type="button"
                        onClick={() => handleAddDestination(dest)}
                        className={clsx(
                          "relative group overflow-hidden rounded-lg sm:rounded-xl aspect-[4/3] bg-gradient-to-br from-primary-400 to-primary-600",
                          // Hide items 5-8 on mobile (show only first 4)
                          index >= 4 && "hidden sm:block"
                        )}
                      >
                        <img
                          src={dest.imageUrl || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop&q=80`}
                          alt={dest.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            // Prevent infinite loop
                            if (!img.dataset.fallback) {
                              img.dataset.fallback = '1';
                              img.src = `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop&q=80`;
                            } else {
                              // Hide image completely, show gradient background
                              img.style.display = 'none';
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 text-left">
                          <p className="font-medium text-white text-xs sm:text-sm leading-tight">{dest.name}</p>
                          <p className="text-[10px] sm:text-xs text-white/80">{dest.country}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchQuery.length >= 2 && !isSearching ? (
                <div className="text-center py-6">
                  <Globe className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">No destinations found for "{searchQuery}"</p>
                  <button
                    type="button"
                    onClick={handleCustomDestination}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add "{searchQuery}" anyway
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="w-full p-3 sm:p-4 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl text-sm sm:text-base text-slate-500 dark:text-slate-400 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all flex items-center justify-center gap-1.5 sm:gap-2"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Add another destination</span>
            </button>
          )}

          {/* Nights summary */}
          {destinations.length > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Total nights:</span>
                <span className={clsx(
                  'font-semibold',
                  tripNights > 0 && totalNights !== tripNights ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                )}>
                  {totalNights} nights
                  {tripNights > 0 && totalNights !== tripNights && ` (${tripNights} selected)`}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Dates Section - Required */}
        <Card className="mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">When are you traveling?</h2>
          </div>

          <DateRangePicker
            startDate={basics.startDate}
            endDate={basics.endDate}
            onChange={handleDateChange}
          />

          {tripNights > 0 && (
            <div className="mt-3 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
                <Moon className="w-4 h-4" />
                {tripNights} nights
              </span>
            </div>
          )}
        </Card>

        {/* Trip Style Tags */}
        <Card className="mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">Trip Style</h2>
            </div>
            <span className="text-xs sm:text-sm text-slate-400">(optional)</span>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {TRIP_STYLE_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleStyleTagToggle(tag.id)}
                className={clsx(
                  'px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all',
                  selectedStyleTags.includes(tag.id)
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                )}
              >
                <span className="mr-0.5 sm:mr-1">{tag.icon}</span>
                {tag.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Invite Tripmates - compact link on mobile, card on desktop */}
        <div className="mb-6 sm:mb-8">
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 text-sm sm:text-base text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors sm:bg-white sm:dark:bg-slate-800 sm:rounded-xl sm:shadow-sm sm:border sm:border-slate-100 sm:dark:border-slate-700"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-medium">+ Invite tripmates</span>
          </button>
        </div>

        {/* Start Planning Button */}
        <Button
          onClick={handleStartPlanning}
          disabled={!canStartPlanning}
          size="lg"
          className="w-full"
        >
          Start Planning
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        {!canStartPlanning && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-3">
            {destinations.length === 0
              ? 'Add at least one destination to start planning'
              : 'Select your travel dates to start planning'}
          </p>
        )}
      </div>

      {/* Nights Selection Modal for 2nd+ destination */}
      {pendingDestination && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            {/* Header with destination preview */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                <img
                  src={pendingDestination.imageUrl}
                  alt={pendingDestination.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop`;
                  }}
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Adding {pendingDestination.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  How many nights will you stay?
                </p>
              </div>
            </div>

            {/* Nights selector */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPendingNights(Math.max(1, pendingNights - 1))}
                  disabled={pendingNights <= 1}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 shadow hover:bg-slate-100 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xl font-bold"
                >
                  −
                </button>
                <div className="text-center">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">{pendingNights}</span>
                  <p className="text-sm text-slate-500 dark:text-slate-400">nights</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingNights(Math.min(tripNights > 0 ? tripNights : 30, pendingNights + 1))}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 shadow hover:bg-slate-100 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Summary of trip allocation */}
            {tripNights > 0 && (
              <div className="mb-6 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-medium mb-2">Trip breakdown:</p>
                <ul className="space-y-1">
                  {destinations.map((d, i) => (
                    <li key={d.destinationId} className="flex justify-between">
                      <span>{i + 1}. {d.place.name}</span>
                      <span className="font-medium">{d.nights} nights</span>
                    </li>
                  ))}
                  <li className="flex justify-between text-primary-600 dark:text-primary-400">
                    <span>{destinations.length + 1}. {pendingDestination.name}</span>
                    <span className="font-medium">{pendingNights} nights</span>
                  </li>
                  <li className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-600 font-medium">
                    <span>Total</span>
                    <span className={clsx(
                      totalNights + pendingNights === tripNights
                        ? 'text-green-600'
                        : totalNights + pendingNights > tripNights
                        ? 'text-amber-600'
                        : 'text-slate-600 dark:text-slate-300'
                    )}>
                      {totalNights + pendingNights} / {tripNights} nights
                    </span>
                  </li>
                </ul>
                {totalNights + pendingNights > tripNights && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Tip: You can adjust nights after adding using the +/- buttons.
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingDestination(null)}
                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAddDestination}
                className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
              >
                Add Destination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-500" />
                <h2 className="font-semibold text-slate-900 dark:text-white">Invite Tripmates</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Close invite modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Enter email addresses:
              </label>
              <textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="friend@email.com, partner@email.com"
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder-slate-400"
                rows={3}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Separate multiple emails with commas
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowInviteModal(false)}
                className="flex-1"
              >
                Skip for now
              </Button>
              <Button
                onClick={handleInviteTripmates}
                disabled={!inviteEmails.trim()}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Invites
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
