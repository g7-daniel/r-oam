import type {
  AmadeusTokenResponse,
  AmadeusFlightResponse,
  AmadeusHotelResponse,
  Flight,
  Hotel,
  FlightSearchParams,
  HotelSearchParams,
} from '@/types';
import { filterByDistance, calculateHaversineDistance } from '@/lib/utils/geo';
import { DestinationConfig } from '@/lib/configs/destinations';
import { fetchWithTimeout } from './api-cache';
import { withRetry } from './retry';
import { getExchangeRatesSync } from './exchange-rates';
import { serverEnv, isConfigured } from './env';

// PRODUCTION URL - do not use test.api.amadeus.com in production
const AMADEUS_BASE_URL = 'https://api.amadeus.com';
const AMADEUS_TIMEOUT = 15000; // 15 second timeout

// Hotel chain image mappings for fallback when Amadeus doesn't provide images
function getHotelFallbackImage(hotelName: string): string {
  const name = hotelName.toLowerCase();

  // Luxury hotels
  if (name.includes('ritz-carlton') || name.includes('ritz carlton')) {
    return 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800';
  }
  if (name.includes('intercontinental')) {
    return 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800';
  }
  if (name.includes('four seasons')) {
    return 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800';
  }
  if (name.includes('mandarin oriental')) {
    return 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800';
  }
  if (name.includes('peninsula')) {
    return 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800';
  }

  // Upper upscale
  if (name.includes('marriott')) {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';
  }
  if (name.includes('hilton')) {
    return 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800';
  }
  if (name.includes('hyatt')) {
    return 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800';
  }
  if (name.includes('sheraton')) {
    return 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800';
  }
  if (name.includes('westin')) {
    return 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800';
  }

  // Mid-range
  if (name.includes('courtyard')) {
    return 'https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=800';
  }
  if (name.includes('holiday inn')) {
    return 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800';
  }
  if (name.includes('hampton')) {
    return 'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800';
  }

  // Default luxury hotel image
  return 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800';
}

let cachedToken: { token: string; expiresAt: number } | null = null;
// Track in-flight token refresh to prevent concurrent duplicate requests
let tokenRefreshPromise: Promise<string> | null = null;

