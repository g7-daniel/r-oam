/**
 * Quick Plan Types
 * Complete type definitions for the Quick Plan guided wizard
 */

// ============================================================================
// STATE MACHINE
// ============================================================================

export type QuickPlanState =
  | 'DESTINATION'
  | 'DATES_OR_LENGTH'
  | 'PARTY'
  | 'BUDGET'
  | 'VIBE_AND_HARD_NOS'
  | 'ACTIVITIES_PICK'
  | 'ACTIVITY_INTENSITY'
  | 'TRADEOFFS_RESOLUTION'
  | 'AREA_DISCOVERY'
  | 'AREA_SPLIT_SELECTION'
  | 'PREFERENCES_REVIEW_LOCK'
  | 'HOTELS_SHORTLIST_AND_PICK'
  | 'DINING_MODE'
  | 'DINING_SHORTLIST_AND_PICK'
  | 'DAILY_ITINERARY_BUILD'
  | 'QUALITY_SELF_CHECK'
  | 'FINAL_REVIEW_AND_EDIT_LOOP'
  | 'SATISFACTION_GATE';

export const STATE_ORDER: QuickPlanState[] = [
  'DESTINATION',
  'DATES_OR_LENGTH',
  'PARTY',
  'BUDGET',
  'VIBE_AND_HARD_NOS',
  'ACTIVITIES_PICK',
  'ACTIVITY_INTENSITY',
  'TRADEOFFS_RESOLUTION',
  'AREA_DISCOVERY',
  'AREA_SPLIT_SELECTION',
  'PREFERENCES_REVIEW_LOCK',
  'HOTELS_SHORTLIST_AND_PICK',
  'DINING_MODE',
  'DINING_SHORTLIST_AND_PICK',
  'DAILY_ITINERARY_BUILD',
  'QUALITY_SELF_CHECK',
  'FINAL_REVIEW_AND_EDIT_LOOP',
  'SATISFACTION_GATE',
];

// States that can be skipped based on conditions
export const CONDITIONAL_STATES: Partial<Record<QuickPlanState, (prefs: TripPreferences) => boolean>> = {
  'ACTIVITY_INTENSITY': (prefs) => prefs.selectedActivities.length > 0,
  'TRADEOFFS_RESOLUTION': (prefs) => prefs.detectedTradeoffs.length > 0,
  'AREA_DISCOVERY': (prefs) => prefs.destinationContext?.type !== 'city',
  'DINING_SHORTLIST_AND_PICK': (prefs) => prefs.diningMode !== 'none',
};

// ============================================================================
// DESTINATION CONTEXT
// ============================================================================

export type DestinationType = 'country' | 'region' | 'city' | 'resort';

export interface DestinationContext {
  rawInput: string;
  canonicalName: string;
  type: DestinationType;
  countryCode: string;
  countryName: string;
  centerLat: number;
  centerLng: number;
  timezone: string;
  suggestedAreas: AreaCandidate[];
  googlePlaceId?: string;
}

// ============================================================================
// TRIP PREFERENCES
// ============================================================================

export type PaceLevel = 'chill' | 'balanced' | 'packed';
export type DiningMode = 'none' | 'list' | 'schedule' | 'plan';
export type PriceConfidence = 'real' | 'estimated' | 'rough' | 'unknown';

// Trip occasion/purpose for personalization
export type TripOccasion =
  | 'vacation'      // Regular vacation
  | 'honeymoon'     // Honeymoon - prioritize romantic, adults-only
  | 'anniversary'   // Anniversary - special occasions, splurge experiences
  | 'bachelor'      // Bachelor/Bachelorette - party-friendly, group activities
  | 'wedding'       // Attending a wedding - proximity to venue, group coordination
  | 'family_reunion'// Family reunion - multi-room, all-ages activities
  | 'workation'     // Work + Travel - WiFi, co-working, quiet workspace
  | 'wellness'      // Wellness retreat - spa, yoga, meditation focus
  | 'solo_adventure'// Solo adventure - social hostels, safety tips
  | 'girls_trip'    // Girls trip - group friendly, spa, brunch spots
  | 'guys_trip';    // Guys trip - sports bars, adventure activities

// Accommodation type preference
export type AccommodationType =
  | 'hotel'         // Standard hotels
  | 'hostel'        // Hostels/budget accommodation
  | 'vacation_rental' // Airbnb, VRBO, vacation homes
  | 'resort'        // All-inclusive or resort-style
  | 'eco_lodge'     // Eco-friendly/sustainable lodges
  | 'boutique'      // Boutique/unique hotels
  | 'villa';        // Private villas for groups

