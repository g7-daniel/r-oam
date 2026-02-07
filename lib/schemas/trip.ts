import { z } from 'zod';

// ============ ENUMS ============

export const BudgetStyleSchema = z.enum(['budget', 'mid', 'premium', 'luxury']);
export type BudgetStyle = z.infer<typeof BudgetStyleSchema>;

export const PaceSchema = z.enum(['chill', 'balanced', 'packed']);
export type Pace = z.infer<typeof PaceSchema>;

export const TransportModeSchema = z.enum(['walking', 'driving', 'transit']);
export type TransportMode = z.infer<typeof TransportModeSchema>;

export const FlightLegStatusSchema = z.enum(['pending', 'selected', 'skipped_booked']);
export type FlightLegStatus = z.infer<typeof FlightLegStatusSchema>;

export const RecommendationSourceTypeSchema = z.enum(['reddit', 'ai', 'curated']);
export type RecommendationSourceType = z.infer<typeof RecommendationSourceTypeSchema>;

export const ExperienceCategorySchema = z.enum([
  'beaches',
  'museums',
  'food_tours',
  'nightlife',
  'day_trips',
  'hidden_gems',
  'outdoor',
  'shopping',
  'cultural',
  'wellness',
  'adventure',
  'nature',
  'landmarks',
  'entertainment',
  'dining',
  'cafes',
  'temples',
  'parks',
  'wildlife',
  'water_sports',
]);

// Dining-specific schemas
export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'any']);
export type MealType = z.infer<typeof MealTypeSchema>;

export const DiningStyleSchema = z.enum(['street_food', 'casual', 'fine_dining', 'local_favorite', 'food_tour']);
export type DiningStyle = z.infer<typeof DiningStyleSchema>;
export type ExperienceCategory = z.infer<typeof ExperienceCategorySchema>;

// ============ BASIC TYPES ============

export const AirportSchema = z.object({
  iata: z.string().length(3),
  name: z.string(),
  city: z.string(),
  country: z.string(),
});
export type Airport = z.infer<typeof AirportSchema>;

export const TravelersSchema = z.object({
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(9),
});
export type Travelers = z.infer<typeof TravelersSchema>;

export const PlaceSchema = z.object({
  name: z.string(),
  countryCode: z.string().length(2),
  lat: z.number(),
  lng: z.number(),
  placeId: z.string().optional(),
});
export type Place = z.infer<typeof PlaceSchema>;

// ============ TRIP BASICS ============

export const TripBasicsSchema = z.object({
  originAirport: AirportSchema.nullable(),
  startDate: z.string().nullable(), // ISO date string
  endDate: z.string().nullable(),
  travelers: TravelersSchema,
  totalBudgetUsd: z.number().min(0),
  budgetStyle: BudgetStyleSchema,
  pace: PaceSchema,
  transportMode: TransportModeSchema,
  tripTypeTags: z.array(z.string()),
});
export type TripBasics = z.infer<typeof TripBasicsSchema>;

// ============ AI DISCOVERY ============

export const RecommendationSourceSchema = z.object({
  type: RecommendationSourceTypeSchema,
  subreddit: z.string().optional(),
  url: z.string().optional(),
  quote: z.string().optional(),
  upvotes: z.number().optional(), // Reddit upvote count for community validation
});
export type RecommendationSource = z.infer<typeof RecommendationSourceSchema>;

export const RecommendationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: ExperienceCategorySchema,
  whyMatch: z.string(),
  source: RecommendationSourceSchema,
  estimatedDurationMinutes: z.number().optional(),
  estimatedCostUsd: z.number().optional(),
  imageQuery: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  // Dining-specific fields
  mealType: MealTypeSchema.optional(), // breakfast, lunch, dinner
  preferredTime: z.string().optional(), // e.g., "19:00" or "7:00 PM"
  diningStyle: DiningStyleSchema.optional(), // street_food, casual, fine_dining, etc.
  reservationRequired: z.boolean().optional(),
  cuisineType: z.string().optional(), // e.g., "Italian", "Local", "Fusion"
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const DiscoveryStateSchema = z.object({
  chatThreadId: z.string(),
  recommendations: z.array(RecommendationSchema),
  selectedSpotIds: z.array(z.string()),
  isComplete: z.boolean(),
});
export type DiscoveryState = z.infer<typeof DiscoveryStateSchema>;

