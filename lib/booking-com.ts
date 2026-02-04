/**
 * Booking.com API Integration via RapidAPI
 * Provides real-time hotel pricing from Booking.com
 */

import { fetchWithTimeout } from './api-cache';
import { isConfigured } from './env';

const RAPIDAPI_HOST = 'booking-com15.p.rapidapi.com';
// Use lazy evaluation to avoid issues during module load
const getRapidApiKey = () => process.env.RAPIDAPI_KEY || '';
const BASE_URL = `https://${RAPIDAPI_HOST}/api/v1`;
const BOOKING_TIMEOUT = 15000; // 15 second timeout

// Log configuration status on first use (not at module load)
let configLogged = false;
function logConfigStatus() {
  if (configLogged) return;
  configLogged = true;

  if (!isConfigured.rapidApi()) {
    console.warn('WARNING: RAPIDAPI_KEY is not configured - Booking.com pricing will not work. Set it in .env.local');
  }
}

interface BookingHotelSearchResult {
  hotel_id: number;
  hotel_name_trans: string;
  city: string;
  latitude?: number;
  longitude?: number;
  soldout: number;
  composite_price_breakdown?: {
    gross_amount_per_night?: { value: number; currency: string };
    gross_amount?: { value: number; currency: string };
    all_inclusive_amount?: { value: number; currency: string };
  };
}

interface BookingSearchResponse {
  status: boolean;
  message: string;
  data: {
    result: BookingHotelSearchResult[];
    count: number;
  };
}

interface BookingDestinationResult {
  dest_id: string;
  dest_type: string;
  name: string;
  label: string;
  city_name: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface BookingDestinationResponse {
  status: boolean;
  data: BookingDestinationResult[];
}

interface HotelPriceResult {
  hotelId: number;
  name: string;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  soldOut: boolean;
  source: 'booking.com';
}

async function fetchBookingAPI<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  logConfigStatus();

