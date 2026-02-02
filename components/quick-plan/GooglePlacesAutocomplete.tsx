'use client';

import { useState, useEffect, useRef } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import { Search, MapPin, Loader2 } from 'lucide-react';

interface PlaceResult {
  placeId: string;
  name: string;
  fullName: string;
  country?: string;
  countryCode?: string;
  lat: number;
  lng: number;
  type: 'city' | 'country' | 'region';
}

interface GooglePlacesAutocompleteProps {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  disabled?: boolean;
  types?: string[];
  className?: string;
}

export default function GooglePlacesAutocomplete({
  onSelect,
  placeholder = 'Search for a destination...',
  disabled = false,
  types = ['(cities)'],
  className = '',
}: GooglePlacesAutocompleteProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Check if Google Maps script is loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setIsScriptLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGoogleMaps()) return;

    // If not loaded, check periodically
    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 500);

    // Give up after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.warn('[GooglePlacesAutocomplete] Google Maps script not loaded after 10s');
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types,
    },
    debounce: 300,
    initOnMount: isScriptLoaded,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = async (description: string, placeId: string) => {
    setValue(description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ placeId });
      const { lat, lng } = await getLatLng(results[0]);

      // Extract country and city info from address components
      const addressComponents = results[0].address_components || [];
      let country = '';
      let countryCode = '';
      let cityName = '';

      for (const component of addressComponents) {
        if (component.types.includes('country')) {
          country = component.long_name;
          countryCode = component.short_name;
        }
        if (component.types.includes('locality')) {
          cityName = component.long_name;
        }
        if (!cityName && component.types.includes('administrative_area_level_1')) {
          cityName = component.long_name;
        }
      }

      // Determine type based on address components
      let type: 'city' | 'country' | 'region' = 'city';
      if (results[0].types?.includes('country')) {
        type = 'country';
      } else if (results[0].types?.includes('administrative_area_level_1')) {
        type = 'region';
      }

      const place: PlaceResult = {
        placeId,
        name: cityName || description.split(',')[0],
        fullName: description,
        country,
        countryCode,
        lat,
        lng,
        type,
      };

      onSelect(place);
    } catch (error) {
      console.error('[GooglePlacesAutocomplete] Error getting place details:', error);
    }
  };

  // If Google Maps isn't ready, show a basic input
  if (!isScriptLoaded || !ready) {
    return (
      <div className={`relative ${className}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder={placeholder}
          disabled={true}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
        />
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />

      {/* Suggestions dropdown */}
      {status === 'OK' && data.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {data.map(({ place_id, description, structured_formatting }) => (
            <li key={place_id}>
              <button
                type="button"
                onClick={() => handleSelect(description, place_id)}
                className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
              >
                <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">
                    {structured_formatting?.main_text || description.split(',')[0]}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {structured_formatting?.secondary_text || description}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Loading indicator - show when we have a value but no results yet */}
      {value && status !== 'OK' && data.length === 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg p-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        </div>
      )}
    </div>
  );
}
