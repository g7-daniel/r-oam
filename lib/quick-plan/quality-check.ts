/**
 * Quality Check Engine
 * Validates itinerary against preferences before showing to user
 *
 * This is a mandatory gate - itinerary cannot be finalized without passing
 */

import {
  TripPreferences,
  QuickPlanItinerary,
  QuickPlanDay,
  DayBlock,
} from '@/types/quick-plan';

// Local types that match this file's usage (different from the exported types)
interface QualityCheckItem {
  id: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  impact?: string;
  suggestion?: string;
  dayNumber?: number;
}

interface LocalQualityCheckResult {
  passed: boolean;
  score: number;
  checks: QualityCheckItem[];
  summary: string;
  mustResolve: string[];
  recommendations: string[];
}

type ItineraryDay = QuickPlanDay;

// Activity structure for quality checks (extracted from DayBlocks)
// Matches ScheduledActivity from intensity-budget.ts
interface ExtractedActivity {
  id: string;
  type: string;
  name: string;
  description?: string;
  durationHours: number;
  effortCost: number;
  startTime: string;
  endTime: string;
}

// Helper to extract activities from day blocks
function extractActivitiesFromDay(day: QuickPlanDay): ExtractedActivity[] {
  const activities: ExtractedActivity[] = [];
  const blocks = [day.morning, day.afternoon, day.evening].filter((b): b is DayBlock => b !== null);
  for (const block of blocks) {
    if (block.type === 'activity') {
      // Extract activity type from block ID (format: "dayNum-activityType")
      // or fall back to title for display
      const extractedType = block.activityId || block.id.split('-').slice(1).join('-') || block.title;
      activities.push({
        id: block.id,
        type: extractedType,
        name: block.title,
        description: block.description,
        durationHours: (block.duration || 60) / 60,
        effortCost: block.effortCost || 0,
        startTime: block.startTime,
        endTime: block.endTime,
      });
    }
  }
  return activities;
}
import { PACE_DAILY_BUDGET, calculateDayEffort } from './intensity-budget';

// Quality check categories
type CheckCategory = 'activities' | 'logistics' | 'budget' | 'dining' | 'timing' | 'preferences';

// Severity levels for issues
type Severity = 'error' | 'warning' | 'info';

/**
 * Run all quality checks on an itinerary
 */
export function runQualityChecks(
  itinerary: QuickPlanItinerary,
  preferences: TripPreferences
): LocalQualityCheckResult {
  const checks: QualityCheckItem[] = [];

  // Run all checks
  checks.push(...checkActivitiesCoverage(itinerary, preferences));
  checks.push(...checkIntensityBudget(itinerary, preferences));
  checks.push(...checkLogistics(itinerary, preferences));
  checks.push(...checkHardNos(itinerary, preferences));
  checks.push(...checkBudgetAlignment(itinerary, preferences));
  checks.push(...checkDiningCoverage(itinerary, preferences));
  checks.push(...checkTimingRealism(itinerary, preferences));

  // Calculate overall pass/fail
  const errors = checks.filter(c => c.severity === 'error');
  const warnings = checks.filter(c => c.severity === 'warning');

  const passed = errors.length === 0;
  const score = calculateQualityScore(checks);

  return {
    passed,
    score,
    checks,
    summary: generateSummary(passed, score, errors.length, warnings.length),
    mustResolve: errors.map(e => e.id),
    recommendations: generateRecommendations(checks, preferences),
  };
}

/**
 * Check that must-do activities are covered
 */
