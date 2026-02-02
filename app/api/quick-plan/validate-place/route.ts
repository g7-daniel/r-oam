/**
 * Place Validation API
 * Validates Google Places IDs and returns place details
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/api-cache';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const GOOGLE_API_TIMEOUT = 10000; // 10 second timeout

interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  rating?: number;
  priceLevel?: number;
  photoReference?: string;
  isValid: boolean;
}

async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY not configured');
    return null;
  }

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'place_id,name,formatted_address,geometry,types,rating,price_level,photos',
      key: GOOGLE_MAPS_API_KEY,
    });

    const response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
      {},
      GOOGLE_API_TIMEOUT
    );

    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      console.error(`Place details API error: ${data.status}`);
      return null;
    }

    const place = data.result;

    return {
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      types: place.types || [],
      rating: place.rating,
      priceLevel: place.price_level,
      photoReference: place.photos?.[0]?.photo_reference,
      isValid: true,
    };
  } catch (error) {
    console.error('Place details fetch error:', error);
    return null;
  }
}

async function searchPlace(query: string, type?: string): Promise<PlaceDetails[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      key: GOOGLE_MAPS_API_KEY,
    });

    if (type) {
      params.set('type', type);
    }

    const response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
      {},
      GOOGLE_API_TIMEOUT
    );

    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      return [];
    }

    return data.results.slice(0, 5).map((place: any) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      types: place.types || [],
      rating: place.rating,
      priceLevel: place.price_level,
      photoReference: place.photos?.[0]?.photo_reference,
      isValid: true,
    }));
  } catch (error) {
    console.error('Place search error:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const placeId = params.get('placeId');
  const query = params.get('query');
  const type = params.get('type') || undefined;

  // Validate by place ID
  if (placeId) {
    const details = await getPlaceDetails(placeId);

    if (!details) {
      return NextResponse.json(
        { isValid: false, error: 'Place not found or invalid' },
        { status: 404 }
      );
    }

    return NextResponse.json(details);
  }

  // Search by query
  if (query) {
    const results = await searchPlace(query, type);

    return NextResponse.json({
      results,
      count: results.length,
    });
  }

  return NextResponse.json(
    { error: 'Either placeId or query parameter is required' },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { placeIds } = body as { placeIds: string[] };

    if (!placeIds || !Array.isArray(placeIds)) {
      return NextResponse.json(
        { error: 'placeIds array is required' },
        { status: 400 }
      );
    }

    // Validate multiple place IDs in parallel
    const results = await Promise.all(
      placeIds.map(async (placeId) => {
        const details = await getPlaceDetails(placeId);
        return {
          placeId,
          isValid: !!details,
          details,
        };
      })
    );

    const validCount = results.filter(r => r.isValid).length;

    return NextResponse.json({
      results,
      validCount,
      totalCount: placeIds.length,
    });
  } catch (error) {
    console.error('Batch validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}
