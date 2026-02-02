/**
 * Daily Intensity Budget Calculator
 * Prevents "fantasy itineraries" by enforcing effort point limits per day
 *
 * Budget by pace:
 * - chill: 3 effort points/day (2 activities max)
 * - balanced: 4 effort points/day (2-3 activities)
 * - packed: 5 effort points/day (3-4 activities)
 */

import {
  TripPreferences,
  ActivityIntent,
  QuickPlanDay,
  PaceLevel,
} from '@/types/quick-plan';

// Local type alias for backwards compatibility
type TripPace = PaceLevel;
type ItineraryDay = QuickPlanDay;

// Local type for scheduled activities
interface ScheduledActivity {
  id: string;
  type: string;
  name: string;
  durationHours?: number;
  effortCost?: number;
  startTime?: string;
  endTime?: string;
  timeBlock?: string;
}

// Effort costs for different activity types
export const ACTIVITY_EFFORT_COSTS: Record<string, number> = {
  // Low effort (1 point)
  beach: 1,
  pool: 1,
  spa: 1,
  breakfast: 0.5,
  lunch: 0.5,
  dinner: 1,
  sunset: 0.5,

  // Medium effort (2 points)
  snorkel: 2,
  swimming: 1.5,
  kayak: 2,
  paddleboard: 2,
  golf: 2,
  shopping: 1.5,
  museum: 1.5,
  city_walk: 2,
  food_tour: 2,
  cooking_class: 2,
  nightlife: 2,

  // High effort (3 points)
  surf: 3,
  diving: 3,
  hiking: 3,
  adventure: 3,
  excursion: 2.5,
  day_trip: 3,
  water_sports: 2.5,

  // Very high effort (4+ points)
  multi_day_trek: 4,
  full_day_tour: 4,
};

// Time blocks for scheduling
export type TimeBlock = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export const TIME_BLOCK_HOURS: Record<TimeBlock, { start: number; end: number }> = {
  early_morning: { start: 6, end: 8 },
  morning: { start: 8, end: 12 },
  midday: { start: 12, end: 14 },
  afternoon: { start: 14, end: 18 },
  evening: { start: 18, end: 21 },
  night: { start: 21, end: 24 },
};

// Pace to daily budget mapping
export const PACE_DAILY_BUDGET: Record<TripPace, number> = {
  chill: 3,
  balanced: 4,
  packed: 5,
};

// Maximum activities per time block
export const MAX_ACTIVITIES_PER_BLOCK = 1;

/**
 * Calculate effort cost for an activity
 */
export function getActivityEffortCost(activityType: string, durationHours?: number): number {
  const baseCost = ACTIVITY_EFFORT_COSTS[activityType] ?? 2;

  // Adjust for duration if provided
  if (durationHours) {
    if (durationHours > 4) return baseCost * 1.5;
    if (durationHours < 1) return baseCost * 0.5;
  }

  return baseCost;
}

/**
 * Calculate total effort for a day's activities
 */
export function calculateDayEffort(activities: ScheduledActivity[]): number {
  return activities.reduce((total, activity) => {
    return total + getActivityEffortCost(activity.type, activity.durationHours);
  }, 0);
}

/**
 * Check if a day is within budget
 */
export function isDayWithinBudget(activities: ScheduledActivity[], pace: TripPace): boolean {
  const effort = calculateDayEffort(activities);
  const budget = PACE_DAILY_BUDGET[pace];
  return effort <= budget;
}

/**
 * Get remaining budget for a day
 */
export function getRemainingBudget(activities: ScheduledActivity[], pace: TripPace): number {
  const effort = calculateDayEffort(activities);
  const budget = PACE_DAILY_BUDGET[pace];
  return Math.max(0, budget - effort);
}

/**
 * Check if an activity can be added to a day
 */
export function canAddActivity(
  existingActivities: ScheduledActivity[],
  newActivityType: string,
  pace: TripPace,
  durationHours?: number
): boolean {
  const currentEffort = calculateDayEffort(existingActivities);
  const newEffort = getActivityEffortCost(newActivityType, durationHours);
  const budget = PACE_DAILY_BUDGET[pace];

  return (currentEffort + newEffort) <= budget;
}

/**
 * Determine best time block for an activity
 */