async function getAccessToken(): Promise<string> {
  // Fast path: token is still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  // If a refresh is already in progress, wait for it instead of starting another
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  // Start a new token refresh
  tokenRefreshPromise = (async () => {
    try {
      if (!isConfigured.amadeus()) {
        throw new Error(
          'Amadeus credentials not configured. ' +
          'Please set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET in your .env.local file.'
        );
      }

      const clientId = serverEnv.AMADEUS_CLIENT_ID;
      const clientSecret = serverEnv.AMADEUS_CLIENT_SECRET;

      // Use retry logic for token requests
      const response = await withRetry(
        () => fetchWithTimeout(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }, AMADEUS_TIMEOUT),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          onRetry: (attempt, delay) => {
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to get Amadeus token (${response.status}): ${errorText}`);
      }

      const data: AmadeusTokenResponse = await response.json();

      // Use 5 minute buffer before expiry to avoid edge-case 401 errors
      // Tokens typically last 30 minutes, so 5 min buffer is safe
      // Guard against short-lived tokens: ensure at least 10 seconds of usable time
      const TOKEN_EXPIRY_BUFFER_SECONDS = 300;
      const effectiveLifetime = Math.max(data.expires_in - TOKEN_EXPIRY_BUFFER_SECONDS, 10);
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + effectiveLifetime * 1000,
      };

      return cachedToken.token;
    } finally {
      // Clear the in-flight promise
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}

// Round trip flight offer with both legs
export interface RoundTripFlight {
  id: string;
  outbound: Flight;
  return: Flight;
  totalPrice: number;
  currency: string;
}

export async function searchFlights(
  params: FlightSearchParams & { travelClass?: string }
): Promise<Flight[]> {
  const token = await getAccessToken();

  const searchParams = new URLSearchParams({
    originLocationCode: params.origin,
    destinationLocationCode: params.destination,
    departureDate: params.departureDate,
    adults: params.adults.toString(),
    currencyCode: 'USD',
    max: '20',
  });

  if (params.returnDate) {
    searchParams.append('returnDate', params.returnDate);
  }

  if (params.children > 0) {
    searchParams.append('children', params.children.toString());
  }

  if (params.maxPrice) {
    searchParams.append('maxPrice', params.maxPrice.toString());
  }

  // Add travel class filter (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST)
  if (params.travelClass) {
    searchParams.append('travelClass', params.travelClass);
  }

  const response = await fetchWithTimeout(
    `${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    AMADEUS_TIMEOUT
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Amadeus flight search error:', JSON.stringify(errorData, null, 2));

    // Invalidate cached token on 401 so next request will re-authenticate
    if (response.status === 401) {
      cachedToken = null;
    }

    // Extract meaningful error message from Amadeus response
    const errorMessage = errorData?.errors?.[0]?.detail ||
                         errorData?.errors?.[0]?.title ||
                         response.statusText;

    // Distinguish between client errors (bad params) and server errors
    if (response.status >= 400 && response.status < 500) {
      throw new Error(`Flight search failed - invalid request: ${errorMessage}`);
    } else {
      throw new Error(`Flight search failed - service error: ${errorMessage}`);
    }
  }

  let data: AmadeusFlightResponse;
  try {
    data = await response.json();
  } catch (parseError) {
    console.error('Amadeus flight search - failed to parse JSON response:', parseError);
    throw new Error('Flight search failed - invalid response format');
  }

  // Validate response structure
  if (!data || !Array.isArray(data.data)) {
    console.error('Amadeus flight search - unexpected response structure:', data);
    throw new Error('Flight search failed - unexpected response format');
  }

  // Exchange rates for currency conversion (same as hotels)
  const exchangeRates: Record<string, number> = {
    USD: 1,
    EUR: 1.08,
    GBP: 1.27,
    JPY: 0.0067,
    CNY: 0.14,
    KRW: 0.00075,
    THB: 0.028,
    AUD: 0.65,
    CAD: 0.74,
    SGD: 0.74,
    HKD: 0.13,
  };

  return data.data.map((offer) => {
    const outbound = offer.itineraries[0];
    const firstSegment = outbound.segments[0];
    const lastSegment = outbound.segments[outbound.segments.length - 1];
    const carrierCode = firstSegment.carrierCode;
    const carrierName = data.dictionaries?.carriers?.[carrierCode] || carrierCode;

    // Convert price to USD
    const rawPrice = parseFloat(offer.price.total);
    const currency = offer.price.currency;
    const exchangeRate = exchangeRates[currency] || 1;
    const priceInUSD = rawPrice * exchangeRate;

    return {
      id: offer.id,
      airline: carrierName,
      airlineLogo: `https://pics.avs.io/200/80/${carrierCode}.png`,
      flightNumber: `${carrierCode}${firstSegment.number}`,
      departureAirport: firstSegment.departure.iataCode,
      departureCity: firstSegment.departure.iataCode,
      departureTime: firstSegment.departure.at,
      arrivalAirport: lastSegment.arrival.iataCode,
      arrivalCity: lastSegment.arrival.iataCode,
      arrivalTime: lastSegment.arrival.at,
      duration: outbound.duration,
      stops: outbound.segments.length - 1,
      price: priceInUSD,
      currency: 'USD',
      cabinClass: offer.travelerPricings[0]?.fareDetailsBySegment[0]?.cabin || 'ECONOMY',
    };
  });
}

// Search for round trip flights - returns combined outbound + return with total price
export async function searchRoundTripFlights(
  params: FlightSearchParams & { returnDate: string; travelClass?: string }
): Promise<RoundTripFlight[]> {
  const token = await getAccessToken();

  const searchParams = new URLSearchParams({
    originLocationCode: params.origin,
    destinationLocationCode: params.destination,
    departureDate: params.departureDate,
    returnDate: params.returnDate,
    adults: params.adults.toString(),
    currencyCode: 'USD',
    max: '20',
  });

  if (params.children > 0) {
    searchParams.append('children', params.children.toString());
  }

  // Add travel class filter (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST)
  if (params.travelClass) {
    searchParams.append('travelClass', params.travelClass);
  }

  const response = await fetchWithTimeout(
    `${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    AMADEUS_TIMEOUT
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Amadeus round trip flight search error:', JSON.stringify(errorData, null, 2));

    // Invalidate cached token on 401 so next request will re-authenticate
    if (response.status === 401) {
      cachedToken = null;
    }

    const errorMessage = errorData?.errors?.[0]?.detail ||
                         errorData?.errors?.[0]?.title ||
                         response.statusText;
    throw new Error(`Round trip flight search failed: ${errorMessage}`);
  }

  let data: AmadeusFlightResponse;
  try {
    data = await response.json();
  } catch (parseError) {
    console.error('Amadeus round trip flight search - failed to parse JSON response:', parseError);
    throw new Error('Round trip flight search failed - invalid response format');
  }

  // Validate response structure
  if (!data || !Array.isArray(data.data)) {
    console.error('Amadeus round trip flight search - unexpected response structure:', data);
    throw new Error('Round trip flight search failed - unexpected response format');
  }

  // Exchange rates for currency conversion
  const exchangeRates: Record<string, number> = {
    USD: 1, EUR: 1.08, GBP: 1.27, JPY: 0.0067, CNY: 0.14,
    KRW: 0.00075, THB: 0.028, AUD: 0.65, CAD: 0.74, SGD: 0.74, HKD: 0.13,
  };

  return data.data
    .filter(offer => offer.itineraries.length >= 2) // Only round trips
    .map((offer) => {
      const outboundItinerary = offer.itineraries[0];
      const returnItinerary = offer.itineraries[1];

      // Convert total price to USD
      const rawPrice = parseFloat(offer.price.total);
      const currency = offer.price.currency;
      const exchangeRate = exchangeRates[currency] || 1;
      const totalPriceUSD = rawPrice * exchangeRate;

      // Define itinerary types locally
      interface FlightItinerary {
        segments: Array<{
          carrierCode: string;
          number: string;
          departure: { iataCode: string; at: string };
          arrival: { iataCode: string; at: string };
        }>;
        duration: string;
      }
      interface FlightDictionaries {
        carriers?: Record<string, string>;
      }

      const mapItinerary = (itinerary: FlightItinerary, dictionaries: FlightDictionaries | undefined) => {
        const firstSegment = itinerary.segments[0];
        const lastSegment = itinerary.segments[itinerary.segments.length - 1];
        const carrierCode = firstSegment.carrierCode;
        const carrierName = dictionaries?.carriers?.[carrierCode] || carrierCode;

        return {
          id: `${offer.id}-${firstSegment.departure.iataCode}`,
          airline: carrierName,
          airlineLogo: `https://pics.avs.io/200/80/${carrierCode}.png`,
          flightNumber: `${carrierCode}${firstSegment.number}`,
          departureAirport: firstSegment.departure.iataCode,
          departureCity: firstSegment.departure.iataCode,
          departureTime: firstSegment.departure.at,
          arrivalAirport: lastSegment.arrival.iataCode,
          arrivalCity: lastSegment.arrival.iataCode,
          arrivalTime: lastSegment.arrival.at,
          duration: itinerary.duration,
          stops: itinerary.segments.length - 1,
          price: totalPriceUSD / 2, // Split for display, but total is what matters
          currency: 'USD',
          cabinClass: offer.travelerPricings[0]?.fareDetailsBySegment[0]?.cabin || 'ECONOMY',
        };
      };

      return {
        id: offer.id,
        outbound: mapItinerary(outboundItinerary, data.dictionaries),
        return: mapItinerary(returnItinerary, data.dictionaries),
        totalPrice: totalPriceUSD,
        currency: 'USD',
      };
    });
}

export async function searchHotels(
  params: HotelSearchParams & {
    destinationLat?: number;
    destinationLng?: number;
  }
): Promise<Hotel[]> {
  const token = await getAccessToken();

  // First, get hotel list for the city
  const hotelListParams = new URLSearchParams({
    cityCode: params.cityCode,
    radius: '50',
    radiusUnit: 'KM',
    hotelSource: 'ALL',
  });

  const hotelListResponse = await fetchWithTimeout(
    `${AMADEUS_BASE_URL}/v1/reference-data/locations/hotels/by-city?${hotelListParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    AMADEUS_TIMEOUT
  );

  if (!hotelListResponse.ok) {
    // Invalidate cached token on 401 so next request will re-authenticate
    if (hotelListResponse.status === 401) {
      cachedToken = null;
    }
    const errorText = await hotelListResponse.text();
    console.error('Hotel list search failed:', errorText);
    throw new Error(`Hotel list search failed: ${errorText}`);
  }

  const hotelListData = await hotelListResponse.json();
  const totalHotelsInCity = hotelListData.data?.length || 0;
  // Get more hotel IDs to increase chances of finding available offers
  interface HotelListItem { hotelId: string }
  const hotelIds = (hotelListData.data as HotelListItem[] | undefined)?.slice(0, 50).map((h) => h.hotelId) || [];

  if (hotelIds.length === 0) {
    console.error('No hotels found in city:', params.cityCode);
    return [];
  }

  // Then get offers for those hotels
  const offersParams = new URLSearchParams({
    hotelIds: hotelIds.join(','),
    checkInDate: params.checkInDate,
    checkOutDate: params.checkOutDate,
    adults: params.adults.toString(),
    currency: 'USD',
  });

  const offersResponse = await fetchWithTimeout(
    `${AMADEUS_BASE_URL}/v3/shopping/hotel-offers?${offersParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    AMADEUS_TIMEOUT
  );

  if (!offersResponse.ok) {
    // Invalidate cached token on 401 so next request will re-authenticate
    if (offersResponse.status === 401) {
      cachedToken = null;
    }
    const errorText = await offersResponse.text();
    console.error('Hotel offers search failed:', errorText);
    throw new Error(`Hotel offers search failed: ${errorText}`);
  }

  const offersData: AmadeusHotelResponse = await offersResponse.json();

  // Check if data exists
  if (!offersData.data || !Array.isArray(offersData.data) || offersData.data.length === 0) {
    console.error('No hotel offers data returned from Amadeus');
    return [];
  }

  const nights = Math.max(1, Math.ceil(
    (new Date(params.checkOutDate).getTime() - new Date(params.checkInDate).getTime()) /
      (1000 * 60 * 60 * 24)
  ));

  // Get exchange rates from centralized service (with API fetch and caching)
  const exchangeRates = getExchangeRatesSync();

  let hotels = offersData.data.map((offer) => {
    const hotel = offer.hotel;
    const rawPrice = parseFloat(offer.offers[0]?.price.total || '0');
    const currency = offer.offers[0]?.price.currency || 'USD';

    // Convert to USD for consistent filtering/display
    const exchangeRate = exchangeRates[currency];
    if (!exchangeRate && currency !== 'USD') {
    }
    const priceInUSD = rawPrice * (exchangeRate || 1);

    // Calculate actual distance to destination center
    // Validate coordinates before calculating distance
    const hotelLat = hotel.latitude || 0;
    const hotelLng = hotel.longitude || 0;
    const hasValidHotelCoords = hotelLat !== 0 && hotelLng !== 0 &&
      Math.abs(hotelLat) <= 90 && Math.abs(hotelLng) <= 180;
    const hasValidDestCoords = params.destinationLat && params.destinationLng &&
      Math.abs(params.destinationLat) <= 90 && Math.abs(params.destinationLng) <= 180;

    const distanceToCenter = (hasValidDestCoords && hasValidHotelCoords && params.destinationLat !== undefined && params.destinationLng !== undefined)
      ? calculateHaversineDistance(params.destinationLat, params.destinationLng, hotelLat, hotelLng)
      : 0;

    return {
      id: hotel.hotelId,
      name: hotel.name,
      address: hotel.address?.lines?.join(', ') || hotel.address?.cityName || '',
      city: hotel.address?.cityName || params.cityCode,
      stars: parseInt(hotel.rating) || 3,
      pricePerNight: priceInUSD / nights,
      totalPrice: priceInUSD,
      currency: 'USD', // Always return USD after conversion
      imageUrl: hotel.media?.[0]?.uri || getHotelFallbackImage(hotel.name),
      amenities: hotel.amenities || [],
      distanceToCenter,
      latitude: hotelLat,
      longitude: hotelLng,
    };
  });

  // Filter by distance if coordinates provided (max 100km from destination)
  if (params.destinationLat && params.destinationLng) {
    const beforeCount = hotels.length;
    hotels = filterByDistance(
      hotels,
      (h) => ({ lat: h.latitude, lng: h.longitude }),
      { lat: params.destinationLat, lng: params.destinationLng },
      100 // Max 100km from destination
    );
  }

  return hotels;
}

// Get hotel list for a city with names (for matching Reddit hotels)
export async function getHotelListByCity(cityCode: string): Promise<
  { hotelId: string; name: string; latitude?: number; longitude?: number }[]
> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    cityCode,
    radius: '100',
    radiusUnit: 'KM',
    hotelSource: 'ALL',
  });

  const response = await fetchWithTimeout(
    `${AMADEUS_BASE_URL}/v1/reference-data/locations/hotels/by-city?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    AMADEUS_TIMEOUT
  );

  if (!response.ok) {
    if (response.status === 401) {
      cachedToken = null;
    }
    console.error('Failed to get hotel list:', await response.text());
    return [];
  }

  interface HotelData {
    hotelId: string;
    name: string;
    geoCode?: { latitude?: number; longitude?: number };
  }

  const data = await response.json();
  return ((data.data || []) as HotelData[]).map((h) => ({
    hotelId: h.hotelId,
    name: h.name,
    latitude: h.geoCode?.latitude,
    longitude: h.geoCode?.longitude,
  }));
}

// Get hotel list by coordinates (better for finding hotels in specific locations)
export async function getHotelListByGeocode(lat: number, lng: number, radiusKm: number = 50): Promise<
  { hotelId: string; name: string; latitude?: number; longitude?: number }[]
> {
  // Validate coordinates before making API call
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng) ||
      Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    console.error(`Invalid coordinates for hotel geocode search: lat=${lat}, lng=${lng}`);
    return [];
  }

  const token = await getAccessToken();

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    radius: radiusKm.toString(),
    radiusUnit: 'KM',
    hotelSource: 'ALL',
  });

  const response = await fetchWithTimeout(
    `${AMADEUS_BASE_URL}/v1/reference-data/locations/hotels/by-geocode?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    AMADEUS_TIMEOUT
  );

  if (!response.ok) {
    if (response.status === 401) {
      cachedToken = null;
    }
    console.error('Failed to get hotel list by geocode:', await response.text());
    return [];
  }

  interface HotelGeoData {
    hotelId: string;
    name: string;
    geoCode?: { latitude?: number; longitude?: number };
  }

  const data = await response.json();
  return ((data.data || []) as HotelGeoData[]).map((h) => ({
    hotelId: h.hotelId,
    name: h.name,
    latitude: h.geoCode?.latitude,
    longitude: h.geoCode?.longitude,
  }));
}

