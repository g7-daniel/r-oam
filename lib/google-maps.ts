import type { Experience, ExperienceCategory, PlaceResult, DirectionsResult, TransitInfo } from '@/types';
import { fetchWithTimeout } from './api-cache';
import { withRetry } from './retry';
import { calculateHaversineDistance } from './utils/geo';
import { isConfigured, serverEnv } from './env';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';
const GOOGLE_MAPS_TIMEOUT = 15000; // 15 second timeout

// Lazy getter for API key to avoid issues during module initialization
const getGoogleMapsApiKey = () => serverEnv.GOOGLE_MAPS_API_KEY;

// Custom error with status for rate limit handling
interface RateLimitError extends Error {
  status: number;
}

function createRateLimitError(): RateLimitError {
  const error = new Error('Google Places API rate limited') as RateLimitError;
  error.status = 429;
  return error;
}

// Retry options for Google Maps API (handles 429 rate limits)
const GOOGLE_MAPS_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 2000,
  maxDelayMs: 10000,
  onRetry: (attempt: number, delay: number) => {
  },
};

// Google Places result type for hotel searches
export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: { photo_reference: string }[];
  types?: string[];
}

// Search for hotels with pagination support (up to 60 results)
export async function searchHotelsWithPagination(
  query: string,
  maxResults: number = 60
): Promise<GooglePlaceResult[]> {
  if (!isConfigured.googleMaps()) {
    return [];
  }
  const apiKey = getGoogleMapsApiKey();

  const results: GooglePlaceResult[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      query,
      type: 'lodging',
      key: apiKey,
    });

    if (pageToken) {
      params.set('pagetoken', pageToken);
      // Google requires 2s delay between pagination requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      const data = await withRetry(async () => {
        const response = await fetchWithTimeout(
          `${GOOGLE_MAPS_BASE_URL}/place/textsearch/json?${params}`,
          {},
          GOOGLE_MAPS_TIMEOUT
        );

        // Throw on rate limit to trigger retry
        if (response.status === 429) {
          throw createRateLimitError();
        }

        return response.json();
      }, GOOGLE_MAPS_RETRY_OPTIONS);

      if (data.results && Array.isArray(data.results)) {
        results.push(...data.results);
      }

      pageToken = data.next_page_token;
    } catch (error) {
      console.error('Google Places pagination error:', error);
      break;
    }
  } while (pageToken && results.length < maxResults);

  return results;
}

// Geocode-based search with pagination
export async function searchHotelsByGeocode(
  lat: number,
  lng: number,
  radiusMeters: number = 50000,
  maxResults: number = 60
): Promise<GooglePlaceResult[]> {
  if (!isConfigured.googleMaps()) {
    return [];
  }
  const apiKey = getGoogleMapsApiKey();

  const results: GooglePlaceResult[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(radiusMeters),
      type: 'lodging',
      key: apiKey,
    });

    if (pageToken) {
      params.set('pagetoken', pageToken);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      const data = await withRetry(async () => {
        const response = await fetchWithTimeout(
          `${GOOGLE_MAPS_BASE_URL}/place/nearbysearch/json?${params}`,
          {},
          GOOGLE_MAPS_TIMEOUT
        );

        // Throw on rate limit to trigger retry
        if (response.status === 429) {
          throw createRateLimitError();
        }

        return response.json();
      }, GOOGLE_MAPS_RETRY_OPTIONS);

      if (data.results && Array.isArray(data.results)) {
        results.push(...data.results);
      }

      pageToken = data.next_page_token;
    } catch (error) {
      console.error('Google Places geocode pagination error:', error);
      break;
    }
  } while (pageToken && results.length < maxResults);

  return results;
}

