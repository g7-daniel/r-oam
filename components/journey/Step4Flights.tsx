'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plane, Clock, ArrowRight, Filter, TrendingDown, MessageCircle } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SentimentBadge from '@/components/shared/SentimentBadge';
import PriceTag from '@/components/shared/PriceTag';
import type { Flight } from '@/types';
import clsx from 'clsx';

type SortOption = 'price' | 'duration' | 'sentiment';

export default function Step4Flights() {
  const {
    destination,
    origin,
    dates,
    travelers,
    budget,
    selectedFlight,
    setSelectedFlight,
  } = useTripStore();

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('price');
  const [showFilters, setShowFilters] = useState(false);
  const [maxStops, setMaxStops] = useState<number | null>(null);

  const flightBudget = Math.round((budget.allocation.flights / 100) * budget.total);

  useEffect(() => {
    const fetchFlights = async () => {
      if (!destination || !dates.startDate || !dates.endDate || !origin) {
        setError('Missing origin, destination, or dates');
        setLoading(false);
        setFlights(getMockFlights());
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const startDate = typeof dates.startDate === 'string' ? new Date(dates.startDate) : dates.startDate;
        const endDate = typeof dates.endDate === 'string' ? new Date(dates.endDate) : dates.endDate;

        const departureDateStr = format(startDate, 'yyyy-MM-dd');
        const returnDateStr = format(endDate, 'yyyy-MM-dd');

        console.log('Flight search request:', {
          origin: origin.code,
          destination: destination.iataCode,
          departureDate: departureDateStr,
          returnDate: returnDateStr,
        });

        const params = new URLSearchParams({
          origin: origin.code,
          destination: destination.iataCode,
          departureDate: departureDateStr,
          returnDate: returnDateStr,
          adults: travelers.adults.toString(),
          children: travelers.children.toString(),
          maxPrice: flightBudget.toString(),
        });

        const response = await fetch(`/api/flights?${params}`);

        const data = await response.json();

        if (!response.ok) {
          console.error('Flight API error:', data);
          throw new Error(data.error || 'Failed to fetch flights');
        }

        if (Array.isArray(data) && data.length > 0) {
          setFlights(data);
        } else {
          setError('No flights found for this route. Using sample data.');
          setFlights(getMockFlights());
        }
      } catch (err) {
        console.error('Flight search error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Unable to fetch flights: ${errorMessage}. Using sample data.`);
        // Use mock data for demo
        setFlights(getMockFlights());
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, [destination, origin, dates, travelers, flightBudget]);

  const getMockFlights = (): Flight[] => {
    // Use the user's selected dates for mock data
    const startDate = dates.startDate
      ? (typeof dates.startDate === 'string' ? dates.startDate : format(dates.startDate, "yyyy-MM-dd'T'HH:mm:ss"))
      : format(new Date(), "yyyy-MM-dd'T'08:00:00");

    const departureBase = startDate.split('T')[0];

    return [
      {
        id: '1',
        airline: 'United Airlines',
        airlineLogo: 'https://pics.avs.io/200/80/UA.png',
        flightNumber: 'UA123',
        departureAirport: origin?.code || 'JFK',
        departureCity: origin?.city || 'New York',
        departureTime: `${departureBase}T08:00:00`,
        arrivalAirport: destination?.iataCode || 'CDG',
        arrivalCity: destination?.name || 'Paris',
        arrivalTime: `${departureBase}T20:30:00`,
        duration: 'PT7H30M',
        stops: 0,
        price: Math.round(flightBudget * 0.6),
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
        departureAirport: origin?.code || 'JFK',
        departureCity: origin?.city || 'New York',
        departureTime: `${departureBase}T10:30:00`,
        arrivalAirport: destination?.iataCode || 'CDG',
        arrivalCity: destination?.name || 'Paris',
        arrivalTime: `${departureBase}T23:15:00`,
        duration: 'PT7H45M',
        stops: 0,
        price: Math.round(flightBudget * 0.7),
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
        departureAirport: origin?.code || 'JFK',
        departureCity: origin?.city || 'New York',
        departureTime: `${departureBase}T18:00:00`,
        arrivalAirport: destination?.iataCode || 'CDG',
        arrivalCity: destination?.name || 'Paris',
        arrivalTime: `${departureBase}T07:30:00`,
        duration: 'PT7H30M',
        stops: 0,
        price: Math.round(flightBudget * 0.55),
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
      {
        id: '4',
        airline: 'Norwegian',
        airlineLogo: 'https://pics.avs.io/200/80/DY.png',
        flightNumber: 'DY101',
        departureAirport: origin?.code || 'JFK',
        departureCity: origin?.city || 'New York',
        departureTime: `${departureBase}T14:00:00`,
        arrivalAirport: destination?.iataCode || 'CDG',
        arrivalCity: destination?.name || 'Paris',
        arrivalTime: `${departureBase}T05:00:00`,
        duration: 'PT9H00M',
        stops: 1,
        price: Math.round(flightBudget * 0.4),
        currency: 'USD',
        cabinClass: 'ECONOMY',
        sentiment: {
          score: 0.2,
          label: 'neutral',
          mentionCount: 89,
          topComments: [
            { text: 'Budget option but you get what you pay for', subreddit: 'budgettravel', score: 45, date: '2024-01-10' },
          ],
          subreddits: ['budgettravel', 'shoestring'],
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

  const sortedFlights = [...flights].sort((a, b) => {
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
  }).filter((flight) => {
    if (maxStops !== null && flight.stops > maxStops) return false;
    return true;
  });

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Find Your Flight</h1>
        <p className="section-subtitle">
          Flights to {destination?.name} within your ${flightBudget.toLocaleString()} budget
        </p>
      </div>

      {/* Filters and sorting */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
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

      {/* Filters panel */}
      {showFilters && (
        <Card className="mb-6">
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Max stops
              </label>
              <div className="flex gap-2">
                {[null, 0, 1, 2].map((stops) => (
                  <button
                    key={stops ?? 'any'}
                    onClick={() => setMaxStops(stops)}
                    className={clsx(
                      'px-3 py-1 rounded-full text-sm',
                      maxStops === stops
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {stops === null ? 'Any' : stops === 0 ? 'Nonstop' : `${stops}+`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

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
              onClick={() => setSelectedFlight(flight)}
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
                  <span className="text-primary-600 font-medium">
                    Selected Flight
                  </span>
                  <span className="text-sm text-gray-500">
                    ${flight.price} will be deducted from your budget
                  </span>
                </div>
              )}
            </Card>
          ))}

          {sortedFlights.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-500">
              <Plane className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No flights found matching your criteria</p>
              <p className="text-sm mt-2">Try adjusting your filters or budget allocation</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