function checkActivitiesCoverage(
  itinerary: QuickPlanItinerary,
  preferences: TripPreferences
): QualityCheckItem[] {
  const checks: QualityCheckItem[] = [];

  // Collect all scheduled activity types
  const scheduledTypes = new Set<string>();
  const typeCount = new Map<string, number>();

  for (const day of itinerary.days) {
    for (const activity of extractActivitiesFromDay(day)) {
      scheduledTypes.add(activity.type);
      typeCount.set(activity.type, (typeCount.get(activity.type) || 0) + 1);
    }
  }

  // Check each must-do activity
  for (const activity of preferences.selectedActivities) {
    if (activity.priority !== 'must-do') continue;

    if (!scheduledTypes.has(activity.type)) {
      checks.push({
        id: `missing-${activity.type}`,
        category: 'activities',
        severity: 'error',
        title: `Missing must-do activity: ${formatActivityType(activity.type)}`,
        description: `You marked ${formatActivityType(activity.type)} as a must-do, but it's not scheduled.`,
        impact: `Your primary goal for this trip won't be met.`,
        suggestion: `Add ${formatActivityType(activity.type)} to the itinerary or adjust expectations.`,
      });
    } else if (activity.targetDays) {
      const actualDays = typeCount.get(activity.type) || 0;
      if (actualDays < activity.targetDays) {
        checks.push({
          id: `insufficient-${activity.type}`,
          category: 'activities',
          severity: 'warning',
          title: `Fewer ${formatActivityType(activity.type)} days than requested`,
          description: `You wanted ${activity.targetDays} days of ${formatActivityType(activity.type)}, but only ${actualDays} are scheduled.`,
          impact: `Less time for your preferred activity than expected.`,
          suggestion: `Consider adjusting other activities to make room.`,
        });
      }
    }
  }

  // Check nice-to-have activities (softer warning)
  for (const activity of preferences.selectedActivities) {
    if (activity.priority !== 'nice-to-have') continue;

    if (!scheduledTypes.has(activity.type)) {
      checks.push({
        id: `missing-optional-${activity.type}`,
        category: 'activities',
        severity: 'info',
        title: `Optional activity not scheduled: ${formatActivityType(activity.type)}`,
        description: `${formatActivityType(activity.type)} was listed as nice-to-have but didn't fit the schedule.`,
        suggestion: `You can swap it in for another activity if you prefer.`,
      });
    }
  }

  return checks;
}

/**
 * Check daily intensity budget
 */
function checkIntensityBudget(
  itinerary: QuickPlanItinerary,
  preferences: TripPreferences
): QualityCheckItem[] {
  const checks: QualityCheckItem[] = [];
  const dailyBudget = PACE_DAILY_BUDGET[preferences.pace || 'balanced'];

  let overBudgetDays = 0;
  let severeOverbudgetDays = 0;

  for (const day of itinerary.days) {
    const effort = calculateDayEffort(extractActivitiesFromDay(day));
    const overage = effort - dailyBudget;

    if (overage > 2) {
      severeOverbudgetDays++;
    } else if (overage > 0) {
      overBudgetDays++;
    }
  }

  if (severeOverbudgetDays > 0) {
    checks.push({
      id: 'severe-over-budget',
      category: 'activities',
      severity: 'error',
      title: `${severeOverbudgetDays} day(s) severely over intensity budget`,
      description: `Some days have too many activities for a ${preferences.pace} pace.`,
      impact: `You may feel exhausted or rushed during the trip.`,
      suggestion: `Remove 1-2 activities from the busiest days.`,
    });
  } else if (overBudgetDays > 0) {
    checks.push({
      id: 'over-budget',
      category: 'activities',
      severity: 'warning',
      title: `${overBudgetDays} day(s) slightly over intensity budget`,
      description: `Some days are a bit busier than your ${preferences.pace} pace preference.`,
      suggestion: `This is manageable, but consider trimming if you want more relaxation.`,
    });
  }

  // Check for under-utilized days on packed pace
  if (preferences.pace === 'packed') {
    let underutilizedDays = 0;
    for (const day of itinerary.days) {
      const effort = calculateDayEffort(extractActivitiesFromDay(day));
      if (effort < dailyBudget * 0.6) {
        underutilizedDays++;
      }
    }

    if (underutilizedDays > preferences.tripLength * 0.3) {
      checks.push({
        id: 'underutilized',
        category: 'activities',
        severity: 'info',
        title: `${underutilizedDays} day(s) lighter than expected`,
        description: `For a packed pace, these days have room for more activities.`,
        suggestion: `Add activities if you want to maximize your time.`,
      });
    }
  }

  return checks;
}

/**
 * Check logistics and feasibility
 */
