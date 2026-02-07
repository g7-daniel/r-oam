import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findHotelsCI } from '@/lib/prisma-ci-search';
import { searchHotelsWithPagination, searchHotelsByGeocode, GooglePlaceResult } from '@/lib/google-maps';
import { BoundedSet } from '@/lib/bounded-cache';

// Track which destinations are currently being indexed (bounded to prevent memory leaks)
const indexingInProgress = new BoundedSet<string>(100, 10); // max 100 items, 10 min TTL

// Estimate star rating based on hotel name
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

  // Default 3-4 stars based on price level
  return 3;
}

// Detect luxury hotel by name
function isLuxuryHotel(name: string): boolean {
  const nameLower = name.toLowerCase();
  const luxuryBrands = [
    'aman', 'rosewood', 'four seasons', 'mandarin oriental', 'peninsula',
    'ritz', 'waldorf', 'st regis', 'st. regis', 'park hyatt', 'conrad',
    'edition', 'w hotel', 'jw marriott', 'intercontinental', 'fairmont',
    'sofitel', 'eden roc', 'banyan tree', 'six senses', 'shangri-la',
    'langham', 'raffles', 'belmond', 'one&only', 'amanera'
  ];
  return luxuryBrands.some((brand) => nameLower.includes(brand));
}

// Generate amenities based on hotel name/type
function generateAmenities(hotelName: string): string[] {
  const nameLower = hotelName.toLowerCase();
  const amenities: string[] = ['wifi', 'air_conditioning'];

  if (isLuxuryHotel(hotelName)) {
    amenities.push('pool', 'spa', 'gym', 'restaurant', 'room_service', 'concierge', 'bar');
  } else if (nameLower.includes('marriott') || nameLower.includes('hilton') || nameLower.includes('hyatt')) {
    amenities.push('pool', 'gym', 'restaurant', 'room_service');
  } else if (nameLower.includes('resort')) {
    amenities.push('pool', 'beach_access', 'restaurant', 'spa');
  } else {
    amenities.push('parking');
    if (Math.random() > 0.5) amenities.push('breakfast');
    if (Math.random() > 0.5) amenities.push('pool');
  }

  return amenities;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const destination = params.get('destination') || params.get('cityName') || '';
    const search = params.get('search') || '';

    if (!destination) {
      return NextResponse.json(
        { error: 'Missing required parameter: destination' },
        { status: 400 }
      );
    }

    // Step 1: Query from indexed database (case-insensitive for SQLite)
    let hotels = await findHotelsCI({
      orGroups: [{
        textConditions: [
          { field: 'country', value: destination },
          { field: 'region', value: destination },
          { field: 'city', value: destination },
        ],
      }],
      ...(search ? { andContains: [{ field: 'name', value: search }] } : {}),
      orderBy: [
        { field: 'googleRating', direction: 'DESC' },
        { field: 'reviewCount', direction: 'DESC' },
      ],
      take: 500,
    });

  // Get lat/lng from request params for geocode search
  const lat = params.get('lat') ? parseFloat(params.get('lat')!) : null;
  const lng = params.get('lng') ? parseFloat(params.get('lng')!) : null;

  // Step 2: If low results, trigger COMPREHENSIVE Google indexing
  // This runs multiple searches to build a complete hotel index for any destination
  if (hotels.length < 100 && !indexingInProgress.has(destination.toLowerCase())) {
    indexingInProgress.add(destination.toLowerCase());

    try {
      const allResults: GooglePlaceResult[] = [];
      const seenPlaceIds = new Set<string>();

      // Strategy 1: Geocode-based radius search (if we have coordinates)
      if (lat && lng) {
        const geocodeResults = await searchHotelsByGeocode(lat, lng, 50000, 60); // 50km radius
        for (const place of geocodeResults) {
          if (place.place_id && !seenPlaceIds.has(place.place_id)) {
            seenPlaceIds.add(place.place_id);
            allResults.push(place);
          }
        }
      }

      // Strategy 2: Multiple text queries to find variety of hotels
      const textQueries = [
        `hotels ${destination}`,
        `luxury hotels ${destination}`,
        `resorts ${destination}`,
        `boutique hotels ${destination}`,
        `best hotels ${destination}`,
        `5 star hotels ${destination}`,
        `beach resorts ${destination}`,
        // Brand-specific searches to ensure top hotels appear
        `Four Seasons ${destination}`,
        `Ritz Carlton ${destination}`,
        `St Regis ${destination}`,
        `W Hotel ${destination}`,
        `Marriott ${destination}`,
        `Hilton ${destination}`,
        `Hyatt ${destination}`,
      ];

      // Run text searches (with some delay to avoid rate limiting)
      for (const query of textQueries) {
        try {
          const results = await searchHotelsWithPagination(query, 60);
          let newCount = 0;
          for (const place of results) {
            if (place.place_id && !seenPlaceIds.has(place.place_id)) {
              seenPlaceIds.add(place.place_id);
              allResults.push(place);
              newCount++;
            }
          }
          if (newCount > 0) {
          }
        } catch (error) {
          console.error(`Query "${query}" failed:`, error);
        }
      }

      // Index all results to database using batched transaction
      // to avoid N+1 individual upsert queries
      let indexed = 0;
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
                city: destination,
                region: destination,
                country: destination,
                countryCode: 'XX',
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
                googleRating: place.rating || null,
                reviewCount: place.user_ratings_total || null,
                priceLevel: place.price_level || null,
                photoReference: place.photos?.[0]?.photo_reference || null,
                types: place.types ? JSON.stringify(place.types) : null,
              },
              update: {
                googleRating: place.rating || null,
                indexedAt: new Date(),
              },
            }))
          );
          indexed += batch.length;
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
                  city: destination,
                  region: destination,
                  country: destination,
                  countryCode: 'XX',
                  lat: place.geometry.location.lat,
                  lng: place.geometry.location.lng,
                  googleRating: place.rating || null,
                  reviewCount: place.user_ratings_total || null,
                  priceLevel: place.price_level || null,
                  photoReference: place.photos?.[0]?.photo_reference || null,
                  types: place.types ? JSON.stringify(place.types) : null,
                },
                update: {
                  googleRating: place.rating || null,
                  indexedAt: new Date(),
                },
              });
              indexed++;
            } catch {
              // Ignore individual insert errors (likely duplicates)
            }
          }
        }
      }

      // Re-query with fresh data (case-insensitive for SQLite)
      hotels = await findHotelsCI({
        orGroups: [{
          textConditions: [
            { field: 'country', value: destination },
            { field: 'region', value: destination },
            { field: 'city', value: destination },
          ],
        }],
        ...(search ? { andContains: [{ field: 'name', value: search }] } : {}),
        orderBy: [{ field: 'googleRating', direction: 'DESC' }],
        take: 500,
      });
    } catch (error) {
      console.error('Comprehensive indexing error:', error);
    } finally {
      indexingInProgress.delete(destination.toLowerCase());
    }
  }

  // Step 3: Format response (NO PRICING - that's Layer 2)
  const formattedHotels = hotels.map((hotel) => ({
    id: hotel.id,
    placeId: hotel.placeId,
    name: hotel.name,
    address: hotel.address || hotel.city,
    city: hotel.city,
    region: hotel.region,
    countryCode: hotel.countryCode,
    lat: hotel.lat,
    lng: hotel.lng,
    latitude: hotel.lat,
    longitude: hotel.lng,
    stars: hotel.priceLevel ? Math.min(hotel.priceLevel + 2, 5) : getStarRating(hotel.name),
    googleRating: hotel.googleRating,
    guestRating: hotel.googleRating != null ? hotel.googleRating * 2 : null, // Convert 5-point to 10-point
    reviewCount: hotel.reviewCount,
    imageUrl: hotel.photoReference
      ? `/api/photo-proxy?ref=${encodeURIComponent(hotel.photoReference)}&maxwidth=400`
      : null,
    amenities: generateAmenities(hotel.name),
    distanceToCenter: 5.0, // Will be calculated when we have user location
    isLuxury: isLuxuryHotel(hotel.name),
    // Pricing fields - populated by Layer 2 on-demand
    pricePerNight: null as number | null,
    totalPrice: null as number | null,
    hasRealPricing: false,
    pricingStatus: 'not_fetched' as const,
    source: 'google_places_index',
  }));

  // Sort: Luxury first, then by rating
  formattedHotels.sort((a, b) => {
    if (a.isLuxury && !b.isLuxury) return -1;
    if (!a.isLuxury && b.isLuxury) return 1;
    return (b.googleRating ?? 0) - (a.googleRating ?? 0);
  });

  return NextResponse.json({
    hotels: formattedHotels,
    totalCount: formattedHotels.length,
    withPricing: 0,
    source: 'google_places_index',
  });
  } catch (error: any) {
    console.error('Hotel search error:', error);
    return NextResponse.json(
      { error: 'Hotel search failed' },
      { status: 500 }
    );
  }
}
