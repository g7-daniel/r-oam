'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTripStore } from '@/stores/tripStore';
import AirportAutocomplete from '@/components/ui/AirportAutocomplete';
import Card from '@/components/ui/Card';
import {
  Loader2,
  Users,
  DollarSign,
  Zap,
  Coffee,
  Rocket,
  Sparkles,
  Briefcase,
  Heart,
  Users2,
  Baby,
  Minus,
  Plus,
} from 'lucide-react';
import clsx from 'clsx';
import type { AirportData } from '@/lib/data/airports';
import type { BudgetStyle, Pace } from '@/lib/schemas/trip';

// Dynamic import for DateRangePicker - reduces initial bundle size
const DateRangePicker = dynamic(
  () => import('@/components/ui/DateRangePicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    ),
  }
);

const BUDGET_STYLES: { value: BudgetStyle; label: string; icon: React.ElementType; description: string; priceRange: string }[] = [
  { value: 'budget', label: 'Budget', icon: Coffee, description: 'Hostels, street food, public transit', priceRange: '$50-100/day' },
  { value: 'mid', label: 'Mid-Range', icon: Sparkles, description: 'Nice hotels, local restaurants', priceRange: '$150-250/day' },
  { value: 'premium', label: 'Premium', icon: Zap, description: 'Boutique hotels, fine dining', priceRange: '$300-500/day' },
  { value: 'luxury', label: 'Luxury', icon: Rocket, description: '5-star everything, VIP access', priceRange: '$500+/day' },
];

const PACE_OPTIONS: { value: Pace; label: string; description: string }[] = [
  { value: 'chill', label: 'Relaxed', description: '1-2 activities per day, lots of downtime' },
  { value: 'balanced', label: 'Balanced', description: '2-3 activities per day, some free time' },
  { value: 'packed', label: 'Action-Packed', description: 'See everything! Maximize every moment' },
];

const TRIP_TYPE_TAGS = [
  { id: 'romantic', label: 'Romantic', icon: Heart },
  { id: 'adventure', label: 'Adventure', icon: Rocket },
  { id: 'family', label: 'Family Fun', icon: Users2 },
  { id: 'relaxation', label: 'Relaxation', icon: Coffee },
  { id: 'cultural', label: 'Cultural', icon: Sparkles },
  { id: 'foodie', label: 'Food & Wine', icon: Coffee },
  { id: 'business', label: 'Business + Leisure', icon: Briefcase },
  { id: 'solo', label: 'Solo Exploration', icon: Users },
];

// Calculate budget style based on amount
const getBudgetStyleForAmount = (amount: number): BudgetStyle => {
  if (amount >= 15000) return 'luxury';
  if (amount >= 8000) return 'premium';
  if (amount >= 3000) return 'mid';
  return 'budget';
};

