/**
 * Quick Plan Restaurants API
 * Fetches restaurants by cuisine type, near the user's selected hotels
 */

import { NextRequest, NextResponse } from 'next/server';
import { RestaurantCandidate } from '@/types/quick-plan';
import { searchRestaurantRecommendations } from '@/lib/reddit';
import { redditCache, placesCache, CACHE_TTL, createCacheKey, fetchWithTimeout } from '@/lib/api-cache';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';
const GOOGLE_API_TIMEOUT = 15000; // 15 second timeout

// Maximum distance from hotel to consider a restaurant (in meters)
const MAX_DISTANCE_METERS = 15000; // 15km - reasonable driving distance

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cuisineTypes,
      destination,
      hotels, // { areaId: { lat, lng, name } }
      areas,  // [{ id, name, centerLat, centerLng }]
      dietaryRestrictions = [], // ['vegan', 'halal', etc.]
    } = body as {
      cuisineTypes: string[];
      destination: string;
      hotels: Record<string, { lat: number; lng: number; name: string }>;
      areas: { id: string; name: string; centerLat?: number; centerLng?: number }[];
      dietaryRestrictions?: string[];
    };

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
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // FIX 2.10: Coordinate validation function
    const isValidCoordinate = (lat: number, lng: number): boolean => {
      return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        !(lat === 0 && lng === 0) // Null island check
      );
    };

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
        error: 'No location coordinates available',
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

    // FIX 2.5: Build search queries that incorporate ALL dietary restrictions
    const buildDietarySearchTerms = (baseTerm: string): string[] => {
      if (activeDietaryRestrictions.length === 0) {
        return [baseTerm];
      }

      // Primary search with first restriction
      const primary = activeDietaryRestrictions[0];
      const primaryPrefix = dietaryPrefixes[primary] || '';

      // For multiple restrictions, create combined searches
      if (activeDietaryRestrictions.length > 1) {
        const combined = activeDietaryRestrictions
          .map(r => dietaryPrefixes[r])
          .filter(Boolean)
          .join(' ');
        return [
          `${primaryPrefix} ${baseTerm}`.trim(),
          `${combined} ${baseTerm}`.trim(),
        ];
      }

      return [`${primaryPrefix} ${baseTerm}`.trim()];
    };

    // Legacy support - still use single prefix for cuisine mapping
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

    // FIX 2.4: Global deduplication - move globalSeenPlaceIds OUTSIDE the cuisine loop
    // This prevents the same restaurant appearing in multiple cuisine categories
    const globalSeenPlaceIds = new Set<string>();

    for (const cuisine of cuisineTypes) {
      const searchTerms = cuisineSearchTerms[cuisine] || [`${cuisine} restaurant`];
      const allRestaurants: RestaurantCandidate[] = [];

      // Search near each hotel location (with caching)
      for (const hotel of hotelCoords) {
        for (const searchTerm of searchTerms.slice(0, 2)) {
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

            if (data?.results) {
                for (const place of data.results) {
                  if (place.place_id && !globalSeenPlaceIds.has(place.place_id)) {
                    globalSeenPlaceIds.add(place.place_id);

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
                          ? `${GOOGLE_MAPS_BASE_URL}/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}`
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
          } catch (error) {
            console.error(`[Restaurants API] Search failed for ${searchTerm}:`, error);
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

      results[cuisine] = allRestaurants.slice(0, 8); // Top 8 per cuisine
      console.log(`[Restaurants API] Found ${allRestaurants.length} ${cuisine} restaurants, returning top ${results[cuisine].length}`);
    }

    return NextResponse.json({
      restaurantsByCuisine: results,
      totalCount: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
    });
  } catch (error) {
    console.error('[Restaurants API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
