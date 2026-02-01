'use client';

import { useState, useEffect } from 'react';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import type { CollectionItem } from '@/stores/tripStoreV2';
import {
  Search,
  MapPin,
  Star,
  Plus,
  ArrowLeft,
  Loader2,
  Clock,
  ArrowUp,
} from 'lucide-react';
import clsx from 'clsx';
import { getSubredditsForDestination, isGlobalSubreddit, getGlobalSubredditColor } from '@/lib/data/subredditMapping';
import { ALL_CATEGORIES, getCategoriesForDestination } from '@/lib/data/categories';
import PlaceDetailModal from './PlaceDetailModal';

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
  openNow?: boolean;
  source?: {
    type: 'reddit' | 'ai' | 'curated' | 'google';
    subreddit?: string;
    quote?: string;
    upvotes?: number;
    url?: string;
  };
  mentionCount?: number;
}

export default function CategoryBrowser() {
  const { trip, addToCollection } = useTripStoreV2();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  // Subreddit selection state
  const [availableSubreddits, setAvailableSubreddits] = useState<string[]>([]);
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(new Set());
  const [useRedditFirst, setUseRedditFirst] = useState(true);

  // Get current destination for search
  const activeDestination = trip.destinations.find(
    d => d.destinationId === trip.activeDestinationId
  ) || trip.destinations[0];

  const destinationName = activeDestination?.place.name || '';

  // Get destination-specific categories
  const CATEGORIES = getCategoriesForDestination(destinationName);

  // Initialize subreddits when destination changes
  useEffect(() => {
    if (destinationName) {
      const subs = getSubredditsForDestination(destinationName);
      setAvailableSubreddits(subs);
      setSelectedSubreddits(new Set(subs)); // All selected by default
    }
  }, [destinationName]);

  // Toggle subreddit selection
  const toggleSubreddit = (sub: string) => {
    setSelectedSubreddits(prev => {
      const next = new Set(prev);
      if (next.has(sub)) {
        next.delete(sub);
      } else {
        next.add(sub);
      }
      return next;
    });
  };

  // Fetch places when category selected
  useEffect(() => {
    if (selectedCategory && activeDestination) {
      fetchPlaces();
    }
  }, [selectedCategory, activeDestination?.destinationId]);

  const fetchPlaces = async () => {
    if (!activeDestination) return;

    setIsLoading(true);
    try {
      const category = ALL_CATEGORIES.find(c => c.id === selectedCategory);
      const query = searchQuery || category?.query || selectedCategory;

      // Try Reddit-first API if subreddits are selected
      if (useRedditFirst && selectedSubreddits.size > 0 && selectedCategory !== 'search') {
        const redditResponse = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: selectedCategory,
            destination: destinationName,
            lat: activeDestination.place.lat,
            lng: activeDestination.place.lng,
            subreddits: Array.from(selectedSubreddits),
          }),
        });

        if (redditResponse.ok) {
          const data = await redditResponse.json();
          if (data.recommendations && data.recommendations.length > 0) {
            const placesWithIds = data.recommendations.map((p: any, index: number) => ({
              ...p,
              id: p.id || `reddit-${Date.now()}-${index}`,
              category: p.category || selectedCategory,
            }));
            setPlaces(placesWithIds);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fallback to Google Places API
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destinationName,
          category: selectedCategory !== 'search' ? selectedCategory : undefined,
          query: query,
          lat: activeDestination.place.lat,
          lng: activeDestination.place.lng,
          radius: 10000, // 10km
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Ensure unique IDs - if places don't have IDs, generate them
        const placesWithIds = (data.places || []).map((p: PlaceResult, index: number) => ({
          ...p,
          id: p.id || `place-${Date.now()}-${index}`,
          source: { type: 'google' as const },
        }));
        setPlaces(placesWithIds);
      }
    } catch (error) {
      console.error('Failed to fetch places:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSelectedCategory('search');
      fetchPlaces();
    }
  };

  const handleAddToCollection = (e: React.MouseEvent, place: PlaceResult, type: 'experiences' | 'restaurants') => {
    e.stopPropagation();
    e.preventDefault();

    addToCollection(type, {
      id: place.id,
      name: place.name,
      description: place.description,
      category: place.category || 'cultural',
      rating: place.rating,
      reviewCount: place.reviewCount,
      imageUrl: place.imageUrl,
      lat: place.lat,
      lng: place.lng,
      durationMinutes: place.durationMinutes || 60,
      address: place.address,
      destinationId: activeDestination?.destinationId,
      source: place.source,
    });
    setAddedIds(prev => new Set(prev).add(place.id));
  };

  // Category grid view
  if (!selectedCategory) {
    return (
      <div className="h-full flex flex-col p-3">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search places in ${destinationName}...`}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
          </div>
        </div>

        {/* Subreddit Sources */}
        {availableSubreddits.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">RECOMMENDATIONS FROM</p>
            <div className="flex flex-wrap gap-1.5">
              {availableSubreddits.map((sub) => {
                const isGlobal = isGlobalSubreddit(sub);
                const globalColors = isGlobal ? getGlobalSubredditColor(sub) : null;
                return (
                  <button
                    key={sub}
                    onClick={() => toggleSubreddit(sub)}
                    className={clsx(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                      selectedSubreddits.has(sub)
                        ? isGlobal
                          ? globalColors?.active
                          : 'bg-orange-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 line-through'
                    )}
                  >
                    <span className="text-[10px]">r/</span>
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category grid */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">BROWSE BY CATEGORY</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Results view
  const categoryData = ALL_CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <button
          onClick={() => {
            setSelectedCategory(null);
            setPlaces([]);
            setSearchQuery('');
          }}
          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{categoryData?.icon} {categoryData?.label || 'Search Results'}</span>
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Finding places...</p>
          </div>
        ) : places.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No places found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Try a different category or search term
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {places.map((place) => {
              const isAdded = addedIds.has(place.id);
              const isRestaurant = ['dining', 'cafes', 'restaurant'].includes(selectedCategory || '') ||
                (place.category && place.category.toLowerCase().includes('restaurant'));
              const isRedditSource = place.source?.type === 'reddit';

              return (
                <div
                  key={place.id}
                  onClick={() => setSelectedPlace(place)}
                  className={clsx(
                    "flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
                    isRedditSource
                      ? "bg-orange-50/50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md"
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-md"
                  )}
                >
                  {/* Image with Unsplash fallback */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-700">
                    <img
                      src={place.imageUrl || `https://source.unsplash.com/100x100/?${encodeURIComponent(selectedCategory || 'travel')}`}
                      alt={place.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        // Try Unsplash fallback with place name
                        if (!img.src.includes('unsplash.com')) {
                          img.src = `https://source.unsplash.com/100x100/?${encodeURIComponent(place.name || selectedCategory || 'restaurant')}`;
                        }
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Reddit source badge */}
                    {isRedditSource && place.source && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-[10px] font-medium">
                          <ArrowUp className="w-2.5 h-2.5" />
                          {place.source.upvotes?.toLocaleString() || '?'}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          from r/{place.source.subreddit}
                        </span>
                      </div>
                    )}

                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {place.name}
                    </p>

                    {/* Description/Quote */}
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
                      {place.openNow !== undefined && (
                        <span className={clsx(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          place.openNow
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                            : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300'
                        )}>
                          {place.openNow ? 'Open' : 'Closed'}
                        </span>
                      )}
                    </div>
                    {place.address && !place.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                        {place.address}
                      </p>
                    )}
                  </div>

                  {/* Add button */}
                  <button
                    onClick={(e) => handleAddToCollection(e, place, isRestaurant ? 'restaurants' : 'experiences')}
                    disabled={isAdded}
                    className={clsx(
                      'flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isAdded
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 cursor-default'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    )}
                  >
                    {isAdded ? (
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
            })}
          </div>
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
            destinationId: activeDestination?.destinationId,
          } as CollectionItem}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}