// Pet travel information
export interface PetInfo {
  hasPet: boolean;
  petType?: 'dog' | 'cat' | 'other';
  petSize?: 'small' | 'medium' | 'large'; // Under 25lb, 25-50lb, 50lb+
  petName?: string;
}

// Sustainability preference level
export type SustainabilityPreference = 'standard' | 'eco_conscious' | 'eco_focused';

// ============================================================================
// FREE-TEXT INPUT & SMART FOLLOW-UPS (Phase 1 Critical)
// ============================================================================

// User notes attached to any field for nuanced preferences
export interface UserNote {
  field: string;
  note: string;
  timestamp: Date;
}

// Workation/remote work needs
export interface WorkationNeeds {
  requiresWorkspace: boolean;
  wifiSpeed: 'basic' | 'fast' | 'excellent'; // 10mbps, 50mbps, 100mbps+
  workHoursPerDay?: number;
  needsCoworking?: boolean;
  needsQuietSpace?: boolean;
  needsReliablePower?: boolean;
}

// Child-specific needs and concerns
export interface ChildNeeds {
  scaredOfHeights?: boolean;
  scaredOfWater?: boolean;
  scaredOfDark?: boolean;
  scaredOfLoudNoises?: boolean;
  pickyEater?: boolean;
  needsNaps?: boolean;
  animalLover?: boolean;
  customNotes?: string;
}

// Surfing details for skill-appropriate recommendations
export type SurfingLevel = 'never' | 'beginner' | 'intermediate' | 'advanced' | 'watch_only';
export interface SurfingDetails {
  level: SurfingLevel;
  wantsLessons?: boolean;
  wantsRental?: boolean;
  preferredWaveType?: 'beach_break' | 'reef_break' | 'point_break' | 'any';
  avoidCrowds?: boolean;
}

// Safety context for special considerations
export interface SafetyContext {
  isSoloFemale?: boolean;
  hasSevereAllergies?: boolean;
  allergyTypes?: string[];
  needsHospitalProximity?: boolean;
  mobilityLimitations?: string;
}

// Theme park preferences
export interface ThemeParkPreferences {
  parks?: string[]; // 'disney', 'universal', etc.
  childFears?: string[]; // 'fast_rides', 'dark_rides', 'heights'
  wantsCharacterDining?: boolean;
  hasGeniePlus?: boolean;
  preferredPace?: 'relaxed' | 'moderate' | 'aggressive';
}

export interface TripPreferences {
  // Destination
  destinationContext: DestinationContext | null;

  // Dates
  startDate: Date | null;
  endDate: Date | null;
  tripLength: number; // nights
  monthWindow?: string; // e.g., "March 2026"
  isFlexibleDates: boolean;

  // Party
  adults: number;
  children: number;
  childAges: number[];
  estimatedRoomsNeeded?: number; // For groups > 4 people

  // Trip occasion/purpose
  tripOccasion?: TripOccasion;

  // Pets
  travelingWithPets?: PetInfo;

  // Budget
  budgetPerNight: { min: number; max: number };
  flexNights: number; // nights where higher budget is OK
  totalBudget?: number;

  // Accommodation preferences
  accommodationType?: AccommodationType;
  sustainabilityPreference?: SustainabilityPreference;

  // Vibe
  pace: PaceLevel;
  mustDos: string[]; // up to 5
  hardNos: string[]; // up to 5

  // Activities
  selectedActivities: ActivityIntent[];
  activitySkillLevel?: 'beginner' | 'intermediate' | 'advanced';

  // Hotel preferences
  adultsOnlyRequired: boolean;
  adultsOnlyPreferred: boolean;
  allInclusivePreferred: boolean;
  hotelVibePreferences: string[]; // 'quiet', 'party', 'beach', 'city', etc.
  hotelPreferences?: string[]; // Selected amenities like 'pool', 'spa', 'gym', etc.

  // Accessibility preferences
  accessibilityNeeds?: {
    wheelchairAccessible?: boolean;
    groundFloorRequired?: boolean;
    elevatorRequired?: boolean;
    mobilityAids?: boolean;
    visualAssistance?: boolean;
    hearingAssistance?: boolean;
    noStairs?: boolean;
  };

  // Subreddit preferences
  selectedSubreddits?: string[];
  subredditsComplete?: boolean;

