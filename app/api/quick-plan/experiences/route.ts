/**
 * Quick Plan Experiences API
 * Fetches experiences/tours by activity type, near the user's selected hotels
 */

import { NextRequest, NextResponse } from 'next/server';
import { placesCache, CACHE_TTL, createCacheKey, fetchWithTimeout } from '@/lib/api-cache';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';
const GOOGLE_API_TIMEOUT = 15000; // 15 second timeout

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
  'pet_store',            // Exclude pet stores from wildlife/nature searches
  'veterinary_care',      // Exclude vet clinics
];

// Name patterns to EXCLUDE from results (case-insensitive regex)
const EXCLUDED_NAME_PATTERNS = [
  // Pet-related (for wildlife/nature searches)
  /\bpet\b/i,
  /\bpets\b/i,
  /pet\s*(shop|store|supply|grooming)/i,
  /\bveterinar/i,
  /\bvet\s*clinic/i,
  /animal\s*hospital/i,
  /dog\s*(grooming|boarding|kennel|daycare|training)/i,
  /cat\s*(boarding|kennel|cafe)/i,
  /\bpuppy\b/i,
  /\bkitten\b/i,

  // Retail/commercial (not tours)
  /\bsupermarket\b/i,
  /\bgrocery\b/i,
  /\bdepartment\s*store\b/i,
  /\bshopping\s*(mall|center|centre)\b/i,
  /\bwholesale\b/i,
  /\bwarehouse\b/i,

  // Auto-related
  /\bcar\s*(dealer|rental|wash|repair|service)\b/i,
  /\bauto\s*(shop|repair|parts|dealer)\b/i,
  /\btire\s*(shop|center|centre)\b/i,
  /\bmechanic\b/i,

  // Professional services
  /\binsurance\b/i,
  /\blawyer\b/i,
  /\battorney\b/i,
  /\baccountant\b/i,
  /\breal\s*estate\b/i,
  /\bdentist\b/i,
  /\bdental\b/i,
  /\bclinic\b(?!.*tour)/i, // Clinic unless "clinic tour"
  /\bhospital\b(?!.*tour)/i,
  /\bpharmacy\b/i,

  // Generic businesses unlikely to be tours
  /\bbank\b/i,
  /\batm\b/i,
  /\bgas\s*station\b/i,
  /\bconvenience\s*store\b/i,
  /\blaundromat\b/i,
  /\bdry\s*clean/i,
];

// Keywords that BOOST relevance for specific activity types
const RELEVANCE_BOOST_KEYWORDS: Record<string, string[]> = {
  surf: ['surf', 'wave', 'board', 'lesson', 'school', 'beach break'],
  snorkel: ['snorkel', 'reef', 'coral', 'underwater', 'marine', 'sea life'],
  dive: ['dive', 'scuba', 'padi', 'underwater', 'reef', 'certification'],
  wildlife: ['wildlife', 'safari', 'animal', 'sanctuary', 'reserve', 'watching', 'whale', 'dolphin', 'turtle', 'bird', 'nature'],
  nature: ['nature', 'park', 'reserve', 'forest', 'rainforest', 'jungle', 'botanical', 'garden', 'waterfall', 'eco'],
  hiking: ['hike', 'hiking', 'trail', 'trek', 'trekking', 'mountain', 'summit', 'walk'],
  adventure: ['adventure', 'zipline', 'zip line', 'canopy', 'rafting', 'bungee', 'extreme', 'atv', 'quad'],
  cultural: ['heritage', 'historic', 'museum', 'cultural', 'temple', 'church', 'archaeological', 'ruins', 'old town'],
  food_tour: ['food', 'culinary', 'cooking', 'cuisine', 'tasting', 'market', 'gastronomy'],
  spa_wellness: ['spa', 'wellness', 'massage', 'yoga', 'meditation', 'retreat', 'hot spring', 'thermal'],
  horseback: ['horse', 'horseback', 'riding', 'equestrian', 'ranch', 'stable'],
  boat: ['boat', 'sailing', 'cruise', 'catamaran', 'yacht', 'ferry', 'sunset', 'charter'],
  fishing: ['fishing', 'charter', 'angler', 'sport fish', 'deep sea'],
};

// FIX 2.8: Consistent relevance thresholds
const RELEVANCE_THRESHOLD_MIN = 35;  // Minimum to even consider
const RELEVANCE_THRESHOLD_GOOD = 50; // Preferred threshold for high-quality results

/**
 * Calculate relevance score for an experience based on activity type
 * Higher score = more relevant to what user is looking for
 */