// Search for luxury hotels using text search with specific keywords
export async function searchLuxuryHotels(
  lat: number,
  lng: number,
  areaName: string,
  destination: string,
  maxResults: number = 20
): Promise<GooglePlaceResult[]> {
  if (!isConfigured.googleMaps()) {
    return [];
  }
  const apiKey = getGoogleMapsApiKey();

  const results: GooglePlaceResult[] = [];
  const seenPlaceIds = new Set<string>();

  // Luxury-specific search queries - comprehensive list of luxury brands and keywords
  const luxuryQueries = [
    `luxury resort ${areaName} ${destination}`,
    `5 star hotel ${areaName} ${destination}`,
    `best luxury hotel ${areaName}`,
    // Major luxury brands
    `four seasons ${areaName}`,
    `ritz carlton ${areaName}`,
    `st regis ${areaName}`,
    `park hyatt ${areaName}`,
    `rosewood ${areaName}`,
    `mandarin oriental ${areaName}`,
    `aman ${areaName}`,
    `one&only ${areaName}`,
    `six senses ${areaName}`,
    `waldorf astoria ${areaName}`,
    `w hotel ${areaName}`,
    `conrad ${areaName}`,
    `jw marriott ${areaName}`,
    // Caribbean/DR/Mexico specific luxury resorts
    `excellence ${areaName}`,
    `secrets ${areaName}`,
    `eden roc ${areaName}`,
    `cap cana ${areaName}`,
    `sanctuary cap cana ${destination}`,
    `hyatt zilara ${areaName}`,
    `hyatt ziva ${areaName}`,
    `tortuga bay ${areaName}`,
    `casa de campo ${areaName}`,
    `zoetry ${areaName}`,
    `breathless ${areaName}`,
    `dreams ${areaName}`,
    `now resorts ${areaName}`,
    `hard rock hotel ${areaName}`,
    `grand hyatt ${areaName}`,
    // Generic high-end searches
    `premium resort ${areaName} ${destination}`,
    `5 star beachfront ${areaName}`,
    `adults only luxury ${areaName}`,
    `all inclusive luxury ${areaName}`,
  ];

  for (const query of luxuryQueries) {
    if (results.length >= maxResults) break;

    const params = new URLSearchParams({
      query,
      location: `${lat},${lng}`,
      radius: '50000',
      type: 'lodging',
      key: apiKey,
    });

    try {
      const data = await withRetry(async () => {
        const response = await fetchWithTimeout(
          `${GOOGLE_MAPS_BASE_URL}/place/textsearch/json?${params}`,
          {},
          GOOGLE_MAPS_TIMEOUT
        );

        if (response.status === 429) {
          throw createRateLimitError();
        }

        return response.json();
      }, GOOGLE_MAPS_RETRY_OPTIONS);

      if (data.results && Array.isArray(data.results)) {
        for (const place of data.results) {
          // Only include high-rated hotels (4.0+)
          if (place.place_id &&
              !seenPlaceIds.has(place.place_id) &&
              (place.rating || 0) >= 4.0 &&
              (place.price_level === undefined || place.price_level >= 3)) {
            seenPlaceIds.add(place.place_id);
            results.push(place);
          }
        }
      }
    } catch (error) {
      console.error(`Luxury hotel search failed for "${query}":`, error);
    }

    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Sort by rating and price level
  results.sort((a, b) => {
    const priceA = a.price_level || 3;
    const priceB = b.price_level || 3;
    if (priceA !== priceB) return priceB - priceA;
    return (b.rating || 0) - (a.rating || 0);
  });

  return results.slice(0, maxResults);
}

// Geocode a location name to get coordinates
export async function geocodeLocation(
  locationName: string
): Promise<{ lat: number; lng: number } | null> {
  if (!isConfigured.googleMaps()) {
    return null;
  }
  const apiKey = getGoogleMapsApiKey();

  const params = new URLSearchParams({
    address: locationName,
    key: apiKey,
  });

  try {
    const data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        `${GOOGLE_MAPS_BASE_URL}/geocode/json?${params}`,
        {},
        GOOGLE_MAPS_TIMEOUT
      );

      if (response.status === 429) {
        throw createRateLimitError();
      }

      return response.json();
    }, GOOGLE_MAPS_RETRY_OPTIONS);

    if (data.status === 'OK' && data.results && Array.isArray(data.results) && data.results.length > 0) {
      const location = data.results[0]?.geometry?.location;
      if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
        return { lat: location.lat, lng: location.lng };
      }
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function searchPlaces(
  query: string,
  location?: { lat: number; lng: number },
  radius = 50000
): Promise<PlaceResult[]> {
  if (!isConfigured.googleMaps()) {
    return [];
  }
  const apiKey = getGoogleMapsApiKey();

  const params = new URLSearchParams({
    query,
    key: apiKey,
  });

  if (location) {
    params.append('location', `${location.lat},${location.lng}`);
    params.append('radius', radius.toString());
  }

  try {
    const data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        `${GOOGLE_MAPS_BASE_URL}/place/textsearch/json?${params}`,
        {},
        GOOGLE_MAPS_TIMEOUT
      );

      if (response.status === 429) {
        throw createRateLimitError();
      }

      if (!response.ok) {
        console.error('Google Places search failed:', response.statusText);
        return { results: [] };
      }

      return response.json();
    }, GOOGLE_MAPS_RETRY_OPTIONS);

    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.error('Google Places search error:', error);
    return [];
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  if (!isConfigured.googleMaps()) {
    return null;
  }
  const apiKey = getGoogleMapsApiKey();

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_address,geometry,photos,rating,user_ratings_total,types,opening_hours,editorial_summary,reviews',
    key: apiKey,
  });

  try {
    const data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        `${GOOGLE_MAPS_BASE_URL}/place/details/json?${params}`,
        {},
        GOOGLE_MAPS_TIMEOUT
      );

      if (response.status === 429) {
        throw createRateLimitError();
      }

      if (!response.ok) {
        return { result: null };
      }

      return response.json();
    }, GOOGLE_MAPS_RETRY_OPTIONS);

    return data.result || null;
  } catch (error) {
    console.error('Google Places details error:', error);
    return null;
  }
}

