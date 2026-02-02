/**
 * Quick Plan State Machine
 * Manages the 18-state wizard flow with conditional states and back navigation
 */

import {
  QuickPlanState,
  STATE_ORDER,
  TripPreferences,
  CONDITIONAL_STATES,
} from '@/types/quick-plan';

// State metadata for UI
export interface StateMetadata {
  title: string;
  shortTitle: string;
  description: string;
  isGate: boolean; // Mandatory gates that can't be skipped
  allowBack: boolean;
  chatPrompt: string; // What the assistant says at this step
}

export const STATE_METADATA: Record<QuickPlanState, StateMetadata> = {
  DESTINATION: {
    title: 'Where are you going?',
    shortTitle: 'Destination',
    description: 'Enter your destination',
    isGate: false,
    allowBack: false,
    chatPrompt: "Where would you like to go? Type a country, region, or city.",
  },
  DATES_OR_LENGTH: {
    title: 'When and how long?',
    shortTitle: 'Dates',
    description: 'Set your travel dates or trip length',
    isGate: false,
    allowBack: true,
    chatPrompt: "When are you traveling? You can enter specific dates or just tell me how many nights.",
  },
  PARTY: {
    title: 'Who\'s traveling?',
    shortTitle: 'Travelers',
    description: 'Tell us about your travel party',
    isGate: false,
    allowBack: true,
    chatPrompt: "How many adults and children? If kids, what are their ages?",
  },
  BUDGET: {
    title: 'What\'s your budget?',
    shortTitle: 'Budget',
    description: 'Set your nightly budget range',
    isGate: false,
    allowBack: true,
    chatPrompt: "What's your nightly budget for accommodations? You can also allow some flex nights for splurges.",
  },
  VIBE_AND_HARD_NOS: {
    title: 'Trip vibe & dealbreakers',
    shortTitle: 'Vibe',
    description: 'Set your pace and must-dos/hard-nos',
    isGate: false,
    allowBack: true,
    chatPrompt: "How do you want this trip to feel? What are your must-dos and hard nos?",
  },
  ACTIVITIES_PICK: {
    title: 'What do you want to do?',
    shortTitle: 'Activities',
    description: 'Select activities for your trip',
    isGate: false,
    allowBack: true,
    chatPrompt: "What activities interest you? Select all that apply.",
  },
  ACTIVITY_INTENSITY: {
    title: 'Activity intensity',
    shortTitle: 'Intensity',
    description: 'Set intensity for selected activities',
    isGate: false,
    allowBack: true,
    chatPrompt: "Let's dial in the intensity for your selected activities.",
  },
  TRADEOFFS_RESOLUTION: {
    title: 'Resolve tradeoffs',
    shortTitle: 'Tradeoffs',
    description: 'Resolve conflicting preferences',
    isGate: true, // MANDATORY GATE
    allowBack: true,
    chatPrompt: "I noticed some conflicting preferences. Let's resolve these before proceeding.",
  },
  AREA_DISCOVERY: {
    title: 'Discover areas',
    shortTitle: 'Areas',
    description: 'Find the best areas for your trip',
    isGate: false,
    allowBack: true,
    chatPrompt: "Based on your preferences, here are the best areas to consider.",
  },
  AREA_SPLIT_SELECTION: {
    title: 'Choose your itinerary split',
    shortTitle: 'Itinerary Split',
    description: 'Select how to divide your time',
    isGate: false,
    allowBack: true,
    chatPrompt: "Here are a few ways to structure your trip. Pick the one that feels right.",
  },
  PREFERENCES_REVIEW_LOCK: {
    title: 'Confirm your preferences',
    shortTitle: 'Confirm',
    description: 'Review and lock your preferences',
    isGate: true, // MANDATORY GATE
    allowBack: true,
    chatPrompt: "Before I generate your full itinerary, let's confirm everything is correct.",
  },
  HOTELS_SHORTLIST_AND_PICK: {
    title: 'Choose your hotels',
    shortTitle: 'Hotels',
    description: 'Select hotels for each stop',
    isGate: false,
    allowBack: true,
    chatPrompt: "Here are the best hotels for each stop. I've auto-selected defaults, but you can change them.",
  },
  DINING_MODE: {
    title: 'Dining preferences',
    shortTitle: 'Dining Mode',
    description: 'How should we handle dining?',
    isGate: false,
    allowBack: true,
    chatPrompt: "How important is dining to you? Do you want a list of restaurants, scheduled dinners, or neither?",
  },
  DINING_SHORTLIST_AND_PICK: {
    title: 'Choose your restaurants',
    shortTitle: 'Restaurants',
    description: 'Select restaurants for your trip',
    isGate: false,
    allowBack: true,
    chatPrompt: "Here are the best dining options for your trip.",
  },
  DAILY_ITINERARY_BUILD: {
    title: 'Building your itinerary',
    shortTitle: 'Build',
    description: 'Generating your day-by-day schedule',
    isGate: false,
    allowBack: false,
    chatPrompt: "Creating your day-by-day itinerary...",
  },
  QUALITY_SELF_CHECK: {
    title: 'Quality check',
    shortTitle: 'Quality Check',
    description: 'Validating your itinerary',
    isGate: true, // MANDATORY GATE
    allowBack: false,
    chatPrompt: "Running quality checks to make sure everything fits your requirements...",
  },
  FINAL_REVIEW_AND_EDIT_LOOP: {
    title: 'Review your itinerary',
    shortTitle: 'Review',
    description: 'Final review with edit options',
    isGate: false,
    allowBack: true,
    chatPrompt: "Here's your complete itinerary. Review it and make any final adjustments.",
  },
  SATISFACTION_GATE: {
    title: 'Are you satisfied?',
    shortTitle: 'Confirm',
    description: 'Confirm this matches what you want',
    isGate: true, // MANDATORY GATE
    allowBack: false,
    chatPrompt: "Does this itinerary match what you want? I need your confirmation before we finalize.",
  },
};

