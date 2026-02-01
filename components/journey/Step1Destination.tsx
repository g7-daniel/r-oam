'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, MessageCircle, TrendingUp } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import SentimentBadge from '@/components/shared/SentimentBadge';
import type { Destination, SentimentData } from '@/types';
import clsx from 'clsx';

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
    description: 'Gaudi\'s masterpiece',
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
    id: 'new-york',
    name: 'New York',
    country: 'USA',
    iataCode: 'JFK',
    imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600',
    description: 'The Big Apple',
  },
  {
    id: 'london',
    name: 'London',
    country: 'UK',
    iataCode: 'LHR',
    imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600',
    description: 'Royal heritage',
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
  {
    id: 'dominican',
    name: 'Punta Cana',
    country: 'Dominican Republic',
    iataCode: 'PUJ',
    imageUrl: 'https://images.unsplash.com/photo-1570481662006-a3a1374699e8?w=600',
    description: 'All-inclusive paradise',
  },
  {
    id: 'peru',
    name: 'Lima',
    country: 'Peru',
    iataCode: 'LIM',
    imageUrl: 'https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=600',
    description: 'Gastronomy capital',
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'UAE',
    iataCode: 'DXB',
    imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600',
    description: 'Luxury & innovation',
  },
];

export default function Step1Destination() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingSentiment, setLoadingSentiment] = useState(false);

  const {
    destination,
    setDestination,
    destinationSentiment,
    setDestinationSentiment,
  } = useTripStore();

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Search in popular destinations first
        const localResults = popularDestinations.filter(
          (d) =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.country.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // If no matches found, create a custom destination option
        if (localResults.length === 0) {
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
  }, [searchQuery]);

  const handleSelectDestination = useCallback(
    async (dest: Destination) => {
      setDestination(dest);
      setSearchQuery('');
      setSearchResults([]);

      // Fetch sentiment
      setLoadingSentiment(true);
      try {
        const response = await fetch(
          `/api/reddit?destination=${encodeURIComponent(dest.name)}&budget=3000`
        );
        if (response.ok) {
          const sentiment: SentimentData = await response.json();
          setDestinationSentiment(sentiment);
        }
      } catch (error) {
        console.error('Sentiment fetch error:', error);
      } finally {
        setLoadingSentiment(false);
      }
    },
    [setDestination, setDestinationSentiment]
  );

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Where do you want to go?</h1>
        <p className="section-subtitle">
          Search for a destination or pick from trending spots
        </p>
      </div>

      {/* Search input */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search destinations..."
            className="input pl-12 text-lg"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 mt-2 w-full max-w-2xl bg-white rounded-xl shadow-hover border border-gray-100 overflow-hidden">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelectDestination(result)}
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
                <MapPin className="w-4 h-4 text-gray-400 ml-auto" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected destination */}
      {destination && (
        <div className="max-w-2xl mx-auto mb-8">
          <Card variant="selected" className="overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6">
              <img
                src={destination.imageUrl}
                alt={destination.name}
                className="w-full md:w-48 h-48 object-cover rounded-xl"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-2xl font-bold">{destination.name}</h2>
                    <p className="text-gray-500">{destination.country}</p>
                  </div>
                  <span className="px-3 py-1 bg-primary-100 text-primary-600 text-sm font-medium rounded-full">
                    {destination.iataCode}
                  </span>
                </div>

                {destination.description && (
                  <p className="text-gray-600 mb-4">{destination.description}</p>
                )}

                {/* Sentiment preview */}
                {loadingSentiment ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                    <span className="text-sm">Loading Reddit sentiment...</span>
                  </div>
                ) : destinationSentiment ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <SentimentBadge sentiment={destinationSentiment} />
                    </div>

                    {destinationSentiment.topComments.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <MessageCircle className="w-4 h-4" />
                          What Redditors say:
                        </div>
                        <p className="text-sm text-gray-600 italic">
                          "{destinationSentiment.topComments[0].text.slice(0, 200)}..."
                        </p>
                        <div className="text-xs text-gray-400 mt-2">
                          r/{destinationSentiment.topComments[0].subreddit}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          <button
            onClick={() => {
              setDestination(null);
              setDestinationSentiment(null);
            }}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Choose a different destination
          </button>
        </div>
      )}

      {/* Popular destinations */}
      {!destination && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-secondary-500" />
            <h3 className="font-semibold">Trending Destinations</h3>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularDestinations.map((dest) => (
              <Card
                key={dest.id}
                variant="interactive"
                padding="none"
                onClick={() => handleSelectDestination(dest)}
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
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
