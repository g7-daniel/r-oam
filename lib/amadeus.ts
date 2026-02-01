import type {
  AmadeusTokenResponse,
  AmadeusFlightResponse,
  AmadeusHotelResponse,
  Flight,
  Hotel,
  FlightSearchParams,
  HotelSearchParams,
} from '@/types';
import { filterByDistance } from '@/lib/utils/geo';

const AMADEUS_BASE_URL = 'https://test.api.amadeus.com';

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

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Amadeus credentials not configured');
  }

  const response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Amadeus token: ${response.statusText}`);
  }

  const data: AmadeusTokenResponse = await response.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
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

  const response = await fetch(
    `${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Amadeus flight search error:', JSON.stringify(errorData, null, 2));

    // Extract meaningful error message from Amadeus response
    const errorMessage = errorData?.errors?.[0]?.detail ||
                         errorData?.errors?.[0]?.title ||
                         response.statusText;
    throw new Error(`Flight search failed: ${errorMessage}`);
  }

  const data: AmadeusFlightResponse = await response.json();

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

    console.log(`Flight ${carrierCode}${firstSegment.number}: ${currency} ${rawPrice} = USD ${priceInUSD.toFixed(2)}`);

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

  const response = await fetch(
    `${AMADEUS_BASE_URL}/v2/shopping/flight-offers?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Amadeus round trip flight search error:', JSON.stringify(errorData, null, 2));
    const errorMessage = errorData?.errors?.[0]?.detail ||
                         errorData?.errors?.[0]?.title ||
                         response.statusText;
    throw new Error(`Round trip flight search failed: ${errorMessage}`);
  }

  const data: AmadeusFlightResponse = await response.json();

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

      const mapItinerary = (itinerary: any, dictionaries: any) => {
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

      console.log(`Round trip ${offer.id}: ${currency} ${rawPrice} = USD ${totalPriceUSD.toFixed(2)} total`);

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

  const hotelListResponse = await fetch(
    `${AMADEUS_BASE_URL}/v1/reference-data/locations/hotels/by-city?${hotelListParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!hotelListResponse.ok) {
    const errorText = await hotelListResponse.text();
    console.error('Hotel list search failed:', errorText);
    throw new Error(`Hotel list search failed: ${errorText}`);
  }

  const hotelListData = await hotelListResponse.json();
  const totalHotelsInCity = hotelListData.data?.length || 0;
  // Get more hotel IDs to increase chances of finding available offers
  const hotelIds = hotelListData.data?.slice(0, 50).map((h: any) => h.hotelId) || [];

  console.log(`Amadeus hotel list: ${totalHotelsInCity} hotels found in ${params.cityCode}, checking ${hotelIds.length} for availability`);

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

  const offersResponse = await fetch(
    `${AMADEUS_BASE_URL}/v3/shopping/hotel-offers?${offersParams}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!offersResponse.ok) {
    const errorText = await offersResponse.text();
    console.error('Hotel offers search failed:', errorText);
    throw new Error(`Hotel offers search failed: ${errorText}`);
  }

  const offersData: AmadeusHotelResponse = await offersResponse.json();

  // Check if data exists
  console.log(`Amadeus offers: ${offersData.data?.length || 0} hotels have availability (sandbox limitation - production has more)`);
  if (!offersData.data || !Array.isArray(offersData.data) || offersData.data.length === 0) {
    console.error('No hotel offers data returned from Amadeus');
    return [];
  }

  const nights = Math.ceil(
    (new Date(params.checkOutDate).getTime() - new Date(params.checkInDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Approximate exchange rates to USD (for display purposes)
  const exchangeRates: Record<string, number> = {
    USD: 1,
    EUR: 1.08,
    GBP: 1.27,
    JPY: 0.0067,  // 1 JPY = ~0.0067 USD
    CNY: 0.14,
    KRW: 0.00075,
    THB: 0.028,
    AUD: 0.65,
    CAD: 0.74,
    SGD: 0.74,
    HKD: 0.13,
  };

  let hotels = offersData.data.map((offer) => {
    const hotel = offer.hotel;
    const rawPrice = parseFloat(offer.offers[0]?.price.total || '0');
    const currency = offer.offers[0]?.price.currency || 'USD';

    // Convert to USD for consistent filtering/display
    const exchangeRate = exchangeRates[currency] || 1;
    const priceInUSD = rawPrice * exchangeRate;

    console.log(`Hotel ${hotel.name}: ${currency} ${rawPrice} = USD ${priceInUSD.toFixed(2)} (${nights} nights)`);

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
      distanceToCenter: Math.random() * 5,
      latitude: hotel.latitude || 0,
      longitude: hotel.longitude || 0,
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
    console.log(`Amadeus: Filtered ${beforeCount} -> ${hotels.length} hotels by distance (100km max)`);
  }

  return hotels;
}

export async function getAirportAutocomplete(query: string): Promise<
  { iataCode: string; name: string; cityName: string }[]
> {
  if (!query || query.length < 2) return [];

  const token = await getAccessToken();

  const response = await fetch(
    `${AMADEUS_BASE_URL}/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${encodeURIComponent(
      query
    )}&page%5Blimit%5D=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  return data.data?.map((loc: any) => ({
    iataCode: loc.iataCode,
    name: loc.name,
    cityName: loc.address?.cityName || loc.name,
  })) || [];
}
