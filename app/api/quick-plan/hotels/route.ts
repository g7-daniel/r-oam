/**
 * Quick Plan Hotels API
 * Fetches and filters hotels for selected areas
 * Reuses existing hotel infrastructure with AUTO-INDEXING
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findHotelsCI } from '@/lib/prisma-ci-search';
import { searchHotelsWithPagination, searchHotelsByGeocode, searchLuxuryHotels, geocodeLocation, GooglePlaceResult } from '@/lib/google-maps';
import { searchHotelRecommendations } from '@/lib/reddit';
import { getBatchPricingByCity, mapCityToMakcorps, getHotelsByCity, MakcorpsHotel } from '@/lib/makcorps';
import { HotelCandidate } from '@/types/quick-plan';
import { BoundedSet, BoundedMap } from '@/lib/bounded-cache';
import {
  hotelsGetSchema,
  hotelsPostSchema,
  validateRequestBody,
  createValidationErrorResponse,
} from '@/lib/api-validation';

// Track indexing to prevent duplicates (bounded to prevent memory leaks)
const indexingInProgress = new BoundedSet<string>(100, 10); // max 100 items, 10 min TTL
const indexingTimestamps = new BoundedMap<string, number>(200, 60); // max 200 items, 1 hour TTL
const INDEXING_COOLDOWN_MS = 60000; // 1 minute between indexing runs per area

// Minimum hotels before triggering indexing
const MIN_HOTELS_THRESHOLD = 5; // Only index if fewer than 5 hotels
const MAX_PAGES_PER_QUERY = 2; // Reduced for faster indexing

export async function GET(request: NextRequest) {
  // Validate query parameters using Zod schema
  const params = request.nextUrl.searchParams;
  const rawParams = {
    area: params.get('area') || undefined,
    destination: params.get('destination') || undefined,
    lat: params.get('lat') ? parseFloat(params.get('lat')!) : undefined,
    lng: params.get('lng') ? parseFloat(params.get('lng')!) : undefined,
    minRating: params.get('minRating') ? parseFloat(params.get('minRating')!) : undefined,
    limit: params.get('limit') ? parseInt(params.get('limit')!) : undefined,
    budgetMin: params.get('budgetMin') ? parseInt(params.get('budgetMin')!) : undefined,
    budgetMax: params.get('budgetMax') ? parseInt(params.get('budgetMax')!) : undefined,
  };

  const validation = hotelsGetSchema.safeParse(rawParams);
  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }

  const { area: areaName, destination, lat, lng, minRating, limit, budgetMax = 10000 } = validation.data;

  const cacheKey = `${destination}:${areaName}`.toLowerCase();

  // Determine price level filter based on budget
  const priceLevelRange = getBudgetPriceLevel(budgetMax);

  try {
    // Step 1: Query hotels from database with budget-appropriate price level filtering
    // Uses case-insensitive matching for SQLite compatibility
    let hotels = await findHotelsCI({
      andContains: [
        { field: 'country', value: destination || '' },
      ],
      orGroups: [{
        textConditions: [
          { field: 'region', value: areaName || '' },
          { field: 'city', value: areaName || '' },
        ],
      }],
      minRating,
      // Apply price level filter if not luxury (luxury hotels often have missing priceLevel)
      ...(priceLevelRange && !priceLevelRange.isLuxury ? {
        priceLevel: { min: priceLevelRange.min, max: priceLevelRange.max },
      } : {}),
      orderBy: [
        { field: 'googleRating', direction: 'DESC' },
        { field: 'reviewCount', direction: 'DESC' },
      ],
      take: limit * 3, // Fetch extra to filter
    });

    // Step 2: Auto-index if low results and cooldown passed
    const lastIndexed = indexingTimestamps.get(cacheKey) || 0;
    const cooldownPassed = Date.now() - lastIndexed > INDEXING_COOLDOWN_MS;

    if (hotels.length < MIN_HOTELS_THRESHOLD && cooldownPassed && !indexingInProgress.has(cacheKey)) {
      indexingInProgress.add(cacheKey);
      indexingTimestamps.set(cacheKey, Date.now());

      // Fire-and-forget - DO NOT await, return current results immediately
      indexHotelsForArea(
        areaName || '',
        destination || '',
        lat ?? null,
        lng ?? null
      ).then((indexedCount) => {
      }).catch((indexError) => {
        console.error('Quick Plan Hotels GET: Background indexing failed', indexError);
      }).finally(() => {
        indexingInProgress.delete(cacheKey);
      });
      // NOTE: We return whatever we have now - indexing happens in background
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

      // Estimate price from Google price_level (1-4 scale) or star rating
      // Level 1: ~$75-125, Level 2: ~$125-200, Level 3: ~$200-350, Level 4: ~$350+
      const starRating = getStarRating(hotel.name);
      const estimatedPrice = hotel.priceLevel
        ? Math.round(hotel.priceLevel * 75 + 50 + (starRating * 20))
        : Math.round(starRating * 50 + 80); // Fallback: estimate from star rating

      return {
        id: hotel.id,
        placeId: hotel.placeId,
        name: hotel.name,
        address: hotel.address || '',
        googleMapsUrl: hotel.placeId ? `https://www.google.com/maps/place/?q=place_id:${hotel.placeId}` : undefined,
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
        priceConfidence: hotel.priceLevel ? 'estimated' as const : 'rough' as const,
        priceSource: hotel.priceLevel ? 'google' as const : 'estimate' as const,
        isAdultsOnly: false,
        isAllInclusive: hotel.name.toLowerCase().includes('all inclusive') ||
                        hotel.name.toLowerCase().includes('all-inclusive'),
        amenities: generateAmenities(hotel.name),
        imageUrl: hotel.photoReference
          ? `/api/photo-proxy?ref=${encodeURIComponent(hotel.photoReference)}&maxwidth=400`
          : '/images/hotel-placeholder.svg',
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

    const response = NextResponse.json({
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

    // Add cache headers - hotel data can be cached for 3 minutes
    // with stale-while-revalidate for 5 minutes (prices may change)
    response.headers.set('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=300');
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Hotels GET fetch error:', errorMessage, error);
    return NextResponse.json(
      {
        error: 'FETCH_ERROR',
        message: 'We had trouble finding hotels. Please try again.',
        hotels: [],
        totalCount: 0,
      },
      { status: 500 }
    );
  }
}

// Large hotel chains that typically have good accessibility features
const ACCESSIBLE_HOTEL_CHAINS = [
  'marriott', 'hilton', 'hyatt', 'sheraton', 'westin', 'intercontinental',
  'holiday inn', 'crowne plaza', 'doubletree', 'hampton inn', 'courtyard',
  'fairfield', 'residence inn', 'embassy suites', 'radisson', 'wyndham',
  'best western', 'la quinta', 'comfort inn', 'quality inn', 'clarion',
  'four seasons', 'ritz-carlton', 'st. regis', 'w hotel', 'jw marriott',
  'conrad', 'waldorf', 'park hyatt', 'grand hyatt', 'andaz',
];

// Hotel types that typically have accessibility issues
const LESS_ACCESSIBLE_TYPES = [
  'hostel', 'b&b', 'bed and breakfast', 'boutique', 'historic',
  'heritage', 'lodge', 'cabin', 'treehouse', 'bungalow', 'cottage',
];

/**
 * Estimate accessibility features based on hotel name/type
 * Returns an object with accessibility likelihood scores
 */
