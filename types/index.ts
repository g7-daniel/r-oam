// Trip Types
export type TripType = 'solo' | 'couple' | 'family' | 'friends' | 'business';

export type BudgetPreset = 'luxury' | 'experience' | 'budget' | 'custom';

export interface Destination {
  id: string;
  name: string;
  country: string;
  iataCode: string;
  imageUrl: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

// Multi-destination types
export interface SpecificLocation {
  id: string;
  name: string;
  type: 'town' | 'beach' | 'neighborhood' | 'region';
  description?: string;
  latitude?: number;
  longitude?: number;
  redditMentions?: number;
  recommendedFor?: string[];
}

export interface TripLeg {
  id: string;
  order: number;
  destination: Destination;
  specificLocations: SpecificLocation[];
  startDate: Date | null;
  endDate: Date | null;
  days: number;
  inboundFlight: Flight | null;
  outboundFlight: Flight | null;
  hotel: Hotel | null;
  experiences: Experience[];
  budget: {
    allocated: number;
    spent: number;
  };
  chatSession?: ChatSession;
  experiencesChatSession?: ChatSession;
}

// AI Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: LocationSuggestion[];
  quickReplies?: string[];
}

export interface LocationSuggestion {
  id: string;
  name: string;
  type: 'town' | 'beach' | 'neighborhood' | 'region';
  description: string;
  redditQuote?: string;
  redditSubreddit?: string;
  recommendedFor: string[];
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  legId: string;
  type: 'destination' | 'experiences';
  messages: ChatMessage[];
  isComplete: boolean;
  selectedSuggestions: LocationSuggestion[];
}

// Filter types
export type CabinClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'red_eye';

export interface FlightFilters {
  cabinClasses: CabinClass[];
  maxStops: number | null;
  maxDurationMinutes: number | null;
  airlines: string[];
  departureTimeOfDay: TimeOfDay[];
  priceRange: { min: number; max: number } | null;
}

export interface HotelFilters {
  priceRange: { min: number; max: number } | null;
  starRatings: number[];
  amenities: string[];
  maxDistanceFromCenter: number | null;
  minGuestRating: number | null;
  redditRecommendedOnly: boolean;
}

// Hotel detail types
export interface RoomType {
  id: string;
  name: string;
  description: string;
  bedType: string;
  maxOccupancy: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  amenities: string[];
  imageUrl?: string;
  available: boolean;
}

export interface HotelDetail extends Hotel {
  roomTypes: RoomType[];
  gallery: string[];
  redditComments: RedditComment[];
  isRedditRecommended: boolean;
  redditMentionCount: number;
  fullDescription?: string;
  policies?: {
    checkIn: string;
    checkOut: string;
    cancellation: string;
  };
}

// Enhanced itinerary types
export interface ScheduledTimeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface ItineraryItemScheduled extends ItineraryItem {
  legId: string;
  scheduledSlot: ScheduledTimeSlot;
  transitToNext?: TransitInfo;
  isLegTransition?: boolean;
}

export interface ItineraryDayScheduled extends ItineraryDay {
  legId: string;
  isTransitDay?: boolean;
  scheduledItems: ItineraryItemScheduled[];
}

export interface TravelDates {
  startDate: Date | null;
  endDate: Date | null;
  isFlexible: boolean;
}

export interface Travelers {
  adults: number;
  children: number;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
}

export interface BudgetAllocation {
  flights: number;
  accommodation: number;
  experiences: number;
  food: number;
  transit: number;
}

export interface Budget {
  total: number;
  allocation: BudgetAllocation;
  preset: BudgetPreset;
  remaining: number;
}

// Flight Types
export interface Flight {
  id: string;
  airline: string;
  airlineLogo?: string;
  flightNumber: string;
  departureAirport: string;
  departureCity: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalCity: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  cabinClass: string;
  sentiment?: SentimentData;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  maxPrice?: number;
}

