/**
 * Itinerary Generator
 * Builds day-by-day schedule using layered generation:
 * 1. Skeleton (areas + nights allocation)
 * 2. Hotels (one per area)
 * 3. Dining (based on dining mode)
 * 4. Daily activities (respecting intensity budget)
 */

import {
  TripPreferences,
  AreaCandidate,
  HotelCandidate,
  RestaurantCandidate,
  QuickPlanItinerary,
  QuickPlanDay,
  QualityCheckResult,
  ItineraryStop,
  DayBlock,
  ActivityIntent,
  ActivityType,
} from '@/types/quick-plan';

// Local types for itinerary generation
interface ItinerarySkeleton {
  stops: SkeletonStop[];
  totalNights: number;
  transferDays: number[];
}

interface SkeletonStop {
  areaId: string;
  areaName: string;
  area?: AreaCandidate;
  hotel?: HotelCandidate;
  nights: number;
  arrivalDay: number;
  departureDay: number;
  hotelId?: string;
  hotelName?: string;
  restaurants?: RestaurantCandidate[];
}

interface ScheduledActivity {
  id: string;
  type: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  effortCost: number;
  location?: { lat: number; lng: number };
}

interface ScheduledMeal {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  name: string;
  time?: string;
  restaurant?: RestaurantCandidate;
  restaurantPlaceId?: string;
  cuisine?: string;
  priceLevel?: number;
  isAtHotel?: boolean;
  isFlexible?: boolean;
  notes?: string;
}
import {
  PACE_DAILY_BUDGET,
  getActivityEffortCost,
  calculateDayEffort,
  getBestTimeBlock,
  findAvailableSlot,
  distributeActivities,
} from './intensity-budget';

/**
 * Generate complete itinerary from preferences
 */
export async function generateItinerary(
  preferences: TripPreferences,
  areas: AreaCandidate[],
  hotels: Map<string, HotelCandidate>,
  restaurants: Map<string, RestaurantCandidate[]>,
): Promise<QuickPlanItinerary> {
  // Step 1: Generate skeleton
  const skeleton = generateSkeleton(preferences, areas);

  // Step 2: Attach hotels to skeleton
  const skeletonWithHotels = attachHotelsToSkeleton(skeleton, hotels);

  // Step 3: Generate daily schedules
  const days = generateDailySchedules(
    skeletonWithHotels,
    preferences,
    restaurants
  );

  // Step 4: Build final itinerary
  const itinerary: QuickPlanItinerary = {
    id: generateId(),
    stops: skeletonWithHotels.stops.map((s, idx) => ({
      areaId: s.areaId,
      area: s.area || createFallbackArea(s.areaId, s.areaName),
      nights: s.nights,
      order: idx,
      arrivalDay: s.arrivalDay,
      departureDay: s.departureDay,
      isArrivalCity: idx === 0,
      isDepartureCity: idx === skeletonWithHotels.stops.length - 1,
      travelDayBefore: idx > 0,
    })),
    days,
    hotelShortlists: [],
    diningPlan: {
      mode: preferences.diningMode || 'list',
      restaurantsByStop: {},
      scheduledDinners: [],
      freeNights: [],
    },
    evidenceRefs: [],
    confidenceSummary: {
      overall: 0.8,
      byCategory: {
        areas: 0.8,
        hotels: 0.7,
        restaurants: 0.6,
        activities: 0.7,
        schedule: 0.8,
      },
      lowConfidenceItems: [],
      unknownPrices: [],
    },
    qualityCheckPassed: true,
    unmetConstraints: [],
    generatedAt: new Date(),
    generationLayer: 'complete',
  };

  return itinerary;
}

/**
 * Generate itinerary skeleton (areas + nights)
 */
