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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      console.error('Generate itinerary: No split areas', { selectedSplit: preferences.selectedSplit });
      return NextResponse.json(
        { error: 'No itinerary split selected' },
        { status: 400 }
      );
    }

    // Convert records to Maps
    const hotelMap = new Map<string, HotelCandidate>();
    for (const [areaId, hotel] of Object.entries(hotels || {})) {
      hotelMap.set(areaId, hotel);
    }

    const restaurantMap = new Map<string, RestaurantCandidate[]>();
    for (const [areaId, restaurantList] of Object.entries(restaurants || {})) {
      restaurantMap.set(areaId, restaurantList);
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
    const itinerary = await generateItinerary(
      fullPreferences,
      areas,
      hotelMap,
      restaurantMap
    );

    // Run quality checks
    const qualityCheck = runQualityChecks(itinerary, fullPreferences as TripPreferences);

    return NextResponse.json({
      itinerary,
      qualityCheck,
    });
  } catch (error) {
    console.error('Itinerary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate itinerary' },
      { status: 500 }
    );
  }
}