function calculateRelevanceScore(place: any, activityType: string): number {
  let score = 50; // Base score
  const nameLower = (place.name || '').toLowerCase();
  const typesStr = (place.types || []).join(' ').toLowerCase();

  // Boost for relevant keywords in name
  const boostKeywords = RELEVANCE_BOOST_KEYWORDS[activityType] || [];
  for (const keyword of boostKeywords) {
    if (nameLower.includes(keyword)) {
      score += 15;
    }
    if (typesStr.includes(keyword)) {
      score += 10;
    }
  }

  // Boost for "tour" or "experience" in name (indicates actual tour operator)
  if (nameLower.includes('tour') || nameLower.includes('excursion') || nameLower.includes('adventure')) {
    score += 20;
  }

  // Boost for high ratings (quality indicator)
  if (place.rating >= 4.5) score += 15;
  else if (place.rating >= 4.0) score += 10;
  else if (place.rating >= 3.5) score += 5;
  else if (place.rating < 3.0) score -= 20;

  // Boost for many reviews (established business)
  if (place.user_ratings_total >= 1000) score += 15;
  else if (place.user_ratings_total >= 500) score += 10;
  else if (place.user_ratings_total >= 100) score += 5;
  else if (place.user_ratings_total < 10) score -= 10;

  // Penalize if types suggest retail/commercial
  const retailTypes = ['store', 'shop', 'shopping', 'supermarket', 'mall'];
  if (retailTypes.some(t => typesStr.includes(t))) {
    score -= 30;
  }

  // Penalize generic place types
  if (place.types?.includes('point_of_interest') && place.types?.length <= 2) {
    score -= 10; // Very generic, likely not a real tour
  }

  // Boost for tour-related place types
  const tourTypes = ['travel_agency', 'tourist_attraction', 'park', 'natural_feature', 'museum'];
  if (tourTypes.some(t => place.types?.includes(t))) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

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
        'wildlife sanctuary tour',
        'wildlife watching tour',
        'animal sanctuary visit',
        'wildlife reserve tour',
        'safari tour',
        'whale watching tour',
        'dolphin watching tour',
        'turtle nesting tour',
        'bird watching tour',
      ],
      nature: [
        'nature reserve tour',
        'national park tour',
        'rainforest tour',
        'botanical garden',
        'nature trail guided',
        'eco tour nature',
        'waterfall tour',
        'jungle tour',
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

    // FIX 2.7: Valid activity types for validation
    const VALID_ACTIVITY_TYPES = Object.keys(activitySearchTerms);

    for (const activityType of activityTypes) {
      // Warn for unknown activity types but still process with generic search
      if (!VALID_ACTIVITY_TYPES.includes(activityType)) {
        console.warn(`[Experiences API] Unknown activity type: ${activityType}, using generic search`);
      }

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

              const response = await fetchWithTimeout(
                `${GOOGLE_MAPS_BASE_URL}/place/textsearch/json?${params}`,
                {},
                GOOGLE_API_TIMEOUT
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

                    // Skip places with excluded types (like lodging/hotels, car rentals, pet stores)
                    const placeTypes: string[] = place.types || [];
                    const excludedTypes = EXCLUDED_PLACE_TYPES.filter(t => placeTypes.includes(t));
                    if (excludedTypes.length > 0) {
                      console.log(`[Experiences API] Skipping "${place.name}" - has excluded type: ${excludedTypes.join(', ')}`);
                      continue;
                    }

                    // Skip places with excluded name patterns (pet stores, vet clinics, etc.)
                    const placeName = place.name || '';
                    const matchedPattern = EXCLUDED_NAME_PATTERNS.find(pattern => pattern.test(placeName));
                    if (matchedPattern) {
                      console.log(`[Experiences API] Skipping "${placeName}" - matches excluded name pattern`);
                      continue;
                    }

                    const placeLat = place.geometry?.location?.lat;
                    const placeLng = place.geometry?.location?.lng;
                    const distance = placeLat && placeLng
                      ? calculateDistance(hotel.lat, hotel.lng, placeLat, placeLng)
                      : Infinity;

                    if (distance <= MAX_DISTANCE_METERS) {
                      // Calculate relevance score for this experience
                      const relevanceScore = calculateRelevanceScore(place, activityType);

                      // FIX 2.8: Skip low-relevance results using consistent threshold
                      if (relevanceScore < RELEVANCE_THRESHOLD_MIN) {
                        console.log(`[Experiences API] Skipping "${place.name}" - relevance ${relevanceScore} below minimum ${RELEVANCE_THRESHOLD_MIN}`);
                        continue;
                      }

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
                        relevanceScore, // Include for sorting
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

      console.log(`[Experiences API] Found ${allExperiences.length} ${activityType} experiences after filtering`);

      // Sort by relevance score (primary), then rating, then distance
      allExperiences.sort((a, b) => {
        // Primary: relevance score
        const relevanceDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
        if (Math.abs(relevanceDiff) > 10) return relevanceDiff;

        // Secondary: rating
        const ratingDiff = (b.googleRating || 0) - (a.googleRating || 0);
        if (Math.abs(ratingDiff) > 0.3) return ratingDiff;

        // Tertiary: distance
        return (a.distanceFromHotel || 999) - (b.distanceFromHotel || 999);
      });

      // FIX 2.8: Use consistent thresholds and add quality tier indicator
      const highQuality = allExperiences.filter(e => e.relevanceScore >= RELEVANCE_THRESHOLD_GOOD);
      const mediumQuality = allExperiences.filter(e =>
        e.relevanceScore >= RELEVANCE_THRESHOLD_MIN &&
        e.relevanceScore < RELEVANCE_THRESHOLD_GOOD
      );

      // Prefer high-quality, fill with medium if needed
      results[activityType] = [
        ...highQuality.slice(0, 6),
        ...mediumQuality.slice(0, Math.max(0, 8 - highQuality.length)),
      ].slice(0, 8);

      // Add quality tier indicator to results
      results[activityType] = results[activityType].map(exp => ({
        ...exp,
        qualityTier: exp.relevanceScore >= RELEVANCE_THRESHOLD_GOOD ? 'high' : 'medium',
      }));

      console.log(`[Experiences API] Returning ${results[activityType].length} quality results for ${activityType}`);
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
    nature: 'Nature',
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
