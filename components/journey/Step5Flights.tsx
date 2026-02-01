'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Plane, Clock, Filter, MessageCircle, Check } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SentimentBadge from '@/components/shared/SentimentBadge';
import PriceTag from '@/components/shared/PriceTag';
import { LegSelector } from '@/components/legs';
import { FlightFiltersPanel } from '@/components/filters';
import type { Flight, FlightFilters, TimeOfDay } from '@/types';
import clsx from 'clsx';

type SortOption = 'price' | 'duration' | 'sentiment';

export default function Step5Flights() {
  const {
    legs,
    activeLegId,
    setActiveLeg,
    origin,
    dates,
    travelers,
    budget,
    flightFilters,
    setLegFlight,
    getActiveLeg,
  } = useTripStore();

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('price');
  const [showFilters, setShowFilters] = useState(false);
  const [availableAirlines, setAvailableAirlines] = useState<{ code: string; name: string }[]>([]);
  const [flightType, setFlightType] = useState<'inbound' | 'inter' | 'outbound'>('inbound');

  const activeLeg = getActiveLeg();
  const legIndex = legs.findIndex((l) => l.id === activeLegId);
  const previousLeg = legIndex > 0 ? legs[legIndex - 1] : null;
  const nextLeg = legIndex < legs.length - 1 ? legs[legIndex + 1] : null;

  const flightBudget = Math.round((budget.allocation.flights / 100) * budget.total);

  // Determine flight segments needed
  const flightSegments = useMemo(() => {
    const segments: { type: 'inbound' | 'inter' | 'outbound'; from: string; to: string; date: Date | null; label: string }[] = [];

    legs.forEach((leg, idx) => {
      if (idx === 0) {
        // First leg: origin -> first destination
        segments.push({
          type: 'inbound',
          from: origin?.code || 'Origin',
          to: leg.destination.iataCode,
          date: leg.startDate,
          label: `To ${leg.destination.name}`,
        });
      } else {
        // Inter-leg flight
        const prevLeg = legs[idx - 1];
        segments.push({
          type: 'inter',
          from: prevLeg.destination.iataCode,
          to: leg.destination.iataCode,
          date: leg.startDate,
          label: `${prevLeg.destination.name} → ${leg.destination.name}`,
        });
      }

      if (idx === legs.length - 1) {
        // Last leg: last destination -> origin
        segments.push({
          type: 'outbound',
          from: leg.destination.iataCode,
          to: origin?.code || 'Origin',
          date: leg.endDate,
          label: `Return Home`,
        });
      }
    });

    return segments;
  }, [legs, origin]);

  const currentSegment = flightSegments.find(
    (s) =>
      (flightType === 'inbound' && s.type === 'inbound') ||
      (flightType === 'outbound' && s.type === 'outbound') ||
      (flightType === 'inter' && s.type === 'inter')
  );

  useEffect(() => {
    const fetchFlights = async () => {
      if (!activeLeg || !dates.startDate || !dates.endDate || !origin) {
        setError('Missing origin, destination, or dates');
        setLoading(false);
        setFlights(getMockFlights());
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const flightDate = flightType === 'outbound'
          ? activeLeg.endDate || dates.endDate
          : activeLeg.startDate || dates.startDate;

        if (!flightDate) {
          throw new Error('Please set travel dates first');
        }

        const departureDate = format(flightDate, 'yyyy-MM-dd');

        // Determine flight route based on leg position and flight type
        let fromCode: string;
        let toCode: string;

        if (flightType === 'inbound') {
          // For inbound flights:
          // - First leg (index 0): origin → first destination
          // - Other legs (index > 0): previous destination → current destination
          if (legIndex === 0) {
            fromCode = origin.code;
            toCode = activeLeg.destination.iataCode;
          } else {
            fromCode = previousLeg?.destination.iataCode || origin.code;
            toCode = activeLeg.destination.iataCode;
          }
        } else {
          // For outbound flights: last destination → origin (home)
          fromCode = activeLeg.destination.iataCode;
          toCode = origin.code;
        }

        const params = new URLSearchParams({
          origin: fromCode,
          destination: toCode,
          departureDate,
          adults: travelers.adults.toString(),
          children: travelers.children.toString(),
          maxPrice: flightBudget.toString(),
        });

        const response = await fetch(`/api/flights?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch flights');
        }

        if (Array.isArray(data) && data.length > 0) {
          setFlights(data);
          // Extract unique airlines
          const airlines = data.reduce((acc: { code: string; name: string }[], flight: Flight) => {
            if (!acc.find((a) => a.name === flight.airline)) {
              acc.push({ code: flight.flightNumber.slice(0, 2), name: flight.airline });
            }
            return acc;
          }, []);
          setAvailableAirlines(airlines);
        } else {
          setFlights(getMockFlights());
        }
      } catch (err) {
        console.error('Flight search error:', err);
        setFlights(getMockFlights());
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, [activeLegId, flightType, dates, travelers, flightBudget, origin]);

  // Get the current route info for display
  const currentRouteInfo = useMemo(() => {
    if (!activeLeg) return null;

    if (flightType === 'inbound') {
      if (legIndex === 0) {
        return { from: origin?.city || 'Origin', to: activeLeg.destination.name };
      } else {
        return { from: previousLeg?.destination.name || 'Previous', to: activeLeg.destination.name };
      }
    } else {
      return { from: activeLeg.destination.name, to: origin?.city || 'Home' };
    }
  }, [activeLeg, flightType, legIndex, origin, previousLeg]);

  const getMockFlights = (): Flight[] => {
    const startDate = dates.startDate
      ? (typeof dates.startDate === 'string' ? dates.startDate : format(dates.startDate, "yyyy-MM-dd'T'HH:mm:ss"))
      : format(new Date(), "yyyy-MM-dd'T'08:00:00");

    const departureBase = startDate.split('T')[0];

    // Use correct route info for mock flights
    const fromCity = currentRouteInfo?.from || origin?.city || 'New York';
    const toCity = currentRouteInfo?.to || activeLeg?.destination.name || 'Paris';
    const fromCode = flightType === 'inbound'
      ? (legIndex === 0 ? origin?.code || 'JFK' : previousLeg?.destination.iataCode || 'JFK')
      : activeLeg?.destination.iataCode || 'CDG';
    const toCode = flightType === 'inbound'
      ? activeLeg?.destination.iataCode || 'CDG'
      : origin?.code || 'JFK';

    return [
      {
        id: '1',
        airline: 'United Airlines',
        airlineLogo: 'https://pics.avs.io/200/80/UA.png',
        flightNumber: 'UA123',
        departureAirport: fromCode,
        departureCity: fromCity,
        departureTime: `${departureBase}T08:00:00`,
        arrivalAirport: toCode,
        arrivalCity: toCity,
        arrivalTime: `${departureBase}T20:30:00`,
        duration: 'PT7H30M',
        stops: 0,
        price: Math.round(flightBudget * 0.4),
        currency: 'USD',
        cabinClass: 'ECONOMY',
        sentiment: {
          score: 0.6,
          label: 'positive',
          mentionCount: 234,
          topComments: [
            { text: 'Great legroom and service on transatlantic flights', subreddit: 'travel', score: 156, date: '2024-01-15' },
          ],
          subreddits: ['travel', 'flights'],
        },
      },
      {
        id: '2',
        airline: 'Delta Air Lines',
        airlineLogo: 'https://pics.avs.io/200/80/DL.png',
        flightNumber: 'DL456',
        departureAirport: fromCode,
        departureCity: fromCity,
        departureTime: `${departureBase}T10:30:00`,
        arrivalAirport: toCode,
        arrivalCity: toCity,
        arrivalTime: `${departureBase}T23:15:00`,
        duration: 'PT7H45M',
        stops: 0,
        price: Math.round(flightBudget * 0.5),
        currency: 'USD',
        cabinClass: 'ECONOMY',
        sentiment: {
          score: 0.75,
          label: 'positive',
          mentionCount: 412,
          topComments: [
            { text: 'Consistently the best US carrier for international flights', subreddit: 'travel', score: 289, date: '2024-01-20' },
          ],
          subreddits: ['travel', 'delta'],
        },
      },
      {
        id: '3',
        airline: 'Air France',
        airlineLogo: 'https://pics.avs.io/200/80/AF.png',
        flightNumber: 'AF789',
        departureAirport: fromCode,
        departureCity: fromCity,
        departureTime: `${departureBase}T18:00:00`,
        arrivalAirport: toCode,
        arrivalCity: toCity,
        arrivalTime: `${departureBase}T07:30:00`,
        duration: 'PT7H30M',
        stops: 0,
        price: Math.round(flightBudget * 0.35),
        currency: 'USD',
        cabinClass: 'ECONOMY',
        sentiment: {
          score: 0.45,
          label: 'positive',
          mentionCount: 178,
          topComments: [
            { text: 'Good food and wine selection, typical French hospitality', subreddit: 'travel', score: 98, date: '2024-02-01' },
          ],
          subreddits: ['travel', 'aviation'],
        },
      },
    ];
  };

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+)H(\d+)?M?/);
    if (match) {
      const hours = match[1];
      const minutes = match[2] || '0';
      return `${hours}h ${minutes}m`;
    }
    return duration;
  };

  const formatTime = (dateTime: string) => {
    return format(new Date(dateTime), 'HH:mm');
  };

  const getTimeOfDay = (dateTime: string): TimeOfDay => {
    const hour = new Date(dateTime).getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'red_eye';
  };

  // Apply filters
  const filteredFlights = useMemo(() => {
    return flights.filter((flight) => {
      // Price filter
      if (flightFilters.priceRange) {
        if (
          flight.price < flightFilters.priceRange.min ||
          flight.price > flightFilters.priceRange.max
        ) {
          return false;
        }
      }

      // Cabin class filter
      if (flightFilters.cabinClasses.length > 0) {
        if (!flightFilters.cabinClasses.includes(flight.cabinClass as any)) {
          return false;
        }
      }

      // Stops filter
      if (flightFilters.maxStops !== null) {
        if (flight.stops > flightFilters.maxStops) {
          return false;
        }
      }

      // Duration filter
      if (flightFilters.maxDurationMinutes !== null) {
        const match = flight.duration.match(/PT(\d+)H(\d+)?M?/);
        if (match) {
          const durationMins = parseInt(match[1]) * 60 + (parseInt(match[2]) || 0);
          if (durationMins > flightFilters.maxDurationMinutes) {
            return false;
          }
        }
      }

      // Airlines filter
      if (flightFilters.airlines.length > 0) {
        if (!flightFilters.airlines.some((code) => flight.flightNumber.startsWith(code))) {
          return false;
        }
      }

      // Time of day filter
      if (flightFilters.departureTimeOfDay.length > 0) {
        const timeOfDay = getTimeOfDay(flight.departureTime);
        if (!flightFilters.departureTimeOfDay.includes(timeOfDay)) {
          return false;
        }
      }

      return true;
    });
  }, [flights, flightFilters]);

  const sortedFlights = [...filteredFlights].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'duration':
        return a.duration.localeCompare(b.duration);
      case 'sentiment':
        return (b.sentiment?.score || 0) - (a.sentiment?.score || 0);
      default:
        return 0;
    }
  });

  const handleSelectFlight = (flight: Flight) => {
    if (!activeLegId) return;

    const type = flightType === 'outbound' ? 'outbound' : 'inbound';
    setLegFlight(activeLegId, type, flight);
  };

  const selectedFlight = flightType === 'outbound'
    ? activeLeg?.outboundFlight
    : activeLeg?.inboundFlight;

  const priceRange = flights.length > 0
    ? {
        min: Math.min(...flights.map((f) => f.price)),
        max: Math.max(...flights.map((f) => f.price)),
      }
    : { min: 0, max: 5000 };

  if (legs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Please add destinations first</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Find Your Flights</h1>
        <p className="section-subtitle">
          {currentRouteInfo ? (
            <>Searching: <span className="font-medium">{currentRouteInfo.from}</span> → <span className="font-medium">{currentRouteInfo.to}</span></>
          ) : (
            'Select flights for each leg of your journey'
          )}
        </p>
      </div>

      {/* Leg Selector */}
      {legs.length > 1 && (
        <div className="flex justify-center mb-6">
          <LegSelector showProgress progressType="flights" />
        </div>
      )}

      {/* Flight Segments Overview */}
      <div className="mb-6 p-4 bg-slate-50 rounded-xl">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Your Flight Route</h3>
        <div className="flex flex-wrap items-center gap-2">
          {flightSegments.map((segment, idx) => {
            const isActive =
              (segment.type === 'inbound' && flightType === 'inbound' && legIndex === 0) ||
              (segment.type === 'inter' && flightType === 'inter') ||
              (segment.type === 'outbound' && flightType === 'outbound');
            const isComplete =
              (segment.type === 'inbound' && legs[0]?.inboundFlight) ||
              (segment.type === 'inter' && legs.find((l, i) => i > 0 && l.inboundFlight)) ||
              (segment.type === 'outbound' && legs[legs.length - 1]?.outboundFlight);

            return (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && <Plane className="w-4 h-4 text-slate-300" />}
                <div
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all',
                    isActive
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : isComplete
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  )}
                >
                  <span>{segment.from}</span>
                  <span className="mx-1">→</span>
                  <span>{segment.to}</span>
                  {isComplete && <Check className="w-3 h-3 inline ml-1" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flight Type Selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {/* Inbound to first destination */}
        {legIndex === 0 && (
          <button
            onClick={() => setFlightType('inbound')}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              flightType === 'inbound'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {origin?.city || 'Origin'} → {activeLeg?.destination.name}
            {activeLeg?.inboundFlight && <Check className="w-4 h-4 inline ml-2" />}
          </button>
        )}

        {/* Inter-leg flights: from previous destination to current */}
        {legIndex > 0 && previousLeg && (
          <button
            onClick={() => setFlightType('inbound')}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              flightType === 'inbound'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {previousLeg.destination.name} → {activeLeg?.destination.name}
            {activeLeg?.inboundFlight && <Check className="w-4 h-4 inline ml-2" />}
          </button>
        )}

        {/* Outbound from last destination back home */}
        {legIndex === legs.length - 1 && (
          <button
            onClick={() => setFlightType('outbound')}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              flightType === 'outbound'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {activeLeg?.destination.name} → {origin?.city || 'Home'}
            {activeLeg?.outboundFlight && <Check className="w-4 h-4 inline ml-2" />}
          </button>
        )}
      </div>

      {/* Filters and sorting */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(true)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <span className="text-sm text-slate-500">
            {filteredFlights.length} flights found
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="input py-2 px-3 text-sm"
          >
            <option value="price">Price</option>
            <option value="duration">Duration</option>
            <option value="sentiment">Reddit Sentiment</option>
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      <FlightFiltersPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        availableAirlines={availableAirlines}
        priceRange={priceRange}
      />

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Plane className="w-12 h-12 text-primary-500 animate-bounce mb-4" />
          <p className="text-gray-600">Searching for the best flights...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-8 text-amber-600 bg-amber-50 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Flight list */}
      {!loading && (
        <div className="space-y-4">
          {sortedFlights.map((flight) => (
            <Card
              key={flight.id}
              variant={selectedFlight?.id === flight.id ? 'selected' : 'interactive'}
              onClick={() => handleSelectFlight(flight)}
              className="cursor-pointer"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Airline info */}
                <div className="flex items-center gap-4 lg:w-48">
                  <img
                    src={flight.airlineLogo}
                    alt={flight.airline}
                    className="w-12 h-8 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.className = 'hidden';
                    }}
                  />
                  <div>
                    <div className="font-medium">{flight.airline}</div>
                    <div className="text-sm text-gray-500">{flight.flightNumber}</div>
                  </div>
                </div>

                {/* Flight times */}
                <div className="flex-1 flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatTime(flight.departureTime)}</div>
                    <div className="text-sm text-gray-500">{flight.departureAirport}</div>
                  </div>

                  <div className="flex-1 flex flex-col items-center px-4">
                    <div className="text-sm text-gray-500">{formatDuration(flight.duration)}</div>
                    <div className="w-full h-px bg-gray-300 my-2 relative">
                      <Plane className="w-4 h-4 text-primary-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white" />
                    </div>
                    <div className="text-xs text-gray-400">
                      {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatTime(flight.arrivalTime)}</div>
                    <div className="text-sm text-gray-500">{flight.arrivalAirport}</div>
                  </div>
                </div>

                {/* Sentiment */}
                <div className="lg:w-40">
                  {flight.sentiment && (
                    <SentimentBadge sentiment={flight.sentiment} size="sm" />
                  )}
                </div>

                {/* Price */}
                <div className="lg:w-32 text-right">
                  <PriceTag price={flight.price} size="lg" />
                  <div className="text-xs text-gray-500">{flight.cabinClass.toLowerCase()}</div>
                </div>
              </div>

              {/* Sentiment details */}
              {flight.sentiment && flight.sentiment.topComments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <MessageCircle className="w-4 h-4" />
                    What Redditors say about {flight.airline}:
                  </div>
                  <p className="text-sm text-gray-600 italic">
                    "{flight.sentiment.topComments[0].text}"
                  </p>
                </div>
              )}

              {/* Selected indicator */}
              {selectedFlight?.id === flight.id && (
                <div className="mt-4 pt-4 border-t border-primary-200 flex items-center justify-between">
                  <span className="text-primary-600 font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Selected
                  </span>
                  <span className="text-sm text-gray-500">
                    ${flight.price.toLocaleString()} added to your trip
                  </span>
                </div>
              )}
            </Card>
          ))}

          {sortedFlights.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-500">
              <Plane className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No flights found matching your criteria</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