  // Budget extras
  budgetUnlimited?: boolean; // True if user selected max budget (no upper limit)

  // Dining preferences
  diningMode: DiningMode;
  diningImportance: 'low' | 'medium' | 'high';
  diningVibes: string[]; // 'quiet', 'lively', 'romantic', etc.
  budgetPerMeal: { min: number; max: number };
  dietaryRestrictions: string[];
  cuisinePreferences?: string[]; // Selected cuisine types like 'italian', 'sushi', etc.
  selectedRestaurants?: Record<string, RestaurantCandidate[]>; // By cuisine type
  selectedExperiences?: Record<string, VerifiedActivity[]>; // By activity type

  // Tradeoffs
  detectedTradeoffs: Tradeoff[];
  resolvedTradeoffs: TradeoffResolution[];

  // Areas (after discovery)
  selectedAreas: AreaCandidate[];
  selectedSplit: ItinerarySplit | null;
  maxBases: number; // 1-3

  // Hotel selections (by area ID)
  selectedHotels?: Record<string, HotelCandidate>;

  // Satisfaction feedback (for surgical regeneration)
  avoidTouristy?: boolean;
  mustIncludeActivities?: string[];
  customFeedback?: string;
  vibes?: string[]; // general trip vibes like 'adventure', 'relaxing', 'cultural'

  // Phase 1 Critical: Free-text notes and smart follow-ups
  userNotes?: UserNote[];
  workationNeeds?: WorkationNeeds;
  childNeeds?: ChildNeeds;
  surfingDetails?: SurfingDetails;
  safetyContext?: SafetyContext;
  themeParkPreferences?: ThemeParkPreferences;

  // Lock status
  preferencesLocked: boolean;
}

// ============================================================================
// ACTIVITIES
// ============================================================================

// FIX 3.11: Expanded activity types for better trip matching
export type ActivityType =
  | 'surf'
  | 'snorkel'
  | 'dive'
  | 'swimming'
  | 'water_sports'
  | 'wildlife'
  | 'hiking'
  | 'adventure'
  | 'cultural'
  | 'food_tour'
  | 'cooking_class'      // Added
  | 'nightlife'
  | 'beach'
  | 'spa_wellness'
  | 'yoga'               // Added
  | 'meditation'         // Added
  | 'golf'
  | 'shopping'
  | 'photography'
  | 'wine_tasting'       // Added
  | 'music_festival'     // Added
  | 'temple_visit'       // Added
  | 'full_moon_party'    // Added
  | 'rock_climbing'      // Added
  | 'kayaking'           // Added
  | 'paddleboarding'     // Added
  | 'fishing'            // Added
  | 'sailing'            // Added
  | 'cycling'            // Added
  | 'skiing'             // Added
  | 'snowboarding';      // Added

export interface ActivityIntent {
  type: ActivityType;
  priority: 'must-do' | 'nice-to-have';

  // Intensity parameters (varies by activity)
  targetDays?: number; // e.g., surfDays = 8
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';

  // Activity-specific flags
  calmWaterRequired?: boolean; // for swimming/snorkeling
  mustBeInSeason?: boolean; // for wildlife
  maxExcursionDays?: number; // for adventure
  toleranceForRoughConditions?: boolean; // for surf
}

// Effort costs for intensity budgeting
export const ACTIVITY_EFFORT_COSTS: Record<string, number> = {
  'travel_day_baseline': 2,
  'surf_session': 2,
  'half_day_tour': 2.5,
  'full_day_tour': 4,
  'dinner_reservation': 0.5,
  'beach_day': 1,
  'spa_session': 1,
  'museum_visit': 1.5,
  'nightlife': 1.5,
  'hiking_easy': 2,
  'hiking_moderate': 3,
  'diving': 3,
  'snorkeling': 1.5,
};

// Daily effort budgets by pace
export const DAILY_EFFORT_BUDGET: Record<PaceLevel, number> = {
  chill: 3,
  balanced: 4,
  packed: 5,
};

// ============================================================================
// TRADEOFFS
// ============================================================================

export type TradeoffType =
  | 'calm_water_vs_surf'
  | 'one_base_vs_many_regions'
  | 'adults_only_vs_nightlife'
  | 'no_long_drives_vs_multi_stop'
  | 'beach_vs_adventure'
  | 'budget_vs_luxury_areas'
  | 'family_friendly_vs_party';