// Fuzzy match hotel name to Amadeus hotel list
function fuzzyMatchHotel(
  searchName: string,
  hotelList: { hotelId: string; name: string }[]
): { hotelId: string; name: string; score: number } | null {
  const searchLower = searchName.toLowerCase().trim();
  const searchWords = searchLower.split(/\s+/);

  let bestMatch: { hotelId: string; name: string; score: number } | null = null;

  for (const hotel of hotelList) {
    const hotelLower = hotel.name.toLowerCase();
    let score = 0;

    // Exact match
    if (hotelLower === searchLower) {
      return { ...hotel, score: 100 };
    }

    // Check if search name is contained in hotel name or vice versa
    if (hotelLower.includes(searchLower)) {
      score = 80;
    } else if (searchLower.includes(hotelLower)) {
      score = 75;
    } else {
      // Word-based matching
      let matchedWords = 0;
      for (const word of searchWords) {
        if (word.length > 2 && hotelLower.includes(word)) {
          matchedWords++;
        }
      }
      score = (matchedWords / searchWords.length) * 60;
    }

    // Boost for matching key words
    const keyWords = ['marriott', 'hilton', 'hyatt', 'sheraton', 'westin', 'ritz', 'four seasons', 'aman', 'rosewood', 'waldorf', 'conrad', 'intercontinental'];
    for (const key of keyWords) {
      if (searchLower.includes(key) && hotelLower.includes(key)) {
        score += 15;
        break;
      }
    }

    if (score > 50 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { ...hotel, score };
    }
  }

  return bestMatch;
}

