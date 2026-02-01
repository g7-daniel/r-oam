import { NextRequest, NextResponse } from 'next/server';
import {
  getFullHotelInventory,
  getHotelOffersBatch,
  getHotelListByGeocode,
  HotelBasicInfo,
} from '@/lib/amadeus';
import { searchPlaces, getPhotoUrl, searchHotelsGoogle } from '@/lib/google-maps';
import { getDestinationConfig, DestinationConfig } from '@/lib/configs/destinations';
import { calculateHaversineDistance } from '@/lib/utils/geo';

// Estimate price based on hotel name patterns
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

// Detect luxury hotel by name
function isLuxuryHotel(name: string): boolean {
  const nameLower = name.toLowerCase();
  const luxuryBrands = [
    'aman', 'rosewood', 'four seasons', 'mandarin oriental', 'peninsula',
    'ritz', 'waldorf', 'st regis', 'st. regis', 'park hyatt', 'conrad',
    'edition', 'w hotel', 'jw marriott', 'intercontinental', 'fairmont',
    'sofitel', 'eden roc', 'banyan tree', 'six senses', 'shangri-la',
    'langham', 'raffles', 'belmond', 'one&only', 'aman'
  ];
  return luxuryBrands.some((brand) => nameLower.includes(brand));
}

// Get star rating based on hotel name
function getStarRating(name: string): number {
  const nameLower = name.toLowerCase();

  // 5 stars - Ultra luxury
  const fiveStars = [
    'aman', 'rosewood', 'four seasons', 'mandarin oriental', 'peninsula',
    'ritz', 'waldorf', 'st regis', 'st. regis', 'park hyatt'
  ];
  if (fiveStars.some((brand) => nameLower.includes(brand))) return 5;

  // 4-5 stars - Luxury
  const fourFiveStars = [
    'conrad', 'edition', 'w hotel', 'jw marriott', 'intercontinental',
    'fairmont', 'sofitel', 'eden roc', 'banyan tree', 'six senses',
    'shangri-la', 'langham', 'raffles', 'belmond'
  ];
  if (fourFiveStars.some((brand) => nameLower.includes(brand))) return 5;

  // 4 stars - Upper upscale
  const fourStars = [
    'marriott', 'hilton', 'hyatt', 'sheraton', 'westin', 'le meridien',
    'doubletree', 'embassy suites', 'andaz', 'thompson', 'kimpton'
  ];
  if (fourStars.some((brand) => nameLower.includes(brand))) return 4;

  // Resort typically 4 stars
  if (nameLower.includes('resort')) return 4;

  // 3 stars - Mid-range
  const threeStars = ['courtyard', 'holiday inn', 'hampton', 'best western'];
  if (threeStars.some((brand) => nameLower.includes(brand))) return 3;

  // 2 stars - Budget
  const twoStars = ['motel', 'lodge', 'inn'];
  if (twoStars.some((brand) => nameLower.includes(brand))) return 2;

  // Default 3-4 stars
  return Math.random() > 0.5 ? 4 : 3;
}

// Enhanced hotel type after merging all data
interface EnhancedHotel {
  id: string;
  name: string;
  address: string;
  city: string;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  imageUrl: string | null;
  amenities: string[];
  distanceToCenter: number;
  latitude: number;
  longitude: number;
  guestRating: number | null;
  reviewCount: number | null;
  source: string;
  hasRealPricing: boolean;
  isLuxury: boolean;
  needsEnhancement?: boolean;
}

