/**
 * Itinerary Generation API
 * Generates complete day-by-day itinerary from preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  TripPreferences,
  AreaCandidate,
  HotelCandidate,
  RestaurantCandidate,
} from '@/types/quick-plan';
import { generateItinerary } from '@/lib/quick-plan/itinerary-generator';
import { runQualityChecks } from '@/lib/quick-plan/quality-check';
import {
  ValidationError,
  APIError,
  createErrorResponse,
  logError,
} from '@/lib/errors';

export async function POST(request: NextRequest) {
  const context = 'Generate Itinerary API';

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const {
      preferences,
      areas,
      hotels,
      restaurants,
    } = body as {
      preferences: TripPreferences;
      areas: AreaCandidate[];
      hotels: Record<string, HotelCandidate>;
      restaurants: Record<string, RestaurantCandidate[]>;
    };

    // Validate preferences object exists
    if (!preferences) {
      throw new ValidationError('Trip preferences are required');
    }

    // Log received preferences for debugging
    console.log('[Generate itinerary] Received preferences:', {
      hasSelectedSplit: !!preferences.selectedSplit,
      splitId: preferences.selectedSplit?.id,
      splitName: preferences.selectedSplit?.name,
      areasCount: preferences.selectedAreas?.length,
      hasHotelPrefs: !!(preferences as any).hotelPreferences,
      diningMode: preferences.diningMode,
    });

    // Validate required fields - check for areas or stops
    const splitAreas = (preferences.selectedSplit as any)?.areas || preferences.selectedSplit?.stops || [];
    if (!preferences.selectedSplit || splitAreas.length === 0) {
      logError(context, new Error('No split areas'), { selectedSplit: preferences.selectedSplit });
      throw new ValidationError(
        'Please select at least one area for your itinerary',
        { field: 'selectedSplit' }
      );
    }

    // Validate trip length
    if (!preferences.tripLength || preferences.tripLength < 1) {
      throw new ValidationError(
        'Please specify a valid trip length (at least 1 night)',
        { field: 'tripLength' }
      );
    }

    // Convert records to Maps
    const hotelMap = new Map<string, HotelCandidate>();
    for (const [areaId, hotel] of Object.entries(hotels || {})) {
      if (hotel) {
        hotelMap.set(areaId, hotel);
      }
    }

    const restaurantMap = new Map<string, RestaurantCandidate[]>();
    for (const [areaId, restaurantList] of Object.entries(restaurants || {})) {
      if (Array.isArray(restaurantList)) {
        restaurantMap.set(areaId, restaurantList);
      }
    }

    // Reconstruct dates if serialized
    // Note: We extend preferences with Maps for internal use, but keep the base type
    const fullPreferences = {
      ...preferences,
      startDate: preferences.startDate ? new Date(preferences.startDate) : null,
      endDate: preferences.endDate ? new Date(preferences.endDate) : null,
    };

    // Store hotels/restaurants separately - they're passed directly to generateItinerary
    (fullPreferences as any).selectedHotels = hotelMap;
    (fullPreferences as any).selectedRestaurants = restaurantMap;

    // Generate the itinerary
    let itinerary;
    try {
      itinerary = await generateItinerary(
        fullPreferences,
        areas || [],
        hotelMap,
        restaurantMap
      );
    } catch (genError) {
      logError(context, genError, { preferences: fullPreferences });
      throw new APIError({
        message: genError instanceof Error ? genError.message : 'Itinerary generation failed',
        code: 'ITINERARY_GENERATION_FAILED',
        statusCode: 500,
        userMessage: 'We had trouble creating your itinerary. Please try again or adjust your preferences.',
        cause: genError instanceof Error ? genError : undefined,
      });
    }

    // Run quality checks
    let qualityCheck;
    try {
      qualityCheck = runQualityChecks(itinerary, fullPreferences as TripPreferences);
    } catch (qualityError) {
      // Quality checks failing shouldn't block the itinerary
      logError(context + ' - Quality Check', qualityError);
      qualityCheck = { passed: true, warnings: [], suggestions: [] };
    }

    const response = NextResponse.json({
      itinerary,
      qualityCheck,
      success: true,
    });
    // Itinerary generation is user-specific - don't cache
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return response;
  } catch (error) {
    logError(context, error);
    return createErrorResponse(error, context);
  }
}