function checkLogistics(
  itinerary: QuickPlanItinerary,
  preferences: TripPreferences
): QualityCheckItem[] {
  const checks: QualityCheckItem[] = [];

  // Check transfer days (derived from days with isTransitDay)
  const transferDays = itinerary.days
    .filter(d => d.isTransitDay)
    .map(d => d.dayNumber);

  if (transferDays.length > Math.ceil(preferences.tripLength / 3)) {
    checks.push({
      id: 'too-many-transfers',
      category: 'logistics',
      severity: 'warning',
      title: 'Many transfer days',
      description: `${transferDays.length} days involve changing hotels out of ${preferences.tripLength} total.`,
      impact: `You'll spend significant time packing and in transit.`,
      suggestion: `Consider consolidating to fewer bases.`,
    });
  }

  // Check for back-to-back transfer days
  for (let i = 1; i < transferDays.length; i++) {
    if (transferDays[i] - transferDays[i - 1] <= 2) {
      checks.push({
        id: 'consecutive-transfers',
        category: 'logistics',
        severity: 'warning',
        title: 'Consecutive transfer days',
        description: `Days ${transferDays[i - 1]} and ${transferDays[i]} are both transfer days.`,
        impact: `Little time to enjoy either location.`,
        suggestion: `Extend time in one area or remove a stop.`,
      });
      break;
    }
  }

  // Check single-night stays
  for (const stop of itinerary.stops) {
    if (stop.nights === 1) {
      checks.push({
        id: `single-night-${stop.areaId}`,
        category: 'logistics',
        severity: 'warning',
        title: `Single night in ${stop.area.name}`,
        description: `You're only staying one night in ${stop.area.name}.`,
        impact: `Minimal time to experience the area after check-in/out.`,
        suggestion: `Consider extending to 2+ nights or skipping this stop.`,
      });
    }
  }

  // Check activity timing conflicts
  for (const day of itinerary.days) {
    const sorted = [...extractActivitiesFromDay(day)].sort((a, b) =>
      parseTime(a.startTime) - parseTime(b.startTime)
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const endTime = parseTime(sorted[i].endTime);
      const nextStart = parseTime(sorted[i + 1].startTime);

      if (nextStart < endTime) {
        checks.push({
          id: `timing-conflict-day-${day.dayNumber}`,
          category: 'timing',
          severity: 'error',
          title: `Schedule conflict on Day ${day.dayNumber}`,
          description: `${sorted[i].name} overlaps with ${sorted[i + 1].name}.`,
          impact: `You can't do both activities as scheduled.`,
          suggestion: `Adjust times or remove one activity.`,
        });
      } else if (nextStart - endTime < 0.5) {
        checks.push({
          id: `tight-timing-day-${day.dayNumber}`,
          category: 'timing',
          severity: 'info',
          title: `Tight schedule on Day ${day.dayNumber}`,
          description: `Only ${Math.round((nextStart - endTime) * 60)} minutes between ${sorted[i].name} and ${sorted[i + 1].name}.`,
          suggestion: `Allow buffer time for transitions.`,
        });
      }
    }
  }

  return checks;
}

/**
 * Check against hard nos
 */