export function generateSkeleton(
  preferences: TripPreferences,
  areas: AreaCandidate[]
): ItinerarySkeleton {
  const selectedSplit = preferences.selectedSplit;

  if (!selectedSplit || !selectedSplit.stops || selectedSplit.stops.length === 0) {
    // Default to top area for all nights
    const topArea = areas[0];
    if (!topArea) {
      // No areas available - create a minimal fallback
      return {
        stops: [{
          areaId: 'default',
          areaName: 'Destination',
          nights: preferences.tripLength || 7,
          arrivalDay: 1,
          departureDay: (preferences.tripLength || 7) + 1,
        }],
        totalNights: preferences.tripLength || 7,
        transferDays: [],
      };
    }
    return {
      stops: [{
        areaId: topArea.id,
        areaName: topArea.name,
        nights: preferences.tripLength,
        arrivalDay: 1,
        departureDay: preferences.tripLength + 1,
      }],
      totalNights: preferences.tripLength,
      transferDays: [],
    };
  }

  // Build stops from selected split
  const stops: SkeletonStop[] = [];
  let currentDay = 1;
  const transferDays: number[] = [];

  for (let i = 0; i < selectedSplit.stops.length; i++) {
    const stop = selectedSplit.stops[i];
    // Extract area info from ItineraryStop
    const areaId = stop.areaId || stop.area?.id || `area-${i}`;
    const areaName = stop.area?.name || `Area ${i + 1}`;
    const nights = stop.nights || 1;

    stops.push({
      areaId,
      areaName,
      nights,
      arrivalDay: currentDay,
      departureDay: currentDay + nights,
      hotelId: undefined, // Will be filled by attachHotelsToSkeleton
    });

    // Track transfer days (departure days, except last)
    if (i < selectedSplit.stops.length - 1) {
      transferDays.push(currentDay + nights);
    }

    currentDay += nights;
  }

  return {
    stops,
    totalNights: preferences.tripLength,
    transferDays,
  };
}

/**
 * Attach selected hotels to skeleton stops
 */
function attachHotelsToSkeleton(
  skeleton: ItinerarySkeleton,
  hotels: Map<string, HotelCandidate>
): ItinerarySkeleton {
  return {
    ...skeleton,
    stops: skeleton.stops.map(stop => {
      const hotel = hotels.get(stop.areaId);
      return {
        ...stop,
        hotelId: hotel?.placeId,
        hotelName: hotel?.name,
      };
    }),
  };
}

/**
 * Generate daily schedules
 */
function generateDailySchedules(
  skeleton: ItinerarySkeleton,
  preferences: TripPreferences,
  restaurants: Map<string, RestaurantCandidate[]>
): QuickPlanDay[] {
  const days: QuickPlanDay[] = [];

  // Normalize activities - handle both string arrays and ActivityIntent arrays
  const normalizedActivities = normalizeActivities(preferences.selectedActivities);

  const activityDistribution = distributeActivities(
    normalizedActivities,
    preferences.tripLength,
    preferences.pace
  );

  for (let dayNum = 1; dayNum <= preferences.tripLength; dayNum++) {
    const stop = getStopForDay(skeleton, dayNum);
    const isTransferDay = skeleton.transferDays.includes(dayNum);
    const isFirstDay = dayNum === 1;
    const isLastDay = dayNum === preferences.tripLength;

    // Get activities for this day
    const dayActivities = activityDistribution.get(dayNum) || [];

    // Generate scheduled activities
    const activities = generateDayActivities(
      dayNum,
      dayActivities,
      preferences,
      stop,
      isTransferDay
    );

    // Generate meals
    const meals = generateDayMeals(
      dayNum,
      preferences,
      stop,
      restaurants.get(stop.areaId) || []
    );

    // Convert activities and meals to DayBlocks
    const morningBlock = createDayBlock(activities, meals, 'morning');
    const afternoonBlock = createDayBlock(activities, meals, 'afternoon');
    const eveningBlock = createDayBlock(activities, meals, 'evening');

    // Calculate effort points from blocks
    const dayEffortPoints =
      (morningBlock?.effortCost || 0) +
      (afternoonBlock?.effortCost || 0) +
      (eveningBlock?.effortCost || 0);

    // Build day
    const day: QuickPlanDay = {
      dayNumber: dayNum,
      date: calculateDate(preferences.startDate, dayNum),
      stopId: stop.areaId,
      morning: morningBlock,
      afternoon: afternoonBlock,
      evening: eveningBlock,
      isTransitDay: isTransferDay,
      effortPoints: dayEffortPoints,
      notes: generateDayNotes(isTransferDay, isFirstDay, isLastDay, stop).join('. '),
    };

    days.push(day);
  }

  return days;
}

/**
 * Get the stop that contains a specific day
 */
function getStopForDay(skeleton: ItinerarySkeleton, dayNum: number): SkeletonStop {
  for (const stop of skeleton.stops) {
    if (dayNum >= stop.arrivalDay && dayNum < stop.departureDay) {
      return stop;
    }
  }
  // Default to last stop
  return skeleton.stops[skeleton.stops.length - 1];
}

/**
 * Generate activities for a single day
 */
