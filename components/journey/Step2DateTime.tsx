'use client';

import { useState } from 'react';
import { Users, Baby, Briefcase, Heart, User, Users2, MapPin } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import type { TripType, Airport } from '@/types';
import clsx from 'clsx';

const tripTypes: { type: TripType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    type: 'solo',
    label: 'Solo',
    icon: <User className="w-6 h-6" />,
    description: 'Adventure on your own',
  },
  {
    type: 'couple',
    label: 'Couple',
    icon: <Heart className="w-6 h-6" />,
    description: 'Romantic getaway',
  },
  {
    type: 'family',
    label: 'Family',
    icon: <Users className="w-6 h-6" />,
    description: 'Fun for all ages',
  },
  {
    type: 'friends',
    label: 'Friends',
    icon: <Users2 className="w-6 h-6" />,
    description: 'Group adventure',
  },
  {
    type: 'business',
    label: 'Business',
    icon: <Briefcase className="w-6 h-6" />,
    description: 'Work trip',
  },
];

const popularAirports: Airport[] = [
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas' },
  { code: 'MIA', name: 'Miami International', city: 'Miami' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle' },
  { code: 'BOS', name: 'Logan International', city: 'Boston' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta', city: 'Atlanta' },
  { code: 'DEN', name: 'Denver International', city: 'Denver' },
  { code: 'LHR', name: 'Heathrow', city: 'London' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris' },
];

function toDateString(date: Date | string | null): string {
  if (!date) return '';
  if (typeof date === 'string') return date.split('T')[0];
  return date.toISOString().split('T')[0];
}

export default function Step2DateTime() {
  const {
    destination,
    origin,
    setOrigin,
    dates,
    setDates,
    travelers,
    setTravelers,
    tripType,
    setTripType,
  } = useTripStore();

  const [airportSearch, setAirportSearch] = useState('');
  const [showAirportDropdown, setShowAirportDropdown] = useState(false);

  const filteredAirports = airportSearch.length > 0
    ? popularAirports.filter(
        (a) =>
          a.city.toLowerCase().includes(airportSearch.toLowerCase()) ||
          a.code.toLowerCase().includes(airportSearch.toLowerCase()) ||
          a.name.toLowerCase().includes(airportSearch.toLowerCase())
      )
    : popularAirports;

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDates({
      ...dates,
      startDate: value ? new Date(value + 'T12:00:00') : null,
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDates({
      ...dates,
      endDate: value ? new Date(value + 'T12:00:00') : null,
    });
  };

  const handleTravelersChange = (adults: number, children: number) => {
    setTravelers({ adults, children });
  };

  const handleSelectAirport = (airport: Airport) => {
    setOrigin(airport);
    setAirportSearch('');
    setShowAirportDropdown(false);
  };

  const startDateStr = toDateString(dates.startDate);
  const endDateStr = toDateString(dates.endDate);

  const tripDuration = dates.startDate && dates.endDate
    ? Math.ceil(
        (new Date(dates.endDate).getTime() - new Date(dates.startDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Plan Your Trip</h1>
        <p className="section-subtitle">
          {destination?.name} awaits! Let's plan the details.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Origin City */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Where are you flying from?</h2>

          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={origin ? `${origin.city} (${origin.code})` : airportSearch}
              onChange={(e) => {
                setAirportSearch(e.target.value);
                setOrigin(null);
                setShowAirportDropdown(true);
              }}
              onFocus={() => setShowAirportDropdown(true)}
              placeholder="Search for your departure city..."
              className="w-full pl-12 px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />

            {showAirportDropdown && !origin && (
              <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
                {filteredAirports.map((airport) => (
                  <button
                    key={airport.code}
                    type="button"
                    onClick={() => handleSelectAirport(airport)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{airport.city}</div>
                      <div className="text-sm text-gray-500">{airport.name}</div>
                    </div>
                    <span className="text-primary-600 font-mono font-bold">{airport.code}</span>
                  </button>
                ))}
                {filteredAirports.length === 0 && (
                  <div className="px-4 py-3 text-gray-500">No airports found</div>
                )}
              </div>
            )}
          </div>

          {origin && (
            <div className="mt-3 p-3 bg-primary-50 rounded-lg flex items-center justify-between">
              <span className="text-primary-700">
                Departing from <strong>{origin.city} ({origin.code})</strong>
              </span>
              <button
                type="button"
                onClick={() => setOrigin(null)}
                className="text-primary-600 hover:text-primary-800 text-sm"
              >
                Change
              </button>
            </div>
          )}
        </Card>

        {/* Date selection */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Travel Dates</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDateStr}
                onChange={handleStartDateChange}
                min={today}
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDateStr}
                onChange={handleEndDateChange}
                min={startDateStr || today}
                className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>

          {tripDuration > 0 && (
            <div className="mt-4 p-3 bg-primary-50 rounded-lg text-center">
              <span className="text-primary-700 font-medium">
                {tripDuration} {tripDuration === 1 ? 'night' : 'nights'} in {destination?.name}
              </span>
            </div>
          )}

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={dates.isFlexible}
              onChange={(e) =>
                setDates({ ...dates, isFlexible: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">
              My dates are flexible (+/- 3 days)
            </span>
          </label>
        </Card>

        {/* Travelers */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Who's traveling?</h2>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-gray-500" />
                <span className="font-medium">Adults</span>
                <span className="text-sm text-gray-400">(18+)</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    handleTravelersChange(
                      Math.max(1, travelers.adults - 1),
                      travelers.children
                    )
                  }
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-primary-500 hover:text-primary-500 transition-colors"
                  disabled={travelers.adults <= 1}
                >
                  -
                </button>
                <span className="text-2xl font-bold w-8 text-center">
                  {travelers.adults}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleTravelersChange(travelers.adults + 1, travelers.children)
                  }
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-primary-500 hover:text-primary-500 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Baby className="w-5 h-5 text-gray-500" />
                <span className="font-medium">Children</span>
                <span className="text-sm text-gray-400">(0-17)</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    handleTravelersChange(
                      travelers.adults,
                      Math.max(0, travelers.children - 1)
                    )
                  }
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-primary-500 hover:text-primary-500 transition-colors"
                  disabled={travelers.children <= 0}
                >
                  -
                </button>
                <span className="text-2xl font-bold w-8 text-center">
                  {travelers.children}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleTravelersChange(travelers.adults, travelers.children + 1)
                  }
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-primary-500 hover:text-primary-500 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500 text-center">
            Total: {travelers.adults + travelers.children}{' '}
            {travelers.adults + travelers.children === 1 ? 'traveler' : 'travelers'}
          </div>
        </Card>

        {/* Trip type */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">What type of trip?</h2>
          <p className="text-sm text-gray-500 mb-4">
            This helps us find the best recommendations on Reddit
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {tripTypes.map(({ type, label, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setTripType(type)}
                className={clsx(
                  'p-4 rounded-xl border-2 transition-all text-center',
                  tripType === type
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div
                  className={clsx(
                    'mb-2 mx-auto',
                    tripType === type ? 'text-primary-500' : 'text-gray-400'
                  )}
                >
                  {icon}
                </div>
                <div
                  className={clsx(
                    'font-medium text-sm',
                    tripType === type ? 'text-primary-700' : 'text-gray-700'
                  )}
                >
                  {label}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
