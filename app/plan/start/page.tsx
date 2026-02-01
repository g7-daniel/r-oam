'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import DateRangePicker from '@/components/ui/DateRangePicker';
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
  } = useTripStoreV2();
  const { destinations, basics } = trip;

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(destinations.length === 0);
  const [searchResults, setSearchResults] = useState<DestinationData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStyleTags, setSelectedStyleTags] = useState<string[]>(basics.tripTypeTags || []);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [isClient, setIsClient] = useState(false);
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
      const place: Place = {
        name: destData.name,
        countryCode: destData.countryCode,
        lat: destData.lat,
        lng: destData.lng,
      };

      // Smart night allocation
      const currentTotalNights = destinations.reduce((sum, d) => sum + d.nights, 0);
      const availableNights = tripNights > 0 ? tripNights - currentTotalNights : 0;
      const nightsToAllocate = destinations.length === 0
        ? (tripNights > 0 ? tripNights : 3)
        : Math.max(1, Math.min(availableNights, 3));

      const destId = addDestination(place, nightsToAllocate);
      setDestinationHeroImage(destId, destData.imageUrl);
      setShowSearch(false);
      setSearchQuery('');
    },
    [addDestination, setDestinationHeroImage, destinations, tripNights]
  );

  const handleCustomDestination = useCallback(() => {
    if (!searchQuery.trim()) return;

    const results = searchDestinations(searchQuery, 1);
    if (results.length > 0) {
      handleAddDestination(results[0]);
      return;
    }

    const place: Place = {
      name: searchQuery.trim(),
      countryCode: 'XX',
      lat: 0,
      lng: 0,
    };

    const currentTotalNights = destinations.reduce((sum, d) => sum + d.nights, 0);
    const availableNights = tripNights > 0 ? tripNights - currentTotalNights : 0;
    const nightsToAllocate = destinations.length === 0
      ? (tripNights > 0 ? tripNights : 3)
      : Math.max(1, availableNights);

    const destId = addDestination(place, nightsToAllocate);
    const imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(searchQuery + ' travel')}`;
    setDestinationHeroImage(destId, imageUrl);
    setShowSearch(false);
    setSearchQuery('');
  }, [searchQuery, addDestination, setDestinationHeroImage, destinations, tripNights, handleAddDestination]);

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
    console.log('Inviting:', inviteEmails.split(',').map(e => e.trim()));
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
          <p className="text-gray-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary-500" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Plan a Trip</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Build your perfect itinerary with AI-powered recommendations
          </p>
        </div>

        {/* Destination Section */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Where to?</h2>
          </div>

          {/* Current Destinations */}
          {destinations.length > 0 && (
            <div className="space-y-3 mb-4">
              {destinations.map((dest, index) => (
                <div
                  key={dest.destinationId}
                  className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                >
                  {/* Destination image */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-600 flex-shrink-0">
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
                    {tripNights > 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 ml-7">
                        {dest.nights} nights
                      </p>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeDestination(dest.destinationId)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search/Add destination */}
          {showSearch ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search any city, country, or region..."
                  className="w-full pl-12 pr-12 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-400 dark:placeholder-slate-400"
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {searchResults.slice(0, 8).map((dest, index) => (
                      <button
                        key={`${dest.name}-${index}`}
                        type="button"
                        onClick={() => handleAddDestination(dest)}
                        className="relative group overflow-hidden rounded-xl aspect-[4/3]"
                      >
                        <img
                          src={dest.imageUrl}
                          alt={dest.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback to Unsplash if image fails to load
                            (e.target as HTMLImageElement).src = `https://source.unsplash.com/400x300/?${encodeURIComponent(dest.name + ' travel')}`;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
                          <p className="font-medium text-white text-sm">{dest.name}</p>
                          <p className="text-xs text-white/80">{dest.country}</p>
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
              className="w-full p-4 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
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
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">When are you traveling?</h2>
          </div>

          <DateRangePicker
            startDate={basics.startDate}
            endDate={basics.endDate}
            onChange={handleDateChange}
          />

          {tripNights > 0 && (
            <div className="mt-3 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                <Moon className="w-4 h-4" />
                {tripNights} nights
              </span>
            </div>
          )}
        </Card>

        {/* Trip Style Tags */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Trip Style</h2>
            </div>
            <span className="text-sm text-slate-400">(optional)</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {TRIP_STYLE_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleStyleTagToggle(tag.id)}
                className={clsx(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  selectedStyleTags.includes(tag.id)
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                )}
              >
                <span className="mr-1">{tag.icon}</span>
                {tag.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Invite Tripmates */}
        <Card className="mb-8">
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">+ Invite tripmates</span>
          </button>
        </Card>

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
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