/**
 * Determine if a state should be skipped based on current preferences
 */
export function shouldSkipState(state: QuickPlanState, preferences: TripPreferences): boolean {
  const condition = CONDITIONAL_STATES[state];
  if (!condition) return false;
  return !condition(preferences);
}

/**
 * Get the next valid state, skipping conditional states that don't apply
 */
export function getNextState(
  currentState: QuickPlanState,
  preferences: TripPreferences
): QuickPlanState | null {
  const currentIndex = STATE_ORDER.indexOf(currentState);
  if (currentIndex === -1 || currentIndex === STATE_ORDER.length - 1) {
    return null;
  }

  // Find next non-skipped state
  for (let i = currentIndex + 1; i < STATE_ORDER.length; i++) {
    const nextState = STATE_ORDER[i];
    if (!shouldSkipState(nextState, preferences)) {
      return nextState;
    }
  }

  return null;
}

/**
 * Get the previous valid state, skipping conditional states
 */
export function getPreviousState(
  currentState: QuickPlanState,
  preferences: TripPreferences
): QuickPlanState | null {
  const currentIndex = STATE_ORDER.indexOf(currentState);
  if (currentIndex <= 0) {
    return null;
  }

  // Check if current state allows back navigation
  if (!STATE_METADATA[currentState].allowBack) {
    return null;
  }

  // Find previous non-skipped state
  for (let i = currentIndex - 1; i >= 0; i--) {
    const prevState = STATE_ORDER[i];
    if (!shouldSkipState(prevState, preferences)) {
      return prevState;
    }
  }

  return null;
}

/**
 * Calculate progress percentage through the wizard
 */
export function calculateProgress(
  currentState: QuickPlanState,
  preferences: TripPreferences
): number {
  // Count non-skipped states
  const activeStates = STATE_ORDER.filter(s => !shouldSkipState(s, preferences));
  const currentIndex = activeStates.indexOf(currentState);

  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / activeStates.length) * 100);
}

/**
 * Get all states that will be visited given current preferences
 */