function checkHardNos(
  itinerary: QuickPlanItinerary,
  preferences: TripPreferences
): QualityCheckItem[] {
  const checks: QualityCheckItem[] = [];

  // Handle missing hardNos array
  const hardNos = preferences.hardNos || [];

  for (const hardNo of hardNos) {
    const noLower = hardNo.toLowerCase();

    // Check activities
    for (const day of itinerary.days) {
      for (const activity of extractActivitiesFromDay(day)) {
        const activityLower = (activity.name + ' ' + (activity.description || '')).toLowerCase();

        // Use word-boundary matching to avoid false positives
        // e.g., hard-no "car" should not match activity type "cultural"
        const noWordPattern = new RegExp(`\\b${noLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const typeWordPattern = new RegExp(`\\b${activity.type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (noWordPattern.test(activityLower) ||
            typeWordPattern.test(noLower)) {
          checks.push({
            id: `hardno-${hardNo}-day-${day.dayNumber}`,
            category: 'preferences',
            severity: 'error',
            title: `Potential hard no violation: "${hardNo}"`,
            description: `Day ${day.dayNumber} includes "${activity.name}" which may conflict with your hard no.`,
            impact: `This could ruin your trip experience.`,
            suggestion: `Remove or replace this activity.`,
          });
        }
      }
    }

    // Check area characteristics (if available)
    // This would need area data passed in for full implementation
  }

  return checks;
}

/**
 * Check budget alignment
 */
function checkBudgetAlignment(
  itinerary: QuickPlanItinerary,
  preferences: TripPreferences
): QualityCheckItem[] {
  const checks: QualityCheckItem[] = [];

  // Skip if no budget defined
  if (!preferences.budgetPerNight?.min || !preferences.budgetPerNight?.max) {
    return checks;
  }

  // NOTE: Budget alignment checking requires itinerary.totalCost which is not currently computed.
  // This check is disabled until cost calculation is added to the itinerary generation.
  // For now, we skip budget validation.
  return checks;
}

/**
 * Check dining coverage
 */
function checkDiningCoverage(
  itinerary: QuickPlanItinerary,
  preferences: TripPreferences
): QualityCheckItem[] {
  const checks: QualityCheckItem[] = [];

  if (preferences.diningMode === 'none') {
    return checks;
  }

  // Extract meals from DayBlocks
  let daysWithoutDinner = 0;
  for (const day of itinerary.days) {
    const blocks = [day.morning, day.afternoon, day.evening].filter((b): b is DayBlock => b !== null);
    const hasDinner = blocks.some(b => b.type === 'meal' && parseTime(b.startTime || '00:00') >= 18);
    if (!hasDinner) {
      daysWithoutDinner++;
    }
  }

  if ((preferences.diningMode === 'schedule' || preferences.diningMode === 'plan') && daysWithoutDinner > 0) {
    checks.push({
      id: 'missing-dinners',
      category: 'dining',
      severity: 'warning',
      title: `${daysWithoutDinner} day(s) without dinner planned`,
      description: `You requested planned dining but some days don't have dinner reservations.`,
      suggestion: `Add restaurant suggestions for these days.`,
    });
  }

  return checks;
}

/**
 * Check timing realism
 */
function checkTimingRealism(
  itinerary: QuickPlanItinerary,
  preferences: TripPreferences
): QualityCheckItem[] {
  const checks: QualityCheckItem[] = [];

  // Check first day (arrival)
  const firstDay = itinerary.days[0];
  if (firstDay) {
    const activities = extractActivitiesFromDay(firstDay);
    const morningActivities = activities.filter(a =>
      parseTime(a.startTime) < 12
    );

    if (morningActivities.length > 1) {
      checks.push({
        id: 'busy-arrival-morning',
        category: 'timing',
        severity: 'info',
        title: 'Busy arrival day morning',
        description: `Day 1 has ${morningActivities.length} morning activities.`,
        suggestion: `Consider your arrival time - you may need to adjust.`,
      });
    }
  }

  // Check last day (departure)
  const lastDay = itinerary.days[itinerary.days.length - 1];
  if (lastDay) {
    const activities = extractActivitiesFromDay(lastDay);
    const afternoonActivities = activities.filter(a =>
      parseTime(a.startTime) >= 14
    );

    if (afternoonActivities.length > 1) {
      checks.push({
        id: 'busy-departure-afternoon',
        category: 'timing',
        severity: 'info',
        title: 'Activities scheduled late on departure day',
        description: `Last day has afternoon activities - check your flight time.`,
        suggestion: `Ensure you have time for airport transfer.`,
      });
    }
  }

  return checks;
}

/**
 * Calculate quality score (0-100)
 */
function calculateQualityScore(checks: QualityCheckItem[]): number {
  let score = 100;

  for (const check of checks) {
    switch (check.severity) {
      case 'error':
        score -= 15;
        break;
      case 'warning':
        score -= 5;
        break;
      case 'info':
        score -= 1;
        break;
    }
  }

  return Math.max(0, score);
}

/**
 * Generate summary text
 */
function generateSummary(
  passed: boolean,
  score: number,
  errorCount: number,
  warningCount: number
): string {
  if (passed && score >= 90) {
    return `Excellent! Your itinerary looks great with a quality score of ${score}/100.`;
  }
  if (passed && score >= 70) {
    return `Good! Your itinerary passes with a score of ${score}/100. ${warningCount} minor suggestion(s) to consider.`;
  }
  if (passed) {
    return `Acceptable. Score: ${score}/100. Consider addressing ${warningCount} warning(s) for a better experience.`;
  }
  return `Needs attention. ${errorCount} issue(s) must be resolved before finalizing. Score: ${score}/100.`;
}

/**
 * Generate improvement recommendations
 */
function generateRecommendations(
  checks: QualityCheckItem[],
  preferences: TripPreferences
): string[] {
  const recommendations: string[] = [];

  // Group by category
  const byCategory = new Map<string, QualityCheckItem[]>();
  for (const check of checks) {
    if (!byCategory.has(check.category)) {
      byCategory.set(check.category, []);
    }
    byCategory.get(check.category)!.push(check);
  }

  // Generate top-level recommendations
  if (byCategory.has('activities') && byCategory.get('activities')!.some(c => c.severity === 'error')) {
    recommendations.push('Review activity coverage - some must-do items are missing.');
  }

  if (byCategory.has('logistics') && byCategory.get('logistics')!.length >= 2) {
    recommendations.push('Consider simplifying your route to reduce travel time.');
  }

  if (byCategory.has('budget')) {
    recommendations.push('Review hotel selections to better match your budget.');
  }

  if (byCategory.has('timing') && byCategory.get('timing')!.some(c => c.severity === 'error')) {
    recommendations.push('Fix schedule conflicts before proceeding.');
  }

  return recommendations;
}

// Helper functions
function formatActivityType(type: string): string {
  return type.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + (minutes || 0) / 60;
}