function estimateAccessibility(hotelName: string): {
  likelyAccessible: boolean;
  accessibilityScore: number; // 0-100
  features: string[];
  warnings: string[];
} {
  const nameLower = hotelName.toLowerCase();
  let score = 50; // Default middle score
  const features: string[] = [];
  const warnings: string[] = [];

  // Check if it's a major chain (usually accessible)
  const isChainHotel = ACCESSIBLE_HOTEL_CHAINS.some(chain => nameLower.includes(chain));
  if (isChainHotel) {
    score += 30;
    features.push('Major hotel chain (typically ADA compliant)');
  }

  // Check for potentially less accessible types
  const isLessAccessibleType = LESS_ACCESSIBLE_TYPES.some(type => nameLower.includes(type));
  if (isLessAccessibleType) {
    score -= 30;
    warnings.push('Historic/boutique property - confirm accessibility');
  }

  // "Resort" typically has good accessibility
  if (nameLower.includes('resort')) {
    score += 15;
    features.push('Resort (usually has accessible facilities)');
  }

  // "Inn" might be smaller/older
  if (nameLower.includes('inn') && !isChainHotel) {
    score -= 10;
    warnings.push('Smaller property - verify accessibility');
  }

  // Luxury hotels typically have excellent accessibility
  const isLuxury = nameLower.includes('palace') ||
    nameLower.includes('grand') ||
    nameLower.includes('royal') ||
    ACCESSIBLE_HOTEL_CHAINS.slice(-8).some(chain => nameLower.includes(chain)); // Last 8 are luxury chains
  if (isLuxury) {
    score += 20;
    features.push('Luxury property (typically excellent accessibility)');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    likelyAccessible: score >= 60,
    accessibilityScore: score,
    features,
    warnings,
  };
}

/**
 * Check if a hotel should be filtered out based on accessibility needs
 */
function shouldFilterForAccessibility(
  hotel: any,
  accessibilityNeeds?: {
    wheelchairAccessible?: boolean;
    groundFloorRequired?: boolean;
    elevatorRequired?: boolean;
    noStairs?: boolean;
  }
): boolean {
  if (!accessibilityNeeds) return false;

  const hasStrictNeeds = accessibilityNeeds.wheelchairAccessible ||
    accessibilityNeeds.elevatorRequired ||
    accessibilityNeeds.noStairs;

  if (!hasStrictNeeds) return false;

  // Estimate accessibility
  const accessibility = estimateAccessibility(hotel.name);

  // For strict needs, filter out hotels with low accessibility scores
  if (hasStrictNeeds && accessibility.accessibilityScore < 40) {
    return true; // Filter out
  }

  return false;
}

