'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTripStore } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import {
  Plane,
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import type { Flight, FlightLeg } from '@/lib/schemas/trip';

// Airline data with proper logos (using pics.avs.io which is reliable)
const AIRLINE_DATA = [
  { code: 'UA', name: 'United Airlines' },
  { code: 'AA', name: 'American Airlines' },
  { code: 'DL', name: 'Delta Air Lines' },
  { code: 'WN', name: 'Southwest Airlines' },
  { code: 'B6', name: 'JetBlue Airways' },
  { code: 'AS', name: 'Alaska Airlines' },
  { code: 'NK', name: 'Spirit Airlines' },
  { code: 'F9', name: 'Frontier Airlines' },
];

// Get airline logo URL (pics.avs.io is reliable for airline logos)
const getAirlineLogo = (code: string) => `https://pics.avs.io/200/80/${code}.png`;

// Aircraft types for realistic data
const AIRCRAFT_TYPES = ['Boeing 787-9 Dreamliner', 'Airbus A350-900', 'Boeing 777-300ER', 'Airbus A380-800', 'Boeing 737 MAX 9'];

// Connection airports for layovers
const CONNECTION_AIRPORTS: Record<string, { code: string; city: string }[]> = {
  'default': [
    { code: 'DFW', city: 'Dallas' },
    { code: 'ORD', city: 'Chicago' },
    { code: 'ATL', city: 'Atlanta' },
    { code: 'DEN', city: 'Denver' },
    { code: 'IAH', city: 'Houston' },
  ]
};

// Generate flight segment with full details
interface FlightSegment {
  segmentId: string;
  flightNumber: string;
  airline: string;
  airlineLogo: string;
  departureAirport: string;
  departureCity: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalCity: string;
  arrivalTime: string;
  durationMinutes: number;
  aircraft: string;
  cabinClass: string;
}

interface FlightWithSegments extends Flight {
  segments: FlightSegment[];
  layoverMinutes?: number[];
}

// Mock flight data (fallback when API fails)
const generateMockFlights = (from: string, to: string, date: string, fromCity: string, toCity: string): FlightWithSegments[] => {
  const connections = CONNECTION_AIRPORTS['default'];

  return AIRLINE_DATA.slice(0, 6).map((airline, idx) => {
    const hasStop = idx % 2 === 1 || idx === 3; // Some flights with 1 stop
    const connection = connections[idx % connections.length];

    const baseHour = 6 + idx * 2;
    const flightDuration = hasStop ? 420 + idx * 30 : 180 + idx * 20; // Longer for connecting flights
    const layoverDuration = hasStop ? 90 + (idx * 15) : 0;

    const segments: FlightSegment[] = [];

    if (hasStop) {
      // First segment: origin to connection
      const seg1Duration = Math.floor(flightDuration * 0.45);
      segments.push({
        segmentId: `seg_${idx}_1`,
        flightNumber: `${airline.code}${1000 + idx * 100}`,
        airline: airline.name,
        airlineLogo: getAirlineLogo(airline.code),
        departureAirport: from,
        departureCity: fromCity,
        departureTime: `${String(baseHour).padStart(2, '0')}:00`,
        arrivalAirport: connection.code,
        arrivalCity: connection.city,
        arrivalTime: `${String(baseHour + Math.floor(seg1Duration / 60)).padStart(2, '0')}:${String(seg1Duration % 60).padStart(2, '0')}`,
        durationMinutes: seg1Duration,
        aircraft: AIRCRAFT_TYPES[idx % AIRCRAFT_TYPES.length],
        cabinClass: 'Economy',
      });

      // Second segment: connection to destination
      const seg2Start = baseHour + Math.floor(seg1Duration / 60) + Math.floor(layoverDuration / 60);
      const seg2Duration = Math.floor(flightDuration * 0.55);
      segments.push({
        segmentId: `seg_${idx}_2`,
        flightNumber: `${airline.code}${1100 + idx * 100}`,
        airline: airline.name,
        airlineLogo: getAirlineLogo(airline.code),
        departureAirport: connection.code,
        departureCity: connection.city,
        departureTime: `${String(seg2Start % 24).padStart(2, '0')}:${String(layoverDuration % 60).padStart(2, '0')}`,
        arrivalAirport: to,
        arrivalCity: toCity,
        arrivalTime: `${String((seg2Start + Math.floor(seg2Duration / 60)) % 24).padStart(2, '0')}:${String(seg2Duration % 60).padStart(2, '0')}`,
        durationMinutes: seg2Duration,
        aircraft: AIRCRAFT_TYPES[(idx + 1) % AIRCRAFT_TYPES.length],
        cabinClass: 'Economy',
      });
    } else {
      // Non-stop flight - single segment
      segments.push({
        segmentId: `seg_${idx}_1`,
        flightNumber: `${airline.code}${1000 + idx * 100}`,
        airline: airline.name,
        airlineLogo: getAirlineLogo(airline.code),
        departureAirport: from,
        departureCity: fromCity,
        departureTime: `${String(baseHour).padStart(2, '0')}:00`,
        arrivalAirport: to,
        arrivalCity: toCity,
        arrivalTime: `${String((baseHour + Math.floor(flightDuration / 60)) % 24).padStart(2, '0')}:${String(flightDuration % 60).padStart(2, '0')}`,
        durationMinutes: flightDuration,
        aircraft: AIRCRAFT_TYPES[idx % AIRCRAFT_TYPES.length],
        cabinClass: 'Economy',
      });
    }

    return {
      id: `flight_${from}_${to}_${idx}_${Date.now()}`,
      airline: airline.name,
      airlineLogo: getAirlineLogo(airline.code),
      flightNumber: segments[0].flightNumber,
      departureAirport: from,
      departureCity: fromCity,
      departureTime: segments[0].departureTime,
      arrivalAirport: to,
      arrivalCity: toCity,
      arrivalTime: segments[segments.length - 1].arrivalTime,
      durationMinutes: flightDuration + layoverDuration,
      stops: hasStop ? 1 : 0,
      priceUsd: hasStop ? (280 + idx * 40) : (350 + idx * 60), // Non-stop more expensive
      cabinClass: 'Economy',
      segments,
      layoverMinutes: hasStop ? [layoverDuration] : [],
    };
  });
};

