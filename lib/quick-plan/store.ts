/**
 * Quick Plan Zustand Store
 * Manages wizard state with localStorage persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  QuickPlanState,
  TripPreferences,
  Tradeoff,
  AreaCandidate,
  HotelCandidate,
  RestaurantCandidate,
  QuickPlanItinerary,
  QualityCheckResult,
  ActivityIntent,
  DestinationContext,
  TradeoffResolution,
  ItinerarySplit,
  DiningMode,
} from '@/types/quick-plan';

// Local type aliases for backwards compatibility
type ResolvedTradeoff = TradeoffResolution;
type AreaSplit = ItinerarySplit;
import { getNextState, getPreviousState, STATE_METADATA } from './state-machine';
import { detectTradeoffs, applyResolution } from './tradeoff-engine';

// Initial preferences state
const INITIAL_PREFERENCES: TripPreferences = {
  // Destination
  destinationContext: null,
  // Dates
  startDate: null,
  endDate: null,
  tripLength: 7,
  isFlexibleDates: false,
  // Party
  adults: 2,
  children: 0,
  childAges: [],
  // Budget
  budgetPerNight: { min: 150, max: 350 },
  flexNights: 0,
  // Vibe
  pace: 'balanced',
  mustDos: [],
  hardNos: [],
  // Activities
  selectedActivities: [],
  // Hotel preferences
  adultsOnlyRequired: false,
  adultsOnlyPreferred: false,
  allInclusivePreferred: false,
  hotelVibePreferences: [],
  // Dining preferences
  diningMode: 'list',
  diningImportance: 'medium',
  diningVibes: [],
  budgetPerMeal: { min: 20, max: 60 },
  dietaryRestrictions: [],
  // Tradeoffs
  detectedTradeoffs: [],
  resolvedTradeoffs: [],
  // Areas
  selectedAreas: [],
  selectedSplit: null,
  maxBases: 2,
  // Hotels
  selectedHotels: {},
  // Lock status
  preferencesLocked: false,
};

interface QuickPlanStore {
  // Wizard state
  currentState: QuickPlanState;
  preferences: TripPreferences;
  isLoading: boolean;
  error: string | null;

  // Discovered data
  discoveredAreas: AreaCandidate[];
  hotelShortlists: Map<string, HotelCandidate[]>;
  restaurantShortlists: Map<string, RestaurantCandidate[]>;
  selectedRestaurants: Map<string, RestaurantCandidate[]>;

  // Generated itinerary
  itinerary: QuickPlanItinerary | null;
  qualityCheckResult: QualityCheckResult | null;

  // UI state
  isSidebarOpen: boolean;
  activeChatInput: string;

  // State navigation
  goToNextState: () => void;
  goToPreviousState: () => void;
  goToState: (state: QuickPlanState) => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;

  // Preference updates
  setDestination: (context: DestinationContext) => void;
  setDates: (startDate: Date | null, endDate: Date | null, tripLength: number) => void;
  setParty: (adults: number, children: number, childAges: number[]) => void;
  setBudget: (min: number, max: number, flexNights: number) => void;
  setPace: (pace: 'chill' | 'balanced' | 'packed') => void;
  setVibeAndHardNos: (mustDos: string[], hardNos: string[], vibes: string[]) => void;
  setActivities: (activities: ActivityIntent[]) => void;
  updateActivityIntensity: (type: string, updates: Partial<ActivityIntent>) => void;
  setMaxBases: (max: number) => void;
  setDiningMode: (mode: DiningMode) => void;

  // Tradeoff handling
  detectAndSetTradeoffs: () => void;
  resolveTradeoff: (tradeoffId: string, optionId: string, customInput?: string) => void;

  // Area selection
  setDiscoveredAreas: (areas: AreaCandidate[]) => void;
  selectArea: (area: AreaCandidate) => void;
  deselectArea: (areaId: string) => void;
  setSelectedSplit: (split: AreaSplit) => void;

  // Hotel selection
  setHotelShortlist: (areaId: string, hotels: HotelCandidate[]) => void;
  selectHotel: (areaId: string, hotel: HotelCandidate) => void;

  // Restaurant selection
  setRestaurantShortlist: (areaId: string, restaurants: RestaurantCandidate[]) => void;
  selectRestaurant: (areaId: string, restaurant: RestaurantCandidate) => void;
  deselectRestaurant: (areaId: string, placeId: string) => void;

  // Itinerary management
  setItinerary: (itinerary: QuickPlanItinerary) => void;
  setQualityCheckResult: (result: QualityCheckResult) => void;
  lockPreferences: () => void;
  unlockPreferences: () => void;

  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setChatInput: (input: string) => void;
  toggleSidebar: () => void;

  // Session management
  reset: () => void;
  loadFromSaved: (data: Partial<QuickPlanStore>) => void;
}

export const useQuickPlanStore = create<QuickPlanStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentState: 'DESTINATION',
      preferences: { ...INITIAL_PREFERENCES },
      isLoading: false,
      error: null,
      discoveredAreas: [],
      hotelShortlists: new Map(),
      restaurantShortlists: new Map(),
      selectedRestaurants: new Map(),
      itinerary: null,
      qualityCheckResult: null,
      isSidebarOpen: true,
      activeChatInput: '',

      // State navigation
      goToNextState: () => {
        const { currentState, preferences } = get();
        const nextState = getNextState(currentState, preferences);
        if (nextState) {
          set({ currentState: nextState, error: null });
        }
      },

      goToPreviousState: () => {
        const { currentState, preferences } = get();
        const prevState = getPreviousState(currentState, preferences);
        if (prevState) {
          set({ currentState: prevState, error: null });
        }
      },

      goToState: (state: QuickPlanState) => {
        set({ currentState: state, error: null });
      },

      canGoBack: () => {
        const { currentState, preferences } = get();
        return getPreviousState(currentState, preferences) !== null;
      },

      canGoForward: () => {
        const { currentState, preferences } = get();
        return getNextState(currentState, preferences) !== null;
      },

      // Preference updates
      setDestination: (context) => {
        set((state) => ({
          preferences: { ...state.preferences, destinationContext: context },
        }));
      },

      setDates: (startDate, endDate, tripLength) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            startDate,
            endDate,
            tripLength,
          },
        }));
      },

      setParty: (adults, children, childAges) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            adults,
            children,
            childAges,
          },
        }));
      },

      setBudget: (min, max, flexNights) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            budgetPerNight: { min, max },
            flexNights,
          },
        }));
      },

      setPace: (pace) => {
        set((state) => ({
          preferences: { ...state.preferences, pace },
        }));
      },

      setVibeAndHardNos: (mustDos, hardNos, vibes) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            mustDos,
            hardNos,
            hotelVibePreferences: vibes,
          },
        }));
      },

      setActivities: (activities) => {
        set((state) => ({
          preferences: { ...state.preferences, selectedActivities: activities },
        }));
      },

      updateActivityIntensity: (type, updates) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            selectedActivities: state.preferences.selectedActivities.map((a) =>
              a.type === type ? { ...a, ...updates } : a
            ),
          },
        }));
      },

      setMaxBases: (max) => {
        set((state) => ({
          preferences: { ...state.preferences, maxBases: max },
        }));
      },

      setDiningMode: (mode) => {
        set((state) => ({
          preferences: { ...state.preferences, diningMode: mode },
        }));
      },

      // Tradeoff handling
      detectAndSetTradeoffs: () => {
        const { preferences } = get();
        const tradeoffs = detectTradeoffs(preferences);
        set((state) => ({
          preferences: { ...state.preferences, detectedTradeoffs: tradeoffs },
        }));
      },

      resolveTradeoff: (tradeoffId, optionId, customInput) => {
        const { preferences } = get();
        const updated = applyResolution(preferences, tradeoffId, optionId, customInput);
        set({ preferences: updated });
      },

      // Area selection
      setDiscoveredAreas: (areas) => {
        set({ discoveredAreas: areas });
      },

      selectArea: (area) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            selectedAreas: [...state.preferences.selectedAreas, area],
          },
        }));
      },

      deselectArea: (areaId) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            selectedAreas: state.preferences.selectedAreas.filter(
              (a) => a.id !== areaId
            ),
          },
        }));
      },

      setSelectedSplit: (split) => {
        set((state) => ({
          preferences: { ...state.preferences, selectedSplit: split },
        }));
      },

      // Hotel selection
      setHotelShortlist: (areaId, hotels) => {
        set((state) => {
          const newShortlists = new Map(state.hotelShortlists);
          newShortlists.set(areaId, hotels);
          return { hotelShortlists: newShortlists };
        });
      },

      selectHotel: (areaId, hotel) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            selectedHotels: { ...state.preferences.selectedHotels, [areaId]: hotel },
          },
        }));
      },

      // Restaurant selection
      setRestaurantShortlist: (areaId, restaurants) => {
        set((state) => {
          const newShortlists = new Map(state.restaurantShortlists);
          newShortlists.set(areaId, restaurants);
          return { restaurantShortlists: newShortlists };
        });
      },

      selectRestaurant: (areaId, restaurant) => {
        set((state) => {
          const newSelected = new Map(state.selectedRestaurants);
          const current = newSelected.get(areaId) || [];
          if (!current.some((r) => r.placeId === restaurant.placeId)) {
            newSelected.set(areaId, [...current, restaurant]);
          }
          return { selectedRestaurants: newSelected };
        });
      },

      deselectRestaurant: (areaId, placeId) => {
        set((state) => {
          const newSelected = new Map(state.selectedRestaurants);
          const current = newSelected.get(areaId) || [];
          newSelected.set(
            areaId,
            current.filter((r) => r.placeId !== placeId)
          );
          return { selectedRestaurants: newSelected };
        });
      },

      // Itinerary management
      setItinerary: (itinerary) => {
        set({ itinerary });
      },

      setQualityCheckResult: (result) => {
        set({ qualityCheckResult: result });
      },

      lockPreferences: () => {
        set((state) => ({
          preferences: { ...state.preferences, preferencesLocked: true },
        }));
      },

      unlockPreferences: () => {
        set((state) => ({
          preferences: { ...state.preferences, preferencesLocked: false },
        }));
      },

      // UI actions
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      setChatInput: (input) => {
        set({ activeChatInput: input });
      },

      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
      },

      // Session management
      reset: () => {
        set({
          currentState: 'DESTINATION',
          preferences: { ...INITIAL_PREFERENCES },
          isLoading: false,
          error: null,
          discoveredAreas: [],
          hotelShortlists: new Map(),
          restaurantShortlists: new Map(),
          itinerary: null,
          qualityCheckResult: null,
          activeChatInput: '',
        });
      },

      loadFromSaved: (data) => {
        set((state) => ({
          ...state,
          ...data,
        }));
      },
    }),
    {
      name: 'quick-plan-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentState: state.currentState,
        preferences: state.preferences,
        selectedRestaurants: Array.from(state.selectedRestaurants.entries()),
        discoveredAreas: state.discoveredAreas,
        itinerary: state.itinerary,
      }),
      // Custom merge to handle Map rehydration
      merge: (persistedState: any, currentState) => {
        if (!persistedState) return currentState;

        return {
          ...currentState,
          ...persistedState,
          preferences: persistedState.preferences || currentState.preferences,
          selectedRestaurants: new Map(persistedState.selectedRestaurants || []),
          hotelShortlists: new Map(),
          restaurantShortlists: new Map(),
        };
      },
    }
  )
);

// Selector hooks for performance
export const useCurrentState = () => useQuickPlanStore((state) => state.currentState);
export const usePreferences = () => useQuickPlanStore((state) => state.preferences);
export const useIsLoading = () => useQuickPlanStore((state) => state.isLoading);
export const useError = () => useQuickPlanStore((state) => state.error);
export const useItinerary = () => useQuickPlanStore((state) => state.itinerary);
export const useQualityCheck = () => useQuickPlanStore((state) => state.qualityCheckResult);

// Get current state metadata
export const useStateMetadata = () => {
  const currentState = useCurrentState();
  return STATE_METADATA[currentState];
};

// Get progress percentage
export const useProgress = () => {
  const currentState = useCurrentState();
  const preferences = usePreferences();

  const STATE_ORDER = [
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
  ] as const;

  const currentIndex = STATE_ORDER.indexOf(currentState);
  return Math.round(((currentIndex + 1) / STATE_ORDER.length) * 100);
};