// Map budget to Google price_level (1-4 scale)
// Aligned with BudgetStep.tsx presets:
//   Budget-friendly: $100-200, Mid-range: $200-400, Upscale: $400-700, Luxury: $700+
// Note: Google price_level is often missing or inaccurate for luxury hotels
// So for high budgets, we use broader filtering and rely on luxury brand detection
// FIX 2.2: Add backpacker budget tier with proper categorization
function getBudgetPriceLevel(budgetMax: number): { min: number; max: number; isLuxury: boolean; isBackpacker: boolean } | null {
  if (budgetMax <= 50) return { min: 1, max: 1, isLuxury: false, isBackpacker: true };   // Hostel/backpacker
  if (budgetMax <= 100) return { min: 1, max: 2, isLuxury: false, isBackpacker: true };  // Budget/backpacker
  if (budgetMax <= 200) return { min: 1, max: 2, isLuxury: false, isBackpacker: false }; // Budget-friendly
  if (budgetMax <= 400) return { min: 2, max: 3, isLuxury: false, isBackpacker: false }; // Mid-range
  if (budgetMax <= 700) return { min: 3, max: 4, isLuxury: false, isBackpacker: false }; // Upscale
  if (budgetMax <= 1500) return { min: 3, max: 4, isLuxury: true, isBackpacker: false }; // Luxury
  // Ultra-luxury ($1500+): don't filter by price_level since many luxury hotels have null/missing price_level
  return { min: 4, max: 4, isLuxury: true, isBackpacker: false };  // Ultra-luxury
}

// Pet-friendly hotel indicators
const PET_FRIENDLY_CHAINS = [
  'kimpton', 'la quinta', 'motel 6', 'red roof', 'best western',
  'drury', 'home2 suites', 'extended stay', 'candlewood', 'staybridge',
  'element', 'aloft', 'residence inn', 'homewood suites', 'hyatt place',
];

const HOSTEL_KEYWORDS = [
  'hostel', 'backpackers', 'dorm', 'youth hostel', 'pod', 'capsule',
];

const ECO_KEYWORDS = [
  'eco', 'sustainable', 'green', 'organic', 'ecolodge', 'eco-lodge',
  'nature lodge', 'wildlife lodge', 'conservation', 'solar',
];