export interface Tradeoff {
  id: string;
  type: TradeoffType;
  title: string;
  description: string;
  conflictingPreferences: string[];
  resolutionOptions: TradeoffOption[];
}

export interface TradeoffOption {
  id: string;
  label: string;
  description: string;
  impact: string; // What this choice means for the trip
}

export interface TradeoffResolution {
  tradeoffId: string;
  selectedOptionId: string;
  customInput?: string; // If user chose "Custom"
  resolvedAt: Date;
}

// ============================================================================
// AREAS
// ============================================================================

export interface AreaCandidate {
  id: string;
  name: string;
  type: 'town' | 'beach' | 'neighborhood' | 'region';
  description: string;

  // Location
  centerLat: number;
  centerLng: number;
  googlePlaceId?: string;

  // Fit scores
  activityFitScore: number; // 0-1, how well it matches selected activities
  vibeFitScore: number; // 0-1, how well it matches vibe preferences
  budgetFitScore: number; // 0-1, how well it matches budget
  overallScore: number; // weighted combination

  // Tags derived from activities
  bestFor: string[]; // e.g., ['surf', 'nightlife', 'beach']
  notIdealFor: string[]; // e.g., ['calm water', 'family']
  whyItFits: string[]; // Reasons this area matches the user's preferences
  caveats: string[]; // Any warnings or considerations for this area

  // Evidence
  evidence: Evidence[];
  confidenceScore: number;

  // Practical info
  suggestedNights: number;
  travelTimeFromAirport?: string;
  travelTimeToOtherAreas?: Record<string, string>;

  // Hotel availability (added by validation)
  hotelCount?: number; // Number of hotels found in this area
  lowHotelInventory?: boolean; // True if hotel count is below threshold
  needsHotelIndexing?: boolean; // True if hotels should be indexed for this area
}

export interface ItinerarySplit {
  id: string;
  name: string; // e.g., "2 bases: Punta Cana (4n) + Samana (3n)"
  description?: string; // Optional longer description
  stops: ItineraryStop[];

  // Scores
  fitScore: number; // How well it matches preferences
  frictionScore: number; // Travel friction (lower is better)
  feasibilityScore: number; // Given constraints

  // Description
  whyThisWorks: string;
  tradeoffs: string[];
}

export interface ItineraryStop {
  areaId: string;
  area: AreaCandidate;
  nights: number;
  order: number;
  arrivalDay: number;
  departureDay: number;
  isArrivalCity: boolean;
  isDepartureCity: boolean;
  travelDayBefore: boolean;
}

// ============================================================================
// HOTELS
// ============================================================================

// FIX 4.5: Recommendation explanation for transparency
export interface RecommendationExplanation {
  mainReason: string;
  factors: {
    factor: string;
    weight: number;
    value: string;
  }[];
  sources: string[];
}

export interface HotelCandidate {
  id: string;
  placeId: string; // Google place_id - CANONICAL ID
  name: string;

  // Location
  address: string;
  googleMapsUrl?: string; // Direct link to Google Maps
  city: string;
  lat: number;
  lng: number;
  distanceToCenter: number;

  // Ratings
  googleRating: number;
  reviewCount: number;
  stars: number;

  // Pricing
  pricePerNight: number | null;
  totalPrice: number | null;
  currency: string;
  priceConfidence: PriceConfidence;
  priceSource: 'booking.com' | 'amadeus' | 'estimate' | 'makcorps' | 'google';
  priceComparison?: {
    cheapest: { vendor: string; price: number };
    alternatives: Array<{ vendor: string; price: number }>;
  };

  // Attributes
  isAdultsOnly: boolean;
  isAllInclusive: boolean;
  amenities: string[];
  imageUrl: string | null;

  // Scoring
  redditScore: number; // from Reddit mentions
  overallScore: number; // weighted combination

  // Evidence
  evidence: Evidence[];
  reasons: string[]; // Why this hotel fits

  // User status
  userStatus: 'default' | 'selected' | 'must' | 'never';

  // Accessibility (estimated)
  accessibilityScore?: number; // 0-100 likelihood score
  likelyAccessible?: boolean; // true if score >= 60
  accessibilityNotes?: string[]; // Features and warnings

  // Large group support
  estimatedRoomsNeeded?: number; // For groups > 4 people
  estimatedTotalPrice?: number; // pricePerNight * roomsNeeded
  largeGroupNote?: string; // Tip for large groups (e.g., "Consider a villa")

