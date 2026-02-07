import { NextRequest, NextResponse } from 'next/server';
import { serverEnv, isConfigured } from '@/lib/env';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';
const PHOTO_TIMEOUT = 10000;

/**
 * Photo proxy endpoint - fetches Google Places photos server-side
 * to avoid exposing API key in client URLs.
 *
 * Usage: /api/photo-proxy?ref=PHOTO_REFERENCE&maxwidth=800
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const photoReference = searchParams.get('ref');
  const maxWidth = searchParams.get('maxwidth') || '800';

  if (!photoReference) {
    return NextResponse.json(
      { error: 'Missing required parameter: ref (photo_reference)' },
      { status: 400 }
    );
  }

  // Validate photo reference format to prevent SSRF attacks
  // Google photo references are alphanumeric with some special chars, typically 100-500 chars
  if (photoReference.length > 1000 || !/^[A-Za-z0-9_\-=]+$/.test(photoReference)) {
    return NextResponse.json(
      { error: 'Invalid photo reference format' },
      { status: 400 }
    );
  }

  // Validate maxWidth to prevent abuse
  const maxWidthNum = parseInt(maxWidth, 10);
  if (isNaN(maxWidthNum) || maxWidthNum < 1 || maxWidthNum > 4096) {
    return NextResponse.json(
      { error: 'Invalid maxwidth parameter (must be 1-4096)' },
      { status: 400 }
    );
  }

  if (!isConfigured.googleMaps()) {
    return NextResponse.json(
      { error: 'Photo service is temporarily unavailable' },
      { status: 503 }
    );
  }
  const apiKey = serverEnv.GOOGLE_MAPS_API_KEY;

  try {
    const photoUrl = `${GOOGLE_MAPS_BASE_URL}/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PHOTO_TIMEOUT);

    const response = await fetch(photoUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch photo from Google' },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Photo fetch timeout' },
        { status: 504 }
      );
    }
    console.error('Photo proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}
