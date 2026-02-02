/**
 * Quick Plan Hotels API
 * Fetches and filters hotels for selected areas
 * Reuses existing hotel infrastructure with AUTO-INDEXING
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchHotelsWithPagination, searchHotelsByGeocode, geocodeLocation, GooglePlaceResult } from '@/lib/google-maps';
import { searchHotelRecommendations } from '@/lib/reddit';
import { HotelCandidate } from '@/types/quick-plan';

// Track indexing to prevent duplicates
const indexingInProgress = new Set<string>();
const indexingTimestamps = new Map<string, number>();
const INDEXING_COOLDOWN_MS = 60000; // 1 minute between indexing runs per area

// Minimum hotels before triggering indexing
const MIN_HOTELS_THRESHOLD = 5; // Only index if fewer than 5 hotels
const MAX_PAGES_PER_QUERY = 2; // Reduced for faster indexing

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const areaName = params.get('area');
  const destination = params.get('destination');
  const lat = params.get('lat') ? parseFloat(params.get('lat')!) : null;
  const lng = params.get('lng') ? parseFloat(params.get('lng')!) : null;
  const minRating = parseFloat(params.get('minRating') || '4.0');
  const budgetMin = parseInt(params.get('budgetMin') || '0');
  const budgetMax = parseInt(params.get('budgetMax') || '10000');
  const limit = parseInt(params.get('limit') || '10');

  if (!areaName && !destination) {
    return NextResponse.json(
      { error: 'Either area or destination parameter is required' },
      { status: 400 }
    );
  }

  const cacheKey = `${destination}:${areaName}`.toLowerCase();

  try {
    // Step 1: Query hotels from database
    let hotels = await prisma.hotel.findMany({
      where: {
        OR: [
          { region: { contains: areaName || '',  } },
          { city: { contains: areaName || '',  } },
          { country: { contains: destination || '',  } },
        ],
        googleRating: { gte: minRating },
      },
      orderBy: [
        { googleRating: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: limit * 3, // Fetch extra to filter
    });

    console.log(`Quick Plan Hotels: Found ${hotels.length} in DB for ${areaName || destination}`);

    // Step 2: Auto-index if low results and cooldown passed
    const lastIndexed = indexingTimestamps.get(cacheKey) || 0;
    const cooldownPassed = Date.now() - lastIndexed > INDEXING_COOLDOWN_MS;

    if (hotels.length < MIN_HOTELS_THRESHOLD && cooldownPassed && !indexingInProgress.has(cacheKey)) {
      indexingInProgress.add(cacheKey);
      indexingTimestamps.set(cacheKey, Date.now());

      console.log(`Quick Plan Hotels: Triggering auto-index for ${cacheKey}`);

      try {
        const indexedCount = await indexHotelsForArea(
          areaName || '',
          destination || '',
          lat,
          lng
        );
        console.log(`Quick Plan Hotels: Indexed ${indexedCount} new hotels`);

        // Re-query after indexing
        hotels = await prisma.hotel.findMany({
          where: {
            OR: [
              { region: { contains: areaName || '',  } },
              { city: { contains: areaName || '',  } },
              { country: { contains: destination || '',  } },
            ],
            googleRating: { gte: minRating },
          },
          orderBy: [
            { googleRating: 'desc' },
            { reviewCount: 'desc' },
          ],
          take: limit * 3,
        });

        console.log(`Quick Plan Hotels: After indexing, found ${hotels.length}`);
      } catch (indexError) {
        console.error('Auto-indexing failed:', indexError);
      } finally {
        indexingInProgress.delete(cacheKey);
      }
    }

    // Step 3: Fetch Reddit recommendations for enrichment
    let redditHotels: Map<string, { mentions: number; quote?: string }> = new Map();
    try {
      const redditRecs = await searchHotelRecommendations(destination || areaName || '', 300);
      for (const rec of redditRecs) {
        redditHotels.set(rec.hotelName.toLowerCase(), {
          mentions: rec.mentionCount,
          quote: rec.quotes[0],
        });
      }
    } catch (e) {
      // Reddit enrichment is optional
    }

    // Step 4: Convert to HotelCandidate format
    const candidates: HotelCandidate[] = hotels.map((hotel) => {
      const redditData = redditHotels.get(hotel.name.toLowerCase());

      // Estimate price from Google price_level (1-4 scale)
      // Level 1: ~$75-125, Level 2: ~$125-200, Level 3: ~$200-350, Level 4: ~$350+
      const estimatedPrice = hotel.priceLevel
        ? Math.round(hotel.priceLevel * 75 + 50 + (getStarRating(hotel.name) * 20))
        : null;

      return {
        id: hotel.id,
        placeId: hotel.placeId,
        name: hotel.name,
        address: hotel.address || '',
        city: hotel.city || '',
        lat: hotel.lat,
        lng: hotel.lng,
        distanceToCenter: 0,
        googleRating: hotel.googleRating || 0,
        reviewCount: hotel.reviewCount || 0,
        stars: getStarRating(hotel.name),
        pricePerNight: estimatedPrice,
        totalPrice: null,
        currency: 'USD',
        priceConfidence: hotel.priceLevel ? 'estimated' as const : 'unknown' as const,
        priceSource: 'estimate' as const,
        isAdultsOnly: false,
        isAllInclusive: hotel.name.toLowerCase().includes('all inclusive') ||
                        hotel.name.toLowerCase().includes('all-inclusive'),
        amenities: generateAmenities(hotel.name),
        imageUrl: hotel.photoReference
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${hotel.photoReference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
          : null,
        redditScore: redditData?.mentions || 0,
        overallScore: calculateOverallScore(hotel, redditData?.mentions || 0),
        evidence: redditData?.quote ? [{
          type: 'reddit_thread' as const,
          snippet: redditData.quote,
          subreddit: 'travel',
          score: redditData.mentions,
        }] : [],
        reasons: generateWhyRecommended(hotel),
        userStatus: 'default' as const,
      };
    });

    return NextResponse.json({
      hotels: candidates.slice(0, limit),
      totalCount: candidates.length,
      area: areaName,
      indexed: hotels.length,
      source: 'database',
      debug: {
        cacheKey,
        lastIndexed: indexingTimestamps.get(cacheKey),
        redditHotelsFound: redditHotels.size,
      },
    });
  } catch (error) {
    console.error('Hotels fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotels' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { areaIds, destination, preferences, coordinates } = body as {
      areaIds: string[];
      destination: string;
      preferences: {
        budgetMin?: number;
        budgetMax?: number;
        minRating?: number;
        vibes?: string[];
      };
      coordinates?: { lat: number; lng: number };
    };

    const results: Record<string, HotelCandidate[]> = {};
    console.log('[Hotels API] Received request for areas:', areaIds, 'destination:', destination);

    for (const areaId of areaIds) {
      // Convert area ID back to name
      const areaName = areaId.replace(/-/g, ' ');
      const cacheKey = `${destination}:${areaName}`.toLowerCase();
      console.log(`[Hotels API] Processing area: ${areaName} (id: ${areaId})`);

      // Query DB - FIRST try area-specific match, THEN fallback to country
      // This ensures each area gets different hotels
      let hotels = await prisma.hotel.findMany({
        where: {
          AND: [
            // Must be in the right country
            { country: { contains: destination } },
            // Must match the specific area (region OR city)
            {
              OR: [
                { region: { contains: areaName } },
                { city: { contains: areaName } },
              ],
            },
          ],
          googleRating: { gte: preferences.minRating || 4.0 },
        },
        orderBy: [
          { googleRating: 'desc' },
          { reviewCount: 'desc' },
        ],
        take: 15,
      });
      console.log(`[Hotels API] Area-specific query for ${areaName}: found ${hotels.length} hotels`);

      // If no area-specific results, fallback to country-wide search
      // but mark these as less ideal matches
      if (hotels.length < 3) {
        console.log(`[Hotels API] Few area-specific results for ${areaName}, trying country-wide fallback`);
        const fallbackHotels = await prisma.hotel.findMany({
          where: {
            country: { contains: destination },
            googleRating: { gte: preferences.minRating || 4.0 },
          },
          orderBy: [
            { googleRating: 'desc' },
            { reviewCount: 'desc' },
          ],
          take: 15,
        });

        // Merge results, prioritizing area-specific matches
        const seenIds = new Set(hotels.map(h => h.id));
        for (const h of fallbackHotels) {
          if (!seenIds.has(h.id) && hotels.length < 15) {
            hotels.push(h);
          }
        }
        console.log(`[Hotels API] After fallback for ${areaName}: ${hotels.length} hotels`);
      }

      // Auto-index if needed
      const lastIndexed = indexingTimestamps.get(cacheKey) || 0;
      const cooldownPassed = Date.now() - lastIndexed > INDEXING_COOLDOWN_MS;

      // Trigger indexing - AWAIT if no hotels found, otherwise run in background
      if (hotels.length < MIN_HOTELS_THRESHOLD && cooldownPassed && !indexingInProgress.has(cacheKey)) {
        indexingInProgress.add(cacheKey);
        indexingTimestamps.set(cacheKey, Date.now());

        const shouldAwait = hotels.length === 0; // Block if we have NO hotels
        console.log(`[Hotels API] Triggering ${shouldAwait ? 'SYNC' : 'background'} indexing for ${areaName}`);

        const indexPromise = indexHotelsForArea(
          areaName,
          destination,
          coordinates?.lat || null,
          coordinates?.lng || null
        ).then(async (indexedCount) => {
          console.log(`[Hotels API] Indexing complete for ${areaName}: ${indexedCount} hotels`);

          // If we awaited, re-query the database
          if (shouldAwait && indexedCount > 0) {
            const newHotels = await prisma.hotel.findMany({
              where: {
                AND: [
                  { country: { contains: destination } },
                  {
                    OR: [
                      { region: { contains: areaName } },
                      { city: { contains: areaName } },
                    ],
                  },
                ],
                googleRating: { gte: preferences.minRating || 4.0 },
              },
              orderBy: [
                { googleRating: 'desc' },
                { reviewCount: 'desc' },
              ],
              take: 15,
            });
            return newHotels;
          }
          return null;
        }).catch((e) => {
          console.error(`[Hotels API] Indexing failed for ${areaName}:`, e);
          return null;
        }).finally(() => {
          indexingInProgress.delete(cacheKey);
        });

        // If we have NO hotels, wait for indexing to complete
        if (shouldAwait) {
          const newHotels = await indexPromise;
          if (newHotels && newHotels.length > 0) {
            hotels = newHotels;
            console.log(`[Hotels API] After sync indexing for ${areaName}: ${hotels.length} hotels`);
          }
        }
      }

      results[areaId] = hotels.map((hotel) => {
        // Estimate price from Google price_level (1-4 scale)
        const estimatedPrice = hotel.priceLevel
          ? Math.round(hotel.priceLevel * 75 + 50 + (getStarRating(hotel.name) * 20))
          : null;

        return {
          id: hotel.id,
          placeId: hotel.placeId,
          name: hotel.name,
          address: hotel.address || '',
          city: hotel.city || '',
          lat: hotel.lat,
          lng: hotel.lng,
          distanceToCenter: 0,
          googleRating: hotel.googleRating || 0,
          reviewCount: hotel.reviewCount || 0,
          stars: getStarRating(hotel.name),
          pricePerNight: estimatedPrice,
          totalPrice: null,
          currency: 'USD',
          priceConfidence: hotel.priceLevel ? 'estimated' as const : 'unknown' as const,
          priceSource: 'estimate' as const,
          isAdultsOnly: false,
          isAllInclusive: hotel.name.toLowerCase().includes('all inclusive'),
          amenities: generateAmenities(hotel.name),
          imageUrl: hotel.photoReference
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${hotel.photoReference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
            : null,
          redditScore: 0,
          overallScore: calculateOverallScore(hotel, 0),
          evidence: [],
          reasons: generateWhyRecommended(hotel),
          userStatus: 'default' as const,
        };
      });
    }

    return NextResponse.json({
      hotelsByArea: results,
      totalCount: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
    });
  } catch (error) {
    console.error('Batch hotels fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotels' },
      { status: 500 }
    );
  }
}

// ============================================================================
// AUTO-INDEXING FUNCTION
// ============================================================================

async function indexHotelsForArea(
  area: string,
  destination: string,
  lat: number | null,
  lng: number | null
): Promise<number> {
  const allResults: GooglePlaceResult[] = [];
  const seenPlaceIds = new Set<string>();

  // If coordinates are missing or invalid (0,0), geocode the area name
  let searchLat = lat;
  let searchLng = lng;

  if (!searchLat || !searchLng || (searchLat === 0 && searchLng === 0)) {
    console.log(`[Hotels Indexer] No valid coordinates, geocoding "${area}, ${destination}"`);
    const geocoded = await geocodeLocation(`${area}, ${destination}`);
    if (geocoded) {
      searchLat = geocoded.lat;
      searchLng = geocoded.lng;
      console.log(`[Hotels Indexer] Geocoded to (${searchLat}, ${searchLng})`);
    }
  }

  // Strategy 1: Geocode search if coordinates available
  if (searchLat && searchLng) {
    try {
      console.log(`[Hotels Indexer] Searching hotels near (${searchLat}, ${searchLng})`);
      const geocodeResults = await searchHotelsByGeocode(searchLat, searchLng, 30000, 60);
      console.log(`[Hotels Indexer] Found ${geocodeResults.length} hotels via geocode search`);
      for (const place of geocodeResults) {
        if (place.place_id && !seenPlaceIds.has(place.place_id)) {
          seenPlaceIds.add(place.place_id);
          allResults.push(place);
        }
      }
    } catch (e) {
      console.error('Geocode search failed:', e);
    }
  }

  // Strategy 2: Text searches
  const searchLocation = area || destination;
  const queries = [
    `hotels ${searchLocation}`,
    `resorts ${searchLocation}`,
    `luxury hotels ${searchLocation}`,
    `boutique hotels ${searchLocation}`,
  ];

  for (const query of queries.slice(0, MAX_PAGES_PER_QUERY)) {
    try {
      const results = await searchHotelsWithPagination(query, 60);
      for (const place of results) {
        if (place.place_id && !seenPlaceIds.has(place.place_id)) {
          seenPlaceIds.add(place.place_id);
          allResults.push(place);
        }
      }
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e) {
      console.error(`Search failed for "${query}":`, e);
    }
  }

  // Upsert to database
  let indexedCount = 0;
  for (const place of allResults) {
    try {
      await prisma.hotel.upsert({
        where: { placeId: place.place_id },
        create: {
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address || place.vicinity || null,
          city: area || destination,
          region: area || destination,
          country: destination,
          countryCode: 'XX',
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          googleRating: place.rating || null,
          reviewCount: place.user_ratings_total || null,
          priceLevel: place.price_level || null,
          photoReference: place.photos?.[0]?.photo_reference || null,
        },
        update: {
          googleRating: place.rating || null,
          reviewCount: place.user_ratings_total || null,
          indexedAt: new Date(),
        },
      });
      indexedCount++;
    } catch (e) {
      // Skip duplicates or errors
    }
  }

  return indexedCount;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStarRating(name: string): number {
  const nameLower = name.toLowerCase();

  const fiveStars = ['aman', 'rosewood', 'four seasons', 'mandarin oriental', 'ritz', 'st regis', 'park hyatt'];
  if (fiveStars.some(brand => nameLower.includes(brand))) return 5;

  const fourStars = ['marriott', 'hilton', 'hyatt', 'sheraton', 'westin', 'conrad', 'intercontinental'];
  if (fourStars.some(brand => nameLower.includes(brand))) return 4;

  if (nameLower.includes('resort')) return 4;
  if (nameLower.includes('boutique')) return 4;

  return 3;
}

function generateAmenities(hotelName: string): string[] {
  const nameLower = hotelName.toLowerCase();
  const amenities: string[] = ['wifi', 'air_conditioning'];

  if (nameLower.includes('resort') || getStarRating(hotelName) >= 4) {
    amenities.push('pool', 'spa', 'gym', 'restaurant');
  }
  if (nameLower.includes('beach') || nameLower.includes('resort')) {
    amenities.push('beach_access');
  }

  return amenities;
}

function generateWhyRecommended(hotel: any): string[] {
  const reasons: string[] = [];

  if (hotel.googleRating >= 4.5) {
    reasons.push(`Highly rated (${hotel.googleRating}/5)`);
  } else if (hotel.googleRating >= 4.0) {
    reasons.push(`Well-reviewed (${hotel.googleRating}/5)`);
  }

  if (hotel.reviewCount > 1000) {
    reasons.push('Very popular choice');
  } else if (hotel.reviewCount > 500) {
    reasons.push('Popular with travelers');
  }

  if (hotel.priceLevel === 4) {
    reasons.push('Luxury property');
  } else if (hotel.priceLevel === 3) {
    reasons.push('Upscale property');
  }

  return reasons;
}

function calculateOverallScore(hotel: any, redditMentions: number): number {
  let score = 0;

  // Rating score (0-50)
  if (hotel.googleRating) {
    score += (hotel.googleRating / 5) * 50;
  }

  // Review count score (0-30)
  if (hotel.reviewCount) {
    score += Math.min(hotel.reviewCount / 100, 30);
  }

  // Reddit mentions (0-20)
  score += Math.min(redditMentions * 5, 20);

  return Math.round(score);
}