  // FIX 4.5: Why this recommendation
  explanation?: RecommendationExplanation;
}

export interface HotelShortlist {
  stopId: string;
  areaName: string;
  hotels: HotelCandidate[];
  selectedHotelId: string | null; // User's choice
  defaultHotelId: string; // Auto-selected default
}

// ============================================================================
// RESTAURANTS / DINING
// ============================================================================

export interface RestaurantCandidate {
  id: string;
  placeId: string; // Google place_id - CANONICAL ID
  name: string;

  // Location
  address: string;
  googleMapsUrl?: string; // Direct link to Google Maps
  lat: number;
  lng: number;
  nearArea?: string; // Which area/hotel this restaurant is near
  distanceFromHotel?: number; // Distance in km from the selected hotel

  // Info
  cuisine: string[];
  priceLevel: number; // 1-4
  googleRating: number;
  reviewCount: number;
  imageUrl: string | null;

  // Scheduling
  openingHours?: string[];
  requiresReservation: boolean;
  bestFor: ('lunch' | 'dinner' | 'brunch')[];

  // Evidence
  redditScore: number;
  evidence: Evidence[];
  reasons: string[];

  // Booking difficulty
  bookingDifficulty?: 'easy' | 'moderate' | 'hard' | 'very_hard';
  bookingAdvice?: string; // "Book 2 months ahead", "Walk-in OK"

  // User status
  userStatus: 'default' | 'selected' | 'must' | 'never';
}

export interface DiningPlan {
  mode: DiningMode;
  restaurantsByStop: Record<string, RestaurantCandidate[]>;
  scheduledDinners: ScheduledDinner[];
  freeNights: number[]; // Day numbers with no scheduled dinner
}

export interface ScheduledDinner {
  dayNumber: number;
  restaurantId: string;
  restaurant: RestaurantCandidate;
  notes?: string;
}

// ============================================================================
// ITINERARY
// ============================================================================

export interface QuickPlanItinerary {
  id: string;

  // Structure
  stops: ItineraryStop[];
  days: QuickPlanDay[];

  // Hotels & Dining
  hotelShortlists: HotelShortlist[];
  diningPlan: DiningPlan;

  // Evidence & Confidence
  evidenceRefs: Evidence[];
  confidenceSummary: ConfidenceSummary;

  // Quality check results
  qualityCheckPassed: boolean;
  unmetConstraints: UnmetConstraint[];

  // Generation metadata
  generatedAt: Date;
  generationLayer: 'skeleton' | 'hotels' | 'dining' | 'daily' | 'complete';
}

export interface QuickPlanDay {
  dayNumber: number;
  date: string;
  stopId: string;

  // Schedule
  morning: DayBlock | null;
  afternoon: DayBlock | null;
  evening: DayBlock | null;

  // Metadata
  isTransitDay: boolean;
  transitInfo?: TransitInfo;
  effortPoints: number;
  notes?: string;
}

export interface DayBlock {
  id: string;
  type: 'activity' | 'meal' | 'transit' | 'rest' | 'free';
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  effortCost: number;

  // Location
  location?: {
    name: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  };

  // References
  activityId?: string;
  restaurantId?: string;
  hotelId?: string;

  // Evidence
  evidence?: Evidence[];
}

export interface TransitInfo {
  from: string;
  to: string;
  mode: 'drive' | 'taxi' | 'bus' | 'flight' | 'ferry';
  duration: string;
  distance: string;
  cost?: number;
}

// ============================================================================
// EVIDENCE
// ============================================================================

export type EvidenceType = 'reddit_thread' | 'google_place' | 'amadeus_hotel' | 'booking_com' | 'llm_inference';

export interface Evidence {
  type: EvidenceType;

  // Reddit
  redditUrl?: string;
  subreddit?: string;
  postTitle?: string;
  score?: number;
  snippet?: string; // 1-2 line max
  commentIds?: string[];

  // Google
  googlePlaceId?: string;
  googleRating?: number;
  googleReviewCount?: number;
  googlePriceLevel?: number;
  photoRef?: string;

  // Amadeus
  amadeusHotelId?: string;
  amadeusPrice?: number;
  amadeusCurrency?: string;
  amadeusDates?: { checkIn: string; checkOut: string };
  amadeusAvailability?: boolean;

  // LLM
  promptHash?: string;
  rationale?: string;
}