export function getBestTimeBlock(activityType: string): TimeBlock[] {
  // Activity type to preferred time blocks
  const preferredBlocks: Record<string, TimeBlock[]> = {
    // Morning activities
    surf: ['early_morning', 'morning'],
    hiking: ['early_morning', 'morning'],
    diving: ['morning', 'afternoon'],
    snorkel: ['morning', 'afternoon'],
    breakfast: ['morning'],

    // Midday activities
    lunch: ['midday'],
    beach: ['morning', 'afternoon'],
    pool: ['morning', 'afternoon', 'midday'],
    swimming: ['morning', 'afternoon'],

    // Afternoon activities
    spa: ['afternoon', 'morning'],
    golf: ['morning', 'afternoon'],
    shopping: ['afternoon', 'morning'],
    museum: ['afternoon', 'morning'],
    excursion: ['morning', 'afternoon'],

    // Evening activities
    dinner: ['evening'],
    sunset: ['evening'],
    nightlife: ['night'],

    // Flexible
    city_walk: ['morning', 'afternoon', 'evening'],
    adventure: ['morning', 'afternoon'],
  };

  return preferredBlocks[activityType] || ['morning', 'afternoon'];
}

/**
 * Find an available time slot for an activity
 */
export function findAvailableSlot(
  existingActivities: ScheduledActivity[],
  activityType: string,
  durationHours: number = 2
): { startTime: string; endTime: string; timeBlock: TimeBlock } | null {
  const preferredBlocks = getBestTimeBlock(activityType);
  const occupiedTimes = existingActivities
    .filter(a => a.startTime && a.endTime)
    .map(a => ({
      start: parseTime(a.startTime!),
      end: parseTime(a.endTime!),
    }));

  for (const block of preferredBlocks) {
    const blockHours = TIME_BLOCK_HOURS[block];
    const blockStart = blockHours.start;
    const blockEnd = blockHours.end;

    // Check if there's room in this block
    const conflicting = occupiedTimes.some(t =>
      (t.start < blockEnd && t.end > blockStart)
    );

    if (!conflicting) {
      return {
        startTime: formatTime(blockStart),
        endTime: formatTime(Math.min(blockStart + durationHours, blockEnd)),
        timeBlock: block,
      };
    }
  }

  return null;
}

/**
 * Distribute activities across trip days based on intensity
 */
