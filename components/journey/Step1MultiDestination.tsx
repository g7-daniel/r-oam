'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Plus, TrendingUp, GripVertical, X } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import { LegCard } from '@/components/legs';
import SentimentBadge from '@/components/shared/SentimentBadge';
import type { Destination, SentimentData } from '@/types';

const popularDestinations: Destination[] = [
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    iataCode: 'CDG',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
    description: 'The City of Light',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    iataCode: 'NRT',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600',
    description: 'Where tradition meets future',
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    country: 'Spain',
    iataCode: 'BCN',
    imageUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600',
    description: "Gaudi's masterpiece",
  },
  {
    id: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    iataCode: 'DPS',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600',
    description: 'Island of the Gods',
  },
  {
    id: 'costa-rica',
    name: 'Costa Rica',
    country: 'Costa Rica',
    iataCode: 'SJO',
    imageUrl: 'https://images.unsplash.com/photo-1518259102261-b40117eabbc9?w=600',
    description: 'Pura Vida paradise',
  },
  {
    id: 'cancun',
    name: 'Cancun',
    country: 'Mexico',
    iataCode: 'CUN',
    imageUrl: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=600',
    description: 'Caribbean beaches & ruins',
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    iataCode: 'FCO',
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600',
    description: 'The Eternal City',
  },
  {
    id: 'hawaii',
    name: 'Hawaii',
    country: 'USA',
    iataCode: 'HNL',
    imageUrl: 'https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=600',
    description: 'Aloha spirit',
  },
  {
    id: 'thailand',
    name: 'Bangkok',
    country: 'Thailand',
    iataCode: 'BKK',
    imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600',
    description: 'Temples & street food',
  },
  {
    id: 'greece',
    name: 'Santorini',
    country: 'Greece',
    iataCode: 'JTR',
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d3c6071d?w=600',
    description: 'Iconic blue domes',
  },
  {
    id: 'panama',
    name: 'Panama City',
    country: 'Panama',
    iataCode: 'PTY',
    imageUrl: 'https://images.unsplash.com/photo-1555989045-97d1c3ec8fad?w=600',
    description: 'Gateway to the Americas',
  },
  {
    id: 'colombia',
    name: 'Cartagena',
    country: 'Colombia',
    iataCode: 'CTG',
    imageUrl: 'https://images.unsplash.com/photo-1583997052103-b4a1cb974ce5?w=600',
    description: 'Colonial charm & beaches',
  },
];

export default function Step1MultiDestination() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [draggedLegId, setDraggedLegId] = useState<string | null>(null);

  const { legs, activeLegId, addLeg, removeLeg, setActiveLeg, reorderLegs } = useTripStore();

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Filter out already added destinations
        const addedIds = new Set(legs.map((l) => l.destination.id));
        const localResults = popularDestinations.filter(
          (d) =>
            !addedIds.has(d.id) &&
            (d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              d.country.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        if (localResults.length === 0 && !addedIds.has(`custom-${searchQuery.toLowerCase().replace(/\s+/g, '-')}`)) {
          const customDestination: Destination = {
            id: `custom-${searchQuery.toLowerCase().replace(/\s+/g, '-')}`,
            name: searchQuery,
            country: '',
            iataCode: searchQuery.substring(0, 3).toUpperCase(),
            imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600',
            description: 'Custom destination',
          };
          setSearchResults([customDestination]);
        } else {
          setSearchResults(localResults);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, legs]);

  const handleAddDestination = useCallback(
    (dest: Destination) => {
      addLeg(dest);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
    },
    [addLeg]
  );

  const handleDragStart = (legId: string) => {
    setDraggedLegId(legId);
  };

  const handleDragOver = (e: React.DragEvent, targetLegId: string) => {
    e.preventDefault();
    if (!draggedLegId || draggedLegId === targetLegId) return;

    const draggedIndex = legs.findIndex((l) => l.id === draggedLegId);
    const targetIndex = legs.findIndex((l) => l.id === targetLegId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...legs.map((l) => l.id)];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedLegId);
    reorderLegs(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedLegId(null);
  };

  // Filter available destinations (not already added)
  const availableDestinations = popularDestinations.filter(
    (d) => !legs.some((l) => l.destination.id === d.id)
  );

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Plan Your Multi-Destination Trip</h1>
        <p className="section-subtitle">
          Add one or more destinations to create your perfect journey
        </p>
      </div>

      {/* Added Legs */}
      {legs.length > 0 && (
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Your Trip Legs</h3>
            <span className="text-sm text-slate-500">
              {legs.length} destination{legs.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3">
            {legs.map((leg, index) => (
              <div
                key={leg.id}
                draggable
                onDragStart={() => handleDragStart(leg.id)}
                onDragOver={(e) => handleDragOver(e, leg.id)}
                onDragEnd={handleDragEnd}
              >
                <LegCard
                  leg={leg}
                  index={index}
                  isActive={leg.id === activeLegId}
                  onSelect={() => setActiveLeg(leg.id)}
                  onRemove={() => removeLeg(leg.id)}
                  isDragging={draggedLegId === leg.id}
                  dragHandleProps={{
                    draggable: true,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Add Another Button */}
          <button
            onClick={() => setShowSearch(true)}
            className="mt-4 w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-sky-400 hover:text-sky-500 hover:bg-sky-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Another Destination
          </button>
        </div>
      )}

      {/* Search Section */}
      {(legs.length === 0 || showSearch) && (
        <div className="max-w-2xl mx-auto mb-8">
          {showSearch && legs.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Add Destination</h3>
              <button
                onClick={() => setShowSearch(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations..."
              className="input pl-12 text-lg"
              autoFocus={showSearch}
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleAddDestination(result)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <img
                    src={result.imageUrl}
                    alt={result.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm text-gray-500">{result.country}</div>
                  </div>
                  <Plus className="w-5 h-5 text-sky-500 ml-auto" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Popular Destinations Grid */}
      {legs.length === 0 && !searchQuery && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-secondary-500" />
            <h3 className="font-semibold">Trending Destinations</h3>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableDestinations.slice(0, 12).map((dest) => (
              <Card
                key={dest.id}
                variant="interactive"
                padding="none"
                onClick={() => handleAddDestination(dest)}
                className="overflow-hidden"
              >
                <div className="relative aspect-[4/3]">
                  <img
                    src={dest.imageUrl}
                    alt={dest.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-xl font-bold text-white">{dest.name}</h3>
                    <p className="text-white/80 text-sm">{dest.country}</p>
                  </div>
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-5 h-5 text-sky-500" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add Suggestions */}
      {legs.length > 0 && legs.length < 4 && !showSearch && (
        <div className="max-w-3xl mx-auto mt-8">
          <h4 className="text-sm font-medium text-slate-500 mb-3">Suggested additions:</h4>
          <div className="flex flex-wrap gap-2">
            {availableDestinations.slice(0, 6).map((dest) => (
              <button
                key={dest.id}
                onClick={() => handleAddDestination(dest)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-sm transition-colors"
              >
                <img
                  src={dest.imageUrl}
                  alt={dest.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span>{dest.name}</span>
                <Plus className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