export interface ConfidenceSummary {
  overall: number; // 0-1
  byCategory: {
    areas: number;
    hotels: number;
    restaurants: number;
    activities: number;
    schedule: number;
  };
  lowConfidenceItems: string[];
  unknownPrices: string[];
}

// ============================================================================
// QUALITY CHECK
// ============================================================================

export interface QualityCheckResult {
  passed: boolean;
  checks: QualityCheck[];
  criticalFailures: string[];
  warnings: string[];
}

export interface QualityCheck {
  id: string;
  name: string;
  passed: boolean;
  details?: string;
}

export interface UnmetConstraint {
  type: 'must_do_missing' | 'hard_no_included' | 'activity_count_mismatch' |
        'travel_time_exceeded' | 'adults_only_violated' | 'missing_canonical_id' |
        'unknown_price' | 'effort_budget_exceeded';
  description: string;
  severity: 'critical' | 'warning';
  suggestedFix?: string;
}

// ============================================================================
// SATISFACTION GATE
// ============================================================================

export type SatisfactionLevel = 'yes' | 'almost' | 'no';

export interface SatisfactionResponse {
  level: SatisfactionLevel;

  // If "almost" - what's wrong
  issueCategories?: SatisfactionIssueCategory[];
  specificIssues?: string[];

  // Quick edit requests
  editRequests?: QuickEditRequest[];
}

export type SatisfactionIssueCategory =
  | 'too_many_activities'
  | 'not_enough_activities'
  | 'wrong_areas'
  | 'hotel_issues'
  | 'dining_issues'
  | 'pace_issues'
  | 'budget_issues'
  | 'missing_must_do'
  | 'other';

export interface QuickEditRequest {
  type: 'increase_surf_days' | 'decrease_surf_days' | 'reduce_transfers' |
        'more_chill' | 'more_packed' | 'upgrade_hotels' | 'downgrade_hotels' |
        'switch_dining_mode' | 'remove_activity' | 'add_activity' |
        'change_area' | 'extend_stay' | 'shorten_stay';
  value?: string | number;
}

// ============================================================================
// QUICK PLAN STORE STATE
// ============================================================================

export interface QuickPlanStoreState {
  // Current state
  currentState: QuickPlanState;
  stateHistory: QuickPlanState[];

  // Preferences (built up through wizard)
  preferences: TripPreferences;

  // Generated content
  areaOptions: AreaCandidate[];
  splitOptions: ItinerarySplit[];
  itinerary: QuickPlanItinerary | null;

  // Quality & Satisfaction
  qualityCheckResult: QualityCheckResult | null;
  satisfactionResponses: SatisfactionResponse[];
  iterationCount: number;

  // UI state
  isGenerating: boolean;
  generationProgress: number;
  currentGenerationLayer: string;
  errors: string[];

  // Chat transcript
  chatMessages: QuickPlanChatMessage[];

  // Persistence
  sessionId: string;
  startedAt: Date;
  lastUpdatedAt: Date;
}

export interface QuickPlanChatMessage {
  id: string;
  role: 'system' | 'assistant' | 'user';
  content: string;
  timestamp: Date;
  stateAtTime: QuickPlanState;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface DiscoverAreasRequest {
  destination: DestinationContext;
  preferences: Partial<TripPreferences>;
}

export interface DiscoverAreasResponse {
  areas: AreaCandidate[];
  splits: ItinerarySplit[];
}

export interface GenerateSkeletonRequest {
  preferences: TripPreferences;
  selectedSplit: ItinerarySplit;
}

export interface GenerateSkeletonResponse {
  itinerary: QuickPlanItinerary;
}

export interface ValidatePlaceRequest {
  name: string;
  type: 'hotel' | 'restaurant' | 'activity';
  nearLat: number;
  nearLng: number;
}

export interface ValidatePlaceResponse {
  found: boolean;
  candidate?: HotelCandidate | RestaurantCandidate;
  alternatives?: (HotelCandidate | RestaurantCandidate)[];
}

// ============================================================================
// CHAT-FIRST UI TYPES (New Snoo Experience)
// ============================================================================

// Snoo animation states
export type SnooState = 'idle' | 'thinking' | 'typing' | 'celebrating' | 'concerned';

// Chat message types
export interface ChatMessage {
  id: string;
  type: 'snoo' | 'user' | 'system';
  content: string;
  timestamp: Date;

  // For snoo messages
  snooState?: SnooState;

  // For messages with evidence
  evidence?: RedditEvidence[];

