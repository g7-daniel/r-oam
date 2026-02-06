/**
 * Quick Plan Orchestrator
 * Adaptive conversation flow that uses LLM for intelligent question selection
 *
 * NOTE: This module runs on the client side, so LLM calls must go through API routes.
 * Direct groq imports are avoided to prevent browser errors.
 */

import { detectTradeoffs } from './tradeoff-engine';
import { getSeasonalWarnings, formatSeasonalWarnings, hasSignificantWarnings, type SeasonalWarning } from './seasonal-data';
import { detectThemeParkDestination, getThemeParkGuidance, generateThemeParkItinerary } from './theme-park-data';
import { detectSurfDestination, getSurfRecommendations } from './surf-data';
import { getEventsForDates, hasSignificantEvents, type LocalEvent } from './events-api';

// FIX 1.9: LLM calls with retry logic and graceful error recovery
async function callLLM(
  messages: { role: string; content: string }[],
  temperature = 0.7,
  retries = 2
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('/api/quick-plan/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, temperature }),
      });

      if (!response.ok) {
        throw new Error(`LLM API call failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.content) {
        throw new Error('Empty LLM response');
      }
      return data.content;
    } catch (error) {
      console.warn(`LLM call attempt ${attempt + 1}/${retries + 1} failed:`, error);

      if (attempt === retries) {
        // Return graceful fallback message after all retries exhausted
        console.error('All LLM retries exhausted, using fallback response');
        return "I'm having a bit of trouble processing that. Let me try a different approach.";
      }

      // Wait before retry (exponential backoff)
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
    }
  }
  return '';
}
import type {
  OrchestratorState,
  TripPreferences,
  ConfidenceLevel,
  EnrichmentType,
  EnrichmentStatus,
  QuestionConfig,
  ReplyCardType,
  ReplyCardConfig,
  ChipOption,
  ChatMessage,
  Tradeoff,
  TradeoffResolution,
  AreaCandidate,
  HotelCandidate,
  VerifiedActivity,
  RestaurantCandidate,
  DebugEntry,
  RedditEvidence,
  SnooState,
  DiningMode,
  ItinerarySplit,
  ItineraryStop,
} from '@/types/quick-plan';

// ============================================================================
// PHASE 3 & 4 FIX: AI-based activity and subreddit suggestions cache
// ============================================================================
const activitySuggestionsCache = new Map<string, { id: string; label: string; icon: string }[]>();
const activitySuggestionsPending = new Map<string, Promise<any>>();

const subredditSuggestionsCache = new Map<string, { id: string; label: string; icon: string; description: string }[]>();
const subredditSuggestionsPending = new Map<string, Promise<any>>();

// Helper to get the API base URL
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // This module is client-only; fallback should never be reached in production
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/**
 * PHASE 4 FIX: Get AI-suggested subreddits for a destination
 * Uses LLM to find relevant subreddits for any destination worldwide
 */
async function fetchDestinationSubreddits(
  destination: string
): Promise<{ id: string; label: string; icon: string; description: string }[]> {
  // Only run in browser
  if (typeof window === 'undefined') {
    console.log('[Subreddits] Skipping - not in browser');
    return [];
  }

  const cacheKey = destination.toLowerCase();
  console.log(`[Subreddits] fetchDestinationSubreddits called for: ${destination}`);

  // Return cached if available
  if (subredditSuggestionsCache.has(cacheKey)) {
    console.log(`[Subreddits] Returning cached results for ${destination}`);
    return subredditSuggestionsCache.get(cacheKey)!;
  }

  // Return pending promise if already fetching
  if (subredditSuggestionsPending.has(cacheKey)) {
    console.log(`[Subreddits] Returning pending promise for ${destination}`);
    return subredditSuggestionsPending.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      console.log(`[Subreddits] Starting API call for ${destination}`);
      const prompt = `For a trip to ${destination}, suggest 4-6 relevant Reddit subreddits that would have travel advice.

Include:
1. The country/region's main subreddit (e.g., r/japan, r/France, r/thailand)
2. A tourism-specific subreddit if one exists (e.g., r/JapanTravel, r/ThailandTourism)
3. Any city-specific subreddits for popular destinations

Return ONLY valid JSON array:
[
  {"id": "subreddit_name", "label": "r/SubredditName", "icon": "emoji", "description": "short description"},
  ...
]

Rules:
- id should be the subreddit name without r/ prefix (e.g., "japan" not "r/japan")
- label should include r/ prefix (e.g., "r/japan")
- icon should be a relevant country flag or travel emoji
- description should be 2-4 words describing the subreddit
- Only include real, active subreddits that exist
- Include 4-6 subreddits max`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const apiUrl = `${getApiBaseUrl()}/api/quick-plan/chat`;
      console.log(`[Subreddits] Calling API: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a Reddit expert who knows travel-related subreddits. Respond only with valid JSON arrays.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log(`[Subreddits] API response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content || '';
      console.log(`[Subreddits] API response content length: ${content.length}`);

      // Parse JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const subreddits = JSON.parse(jsonMatch[0]);
        if (Array.isArray(subreddits) && subreddits.length > 0) {
          console.log(`[Subreddits] SUCCESS! AI suggested ${subreddits.length} subreddits for ${destination}:`, subreddits.map(s => s.id));
          subredditSuggestionsCache.set(cacheKey, subreddits);
          return subreddits;
        }
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(`[Subreddits] FAILED for ${destination}:`, error);
      // Return empty - the getInputConfig will use its defaults
      return [];
    } finally {
      subredditSuggestionsPending.delete(cacheKey);
    }
  })();

  subredditSuggestionsPending.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Get AI-suggested activities for a destination
 * Uses LLM to suggest relevant activities based on destination's unique offerings
 */
async function fetchDestinationActivities(
  destination: string
): Promise<{ id: string; label: string; icon: string }[]> {
  // Only run in browser
  if (typeof window === 'undefined') {
    console.log('[Activities] Skipping - not in browser');
    return [];
  }

  const cacheKey = destination.toLowerCase();
  console.log(`[Activities] fetchDestinationActivities called for: ${destination}`);

  // Return cached if available
  if (activitySuggestionsCache.has(cacheKey)) {
    console.log(`[Activities] Returning cached results for ${destination}`);
    return activitySuggestionsCache.get(cacheKey)!;
  }

  // Return pending promise if already fetching
  if (activitySuggestionsPending.has(cacheKey)) {
    console.log(`[Activities] Returning pending promise for ${destination}`);
    return activitySuggestionsPending.get(cacheKey)!;
  }

  // Default activities (universal fallback)
  const defaultActivities = [
    { id: 'beach', label: 'Beach Days', icon: '🏖️' },
    { id: 'swimming', label: 'Swimming', icon: '🏊' },
    { id: 'nature', label: 'Nature', icon: '🌿' },
    { id: 'hiking', label: 'Hiking', icon: '🥾' },
    { id: 'cultural', label: 'Cultural', icon: '🏛️' },
    { id: 'food_tour', label: 'Food Tours', icon: '🍽️' },
    { id: 'adventure', label: 'Adventure', icon: '🧗' },
    { id: 'spa_wellness', label: 'Spa & Wellness', icon: '💆' },
    { id: 'photography', label: 'Photography', icon: '📸' },
    { id: 'nightlife', label: 'Nightlife', icon: '🎉' },
  ];

  const fetchPromise = (async () => {
    try {
      console.log(`[Activities] Starting API call for ${destination}`);
      const prompt = `For a trip to ${destination}, suggest 10-12 activities that are UNIQUELY relevant to this destination.

Include activities that ${destination} is specifically known for, not generic activities.

For example:
- Switzerland: skiing, fondue tours, scenic train rides, alpine hiking
- Japan: temple visits, onsen (hot springs), sake tasting, karaoke
- Hawaii: surfing, volcano tours, luau, snorkeling
- Morocco: desert camping, souk shopping, hammam, medina tours

Return ONLY valid JSON array:
[
  {"id": "activity_id", "label": "Display Name", "icon": "emoji"},
  ...
]

Rules:
- id should be lowercase with underscores
- label should be 2-3 words max
- icon should be a single relevant emoji
- Include 10-12 activities total
- Mix unique local experiences with popular universal activities`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const apiUrl = `${getApiBaseUrl()}/api/quick-plan/chat`;
      console.log(`[Activities] Calling API: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a travel expert. Respond only with valid JSON arrays.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log(`[Activities] API response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content || '';
      console.log(`[Activities] API response content length: ${content.length}`);

      // Parse JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const activities = JSON.parse(jsonMatch[0]);
        if (Array.isArray(activities) && activities.length > 0) {
          console.log(`[Activities] SUCCESS! AI suggested ${activities.length} activities for ${destination}:`, activities.map(a => a.id));
          activitySuggestionsCache.set(cacheKey, activities);
          return activities;
        }
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error(`[Activities] FAILED for ${destination}:`, error);
      return defaultActivities;
    } finally {
      activitySuggestionsPending.delete(cacheKey);
    }
  })();

  activitySuggestionsPending.set(cacheKey, fetchPromise);
  return fetchPromise;
}

// Helper to create proper ItinerarySplit objects
function createItinerarySplit(
  id: string,
  name: string,
  stops: Array<{ areaId: string; areaName: string; nights: number; area?: AreaCandidate }>,
  fitScore: number,
  areas: AreaCandidate[]
): ItinerarySplit {
  let currentDay = 1;
  const fullStops: ItineraryStop[] = stops.map((stop, idx) => {
    const area = stop.area || areas.find(a => a.id === stop.areaId) || createMinimalArea(stop.areaId, stop.areaName);
    const arrivalDay = currentDay;
    const departureDay = currentDay + stop.nights;
    currentDay = departureDay;

    return {
      areaId: stop.areaId,
      area,
      nights: stop.nights,
      order: idx,
      arrivalDay,
      departureDay,
      isArrivalCity: idx === 0,
      isDepartureCity: idx === stops.length - 1,
      travelDayBefore: idx > 0,
    };
  });

  // Generate contextual reasoning
  const generateReasoning = (): string => {
    if (stops.length === 1) {
      const area = fullStops[0].area;
      if (area?.bestFor?.length) {
        return `Focus on ${area.name} - great for ${area.bestFor.slice(0, 2).join(' and ')}`;
      }
      return `All nights in ${stops[0].areaName} - no travel days needed!`;
    }

    // Find if nights are unequal
    const nightsList = stops.map(s => s.nights);
    const maxNights = Math.max(...nightsList);
    const minNights = Math.min(...nightsList);

    if (maxNights === minNights) {
      return `Equal time in each area for a well-rounded experience`;
    }

    // Find the area with most nights
    const longestStopIdx = nightsList.indexOf(maxNights);
    const longestStop = fullStops[longestStopIdx];
    const longestArea = longestStop.area;

    if (longestArea?.bestFor?.length) {
      return `More time in ${longestArea.name} for ${longestArea.bestFor[0]}`;
    }

    return `${maxNights} nights in ${stops[longestStopIdx].areaName} to fully explore`;
  };

  return {
    id,
    name,
    stops: fullStops,
    fitScore,
    frictionScore: stops.length > 1 ? 0.3 * (stops.length - 1) : 0, // More stops = more friction
    feasibilityScore: 0.9,
    whyThisWorks: generateReasoning(),
    tradeoffs: stops.length > 2 ? ['More time in transit between locations'] : [],
  };
}

function createMinimalArea(areaId: string, areaName: string): AreaCandidate {
  return {
    id: areaId,
    name: areaName,
    type: 'region',
    description: areaName,
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

// ============================================================================
// SPLIT ADVICE - Help users understand how to split their trip
// ============================================================================

interface SplitAdvice {
  minBases: number;
  maxBases: number;
  advice: string;
  tip?: string;
}

function getSplitAdvice(nights: number): SplitAdvice {
  if (nights <= 4) {
    return {
      minBases: 1,
      maxBases: 1,
      advice: "For a short trip, one base is best to avoid wasting time moving.",
      tip: "Pick a central location with good access to attractions."
    };
  }
  if (nights <= 7) {
    return {
      minBases: 1,
      maxBases: 2,
      advice: "A week is perfect for 1-2 bases. More than 2 would feel rushed.",
      tip: "Consider splitting if you want to experience two distinct areas."
    };
  }
  if (nights <= 10) {
    return {
      minBases: 2,
      maxBases: 3,
      advice: "10 days gives you time for 2-3 different areas without rushing.",
      tip: "3-4 nights per area lets you really get to know each place."
    };
  }
  if (nights <= 14) {
    return {
      minBases: 2,
      maxBases: 3,
      advice: "Two weeks is ideal for 2-3 bases with enough time to really explore each.",
      tip: "Consider one main base with day trips, or explore multiple regions."
    };
  }
  return {
    minBases: 3,
    maxBases: 4,
    advice: "With this much time, you could do 3-4 areas, or go deeper in fewer places.",
    tip: "Balance variety with immersion - sometimes less is more!"
  };
}

// ============================================================================
// MULTI-COUNTRY DETECTION - Help users with logistics for multi-country trips
// ============================================================================

interface MultiCountryInfo {
  countries: string[];
  isMultiCountry: boolean;
  logisticsTips: string[];
}

function detectMultiCountry(destination: string): MultiCountryInfo {
  const lower = destination.toLowerCase();

  // List of known countries for validation
  const knownCountries = new Set([
    'thailand', 'vietnam', 'cambodia', 'laos', 'myanmar', 'malaysia', 'singapore', 'indonesia', 'philippines',
    'japan', 'korea', 'china', 'taiwan', 'india', 'nepal', 'sri lanka', 'maldives',
    'france', 'italy', 'spain', 'portugal', 'germany', 'netherlands', 'belgium', 'switzerland', 'austria',
    'greece', 'croatia', 'montenegro', 'slovenia', 'czech', 'poland', 'hungary',
    'uk', 'england', 'scotland', 'ireland', 'iceland', 'norway', 'sweden', 'denmark', 'finland',
    'morocco', 'egypt', 'south africa', 'kenya', 'tanzania', 'namibia',
    'usa', 'canada', 'mexico', 'costa rica', 'panama', 'colombia', 'peru', 'chile', 'argentina', 'brazil',
    'australia', 'new zealand', 'fiji',
    'uae', 'dubai', 'qatar', 'jordan', 'turkey', 'israel',
    'new zealand', 'south africa', 'sri lanka', 'costa rica', 'puerto rico', 'dominican republic',
    'czech republic', 'united kingdom', 'south korea', 'north korea',
  ]);

  // Common multi-country patterns - only match "X and Y", "X & Y", "X to Y" patterns
  // Exclude comma patterns to avoid matching "City, Country" format
  const multiCountryPatterns = [
    /^(\w+(?:\s+\w+)?)\s+(?:and|&)\s+(\w+(?:\s+\w+)?)$/i,  // "Thailand and Vietnam"
    /^(\w+(?:\s+\w+)?)\s+to\s+(\w+(?:\s+\w+)?)$/i,         // "Japan to Korea"
    /^(\w+(?:\s+\w+)?)\s+then\s+(\w+(?:\s+\w+)?)$/i,       // "France then Italy"
    /^(\w+(?:\s+\w+)?)\s*\+\s*(\w+(?:\s+\w+)?)$/i,         // "Spain + Portugal"
  ];

  // Known multi-country combos
  const knownCombos: Record<string, { countries: string[]; tips: string[] }> = {
    'portugal spain': {
      countries: ['Portugal', 'Spain'],
      tips: ['Both in Schengen zone - no visa issues', 'Train from Lisbon to Madrid ~10hrs, or quick flight', 'Consider Renfe train tickets in advance for best prices'],
    },
    'thailand vietnam': {
      countries: ['Thailand', 'Vietnam'],
      tips: ['Check visa requirements for Vietnam', 'Budget airlines like AirAsia connect major cities', 'Consider overnight buses for budget travel'],
    },
    'italy france': {
      countries: ['Italy', 'France'],
      tips: ['Both in Schengen zone', 'High-speed trains connect major cities', 'Consider open-jaw flights to save backtracking'],
    },
    'japan korea': {
      countries: ['Japan', 'South Korea'],
      tips: ['Check visa requirements', 'Quick flights between Tokyo/Seoul (~2hrs)', 'Consider JR Pass for Japan portion'],
    },
    'croatia montenegro': {
      countries: ['Croatia', 'Montenegro'],
      tips: ['Montenegro not in EU - check visa', 'Easy day trips between countries', 'Stunning coastal drive along Adriatic'],
    },
    'maldives dubai': {
      countries: ['Maldives', 'UAE'],
      tips: ['Dubai is common stopover', 'Good flight connections', 'Very different vibes - beach vs city'],
    },
  };

  // Check for known combos
  for (const [combo, info] of Object.entries(knownCombos)) {
    const words = combo.split(' ');
    if (words.every(word => lower.includes(word))) {
      return {
        countries: info.countries,
        isMultiCountry: true,
        logisticsTips: info.tips,
      };
    }
  }

  // Try pattern matching for 2-country combos
  for (const pattern of multiCountryPatterns) {
    const match = destination.match(pattern);
    if (match) {
      const potentialCountries = [match[1], match[2]].filter(Boolean).map(c =>
        c.trim().toLowerCase()
      );

      // Only consider it multi-country if BOTH matches are known countries
      if (potentialCountries.length === 2 &&
          potentialCountries[0] !== potentialCountries[1] &&
          knownCountries.has(potentialCountries[0]) &&
          knownCountries.has(potentialCountries[1])) {
        const countries = potentialCountries.map(c =>
          c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()
        );
        return {
          countries,
          isMultiCountry: true,
          logisticsTips: [
            `Check visa requirements for both ${countries.join(' and ')}`,
            'Consider flight vs train options between countries',
            'Book transport in advance for best prices',
          ],
        };
      }
    }
  }

  // Try 3+ country patterns: "X, Y, and Z" or "X, Y, Z"
  const listPattern = lower.split(/[,&]\s*|\s+and\s+|\s+then\s+/).map(s => s.trim()).filter(Boolean);
  if (listPattern.length >= 3) {
    const validCountries = listPattern.filter(c => knownCountries.has(c));
    if (validCountries.length >= 3) {
      const countries = validCountries.map(c =>
        c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()
      );
      return {
        countries,
        isMultiCountry: true,
        logisticsTips: [
          `Check visa requirements for all ${countries.length} countries`,
          `Consider flight or train routes between ${countries.join(', ')}`,
          'Book transport in advance for best prices',
          'Consider an open-jaw flight to avoid backtracking',
        ],
      };
    }
  }

  return {
    countries: [destination],
    isMultiCountry: false,
    logisticsTips: [],
  };
}

// ============================================================================
// ACTIVITY MINIMUM AGES (for child-age filtering)
// ============================================================================

const ACTIVITY_MIN_AGES: Record<string, number> = {
  dive: 10,           // Scuba diving - 10+ (PADI Junior Open Water)
  surf: 6,            // Surfing - 6+ (but lessons available younger)
  snorkel: 5,         // Snorkeling - 5+ (with life jacket)
  adventure: 8,       // Zip-lining, rappelling - 8+
  hiking: 4,          // Hiking - depends on difficulty, but 4+ for easy trails
  nightlife: 18,      // Nightlife - 18/21+ depending on country
  golf: 8,            // Golf - 8+ (most courses)
  wildlife: 3,        // Wildlife watching - 3+ (whale watching, safaris)
  cultural: 0,        // Museums, temples - all ages
  food_tour: 4,       // Food tours - 4+ (most tours)
  beach: 0,           // Beach days - all ages
  swimming: 0,        // Swimming - all ages (with supervision)
  spa_wellness: 16,   // Spa - 16+ for most treatments
  photography: 0,     // Photography - all ages
  water_sports: 6,    // Jet ski, parasailing - 6+
};

// FIX 1.4: Filter activities based on child ages
function filterActivitiesForChildAges(
  activityTypes: string[],
  childAges: number[]
): { allowed: string[]; restricted: string[]; warnings: string[] } {
  if (!childAges || childAges.length === 0) {
    return { allowed: activityTypes, restricted: [], warnings: [] };
  }

  const minChildAge = Math.min(...childAges);
  const allowed: string[] = [];
  const restricted: string[] = [];
  const warnings: string[] = [];

  for (const activity of activityTypes) {
    const minAge = ACTIVITY_MIN_AGES[activity] || 0;
    if (minChildAge >= minAge) {
      allowed.push(activity);
    } else {
      restricted.push(activity);
      warnings.push(`${activity} typically requires age ${minAge}+ (your youngest is ${minChildAge})`);
    }
  }

  return { allowed, restricted, warnings };
}

// ============================================================================
// SNOO PERSONALITY TEMPLATES
// ============================================================================

const SNOO_TEMPLATES = {
  greeting: [
    "Hey! I'm Snoo, your travel buddy. Where are we headed?",
    "Hi there! Ready to plan an amazing trip? Where would you like to go?",
    "Welcome! I'm Snoo - let's plan something awesome. What destination are you thinking?",
  ],
  thinking: [
    "Let me check what Redditors say about {destination}...",
    "Hmm, searching through Reddit for the best tips on {destination}...",
    "One sec - pulling up local insights from Reddit...",
  ],
  foundAreas: [
    "Based on what Redditors recommend, here are the best areas for your trip:",
    "Found some great options! Here's what the Reddit community suggests:",
    "Reddit has spoken! These areas match what you're looking for:",
  ],
  tradeoffDetected: [
    "Hmm, I noticed something... {description}",
    "Quick heads up - there's a tradeoff we should discuss: {description}",
    "Before we continue, let's resolve this: {description}",
  ],
  celebrating: [
    "Your itinerary is ready!",
    "Done! Here's your personalized trip plan.",
    "All set! Check out your custom itinerary.",
  ],
};

function pickTemplate(templates: string[], replacements?: Record<string, string>): string {
  const template = templates[Math.floor(Math.random() * templates.length)];
  if (!replacements) return template;

  return Object.entries(replacements).reduce(
    (str, [key, value]) => str.replace(`{${key}}`, value),
    template
  );
}

// ============================================================================
// QUESTION CONFIGURATIONS
// ============================================================================

interface FieldQuestionConfig {
  field: string;
  snooMessage: string;
  inputType: ReplyCardType;
  getInputConfig: (state: OrchestratorState) => ReplyCardConfig;
  required: boolean;
  canInfer: boolean;
  inferFrom?: (state: OrchestratorState) => unknown | null;
  condition?: (state: OrchestratorState) => boolean; // Only show if condition returns true
}

const FIELD_QUESTIONS: Record<string, FieldQuestionConfig> = {
  destination: {
    field: 'destination',
    get snooMessage() { return pickTemplate(SNOO_TEMPLATES.greeting); },
    inputType: 'destination',
    getInputConfig: () => ({}),
    required: true,
    canInfer: false,
  },
  dates: {
    field: 'dates',
    snooMessage: "When are you thinking of going? Pick your dates or tell me roughly how long you want to be there.",
    inputType: 'date-range',
    getInputConfig: () => ({
      minDate: new Date(),
      maxDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year out
    }),
    required: true,
    canInfer: false,
  },
  party: {
    field: 'party',
    snooMessage: "Who's coming along on this adventure?",
    inputType: 'party',
    getInputConfig: () => ({}),
    required: true,
    canInfer: true,
    inferFrom: (state) => {
      // If user says "solo trip" in conversation, infer party
      const messages = state.messages;
      const userMessages = messages.filter(m => m.type === 'user');
      for (const msg of userMessages) {
        if (msg.content.toLowerCase().includes('solo')) {
          return { adults: 1, children: 0, childAges: [] };
        }
        if (msg.content.toLowerCase().includes('honeymoon') || msg.content.toLowerCase().includes('couple')) {
          return { adults: 2, children: 0, childAges: [] };
        }
      }
      return null;
    },
  },
  tripOccasion: {
    field: 'tripOccasion',
    snooMessage: "What's the occasion for this trip? This helps me tailor my recommendations!",
    inputType: 'chips',
    getInputConfig: (state) => {
      const adults = state.preferences.adults || 2;
      const children = state.preferences.children || 0;
      const isSolo = adults === 1 && children === 0;
      const isCouple = adults === 2 && children === 0;
      const hasKids = children > 0;
      const isGroup = adults >= 4;

      // Contextual options based on party composition
      const options: { id: string; label: string; icon: string; description?: string }[] = [
        { id: 'vacation', label: 'Regular Vacation', icon: '🏖️', description: 'Just getting away!' },
      ];

      if (isCouple) {
        options.push(
          { id: 'honeymoon', label: 'Honeymoon', icon: '💕', description: 'Romantic getaway for newlyweds' },
          { id: 'anniversary', label: 'Anniversary', icon: '🎉', description: 'Celebrating your relationship' }
        );
      }

      if (isSolo) {
        options.push(
          { id: 'solo_adventure', label: 'Solo Adventure', icon: '🎒', description: 'Exploring on your own' }
        );
      }

      if (isGroup && !hasKids) {
        options.push(
          { id: 'bachelor', label: 'Bachelor/Bachelorette', icon: '🎊', description: 'Pre-wedding celebration' },
          { id: 'girls_trip', label: "Girls' Trip", icon: '👯‍♀️', description: 'Fun with the ladies' },
          { id: 'guys_trip', label: "Guys' Trip", icon: '🍻', description: 'Fun with the boys' }
        );
      }

      if (hasKids || isGroup) {
        options.push(
          { id: 'family_reunion', label: 'Family Reunion', icon: '👨‍👩‍👧‍👦', description: 'Getting the family together' }
        );
      }

      options.push(
        { id: 'wedding', label: 'Attending Wedding', icon: '💒', description: 'Guest at a destination wedding' },
        { id: 'workation', label: 'Work + Travel', icon: '💻', description: 'Remote work while traveling' },
        { id: 'wellness', label: 'Wellness Retreat', icon: '🧘', description: 'Focus on health and relaxation' }
      );

      return {
        options: options.slice(0, 8), // Limit to 8 options
        allowCustomText: true,
        customTextPlaceholder: 'Other occasion...',
      };
    },
    required: false, // Optional but highly valuable for personalization
    canInfer: true,
    inferFrom: (state) => {
      const messages = state.messages;
      for (const msg of messages) {
        if (msg.type === 'user') {
          const lower = msg.content.toLowerCase();
          if (lower.includes('honeymoon')) return { id: 'honeymoon' };
          if (lower.includes('bachelor') || lower.includes('bachelorette')) return { id: 'bachelor' };
          if (lower.includes('anniversary')) return { id: 'anniversary' };
          if (lower.includes('wedding')) return { id: 'wedding' };
          if (lower.includes('work') && lower.includes('travel')) return { id: 'workation' };
        }
      }
      return null;
    },
  },
  travelingWithPets: {
    field: 'travelingWithPets',
    snooMessage: "Traveling with any pets? 🐕",
    inputType: 'chips',
    getInputConfig: () => ({
      options: [
        { id: 'no', label: 'No', icon: '✗' },
        { id: 'yes', label: 'Yes', icon: '🐾' },
      ],
    }),
    required: false,
    canInfer: false,
  },
  travelingWithPetsType: {
    field: 'travelingWithPetsType',
    snooMessage: "What kind of pet? 🐾",
    inputType: 'chips',
    getInputConfig: () => ({
      options: [
        { id: 'small_dog', label: 'Small dog', icon: '🐕', description: 'Under 25 lbs' },
        { id: 'medium_dog', label: 'Medium dog', icon: '🐕', description: '25-50 lbs' },
        { id: 'large_dog', label: 'Large dog', icon: '🐕', description: 'Over 50 lbs' },
        { id: 'cat', label: 'Cat', icon: '🐱' },
        { id: 'other_pet', label: 'Other', icon: '🐾' },
      ],
    }),
    required: false,
    canInfer: false,
    // Only show if user said yes to pets
    condition: (state: OrchestratorState) => state.preferences?.hasPets === true,
  },
  accessibility: {
    field: 'accessibility',
    snooMessage: "Any accessibility needs?",
    inputType: 'chips',
    getInputConfig: () => ({
      options: [
        { id: 'no', label: 'No', icon: '✗' },
        { id: 'yes', label: 'Yes', icon: '♿' },
      ],
    }),
    required: false,
    canInfer: false,
  },
  accessibilityType: {
    field: 'accessibilityType',
    snooMessage: "What accessibility features do you need?",
    inputType: 'chips-multi',
    getInputConfig: () => ({
      options: [
        { id: 'wheelchair', label: 'Wheelchair accessible', icon: '♿' },
        { id: 'ground_floor', label: 'Ground floor room', icon: '1️⃣' },
        { id: 'elevator', label: 'Elevator required', icon: '🛗' },
        { id: 'no_stairs', label: 'No stairs', icon: '🚫' },
        { id: 'grab_bars', label: 'Grab bars in bathroom', icon: '🚿' },
        { id: 'roll_in_shower', label: 'Roll-in shower', icon: '🚿' },
        { id: 'wide_doorways', label: 'Wide doorways', icon: '🚪' },
      ],
      allowCustomText: true,
      customTextPlaceholder: 'Other accessibility needs...',
    }),
    required: false,
    canInfer: false,
    // Only show if user said yes to accessibility
    condition: (state: OrchestratorState) => state.preferences?.hasAccessibilityNeeds === true,
  },
  budget: {
    field: 'budget',
    snooMessage: "What's your hotel budget **per night**?",
    inputType: 'slider',
    getInputConfig: (state) => ({
      min: 50,
      max: 1000,
      step: 25,
      defaultValue: 175,
      // Clean slider - no tier labels, just min/max
      showMinMax: true,
      formatValue: (val: number) => val >= 1000 ? '$1K+' : `$${val}`,
      // Special handling: values at max are treated as "X or more"
      maxMeansUnlimited: true,
    }),
    required: true,
    canInfer: false,
  },
  accommodationType: {
    field: 'accommodationType',
    snooMessage: "What type of accommodation are you looking for?",
    inputType: 'chips',
    getInputConfig: (state) => {
      const budget = state.preferences.budgetPerNight?.max || 200;
      const tripOccasion = (state.preferences as any).tripOccasion;
      const isGroup = (state.preferences.adults || 2) >= 4;
      const hasKids = (state.preferences.children || 0) > 0;

      // Build contextual options based on budget and occasion
      const options: { id: string; label: string; icon: string; description?: string }[] = [];

      // Budget travelers see hostel option first
      if (budget <= 100) {
        options.push({ id: 'hostel', label: 'Hostel', icon: '🛏️', description: 'Social, budget-friendly' });
      }

      // Standard hotel always available
      options.push({ id: 'hotel', label: 'Hotel', icon: '🏨', description: 'Standard hotel stay' });

      // Vacation rental for groups or families
      if (isGroup || hasKids) {
        options.push({ id: 'vacation_rental', label: 'Vacation Rental', icon: '🏠', description: 'Airbnb, VRBO, whole homes' });
      }

      // Villa for larger groups
      if (isGroup && budget >= 200) {
        options.push({ id: 'villa', label: 'Private Villa', icon: '🏡', description: 'Private villa for the group' });
      }

      // Resort for vacation/honeymoon/anniversary
      if (tripOccasion === 'honeymoon' || tripOccasion === 'anniversary' || tripOccasion === 'wellness' || budget >= 300) {
        options.push({ id: 'resort', label: 'Resort', icon: '🌴', description: 'Full-service resort experience' });
      }

      // Boutique for couples/special occasions
      if (tripOccasion === 'honeymoon' || tripOccasion === 'anniversary' || budget >= 200) {
        options.push({ id: 'boutique', label: 'Boutique Hotel', icon: '✨', description: 'Unique, design-focused' });
      }

      // Eco-lodge always as option
      options.push({ id: 'eco_lodge', label: 'Eco Lodge', icon: '🌿', description: 'Sustainable, nature-focused' });

      return {
        options: options.slice(0, 6), // Limit to 6 options
      };
    },
    required: false, // Optional but helps filter results
    canInfer: true,
    inferFrom: (state) => {
      const budget = state.preferences.budgetPerNight?.max || 200;
      const tripOccasion = (state.preferences as any).tripOccasion;
      const suggestedType = (state.preferences as any).suggestedAccommodationType;

      // Infer hostel for very budget travelers
      if (budget <= 70) return { id: 'hostel' };
      // Infer resort for honeymoons with high budget
      if (tripOccasion === 'honeymoon' && budget >= 400) return { id: 'resort' };
      // Use suggested type for large groups (but only as inference, user can change)
      if (suggestedType) return { id: suggestedType };

      return null;
    },
  },
  sustainabilityPreference: {
    field: 'sustainabilityPreference',
    snooMessage: "How important is eco-friendly/sustainable travel to you?",
    inputType: 'chips',
    getInputConfig: () => ({
      options: [
        { id: 'standard', label: "Not a priority", icon: '✓', description: "I'll take the best option" },
        { id: 'eco_conscious', label: 'Eco-conscious', icon: '🌱', description: 'Prefer eco-friendly when available' },
        { id: 'eco_focused', label: 'Eco-focused', icon: '🌍', description: 'Sustainability is a top priority' },
      ],
    }),
    required: false,
    canInfer: true,
    inferFrom: (state) => {
      // If user chose eco_lodge accommodation, infer eco-focused
      const accommodationType = (state.preferences as any).accommodationType;
      if (accommodationType === 'eco_lodge') return { id: 'eco_focused' };
      return null;
    },
  },
  subreddits: {
    field: 'subreddits',
    snooMessage: "Which Reddit communities should I search? I've picked some based on your destination and trip style.",
    inputType: 'chips-multi',
    getInputConfig: (state) => {
      // PHASE 4 FIX: Use AI-suggested subreddits instead of hardcoded if-statements
      const budget = state.preferences.budgetPerNight?.max || 200;
      const destination = state.preferences.destinationContext?.canonicalName ||
                          state.preferences.destinationContext?.rawInput || '';
      const hasChildren = (state.preferences.children || 0) > 0;
      const isSolo = state.preferences.adults === 1 && !hasChildren;

      console.log('[subreddits getInputConfig] Budget:', budget, 'HasChildren:', hasChildren, 'IsSolo:', isSolo);

      // Get AI-suggested destination-specific subreddits from cache
      const cacheKey = destination.toLowerCase();
      const cachedSubreddits = subredditSuggestionsCache.get(cacheKey);

      // Start with AI-suggested destination subreddits (highest priority)
      const options: { id: string; label: string; icon: string; description: string }[] = [];

      if (cachedSubreddits && cachedSubreddits.length > 0) {
        console.log(`[subreddits] Using ${cachedSubreddits.length} AI-suggested subreddits for ${destination}`);
        options.push(...cachedSubreddits);
      } else {
        console.log(`[subreddits] No AI suggestions cached for ${destination}, using general subreddits`);
      }

      // Add party composition subreddits
      if (hasChildren) {
        if (!options.some(o => o.id === 'familytravel')) {
          options.push({ id: 'familytravel', label: 'r/familytravel', icon: '👨‍👩‍👧', description: 'Family trip tips' });
        }
        if (!options.some(o => o.id === 'travelwithkids')) {
          options.push({ id: 'travelwithkids', label: 'r/travelwithkids', icon: '🧒', description: 'Traveling with children' });
        }
      }
      if (isSolo && !options.some(o => o.id === 'solotravel')) {
        options.push({ id: 'solotravel', label: 'r/solotravel', icon: '🎒', description: 'Solo traveler tips' });
      }

      // Add budget-specific options (only if NOT family to avoid clutter)
      if (budget >= 1000 && !hasChildren) {
        // Ultra-luxury: r/fattravel for $1K+/night travelers
        if (!options.some(o => o.id === 'fattravel')) {
          options.push({ id: 'fattravel', label: 'r/fattravel', icon: '👑', description: 'Ultra-luxury travel' });
        }
        if (!options.some(o => o.id === 'luxurytravel')) {
          options.push({ id: 'luxurytravel', label: 'r/luxurytravel', icon: '💎', description: 'High-end experiences' });
        }
      } else if (budget >= 400 && !hasChildren) {
        if (!options.some(o => o.id === 'luxurytravel')) {
          options.push({ id: 'luxurytravel', label: 'r/luxurytravel', icon: '💎', description: 'High-end experiences' });
        }
      } else if (budget <= 150) {
        if (!options.some(o => o.id === 'budgettravel')) {
          options.push({ id: 'budgettravel', label: 'r/budgettravel', icon: '💰', description: 'Money-saving tips' });
        }
      }

      // Always include general travel if not already present
      if (!options.some(o => o.id === 'travel')) {
        options.push({ id: 'travel', label: 'r/travel', icon: '✈️', description: 'General travel advice' });
      }
      if (!options.some(o => o.id === 'TravelHacks')) {
        options.push({ id: 'TravelHacks', label: 'r/TravelHacks', icon: '💡', description: 'Travel tips & tricks' });
      }

      return { options: options.slice(0, 8) }; // Limit to 8 options
    },
    required: true,
    canInfer: false,
  },
  pace: {
    field: 'pace',
    snooMessage: "How do you like to travel? Action-packed or more relaxed?",
    inputType: 'chips',
    getInputConfig: () => ({
      options: [
        { id: 'chill', label: 'Chill', icon: '🧘', description: 'Lots of downtime, few planned activities' },
        { id: 'balanced', label: 'Balanced', icon: '⚖️', description: 'Mix of activities and relaxation' },
        { id: 'packed', label: 'Action-packed', icon: '🚀', description: 'Something every day, make the most of it' },
      ],
    }),
    required: true,
    canInfer: false,
  },
  activities: {
    field: 'activities',
    snooMessage: "What kind of activities are you excited about? Pick all that sound fun!",
    inputType: 'chips-multi',
    getInputConfig: (state) => {
      const hasChildren = (state.preferences.children || 0) > 0;
      const childAges = state.preferences.childAges || [];
      const youngestChildAge = childAges.length > 0 ? Math.min(...childAges) : 0;
      console.log('[activities getInputConfig] Children detected:', hasChildren, 'Ages:', childAges, 'Youngest:', youngestChildAge);

      // PHASE 3 FIX: Use AI-suggested activities if available (cached from destination confirmation)
      const destName = state.preferences.destinationContext?.canonicalName ||
                       state.preferences.destinationContext?.rawInput || '';
      const cacheKey = destName.toLowerCase();
      const cachedActivities = activitySuggestionsCache.get(cacheKey);

      // Use AI-suggested activities if available, otherwise fall back to universal defaults
      let options: { id: string; label: string; icon: string; description?: string }[] = cachedActivities
        ? cachedActivities.map(a => ({ ...a })) // Clone to avoid mutations
        : [
            // Universal fallback activities
            { id: 'beach', label: 'Beach Days', icon: '🏖️' },
            { id: 'swimming', label: 'Swimming', icon: '🏊' },
            { id: 'snorkel', label: 'Snorkeling', icon: '🤿' },
            { id: 'wildlife', label: 'Wildlife', icon: '🐋' },
            { id: 'nature', label: 'Nature', icon: '🌿' },
            { id: 'hiking', label: 'Hiking', icon: '🥾' },
            { id: 'cultural', label: 'Cultural', icon: '🏛️' },
            { id: 'food_tour', label: 'Food Tours', icon: '🍽️' },
            { id: 'adventure', label: 'Adventure', icon: '🧗' },
            { id: 'spa_wellness', label: 'Spa & Wellness', icon: '💆' },
            { id: 'surf', label: 'Surfing', icon: '🏄' },
            { id: 'dive', label: 'Scuba Diving', icon: '🐠' },
            { id: 'golf', label: 'Golf', icon: '⛳' },
            { id: 'photography', label: 'Photography', icon: '📸' },
          ];

      if (cachedActivities) {
        console.log(`[activities] Using ${cachedActivities.length} AI-suggested activities for ${destName}`);
      } else {
        console.log(`[activities] Using default activities (AI suggestions not yet cached for ${destName})`);
      }

      // For families with young children, add descriptions noting age requirements
      // but DON'T filter out - parents may do these while kids have other activities
      if (hasChildren && youngestChildAge > 0 && youngestChildAge < 12) {
        options = options.map(opt => {
          const minAge = ACTIVITY_MIN_AGES[opt.id] ?? 0;
          if (youngestChildAge < minAge) {
            // Add note that this may be adults-only time
            return {
              ...opt,
              description: `Usually ${minAge}+ (great for parent time!)`,
            };
          }
          return opt;
        });
      }

      // Add family-specific activities if kids present
      if (hasChildren) {
        const kidsOptions: { id: string; label: string; icon: string; description?: string }[] = [
          { id: 'kids_activities', label: 'Kids Activities', icon: '🎠', description: 'Kid-friendly attractions' },
        ];

        // For older kids (8+), add more adventurous options
        if (childAges.some(age => age >= 8)) {
          kidsOptions.push(
            { id: 'water_park', label: 'Water Parks', icon: '🎢', description: 'Fun for the whole family' }
          );
        }

        // Put kids options first, then all other options
        options = [...kidsOptions, ...options];

        // For family trips, add nightlife at end with a note (not removed)
        // Parents might want a night out while kids have a babysitter/kids club
        if (!options.some(o => o.id === 'nightlife')) {
          options.push({
            id: 'nightlife',
            label: 'Nightlife',
            icon: '🎉',
            description: 'Date night while kids at club',
          });
        }
      } else {
        // Add nightlife for adult trips if not already present from AI
        if (!options.some(o => o.id === 'nightlife')) {
          options.push({ id: 'nightlife', label: 'Nightlife', icon: '🎉' });
        }
      }

      return {
        options,
        allowCustomText: true,
        customTextPlaceholder: 'Add another activity...',
        field: 'activities',
        allowNotes: true,
      };
    },
    required: true,
    canInfer: false,
  },
  vibe: {
    field: 'vibe',
    snooMessage: "Any must-dos or hard passes for this trip? Things you absolutely want or definitely don't want.",
    inputType: 'text',
    getInputConfig: () => ({
      customTextPlaceholder: 'e.g., "Must see a waterfall" or "No early mornings"',
      allowCustomText: true,
    }),
    required: false,
    canInfer: false,
  },
  activitySkillLevel: {
    field: 'activitySkillLevel',
    // Dynamic message set in getInputConfig based on which activities need skill level
    snooMessage: "What's your experience level?",
    inputType: 'chips',
    getInputConfig: (state) => {
      // Check which skill-based activities were selected
      // Only truly skill-dependent activities
      const SKILL_ACTIVITIES_MAP: Record<string, string> = {
        'surf': 'Surfing',
        'dive': 'Scuba Diving',
        'golf': 'Golf'
      };
      const activities = state.preferences.selectedActivities || [];
      const skillActivities = activities.filter(a => SKILL_ACTIVITIES_MAP[a.type]);

      if (skillActivities.length === 0) {
        return { options: [] };
      }

      // Get the activity names for display
      const activityNames = skillActivities.map(a => SKILL_ACTIVITIES_MAP[a.type]).join(', ');

      // Create a more specific message
      const specificMessage = skillActivities.length === 1
        ? `What's your ${activityNames} experience level?`
        : `For ${activityNames} - what's your overall experience level?`;

      return {
        options: [
          { id: 'beginner', label: `Beginner`, icon: '🌱', description: `New to ${skillActivities.length === 1 ? activityNames.toLowerCase() : 'these activities'}` },
          { id: 'intermediate', label: `Intermediate`, icon: '🌿', description: 'Comfortable with the basics' },
          { id: 'advanced', label: `Advanced`, icon: '🌲', description: 'Looking for a challenge' },
        ],
        activityNames, // For customizing the message
      };
    },
    required: false,
    canInfer: false,
  },
  areas: {
    field: 'areas',
    snooMessage: pickTemplate(SNOO_TEMPLATES.foundAreas),
    inputType: 'areas',
    getInputConfig: (state) => ({
      areaCandidates: state.discoveredData.areas,
    }),
    required: true,
    canInfer: false,
  },
  split: {
    field: 'split',
    snooMessage: "How do you want to split your time between these areas?",
    inputType: 'split',
    getInputConfig: (state) => {
      const areas = state.preferences.selectedAreas || [];
      const tripLength = state.preferences.tripLength || 7;

      console.log('[Split getInputConfig] Generating split options:', {
        areasCount: areas.length,
        areaNames: areas.map(a => a.name),
        tripLength,
      });

      // Generate split options based on number of areas
      const splitOptions: ItinerarySplit[] = [];

      if (areas.length === 1) {
        // Single area - just one option
        splitOptions.push(createItinerarySplit(
          'all-in-one',
          `${tripLength} nights in ${areas[0].name}`,
          [{ areaId: areas[0].id, areaName: areas[0].name, nights: tripLength, area: areas[0] }],
          1.0,
          areas
        ));
      } else if (areas.length === 2) {
        // Two areas - offer different splits
        const half = Math.floor(tripLength / 2);
        const remainder = tripLength - half;

        splitOptions.push(createItinerarySplit(
          'even-split',
          `${half} nights ${areas[0].name} → ${remainder} nights ${areas[1].name}`,
          [
            { areaId: areas[0].id, areaName: areas[0].name, nights: half, area: areas[0] },
            { areaId: areas[1].id, areaName: areas[1].name, nights: remainder, area: areas[1] },
          ],
          0.9,
          areas
        ));

        if (tripLength >= 5) {
          const longer = Math.ceil(tripLength * 0.6);
          const shorter = tripLength - longer;
          splitOptions.push(createItinerarySplit(
            'longer-first',
            `${longer} nights ${areas[0].name} → ${shorter} nights ${areas[1].name}`,
            [
              { areaId: areas[0].id, areaName: areas[0].name, nights: longer, area: areas[0] },
              { areaId: areas[1].id, areaName: areas[1].name, nights: shorter, area: areas[1] },
            ],
            0.85,
            areas
          ));
          splitOptions.push(createItinerarySplit(
            'longer-second',
            `${shorter} nights ${areas[0].name} → ${longer} nights ${areas[1].name}`,
            [
              { areaId: areas[0].id, areaName: areas[0].name, nights: shorter, area: areas[0] },
              { areaId: areas[1].id, areaName: areas[1].name, nights: longer, area: areas[1] },
            ],
            0.85,
            areas
          ));
        }
      } else if (areas.length >= 3) {
        // Three+ areas - distribute evenly with remainder to last
        // Limit areas to tripLength to ensure at least 1 night per area
        const maxAreas = Math.min(areas.length, tripLength);
        const effectiveAreas = areas.slice(0, maxAreas);
        const baseNights = Math.floor(tripLength / effectiveAreas.length);
        const extraNights = tripLength % effectiveAreas.length;

        const evenStops = effectiveAreas.map((area, idx) => ({
          areaId: area.id,
          areaName: area.name,
          nights: Math.max(1, baseNights + (idx === effectiveAreas.length - 1 ? extraNights : 0)),
          area,
        }));

        splitOptions.push(createItinerarySplit(
          'even-split',
          evenStops.map(s => `${s.nights}n ${s.areaName}`).join(' → '),
          evenStops,
          0.9,
          effectiveAreas
        ));

        // Option with more time in first area
        // Bug fix: ensure no area gets 0 nights - need at least 3*areas nights to redistribute
        if (tripLength >= effectiveAreas.length * 3) {
          const focusStops = effectiveAreas.map((area, idx) => ({
            areaId: area.id,
            areaName: area.name,
            // Give first area +2 nights, last area -1, redistribute remaining from middle
            nights: idx === 0
              ? baseNights + 2
              : (idx === effectiveAreas.length - 1
                  ? Math.max(1, baseNights + extraNights - 1)
                  : Math.max(1, baseNights - Math.ceil(1 / (effectiveAreas.length - 2)))),
            area,
          }));
          // Verify all stops have at least 1 night
          const allValid = focusStops.every(s => s.nights >= 1);
          if (allValid && focusStops.reduce((sum, s) => sum + s.nights, 0) === tripLength) {
            splitOptions.push(createItinerarySplit(
              'focus-first',
              focusStops.map(s => `${s.nights}n ${s.areaName}`).join(' → '),
              focusStops,
              0.85,
              effectiveAreas
            ));
          }
        }
      }

      // If no options generated (shouldn't happen), create a default
      if (splitOptions.length === 0 && areas.length > 0) {
        console.warn('[Split getInputConfig] No options generated, creating default');
        // Bug fix: ensure minimum 1 night per area - limit areas if needed
        const maxAreas = Math.min(areas.length, tripLength);
        const limitedAreas = areas.slice(0, maxAreas);
        const nightsPerArea = Math.max(1, Math.floor(tripLength / limitedAreas.length));
        const remainder = tripLength - (nightsPerArea * limitedAreas.length);
        const defaultStops = limitedAreas.map((area, idx) => ({
          areaId: area.id,
          areaName: area.name,
          // Give remainder nights to last area, ensure at least 1 night each
          nights: Math.max(1, nightsPerArea + (idx === limitedAreas.length - 1 ? remainder : 0)),
          area,
        }));
        splitOptions.push(createItinerarySplit(
          'default-split',
          defaultStops.map(s => `${s.nights}n ${s.areaName}`).join(' → '),
          defaultStops,
          0.8,
          limitedAreas
        ));
      }

      console.log('[Split getInputConfig] Returning', splitOptions.length, 'split options:', splitOptions.map(o => o.name));
      return { splitOptions, areas, tripLength };
    },
    required: true,
    canInfer: false,
  },
  hotelPreferences: {
    field: 'hotelPreferences',
    snooMessage: "What's important to you in a hotel? Pick all that apply.",
    inputType: 'chips-multi',
    getInputConfig: (state) => {
      const hasChildren = (state.preferences.children || 0) > 0;
      console.log('[hotelPreferences getInputConfig] Children detected:', hasChildren);

      const baseOptions = [
        { id: 'pool', label: 'Pool', icon: '🏊' },
        { id: 'beach_access', label: 'Beach Access', icon: '🏖️' },
        { id: 'spa', label: 'Spa', icon: '💆' },
        { id: 'gym', label: 'Gym', icon: '🏋️' },
        { id: 'restaurant', label: 'On-site Restaurant', icon: '🍽️' },
        { id: 'all_inclusive', label: 'All-Inclusive', icon: '🎫' },
        { id: 'boutique', label: 'Boutique/Unique', icon: '✨' },
        { id: 'quiet', label: 'Quiet/Peaceful', icon: '🧘' },
      ];

      // Add family-specific options if kids are present
      if (hasChildren) {
        baseOptions.push(
          { id: 'family', label: 'Family-Friendly', icon: '👨‍👩‍👧' },
          { id: 'kids_club', label: 'Kids Club', icon: '🎠' },
          { id: 'kids_pool', label: 'Kids Pool', icon: '🏊‍♂️' },
        );
      } else {
        // Only show adults-only option if NO children
        baseOptions.push(
          { id: 'adults_only', label: 'Adults Only', icon: '🍷' }
        );
      }

      return {
        options: baseOptions,
        allowCustomText: true,
        customTextPlaceholder: 'Anything else important?',
        field: 'hotels',
        allowNotes: true,
      };
    },
    required: true,
    canInfer: false,
  },
  hotels: {
    field: 'hotels',
    snooMessage: '', // Will be set dynamically with area name
    inputType: 'hotels',
    getInputConfig: (state) => {
      // Get hotels for the first area that doesn't have a selection yet
      const areas = state.preferences.selectedAreas || [];
      const selectedHotels = (state.preferences as any).selectedHotels || {};

      console.log('[Hotels getInputConfig] selectedAreas:', areas.map(a => a.id));
      console.log('[Hotels getInputConfig] already selected:', Object.keys(selectedHotels));

      for (const area of areas) {
        // Skip areas that already have a hotel selected
        if (selectedHotels[area.id]) {
          console.log(`[Hotels getInputConfig] Area ${area.id} already has hotel selected`);
          continue;
        }

        const hotels = state.discoveredData.hotels.get(area.id);
        console.log(`[Hotels getInputConfig] Area ${area.id}: ${hotels?.length || 0} hotels available`);
        if (hotels && hotels.length > 0) {
          return { candidates: hotels, areaName: area.name, areaId: area.id };
        }
      }
      return { candidates: [], areaName: areas[0]?.name || 'your destination', areaId: null };
    },
    required: true,
    canInfer: false,
  },
  dining: {
    field: 'dining',
    snooMessage: "How do you want to handle dining? I can help you find great restaurants, or you can wing it.",
    inputType: 'chips',
    getInputConfig: () => ({
      options: [
        { id: 'plan', label: 'Help me find restaurants', description: "I'll show you the best spots near your hotels" },
        { id: 'none', label: 'Skip dining', description: "We'll figure it out ourselves" },
      ],
    }),
    required: true,
    canInfer: true,
    inferFrom: (state) => {
      // If user mentions "we'll find food ourselves", skip dining
      const messages = state.messages;
      for (const msg of messages) {
        if (msg.type === 'user') {
          const lower = msg.content.toLowerCase();
          if (lower.includes('find food') || lower.includes('wing it') || lower.includes('figure out food')) {
            // Bug fix: response handler expects { id: ... } not { mode: ... }
            return { id: 'none' };
          }
        }
      }
      return null;
    },
  },
  dietaryRestrictions: {
    field: 'dietaryRestrictions',
    snooMessage: "Any dietary restrictions I should know about when finding restaurants?",
    inputType: 'chips-multi',
    getInputConfig: () => ({
      options: [
        { id: 'none', label: 'No restrictions', icon: '✓' },
        { id: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
        { id: 'vegan', label: 'Vegan', icon: '🌱' },
        { id: 'halal', label: 'Halal', icon: '☪️' },
        { id: 'kosher', label: 'Kosher', icon: '✡️' },
        { id: 'gluten_free', label: 'Gluten-free', icon: '🌾' },
        { id: 'nut_allergy', label: 'Nut allergy', icon: '🥜' },
        { id: 'seafood_allergy', label: 'Seafood allergy', icon: '🦐' },
        { id: 'dairy_free', label: 'Dairy-free', icon: '🥛' },
      ],
      allowCustomText: true,
      customTextPlaceholder: 'Other dietary needs...',
      field: 'dining',
      allowNotes: true,
    }),
    required: false, // Only asked if dining mode is 'plan'
    canInfer: false,
  },
  cuisinePreferences: {
    field: 'cuisinePreferences',
    snooMessage: "What kind of food are you in the mood for? Pick all that sound good!",
    inputType: 'chips-multi',
    getInputConfig: () => ({
      options: [
        { id: 'italian', label: 'Italian', icon: '🍝' },
        { id: 'steakhouse', label: 'Steakhouse', icon: '🥩' },
        { id: 'sushi', label: 'Sushi/Japanese', icon: '🍣' },
        { id: 'fine_dining', label: 'Fine Dining', icon: '🍽️' },
        { id: 'seafood', label: 'Seafood', icon: '🦞' },
        { id: 'local', label: 'Local Cuisine', icon: '🍲' },
        { id: 'mexican', label: 'Mexican', icon: '🌮' },
        { id: 'asian', label: 'Asian Fusion', icon: '🥢' },
        { id: 'mediterranean', label: 'Mediterranean', icon: '🫒' },
        { id: 'casual', label: 'Casual/Pub', icon: '🍔' },
      ],
      allowCustomText: true,
      customTextPlaceholder: 'Other cuisine type...',
      field: 'dining',
      allowNotes: true,
    }),
    required: false, // Only asked if dining mode is 'plan'
    canInfer: false,
  },
  restaurants: {
    field: 'restaurants',
    snooMessage: '', // Will be set dynamically with cuisine type
    inputType: 'restaurants',
    getInputConfig: (state) => {
      // Get restaurants for the first cuisine type that doesn't have selections yet
      const cuisinePrefs = (state.preferences as any).cuisinePreferences || [];
      const selectedRestaurants = (state.preferences as any).selectedRestaurants || {};
      const areas = state.preferences.selectedAreas || [];

      console.log('[Restaurants getInputConfig] cuisinePrefs:', cuisinePrefs);
      console.log('[Restaurants getInputConfig] already selected:', Object.keys(selectedRestaurants));

      for (const cuisine of cuisinePrefs) {
        // Skip cuisines that already have restaurants selected
        if (selectedRestaurants[cuisine]) {
          console.log(`[Restaurants getInputConfig] Cuisine ${cuisine} already has restaurants selected`);
          continue;
        }

        const restaurants = state.discoveredData.restaurants.get(cuisine);
        console.log(`[Restaurants getInputConfig] Cuisine ${cuisine}: ${restaurants?.length || 0} restaurants available`);
        if (restaurants && restaurants.length > 0) {
          // Format cuisine label nicely
          const cuisineLabels: Record<string, string> = {
            italian: 'Italian',
            steakhouse: 'Steakhouse',
            sushi: 'Sushi/Japanese',
            fine_dining: 'Fine Dining',
            seafood: 'Seafood',
            local: 'Local',
            mexican: 'Mexican',
            asian: 'Asian',
            mediterranean: 'Mediterranean',
            casual: 'Casual',
          };
          const cuisineLabel = cuisineLabels[cuisine] || cuisine;

          return {
            candidates: restaurants,
            cuisineType: cuisine,
            cuisineLabel,
            areas: areas.map(a => ({ id: a.id, name: a.name })),
          };
        }
      }
      return { candidates: [], cuisineType: null, cuisineLabel: '', areas: [] };
    },
    required: false, // Only required if diningMode is 'plan'
    canInfer: false,
  },
  experiences: {
    field: 'experiences',
    snooMessage: '', // Will be set dynamically with activity type
    inputType: 'activities',
    getInputConfig: (state) => {
      // Get experiences for the first activity type that doesn't have selections yet
      const selectedActivities = state.preferences.selectedActivities || [];
      const activityTypes = selectedActivities.map(a => a.type);
      const selectedExperiences = (state.preferences as any).selectedExperiences || {};
      const areas = state.preferences.selectedAreas || [];

      console.log('[Experiences getInputConfig] activityTypes:', activityTypes);
      console.log('[Experiences getInputConfig] already selected:', Object.keys(selectedExperiences));

      for (const activity of activityTypes) {
        // Skip activities that already have experiences selected
        if (selectedExperiences[activity]) {
          console.log(`[Experiences getInputConfig] Activity ${activity} already has experiences selected`);
          continue;
        }

        const experiences = (state.discoveredData as any).experiences?.get(activity);
        console.log(`[Experiences getInputConfig] Activity ${activity}: ${experiences?.length || 0} experiences available`);
        if (experiences && experiences.length > 0) {
          const activityLabels: Record<string, string> = {
            surf: 'Surfing',
            snorkel: 'Snorkeling',
            dive: 'Scuba Diving',
            swimming: 'Swimming',
            wildlife: 'Wildlife',
            nature: 'Nature',
            hiking: 'Hiking',
            adventure: 'Adventure',
            cultural: 'Cultural',
            food_tour: 'Food Tours',
            nightlife: 'Nightlife',
            beach: 'Beach',
            spa_wellness: 'Spa & Wellness',
            golf: 'Golf',
            photography: 'Photography',
          };
          const activityLabel = activityLabels[activity] || activity;

          return {
            candidates: experiences,
            activityType: activity,
            activityLabel,
            areas: areas.map(a => ({ id: a.id, name: a.name })),
          };
        }
      }
      return { candidates: [], activityType: null, activityLabel: '', areas: [] };
    },
    required: false, // Only if user selected activities
    canInfer: false,
  },
  // ============================================================================
  // SMART FOLLOW-UP QUESTIONS (Phase 1 Critical)
  // ============================================================================

  // Surfing details - triggered when surfing is selected
  surfingDetails: {
    field: 'surfingDetails',
    snooMessage: "What's your surfing experience? This helps me find the right spots and schools.",
    inputType: 'chips',
    getInputConfig: (state) => {
      const destId = detectSurfDestination(
        state.preferences.destinationContext?.rawInput || ''
      );
      const travelMonth = state.preferences.startDate
        ? new Date(state.preferences.startDate).getMonth() + 1
        : new Date().getMonth() + 1;

      let seasonNote = '';
      if (destId) {
        const recs = getSurfRecommendations(destId, 'beginner', travelMonth);
        if (recs) {
          seasonNote = recs.seasonAdvice;
        }
      }

      return {
        options: [
          { id: 'never', label: "Never surfed - want lessons", icon: '🎓', description: "I'll find beginner-friendly spots and schools" },
          { id: 'beginner', label: 'Beginner - can catch waves', icon: '🌊', description: "Comfortable on small waves, want to improve" },
          { id: 'intermediate', label: 'Intermediate', icon: '🏄', description: "Can handle 4-6ft waves, looking for good breaks" },
          { id: 'advanced', label: 'Advanced', icon: '🔥', description: "Experienced surfer, want challenging waves" },
        ],
        seasonNote,
        allowCustomText: true,
        customTextPlaceholder: "Tell me more (e.g., 'want uncrowded spots', 'need board rental')",
      };
    },
    required: false,
    canInfer: false,
  },

  // Child needs - triggered when there are young children
  childNeeds: {
    field: 'childNeeds',
    snooMessage: "Traveling with little ones! Anything I should know to plan kid-friendly activities?",
    inputType: 'chips-multi',
    getInputConfig: (state) => {
      const childAges = state.preferences.childAges || [];
      const youngestAge = childAges.length > 0 ? Math.min(...childAges) : 5;

      const options = [
        { id: 'none', label: 'Nothing special!', icon: '✓', description: "They're easy travelers" },
        { id: 'animal_lover', label: 'Loves animals!', icon: '🐾', description: "Would love to pet/see animals" },
      ];

      // Add age-appropriate options
      if (youngestAge < 6) {
        options.push({ id: 'needs_naps', label: 'Still needs naps', icon: '😴', description: "Need midday breaks" });
        options.push({ id: 'picky_eater', label: 'Picky eater', icon: '🍽️', description: "Limited food preferences" });
      }

      if (youngestAge < 10) {
        options.push({ id: 'scared_heights', label: 'Afraid of heights', icon: '😰', description: "Skip high platforms/views" });
        options.push({ id: 'scared_water', label: 'Nervous in water', icon: '🌊', description: "Keep water activities gentle" });
      }

      // Theme park specific if destination is Orlando/Anaheim
      const themeParkId = detectThemeParkDestination(
        state.preferences.destinationContext?.rawInput || ''
      );
      if (themeParkId) {
        options.push({ id: 'scared_dark_rides', label: 'Scared of dark rides', icon: '🌑', description: "Avoid indoor dark attractions" });
        options.push({ id: 'scared_loud', label: 'Sensitive to loud noises', icon: '🔊', description: "Skip fireworks/loud shows" });
      }

      return {
        options,
        allowCustomText: true,
        customTextPlaceholder: "Anything else? (e.g., 'loves dinosaurs', 'needs wheelchair-accessible stroller paths')",
        field: 'party',
        allowNotes: true,
      };
    },
    required: false,
    canInfer: false,
  },

  // Workation needs - triggered when tripOccasion is workation
  workationNeeds: {
    field: 'workationNeeds',
    snooMessage: "Working while traveling! Let me find places with great connectivity.",
    inputType: 'chips',
    getInputConfig: () => ({
      options: [
        { id: 'basic', label: 'Basic WiFi', icon: '📶', description: 'Email and browsing (10+ mbps)' },
        { id: 'fast', label: 'Fast WiFi', icon: '📡', description: 'Video calls and streaming (50+ mbps)' },
        { id: 'excellent', label: 'Excellent WiFi', icon: '🚀', description: 'Dev work, large uploads (100+ mbps)' },
      ],
      allowCustomText: true,
      customTextPlaceholder: "Other needs? (e.g., 'need co-working space', 'quiet workspace essential')",
    }),
    required: false,
    canInfer: false,
  },

  // Multi-country logistics - triggered when destination spans multiple countries
  multiCountryLogistics: {
    field: 'multiCountryLogistics',
    snooMessage: "I see you're visiting multiple countries! Here are some things to keep in mind:",
    inputType: 'chips',
    getInputConfig: (state) => {
      const destInput = state.preferences.destinationContext?.rawInput || '';
      const multiInfo = detectMultiCountry(destInput);

      // Build info text with logistics tips
      const tipsText = multiInfo.logisticsTips.length > 0
        ? multiInfo.logisticsTips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')
        : '';

      return {
        options: [
          { id: 'got_it', label: 'Got it, thanks!', icon: '✓', description: "I'll keep this in mind" },
          { id: 'help_transport', label: 'Help with transport', icon: '✈️', description: 'Show me options between countries' },
          { id: 'visa_check', label: 'Need visa info', icon: '🛂', description: "I'm not sure about visa requirements" },
        ],
        infoText: tipsText,
        allowCustomText: true,
        customTextPlaceholder: "Any questions about traveling between countries?",
      };
    },
    required: false,
    canInfer: false,
  },

  // Theme park preferences - triggered when destination includes Disney/Universal
  themeParkPreferences: {
    field: 'themeParkPreferences',
    snooMessage: "Theme parks! I can help with ride recommendations and booking tips.",
    inputType: 'chips-multi',
    getInputConfig: (state) => {
      const themeParkId = detectThemeParkDestination(
        state.preferences.destinationContext?.rawInput || ''
      );
      const childAges = state.preferences.childAges || [];
      const hasKids = childAges.length > 0;

      const guidance = themeParkId
        ? getThemeParkGuidance(themeParkId, childAges)
        : null;

      const options = [
        { id: 'character_dining', label: 'Character dining', icon: '🍽️', description: 'Meet characters during meals' },
        { id: 'thrill_seeker', label: 'Thrill rides focus', icon: '🎢', description: 'Prioritize roller coasters' },
        { id: 'relaxed_pace', label: 'Relaxed pace', icon: '🐢', description: 'No rushing, enjoy the atmosphere' },
      ];

      if (hasKids) {
        options.push({ id: 'meet_characters', label: 'Meet characters', icon: '🤝', description: 'Photos with favorite characters' });
        options.push({ id: 'avoid_scary', label: 'Avoid scary rides', icon: '👻', description: 'Skip frightening attractions' });
      }

      // Add booking reminder info
      let bookingInfo = '';
      if (guidance) {
        bookingInfo = guidance.bookingReminders.join('. ');
      }

      return {
        options,
        infoText: bookingInfo || undefined,
        allowCustomText: true,
        customTextPlaceholder: "Any specific must-dos? (e.g., 'must ride Space Mountain', 'kids want to meet Elsa')",
      };
    },
    required: false,
    canInfer: false,
  },

  // User notes - generic free-text for any additional context
  userNotes: {
    field: 'userNotes',
    snooMessage: "Anything else I should know to make this trip perfect?",
    inputType: 'text',
    getInputConfig: () => ({
      placeholder: "Any special requests, preferences, or context? (e.g., 'celebrating 50th birthday', 'need restaurants with high chairs', 'allergic to shellfish')",
      multiline: true,
    }),
    required: false,
    canInfer: false,
  },

  satisfaction: {
    field: 'satisfaction',
    snooMessage: pickTemplate(SNOO_TEMPLATES.celebrating),
    inputType: 'satisfaction',
    getInputConfig: () => ({}),
    required: true,
    canInfer: false,
  },
};

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

export class QuickPlanOrchestrator {
  public state: OrchestratorState;
  private debugLog: DebugEntry[] = [];

  constructor(initialState?: Partial<OrchestratorState>) {
    this.state = this.createInitialState(initialState);
  }

  private createInitialState(override?: Partial<OrchestratorState>): OrchestratorState {
    return {
      phase: 'gathering',
      preferences: {
        selectedActivities: [],
        hardNos: [],
        mustDos: [],
        hotelVibePreferences: [],
        childAges: [],
        children: 0,
        adults: 0,
        selectedAreas: [],
        selectedSplit: null,  // Explicitly initialize to null
      },
      confidence: {
        destination: 'unknown',
        dates: 'unknown',
        party: 'unknown',
        tripOccasion: 'unknown',    // FIX 1.8: Added
        accessibility: 'unknown',
        budget: 'unknown',
        pace: 'unknown',            // FIX 1.1: Added
        vibe: 'unknown',
        activities: 'unknown',
        areas: 'unknown',
        hotels: 'unknown',
        dining: 'unknown',
      },
      activeTradeoffs: [],
      resolvedTradeoffs: [],
      enrichmentStatus: {
        reddit: 'pending',
        areas: 'pending',
        hotels: 'pending',
        activities: 'pending',
        pricing: 'pending',
        restaurants: 'pending',
        experiences: 'pending',
      },
      discoveredData: {
        areas: [],
        hotels: new Map(),
        activities: [],
        restaurants: new Map(),
        experiences: new Map(),
      },
      messages: [],
      currentQuestion: null,
      itinerary: null,
      debugLog: [],
      ...override,
    };
  }

  // ============================================================================
  // STATE ACCESSORS
  // ============================================================================

  getState(): OrchestratorState {
    return this.state;
  }

  getMessages(): ChatMessage[] {
    return this.state.messages;
  }

  getCurrentQuestion(): QuestionConfig | null {
    return this.state.currentQuestion;
  }

  getConfidence(): OrchestratorState['confidence'] {
    return this.state.confidence;
  }

  getPhase(): OrchestratorState['phase'] {
    return this.state.phase;
  }

  getDebugLog(): DebugEntry[] {
    return this.debugLog;
  }

  // Reset the orchestrator to initial state (for "Start Over" functionality)
  reset(): void {
    this.state = this.createInitialState();
    this.debugLog = [];
    // Clear module-level caches so stale data doesn't bleed across sessions
    activitySuggestionsCache.clear();
    activitySuggestionsPending.clear();
    subredditSuggestionsCache.clear();
    subredditSuggestionsPending.clear();
    console.log('[Orchestrator] Reset to initial state (caches cleared)');
  }

  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================

  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const fullMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: new Date(),
    };
    this.state.messages.push(fullMessage);
    return fullMessage;
  }

  addSnooMessage(content: string, snooState: SnooState = 'idle', evidence?: RedditEvidence[]): ChatMessage {
    return this.addMessage({
      type: 'snoo',
      content,
      snooState,
      evidence,
    });
  }

  addUserMessage(content: string): ChatMessage {
    return this.addMessage({
      type: 'user',
      content,
    });
  }

  /**
   * Add a user note for a specific field
   * Notes are stored separately from selections and used to refine recommendations
   */
  addUserNote(field: string, note: string): void {
    if (!note || !note.trim()) return;

    const existingNotes = (this.state.preferences as any).userNotes || [];
    existingNotes.push({
      field,
      note: note.trim(),
      timestamp: new Date(),
    });
    (this.state.preferences as any).userNotes = existingNotes;
    this.log('orchestrator', `User note added for ${field}: ${note.trim().substring(0, 50)}...`);
  }

  // ============================================================================
  // CONFIDENCE TRACKING
  // ============================================================================

  setConfidence(field: keyof OrchestratorState['confidence'], level: ConfidenceLevel): void {
    this.state.confidence[field] = level;
    this.log('orchestrator', `Confidence updated: ${field} = ${level}`, { field, level });
  }

  // ============================================================================
  // FIX 1.12: FREE-TEXT INPUT HANDLING
  // ============================================================================

  /**
   * Handle free-text input from user at any point in the flow
   * Analyzes intent and either answers question or stores as preference note
   */
  async processFreeTextInput(text: string): Promise<{
    type: 'question' | 'preference' | 'command';
    response?: string;
    actionTaken?: string;
  }> {
    const textLower = text.toLowerCase().trim();

    // Check for common commands
    if (textLower.includes('start over') || textLower.includes('restart') || textLower === 'reset') {
      return { type: 'command', actionTaken: 'restart' };
    }

    if (textLower.includes('go back') || textLower.includes('previous') || textLower === 'back') {
      const success = this.goToPreviousQuestion();
      return {
        type: 'command',
        actionTaken: success ? 'goBack' : 'goBackFailed',
        response: success ? "Going back to the previous question." : "Can't go back from here - this is the first question.",
      };
    }

    if (textLower === 'skip' || textLower === 'not sure' || textLower === 'next') {
      return { type: 'command', actionTaken: 'skip' };
    }

    // Check for preference modifications
    const prefPatterns = [
      { pattern: /actually.*(want|need|prefer)/i, type: 'preference' as const },
      { pattern: /can we (add|include|change)/i, type: 'preference' as const },
      { pattern: /i forgot.*(mention|say|tell)/i, type: 'preference' as const },
      { pattern: /also|btw|by the way/i, type: 'preference' as const },
    ];

    for (const { pattern, type } of prefPatterns) {
      if (pattern.test(text)) {
        // Store as user note for the current field
        const currentField = this.state.currentQuestion?.field || 'general';
        this.addUserNote(currentField, text);
        return {
          type,
          response: "Got it! I've noted that down. Let me factor that into your recommendations.",
          actionTaken: `addedNote:${currentField}`,
        };
      }
    }

    // Check for questions
    if (text.includes('?')) {
      // Use LLM to generate helpful response
      try {
        const response = await callLLM([
          { role: 'system', content: 'You are Snoo, a friendly travel planning assistant. Answer briefly and helpfully. If the question is about the planning process, explain what info you need.' },
          { role: 'user', content: text },
        ]);
        return { type: 'question', response };
      } catch {
        return {
          type: 'question',
          response: "That's a great question! Let me get back to the planning and I can help answer that once I know more about your trip.",
        };
      }
    }

    // Default: treat as additional context
    this.addUserNote('general', text);
    return {
      type: 'preference',
      response: "Thanks for letting me know! I'll keep that in mind.",
    };
  }

  // ============================================================================
  // FIX 1.13: GO BACK FUNCTIONALITY
  // ============================================================================

  /**
   * Go back to previous question to change an answer
   */
  goToPreviousQuestion(): boolean {
    const questionHistory = (this.state as any).questionHistory || [];

    if (questionHistory.length < 2) {
      console.log('[Orchestrator] Cannot go back - at first question or no history');
      return false; // Can't go back from first question
    }

    // Get the previous question's field
    const currentField = questionHistory[questionHistory.length - 1];
    const previousField = questionHistory[questionHistory.length - 2];

    console.log('[Orchestrator] Going back from', currentField, 'to', previousField);

    // Reset confidence for the previous field
    if (previousField in this.state.confidence) {
      (this.state.confidence as any)[previousField] = 'unknown';
    }

    // Clear the preference value for the previous field
    if (previousField in this.state.preferences) {
      delete (this.state.preferences as any)[previousField];
    }
    // Also clear related derived properties for specific fields
    const relatedProps: Record<string, string[]> = {
      travelingWithPets: ['hasPets', 'travelingWithPetsType'],
    };
    for (const prop of relatedProps[previousField] || []) {
      delete (this.state.preferences as any)[prop];
    }

    // Remove last item from history
    questionHistory.pop();
    (this.state as any).questionHistory = questionHistory;

    // Clear current question to force re-evaluation
    this.state.currentQuestion = null;

    // Revert phase if the target field belongs to an earlier phase.
    // Enriching-phase fields are gated by `phase !== 'gathering'` in getMissingRequiredFields,
    // so going back to a gathering field from a later phase requires reverting to gathering.
    const ENRICHING_PHASE_FIELDS = [
      'areas', 'split', 'hotelPreferences', 'hotels',
      'dining', 'dietaryRestrictions', 'cuisinePreferences', 'restaurants', 'experiences',
    ];
    const targetIsGatheringField = !ENRICHING_PHASE_FIELDS.includes(previousField);
    if (targetIsGatheringField && this.state.phase !== 'gathering') {
      console.log('[Orchestrator] Reverting phase to gathering for go-back to:', previousField);
      this.state.phase = 'gathering';
    }

    this.log('orchestrator', `Went back to ${previousField}`, { from: currentField, to: previousField });
    return true;
  }

  /**
   * Get the history of asked questions
   */
  getQuestionHistory(): string[] {
    return (this.state as any).questionHistory || [];
  }

  private getMissingRequiredFields(): string[] {
    const missing: string[] = [];

    // VERSION CHECK: This should show in console to verify new code is loaded
    console.log('[getMissingRequiredFields] V2 - Starting check...', {
      phase: this.state.phase,
      confidence: { ...this.state.confidence },
      hasSelectedSplit: !!this.state.preferences.selectedSplit,
      hasHotelPreferences: !!(this.state.preferences as any).hotelPreferences,
      selectedAreasCount: this.state.preferences.selectedAreas?.length || 0,
    });

    if (this.state.confidence.destination === 'unknown') missing.push('destination');
    if (this.state.confidence.dates === 'unknown') missing.push('dates');
    if (this.state.confidence.party === 'unknown') missing.push('party');

    // Trip occasion asked after party (optional but highly valuable for personalization)
    if (this.state.confidence.party !== 'unknown' &&
        !(this.state.preferences as any).tripOccasion) {
      missing.push('tripOccasion');
    }

    // Pet question asked after trip occasion (yes/no first)
    if (this.state.confidence.party !== 'unknown' &&
        (this.state.preferences as any).tripOccasion &&
        (this.state.preferences as any).hasPets === undefined) {
      missing.push('travelingWithPets');
    }

    // Pet type follow-up (only if user said yes to pets)
    if ((this.state.preferences as any).hasPets === true &&
        (this.state.preferences as any).travelingWithPets?.petType === undefined) {
      missing.push('travelingWithPetsType');
    }

    // Accessibility question (yes/no first) - asked after pets question is answered
    if (this.state.confidence.party !== 'unknown' &&
        (this.state.preferences as any).hasPets !== undefined &&
        (this.state.preferences as any).hasAccessibilityNeeds === undefined) {
      missing.push('accessibility');
    }

    // Accessibility type follow-up (only if user said yes to accessibility needs)
    if ((this.state.preferences as any).hasAccessibilityNeeds === true &&
        this.state.preferences.accessibilityNeeds === undefined) {
      missing.push('accessibilityType');
    }

    if (this.state.confidence.budget === 'unknown') missing.push('budget');

    // Accommodation type asked after budget (helps with filtering)
    if (this.state.confidence.budget !== 'unknown' &&
        !(this.state.preferences as any).accommodationType) {
      missing.push('accommodationType');
    }

    // Sustainability preference asked after accommodation type (optional)
    // Skip if they already chose eco_lodge (we can infer eco_focused)
    const accommodationType = (this.state.preferences as any).accommodationType;
    if (this.state.confidence.budget !== 'unknown' &&
        accommodationType &&
        accommodationType !== 'eco_lodge' &&
        !(this.state.preferences as any).sustainabilityPreference) {
      missing.push('sustainabilityPreference');
    }
    if (this.state.confidence.activities === 'unknown') missing.push('activities');

    // FIX 1.1 & 1.3: Add pace and vibe to required questions after activities
    // These are critical for personalization but were being skipped
    if (this.state.confidence.activities !== 'unknown' &&
        !this.state.preferences.pace) {
      missing.push('pace');
    }

    // Bug fix: check if vibe has been answered (undefined means not answered, empty string means skipped)
    // We use confidence.vibe to track if the question was answered, not the value itself
    if (this.state.confidence.pace !== 'unknown' &&
        this.state.preferences.pace &&
        this.state.confidence.vibe === 'unknown') {
      missing.push('vibe');
    }

    // Ask skill level ONLY for truly skill-dependent activities (surfing, scuba diving, golf)
    // Don't ask for hiking, snorkeling, adventure as these are accessible to all levels
    const SKILL_ACTIVITY_TYPES = ['surf', 'dive', 'golf'];
    const userActivities = this.state.preferences.selectedActivities || [];
    const hasSkillActivities = userActivities.some(a => SKILL_ACTIVITY_TYPES.includes(a.type));
    if (this.state.confidence.activities !== 'unknown' &&
        hasSkillActivities &&
        !this.state.preferences.activitySkillLevel) {
      missing.push('activitySkillLevel');
    }

    // Ask which subreddits to search after activities
    if (this.state.confidence.activities !== 'unknown' &&
        !(this.state.preferences as any).selectedSubreddits) {
      missing.push('subreddits');
    }

    // Areas required after initial gathering
    // Only ask for areas if we actually have some to show
    if (this.state.phase !== 'gathering' &&
        this.state.confidence.areas === 'unknown' &&
        this.state.discoveredData.areas.length > 0) {
      missing.push('areas');
    } else if (this.state.phase !== 'gathering' &&
               this.state.confidence.areas === 'unknown' &&
               this.state.discoveredData.areas.length === 0 &&
               this.state.enrichmentStatus.areas === 'error') {
      // If enrichment failed and no areas, skip areas question and mark as partial
      console.log('[getMissingRequiredFields] Areas enrichment failed with no areas, marking as partial');
      this.setConfidence('areas', 'partial');
    }

    // Split required after areas selected (how many nights in each area)
    // CRITICAL: Must check for valid split with actual stops, not just truthy value
    // FIX: Skip split question if only ONE area selected - no split needed
    const areasComplete = this.state.confidence.areas === 'complete';
    const selectedAreasCount = this.state.preferences.selectedAreas?.length || 0;
    const split = this.state.preferences.selectedSplit;
    const hasValidUserSelectedSplit = split &&
      split.id !== 'auto-split' &&  // Not auto-generated
      split.stops &&
      split.stops.length > 0;

    console.log('[getMissingRequiredFields] Split check:', {
      areasConfidence: this.state.confidence.areas,
      areasComplete,
      selectedSplit: split,
      splitId: split?.id,
      hasStops: split?.stops?.length,
      hasValidUserSelectedSplit,
      selectedAreasCount,
    });

    // Only ask about split if:
    // 1. Areas are complete AND
    // 2. User hasn't already selected a split AND
    // 3. There are 2+ areas (no need to split with just one area!)
    // Track if we should treat the split as valid (includes auto-created single-area splits)
    let hasSplitForHotelPrefs = hasValidUserSelectedSplit;

    if (areasComplete && !hasValidUserSelectedSplit && selectedAreasCount >= 2) {
      console.log('[getMissingRequiredFields] >>> ADDING SPLIT TO MISSING FIELDS <<<');
      missing.push('split');
    } else if (areasComplete && selectedAreasCount === 1) {
      // Auto-create a single-area split so downstream logic works
      if (!hasValidUserSelectedSplit) {
        const singleArea = this.state.preferences.selectedAreas![0];
        // Use any cast since the simpler stop format is used throughout the codebase
        (this.state.preferences as any).selectedSplit = {
          id: 'single-area',
          name: `All nights in ${singleArea.name}`,
          stops: [{
            areaId: singleArea.id,
            areaName: singleArea.name,
            nights: this.state.preferences.tripLength || 7,
          }],
          fitScore: 1.0,
        };
        console.log('[getMissingRequiredFields] Auto-created single-area split');
        // Single-area auto-split counts as valid for hotelPreferences
        hasSplitForHotelPrefs = true;
      }
    } else if (areasComplete && hasValidUserSelectedSplit) {
      console.log('[getMissingRequiredFields] User already selected split:', split?.name);
    }

    // Hotel preferences required after split is selected (or auto-created for single area)
    // NOTE: Ask hotelPreferences if user selected a split OR if single-area auto-split was created
    const shouldAskHotelPrefs = this.state.confidence.areas === 'complete' &&
        hasSplitForHotelPrefs &&
        !(this.state.preferences as any).hotelPreferences;
    console.log('[getMissingRequiredFields] HotelPreferences check:', {
      areasConfidence: this.state.confidence.areas,
      hasValidUserSelectedSplit,
      hasSplitForHotelPrefs,
      hasHotelPreferences: !!(this.state.preferences as any).hotelPreferences,
      shouldAskHotelPrefs,
    });
    if (shouldAskHotelPrefs) {
      missing.push('hotelPreferences');
    }

    // DEBUG: Warn if hotelPreferences is added without a valid split
    if (!hasSplitForHotelPrefs && missing.includes('hotelPreferences')) {
      console.error('[getMissingRequiredFields] BUG: hotelPreferences added without valid split!');
    }

    // Hotels required after hotel preferences AND hotels have been fetched
    if (this.state.confidence.areas === 'complete' &&
        (this.state.preferences as any).hotelPreferences &&
        this.state.confidence.hotels !== 'complete') {
      // Check if we have hotels fetched for any area that still needs selection
      const areas = this.state.preferences.selectedAreas || [];
      const selectedHotels = (this.state.preferences as any).selectedHotels || {};

      // Find areas that have hotels available but not yet selected
      let needsHotelSelection = false;
      for (const area of areas) {
        if (!selectedHotels[area.id]) {
          const hotels = this.state.discoveredData.hotels.get(area.id);
          if (hotels && hotels.length > 0) {
            needsHotelSelection = true;
            break;
          }
        }
      }

      console.log('[Orchestrator] Hotels check:', {
        areasCount: areas.length,
        selectedCount: Object.keys(selectedHotels).length,
        needsSelection: needsHotelSelection
      });

      if (needsHotelSelection) {
        missing.push('hotels');
      }
    }

    // Dining required after hotels are complete (or skipped/partial)
    const hotelsHandled = this.state.confidence.hotels === 'complete' ||
                          this.state.confidence.hotels === 'partial';
    if (hotelsHandled && this.state.confidence.dining === 'unknown') {
      missing.push('dining');
    }

    // Dietary restrictions and cuisine preferences required when diningMode is 'plan'
    const wantsDiningHelp = this.state.preferences.diningMode === 'plan';
    console.log('[getMissingRequiredFields] Dining check:', {
      diningMode: this.state.preferences.diningMode,
      diningConfidence: this.state.confidence.dining,
      wantsDiningHelp,
      hasDietaryRestrictions: !!(this.state.preferences as any).dietaryRestrictions,
      hasCuisinePreferences: !!(this.state.preferences as any).cuisinePreferences,
    });

    // FIX 1.7: Dietary restrictions asked after dining mode selected (not after 'complete')
    // This ensures the question is asked right after user selects 'plan' mode
    if (wantsDiningHelp &&
        this.state.confidence.dining !== 'unknown' &&
        !(this.state.preferences as any).dietaryRestrictions) {
      console.log('[getMissingRequiredFields] >>> ADDING dietaryRestrictions TO MISSING <<<');
      missing.push('dietaryRestrictions');
    }

    // Cuisine preferences asked after dietary restrictions
    if (wantsDiningHelp &&
        this.state.confidence.dining === 'complete' &&
        (this.state.preferences as any).dietaryRestrictions &&
        !(this.state.preferences as any).cuisinePreferences) {
      console.log('[getMissingRequiredFields] >>> ADDING cuisinePreferences TO MISSING <<<');
      missing.push('cuisinePreferences');
    }

    // Restaurant selection required after cuisine preferences are set
    // Only when diningMode is 'plan' and we have restaurants fetched
    if (wantsDiningHelp &&
        (this.state.preferences as any).cuisinePreferences &&
        (this.state.preferences as any).cuisinePreferences.length > 0) {

      const cuisinePrefs = (this.state.preferences as any).cuisinePreferences as string[];
      const selectedRestaurants = (this.state.preferences as any).selectedRestaurants || {};

      // Check if we have restaurants for all cuisine types
      let needsRestaurantSelection = false;
      for (const cuisine of cuisinePrefs) {
        if (!selectedRestaurants[cuisine]) {
          // Check if we have discovered restaurants for this cuisine
          const restaurantsForCuisine = this.state.discoveredData.restaurants.get(cuisine);
          if (restaurantsForCuisine && restaurantsForCuisine.length > 0) {
            needsRestaurantSelection = true;
            break;
          }
        }
      }

      console.log('[Orchestrator] Restaurant selection check:', {
        diningMode: this.state.preferences.diningMode,
        cuisinePrefs,
        selectedRestaurants: Object.keys(selectedRestaurants),
        needsSelection: needsRestaurantSelection,
      });

      if (needsRestaurantSelection) {
        missing.push('restaurants');
      }
    }

    // Experiences selection required after dining is complete
    // Only if user selected activities and we have experiences fetched
    const diningIsComplete = this.state.confidence.dining === 'complete';
    const restaurantsComplete = !wantsDiningHelp || !(this.state.preferences as any).cuisinePreferences ||
      ((this.state.preferences as any).cuisinePreferences || []).every((cuisine: string) => {
        const selected = (this.state.preferences as any).selectedRestaurants?.[cuisine];
        const available = this.state.discoveredData.restaurants.get(cuisine);
        return selected || !available || available.length === 0;
      });

    const selectedActivities = this.state.preferences.selectedActivities || [];
    if (diningIsComplete && restaurantsComplete && selectedActivities.length > 0) {
      const activityTypes = selectedActivities.map(a => a.type);
      const selectedExperiences = (this.state.preferences as any).selectedExperiences || {};
      const experiencesMap = (this.state.discoveredData as any).experiences;

      let needsExperienceSelection = false;
      for (const activity of activityTypes) {
        if (!selectedExperiences[activity]) {
          const experiencesForActivity = experiencesMap?.get(activity);
          if (experiencesForActivity && experiencesForActivity.length > 0) {
            needsExperienceSelection = true;
            break;
          }
        }
      }

      console.log('[Orchestrator] Experiences selection check:', {
        diningComplete: diningIsComplete,
        restaurantsComplete,
        activityTypes,
        selectedExperiences: Object.keys(selectedExperiences),
        needsSelection: needsExperienceSelection,
      });

      if (needsExperienceSelection) {
        missing.push('experiences');
      }
    }

    // ============================================================================
    // SMART FOLLOW-UP QUESTIONS (Phase 1 Critical)
    // ============================================================================

    // Surfing details - after activities are selected, if surfing was chosen
    const hasSurfActivity = this.state.preferences.selectedActivities?.some(a => a.type === 'surf');
    const hasSurfDetails = !!(this.state.preferences as any).surfingDetails;
    if (this.state.confidence.activities === 'complete' && hasSurfActivity && !hasSurfDetails) {
      console.log('[getMissingRequiredFields] >>> ADDING surfingDetails (surf activity selected) <<<');
      missing.push('surfingDetails');
    }

    // Child needs - after party is confirmed, if there are young children (under 10)
    const hasYoungChildren = (this.state.preferences.childAges || []).some(age => age < 10);
    const hasChildNeeds = !!(this.state.preferences as any).childNeeds;
    if (this.state.confidence.party === 'confirmed' && hasYoungChildren && !hasChildNeeds) {
      console.log('[getMissingRequiredFields] >>> ADDING childNeeds (young children present) <<<');
      missing.push('childNeeds');
    }

    // Workation needs - after tripOccasion is set to workation
    const isWorkation = (this.state.preferences as any).tripOccasion === 'workation';
    const hasWorkationNeeds = !!(this.state.preferences as any).workationNeeds;
    if (isWorkation && !hasWorkationNeeds) {
      console.log('[getMissingRequiredFields] >>> ADDING workationNeeds (workation trip) <<<');
      missing.push('workationNeeds');
    }

    // Multi-country logistics - after destination confirmed, if multiple countries
    const destInput = this.state.preferences.destinationContext?.rawInput || '';
    const multiCountryInfo = detectMultiCountry(destInput);
    const hasMultiCountryAck = !!(this.state.preferences as any).multiCountryLogistics;
    if (this.state.confidence.destination === 'complete' && multiCountryInfo.isMultiCountry && !hasMultiCountryAck) {
      console.log('[getMissingRequiredFields] >>> ADDING multiCountryLogistics (multi-country trip) <<<', multiCountryInfo.countries);
      missing.push('multiCountryLogistics');
    }

    // Theme park preferences - if destination includes Disney/Universal
    const themeParkId = detectThemeParkDestination(destInput);
    const hasThemeParkPrefs = !!(this.state.preferences as any).themeParkPreferences;
    if (this.state.confidence.destination === 'complete' && themeParkId && !hasThemeParkPrefs) {
      console.log('[getMissingRequiredFields] >>> ADDING themeParkPreferences (theme park destination) <<<');
      missing.push('themeParkPreferences');
    }

    // ASSERTION: If split is missing, hotelPreferences should NOT be in the list
    if (missing.includes('split') && missing.includes('hotelPreferences')) {
      console.error('[getMissingRequiredFields] BUG: Both split and hotelPreferences in missing!');
      console.error('[getMissingRequiredFields] This should never happen. State:', {
        areasConfidence: this.state.confidence.areas,
        selectedSplit: split,
        splitId: split?.id,
        hasValidUserSelectedSplit,
        hotelPreferences: (this.state.preferences as any).hotelPreferences,
      });
      // Remove hotelPreferences - split must be answered first
      const hotelPrefsIndex = missing.indexOf('hotelPreferences');
      if (hotelPrefsIndex > -1) {
        missing.splice(hotelPrefsIndex, 1);
        console.log('[getMissingRequiredFields] Removed hotelPreferences from missing. New list:', missing);
      }
    }

    console.log('[getMissingRequiredFields] Final missing fields:', missing);
    return missing;
  }

  private getInferrableFields(): string[] {
    const inferrable: string[] = [];

    for (const [field, config] of Object.entries(FIELD_QUESTIONS)) {
      if (config.canInfer && config.inferFrom) {
        const inferred = config.inferFrom(this.state);
        if (inferred !== null) {
          inferrable.push(field);
        }
      }
    }

    return inferrable;
  }

  // ============================================================================
  // TRADEOFF DETECTION
  // ============================================================================

  detectTradeoffs(): Tradeoff[] {
    if (!this.state.preferences) return [];

    const tradeoffs = detectTradeoffs(this.state.preferences as TripPreferences);
    this.state.activeTradeoffs = tradeoffs.filter(
      t => !this.state.resolvedTradeoffs.some(r => r.tradeoffId === t.id)
    );

    this.log('orchestrator', 'Detected tradeoffs', { count: this.state.activeTradeoffs.length });
    return this.state.activeTradeoffs;
  }

  resolveTradeoff(resolution: TradeoffResolution): void {
    this.state.resolvedTradeoffs.push(resolution);
    this.state.activeTradeoffs = this.state.activeTradeoffs.filter(
      t => t.id !== resolution.tradeoffId
    );
    this.log('orchestrator', 'Resolved tradeoff', { tradeoffId: resolution.tradeoffId });
  }

  // ============================================================================
  // ENRICHMENT STATUS
  // ============================================================================

  setEnrichmentStatus(type: EnrichmentType, status: EnrichmentStatus): void {
    this.state.enrichmentStatus[type] = status;
    this.log('orchestrator', `Enrichment status: ${type} = ${status}`, { type, status });
  }

  // ============================================================================
  // NEXT QUESTION SELECTION (THE CORE ADAPTIVE LOGIC)
  // ============================================================================

  async selectNextQuestion(): Promise<QuestionConfig | null> {
    console.log('[selectNextQuestion] Current phase:', this.state.phase);
    console.log('[selectNextQuestion] Areas confidence:', this.state.confidence.areas);
    console.log('[selectNextQuestion] Has selectedSplit:', !!this.state.preferences.selectedSplit);

    // 1. Check for unresolved tradeoffs (highest priority)
    if (this.state.activeTradeoffs.length > 0) {
      const tradeoff = this.state.activeTradeoffs[0];
      return this.generateTradeoffQuestion(tradeoff);
    }

    // 2. Try to infer any fields we can skip
    for (const field of this.getInferrableFields()) {
      const config = FIELD_QUESTIONS[field];
      if (config?.inferFrom) {
        const inferred = config.inferFrom(this.state);
        if (inferred !== null) {
          this.applyInferredValue(field, inferred);
          this.log('orchestrator', `Inferred ${field}`, { value: inferred });
        }
      }
    }

    // 3. Find missing required fields
    const missing = this.getMissingRequiredFields();
    console.log('[selectNextQuestion] Missing fields:', missing);

    if (missing.length === 0) {
      // All required fields complete
      if (this.state.phase === 'gathering') {
        // Move to enrichment phase
        this.state.phase = 'enriching';
        return null; // Signal to start enrichment
      }

      if (this.state.phase === 'enriching') {
        // Check if required enrichment is complete (areas and hotels are required)
        const areasEnrichmentComplete = this.state.enrichmentStatus.areas === 'done' || this.state.enrichmentStatus.areas === 'error';
        const hotelsEnrichmentComplete = this.state.enrichmentStatus.hotels === 'done' || this.state.enrichmentStatus.hotels === 'error';
        const diningComplete = this.state.confidence.dining !== 'unknown';

        // Check if user has EXPLICITLY selected a split (not auto-generated)
        const split = this.state.preferences.selectedSplit;
        const splitSelected = split && split.id !== 'auto-split' && split.stops && split.stops.length > 0;
        // Hotels are "handled" if selected OR skipped (partial = no hotels found but user moved on)
        const hotelsHandled = this.state.confidence.hotels === 'complete' ||
                              this.state.confidence.hotels === 'partial';

        console.log('[Orchestrator] Enrichment check:', {
          areasEnrichment: this.state.enrichmentStatus.areas,
          hotelsEnrichment: this.state.enrichmentStatus.hotels,
          diningConfidence: this.state.confidence.dining,
          splitId: split?.id,
          splitSelected,
          hotelsHandled,
          hotelsConfidence: this.state.confidence.hotels,
        });

        // Only move to generating if enrichment is done AND user has made all selections
        if (areasEnrichmentComplete && hotelsEnrichmentComplete && diningComplete && splitSelected && hotelsHandled) {
          this.state.phase = 'generating';
          return null; // Signal to generate itinerary
        }

        // If enrichment is still pending, return null to wait
        if (!areasEnrichmentComplete) {
          return null; // Still enriching
        }

        // Enrichment is done but user still needs to make selections - fall through to get next question
      }

      if (this.state.phase === 'generating') {
        // Itinerary generated, go to review
        this.state.phase = 'reviewing';
        return FIELD_QUESTIONS.satisfaction ? await this.createQuestionConfig('satisfaction') : null;
      }

      if (this.state.phase === 'reviewing') {
        return FIELD_QUESTIONS.satisfaction ? await this.createQuestionConfig('satisfaction') : null;
      }

      return null; // All done
    }

    // 4. Use LLM to decide which field to ask about next (for complex cases)
    console.log('[selectNextQuestion] About to decide next field from missing:', missing);
    const nextField = await this.decideNextField(missing);
    console.log('[selectNextQuestion] decideNextField returned:', nextField);

    if (missing.includes('split') && nextField !== 'split') {
      console.error('[selectNextQuestion] WARNING: split is in missing but was not selected! Selected:', nextField);
    }

    const config = await this.createQuestionConfig(nextField);
    console.log('[selectNextQuestion] Returning question for:', config.field, 'inputType:', config.inputType, 'config:', {
      hasOptions: !!(config.inputConfig as any).options?.length,
      hasSplitOptions: !!(config.inputConfig as any).splitOptions?.length,
      hasCandidates: !!(config.inputConfig as any).candidates?.length,
    });
    return config;
  }

  private async decideNextField(candidates: string[]): Promise<string> {
    console.log('[decideNextField] Candidates:', candidates, 'count:', candidates.length);

    // ALWAYS use priority list to ensure proper flow order
    // This is critical - questions must be asked in the correct order
    const priority = [
      'destination',
      'themeParkPreferences',    // SMART FOLLOW-UP: After destination if theme park
      'multiCountryLogistics',   // SMART FOLLOW-UP: After destination if multi-country
      'dates',
      'party',
      'childNeeds',              // SMART FOLLOW-UP: After party if young children
      'tripOccasion',            // After party - helps personalize everything
      'workationNeeds',          // SMART FOLLOW-UP: After tripOccasion if workation
      'travelingWithPets',       // After occasion - affects hotel filtering
      'travelingWithPetsType',   // CONDITIONAL: Only if user has pets
      'accessibility',           // After pets - affects hotel filtering
      'accessibilityType',       // CONDITIONAL: Only if user has accessibility needs
      'budget',
      'accommodationType',       // After budget - hostel/hotel/resort/villa
      'sustainabilityPreference', // After accommodation - eco preferences
      'pace',
      'activities',
      'surfingDetails',          // SMART FOLLOW-UP: After activities if surfing selected
      'activitySkillLevel',
      'subreddits',
      'vibe',
      'userNotes',               // SMART FOLLOW-UP: Optional free-text before areas
      'areas',
      'split',
      'hotelPreferences',
      'hotels',
      'dining',
      'dietaryRestrictions',
      'cuisinePreferences',
      'restaurants',
      'experiences'
    ];

    for (const field of priority) {
      if (candidates.includes(field)) {
        console.log('[decideNextField] Selected from priority:', field, '(index', priority.indexOf(field), ')');
        return field;
      }
    }

    console.log('[decideNextField] Fallback to first candidate:', candidates[0]);
    return candidates[0];
  }

  private summarizeKnownPreferences(): string {
    const prefs = this.state.preferences;
    const lines: string[] = [];

    if (prefs.destinationContext) lines.push(`- Destination: ${prefs.destinationContext.canonicalName}`);
    if (prefs.startDate && prefs.endDate) lines.push(`- Dates: ${prefs.startDate} to ${prefs.endDate}`);
    if (prefs.adults) lines.push(`- Party: ${prefs.adults} adults, ${prefs.children || 0} children`);
    if (prefs.budgetPerNight) lines.push(`- Budget: $${prefs.budgetPerNight.min}-${prefs.budgetPerNight.max}/night`);
    if (prefs.pace) lines.push(`- Pace: ${prefs.pace}`);
    if (prefs.selectedActivities?.length) {
      lines.push(`- Activities: ${prefs.selectedActivities.map(a => a.type).join(', ')}`);
    }

    return lines.length > 0 ? lines.join('\n') : '- Nothing yet';
  }

  private async createQuestionConfig(field: string): Promise<QuestionConfig> {
    console.log('[createQuestionConfig] Creating question for field:', field);

    const config = FIELD_QUESTIONS[field];
    if (!config) {
      throw new Error(`Unknown field: ${field}`);
    }

    // For activities or subreddits field, wait for AI suggestions to complete
    if (field === 'activities' || field === 'subreddits') {
      const destination = this.state.preferences.destinationContext?.canonicalName ||
                          this.state.preferences.destinationContext?.rawInput || '';
      const cacheKey = destination.toLowerCase();

      if (field === 'activities') {
        // Wait for pending activity fetch if exists
        if (activitySuggestionsPending.has(cacheKey)) {
          console.log('[createQuestionConfig] Waiting for activity suggestions...');
          try {
            await activitySuggestionsPending.get(cacheKey);
          } catch (e) {
            console.warn('[createQuestionConfig] Activity suggestions failed:', e);
          }
        }

        // If still no cache, try fetching now
        if (!activitySuggestionsCache.has(cacheKey) && destination) {
          console.log('[createQuestionConfig] No cached activities, fetching now...');
          try {
            await fetchDestinationActivities(destination);
          } catch (e) {
            console.warn('[createQuestionConfig] Activity fetch failed:', e);
          }
        }
      }

      if (field === 'subreddits') {
        // Wait for pending subreddit fetch if exists
        if (subredditSuggestionsPending.has(cacheKey)) {
          console.log('[createQuestionConfig] Waiting for subreddit suggestions...');
          try {
            await subredditSuggestionsPending.get(cacheKey);
          } catch (e) {
            console.warn('[createQuestionConfig] Subreddit suggestions failed:', e);
          }
        }

        // If still no cache, try fetching now
        if (!subredditSuggestionsCache.has(cacheKey) && destination) {
          console.log('[createQuestionConfig] No cached subreddits, fetching now...');
          try {
            await fetchDestinationSubreddits(destination);
          } catch (e) {
            console.warn('[createQuestionConfig] Subreddit fetch failed:', e);
          }
        }
      }
    }

    const inputConfig = config.getInputConfig(this.state);
    console.log('[createQuestionConfig] Input config for', field, ':', {
      type: config.inputType,
      hasOptions: !!(inputConfig as any).options?.length,
      hasSplitOptions: !!(inputConfig as any).splitOptions?.length,
      hasCandidates: !!(inputConfig as any).candidates?.length,
    });

    // Handle dynamic snooMessage for hotels (includes area name and progress)
    let snooMessage = config.snooMessage;
    if (field === 'hotels') {
      const areaName = (inputConfig as any).areaName || 'your selected area';
      const areas = this.state.preferences.selectedAreas || [];
      const selectedHotels = (this.state.preferences as any).selectedHotels || {};
      const selectedCount = Object.keys(selectedHotels).length;
      const totalAreas = areas.length;

      if (totalAreas > 1) {
        snooMessage = `Now for ${areaName} (${selectedCount + 1} of ${totalAreas}). Which hotel catches your eye?`;
      } else {
        snooMessage = `I found some great hotels in ${areaName}. Which one catches your eye?`;
      }
    }

    // Handle dynamic snooMessage for restaurants (by cuisine type)
    if (field === 'restaurants') {
      const cuisineLabel = (inputConfig as any).cuisineLabel || 'your cuisine';
      const cuisinePrefs = (this.state.preferences as any).cuisinePreferences || [];
      const selectedRestaurants = (this.state.preferences as any).selectedRestaurants || {};
      const selectedCount = Object.keys(selectedRestaurants).length;
      const totalCuisines = cuisinePrefs.length;

      if (totalCuisines > 1) {
        snooMessage = `Here are the best ${cuisineLabel} restaurants near your hotels (${selectedCount + 1} of ${totalCuisines} cuisine types). Pick your favorites!`;
      } else {
        snooMessage = `Here are the best ${cuisineLabel} restaurants near your hotels. Pick the ones you'd like to try!`;
      }
    }

    // Handle dynamic snooMessage for activitySkillLevel (specify which activities)
    if (field === 'activitySkillLevel') {
      // Only truly skill-dependent activities
      const SKILL_ACTIVITIES_MAP: Record<string, string> = {
        'surf': 'Surfing',
        'dive': 'Scuba Diving',
        'golf': 'Golf'
      };
      const activities = this.state.preferences.selectedActivities || [];
      const skillActivities = activities.filter(a => SKILL_ACTIVITIES_MAP[a.type]);
      const activityNames = skillActivities.map(a => SKILL_ACTIVITIES_MAP[a.type]);

      if (activityNames.length === 1) {
        snooMessage = `What's your ${activityNames[0]} experience level? This helps me find the right spots for you.`;
      } else if (activityNames.length > 1) {
        snooMessage = `For ${activityNames.join(' and ')} - what's your overall experience level?`;
      }
    }

    // Handle dynamic snooMessage for areas (include split advice)
    if (field === 'areas') {
      const tripLength = this.state.preferences.tripLength || 7;
      const splitAdvice = getSplitAdvice(tripLength);
      const baseMessage = config.snooMessage;

      // Only add split advice for trips longer than 4 nights
      if (tripLength > 4) {
        snooMessage = `${baseMessage}\n\n💡 **Trip tip**: ${splitAdvice.advice}`;
      }
    }

    // Phase 5 Fix 5.2: Add event alerts to the next question after dates are set
    const pendingEventAlert = (this.state as any).pendingEventAlert;
    if (pendingEventAlert) {
      const eventInfo = pendingEventAlert.tip
        ? `\n\n📅 **Event alert**: ${pendingEventAlert.warning}\n💡 ${pendingEventAlert.tip}`
        : `\n\n📅 **Event alert**: ${pendingEventAlert.warning}`;
      snooMessage = `${snooMessage}${eventInfo}`;
      // Clear the pending alert
      delete (this.state as any).pendingEventAlert;
    }

    // FIX 1.4 continued: Show activity warnings for child ages
    const activityWarnings = (this.state as any).activityWarnings;
    if (activityWarnings && activityWarnings.length > 0) {
      const warningList = activityWarnings.slice(0, 2).join('; ');
      snooMessage = `${snooMessage}\n\n⚠️ **Note for families**: ${warningList}`;
      // Clear warnings after showing
      delete (this.state as any).activityWarnings;
    }

    // Show theme park warnings if any
    const themeParkWarning = (this.state as any).themeParkWarning;
    if (themeParkWarning) {
      snooMessage = `${snooMessage}\n\n🎢 ${themeParkWarning}`;
      delete (this.state as any).themeParkWarning;
    }

    return {
      id: `q-${field}-${Date.now()}`,
      field: config.field,
      snooMessage,
      inputType: config.inputType,
      inputConfig,
      required: config.required,
      canInfer: config.canInfer,
    };
  }

  private generateTradeoffQuestion(tradeoff: Tradeoff): QuestionConfig {
    const message = pickTemplate(SNOO_TEMPLATES.tradeoffDetected, {
      description: tradeoff.description,
    });

    return {
      id: `q-tradeoff-${tradeoff.id}`,
      field: `tradeoff:${tradeoff.id}`,
      snooMessage: message,
      inputType: 'tradeoff',
      inputConfig: {
        tradeoff,
        allowCustomText: true,
      },
      required: true,
      canInfer: false,
    };
  }

  private applyInferredValue(field: string, value: unknown): void {
    switch (field) {
      case 'party':
        const party = value as { adults: number; children: number; childAges: number[] };
        this.state.preferences.adults = party.adults;
        this.state.preferences.children = party.children;
        this.state.preferences.childAges = party.childAges;
        this.setConfidence('party', 'inferred');
        break;
      case 'dining':
        const inferredDining = value as { id: string };
        this.state.preferences.diningMode = inferredDining.id as DiningMode;
        this.setConfidence('dining', 'inferred');
        break;
      case 'tripOccasion':
        const inferredOccasion = value as { id: string };
        (this.state.preferences as any).tripOccasion = inferredOccasion.id;
        this.setConfidence('tripOccasion', 'inferred');
        break;
      case 'accommodationType':
        const inferredAccom = value as { id: string };
        (this.state.preferences as any).accommodationType = inferredAccom.id;
        break;
      case 'sustainabilityPreference':
        const inferredSustainability = value as { id: string };
        (this.state.preferences as any).sustainabilityPreference = inferredSustainability.id;
        break;
    }
  }

  // ============================================================================
  // PROCESS USER RESPONSE
  // ============================================================================

  processUserResponse(questionId: string, response: unknown): void {
    const field = this.state.currentQuestion?.field;
    if (!field) return;

    // FIX 1.13: Track question history for go-back functionality
    const questionHistory = (this.state as any).questionHistory || [];
    if (!questionHistory.includes(field)) {
      questionHistory.push(field);
      (this.state as any).questionHistory = questionHistory;
    }

    // FIX 1.14: Handle skip responses for optional questions
    if (response === 'SKIP' || response === null || response === undefined) {
      const config = FIELD_QUESTIONS[field];
      if (config && !config.required) {
        // Mark as intentionally skipped
        this.setConfidence(field as keyof OrchestratorState['confidence'], 'inferred');
        (this.state.preferences as any)[`${field}Skipped`] = true;
        console.log(`[Orchestrator] User skipped optional field: ${field}`);
        return;
      } else {
        // Required field - can't skip
        console.log(`[Orchestrator] User tried to skip required field: ${field}, re-showing question`);
        return; // Don't process, let the question re-appear
      }
    }

    // Handle tradeoff resolution
    if (field.startsWith('tradeoff:')) {
      const tradeoffId = field.replace('tradeoff:', '');
      const resolution = response as { tradeoffId: string; selectedOptionId: string; customInput?: string };
      this.resolveTradeoff({
        tradeoffId,
        selectedOptionId: resolution.selectedOptionId,
        customInput: resolution.customInput,
        resolvedAt: new Date(),
      });
      return;
    }

    // Handle standard field responses
    switch (field) {
      case 'destination':
        this.state.preferences.destinationContext = response as TripPreferences['destinationContext'];
        this.setConfidence('destination', 'complete');

        // PHASE 3 & 4 FIX: Pre-fetch AI-based activity and subreddit suggestions for this destination
        const destForSuggestions = (response as TripPreferences['destinationContext'])?.canonicalName ||
                                   (response as TripPreferences['destinationContext'])?.rawInput;
        if (destForSuggestions) {
          // Fire-and-forget - suggestions will be ready by the time we need them
          fetchDestinationActivities(destForSuggestions).catch(() => {});
          fetchDestinationSubreddits(destForSuggestions).catch(() => {});
        }
        break;

      case 'dates':
        const dates = response as { startDate: Date; endDate: Date; nights: number; isFlexible: boolean };
        // Bug fix: validate trip length is at least 1 night and cap at 365
        const validatedNights = Math.max(1, Math.min(365, dates.nights || 1));
        if (dates.nights !== validatedNights) {
          console.warn(`[Orchestrator] Trip length ${dates.nights} adjusted to ${validatedNights}`);
        }
        this.state.preferences.startDate = dates.startDate;
        this.state.preferences.endDate = dates.endDate;
        this.state.preferences.tripLength = validatedNights;
        this.state.preferences.isFlexibleDates = dates.isFlexible;
        this.setConfidence('dates', 'complete');

        // Check for seasonal warnings if destination is already set
        const destName = this.state.preferences.destinationContext?.canonicalName ||
                        this.state.preferences.destinationContext?.rawInput;
        if (destName && dates.startDate) {
          const warnings = getSeasonalWarnings(destName, dates.startDate);
          if (warnings.length > 0) {
            this.state.seasonalWarnings = warnings;
            console.log(`[Orchestrator] Found ${warnings.length} seasonal warnings for ${destName}`);
          }

          // Phase 5 Fix 5.2: Check for local events during trip dates
          if (dates.endDate) {
            const eventsCheck = hasSignificantEvents(destName, dates.startDate, dates.endDate);
            if (eventsCheck.hasEvents) {
              const eventsData = getEventsForDates(destName, dates.startDate, dates.endDate);
              (this.state as any).localEvents = eventsData.events;
              (this.state as any).eventWarnings = eventsData.warnings;
              (this.state as any).eventTips = eventsData.tips;

              // Log event awareness
              console.log(`[Orchestrator] Found ${eventsCheck.highImpactCount} high-impact events for ${destName}:`, eventsCheck.eventNames);

              // Store event info for display in next message (will be shown by question handler)
              if (eventsCheck.highImpactCount > 0 && eventsData.warnings.length > 0) {
                (this.state as any).pendingEventAlert = {
                  warning: eventsData.warnings[0],
                  tip: eventsData.tips[0] || null,
                };
              }
            }
          }
        }
        break;

      case 'party':
        const party = response as { adults: number; children: number; childAges: number[]; estimatedRooms?: number };
        this.state.preferences.adults = party.adults;
        this.state.preferences.children = party.children;
        this.state.preferences.childAges = party.childAges;
        if (party.estimatedRooms) {
          this.state.preferences.estimatedRoomsNeeded = party.estimatedRooms;
        }
        this.setConfidence('party', 'confirmed');

        // For very large groups (8+), suggest vacation rental but don't auto-set
        // Bug fix: store as suggestion so user still gets asked and can choose differently
        const totalTravelers = party.adults + party.children;
        if (totalTravelers >= 8) {
          (this.state.preferences as any).suggestedAccommodationType = 'vacation_rental';
          console.log(`[Orchestrator] Large group (${totalTravelers} travelers) - will suggest vacation rental`);
        }
        break;

      case 'tripOccasion':
        const occasion = response as { id: string; label: string };
        (this.state.preferences as any).tripOccasion = occasion.id;
        // FIX 1.8: Set confidence for tripOccasion
        this.setConfidence('tripOccasion', 'confirmed');

        // FIX 5.1: Apply Honeymoon Mode
        if (occasion.id === 'honeymoon' || occasion.id === 'anniversary') {
          (this.state.preferences as any).specialMode = 'romantic';
          (this.state.preferences as any).vibeBoosts = ['romantic', 'intimate', 'luxury', 'secluded', 'sunset_views'];
          (this.state.preferences as any).vibeFilters = ['party', 'backpacker', 'hostel', 'loud'];
          (this.state.preferences as any).activityBoosts = ['spa_wellness', 'sunset_cruise', 'private_dinner', 'beach'];
          (this.state.preferences as any).suggestUpgrade = true;
          console.log('[Orchestrator] Honeymoon mode activated');
        }

        // FIX 5.2: Apply Backpacker Mode
        if (occasion.id === 'backpacking' || occasion.id === 'gap_year' || occasion.id === 'budget_adventure') {
          (this.state.preferences as any).specialMode = 'backpacker';
          (this.state.preferences as any).accommodationTypes = ['hostel', 'guesthouse', 'budget_hotel'];
          (this.state.preferences as any).vibeBoosts = ['backpacker', 'social', 'authentic', 'local', 'adventure'];
          (this.state.preferences as any).activityBoosts = ['hiking', 'beach', 'cultural', 'food_tour', 'adventure'];
          (this.state.preferences as any).optimizeForBudget = true;
          console.log('[Orchestrator] Backpacker mode activated');
        }

        // Adventure mode
        if (occasion.id === 'adventure' || occasion.id === 'extreme_sports') {
          (this.state.preferences as any).specialMode = 'adventure';
          (this.state.preferences as any).vibeBoosts = ['adventure', 'adrenaline', 'nature', 'outdoors'];
          (this.state.preferences as any).activityBoosts = ['surf', 'diving', 'hiking', 'adventure', 'water_sports'];
          console.log('[Orchestrator] Adventure mode activated');
        }

        // Wellness mode
        if (occasion.id === 'wellness' || occasion.id === 'retreat') {
          (this.state.preferences as any).specialMode = 'wellness';
          (this.state.preferences as any).vibeBoosts = ['peaceful', 'wellness', 'nature', 'quiet', 'relaxed'];
          (this.state.preferences as any).activityBoosts = ['spa_wellness', 'yoga', 'meditation', 'hiking', 'nature'];
          (this.state.preferences as any).vibeFilters = ['party', 'nightlife', 'busy'];
          console.log('[Orchestrator] Wellness mode activated');
        }

        // FIX 5.3: Family mode
        if (occasion.id === 'family' || occasion.id === 'family_vacation') {
          (this.state.preferences as any).specialMode = 'family';
          (this.state.preferences as any).vibeBoosts = ['family_friendly', 'safe', 'spacious', 'convenient'];
          (this.state.preferences as any).activityBoosts = ['beach', 'wildlife', 'cultural', 'swimming', 'theme_park'];
          (this.state.preferences as any).vibeFilters = ['adults_only', 'party', 'nightlife'];
          (this.state.preferences as any).requireFamilyFriendly = true;
          console.log('[Orchestrator] Family mode activated');
        }

        // FIX 5.4: Workation mode
        if (occasion.id === 'workation' || occasion.id === 'remote_work' || occasion.id === 'digital_nomad') {
          (this.state.preferences as any).specialMode = 'workation';
          (this.state.preferences as any).vibeBoosts = ['wifi', 'coworking', 'quiet', 'cafes', 'productive'];
          (this.state.preferences as any).activityBoosts = ['cultural', 'food_tour', 'hiking', 'beach'];
          (this.state.preferences as any).accommodationRequirements = ['wifi', 'workspace', 'quiet'];
          (this.state.preferences as any).requireWorkspace = true;
          console.log('[Orchestrator] Workation mode activated');
        }

        // FIX 5.5: Solo traveler mode
        if (occasion.id === 'solo' || occasion.id === 'solo_travel') {
          (this.state.preferences as any).specialMode = 'solo';
          (this.state.preferences as any).vibeBoosts = ['social', 'safe', 'walkable', 'friendly', 'backpacker'];
          (this.state.preferences as any).activityBoosts = ['food_tour', 'cultural', 'hiking', 'beach', 'nightlife'];
          (this.state.preferences as any).prioritizeSafety = true;
          console.log('[Orchestrator] Solo traveler mode activated');
        }

        // FIX 5.6: Girls trip / Guys trip (social trip)
        if (occasion.id === 'girls_trip' || occasion.id === 'guys_trip' || occasion.id === 'friends_trip') {
          (this.state.preferences as any).specialMode = 'social_trip';
          (this.state.preferences as any).vibeBoosts = ['social', 'lively', 'nightlife', 'trendy', 'fun'];
          (this.state.preferences as any).activityBoosts = ['nightlife', 'beach', 'spa_wellness', 'food_tour', 'adventure'];
          (this.state.preferences as any).prioritizeGroupActivities = true;
          console.log('[Orchestrator] Social trip mode activated');
        }

        // FIX 5.7: Foodie mode
        if (occasion.id === 'foodie' || occasion.id === 'culinary' || occasion.id === 'food_exploration') {
          (this.state.preferences as any).specialMode = 'foodie';
          (this.state.preferences as any).vibeBoosts = ['foodie', 'authentic', 'local', 'markets', 'dining'];
          (this.state.preferences as any).activityBoosts = ['food_tour', 'cooking_class', 'wine_tasting', 'cultural'];
          (this.state.preferences as any).prioritizeDining = true;
          (this.state.preferences as any).includeMichelinOptions = true;
          console.log('[Orchestrator] Foodie mode activated');
        }

        // FIX 5.8: Party mode
        if (occasion.id === 'party' || occasion.id === 'bachelor' || occasion.id === 'bachelorette' || occasion.id === 'celebration') {
          (this.state.preferences as any).specialMode = 'party';
          (this.state.preferences as any).vibeBoosts = ['party', 'nightlife', 'lively', 'social', 'fun'];
          (this.state.preferences as any).activityBoosts = ['nightlife', 'beach', 'full_moon_party', 'adventure'];
          (this.state.preferences as any).vibeFilters = ['quiet', 'peaceful', 'family_friendly'];
          console.log('[Orchestrator] Party mode activated');
        }

        // FIX 5.9: Cultural immersion mode
        if (occasion.id === 'cultural' || occasion.id === 'immersion' || occasion.id === 'educational') {
          (this.state.preferences as any).specialMode = 'cultural';
          (this.state.preferences as any).vibeBoosts = ['authentic', 'cultural', 'historic', 'local', 'traditional'];
          (this.state.preferences as any).activityBoosts = ['cultural', 'temple_visit', 'food_tour', 'cooking_class', 'photography'];
          (this.state.preferences as any).prioritizeAuthenticity = true;
          console.log('[Orchestrator] Cultural immersion mode activated');
        }

        // FIX 5.10: Luxury mode
        if (occasion.id === 'luxury' || occasion.id === 'splurge' || occasion.id === 'special_occasion') {
          (this.state.preferences as any).specialMode = 'luxury';
          (this.state.preferences as any).vibeBoosts = ['luxury', 'exclusive', 'upscale', 'sophisticated', 'private'];
          (this.state.preferences as any).activityBoosts = ['spa_wellness', 'wine_tasting', 'golf', 'sailing', 'private_tour'];
          (this.state.preferences as any).suggestUpgrade = true;
          (this.state.preferences as any).includeMichelinOptions = true;
          console.log('[Orchestrator] Luxury mode activated');
        }

        // FIX 5.11: Nature/Eco mode
        if (occasion.id === 'nature' || occasion.id === 'eco' || occasion.id === 'wildlife') {
          (this.state.preferences as any).specialMode = 'nature';
          (this.state.preferences as any).vibeBoosts = ['nature', 'eco', 'wildlife', 'scenic', 'outdoors'];
          (this.state.preferences as any).activityBoosts = ['hiking', 'wildlife', 'snorkel', 'kayaking', 'photography'];
          (this.state.preferences as any).prioritizeEcoFriendly = true;
          console.log('[Orchestrator] Nature/Eco mode activated');
        }

        // FIX 5.12: Photography trip mode
        if (occasion.id === 'photography' || occasion.id === 'photo_trip') {
          (this.state.preferences as any).specialMode = 'photography';
          (this.state.preferences as any).vibeBoosts = ['scenic', 'photogenic', 'unique', 'authentic', 'diverse'];
          (this.state.preferences as any).activityBoosts = ['photography', 'cultural', 'wildlife', 'hiking', 'sunrise_sunset'];
          (this.state.preferences as any).prioritizeGoldenHour = true;
          console.log('[Orchestrator] Photography mode activated');
        }

        // FIX 5.13: Sports/Active mode
        if (occasion.id === 'sports' || occasion.id === 'active' || occasion.id === 'fitness') {
          (this.state.preferences as any).specialMode = 'active';
          (this.state.preferences as any).vibeBoosts = ['active', 'outdoors', 'adventure', 'fitness'];
          (this.state.preferences as any).activityBoosts = ['hiking', 'surf', 'cycling', 'rock_climbing', 'water_sports'];
          console.log('[Orchestrator] Sports/Active mode activated');
        }

        console.log('[Orchestrator] Trip occasion set:', occasion.id);
        break;

      case 'travelingWithPets':
        // Simple yes/no question
        const petYesNo = response as { id: string; label: string };
        (this.state.preferences as any).hasPets = petYesNo.id === 'yes';
        if (petYesNo.id === 'no') {
          (this.state.preferences as any).travelingWithPets = { hasPet: false };
        }
        console.log('[Orchestrator] Has pets:', (this.state.preferences as any).hasPets);
        break;

      case 'travelingWithPetsType':
        // Follow-up: which pet type
        const petTypeResponse = response as { id: string; label: string };
        const petSize = petTypeResponse.id.includes('small') ? 'small' :
                        petTypeResponse.id.includes('medium') ? 'medium' :
                        petTypeResponse.id.includes('large') ? 'large' : undefined;
        const petType = petTypeResponse.id.includes('dog') ? 'dog' :
                        petTypeResponse.id.includes('cat') ? 'cat' : 'other';
        (this.state.preferences as any).travelingWithPets = {
          hasPet: true,
          petType,
          petSize,
        };
        console.log('[Orchestrator] Pet info set:', (this.state.preferences as any).travelingWithPets);
        break;

      case 'accessibility':
        // Simple yes/no question
        const accessYesNo = response as { id: string; label: string };
        (this.state.preferences as any).hasAccessibilityNeeds = accessYesNo.id === 'yes';
        if (accessYesNo.id === 'no') {
          this.state.preferences.accessibilityNeeds = undefined;
        }
        console.log('[Orchestrator] Has accessibility needs:', (this.state.preferences as any).hasAccessibilityNeeds);
        this.setConfidence('accessibility', 'complete');
        break;

      case 'accessibilityType':
        // Follow-up: which accessibility needs
        const accessibilityPrefs = response as { id: string; label: string }[];
        const accessibilityIds = accessibilityPrefs.map(a => a.id);
        this.state.preferences.accessibilityNeeds = {
          wheelchairAccessible: accessibilityIds.includes('wheelchair'),
          groundFloorRequired: accessibilityIds.includes('ground_floor'),
          elevatorRequired: accessibilityIds.includes('elevator'),
          noStairs: accessibilityIds.includes('no_stairs'),
        };
        console.log('[Orchestrator] Accessibility needs set:', this.state.preferences.accessibilityNeeds);
        break;

      case 'budget':
        const budget = response as { value: number; label: string };
        // If user selected max slider value (1000), treat as unlimited (no upper bound in search)
        const isUnlimited = budget.value >= 1000;
        // Bug fix: use percentage-based range (±25%) instead of fixed ±100
        // This scales better for different budget levels
        const budgetRange = Math.round(budget.value * 0.25);
        this.state.preferences.budgetPerNight = {
          min: Math.max(Math.round(budget.value * 0.5), budget.value - budgetRange),
          max: isUnlimited ? 999999 : budget.value + budgetRange,
        };
        (this.state.preferences as any).budgetUnlimited = isUnlimited;
        this.setConfidence('budget', 'complete');
        break;

      case 'accommodationType':
        const accomType = response as { id: string; label: string };
        (this.state.preferences as any).accommodationType = accomType.id;
        console.log('[Orchestrator] Accommodation type set:', accomType.id);
        break;

      case 'sustainabilityPreference':
        const sustainabilityPref = response as { id: string; label: string };
        (this.state.preferences as any).sustainabilityPreference = sustainabilityPref.id;
        console.log('[Orchestrator] Sustainability preference set:', sustainabilityPref.id);
        break;

      // ============================================================================
      // SMART FOLLOW-UP QUESTION HANDLERS (Phase 1 Critical)
      // ============================================================================

      case 'surfingDetails':
        const surfResponse = response as { id: string; label: string; isCustom?: boolean };
        const surfLevel = surfResponse.id;

        (this.state.preferences as any).surfingDetails = {
          level: surfLevel,
          wantsLessons: surfLevel === 'never' || surfLevel === 'beginner',
          customNotes: surfResponse.isCustom ? surfResponse.label : undefined,
        };

        // FIX 1.10: Apply surf level to area/experience filtering
        if (surfLevel === 'never' || surfLevel === 'beginner') {
          // Prioritize areas with surf schools and beginner-friendly breaks
          (this.state.preferences as any).surfSchoolRequired = true;
          (this.state.preferences as any).surfBreakType = 'beginner';
        } else if (surfLevel === 'intermediate') {
          // Allow intermediate spots with some variety
          (this.state.preferences as any).surfBreakType = 'intermediate';
        } else if (surfLevel === 'advanced' || surfLevel === 'expert') {
          // Allow advanced spots with reef breaks, etc.
          (this.state.preferences as any).allowAdvancedSpots = true;
          (this.state.preferences as any).surfBreakType = 'advanced';
        }

        console.log('[Orchestrator] Surfing details set:', (this.state.preferences as any).surfingDetails);
        break;

      case 'childNeeds':
        const childNeedsResponse = response as { id: string; label: string; isCustom?: boolean }[];
        const childNeedsIds = childNeedsResponse.map(r => r.id);
        const customChildNotes = childNeedsResponse.find(r => r.isCustom)?.label;

        if (!childNeedsIds.includes('none')) {
          (this.state.preferences as any).childNeeds = {
            scaredOfHeights: childNeedsIds.includes('scared_heights'),
            scaredOfWater: childNeedsIds.includes('scared_water'),
            scaredOfDark: childNeedsIds.includes('scared_dark_rides'),
            scaredOfLoudNoises: childNeedsIds.includes('scared_loud'),
            pickyEater: childNeedsIds.includes('picky_eater'),
            needsNaps: childNeedsIds.includes('needs_naps'),
            animalLover: childNeedsIds.includes('animal_lover'),
            customNotes: customChildNotes,
          };
        } else {
          (this.state.preferences as any).childNeeds = { none: true };
        }
        console.log('[Orchestrator] Child needs set:', (this.state.preferences as any).childNeeds);
        break;

      case 'workationNeeds':
        const workationResponse = response as { id: string; label: string; isCustom?: boolean };
        (this.state.preferences as any).workationNeeds = {
          requiresWorkspace: true,
          wifiSpeed: workationResponse.id as 'basic' | 'fast' | 'excellent',
          customNotes: workationResponse.isCustom ? workationResponse.label : undefined,
        };
        console.log('[Orchestrator] Workation needs set:', (this.state.preferences as any).workationNeeds);
        break;

      case 'multiCountryLogistics':
        const multiCountryResponse = response as { id: string; label: string; isCustom?: boolean };
        const destInputForMulti = this.state.preferences.destinationContext?.rawInput || '';
        const multiInfo = detectMultiCountry(destInputForMulti);
        (this.state.preferences as any).multiCountryLogistics = {
          acknowledged: true,
          userChoice: multiCountryResponse.id,
          countries: multiInfo.countries,
          needsTransportHelp: multiCountryResponse.id === 'help_transport',
          needsVisaInfo: multiCountryResponse.id === 'visa_check',
          customNotes: multiCountryResponse.isCustom ? multiCountryResponse.label : undefined,
        };
        console.log('[Orchestrator] Multi-country logistics set:', (this.state.preferences as any).multiCountryLogistics);
        break;

      case 'themeParkPreferences':
        const themeParkResponse = response as { id: string; label: string; isCustom?: boolean }[];
        const themeParkIds = themeParkResponse.map(r => r.id);
        const customThemeParkNotes = themeParkResponse.find(r => r.isCustom)?.label;

        (this.state.preferences as any).themeParkPreferences = {
          wantsCharacterDining: themeParkIds.includes('character_dining'),
          thrillSeeker: themeParkIds.includes('thrill_seeker'),
          relaxedPace: themeParkIds.includes('relaxed_pace'),
          wantsMeetCharacters: themeParkIds.includes('meet_characters'),
          avoidScary: themeParkIds.includes('avoid_scary'),
          customNotes: customThemeParkNotes,
        };

        // FIX 1.11: Apply theme park preferences to itinerary planning
        if (themeParkIds.includes('avoid_crowds')) {
          (this.state.preferences as any).preferLowCrowdTimes = true;
        }
        if (themeParkIds.includes('thrill_seeker')) {
          // Check child ages for ride restrictions
          const parkChildAges = this.state.preferences.childAges || [];
          if (parkChildAges.some(age => age < 10)) {
            (this.state as any).themeParkWarning = 'Note: Some thrill rides have height/age restrictions for younger kids';
          }
        }
        if (themeParkIds.includes('relaxed_pace')) {
          // Suggest fewer parks per day
          (this.state.preferences as any).parksPerDay = 1;
        }

        console.log('[Orchestrator] Theme park prefs set:', (this.state.preferences as any).themeParkPreferences);
        break;

      case 'userNotes':
        const notesResponse = response as string;
        if (notesResponse && notesResponse.trim()) {
          // Add to user notes array
          const existingNotes = (this.state.preferences as any).userNotes || [];
          existingNotes.push({
            field: 'general',
            note: notesResponse.trim(),
            timestamp: new Date(),
          });
          (this.state.preferences as any).userNotes = existingNotes;
          console.log('[Orchestrator] User note added:', notesResponse.trim());
        }
        break;

      case 'subreddits':
        const subreddits = response as { id: string; label: string }[];
        (this.state.preferences as any).selectedSubreddits = subreddits.map(s => s.id);
        (this.state.preferences as any).subredditsComplete = true; // Mark as answered
        break;

      case 'pace':
        const pace = response as { id: string; label: string };
        this.state.preferences.pace = pace.id as 'chill' | 'balanced' | 'packed';
        // FIX 1.2: Set pace confidence, not vibe (vibe is a separate question)
        this.setConfidence('pace', 'complete');
        break;

      case 'activities':
        const activities = response as { id: string; label: string; isCustom?: boolean }[];
        const activityTypes = activities.map(a => a.id);
        const childAges = this.state.preferences.childAges || [];

        // FIX 1.4: Apply child age filtering to activities
        if (childAges.length > 0) {
          const filtered = filterActivitiesForChildAges(activityTypes, childAges);

          if (filtered.restricted.length > 0) {
            // Store warnings to show user in next message
            (this.state as any).activityWarnings = filtered.warnings;
            console.log('[Orchestrator] Activity warnings for child ages:', filtered.warnings);
          }
        }

        this.state.preferences.selectedActivities = activities.map((a, idx) => ({
          type: a.id as TripPreferences['selectedActivities'][0]['type'],
          priority: (idx < 3 ? 'must-do' : 'nice-to-have') as 'must-do' | 'nice-to-have',
          // Preserve custom activity info for smart matching
          ...(a.isCustom ? { isCustom: true, customLabel: a.label } : {}),
        }));
        this.setConfidence('activities', 'complete');

        // After activities, detect tradeoffs
        this.detectTradeoffs();
        break;

      case 'vibe':
        // Sanitize: strip HTML tags from free-text input
        const vibe = (response as string).replace(/<[^>]*>/g, '');
        // BUG FIX: Store the vibe text itself so the field is marked as answered
        (this.state.preferences as any).vibe = vibe || '';

        // Parse must-dos and hard-nos from free text
        this.state.preferences.mustDos = [];
        this.state.preferences.hardNos = [];
        if (vibe) {
          // Store the raw text as a must-do/wish list item
          // This captures things like "horse riding in water, surfing lessons, whale watching"
          this.state.preferences.mustDos.push(vibe);
        }
        this.setConfidence('vibe', 'complete');
        console.log('[Orchestrator] Vibe/must-dos set:', vibe);
        break;

      case 'activitySkillLevel':
        const skillLevel = response as { id: string; label: string };
        this.state.preferences.activitySkillLevel = skillLevel.id as 'beginner' | 'intermediate' | 'advanced';
        console.log('[Orchestrator] Activity skill level set:', skillLevel.id);
        break;

      case 'areas':
        const areas = response as AreaCandidate[];
        this.state.preferences.selectedAreas = areas;
        this.setConfidence('areas', 'complete');
        break;

      case 'hotelPreferences':
        const hotelPrefs = response as { id: string; label: string }[];
        (this.state.preferences as any).hotelPreferences = hotelPrefs.map(p => p.id);
        // Also set specific flags for common preferences
        this.state.preferences.adultsOnlyPreferred = hotelPrefs.some(p => p.id === 'adults_only');
        this.state.preferences.allInclusivePreferred = hotelPrefs.some(p => p.id === 'all_inclusive');
        this.state.preferences.hotelVibePreferences = hotelPrefs
          .filter(p => ['boutique', 'quiet', 'family'].includes(p.id))
          .map(p => p.id);
        // Bug fix: add logging for debugging
        console.log('[Orchestrator] Hotel preferences set:', hotelPrefs.map(p => p.id));
        break;

      case 'split':
        const splitResponse = response as TripPreferences['selectedSplit'];
        // Bug fix: validate split has valid stops and set state properly
        if (splitResponse && splitResponse.stops && splitResponse.stops.length > 0) {
          this.state.preferences.selectedSplit = splitResponse;
          console.log('[Orchestrator] Split selected:', splitResponse.id, 'with', splitResponse.stops.length, 'stops');
        } else {
          console.warn('[Orchestrator] Invalid split response, missing stops');
        }
        break;

      case 'hotels':
        const hotel = response as HotelCandidate;
        // Get the current area from the question config
        const currentAreaId = (this.state.currentQuestion?.inputConfig as any)?.areaId;

        console.log(`[Orchestrator] Hotel response received:`, {
          hotelName: hotel?.name,
          currentAreaId,
          questionConfig: this.state.currentQuestion?.inputConfig,
        });

        if (!currentAreaId) {
          console.error('[Orchestrator] No areaId in hotel question config - using first unselected area');
          // Fallback: find first area without a hotel
          const areas = this.state.preferences.selectedAreas || [];
          const selectedHotels = (this.state.preferences as any).selectedHotels || {};
          const fallbackArea = areas.find(a => !selectedHotels[a.id] && this.state.discoveredData.hotels.has(a.id));
          if (fallbackArea) {
            (this.state.preferences as any).selectedHotels = selectedHotels;
            (this.state.preferences as any).selectedHotels[fallbackArea.id] = hotel;
            console.log(`[Orchestrator] Used fallback area: ${fallbackArea.id}`);
          }
        } else if (hotel) {
          // Initialize selectedHotels if needed
          if (!(this.state.preferences as any).selectedHotels) {
            (this.state.preferences as any).selectedHotels = {};
          }
          (this.state.preferences as any).selectedHotels[currentAreaId] = hotel;
          console.log(`[Orchestrator] Stored hotel "${hotel.name}" for area ${currentAreaId}`);
        }

        // Always check completion status after handling
        const allAreas = this.state.preferences.selectedAreas || [];
        const allSelectedHotels = (this.state.preferences as any).selectedHotels || {};
        const areasNeedingHotels = allAreas.filter(a =>
          !allSelectedHotels[a.id] && this.state.discoveredData.hotels.has(a.id) &&
          (this.state.discoveredData.hotels.get(a.id)?.length || 0) > 0
        );

        console.log(`[Orchestrator] Hotel status:`, {
          totalAreas: allAreas.length,
          selectedHotels: Object.keys(allSelectedHotels),
          areasStillNeedingHotels: areasNeedingHotels.map(a => a.id),
        });

        if (areasNeedingHotels.length === 0) {
          this.setConfidence('hotels', 'complete');
          console.log('[Orchestrator] All areas have hotels selected');
        } else {
          this.setConfidence('hotels', 'partial');
          console.log(`[Orchestrator] ${areasNeedingHotels.length} areas still need hotels`);
        }
        break;

      case 'dining':
        const dining = response as { id: string };
        // Store diningMode as-is (plan, list, or none)
        this.state.preferences.diningMode = dining.id as 'none' | 'list' | 'plan';
        this.setConfidence('dining', 'complete');
        console.log('[Orchestrator] Dining mode set to:', dining.id);
        break;

      case 'dietaryRestrictions':
        const dietaryPrefs = response as { id: string; label: string }[];
        // Filter out 'none' if selected with other options
        const restrictions = dietaryPrefs.map(d => d.id).filter(id => id !== 'none');
        (this.state.preferences as any).dietaryRestrictions = restrictions.length > 0 ? restrictions : ['none'];
        console.log('[Orchestrator] Dietary restrictions set:', (this.state.preferences as any).dietaryRestrictions);
        break;

      case 'cuisinePreferences':
        const cuisinePrefs = response as { id: string; label: string }[];
        (this.state.preferences as any).cuisinePreferences = cuisinePrefs.map(c => c.id);
        console.log('[Orchestrator] Cuisine preferences set:', (this.state.preferences as any).cuisinePreferences);
        break;

      case 'restaurants':
        const restaurants = response as RestaurantCandidate[];
        // Get the current cuisine type from the question config
        let currentCuisineType = (this.state.currentQuestion?.inputConfig as any)?.cuisineType;

        console.log(`[Orchestrator] Restaurant response received:`, {
          restaurantCount: restaurants?.length,
          cuisineType: currentCuisineType,
        });

        // Bug fix: fallback to find first cuisine type without selections
        if (!currentCuisineType) {
          console.warn('[Orchestrator] No cuisineType in restaurant question config - finding fallback');
          const allCuisines = (this.state.preferences as any).cuisinePreferences || [];
          const selectedRests = (this.state.preferences as any).selectedRestaurants || {};
          currentCuisineType = allCuisines.find((c: string) => !selectedRests[c]) || 'general';
          console.log(`[Orchestrator] Using fallback cuisineType: ${currentCuisineType}`);
        }

        if (restaurants && restaurants.length > 0) {
          // Initialize selectedRestaurants if needed
          if (!(this.state.preferences as any).selectedRestaurants) {
            (this.state.preferences as any).selectedRestaurants = {};
          }
          (this.state.preferences as any).selectedRestaurants[currentCuisineType] = restaurants;
          console.log(`[Orchestrator] Stored ${restaurants.length} restaurants for cuisine ${currentCuisineType}`);
        }

        // Check if all cuisine types have restaurant selections (or no restaurants available)
        const allCuisinePrefs = (this.state.preferences as any).cuisinePreferences || [];
        const allSelectedRestaurants = (this.state.preferences as any).selectedRestaurants || {};
        const cuisinesNeedingRestaurants = allCuisinePrefs.filter((cuisine: string) =>
          !allSelectedRestaurants[cuisine] &&
          this.state.discoveredData.restaurants.has(cuisine) &&
          (this.state.discoveredData.restaurants.get(cuisine)?.length || 0) > 0
        );

        console.log(`[Orchestrator] Restaurant status:`, {
          totalCuisines: allCuisinePrefs.length,
          selectedRestaurants: Object.keys(allSelectedRestaurants),
          cuisinesStillNeeding: cuisinesNeedingRestaurants,
        });

        // If no more cuisines need restaurant selection, we're done with restaurants
        if (cuisinesNeedingRestaurants.length === 0) {
          console.log('[Orchestrator] All cuisines have restaurants selected (or none available)');
        }
        break;

      case 'experiences':
        const experiences = response as any[];
        let currentActivityType = (this.state.currentQuestion?.inputConfig as any)?.activityType;

        console.log(`[Orchestrator] Experience response received:`, {
          experienceCount: experiences?.length,
          activityType: currentActivityType,
        });

        // Bug fix: fallback to find first activity type without selections
        if (!currentActivityType) {
          console.warn('[Orchestrator] No activityType in experience question config - finding fallback');
          const allActivities = (this.state.preferences.selectedActivities || []).map(a => a.type);
          const selectedExps = (this.state.preferences as any).selectedExperiences || {};
          currentActivityType = allActivities.find((a: string) => !selectedExps[a]) || 'general';
          console.log(`[Orchestrator] Using fallback activityType: ${currentActivityType}`);
        }

        if (experiences && experiences.length > 0) {
          if (!(this.state.preferences as any).selectedExperiences) {
            (this.state.preferences as any).selectedExperiences = {};
          }
          (this.state.preferences as any).selectedExperiences[currentActivityType] = experiences;
          console.log(`[Orchestrator] Stored ${experiences.length} experiences for activity ${currentActivityType}`);
        } else {
          // User skipped - mark as done for this activity
          if (!(this.state.preferences as any).selectedExperiences) {
            (this.state.preferences as any).selectedExperiences = {};
          }
          (this.state.preferences as any).selectedExperiences[currentActivityType] = [];
        }

        // Check if all activity types have experience selections
        const allActivityTypes = (this.state.preferences.selectedActivities || []).map(a => a.type);
        const allSelectedExperiences = (this.state.preferences as any).selectedExperiences || {};
        const experiencesMap = (this.state.discoveredData as any).experiences;
        const activitiesNeedingExperiences = allActivityTypes.filter((activity: string) =>
          !allSelectedExperiences[activity] &&
          experiencesMap?.has(activity) &&
          (experiencesMap?.get(activity)?.length || 0) > 0
        );

        console.log(`[Orchestrator] Experience status:`, {
          totalActivities: allActivityTypes.length,
          selectedExperiences: Object.keys(allSelectedExperiences),
          activitiesStillNeeding: activitiesNeedingExperiences,
        });
        break;

      case 'satisfaction':
        const satisfaction = response as { satisfied: boolean; reasons?: string[]; customFeedback?: string };
        if (satisfaction.satisfied) {
          this.state.phase = 'satisfied';
        } else {
          // Handle dissatisfaction - trigger surgical regeneration
          this.handleDissatisfaction(satisfaction.reasons || [], satisfaction.customFeedback);
        }
        break;
    }

    this.state.currentQuestion = null;
  }

  // ============================================================================
  // LLM-POWERED SNOO MESSAGES
  // ============================================================================

  async generateSnooMessage(context: {
    type: 'greeting' | 'area_recommendation' | 'activity_suggestion' | 'tradeoff_explanation' | 'celebration' | 'follow_up';
    data?: unknown;
  }): Promise<string> {
    // Use templates for simple cases
    switch (context.type) {
      case 'greeting':
        return pickTemplate(SNOO_TEMPLATES.greeting);
      case 'celebration':
        return pickTemplate(SNOO_TEMPLATES.celebrating);
    }

    // Use LLM for complex, context-aware messages
    try {
      const prompt = this.buildSnooMessagePrompt(context);
      const response = await callLLM([
        { role: 'system', content: this.getSnooSystemPrompt() },
        { role: 'user', content: prompt },
      ], 0.7);

      this.log('grok', 'Generated Snoo message', { type: context.type });
      return response.trim();
    } catch (error) {
      this.log('grok', 'Snoo message generation failed', { error });
      // Fallback to templates
      return 'Let me help you with that!';
    }
  }

  private getSnooSystemPrompt(): string {
    return `You are Snoo, a friendly AI travel buddy. You're helpful, enthusiastic, and have a casual personality.

Key traits:
- Warm and conversational (never robotic)
- Use simple language, no jargon
- Reference Reddit insights when relevant
- Be specific with recommendations
- Keep responses concise (2-3 sentences max)

Never:
- Use corporate speak
- Be overly formal
- Include disclaimers
- Say "I'd be happy to..."`;
  }

  private buildSnooMessagePrompt(context: { type: string; data?: unknown }): string {
    const destination = this.state.preferences.destinationContext?.canonicalName || 'your destination';

    switch (context.type) {
      case 'area_recommendation':
        const areas = context.data as AreaCandidate[];
        return `Write a friendly message presenting these area options for a trip to ${destination}:
${areas.map(a => `- ${a.name}: ${a.description} (${a.bestFor.join(', ')})`).join('\n')}

Mention why each area might be good based on what the user wants. Keep it to 2-3 sentences.`;

      case 'activity_suggestion':
        const activities = context.data as VerifiedActivity[];
        return `Suggest these verified activities for ${destination}:
${activities.slice(0, 3).map(a => `- ${a.name} (${a.redditMentions} Reddit mentions)`).join('\n')}

Be enthusiastic but not over the top. Mention these are from Reddit. 2-3 sentences.`;

      case 'follow_up':
        return `Generate a natural follow-up question about the user's trip to ${destination}.
Current context: ${this.summarizeKnownPreferences()}

Ask something that would help personalize their experience. Keep it casual.`;

      default:
        return `Write a brief, friendly message helping with trip planning to ${destination}.`;
    }
  }

  // ============================================================================
  // DATA UPDATES
  // ============================================================================

  setDiscoveredAreas(areas: AreaCandidate[]): void {
    this.state.discoveredData.areas = areas;
    this.setEnrichmentStatus('areas', 'done');
  }

  setDiscoveredHotels(areaId: string, hotels: HotelCandidate[]): void {
    this.state.discoveredData.hotels.set(areaId, hotels);
  }

  setDiscoveredActivities(activities: VerifiedActivity[]): void {
    this.state.discoveredData.activities = activities;
    this.setEnrichmentStatus('activities', 'done');
  }

  setDiscoveredRestaurants(cuisineOrAreaId: string, restaurants: RestaurantCandidate[]): void {
    this.state.discoveredData.restaurants.set(cuisineOrAreaId, restaurants);
  }

  setDiscoveredExperiences(activityType: string, experiences: any[]): void {
    (this.state.discoveredData as any).experiences.set(activityType, experiences);
  }

  setItinerary(itinerary: OrchestratorState['itinerary']): void {
    this.state.itinerary = itinerary;
    this.state.phase = 'reviewing';
  }

  // ============================================================================
  // DISSATISFACTION HANDLING (Surgical Regeneration)
  // ============================================================================

  private handleDissatisfaction(reasons: string[], customFeedback?: string): void {
    this.log('orchestrator', 'Handling dissatisfaction', { reasons, customFeedback });

    const PHASE_ORDER = ['gathering', 'enriching', 'generating', 'reviewing'];
    const targetPhases: string[] = [];

    // Map reasons to actions - reset specific confidence levels to trigger regeneration
    for (const reason of reasons) {
      switch (reason) {
        case 'wrong_areas':
          // Go back to area discovery
          this.setConfidence('areas', 'unknown');
          this.state.discoveredData.areas = [];
          targetPhases.push('enriching');
          break;

        case 'wrong_vibe':
          // Clear vibe preference (stored as .vibe, not .vibes) to re-ask
          (this.state.preferences as any).vibe = undefined;
          this.setConfidence('vibe', 'unknown');
          targetPhases.push('gathering');
          break;

        case 'too_packed':
        case 'too_chill':
          // Adjust pace preference
          this.state.preferences.pace = reason === 'too_packed' ? 'chill' : 'packed';
          targetPhases.push('generating');
          break;

        case 'hotel_wrong':
          // Go back to hotel selection — keep discovered hotels, only clear selections
          this.setConfidence('hotels', 'unknown');
          (this.state.preferences as any).selectedHotels = {};
          targetPhases.push('enriching');
          break;

        case 'dining_wrong':
          // Clear restaurant selections and cuisine prefs — keep dining mode and dietary restrictions
          // User will re-answer cuisine preferences, which triggers restaurant re-fetch
          this.state.discoveredData.restaurants.clear();
          (this.state.preferences as any).selectedRestaurants = undefined;
          (this.state.preferences as any).cuisinePreferences = undefined;
          targetPhases.push('enriching');
          break;

        case 'too_touristy':
          // Store preference for off-beaten-path
          this.state.preferences.avoidTouristy = true;
          targetPhases.push('generating');
          break;

        case 'missing_activity':
          // Store custom feedback for activity addition
          if (customFeedback) {
            this.state.preferences.mustIncludeActivities =
              this.state.preferences.mustIncludeActivities || [];
            this.state.preferences.mustIncludeActivities.push(customFeedback);
          }
          targetPhases.push('generating');
          break;

        case 'surf_days_wrong':
          // Clear surfing details so user can re-specify (keep activity selections intact)
          (this.state.preferences as any).surfingDetails = undefined;
          targetPhases.push('gathering');
          break;

        case 'budget_exceeded':
          // Bump budget up by 25% and regenerate
          if (this.state.preferences.budgetPerNight) {
            this.state.preferences.budgetPerNight.max = Math.round(this.state.preferences.budgetPerNight.max * 1.25);
          }
          targetPhases.push('generating');
          break;

        default:
          // For 'other' or unknown reasons, use custom feedback
          if (customFeedback) {
            this.state.preferences.customFeedback = customFeedback;
          }
          targetPhases.push('generating');
      }
    }

    // Set phase to the earliest needed to address all selected reasons
    const earliest = PHASE_ORDER.find(p => targetPhases.includes(p)) || 'generating';
    this.state.phase = earliest as any;

    // Add a message acknowledging the feedback
    this.addSnooMessage(
      "Got it! Let me adjust the plan based on your feedback...",
      'thinking'
    );
  }

  // ============================================================================
  // LOGGING
  // ============================================================================

  private log(
    type: DebugEntry['type'],
    action: string,
    details: Record<string, unknown> = {},
    durationMs?: number
  ): void {
    const entry: DebugEntry = {
      timestamp: new Date(),
      type,
      action,
      details,
      durationMs,
    };
    this.debugLog.push(entry);
    this.state.debugLog.push(entry);
  }

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  toJSON(): object {
    return {
      phase: this.state.phase,
      preferences: this.state.preferences,
      confidence: this.state.confidence,
      activeTradeoffs: this.state.activeTradeoffs,
      resolvedTradeoffs: this.state.resolvedTradeoffs,
      enrichmentStatus: this.state.enrichmentStatus,
      discoveredData: {
        areas: this.state.discoveredData.areas,
        hotels: Array.from(this.state.discoveredData.hotels.entries()),
        activities: this.state.discoveredData.activities,
        restaurants: Array.from(this.state.discoveredData.restaurants.entries()),
        experiences: Array.from(this.state.discoveredData.experiences.entries()),
      },
      messages: this.state.messages,
      currentQuestion: this.state.currentQuestion,
      itinerary: this.state.itinerary,
      seasonalWarnings: this.state.seasonalWarnings,
      questionHistory: (this.state as any).questionHistory,
    };
  }

  static fromJSON(json: ReturnType<QuickPlanOrchestrator['toJSON']>): QuickPlanOrchestrator {
    const data = json as any;
    const orchestrator = new QuickPlanOrchestrator({
      ...data,
      discoveredData: {
        areas: data.discoveredData.areas,
        hotels: new Map(data.discoveredData.hotels),
        activities: data.discoveredData.activities,
        restaurants: new Map(data.discoveredData.restaurants),
        experiences: new Map(data.discoveredData.experiences || []),
      },
    });
    if (data.questionHistory) {
      (orchestrator.state as any).questionHistory = data.questionHistory;
    }
    return orchestrator;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createOrchestrator(initialState?: Partial<OrchestratorState>): QuickPlanOrchestrator {
  return new QuickPlanOrchestrator(initialState);
}

export { SNOO_TEMPLATES, FIELD_QUESTIONS };