// ============ EXPERIENCES ============

export const ExperienceSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: ExperienceCategorySchema,
  description: z.string(),
  imageUrl: z.string(),
  priceUsd: z.number(),
  durationMinutes: z.number().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().optional(),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  redditTips: z.array(z.string()).optional(),
  bestTimeToVisit: z.string().optional(),
  isFromDiscovery: z.boolean().optional(),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const ExperiencesStateSchema = z.object({
  items: z.array(ExperienceSchema),
  selectedExperienceIds: z.array(z.string()),
});
export type ExperiencesState = z.infer<typeof ExperiencesStateSchema>;

// ============ HOTELS ============

export const HotelQuerySchema = z.object({
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number(),
  maxPricePerNight: z.number().optional(),
});
export type HotelQuery = z.infer<typeof HotelQuerySchema>;

export const HotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  countryCode: z.string().length(2),
  stars: z.number().min(1).max(5),
  pricePerNight: z.number(),
  totalPrice: z.number(),
  currency: z.string(),
  imageUrl: z.string(),
  amenities: z.array(z.string()),
  distanceToCenter: z.number(),
  lat: z.number(),
  lng: z.number(),
  guestRating: z.number().min(0).max(10).optional(),
  isRedditRecommended: z.boolean().optional(),
  redditUpvotes: z.number().optional(),
  reviewCount: z.number().optional(),
  source: z.string().optional(), // 'amadeus', 'google', 'reddit'
  hasRealPricing: z.boolean().optional(),
});
export type Hotel = z.infer<typeof HotelSchema>;

export const HotelsStateSchema = z.object({
  query: HotelQuerySchema.nullable(),
  results: z.array(HotelSchema),
  selectedHotelId: z.string().nullable(),
});
export type HotelsState = z.infer<typeof HotelsStateSchema>;

// ============ FLIGHTS ============

export const FlightSchema = z.object({
  id: z.string(),
  airline: z.string(),
  airlineLogo: z.string().optional(),
  flightNumber: z.string(),
  departureAirport: z.string(),
  departureCity: z.string(),
  departureTime: z.string(),
  arrivalAirport: z.string(),
  arrivalCity: z.string(),
  arrivalTime: z.string(),
  durationMinutes: z.number(),
  stops: z.number(),
  priceUsd: z.number(),
  cabinClass: z.string(),
});
export type Flight = z.infer<typeof FlightSchema>;

export const FlightLegSchema = z.object({
  legId: z.string(),
  from: AirportSchema,
  to: AirportSchema,
  date: z.string(), // ISO date
  status: FlightLegStatusSchema,
  selectedFlightId: z.string().nullable(),
  flights: z.array(FlightSchema),
});
export type FlightLeg = z.infer<typeof FlightLegSchema>;

export const FlightsStateSchema = z.object({
  legs: z.array(FlightLegSchema),
  isRoundTrip: z.boolean(),
});
export type FlightsState = z.infer<typeof FlightsStateSchema>;

// ============ DESTINATION ============

export const DestinationSchema = z.object({
  destinationId: z.string(),
  place: PlaceSchema,
  nights: z.number().int().min(1),
  heroImageUrl: z.string().nullable(),
  discovery: DiscoveryStateSchema,
  experiences: ExperiencesStateSchema,
  hotels: HotelsStateSchema,
});
export type Destination = z.infer<typeof DestinationSchema>;

// ============ CHAT MESSAGE ============

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string(), // ISO datetime
  recommendations: z.array(RecommendationSchema).optional(),
  isStreaming: z.boolean().optional(),
  error: z.string().optional(),
});
export type JourneyChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatThreadSchema = z.object({
  threadId: z.string(),
  destinationId: z.string(),
  messages: z.array(ChatMessageSchema),
  isComplete: z.boolean(),
});
export type ChatThread = z.infer<typeof ChatThreadSchema>;

// ============ FULL TRIP ============