// Google Places enhancement for photos/ratings
async function enhanceWithGooglePlaces(
  hotels: HotelBasicInfo[],
  destination: string,
  batchSize: number = 50
): Promise<Map<string, { imageUrl: string | null; rating: number | null; reviewCount: number | null }>> {
  const enhancements = new Map<string, { imageUrl: string | null; rating: number | null; reviewCount: number | null }>();

  // Limit to batchSize to avoid rate limits
  const hotelsToEnhance = hotels.slice(0, batchSize);

  // Process in parallel with concurrency limit
  const CONCURRENCY = 10;
  for (let i = 0; i < hotelsToEnhance.length; i += CONCURRENCY) {
    const batch = hotelsToEnhance.slice(i, i + CONCURRENCY);

    const results = await Promise.all(
      batch.map(async (hotel) => {
        try {
          const places = await searchPlaces(`${hotel.name} hotel ${destination}`);
          const place = places[0];

          if (place) {
            return {
              hotelId: hotel.hotelId,
              imageUrl: place.photos?.[0]?.photo_reference
                ? getPhotoUrl(place.photos[0].photo_reference)
                : null,
              rating: place.rating || null,
              reviewCount: place.user_ratings_total || null,
            };
          }
          return { hotelId: hotel.hotelId, imageUrl: null, rating: null, reviewCount: null };
        } catch {
          return { hotelId: hotel.hotelId, imageUrl: null, rating: null, reviewCount: null };
        }
      })
    );

    for (const result of results) {
      enhancements.set(result.hotelId, {
        imageUrl: result.imageUrl,
        rating: result.rating,
        reviewCount: result.reviewCount,
      });
    }
  }

  console.log(`Enhanced ${enhancements.size} hotels with Google Places data`);
  return enhancements;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const destination = params.get('destination') || params.get('cityName');
  const checkInDate = params.get('checkInDate');
  const checkOutDate = params.get('checkOutDate');
  const adults = parseInt(params.get('adults') || '2', 10);
  const lat = params.get('lat') ? parseFloat(params.get('lat')!) : undefined;
  const lng = params.get('lng') ? parseFloat(params.get('lng')!) : undefined;

  // Validate required params
  if (!checkInDate || !checkOutDate) {
    return NextResponse.json(
      { error: 'Missing required parameters: checkInDate, checkOutDate' },
      { status: 400 }
    );
  }

  if (!destination && (!lat || !lng)) {
    return NextResponse.json(
      { error: 'Missing required parameters: destination or (lat + lng)' },
      { status: 400 }
    );
  }

  // Validate dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkIn = new Date(checkInDate);

  if (checkIn < today) {
    return NextResponse.json(
      { error: `Check-in date ${checkInDate} is in the past. Please select a future date.` },
      { status: 400 }
    );
  }

  // Calculate nights
  const nights = Math.ceil(
    (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  console.log('Hotel search params:', {
    destination,
    checkInDate,
    checkOutDate,
    adults,
    lat,
    lng,
  });

  // Step 1: Get destination config
  let config: DestinationConfig | null = destination ? getDestinationConfig(destination) : null;

  // Fallback: create config from coordinates if no match
  if (!config && lat && lng) {
    console.log('No destination config found, using geocode fallback');
    config = {
      type: 'region',
      cityCodes: [], // Will use geocode search
      centerLat: lat,
      centerLng: lng,
      searchRadiusKm: 100,
    };
  }

  if (!config) {
    return NextResponse.json(
      { error: `Unknown destination: ${destination}. Try providing coordinates (lat/lng).` },
      { status: 400 }
    );
  }

  console.log('Using destination config:', {
    type: config.type,
    cityCodes: config.cityCodes,
    center: { lat: config.centerLat, lng: config.centerLng },
    radius: config.searchRadiusKm,
  });

  // Step 2: Get full hotel inventory
  let allHotels: HotelBasicInfo[];

  if (config.cityCodes.length > 0) {
    // Use multi-city search
    allHotels = await getFullHotelInventory(config);
  } else {
    // Geocode fallback
    allHotels = await getHotelListByGeocode(
      config.centerLat,
      config.centerLng,
      config.searchRadiusKm
    );
  }

  console.log(`Step 2: Got ${allHotels.length} hotels from Amadeus`);

  // Step 2.5: Supplement with Google Places to find luxury hotels Amadeus might miss
  const googleHotels = await searchHotelsGoogle(
    destination || '',
    lat && lng ? { lat, lng } : undefined
  );
  console.log(`Step 2.5: Got ${googleHotels.length} hotels from Google Places`);

  // Convert Google hotels to our format and add non-duplicates
  const existingNames = new Set(allHotels.map(h => h.name.toLowerCase()));
  let googleAddedCount = 0;

  for (const gh of googleHotels) {
    const ghNameLower = gh.name.toLowerCase();
    // Check if already exists (fuzzy match)
    const isDuplicate = Array.from(existingNames).some(existing =>
      existing.includes(ghNameLower.slice(0, 10)) || ghNameLower.includes(existing.slice(0, 10))
    );

    if (!isDuplicate) {
      allHotels.push({
        hotelId: gh.id,
        name: gh.name,
        latitude: gh.lat,
        longitude: gh.lng,
        // Store Google-specific data for later
        _googleData: {
          imageUrl: gh.imageUrl,
          rating: gh.rating,
          reviewCount: gh.reviewCount,
          priceLevel: gh.priceLevel,
          isLuxury: gh.isLuxury,
        },
      } as HotelBasicInfo & { _googleData: any });
      existingNames.add(ghNameLower);
      googleAddedCount++;
    }
  }
  console.log(`Added ${googleAddedCount} unique hotels from Google Places`);

  if (allHotels.length === 0) {
    return NextResponse.json({
      hotels: [],
      totalCount: 0,
      withPricing: 0,
      message: 'No hotels found for this destination',
    });
  }

  // Step 3: Get prices for first 100 hotels
  const MAX_PRICING_REQUESTS = 100;
  const hotelIdsForPricing = allHotels.slice(0, MAX_PRICING_REQUESTS).map((h) => h.hotelId);

  const offers = await getHotelOffersBatch(hotelIdsForPricing, checkInDate, checkOutDate, adults);
  console.log(`Step 3: Got real prices for ${offers.size} hotels`);

  // Step 4: Enhance TOP hotels with Google Places data
  const TOP_ENHANCE_COUNT = 100;
  const hotelsToEnhance = allHotels.slice(0, TOP_ENHANCE_COUNT);
  const googleEnhancements = await enhanceWithGooglePlaces(
    hotelsToEnhance,
    destination || 'hotel',
    TOP_ENHANCE_COUNT
  );

  // Step 5: Merge everything into final hotel objects
  const finalHotels: EnhancedHotel[] = allHotels.map((hotel, index) => {
    const offer = offers.get(hotel.hotelId);
    const enhancement = googleEnhancements.get(hotel.hotelId);
    const googleData = (hotel as any)._googleData;

    // Calculate estimated price if no real price
    const estimatedPrice = estimatePriceByHotelName(hotel.name);
    const pricePerNight = offer?.pricePerNight || estimatedPrice;
    const totalPrice = offer?.totalPrice || estimatedPrice * nights;

    // Calculate distance from center
    let distanceToCenter = 0;
    if (hotel.latitude && hotel.longitude) {
      distanceToCenter = calculateHaversineDistance(
        config!.centerLat,
        config!.centerLng,
        hotel.latitude,
        hotel.longitude
      );
    }

    // Prefer Google data if available (for hotels added from Google Places)
    const imageUrl = googleData?.imageUrl || enhancement?.imageUrl || null;
    const rating = googleData?.rating || enhancement?.rating || null;
    const reviewCount = googleData?.reviewCount || enhancement?.reviewCount || null;
    const isFromGoogle = !!googleData;

    return {
      id: hotel.hotelId,
      name: hotel.name,
      address: destination || '',
      city: destination || '',
      stars: getStarRating(hotel.name),
      pricePerNight: Math.round(pricePerNight),
      totalPrice: Math.round(totalPrice),
      currency: 'USD',
      imageUrl,
      amenities: generateAmenities(hotel.name),
      distanceToCenter: Math.round(distanceToCenter * 10) / 10,
      latitude: hotel.latitude || 0,
      longitude: hotel.longitude || 0,
      guestRating: rating ? rating * 2 : null, // Convert 5-point to 10-point
      reviewCount,
      source: isFromGoogle ? 'google' : 'amadeus',
      hasRealPricing: !!offer,
      isLuxury: googleData?.isLuxury || isLuxuryHotel(hotel.name),
      needsEnhancement: index >= TOP_ENHANCE_COUNT && !isFromGoogle,
    };
  });

  // Sort: Luxury first, then by distance (for better user experience)
  finalHotels.sort((a, b) => {
    // Luxury hotels first
    if (a.isLuxury && !b.isLuxury) return -1;
    if (!a.isLuxury && b.isLuxury) return 1;
    // Then by distance
    return a.distanceToCenter - b.distanceToCenter;
  });

  console.log(`Returning ${finalHotels.length} hotels (${offers.size} with real prices)`);

  return NextResponse.json({
    hotels: finalHotels,
    totalCount: finalHotels.length,
    withPricing: offers.size,
    destination: destination,
    searchConfig: {
      type: config.type,
      cityCodes: config.cityCodes,
      radiusKm: config.searchRadiusKm,
    },
  });
}

// Generate amenities based on hotel name/type
function generateAmenities(hotelName: string): string[] {
  const nameLower = hotelName.toLowerCase();
  const amenities: string[] = ['wifi', 'air_conditioning'];

  // Luxury amenities
  if (isLuxuryHotel(hotelName)) {
    amenities.push('pool', 'spa', 'gym', 'restaurant', 'room_service', 'concierge', 'bar');
  }
  // Upper upscale
  else if (nameLower.includes('marriott') || nameLower.includes('hilton') || nameLower.includes('hyatt')) {
    amenities.push('pool', 'gym', 'restaurant', 'room_service');
  }
  // Resort
  else if (nameLower.includes('resort')) {
    amenities.push('pool', 'beach_access', 'restaurant', 'spa');
  }
  // Mid-range
  else {
    amenities.push('parking');
    if (Math.random() > 0.5) amenities.push('breakfast');
    if (Math.random() > 0.5) amenities.push('pool');
  }

  return amenities;
}