function generateDayActivities(
  dayNum: number,
  plannedActivities: { type: string; priority: string }[],
  preferences: TripPreferences,
  stop: SkeletonStop,
  isTransferDay: boolean
): ScheduledActivity[] {
  const activities: ScheduledActivity[] = [];
  const dailyBudget = PACE_DAILY_BUDGET[preferences.pace || 'balanced'];

  // Reduce budget for transfer days
  const effectiveBudget = isTransferDay ? dailyBudget * 0.5 : dailyBudget;
  let usedBudget = 0;

  // Add transfer activity if needed
  if (isTransferDay) {
    activities.push({
      id: `${dayNum}-transfer`,
      type: 'transfer',
      name: 'Transfer to next destination',
      description: 'Travel day - check out and drive to next area',
      startTime: '10:00',
      endTime: '13:00',
      durationHours: 3,
      effortCost: 1.5,
    });
    usedBudget += 1.5;
  }

  // Schedule planned activities
  for (const activity of plannedActivities) {
    const effortCost = getActivityEffortCost(activity.type);

    if (usedBudget + effortCost > effectiveBudget) {
      continue; // Skip if over budget
    }

    const slot = findAvailableSlot(activities, activity.type);
    if (!slot) continue;

    const duration = getActivityDuration(activity.type);

    activities.push({
      id: `${dayNum}-${activity.type}`,
      type: activity.type,
      name: getActivityName(activity.type, stop.areaName),
      description: getActivityDescription(activity.type, stop.areaName),
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationHours: duration,
      effortCost,
    });

    usedBudget += effortCost;
  }

  // Fill remaining time with area-appropriate activities if under budget
  if (usedBudget < effectiveBudget * 0.6 && preferences.pace !== 'chill') {
    const freeTimeActivity = getFreeTimeActivity(preferences.pace, stop);
    const slot = findAvailableSlot(activities, freeTimeActivity.type);

    if (slot) {
      activities.push({
        id: `${dayNum}-free`,
        type: freeTimeActivity.type,
        name: freeTimeActivity.name,
        description: freeTimeActivity.description,
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationHours: freeTimeActivity.duration,
        effortCost: getActivityEffortCost(freeTimeActivity.type),
      });
    }
  }

  // Sort by start time
  return activities.sort((a, b) =>
    parseTime(a.startTime) - parseTime(b.startTime)
  );
}

/**
 * Generate meals for a single day
 */
function generateDayMeals(
  dayNum: number,
  preferences: TripPreferences,
  stop: SkeletonStop,
  areaRestaurants: RestaurantCandidate[]
): ScheduledMeal[] {
  const meals: ScheduledMeal[] = [];

  // Only generate meals if dining mode is 'planned' or 'list_only'
  if (preferences.diningMode === 'none') {
    return meals;
  }

  // Breakfast - usually at hotel
  meals.push({
    id: `${dayNum}-breakfast`,
    mealType: 'breakfast',
    time: '08:00',
    name: `Breakfast at ${stop.hotelName || 'hotel'}`,
    isAtHotel: true,
  });

  // Lunch - find a casual spot
  const lunchOptions = areaRestaurants.filter(r =>
    (r.priceLevel ?? 2) <= 2 || (r.cuisine || []).includes('casual')
  );
  const lunchSpot = lunchOptions[dayNum % Math.max(1, lunchOptions.length)];

  if (lunchSpot && (preferences.diningMode === 'schedule' || preferences.diningMode === 'plan')) {
    meals.push({
      id: `${dayNum}-lunch`,
      mealType: 'lunch',
      time: '12:30',
      name: lunchSpot.name,
      restaurantPlaceId: lunchSpot.placeId,
      cuisine: (lunchSpot.cuisine || []).join(', '),
      priceLevel: lunchSpot.priceLevel,
    });
  } else {
    meals.push({
      id: `${dayNum}-lunch`,
      mealType: 'lunch',
      time: '12:30',
      name: 'Lunch (flexible)',
      isFlexible: true,
    });
  }

  // Dinner - pick from top restaurants
  const dinnerOptions = areaRestaurants.filter(r =>
    (r.googleRating ?? 0) >= 4.0 || (r.redditScore ?? 0) > 0
  );
  const dinnerSpot = dinnerOptions[dayNum % Math.max(1, dinnerOptions.length)];

  if (dinnerSpot && (preferences.diningMode === 'schedule' || preferences.diningMode === 'plan')) {
    meals.push({
      id: `${dayNum}-dinner`,
      mealType: 'dinner',
      time: '19:00',
      name: dinnerSpot.name,
      restaurantPlaceId: dinnerSpot.placeId,
      cuisine: (dinnerSpot.cuisine || []).join(', '),
      priceLevel: dinnerSpot.priceLevel,
      notes: (dinnerSpot.evidence || []).length > 0 && dinnerSpot.evidence[0].snippet
        ? `Recommended: "${dinnerSpot.evidence[0].snippet}"`
        : undefined,
    });
  } else {
    meals.push({
      id: `${dayNum}-dinner`,
      mealType: 'dinner',
      time: '19:00',
      name: 'Dinner (flexible)',
      isFlexible: true,
    });
  }

  return meals;
}

