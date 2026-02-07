/**
 * API Input Validation
 * Zod schemas and utilities for validating API route inputs
 * Provides coordinate validation, string sanitization, and proper error responses
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { isValidDateString, toDate, isAfter, isFuture, getTodayString } from './date-utils';

// ============================================================================
// CONSTANTS
// ============================================================================

// Maximum array sizes to prevent DoS attacks
export const MAX_ARRAY_SIZES = {
  areaIds: 10,
  cuisineTypes: 15,
  activityTypes: 20,
  dietaryRestrictions: 10,
  areas: 15,
  hotels: 20,
  subreddits: 10,
  selectedActivities: 30,
  mustDos: 20,
  hardNos: 20,
  vibes: 10,
} as const;

// String length limits
export const MAX_STRING_LENGTHS = {
  destination: 200,
  areaName: 200,
  airportCode: 10,
  customActivity: 100,
  cuisineType: 50,
  activityType: 50,
} as const;

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/**
 * Latitude coordinate validation
 * Must be between -90 and 90 degrees
 */
export const latitudeSchema = z
  .number()
  .min(-90, 'Latitude must be >= -90')
  .max(90, 'Latitude must be <= 90')
  .refine((val) => !isNaN(val), 'Latitude must be a valid number');

/**
 * Longitude coordinate validation
 * Must be between -180 and 180 degrees
 */
export const longitudeSchema = z
  .number()
  .min(-180, 'Longitude must be >= -180')
  .max(180, 'Longitude must be <= 180')
  .refine((val) => !isNaN(val), 'Longitude must be a valid number');

/**
 * Coordinates object with optional null island check
 */
export const coordinatesSchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
}).refine(
  (coords) => !(coords.lat === 0 && coords.lng === 0),
  'Coordinates cannot be (0, 0) - this is likely invalid data'
);

/**
 * Optional coordinates - allows null/undefined but validates if present
 */
export const optionalCoordinatesSchema = z.object({
  lat: latitudeSchema.optional().nullable(),
  lng: longitudeSchema.optional().nullable(),
}).optional();

/**
 * Sanitized string - trims whitespace and limits length
 */
export const sanitizedStringSchema = (maxLength: number = 200) =>
  z
    .string()
    .trim()
    .max(maxLength, `String must be at most ${maxLength} characters`)
    .transform((val) => sanitizeString(val));

/**
 * Non-empty sanitized string
 */
