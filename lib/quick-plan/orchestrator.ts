/**
 * Quick Plan Orchestrator
 * Adaptive conversation flow that uses LLM for intelligent question selection
 *
 * NOTE: This module runs on the client side, so LLM calls must go through API routes.
 * Direct groq imports are avoided to prevent browser errors.
 */

import { detectTradeoffs } from './tradeoff-engine';

// LLM calls go through API to avoid browser issues
async function callLLM(messages: { role: string; content: string }[], temperature = 0.7): Promise<string> {
  try {
    const response = await fetch('/api/quick-plan/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature }),
    });

    if (!response.ok) {
      throw new Error('LLM API call failed');
    }

    const data = await response.json();
    return data.content || '';
  } catch (error) {
    console.warn('LLM call failed, using fallback:', error);
    return '';
  }
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
}

const FIELD_QUESTIONS: Record<string, FieldQuestionConfig> = {
  destination: {
    field: 'destination',
    snooMessage: pickTemplate(SNOO_TEMPLATES.greeting),
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
  budget: {
    field: 'budget',
    snooMessage: "What's your budget per night for accommodation? This helps me find the right hotels.",
    inputType: 'slider',
    getInputConfig: () => ({
      min: 50,
      max: 2500,
      step: 50,
      labels: {
        50: 'Budget',
        200: 'Mid-range',
        500: 'Luxury',
        1000: 'Ultra-luxury',
        2500: '$2.5K+',
      },
      // Special handling: values at max are treated as "X or more"
      maxMeansUnlimited: true,
    }),
    required: true,
    canInfer: false,
  },
  subreddits: {
    field: 'subreddits',
    snooMessage: "Which Reddit communities should I search? I've picked some based on your budget and trip style.",
    inputType: 'chips-multi',
    getInputConfig: (state) => {
      // Suggest subreddits based on budget, destination, and party composition
      const budget = state.preferences.budgetPerNight?.max || 200;
      const destination = (state.preferences.destinationContext?.canonicalName || state.preferences.destinationContext?.rawInput || '').toLowerCase();
      const hasChildren = (state.preferences.children || 0) > 0;
      const isSolo = state.preferences.adults === 1 && !hasChildren;

      console.log('[subreddits getInputConfig] Budget:', budget, 'HasChildren:', hasChildren, 'IsSolo:', isSolo);

      // Start with recommended options based on context
      const options: { id: string; label: string; icon: string; description: string }[] = [];

      // 1. Add destination-specific subreddits first (highest priority)
      if (destination.includes('dominican') || destination.includes('caribbean')) {
        options.push({ id: 'caribbean', label: 'r/caribbean', icon: '🏝️', description: 'Caribbean travelers' });
        options.push({ id: 'dominicanrepublic', label: 'r/DominicanRepublic', icon: '🇩🇴', description: 'DR specific advice' });
      }
      if (destination.includes('mexico')) {
        options.push({ id: 'mexico', label: 'r/mexico', icon: '🇲🇽', description: 'Mexico specific' });
        options.push({ id: 'rivieramaya', label: 'r/RivieraMaya', icon: '🏖️', description: 'Cancun/Tulum area' });
      }
      if (destination.includes('costa rica')) {
        options.push({ id: 'costarica', label: 'r/costarica', icon: '🦜', description: 'Costa Rica specific' });
      }
      if (destination.includes('thailand')) {
        options.push({ id: 'thailand', label: 'r/thailand', icon: '🇹🇭', description: 'Thailand specific' });
        options.push({ id: 'thailandtourism', label: 'r/ThailandTourism', icon: '🏝️', description: 'Thailand travel tips' });
      }

      // 2. Add party composition subreddits
      if (hasChildren) {
        options.push({ id: 'familytravel', label: 'r/familytravel', icon: '👨‍👩‍👧', description: 'Family trip tips' });
        options.push({ id: 'travelwithkids', label: 'r/travelwithkids', icon: '🧒', description: 'Traveling with children' });
      }
      if (isSolo) {
        options.push({ id: 'solotravel', label: 'r/solotravel', icon: '🎒', description: 'Solo traveler tips' });
      }

      // 3. Add budget-specific options (only if NOT family to avoid clutter)
      if (budget >= 400 && !hasChildren) {
        options.push({ id: 'luxurytravel', label: 'r/luxurytravel', icon: '💎', description: 'High-end experiences' });
        options.push({ id: 'fattravel', label: 'r/fattravel', icon: '🥂', description: 'No budget limits' });
      } else if (budget <= 150) {
        options.push({ id: 'budgettravel', label: 'r/budgettravel', icon: '💰', description: 'Money-saving tips' });
        options.push({ id: 'shoestring', label: 'r/shoestring', icon: '🎫', description: 'Ultra-budget travel' });
      }

      // 4. Always include general travel
      if (!options.some(o => o.id === 'travel')) {
        options.push({ id: 'travel', label: 'r/travel', icon: '✈️', description: 'General travel advice' });
      }
      options.push({ id: 'TravelHacks', label: 'r/TravelHacks', icon: '💡', description: 'Travel tips & tricks' });

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
        { id: 'chill', label: 'Chill', description: 'Lots of downtime, few planned activities' },
        { id: 'balanced', label: 'Balanced', description: 'Mix of activities and relaxation' },
        { id: 'packed', label: 'Action-packed', description: 'Something every day, make the most of it' },
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
      console.log('[activities getInputConfig] Children detected:', hasChildren, 'Ages:', childAges);

      let options = [
        { id: 'beach', label: 'Beach Days', icon: '🏖️' },
        { id: 'swimming', label: 'Swimming', icon: '🏊' },
        { id: 'snorkel', label: 'Snorkeling', icon: '🤿' },
        { id: 'wildlife', label: 'Wildlife', icon: '🐋' },
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

      // Add family-specific activities if kids present
      if (hasChildren) {
        const kidsOptions = [
          { id: 'kids_activities', label: 'Kids Activities', icon: '🎠' },
        ];

        // For older kids (8+), add more adventurous options
        if (childAges.some(age => age >= 8)) {
          kidsOptions.push(
            { id: 'water_park', label: 'Water Parks', icon: '🎢' }
          );
        }

        // Put kids options first
        options = [...kidsOptions, ...options];

        // Remove nightlife for family trips
        options = options.filter(o => o.id !== 'nightlife');
      } else {
        // Add nightlife for adult trips
        options.push({ id: 'nightlife', label: 'Nightlife', icon: '🎉' });
      }

      return {
        options,
        allowCustomText: true,
        customTextPlaceholder: 'Add another activity...',
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
        const baseNights = Math.floor(tripLength / areas.length);
        const extraNights = tripLength % areas.length;

        const evenStops = areas.map((area, idx) => ({
          areaId: area.id,
          areaName: area.name,
          nights: baseNights + (idx === areas.length - 1 ? extraNights : 0),
          area,
        }));

        splitOptions.push(createItinerarySplit(
          'even-split',
          evenStops.map(s => `${s.nights}n ${s.areaName}`).join(' → '),
          evenStops,
          0.9,
          areas
        ));

        // Option with more time in first area
        if (tripLength >= areas.length * 2) {
          const focusStops = areas.map((area, idx) => ({
            areaId: area.id,
            areaName: area.name,
            nights: idx === 0 ? baseNights + 2 : (idx === areas.length - 1 ? baseNights + extraNights - 2 : baseNights),
            area,
          }));
          splitOptions.push(createItinerarySplit(
            'focus-first',
            focusStops.map(s => `${s.nights}n ${s.areaName}`).join(' → '),
            focusStops,
            0.85,
            areas
          ));
        }
      }

      // If no options generated (shouldn't happen), create a default
      if (splitOptions.length === 0 && areas.length > 0) {
        console.warn('[Split getInputConfig] No options generated, creating default');
        const nightsPerArea = Math.floor(tripLength / areas.length);
        const remainder = tripLength % areas.length;
        const defaultStops = areas.map((area, idx) => ({
          areaId: area.id,
          areaName: area.name,
          nights: nightsPerArea + (idx === areas.length - 1 ? remainder : 0),
          area,
        }));
        splitOptions.push(createItinerarySplit(
          'default-split',
          defaultStops.map(s => `${s.nights}n ${s.areaName}`).join(' → '),
          defaultStops,
          0.8,
          areas
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
            return { mode: 'none' };
          }
        }
      }
      return null;
    },
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
        budget: 'unknown',
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
    console.log('[Orchestrator] Reset to initial state');
  }

  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================

  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const fullMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  // ============================================================================
  // CONFIDENCE TRACKING
  // ============================================================================

  setConfidence(field: keyof OrchestratorState['confidence'], level: ConfidenceLevel): void {
    this.state.confidence[field] = level;
    this.log('orchestrator', `Confidence updated: ${field} = ${level}`, { field, level });
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
    if (this.state.confidence.budget === 'unknown') missing.push('budget');
    if (this.state.confidence.activities === 'unknown') missing.push('activities');

    // Ask which subreddits to search after activities
    if (this.state.confidence.activities !== 'unknown' &&
        !(this.state.preferences as any).selectedSubreddits) {
      missing.push('subreddits');
    }

    // Areas required after initial gathering
    if (this.state.phase !== 'gathering' && this.state.confidence.areas === 'unknown') {
      missing.push('areas');
    }

    // Split required after areas selected (how many nights in each area)
    // CRITICAL: Must check for valid split with actual stops, not just truthy value
    const areasComplete = this.state.confidence.areas === 'complete';
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
      selectedAreasCount: this.state.preferences.selectedAreas?.length || 0,
    });

    // Only skip split question if user has explicitly selected a split (not auto-generated)
    if (areasComplete && !hasValidUserSelectedSplit) {
      console.log('[getMissingRequiredFields] >>> ADDING SPLIT TO MISSING FIELDS <<<');
      missing.push('split');
    } else if (areasComplete && hasValidUserSelectedSplit) {
      console.log('[getMissingRequiredFields] User already selected split:', split?.name);
    }

    // Hotel preferences required after split is selected
    // IMPORTANT: Only ask hotelPreferences if user has EXPLICITLY selected a split (not auto-generated)
    const shouldAskHotelPrefs = this.state.confidence.areas === 'complete' &&
        hasValidUserSelectedSplit &&
        !(this.state.preferences as any).hotelPreferences;
    console.log('[getMissingRequiredFields] HotelPreferences check:', {
      areasConfidence: this.state.confidence.areas,
      hasValidUserSelectedSplit,
      hasHotelPreferences: !!(this.state.preferences as any).hotelPreferences,
      shouldAskHotelPrefs,
    });
    if (shouldAskHotelPrefs) {
      missing.push('hotelPreferences');
    }

    // DEBUG: Warn if hotelPreferences is added without a valid user-selected split
    if (!hasValidUserSelectedSplit && missing.includes('hotelPreferences')) {
      console.error('[getMissingRequiredFields] BUG: hotelPreferences added without valid user-selected split!');
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

    // Cuisine preferences required when diningMode is 'plan'
    const wantsDiningHelp = this.state.preferences.diningMode === 'plan';
    console.log('[getMissingRequiredFields] Dining check:', {
      diningMode: this.state.preferences.diningMode,
      diningConfidence: this.state.confidence.dining,
      wantsDiningHelp,
      hasCuisinePreferences: !!(this.state.preferences as any).cuisinePreferences,
    });

    if (wantsDiningHelp &&
        this.state.confidence.dining === 'complete' &&
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
        return FIELD_QUESTIONS.satisfaction ? this.createQuestionConfig('satisfaction') : null;
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

    const config = this.createQuestionConfig(nextField);
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
    // This is critical - split MUST be asked before hotelPreferences
    const priority = ['destination', 'dates', 'party', 'budget', 'pace', 'activities', 'subreddits', 'vibe', 'areas', 'split', 'hotelPreferences', 'hotels', 'dining', 'cuisinePreferences', 'restaurants', 'experiences'];

    for (const field of priority) {
      if (candidates.includes(field)) {
        console.log('[decideNextField] Selected from priority:', field, '(index', priority.indexOf(field), ')');
        return field;
      }
    }

    console.log('[decideNextField] Fallback to first candidate:', candidates[0]);
    return candidates[0];
  }

  private buildNextFieldPrompt(candidates: string[]): string {
    const destination = this.state.preferences.destinationContext?.canonicalName || 'unknown';
    const known = this.summarizeKnownPreferences();

    return `Planning a trip to ${destination}.

What we already know:
${known}

What should we ask about next to make the best trip plan?
Options: ${candidates.join(', ')}

Consider: What's most impactful for personalizing the trip? What builds on what we already know?

Respond with just the field name.`;
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

  private createQuestionConfig(field: string): QuestionConfig {
    console.log('[createQuestionConfig] Creating question for field:', field);

    const config = FIELD_QUESTIONS[field];
    if (!config) {
      throw new Error(`Unknown field: ${field}`);
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
        const inferredDining = value as { mode: string };
        this.state.preferences.diningMode = inferredDining.mode as DiningMode;
        this.setConfidence('dining', 'inferred');
        break;
    }
  }

  // ============================================================================
  // PROCESS USER RESPONSE
  // ============================================================================

  processUserResponse(questionId: string, response: unknown): void {
    const field = this.state.currentQuestion?.field;
    if (!field) return;

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
        break;

      case 'dates':
        const dates = response as { startDate: Date; endDate: Date; nights: number; isFlexible: boolean };
        this.state.preferences.startDate = dates.startDate;
        this.state.preferences.endDate = dates.endDate;
        this.state.preferences.tripLength = dates.nights;
        this.state.preferences.isFlexibleDates = dates.isFlexible;
        this.setConfidence('dates', 'complete');
        break;

      case 'party':
        const party = response as { adults: number; children: number; childAges: number[] };
        this.state.preferences.adults = party.adults;
        this.state.preferences.children = party.children;
        this.state.preferences.childAges = party.childAges;
        this.setConfidence('party', 'confirmed');
        break;

      case 'budget':
        const budget = response as { value: number; label: string };
        // If user selected max value (2500), treat as unlimited (no upper bound in search)
        const isUnlimited = budget.value >= 2500;
        this.state.preferences.budgetPerNight = {
          min: Math.max(50, budget.value - 100),
          max: isUnlimited ? 999999 : budget.value + 100,
        };
        (this.state.preferences as any).budgetUnlimited = isUnlimited;
        this.setConfidence('budget', 'complete');
        break;

      case 'subreddits':
        const subreddits = response as { id: string; label: string }[];
        (this.state.preferences as any).selectedSubreddits = subreddits.map(s => s.id);
        (this.state.preferences as any).subredditsComplete = true; // Mark as answered
        break;

      case 'pace':
        const pace = response as { id: string; label: string };
        this.state.preferences.pace = pace.id as 'chill' | 'balanced' | 'packed';
        this.setConfidence('vibe', 'complete'); // Pace answers the vibe question
        break;

      case 'activities':
        const activities = response as { id: string; label: string; isCustom?: boolean }[];
        this.state.preferences.selectedActivities = activities.map(a => ({
          type: a.id as TripPreferences['selectedActivities'][0]['type'],
          priority: 'must-do' as const,
          // Preserve custom activity info for smart matching
          ...(a.isCustom ? { isCustom: true, customLabel: a.label } : {}),
        }));
        this.setConfidence('activities', 'complete');

        // After activities, detect tradeoffs
        this.detectTradeoffs();
        break;

      case 'vibe':
        const vibe = response as string;
        // Parse must-dos and hard-nos from free text
        this.state.preferences.mustDos = [];
        this.state.preferences.hardNos = [];
        if (vibe) {
          // Simple parsing - could be enhanced with LLM
          if (vibe.toLowerCase().includes('must')) {
            this.state.preferences.mustDos.push(vibe);
          } else if (vibe.toLowerCase().includes('no ') || vibe.toLowerCase().includes("don't")) {
            this.state.preferences.hardNos.push(vibe);
          }
        }
        this.setConfidence('vibe', 'complete');
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
        break;

      case 'split':
        this.state.preferences.selectedSplit = response as TripPreferences['selectedSplit'];
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

      case 'cuisinePreferences':
        const cuisinePrefs = response as { id: string; label: string }[];
        (this.state.preferences as any).cuisinePreferences = cuisinePrefs.map(c => c.id);
        console.log('[Orchestrator] Cuisine preferences set:', (this.state.preferences as any).cuisinePreferences);
        break;

      case 'restaurants':
        const restaurants = response as RestaurantCandidate[];
        // Get the current cuisine type from the question config
        const currentCuisineType = (this.state.currentQuestion?.inputConfig as any)?.cuisineType;

        console.log(`[Orchestrator] Restaurant response received:`, {
          restaurantCount: restaurants?.length,
          cuisineType: currentCuisineType,
        });

        if (!currentCuisineType) {
          console.error('[Orchestrator] No cuisineType in restaurant question config');
        } else if (restaurants && restaurants.length > 0) {
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
        const currentActivityType = (this.state.currentQuestion?.inputConfig as any)?.activityType;

        console.log(`[Orchestrator] Experience response received:`, {
          experienceCount: experiences?.length,
          activityType: currentActivityType,
        });

        if (!currentActivityType) {
          console.error('[Orchestrator] No activityType in experience question config');
        } else if (experiences && experiences.length > 0) {
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

    // Map reasons to actions - reset specific confidence levels to trigger regeneration
    for (const reason of reasons) {
      switch (reason) {
        case 'wrong_areas':
          // Go back to area discovery
          this.setConfidence('areas', 'unknown');
          this.state.discoveredData.areas = [];
          this.state.phase = 'enriching';
          break;

        case 'wrong_vibe':
          // Clear vibe preferences to re-ask
          this.state.preferences.vibes = undefined;
          this.setConfidence('activities', 'unknown');
          this.state.phase = 'gathering';
          break;

        case 'too_packed':
        case 'too_chill':
          // Adjust pace preference
          this.state.preferences.pace = reason === 'too_packed' ? 'chill' : 'packed';
          this.state.phase = 'generating';
          break;

        case 'hotel_wrong':
          // Go back to hotel selection
          this.setConfidence('hotels', 'unknown');
          this.state.discoveredData.hotels.clear();
          this.state.phase = 'gathering';
          break;

        case 'dining_wrong':
          // Re-ask dining preferences
          this.state.preferences.diningMode = undefined;
          this.setConfidence('dining', 'unknown');
          this.state.phase = 'gathering';
          break;

        case 'too_touristy':
          // Store preference for off-beaten-path
          this.state.preferences.avoidTouristy = true;
          this.state.phase = 'generating';
          break;

        case 'missing_activity':
          // Store custom feedback for activity addition
          if (customFeedback) {
            this.state.preferences.mustIncludeActivities =
              this.state.preferences.mustIncludeActivities || [];
            this.state.preferences.mustIncludeActivities.push(customFeedback);
          }
          this.state.phase = 'generating';
          break;

        default:
          // For 'other' or unknown reasons, use custom feedback
          if (customFeedback) {
            this.state.preferences.customFeedback = customFeedback;
          }
          this.state.phase = 'generating';
      }
    }

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
      },
      messages: this.state.messages,
      currentQuestion: this.state.currentQuestion,
      itinerary: this.state.itinerary,
    };
  }

  static fromJSON(json: ReturnType<QuickPlanOrchestrator['toJSON']>): QuickPlanOrchestrator {
    const data = json as any;
    return new QuickPlanOrchestrator({
      ...data,
      discoveredData: {
        areas: data.discoveredData.areas,
        hotels: new Map(data.discoveredData.hotels),
        activities: data.discoveredData.activities,
        restaurants: new Map(data.discoveredData.restaurants),
      },
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createOrchestrator(initialState?: Partial<OrchestratorState>): QuickPlanOrchestrator {
  return new QuickPlanOrchestrator(initialState);
}

export { SNOO_TEMPLATES, FIELD_QUESTIONS };