export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: 'driving' | 'walking' | 'transit' = 'transit'
): Promise<DirectionsResult | null> {
  if (!isConfigured.googleMaps()) {
    return null;
  }
  const apiKey = getGoogleMapsApiKey();

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
    key: apiKey,
  });

  try {
    const data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        `${GOOGLE_MAPS_BASE_URL}/directions/json?${params}`,
        {},
        GOOGLE_MAPS_TIMEOUT
      );

      if (response.status === 429) {
        throw createRateLimitError();
      }

      if (!response.ok) {
        return null;
      }

      return response.json();
    }, GOOGLE_MAPS_RETRY_OPTIONS);

    return data;
  } catch (error) {
    console.error('Google Directions API error:', error);
    return null;
  }
}

export async function getDistanceMatrix(
  origins: { lat: number; lng: number }[],
  destinations: { lat: number; lng: number }[],
  mode: 'driving' | 'walking' | 'transit' = 'transit'
): Promise<{ distance: string; duration: string }[][]> {
  if (!isConfigured.googleMaps()) {
    return [];
  }
  const apiKey = getGoogleMapsApiKey();

  const originStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
  const destStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

  const params = new URLSearchParams({
    origins: originStr,
    destinations: destStr,
    mode,
    key: apiKey,
  });

  let data;
  try {
    data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        `${GOOGLE_MAPS_BASE_URL}/distancematrix/json?${params}`,
        {},
        GOOGLE_MAPS_TIMEOUT
      );

      if (response.status === 429) {
        throw createRateLimitError();
      }

      if (!response.ok) {
        return { rows: [] };
      }

      return response.json();
    }, GOOGLE_MAPS_RETRY_OPTIONS);
  } catch (error) {
    console.error('Google Distance Matrix API error:', error);
    return [];
  }

  interface DistanceMatrixElement {
    distance?: { text: string; value: number };
    duration?: { text: string; value: number };
    status: string;
  }
  interface DistanceMatrixRow {
    elements?: DistanceMatrixElement[];
  }

  return (data.rows as DistanceMatrixRow[] | undefined)?.map((row) =>
    row.elements?.map((element) => ({
      distance: element.distance?.text || 'N/A',
      duration: element.duration?.text || 'N/A',
    })) || []
  ) || [];
}