  // For messages with structured data
  data?: {
    areas?: AreaCandidate[];
    hotels?: HotelCandidate[];
    activities?: VerifiedActivity[];
    tradeoff?: Tradeoff;
  };
}

// Reddit evidence with full source info (for activity verification)
export interface RedditEvidence {
  postUrl: string;
  commentId?: string;
  subreddit: string;
  postTitle: string;
  upvotes: number;
  quote: string;
  fetchedAt: Date;
}

// ============================================================================
// VERIFIED ACTIVITY (with verification contract)
// ============================================================================

export interface VerifiedActivity {
  id: string;
  name: string; // e.g., "Horseback riding on Macao Beach"
  operator?: string; // e.g., "Rancho Macao"
  operatorUrl?: string;
  googleMapsUrl?: string; // Direct link to Google Maps
  location: string;
  type: ActivityType;

  // VERIFICATION (at least one must be present)
  verification: ActivityVerification;

  // Metadata
  effortPoints: number;
  duration: string;
  priceEstimate?: number;
  currency?: string;

  // Seasonal availability (month numbers 1-12)
  seasonalAvailability?: {
    startMonth: number;
    endMonth: number;
  };

  // Reddit mentions
  redditMentions: number;
  redditEvidence: RedditEvidence[];

  // Scoring
  relevanceScore: number;
  confidenceScore: number;
}

export interface ActivityVerification {
  // Option 1: Google Places validated
  placeId?: string;
  placeName?: string;
  placeRating?: number;

  // Option 2: Verified operator URL
  operatorUrl?: string;
  operatorVerifiedAt?: Date;

  // Option 3: Multiple Reddit sources (min 2, min 10 upvotes each)
  redditSources?: RedditEvidence[];
}

// Check if activity meets verification contract
export function isActivityVerified(verification: ActivityVerification): boolean {
  // Option 1: Google Places validated
  if (verification.placeId) return true;

  // Option 2: Has operator URL
  if (verification.operatorUrl) return true;

  // Option 3: Multiple Reddit sources (min 2, min 10 upvotes each)
  if (verification.redditSources && verification.redditSources.length >= 2) {
    const highQuality = verification.redditSources.filter(s => s.upvotes >= 10);
    if (highQuality.length >= 2) return true;
  }

  return false;
}

// ============================================================================
// ORCHESTRATOR STATE (Adaptive Question Selection)
// ============================================================================

export type ConfidenceLevel = 'unknown' | 'partial' | 'inferred' | 'confirmed' | 'complete';

export type EnrichmentType = 'reddit' | 'areas' | 'hotels' | 'activities' | 'pricing' | 'restaurants' | 'experiences';
export type EnrichmentStatus = 'pending' | 'loading' | 'done' | 'error';

export interface OrchestratorState {
  // Current phase
  phase: 'gathering' | 'enriching' | 'generating' | 'reviewing' | 'satisfied';

  // What we know
  preferences: Partial<TripPreferences>;

  // Confidence tracking (for adaptive questioning)
  confidence: {
    destination: ConfidenceLevel;
    dates: ConfidenceLevel;
    party: ConfidenceLevel;
    tripOccasion: ConfidenceLevel;  // FIX 1.8: Added
    accessibility: ConfidenceLevel;
    budget: ConfidenceLevel;
    pace: ConfidenceLevel;          // FIX 1.1: Added
    vibe: ConfidenceLevel;
    activities: ConfidenceLevel;
    areas: ConfidenceLevel;
    hotels: ConfidenceLevel;
    dining: ConfidenceLevel;
  };

  // Tradeoffs
  activeTradeoffs: Tradeoff[];
  resolvedTradeoffs: TradeoffResolution[];

  // Seasonal/weather warnings
  seasonalWarnings?: Array<{
    region: string;
    months: number[];
    type: 'peak' | 'monsoon' | 'holiday' | 'extreme_weather' | 'off_season';
    title: string;
    description: string;
    severity: 'info' | 'warning' | 'caution';
    priceImpact?: 'higher' | 'lower' | 'much_higher' | 'much_lower';
  }>;

  // Enrichment pipeline status
  enrichmentStatus: Record<EnrichmentType, EnrichmentStatus>;

  // Discovered data
  discoveredData: {
    areas: AreaCandidate[];
    hotels: Map<string, HotelCandidate[]>; // by area
    activities: VerifiedActivity[];
    restaurants: Map<string, RestaurantCandidate[]>; // by cuisine type
    experiences: Map<string, any[]>; // by activity type
  };

