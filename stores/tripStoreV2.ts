import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Trip,
  TripBasics,
  Destination,
  Place,
  Airport,
  Travelers,
  BudgetStyle,
  Pace,
  Recommendation,
  Experience,
  Hotel,
  Flight,
  FlightLeg,
  FlightLegStatus,
  ChatMessage,
  ChatThread,
  CartItem,
  DiningReservation,
  ItineraryAssignment,
  createDefaultTrip,
  createDefaultTripBasics,
  createDefaultDestination,
} from '@/lib/schemas/trip';
import { getOptimizationComparison, suggestItemsForDay } from '@/lib/utils/itineraryOptimizer';

// ============ COLLECTION ITEM TYPE ============
export interface CollectionItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  whyMatch?: string;           // Why this matches user interests
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;        // Google review count
  lat?: number;
  lng?: number;
  durationMinutes?: number;
  address?: string;
  openingHours?: string;
  priceLevel?: number;
  cuisineType?: string;
  reservationTime?: string;
  destinationId?: string;
  source?: {
    type: 'reddit' | 'ai' | 'curated' | 'google' | 'system';
    subreddit?: string;        // Source subreddit name
    quote?: string;
    upvotes?: number;          // Reddit upvotes
    url?: string;              // Link to Reddit post
  };
  // Dining-specific
  mealType?: 'breakfast' | 'lunch' | 'dinner';
  diningStyle?: string;
  reservationRequired?: boolean;
  // Scheduling info
  scheduledDayIndex?: number;
  order?: number;
  // Hotel check-in/check-out specific
  hotelId?: string;
  hotelName?: string;
}

// ============ CUSTOM LIST TYPE ============
export interface CustomList {
  id: string;
  name: string;
  icon?: string;
  items: CollectionItem[];
}

// ============ AIRPORT CODE MAPPING ============
// City/destination name to IATA airport code
const AIRPORT_CODES: Record<string, string> = {
  // Japan
  'Tokyo': 'NRT', 'Kyoto': 'KIX', 'Osaka': 'KIX',
  // USA
  'New York': 'JFK', 'Los Angeles': 'LAX', 'Miami': 'MIA', 'San Francisco': 'SFO',
  'Las Vegas': 'LAS', 'Chicago': 'ORD', 'Boston': 'BOS', 'Washington': 'DCA',
  'Seattle': 'SEA', 'Orlando': 'MCO', 'Hawaii': 'HNL', 'Honolulu': 'HNL', 'Maui': 'OGG',
  // Europe
  'Paris': 'CDG', 'London': 'LHR', 'Rome': 'FCO', 'Barcelona': 'BCN', 'Madrid': 'MAD',
  'Amsterdam': 'AMS', 'Berlin': 'BER', 'Munich': 'MUC', 'Vienna': 'VIE', 'Prague': 'PRG',
  'Lisbon': 'LIS', 'Dublin': 'DUB', 'Athens': 'ATH', 'Venice': 'VCE', 'Florence': 'FLR',
  'Milan': 'MXP', 'Nice': 'NCE', 'Lyon': 'LYS', 'Edinburgh': 'EDI', 'Budapest': 'BUD',
  'Copenhagen': 'CPH', 'Stockholm': 'ARN', 'Zurich': 'ZRH', 'Reykjavik': 'KEF',
  'Dubrovnik': 'DBV', 'Split': 'SPU', 'Santorini': 'JTR', 'Mykonos': 'JMK',
  // Asia
  'Bangkok': 'BKK', 'Singapore': 'SIN', 'Hong Kong': 'HKG', 'Seoul': 'ICN', 'Taipei': 'TPE',
  'Bali': 'DPS', 'Phuket': 'HKT', 'Hanoi': 'HAN', 'Ho Chi Minh City': 'SGN',
  'Chiang Mai': 'CNX', 'Koh Samui': 'USM',
  // Latin America
  'Mexico City': 'MEX', 'Cancun': 'CUN', 'Panama City': 'PTY', 'San Jose': 'SJO',
  'Lima': 'LIM', 'Buenos Aires': 'EZE', 'Rio de Janeiro': 'GIG', 'Sao Paulo': 'GRU',
  'Bogota': 'BOG', 'Santiago': 'SCL',
  // Caribbean
  'Punta Cana': 'PUJ', 'Montego Bay': 'MBJ', 'Nassau': 'NAS', 'Aruba': 'AUA',
  // Middle East
  'Dubai': 'DXB', 'Abu Dhabi': 'AUH', 'Tel Aviv': 'TLV', 'Jerusalem': 'TLV',
  'Israel': 'TLV', 'Istanbul': 'IST', 'Jordan': 'AMM', 'Amman': 'AMM', 'Petra': 'AMM',
  'Marrakech': 'RAK', 'Cairo': 'CAI',
  // Africa
  'Cape Town': 'CPT', 'Johannesburg': 'JNB', 'Nairobi': 'NBO', 'Zanzibar': 'ZNZ',
  // Australia/NZ/Pacific
  'Sydney': 'SYD', 'Melbourne': 'MEL', 'Auckland': 'AKL', 'Fiji': 'NAN', 'Bora Bora': 'BOB',
  // Country defaults (use main airport)
  'Costa Rica': 'SJO', 'Panama': 'PTY', 'Thailand': 'BKK', 'Japan': 'NRT',
  'Italy': 'FCO', 'France': 'CDG', 'Spain': 'MAD', 'Germany': 'FRA', 'Greece': 'ATH',
  'United Kingdom': 'LHR', 'Australia': 'SYD', 'New Zealand': 'AKL',
  'Morocco': 'CMN', 'Egypt': 'CAI', 'South Africa': 'JNB', 'Kenya': 'NBO',
  'Brazil': 'GRU', 'Argentina': 'EZE', 'Chile': 'SCL', 'Colombia': 'BOG', 'Peru': 'LIM',
  'Maldives': 'MLE', 'Sri Lanka': 'CMB', 'India': 'DEL', 'Vietnam': 'SGN', 'Indonesia': 'DPS',
  'Malaysia': 'KUL', 'Philippines': 'MNL', 'South Korea': 'ICN',
};

