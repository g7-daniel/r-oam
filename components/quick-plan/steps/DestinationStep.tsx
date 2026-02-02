'use client';

import { useState } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { MapPin, Search, Loader2 } from 'lucide-react';
import clsx from 'clsx';

// Popular destinations for quick selection
const POPULAR_DESTINATIONS = [
  { name: 'Dominican Republic', type: 'country', countryCode: 'DO' },
  { name: 'Costa Rica', type: 'country', countryCode: 'CR' },
  { name: 'Mexico', type: 'country', countryCode: 'MX' },
  { name: 'Bali, Indonesia', type: 'region', countryCode: 'ID' },
  { name: 'Thailand', type: 'country', countryCode: 'TH' },
  { name: 'Portugal', type: 'country', countryCode: 'PT' },
  { name: 'Italy', type: 'country', countryCode: 'IT' },
  { name: 'Japan', type: 'country', countryCode: 'JP' },
];

export default function DestinationStep() {
  const { preferences, setDestination, goToNextState } = useQuickPlanStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Use Google Places autocomplete for destinations
      const response = await fetch(
        `/api/places/autocomplete?query=${encodeURIComponent(query)}&types=(regions)`
      );
      const data = await response.json();
      setSearchResults(data.predictions || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectDestination = (destination: {
    name: string;
    type: string;
    countryCode?: string;
    placeId?: string;
  }) => {
    setDestination({
      rawInput: destination.name,
      canonicalName: destination.name,
      type: destination.type as 'country' | 'region' | 'city',
      countryCode: destination.countryCode || '',
      countryName: destination.name, // Will be refined later
      centerLat: 0, // Will be populated when place details are fetched
      centerLng: 0,
      timezone: '',
      suggestedAreas: [],
      googlePlaceId: destination.placeId,
    });
    setSearchQuery(destination.name);
    setSearchResults([]);
  };

  const selectedDestination = preferences.destinationContext;

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for a country, region, or city..."
            className="w-full pl-12 pr-4 py-4 text-lg border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
          )}
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() =>
                  selectDestination({
                    name: result.description,
                    type: 'region',
                    placeId: result.place_id,
                  })
                }
                className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
              >
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-700">{result.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected destination */}
      {selectedDestination && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-900">
              {selectedDestination.canonicalName}
            </p>
            <p className="text-sm text-green-600 capitalize">
              {selectedDestination.type}
            </p>
          </div>
        </div>
      )}

      {/* Popular destinations */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-3">
          Popular destinations
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest.name}
              onClick={() => selectDestination(dest)}
              className={clsx(
                'px-4 py-3 rounded-xl border transition-all text-left',
                selectedDestination?.canonicalName === dest.name
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50'
              )}
            >
              <span className="text-sm font-medium">{dest.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
        <strong className="text-slate-700">Tip:</strong> You can enter a country
        (like "Costa Rica"), a region (like "Punta Cana"), or a specific city.
        We'll help you discover the best areas based on your preferences.
      </div>
    </div>
  );
}
