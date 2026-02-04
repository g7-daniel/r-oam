import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/api-cache';
import { BoundedMap } from '@/lib/bounded-cache';
import { serverEnv, isConfigured } from '@/lib/env';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';
const GOOGLE_MAPS_TIMEOUT = 10000;

// Bounded in-memory cache for destination photos (max 500 entries, 24 hour TTL)
const photoCache = new BoundedMap<string, string>(500, 24 * 60); // 24 hours in minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('place_id');

  if (!placeId) {
    return NextResponse.json(
      { error: 'Missing required parameter: place_id' },
      { status: 400 }
    );
  }

  // Check cache first (BoundedMap handles TTL internally)
  const cached = photoCache.get(placeId);
  if (cached) {
    const response = NextResponse.json({ photoUrl: cached });
    // Photo URLs are stable - cache for 24 hours
    response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
    return response;
  }

  if (!isConfigured.googleMaps()) {
    return NextResponse.json(
      { error: 'Google Maps API not configured. Set GOOGLE_MAPS_API_KEY in .env.local' },
      { status: 500 }
    );
  }
  const apiKey = serverEnv.GOOGLE_MAPS_API_KEY;

  try {
    // Fetch place details to get photo reference
    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'photos',
      key: apiKey,
    });

    const response = await fetchWithTimeout(
      `${GOOGLE_MAPS_BASE_URL}/place/details/json?${params}`,
      {},
      GOOGLE_MAPS_TIMEOUT
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch place details' },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.result?.photos?.[0]?.photo_reference) {
      // Return null photo URL - component will use fallback
      return NextResponse.json({ photoUrl: null });
    }

    const photoReference = data.result.photos[0].photo_reference;
    const photoUrl = `${GOOGLE_MAPS_BASE_URL}/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;

    // Cache the result (BoundedMap handles timestamps internally)
    photoCache.set(placeId, photoUrl);

    const jsonResponse = NextResponse.json({ photoUrl });
    // Photo URLs are stable - cache for 24 hours
    jsonResponse.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
    return jsonResponse;
  } catch (error) {
    console.error('Destination photo API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destination photo' },
      { status: 500 }
    );
  }
}
