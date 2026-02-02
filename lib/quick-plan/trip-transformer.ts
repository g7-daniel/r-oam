/**
 * Quick Plan to Trip Transformer
 * Transforms Quick Plan orchestrator state into the Trip format expected by tripStoreV2
 */

import type {
  Trip,
  TripBasics,
  Destination,
  Place,
  Hotel,
  Experience,
  Recommendation,
  BudgetStyle,
  Pace,
} from '@/lib/schemas/trip';
import type { CollectionItem } from '@/stores/tripStoreV2';
import type {
  OrchestratorState,
  TripPreferences,
  AreaCandidate,
  HotelCandidate,
  RestaurantCandidate,
} from '@/types/quick-plan';

// ============================================================================
// MAIN TRANSFORMER
// ============================================================================

export interface QuickPlanData {
  preferences: TripPreferences;
  discoveredData: {
    areas: AreaCandidate[];
    hotels: Map<string, HotelCandidate[]>;
    restaurants: Map<string, RestaurantCandidate[]>;
    experiences?: Map<string, any[]>;
  };
  itinerary?: {
    days: any[];
    stops: any[];
  };
}

export interface TransformedTripData {
  trip: Trip;
  collections: {
    experiences: CollectionItem[];
    restaurants: CollectionItem[];
  };
  scheduledItems: CollectionItem[];
}

// ============================================================================
// DAY MAPPING TYPES
// ============================================================================