// Get airport code for a destination name
const getAirportCode = (destinationName: string): string => {
  // Direct match
  if (AIRPORT_CODES[destinationName]) return AIRPORT_CODES[destinationName];

  // Try partial match (e.g., "Paris, France" -> "Paris")
  for (const [city, code] of Object.entries(AIRPORT_CODES)) {
    if (destinationName.toLowerCase().includes(city.toLowerCase()) ||
        city.toLowerCase().includes(destinationName.toLowerCase())) {
      return code;
    }
  }

  // Fallback: first 3 letters (not ideal but better than nothing)
  return destinationName.substring(0, 3).toUpperCase();
};

// ============ STORE STATE ============

interface TripStoreState {
  trip: Trip;

  // ============ HYDRATION STATE ============
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;

  // ============ COLLECTIONS STATE ============
  collections: {
    experiences: CollectionItem[];
    restaurants: CollectionItem[];
  };
  customLists: CustomList[];
  scheduledItems: CollectionItem[];

  // ============ SHOPPING CART STATE (LEGACY) ============
  experienceCart: CartItem[];
  diningReservations: DiningReservation[];
  itineraryAssignments: ItineraryAssignment[];

  // ============ BASICS ACTIONS ============
  setBasics: (basics: Partial<TripBasics>) => void;
  setRoundTrip: (isRoundTrip: boolean) => void;
  setOriginAirport: (airport: Airport | null) => void;
  setDates: (startDate: string | null, endDate: string | null) => void;
  setTravelers: (travelers: Travelers) => void;
  setBudget: (amount: number, style: BudgetStyle) => void;
  setPace: (pace: Pace) => void;
  setTripTypeTags: (tags: string[]) => void;

  // ============ DESTINATION ACTIONS ============
  addDestination: (place: Place, nights?: number) => string;
  removeDestination: (destinationId: string) => void;
  reorderDestinations: (destinationIds: string[]) => void;
  setActiveDestination: (destinationId: string | null) => void;
  updateDestinationNights: (destinationId: string, nights: number) => void;
  setDestinationHeroImage: (destinationId: string, imageUrl: string) => void;

  // ============ DISCOVERY ACTIONS ============
  addRecommendation: (destinationId: string, recommendation: Recommendation) => void;
  setRecommendations: (destinationId: string, recommendations: Recommendation[]) => void;
  selectSpot: (destinationId: string, spotId: string) => void;
  deselectSpot: (destinationId: string, spotId: string) => void;
  completeDiscovery: (destinationId: string) => void;
  getNextIncompleteDestination: () => Destination | null;

  // ============ EXPERIENCE ACTIONS ============
  addExperience: (destinationId: string, experience: Experience) => void;
  removeExperience: (destinationId: string, experienceId: string) => void;
  selectExperience: (destinationId: string, experienceId: string) => void;
  deselectExperience: (destinationId: string, experienceId: string) => void;
  seedExperiencesFromDiscovery: (destinationId: string) => void;

  // ============ HOTEL ACTIONS ============
  setHotelResults: (destinationId: string, hotels: Hotel[]) => void;
  selectHotel: (destinationId: string, hotelId: string | null) => void;
  getSelectedHotel: (destinationId: string) => Hotel | null;

  // ============ FLIGHT ACTIONS ============
  buildFlightLegs: () => void;
  setFlightResults: (legId: string, flights: Flight[]) => void;
  selectFlight: (legId: string, flightId: string | null) => void;
  skipFlightLeg: (legId: string) => void;
  unskipFlightLeg: (legId: string) => void;
  canProceedFromFlights: () => boolean;
  getFlightLeg: (legId: string) => FlightLeg | null;

  // ============ CHAT ACTIONS ============
  addChatMessage: (destinationId: string, message: ChatMessage) => void;
  updateLastMessage: (destinationId: string, content: string, recommendations?: Recommendation[]) => void;
  getChatThread: (destinationId: string) => ChatThread | null;

  // ============ NAVIGATION ============
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceedToStep: (step: number) => boolean;

  // ============ TRIP MANAGEMENT ============
  resetTrip: () => void;
  getActiveDestination: () => Destination | null;
  getTotalBudgetSpent: () => number;
  getRemainingBudget: () => number;