export async function POST(request: NextRequest) {
  try {
    // Validate request body using Zod schema
    const validationResult = await validateRequestBody(request, hotelsPostSchema);
    if (!validationResult.success) {
      return validationResult.error;
    }

    const {
      areaIds,
      destination,
      preferences,
      coordinates,
      checkIn,
      checkOut,
      adults,
      children,
      estimatedRooms,
      accessibilityNeeds,
      accommodationType,
      travelingWithPets,
      sustainabilityPreference,
    } = validationResult.data;

    const results: Record<string, HotelCandidate[]> = {};

    // Calculate party size and room needs
    const partySize = (adults || 2) + (children || 0);
    const isLargeGroup = partySize > 4;
    const roomsNeeded = estimatedRooms || (isLargeGroup ? Math.ceil(partySize / 2) : 1);

    // Fetch Reddit hotel recommendations for enrichment
    let redditHotels = new Map<string, { mentions: number; quote?: string; sentiment?: number }>();
    try {
      const redditRecs = await searchHotelRecommendations(
        destination,
        preferences.budgetMax || 200
      );
      for (const rec of redditRecs) {
        redditHotels.set(rec.hotelName.toLowerCase(), {
          mentions: rec.mentionCount,
          quote: rec.quotes[0],
        });
      }
    } catch (e) {
      console.error('[Hotels API] Reddit search failed:', e);
    }

    const priceLevelRange = preferences.budgetMax
      ? getBudgetPriceLevel(preferences.budgetMax)
      : null;

    // =================================================================
    // PARALLELIZED: Process all areas concurrently using Promise.all
    // =================================================================

    const areaResults = await Promise.all(areaIds.map(async (areaId) => {
      // Convert area ID back to name
      const areaName = areaId.replace(/-/g, ' ');
      const cacheKey = `${destination}:${areaName}`.toLowerCase();

      // Build price level filter if budget is set
      const priceLevelFilter = priceLevelRange
        ? { priceLevel: { gte: priceLevelRange.min, lte: priceLevelRange.max } }
        : {};

      let hotels: any[] = [];
      let dbAvailable = true;
      let usedMakcorps = false;

      // =================================================================
      // PHASE 1 FIX: Use Makcorps as PRIMARY source (instant, with prices)
      // =================================================================
      if (checkIn && checkOut) {
        try {
          // Map the area/destination to Makcorps city ID
          const cityId = await mapCityToMakcorps(areaName, destination);

          if (cityId) {

            const makcorpsResult = await getHotelsByCity(
              cityId,
              checkIn,
              checkOut,
              adults || 2,
              roomsNeeded,
              0 // first page
            );

            if (makcorpsResult.hotels.length > 0) {

              // Convert Makcorps hotels to our format
              hotels = makcorpsResult.hotels.map((h: MakcorpsHotel) => ({
                id: `makcorps_${h.hotelId}`,
                placeId: `makcorps_${h.hotelId}`,
                name: h.name,
                address: null,
                city: areaName,
                region: areaName,
                country: destination,
                lat: h.latitude,
                lng: h.longitude,
                googleRating: h.rating || 4.0,
                reviewCount: h.reviewCount || 0,
                priceLevel: h.cheapestPrice < 100 ? 1 : h.cheapestPrice < 200 ? 2 : h.cheapestPrice < 400 ? 3 : 4,
                // Real pricing from Makcorps
                makcorpsPrice: h.cheapestPrice,
                makcorpsVendor: h.cheapestVendor,
                makcorpsPrices: h.prices,
                photoReference: null,
              }));

              // Apply budget filter to Makcorps results
              if (preferences.budgetMax && preferences.budgetMax < 10000) {
                hotels = hotels.filter((h: any) => h.makcorpsPrice <= preferences.budgetMax!);
              }
              if (preferences.budgetMin && preferences.budgetMin > 0) {
                hotels = hotels.filter((h: any) => h.makcorpsPrice >= preferences.budgetMin!);
              }

              // Apply rating filter
              const minRating = preferences.minRating || 4.0;
              hotels = hotels.filter((h: any) => (h.googleRating || 0) >= minRating);

              // Sort by rating
              hotels.sort((a: any, b: any) => (b.googleRating || 0) - (a.googleRating || 0));

              usedMakcorps = true;
            }
          }
        } catch (makcorpsError) {
          console.error(`[Hotels API] Makcorps failed for ${areaName}, falling back to DB:`, makcorpsError);
        }
      }

      // =================================================================
      // FALLBACK: Only use database if Makcorps didn't return results
      // =================================================================
      if (!usedMakcorps || hotels.length < 3) {

        try {
          // Query DB - FIRST try area-specific match, THEN fallback to country
          // Uses case-insensitive matching for SQLite compatibility
          const dbHotels = await findHotelsCI({
            andContains: [
              { field: 'country', value: destination },
            ],
            orGroups: [{
              textConditions: [
                { field: 'region', value: areaName },
                { field: 'city', value: areaName },
              ],
            }],
            minRating: preferences.minRating || 4.0,
            ...(priceLevelRange ? {
              priceLevel: { min: priceLevelRange.min, max: priceLevelRange.max },
            } : {}),
            orderBy: [
              { field: 'googleRating', direction: 'DESC' },
              { field: 'reviewCount', direction: 'DESC' },
            ],
            take: 15,
          });

          // Merge DB hotels with any Makcorps results (avoid duplicates by name)
          const existingNames = new Set(hotels.map((h: any) => h.name.toLowerCase()));
          for (const dbHotel of dbHotels) {
            if (!existingNames.has(dbHotel.name.toLowerCase())) {
              hotels.push(dbHotel);
            }
          }
        } catch (dbError: any) {
          dbAvailable = false;
        }
      }

      // Determine if we need luxury or backpacker search
      const isLuxuryBudget = priceLevelRange?.isLuxury || false;
      const isBackpackerBudget = priceLevelRange?.isBackpacker || false;

      // For LUXURY budgets, ALWAYS do fresh Google search to find premium properties
      // For BACKPACKER budgets, search for hostels and budget accommodations
      // Don't rely on database which may have mid-range hotels from previous searches
      // For non-luxury, use geocode search if few DB results
      const needsGoogleSearch = isLuxuryBudget || isBackpackerBudget || hotels.length < 3;

      if (needsGoogleSearch) {

        // Get coordinates for the SPECIFIC AREA
        const areaCoords = await geocodeLocation(`${areaName}, ${destination}`);

        if (areaCoords) {

          let nearbyHotels: GooglePlaceResult[];

          if (isLuxuryBudget) {
            nearbyHotels = await searchLuxuryHotels(
              areaCoords.lat,
              areaCoords.lng,
              areaName,
              destination,
              20
            );
          } else if (isBackpackerBudget) {
            // FIX 2.3: Search for hostels and budget accommodations for backpacker budgets

            // Search for hostels and budget accommodations with text search
            nearbyHotels = [];
            const hostelQueries = [
              `hostel ${areaName} ${destination}`,
              `budget hotel ${areaName}`,
              `guesthouse ${areaName}`,
              `backpacker accommodation ${areaName}`,
            ];

            const seenIds = new Set<string>();
            for (const query of hostelQueries) {
              try {
                const results = await searchHotelsWithPagination(query, 10);
                for (const result of results) {
                  if (result.place_id && !seenIds.has(result.place_id) &&
                      (!result.price_level || result.price_level <= 2)) {
                    seenIds.add(result.place_id);
                    nearbyHotels.push(result);
                  }
                }
              } catch (e) {
              }
            }
          } else {
            // Search within 15km radius (50km was too large for small towns,
            // pulling in hotels from neighboring cities)
            nearbyHotels = await searchHotelsByGeocode(
              areaCoords.lat,
              areaCoords.lng,
              15000,
              20
            );
          }

          // Convert Google results to hotel format (skip DB indexing if unavailable)
          if (!dbAvailable || nearbyHotels.length > 0) {
            // Filter out hotels whose address doesn't contain the destination country
            // This prevents geocode fallback from returning hotels in wrong countries
            const destinationLower = destination.toLowerCase();
            const countryFiltered = nearbyHotels.filter(h => {
              const addr = (h.formatted_address || h.vicinity || '').toLowerCase();
              // Accept if address contains the destination name (country or region)
              return addr.includes(destinationLower) ||
                // Also accept if no address available (benefit of the doubt)
                (!h.formatted_address && !h.vicinity);
            });
            // Use filtered results if any remain, otherwise fall back to original
            const validNearby = countryFiltered.length > 0 ? countryFiltered : nearbyHotels;

            // Use Google results directly as hotel candidates
            const googleHotels = validNearby
              .filter(h => (h.rating || 0) >= (preferences.minRating || 4.0))
              .slice(0, 15)
              .map(hotel => ({
                id: hotel.place_id,
                placeId: hotel.place_id,
                name: hotel.name,
                address: hotel.formatted_address || hotel.vicinity || null,
                city: areaName,
                region: areaName,
                country: destination,
                lat: hotel.geometry.location.lat,
                lng: hotel.geometry.location.lng,
                googleRating: hotel.rating || null,
                reviewCount: hotel.user_ratings_total || null,
                priceLevel: hotel.price_level || null,
                photoReference: hotel.photos?.[0]?.photo_reference || null,
              }));

            // If DB available, try to batch index for future (avoids N+1 queries)
            if (dbAvailable) {
              const indexableHotels = nearbyHotels.filter(h => h.place_id);
              const INDEX_BATCH_SIZE = 50;
              for (let bi = 0; bi < indexableHotels.length; bi += INDEX_BATCH_SIZE) {
                const indexBatch = indexableHotels.slice(bi, bi + INDEX_BATCH_SIZE);
                try {
                  await prisma.$transaction(
                    indexBatch.map(hotel => prisma.hotel.upsert({
                      where: { placeId: hotel.place_id! },
                      create: {
                        placeId: hotel.place_id!,
                        name: hotel.name,
                        address: hotel.formatted_address || hotel.vicinity || null,
                        city: areaName,
                        region: areaName,
                        country: destination,
                        countryCode: 'XX',
                        lat: hotel.geometry.location.lat,
                        lng: hotel.geometry.location.lng,
                        googleRating: hotel.rating || null,
                        reviewCount: hotel.user_ratings_total || null,
                        priceLevel: hotel.price_level || null,
                        photoReference: hotel.photos?.[0]?.photo_reference || null,
                      },
                      update: {
                        googleRating: hotel.rating || null,
                        reviewCount: hotel.user_ratings_total || null,
                        indexedAt: new Date(),
                      },
                    }))
                  );
                } catch (e) {
                  // If batch fails, fall back to individual upserts
                  for (const hotel of indexBatch) {
                    try {
                      await prisma.hotel.upsert({
                        where: { placeId: hotel.place_id! },
                        create: {
                          placeId: hotel.place_id!,
                          name: hotel.name,
                          address: hotel.formatted_address || hotel.vicinity || null,
                          city: areaName,
                          region: areaName,
                          country: destination,
                          countryCode: 'XX',
                          lat: hotel.geometry.location.lat,
                          lng: hotel.geometry.location.lng,
                          googleRating: hotel.rating || null,
                          reviewCount: hotel.user_ratings_total || null,
                          priceLevel: hotel.price_level || null,
                          photoReference: hotel.photos?.[0]?.photo_reference || null,
                        },
                        update: {
                          googleRating: hotel.rating || null,
                          reviewCount: hotel.user_ratings_total || null,
                          indexedAt: new Date(),
                        },
                      });
                    } catch (innerE) {
                      // Skip duplicates
                    }
                  }
                }
              }

              // For LUXURY budgets, use Google results directly (they're specifically luxury hotels)
              // For non-luxury, re-query DB which may have more results
              if (isLuxuryBudget && googleHotels.length > 0) {
                hotels = googleHotels;
              } else {
                // Re-query with new data including lat/lng radius
                // Uses case-insensitive matching for SQLite compatibility
                hotels = await findHotelsCI({
                  andContains: [
                    { field: 'country', value: destination },
                  ],
                  orGroups: [{
                    textConditions: [
                      { field: 'region', value: areaName },
                      { field: 'city', value: areaName },
                    ],
                    latLngBox: {
                      latMin: areaCoords.lat - 0.13,
                      latMax: areaCoords.lat + 0.13,
                      lngMin: areaCoords.lng - 0.13,
                      lngMax: areaCoords.lng + 0.13,
                    },
                  }],
                  minRating: preferences.minRating || 4.0,
                  orderBy: [
                    { field: 'googleRating', direction: 'DESC' },
                    { field: 'reviewCount', direction: 'DESC' },
                  ],
                  take: 15,
                });
              }
            } else {
              // Use Google results directly
              hotels = googleHotels;
            }

          }
        }
      }

      // =================================================================
      // PHASE 1 FIX: Background indexing ONLY - NEVER block the response
      // =================================================================
      const lastIndexed = indexingTimestamps.get(cacheKey) || 0;
      const cooldownPassed = Date.now() - lastIndexed > INDEXING_COOLDOWN_MS;

      // Trigger BACKGROUND indexing for future requests - NEVER await
      if (hotels.length < MIN_HOTELS_THRESHOLD && cooldownPassed && !indexingInProgress.has(cacheKey) && dbAvailable) {
        indexingInProgress.add(cacheKey);
        indexingTimestamps.set(cacheKey, Date.now());

        // Fire-and-forget - DO NOT await this promise
        indexHotelsForArea(
          areaName,
          destination,
          coordinates?.lat || null,
          coordinates?.lng || null
        ).then((indexedCount) => {
        }).catch((e) => {
          console.error(`[Hotels API] Background indexing failed for ${areaName}:`, e);
        }).finally(() => {
          indexingInProgress.delete(cacheKey);
        });
        // NOTE: We intentionally do NOT await - response returns immediately
      }

      // Filter hotels based on various preferences
      let filteredHotels = hotels;

      // Accommodation type filter
      if (accommodationType && accommodationType !== 'hotel') {
        const beforeCount = filteredHotels.length;
        filteredHotels = filteredHotels.filter(hotel => {
          const nameLower = hotel.name.toLowerCase();

          switch (accommodationType) {
            case 'hostel':
              return HOSTEL_KEYWORDS.some(kw => nameLower.includes(kw));
            case 'resort':
              return nameLower.includes('resort') || nameLower.includes('all inclusive') || nameLower.includes('spa');
            case 'eco_lodge':
              return ECO_KEYWORDS.some(kw => nameLower.includes(kw));
            case 'boutique':
              return nameLower.includes('boutique') || nameLower.includes('design') || nameLower.includes('collection');
            case 'villa':
              return nameLower.includes('villa') || nameLower.includes('estate') || nameLower.includes('manor');
            case 'vacation_rental':
              // Usually not in hotel databases - show results anyway but note
              return true;
            default:
              return true;
          }
        });

        // If we filtered too aggressively, add back some hotels with notes
        if (filteredHotels.length < 3 && beforeCount > 3) {
          const additionalHotels = hotels
            .filter(h => !filteredHotels.includes(h))
            .slice(0, Math.max(5 - filteredHotels.length, 3));
          filteredHotels = [...filteredHotels, ...additionalHotels];
        }

      }

      // Pet-friendly filter - prioritize but don't exclude
      if (travelingWithPets?.hasPet) {
        const petFriendlyHotels = filteredHotels.filter(hotel => {
          const nameLower = hotel.name.toLowerCase();
          return PET_FRIENDLY_CHAINS.some(chain => nameLower.includes(chain)) ||
                 nameLower.includes('pet') ||
                 nameLower.includes('dog');
        });

        // Put pet-friendly hotels first, then others (with warning)
        const otherHotels = filteredHotels.filter(h => !petFriendlyHotels.includes(h));
        filteredHotels = [...petFriendlyHotels, ...otherHotels];
      }

      // Sustainability preference filter - prioritize eco-friendly options
      if (sustainabilityPreference && sustainabilityPreference !== 'standard') {
        const ecoHotels = filteredHotels.filter(hotel => {
          const nameLower = hotel.name.toLowerCase();
          return ECO_KEYWORDS.some(kw => nameLower.includes(kw));
        });

        if (sustainabilityPreference === 'eco_focused' && ecoHotels.length > 0) {
          // Put eco hotels first
          const otherHotels = filteredHotels.filter(h => !ecoHotels.includes(h));
          filteredHotels = [...ecoHotels, ...otherHotels];
        } else if (sustainabilityPreference === 'eco_conscious' && ecoHotels.length > 0) {
          // Mix eco hotels into results
          const otherHotels = filteredHotels.filter(h => !ecoHotels.includes(h));
          filteredHotels = [...ecoHotels, ...otherHotels];
        }
      }

      // Accessibility filter (existing logic)
      if (accessibilityNeeds && (accessibilityNeeds.wheelchairAccessible || accessibilityNeeds.elevatorRequired || accessibilityNeeds.noStairs)) {
        const beforeCount = filteredHotels.length;
        filteredHotels = filteredHotels.filter(hotel => !shouldFilterForAccessibility(hotel, accessibilityNeeds));

        // If we filtered out too many, add some back with warnings
        if (filteredHotels.length < 3 && beforeCount > filteredHotels.length) {
          const additionalHotels = hotels
            .filter(h => !filteredHotels.includes(h))
            .slice(0, 5 - filteredHotels.length);
          filteredHotels = [...filteredHotels, ...additionalHotels];
        }
      }

      // Map hotels to response format and return with areaId for parallel collection
      const mappedHotels = filteredHotels.map((hotel) => {
        const starRating = getStarRating(hotel.name);

        // PHASE 1 FIX: Use real Makcorps price if available, otherwise estimate
        const hasMakcorpsPrice = hotel.makcorpsPrice && hotel.makcorpsPrice > 0;
        const pricePerNight = hasMakcorpsPrice
          ? hotel.makcorpsPrice
          : hotel.priceLevel
            ? Math.round(hotel.priceLevel * 75 + 50 + (starRating * 20))
            : Math.round(starRating * 50 + 80);

        const priceConfidence = hasMakcorpsPrice ? 'real' as const : (hotel.priceLevel ? 'estimated' as const : 'rough' as const);
        const priceSource = hasMakcorpsPrice ? 'makcorps' as const : (hotel.priceLevel ? 'google' as const : 'estimate' as const);

        // Get Reddit data for this hotel
        const redditData = redditHotels.get(hotel.name.toLowerCase());

        // Get accessibility info
        const accessibility = estimateAccessibility(hotel.name);

        // Build price comparison if Makcorps data available
        const priceComparison = hasMakcorpsPrice && hotel.makcorpsPrices?.length > 0
          ? {
              cheapest: { vendor: hotel.makcorpsVendor, price: hotel.makcorpsPrice },
              alternatives: hotel.makcorpsPrices.slice(1, 4).map((p: any) => ({
                vendor: p.vendor,
                price: p.price,
              })),
            }
          : undefined;

        return {
          id: hotel.id,
          placeId: hotel.placeId,
          name: hotel.name,
          address: hotel.address || '',
          googleMapsUrl: hotel.placeId ? `https://www.google.com/maps/place/?q=place_id:${hotel.placeId}` : undefined,
          city: hotel.city || '',
          lat: hotel.lat,
          lng: hotel.lng,
          distanceToCenter: 0,
          googleRating: hotel.googleRating || 0,
          reviewCount: hotel.reviewCount || 0,
          stars: getStarRating(hotel.name),
          pricePerNight,
          totalPrice: null,
          currency: 'USD',
          priceConfidence,
          priceSource,
          priceComparison,
          isAdultsOnly: false,
          isAllInclusive: hotel.name.toLowerCase().includes('all inclusive'),
          amenities: generateAmenities(hotel.name),
          imageUrl: hotel.photoReference
            ? `/api/photo-proxy?ref=${encodeURIComponent(hotel.photoReference)}&maxwidth=400`
            : '/images/hotel-placeholder.svg',
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
          // Accessibility info
          accessibilityScore: accessibility.accessibilityScore,
          likelyAccessible: accessibility.likelyAccessible,
          accessibilityNotes: [
            ...accessibility.features,
            ...accessibility.warnings.map(w => `⚠️ ${w}`),
          ],
          // Pet-friendly info
          isPetFriendly: PET_FRIENDLY_CHAINS.some(chain => hotel.name.toLowerCase().includes(chain)) ||
                         hotel.name.toLowerCase().includes('pet') ||
                         hotel.name.toLowerCase().includes('dog'),
          petNote: travelingWithPets?.hasPet ?
            (PET_FRIENDLY_CHAINS.some(chain => hotel.name.toLowerCase().includes(chain))
              ? '🐕 Known pet-friendly chain'
              : '⚠️ Call to confirm pet policy')
            : undefined,
          // Eco-friendly info
          isEcoFriendly: ECO_KEYWORDS.some(kw => hotel.name.toLowerCase().includes(kw)),
          ecoNote: ECO_KEYWORDS.some(kw => hotel.name.toLowerCase().includes(kw))
            ? '🌿 Eco-friendly property'
            : undefined,
        };
      });

      // Post-filter: remove hotels whose estimated price exceeds budget
      const budgetMax = preferences.budgetMax;
      const budgetFiltered = budgetMax
        ? mappedHotels.filter(h => {
            // Always keep hotels with real pricing (already filtered by Makcorps)
            if (h.priceConfidence === 'real') return true;
            // For estimated/rough prices, enforce budget cap
            return !h.pricePerNight || h.pricePerNight <= budgetMax;
          })
        : mappedHotels;

      return { areaId, hotels: budgetFiltered.length > 0 ? budgetFiltered : mappedHotels };
    }));

    // Collect results from parallel execution
    for (const { areaId, hotels } of areaResults) {
      results[areaId] = hotels;
    }

    // Fetch real prices from Makcorps for DB fallback hotels that don't have prices yet
    if (checkIn && checkOut) {
      // Only process hotels that DON'T already have Makcorps prices (from PRIMARY source)
      const hotelsByArea: Record<string, Array<{ name: string; index: number }>> = {};
      let needsPricing = 0;

      for (const [areaId, hotels] of Object.entries(results)) {
        const unpricedHotels = hotels
          .map((hotel, index) => ({ name: hotel.name, index, priceSource: hotel.priceSource }))
          .filter(h => h.priceSource !== 'makcorps');

        if (unpricedHotels.length > 0) {
          hotelsByArea[areaId] = unpricedHotels;
          needsPricing += unpricedHotels.length;
        }
      }

      // Skip if all hotels already have Makcorps prices
      if (needsPricing === 0) {
      } else {

        try {
          for (const [areaId, hotels] of Object.entries(hotelsByArea)) {
            const areaName = areaId.replace(/-/g, ' ');
            const hotelNames = hotels.map(h => h.name);

            const priceMap = await getBatchPricingByCity(
              areaName,
              destination,
              hotelNames,
              checkIn,
              checkOut,
              adults || 2
            );

            let matchedCount = 0;
            for (const hotel of hotels) {
              const priceKey = hotel.name.toLowerCase();
              const priceData = priceMap.get(priceKey);

              if (priceData && results[areaId]?.[hotel.index]) {
                const hotelEntry = results[areaId][hotel.index];
                hotelEntry.pricePerNight = priceData.price;
                hotelEntry.priceConfidence = 'real';
                hotelEntry.priceSource = 'makcorps';
                (hotelEntry as any).priceComparison = {
                  cheapest: { vendor: priceData.vendor, price: priceData.price },
                  alternatives: priceData.allPrices.slice(1, 4).map(p => ({
                    vendor: p.vendor,
                    price: p.price,
                  })),
                };
                matchedCount++;
              }
            }

          }
        } catch (e) {
          console.error('[Hotels API] Makcorps pricing for fallback hotels failed:', e);
        }
      }

      const totalPriced = Object.values(results).flat().filter(h => h.priceSource === 'makcorps').length;
      const totalHotels = Object.values(results).flat().length;
    }

    // For large groups, add room calculations to each hotel
    if (isLargeGroup) {
      for (const areaId of Object.keys(results)) {
        results[areaId] = results[areaId].map(hotel => ({
          ...hotel,
          estimatedRoomsNeeded: roomsNeeded,
          estimatedTotalPrice: hotel.pricePerNight ? hotel.pricePerNight * roomsNeeded : undefined,
          largeGroupNote: roomsNeeded >= 4
            ? 'Consider a villa or vacation rental for better value with large groups'
            : undefined,
        }));
      }
    }

    const response = NextResponse.json({
      hotelsByArea: results,
      totalCount: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
      partyInfo: isLargeGroup ? {
        partySize,
        estimatedRoomsNeeded: roomsNeeded,
        isLargeGroup: true,
        tip: partySize > 8
          ? 'For groups of 8+, consider booking multiple adjacent rooms or a vacation rental/villa for more space and better value.'
          : 'For your group size, you may want to book connecting rooms or a suite.',
      } : undefined,
    });

    // Add cache headers - hotel search with dates is user-specific but can still be cached briefly
    // Use shorter cache for POST requests with real-time pricing
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Batch hotels POST fetch error:', errorMessage, error);

    // Check for specific error types
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return NextResponse.json(
        {
          error: 'TIMEOUT_ERROR',
          message: 'The hotel search took too long. Please try again.',
          hotelsByArea: {},
          totalCount: 0,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: 'FETCH_ERROR',
        message: 'We had trouble finding hotels. Please try again.',
        hotelsByArea: {},
        totalCount: 0,
      },
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
    const geocoded = await geocodeLocation(`${area}, ${destination}`);
    if (geocoded) {
      searchLat = geocoded.lat;
      searchLng = geocoded.lng;
    }
  }

  // Strategy 1: Geocode search if coordinates available
  if (searchLat && searchLng) {
    try {
      const geocodeResults = await searchHotelsByGeocode(searchLat, searchLng, 15000, 60);
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

  // Batch upsert to database using transactions to avoid N+1 query overhead
  let indexedCount = 0;
  const validResults = allResults.filter(place => place.place_id);
  const UPSERT_BATCH_SIZE = 50;

  for (let batchStart = 0; batchStart < validResults.length; batchStart += UPSERT_BATCH_SIZE) {
    const batch = validResults.slice(batchStart, batchStart + UPSERT_BATCH_SIZE);
    try {
      await prisma.$transaction(
        batch.map(place => prisma.hotel.upsert({
          where: { placeId: place.place_id! },
          create: {
            placeId: place.place_id!,
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
        }))
      );
      indexedCount += batch.length;
    } catch (error) {
      // If batch transaction fails, fall back to individual upserts
      for (const place of batch) {
        try {
          await prisma.hotel.upsert({
            where: { placeId: place.place_id! },
            create: {
              placeId: place.place_id!,
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
    }
  }

  return indexedCount;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStarRating(name: string): number {
  const nameLower = name.toLowerCase();

  // Ultra-luxury brands (5 stars)
  const fiveStars = [
    'aman', 'rosewood', 'four seasons', 'mandarin oriental', 'ritz', 'ritz-carlton',
    'st regis', 'st. regis', 'park hyatt', 'peninsula', 'waldorf', 'edition',
    'one&only', 'six senses', 'belmond', 'raffles', 'bulgari', 'armani',
    'capella', 'faena', 'soho house', 'excellence', 'secrets', 'zoetry',
    'eden roc', 'cap cana', 'puntacana resort', 'tortuga bay', 'casa de campo'
  ];
  if (fiveStars.some(brand => nameLower.includes(brand))) return 5;

  // Premium brands (4+ stars)
  const fourPlusStars = [
    'marriott', 'jw marriott', 'w hotel', 'le meridien', 'autograph collection',
    'hilton', 'waldorf', 'conrad', 'curio', 'lxr',
    'hyatt', 'hyatt regency', 'grand hyatt', 'andaz',
    'sheraton', 'westin', 'intercontinental', 'kimpton', 'fairmont', 'sofitel',
    'langham', 'shangri-la', 'banyan tree', 'anantara', 'oberoi',
    'loews', 'omni', 'the luxury collection'
  ];
  if (fourPlusStars.some(brand => nameLower.includes(brand))) return 4;

  // Resort/boutique indicators
  if (nameLower.includes('resort') || nameLower.includes('spa')) return 4;
  if (nameLower.includes('boutique')) return 4;
  if (nameLower.includes('luxury')) return 4;
  if (nameLower.includes('5 star') || nameLower.includes('five star')) return 5;

  // Standard/mid-range
  const threeStars = ['holiday inn', 'hampton', 'courtyard', 'fairfield', 'best western', 'comfort inn'];
  if (threeStars.some(brand => nameLower.includes(brand))) return 3;

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
