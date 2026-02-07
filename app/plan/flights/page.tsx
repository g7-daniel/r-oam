'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Step6FlightsV2 from '@/components/journey/Step6FlightsV2';
import { ArrowLeft, Check, MapPin, Plane } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';

export default function FlightsPage() {
  const router = useRouter();
  const { trip, setOriginAirport, buildFlightLegs } = useTripStore(useShallow((state) => ({
    trip: state.trip,
    setOriginAirport: state.setOriginAirport,
    buildFlightLegs: state.buildFlightLegs,
  })));
  const { basics, flights, destinations } = trip;

  const [originInput, setOriginInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [airportSuggestions, setAirportSuggestions] = useState<any[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Check if origin is set
  const hasOrigin = basics.originAirport !== null;

  // Check if all flights are completed
  const allFlightsComplete = flights.legs.length > 0 &&
    flights.legs.every((l) => l.status === 'selected' || l.status === 'skipped_booked');

  // Handle keyboard navigation for airport combobox
  const handleComboboxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!airportSuggestions.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < airportSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : airportSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < airportSuggestions.length) {
          handleSelectAirport(airportSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setAirportSuggestions([]);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Search for airports
  const searchAirports = async (query: string) => {
    if (query.length < 2) {
      setAirportSuggestions([]);
      setHighlightedIndex(-1);
      return;
    }

    setIsSearching(true);
    setHighlightedIndex(-1);
    try {
      // Common airports database (subset for demo)
      const commonAirports = [
        { iataCode: 'JFK', city: 'New York', name: 'John F. Kennedy International', country: 'USA' },
        { iataCode: 'LAX', city: 'Los Angeles', name: 'Los Angeles International', country: 'USA' },
        { iataCode: 'ORD', city: 'Chicago', name: "O'Hare International", country: 'USA' },
        { iataCode: 'MIA', city: 'Miami', name: 'Miami International', country: 'USA' },
        { iataCode: 'SFO', city: 'San Francisco', name: 'San Francisco International', country: 'USA' },
        { iataCode: 'SEA', city: 'Seattle', name: 'Seattle-Tacoma International', country: 'USA' },
        { iataCode: 'BOS', city: 'Boston', name: 'Logan International', country: 'USA' },
        { iataCode: 'DFW', city: 'Dallas', name: 'Dallas/Fort Worth International', country: 'USA' },
        { iataCode: 'ATL', city: 'Atlanta', name: 'Hartsfield-Jackson Atlanta International', country: 'USA' },
        { iataCode: 'DEN', city: 'Denver', name: 'Denver International', country: 'USA' },
        { iataCode: 'LHR', city: 'London', name: 'Heathrow', country: 'UK' },
        { iataCode: 'CDG', city: 'Paris', name: 'Charles de Gaulle', country: 'France' },
        { iataCode: 'FRA', city: 'Frankfurt', name: 'Frankfurt Airport', country: 'Germany' },
        { iataCode: 'AMS', city: 'Amsterdam', name: 'Schiphol', country: 'Netherlands' },
        { iataCode: 'TLV', city: 'Tel Aviv', name: 'Ben Gurion International', country: 'Israel' },
        { iataCode: 'NRT', city: 'Tokyo', name: 'Narita International', country: 'Japan' },
        { iataCode: 'SIN', city: 'Singapore', name: 'Changi Airport', country: 'Singapore' },
        { iataCode: 'DXB', city: 'Dubai', name: 'Dubai International', country: 'UAE' },
        { iataCode: 'SYD', city: 'Sydney', name: 'Sydney Airport', country: 'Australia' },
        { iataCode: 'YYZ', city: 'Toronto', name: 'Toronto Pearson International', country: 'Canada' },
      ];

      const queryLower = query.toLowerCase();
      const matches = commonAirports.filter(
        (a) =>
          a.city.toLowerCase().includes(queryLower) ||
          a.iataCode.toLowerCase().includes(queryLower) ||
          a.name.toLowerCase().includes(queryLower)
      );

      setAirportSuggestions(matches.slice(0, 5));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAirport = (airport: any) => {
    setOriginAirport({
      iata: airport.iataCode,
      city: airport.city,
      name: airport.name,
      country: airport.country,
    });
    setOriginInput('');
    setAirportSuggestions([]);
    setHighlightedIndex(-1);
    // Build flight legs after setting origin
    setTimeout(() => buildFlightLegs(), 100);
  };

  const handleFinish = () => {
    router.push('/plan');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-40 safe-area-inset-top">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/plan/hotels')}
            className="flex items-center gap-1.5 md:gap-2 min-h-[44px] px-2 md:px-0 text-sm md:text-base text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Back to Hotels"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Hotels</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="flex items-center gap-1 text-sm">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-medium">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500">Itinerary</span>
            </div>
            <div className="w-4 md:w-8 h-px bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-1 text-sm">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-medium">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500">Hotels</span>
            </div>
            <div className="w-4 md:w-8 h-px bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-1 text-sm">
              <span className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-medium">3</span>
              <span className="text-slate-900 dark:text-white font-medium">Flights</span>
            </div>
          </div>
          <div className="w-16 md:w-32" />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-16 md:pb-24">
        {!hasOrigin ? (
          // Origin airport selection
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Where are you flying from?</h1>
              <p className="text-slate-500 dark:text-slate-400">Enter your departure city or airport code</p>
            </div>

            <div className="relative">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={originInput}
                  onChange={(e) => {
                    setOriginInput(e.target.value);
                    searchAirports(e.target.value);
                  }}
                  onKeyDown={handleComboboxKeyDown}
                  placeholder="Search city or airport code..."
                  role="combobox"
                  aria-expanded={!isSearching && airportSuggestions.length > 0}
                  aria-controls="origin-airport-listbox"
                  aria-autocomplete="list"
                  aria-activedescendant={highlightedIndex >= 0 ? `airport-option-${airportSuggestions[highlightedIndex]?.iataCode}` : undefined}
                  aria-label="Search for departure airport"
                  className="w-full pl-12 pr-4 py-4 text-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-400"
                  autoFocus
                />
              </div>

              {/* Searching indicator */}
              {isSearching && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 z-50">
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center animate-pulse">Searching airports...</p>
                </div>
              )}

              {/* Suggestions dropdown */}
              {!isSearching && airportSuggestions.length > 0 && (
                <div id="origin-airport-listbox" className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50" role="listbox" aria-label="Airport suggestions">
                  {airportSuggestions.map((airport, index) => (
                    <button
                      key={airport.iataCode}
                      id={`airport-option-${airport.iataCode}`}
                      onClick={() => handleSelectAirport(airport)}
                      role="option"
                      aria-selected={index === highlightedIndex}
                      className={`w-full px-4 py-3 min-h-[48px] text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 ${index === highlightedIndex ? 'bg-slate-100 dark:bg-slate-600' : ''}`}
                    >
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-slate-600 dark:text-slate-300">{airport.iataCode}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{airport.city}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{airport.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No results found */}
              {!isSearching && originInput.length >= 2 && airportSuggestions.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 z-50" role="status">
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center">No airports found for &ldquo;{originInput}&rdquo;</p>
                </div>
              )}
            </div>

            {/* Destination preview */}
            {destinations.length > 0 && (
              <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Flying to:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {destinations.map((dest, idx) => (
                    <span key={dest.destinationId} className="flex items-center gap-1">
                      <span className="font-medium text-slate-900 dark:text-white">{dest.place.name}</span>
                      {idx < destinations.length - 1 && (
                        <span className="text-slate-400 mx-1">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Flight selection
          <Step6FlightsV2 />
        )}
      </div>

      {/* Bottom navigation bar - compact on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 md:px-6 py-2 md:py-4 z-40 safe-area-inset-bottom">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => router.push('/plan/hotels')}
            className="px-3 md:px-4 py-2.5 md:py-2 min-h-[44px] text-sm md:text-base text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
          >
            Back
          </button>
          {hasOrigin && (
            <button
              onClick={handleFinish}
              disabled={!allFlightsComplete}
              className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 md:py-2.5 min-h-[44px] text-sm md:text-base bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Finish Planning</span>
              <span className="sm:hidden">Finish</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