interface DayMapping {
  dayIndex: number;
  destinationId: string;
  isArrivalDay: boolean;
  isDepartureDay: boolean;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate Quick Plan data before transformation
 * Returns an array of warning messages (not blocking errors)
 */
function validateBeforeTransform(data: QuickPlanData): string[] {
  const warnings: string[] = [];

  // Check for selected areas
  if (!data.preferences.selectedAreas?.length) {
    warnings.push('No areas selected - using default destination');
  }

  // Check for trip duration
  if (!data.preferences.tripLength && !data.preferences.startDate) {
    warnings.push('No trip duration specified - defaulting to 7 nights');
  }

  // Check for destinations context
  if (!data.preferences.destinationContext) {
    warnings.push('No destination context available');
  }

  return warnings;
}

/**
 * Transform Quick Plan data into Trip format for the main planner
 */
export function transformQuickPlanToTrip(data: QuickPlanData): TransformedTripData {
  // Run validation (logs warnings but doesn't block)
  const warnings = validateBeforeTransform(data);
  if (warnings.length > 0) {
    console.warn('[QuickPlan Transform] Validation warnings:', warnings);
  }
  const now = new Date().toISOString();
  const tripId = `trip_qp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Get preferences
  const prefs = data.preferences;
  const selectedAreas = prefs.selectedAreas || [];
  const selectedSplit = prefs.selectedSplit;
  const selectedHotels = (prefs as any).selectedHotels || {};
  const selectedRestaurants = (prefs as any).selectedRestaurants || {};
  const selectedExperiences = (prefs as any).selectedExperiences || {};
  const pace = prefs.pace || 'balanced';

  // Build trip basics
  const basics: TripBasics = {
    originAirport: null, // Quick Plan doesn't collect origin
    startDate: prefs.startDate ? prefs.startDate.toISOString().split('T')[0] : null,
    endDate: prefs.endDate ? prefs.endDate.toISOString().split('T')[0] : null,
    travelers: {
      adults: prefs.adults || 2,
      children: prefs.children || 0,
    },
    totalBudgetUsd: calculateTotalBudget(prefs),
    budgetStyle: mapBudgetStyle(prefs.budgetPerNight?.max || 200),
    pace: (prefs.pace as Pace) || 'balanced',
    transportMode: 'driving', // Default for most destinations
    tripTypeTags: (prefs.selectedActivities || []).map(a => a.type),
  };

  // Build destinations from selected areas with their nights from the split
  const destinations: Destination[] = [];
  const splitStops = selectedSplit?.stops || [];

  for (const area of selectedAreas) {
    // Find nights for this area from split
    const stopInfo = splitStops.find((s: any) => s.areaId === area.id);
    const nights = stopInfo?.nights || Math.floor((prefs.tripLength || 7) / selectedAreas.length);

    // Get selected hotel for this area
    const hotel = selectedHotels[area.id];

    const destination = createDestination(area, nights, hotel, prefs);
    destinations.push(destination);
  }

  // Build day mapping from destinations
  const dayMapping = buildDayMapping(destinations);

  // Build collections from selected restaurants and experiences
  const experiencesCollection: CollectionItem[] = [];
  const restaurantsCollection: CollectionItem[] = [];

  // Add experiences to collection (unscheduled)
  for (const [activityType, experiences] of Object.entries(selectedExperiences)) {
    for (const exp of experiences as any[]) {
      const item = transformExperienceToCollectionItem(exp, activityType, destinations);
      experiencesCollection.push(item);
    }
  }

  // Add restaurants to collection (unscheduled)
  for (const [cuisine, restaurants] of Object.entries(selectedRestaurants)) {
    for (const rest of restaurants as any[]) {
      const item = transformRestaurantToCollectionItem(rest, cuisine, destinations);
      restaurantsCollection.push(item);
    }
  }

  // Schedule restaurants to evening slots
  const scheduledRestaurants = scheduleRestaurants(
    selectedRestaurants,
    dayMapping,
    destinations
  );

  // Schedule experiences to morning/afternoon slots
  const scheduledExperiences = scheduleExperiences(
    selectedExperiences,
    dayMapping,
    destinations,
    pace
  );

  // Combine all scheduled items
  const scheduledItems: CollectionItem[] = [...scheduledRestaurants, ...scheduledExperiences];

  // Also add items from the generated itinerary if they exist
  if (data.itinerary?.days) {
    let dayIndex = 0;
    for (const day of data.itinerary.days) {
      // Schedule morning activity (only if not already covered by experiences)
      if (day.morning?.activity && day.morning.activity !== 'Free time') {
        const existingMorning = scheduledItems.find(
          item => item.scheduledDayIndex === dayIndex && item.order === 0
        );
        if (!existingMorning) {
          const item = createScheduledItemFromItinerary(day.morning, dayIndex, 0, destinations);
          if (item) scheduledItems.push(item);
        }
      }
      // Schedule afternoon activity (only if not already covered)
      if (day.afternoon?.activity && day.afternoon.activity !== 'Free time') {
        const existingAfternoon = scheduledItems.find(
          item => item.scheduledDayIndex === dayIndex && item.order === 1
        );
        if (!existingAfternoon) {
          const item = createScheduledItemFromItinerary(day.afternoon, dayIndex, 1, destinations);
          if (item) scheduledItems.push(item);
        }
      }
      // Schedule evening/dinner (only if not already covered by restaurants)
      if (day.evening?.activity && day.evening.activity !== 'Free time') {
        const existingEvening = scheduledItems.find(
          item => item.scheduledDayIndex === dayIndex && (item.order ?? 0) >= 10
        );
        if (!existingEvening) {
          const item = createScheduledItemFromItinerary(day.evening, dayIndex, 2, destinations);
          if (item) scheduledItems.push(item);
        }
      }
      dayIndex++;
    }
  }

  // Build the trip
  const trip: Trip = {
    id: tripId,
    basics,
    destinations,
    flights: {
      legs: [],
      isRoundTrip: true,
    },
    chatThreads: destinations.map(d => ({
      threadId: d.discovery.chatThreadId,
      destinationId: d.destinationId,
      messages: [],
      isComplete: true, // Mark as complete since we used Quick Plan
    })),
    currentStep: 6, // Go to itinerary builder step
    activeDestinationId: destinations[0]?.destinationId || null,
    createdAt: now,
    updatedAt: now,
  };

  return {
    trip,
    collections: {
      experiences: experiencesCollection,
      restaurants: restaurantsCollection,
    },
    scheduledItems,
  };
}

// ============================================================================
// DAY MAPPING & SCHEDULING FUNCTIONS
// ============================================================================

/**
 * Build a mapping of day indices to destinations
 * Each destination gets (nights) days assigned to it
 */
function buildDayMapping(destinations: Destination[]): DayMapping[] {
  const mapping: DayMapping[] = [];
  let currentDayIndex = 0;

  destinations.forEach((dest, idx) => {
    const nights = dest.nights || 1;

    // Each destination gets `nights` days (day 0 to day nights-1)
    // The departure day is handled by the next destination's arrival
    for (let i = 0; i < nights; i++) {
      mapping.push({
        dayIndex: currentDayIndex,
        destinationId: dest.destinationId,
        isArrivalDay: i === 0,
        isDepartureDay: i === nights - 1 && idx < destinations.length - 1,
      });
      currentDayIndex++;
    }
  });

  // Add final departure day for last destination
  if (destinations.length > 0) {
    const lastDest = destinations[destinations.length - 1];
    mapping.push({
      dayIndex: currentDayIndex,
      destinationId: lastDest.destinationId,
      isArrivalDay: false,
      isDepartureDay: true,
    });
  }

  return mapping;
}

/**
 * Schedule selected restaurants to evening slots across days
 */
function scheduleRestaurants(
  selectedRestaurants: Record<string, RestaurantCandidate[]>,
  dayMapping: DayMapping[],
  destinations: Destination[]
): CollectionItem[] {
  const scheduled: CollectionItem[] = [];

  // Build available evening slots per destination (skip departure days)
  const eveningSlots = new Map<string, number[]>();
  dayMapping.forEach(day => {
    if (!day.isDepartureDay) {
      const slots = eveningSlots.get(day.destinationId) || [];
      slots.push(day.dayIndex);
      eveningSlots.set(day.destinationId, slots);
    }
  });

  // Distribute restaurants to evenings
  for (const [cuisine, restaurants] of Object.entries(selectedRestaurants)) {
    if (!Array.isArray(restaurants)) continue;

    for (const rest of restaurants) {
      // Find which destination this restaurant belongs to
      const destId = findDestinationForRestaurant(rest, destinations);
      const slots = eveningSlots.get(destId);

      if (slots && slots.length > 0) {
        const dayIndex = slots.shift()!;
        scheduled.push({
          id: rest.id || rest.placeId || `rest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: rest.name,
          category: 'dining',
          mealType: 'dinner',
          cuisineType: cuisine,
          destinationId: destId,
          scheduledDayIndex: dayIndex,
          order: 10, // Evening position (higher than activities)
          durationMinutes: 90,
          lat: rest.lat,
          lng: rest.lng,
          rating: rest.googleRating,
          priceLevel: rest.priceLevel,
          address: rest.address,
          reservationRequired: rest.requiresReservation,
          source: { type: 'google' as const },
        });
      }
    }
  }

  return scheduled;
}

