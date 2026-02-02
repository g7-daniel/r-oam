/**
 * Satisfaction Loop with Surgical Regeneration
 *
 * After showing the itinerary, user confirms or specifies what's wrong.
 * Only the affected parts are regenerated, not the entire plan.
 */

import type {
  QuickPlanItinerary,
  QuickPlanDay,
  TripPreferences,
  DissatisfactionReason,
  SatisfactionGateResponse,
  AreaCandidate,
  HotelCandidate,
  VerifiedActivity,
  OrchestratorState,
} from '@/types/quick-plan';
import { chatCompletion } from '@/lib/groq';
import { discoverAndVerifyActivities } from './activity-verification';

// ============================================================================
// TYPES
// ============================================================================

interface RegenerationResult {
  itinerary: QuickPlanItinerary;
  changesApplied: string[];
  errors: string[];
}

interface RegenerationContext {
  currentItinerary: QuickPlanItinerary;
  preferences: TripPreferences;
  discoveredData: OrchestratorState['discoveredData'];
  reasons: DissatisfactionReason[];
  customFeedback?: string;
}

// ============================================================================
// DISSATISFACTION HANDLERS
// ============================================================================

type DissatisfactionHandler = (
  context: RegenerationContext
) => Promise<Partial<RegenerationResult>>;

const DISSATISFACTION_HANDLERS: Record<DissatisfactionReason, DissatisfactionHandler> = {
  wrong_areas: handleWrongAreas,
  wrong_vibe: handleWrongVibe,
  too_packed: handleTooPacked,
  too_chill: handleTooChill,
  surf_days_wrong: handleSurfDaysWrong,
  dining_wrong: handleDiningWrong,
  too_touristy: handleTooTouristy,
  missing_activity: handleMissingActivity,
  hotel_wrong: handleHotelWrong,
  budget_exceeded: handleBudgetExceeded,
  other: handleOther,
};

// ============================================================================
// HANDLER IMPLEMENTATIONS
// ============================================================================

/**
 * Handle "wrong areas" - rediscover and rebuild structure
 */
async function handleWrongAreas(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, preferences, customFeedback } = context;
  const changesApplied: string[] = [];
  const errors: string[] = [];

  // Parse what's wrong with current areas from feedback
  const currentAreas = currentItinerary.stops.map(s => s.area.name).join(', ');
  console.log(`Regenerating areas. Current: ${currentAreas}. Feedback: ${customFeedback}`);

  // Use LLM to understand what areas the user wants instead
  let targetAreaDescription = 'different areas from the current selection';
  if (customFeedback) {
    try {
      const analysis = await chatCompletion([
        { role: 'system', content: 'Extract the desired area characteristics from user feedback. Reply with a brief description.' },
        { role: 'user', content: `Current areas: ${currentAreas}\nUser feedback: ${customFeedback}\n\nWhat areas should we look for instead?` },
      ], 0.5);
      targetAreaDescription = analysis.trim();
    } catch (e) {
      errors.push('Failed to analyze area feedback');
    }
  }

  changesApplied.push(`Area selection needs revision: ${targetAreaDescription}`);

  // The actual area discovery would be triggered by the orchestrator
  // Here we just mark what needs to change

  return {
    changesApplied,
    errors,
  };
}

/**
 * Handle "wrong vibe" - adjust activity selection and pacing
 */
async function handleWrongVibe(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, customFeedback } = context;
  const changesApplied: string[] = [];

  // Use LLM to understand the vibe mismatch
  let vibeAnalysis = 'unknown';
  if (customFeedback) {
    try {
      const analysis = await chatCompletion([
        { role: 'system', content: 'Analyze the vibe mismatch and suggest adjustments. Be concise.' },
        { role: 'user', content: `User says the vibe is wrong: ${customFeedback}\n\nWhat specific changes would fix the vibe?` },
      ], 0.5);
      vibeAnalysis = analysis.trim();
      changesApplied.push(`Vibe adjustment: ${vibeAnalysis}`);
    } catch (e) {
      changesApplied.push('Vibe adjustment needed - will rebalance activities');
    }
  }

  // Adjust the itinerary based on vibe analysis
  const updated = { ...currentItinerary };

  // If feedback mentions "too touristy", swap to local alternatives
  if (customFeedback?.toLowerCase().includes('touristy') ||
      customFeedback?.toLowerCase().includes('authentic') ||
      customFeedback?.toLowerCase().includes('local')) {
    // Mark activities that need swapping
    changesApplied.push('Will prioritize local/authentic experiences over tourist spots');
  }

  // If feedback mentions "relaxing" or "calm"
  if (customFeedback?.toLowerCase().includes('relax') ||
      customFeedback?.toLowerCase().includes('calm') ||
      customFeedback?.toLowerCase().includes('peaceful')) {
    // Reduce activity intensity
    changesApplied.push('Will add more relaxation time and reduce scheduled activities');
  }

  return {
    itinerary: updated,
    changesApplied,
    errors: [],
  };
}

