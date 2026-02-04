/**
 * Quick Plan Restaurants API
 * Fetches restaurants by cuisine type, near the user's selected hotels
 */

import { NextRequest, NextResponse } from 'next/server';
import { RestaurantCandidate } from '@/types/quick-plan';
import { searchRestaurantRecommendations } from '@/lib/reddit';
import { redditCache, placesCache, CACHE_TTL, createCacheKey, fetchWithTimeout } from '@/lib/api-cache';
import { calculateHaversineDistance } from '@/lib/utils/geo';
import {
  restaurantsPostSchema,
  validateRequestBody,
  isValidCoordinate,
} from '@/lib/api-validation';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';
const GOOGLE_API_TIMEOUT = 15000; // 15 second timeout

// Maximum distance from hotel to consider a restaurant (in meters)
const MAX_DISTANCE_METERS = 15000; // 15km - reasonable driving distance

export async function POST(request: NextRequest) {
  try {
    // Validate request body using Zod schema
    const validationResult = await validateRequestBody(request, restaurantsPostSchema);
    if (!validationResult.success) {
      return validationResult.error;
    }

    const {
      cuisineTypes,
      destination,
      hotels,
      areas,
      dietaryRestrictions,
    } = validationResult.data;

    console.log('[Restaurants API] Request:', {
      cuisineTypes,
      destination,
      hotelCount: Object.keys(hotels || {}).length,
      areasCount: areas?.length,
      dietaryRestrictions,
    });

    // Filter out 'none' from dietary restrictions
    const activeDietaryRestrictions = dietaryRestrictions.filter(r => r !== 'none');

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[Restaurants API] No Google Maps API key configured');
      return NextResponse.json({
        error: 'CONFIGURATION_ERROR',
        message: 'Restaurant search is temporarily unavailable. Please try again later.',
        restaurantsByCuisine: {},
        totalCount: 0,
      }, { status: 500 });
    }

    // Build hotel coordinates list for proximity filtering
    const hotelCoords: { areaId: string; areaName: string; lat: number; lng: number }[] = [];
    for (const area of areas || []) {
      const hotel = hotels?.[area.id];
      if (hotel?.lat && hotel?.lng && isValidCoordinate(hotel.lat, hotel.lng)) {
        hotelCoords.push({
          areaId: area.id,
          areaName: area.name,
          lat: hotel.lat,
          lng: hotel.lng,
        });
      } else if (area.centerLat && area.centerLng && isValidCoordinate(area.centerLat, area.centerLng)) {
        // Fallback to area center if no hotel coordinates
        hotelCoords.push({
          areaId: area.id,
          areaName: area.name,
          lat: area.centerLat,
          lng: area.centerLng,
        });
      } else {
        console.warn(`[Restaurants API] Invalid coordinates for area ${area.name}, skipping`);
      }
    }

    console.log('[Restaurants API] Hotel coordinates:', hotelCoords);

    // Fetch Reddit restaurant recommendations for enrichment (with caching)
    let redditRestaurants = new Map<string, { mentions: number; quote?: string; sentiment?: number }>();
    try {
      const firstArea = areas?.[0]?.name;
      const redditCacheKey = createCacheKey('reddit-restaurants', { destination, area: firstArea });

      // Try cache first
      const cachedReddit = redditCache.get<typeof redditRestaurants>(redditCacheKey);
      if (cachedReddit) {
        redditRestaurants = cachedReddit;
        console.log(`[Restaurants API] Using cached Reddit data (${redditRestaurants.size} mentions)`);
      } else {
        const redditRecs = await searchRestaurantRecommendations(destination, firstArea);
        for (const rec of redditRecs) {
          redditRestaurants.set(rec.restaurantName.toLowerCase(), {
            mentions: rec.mentionCount,
            quote: rec.quotes[0],
            sentiment: rec.sentimentScore,
          });
        }
        // Cache the results
        redditCache.set(redditCacheKey, redditRestaurants, CACHE_TTL.REDDIT);
        console.log(`[Restaurants API] Found ${redditRestaurants.size} Reddit restaurant mentions (cached)`);
      }
    } catch (e) {
      console.error('[Restaurants API] Reddit search failed:', e);
    }

    if (hotelCoords.length === 0) {
      console.warn('[Restaurants API] No hotel/area coordinates available');
      return NextResponse.json({
        restaurantsByCuisine: {},
        totalCount: 0,
        warning: 'NO_COORDINATES',
        message: 'No valid location coordinates available. Please select a hotel or area first.',
      });
    }

    // Dietary restriction prefixes for search queries
    const dietaryPrefixes: Record<string, string> = {
      vegetarian: 'vegetarian',
      vegan: 'vegan',
      halal: 'halal',
      kosher: 'kosher',
      gluten_free: 'gluten free',
      dairy_free: 'dairy free',
    };

    // FIX 2.5: Build dietary prefix from active restrictions
    // Use the first restriction as prefix for search queries
    const dietaryPrefix = activeDietaryRestrictions.length > 0 && dietaryPrefixes[activeDietaryRestrictions[0]]
      ? `${dietaryPrefixes[activeDietaryRestrictions[0]]} `
      : '';

    console.log('[Restaurants API] Dietary restrictions:', activeDietaryRestrictions, 'prefix:', dietaryPrefix || '(none)');

    // Cuisine type to Google Places search terms
    const cuisineSearchTerms: Record<string, string[]> = {
      italian: [`${dietaryPrefix}italian restaurant`, `${dietaryPrefix}pasta restaurant`, 'pizza restaurant'],
      steakhouse: dietaryPrefix.includes('vegan') || dietaryPrefix.includes('vegetarian')
        ? [`${dietaryPrefix}grill restaurant`, `${dietaryPrefix}restaurant`] // Skip steakhouse for vegan/vegetarian
        : ['steakhouse', 'steak restaurant', 'grill restaurant'],
      sushi: [`${dietaryPrefix}sushi restaurant`, `${dietaryPrefix}japanese restaurant`],
      fine_dining: [`${dietaryPrefix}fine dining restaurant`, `${dietaryPrefix}upscale restaurant`],
      seafood: activeDietaryRestrictions.includes('seafood_allergy')
        ? [`${dietaryPrefix}restaurant`] // Skip seafood-specific for allergy
        : [`${dietaryPrefix}seafood restaurant`, 'fish restaurant'],
      local: [`${dietaryPrefix}local restaurant`, `${dietaryPrefix}traditional restaurant`, `${dietaryPrefix}${destination} cuisine`],
      mexican: [`${dietaryPrefix}mexican restaurant`, `${dietaryPrefix}tacos`],
      asian: [`${dietaryPrefix}asian restaurant`, `${dietaryPrefix}thai restaurant`, `${dietaryPrefix}chinese restaurant`],
      mediterranean: [`${dietaryPrefix}mediterranean restaurant`, `${dietaryPrefix}greek restaurant`],
      casual: [`${dietaryPrefix}casual dining`, `${dietaryPrefix}restaurant`],
    };

    const results: Record<string, RestaurantCandidate[]> = {};

    // =================================================================
    // PARALLELIZED: Process all cuisine types concurrently using Promise.all
    // =================================================================
    console.log(`[Restaurants API] Processing ${cuisineTypes.length} cuisine types in parallel`);

    // For global deduplication across cuisines, we track seen place IDs per cuisine
    // and dedupe after parallel execution
    const cuisineResults = await Promise.all(cuisineTypes.map(async (cuisine) => {
      const searchTerms = cuisineSearchTerms[cuisine] || [`${cuisine} restaurant`];
      const allRestaurants: RestaurantCandidate[] = [];
      const localSeenPlaceIds = new Set<string>();

      // Parallelize searches across hotels and search terms
      const searchPromises: Promise<{ hotel: typeof hotelCoords[0]; searchTerm: string; data: any } | null>[] = [];

      for (const hotel of hotelCoords) {
        for (const searchTerm of searchTerms.slice(0, 2)) {
          searchPromises.push((async () => {
            try {
              const searchQuery = `${searchTerm} ${hotel.areaName} ${destination}`;
              const cacheKey = createCacheKey('places-restaurants', {
                query: searchQuery,
                lat: hotel.lat.toFixed(2),
                lng: hotel.lng.toFixed(2),
              });

              // Check cache first
              let data = placesCache.get<any>(cacheKey);

              if (!data) {
                const params = new URLSearchParams({
                  query: searchQuery,
                  type: 'restaurant',
                  key: apiKey,
                  location: `${hotel.lat},${hotel.lng}`,
                  radius: String(MAX_DISTANCE_METERS),
                });

                const response = await fetchWithTimeout(
                  `${GOOGLE_MAPS_BASE_URL}/place/textsearch/json?${params}`,
                  {},
                  GOOGLE_API_TIMEOUT
                );

                if (response.ok) {
                  data = await response.json();
                  // Cache the response
                  placesCache.set(cacheKey, data, CACHE_TTL.RESTAURANTS);
                }
              }

              return { hotel, searchTerm, data };
            } catch (error) {
              console.error(`[Restaurants API] Search failed for ${searchTerm}:`, error);
              return null;
            }
          })());
        }
      }

      // Wait for all searches to complete
      const searchResults = await Promise.all(searchPromises);

      // Process results
      for (const result of searchResults) {
        if (!result || !result.data?.results) continue;

        const { hotel, data } = result;
        for (const place of data.results) {
          if (place.place_id && !localSeenPlaceIds.has(place.place_id)) {
            localSeenPlaceIds.add(place.place_id);

            // Calculate distance from this hotel
            const placeLat = place.geometry?.location?.lat;
            const placeLng = place.geometry?.location?.lng;
            const distance = placeLat && placeLng
              ? calculateDistance(hotel.lat, hotel.lng, placeLat, placeLng)
              : Infinity;

            // Only include if within max distance
            if (distance <= MAX_DISTANCE_METERS) {
              // Get Reddit data for this restaurant
              const redditData = redditRestaurants.get(place.name.toLowerCase());

              // Estimate booking difficulty
              const booking = estimateBookingDifficulty(place);

              allRestaurants.push({
                id: place.place_id,
                placeId: place.place_id,
                name: place.name,
                address: place.formatted_address || place.vicinity || '',
                googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
                cuisine: [formatCuisineLabel(cuisine)],
                priceLevel: place.price_level || 2,
                googleRating: place.rating || 0,
                reviewCount: place.user_ratings_total || 0,
                imageUrl: place.photos?.[0]?.photo_reference
                  ? `/api/photo-proxy?ref=${encodeURIComponent(place.photos[0].photo_reference)}&maxwidth=400`
                  : '/images/restaurant-placeholder.svg',
                lat: placeLat || 0,
                lng: placeLng || 0,
                redditScore: redditData?.mentions || 0,
                evidence: redditData?.quote ? [{
                  type: 'reddit_thread' as const,
                  snippet: redditData.quote,
                  subreddit: 'food',
                  score: redditData.mentions,
                }] : [],
                reasons: [
                  ...generateReasons(place, distance, hotel.areaName),
                  ...(redditData && redditData.mentions > 0 ? [`Mentioned ${redditData.mentions}x on Reddit`] : []),
                ],
                bestFor: ['dinner'] as ('lunch' | 'dinner' | 'brunch')[],
                requiresReservation: (place.price_level || 2) >= 3,
                bookingDifficulty: booking.difficulty,
                bookingAdvice: booking.advice,
                userStatus: 'default' as const,
                // Custom fields for display
                nearArea: hotel.areaName,
                distanceFromHotel: Math.round(distance / 1000 * 10) / 10, // km with 1 decimal
              });
            }
          }
        }
      }

      // Sort by Reddit score, rating, and distance
      allRestaurants.sort((a, b) => {
        // First by Reddit score (popular on Reddit gets priority)
        const redditDiff = (b.redditScore || 0) - (a.redditScore || 0);
        if (Math.abs(redditDiff) > 2) return redditDiff;

        // Then by rating
        const ratingDiff = (b.googleRating || 0) - (a.googleRating || 0);
        if (Math.abs(ratingDiff) > 0.3) return ratingDiff;

        // Finally by distance (closer is better)
        return ((a as any).distanceFromHotel || 999) - ((b as any).distanceFromHotel || 999);
      });

      console.log(`[Restaurants API] Found ${allRestaurants.length} ${cuisine} restaurants`);
      return { cuisine, restaurants: allRestaurants.slice(0, 8) }; // Top 8 per cuisine
    }));

    // Collect results and dedupe across cuisines
    const globalSeenPlaceIds = new Set<string>();
    for (const { cuisine, restaurants } of cuisineResults) {
      // Filter out restaurants already seen in previous cuisines
      const uniqueRestaurants = restaurants.filter(r => {
        if (globalSeenPlaceIds.has(r.placeId)) return false;
        globalSeenPlaceIds.add(r.placeId);
        return true;
      });
      results[cuisine] = uniqueRestaurants;
      console.log(`[Restaurants API] ${cuisine}: returning ${uniqueRestaurants.length} unique restaurants`);
    }

    const response = NextResponse.json({
      restaurantsByCuisine: results,
      totalCount: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
      success: true,
    });

    // Add cache headers - restaurants data can be cached for 5 minutes
    // with stale-while-revalidate for 10 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Restaurants API] Error:', errorMessage, error);

    // Return a graceful degradation response with empty results
    return NextResponse.json({
      error: 'FETCH_ERROR',
      message: 'We had trouble finding restaurants. Please try again.',
      restaurantsByCuisine: {},
      totalCount: 0,
    }, { status: 500 });
  }
}

