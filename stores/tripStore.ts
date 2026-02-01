import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  TripState,
  Destination,
  TravelDates,
  Travelers,
  TripType,
  Budget,
  BudgetAllocation,
  Flight,
  Hotel,
  Experience,
  ItineraryDayScheduled,
  ItineraryItemScheduled,
  SentimentData,
  Airport,
  TripLeg,
  ChatSession,
  ChatMessage,
  FlightFilters,
  HotelFilters,
  SpecificLocation,
} from '@/types';

const DEFAULT_BUDGET_ALLOCATION: BudgetAllocation = {
  flights: 30,
  accommodation: 35,
  experiences: 15,
  food: 15,
  transit: 5,
};

const BUDGET_PRESETS: Record<string, BudgetAllocation> = {
  luxury: {
    flights: 25,
    accommodation: 45,
    experiences: 15,
    food: 10,
    transit: 5,
  },
  experience: {
    flights: 20,
    accommodation: 25,
    experiences: 35,
    food: 15,
    transit: 5,
  },
  budget: {
    flights: 35,
    accommodation: 30,
    experiences: 15,
    food: 15,
    transit: 5,
  },
  custom: DEFAULT_BUDGET_ALLOCATION,
};

const DEFAULT_FLIGHT_FILTERS: FlightFilters = {
  cabinClasses: [],
  maxStops: null,
  maxDurationMinutes: null,
  airlines: [],
  departureTimeOfDay: [],
  priceRange: null,
};

const DEFAULT_HOTEL_FILTERS: HotelFilters = {
  priceRange: null,
  starRatings: [],
  amenities: [],
  maxDistanceFromCenter: null,
  minGuestRating: null,
  redditRecommendedOnly: false,
};

const generateId = () => Math.random().toString(36).substring(2, 11);

const createLeg = (destination: Destination, order: number): TripLeg => ({
  id: generateId(),
  order,
  destination,
  specificLocations: [],
  startDate: null,
  endDate: null,
  days: 0,
  inboundFlight: null,
  outboundFlight: null,
  hotel: null,
  experiences: [],
  budget: {
    allocated: 0,
    spent: 0,
  },
});

