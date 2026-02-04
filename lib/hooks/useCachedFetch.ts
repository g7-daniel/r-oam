/**
 * SWR-based hooks for data fetching with caching
 *
 * Features:
 * - Automatic caching and revalidation
 * - Stale-while-revalidate pattern
 * - Request deduplication
 * - Error retry with exponential backoff
 * - Optimistic updates support
 */

import useSWR, { SWRConfiguration, mutate } from 'swr';
import useSWRMutation from 'swr/mutation';

// Default SWR configuration with caching optimizations
const defaultConfig: SWRConfiguration = {
  // Revalidate on focus for fresh data
  revalidateOnFocus: false, // Disabled to reduce API calls
  // Revalidate on reconnect
  revalidateOnReconnect: true,
  // Don't revalidate on mount if data is fresh
  revalidateIfStale: true,
  // Dedupe requests within 2 seconds
  dedupingInterval: 2000,
  // Focus throttle: 5 seconds
  focusThrottleInterval: 5000,
  // Error retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  // Keep previous data while loading
  keepPreviousData: true,
};

// Fetcher type is available for custom fetcher implementations
// type Fetcher<T> = (url: string) => Promise<T>;

// Default JSON fetcher
async function defaultFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object
    (error as any).info = await res.json().catch(() => ({}));
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
}

// POST fetcher for mutations
async function postFetcher<T, A>(url: string, { arg }: { arg: A }): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = new Error('An error occurred while posting data.');
    (error as any).info = await res.json().catch(() => ({}));
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
}

/**
 * Hook for fetching areas discovery data with caching
 */