export const requiredStringSchema = (maxLength: number = 200, fieldName: string = 'Field') =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`)
    .transform((val) => sanitizeString(val));

/**
 * Date string validation (YYYY-MM-DD format)
 * Uses centralized date utilities for timezone-safe validation
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((val) => isValidDateString(val), 'Invalid date');

/**
 * Future date validation
 * Uses centralized date utilities for timezone-safe comparison
 */
export const futureDateSchema = dateStringSchema.refine((val) => {
  return isFuture(val) || val === getTodayString();
}, 'Date must be today or in the future');

/**
 * Rating validation (0-5 scale)
 */
export const ratingSchema = z.number().min(0).max(5);

/**
 * Price/budget validation (non-negative)
 */
export const priceSchema = z.number().min(0).max(999999);

/**
 * Positive integer validation
 */
export const positiveIntSchema = z.number().int().positive();

/**
 * Adults count validation (1-20)
 */
export const adultsSchema = z.number().int().min(1, 'At least 1 adult required').max(20, 'Maximum 20 adults');

/**
 * Children count validation (0-20)
 */
export const childrenSchema = z.number().int().min(0).max(20, 'Maximum 20 children');

// ============================================================================
// API ROUTE SCHEMAS
// ============================================================================

/**
 * Hotels GET request validation
 */
export const hotelsGetSchema = z.object({
  area: sanitizedStringSchema(MAX_STRING_LENGTHS.areaName).optional(),
  destination: sanitizedStringSchema(MAX_STRING_LENGTHS.destination).optional(),
  lat: z.coerce.number().pipe(latitudeSchema).optional().nullable(),
  lng: z.coerce.number().pipe(longitudeSchema).optional().nullable(),
  minRating: z.coerce.number().min(0).max(5).default(4.0),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  budgetMin: z.coerce.number().min(0).max(10000).optional(),
  budgetMax: z.coerce.number().min(0).max(10000).optional(),
}).refine(
  (data) => data.area || data.destination,
  'Either area or destination parameter is required'
).refine(
  (data) => {
    if (data.budgetMin !== undefined && data.budgetMax !== undefined) {
      return data.budgetMin <= data.budgetMax;
    }
    return true;
  },
  'budgetMin cannot be greater than budgetMax'
);

/**
 * Hotels POST request validation
 */
export const hotelsPostSchema = z.object({
  areaIds: z
    .array(sanitizedStringSchema(MAX_STRING_LENGTHS.areaName))
    .min(1, 'areaIds must be a non-empty array')
    .max(MAX_ARRAY_SIZES.areaIds, `Maximum ${MAX_ARRAY_SIZES.areaIds} areas allowed`),
  destination: requiredStringSchema(MAX_STRING_LENGTHS.destination, 'destination'),
  preferences: z.object({
    budgetMin: priceSchema.optional(),
    budgetMax: priceSchema.optional(),
    minRating: ratingSchema.optional(),
    vibes: z.array(sanitizedStringSchema(50)).max(MAX_ARRAY_SIZES.vibes).optional(),
  }).optional().default({}),
  coordinates: optionalCoordinatesSchema,
  checkIn: dateStringSchema.optional(),
  checkOut: dateStringSchema.optional(),
  adults: adultsSchema.optional(),
  children: childrenSchema.optional(),
  estimatedRooms: z.number().int().min(1).max(10).optional(),
  accessibilityNeeds: z.object({
    wheelchairAccessible: z.boolean().optional(),
    groundFloorRequired: z.boolean().optional(),
    elevatorRequired: z.boolean().optional(),
    noStairs: z.boolean().optional(),
  }).optional(),
  accommodationType: z.enum([
    'hotel', 'hostel', 'vacation_rental', 'resort', 'eco_lodge', 'boutique', 'villa'
  ]).optional(),
  travelingWithPets: z.object({
    hasPet: z.boolean(),
    petType: z.enum(['dog', 'cat', 'other']).optional(),
    petSize: z.enum(['small', 'medium', 'large']).optional(),
  }).optional(),
  sustainabilityPreference: z.enum(['standard', 'eco_conscious', 'eco_focused']).optional(),
}).refine(
  (data) => {
    if (data.checkIn && data.checkOut) {
      return isAfter(data.checkOut, data.checkIn);
    }
    return true;
  },
  'checkOut must be after checkIn'
).refine(
  (data) => {
    if (data.preferences?.budgetMin !== undefined && data.preferences?.budgetMax !== undefined) {
      return data.preferences.budgetMin <= data.preferences.budgetMax;
    }
    return true;
  },
  'budgetMin cannot be greater than budgetMax'
);

/**
 * Restaurants POST request validation
 */
export const restaurantsPostSchema = z.object({
  cuisineTypes: z
    .array(sanitizedStringSchema(MAX_STRING_LENGTHS.cuisineType))
    .min(1, 'At least one cuisine type is required')
    .max(MAX_ARRAY_SIZES.cuisineTypes, `Maximum ${MAX_ARRAY_SIZES.cuisineTypes} cuisine types allowed`),
  destination: requiredStringSchema(MAX_STRING_LENGTHS.destination, 'destination'),
  hotels: z.record(
    z.string(),
    z.object({
      lat: latitudeSchema,
      lng: longitudeSchema,
      name: sanitizedStringSchema(200),
    })
  ).optional().default({}),
  areas: z
    .array(z.object({
      id: sanitizedStringSchema(100),
      name: sanitizedStringSchema(MAX_STRING_LENGTHS.areaName),
      centerLat: latitudeSchema.optional(),
      centerLng: longitudeSchema.optional(),
    }))
    .max(MAX_ARRAY_SIZES.areas, `Maximum ${MAX_ARRAY_SIZES.areas} areas allowed`)
    .optional()
    .default([]),
  dietaryRestrictions: z
    .array(sanitizedStringSchema(50))
    .max(MAX_ARRAY_SIZES.dietaryRestrictions, `Maximum ${MAX_ARRAY_SIZES.dietaryRestrictions} dietary restrictions allowed`)
    .optional()
    .default([]),
});

/**
 * Experiences POST request validation
 */
export const experiencesPostSchema = z.object({
  activityTypes: z
    .array(sanitizedStringSchema(MAX_STRING_LENGTHS.activityType))
    .min(1, 'At least one activity type is required')
    .max(MAX_ARRAY_SIZES.activityTypes, `Maximum ${MAX_ARRAY_SIZES.activityTypes} activity types allowed`),
  destination: requiredStringSchema(MAX_STRING_LENGTHS.destination, 'destination'),
  hotels: z.record(
    z.string(),
    z.object({
      lat: latitudeSchema,
      lng: longitudeSchema,
      name: sanitizedStringSchema(200),
    })
  ).optional().default({}),
  areas: z
    .array(z.object({
      id: sanitizedStringSchema(100),
      name: sanitizedStringSchema(MAX_STRING_LENGTHS.areaName),
      centerLat: latitudeSchema.optional(),
      centerLng: longitudeSchema.optional(),
    }))
    .max(MAX_ARRAY_SIZES.areas, `Maximum ${MAX_ARRAY_SIZES.areas} areas allowed`)
    .optional()
    .default([]),
});

/**
 * Discover Areas POST request validation
 * Note: preferences uses passthrough() to allow additional fields from TripPreferences
 * that are used by the discoverAreas function but not strictly validated here
 */
export const discoverAreasPostSchema = z.object({
  destination: requiredStringSchema(MAX_STRING_LENGTHS.destination, 'destination'),
  preferences: z.object({
    startDate: z.union([z.string(), z.date()]).optional().nullable(),
    endDate: z.union([z.string(), z.date()]).optional().nullable(),
    tripLength: z.number().int().min(1).max(60).optional(),
    adults: adultsSchema.optional(),
    children: childrenSchema.optional(),
    childAges: z.array(z.number().int().min(0).max(17)).max(20).optional(),
    budgetPerNight: z.object({
      min: priceSchema,
      max: priceSchema,
    }).passthrough().optional(),
    selectedActivities: z
      .array(z.object({
        type: sanitizedStringSchema(50),
        isCustom: z.boolean().optional(),
        customLabel: sanitizedStringSchema(MAX_STRING_LENGTHS.customActivity).optional(),
        priority: z.union([z.number(), z.string()]).optional(),
      }).passthrough())
      .max(MAX_ARRAY_SIZES.selectedActivities)
      .optional(),
    mustDos: z.array(sanitizedStringSchema(200)).max(MAX_ARRAY_SIZES.mustDos).optional(),
    hardNos: z.array(sanitizedStringSchema(200)).max(MAX_ARRAY_SIZES.hardNos).optional(),
    pace: z.enum(['chill', 'balanced', 'packed']).optional(),
    destinationContext: z.object({
      rawInput: z.string().optional(),
      canonicalName: z.string().optional(),
      type: z.enum(['city', 'region', 'country', 'continent']).optional(),
      countryCode: z.string().optional(),
      countryName: z.string().optional(),
      centerLat: latitudeSchema.optional(),
      centerLng: longitudeSchema.optional(),
      timezone: z.string().optional(),
      suggestedAreas: z.array(z.string()).optional(),
    }).passthrough().optional(),
  }).passthrough().optional().default({}),
  subreddits: z
    .array(sanitizedStringSchema(50))
    .max(MAX_ARRAY_SIZES.subreddits, `Maximum ${MAX_ARRAY_SIZES.subreddits} subreddits allowed`)
    .optional(),
});

/**
 * Flights GET request validation
 */
export const flightsGetSchema = z.object({
  origin: requiredStringSchema(MAX_STRING_LENGTHS.airportCode, 'origin'),
  destination: requiredStringSchema(MAX_STRING_LENGTHS.airportCode, 'destination'),
  departureDate: futureDateSchema,
  returnDate: dateStringSchema.optional(),
  adults: z.coerce.number().pipe(adultsSchema).default(1),
  children: z.coerce.number().pipe(childrenSchema).default(0),
  maxPrice: z.coerce.number().min(0).max(100000).optional(),
  travelClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional(),
}).refine(
  (data) => {
    if (data.returnDate) {
      return isAfter(data.returnDate, data.departureDate);
    }
    return true;
  },
  'Return date must be after departure date'
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize a string by removing potential XSS vectors and control characters
 */
export function sanitizeString(input: string): string {
  if (!input) return '';

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Encode HTML special characters (& must be first to avoid double-encoding)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Trim whitespace
    .trim();
}

/**
 * Validate coordinates are within valid ranges
 */
export function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }
  if (lat < -90 || lat > 90) {
    return false;
  }
  if (lng < -180 || lng > 180) {
    return false;
  }
  // Null island check
  if (lat === 0 && lng === 0) {
    return false;
  }
  return true;
}

/**
 * Parse and validate coordinates from query parameters
 */
export function parseCoordinates(
  latStr: string | null,
  lngStr: string | null
): { lat: number; lng: number } | null {
  if (!latStr || !lngStr) return null;

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (!isValidCoordinate(lat, lng)) return null;

  return { lat, lng };
}

/**
 * Create a standardized error response for validation failures
 */
export function createValidationErrorResponse(error: z.ZodError<unknown>): NextResponse {
  const errors = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return NextResponse.json(
    {
      error: 'Validation failed',
      details: errors,
    },
    { status: 400 }
  );
}

/**
 * Validate request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: createValidationErrorResponse(result.error),
      };
    }

    return { success: true, data: result.data };
  } catch (e) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: NextResponse } {
  // Convert URLSearchParams to object
  const params: Record<string, string | undefined> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: createValidationErrorResponse(result.error),
    };
  }

  return { success: true, data: result.data };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type HotelsGetInput = z.infer<typeof hotelsGetSchema>;
export type HotelsPostInput = z.infer<typeof hotelsPostSchema>;
export type RestaurantsPostInput = z.infer<typeof restaurantsPostSchema>;
export type ExperiencesPostInput = z.infer<typeof experiencesPostSchema>;
export type DiscoverAreasPostInput = z.infer<typeof discoverAreasPostSchema>;
export type FlightsGetInput = z.infer<typeof flightsGetSchema>;
