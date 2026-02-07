'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import Card from '@/components/ui/Card';
import {
  MapPin,
  Plus,
  Trash2,
  GripVertical,
  Search,
  X,
  Moon,
  Minus,
  Globe,
} from 'lucide-react';
import clsx from 'clsx';
import { handleImageError, getPlaceholderImage } from '@/lib/utils';
import type { Place } from '@/lib/schemas/trip';
import {
  searchDestinations,
  getPopularDestinations,
  type DestinationData,
} from '@/lib/data/destinations';

export default function Step2Destinations() {
  const { trip, addDestination, removeDestination, updateDestinationNights, reorderDestinations, setDestinationHeroImage } = useTripStore(useShallow((state) => ({
    trip: state.trip,
    addDestination: state.addDestination,
    removeDestination: state.removeDestination,
    updateDestinationNights: state.updateDestinationNights,
    reorderDestinations: state.reorderDestinations,
    setDestinationHeroImage: state.setDestinationHeroImage,
  })));
  const { destinations, basics } = trip;

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<DestinationData[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pendingDestination, setPendingDestination] = useState<DestinationData | null>(null);
  const [pendingNights, setPendingNights] = useState(3);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScrollRef = useRef<number>(0);
  // Track timeout for scroll cleanup
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Calculate total nights
  const totalNights = destinations.reduce((sum, d) => sum + d.nights, 0);
  const tripNights = basics.startDate && basics.endDate
    ? Math.ceil((new Date(basics.endDate).getTime() - new Date(basics.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get popular destinations on initial load
  const popularDestinations = getPopularDestinations();

  // Search destinations when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = searchDestinations(searchQuery, 12);
      // Filter out already added destinations
      const filtered = results.filter(
        (r) => !destinations.some((d) => d.place.name.toLowerCase() === r.name.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      // Show popular destinations filtered by already added
      const filtered = popularDestinations.filter(
        (p) => !destinations.some((d) => d.place.name.toLowerCase() === p.name.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 8));
    }
  }, [searchQuery, destinations, popularDestinations]);

  // Focus input when search opens, preserve scroll
  useEffect(() => {
    if (showSearch && inputRef.current) {
      // Store current scroll position before focusing
      lastScrollRef.current = window.scrollY;
      inputRef.current.focus();
      // Restore scroll position after focus (prevents jump)
      requestAnimationFrame(() => {
        window.scrollTo({ top: lastScrollRef.current, behavior: 'instant' });
      });
    }
  }, [showSearch]);

  // Fetch hero images for destinations that don't have one
  useEffect(() => {
    destinations.forEach((dest) => {
      if (!dest.heroImageUrl) {
        // Use Unsplash source for image
        const imageUrl = `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=300&fit=crop&q=80&fm=jpg&crop=entropy&cs=tinysrgb`;
        setDestinationHeroImage(dest.destinationId, imageUrl);
      }
    });
  }, [destinations, setDestinationHeroImage]);

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
        ? Math.max(1, Math.floor((tripNights - currentTotalNights) / 2) || 2)
        : 3;
      setPendingNights(suggestedNights);
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

    // Scroll to the newly added destination with cleanup tracking
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      const newCard = document.querySelector(`[data-destination-id="${destId}"]`);
      if (newCard) {
        newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [pendingDestination, pendingNights, addDestination, setDestinationHeroImage]);

  const handleCustomDestination = useCallback(() => {
    if (!searchQuery.trim()) return;

    // Try to find a matching destination first
    const results = searchDestinations(searchQuery, 1);
    if (results.length > 0) {
      handleAddDestination(results[0]);
      return;
    }

    // Create a custom destination data object
    const customDestData: DestinationData = {
      name: searchQuery.trim(),
      country: 'Custom',
      countryCode: 'XX',
      lat: 0,
      lng: 0,
      imageUrl: `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop`,
    };

    handleAddDestination(customDestData);
  }, [searchQuery, handleAddDestination]);

  const handleNightsChange = (destId: string, delta: number, currentNights: number) => {
    // Calculate max nights this destination can have
    const otherDestNights = destinations
      .filter(d => d.destinationId !== destId)
      .reduce((sum, d) => sum + d.nights, 0);
    const maxForThisDest = tripNights > 0 ? tripNights - otherDestNights : 30;

    const newNights = Math.max(1, Math.min(maxForThisDest, currentNights + delta));
    updateDestinationNights(destId, newNights);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="section-title">Where Do You Want to Go?</h1>
        <p className="section-subtitle">
          Add one or more destinations for your trip
          {tripNights > 0 && ` (${tripNights} nights available)`}
        </p>
      </div>

      {/* Current Destinations */}
      {destinations.length > 0 && (
        <div className="space-y-4">
          {destinations.map((dest, index) => (
            <Card
              key={dest.destinationId}
              data-destination-id={dest.destinationId}
              className={clsx(
                'transition-all',
                draggedId === dest.destinationId && 'opacity-50 scale-98'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Drag handle */}
                <div
                  draggable
                  onDragStart={() => setDraggedId(dest.destinationId)}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedId && draggedId !== dest.destinationId) {
                      const dragIdx = destinations.findIndex((d) => d.destinationId === draggedId);
                      const hoverIdx = index;
                      if (dragIdx !== hoverIdx) {
                        const newOrder = [...destinations.map((d) => d.destinationId)];
                        const [removed] = newOrder.splice(dragIdx, 1);
                        newOrder.splice(hoverIdx, 0, removed);
                        reorderDestinations(newOrder);
                      }
                    }
                  }}
                  className="cursor-grab text-slate-400 hover:text-slate-600 p-1"
                >
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Hero image */}
                <div className="w-24 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  <img
                    src={dest.heroImageUrl || getPlaceholderImage('map')}
                    alt={dest.place.name}
                    className="w-full h-full object-cover"
                    onError={(e) => handleImageError(e, 'map')}
                  />
                </div>

                {/* Destination info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{dest.place.name}</h3>
                    {dest.place.countryCode !== 'XX' && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">{dest.place.countryCode}</span>
                    )}
                  </div>

                  {/* Nights selector - more prominent */}
                  <div className="flex items-center gap-2 mt-3 p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <Moon className="w-4 h-4 text-primary-500" />
                    <button
                      type="button"
                      onClick={() => handleNightsChange(dest.destinationId, -1, dest.nights)}
                      disabled={dest.nights <= 1}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-500 border border-slate-200 dark:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-lg text-slate-900 dark:text-white">{dest.nights}</span>
                    <button
                      type="button"
                      onClick={() => handleNightsChange(dest.destinationId, 1, dest.nights)}
                      disabled={dest.nights >= 30}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-500 border border-slate-200 dark:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">nights</span>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeDestination(dest.destinationId)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </Card>
          ))}

          {/* Nights summary */}
          {destinations.length > 0 && (
            <div
              className={clsx(
                'p-4 rounded-xl',
                totalNights === tripNights
                  ? 'bg-green-50 text-green-700'
                  : totalNights > tripNights
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-50 text-slate-600'
              )}
            >
              <p className="font-medium">
                {totalNights} nights allocated
                {tripNights > 0 && (
                  <>
                    {' / '}{tripNights} nights available
                    {totalNights > tripNights && ' (exceeds trip length!)'}
                    {totalNights < tripNights && ` (${tripNights - totalNights} unallocated)`}
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add destination */}
      {showSearch ? (
        <Card>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any city, country, or region..."
              className="w-full pl-12 pr-12 py-3 text-base border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomDestination();
                if (e.key === 'Escape') {
                  setShowSearch(false);
                  setSearchQuery('');
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search results / Popular destinations */}
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {searchResults.map((dest) => (
                <button
                  key={dest.name}
                  type="button"
                  onClick={() => handleAddDestination(dest)}
                  className="relative group overflow-hidden rounded-xl aspect-[4/3]"
                >
                  <img
                    src={dest.imageUrl || getPlaceholderImage('map')}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => handleImageError(e, 'map')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                    <p className="font-semibold text-white">{dest.name}</p>
                    <p className="text-xs text-white/80">{dest.country}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="text-center py-8">
              <Globe className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 mb-4">No destinations found for "{searchQuery}"</p>
              <button
                type="button"
                onClick={handleCustomDestination}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add "{searchQuery}" anyway
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-slate-400 py-4">
              Type at least 2 characters to search
            </p>
          )}

          {/* Custom destination hint */}
          {searchQuery.length >= 2 && searchResults.length > 0 && !searchResults.some((r) => r.name.toLowerCase() === searchQuery.toLowerCase()) && (
            <button
              type="button"
              onClick={handleCustomDestination}
              className="w-full mt-4 p-3 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add "{searchQuery}" as destination
            </button>
          )}
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="w-full p-6 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-3"
        >
          <MapPin className="w-6 h-6" />
          <span className="font-medium">
            {destinations.length === 0 ? 'Add your first destination' : 'Add another destination'}
          </span>
        </button>
      )}

      {/* Multi-destination hint */}
      {destinations.length === 1 && (
        <p className="text-center text-sm text-slate-500">
          Planning a multi-city trip? Add more destinations above to create your perfect itinerary.
        </p>
      )}

      {/* Nights Selection Modal for 2nd+ destination */}
      {pendingDestination && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            {/* Header with destination preview */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src={pendingDestination.imageUrl || getPlaceholderImage('map')}
                  alt={pendingDestination.name}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageError(e, 'map')}
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
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 shadow hover:bg-slate-100 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">{pendingNights}</span>
                  <p className="text-sm text-slate-500 dark:text-slate-400">nights</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingNights(Math.min(30, pendingNights + 1))}
                  disabled={pendingNights >= 30}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 shadow hover:bg-slate-100 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-5 h-5" />
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
                  <p className="mt-2 text-xs text-amber-600">
                    Tip: You can adjust nights for each destination after adding.
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
    </div>
  );
}