export function getTransitRecommendation(
  distanceMeters: number,
  durationMinutes: number
): TransitInfo {
  if (distanceMeters < 1000) {
    return {
      mode: 'walk',
      duration: `${Math.ceil(distanceMeters / 80)} min`,
      distance: `${(distanceMeters / 1000).toFixed(1)} km`,
    };
  } else if (distanceMeters < 5000) {
    return {
      mode: 'taxi',
      duration: `${Math.ceil(durationMinutes * 0.8)} min`,
      distance: `${(distanceMeters / 1000).toFixed(1)} km`,
      cost: Math.ceil(distanceMeters / 1000) * 3,
    };
  } else {
    return {
      mode: 'train',
      duration: `${durationMinutes} min`,
      distance: `${(distanceMeters / 1000).toFixed(1)} km`,
      cost: Math.ceil(distanceMeters / 1000) * 0.5,
    };
  }
}

const CATEGORY_QUERIES: Record<string, string[]> = {
  beaches: ['beach', 'seaside', 'coast'],
  museums: ['museum', 'art gallery', 'history museum'],
  food_tours: ['food tour', 'culinary experience', 'local cuisine'],
  nightlife: ['nightclub', 'bar', 'live music venue'],
  day_trips: ['day trip', 'excursion', 'tour'],
  hidden_gems: ['hidden gem', 'off the beaten path', 'local secret'],
  outdoor: ['hiking', 'nature park', 'outdoor activities'],
  shopping: ['shopping district', 'market', 'mall'],
  cultural: ['temple', 'church', 'cultural site', 'monument'],
  wellness: ['spa', 'wellness center', 'yoga'],
  // Additional categories used by frontend
  dining: ['restaurant', 'fine dining', 'local food'],
  cafes: ['cafe', 'coffee shop', 'bakery'],
  temples: ['buddhist temple', 'hindu temple', 'shinto shrine', 'ancient temple'],
  parks: ['park', 'garden', 'botanical garden'],
  landmarks: ['famous attraction', 'tourist attraction', 'must see'],
  nature: ['nature reserve', 'hiking trail', 'scenic lookout'],
  adventure: ['adventure tour', 'outdoor activities', 'extreme sports'],
  wildlife: ['wildlife sanctuary', 'animal sanctuary', 'zoo'],
  water_sports: ['surfing', 'diving', 'snorkeling', 'water sports'],
};

// Use centralized Haversine implementation
const getDistanceKm = calculateHaversineDistance;

