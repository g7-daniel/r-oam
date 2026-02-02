import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { matchAndPriceHotel } from '@/lib/booking-com';
import { getHotelListByGeocode, getHotelPricesByIds } from '@/lib/amadeus';
import { calculateLevenshteinSimilarity, normalizeHotelName } from '@/lib/utils/string';

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

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
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

  console.log(`Pricing request for placeId: ${placeId}, dates: ${checkIn} - ${checkOut}`);

  // Step 1: Check cache
  const cached = await prisma.priceCache.findUnique({
    where: {
      placeId_checkIn_checkOut_adults: { placeId, checkIn, checkOut, adults },
    },
  });

  if (cached && cached.expiresAt > new Date()) {
    console.log('Returning cached pricing');
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

  // Step 3: Try Booking.com first (primary source)
  console.log(`Trying Booking.com for: ${hotel.name}`);
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
      console.log(`✓ Booking.com price: $${pricing.pricePerNight}/night`);
    } else if (bookingResult?.soldOut) {
      console.log(`Booking.com: ${hotel.name} is sold out for these dates`);
    } else {
      console.log(`Booking.com: No pricing found for ${hotel.name}`);
    }
  } catch (error) {
    console.error('Booking.com error:', error);
  }

  // Step 4: Fall back to Amadeus if Booking.com didn't work
  if (!pricing.hasAvailability) {
    console.log(`Trying Amadeus for: ${hotel.name}`);
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
          console.log(`✓ Amadeus price: $${pricing.pricePerNight}/night`);
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
    console.log(`Using estimated price: $${estimatedPrice}/night`);
  }

  // Step 6: Cache result
  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);

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
        pricePerNight: pricing.pricePerNight,
        totalPrice: pricing.totalPrice,
        currency: pricing.currency,
        hasAvailability: pricing.hasAvailability,
        cachedAt: new Date(),
        expiresAt,
      },
      update: {
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
}

// Batch pricing endpoint
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { placeIds, checkIn, checkOut, adults = 2 } = body;

  if (!placeIds || !Array.isArray(placeIds) || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'Missing required parameters: placeIds (array), checkIn, checkOut' },
      { status: 400 }
    );
  }

  console.log(`Batch pricing request for ${placeIds.length} hotels`);

  const results: Record<string, {
    pricePerNight: number | null;
    totalPrice: number | null;
    currency: string | null;
    hasAvailability: boolean;
    isEstimate: boolean;
    source: string;
  }> = {};

  // Process in batches of 5 to avoid rate limits
  const BATCH_SIZE = 5;

  for (let i = 0; i < placeIds.length; i += BATCH_SIZE) {
    const batch = placeIds.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (placeId: string) => {
        try {
          // Check cache first
          const cached = await prisma.priceCache.findUnique({
            where: {
              placeId_checkIn_checkOut_adults: { placeId, checkIn, checkOut, adults },
            },
          });

          if (cached && cached.expiresAt > new Date()) {
            results[placeId] = {
              pricePerNight: cached.pricePerNight,
              totalPrice: cached.totalPrice,
              currency: cached.currency,
              hasAvailability: cached.hasAvailability,
              isEstimate: !cached.hasAvailability,
              source: 'cache',
            };
            return;
          }

          // Get hotel
          const hotel = await prisma.hotel.findUnique({ where: { placeId } });
          if (!hotel) {
            results[placeId] = {
              pricePerNight: null,
              totalPrice: null,
              currency: null,
              hasAvailability: false,
              isEstimate: true,
              source: 'not_found',
            };
            return;
          }

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
            return;
          }

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
}