const initialState = {
  // Multi-destination
  legs: [] as TripLeg[],
  activeLegId: null as string | null,

  // Shared trip info
  origin: null as Airport | null,
  dates: {
    startDate: null,
    endDate: null,
    isFlexible: false,
  } as TravelDates,
  travelers: {
    adults: 2,
    children: 0,
  } as Travelers,
  tripType: 'couple' as TripType,

  // Budget
  budget: {
    total: 3000,
    allocation: DEFAULT_BUDGET_ALLOCATION,
    preset: 'custom' as const,
    remaining: 3000,
  } as Budget,

  // Chat sessions
  chatSessions: [] as ChatSession[],

  // Filters
  flightFilters: DEFAULT_FLIGHT_FILTERS,
  hotelFilters: DEFAULT_HOTEL_FILTERS,

  // Itinerary
  itinerary: [] as ItineraryDayScheduled[],

  // UI State
  currentStep: 1,

  // Legacy computed properties (kept for backward compatibility)
  destination: null as Destination | null,
  destinationSentiment: null as SentimentData | null,
  selectedFlight: null as Flight | null,
  selectedReturnFlight: null as Flight | null,
  selectedHotel: null as Hotel | null,
  selectedExperiences: [] as Experience[],
};

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ============ LEG ACTIONS ============

      addLeg: (destination: Destination) =>
        set((state) => {
          const newLeg = createLeg(destination, state.legs.length);
          const newLegs = [...state.legs, newLeg];
          return {
            legs: newLegs,
            activeLegId: state.activeLegId || newLeg.id,
            // Update legacy destination to first leg
            destination: newLegs[0]?.destination || null,
          };
        }),

      removeLeg: (legId: string) =>
        set((state) => {
          const newLegs = state.legs
            .filter((leg) => leg.id !== legId)
            .map((leg, index) => ({ ...leg, order: index }));

          // Recalculate budget spent
          let newActiveLegId = state.activeLegId;
          if (state.activeLegId === legId) {
            newActiveLegId = newLegs[0]?.id || null;
          }

          return {
            legs: newLegs,
            activeLegId: newActiveLegId,
            destination: newLegs[0]?.destination || null,
          };
        }),

      reorderLegs: (legIds: string[]) =>
        set((state) => {
          const legMap = new Map(state.legs.map((leg) => [leg.id, leg]));
          const reorderedLegs = legIds
            .map((id, index) => {
              const leg = legMap.get(id);
              return leg ? { ...leg, order: index } : null;
            })
            .filter((leg): leg is TripLeg => leg !== null);

          return {
            legs: reorderedLegs,
            destination: reorderedLegs[0]?.destination || null,
          };
        }),

      setActiveLeg: (legId: string) =>
        set((state) => {
          const activeLeg = state.legs.find((leg) => leg.id === legId);
          return {
            activeLegId: legId,
            // Update legacy properties
            destination: activeLeg?.destination || null,
            selectedFlight: activeLeg?.inboundFlight || null,
            selectedReturnFlight: activeLeg?.outboundFlight || null,
            selectedHotel: activeLeg?.hotel || null,
            selectedExperiences: activeLeg?.experiences || [],
          };
        }),

      updateLeg: (legId: string, updates: Partial<TripLeg>) =>
        set((state) => ({
          legs: state.legs.map((leg) =>
            leg.id === legId ? { ...leg, ...updates } : leg
          ),
        })),

      setLegDates: (legId: string, startDate: Date, endDate: Date) =>
        set((state) => {
          const days = Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            legs: state.legs.map((leg) =>
              leg.id === legId ? { ...leg, startDate, endDate, days } : leg
            ),
          };
        }),

      setLegFlight: (legId: string, type: 'inbound' | 'outbound', flight: Flight | null) =>
        set((state) => {
          const leg = state.legs.find((l) => l.id === legId);
          if (!leg) return state;

          const oldFlight = type === 'inbound' ? leg.inboundFlight : leg.outboundFlight;
          const oldCost = oldFlight?.price || 0;
          const newCost = flight?.price || 0;

          return {
            legs: state.legs.map((l) =>
              l.id === legId
                ? {
                    ...l,
                    [type === 'inbound' ? 'inboundFlight' : 'outboundFlight']: flight,
                    budget: {
                      ...l.budget,
                      spent: l.budget.spent - oldCost + newCost,
                    },
                  }
                : l
            ),
            budget: {
              ...state.budget,
              remaining: state.budget.remaining + oldCost - newCost,
            },
          };
        }),

      setLegHotel: (legId: string, hotel: Hotel | null) =>
        set((state) => {
          const leg = state.legs.find((l) => l.id === legId);
          if (!leg) return state;

          const oldCost = leg.hotel?.totalPrice || 0;
          const newCost = hotel?.totalPrice || 0;

          return {
            legs: state.legs.map((l) =>
              l.id === legId
                ? {
                    ...l,
                    hotel,
                    budget: {
                      ...l.budget,
                      spent: l.budget.spent - oldCost + newCost,
                    },
                  }
                : l
            ),
            budget: {
              ...state.budget,
              remaining: state.budget.remaining + oldCost - newCost,
            },
          };
        }),

      addLegExperience: (legId: string, experience: Experience) =>
        set((state) => {
          const leg = state.legs.find((l) => l.id === legId);
          if (!leg) return state;

          return {
            legs: state.legs.map((l) =>
              l.id === legId
                ? {
                    ...l,
                    experiences: [...l.experiences, experience],
                    budget: {
                      ...l.budget,
                      spent: l.budget.spent + experience.price,
                    },
                  }
                : l
            ),
            budget: {
              ...state.budget,
              remaining: state.budget.remaining - experience.price,
            },
          };
        }),

      removeLegExperience: (legId: string, experienceId: string) =>
        set((state) => {
          const leg = state.legs.find((l) => l.id === legId);
          if (!leg) return state;

          const experience = leg.experiences.find((e) => e.id === experienceId);
          const cost = experience?.price || 0;

          return {
            legs: state.legs.map((l) =>
              l.id === legId
                ? {
                    ...l,
                    experiences: l.experiences.filter((e) => e.id !== experienceId),
                    budget: {
                      ...l.budget,
                      spent: l.budget.spent - cost,
                    },
                  }
                : l
            ),
            budget: {
              ...state.budget,
              remaining: state.budget.remaining + cost,
            },
          };
        }),

      setLegSpecificLocations: (legId: string, locations: SpecificLocation[]) =>
        set((state) => ({
          legs: state.legs.map((leg) =>
            leg.id === legId ? { ...leg, specificLocations: locations } : leg
          ),
        })),

      distributeBudgetAcrossLegs: () =>
        set((state) => {
          if (state.legs.length === 0) return state;

          const totalDays = state.legs.reduce((sum, leg) => sum + (leg.days || 1), 0);
          const budgetPerDay = state.budget.total / totalDays;

          return {
            legs: state.legs.map((leg) => ({
              ...leg,
              budget: {
                ...leg.budget,
                allocated: Math.round(budgetPerDay * (leg.days || 1)),
              },
            })),
          };
        }),

      adjustLegBudget: (legId: string, allocated: number) =>
        set((state) => ({
          legs: state.legs.map((leg) =>
            leg.id === legId
              ? { ...leg, budget: { ...leg.budget, allocated } }
              : leg
          ),
        })),

      // ============ CHAT ACTIONS ============

      addChatSession: (session: ChatSession) =>
        set((state) => ({
          chatSessions: [...state.chatSessions, session],
        })),

      addChatMessage: (sessionId: string, message: ChatMessage) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((session) =>
            session.id === sessionId
              ? { ...session, messages: [...session.messages, message] }
              : session
          ),
        })),

      completeChatSession: (sessionId: string) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((session) =>
            session.id === sessionId
              ? { ...session, isComplete: true }
              : session
          ),
        })),

      getChatSession: (legId: string, type: 'destination' | 'experiences') => {
        const state = get();
        return state.chatSessions.find(
          (session) => session.legId === legId && session.type === type
        );
      },

      // ============ FILTER ACTIONS ============

      setFlightFilters: (filters: Partial<FlightFilters>) =>
        set((state) => ({
          flightFilters: { ...state.flightFilters, ...filters },
        })),

      setHotelFilters: (filters: Partial<HotelFilters>) =>
        set((state) => ({
          hotelFilters: { ...state.hotelFilters, ...filters },
        })),

      resetFlightFilters: () =>
        set({ flightFilters: DEFAULT_FLIGHT_FILTERS }),

      resetHotelFilters: () =>
        set({ hotelFilters: DEFAULT_HOTEL_FILTERS }),

      // ============ LEGACY ACTIONS (backward compatibility) ============

      setDestination: (destination: Destination | null) =>
        set((state) => {
          if (destination) {
            if (state.legs.length === 0) {
              // Add as first leg
              const newLeg = createLeg(destination, 0);
              return {
                legs: [newLeg],
                activeLegId: newLeg.id,
                destination,
              };
            } else if (state.activeLegId) {
              // Update active leg
              return {
                legs: state.legs.map((leg) =>
                  leg.id === state.activeLegId
                    ? { ...leg, destination }
                    : leg
                ),
                destination,
              };
            }
          }
          return { destination };
        }),

      setDestinationSentiment: (sentiment: SentimentData | null) =>
        set({ destinationSentiment: sentiment }),

      setOrigin: (origin: Airport | null) => set({ origin }),

      setDates: (dates: TravelDates) => set({ dates }),

      setTravelers: (travelers: Travelers) => set({ travelers }),

      setTripType: (tripType: TripType) => set({ tripType }),

      setBudget: (budget: Budget) => set({ budget }),

      updateBudgetAllocation: (allocation: Partial<BudgetAllocation>) =>
        set((state) => ({
          budget: {
            ...state.budget,
            allocation: { ...state.budget.allocation, ...allocation },
            preset: 'custom',
          },
        })),

      setSelectedFlight: (flight: Flight | null) =>
        set((state) => {
          if (state.activeLegId) {
            const leg = state.legs.find((l) => l.id === state.activeLegId);
            if (leg) {
              const oldCost = leg.inboundFlight?.price || 0;
              const newCost = flight?.price || 0;
              return {
                selectedFlight: flight,
                legs: state.legs.map((l) =>
                  l.id === state.activeLegId
                    ? {
                        ...l,
                        inboundFlight: flight,
                        budget: { ...l.budget, spent: l.budget.spent - oldCost + newCost },
                      }
                    : l
                ),
                budget: {
                  ...state.budget,
                  remaining: state.budget.remaining + oldCost - newCost,
                },
              };
            }
          }
          // Fallback for legacy mode
          const flightCost = flight ? flight.price : 0;
          const prevFlightCost = state.selectedFlight ? state.selectedFlight.price : 0;
          return {
            selectedFlight: flight,
            budget: {
              ...state.budget,
              remaining: state.budget.remaining + prevFlightCost - flightCost,
            },
          };
        }),

      setSelectedReturnFlight: (flight: Flight | null) =>
        set((state) => {
          if (state.activeLegId) {
            const leg = state.legs.find((l) => l.id === state.activeLegId);
            if (leg) {
              const oldCost = leg.outboundFlight?.price || 0;
              const newCost = flight?.price || 0;
              return {
                selectedReturnFlight: flight,
                legs: state.legs.map((l) =>
                  l.id === state.activeLegId
                    ? {
                        ...l,
                        outboundFlight: flight,
                        budget: { ...l.budget, spent: l.budget.spent - oldCost + newCost },
                      }
                    : l
                ),
                budget: {
                  ...state.budget,
                  remaining: state.budget.remaining + oldCost - newCost,
                },
              };
            }
          }
          // Fallback for legacy mode
          const flightCost = flight ? flight.price : 0;
          const prevFlightCost = state.selectedReturnFlight ? state.selectedReturnFlight.price : 0;
          return {
            selectedReturnFlight: flight,
            budget: {
              ...state.budget,
              remaining: state.budget.remaining + prevFlightCost - flightCost,
            },
          };
        }),

      setSelectedHotel: (hotel: Hotel | null) =>
        set((state) => {
          if (state.activeLegId) {
            const leg = state.legs.find((l) => l.id === state.activeLegId);
            if (leg) {
              const oldCost = leg.hotel?.totalPrice || 0;
              const newCost = hotel?.totalPrice || 0;
              return {
                selectedHotel: hotel,
                legs: state.legs.map((l) =>
                  l.id === state.activeLegId
                    ? {
                        ...l,
                        hotel,
                        budget: { ...l.budget, spent: l.budget.spent - oldCost + newCost },
                      }
                    : l
                ),
                budget: {
                  ...state.budget,
                  remaining: state.budget.remaining + oldCost - newCost,
                },
              };
            }
          }
          // Fallback for legacy mode
          const hotelCost = hotel ? hotel.totalPrice : 0;
          const prevHotelCost = state.selectedHotel ? state.selectedHotel.totalPrice : 0;
          return {
            selectedHotel: hotel,
            budget: {
              ...state.budget,
              remaining: state.budget.remaining + prevHotelCost - hotelCost,
            },
          };
        }),

      addExperience: (experience: Experience) =>
        set((state) => {
          if (state.activeLegId) {
            return {
              selectedExperiences: [...state.selectedExperiences, experience],
              legs: state.legs.map((l) =>
                l.id === state.activeLegId
                  ? {
                      ...l,
                      experiences: [...l.experiences, experience],
                      budget: { ...l.budget, spent: l.budget.spent + experience.price },
                    }
                  : l
              ),
              budget: {
                ...state.budget,
                remaining: state.budget.remaining - experience.price,
              },
            };
          }
          return {
            selectedExperiences: [...state.selectedExperiences, experience],
            budget: {
              ...state.budget,
              remaining: state.budget.remaining - experience.price,
            },
          };
        }),

      removeExperience: (experienceId: string) =>
        set((state) => {
          const experience = state.selectedExperiences.find((e) => e.id === experienceId);
          const cost = experience?.price || 0;

          if (state.activeLegId) {
            return {
              selectedExperiences: state.selectedExperiences.filter((e) => e.id !== experienceId),
              legs: state.legs.map((l) =>
                l.id === state.activeLegId
                  ? {
                      ...l,
                      experiences: l.experiences.filter((e) => e.id !== experienceId),
                      budget: { ...l.budget, spent: l.budget.spent - cost },
                    }
                  : l
              ),
              budget: {
                ...state.budget,
                remaining: state.budget.remaining + cost,
              },
            };
          }
          return {
            selectedExperiences: state.selectedExperiences.filter((e) => e.id !== experienceId),
            budget: {
              ...state.budget,
              remaining: state.budget.remaining + cost,
            },
          };
        }),

      setItinerary: (itinerary: ItineraryDayScheduled[]) => set({ itinerary }),

      updateItineraryDay: (dayIndex: number, items: ItineraryItemScheduled[]) =>
        set((state) => {
          const newItinerary = [...state.itinerary];
          if (newItinerary[dayIndex]) {
            newItinerary[dayIndex] = {
              ...newItinerary[dayIndex],
              scheduledItems: items,
              items: items,
              totalCost: items.reduce((sum, item) => sum + (item.cost || 0), 0),
            };
          }
          return { itinerary: newItinerary };
        }),

      setCurrentStep: (step: number) => set({ currentStep: step }),

      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, 9),
        })),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 1),
        })),

      resetTrip: () => set(initialState),

      getRemainingBudget: () => {
        const state = get();
        return state.budget.remaining;
      },

      getActiveLeg: () => {
        const state = get();
        return state.legs.find((leg) => leg.id === state.activeLegId) || null;
      },

      getTotalSpent: () => {
        const state = get();
        return state.legs.reduce((sum, leg) => sum + leg.budget.spent, 0);
      },
    }),
    {
      name: 'wandercraft-trip',
      partialize: (state) => ({
        legs: state.legs,
        activeLegId: state.activeLegId,
        origin: state.origin,
        dates: state.dates,
        travelers: state.travelers,
        tripType: state.tripType,
        budget: state.budget,
        chatSessions: state.chatSessions,
        flightFilters: state.flightFilters,
        hotelFilters: state.hotelFilters,
        itinerary: state.itinerary,
        currentStep: state.currentStep,
        // Legacy
        destination: state.destination,
        selectedFlight: state.selectedFlight,
        selectedReturnFlight: state.selectedReturnFlight,
        selectedHotel: state.selectedHotel,
        selectedExperiences: state.selectedExperiences,
      }),
    }
  )
);

export { BUDGET_PRESETS, DEFAULT_FLIGHT_FILTERS, DEFAULT_HOTEL_FILTERS };
