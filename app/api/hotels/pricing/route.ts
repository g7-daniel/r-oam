import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { matchAndPriceHotel } from '@/lib/booking-com';
import { getHotelListByGeocode, getHotelPricesByIds } from '@/lib/amadeus';
import { calculateLevenshteinSimilarity, normalizeHotelName } from '@/lib/utils/string';
import { calculateHaversineDistance } from '@/lib/utils/geo';

const MATCH_DISTANCE_METERS = 10000;
const MATCH_NAME_SIMILARITY = 0.5;
const SEARCH_RADIUS_KM = 50;
const CACHE_TTL_MINUTES = 30;

/**
 * Estimate hotel price based on name patterns (luxury brands = higher price)
 */
function estimatePriceByHotelName(name: string): number {
  const nameLower = name.toLowerCase();

  // Ultra luxury: $800+
  const ultraLuxury = ['aman', 'amanera', 'rosewood', 'four seasons', 'mandarin oriental', 'peninsula'];
  if (ultraLuxury.some((brand) => nameLower.includes(brand))) {
    return 850 + Math.floor(Math.random() * 300);
  }

  // Luxury: $400-600
  const luxury = [
    'ritz', 'waldorf', 'st regis', 'st. regis', 'park hyatt', 'conrad',
    'edition', 'w hotel', 'jw marriott', 'intercontinental', 'fairmont',
    'sofitel', 'eden roc', 'banyan tree', 'six senses', 'shangri-la',
    'tortuga bay', 'sanctuary'
  ];
  if (luxury.some((brand) => nameLower.includes(brand))) {
    return 450 + Math.floor(Math.random() * 150);
  }

  // Upper upscale: $250-400
  const upperUpscale = [
    'marriott', 'hilton', 'hyatt', 'sheraton', 'westin', 'le meridien',
    'doubletree', 'embassy suites', 'andaz', 'thompson', 'kimpton',
    'secrets', 'excellence', 'casa de campo'
  ];
  if (upperUpscale.some((brand) => nameLower.includes(brand))) {
    return 280 + Math.floor(Math.random() * 120);
  }

  // Resort keyword
  if (nameLower.includes('resort') || nameLower.includes('spa')) {
    return 220 + Math.floor(Math.random() * 150);
  }

  // Budget brands: $80-150
  const budget = ['holiday inn', 'hampton', 'best western', 'comfort', 'la quinta', 'motel'];
  if (budget.some((brand) => nameLower.includes(brand))) {
    return 90 + Math.floor(Math.random() * 60);
  }

  // Default mid-range: $150-250
  return 160 + Math.floor(Math.random() * 90);
}

// Distance in meters using centralized Haversine utility
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return calculateHaversineDistance(lat1, lng1, lat2, lng2) * 1000; // Convert km to meters
}