function FlightLegCard({
  leg,
  isActive,
  onSelect,
  onSkip,
  onUnskip,
}: {
  leg: FlightLeg;
  isActive: boolean;
  onSelect: () => void;
  onSkip: () => void;
  onUnskip: () => void;
}) {
  const isComplete = leg.status === 'selected' || leg.status === 'skipped_booked';
  const isSkipped = leg.status === 'skipped_booked';

  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full p-4 rounded-xl border-2 text-left transition-all',
        isActive
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
          : isComplete
          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30'
          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isComplete ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            )}
          >
            {isComplete ? <Check className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <span>{leg.from.iata}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span>{leg.to.iata}</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {leg.from.city} to {leg.to.city}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500 dark:text-slate-400">{leg.date}</p>
          {isSkipped && (
            <span className="text-xs text-amber-600 font-medium">Already booked</span>
          )}
          {leg.selectedFlightId && !isSkipped && (
            <span className="text-xs text-green-600 font-medium">Flight selected</span>
          )}
        </div>
      </div>

      {/* Skip toggle */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={(e) => {
            e.stopPropagation();
            isSkipped ? onUnskip() : onSkip();
          }}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        >
          {isSkipped ? (
            <ToggleRight className="w-5 h-5 text-amber-500" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
          I already booked this flight
        </button>
      </div>
    </button>
  );
}

// Round trip card for single-destination trips
function RoundTripCard({
  outboundLeg,
  returnLeg,
  activeDirection,
  onSelectDirection,
  onSkip,
  onUnskip,
}: {
  outboundLeg: FlightLeg;
  returnLeg: FlightLeg;
  activeDirection: 'outbound' | 'return';
  onSelectDirection: (direction: 'outbound' | 'return') => void;
  onSkip: (legId: string) => void;
  onUnskip: (legId: string) => void;
}) {
  const outboundComplete = outboundLeg.status === 'selected' || outboundLeg.status === 'skipped_booked';
  const returnComplete = returnLeg.status === 'selected' || returnLeg.status === 'skipped_booked';
  const allComplete = outboundComplete && returnComplete;

  return (
    <div
      className={clsx(
        'p-4 rounded-xl border-2 transition-all',
        allComplete ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30' : 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center',
            allComplete ? 'bg-green-500 text-white' : 'bg-primary-500 text-white'
          )}
        >
          {allComplete ? <Check className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white">Round Trip Flight</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {outboundLeg.from.city} ↔ {outboundLeg.to.city}
          </p>
        </div>
      </div>

      {/* Direction tabs */}
      <div className="grid grid-cols-2 gap-2">
        {/* Outbound */}
        <button
          onClick={() => onSelectDirection('outbound')}
          className={clsx(
            'p-3 rounded-lg border-2 text-left transition-all',
            activeDirection === 'outbound'
              ? 'border-primary-500 bg-white dark:bg-slate-800'
              : outboundComplete
              ? 'border-green-200 dark:border-green-700 bg-green-25 dark:bg-green-900/20'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Outbound</span>
            {outboundComplete && <Check className="w-4 h-4 text-green-500" />}
          </div>
          <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white text-sm">
            <span>{outboundLeg.from.iata}</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span>{outboundLeg.to.iata}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{outboundLeg.date}</p>
        </button>

        {/* Return */}
        <button
          onClick={() => onSelectDirection('return')}
          className={clsx(
            'p-3 rounded-lg border-2 text-left transition-all',
            activeDirection === 'return'
              ? 'border-primary-500 bg-white dark:bg-slate-800'
              : returnComplete
              ? 'border-green-200 dark:border-green-700 bg-green-25 dark:bg-green-900/20'
              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Return</span>
            {returnComplete && <Check className="w-4 h-4 text-green-500" />}
          </div>
          <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white text-sm">
            <span>{returnLeg.from.iata}</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span>{returnLeg.to.iata}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{returnLeg.date}</p>
        </button>
      </div>

      {/* Skip toggles */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-2">
        <button
          onClick={() =>
            outboundLeg.status === 'skipped_booked'
              ? onUnskip(outboundLeg.legId)
              : onSkip(outboundLeg.legId)
          }
          className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        >
          {outboundLeg.status === 'skipped_booked' ? (
            <ToggleRight className="w-4 h-4 text-amber-500" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          Outbound already booked
        </button>
        <button
          onClick={() =>
            returnLeg.status === 'skipped_booked'
              ? onUnskip(returnLeg.legId)
              : onSkip(returnLeg.legId)
          }
          className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        >
          {returnLeg.status === 'skipped_booked' ? (
            <ToggleRight className="w-4 h-4 text-amber-500" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          Return already booked
        </button>
      </div>
    </div>
  );
}

export default function Step6FlightsV2() {
  const {
    trip,
    setFlightResults,
    selectFlight,
    skipFlightLeg,
    unskipFlightLeg,
    canProceedFromFlights,
    buildFlightLegs,
  } = useTripStore();

  const { flights, destinations, basics } = trip;
  const [activeLegId, setActiveLegId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true); // Auto-open filters
  const [roundTripDirection, setRoundTripDirection] = useState<'outbound' | 'return'>('outbound');
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);

  // Round trip combined flights state
  const [roundTripFlights, setRoundTripFlights] = useState<any[]>([]);
  const [selectedRoundTripId, setSelectedRoundTripId] = useState<string | null>(null);
  const [roundTripFetched, setRoundTripFetched] = useState(false);

  // Detect if this is a single-destination round trip
  const isSingleDestRoundTrip = destinations.length === 1 && flights.isRoundTrip && flights.legs.length === 2;

  // Cabin class is a SEARCH parameter (not a filter) - changes trigger new API search
  const [selectedCabinClass, setSelectedCabinClass] = useState<string>('ECONOMY'); // ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST

  // Filter state (applied after results are fetched)
  const [stopsFilter, setStopsFilter] = useState<number[]>([]); // empty = any, [0] = non-stop, [1] = 1 stop
  const [departureTimeFilter, setDepartureTimeFilter] = useState<string[]>([]); // morning, afternoon, evening, red-eye
  const [airlinesFilter, setAirlinesFilter] = useState<string[]>([]);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(5000); // Increased for international flights
  const [maxDurationFilter, setMaxDurationFilter] = useState<number>(1440); // 24 hours in minutes for long-haul

  // Build legs if not done
  useEffect(() => {
    if (flights.legs.length === 0 && destinations.length > 0 && basics.originAirport) {
      buildFlightLegs();
    }
  }, [flights.legs.length, destinations.length, basics.originAirport, buildFlightLegs]);

  // Set first incomplete leg as active
  useEffect(() => {
    if (!activeLegId && flights.legs.length > 0) {
      const firstIncomplete = flights.legs.find(
        (l) => l.status !== 'selected' && l.status !== 'skipped_booked'
      );
      const defaultLegId = firstIncomplete?.legId || flights.legs[0].legId;
      setActiveLegId(defaultLegId);

      // For round trips, also set the direction
      if (isSingleDestRoundTrip) {
        if (defaultLegId === flights.legs[1].legId) {
          setRoundTripDirection('return');
        } else {
          setRoundTripDirection('outbound');
        }
      }
    }
  }, [activeLegId, flights.legs, isSingleDestRoundTrip]);

  const activeLeg = flights.legs.find((l) => l.legId === activeLegId);

  // Fetch ROUND TRIP flights (combined outbound + return)
  const fetchRoundTripFlights = useCallback(async () => {
    if (!isSingleDestRoundTrip || roundTripFetched) return;
    if (flights.legs.length < 2) return;

    const outboundLeg = flights.legs[0];
    const returnLeg = flights.legs[1];

    setIsLoading(true);
    setRoundTripFetched(true);

    try {
      const params = new URLSearchParams({
        origin: outboundLeg.from.iata,
        destination: outboundLeg.to.iata,
        departureDate: outboundLeg.date,
        returnDate: returnLeg.date,
        adults: String(basics.travelers.adults),
        children: String(basics.travelers.children),
        travelClass: selectedCabinClass,
      });

      const response = await fetch(`/api/flights?${params}`);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setRoundTripFlights(data);
          return;
        }
      }

      // Fallback - generate mock round trip data
      console.log('Using mock round trip data');
      const mockRoundTrips = AIRLINE_DATA.slice(0, 4).map((airline, idx) => ({
        id: `rt_${idx}`,
        isRoundTrip: true,
        totalPrice: 800 + idx * 200 + Math.floor(Math.random() * 100),
        currency: 'USD',
        outbound: {
          airline: airline.name,
          airlineLogo: getAirlineLogo(airline.code),
          flightNumber: `${airline.code}${1000 + idx * 100}`,
          departureAirport: outboundLeg.from.iata,
          departureTime: `${String(8 + idx * 3).padStart(2, '0')}:00`,
          arrivalAirport: outboundLeg.to.iata,
          arrivalTime: `${String(20 + idx).padStart(2, '0')}:30`,
          durationMinutes: 780 + idx * 30,
          stops: idx % 2,
          cabinClass: 'Economy',
        },
        return: {
          airline: airline.name,
          airlineLogo: getAirlineLogo(airline.code),
          flightNumber: `${airline.code}${2000 + idx * 100}`,
          departureAirport: returnLeg.from.iata,
          departureTime: `${String(10 + idx * 2).padStart(2, '0')}:00`,
          arrivalAirport: returnLeg.to.iata,
          arrivalTime: `${String(6 + idx).padStart(2, '0')}:30`,
          durationMinutes: 840 + idx * 30,
          stops: idx % 2,
          cabinClass: 'Economy',
        },
      }));
      setRoundTripFlights(mockRoundTrips);
    } catch (error) {
      console.error('Failed to fetch round trip flights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSingleDestRoundTrip, roundTripFetched, flights.legs, basics.travelers, selectedCabinClass]);

  // Fetch one-way flights for active leg (used for multi-city)
  const fetchFlights = useCallback(async () => {
    if (isSingleDestRoundTrip) return; // Use round trip fetch instead
    if (!activeLeg) return;
    if (activeLeg.flights.length > 0) return;
    if (activeLeg.status === 'skipped_booked') return;

    setIsLoading(true);
    try {
      // Try the real API first
      const params = new URLSearchParams({
        origin: activeLeg.from.iata,
        destination: activeLeg.to.iata,
        departureDate: activeLeg.date,
        adults: String(basics.travelers.adults),
        children: String(basics.travelers.children),
        travelClass: selectedCabinClass,
      });

      const response = await fetch(`/api/flights?${params}`);

      if (response.ok) {
        const flightsData = await response.json();
        if (Array.isArray(flightsData) && flightsData.length > 0) {
          setFlightResults(activeLeg.legId, flightsData);
          return;
        }
      }

      // Fallback to mock data if API fails or returns empty
      console.log('Using mock flight data (API unavailable or no results)');
      const mockFlights = generateMockFlights(
        activeLeg.from.iata,
        activeLeg.to.iata,
        activeLeg.date,
        activeLeg.from.city,
        activeLeg.to.city
      );
      setFlightResults(activeLeg.legId, mockFlights);
    } catch (error) {
      console.error('Failed to fetch flights:', error);
      // Use mock data as fallback
      const mockFlights = generateMockFlights(
        activeLeg.from.iata,
        activeLeg.to.iata,
        activeLeg.date,
        activeLeg.from.city,
        activeLeg.to.city
      );
      setFlightResults(activeLeg.legId, mockFlights);
    } finally {
      setIsLoading(false);
    }
  }, [isSingleDestRoundTrip, activeLeg, setFlightResults, basics.travelers, selectedCabinClass]);

  // Fetch round trip flights when component mounts (for single-dest round trips)
  useEffect(() => {
    if (isSingleDestRoundTrip && !roundTripFetched) {
      fetchRoundTripFlights();
    }
  }, [isSingleDestRoundTrip, roundTripFetched, fetchRoundTripFlights]);

  // Fetch one-way flights for multi-city trips
  useEffect(() => {
    if (!isSingleDestRoundTrip) {
      fetchFlights();
    }
  }, [isSingleDestRoundTrip, fetchFlights]);

  // Re-fetch when cabin class changes
  useEffect(() => {
    // Reset fetched state to trigger new search with new cabin class
    if (roundTripFetched && isSingleDestRoundTrip) {
      setRoundTripFetched(false);
      setRoundTripFlights([]);
    }
  }, [selectedCabinClass]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectFlight = (flightId: string) => {
    if (!activeLeg) return;
    const currentSelection = activeLeg.selectedFlightId;
    selectFlight(activeLeg.legId, currentSelection === flightId ? null : flightId);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Get time of day category
  const getTimeCategory = (time: string): string => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'red-eye';
  };

  // Get unique airlines from active leg
  const availableAirlines = activeLeg?.flights.map((f) => f.airline).filter((v, i, a) => a.indexOf(v) === i) || [];

  // Filter flights
  const filteredFlights = (activeLeg?.flights || []).filter((flight) => {
    // Stops filter
    if (stopsFilter.length > 0) {
      const matchesStops = stopsFilter.some((s) => {
        if (s === 2) return flight.stops >= 2;
        return flight.stops === s;
      });
      if (!matchesStops) return false;
    }
    // Departure time filter
    if (departureTimeFilter.length > 0) {
      const timeCategory = getTimeCategory(flight.departureTime);
      if (!departureTimeFilter.includes(timeCategory)) return false;
    }
    // Cabin class is now a search parameter, not a filter
    // Airlines filter
    if (airlinesFilter.length > 0 && !airlinesFilter.includes(flight.airline)) {
      return false;
    }
    // Price filter
    if (flight.priceUsd > maxPriceFilter) {
      return false;
    }
    // Duration filter
    if (flight.durationMinutes > maxDurationFilter) {
      return false;
    }
    return true;
  });

  // Clear all filters
  const clearAllFilters = () => {
    setStopsFilter([]);
    setDepartureTimeFilter([]);
    setAirlinesFilter([]);
    setMaxPriceFilter(5000);
    setMaxDurationFilter(1440);
  };

  const hasActiveFilters = stopsFilter.length > 0 || departureTimeFilter.length > 0 || airlinesFilter.length > 0 || maxPriceFilter < 5000 || maxDurationFilter < 1440;

  if (destinations.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2">No Destinations Yet</h2>
        <p className="text-slate-500 dark:text-slate-400">Go back and add destinations first.</p>
      </div>
    );
  }

  if (flights.legs.length === 0) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary-500 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400">Building flight legs...</p>
      </div>
    );
  }

  const completedLegs = flights.legs.filter(
    (l) => l.status === 'selected' || l.status === 'skipped_booked'
  ).length;
  const canProceed = canProceedFromFlights();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="section-title flex items-center justify-center gap-2">
          <Plane className="w-6 h-6 text-primary-500" />
          Book Your Flights
        </h1>
        <p className="section-subtitle">
          Complete all flight legs to continue
        </p>
      </div>

      {/* Progress indicator */}
      <div className={clsx(
        'p-4 rounded-xl text-center',
        canProceed ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
      )}>
        {canProceed ? (
          <span className="flex items-center justify-center gap-2 font-medium">
            <Check className="w-5 h-5" />
            All {flights.legs.length} flight legs completed!
          </span>
        ) : (
          <span className="font-medium">
            {completedLegs} of {flights.legs.length} flight legs completed
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leg selector */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Flight Legs</h3>
          {isSingleDestRoundTrip ? (
            // Show combined round trip card for single destination
            <RoundTripCard
              outboundLeg={flights.legs[0]}
              returnLeg={flights.legs[1]}
              activeDirection={roundTripDirection}
              onSelectDirection={(direction) => {
                setRoundTripDirection(direction);
                setActiveLegId(direction === 'outbound' ? flights.legs[0].legId : flights.legs[1].legId);
              }}
              onSkip={skipFlightLeg}
              onUnskip={unskipFlightLeg}
            />
          ) : (
            // Show individual leg cards for multi-destination or one-way
            flights.legs.map((leg) => (
              <FlightLegCard
                key={leg.legId}
                leg={leg}
                isActive={activeLegId === leg.legId}
                onSelect={() => setActiveLegId(leg.legId)}
                onSkip={() => skipFlightLeg(leg.legId)}
                onUnskip={() => unskipFlightLeg(leg.legId)}
              />
            ))
          )}
        </div>

        {/* Flight results */}
        <div className="lg:col-span-2">
          {activeLeg && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {activeLeg.from.city} to {activeLeg.to.city}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{activeLeg.date}</span>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      showFilters || hasActiveFilters
                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    )}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {hasActiveFilters && (
                      <span className="w-2 h-2 rounded-full bg-primary-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Filters panel */}
              {showFilters && activeLeg.status !== 'skipped_booked' && (
                <Card className="mb-4">
                  <div className="space-y-4">
                    {/* Stops */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Stops</label>
                      <div className="flex flex-wrap gap-2">
                        {[{ label: 'Non-stop', value: 0 }, { label: '1 stop', value: 1 }, { label: '2+ stops', value: 2 }].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setStopsFilter((prev) =>
                              prev.includes(option.value) ? prev.filter((s) => s !== option.value) : [...prev, option.value]
                            )}
                            className={clsx(
                              'px-3 py-1.5 rounded-full text-sm transition-all',
                              stopsFilter.includes(option.value)
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Departure time */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Departure Time</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Morning (5am-12pm)', value: 'morning' },
                          { label: 'Afternoon (12pm-5pm)', value: 'afternoon' },
                          { label: 'Evening (5pm-9pm)', value: 'evening' },
                          { label: 'Red-eye (9pm-5am)', value: 'red-eye' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setDepartureTimeFilter((prev) =>
                              prev.includes(option.value) ? prev.filter((t) => t !== option.value) : [...prev, option.value]
                            )}
                            className={clsx(
                              'px-3 py-1.5 rounded-full text-sm transition-all',
                              departureTimeFilter.includes(option.value)
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cabin class - Single select that triggers new search */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        Cabin Class
                        <span className="ml-2 text-xs text-primary-500 font-normal">(searches for this class)</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'ECONOMY', label: 'Economy' },
                          { value: 'PREMIUM_ECONOMY', label: 'Premium Economy' },
                          { value: 'BUSINESS', label: 'Business' },
                          { value: 'FIRST', label: 'First' },
                        ].map((cabin) => (
                          <button
                            key={cabin.value}
                            onClick={() => setSelectedCabinClass(cabin.value)}
                            className={clsx(
                              'px-3 py-1.5 rounded-full text-sm transition-all',
                              selectedCabinClass === cabin.value
                                ? 'bg-primary-500 text-white ring-2 ring-primary-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            )}
                          >
                            {cabin.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Airlines */}
                    {availableAirlines.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Airlines</label>
                        <div className="flex flex-wrap gap-2">
                          {availableAirlines.map((airline) => (
                            <button
                              key={airline}
                              onClick={() => setAirlinesFilter((prev) =>
                                prev.includes(airline) ? prev.filter((a) => a !== airline) : [...prev, airline]
                              )}
                              className={clsx(
                                'px-3 py-1.5 rounded-full text-sm transition-all',
                                airlinesFilter.includes(airline)
                                  ? 'bg-primary-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                              )}
                            >
                              {airline}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Price & Duration sliders */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Max Price: ${maxPriceFilter.toLocaleString()}
                        </label>
                        <input
                          type="range"
                          min={100}
                          max={5000}
                          step={100}
                          value={maxPriceFilter}
                          onChange={(e) => setMaxPriceFilter(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Max Duration: {formatDuration(maxDurationFilter)}
                        </label>
                        <input
                          type="range"
                          min={120}
                          max={1440}
                          step={60}
                          value={maxDurationFilter}
                          onChange={(e) => setMaxDurationFilter(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                      </div>
                    </div>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </Card>
              )}

              {/* ROUND TRIP DISPLAY */}
              {isSingleDestRoundTrip ? (
                isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-10 h-10 mx-auto mb-4 text-primary-500 animate-spin" />
                    <p className="text-slate-500 dark:text-slate-400">Searching for round trip flights...</p>
                  </div>
                ) : roundTripFlights.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <Plane className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-slate-500 dark:text-slate-400">No round trip flights found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                      <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                        🎫 Round Trip Flights - Select your complete journey
                      </p>
                      <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                        Prices shown are total for both outbound and return flights
                      </p>
                    </div>
                    {roundTripFlights.map((rt) => {
                      const isSelected = selectedRoundTripId === rt.id;
                      return (
                        <Card
                          key={rt.id}
                          className={clsx(
                            'cursor-pointer transition-all',
                            isSelected
                              ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30'
                              : 'hover:shadow-md'
                          )}
                          onClick={() => {
                            setSelectedRoundTripId(rt.id);
                            // Also update the store with both legs
                            if (flights.legs[0]) {
                              setFlightResults(flights.legs[0].legId, [rt.outbound]);
                              selectFlight(flights.legs[0].legId, rt.outbound.id || rt.id + '-out');
                            }
                            if (flights.legs[1]) {
                              setFlightResults(flights.legs[1].legId, [rt.return]);
                              selectFlight(flights.legs[1].legId, rt.return.id || rt.id + '-ret');
                            }
                          }}
                        >
                          <div className="space-y-4">
                            {/* Outbound Flight */}
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-4">
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{rt.outbound.departureTime}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{rt.outbound.departureAirport}</p>
                                  </div>
                                  <div className="flex-1 flex flex-col items-center">
                                    <p className="text-xs text-slate-400">
                                      {formatDuration(rt.outbound.durationMinutes)} • {rt.outbound.stops === 0 ? 'Non-stop' : `${rt.outbound.stops} stop`}
                                    </p>
                                    <div className="w-full flex items-center gap-1">
                                      <div className="h-px flex-1 bg-blue-300" />
                                      <ChevronRight className="w-4 h-4 text-blue-400" />
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{rt.outbound.arrivalTime}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{rt.outbound.arrivalAirport}</p>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {rt.outbound.airline} • {rt.outbound.flightNumber}
                                </p>
                              </div>
                            </div>

                            <div className="border-t border-slate-200 dark:border-slate-700" />

                            {/* Return Flight */}
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                <Plane className="w-5 h-5 text-green-600 dark:text-green-400 rotate-180" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-4">
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{rt.return.departureTime}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{rt.return.departureAirport}</p>
                                  </div>
                                  <div className="flex-1 flex flex-col items-center">
                                    <p className="text-xs text-slate-400">
                                      {formatDuration(rt.return.durationMinutes)} • {rt.return.stops === 0 ? 'Non-stop' : `${rt.return.stops} stop`}
                                    </p>
                                    <div className="w-full flex items-center gap-1">
                                      <div className="h-px flex-1 bg-green-300" />
                                      <ChevronRight className="w-4 h-4 text-green-400" />
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{rt.return.arrivalTime}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{rt.return.arrivalAirport}</p>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {rt.return.airline} • {rt.return.flightNumber}
                                </p>
                              </div>
                            </div>

                            {/* Total Price */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                              <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{rt.outbound.cabinClass}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                  ${Math.round(rt.totalPrice)}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">total round trip</p>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium">
                                <Check className="w-5 h-5" />
                                Selected
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )
              ) : activeLeg.status === 'skipped_booked' ? (
                <div className="text-center py-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                  <Check className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                  <p className="text-amber-700 dark:text-amber-300 font-medium">
                    You've marked this flight as already booked
                  </p>
                  <button
                    onClick={() => unskipFlightLeg(activeLeg.legId)}
                    className="mt-4 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline"
                  >
                    I need to book this flight
                  </button>
                </div>
              ) : isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 mx-auto mb-4 text-primary-500 animate-spin" />
                  <p className="text-slate-500 dark:text-slate-400">Searching for flights...</p>
                </div>
              ) : activeLeg.flights.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <Plane className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-500 dark:text-slate-400">No flights found for this route.</p>
                </div>
              ) : filteredFlights.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <Filter className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-500 dark:text-slate-400 mb-2">No flights match your filters.</p>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFlights.map((flight) => {
                    const isSelected = activeLeg.selectedFlightId === flight.id;
                    const isExpanded = expandedFlightId === flight.id;
                    const flightWithSegments = flight as FlightWithSegments;
                    const hasSegments = flightWithSegments.segments && flightWithSegments.segments.length > 0;

                    return (
                      <Card
                        key={flight.id}
                        className={clsx(
                          'transition-all',
                          isSelected
                            ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30'
                            : 'hover:shadow-md'
                        )}
                      >
                        {/* Main flight row - clickable for selection */}
                        <div
                          className="flex items-center gap-4 cursor-pointer"
                          onClick={() => handleSelectFlight(flight.id)}
                        >
                          {/* Airline logo */}
                          <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                            {flight.airlineLogo ? (
                              <img
                                src={flight.airlineLogo}
                                alt={flight.airline}
                                className="w-10 h-10 object-contain"
                              />
                            ) : (
                              <Plane className="w-6 h-6 text-slate-400" />
                            )}
                          </div>

                          {/* Flight details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                  {flight.departureTime}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{flight.departureAirport}</p>
                              </div>
                              <div className="flex-1 flex flex-col items-center">
                                <p className="text-xs text-slate-400 mb-1">
                                  {formatDuration(flight.durationMinutes)}
                                </p>
                                <div className="w-full flex items-center gap-1">
                                  <div className="h-px flex-1 bg-slate-300 dark:bg-slate-600" />
                                  {flight.stops > 0 && (
                                    <div className="w-2 h-2 rounded-full bg-amber-400" title="Layover" />
                                  )}
                                  <Plane className="w-4 h-4 text-slate-400 rotate-90" />
                                  <div className="h-px flex-1 bg-slate-300 dark:bg-slate-600" />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                  {flight.arrivalTime}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{flight.arrivalAirport}</p>
                              </div>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                              {flight.airline} • {flight.flightNumber} • {flight.cabinClass}
                            </p>
                          </div>

                          {/* Price and selection */}
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                              ${flight.priceUsd}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">per person</p>
                          </div>

                          <div
                            className={clsx(
                              'w-8 h-8 rounded-full flex items-center justify-center',
                              isSelected ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-700'
                            )}
                          >
                            {isSelected && <Check className="w-5 h-5" />}
                          </div>
                        </div>

                        {/* Expand button for segment details */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedFlightId(isExpanded ? null : flight.id);
                          }}
                          className="w-full mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          {isExpanded ? 'Hide' : 'View'} flight details
                          <ChevronRight className={clsx('w-3 h-3 transition-transform', isExpanded && 'rotate-90')} />
                        </button>

                        {/* Expanded segment details */}
                        {isExpanded && hasSegments && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                            {flightWithSegments.segments.map((segment, segIdx) => (
                              <div key={segment.segmentId}>
                                {/* Segment card */}
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                  <div className="flex items-start gap-4">
                                    {/* Segment number */}
                                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                      {segIdx + 1}
                                    </div>

                                    <div className="flex-1">
                                      {/* Departure */}
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="w-3 h-3 rounded-full border-2 border-primary-500 bg-white dark:bg-slate-800" />
                                        <div>
                                          <p className="font-bold text-slate-900 dark:text-white">{segment.departureTime}</p>
                                          <p className="text-sm text-slate-600 dark:text-slate-300">{segment.departureAirport} - {segment.departureCity}</p>
                                        </div>
                                      </div>

                                      {/* Flight info */}
                                      <div className="ml-1.5 pl-4 border-l-2 border-dashed border-slate-300 dark:border-slate-500 py-2">
                                        <div className="flex flex-wrap items-center gap-3 text-sm">
                                          <span className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                                            <Plane className="w-3 h-3 dark:text-slate-300" />
                                            {segment.flightNumber}
                                          </span>
                                          <span className="text-slate-600 dark:text-slate-300">{segment.aircraft}</span>
                                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(segment.durationMinutes)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Arrival */}
                                      <div className="flex items-center gap-2 mt-3">
                                        <div className="w-3 h-3 rounded-full bg-primary-500" />
                                        <div>
                                          <p className="font-bold text-slate-900 dark:text-white">{segment.arrivalTime}</p>
                                          <p className="text-sm text-slate-600 dark:text-slate-300">{segment.arrivalAirport} - {segment.arrivalCity}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Layover info between segments */}
                                {flightWithSegments.layoverMinutes && segIdx < flightWithSegments.segments.length - 1 && (
                                  <div className="flex items-center justify-center gap-2 py-3 text-amber-600 dark:text-amber-400 text-sm">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-medium">
                                      {formatDuration(flightWithSegments.layoverMinutes[segIdx] || 0)} layover in {segment.arrivalCity}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Fallback if no segment data */}
                        {isExpanded && !hasSegments && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                              Detailed segment information not available for this flight.
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Total summary */}
      <Card className="bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Flight Summary</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {completedLegs} of {flights.legs.length} legs completed
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              ${flights.legs.reduce((sum, leg) => {
                if (!leg.selectedFlightId) return sum;
                const flight = leg.flights.find((f) => f.id === leg.selectedFlightId);
                return sum + (flight?.priceUsd || 0);
              }, 0).toLocaleString()}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              × {trip.basics.travelers.adults + trip.basics.travelers.children} travelers
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