  // ============ SHOPPING CART ACTIONS ============
  addToCart: (destinationId: string, recommendation: Recommendation) => void;
  removeFromCart: (cartItemId: string) => void;
  getCartTotal: () => number;
  getCartByDestination: (destinationId: string) => CartItem[];
  isInCart: (recommendationId: string) => boolean;

  // ============ DINING RESERVATION ACTIONS ============
  addDiningReservation: (reservation: Omit<DiningReservation, 'id'>) => void;
  removeDiningReservation: (reservationId: string) => void;
  getDiningReservations: (destinationId?: string) => DiningReservation[];

  // ============ ITINERARY ASSIGNMENT ACTIONS ============
  setItineraryAssignments: (assignments: ItineraryAssignment[]) => void;
  moveExperienceToDay: (experienceId: string, newDayIndex: number) => void;
  updateExperienceTime: (experienceId: string, newTime: string) => void;

  // ============ COLLECTIONS ACTIONS ============
  addToCollection: (type: 'experiences' | 'restaurants', item: CollectionItem) => void;
  removeFromCollection: (type: 'experiences' | 'restaurants' | string, itemId: string) => void;
  scheduleItem: (itemId: string, dayIndex: number, position?: number) => void;
  unscheduleItem: (itemId: string) => void;
  updateScheduledItem: (itemId: string, updates: Partial<CollectionItem>) => void;
  reorderScheduledItem: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  moveItemBetweenDays: (fromDayIndex: number, toDayIndex: number, itemId: string, toPosition?: number) => void;
  createCustomList: (name: string, icon?: string) => void;
  deleteCustomList: (listId: string) => void;
  addToCustomList: (listId: string, item: CollectionItem) => void;
  optimizeDay: (dayIndex: number) => Promise<void>;
  autoFillDay: (dayIndex: number, destinationId: string) => Promise<void>;

  // ============ SUMMARY HELPERS ============
  getDestinationSummary: (destinationId: string) => {
    selectedSpots: number;
    selectedExperiences: number;
    hotelSelected: boolean;
  } | null;
  getFlightsSummary: () => {
    totalLegs: number;
    completedLegs: number;
    skippedLegs: number;
  };
}

// ============ STORE IMPLEMENTATION ============