export default function Step1TripBasics() {
  const { trip, setOriginAirport, setDates, setTravelers, setBudget, setPace, setTripTypeTags, setRoundTrip } = useTripStore();
  const { basics } = trip;

  const [errors] = useState<Record<string, string>>({});

  // Convert AirportData to schema format
  const handleAirportChange = useCallback(
    (airport: AirportData | null) => {
      if (airport) {
        setOriginAirport({
          iata: airport.iata,
          name: airport.name,
          city: airport.city,
          country: airport.country,
        });
      } else {
        setOriginAirport(null);
      }
    },
    [setOriginAirport]
  );

  // Convert schema airport to AirportData for the component
  const airportValue: AirportData | null = basics.originAirport
    ? {
        iata: basics.originAirport.iata,
        icao: '', // Not stored in schema
        name: basics.originAirport.name,
        city: basics.originAirport.city,
        country: basics.originAirport.country,
        countryCode: '', // Not stored in schema
        lat: 0,
        lng: 0,
      }
    : null;

  const handleTravelerChange = (type: 'adults' | 'children', delta: number) => {
    const current = basics.travelers[type];
    const newValue = Math.max(type === 'adults' ? 1 : 0, Math.min(9, current + delta));
    setTravelers({ ...basics.travelers, [type]: newValue });
  };

  const toggleTag = (tagId: string) => {
    const current = basics.tripTypeTags;
    const updated = current.includes(tagId)
      ? current.filter((t) => t !== tagId)
      : [...current, tagId];
    setTripTypeTags(updated);
  };

  // formatDate is available for future date formatting needs
  // const formatDate = (dateStr: string | null) => dateStr || '';

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="section-title">Let's Plan Your Trip</h1>
        <p className="section-subtitle">
          Tell us the basics so we can find the perfect experiences for you
        </p>
      </div>

      {/* Origin Airport */}
      <Card>
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
            1
          </span>
          Where are you flying from?
        </h2>
        <AirportAutocomplete
          value={airportValue}
          onChange={handleAirportChange}
          placeholder="Search city or airport code (e.g., LAX, New York, FLL)"
          required
          error={errors.origin}
        />
      </Card>

      {/* Travel Dates */}
      <Card>
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
            2
          </span>
          When are you traveling?
        </h2>
        <DateRangePicker
          startDate={basics.startDate}
          endDate={basics.endDate}
          onChange={(start, end) => setDates(start, end)}
          minDate={new Date().toISOString().split('T')[0]}
        />
        {errors.startDate && (
          <p className="mt-2 text-sm text-red-500">{errors.startDate}</p>
        )}
        {errors.endDate && (
          <p className="mt-2 text-sm text-red-500">{errors.endDate}</p>
        )}

        {/* Round Trip Toggle */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={trip.flights.isRoundTrip}
              onChange={(e) => setRoundTrip(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-slate-900">Round trip flight</span>
              <p className="text-sm text-slate-500">
                {trip.flights.isRoundTrip
                  ? 'Return flight to your origin included'
                  : 'One-way flights only'}
              </p>
            </div>
          </label>
        </div>
      </Card>

      {/* Travelers */}
      <Card>
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
            3
          </span>
          Who's traveling?
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-medium text-slate-900">Adults</p>
                <p className="text-sm text-slate-500">Ages 12+</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleTravelerChange('adults', -1)}
                disabled={basics.travelers.adults <= 1}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrease adults"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-8 text-center font-semibold text-lg">
                {basics.travelers.adults}
              </span>
              <button
                type="button"
                onClick={() => handleTravelerChange('adults', 1)}
                disabled={basics.travelers.adults >= 9}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increase adults"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Baby className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-medium text-slate-900">Children</p>
                <p className="text-sm text-slate-500">Ages 0-11</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleTravelerChange('children', -1)}
                disabled={basics.travelers.children <= 0}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrease children"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-8 text-center font-semibold text-lg">
                {basics.travelers.children}
              </span>
              <button
                type="button"
                onClick={() => handleTravelerChange('children', 1)}
                disabled={basics.travelers.children >= 9}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increase children"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Budget */}
      <Card>
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
            4
          </span>
          What's your total budget?
        </h2>
        <div className="space-y-4">
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="number"
              value={basics.totalBudgetUsd}
              onChange={(e) => {
                const amount = parseInt(e.target.value) || 0;
                const autoStyle = getBudgetStyleForAmount(amount);
                setBudget(amount, autoStyle);
              }}
              min={0}
              step={100}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Total trip budget in USD"
              aria-label="Total trip budget in USD"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {BUDGET_STYLES.map((style) => {
              const Icon = style.icon;
              const isSelected = basics.budgetStyle === style.value;
              return (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => setBudget(basics.totalBudgetUsd, style.value)}
                  className={clsx(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  )}
                >
                  <Icon
                    className={clsx(
                      'w-5 h-5 mb-2',
                      isSelected ? 'text-primary-600' : 'text-slate-400'
                    )}
                  />
                  <p
                    className={clsx(
                      'font-medium',
                      isSelected ? 'text-primary-700' : 'text-slate-700'
                    )}
                  >
                    {style.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{style.description}</p>
                  <p className={clsx(
                    'text-xs mt-1 font-medium',
                    isSelected ? 'text-primary-600' : 'text-slate-400'
                  )}>
                    {style.priceRange}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Pace */}
      <Card>
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
            5
          </span>
          What's your ideal pace?
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {PACE_OPTIONS.map((option) => {
            const isSelected = basics.pace === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPace(option.value)}
                className={clsx(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                )}
              >
                <p
                  className={clsx(
                    'font-medium',
                    isSelected ? 'text-primary-700' : 'text-slate-700'
                  )}
                >
                  {option.label}
                </p>
                <p className="text-sm text-slate-500 mt-1">{option.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Trip Type Tags */}
      <Card>
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold">
            6
          </span>
          What kind of trip is this? <span className="text-slate-400 font-normal">(optional)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {TRIP_TYPE_TAGS.map((tag) => {
            const Icon = tag.icon;
            const isSelected = basics.tripTypeTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={clsx(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                )}
              >
                <Icon className="w-4 h-4" />
                {tag.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Summary */}
      {basics.originAirport && basics.startDate && basics.endDate && (
        <div className="p-4 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl text-white">
          <p className="text-sm opacity-90">Your trip summary</p>
          <p className="font-semibold mt-1">
            Flying from {basics.originAirport.city} ({basics.originAirport.iata}) on{' '}
            {new Date(basics.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            -{' '}
            {new Date(basics.endDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-sm opacity-90 mt-1">
            {basics.travelers.adults} adult{basics.travelers.adults > 1 ? 's' : ''}
            {basics.travelers.children > 0 &&
              `, ${basics.travelers.children} child${basics.travelers.children > 1 ? 'ren' : ''}`}{' '}
            | ${basics.totalBudgetUsd.toLocaleString()} budget | {basics.budgetStyle} style |{' '}
            {basics.pace} pace
          </p>
        </div>
      )}
    </div>
  );
}
