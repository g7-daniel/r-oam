'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { handleImageError, getPlaceholderImage } from '@/lib/utils';

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

// Curated country/region images from Unsplash (direct URLs are reliable, source API is down)
const COUNTRY_IMAGES: Record<string, string> = {
  // Caribbean
  'dominican republic': 'https://images.unsplash.com/photo-1569700802224-f274732a94f4?w=100&h=100&fit=crop',
  'jamaica': 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=100&h=100&fit=crop',
  'bahamas': 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=100&h=100&fit=crop',
  'puerto rico': 'https://images.unsplash.com/photo-1579687196544-08cb44349ad3?w=100&h=100&fit=crop',
  'cuba': 'https://images.unsplash.com/photo-1500759285222-a95626b934cb?w=100&h=100&fit=crop',
  'aruba': 'https://images.unsplash.com/photo-1580065607888-5f09f439f143?w=100&h=100&fit=crop',
  // North America
  'united states': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=100&h=100&fit=crop',
  'usa': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=100&h=100&fit=crop',
  'canada': 'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=100&h=100&fit=crop',
  'mexico': 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=100&h=100&fit=crop',
  'costa rica': 'https://images.unsplash.com/photo-1518259102261-b40117eabbc9?w=100&h=100&fit=crop',
  // Europe
  'france': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=100&h=100&fit=crop',
  'spain': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=100&h=100&fit=crop',
  'italy': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=100&h=100&fit=crop',
  'united kingdom': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=100&h=100&fit=crop',
  'uk': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=100&h=100&fit=crop',
  'germany': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=100&h=100&fit=crop',
  'netherlands': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=100&h=100&fit=crop',
  'portugal': 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=100&h=100&fit=crop',
  'greece': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=100&h=100&fit=crop',
  'switzerland': 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=100&h=100&fit=crop',
  'austria': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=100&h=100&fit=crop',
  'czech republic': 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=100&h=100&fit=crop',
  'czechia': 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=100&h=100&fit=crop',
  'croatia': 'https://images.unsplash.com/photo-1555990538-1ca0a0e3c4c7?w=100&h=100&fit=crop',
  'iceland': 'https://images.unsplash.com/photo-1520769945061-0a448c463865?w=100&h=100&fit=crop',
  'norway': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100&h=100&fit=crop',
  'sweden': 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=100&h=100&fit=crop',
  'denmark': 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=100&h=100&fit=crop',
  // Asia
  'japan': 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=100&h=100&fit=crop',
  'thailand': 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=100&h=100&fit=crop',
  'indonesia': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=100&h=100&fit=crop',
  'singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=100&h=100&fit=crop',
  'vietnam': 'https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=100&h=100&fit=crop',
  'south korea': 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=100&h=100&fit=crop',
  'china': 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=100&h=100&fit=crop',
  'india': 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=100&h=100&fit=crop',
  'philippines': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=100&h=100&fit=crop',
  'taiwan': 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=100&h=100&fit=crop',
  'malaysia': 'https://images.unsplash.com/photo-1508062878650-88b52897f298?w=100&h=100&fit=crop',
  // Middle East & Africa
  'uae': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=100&h=100&fit=crop',
  'united arab emirates': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=100&h=100&fit=crop',
  'israel': 'https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=100&h=100&fit=crop',
  'turkey': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=100&h=100&fit=crop',
  'morocco': 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=100&h=100&fit=crop',
  'south africa': 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=100&h=100&fit=crop',
  'egypt': 'https://images.unsplash.com/photo-1539768942893-daf53e448371?w=100&h=100&fit=crop',
  'kenya': 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=100&h=100&fit=crop',
  // South America
  'brazil': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=100&h=100&fit=crop',
  'peru': 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=100&h=100&fit=crop',
  'colombia': 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=100&h=100&fit=crop',
  'argentina': 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=100&h=100&fit=crop',
  'chile': 'https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=100&h=100&fit=crop',
  // Oceania
  'australia': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=100&h=100&fit=crop',
  'new zealand': 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=100&h=100&fit=crop',
  'fiji': 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=100&h=100&fit=crop',
  'maldives': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=100&h=100&fit=crop',
};