export function useAreasDiscovery(
  destination: string | null,
  preferences?: Record<string, unknown>
) {
  const key = destination
    ? `/api/quick-plan/discover-areas?destination=${encodeURIComponent(destination)}`
    : null;

  interface AreasResponse {
    areas: Array<{
      id: string;
      name: string;
      centerLat?: number;
      centerLng?: number;
      [key: string]: unknown;
    }>;
    splitOptions: unknown[];
  }

  const { data, error, isLoading, isValidating, mutate } = useSWR<AreasResponse>(
    key,
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, preferences }),
      });
      if (!response.ok) throw new Error('Failed to fetch areas');
      return response.json();
    },
    {
      ...defaultConfig,
      // Areas are expensive to compute, cache for 10 minutes
      dedupingInterval: 600000,
      // Don't auto-revalidate frequently
      refreshInterval: 0,
    }
  );

  return {
    areas: data?.areas ?? [],
    splitOptions: data?.splitOptions ?? [],
    isLoading,
    isValidating,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching hotels with caching
 */
export function useHotels(
  areaId: string | null,
  destination: string | null,
  options?: {
    budgetMin?: number;
    budgetMax?: number;
    minRating?: number;
    limit?: number;
  }
) {
  const searchParams = new URLSearchParams();
  if (areaId) searchParams.set('area', areaId);
  if (destination) searchParams.set('destination', destination);
  if (options?.budgetMin) searchParams.set('budgetMin', String(options.budgetMin));
  if (options?.budgetMax) searchParams.set('budgetMax', String(options.budgetMax));
  if (options?.minRating) searchParams.set('minRating', String(options.minRating));
  if (options?.limit) searchParams.set('limit', String(options.limit));

  const key = areaId && destination
    ? `/api/quick-plan/hotels?${searchParams.toString()}`
    : null;

  interface HotelsResponse {
    hotels: Array<{
      id: string;
      name: string;
      pricePerNight?: number;
      googleRating?: number;
      stars?: number;
      [key: string]: unknown;
    }>;
    totalCount: number;
  }

  const { data, error, isLoading, isValidating, mutate } = useSWR<HotelsResponse>(
    key,
    defaultFetcher<HotelsResponse>,
    {
      ...defaultConfig,
      // Hotels have prices that can change, cache for 3 minutes
      dedupingInterval: 180000,
    }
  );

  return {
    hotels: data?.hotels ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isValidating,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching restaurants with caching
 */
export function useRestaurants(
  cuisineTypes: string[] | null,
  destination: string | null,
  hotels?: Record<string, { lat: number; lng: number }>,
  areas?: Array<{ id: string; name: string; centerLat?: number; centerLng?: number }>
) {
  // Create a stable key from the params
  const key = cuisineTypes && cuisineTypes.length > 0 && destination
    ? `restaurants-${destination}-${cuisineTypes.sort().join(',')}`
    : null;

  interface RestaurantsResponse {
    restaurantsByCuisine: Record<string, unknown[]>;
    totalCount: number;
  }

  const { data, error, isLoading, isValidating, mutate } = useSWR<RestaurantsResponse>(
    key,
    async () => {
      const response = await fetch('/api/quick-plan/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuisineTypes, destination, hotels, areas }),
      });
      if (!response.ok) throw new Error('Failed to fetch restaurants');
      return response.json();
    },
    {
      ...defaultConfig,
      // Restaurants are fairly stable, cache for 5 minutes
      dedupingInterval: 300000,
    }
  );

  return {
    restaurantsByCuisine: data?.restaurantsByCuisine ?? {},
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isValidating,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for fetching experiences with caching
 */
export function useExperiences(
  activityTypes: string[] | null,
  destination: string | null,
  hotels?: Record<string, { lat: number; lng: number }>,
  areas?: Array<{ id: string; name: string; centerLat?: number; centerLng?: number }>
) {
  const key = activityTypes && activityTypes.length > 0 && destination
    ? `experiences-${destination}-${activityTypes.sort().join(',')}`
    : null;

  interface ExperiencesResponse {
    experiencesByType: Record<string, unknown[]>;
    totalCount: number;
  }

  const { data, error, isLoading, isValidating, mutate } = useSWR<ExperiencesResponse>(
    key,
    async () => {
      const response = await fetch('/api/quick-plan/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityTypes, destination, hotels, areas }),
      });
      if (!response.ok) throw new Error('Failed to fetch experiences');
      return response.json();
    },
    {
      ...defaultConfig,
      dedupingInterval: 300000,
    }
  );

  return {
    experiencesByType: data?.experiencesByType ?? {},
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isValidating,
    error,
    refresh: mutate,
  };
}

/**
 * Hook for validating a Google Place
 */
export function usePlaceValidation(placeId: string | null) {
  const key = placeId ? `/api/quick-plan/validate-place?placeId=${placeId}` : null;

  interface PlaceValidationResponse {
    isValid: boolean;
    place?: {
      name: string;
      placeId: string;
      lat: number;
      lng: number;
      [key: string]: unknown;
    };
  }

  const { data, error, isLoading } = useSWR<PlaceValidationResponse>(
    key,
    defaultFetcher<PlaceValidationResponse>,
    {
      ...defaultConfig,
      // Place details are very stable, cache for 24 hours
      dedupingInterval: 86400000,
      revalidateOnFocus: false,
      revalidateIfStale: false,
    }
  );

  return {
    place: data,
    isValid: data?.isValid ?? false,
    isLoading,
    error,
  };
}

/**
 * Hook for place search with caching
 */
export function usePlaceSearch(query: string | null, type?: string) {
  const searchParams = new URLSearchParams();
  if (query) searchParams.set('query', query);
  if (type) searchParams.set('type', type);

  const key = query && query.length >= 2
    ? `/api/quick-plan/validate-place?${searchParams.toString()}`
    : null;

  interface PlaceSearchResponse {
    results: Array<{
      placeId: string;
      name: string;
      address?: string;
      [key: string]: unknown;
    }>;
    count: number;
  }

  const { data, error, isLoading } = useSWR<PlaceSearchResponse>(
    key,
    defaultFetcher<PlaceSearchResponse>,
    {
      ...defaultConfig,
      // Search results cache for 1 hour
      dedupingInterval: 3600000,
    }
  );

  return {
    results: data?.results ?? [],
    count: data?.count ?? 0,
    isLoading,
    error,
  };
}

/**
 * Mutation hook for generating itinerary
 */
export function useGenerateItinerary() {
  return useSWRMutation(
    '/api/quick-plan/generate-itinerary',
    postFetcher<
      { itinerary: any; qualityCheck: any; success: boolean },
      { preferences: any; areas: any[]; hotels: Record<string, any>; restaurants: Record<string, any[]> }
    >
  );
}

/**
 * Mutation hook for chat messages
 */
export function useChatMutation() {
  return useSWRMutation(
    '/api/quick-plan/chat',
    postFetcher<
      { content: string; success: boolean },
      { messages: Array<{ role: string; content: string }>; temperature?: number }
    >
  );
}

/**
 * Prefetch data to warm the cache
 */
export function prefetchAreas(destination: string, preferences?: Record<string, unknown>) {
  const key = `/api/quick-plan/discover-areas?destination=${encodeURIComponent(destination)}`;
  return mutate(key, async () => {
    const response = await fetch(key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, preferences }),
    });
    if (!response.ok) throw new Error('Failed to fetch areas');
    return response.json();
  });
}

/**
 * Clear all cached data
 */
export function clearAllCache() {
  return mutate(() => true, undefined, { revalidate: false });
}

/**
 * Clear cached data for a specific key pattern
 */
export function clearCacheByPattern(pattern: string | RegExp) {
  return mutate(
    (key: string) => {
      if (typeof pattern === 'string') {
        return key.includes(pattern);
      }
      return pattern.test(key);
    },
    undefined,
    { revalidate: false }
  );
}