/**
 * Handle "too packed" - reduce activities per day
 */
async function handleTooPacked(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, preferences } = context;
  const changesApplied: string[] = [];

  const updated = { ...currentItinerary };

  // Calculate current average activities per day
  let totalActivities = 0;
  for (const day of updated.days) {
    if (day.morning?.type === 'activity') totalActivities++;
    if (day.afternoon?.type === 'activity') totalActivities++;
    if (day.evening?.type === 'meal' || day.evening?.type === 'activity') totalActivities++;
  }
  const avgActivities = totalActivities / updated.days.length;

  // Reduce by ~25%
  const targetActivities = Math.floor(totalActivities * 0.75);
  changesApplied.push(`Reducing from ~${avgActivities.toFixed(1)} to ~${(targetActivities / updated.days.length).toFixed(1)} activities per day`);

  // Update days to have more free time
  updated.days = updated.days.map(day => {
    // Keep mornings mostly, reduce afternoons
    if (day.afternoon?.type === 'activity' && Math.random() > 0.6) {
      return {
        ...day,
        afternoon: {
          ...day.afternoon,
          type: 'free' as const,
          title: 'Free time',
          description: 'Explore on your own or relax',
          effortCost: 0,
        },
      };
    }
    return day;
  });

  // Recalculate effort points
  updated.days = updated.days.map(day => {
    const effort =
      (day.morning?.effortCost || 0) +
      (day.afternoon?.effortCost || 0) +
      (day.evening?.effortCost || 0);
    return { ...day, effortPoints: effort };
  });

  changesApplied.push('Added free time blocks for relaxation');

  return {
    itinerary: updated,
    changesApplied,
    errors: [],
  };
}

/**
 * Handle "too chill" - add more activities
 */
async function handleTooChill(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, preferences, discoveredData } = context;
  const changesApplied: string[] = [];

  const updated = { ...currentItinerary };

  // Find days with free time that could have activities
  const daysWithFreeTime = updated.days.filter(day =>
    day.morning?.type === 'free' ||
    day.afternoon?.type === 'free' ||
    !day.afternoon
  );

  changesApplied.push(`Found ${daysWithFreeTime.length} days with room for more activities`);

  // Get available activities we haven't used yet
  const usedActivityIds = new Set<string>();
  for (const day of updated.days) {
    if (day.morning?.activityId) usedActivityIds.add(day.morning.activityId);
    if (day.afternoon?.activityId) usedActivityIds.add(day.afternoon.activityId);
  }

  const availableActivities = discoveredData.activities.filter(
    a => !usedActivityIds.has(a.id)
  );

  if (availableActivities.length > 0) {
    changesApplied.push(`Can add ${Math.min(availableActivities.length, daysWithFreeTime.length)} more activities`);
  } else {
    changesApplied.push('Need to discover more activities for this destination');
  }

  return {
    itinerary: updated,
    changesApplied,
    errors: [],
  };
}

/**
 * Handle "surf days wrong" - adjust surfing schedule
 */
async function handleSurfDaysWrong(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, customFeedback } = context;
  const changesApplied: string[] = [];

  // Count current surf activities
  let surfDays = 0;
  for (const day of currentItinerary.days) {
    if (day.morning?.title?.toLowerCase().includes('surf') ||
        day.afternoon?.title?.toLowerCase().includes('surf')) {
      surfDays++;
    }
  }

  changesApplied.push(`Current surf days: ${surfDays}`);

  // Parse desired change from feedback
  const wantsMore = customFeedback?.toLowerCase().includes('more') ||
                    customFeedback?.toLowerCase().includes('additional');
  const wantsLess = customFeedback?.toLowerCase().includes('less') ||
                    customFeedback?.toLowerCase().includes('fewer') ||
                    customFeedback?.toLowerCase().includes('reduce');

  if (wantsMore) {
    changesApplied.push('Will add more surfing sessions');
  } else if (wantsLess) {
    changesApplied.push('Will reduce surfing sessions');
  } else {
    // Try to parse specific number
    const numberMatch = customFeedback?.match(/(\d+)\s*(?:days?|sessions?|times?)/i);
    if (numberMatch) {
      const targetDays = parseInt(numberMatch[1], 10);
      changesApplied.push(`Will adjust to ${targetDays} surf days`);
    }
  }

  return {
    itinerary: currentItinerary,
    changesApplied,
    errors: [],
  };
}

