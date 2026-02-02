/**
 * Quick Plan Experiences API
 * Fetches experiences/tours by activity type, near the user's selected hotels
 */

import { NextRequest, NextResponse } from 'next/server';
import { placesCache, CACHE_TTL, createCacheKey } from '@/lib/api-cache';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';

// Maximum distance from hotel to consider an experience (in meters)
const MAX_DISTANCE_METERS = 25000; // 25km - reasonable for tours/experiences

// Place types to ALWAYS exclude from experience/activity searches
// These are Google Place types, not name strings
// See: https://developers.google.com/maps/documentation/places/web-service/place-types
const EXCLUDED_PLACE_TYPES = [
  'lodging',              // Hotels, motels, resorts, B&Bs
  'real_estate_agency',
  'insurance_agency',
  'accounting',
  'lawyer',
  'bank',
  'atm',
  'local_government_office',
  'car_rental',           // Excludes ATV rentals from horseback searches
  'car_dealer',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      activityTypes,
      destination,
      hotels, // { areaId: { lat, lng, name } }
      areas,  // [{ id, name, centerLat, centerLng }]
    } = body as {
      activityTypes: string[];
      destination: string;
      hotels: Record<string, { lat: number; lng: number; name: string }>;
      areas: { id: string; name: string; centerLat?: number; centerLng?: number }[];
    };

    console.log('[Experiences API] Request:', {
      activityTypes,
      destination,
      hotelCount: Object.keys(hotels || {}).length,
      areasCount: areas?.length,
    });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[Experiences API] No Google Maps API key configured');
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
        hotelCoords.push({
          areaId: area.id,
          areaName: area.name,
          lat: area.centerLat,
          lng: area.centerLng,
        });
      }
    }

    console.log('[Experiences API] Hotel coordinates:', hotelCoords);

    if (hotelCoords.length === 0) {
      console.warn('[Experiences API] No hotel/area coordinates available');
      return NextResponse.json({
        experiencesByType: {},
        totalCount: 0,
        error: 'No location coordinates available',
      });
    }

    // Activity type to Google Places search terms - MORE SPECIFIC to avoid mismatches
    const activitySearchTerms: Record<string, string[]> = {
      surf: ['surf lessons', 'surf school', 'learn to surf'],
      snorkel: ['snorkeling tour', 'snorkel reef excursion', 'snorkeling trip'],
      dive: ['scuba diving center', 'PADI diving', 'dive certification'],
      swimming: ['swimming beach', 'natural swimming pool', 'beach club swimming'],
      wildlife: [
        'wildlife sanctuary',
        'animal rescue center',
        'sloth sanctuary',
        'monkey sanctuary',
        'turtle nesting tour',
        'bird watching tour',
        'national park wildlife',
      ],
      hiking: ['hiking trail guided', 'nature hike tour', 'rainforest hike', 'volcano hike'],
      adventure: ['zip line canopy tour', 'atv tour adventure', 'white water rafting', 'bungee jumping'],
      cultural: ['historical walking tour', 'museum tour', 'heritage site tour', 'archaeological site'],
      food_tour: ['food walking tour', 'culinary tour local', 'cooking class cuisine', 'market food tour'],
      nightlife: ['nightclub', 'bar crawl tour', 'night entertainment district'],
      beach: ['beach club day pass', 'beach resort activities', 'beach rental'],
      spa_wellness: ['spa resort', 'wellness retreat', 'hot springs', 'yoga retreat'],
      golf: ['golf course', 'golf club', 'golf resort'],
      photography: ['photo tour', 'photography safari', 'scenic viewpoint tour'],
      horseback: ['horseback riding trail', 'horse riding tour beach'],
      boat: ['boat tour', 'sailing cruise', 'catamaran tour', 'sunset cruise'],
      fishing: ['fishing charter', 'sport fishing tour', 'deep sea fishing'],
      // Family-friendly categories
      kids_activities: ['family activities', 'kids tour', 'children activities', 'family adventure park'],
      water_park: ['water park', 'aqua park', 'water slides'],
    };

    const results: Record<string, any[]> = {};

    for (const activityType of activityTypes) {
      const searchTerms = activitySearchTerms[activityType] || [`${activityType} tour`, `${activityType} experience`];
      const allExperiences: any[] = [];
      const seenPlaceIds = new Set<string>();

      // Search near each hotel location (with caching)
      for (const hotel of hotelCoords) {
        for (const searchTerm of searchTerms.slice(0, 2)) {
          try {
            const searchQuery = `${searchTerm} ${hotel.areaName} ${destination}`;
            const cacheKey = createCacheKey('places-experiences', {
              query: searchQuery,
              lat: hotel.lat.toFixed(2),
              lng: hotel.lng.toFixed(2),
            });

            // Check cache first
            let data = placesCache.get<any>(cacheKey);

            if (!data) {
              const params = new URLSearchParams({
                query: searchQuery,
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
                placesCache.set(cacheKey, data, CACHE_TTL.EXPERIENCES);
              }
            }

            if (data?.results) {
                for (const place of data.results) {
                  if (place.place_id && !seenPlaceIds.has(place.place_id)) {
                    seenPlaceIds.add(place.place_id);

                    // Skip places with excluded types (like lodging/hotels, car rentals)
                    const placeTypes: string[] = place.types || [];
                    const excludedTypes = EXCLUDED_PLACE_TYPES.filter(t => placeTypes.includes(t));
                    if (excludedTypes.length > 0) {
                      console.log(`[Experiences API] Skipping "${place.name}" - has excluded type: ${excludedTypes.join(', ')}`);
                      continue;
                    }

                    const placeLat = place.geometry?.location?.lat;
                    const placeLng = place.geometry?.location?.lng;
                    const distance = placeLat && placeLng
                      ? calculateDistance(hotel.lat, hotel.lng, placeLat, placeLng)
                      : Infinity;

                    if (distance <= MAX_DISTANCE_METERS) {
                      allExperiences.push({
                        id: place.place_id,
                        placeId: place.place_id,
                        name: place.name,
                        address: place.formatted_address || place.vicinity || '',
                        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
                        activityType: formatActivityLabel(activityType),
                        googleRating: place.rating || 0,
                        reviewCount: place.user_ratings_total || 0,
                        priceLevel: place.price_level || 2,
                        imageUrl: place.photos?.[0]?.photo_reference
                          ? `${GOOGLE_MAPS_BASE_URL}/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}`
                          : '/images/activity-placeholder.svg',
                        lat: placeLat || 0,
                        lng: placeLng || 0,
                        reasons: generateReasons(place, distance, hotel.areaName),
                        nearArea: hotel.areaName,
                        distanceFromHotel: Math.round(distance / 1000 * 10) / 10,
                      });
                    }
                  }
                }
              }
          } catch (error) {
            console.error(`[Experiences API] Search failed for ${searchTerm}:`, error);
          }
        }
      }

      console.log(`[Experiences API] Found ${allExperiences.length} ${activityType} experiences after type filtering`);

      // Sort by rating and distance, take top results
      allExperiences.sort((a, b) => {
        const ratingDiff = (b.googleRating || 0) - (a.googleRating || 0);
        if (Math.abs(ratingDiff) > 0.3) return ratingDiff;
        return (a.distanceFromHotel || 999) - (b.distanceFromHotel || 999);
      });

      results[activityType] = allExperiences.slice(0, 8);
      console.log(`[Experiences API] Returning top ${results[activityType].length} for ${activityType}`);
    }

    return NextResponse.json({
      experiencesByType: results,
      totalCount: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
    });
  } catch (error) {
    console.error('[Experiences API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch experiences' }, { status: 500 });
  }
}

// Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatActivityLabel(activity: string): string {
  const labels: Record<string, string> = {
    surf: 'Surfing',
    snorkel: 'Snorkeling',
    dive: 'Scuba Diving',
    swimming: 'Swimming',
    wildlife: 'Wildlife',
    hiking: 'Hiking',
    adventure: 'Adventure',
    cultural: 'Cultural',
    food_tour: 'Food Tour',
    nightlife: 'Nightlife',
    beach: 'Beach',
    spa_wellness: 'Spa & Wellness',
    golf: 'Golf',
    photography: 'Photography',
    horseback: 'Horseback Riding',
    boat: 'Boat Tours',
    fishing: 'Fishing',
    kids_activities: 'Kids Activities',
    water_park: 'Water Parks',
  };
  return labels[activity] || activity;
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
  } else if (place.user_ratings_total > 100) {
    reasons.push('Popular with travelers');
  }

  const distanceKm = distance / 1000;
  const hotelRef = areaName ? `${areaName} hotel` : 'hotel';
  if (distanceKm <= 2) {
    reasons.push(`Walking distance from ${hotelRef}`);
  } else if (distanceKm <= 5) {
    reasons.push(`Short drive from ${hotelRef}`);
  } else if (distanceKm <= 15) {
    reasons.push(`${Math.round(distanceKm)} km from ${hotelRef}`);
  } else {
    reasons.push(`${Math.round(distanceKm)} km away`);
  }

  return reasons;
}