export function distributeActivities(
  activities: ActivityIntent[],
  tripLength: number,
  pace: TripPace
): Map<number, ActivityIntent[]> {
  const dailyBudget = PACE_DAILY_BUDGET[pace];
  const distribution = new Map<number, ActivityIntent[]>();

  // Initialize days
  for (let day = 1; day <= tripLength; day++) {
    distribution.set(day, []);
  }

  // Sort activities by priority (must-do first)
  const sortedActivities = [...activities].sort((a, b) => {
    const priorityOrder = { 'must-do': 0, 'nice-to-have': 1 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Track daily effort
  const dailyEffort = new Map<number, number>();
  for (let day = 1; day <= tripLength; day++) {
    dailyEffort.set(day, 0);
  }

  // Distribute each activity
  for (const activity of sortedActivities) {
    const targetDays = activity.targetDays || 1;
    const effortCost = getActivityEffortCost(activity.type);
    let assignedDays = 0;

    // Find days with enough budget
    for (let day = 1; day <= tripLength && assignedDays < targetDays; day++) {
      const currentEffort = dailyEffort.get(day) || 0;

      if (currentEffort + effortCost <= dailyBudget) {
        distribution.get(day)!.push(activity);
        dailyEffort.set(day, currentEffort + effortCost);
        assignedDays++;
      }
    }

    // If couldn't assign all target days, try to fit remaining where possible
    if (assignedDays < targetDays && activity.priority === 'must-do') {
      // For must-do activities, allow slight budget overflow
      for (let day = 1; day <= tripLength && assignedDays < targetDays; day++) {
        const currentEffort = dailyEffort.get(day) || 0;
        const dayActivities = distribution.get(day) || [];

        // Skip if already has this activity
        if (dayActivities.some(a => a.type === activity.type)) continue;

        // Allow up to 1 point overflow for must-do activities
        if (currentEffort + effortCost <= dailyBudget + 1) {
          distribution.get(day)!.push(activity);
          dailyEffort.set(day, currentEffort + effortCost);
          assignedDays++;
        }
      }
    }
  }

  return distribution;
}

/**
 * Calculate ideal activity mix based on preferences
 */
export function calculateIdealMix(
  preferences: TripPreferences
): { type: string; targetDays: number; effort: number }[] {
  const tripLength = preferences.tripLength;
  const dailyBudget = PACE_DAILY_BUDGET[preferences.pace];
  const totalBudget = tripLength * dailyBudget;

  const mix: { type: string; targetDays: number; effort: number }[] = [];
  let usedBudget = 0;

  // First pass: must-do activities
  for (const activity of preferences.selectedActivities) {
    if (activity.priority !== 'must-do') continue;

    const effort = getActivityEffortCost(activity.type);
    const days = activity.targetDays || Math.ceil(tripLength / 3);
    const totalEffort = effort * days;

    if (usedBudget + totalEffort <= totalBudget) {
      mix.push({ type: activity.type, targetDays: days, effort });
      usedBudget += totalEffort;
    } else {
      // Reduce days to fit budget
      const maxDays = Math.floor((totalBudget - usedBudget) / effort);
      if (maxDays > 0) {
        mix.push({ type: activity.type, targetDays: maxDays, effort });
        usedBudget += effort * maxDays;
      }
    }
  }

  // Second pass: nice-to-have activities
  for (const activity of preferences.selectedActivities) {
    if (activity.priority !== 'nice-to-have') continue;

    const effort = getActivityEffortCost(activity.type);
    const days = activity.targetDays || 1;
    const totalEffort = effort * days;

    if (usedBudget + totalEffort <= totalBudget) {
      mix.push({ type: activity.type, targetDays: days, effort });
      usedBudget += totalEffort;
    }
  }

  // Fill remaining budget with relaxation if pace is chill
  if (preferences.pace === 'chill' && usedBudget < totalBudget * 0.7) {
    const remainingDays = tripLength - mix.reduce((sum, m) => sum + m.targetDays, 0) / 2;
    if (remainingDays > 0) {
      mix.push({ type: 'beach', targetDays: Math.floor(remainingDays), effort: 1 });
    }
  }

  return mix;
}

/**
 * Extract activities from day blocks
 */
function extractActivitiesFromDay(day: ItineraryDay): ScheduledActivity[] {
  const activities: ScheduledActivity[] = [];

  if (day.morning) {
    activities.push({
      id: day.morning.id,
      type: day.morning.type,
      name: day.morning.title,
      startTime: day.morning.startTime,
      endTime: day.morning.endTime,
      durationHours: day.morning.duration / 60,
      effortCost: day.morning.effortCost,
    });
  }
  if (day.afternoon) {
    activities.push({
      id: day.afternoon.id,
      type: day.afternoon.type,
      name: day.afternoon.title,
      startTime: day.afternoon.startTime,
      endTime: day.afternoon.endTime,
      durationHours: day.afternoon.duration / 60,
      effortCost: day.afternoon.effortCost,
    });
  }
  if (day.evening) {
    activities.push({
      id: day.evening.id,
      type: day.evening.type,
      name: day.evening.title,
      startTime: day.evening.startTime,
      endTime: day.evening.endTime,
      durationHours: day.evening.duration / 60,
      effortCost: day.evening.effortCost,
    });
  }

  return activities;
}

/**
 * Validate a day's schedule against intensity budget
 */
export function validateDaySchedule(
  day: ItineraryDay,
  pace: TripPace
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const activities = extractActivitiesFromDay(day);
  const effort = calculateDayEffort(activities);
  const budget = PACE_DAILY_BUDGET[pace];

  // Check total effort
  if (effort > budget) {
    issues.push(`Day is over budget: ${effort.toFixed(1)} effort points vs ${budget} allowed`);
  }

  // Check for schedule conflicts
  const sortedActivities = activities
    .filter(a => a.startTime && a.endTime)
    .sort((a, b) => parseTime(a.startTime!) - parseTime(b.startTime!));

  for (let i = 0; i < sortedActivities.length - 1; i++) {
    const current = sortedActivities[i];
    const next = sortedActivities[i + 1];

    if (parseTime(current.endTime!) > parseTime(next.startTime!)) {
      issues.push(`Schedule conflict: ${current.name} overlaps with ${next.name}`);
    }
  }

  // Check for reasonable gaps (travel time)
  for (let i = 0; i < sortedActivities.length - 1; i++) {
    const current = sortedActivities[i];
    const next = sortedActivities[i + 1];
    const gap = parseTime(next.startTime!) - parseTime(current.endTime!);

    if (gap < 0.25) {
      // Less than 15 min gap - might be too tight
      issues.push(`Tight transition between ${current.name} and ${next.name}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Get suggested schedule density description
 */
export function getScheduleDensityDescription(pace: TripPace): string {
  switch (pace) {
    case 'chill':
      return '1-2 activities per day with plenty of downtime';
    case 'balanced':
      return '2-3 activities per day with breaks between';
    case 'packed':
      return '3-4 activities per day, maximizing experiences';
  }
}

// Helper functions
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + (minutes || 0) / 60;
}

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
