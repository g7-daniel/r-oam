import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute per IP
const REQUEST_SIZE_LIMIT = 1024 * 1024; // 1MB request body limit

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Inline cleanup of expired entries (called on each request instead of setInterval,
// which is unreliable in Edge Runtime where middleware runs)
function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  rateLimitStore.forEach((value, key) => {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  });
}

function getRateLimitKey(request: NextRequest): string {
  // Use X-Forwarded-For for proxied requests, fallback to IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';
  return ip;
}

function checkRateLimit(request: NextRequest): { allowed: boolean; limit: number; remaining: number; reset: number } {
  // Periodically clean up expired entries
  cleanupExpiredEntries();

  const key = getRateLimitKey(request);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitStore.set(key, entry);
  }

  entry.count++;

  const allowed = entry.count <= MAX_REQUESTS_PER_WINDOW;
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count);
  const reset = Math.ceil(entry.resetTime / 1000); // Unix timestamp in seconds

  return {
    allowed,
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining,
    reset,
  };
}

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check request size for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > REQUEST_SIZE_LIMIT) {
      return NextResponse.json(
        { error: 'Request body too large. Maximum size is 1MB.' },
        { status: 413 }
      );
    }
  }

  // Apply rate limiting
  const rateLimitResult = checkRateLimit(request);

  const response = rateLimitResult.allowed
    ? NextResponse.next()
    : NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

  // Add security headers to API responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
