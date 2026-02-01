'use client';

import { useState, useEffect } from 'react';
import { Users, Baby, Briefcase, Heart, User, Users2, MapPin, Calendar, Clock } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import { LegTimeline } from '@/components/legs';
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

export default function Step2DatesAndTravelers() {
  const {
    legs,
    origin,
    setOrigin,
    dates,
    setDates,
    travelers,
    setTravelers,
    tripType,
    setTripType,
    setLegDates,
    distributeBudgetAcrossLegs,
  } = useTripStore();

  const [airportSearch, setAirportSearch] = useState('');
  const [showAirportDropdown, setShowAirportDropdown] = useState(false);
  const [legDaysAllocation, setLegDaysAllocation] = useState<Record<string, number>>({});

  // Initialize leg days allocation
  useEffect(() => {
    const allocation: Record<string, number> = {};
    legs.forEach((leg) => {
      allocation[leg.id] = leg.days || Math.ceil(totalTripDays / legs.length) || 3;
    });
    setLegDaysAllocation(allocation);
  }, [legs.length]);

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

  const handleLegDaysChange = (legId: string, days: number) => {
    setLegDaysAllocation((prev) => ({
      ...prev,
      [legId]: Math.max(1, days),
    }));
  };

  // Apply leg dates when trip dates and allocation are set
  const applyLegDates = () => {
    if (!dates.startDate) return;

    let currentDate = new Date(dates.startDate);

    legs.forEach((leg) => {
      const days = legDaysAllocation[leg.id] || 3;
      const legStart = new Date(currentDate);
      const legEnd = new Date(currentDate);
      legEnd.setDate(legEnd.getDate() + days);

      setLegDates(leg.id, legStart, legEnd);
      currentDate = new Date(legEnd);
    });

    // Update end date if needed
    if (currentDate > new Date(dates.endDate || 0)) {
      setDates({
        ...dates,
        endDate: currentDate,
      });
    }

    distributeBudgetAcrossLegs();
  };

  // Auto-apply dates when allocation changes
  useEffect(() => {
    if (dates.startDate && Object.keys(legDaysAllocation).length === legs.length) {
      applyLegDates();
    }
  }, [legDaysAllocation, dates.startDate]);

  const startDateStr = toDateString(dates.startDate);
  const endDateStr = toDateString(dates.endDate);

  const totalTripDays = dates.startDate && dates.endDate
    ? Math.ceil(
        (new Date(dates.endDate).getTime() - new Date(dates.startDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const allocatedDays = Object.values(legDaysAllocation).reduce((sum, days) => sum + days, 0);

  const today = new Date().toISOString().split('T')[0];

  const destinationsText = legs.length > 0
    ? legs.map((l) => l.destination.name).join(', ')
    : 'your destination';

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Plan Your Trip</h1>
        <p className="section-subtitle">
          {destinationsText} awaits! Let's plan the details.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Visual Timeline */}
        {legs.length > 0 && <LegTimeline />}

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

          {totalTripDays > 0 && (
            <div className="mt-4 p-3 bg-primary-50 rounded-lg text-center">
              <span className="text-primary-700 font-medium">
                {totalTripDays} {totalTripDays === 1 ? 'night' : 'nights'} total
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

        {/* Per-Leg Day Allocation */}
        {legs.length > 1 && dates.startDate && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Days Per Destination</h2>
              <span className={clsx(
                'text-sm px-3 py-1 rounded-full',
                allocatedDays === totalTripDays
                  ? 'bg-green-100 text-green-700'
                  : allocatedDays > totalTripDays
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              )}>
                {allocatedDays} / {totalTripDays} days
              </span>
            </div>

            <div className="space-y-4">
              {legs.map((leg, index) => (
                <div key={leg.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <div
                    className="w-10 h-10 rounded-lg bg-cover bg-center flex-shrink-0"
                    style={{
                      backgroundImage: leg.destination.imageUrl
                        ? `url(${leg.destination.imageUrl})`
                        : 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)',
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-700">{leg.destination.name}</div>
                    <div className="text-sm text-slate-500">{leg.destination.country}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleLegDaysChange(leg.id, (legDaysAllocation[leg.id] || 3) - 1)}
                      disabled={(legDaysAllocation[leg.id] || 3) <= 1}
                      className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center hover:border-sky-500 hover:text-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <div className="w-16 text-center">
                      <span className="text-xl font-bold text-slate-700">
                        {legDaysAllocation[leg.id] || 3}
                      </span>
                      <span className="text-sm text-slate-500 ml-1">days</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLegDaysChange(leg.id, (legDaysAllocation[leg.id] || 3) + 1)}
                      className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center hover:border-sky-500 hover:text-sky-500 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {allocatedDays !== totalTripDays && totalTripDays > 0 && (
              <p className="mt-3 text-sm text-amber-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {allocatedDays > totalTripDays
                  ? `You've allocated ${allocatedDays - totalTripDays} extra days. Consider extending your trip.`
                  : `${totalTripDays - allocatedDays} days unallocated.`}
              </p>
            )}
          </Card>
        )}

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