// Get prices for specific hotels by ID
export async function getHotelPricesByIds(
  hotelIds: string[],
  checkInDate: string,
  checkOutDate: string,
  adults: number = 2
): Promise<Map<string, { pricePerNight: number; totalPrice: number; currency: string }>> {
  if (hotelIds.length === 0) return new Map();

  const token = await getAccessToken();

  const params = new URLSearchParams({
    hotelIds: hotelIds.slice(0, 20).join(','), // Amadeus limits to ~20 hotels per request
    checkInDate,
    checkOutDate,
    adults: adults.toString(),
    currency: 'USD',
  });

  const response = await fetchWithTimeout(
    `${AMADEUS_BASE_URL}/v3/shopping/hotel-offers?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    AMADEUS_TIMEOUT
  );

  if (!response.ok) {
    if (response.status === 401) {
      cachedToken = null;
    }
    console.error('Failed to get hotel prices:', await response.text());
    return new Map();
  }

  const data = await response.json();
  const priceMap = new Map<string, { pricePerNight: number; totalPrice: number; currency: string }>();

  const nights = Math.max(1, Math.ceil(
    (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
  ));

  const exchangeRates: Record<string, number> = {
    USD: 1, EUR: 1.08, GBP: 1.27, JPY: 0.0067, CNY: 0.14,
    KRW: 0.00075, THB: 0.028, AUD: 0.65, CAD: 0.74, SGD: 0.74, HKD: 0.13,
  };

  for (const offer of data.data || []) {
    const hotelId = offer.hotel.hotelId;
    const rawPrice = parseFloat(offer.offers[0]?.price.total || '0');
    const currency = offer.offers[0]?.price.currency || 'USD';
    const exchangeRate = exchangeRates[currency] || 1;
    const totalPrice = rawPrice * exchangeRate;

    priceMap.set(hotelId, {
      pricePerNight: totalPrice / nights,
      totalPrice,
      currency: 'USD',
    });
  }

  return priceMap;
}

// Match Reddit hotels to Amadeus and get real prices
// Uses hotel coordinates to search nearby Amadeus hotels
export async function getAmadeusPricesForHotels(
  hotels: Array<{ name: string; lat?: number; lng?: number }>,
  fallbackCityCode: string,
  checkInDate: string,
  checkOutDate: string,
  adults: number = 2
): Promise<Map<string, { pricePerNight: number; totalPrice: number; amadeusName: string }>> {
  const results = new Map<string, { pricePerNight: number; totalPrice: number; amadeusName: string }>();

  if (hotels.length === 0) return results;

  try {
    // Process each hotel individually using its coordinates
    for (const hotel of hotels) {
      let hotelList: { hotelId: string; name: string }[] = [];

      // If hotel has coordinates, search by geocode (more accurate)
      if (hotel.lat && hotel.lng) {
        hotelList = await getHotelListByGeocode(hotel.lat, hotel.lng, 30); // 30km radius
      }

      // Fall back to city code search if geocode didn't find anything
      if (hotelList.length === 0 && fallbackCityCode) {
        hotelList = await getHotelListByCity(fallbackCityCode);
      }

      if (hotelList.length === 0) {
        continue;
      }

      // Try to match the hotel name
      const match = fuzzyMatchHotel(hotel.name, hotelList);
      if (match && match.score >= 50) {

        // Get price for this hotel
        const prices = await getHotelPricesByIds([match.hotelId], checkInDate, checkOutDate, adults);
        const price = prices.get(match.hotelId);

        if (price) {
          results.set(hotel.name.toLowerCase(), {
            pricePerNight: price.pricePerNight,
            totalPrice: price.totalPrice,
            amadeusName: match.name,
          });
        }
      } else {
      }
    }

  } catch (error) {
    console.error('Amadeus price lookup error:', error);
  }

  return results;
}

// ============ MULTI-CITY HOTEL INVENTORY ============

// Basic hotel info from the hotel list endpoint (no prices)
export interface HotelBasicInfo {
  hotelId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  distanceFromCenter?: number;
}

// Hotel offer with pricing from the offers endpoint
export interface HotelOffer {
  hotelId: string;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  rooms?: {
    type: string;
    description: string;
    price: number;
  }[];
}

// Chunk an array into batches
function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Get FULL hotel inventory for a destination (searches all city codes)
 * Returns basic info only (no prices) - for complete hotel list
 */
export async function getFullHotelInventory(
  config: DestinationConfig
): Promise<HotelBasicInfo[]> {
  const allHotels: HotelBasicInfo[] = [];
  const seen = new Set<string>();

  // Search each city code
  for (const cityCode of config.cityCodes) {
    try {
      const hotels = await getHotelListByCity(cityCode);

      for (const hotel of hotels) {
        // Skip duplicates
        if (seen.has(hotel.hotelId)) continue;
        seen.add(hotel.hotelId);

        // Filter by distance from center if we have coordinates
        if (hotel.latitude && hotel.longitude) {
          const distance = calculateHaversineDistance(
            config.centerLat,
            config.centerLng,
            hotel.latitude,
            hotel.longitude
          );

          if (distance > config.searchRadiusKm) {
            continue;
          }

          allHotels.push({
            ...hotel,
            distanceFromCenter: distance,
          });
        } else {
          // Include hotels without coordinates (can't filter by distance)
          allHotels.push(hotel);
        }
      }
    } catch (error) {
      console.error(`Error fetching hotels for ${cityCode}:`, error);
    }
  }

  // Sort by distance from center (closest first)
  allHotels.sort((a, b) => {
    const distA = a.distanceFromCenter ?? 999;
    const distB = b.distanceFromCenter ?? 999;
    return distA - distB;
  });

  return allHotels;
}

/**
 * Get prices for multiple hotels in batches
 * Amadeus limits to ~20 hotels per request, so we batch
 */
export async function getHotelOffersBatch(
  hotelIds: string[],
  checkInDate: string,
  checkOutDate: string,
  adults: number = 2
): Promise<Map<string, HotelOffer>> {
  const results = new Map<string, HotelOffer>();

  if (hotelIds.length === 0) return results;

  // Amadeus limits to ~20 hotels per request
  const BATCH_SIZE = 20;
  const batches = chunk(hotelIds, BATCH_SIZE);

  const nights = Math.ceil(
    (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  for (const batch of batches) {
    try {
      const priceMap = await getHotelPricesByIds(batch, checkInDate, checkOutDate, adults);

      priceMap.forEach((price, hotelId) => {
        results.set(hotelId, {
          hotelId,
          pricePerNight: price.pricePerNight,
          totalPrice: price.totalPrice,
          currency: price.currency,
        });
      });
    } catch (error) {
      console.error('Error in hotel price batch:', error);
    }
  }

  return results;
}

/**
 * Combined function: Get inventory + prices + merge
 * Returns hotels with prices where available, estimates for others
 */
export async function getHotelsWithPricing(
  config: DestinationConfig,
  checkInDate: string,
  checkOutDate: string,
  adults: number = 2,
  maxPricingRequests: number = 100
): Promise<{
  hotels: (HotelBasicInfo & {
    hasRealPrice: boolean;
    pricePerNight?: number;
    totalPrice?: number;
    estimatedPrice?: number;
  })[];
  totalCount: number;
  withPricing: number;
}> {
  // Step 1: Get full inventory
  const inventory = await getFullHotelInventory(config);

  if (inventory.length === 0) {
    return { hotels: [], totalCount: 0, withPricing: 0 };
  }

  // Step 2: Get prices for first N hotels (prioritize closest)
  const hotelIdsForPricing = inventory
    .slice(0, maxPricingRequests)
    .map((h) => h.hotelId);

  const priceMap = await getHotelOffersBatch(
    hotelIdsForPricing,
    checkInDate,
    checkOutDate,
    adults
  );

  // Step 3: Merge inventory with prices
  const hotels = inventory.map((hotel) => {
    const price = priceMap.get(hotel.hotelId);
    return {
      ...hotel,
      hasRealPrice: !!price,
      pricePerNight: price?.pricePerNight,
      totalPrice: price?.totalPrice,
      // Estimate price based on name patterns if no real price
      estimatedPrice: price?.pricePerNight || estimatePriceByHotelName(hotel.name),
    };
  });

  return {
    hotels,
    totalCount: inventory.length,
    withPricing: priceMap.size,
  };
}

/**
 * Estimate hotel price based on name patterns (luxury brands = higher price)
 */
function estimatePriceByHotelName(name: string): number {
  const nameLower = name.toLowerCase();

  // Ultra luxury: $800+
  const ultraLuxury = ['aman', 'rosewood', 'four seasons', 'mandarin oriental', 'peninsula'];
  if (ultraLuxury.some((brand) => nameLower.includes(brand))) {
    return 800 + Math.floor(Math.random() * 400);
  }

  // Luxury: $400-600
  const luxury = [
    'ritz', 'waldorf', 'st regis', 'st. regis', 'park hyatt', 'conrad',
    'edition', 'w hotel', 'jw marriott', 'intercontinental', 'fairmont',
    'sofitel', 'eden roc', 'banyan tree', 'six senses', 'shangri-la'
  ];
  if (luxury.some((brand) => nameLower.includes(brand))) {
    return 400 + Math.floor(Math.random() * 200);
  }

  // Upper upscale: $250-400
  const upperUpscale = [
    'marriott', 'hilton', 'hyatt', 'sheraton', 'westin', 'le meridien',
    'doubletree', 'embassy suites', 'andaz', 'thompson', 'kimpton'
  ];
  if (upperUpscale.some((brand) => nameLower.includes(brand))) {
    return 250 + Math.floor(Math.random() * 150);
  }

  // Resort keyword
  if (nameLower.includes('resort') || nameLower.includes('spa')) {
    return 200 + Math.floor(Math.random() * 200);
  }

  // Budget brands: $80-150
  const budget = ['holiday inn', 'hampton', 'best western', 'comfort', 'la quinta', 'motel'];
  if (budget.some((brand) => nameLower.includes(brand))) {
    return 80 + Math.floor(Math.random() * 70);
  }

  // Default mid-range: $150-250
  return 150 + Math.floor(Math.random() * 100);
}

export async function getAirportAutocomplete(query: string): Promise<
  { iataCode: string; name: string; cityName: string }[]
> {
  if (!query || query.length < 2) return [];

  const token = await getAccessToken();

  const response = await fetchWithTimeout(
    `${AMADEUS_BASE_URL}/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${encodeURIComponent(
      query
    )}&page%5Blimit%5D=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    AMADEUS_TIMEOUT
  );

  if (!response.ok) {
    if (response.status === 401) {
      cachedToken = null;
    }
    return [];
  }

  interface LocationData {
    iataCode: string;
    name: string;
    address?: { cityName?: string };
  }

  const data = await response.json();

  return ((data.data || []) as LocationData[]).map((loc) => ({
    iataCode: loc.iataCode,
    name: loc.name,
    cityName: loc.address?.cityName || loc.name,
  }));
}