  // Chat state
  messages: ChatMessage[];
  currentQuestion: QuestionConfig | null;

  // Generated itinerary
  itinerary: QuickPlanItinerary | null;

  // Debug info
  debugLog: DebugEntry[];
}

export interface QuestionConfig {
  id: string;
  field: string; // which field this question fills
  snooMessage: string;
  inputType: ReplyCardType;
  inputConfig: ReplyCardConfig;
  required: boolean;
  canInfer: boolean;
}

// ============================================================================
// REPLY CARD TYPES (Structured Input in Chat)
// ============================================================================

export type ReplyCardType =
  | 'chips'
  | 'chips-multi'
  | 'slider'
  | 'date-range'
  | 'destination'
  | 'party'
  | 'hotels'
  | 'restaurants'
  | 'activities'
  | 'tradeoff'
  | 'areas'
  | 'split'
  | 'satisfaction'
  | 'text';

export interface ReplyCardConfig {
  // For chips
  options?: ChipOption[];

  // For slider
  min?: number;
  max?: number;
  step?: number;
  labels?: Record<number, string>;
  maxMeansUnlimited?: boolean; // When true, max value means "X or more"

  // For date-range
  minDate?: Date;
  maxDate?: Date;

  // For hotels/restaurants/activities
  candidates?: (HotelCandidate | RestaurantCandidate | VerifiedActivity)[];
  areaName?: string; // For hotels - which area these are for
  areaId?: string | null; // For hotels - the area ID

  // For restaurants
  cuisineType?: string | null;
  cuisineLabel?: string;

  // For experiences
  activityType?: string | null;
  activityLabel?: string;

  // For areas
  areaCandidates?: AreaCandidate[];
  areas?: { id: string; name: string }[]; // Selected areas list

  // For split
  splitOptions?: ItinerarySplit[];
  tripLength?: number;

  // For tradeoff
  tradeoff?: Tradeoff;

  // Always allow custom text input
  allowCustomText?: boolean;
  customTextPlaceholder?: string;

  // For text input card
  placeholder?: string;
  multiline?: boolean;

  // For info display
  infoText?: string;
  seasonNote?: string;

  // For tracking which field this card is for (used for notes)
  field?: string;

  // Whether to show optional notes input after selection
  allowNotes?: boolean;
}

export interface ChipOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  selected?: boolean;
}

// ============================================================================
// SATISFACTION LOOP (Surgical Regeneration)
// ============================================================================

export type DissatisfactionReason =
  | 'wrong_areas'
  | 'wrong_vibe'
  | 'too_packed'
  | 'too_chill'
  | 'surf_days_wrong'
  | 'dining_wrong'
  | 'too_touristy'
  | 'missing_activity'
  | 'hotel_wrong'
  | 'budget_exceeded'
  | 'other';

export interface SatisfactionGateResponse {
  satisfied: boolean;
  reasons?: DissatisfactionReason[];
  customFeedback?: string;
  specificIssues?: string[];
}

// ============================================================================
// DEBUG INFO
// ============================================================================

export interface DebugEntry {
  timestamp: Date;
  type: 'grok' | 'reddit' | 'places' | 'hotels' | 'pricing' | 'orchestrator';
  action: string;
  details: Record<string, unknown>;
  durationMs?: number;
}

export interface DebugInfo {
  // Reddit
  redditThreadsFetched: number;
  redditPostsAnalyzed: number;
  topSubreddits: string[];

  // Activities
  activitiesCandidates: number;
  activitiesValidated: number;
  activitiesRejected: number;
  validationMethod: Record<'placeId' | 'operatorUrl' | 'reddit', number>;

  // Hotels
  hotelsInDb: number;
  hotelsIndexedThisSession: number;
  hotelsPriced: number;
  pricingCacheHits: number;

  // Grok/LLM
  grokCallsMade: number;
  grokTokensUsed: number;

  // Timing
  totalEnrichmentTimeMs: number;
  redditFetchTimeMs: number;
  placeValidationTimeMs: number;

  // Errors
  errors: string[];
}

// ============================================================================
// GROK API TYPES
// ============================================================================

export interface GrokRequest {
  prompt: string;
  context?: {
    preferences?: Partial<TripPreferences>;
    discoveredData?: Partial<OrchestratorState['discoveredData']>;
  };
  schema?: string; // expected response schema
  maxTokens?: number;
}

export interface GrokResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}