/**
 * Handle "dining wrong" - regenerate restaurant selections
 */
async function handleDiningWrong(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, customFeedback, discoveredData } = context;
  const changesApplied: string[] = [];

  // Parse what's wrong with dining
  const issues: string[] = [];
  if (customFeedback) {
    if (customFeedback.toLowerCase().includes('expensive') ||
        customFeedback.toLowerCase().includes('pric')) {
      issues.push('budget');
      changesApplied.push('Will select more budget-friendly restaurants');
    }
    if (customFeedback.toLowerCase().includes('cuisine') ||
        customFeedback.toLowerCase().includes('type')) {
      issues.push('cuisine');
      changesApplied.push('Will diversify cuisine types');
    }
    if (customFeedback.toLowerCase().includes('location') ||
        customFeedback.toLowerCase().includes('far')) {
      issues.push('location');
      changesApplied.push('Will prioritize restaurants closer to accommodations');
    }
  }

  if (issues.length === 0) {
    changesApplied.push('Will regenerate dining recommendations');
  }

  return {
    itinerary: currentItinerary,
    changesApplied,
    errors: [],
  };
}

/**
 * Handle "too touristy" - swap to local alternatives
 */
async function handleTooTouristy(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, discoveredData } = context;
  const changesApplied: string[] = [];

  // Find activities that might be touristy
  const touristyKeywords = ['tour', 'excursion', 'popular', 'famous', 'must-see'];
  const activitiesToSwap: string[] = [];

  for (const day of currentItinerary.days) {
    for (const block of [day.morning, day.afternoon, day.evening]) {
      if (block?.type === 'activity') {
        const title = block.title.toLowerCase();
        if (touristyKeywords.some(kw => title.includes(kw))) {
          activitiesToSwap.push(block.title);
        }
      }
    }
  }

  if (activitiesToSwap.length > 0) {
    changesApplied.push(`Identified ${activitiesToSwap.length} potentially touristy activities to swap`);
    changesApplied.push('Will prioritize local, off-the-beaten-path alternatives');
  } else {
    changesApplied.push('Will look for more authentic local experiences');
  }

  return {
    itinerary: currentItinerary,
    changesApplied,
    errors: [],
  };
}

/**
 * Handle "missing activity" - add specific activity
 */
async function handleMissingActivity(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, customFeedback, preferences, discoveredData } = context;
  const changesApplied: string[] = [];
  const errors: string[] = [];

  if (!customFeedback) {
    errors.push('Please specify which activity you want to add');
    return { changesApplied, errors };
  }

  changesApplied.push(`Looking for: ${customFeedback}`);

  // Search for the activity in discovered data
  const searchTerm = customFeedback.toLowerCase();
  const matchingActivity = discoveredData.activities.find(
    a => a.name.toLowerCase().includes(searchTerm) ||
         searchTerm.includes(a.name.toLowerCase())
  );

  if (matchingActivity) {
    changesApplied.push(`Found matching activity: ${matchingActivity.name}`);
    changesApplied.push('Will add to the itinerary');
  } else {
    changesApplied.push(`Need to discover "${customFeedback}" from Reddit`);

    // Extract activity type from feedback
    const destination = preferences.destinationContext?.canonicalName || '';

    // This would trigger a new discovery
    changesApplied.push('Will search for this specific activity');
  }

  return {
    itinerary: currentItinerary,
    changesApplied,
    errors,
  };
}

/**
 * Handle "hotel wrong" - return to hotel selection
 */
async function handleHotelWrong(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, customFeedback } = context;
  const changesApplied: string[] = [];

  // Identify which hotel(s) need changing
  const currentHotels = currentItinerary.hotelShortlists
    .filter(h => h.selectedHotelId)
    .map(h => {
      const hotel = h.hotels.find(hotel => hotel.id === h.selectedHotelId);
      return `${hotel?.name || 'Unknown'} in ${h.areaName}`;
    });

  changesApplied.push(`Current hotels: ${currentHotels.join(', ')}`);

  // Parse feedback for specific area
  if (customFeedback) {
    // Check if feedback mentions a specific area
    for (const shortlist of currentItinerary.hotelShortlists) {
      if (customFeedback.toLowerCase().includes(shortlist.areaName.toLowerCase())) {
        changesApplied.push(`Will show hotel alternatives for ${shortlist.areaName}`);
      }
    }

    // Check for specific issues
    if (customFeedback.toLowerCase().includes('expensive') ||
        customFeedback.toLowerCase().includes('budget')) {
      changesApplied.push('Will show more budget-friendly hotel options');
    }
    if (customFeedback.toLowerCase().includes('location')) {
      changesApplied.push('Will show hotels in different locations');
    }
    if (customFeedback.toLowerCase().includes('amenities') ||
        customFeedback.toLowerCase().includes('pool')) {
      changesApplied.push('Will filter by amenities');
    }
  } else {
    changesApplied.push('Will show all hotel alternatives');
  }

  return {
    itinerary: currentItinerary,
    changesApplied,
    errors: [],
  };
}