  if (!isConfigured.rapidApi()) {
    console.error('RAPIDAPI_KEY not configured. Set it in .env.local');
    return null;
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': getRapidApiKey(),
      },
    }, BOOKING_TIMEOUT);

    if (!response.ok) {
      console.error(`Booking.com API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Booking.com API fetch error:', error);
    return null;
  }
}

/**
 * Search for hotels by coordinates and get pricing
 */
export async function searchHotelsByCoordinates(
  latitude: number,
  longitude: number,
  checkIn: string,
  checkOut: string,
  adults: number = 2
): Promise<HotelPriceResult[]> {
  const data = await fetchBookingAPI<BookingSearchResponse>('/hotels/searchHotelsByCoordinates', {
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    arrival_date: checkIn,
    departure_date: checkOut,
    adults: adults.toString(),
    room_qty: '1',
    units: 'metric',
    temperature_unit: 'c',
    languagecode: 'en-us',
    currency_code: 'USD',
  });

  if (!data?.data?.result) {
    return [];
  }

  return data.data.result
    .filter((hotel) => hotel.composite_price_breakdown?.gross_amount_per_night?.value)
    .map((hotel) => ({
      hotelId: hotel.hotel_id,
      name: hotel.hotel_name_trans,
      pricePerNight: hotel.composite_price_breakdown!.gross_amount_per_night!.value,
      totalPrice: hotel.composite_price_breakdown!.gross_amount?.value || 0,
      currency: hotel.composite_price_breakdown!.gross_amount_per_night!.currency || 'USD',
      soldOut: hotel.soldout === 1,
      source: 'booking.com' as const,
    }));
}

/**
 * Search for a hotel by name to get its Booking.com ID
 */
export async function searchHotelByName(hotelName: string): Promise<BookingDestinationResult | null> {
  const data = await fetchBookingAPI<BookingDestinationResponse>('/hotels/searchDestination', {
    query: hotelName,
  });

  if (!data?.data?.length) {
    return null;
  }

  // Find hotel type result (not city/region)
  const hotelResult = data.data.find((r) => r.dest_type === 'hotel');
  return hotelResult || null;
}

/**
 * Get pricing for a specific hotel by Booking.com hotel ID
 */
export async function getHotelPricing(
  hotelId: string | number,
  checkIn: string,
  checkOut: string,
  adults: number = 2
): Promise<HotelPriceResult | null> {
  const data = await fetchBookingAPI<{ status: boolean; data: any }>('/hotels/getHotelDetails', {
    hotel_id: hotelId.toString(),
    arrival_date: checkIn,
    departure_date: checkOut,
    adults: adults.toString(),
    room_qty: '1',
    units: 'metric',
    temperature_unit: 'c',
    languagecode: 'en-us',
    currency_code: 'USD',
  });

  if (!data?.data) {
    return null;
  }

  const hotel = data.data;

  // Check if sold out
  if (hotel.soldout === 1 || !hotel.block?.length) {
    return {
      hotelId: typeof hotelId === 'string' ? parseInt(hotelId) : hotelId,
      name: hotel.hotel_name || hotel.hotel_name_trans || 'Unknown',
      pricePerNight: 0,
      totalPrice: 0,
      currency: 'USD',
      soldOut: true,
      source: 'booking.com',
    };
  }

  // Get cheapest room price - with extra safety check
  const cheapestRoom = hotel.block?.[0];
  if (!cheapestRoom) {
    console.warn('Booking.com: block exists but no rooms available');
    return null;
  }

  const priceBreakdown = cheapestRoom.product_price_breakdown;
  if (!priceBreakdown?.gross_amount_per_night?.value) {
    return null;
  }

  return {
    hotelId: typeof hotelId === 'string' ? parseInt(hotelId) : hotelId,
    name: hotel.hotel_name || hotel.hotel_name_trans,
    pricePerNight: priceBreakdown.gross_amount_per_night.value,
    totalPrice: priceBreakdown.gross_amount?.value || 0,
    currency: priceBreakdown.gross_amount_per_night.currency || 'USD',
    soldOut: false,
    source: 'booking.com',
  };
}

/**
 * Find pricing for a hotel by name (searches Booking.com, then gets pricing)
 */
export async function findHotelPricingByName(
  hotelName: string,
  checkIn: string,
  checkOut: string,
  adults: number = 2
): Promise<HotelPriceResult | null> {
  // First, search for the hotel
  const hotelInfo = await searchHotelByName(hotelName);

  if (!hotelInfo) {
    console.log(`Booking.com: Hotel "${hotelName}" not found`);
    return null;
  }

  console.log(`Booking.com: Found "${hotelInfo.name}" (ID: ${hotelInfo.dest_id})`);

  // Then get pricing
  return getHotelPricing(hotelInfo.dest_id, checkIn, checkOut, adults);
}

/**
 * Match a Google Places hotel to Booking.com and get pricing
 * Uses name matching and coordinate proximity
 */
export async function matchAndPriceHotel(
  googleHotelName: string,
  lat: number,
  lng: number,
  checkIn: string,
  checkOut: string,
  adults: number = 2
): Promise<HotelPriceResult | null> {
  // Strategy 1: Search by name directly
  const byName = await findHotelPricingByName(googleHotelName, checkIn, checkOut, adults);
  if (byName && !byName.soldOut) {
    return byName;
  }

  // Strategy 2: Search by coordinates and find matching hotel
  const nearbyHotels = await searchHotelsByCoordinates(lat, lng, checkIn, checkOut, adults);

  if (nearbyHotels.length === 0) {
    return byName; // Return sold-out result if we have it
  }

  // Normalize names for matching
  const normalize = (name: string) =>
    name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\b(hotel|resort|inn|suites?|the|a|an|by|at)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const googleNormalized = normalize(googleHotelName);

  // Find best match
  let bestMatch: HotelPriceResult | null = null;
  let bestScore = 0;

  for (const hotel of nearbyHotels) {
    const bookingNormalized = normalize(hotel.name);

    // Check for substring match
    const containsMatch = googleNormalized.includes(bookingNormalized) ||
                          bookingNormalized.includes(googleNormalized);

    // Calculate word overlap
    const googleWords = new Set(googleNormalized.split(' ').filter(w => w.length > 2));
    const bookingWords = new Set(bookingNormalized.split(' ').filter(w => w.length > 2));
    const commonWords = Array.from(googleWords).filter(w => bookingWords.has(w));
    const wordScore = commonWords.length / Math.max(googleWords.size, bookingWords.size);

    const score = containsMatch ? Math.max(0.8, wordScore) : wordScore;

    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = hotel;
    }
  }

  if (bestMatch) {
    console.log(`Booking.com: Matched "${googleHotelName}" → "${bestMatch.name}" (score: ${(bestScore * 100).toFixed(0)}%)`);
    return bestMatch;
  }

  return byName; // Return sold-out result if we have it
}
