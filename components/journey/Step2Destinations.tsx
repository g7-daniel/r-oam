'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
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
  Image as ImageIcon,
  Globe,
} from 'lucide-react';
import clsx from 'clsx';
import type { Place } from '@/lib/schemas/trip';
import {
  searchDestinations,
  getPopularDestinations,
  type DestinationData,
} from '@/lib/data/destinations';

export default function Step2Destinations() {
  const { trip, addDestination, removeDestination, updateDestinationNights, reorderDestinations, setActiveDestination, setDestinationHeroImage } = useTripStoreV2();
  const { destinations, basics } = trip;

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<DestinationData[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef<number>(0);

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
      const place: Place = {
        name: destData.name,
        countryCode: destData.countryCode,
        lat: destData.lat,
        lng: destData.lng,
      };

      // Smart night allocation:
      // - If no destinations yet, allocate all available nights (or default 3 if no dates)
      // - If destinations exist, allocate remaining nights (min 1)
      const currentTotalNights = destinations.reduce((sum, d) => sum + d.nights, 0);
      const availableNights = tripNights > 0 ? tripNights - currentTotalNights : 0;
      const nightsToAllocate = destinations.length === 0
        ? (tripNights > 0 ? tripNights : 3)  // First destination gets all nights
        : Math.max(1, availableNights);       // Subsequent destinations get remaining

      const destId = addDestination(place, nightsToAllocate);
      setDestinationHeroImage(destId, destData.imageUrl);
      setShowSearch(false);
      setSearchQuery('');
      // Scroll to the newly added destination after a brief delay
      setTimeout(() => {
        const newCard = document.querySelector(`[data-destination-id="${destId}"]`);
        if (newCard) {
          newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    },
    [addDestination, setDestinationHeroImage, destinations, tripNights]
  );

  const handleCustomDestination = useCallback(() => {
    if (!searchQuery.trim()) return;

    // Try to find a matching destination first
    const results = searchDestinations(searchQuery, 1);
    if (results.length > 0) {
      handleAddDestination(results[0]);
      return;
    }

    // Create a custom place
    const place: Place = {
      name: searchQuery.trim(),
      countryCode: 'XX', // Will be improved later
      lat: 0,
      lng: 0,
    };

    // Smart night allocation for custom destinations
    const currentTotalNights = destinations.reduce((sum, d) => sum + d.nights, 0);
    const availableNights = tripNights > 0 ? tripNights - currentTotalNights : 0;
    const nightsToAllocate = destinations.length === 0
      ? (tripNights > 0 ? tripNights : 3)
      : Math.max(1, availableNights);

    const destId = addDestination(place, nightsToAllocate);
    // Use Unsplash for custom destination image
    const imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(searchQuery + ' travel')}`;
    setDestinationHeroImage(destId, imageUrl);
    setShowSearch(false);
    setSearchQuery('');
  }, [searchQuery, addDestination, setDestinationHeroImage, handleAddDestination]);

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
                  {dest.heroImageUrl ? (
                    <img
                      src={dest.heroImageUrl}
                      alt={dest.place.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback on error
                        (e.target as HTMLImageElement).src = `https://source.unsplash.com/400x300/?${encodeURIComponent(dest.place.name + ' travel')}`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Destination info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <h3 className="font-semibold text-slate-900">{dest.place.name}</h3>
                    {dest.place.countryCode !== 'XX' && (
                      <span className="text-sm text-slate-500">{dest.place.countryCode}</span>
                    )}
                  </div>

                  {/* Nights selector */}
                  <div className="flex items-center gap-3 mt-2">
                    <Moon className="w-4 h-4 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => handleNightsChange(dest.destinationId, -1, dest.nights)}
                      disabled={dest.nights <= 1}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-medium">{dest.nights}</span>
                    <button
                      type="button"
                      onClick={() => handleNightsChange(dest.destinationId, 1, dest.nights)}
                      disabled={dest.nights >= 30}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm text-slate-500">nights</span>
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
              className="w-full pl-12 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                    src={dest.imageUrl}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://source.unsplash.com/400x300/?${encodeURIComponent(dest.name + ' travel')}`;
                    }}
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
    </div>
  );
}
