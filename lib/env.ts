/**
 * Centralized Environment Variable Access with Validation
 *
 * SECURITY RULES:
 * 1. API keys and secrets should NEVER use NEXT_PUBLIC_ prefix
 * 2. Server-side variables are only accessible in API routes and server components
 * 3. Client-side variables (NEXT_PUBLIC_) should only be for non-sensitive config
 *
 * Usage:
 * - Import `serverEnv` for server-side code (API routes, server components)
 * - Import `clientEnv` for client-side code (use client components)
 */

// =============================================================================
// SERVER-SIDE ENVIRONMENT VARIABLES (API keys, secrets - NEVER expose to client)
// =============================================================================

interface ServerEnv {
  // Amadeus API (flights & hotels)
  AMADEUS_CLIENT_ID: string;
  AMADEUS_CLIENT_SECRET: string;

  // Google Maps Platform (server-side usage only)
  GOOGLE_MAPS_API_KEY: string;

  // Groq AI
  GROQ_API_KEY: string;

  // Google Gemini AI (optional fallback)
  GEMINI_API_KEY: string | undefined;

  // RapidAPI (Booking.com)
  RAPIDAPI_KEY: string;

  // Makcorps Hotel Pricing API
  MAKCORPS_API_KEY: string;

  // Unsplash API (destination photos)
  UNSPLASH_ACCESS_KEY: string;
  UNSPLASH_SECRET_KEY: string;

  // Database
  DATABASE_URL: string;

  // Runtime info
  NODE_ENV: 'development' | 'production' | 'test';
}

/**
 * Get a required server environment variable
 * Throws an error if the variable is missing
 */
function getRequiredServerEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please add it to your .env.local file. ` +
      `See .env.example for required variables.`
    );
  }
  return value;
}

/**
 * Get an optional server environment variable
 * Returns undefined if not set
 */
function getOptionalServerEnv(key: string): string | undefined {
  return process.env[key] || undefined;
}

/**
 * Validate that all required server environment variables are set
 * Call this at server startup to fail fast
 */
export function validateServerEnv(): void {
  const required = [
    'AMADEUS_CLIENT_ID',
    'AMADEUS_CLIENT_SECRET',
    'GOOGLE_MAPS_API_KEY',
    'GROQ_API_KEY',
    'RAPIDAPI_KEY',
    'MAKCORPS_API_KEY',
    'UNSPLASH_ACCESS_KEY',
    'UNSPLASH_SECRET_KEY',
    'DATABASE_URL',
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('='.repeat(60));
    console.error('MISSING REQUIRED ENVIRONMENT VARIABLES:');
    console.error('='.repeat(60));
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('');
    console.error('Please add these to your .env.local file.');
    console.error('See .env.example for the full list of required variables.');
    console.error('='.repeat(60));

    // In production, throw an error to prevent startup
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

/**
 * Server-side environment variables
 * Only use this in API routes and server components
 *
 * IMPORTANT: Never import this in client components!
 */
export const serverEnv: ServerEnv = {
  // Amadeus API
  get AMADEUS_CLIENT_ID() {
    return getRequiredServerEnv('AMADEUS_CLIENT_ID');
  },
  get AMADEUS_CLIENT_SECRET() {
    return getRequiredServerEnv('AMADEUS_CLIENT_SECRET');
  },

  // Google Maps (server-side)
  get GOOGLE_MAPS_API_KEY() {
    return getRequiredServerEnv('GOOGLE_MAPS_API_KEY');
  },

  // Groq AI
  get GROQ_API_KEY() {
    return getRequiredServerEnv('GROQ_API_KEY');
  },

  // Gemini AI (optional)
  get GEMINI_API_KEY() {
    return getOptionalServerEnv('GEMINI_API_KEY');
  },

  // RapidAPI
  get RAPIDAPI_KEY() {
    return getRequiredServerEnv('RAPIDAPI_KEY');
  },

  // Makcorps
  get MAKCORPS_API_KEY() {
    return getRequiredServerEnv('MAKCORPS_API_KEY');
  },

  // Unsplash
  get UNSPLASH_ACCESS_KEY() {
    return getRequiredServerEnv('UNSPLASH_ACCESS_KEY');
  },
  get UNSPLASH_SECRET_KEY() {
    return getRequiredServerEnv('UNSPLASH_SECRET_KEY');
  },

  // Database
  get DATABASE_URL() {
    return getRequiredServerEnv('DATABASE_URL');
  },

  // Node environment
  get NODE_ENV() {
    return (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  },
};

// =============================================================================
// CLIENT-SIDE ENVIRONMENT VARIABLES (non-sensitive only!)
// =============================================================================

interface ClientEnv {
  // Google Maps API key for client-side map rendering
  // Note: This key should be restricted in Google Cloud Console to:
  // - HTTP referrers (your domain only)
  // - Maps JavaScript API, Places API only
  GOOGLE_MAPS_API_KEY: string;

  // Site URL for metadata and OpenGraph
  SITE_URL: string;

  // Base URL for API calls from client-side orchestrator
  BASE_URL: string;

  // Feature flags (safe to expose)
  QUICK_PLAN_CHAT_ENABLED: boolean;

  // Runtime info
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

/**
 * Client-side environment variables
 * Safe to use in any component (client or server)
 *
 * IMPORTANT: Only non-sensitive configuration should be here!
 * API keys here should be restricted in their respective platforms.
 */
export const clientEnv: ClientEnv = {
  // Google Maps API key for client-side rendering
  // This key is exposed to browsers but should be restricted to:
  // 1. Specific HTTP referrers (your domain)
  // 2. Only Maps JavaScript API and Places API
  get GOOGLE_MAPS_API_KEY() {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      return '';
    }
    return key;
  },

  // Site URL for metadata/OpenGraph
  get SITE_URL() {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://roam.travel';
  },

  // Base URL for API calls
  get BASE_URL() {
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  },

  // Feature flags
  get QUICK_PLAN_CHAT_ENABLED() {
    return process.env.NEXT_PUBLIC_QUICK_PLAN_CHAT === 'true';
  },

  // Environment checks
  get IS_DEVELOPMENT() {
    return process.env.NODE_ENV === 'development';
  },
  get IS_PRODUCTION() {
    return process.env.NODE_ENV === 'production';
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a specific API is configured
 * Useful for graceful degradation
 */
export const isConfigured = {
  amadeus: () => !!process.env.AMADEUS_CLIENT_ID && !!process.env.AMADEUS_CLIENT_SECRET,
  googleMaps: () => !!process.env.GOOGLE_MAPS_API_KEY,
  googleMapsClient: () => !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  groq: () => !!process.env.GROQ_API_KEY,
  gemini: () => !!process.env.GEMINI_API_KEY,
  rapidApi: () => !!process.env.RAPIDAPI_KEY,
  makcorps: () => !!process.env.MAKCORPS_API_KEY,
  unsplash: () => !!process.env.UNSPLASH_ACCESS_KEY,
};

/**
 * Get configuration status for debugging
 * Only use in development!
 */
export function getConfigStatus(): Record<string, boolean | string> {
  if (process.env.NODE_ENV === 'production') {
    return { message: 'Config status hidden in production' };
  }

  return {
    amadeus: isConfigured.amadeus(),
    googleMaps: isConfigured.googleMaps(),
    googleMapsClient: isConfigured.googleMapsClient(),
    groq: isConfigured.groq(),
    gemini: isConfigured.gemini(),
    rapidApi: isConfigured.rapidApi(),
    makcorps: isConfigured.makcorps(),
    unsplash: isConfigured.unsplash(),
  };
}