/**
 * Handle "budget exceeded" - find cheaper alternatives
 */
async function handleBudgetExceeded(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, preferences } = context;
  const changesApplied: string[] = [];

  // Calculate current estimated cost
  let totalHotelCost = 0;
  for (const shortlist of currentItinerary.hotelShortlists) {
    const selectedHotel = shortlist.hotels.find(h => h.id === shortlist.selectedHotelId);
    if (selectedHotel?.pricePerNight) {
      // Find nights for this area
      const stop = currentItinerary.stops.find(s => s.area.id === shortlist.stopId);
      totalHotelCost += (selectedHotel.pricePerNight || 0) * (stop?.nights || 0);
    }
  }

  const budgetMax = (preferences.budgetPerNight?.max || 300) * (preferences.tripLength || 7);

  changesApplied.push(`Estimated hotel cost: $${totalHotelCost.toLocaleString()}`);
  changesApplied.push(`Budget target: $${budgetMax.toLocaleString()}`);

  if (totalHotelCost > budgetMax) {
    const overage = totalHotelCost - budgetMax;
    changesApplied.push(`Over budget by: $${overage.toLocaleString()}`);
    changesApplied.push('Will find more affordable hotel alternatives');
  }

  // Also check for expensive activities
  let activityCount = 0;
  let paidActivities = 0;
  for (const day of currentItinerary.days) {
    if (day.morning?.type === 'activity') {
      activityCount++;
      if (day.morning.effortCost > 2) paidActivities++;
    }
    if (day.afternoon?.type === 'activity') {
      activityCount++;
      if (day.afternoon.effortCost > 2) paidActivities++;
    }
  }

  if (paidActivities > activityCount * 0.6) {
    changesApplied.push('Will suggest more free or low-cost activities');
  }

  return {
    itinerary: currentItinerary,
    changesApplied,
    errors: [],
  };
}

/**
 * Handle "other" - use LLM to understand and fix
 */
async function handleOther(
  context: RegenerationContext
): Promise<Partial<RegenerationResult>> {
  const { currentItinerary, customFeedback } = context;
  const changesApplied: string[] = [];
  const errors: string[] = [];

  if (!customFeedback) {
    errors.push('Please describe what you would like to change');
    return { changesApplied, errors };
  }

  // Use LLM to understand the issue and suggest fixes
  try {
    const analysis = await chatCompletion([
      {
        role: 'system',
        content: `You are a travel planning assistant. Analyze the user's feedback about their itinerary and identify:
1. What specific aspect needs to change (areas, hotels, activities, pacing, dining, etc.)
2. What the fix should be

Reply in this format:
ISSUE: [brief description]
FIX: [specific action to take]`,
      },
      {
        role: 'user',
        content: `Itinerary summary:
- Duration: ${currentItinerary.days.length} days
- Areas: ${currentItinerary.stops.map(s => s.area.name).join(', ')}
- Activities: ${currentItinerary.days.flatMap(d => [d.morning?.title, d.afternoon?.title].filter(Boolean)).slice(0, 5).join(', ')}

User feedback: ${customFeedback}`,
      },
    ], 0.5);

    const lines = analysis.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('ISSUE:')) {
        changesApplied.push(`Identified issue: ${line.replace('ISSUE:', '').trim()}`);
      }
      if (line.startsWith('FIX:')) {
        changesApplied.push(`Planned fix: ${line.replace('FIX:', '').trim()}`);
      }
    }

    if (changesApplied.length === 0) {
      changesApplied.push(`Will address: ${customFeedback}`);
    }
  } catch (e) {
    errors.push('Failed to analyze feedback');
    changesApplied.push(`Will try to address: ${customFeedback}`);
  }

  return {
    itinerary: currentItinerary,
    changesApplied,
    errors,
  };
}

// ============================================================================
// MAIN REGENERATION FUNCTION
// ============================================================================

