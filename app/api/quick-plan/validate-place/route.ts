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
  const context = 'Validate Place API - GET';

  try {
    const params = request.nextUrl.searchParams;
    const placeId = params.get('placeId');
    const query = params.get('query');
    const type = params.get('type') || undefined;

    // Validate by place ID
    if (placeId) {
      const details = await getPlaceDetails(placeId);

      if (!details) {
        return NextResponse.json(
          {
            isValid: false,
            error: 'NOT_FOUND',
            message: 'The place could not be found. It may have been removed or the ID is invalid.',
          },
          { status: 404 }
        );
      }

      const response = NextResponse.json(details);
      // Place details are relatively static - cache for 24 hours
      response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
      return response;
    }

    // Search by query
    if (query) {
      if (query.trim().length < 2) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Search query must be at least 2 characters long.',
          },
          { status: 400 }
        );
      }

      const results = await searchPlace(query, type);

      const response = NextResponse.json({
        results,
        count: results.length,
        success: true,
      });
      // Search results can be cached for 1 hour
      response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
      return response;
    }

    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Please provide either a placeId or a search query.',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Unable to validate place. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const context = 'Validate Place API - POST';

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid request format. Please provide valid JSON.',
        },
        { status: 400 }
      );
    }

    const { placeIds } = body as { placeIds: string[] };

    if (!placeIds || !Array.isArray(placeIds)) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Please provide an array of place IDs to validate.',
        },
        { status: 400 }
      );
    }

    if (placeIds.length === 0) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'The place IDs array cannot be empty.',
        },
        { status: 400 }
      );
    }

    if (placeIds.length > 50) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Maximum 50 place IDs can be validated at once.',
        },
        { status: 400 }
      );
    }

    // Validate multiple place IDs in parallel
    const results = await Promise.all(
      placeIds.map(async (placeId) => {
        try {
          const details = await getPlaceDetails(placeId);
          return {
            placeId,
            isValid: !!details,
            details,
          };
        } catch (placeError) {
          console.error(`[${context}] Error validating place ${placeId}:`, placeError);
          return {
            placeId,
            isValid: false,
            details: null,
            error: 'Validation failed for this place',
          };
        }
      })
    );

    const validCount = results.filter(r => r.isValid).length;

    const response = NextResponse.json({
      results,
      validCount,
      totalCount: placeIds.length,
      success: true,
    });
    // Batch validation can be cached briefly
    response.headers.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    return response;
  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Unable to validate places. Please try again.',
      },
      { status: 500 }
    );
  }
}