// Major city images (for cities that have good images)
const CITY_IMAGES: Record<string, string> = {
  'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100&h=100&fit=crop',
  'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=100&h=100&fit=crop',
  'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=100&h=100&fit=crop',
  'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=100&h=100&fit=crop',
  'dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=100&h=100&fit=crop',
  'barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=100&h=100&fit=crop',
  'rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=100&h=100&fit=crop',
  'bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=100&h=100&fit=crop',
  'bangkok': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=100&h=100&fit=crop',
  'amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=100&h=100&fit=crop',
  'sydney': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=100&h=100&fit=crop',
  'singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=100&h=100&fit=crop',
  'hong kong': 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=100&h=100&fit=crop',
  'istanbul': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=100&h=100&fit=crop',
  'los angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=100&h=100&fit=crop',
  'miami': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=100&h=100&fit=crop',
  'san francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=100&h=100&fit=crop',
  'las vegas': 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=100&h=100&fit=crop',
  'cancun': 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=100&h=100&fit=crop',
  'punta cana': 'https://images.unsplash.com/photo-1569700802224-f274732a94f4?w=100&h=100&fit=crop',
  'santorini': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=100&h=100&fit=crop',
  'venice': 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=100&h=100&fit=crop',
  'kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=100&h=100&fit=crop',
  'seoul': 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=100&h=100&fit=crop',
};

// Default fallback for any location
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=100&h=100&fit=crop';

// Get image URL for a destination - tries city first, then country, then default
function getDestinationImageUrl(cityName: string, country?: string): string {
  const normalizedCity = cityName.split(',')[0].trim().toLowerCase();

  // 1. Try exact city match
  if (CITY_IMAGES[normalizedCity]) {
    return CITY_IMAGES[normalizedCity];
  }

  // 2. Try partial city match
  for (const [key, url] of Object.entries(CITY_IMAGES)) {
    if (normalizedCity.includes(key) || key.includes(normalizedCity)) {
      return url;
    }
  }

  // 3. Check if cityName itself is a country (e.g., searching "Dominican Republic" directly)
  if (COUNTRY_IMAGES[normalizedCity]) {
    return COUNTRY_IMAGES[normalizedCity];
  }
  for (const [key, url] of Object.entries(COUNTRY_IMAGES)) {
    if (normalizedCity.includes(key) || key.includes(normalizedCity)) {
      return url;
    }
  }

  // 4. Try country parameter match (for cities within a country)
  if (country) {
    const normalizedCountry = country.toLowerCase().trim();
    if (COUNTRY_IMAGES[normalizedCountry]) {
      return COUNTRY_IMAGES[normalizedCountry];
    }
    // Try partial country match
    for (const [key, url] of Object.entries(COUNTRY_IMAGES)) {
      if (normalizedCountry.includes(key) || key.includes(normalizedCountry)) {
        return url;
      }
    }
  }

  // 5. Default fallback
  return DEFAULT_IMAGE;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  types: string[];
}