// Hotel Types
export interface Hotel {
  id: string;
  name: string;
  address: string;
  city: string;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  imageUrl: string;
  amenities: string[];
  distanceToCenter: number;
  latitude: number;
  longitude: number;
  sentiment?: SentimentData;
  highlights?: string[];
}

export interface HotelSearchParams {
  cityCode: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  maxPrice?: number;
}

// Experience Types
export interface Experience {
  id: string;
  name: string;
  category: ExperienceCategory;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  duration?: number | string; // Duration in minutes or string like "2 hours"
  rating: number;
  reviewCount: number;
  distance?: number;
  address: string;
  latitude: number;
  longitude: number;
  location?: {
    name?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  sentiment?: SentimentData;
  tips?: string[];
  redditTips?: string[];
  bestTimeToVisit?: string;
}

export type ExperienceCategory =
  | 'beaches'
  | 'museums'
  | 'food_tours'
  | 'nightlife'
  | 'day_trips'
  | 'hidden_gems'
  | 'outdoor'
  | 'shopping'
  | 'cultural'
  | 'wellness'
  | 'dining'
  | 'cafes'
  | 'temples'
  | 'parks'
  | 'landmarks'
  | 'nature'
  | 'adventure'
  | 'wildlife'
  | 'water_sports';

// Itinerary Types
export interface ItineraryDay {
  date: string;
  dayNumber: number;
  items: ItineraryItem[];
  notes?: string;
  legId?: string;
  isTransitionDay?: boolean;
  fromLeg?: string;
  toLeg?: string;
  totalCost?: number;
}

export interface ItineraryItem {
  id: string;
  type: 'flight' | 'hotel' | 'experience' | 'meal' | 'transit';
  title: string;
  startTime: string;
  endTime: string;
  duration?: number;
  location?: {
    name?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  experienceId?: string;
  flightNumber?: string;
  transitMode?: 'walk' | 'drive' | 'train' | 'taxi' | 'bus' | 'uber';
  transitDistance?: number;
  cost?: number;
  notes?: string;
  transitInfo?: TransitInfo;
}

export interface TransitInfo {
  mode: 'walk' | 'train' | 'taxi' | 'bus' | 'uber';
  duration: string;
  distance: string;
  cost?: number;
}

// Sentiment Types
export interface SentimentData {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  mentionCount: number;
  topComments: RedditComment[];
  subreddits: string[];
}

export interface RedditComment {
  text: string;
  subreddit: string;
  score: number;
  date: string;
}

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  score: number;
  numComments: number;
  createdUtc: number;
  permalink: string;
}

// API Response Types
export interface AmadeusTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AmadeusFlightResponse {
  data: AmadeusFlightOffer[];
  dictionaries?: {
    carriers: Record<string, string>;
    aircraft: Record<string, string>;
  };
}

export interface AmadeusFlightOffer {
  id: string;
  itineraries: {
    segments: {
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
      duration: string;
    }[];
    duration: string;
  }[];
  price: {
    total: string;
    currency: string;
  };
  travelerPricings: {
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: { total: string; currency: string };
    fareDetailsBySegment: {
      cabin: string;
      class: string;
    }[];
  }[];
}

export interface AmadeusHotelResponse {
  data: AmadeusHotelOffer[];
}

export interface AmadeusHotelOffer {
  hotel: {
    hotelId: string;
    name: string;
    address: { lines: string[]; cityName: string };
    rating: string;
    amenities?: string[];
    latitude?: number;
    longitude?: number;
    media?: { uri: string }[];
  };
  offers: {
    id: string;
    price: { total: string; currency: string };
    room: { description: { text: string } };
  }[];
}

// Google Maps Types
export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: {
    photo_reference: string;
  }[];
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  opening_hours?: {
    open_now: boolean;
  };
  price_level?: number;
}

export interface DirectionsResult {
  routes: {
    legs: {
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      steps: {
        travel_mode: string;
        distance: { text: string };
        duration: { text: string };
        instructions: string;
      }[];
    }[];
  }[];
}