/**
 * Get theme/title for a day
 */
function getDayTheme(
  activities: { type: string }[],
  isTransferDay: boolean,
  isFirstDay: boolean,
  isLastDay: boolean
): string {
  if (isTransferDay) return 'Travel Day';
  if (isFirstDay) return 'Arrival & Settle In';
  if (isLastDay) return 'Final Day & Departure';

  const activityTypes = activities.map(a => a.type);

  if (activityTypes.includes('surf')) return 'Surf Day';
  if (activityTypes.includes('diving') || activityTypes.includes('snorkel')) return 'Ocean Adventure';
  if (activityTypes.includes('hiking') || activityTypes.includes('adventure')) return 'Adventure Day';
  if (activityTypes.includes('beach') && activityTypes.includes('spa')) return 'Relaxation Day';
  if (activityTypes.includes('beach')) return 'Beach Day';
  if (activityTypes.includes('city_walk') || activityTypes.includes('culture')) return 'Cultural Exploration';
  if (activityTypes.includes('food_tour')) return 'Culinary Experience';

  return 'Exploration Day';
}

/**
 * Generate notes for a day
 */
function generateDayNotes(
  isTransferDay: boolean,
  isFirstDay: boolean,
  isLastDay: boolean,
  stop: SkeletonStop
): string[] {
  const notes: string[] = [];

  if (isFirstDay) {
    notes.push('Check-in at hotel (usually 3pm, early check-in may be available)');
    notes.push('Take it easy - adjust to local time');
  }

  if (isLastDay) {
    notes.push('Check-out by 11am (late check-out may be available)');
    notes.push('Leave time for airport transfer');
  }

  if (isTransferDay) {
    notes.push('Pack up and check out in the morning');
    notes.push(`Drive to ${stop.areaName} - scenic route recommended`);
  }

  return notes;
}

// NOTE: calculateTotalCost and generateSummary functions removed - they referenced
// an old data structure (day.activities/meals arrays) that no longer exists in QuickPlanDay.
// These were unused functions. If cost calculation is needed, it should be reimplemented
// to work with the DayBlock structure (morning/afternoon/evening).

// Helper functions

/**
 * Normalize activities - handles both string arrays and ActivityIntent arrays
 */
function normalizeActivities(activities: any[]): ActivityIntent[] {
  if (!activities || activities.length === 0) {
    return [];
  }

  return activities.map((activity, index) => {
    // If it's already an ActivityIntent object with type property
    if (typeof activity === 'object' && activity !== null && activity.type) {
      return {
        type: activity.type as ActivityType,
        priority: activity.priority || 'must-do',
        targetDays: activity.targetDays,
      } as ActivityIntent;
    }

    // If it's a string, convert to ActivityIntent
    if (typeof activity === 'string') {
      return {
        type: activity as ActivityType,
        priority: index < 3 ? 'must-do' : 'nice-to-have', // First 3 are must-do
        targetDays: undefined,
      } as ActivityIntent;
    }

    // Default fallback
    return {
      type: String(activity) as ActivityType,
      priority: 'nice-to-have' as const,
    } as ActivityIntent;
  });
}