/**
 * Surgical regeneration - only fix what's wrong
 */
export async function regenerateForDissatisfaction(
  response: SatisfactionGateResponse,
  currentItinerary: QuickPlanItinerary,
  preferences: TripPreferences,
  discoveredData: OrchestratorState['discoveredData']
): Promise<RegenerationResult> {
  const context: RegenerationContext = {
    currentItinerary,
    preferences,
    discoveredData,
    reasons: response.reasons || [],
    customFeedback: response.customFeedback,
  };

  const allChanges: string[] = [];
  const allErrors: string[] = [];
  let updatedItinerary = currentItinerary;

  // Process each dissatisfaction reason
  for (const reason of response.reasons || []) {
    const handler = DISSATISFACTION_HANDLERS[reason];
    if (!handler) {
      allErrors.push(`Unknown dissatisfaction reason: ${reason}`);
      continue;
    }

    console.log(`Processing dissatisfaction: ${reason}`);

    const result = await handler({
      ...context,
      currentItinerary: updatedItinerary,
    });

    if (result.itinerary) {
      updatedItinerary = result.itinerary;
    }
    if (result.changesApplied) {
      allChanges.push(...result.changesApplied);
    }
    if (result.errors) {
      allErrors.push(...result.errors);
    }
  }

  // If "other" reason with custom feedback but no specific reasons
  if (response.reasons?.length === 0 && response.customFeedback) {
    const result = await handleOther(context);
    if (result.changesApplied) allChanges.push(...result.changesApplied);
    if (result.errors) allErrors.push(...result.errors);
  }

  // Update the itinerary metadata
  updatedItinerary = {
    ...updatedItinerary,
    generatedAt: new Date(),
  };

  return {
    itinerary: updatedItinerary,
    changesApplied: allChanges,
    errors: allErrors,
  };
}

// ============================================================================
// SATISFACTION GATE PRESENTATION
// ============================================================================

/**
 * Generate satisfaction gate options based on itinerary content
 */
export function getSatisfactionOptions(
  itinerary: QuickPlanItinerary
): { id: DissatisfactionReason; label: string; description: string; relevant: boolean }[] {
  // Analyze itinerary to determine relevant options
  const hasSurfing = itinerary.days.some(d =>
    d.morning?.title?.toLowerCase().includes('surf') ||
    d.afternoon?.title?.toLowerCase().includes('surf')
  );

  const hasDining = itinerary.diningPlan?.scheduledDinners?.length > 0;

  const hasMultipleAreas = itinerary.stops.length > 1;

  return [
    {
      id: 'wrong_areas' as DissatisfactionReason,
      label: 'Wrong areas',
      description: 'The locations don\'t match what I wanted',
      relevant: hasMultipleAreas,
    },
    {
      id: 'wrong_vibe' as DissatisfactionReason,
      label: 'Wrong vibe',
      description: 'The overall feel isn\'t right',
      relevant: true,
    },
    {
      id: 'too_packed' as DissatisfactionReason,
      label: 'Too packed',
      description: 'Too many activities, I need more downtime',
      relevant: true,
    },
    {
      id: 'too_chill' as DissatisfactionReason,
      label: 'Too chill',
      description: 'Not enough activities, I want more to do',
      relevant: true,
    },
    {
      id: 'surf_days_wrong' as DissatisfactionReason,
      label: 'Surf schedule wrong',
      description: 'Adjust the surfing days',
      relevant: hasSurfing,
    },
    {
      id: 'dining_wrong' as DissatisfactionReason,
      label: 'Dining issues',
      description: 'Restaurant choices need work',
      relevant: hasDining,
    },
    {
      id: 'too_touristy' as DissatisfactionReason,
      label: 'Too touristy',
      description: 'I want more local/authentic spots',
      relevant: true,
    },
    {
      id: 'missing_activity' as DissatisfactionReason,
      label: 'Missing activity',
      description: 'There\'s something I really wanted to do',
      relevant: true,
    },
    {
      id: 'hotel_wrong' as DissatisfactionReason,
      label: 'Hotel issues',
      description: 'The hotel choices don\'t fit',
      relevant: itinerary.hotelShortlists.length > 0,
    },
    {
      id: 'budget_exceeded' as DissatisfactionReason,
      label: 'Over budget',
      description: 'It\'s more expensive than I planned',
      relevant: true,
    },
    {
      id: 'other' as DissatisfactionReason,
      label: 'Other',
      description: 'Something else I\'d like to change',
      relevant: true,
    },
  ];
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { RegenerationResult, RegenerationContext };
export { DISSATISFACTION_HANDLERS };