export const TripSchema = z.object({
  id: z.string(),
  basics: TripBasicsSchema,
  destinations: z.array(DestinationSchema),
  flights: FlightsStateSchema,
  chatThreads: z.array(ChatThreadSchema),
  currentStep: z.number().int().min(1).max(8),
  activeDestinationId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Trip = z.infer<typeof TripSchema>;

// ============ AI RESPONSE SCHEMAS ============

// This is what the AI must return for recommendations
export const AIRecommendationResponseSchema = z.object({
  recommendations: z.array(RecommendationSchema),
  followUpQuestion: z.string().optional(),
  summary: z.string().optional(),
});
export type AIRecommendationResponse = z.infer<typeof AIRecommendationResponseSchema>;

// Parsing helper with retry logic
export function parseAIRecommendations(jsonString: string): AIRecommendationResponse | null {
  try {
    // Try to extract JSON from potential markdown code blocks
    let cleaned = jsonString;

    // Remove markdown code blocks if present
    const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    }

    // Try to find JSON object in the string
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      cleaned = objectMatch[0];
    }

    const parsed = JSON.parse(cleaned);
    return AIRecommendationResponseSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse AI recommendations:', error);
    return null;
  }
}

// ============ DEFAULTS ============

export function createDefaultTripBasics(): TripBasics {
  return {
    originAirport: null,
    startDate: null,
    endDate: null,
    travelers: { adults: 2, children: 0 },
    totalBudgetUsd: 3000,
    budgetStyle: 'mid',
    pace: 'balanced',
    transportMode: 'walking',
    tripTypeTags: [],
  };
}

export function createDefaultDestination(place: Place, nights: number = 3): Destination {
  const destinationId = `dest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const chatThreadId = `chat_${destinationId}`;

  return {
    destinationId,
    place,
    nights,
    heroImageUrl: null,
    discovery: {
      chatThreadId,
      recommendations: [],
      selectedSpotIds: [],
      isComplete: false,
    },
    experiences: {
      items: [],
      selectedExperienceIds: [],
    },
    hotels: {
      query: null,
      results: [],
      selectedHotelId: null,
    },
  };
}

export function createDefaultTrip(): Trip {
  const now = new Date().toISOString();
  return {
    id: `trip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    basics: createDefaultTripBasics(),
    destinations: [],
    flights: {
      legs: [],
      isRoundTrip: true,
    },
    chatThreads: [],
    currentStep: 1,
    activeDestinationId: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ============ SHOPPING CART & RESERVATIONS ============

// Cart item for experience shopping cart
export const CartItemSchema = z.object({
  id: z.string(), // Unique cart item ID
  destinationId: z.string(),
  recommendation: RecommendationSchema,
  addedAt: z.string(), // ISO datetime
});
export type CartItem = z.infer<typeof CartItemSchema>;

// Dining reservation for booked tables
export const DiningReservationSchema = z.object({
  id: z.string(),
  recommendationId: z.string(),
  restaurantName: z.string(),
  destinationId: z.string(),
  date: z.string(), // ISO date
  time: z.string(), // e.g., "19:30"
  partySize: z.number().int().min(1),
  seating: z.enum(['inside', 'outside', 'bar', 'patio']),
  status: z.enum(['pending', 'confirmed', 'agent_booking']),
});
export type DiningReservation = z.infer<typeof DiningReservationSchema>;

// Itinerary assignment - maps experiences to specific days/times
export const ItineraryAssignmentSchema = z.object({
  experienceId: z.string(),
  dayIndex: z.number().int().min(0),
  timeSlot: z.string(), // e.g., "10:00"
});
export type ItineraryAssignment = z.infer<typeof ItineraryAssignmentSchema>;

// ============ VALIDATION HELPERS ============

export function validateTrip(data: unknown): Trip | null {
  try {
    return TripSchema.parse(data);
  } catch (error) {
    console.error('Trip validation failed:', error);
    return null;
  }
}

export function validateDestination(data: unknown): Destination | null {
  try {
    return DestinationSchema.parse(data);
  } catch (error) {
    console.error('Destination validation failed:', error);
    return null;
  }
}

export function validateRecommendation(data: unknown): Recommendation | null {
  try {
    return RecommendationSchema.parse(data);
  } catch (error) {
    console.error('Recommendation validation failed:', error);
    return null;
  }
}