export async function getExperiencesByCategory(
  destination: string,
  category: ExperienceCategory,
  location?: { lat: number; lng: number },
  maxDistanceKm: number = 50
): Promise<Experience[]> {
  const queries = CATEGORY_QUERIES[category] || [category];
  const allPlaces: PlaceResult[] = [];

  for (const query of queries.slice(0, 2)) {
    const places = await searchPlaces(`${query} ${destination}`, location);
    allPlaces.push(...places);
  }

  // Deduplicate by place_id
  let uniquePlaces = Array.from(
    new Map(allPlaces.map((p) => [p.place_id, p])).values()
  );

  // Filter by distance if we have location coordinates
  if (location && location.lat !== 0 && location.lng !== 0) {
    uniquePlaces = uniquePlaces.filter((place) => {
      const placeLat = place.geometry?.location?.lat || 0;
      const placeLng = place.geometry?.location?.lng || 0;
      if (placeLat === 0 && placeLng === 0) return false;
      const distance = getDistanceKm(location.lat, location.lng, placeLat, placeLng);
      return distance <= maxDistanceKm;
    });
  }

  // Fetch place details to get descriptions (batch up to 10, with concurrency limit)
  const placesToFetch = uniquePlaces.slice(0, 10);
  const placesWithDetails: { place: PlaceResult; details: PlaceResult | null }[] = [];
  // Process in batches of 3 to avoid hitting Google rate limits
  for (let i = 0; i < placesToFetch.length; i += 3) {
    const batch = placesToFetch.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(async (place) => {
        try {
          const details = await getPlaceDetails(place.place_id);
          return { place, details };
        } catch {
          return { place, details: null };
        }
      })
    );
    placesWithDetails.push(...batchResults);
    // Small delay between batches
    if (i + 3 < placesToFetch.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Extended place details type
  interface ExtendedPlaceDetails {
    editorial_summary?: { overview?: string };
    reviews?: Array<{ text?: string }>;
  }

  return placesWithDetails.map(({ place, details }) => {
    // Get description from editorial_summary or first review
    let description = `Popular ${category.replace('_', ' ')} attraction in ${destination}`;
    if (details) {
      const extDetails = details as ExtendedPlaceDetails;
      if (extDetails.editorial_summary?.overview) {
        description = extDetails.editorial_summary.overview;
      } else if (extDetails.reviews?.[0]?.text) {
        // Use first review snippet if no editorial summary
        const reviewText = extDetails.reviews[0].text;
        description = reviewText.length > 200 ? reviewText.slice(0, 200) + '...' : reviewText;
      }
    }

    return {
      id: place.place_id,
      name: place.name,
      category,
      description,
      imageUrl: place.photos?.[0]?.photo_reference
        ? getPhotoUrl(place.photos[0].photo_reference, 800)
        : getDefaultImageForCategory(category),
      price: estimatePriceForCategory(category),
      currency: 'USD',
      duration: estimateDurationForCategory(category),
      rating: place.rating || 4.0,
      reviewCount: place.user_ratings_total || 0,
      address: place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    };
  });
}

function getDefaultImageForCategory(category: ExperienceCategory): string {
  const images: Record<ExperienceCategory, string> = {
    beaches: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    museums: 'https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=800',
    food_tours: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    nightlife: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800',
    day_trips: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    hidden_gems: 'https://images.unsplash.com/photo-1502301103665-0b95cc738daf?w=800',
    outdoor: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
    shopping: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    cultural: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800',
    wellness: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
    dining: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    cafes: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
    temples: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800',
    parks: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?w=800',
    landmarks: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=800',
    nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
    adventure: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800',
    wildlife: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=800',
    water_sports: 'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=800',
  };
  return images[category];
}

function estimatePriceForCategory(category: ExperienceCategory): number {
  const prices: Record<ExperienceCategory, number> = {
    beaches: 0,
    museums: 25,
    food_tours: 75,
    nightlife: 50,
    day_trips: 100,
    hidden_gems: 20,
    outdoor: 30,
    shopping: 0,
    cultural: 15,
    wellness: 80,
    dining: 50,
    cafes: 15,
    temples: 10,
    parks: 0,
    landmarks: 20,
    nature: 10,
    adventure: 75,
    wildlife: 40,
    water_sports: 60,
  };
  return prices[category];
}

function estimateDurationForCategory(category: ExperienceCategory): string {
  const durations: Record<ExperienceCategory, string> = {
    beaches: '4-6 hours',
    museums: '2-3 hours',
    food_tours: '3-4 hours',
    nightlife: '4-6 hours',
    day_trips: '8-10 hours',
    hidden_gems: '1-2 hours',
    outdoor: '3-5 hours',
    shopping: '2-4 hours',
    cultural: '1-2 hours',
    wellness: '2-3 hours',
    dining: '1-2 hours',
    cafes: '1 hour',
    temples: '1-2 hours',
    parks: '2-3 hours',
    landmarks: '1-2 hours',
    nature: '3-4 hours',
    adventure: '3-5 hours',
    wildlife: '3-4 hours',
    water_sports: '2-4 hours',
  };
  return durations[category];
}

/**
 * Get a photo URL using the proxy endpoint to avoid exposing API key
 */
export function getPhotoUrl(photoReference: string, maxWidth = 800): string {
  if (!photoReference) {
    return '';
  }
  // Use proxy endpoint to avoid exposing API key in client URLs
  return `/api/photo-proxy?ref=${encodeURIComponent(photoReference)}&maxwidth=${maxWidth}`;
}

/**
 * Get photo URL for server-side use only (where API key is safe)
 * @internal
 */
export function getPhotoUrlServer(photoReference: string, maxWidth = 800): string {
  if (!isConfigured.googleMaps() || !photoReference) {
    return '';
  }
  return `${GOOGLE_MAPS_BASE_URL}/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${getGoogleMapsApiKey()}`;
}

// ============================================================================
// PHASE 5 FIX 5.1: VERIFIED HOTEL AMENITIES
// Fetches actual amenities from Google Places instead of guessing
// ============================================================================

export interface VerifiedHotelAmenities {
  hasPool: boolean | null;
  hasGym: boolean | null;
  hasSpa: boolean | null;
  hasRestaurant: boolean | null;
  servesBreakfast: boolean | null;
  hasFreeWifi: boolean | null;
  hasParking: boolean | null;
  wheelchairAccessible: boolean | null;
  petFriendly: boolean | null;
  hasBeachAccess: boolean | null;
  // Raw data for additional parsing
  rawTypes: string[];
  rawAmenityText: string;
  confidence: 'verified' | 'inferred' | 'unknown';
}

/**
 * Fetches verified amenities for a hotel from Google Places API
 * Uses place details and reviews to extract actual amenity information
 */
export async function getHotelAmenities(placeId: string): Promise<VerifiedHotelAmenities> {
  const defaultResult: VerifiedHotelAmenities = {
    hasPool: null,
    hasGym: null,
    hasSpa: null,
    hasRestaurant: null,
    servesBreakfast: null,
    hasFreeWifi: null,
    hasParking: null,
    wheelchairAccessible: null,
    petFriendly: null,
    hasBeachAccess: null,
    rawTypes: [],
    rawAmenityText: '',
    confidence: 'unknown',
  };

  if (!isConfigured.googleMaps()) {
    return defaultResult;
  }

  try {
    // Fetch extended place details including reviews for amenity mentions
    const params = new URLSearchParams({
      place_id: placeId,
      fields: [
        'name',
        'types',
        'wheelchair_accessible_entrance',
        'serves_breakfast',
        'reviews',
        'editorial_summary',
      ].join(','),
      key: getGoogleMapsApiKey(),
    });

    const data = await withRetry(async () => {
      const response = await fetchWithTimeout(
        `${GOOGLE_MAPS_BASE_URL}/place/details/json?${params}`,
        {},
        GOOGLE_MAPS_TIMEOUT
      );

      if (response.status === 429) {
        throw createRateLimitError();
      }

      if (!response.ok) {
        return { result: null };
      }

      return response.json();
    }, GOOGLE_MAPS_RETRY_OPTIONS);

    const result = data.result;

    if (!result) {
      return defaultResult;
    }

    // Extract amenities from types array
    const types = (result.types || []) as string[];

    // Build text corpus from reviews and summary for keyword extraction
    interface ReviewItem { text?: string }
    const reviewTexts = (result.reviews as ReviewItem[] || [])
      .map((r) => r.text || '')
      .join(' ')
      .toLowerCase();
    const summaryText = (result.editorial_summary?.overview || '').toLowerCase();
    const combinedText = `${reviewTexts} ${summaryText}`;

    // Keyword-based amenity detection from reviews/description
    const amenities: VerifiedHotelAmenities = {
      hasPool: detectAmenity(combinedText, ['pool', 'swimming pool', 'infinity pool', 'rooftop pool']),
      hasGym: detectAmenity(combinedText, ['gym', 'fitness center', 'fitness room', 'workout']),
      hasSpa: detectAmenity(combinedText, ['spa', 'massage', 'sauna', 'wellness center']),
      hasRestaurant: detectAmenity(combinedText, ['restaurant', 'on-site dining', 'breakfast buffet']),
      servesBreakfast: result.serves_breakfast ?? detectAmenity(combinedText, ['breakfast', 'morning meal', 'complimentary breakfast']),
      hasFreeWifi: detectAmenity(combinedText, ['free wifi', 'complimentary wifi', 'wifi included', 'free internet']),
      hasParking: detectAmenity(combinedText, ['parking', 'valet', 'garage', 'free parking']),
      wheelchairAccessible: result.wheelchair_accessible_entrance ?? detectAmenity(combinedText, ['wheelchair', 'accessible', 'ada compliant', 'mobility']),
      petFriendly: detectAmenity(combinedText, ['pet friendly', 'pets allowed', 'dog friendly', 'pets welcome']),
      hasBeachAccess: detectAmenity(combinedText, ['beach access', 'beachfront', 'private beach', 'beach club', 'on the beach']),
      rawTypes: types,
      rawAmenityText: combinedText.substring(0, 500), // Store snippet for debugging
      confidence: combinedText.length > 100 ? 'inferred' : 'unknown',
    };

    // Upgrade confidence if we got direct API fields
    if (result.wheelchair_accessible_entrance !== undefined || result.serves_breakfast !== undefined) {
      amenities.confidence = 'verified';
    }

    return amenities;
  } catch (error) {
    console.error('[getHotelAmenities] Error:', error);
    return defaultResult;
  }
}

/**
 * Helper to detect amenity presence from text
 * Returns true if found, false if explicitly denied, null if unknown
 */
function detectAmenity(text: string, keywords: string[]): boolean | null {
  const negatives = ['no ', 'not ', "don't have", "doesn't have", 'lacks', 'missing', 'without'];

  for (const keyword of keywords) {
    const index = text.indexOf(keyword);
    if (index !== -1) {
      // Check if preceded by negative
      const contextStart = Math.max(0, index - 20);
      const context = text.substring(contextStart, index);
      if (negatives.some(neg => context.includes(neg))) {
        return false;
      }
      return true;
    }
  }

  return null; // Unknown
}

// Search for hotels using Google Places API
export async function searchHotelsGoogle(
  cityName: string,
  location?: { lat: number; lng: number }
): Promise<{
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  priceLevel: number;
  imageUrl: string;
  lat: number;
  lng: number;
  types: string[];
  isLuxury: boolean;
}[]> {
  if (!isConfigured.googleMaps()) {
    return [];
  }
  const apiKey = getGoogleMapsApiKey();

  // Search with multiple queries to find variety of hotels
  // Include specific luxury brand names to ensure top hotels appear
  const queries = [
    `best hotels in ${cityName}`,
    `5 star resort ${cityName}`,
    `luxury resort ${cityName}`,
    `boutique hotel ${cityName}`,
    `St Regis ${cityName}`,
    `Four Seasons ${cityName}`,
    `Ritz Carlton ${cityName}`,
    `Eden Roc ${cityName}`,
    `Marriott ${cityName}`,
    `Hilton ${cityName}`,
  ];

  const allPlaces: PlaceResult[] = [];

  for (const query of queries) {
    const params = new URLSearchParams({
      query,
      type: 'lodging',
      key: apiKey,
    });

    if (location) {
      params.append('location', `${location.lat},${location.lng}`);
      params.append('radius', '50000'); // 50km radius for resorts
    }

    try {
      const data = await withRetry(async () => {
        const response = await fetchWithTimeout(
          `${GOOGLE_MAPS_BASE_URL}/place/textsearch/json?${params}`,
          {},
          GOOGLE_MAPS_TIMEOUT
        );

        if (response.status === 429) {
          throw createRateLimitError();
        }

        if (!response.ok) {
          return { results: [] };
        }

        return response.json();
      }, GOOGLE_MAPS_RETRY_OPTIONS);

      if (data.results && Array.isArray(data.results)) {
        allPlaces.push(...data.results);
      }
    } catch (error) {
      console.error('Google Places hotel search error:', error);
    }

    // Small delay between queries to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Deduplicate by place_id
  let uniquePlaces = Array.from(
    new Map(allPlaces.map((p) => [p.place_id, p])).values()
  );

  // Filter by distance if we have location coordinates (max 50km)
  // Use != null instead of truthiness check because lat/lng of 0 is valid
  // (e.g., locations near the equator or prime meridian)
  if (location && location.lat != null && location.lng != null) {
    const beforeCount = uniquePlaces.length;
    uniquePlaces = uniquePlaces.filter((place) => {
      const placeLat = place.geometry?.location?.lat;
      const placeLng = place.geometry?.location?.lng;
      if (placeLat == null || placeLng == null) return false;
      const distance = getDistanceKm(location.lat, location.lng, placeLat, placeLng);
      return distance <= 50; // Max 50km from destination
    });
  }

  // Detect luxury hotels by name - comprehensive list
  const luxuryBrands = [
    // Ultra-luxury
    'st regis', 'st. regis', 'four seasons', 'ritz carlton', 'ritz-carlton',
    'mandarin oriental', 'peninsula', 'waldorf', 'aman', 'rosewood',
    'park hyatt', 'edition', 'one&only', 'six senses', 'capella', 'faena',
    'bulgari', 'armani', 'belmond', 'raffles', 'oberoi',
    // Premium luxury
    'w hotel', 'conrad', 'fairmont', 'sofitel', 'lxr', 'curio',
    'intercontinental', 'jw marriott', 'eden roc', 'andaz', 'kimpton',
    'banyan tree', 'shangri-la', 'langham', 'anantara',
    // Caribbean/DR specific luxury
    'excellence', 'secrets', 'zoetry', 'breathless', 'dreams',
    'tortuga bay', 'cap cana', 'puntacana resort', 'casa de campo',
    // Resort indicators
    'the luxury collection', 'autograph collection'
  ];

  const isLuxuryHotel = (name: string) => {
    const lowerName = name.toLowerCase();
    return luxuryBrands.some(brand => lowerName.includes(brand)) ||
           lowerName.includes('5 star') ||
           lowerName.includes('five star') ||
           lowerName.includes('luxury');
  };

  // Sort: luxury first, then by rating
  uniquePlaces.sort((a, b) => {
    const aLuxury = isLuxuryHotel(a.name);
    const bLuxury = isLuxuryHotel(b.name);
    if (aLuxury && !bLuxury) return -1;
    if (!aLuxury && bLuxury) return 1;
    // Then by price level (higher = more expensive)
    const priceDiff = (b.price_level || 0) - (a.price_level || 0);
    if (priceDiff !== 0) return priceDiff;
    // Then by rating
    return (b.rating || 0) - (a.rating || 0);
  });

  // Hotel fallback images by quality tier
  const luxuryImages = [
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
  ];
  const standardImages = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
  ];

  return uniquePlaces.slice(0, 30).map((place, idx) => {
    const luxury = isLuxuryHotel(place.name);
    const fallbackImages = luxury ? luxuryImages : standardImages;

    return {
      id: `google-${place.place_id}`,
      name: place.name,
      address: place.formatted_address || place.vicinity || '',
      rating: place.rating || 4.0,
      reviewCount: place.user_ratings_total || 0,
      priceLevel: place.price_level ?? (luxury ? 4 : 2), // Default luxury to expensive
      imageUrl: place.photos?.[0]?.photo_reference
        ? getPhotoUrl(place.photos[0].photo_reference, 800)
        : fallbackImages[idx % fallbackImages.length],
      lat: place.geometry?.location?.lat || 0,
      lng: place.geometry?.location?.lng || 0,
      types: place.types || [],
      isLuxury: luxury,
    };
  });
}