// Distance in meters using centralized Haversine utility
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return calculateHaversineDistance(lat1, lng1, lat2, lng2) * 1000; // Convert km to meters
}

function formatCuisineLabel(cuisine: string): string {
  const labels: Record<string, string> = {
    italian: 'Italian',
    steakhouse: 'Steakhouse',
    sushi: 'Japanese',
    fine_dining: 'Fine Dining',
    seafood: 'Seafood',
    local: 'Local Cuisine',
    mexican: 'Mexican',
    asian: 'Asian',
    mediterranean: 'Mediterranean',
    casual: 'Casual',
  };
  return labels[cuisine] || cuisine;
}

function generateReasons(place: any, distance: number, areaName?: string): string[] {
  const reasons: string[] = [];

  if (place.rating >= 4.5) {
    reasons.push(`Highly rated (${place.rating}/5)`);
  } else if (place.rating >= 4.0) {
    reasons.push(`Well-reviewed (${place.rating}/5)`);
  }

  if (place.user_ratings_total > 500) {
    reasons.push('Very popular');
  } else if (place.user_ratings_total > 200) {
    reasons.push('Popular with travelers');
  }

  const distanceKm = distance / 1000;
  const hotelRef = areaName ? `${areaName} hotel` : 'hotel';
  if (distanceKm <= 2) {
    reasons.push(`Walking distance from ${hotelRef}`);
  } else if (distanceKm <= 5) {
    reasons.push(`Short drive from ${hotelRef}`);
  } else {
    reasons.push(`${Math.round(distanceKm)} km from ${hotelRef}`);
  }

  if (place.price_level >= 3) {
    reasons.push('Upscale dining');
  }

  return reasons;
}

/**
 * Estimate booking difficulty based on restaurant characteristics
 * Helps users understand when to book reservations
 */
function estimateBookingDifficulty(place: any): { difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard'; advice: string } {
  const rating = place.rating || 0;
  const reviews = place.user_ratings_total || 0;
  const priceLevel = place.price_level || 2;

  // Michelin-level indicators: high price, high rating, many reviews
  if (priceLevel >= 4 && rating >= 4.7 && reviews > 500) {
    return { difficulty: 'very_hard', advice: 'Book 60-90 days ahead' };
  }

  // Popular fine dining
  if (priceLevel >= 3 && rating >= 4.5 && reviews > 200) {
    return { difficulty: 'hard', advice: 'Book 2-4 weeks ahead' };
  }

  // Popular upscale casual
  if (priceLevel >= 3 && rating >= 4.3 && reviews > 100) {
    return { difficulty: 'moderate', advice: 'Book 1 week ahead for weekends' };
  }

  // Popular local spot
  if (rating >= 4.3 && reviews > 150) {
    return { difficulty: 'moderate', advice: 'Reservations recommended for dinner' };
  }

  return { difficulty: 'easy', advice: 'Walk-in usually OK' };
}