export function getActiveStates(preferences: TripPreferences): QuickPlanState[] {
  return STATE_ORDER.filter(s => !shouldSkipState(s, preferences));
}

/**
 * Check if we can proceed to a specific state
 */
export function canProceedToState(
  targetState: QuickPlanState,
  currentState: QuickPlanState,
  preferences: TripPreferences
): { canProceed: boolean; reason?: string } {
  const currentIndex = STATE_ORDER.indexOf(currentState);
  const targetIndex = STATE_ORDER.indexOf(targetState);

  // Can't go forward past current
  if (targetIndex > currentIndex) {
    return { canProceed: false, reason: 'Complete current step first' };
  }

  // Check if target state would be skipped
  if (shouldSkipState(targetState, preferences)) {
    return { canProceed: false, reason: 'This step does not apply to your trip' };
  }

  // Check for gate states that must be passed
  for (let i = currentIndex; i > targetIndex; i--) {
    const state = STATE_ORDER[i];
    if (STATE_METADATA[state].isGate && !STATE_METADATA[state].allowBack) {
      return { canProceed: false, reason: `Cannot go back past ${STATE_METADATA[state].title}` };
    }
  }

  return { canProceed: true };
}

/**
 * Validate that all required data exists for a state
 */
export function validateStateData(
  state: QuickPlanState,
  preferences: TripPreferences
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  switch (state) {
    case 'DATES_OR_LENGTH':
      if (!preferences.destinationContext) {
        missingFields.push('destination');
      }
      break;

    case 'PARTY':
      if (!preferences.startDate && !preferences.tripLength) {
        missingFields.push('dates or trip length');
      }
      break;

    case 'BUDGET':
      if (preferences.adults < 1) {
        missingFields.push('number of travelers');
      }
      break;

    case 'VIBE_AND_HARD_NOS':
      if (!preferences.budgetPerNight.min && !preferences.budgetPerNight.max) {
        missingFields.push('budget');
      }
      break;

    case 'ACTIVITIES_PICK':
      if (!preferences.pace) {
        missingFields.push('pace');
      }
      break;

    case 'AREA_DISCOVERY':
      if (preferences.selectedActivities.length === 0) {
        missingFields.push('at least one activity');
      }
      break;

    case 'PREFERENCES_REVIEW_LOCK':
      if (preferences.detectedTradeoffs.length > 0 &&
          preferences.resolvedTradeoffs.length < preferences.detectedTradeoffs.length) {
        missingFields.push('unresolved tradeoffs');
      }
      if (!preferences.selectedSplit) {
        missingFields.push('itinerary split');
      }
      break;

    case 'HOTELS_SHORTLIST_AND_PICK':
      if (!preferences.preferencesLocked) {
        missingFields.push('preferences confirmation');
      }
      break;

    case 'SATISFACTION_GATE':
      // Must have passed quality check
      break;
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get a summary of what's been completed so far
 */
export function getCompletionSummary(preferences: TripPreferences): string[] {
  const summary: string[] = [];

  if (preferences.destinationContext) {
    summary.push(`Destination: ${preferences.destinationContext.canonicalName}`);
  }

  if (preferences.tripLength) {
    summary.push(`Trip length: ${preferences.tripLength} nights`);
  }

  if (preferences.adults) {
    const travelers = preferences.children > 0
      ? `${preferences.adults} adults, ${preferences.children} children`
      : `${preferences.adults} adults`;
    summary.push(`Travelers: ${travelers}`);
  }

  if (preferences.budgetPerNight.min || preferences.budgetPerNight.max) {
    summary.push(`Budget: $${preferences.budgetPerNight.min}-${preferences.budgetPerNight.max}/night`);
  }

  if (preferences.pace) {
    summary.push(`Pace: ${preferences.pace}`);
  }

  if (preferences.selectedActivities.length > 0) {
    summary.push(`Activities: ${preferences.selectedActivities.map(a => a.type).join(', ')}`);
  }

  if (preferences.selectedAreas.length > 0) {
    summary.push(`Areas: ${preferences.selectedAreas.map(a => a.name).join(', ')}`);
  }

  return summary;
}