export const useTripStoreV2 = create<TripStoreState>()(
  persist(
    (set, get) => ({
      trip: createDefaultTrip(),

      // ============ HYDRATION STATE ============
      _hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => set({ _hasHydrated: hasHydrated }),

      // ============ COLLECTIONS STATE ============
      collections: {
        experiences: [] as CollectionItem[],
        restaurants: [] as CollectionItem[],
      },
      customLists: [] as CustomList[],
      scheduledItems: [] as CollectionItem[],

      // ============ SHOPPING CART STATE (LEGACY) ============
      experienceCart: [] as CartItem[],
      diningReservations: [] as DiningReservation[],
      itineraryAssignments: [] as ItineraryAssignment[],

      // ============ BASICS ACTIONS ============

      setBasics: (basics) =>
        set((state) => ({
          trip: {
            ...state.trip,
            basics: { ...state.trip.basics, ...basics },
            updatedAt: new Date().toISOString(),
          },
        })),

      setRoundTrip: (isRoundTrip) =>
        set((state) => ({
          trip: {
            ...state.trip,
            flights: { ...state.trip.flights, isRoundTrip },
            updatedAt: new Date().toISOString(),
          },
        })),

      setOriginAirport: (airport) =>
        set((state) => ({
          trip: {
            ...state.trip,
            basics: { ...state.trip.basics, originAirport: airport },
            updatedAt: new Date().toISOString(),
          },
        })),

      setDates: (startDate, endDate) =>
        set((state) => ({
          trip: {
            ...state.trip,
            basics: { ...state.trip.basics, startDate, endDate },
            updatedAt: new Date().toISOString(),
          },
        })),

      setTravelers: (travelers) =>
        set((state) => ({
          trip: {
            ...state.trip,
            basics: { ...state.trip.basics, travelers },
            updatedAt: new Date().toISOString(),
          },
        })),

      setBudget: (amount, style) =>
        set((state) => ({
          trip: {
            ...state.trip,
            basics: { ...state.trip.basics, totalBudgetUsd: amount, budgetStyle: style },
            updatedAt: new Date().toISOString(),
          },
        })),

      setPace: (pace) =>
        set((state) => ({
          trip: {
            ...state.trip,
            basics: { ...state.trip.basics, pace },
            updatedAt: new Date().toISOString(),
          },
        })),

      setTripTypeTags: (tags) =>
        set((state) => ({
          trip: {
            ...state.trip,
            basics: { ...state.trip.basics, tripTypeTags: tags },
            updatedAt: new Date().toISOString(),
          },
        })),

      // ============ DESTINATION ACTIONS ============

      addDestination: (place, nights = 3) => {
        const destination = createDefaultDestination(place, nights);

        // Also create a chat thread for this destination
        const chatThread: ChatThread = {
          threadId: destination.discovery.chatThreadId,
          destinationId: destination.destinationId,
          messages: [],
          isComplete: false,
        };

        set((state) => ({
          trip: {
            ...state.trip,
            destinations: [...state.trip.destinations, destination],
            chatThreads: [...state.trip.chatThreads, chatThread],
            activeDestinationId: state.trip.activeDestinationId || destination.destinationId,
            updatedAt: new Date().toISOString(),
          },
        }));

        return destination.destinationId;
      },

      removeDestination: (destinationId) =>
        set((state) => {
          const newDestinations = state.trip.destinations.filter(
            (d) => d.destinationId !== destinationId
          );
          const newChatThreads = state.trip.chatThreads.filter(
            (t) => t.destinationId !== destinationId
          );

          let newActiveId = state.trip.activeDestinationId;
          if (newActiveId === destinationId) {
            newActiveId = newDestinations[0]?.destinationId || null;
          }

          return {
            trip: {
              ...state.trip,
              destinations: newDestinations,
              chatThreads: newChatThreads,
              activeDestinationId: newActiveId,
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      reorderDestinations: (destinationIds) =>
        set((state) => {
          const destMap = new Map(
            state.trip.destinations.map((d) => [d.destinationId, d])
          );
          const reordered = destinationIds
            .map((id) => destMap.get(id))
            .filter((d): d is Destination => d !== undefined);

          return {
            trip: {
              ...state.trip,
              destinations: reordered,
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      setActiveDestination: (destinationId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            activeDestinationId: destinationId,
          },
        })),

      updateDestinationNights: (destinationId, nights) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId ? { ...d, nights } : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      setDestinationHeroImage: (destinationId, imageUrl) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId ? { ...d, heroImageUrl: imageUrl } : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      // ============ DISCOVERY ACTIONS ============

      addRecommendation: (destinationId, recommendation) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    discovery: {
                      ...d.discovery,
                      recommendations: [...d.discovery.recommendations, recommendation],
                    },
                  }
                : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      setRecommendations: (destinationId, recommendations) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    discovery: {
                      ...d.discovery,
                      recommendations,
                    },
                  }
                : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      selectSpot: (destinationId, spotId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    discovery: {
                      ...d.discovery,
                      selectedSpotIds: d.discovery.selectedSpotIds.includes(spotId)
                        ? d.discovery.selectedSpotIds
                        : [...d.discovery.selectedSpotIds, spotId],
                    },
                  }
                : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      deselectSpot: (destinationId, spotId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    discovery: {
                      ...d.discovery,
                      selectedSpotIds: d.discovery.selectedSpotIds.filter((id) => id !== spotId),
                    },
                  }
                : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      completeDiscovery: (destinationId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    discovery: {
                      ...d.discovery,
                      isComplete: true,
                    },
                  }
                : d
            ),
            chatThreads: state.trip.chatThreads.map((t) =>
              t.destinationId === destinationId ? { ...t, isComplete: true } : t
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      getNextIncompleteDestination: () => {
        const state = get();
        return (
          state.trip.destinations.find((d) => !d.discovery.isComplete) || null
        );
      },

      // ============ EXPERIENCE ACTIONS ============

      addExperience: (destinationId, experience) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    experiences: {
                      ...d.experiences,
                      items: [...d.experiences.items, experience],
                    },
                  }
                : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      removeExperience: (destinationId, experienceId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    experiences: {
                      items: d.experiences.items.filter((e) => e.id !== experienceId),
                      selectedExperienceIds: d.experiences.selectedExperienceIds.filter(
                        (id) => id !== experienceId
                      ),
                    },
                  }
                : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      selectExperience: (destinationId, experienceId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    experiences: {
                      ...d.experiences,
                      selectedExperienceIds: d.experiences.selectedExperienceIds.includes(
                        experienceId
                      )
                        ? d.experiences.selectedExperienceIds
                        : [...d.experiences.selectedExperienceIds, experienceId],
                    },
                  }
                : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      deselectExperience: (destinationId, experienceId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    experiences: {
                      ...d.experiences,
                      selectedExperienceIds: d.experiences.selectedExperienceIds.filter(
                        (id) => id !== experienceId
                      ),
                    },
                  }
                : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      seedExperiencesFromDiscovery: (destinationId) =>
        set((state) => {
          const dest = state.trip.destinations.find(
            (d) => d.destinationId === destinationId
          );
          if (!dest) return state;

          // Convert selected recommendations to experiences
          const selectedRecs = dest.discovery.recommendations.filter((r) =>
            dest.discovery.selectedSpotIds.includes(r.id)
          );

          const newExperiences: Experience[] = selectedRecs.map((rec) => ({
            id: `exp_${rec.id}`,
            name: rec.name,
            category: rec.category,
            description: rec.description,
            imageUrl: '', // Will be fetched
            priceUsd: rec.estimatedCostUsd || 0,
            durationMinutes: rec.estimatedDurationMinutes,
            lat: rec.lat || dest.place.lat,
            lng: rec.lng || dest.place.lng,
            redditTips: rec.source.quote ? [rec.source.quote] : [],
            isFromDiscovery: true,
          }));

          // Merge with existing, avoiding duplicates
          const existingIds = new Set(dest.experiences.items.map((e) => e.id));
          const uniqueNew = newExperiences.filter((e) => !existingIds.has(e.id));

          return {
            trip: {
              ...state.trip,
              destinations: state.trip.destinations.map((d) =>
                d.destinationId === destinationId
                  ? {
                      ...d,
                      experiences: {
                        items: [...d.experiences.items, ...uniqueNew],
                        selectedExperienceIds: [
                          ...d.experiences.selectedExperienceIds,
                          ...uniqueNew.map((e) => e.id),
                        ],
                      },
                    }
                  : d
              ),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      // ============ HOTEL ACTIONS ============

      setHotelResults: (destinationId, hotels) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    hotels: {
                      ...d.hotels,
                      results: hotels,
                    },
                  }
                : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      selectHotel: (destinationId, hotelId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            destinations: state.trip.destinations.map((d) =>
              d.destinationId === destinationId
                ? {
                    ...d,
                    hotels: {
                      ...d.hotels,
                      selectedHotelId: hotelId,
                    },
                  }
                : d
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      getSelectedHotel: (destinationId) => {
        const state = get();
        const dest = state.trip.destinations.find(
          (d) => d.destinationId === destinationId
        );
        if (!dest || !dest.hotels.selectedHotelId) return null;
        return (
          dest.hotels.results.find((h) => h.id === dest.hotels.selectedHotelId) ||
          null
        );
      },

      // ============ FLIGHT ACTIONS ============

      buildFlightLegs: () =>
        set((state) => {
          const { basics, destinations, flights } = state.trip;
          if (!basics.originAirport || destinations.length === 0) {
            return state;
          }

          const legs: FlightLeg[] = [];
          const origin = basics.originAirport;

          // Calculate dates for each leg
          let currentDate = basics.startDate || new Date().toISOString().split('T')[0];

          // Leg 1: Origin -> First destination
          const firstDest = destinations[0];
          legs.push({
            legId: `leg_origin_to_${firstDest.destinationId}`,
            from: origin,
            to: {
              iata: getAirportCode(firstDest.place.name),
              name: `${firstDest.place.name} International Airport`,
              city: firstDest.place.name,
              country: firstDest.place.countryCode,
            },
            date: currentDate,
            status: 'pending',
            selectedFlightId: null,
            flights: [],
          });

          // Inter-destination legs
          for (let i = 0; i < destinations.length - 1; i++) {
            const from = destinations[i];
            const to = destinations[i + 1];

            // Add nights to get departure date
            const departDate = new Date(currentDate);
            departDate.setDate(departDate.getDate() + from.nights);
            currentDate = departDate.toISOString().split('T')[0];

            legs.push({
              legId: `leg_${from.destinationId}_to_${to.destinationId}`,
              from: {
                iata: getAirportCode(from.place.name),
                name: `${from.place.name} International Airport`,
                city: from.place.name,
                country: from.place.countryCode,
              },
              to: {
                iata: getAirportCode(to.place.name),
                name: `${to.place.name} International Airport`,
                city: to.place.name,
                country: to.place.countryCode,
              },
              date: currentDate,
              status: 'pending',
              selectedFlightId: null,
              flights: [],
            });
          }

          // Return leg: Last destination -> Origin (if round trip)
          if (flights.isRoundTrip) {
            const lastDest = destinations[destinations.length - 1];
            const returnDate = new Date(currentDate);
            returnDate.setDate(returnDate.getDate() + lastDest.nights);

            legs.push({
              legId: `leg_${lastDest.destinationId}_to_origin`,
              from: {
                iata: getAirportCode(lastDest.place.name),
                name: `${lastDest.place.name} International Airport`,
                city: lastDest.place.name,
                country: lastDest.place.countryCode,
              },
              to: origin,
              date: returnDate.toISOString().split('T')[0],
              status: 'pending',
              selectedFlightId: null,
              flights: [],
            });
          }

          return {
            trip: {
              ...state.trip,
              flights: {
                ...state.trip.flights,
                legs,
              },
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      setFlightResults: (legId, flights) =>
        set((state) => ({
          trip: {
            ...state.trip,
            flights: {
              ...state.trip.flights,
              legs: state.trip.flights.legs.map((leg) =>
                leg.legId === legId ? { ...leg, flights } : leg
              ),
            },
            updatedAt: new Date().toISOString(),
          },
        })),

      selectFlight: (legId, flightId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            flights: {
              ...state.trip.flights,
              legs: state.trip.flights.legs.map((leg) =>
                leg.legId === legId
                  ? {
                      ...leg,
                      selectedFlightId: flightId,
                      status: flightId ? 'selected' : 'pending',
                    }
                  : leg
              ),
            },
            updatedAt: new Date().toISOString(),
          },
        })),

      skipFlightLeg: (legId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            flights: {
              ...state.trip.flights,
              legs: state.trip.flights.legs.map((leg) =>
                leg.legId === legId
                  ? { ...leg, status: 'skipped_booked', selectedFlightId: null }
                  : leg
              ),
            },
            updatedAt: new Date().toISOString(),
          },
        })),

      unskipFlightLeg: (legId) =>
        set((state) => ({
          trip: {
            ...state.trip,
            flights: {
              ...state.trip.flights,
              legs: state.trip.flights.legs.map((leg) =>
                leg.legId === legId ? { ...leg, status: 'pending' } : leg
              ),
            },
            updatedAt: new Date().toISOString(),
          },
        })),

      canProceedFromFlights: () => {
        const state = get();
        const { legs } = state.trip.flights;
        if (legs.length === 0) return false;
        return legs.every(
          (leg) => leg.status === 'selected' || leg.status === 'skipped_booked'
        );
      },

      getFlightLeg: (legId) => {
        const state = get();
        return state.trip.flights.legs.find((l) => l.legId === legId) || null;
      },

      // ============ CHAT ACTIONS ============

      addChatMessage: (destinationId, message) =>
        set((state) => ({
          trip: {
            ...state.trip,
            chatThreads: state.trip.chatThreads.map((t) =>
              t.destinationId === destinationId
                ? { ...t, messages: [...t.messages, message] }
                : t
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      updateLastMessage: (destinationId, content, recommendations) =>
        set((state) => ({
          trip: {
            ...state.trip,
            chatThreads: state.trip.chatThreads.map((t) => {
              if (t.destinationId !== destinationId) return t;
              const messages = [...t.messages];
              if (messages.length > 0) {
                const last = messages[messages.length - 1];
                messages[messages.length - 1] = {
                  ...last,
                  content,
                  recommendations: recommendations || last.recommendations,
                  isStreaming: false,
                };
              }
              return { ...t, messages };
            }),
            updatedAt: new Date().toISOString(),
          },
        })),

      getChatThread: (destinationId) => {
        const state = get();
        return (
          state.trip.chatThreads.find((t) => t.destinationId === destinationId) ||
          null
        );
      },

      // ============ NAVIGATION ============

      setCurrentStep: (step) =>
        set((state) => ({
          trip: { ...state.trip, currentStep: step },
        })),

      nextStep: () =>
        set((state) => ({
          trip: {
            ...state.trip,
            currentStep: Math.min(state.trip.currentStep + 1, 8),
          },
        })),

      prevStep: () =>
        set((state) => ({
          trip: {
            ...state.trip,
            currentStep: Math.max(state.trip.currentStep - 1, 1),
          },
        })),

      canProceedToStep: (step) => {
        const state = get();
        const { basics, destinations, flights } = state.trip;

        switch (step) {
          case 2: // Destinations requires basics
            return !!(
              basics.originAirport &&
              basics.startDate &&
              basics.endDate &&
              basics.totalBudgetUsd > 0
            );
          case 3: // AI Discovery requires at least one destination
            return destinations.length > 0;
          case 4: // Experiences requires discovery complete for all destinations
            return destinations.every((d) => d.discovery.isComplete);
          case 5: // Hotels - can always proceed if we have destinations
            return destinations.length > 0;
          case 6: // Flights - needs hotels selected for all destinations
            return destinations.every((d) => d.hotels.selectedHotelId !== null);
          case 7: // Itinerary - all flights must be selected or skipped
            return state.canProceedFromFlights();
          case 8: // Review - itinerary ready
            return true;
          default:
            return true;
        }
      },

      // ============ TRIP MANAGEMENT ============

      resetTrip: () =>
        set({
          trip: createDefaultTrip(),
          collections: {
            experiences: [],
            restaurants: [],
          },
          customLists: [],
          scheduledItems: [],
          experienceCart: [],
          diningReservations: [],
          itineraryAssignments: [],
        }),

      getActiveDestination: () => {
        const state = get();
        return (
          state.trip.destinations.find(
            (d) => d.destinationId === state.trip.activeDestinationId
          ) || null
        );
      },

      getTotalBudgetSpent: () => {
        const state = get();
        let total = 0;

        // Add hotel costs
        for (const dest of state.trip.destinations) {
          if (dest.hotels.selectedHotelId) {
            const hotel = dest.hotels.results.find(
              (h) => h.id === dest.hotels.selectedHotelId
            );
            if (hotel) total += hotel.totalPrice;
          }

          // Add experience costs
          for (const expId of dest.experiences.selectedExperienceIds) {
            const exp = dest.experiences.items.find((e) => e.id === expId);
            if (exp) total += exp.priceUsd;
          }
        }

        // Add flight costs
        for (const leg of state.trip.flights.legs) {
          if (leg.selectedFlightId) {
            const flight = leg.flights.find((f) => f.id === leg.selectedFlightId);
            if (flight) total += flight.priceUsd;
          }
        }

        return total;
      },

      getRemainingBudget: () => {
        const state = get();
        return state.trip.basics.totalBudgetUsd - state.getTotalBudgetSpent();
      },

      // ============ SUMMARY HELPERS ============

      getDestinationSummary: (destinationId) => {
        const state = get();
        const dest = state.trip.destinations.find(
          (d) => d.destinationId === destinationId
        );
        if (!dest) return null;

        return {
          selectedSpots: dest.discovery.selectedSpotIds.length,
          selectedExperiences: dest.experiences.selectedExperienceIds.length,
          hotelSelected: dest.hotels.selectedHotelId !== null,
        };
      },

      getFlightsSummary: () => {
        const state = get();
        const { legs } = state.trip.flights;

        return {
          totalLegs: legs.length,
          completedLegs: legs.filter((l) => l.status === 'selected').length,
          skippedLegs: legs.filter((l) => l.status === 'skipped_booked').length,
        };
      },

      // ============ SHOPPING CART ACTIONS ============

      addToCart: (destinationId, recommendation) => {
        const cartItem: CartItem = {
          id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          destinationId,
          recommendation,
          addedAt: new Date().toISOString(),
        };
        set((state) => ({
          experienceCart: [...state.experienceCart, cartItem],
        }));
        // Also select the spot in discovery
        get().selectSpot(destinationId, recommendation.id);
      },

      removeFromCart: (cartItemId) => {
        const state = get();
        const cartItem = state.experienceCart.find((item) => item.id === cartItemId);
        if (cartItem) {
          // Also deselect the spot in discovery
          get().deselectSpot(cartItem.destinationId, cartItem.recommendation.id);
        }
        set((state) => ({
          experienceCart: state.experienceCart.filter((item) => item.id !== cartItemId),
        }));
      },

      getCartTotal: () => {
        const state = get();
        return state.experienceCart.reduce((total, item) => {
          return total + (item.recommendation.estimatedCostUsd || 0);
        }, 0);
      },

      getCartByDestination: (destinationId) => {
        const state = get();
        return state.experienceCart.filter((item) => item.destinationId === destinationId);
      },

      isInCart: (recommendationId) => {
        const state = get();
        return state.experienceCart.some((item) => item.recommendation.id === recommendationId);
      },

      // ============ DINING RESERVATION ACTIONS ============

      addDiningReservation: (reservation) => {
        const newReservation: DiningReservation = {
          id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          ...reservation,
        };
        set((state) => ({
          diningReservations: [...state.diningReservations, newReservation],
        }));
      },

      removeDiningReservation: (reservationId) => {
        set((state) => ({
          diningReservations: state.diningReservations.filter((r) => r.id !== reservationId),
        }));
      },

      getDiningReservations: (destinationId) => {
        const state = get();
        if (destinationId) {
          return state.diningReservations.filter((r) => r.destinationId === destinationId);
        }
        return state.diningReservations;
      },

      // ============ ITINERARY ASSIGNMENT ACTIONS ============

      setItineraryAssignments: (assignments) => {
        set({ itineraryAssignments: assignments });
      },

      moveExperienceToDay: (experienceId, newDayIndex) => {
        set((state) => {
          const existingIdx = state.itineraryAssignments.findIndex(
            (a) => a.experienceId === experienceId
          );
          if (existingIdx >= 0) {
            const updated = [...state.itineraryAssignments];
            updated[existingIdx] = { ...updated[existingIdx], dayIndex: newDayIndex };
            return { itineraryAssignments: updated };
          }
          // Create new assignment with default time
          return {
            itineraryAssignments: [
              ...state.itineraryAssignments,
              { experienceId, dayIndex: newDayIndex, timeSlot: '10:00' },
            ],
          };
        });
      },

      updateExperienceTime: (experienceId, newTime) => {
        set((state) => {
          const existingIdx = state.itineraryAssignments.findIndex(
            (a) => a.experienceId === experienceId
          );
          if (existingIdx >= 0) {
            const updated = [...state.itineraryAssignments];
            updated[existingIdx] = { ...updated[existingIdx], timeSlot: newTime };
            return { itineraryAssignments: updated };
          }
          // Create new assignment with day 0 by default
          return {
            itineraryAssignments: [
              ...state.itineraryAssignments,
              { experienceId, dayIndex: 0, timeSlot: newTime },
            ],
          };
        });
      },

      // ============ COLLECTIONS ACTIONS ============

      addToCollection: (type, item) => {
        set((state) => {
          // Check if item already exists
          const exists = state.collections[type].some(i => i.id === item.id);
          if (exists) return state;

          return {
            collections: {
              ...state.collections,
              [type]: [...state.collections[type], item],
            },
          };
        });
      },

      removeFromCollection: (type, itemId) => {
        set((state) => {
          if (type === 'experiences' || type === 'restaurants') {
            return {
              collections: {
                ...state.collections,
                [type]: state.collections[type].filter(i => i.id !== itemId),
              },
              // Also unschedule if scheduled
              scheduledItems: state.scheduledItems.filter(i => i.id !== itemId),
            };
          }

          // Custom list
          return {
            customLists: state.customLists.map(list =>
              list.id === type
                ? { ...list, items: list.items.filter(i => i.id !== itemId) }
                : list
            ),
          };
        });
      },

      scheduleItem: (itemId, dayIndex, position) => {
        set((state) => {
          // Find item in collections
          let item = state.collections.experiences.find(i => i.id === itemId)
            || state.collections.restaurants.find(i => i.id === itemId);

          // Also check custom lists
          if (!item) {
            for (const list of state.customLists) {
              item = list.items.find(i => i.id === itemId);
              if (item) break;
            }
          }

          if (!item) {
            return state;
          }

          // Check if already scheduled
          const existingIndex = state.scheduledItems.findIndex(i => i.id === itemId);

          if (existingIndex >= 0) {
            // Update existing
            const updated = [...state.scheduledItems];
            updated[existingIndex] = {
              ...updated[existingIndex],
              scheduledDayIndex: dayIndex,
              order: position ?? state.scheduledItems.filter(i => i.scheduledDayIndex === dayIndex).length,
            };
            return { scheduledItems: updated };
          }

          // Add new scheduled item
          const scheduledItem: CollectionItem = {
            ...item,
            scheduledDayIndex: dayIndex,
            order: position ?? state.scheduledItems.filter(i => i.scheduledDayIndex === dayIndex).length,
          };

          return {
            scheduledItems: [...state.scheduledItems, scheduledItem],
          };
        });
      },

      unscheduleItem: (itemId) => {
        set((state) => ({
          scheduledItems: state.scheduledItems.filter(i => i.id !== itemId),
        }));
      },

      updateScheduledItem: (itemId, updates) => {
        set((state) => ({
          scheduledItems: state.scheduledItems.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }));
      },

      reorderScheduledItem: (dayIndex, fromIndex, toIndex) => {
        set((state) => {
          // Get items for this day
          const dayItems = state.scheduledItems
            .filter(i => i.scheduledDayIndex === dayIndex)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          if (fromIndex < 0 || fromIndex >= dayItems.length || toIndex < 0 || toIndex >= dayItems.length) {
            return state;
          }

          // Reorder
          const [moved] = dayItems.splice(fromIndex, 1);
          dayItems.splice(toIndex, 0, moved);

          // Update orders
          const updatedDayItems = dayItems.map((item, idx) => ({
            ...item,
            order: idx,
          }));

          // Replace in scheduledItems
          const otherItems = state.scheduledItems.filter(i => i.scheduledDayIndex !== dayIndex);

          return {
            scheduledItems: [...otherItems, ...updatedDayItems],
          };
        });
      },

      moveItemBetweenDays: (fromDayIndex, toDayIndex, itemId, toPosition) => {
        set((state) => {
          const itemIndex = state.scheduledItems.findIndex(i => i.id === itemId);
          if (itemIndex < 0) return state;

          const updated = [...state.scheduledItems];
          updated[itemIndex] = {
            ...updated[itemIndex],
            scheduledDayIndex: toDayIndex,
            order: toPosition ?? state.scheduledItems.filter(i => i.scheduledDayIndex === toDayIndex).length,
          };

          return { scheduledItems: updated };
        });
      },

      createCustomList: (name, icon) => {
        set((state) => ({
          customLists: [
            ...state.customLists,
            {
              id: `list_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              name,
              icon: icon || '📁',
              items: [],
            },
          ],
        }));
      },

      deleteCustomList: (listId) => {
        set((state) => ({
          customLists: state.customLists.filter(l => l.id !== listId),
        }));
      },

      addToCustomList: (listId, item) => {
        set((state) => ({
          customLists: state.customLists.map(list =>
            list.id === listId
              ? { ...list, items: [...list.items, item] }
              : list
          ),
        }));
      },

      optimizeDay: async (dayIndex) => {
        const state = get();
        const dayItems = state.scheduledItems
          .filter(i => i.scheduledDayIndex === dayIndex && i.lat && i.lng)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        if (dayItems.length < 2) return;

        const result = getOptimizationComparison(
          dayItems.map(i => ({
            id: i.id,
            lat: i.lat!,
            lng: i.lng!,
            category: i.category,
            durationMinutes: i.durationMinutes,
          }))
        );

        // Apply optimized order
        const itemMap = new Map(dayItems.map(i => [i.id, i]));
        const reorderedItems: CollectionItem[] = [];
        result.optimizedOrder.forEach((id, idx) => {
          const item = itemMap.get(id);
          if (item) {
            reorderedItems.push({ ...item, order: idx });
          }
        });

        set((state) => {
          const otherItems = state.scheduledItems.filter(i => i.scheduledDayIndex !== dayIndex);
          return {
            scheduledItems: [...otherItems, ...reorderedItems],
          };
        });
      },

      autoFillDay: async (dayIndex, destinationId) => {
        const state = get();
        const dayItems = state.scheduledItems.filter(i => i.scheduledDayIndex === dayIndex);

        // Get unscheduled items from collections for this destination
        const scheduledIds = new Set(state.scheduledItems.map(i => i.id));
        const availableItems = [
          ...state.collections.experiences,
          ...state.collections.restaurants,
        ].filter(i =>
          !scheduledIds.has(i.id) &&
          (!i.destinationId || i.destinationId === destinationId) &&
          i.lat && i.lng
        );

        if (availableItems.length === 0) return;

        const suggestions = suggestItemsForDay(
          availableItems.map(i => ({
            id: i.id,
            lat: i.lat!,
            lng: i.lng!,
            category: i.category,
            durationMinutes: i.durationMinutes,
          })),
          dayItems.filter(i => i.lat && i.lng).map(i => ({
            id: i.id,
            lat: i.lat!,
            lng: i.lng!,
            category: i.category,
            durationMinutes: i.durationMinutes,
          })),
          5 // max items
        );

        // Schedule suggested items
        for (const id of suggestions) {
          get().scheduleItem(id, dayIndex);
        }
      },
    }),
    {
      name: 'wandercraft-trip-v2',
      partialize: (state) => ({
        trip: state.trip,
        collections: state.collections,
        customLists: state.customLists,
        scheduledItems: state.scheduledItems,
        experienceCart: state.experienceCart,
        diningReservations: state.diningReservations,
        itineraryAssignments: state.itineraryAssignments,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Zustand hydration error:', error);
        }
        // Always set hydrated to true, even if there was an error
        // This prevents the app from getting stuck on loading
        if (state) {
          state.setHasHydrated(true);
        } else {
          // Fallback: set directly on the store
          useTripStoreV2.setState({ _hasHydrated: true });
        }
      },
    }
  )
);