export default function GooglePlacesAutocomplete({
  onSelect,
  placeholder = 'Search for a destination...',
  disabled = false,
  types = ['(cities)'],
  className = '',
}: GooglePlacesAutocompleteProps) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'no_results' | 'error'>('idle');
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Google Maps script is loaded (needed for geocoding)
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined' && window.google?.maps) {
        setIsScriptLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGoogleMaps()) return;

    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 500);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      // Even without Google Maps loaded, we can still search - just won't get lat/lng
      setIsScriptLoaded(true);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Determine which place types to search for based on the types prop
  const getIncludedTypes = useCallback(() => {
    // Map legacy types to new API types
    if (types.includes('(cities)')) {
      return ['locality', 'administrative_area_level_3'];
    }
    if (types.includes('(regions)')) {
      return ['country', 'administrative_area_level_1', 'locality'];
    }
    return ['locality', 'country', 'administrative_area_level_1'];
  }, [types]);

  // Fetch suggestions from the new Places API
  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      setStatus('idle');
      return;
    }

    setStatus('loading');

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('[GooglePlacesAutocomplete] Missing API key');
        setStatus('error');
        return;
      }

      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: getIncludedTypes(),
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error('[GooglePlacesAutocomplete] API error:', data.error.message);
        setStatus('error');
        return;
      }

      if (!data.suggestions || data.suggestions.length === 0) {
        setSuggestions([]);
        setStatus('no_results');
        return;
      }

      const mapped: Suggestion[] = data.suggestions
        .filter((s: any) => s.placePrediction)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          mainText: s.placePrediction.structuredFormat?.mainText?.text || s.placePrediction.text?.text || '',
          secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
          fullText: s.placePrediction.text?.text || '',
          types: s.placePrediction.types || [],
        }));

      setSuggestions(mapped);
      setStatus(mapped.length > 0 ? 'ok' : 'no_results');
      console.log('[GooglePlacesAutocomplete] Query:', input, 'Results:', mapped.length);
    } catch (error) {
      console.error('[GooglePlacesAutocomplete] Fetch error:', error);
      setStatus('error');
    }
  }, [getIncludedTypes]);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // Handle selection
  const handleSelect = async (suggestion: Suggestion) => {
    setValue(suggestion.fullText);
    setSuggestions([]);
    setStatus('idle');

    try {
      let lat = 0;
      let lng = 0;
      let country = '';
      let countryCode = '';
      let cityName = suggestion.mainText;

      // Try to get detailed place info using Google Maps Geocoder if available
      if (isScriptLoaded && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoder.geocode({ placeId: suggestion.placeId }, (results, status) => {
            if (status === 'OK' && results) {
              resolve(results);
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          });
        });

        if (results[0]) {
          lat = results[0].geometry.location.lat();
          lng = results[0].geometry.location.lng();

          for (const component of results[0].address_components || []) {
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
        }
      } else {
        // Fallback: Use Place Details API (New) to get coordinates
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          try {
            const detailsResponse = await fetch(
              `https://places.googleapis.com/v1/places/${suggestion.placeId}?fields=location,addressComponents,displayName&key=${apiKey}`
            );
            const details = await detailsResponse.json();
            if (details.location) {
              lat = details.location.latitude;
              lng = details.location.longitude;
            }
            if (details.addressComponents) {
              for (const component of details.addressComponents) {
                if (component.types?.includes('country')) {
                  country = component.longText;
                  countryCode = component.shortText;
                }
              }
            }
          } catch (e) {
            console.warn('[GooglePlacesAutocomplete] Could not fetch place details:', e);
          }
        }
      }

      // Determine type
      let type: 'city' | 'country' | 'region' = 'city';
      if (suggestion.types.includes('country')) {
        type = 'country';
      } else if (suggestion.types.includes('administrative_area_level_1')) {
        type = 'region';
      }

      const place: PlaceResult = {
        placeId: suggestion.placeId,
        name: cityName || suggestion.mainText,
        fullName: suggestion.fullText,
        country,
        countryCode,
        lat,
        lng,
        type,
      };

      onSelect(place);
    } catch (error) {
      console.error('[GooglePlacesAutocomplete] Error getting place details:', error);
      // Still call onSelect with basic info
      onSelect({
        placeId: suggestion.placeId,
        name: suggestion.mainText,
        fullName: suggestion.fullText,
        country: '',
        countryCode: '',
        lat: 0,
        lng: 0,
        type: 'city',
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />

      {/* Suggestions dropdown */}
      {status === 'ok' && suggestions.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((suggestion) => {
            const imageUrl = getDestinationImageUrl(suggestion.mainText, suggestion.secondaryText);

            return (
              <li key={suggestion.placeId}>
                <button
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-slate-200 dark:bg-slate-600">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl || getPlaceholderImage('map')}
                      alt={suggestion.mainText}
                      className="w-full h-full object-cover"
                      onError={(e) => handleImageError(e, 'map')}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">
                      {suggestion.mainText}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {suggestion.secondaryText || suggestion.fullText}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Loading/status indicator */}
      {value && value.length >= 2 && status !== 'ok' && status !== 'idle' && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg p-3">
          <div className="flex items-center gap-2 text-slate-500">
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Searching...</span>
              </>
            ) : status === 'no_results' ? (
              <span className="text-sm">No destinations found. Try a different search.</span>
            ) : status === 'error' ? (
              <span className="text-sm text-red-500">Search unavailable. Please try again later.</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