/**
 * Find destination ID for a restaurant based on nearArea or coordinates
 */
function findDestinationForRestaurant(
  rest: RestaurantCandidate,
  destinations: Destination[]
): string {
  // First try to match by nearArea
  if ((rest as any).nearArea) {
    const destByArea = destinations.find(d =>
      d.place.name.toLowerCase().includes((rest as any).nearArea.toLowerCase()) ||
      (rest as any).nearArea.toLowerCase().includes(d.place.name.toLowerCase())
    );
    if (destByArea) return destByArea.destinationId;
  }

  // Then try to find closest destination by coordinates
  if (rest.lat && rest.lng) {
    let closestDest = destinations[0];
    let minDistance = Infinity;

    for (const dest of destinations) {
      if (dest.place.lat && dest.place.lng) {
        const distance = Math.sqrt(
          Math.pow(rest.lat - dest.place.lat, 2) +
          Math.pow(rest.lng - dest.place.lng, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestDest = dest;
        }
      }
    }
    return closestDest?.destinationId || destinations[0]?.destinationId;
  }

  // Fallback to first destination
  return destinations[0]?.destinationId;
}

/**
 * Schedule selected experiences to morning/afternoon slots based on pace
 */
function scheduleExperiences(
  selectedExperiences: Record<string, any[]>,
  dayMapping: DayMapping[],
  destinations: Destination[],
  pace: 'chill' | 'balanced' | 'packed'
): CollectionItem[] {
  const scheduled: CollectionItem[] = [];
  const slotsPerDay = pace === 'chill' ? 1 : pace === 'balanced' ? 2 : 3;

  // Build available slots per destination (skip arrival days for first slot)
  const slots = new Map<string, { dayIndex: number; order: number }[]>();
  dayMapping.forEach(day => {
    // Skip departure days entirely for experiences
    if (day.isDepartureDay) return;

    const destSlots = slots.get(day.destinationId) || [];

    // On arrival days, only add afternoon slot (order 1)
    // On regular days, add morning (0) and afternoon (1) slots based on pace
    if (day.isArrivalDay) {
      destSlots.push({ dayIndex: day.dayIndex, order: 1 }); // afternoon only
    } else {
      for (let i = 0; i < Math.min(slotsPerDay, 2); i++) {
        destSlots.push({ dayIndex: day.dayIndex, order: i });
      }
    }

    slots.set(day.destinationId, destSlots);
  });

  // Schedule experiences
  for (const [activityType, experiences] of Object.entries(selectedExperiences)) {
    if (!Array.isArray(experiences)) continue;

    for (const exp of experiences) {
      const destId = findDestinationForExperience(exp, destinations);
      const destSlots = slots.get(destId);

      if (destSlots && destSlots.length > 0) {
        const { dayIndex, order } = destSlots.shift()!;
        scheduled.push({
          id: exp.id || exp.placeId || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: exp.name,
          category: mapActivityToCategory(activityType),
          description: exp.address || '',
          whyMatch: exp.reasons?.join('. ') || `Great for ${activityType}`,
          destinationId: destId,
          scheduledDayIndex: dayIndex,
          order,
          durationMinutes: exp.durationMinutes || 120,
          lat: exp.lat,
          lng: exp.lng,
          rating: exp.googleRating,
          address: exp.address,
          imageUrl: exp.imageUrl,
          source: { type: 'google' as const },
        });
      }
    }
  }

  return scheduled;
}

/**
 * Find destination ID for an experience based on nearArea or coordinates
 */
function findDestinationForExperience(
  exp: any,
  destinations: Destination[]
): string {
  // First try to match by nearArea
  if (exp.nearArea) {
    const destByArea = destinations.find(d =>
      d.place.name.toLowerCase().includes(exp.nearArea.toLowerCase()) ||
      exp.nearArea.toLowerCase().includes(d.place.name.toLowerCase())
    );
    if (destByArea) return destByArea.destinationId;
  }

  // Then try to find closest destination by coordinates
  if (exp.lat && exp.lng) {
    let closestDest = destinations[0];
    let minDistance = Infinity;

    for (const dest of destinations) {
      if (dest.place.lat && dest.place.lng) {
        const distance = Math.sqrt(
          Math.pow(exp.lat - dest.place.lat, 2) +
          Math.pow(exp.lng - dest.place.lng, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestDest = dest;
        }
      }
    }
    return closestDest?.destinationId || destinations[0]?.destinationId;
  }

  // Fallback to first destination
  return destinations[0]?.destinationId;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createDestination(
  area: AreaCandidate,
  nights: number,
  hotel: HotelCandidate | undefined,
  prefs: TripPreferences
): Destination {
  const destinationId = `dest_qp_${area.id}_${Date.now()}`;
  const chatThreadId = `chat_${destinationId}`;

  // Create place from area
  const place: Place = {
    name: area.name,
    countryCode: prefs.destinationContext?.countryCode || 'XX',
    lat: area.centerLat || 0,
    lng: area.centerLng || 0,
    placeId: area.googlePlaceId,
  };

  // Transform hotel if selected
  const hotelResult: Hotel | null = hotel ? {
    id: hotel.id || hotel.placeId,
    name: hotel.name,
    address: hotel.address || '',
    city: area.name,
    countryCode: prefs.destinationContext?.countryCode || 'XX',
    stars: Math.round(hotel.googleRating || 4),
    pricePerNight: hotel.pricePerNight || 0,
    totalPrice: (hotel.pricePerNight || 0) * nights,
    currency: 'USD',
    imageUrl: hotel.imageUrl || '',
    amenities: [],
    distanceToCenter: 0,
    lat: hotel.lat || area.centerLat || 0,
    lng: hotel.lng || area.centerLng || 0,
    guestRating: hotel.googleRating ? hotel.googleRating * 2 : undefined, // Convert 5-star to 10-point
    reviewCount: hotel.reviewCount,
    source: 'google',
    hasRealPricing: !!hotel.pricePerNight,
  } : null;

  return {
    destinationId,
    place,
    nights,
    heroImageUrl: null, // AreaCandidate doesn't have imageUrl
    discovery: {
      chatThreadId,
      recommendations: [],
      selectedSpotIds: [],
      isComplete: true,
    },
    experiences: {
      items: [],
      selectedExperienceIds: [],
    },
    hotels: {
      query: prefs.startDate && prefs.endDate ? {
        checkIn: prefs.startDate.toISOString().split('T')[0],
        checkOut: prefs.endDate.toISOString().split('T')[0],
        guests: (prefs.adults || 2) + (prefs.children || 0),
        maxPricePerNight: prefs.budgetPerNight?.max,
      } : null,
      results: hotelResult ? [hotelResult] : [],
      selectedHotelId: hotelResult?.id || null,
    },
  };
}

function transformExperienceToCollectionItem(
  exp: any,
  activityType: string,
  destinations: Destination[]
): CollectionItem {
  // Find which destination this experience belongs to based on nearArea
  const destId = findDestinationIdByArea(exp.nearArea, destinations);

  return {
    id: exp.id || exp.placeId || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: exp.name,
    category: mapActivityToCategory(activityType),
    description: exp.address || '',
    whyMatch: exp.reasons?.join('. ') || `Great for ${activityType}`,
    imageUrl: exp.imageUrl || undefined,
    rating: exp.googleRating,
    reviewCount: exp.reviewCount,
    lat: exp.lat,
    lng: exp.lng,
    durationMinutes: 120, // Default 2 hours
    address: exp.address,
    destinationId: destId,
    source: {
      type: 'google' as const,
    },
  };
}

function transformRestaurantToCollectionItem(
  rest: RestaurantCandidate,
  cuisine: string,
  destinations: Destination[]
): CollectionItem {
  const destId = findDestinationIdByArea((rest as any).nearArea, destinations);

  return {
    id: rest.id || rest.placeId || `rest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: rest.name,
    category: 'dining',
    description: rest.address || '',
    whyMatch: rest.reasons?.join('. ') || `Great ${cuisine} restaurant`,
    imageUrl: rest.imageUrl || undefined,
    rating: rest.googleRating,
    reviewCount: rest.reviewCount,
    lat: rest.lat,
    lng: rest.lng,
    durationMinutes: 90, // Default 1.5 hours for dining
    address: rest.address,
    priceLevel: rest.priceLevel,
    cuisineType: cuisine,
    destinationId: destId,
    mealType: 'dinner',
    reservationRequired: rest.requiresReservation,
    source: {
      type: 'google' as const,
    },
  };
}

function createScheduledItemFromItinerary(
  slot: any,
  dayIndex: number,
  order: number,
  destinations: Destination[]
): CollectionItem | null {
  if (!slot || !slot.activity) return null;

  const activity = slot.activity;
  const description = slot.description || activity;

  // Try to match with a destination
  let destId: string | undefined;
  if (slot.areaId) {
    destId = findDestinationIdByAreaId(slot.areaId, destinations);
  }

  return {
    id: `sched_${dayIndex}_${order}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: activity,
    category: guessCategory(activity, order),
    description,
    whyMatch: slot.reason || '',
    destinationId: destId,
    scheduledDayIndex: dayIndex,
    order,
    durationMinutes: slot.durationMinutes || (order === 2 ? 90 : 120), // Evening = 90min, others = 2hr
    lat: slot.lat,
    lng: slot.lng,
    source: {
      type: 'ai' as const,
    },
  };
}

function findDestinationIdByArea(areaName: string | undefined, destinations: Destination[]): string | undefined {
  if (!areaName) return destinations[0]?.destinationId;

  const dest = destinations.find(d =>
    d.place.name.toLowerCase().includes(areaName.toLowerCase()) ||
    areaName.toLowerCase().includes(d.place.name.toLowerCase())
  );
  return dest?.destinationId || destinations[0]?.destinationId;
}

function findDestinationIdByAreaId(areaId: string, destinations: Destination[]): string | undefined {
  const dest = destinations.find(d => d.destinationId.includes(areaId));
  return dest?.destinationId || destinations[0]?.destinationId;
}

function mapActivityToCategory(activityType: string): string {
  const categoryMap: Record<string, string> = {
    surf: 'water_sports',
    snorkel: 'water_sports',
    dive: 'water_sports',
    swimming: 'water_sports',
    wildlife: 'nature',
    hiking: 'outdoor',
    adventure: 'adventure',
    cultural: 'cultural',
    food_tour: 'food_tours',
    nightlife: 'nightlife',
    beach: 'beaches',
    spa_wellness: 'wellness',
    golf: 'outdoor',
    photography: 'landmarks',
    horseback: 'adventure',
    boat: 'water_sports',
    fishing: 'outdoor',
  };
  return categoryMap[activityType] || 'outdoor';
}

function guessCategory(activity: string, order: number): string {
  const lower = activity.toLowerCase();

  if (order === 2 || lower.includes('dinner') || lower.includes('restaurant')) return 'dining';
  if (lower.includes('beach')) return 'beaches';
  if (lower.includes('surf') || lower.includes('snorkel') || lower.includes('dive') || lower.includes('swim')) return 'water_sports';
  if (lower.includes('hike') || lower.includes('trail')) return 'outdoor';
  if (lower.includes('museum') || lower.includes('tour') || lower.includes('historical')) return 'cultural';
  if (lower.includes('spa') || lower.includes('wellness') || lower.includes('relax')) return 'wellness';

  return 'outdoor';
}

function calculateTotalBudget(prefs: TripPreferences): number {
  const nights = prefs.tripLength || 7;
  const perNight = prefs.budgetPerNight?.max || 200;
  const travelers = (prefs.adults || 2) + (prefs.children || 0);

  // Estimate: hotel + food + activities per day
  const hotelTotal = perNight * nights;
  const foodPerDay = 100 * travelers; // ~$100/person/day for food
  const activitiesPerDay = 50 * travelers; // ~$50/person/day for activities

  return hotelTotal + (foodPerDay + activitiesPerDay) * nights;
}

function mapBudgetStyle(maxPerNight: number): BudgetStyle {
  if (maxPerNight <= 100) return 'budget';
  if (maxPerNight <= 250) return 'mid';
  if (maxPerNight <= 500) return 'premium';
  return 'luxury';
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Save transformed trip data to localStorage for the main planner
 */
export function saveQuickPlanToTripStore(transformedData: TransformedTripData): void {
  const storeData = {
    state: {
      trip: transformedData.trip,
      collections: transformedData.collections,
      scheduledItems: transformedData.scheduledItems,
      customLists: [],
      experienceCart: [],
      diningReservations: [],
      itineraryAssignments: [],
      _hasHydrated: true,
    },
    version: 0,
  };

  localStorage.setItem('wandercraft-trip-v2', JSON.stringify(storeData));
  console.log('[QuickPlan] Saved trip to store:', transformedData.trip.id);
}

/**
 * Full flow: transform Quick Plan data and save to store
 */
export function finalizeQuickPlanTrip(orchestratorState: OrchestratorState): string {
  const quickPlanData: QuickPlanData = {
    preferences: orchestratorState.preferences as TripPreferences,
    discoveredData: {
      areas: orchestratorState.discoveredData.areas,
      hotels: orchestratorState.discoveredData.hotels,
      restaurants: orchestratorState.discoveredData.restaurants,
      experiences: (orchestratorState.discoveredData as any).experiences,
    },
    itinerary: orchestratorState.itinerary || undefined,
  };

  const transformed = transformQuickPlanToTrip(quickPlanData);
  saveQuickPlanToTripStore(transformed);

  return transformed.trip.id;
}
