import { NextRequest, NextResponse } from 'next/server';
import { searchHotels } from '@/lib/amadeus';
import { searchHotelsGoogle } from '@/lib/google-maps';

// City code to city name mapping for Google Places fallback
const CITY_NAMES: Record<string, string> = {
  TYO: 'Tokyo, Japan',
  NYC: 'New York City',
  LAX: 'Los Angeles',
  SFO: 'San Francisco',
  PAR: 'Paris, France',
  LON: 'London, UK',
  ROM: 'Rome, Italy',
  BCN: 'Barcelona, Spain',
  BKK: 'Bangkok, Thailand',
  SIN: 'Singapore',
  HKG: 'Hong Kong',
  DXB: 'Dubai',
  SYD: 'Sydney, Australia',
  SEL: 'Seoul, South Korea',
  SJO: 'San Jose, Costa Rica',
  MIA: 'Miami',
  CHI: 'Chicago',
  BOS: 'Boston',
  SEA: 'Seattle',
  DEN: 'Denver',
  AMS: 'Amsterdam',
  BER: 'Berlin',
  MUC: 'Munich',
  VIE: 'Vienna',
  PRG: 'Prague',
  LIS: 'Lisbon',
  MAD: 'Madrid',
  MIL: 'Milan',
  FLR: 'Florence',
  VCE: 'Venice',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const cityCode = searchParams.get('cityCode'); // Optional if lat/lng provided
  const cityName = searchParams.get('cityName'); // Required if no cityCode
  const checkInDate = searchParams.get('checkInDate');
  const checkOutDate = searchParams.get('checkOutDate');
  const adults = parseInt(searchParams.get('adults') || '1', 10);
  const maxPrice = searchParams.get('maxPrice')
    ? parseInt(searchParams.get('maxPrice')!, 10)
    : undefined;
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;

  // Require either cityCode OR (cityName + lat/lng) for search
  const hasAmadeusParams = cityCode && checkInDate && checkOutDate;
  const hasGoogleParams = cityName && lat && lng;

  if (!checkInDate || !checkOutDate) {
    return NextResponse.json(
      { error: 'Missing required parameters: checkInDate, checkOutDate' },
      { status: 400 }
    );
  }

  if (!cityCode && !hasGoogleParams) {
    return NextResponse.json(
      { error: 'Missing required parameters: cityCode or (cityName + lat + lng)' },
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

  // Calculate number of nights
  const nights = Math.ceil(
    (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  console.log('Hotel search params:', {
    cityCode,
    cityName,
    checkInDate,
    checkOutDate,
    adults,
    maxPrice,
    lat,
    lng,
  });

  const allHotels: any[] = [];

  // 1. Try Amadeus first (only if we have a city code)
  if (cityCode) {
    try {
      const amadeusHotels = await searchHotels({
        cityCode,
        checkInDate,
        checkOutDate,
        adults,
        maxPrice,
      });

      console.log('Amadeus returned', amadeusHotels.length, 'hotels');

      // Mark these as from Amadeus (have real pricing)
      amadeusHotels.forEach(h => {
        (h as any).source = 'amadeus';
        (h as any).hasRealPricing = true;
      });

      allHotels.push(...amadeusHotels);
    } catch (error) {
      console.error('Amadeus hotel search failed:', error);
    }
  } else {
    console.log('No city code provided, skipping Amadeus');
  }

  // 2. If Amadeus returned few results (or wasn't called), use Google Places
  if (allHotels.length < 10) {
    const searchCityName = cityName || CITY_NAMES[cityCode] || cityCode;
    const location = lat && lng ? { lat, lng } : undefined;

    console.log('Supplementing with Google Places for:', searchCityName);

    try {
      const googleHotels = await searchHotelsGoogle(searchCityName, location);
      console.log('Google Places returned', googleHotels.length, 'hotels');

      // Convert Google Places format to our hotel format
      const convertedGoogleHotels = googleHotels
        .filter(gh => {
          // Don't include duplicates (check by name similarity)
          const isDuplicate = allHotels.some(
            ah => ah.name.toLowerCase().includes(gh.name.toLowerCase().slice(0, 10)) ||
                  gh.name.toLowerCase().includes(ah.name.toLowerCase().slice(0, 10))
          );
          return !isDuplicate;
        })
        .map(gh => {
          // Estimate price based on price_level (0-4 scale from Google)
          // Price level: 0=Free, 1=Inexpensive, 2=Moderate, 3=Expensive, 4=Very Expensive
          const basePricePerNight = [50, 80, 150, 300, 500][gh.priceLevel] || 150;
          const priceVariation = (Math.random() * 0.4 - 0.2); // ±20% variation
          const estimatedPricePerNight = Math.round(basePricePerNight * (1 + priceVariation));

          return {
            id: gh.id,
            name: gh.name,
            address: gh.address,
            city: searchCityName,
            stars: Math.min(5, Math.max(3, Math.round(gh.rating))), // Convert rating to stars
            pricePerNight: estimatedPricePerNight,
            totalPrice: estimatedPricePerNight * nights,
            currency: 'USD',
            imageUrl: gh.imageUrl,
            amenities: ['wifi', 'air_conditioning'], // Default amenities
            distanceToCenter: Math.random() * 5,
            latitude: gh.lat,
            longitude: gh.lng,
            guestRating: gh.rating * 2, // Convert 5-point to 10-point scale
            reviewCount: gh.reviewCount,
            source: 'google',
            hasRealPricing: false, // Estimated pricing
            priceLevel: gh.priceLevel,
          };
        });

      allHotels.push(...convertedGoogleHotels);
    } catch (error) {
      console.error('Google Places hotel search failed:', error);
    }
  }

  console.log('Total hotels returned:', allHotels.length);

  return NextResponse.json(allHotels);
}
