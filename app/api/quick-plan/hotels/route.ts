/**
 * Quick Plan Hotels API
 * Fetches and filters hotels for selected areas
 * Reuses existing hotel infrastructure with AUTO-INDEXING
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchHotelsWithPagination, searchHotelsByGeocode, searchLuxuryHotels, geocodeLocation, GooglePlaceResult } from '@/lib/google-maps';
import { searchHotelRecommendations } from '@/lib/reddit';
import { getBatchPricingByCity } from '@/lib/makcorps';
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
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${hotel.photoReference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
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

// Map budget to Google price_level (1-4 scale)
function getBudgetPriceLevel(budgetMax: number): { min: number; max: number; isLuxury: boolean } | null {
  if (budgetMax <= 150) return { min: 1, max: 2, isLuxury: false };      // Budget
  if (budgetMax <= 300) return { min: 2, max: 3, isLuxury: false };      // Mid-range
  if (budgetMax <= 600) return { min: 3, max: 4, isLuxury: false };      // Upscale
  return { min: 4, max: 4, isLuxury: true };  // Luxury - only show high-end (price_level 4)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { areaIds, destination, preferences, coordinates, checkIn, checkOut, adults } = body as {
      areaIds: string[];
      destination: string;
      preferences: {
        budgetMin?: number;
        budgetMax?: number;
        minRating?: number;
        vibes?: string[];
      };
      coordinates?: { lat: number; lng: number };
      checkIn?: string;  // YYYY-MM-DD
      checkOut?: string; // YYYY-MM-DD
      adults?: number;
    };

    const results: Record<string, HotelCandidate[]> = {};
    console.log('[Hotels API] Received request for areas:', areaIds, 'destination:', destination);
    console.log('[Hotels API] Dates:', checkIn, '-', checkOut, 'Adults:', adults);

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
      console.log(`[Hotels API] Found ${redditHotels.size} Reddit hotel mentions for ${destination}`);
    } catch (e) {
      console.error('[Hotels API] Reddit search failed:', e);
    }

    const priceLevelRange = preferences.budgetMax
      ? getBudgetPriceLevel(preferences.budgetMax)
      : null;

    console.log(`[Hotels API] Budget filter: $${preferences.budgetMin}-$${preferences.budgetMax}, priceLevel: ${JSON.stringify(priceLevelRange)}`);

    for (const areaId of areaIds) {
      // Convert area ID back to name
      const areaName = areaId.replace(/-/g, ' ');
      const cacheKey = `${destination}:${areaName}`.toLowerCase();
      console.log(`[Hotels API] Processing area: ${areaName} (id: ${areaId})`);

      // Build price level filter if budget is set
      const priceLevelFilter = priceLevelRange
        ? { priceLevel: { gte: priceLevelRange.min, lte: priceLevelRange.max } }
        : {};

      let hotels: any[] = [];
      let dbAvailable = true;

      // Try database first, fallback to Google-only if DB unavailable
      try {
        // Query DB - FIRST try area-specific match, THEN fallback to country
        hotels = await prisma.hotel.findMany({
          where: {
            AND: [
              { country: { contains: destination } },
              {
                OR: [
                  { region: { contains: areaName } },
                  { city: { contains: areaName } },
                ],
              },
              priceLevelFilter,
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
      } catch (dbError: any) {
        console.warn(`[Hotels API] Database unavailable, using Google search only: ${dbError.message?.slice(0, 100)}`);
        dbAvailable = false;
      }

      // If no DB results or DB unavailable, use GEOCODE-BASED search
      if (hotels.length < 3) {
        console.log(`[Hotels API] ${dbAvailable ? 'Few DB results' : 'DB unavailable'} for ${areaName}, using Google geocode search`);

        // Get coordinates for the SPECIFIC AREA
        const areaCoords = await geocodeLocation(`${areaName}, ${destination}`);

        if (areaCoords) {
          console.log(`[Hotels API] Geocoded ${areaName} to (${areaCoords.lat}, ${areaCoords.lng})`);

          // Use luxury search for high budgets, regular search otherwise
          const isLuxuryBudget = priceLevelRange?.isLuxury || false;
          let nearbyHotels: GooglePlaceResult[];

          if (isLuxuryBudget) {
            console.log(`[Hotels API] Using LUXURY hotel search for ${areaName} (budget: $${preferences.budgetMax}+)`);
            nearbyHotels = await searchLuxuryHotels(
              areaCoords.lat,
              areaCoords.lng,
              areaName,
              destination,
              20
            );
          } else {
            // Standard search within 50km radius
            nearbyHotels = await searchHotelsByGeocode(
              areaCoords.lat,
              areaCoords.lng,
              50000,
              20
            );
          }

          console.log(`[Hotels API] Found ${nearbyHotels.length} hotels via Google geocode for ${areaName}`);

          // Convert Google results to hotel format (skip DB indexing if unavailable)
          if (!dbAvailable || nearbyHotels.length > 0) {
            // Use Google results directly as hotel candidates
            const googleHotels = nearbyHotels
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

            // If DB available, try to index for future
            if (dbAvailable) {
              for (const hotel of nearbyHotels) {
                if (hotel.place_id) {
                  try {
                    await prisma.hotel.upsert({
                      where: { placeId: hotel.place_id },
                      create: {
                        placeId: hotel.place_id,
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
                  } catch (e) {
                    // Skip duplicates
                  }
                }
              }

              // Re-query with new data including lat/lng radius
              hotels = await prisma.hotel.findMany({
                where: {
                  AND: [
                    { country: { contains: destination } },
                    {
                      OR: [
                        { region: { contains: areaName } },
                        { city: { contains: areaName } },
                        {
                          AND: [
                            { lat: { gte: areaCoords.lat - 0.45 } },
                            { lat: { lte: areaCoords.lat + 0.45 } },
                            { lng: { gte: areaCoords.lng - 0.45 } },
                            { lng: { lte: areaCoords.lng + 0.45 } },
                          ]
                        }
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
            } else {
              // Use Google results directly
              hotels = googleHotels;
            }

            console.log(`[Hotels API] After geocode search for ${areaName}: ${hotels.length} hotels`);
          }
        }
      }

      // Auto-index if needed (skip if DB unavailable)
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
        // Estimate price from Google price_level (1-4 scale) or star rating
        const starRating = getStarRating(hotel.name);
        const estimatedPrice = hotel.priceLevel
          ? Math.round(hotel.priceLevel * 75 + 50 + (starRating * 20))
          : Math.round(starRating * 50 + 80); // Fallback: estimate from star rating

        // Get Reddit data for this hotel
        const redditData = redditHotels.get(hotel.name.toLowerCase());

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
          isAllInclusive: hotel.name.toLowerCase().includes('all inclusive'),
          amenities: generateAmenities(hotel.name),
          imageUrl: hotel.photoReference
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${hotel.photoReference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
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
    }

    // Fetch real prices from Makcorps if dates are available
    if (checkIn && checkOut) {
      console.log('[Hotels API] Fetching real prices from Makcorps...');

      // Group hotels by area for efficient city-based pricing
      const hotelsByArea: Record<string, Array<{ name: string; index: number }>> = {};
      for (const [areaId, hotels] of Object.entries(results)) {
        hotelsByArea[areaId] = hotels.map((hotel, index) => ({
          name: hotel.name,
          index,
        }));
      }

      try {
        // Use city-based API for each area (much more efficient)
        // This fetches ~60 hotels per city in just 2-3 API calls instead of 2 calls per hotel
        for (const [areaId, hotels] of Object.entries(hotelsByArea)) {
          const areaName = areaId.replace(/-/g, ' ');
          const hotelNames = hotels.map(h => h.name);

          console.log(`[Hotels API] Fetching Makcorps prices for ${areaName} (${hotelNames.length} hotels)`);

          const priceMap = await getBatchPricingByCity(
            areaName,
            destination,
            hotelNames,
            checkIn,
            checkOut,
            adults || 2
          );

          // Update results with real prices
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

          console.log(`[Hotels API] Matched ${matchedCount}/${hotels.length} hotels with Makcorps prices for ${areaName}`);
        }

        // Note: Individual hotel fallback disabled - Makcorps /mapping endpoint is currently broken
        // The city-based approach above is more efficient anyway (60 hotels in 2-3 calls vs 2 calls per hotel)
        const unpricedCount = Object.values(results).flat().filter(h => h.priceSource !== 'makcorps').length;
        if (unpricedCount > 0) {
          console.log(`[Hotels API] ${unpricedCount} hotels without Makcorps prices (will use estimates)`);
        }

        const totalPriced = Object.values(results).flat().filter(h => h.priceSource === 'makcorps').length;
        const totalHotels = Object.values(results).flat().length;
        console.log(`[Hotels API] Total: ${totalPriced}/${totalHotels} hotels with real prices`);
      } catch (e) {
        console.error('[Hotels API] Makcorps pricing failed:', e);
      }
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