export async function GET(request: NextRequest) {
  try {
  const params = request.nextUrl.searchParams;
  const placeId = params.get('placeId');
  const checkIn = params.get('checkIn');
  const checkOut = params.get('checkOut');
  const adults = parseInt(params.get('adults') || '2');

  if (!placeId || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'Missing required parameters: placeId, checkIn, checkOut' },
      { status: 400 }
    );
  }

  // Validate adults is a valid number
  if (isNaN(adults) || adults < 1 || adults > 20) {
    return NextResponse.json(
      { error: 'Invalid adults parameter: must be between 1 and 20' },
      { status: 400 }
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(checkIn) || !dateRegex.test(checkOut)) {
    return NextResponse.json(
      { error: 'Invalid date format: use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // Validate checkOut is after checkIn
  if (new Date(checkOut) <= new Date(checkIn)) {
    return NextResponse.json(
      { error: 'checkOut must be after checkIn' },
      { status: 400 }
    );
  }

  // Step 1: Check cache
  const cached = await prisma.priceCache.findUnique({
    where: {
      placeId_checkIn_checkOut_adults: { placeId, checkIn, checkOut, adults },
    },
  });

  if (cached && cached.expiresAt > new Date()) {
    return NextResponse.json({
      placeId,
      pricePerNight: cached.pricePerNight,
      totalPrice: cached.totalPrice,
      currency: cached.currency,
      hasAvailability: cached.hasAvailability,
      isEstimate: !cached.hasAvailability,
      source: 'cache',
    });
  }

  // Step 2: Get hotel from DB
  const hotel = await prisma.hotel.findUnique({ where: { placeId } });
  if (!hotel) {
    return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
  }

  let pricing: {
    pricePerNight: number | null;
    totalPrice: number | null;
    currency: string | null;
    hasAvailability: boolean;
  } = {
    pricePerNight: null,
    totalPrice: null,
    currency: null,
    hasAvailability: false,
  };

  let source = 'estimate';
  // Track amadeusHotelId at outer scope so it's available for cache write in Step 6
  let resolvedAmadeusHotelId: string | null = hotel.amadeusHotelId;

  // Step 3: Try Booking.com first (primary source)
  try {
    const bookingResult = await matchAndPriceHotel(
      hotel.name,
      hotel.lat,
      hotel.lng,
      checkIn,
      checkOut,
      adults
    );

    if (bookingResult && !bookingResult.soldOut && bookingResult.pricePerNight > 0) {
      pricing = {
        pricePerNight: Math.round(bookingResult.pricePerNight),
        totalPrice: Math.round(bookingResult.totalPrice),
        currency: bookingResult.currency,
        hasAvailability: true,
      };
      source = 'booking.com';
    } else if (bookingResult?.soldOut) {
    } else {
    }
  } catch (error) {
    console.error('Booking.com error:', error);
  }

  // Step 4: Fall back to Amadeus if Booking.com didn't work
  if (!pricing.hasAvailability) {
    let amadeusHotelId = hotel.amadeusHotelId;

    if (!amadeusHotelId) {
      try {
        const amadeusHotels = await getHotelListByGeocode(hotel.lat, hotel.lng, SEARCH_RADIUS_KM);
        const googleNormalized = normalizeHotelName(hotel.name);

        let bestMatch: { hotelId: string; name: string; similarity: number; distance: number } | null = null;

        for (const ah of amadeusHotels) {
          if (!ah.latitude || !ah.longitude) continue;

          const distance = haversineDistance(hotel.lat, hotel.lng, ah.latitude, ah.longitude);
          const amadeusNormalized = normalizeHotelName(ah.name);
          let similarity = calculateLevenshteinSimilarity(googleNormalized, amadeusNormalized);

          const containsMatch = googleNormalized.includes(amadeusNormalized) || amadeusNormalized.includes(googleNormalized);
          if (containsMatch && similarity < 0.8) {
            similarity = Math.max(similarity, 0.8);
          }

          if (distance <= MATCH_DISTANCE_METERS && similarity >= MATCH_NAME_SIMILARITY) {
            if (!bestMatch || similarity > bestMatch.similarity) {
              bestMatch = { hotelId: ah.hotelId, name: ah.name, similarity, distance };
            }
          }
        }

        if (bestMatch) {
          amadeusHotelId = bestMatch.hotelId;
          resolvedAmadeusHotelId = bestMatch.hotelId;
          await prisma.hotel.update({
            where: { placeId },
            data: { amadeusHotelId, amadeusMatched: true },
          });
        }
      } catch (error) {
        console.error('Amadeus hotel search error:', error);
      }
    }

    if (amadeusHotelId) {
      try {
        const prices = await getHotelPricesByIds([amadeusHotelId], checkIn, checkOut, adults);
        const price = prices.get(amadeusHotelId);

        if (price) {
          pricing = {
            pricePerNight: Math.round(price.pricePerNight),
            totalPrice: Math.round(price.totalPrice),
            currency: price.currency,
            hasAvailability: true,
          };
          source = 'amadeus';
        }
      } catch (error) {
        console.error('Amadeus pricing error:', error);
      }
    }
  }

  // Step 5: Fall back to estimates
  if (!pricing.hasAvailability && hotel) {
    const estimatedPrice = estimatePriceByHotelName(hotel.name);
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    pricing = {
      pricePerNight: estimatedPrice,
      totalPrice: estimatedPrice * nights,
      currency: 'USD',
      hasAvailability: false,
    };
    source = 'estimate';
  }

  // Step 6: Cache result
  // Use shorter TTL for estimates (which use Math.random()) so real prices are fetched sooner
  const cacheTtlMinutes = pricing.hasAvailability ? CACHE_TTL_MINUTES : 5;
  const expiresAt = new Date(Date.now() + cacheTtlMinutes * 60 * 1000);

  // Use resolvedAmadeusHotelId which tracks the latest value from Step 4
  // (avoids a redundant DB re-read since we already have the value in memory)
  const currentAmadeusHotelId = resolvedAmadeusHotelId;

  try {
    await prisma.priceCache.upsert({
      where: {
        placeId_checkIn_checkOut_adults: { placeId, checkIn, checkOut, adults },
      },
      create: {
        placeId,
        checkIn,
        checkOut,
        adults,
        amadeusHotelId: currentAmadeusHotelId,
        pricePerNight: pricing.pricePerNight,
        totalPrice: pricing.totalPrice,
        currency: pricing.currency,
        hasAvailability: pricing.hasAvailability,
        cachedAt: new Date(),
        expiresAt,
      },
      update: {
        amadeusHotelId: currentAmadeusHotelId,
        pricePerNight: pricing.pricePerNight,
        totalPrice: pricing.totalPrice,
        currency: pricing.currency,
        hasAvailability: pricing.hasAvailability,
        cachedAt: new Date(),
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Cache update error:', error);
  }

  return NextResponse.json({
    placeId,
    ...pricing,
    isEstimate: !pricing.hasAvailability,
    source,
  });
  } catch (error) {
    console.error('Hotel pricing GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotel pricing' },
      { status: 500 }
    );
  }
}

// Batch pricing endpoint
export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }
  const { placeIds, checkIn, checkOut, adults = 2 } = body;

  if (!placeIds || !Array.isArray(placeIds) || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'Missing required parameters: placeIds (array), checkIn, checkOut' },
      { status: 400 }
    );
  }

  // Limit batch size to prevent DoS
  if (placeIds.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 placeIds per batch request' },
      { status: 400 }
    );
  }

  // Validate adults
  if (typeof adults !== 'number' || adults < 1 || adults > 20) {
    return NextResponse.json(
      { error: 'Invalid adults parameter: must be between 1 and 20' },
      { status: 400 }
    );
  }

  const results: Record<string, {
    pricePerNight: number | null;
    totalPrice: number | null;
    currency: string | null;
    hasAvailability: boolean;
    isEstimate: boolean;
    source: string;
  }> = {};

  try {
  // Step 1: Batch fetch all cached prices (single DB query instead of N queries)
  let cachedPrices: Awaited<ReturnType<typeof prisma.priceCache.findMany>>;
  try {
    cachedPrices = await prisma.priceCache.findMany({
      where: {
        placeId: { in: placeIds },
        checkIn,
        checkOut,
        adults,
        expiresAt: { gt: new Date() },
      },
    });
  } catch (error) {
    console.error('Cache lookup error:', error);
    cachedPrices = [];
  }

  // Create lookup map for cached prices
  const cachedPricesMap = new Map(cachedPrices.map(c => [c.placeId, c]));
  const uncachedPlaceIds: string[] = [];

  for (const placeId of placeIds) {
    const cached = cachedPricesMap.get(placeId);
    if (cached) {
      results[placeId] = {
        pricePerNight: cached.pricePerNight,
        totalPrice: cached.totalPrice,
        currency: cached.currency,
        hasAvailability: cached.hasAvailability,
        isEstimate: !cached.hasAvailability,
        source: 'cache',
      };
    } else {
      uncachedPlaceIds.push(placeId);
    }
  }

  if (uncachedPlaceIds.length === 0) {
    return NextResponse.json({ pricing: results });
  }

  // Step 2: Batch fetch all hotels for uncached prices (single DB query)
  let hotels;
  try {
    hotels = await prisma.hotel.findMany({
      where: { placeId: { in: uncachedPlaceIds } },
    });
  } catch (error) {
    console.error('Hotel lookup error:', error);
    // Return what we have from cache, mark rest as error
    for (const placeId of uncachedPlaceIds) {
      results[placeId] = {
        pricePerNight: null,
        totalPrice: null,
        currency: null,
        hasAvailability: false,
        isEstimate: true,
        source: 'error',
      };
    }
    return NextResponse.json({ pricing: results });
  }

  const hotelMap = new Map(hotels.map(h => [h.placeId, h]));

  // Mark hotels that weren't found
  for (const placeId of uncachedPlaceIds) {
    if (!hotelMap.has(placeId)) {
      results[placeId] = {
        pricePerNight: null,
        totalPrice: null,
        currency: null,
        hasAvailability: false,
        isEstimate: true,
        source: 'not_found',
      };
    }
  }

  // Step 3: Process external API calls in batches (still need to rate limit external APIs)
  const hotelsToPrice = hotels.filter(h => !results[h.placeId]);
  const BATCH_SIZE = 5;

  for (let i = 0; i < hotelsToPrice.length; i += BATCH_SIZE) {
    const batch = hotelsToPrice.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (hotel) => {
        const placeId = hotel.placeId;
        try {
          // Try Booking.com
          const bookingResult = await matchAndPriceHotel(
            hotel.name,
            hotel.lat,
            hotel.lng,
            checkIn,
            checkOut,
            adults
          );

          if (bookingResult && !bookingResult.soldOut && bookingResult.pricePerNight > 0) {
            results[placeId] = {
              pricePerNight: Math.round(bookingResult.pricePerNight),
              totalPrice: Math.round(bookingResult.totalPrice),
              currency: bookingResult.currency,
              hasAvailability: true,
              isEstimate: false,
              source: 'booking.com',
            };
          } else {
            // Fall back to estimate
            const estimatedPrice = estimatePriceByHotelName(hotel.name);
            const nights = Math.ceil(
              (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
            );

            results[placeId] = {
              pricePerNight: estimatedPrice,
              totalPrice: estimatedPrice * nights,
              currency: 'USD',
              hasAvailability: false,
              isEstimate: true,
              source: 'estimate',
            };
          }

          // Write back to cache so subsequent requests benefit
          const result = results[placeId];
          const cacheTtlMinutes = result.hasAvailability ? CACHE_TTL_MINUTES : 5;
          const expiresAt = new Date(Date.now() + cacheTtlMinutes * 60 * 1000);
          try {
            await prisma.priceCache.upsert({
              where: {
                placeId_checkIn_checkOut_adults: { placeId, checkIn, checkOut, adults },
              },
              create: {
                placeId,
                checkIn,
                checkOut,
                adults,
                amadeusHotelId: hotel.amadeusHotelId,
                pricePerNight: result.pricePerNight,
                totalPrice: result.totalPrice,
                currency: result.currency,
                hasAvailability: result.hasAvailability,
                cachedAt: new Date(),
                expiresAt,
              },
              update: {
                amadeusHotelId: hotel.amadeusHotelId,
                pricePerNight: result.pricePerNight,
                totalPrice: result.totalPrice,
                currency: result.currency,
                hasAvailability: result.hasAvailability,
                cachedAt: new Date(),
                expiresAt,
              },
            });
          } catch (cacheError) {
            console.error(`Cache write error for ${placeId}:`, cacheError);
          }
        } catch (error) {
          console.error(`Error fetching pricing for ${placeId}:`, error);
          results[placeId] = {
            pricePerNight: null,
            totalPrice: null,
            currency: null,
            hasAvailability: false,
            isEstimate: true,
            source: 'error',
          };
        }
      })
    );
  }

  return NextResponse.json({ pricing: results });
  } catch (error) {
    console.error('Batch pricing error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch pricing' },
      { status: 500 }
    );
  }
}
