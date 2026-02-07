import { NextRequest, NextResponse } from 'next/server';
import { BoundedMap } from '@/lib/bounded-cache';
import { serverEnv, isConfigured } from '@/lib/env';

const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';
const UNSPLASH_TIMEOUT = 8000;

// Bounded in-memory cache for Unsplash photos (max 500 entries, 24 hour TTL)
const unsplashCache = new BoundedMap<string, string | null>(500, 24 * 60); // 24 hours in minutes

/**
 * GET /api/unsplash-photo?query=Paris
 *
 * Searches Unsplash for a travel photo matching the destination name.
 * Returns { photoUrl: string | null }
 *
 * NOTE: Unsplash API Terms of Service require attribution.
 * When displaying photos from this endpoint, you should include
 * "Photo by [photographer] on Unsplash" attribution, or at minimum
 * link back to the photo on Unsplash. For small thumbnails in autocomplete
 * dropdowns, a general "Photos by Unsplash" note is acceptable.
 * See: https://unsplash.com/documentation#guidelines--crediting
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query || query.length > 200) {
    return NextResponse.json(
      { error: 'Missing or invalid query parameter' },
      { status: 400 }
    );
  }

  const cacheKey = query.toLowerCase().trim();

  // Check cache first (BoundedMap handles TTL internally)
  if (unsplashCache.has(cacheKey)) {
    const cached = unsplashCache.get(cacheKey);
    const response = NextResponse.json({ photoUrl: cached ?? null });
    response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
    return response;
  }

  if (!isConfigured.unsplash()) {
    return NextResponse.json(
      { error: 'Photo service is temporarily unavailable' },
      { status: 503 }
    );
  }

  const accessKey = serverEnv.UNSPLASH_ACCESS_KEY;

  try {
    const params = new URLSearchParams({
      query: `${query} travel`,
      per_page: '1',
      orientation: 'landscape',
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UNSPLASH_TIMEOUT);

    const response = await fetch(`${UNSPLASH_API_URL}?${params}`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[unsplash-photo] API responded with status ${response.status}`);

      // Distinguish between client errors (4xx) and server errors (5xx)
      // Only cache permanent failures, not transient ones
      if (response.status === 401 || response.status === 403) {
        // Authentication/authorization errors - log but don't cache long-term
        console.error('[unsplash-photo] Authentication error - check UNSPLASH_ACCESS_KEY');
        // Don't cache auth errors - they may be fixed by env var update
      } else if (response.status === 404 || response.status === 400) {
        // Bad request or not found - cache permanently (likely a bad query)
        unsplashCache.set(cacheKey, null);
      } else if (response.status === 429) {
        // Rate limited - don't cache, allow retry after delay
        console.warn('[unsplash-photo] Rate limited by Unsplash API');
        // Don't cache rate limits to allow recovery
      } else if (response.status >= 500) {
        // Server error - transient, don't cache
        console.error('[unsplash-photo] Unsplash server error (5xx) - transient, not caching');
        // Don't cache server errors to allow retry
      } else {
        // Other 4xx errors - cache to avoid repeated bad requests
        unsplashCache.set(cacheKey, null);
      }

      return NextResponse.json({ photoUrl: null });
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      // Cache the "no result" to avoid repeated searches for the same query
      unsplashCache.set(cacheKey, null);
      return NextResponse.json({ photoUrl: null });
    }

    // Use the "small" size (400px wide) for thumbnails - good balance of quality and speed
    const photoUrl = data.results[0].urls?.small || data.results[0].urls?.regular || null;

    // Cache the result
    unsplashCache.set(cacheKey, photoUrl);

    const jsonResponse = NextResponse.json({
      photoUrl,
      // Include attribution data for Unsplash TOS compliance
      attribution: {
        photographerName: data.results[0].user?.name || 'Unknown',
        photographerUrl: data.results[0].user?.links?.html || null,
        unsplashUrl: data.results[0].links?.html || null,
      },
    });
    jsonResponse.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
    return jsonResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[unsplash-photo] Request timed out');
    } else {
      console.error('[unsplash-photo] API error:', error);
    }
    // Don't cache transient errors (timeouts, network issues)
    return NextResponse.json({ photoUrl: null });
  }
}