function generateId(): string {
  return `qp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateDate(startDate: Date | null | undefined, dayNum: number): string {
  if (!startDate) {
    return `Day ${dayNum}`;
  }
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNum - 1);
  return date.toISOString().split('T')[0];
}

function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + (minutes || 0) / 60;
}

function getActivityDuration(type: string): number {
  const durations: Record<string, number> = {
    surf: 3,
    diving: 4,
    snorkel: 2.5,
    hiking: 4,
    adventure: 3,
    beach: 3,
    pool: 2,
    spa: 2,
    golf: 4,
    kayak: 2,
    paddleboard: 1.5,
    city_walk: 2,
    museum: 1.5,
    shopping: 2,
    food_tour: 3,
    transfer: 3,
    excursion: 4,
  };
  return durations[type] || 2;
}

function getActivityName(type: string, areaName: string): string {
  if (!type) return 'Free time';

  const names: Record<string, string> = {
    surf: `Surfing session`,
    diving: `Scuba diving excursion`,
    snorkel: `Snorkeling trip`,
    hiking: `Hiking adventure`,
    adventure: `Outdoor adventure`,
    beach: `Beach time`,
    pool: `Pool & relaxation`,
    spa: `Spa treatment`,
    golf: `Golf round`,
    kayak: `Kayaking`,
    paddleboard: `Stand-up paddleboarding`,
    city_walk: `Walking tour of ${areaName}`,
    museum: `Museum visit`,
    shopping: `Shopping & exploring`,
    food_tour: `Food tour`,
    nightlife: `Evening out`,
  };
  return names[type] || `${(type || '').replace('_', ' ')}`;
}

function getActivityDescription(type: string, areaName: string): string {
  if (!type) return `Free time to explore ${areaName}.`;

  const descriptions: Record<string, string> = {
    surf: `Hit the waves at a local surf spot. Rentals and lessons available.`,
    diving: `Explore underwater reefs and marine life with certified guides.`,
    snorkel: `Swim with tropical fish in crystal clear waters.`,
    hiking: `Trek through scenic trails with stunning views.`,
    adventure: `Get your adrenaline pumping with local adventure activities.`,
    beach: `Relax on the sand, swim in the ocean, and soak up the sun.`,
    pool: `Chill by the pool at your hotel.`,
    spa: `Unwind with a massage or spa treatment.`,
    golf: `Play a round at a nearby golf course.`,
    kayak: `Paddle through calm waters and explore the coastline.`,
    paddleboard: `Try stand-up paddleboarding in calm bays.`,
    city_walk: `Explore the streets, architecture, and local life.`,
    museum: `Discover local history and culture.`,
    shopping: `Browse local shops, markets, and boutiques.`,
    food_tour: `Taste local specialties and hidden gems.`,
    nightlife: `Experience the local bar and club scene.`,
  };
  return descriptions[type] || `Enjoy ${(type || '').replace('_', ' ')} activities in ${areaName}.`;
}

function getFreeTimeActivity(pace: string, stop: SkeletonStop): {
  type: string;
  name: string;
  description: string;
  duration: number;
} {
  if (pace === 'packed') {
    return {
      type: 'city_walk',
      name: `Explore ${stop.areaName}`,
      description: 'Free time to wander and discover the area',
      duration: 2,
    };
  }
  return {
    type: 'beach',
    name: 'Beach relaxation',
    description: 'Free time at the beach or pool',
    duration: 2,
  };
}

function createDayBlock(
  activities: ScheduledActivity[],
  meals: ScheduledMeal[],
  timeOfDay: 'morning' | 'afternoon' | 'evening'
): DayBlock | null {
  const timeRanges = {
    morning: { start: 6, end: 12 },
    afternoon: { start: 12, end: 18 },
    evening: { start: 18, end: 24 },
  };

  const range = timeRanges[timeOfDay];

  // Find activity in this time range
  const activity = activities.find((a) => {
    const startHour = parseTime(a.startTime);
    return startHour >= range.start && startHour < range.end;
  });

  // Find meal in this time range
  const meal = meals.find((m) => {
    const startHour = parseTime(m.time || '00:00');
    return startHour >= range.start && startHour < range.end;
  });

  // Prefer activity over meal for the block
  if (activity) {
    return {
      id: activity.id,
      type: 'activity',
      title: activity.name,
      description: activity.description,
      startTime: activity.startTime,
      endTime: activity.endTime,
      duration: activity.durationHours * 60,
      effortCost: activity.effortCost,
    };
  }

  if (meal && !meal.isAtHotel) {
    return {
      id: meal.id,
      type: 'meal',
      title: meal.name,
      description: meal.cuisine ? `Cuisine: ${meal.cuisine}` : undefined,
      startTime: meal.time || '12:00',
      endTime: addHours(meal.time || '12:00', 1.5),
      duration: 90,
      effortCost: 0.5,
    };
  }

  // Return null if no activity for this block
  return null;
}

function addHours(time: string, hours: number): string {
  const parsed = parseTime(time);
  const newTime = parsed + hours;
  const h = Math.floor(newTime);
  const m = Math.round((newTime - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function createFallbackArea(areaId: string, areaName: string): AreaCandidate {
  return {
    id: areaId,
    name: areaName,
    type: 'region',
    description: `Area: ${areaName}`,
    centerLat: 0,
    centerLng: 0,
    activityFitScore: 0.5,
    vibeFitScore: 0.5,
    budgetFitScore: 0.5,
    overallScore: 0.5,
    bestFor: [],
    notIdealFor: [],
    whyItFits: [],
    caveats: [],
    evidence: [],
    confidenceScore: 0.5,
    suggestedNights: 1,
  };
}
