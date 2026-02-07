'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import type { CollectionItem } from '@/stores/tripStore';
import {
  Search,
  X,
  Star,
  Plus,
  MapPin,
  Loader2,
  ArrowUp,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { handleImageError, getPlaceholderImage } from '@/lib/utils';
import { getSubredditsForDestination, isGlobalSubreddit, getGlobalSubredditColor } from '@/lib/data/subredditMapping';
import { getCategoriesForDestination } from '@/lib/data/categories';

// Dynamic import for PlaceDetailModal - reduces initial bundle size
const PlaceDetailModal = dynamic(
  () => import('./PlaceDetailModal'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </div>
    ),
  }
);

interface AddPlaceSearchProps {
  dayIndex: number;
  destinationId: string;
  onClose: () => void;
}

interface PlaceResult {
  id: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  category: string;
  description?: string;
  address?: string;
  distance?: number;
  imageUrl?: string;
  lat: number;
  lng: number;
  durationMinutes?: number;
  source?: {
    type: 'reddit' | 'ai' | 'curated' | 'google';
    subreddit?: string;
    quote?: string;
    upvotes?: number;
    url?: string;
  };
}

export default function AddPlaceSearch({
  dayIndex,
  destinationId,
  onClose,
}: AddPlaceSearchProps) {
  const { trip, scheduleItem, addToCollection } = useTripStore(useShallow((state) => ({
    trip: state.trip,
    scheduleItem: state.scheduleItem,
    addToCollection: state.addToCollection,
  })));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [popularPlaces, setPopularPlaces] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subreddit state
  const [availableSubreddits, setAvailableSubreddits] = useState<string[]>([]);
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(new Set());

  // Get destination info
  const destination = trip.destinations.find(d => d.destinationId === destinationId);
  const destinationName = destination?.place.name || '';

  // Get destination-specific categories (same as CategoryBrowser)
  const CATEGORIES = getCategoriesForDestination(destinationName);

  // Initialize subreddits
  useEffect(() => {
    if (destinationName) {
      const subs = getSubredditsForDestination(destinationName);
      setAvailableSubreddits(subs);
      setSelectedSubreddits(new Set(subs));
    }
  }, [destinationName]);

  const toggleSubreddit = (sub: string) => {
    setSelectedSubreddits(prev => {
      const next = new Set(prev);
      if (next.has(sub)) next.delete(sub);
      else next.add(sub);
      return next;
    });
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch popular places on mount
  useEffect(() => {
    if (destinationName) {
      fetchPopularPlaces();
    }
  }, [destinationName]);

  const fetchPopularPlaces = async () => {
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `popular attractions in ${destinationName}`,
          lat: destination?.place.lat,
          lng: destination?.place.lng,
          radius: 5000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPopularPlaces((data.places || []).slice(0, 4));
      }
    } catch (error) {
      console.error('Failed to fetch popular places:', error);
    }
  };

  const handleSearch = async (query?: string, category?: string) => {
    const searchTerm = query || searchQuery;
    const categoryQuery = category || selectedCategory;

    if (!searchTerm && !categoryQuery) return;

    setIsLoading(true);
    try {
      // Map categories to activity types for quick-plan API
      const activityTypeMap: Record<string, string> = {
        beaches: 'beach',
        museums: 'cultural',
        food_tours: 'food_tour',
        nightlife: 'nightlife',
        outdoor: 'hiking',
        hidden_gems: 'cultural',
        cultural: 'cultural',
        wellness: 'spa_wellness',
        adventure: 'adventure',
        nature: 'nature',
        landmarks: 'cultural',
        water_sports: 'snorkel',
        dining: 'dining',
      };

      // Check if this is a dining category
      const isDiningCategory = categoryQuery && ['dining', 'restaurants', 'cafes', 'food'].includes(categoryQuery.toLowerCase());

      if (isDiningCategory) {
        // Use quick-plan restaurants API
        const response = await fetch('/api/quick-plan/restaurants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cuisineTypes: ['local', 'fine_dining'],
            destination: destinationName,
            hotels: {},
            areas: [{
              id: destinationId,
              name: destinationName,
              centerLat: destination?.place.lat,
              centerLng: destination?.place.lng,
            }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const allRestaurants = Object.values(data.restaurantsByCuisine || {}).flat() as PlaceResult[];
          if (allRestaurants.length > 0) {
            setPlaces(allRestaurants.map(r => ({
              ...r,
              category: 'dining',
            })));
            setIsLoading(false);
            return;
          }
        }
      } else if (categoryQuery) {
        // Use quick-plan experiences API
        const activityType = activityTypeMap[categoryQuery] || categoryQuery;
        const response = await fetch('/api/quick-plan/experiences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityTypes: [activityType],
            destination: destinationName,
            hotels: {},
            areas: [{
              id: destinationId,
              name: destinationName,
              centerLat: destination?.place.lat,
              centerLng: destination?.place.lng,
            }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const experiences = data.experiencesByType?.[activityType] || [];
          if (experiences.length > 0) {
            setPlaces(experiences.map((e: any) => ({
              ...e,
              category: categoryQuery,
            })));
            setIsLoading(false);
            return;
          }
        }
      }

      // Try Reddit-first if we have selected subreddits and a category
      if (selectedSubreddits.size > 0 && categoryQuery) {
        const redditResponse = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: categoryQuery,
            destination: destinationName,
            lat: destination?.place.lat,
            lng: destination?.place.lng,
            subreddits: Array.from(selectedSubreddits),
          }),
        });

        if (redditResponse.ok) {
          const data = await redditResponse.json();
          if (data.recommendations && data.recommendations.length > 0) {
            setPlaces(data.recommendations);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fallback to Google Places
      const fullQuery = categoryQuery
        ? `${categoryQuery} in ${destinationName}`
        : `${searchTerm} in ${destinationName}`;

      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: fullQuery,
          lat: destination?.place.lat,
          lng: destination?.place.lng,
          radius: 10000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPlaces((data.places || []).map((p: PlaceResult) => ({
          ...p,
          source: { type: 'google' as const },
        })));
      }
    } catch (error) {
      console.error('Failed to search places:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    handleSearch(undefined, categoryId);
  };

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const handleAddPlace = (place: PlaceResult) => {
    // Add to collection first
    const collectionType = place.category && ['dining', 'restaurant', 'cafe', 'cafes'].includes(place.category.toLowerCase())
      ? 'restaurants'
      : 'experiences';

    const item = {
      id: place.id,
      name: place.name,
      description: place.description,
      category: place.category,
      rating: place.rating,
      reviewCount: place.reviewCount,
      imageUrl: place.imageUrl,
      lat: place.lat,
      lng: place.lng,
      durationMinutes: place.durationMinutes || 60,
      address: place.address,
      destinationId,
      source: place.source,
    };

    addToCollection(collectionType, item);

    // Then schedule it
    scheduleItem(place.id, dayIndex);

    // Mark as added but don't close - let user add more
    setAddedIds(prev => new Set(prev).add(place.id));
  };

  const displayPlaces = places.length > 0 ? places : popularPlaces;
  const showingPopular = places.length === 0 && popularPlaces.length > 0;

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
      {/* Search input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search places in ${destinationName}...`}
          className="w-full pl-10 pr-10 py-2.5 text-base border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
            if (e.key === 'Escape') onClose();
          }}
        />
        <button
          onClick={onClose}
          className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
          aria-label="Close search"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subreddit chips */}
      {availableSubreddits.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-medium text-slate-400 mb-1.5">RECOMMENDATIONS FROM</p>
          <div className="flex flex-wrap gap-1">
            {availableSubreddits.map((sub) => {
              const isGlobal = isGlobalSubreddit(sub);
              const globalColors = isGlobal ? getGlobalSubredditColor(sub) : null;
              return (
                <button
                  key={sub}
                  onClick={() => toggleSubreddit(sub)}
                  className={clsx(
                    'flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                    selectedSubreddits.has(sub)
                      ? isGlobal
                        ? globalColors?.active
                        : 'bg-orange-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 line-through'
                  )}
                >
                  r/{sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              selectedCategory === cat.id
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-300'
            )}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {showingPopular && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Popular nearby:</p>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : displayPlaces.length > 0 ? (
          displayPlaces.slice(0, 6).map((place) => {
            const isRedditSource = place.source?.type === 'reddit';

            return (
              <div
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                className={clsx(
                  "flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer",
                  isRedditSource
                    ? "bg-orange-50/50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md"
                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-md"
                )}
              >
                {/* Image with placeholder fallback */}
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-700">
                  <img
                    src={place.imageUrl || getPlaceholderImage('generic')}
                    alt={place.name}
                    className="w-full h-full object-cover"
                    onError={(e) => handleImageError(e, 'generic')}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Reddit badge */}
                  {isRedditSource && place.source && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-[9px] font-medium">
                        <ArrowUp className="w-2 h-2" />
                        {place.source.upvotes?.toLocaleString() || '?'}
                      </span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400">
                        r/{place.source.subreddit}
                      </span>
                    </div>
                  )}

                  <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                    {place.name}
                  </p>

                  {/* Description */}
                  {place.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                      {place.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {place.rating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {place.rating.toFixed(1)}
                      </span>
                    )}
                    {place.durationMinutes && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {place.durationMinutes >= 60
                          ? `${Math.floor(place.durationMinutes / 60)}h`
                          : `${place.durationMinutes}m`}
                      </span>
                    )}
                    {place.distance && (
                      <span>{(place.distance / 1000).toFixed(1)} km</span>
                    )}
                  </div>
                </div>

                {/* Add button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!addedIds.has(place.id)) {
                      handleAddPlace(place);
                    }
                  }}
                  disabled={addedIds.has(place.id)}
                  className={clsx(
                    "flex-shrink-0 flex items-center gap-1 px-3 py-2 min-h-[36px] rounded-lg text-xs font-medium transition-colors",
                    addedIds.has(place.id)
                      ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 cursor-default"
                      : "bg-primary-500 text-white hover:bg-primary-600"
                  )}
                >
                  {addedIds.has(place.id) ? (
                    'Added'
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </>
                  )}
                </button>
              </div>
            );
          })
        ) : (
          !isLoading && searchQuery && (
            <div className="text-center py-6">
              <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No places found</p>
            </div>
          )
        )}
      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetailModal
          item={{
            id: selectedPlace.id,
            name: selectedPlace.name,
            category: selectedPlace.category,
            description: selectedPlace.description,
            rating: selectedPlace.rating,
            reviewCount: selectedPlace.reviewCount,
            lat: selectedPlace.lat,
            lng: selectedPlace.lng,
            address: selectedPlace.address,
            imageUrl: selectedPlace.imageUrl,
            durationMinutes: selectedPlace.durationMinutes,
            source: selectedPlace.source,
            destinationId,
          } as CollectionItem}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}
