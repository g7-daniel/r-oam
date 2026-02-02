/**
 * Quick Plan Restaurants API
 * Fetches restaurants by cuisine type, near the user's selected hotels
 */

import { NextRequest, NextResponse } from 'next/server';
import { RestaurantCandidate } from '@/types/quick-plan';
import { searchRestaurantRecommendations } from '@/lib/reddit';
import { redditCache, placesCache, CACHE_TTL, createCacheKey } from '@/lib/api-cache';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';

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
    } = body as {
      cuisineTypes: string[];
      destination: string;
      hotels: Record<string, { lat: number; lng: number; name: string }>;
      areas: { id: string; name: string; centerLat?: number; centerLng?: number }[];
    };

    console.log('[Restaurants API] Request:', {
      cuisineTypes,
      destination,
      hotelCount: Object.keys(hotels || {}).length,
      areasCount: areas?.length,
    });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[Restaurants API] No Google Maps API key configured');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Build hotel coordinates list for proximity filtering
    const hotelCoords: { areaId: string; areaName: string; lat: number; lng: number }[] = [];
    for (const area of areas || []) {
      const hotel = hotels?.[area.id];
      if (hotel?.lat && hotel?.lng) {
        hotelCoords.push({
          areaId: area.id,
          areaName: area.name,
          lat: hotel.lat,
          lng: hotel.lng,
        });
      } else if (area.centerLat && area.centerLng) {
        // Fallback to area center if no hotel coordinates
        hotelCoords.push({
          areaId: area.id,
          areaName: area.name,
          lat: area.centerLat,
          lng: area.centerLng,
        });
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

    // Cuisine type to Google Places search terms
    const cuisineSearchTerms: Record<string, string[]> = {
      italian: ['italian restaurant', 'pasta restaurant', 'pizza restaurant'],
      steakhouse: ['steakhouse', 'steak restaurant', 'grill restaurant'],
      sushi: ['sushi restaurant', 'japanese restaurant', 'sashimi'],
      fine_dining: ['fine dining restaurant', 'upscale restaurant', 'gourmet restaurant'],
      seafood: ['seafood restaurant', 'fish restaurant', 'lobster restaurant'],
      local: ['local restaurant', 'traditional restaurant', `${destination} cuisine`],
      mexican: ['mexican restaurant', 'tacos', 'taqueria'],
      asian: ['asian restaurant', 'thai restaurant', 'chinese restaurant'],
      mediterranean: ['mediterranean restaurant', 'greek restaurant', 'lebanese restaurant'],
      casual: ['casual dining', 'pub food', 'burger restaurant'],
    };

    const results: Record<string, RestaurantCandidate[]> = {};

    for (const cuisine of cuisineTypes) {
      const searchTerms = cuisineSearchTerms[cuisine] || [`${cuisine} restaurant`];
      const allRestaurants: RestaurantCandidate[] = [];
      const seenPlaceIds = new Set<string>();

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

              const response = await fetch(
                `${GOOGLE_MAPS_BASE_URL}/place/textsearch/json?${params}`
              );

              if (response.ok) {
                data = await response.json();
                // Cache the response
                placesCache.set(cacheKey, data, CACHE_TTL.RESTAURANTS);
              }
            }

            if (data?.results) {
                for (const place of data.results) {
                  if (place.place_id && !seenPlaceIds.has(place.place_id)) {
                    seenPlaceIds.add(place.place_id);

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
