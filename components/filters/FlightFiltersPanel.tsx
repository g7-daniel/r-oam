'use client';

import { useState } from 'react';
import {
  Filter,
  X,
  Plane,
  Clock,
  Sun,
  Sunset,
  Moon,
  Star,
  RotateCcw,
} from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import PriceRangeSlider from './PriceRangeSlider';
import type { CabinClass, TimeOfDay } from '@/types';
import clsx from 'clsx';

const CABIN_CLASSES: { id: CabinClass; label: string; description: string }[] = [
  { id: 'ECONOMY', label: 'Economy', description: 'Standard seating' },
  { id: 'PREMIUM_ECONOMY', label: 'Premium Economy', description: 'Extra legroom' },
  { id: 'BUSINESS', label: 'Business', description: 'Lie-flat seats' },
  { id: 'FIRST', label: 'First', description: 'Ultimate luxury' },
];

const TIME_OF_DAY: { id: TimeOfDay; label: string; icon: React.ReactNode; hours: string }[] = [
  { id: 'morning', label: 'Morning', icon: <Sun className="w-4 h-4" />, hours: '6AM - 12PM' },
  { id: 'afternoon', label: 'Afternoon', icon: <Sun className="w-4 h-4 rotate-180" />, hours: '12PM - 6PM' },
  { id: 'evening', label: 'Evening', icon: <Sunset className="w-4 h-4" />, hours: '6PM - 10PM' },
  { id: 'red_eye', label: 'Red-eye', icon: <Moon className="w-4 h-4" />, hours: '10PM - 6AM' },
];

const STOP_OPTIONS = [
  { value: 0, label: 'Non-stop only' },
  { value: 1, label: '1 stop or less' },
  { value: 2, label: '2 stops or less' },
  { value: null, label: 'Any' },
];

interface FlightFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  availableAirlines?: { code: string; name: string }[];
  priceRange?: { min: number; max: number };
}

export default function FlightFiltersPanel({
  isOpen,
  onClose,
  availableAirlines = [],
  priceRange = { min: 0, max: 5000 },
}: FlightFiltersPanelProps) {
  const { flightFilters, setFlightFilters, resetFlightFilters } = useTripStore();

  const toggleCabinClass = (cabin: CabinClass) => {
    const current = flightFilters.cabinClasses;
    if (current.includes(cabin)) {
      setFlightFilters({ cabinClasses: current.filter((c) => c !== cabin) });
    } else {
      setFlightFilters({ cabinClasses: [...current, cabin] });
    }
  };

  const toggleTimeOfDay = (time: TimeOfDay) => {
    const current = flightFilters.departureTimeOfDay;
    if (current.includes(time)) {
      setFlightFilters({ departureTimeOfDay: current.filter((t) => t !== time) });
    } else {
      setFlightFilters({ departureTimeOfDay: [...current, time] });
    }
  };

  const toggleAirline = (code: string) => {
    const current = flightFilters.airlines;
    if (current.includes(code)) {
      setFlightFilters({ airlines: current.filter((a) => a !== code) });
    } else {
      setFlightFilters({ airlines: [...current, code] });
    }
  };

  const activeFilterCount = [
    flightFilters.cabinClasses.length > 0,
    flightFilters.maxStops !== null,
    flightFilters.maxDurationMinutes !== null,
    flightFilters.airlines.length > 0,
    flightFilters.departureTimeOfDay.length > 0,
    flightFilters.priceRange !== null,
  ].filter(Boolean).length;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Flight Filters</h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-medium rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Price Range */}
          <div>
            <PriceRangeSlider
              min={priceRange.min}
              max={priceRange.max}
              value={flightFilters.priceRange}
              onChange={(range) => setFlightFilters({ priceRange: range })}
              label="Price Range"
            />
          </div>

          {/* Cabin Class */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
              <Plane className="w-4 h-4" />
              Cabin Class
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CABIN_CLASSES.map((cabin) => {
                const isSelected = flightFilters.cabinClasses.includes(cabin.id);
                return (
                  <button
                    key={cabin.id}
                    onClick={() => toggleCabinClass(cabin.id)}
                    className={clsx(
                      'p-3 rounded-xl border-2 transition-all text-left',
                      isSelected
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className={clsx(
                      'font-medium text-sm',
                      isSelected ? 'text-sky-700' : 'text-slate-700'
                    )}>
                      {cabin.label}
                    </div>
                    <div className="text-xs text-slate-500">{cabin.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stops */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
              <RotateCcw className="w-4 h-4" />
              Number of Stops
            </label>
            <div className="flex flex-wrap gap-2">
              {STOP_OPTIONS.map((option) => {
                const isSelected = flightFilters.maxStops === option.value;
                return (
                  <button
                    key={option.label}
                    onClick={() => setFlightFilters({ maxStops: option.value })}
                    className={clsx(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all',
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Departure Time */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
              <Clock className="w-4 h-4" />
              Departure Time
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OF_DAY.map((time) => {
                const isSelected = flightFilters.departureTimeOfDay.includes(time.id);
                return (
                  <button
                    key={time.id}
                    onClick={() => toggleTimeOfDay(time.id)}
                    className={clsx(
                      'flex items-center gap-2 p-3 rounded-xl border-2 transition-all',
                      isSelected
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className={isSelected ? 'text-sky-500' : 'text-slate-400'}>
                      {time.icon}
                    </span>
                    <div className="text-left">
                      <div className={clsx(
                        'text-sm font-medium',
                        isSelected ? 'text-sky-700' : 'text-slate-700'
                      )}>
                        {time.label}
                      </div>
                      <div className="text-xs text-slate-500">{time.hours}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max Duration */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
              <Clock className="w-4 h-4" />
              Maximum Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 180, label: 'Under 3h' },
                { value: 360, label: 'Under 6h' },
                { value: 600, label: 'Under 10h' },
                { value: 900, label: 'Under 15h' },
                { value: null, label: 'Any' },
              ].map((option) => {
                const isSelected = flightFilters.maxDurationMinutes === option.value;
                return (
                  <button
                    key={option.label}
                    onClick={() => setFlightFilters({ maxDurationMinutes: option.value })}
                    className={clsx(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all',
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Airlines */}
          {availableAirlines.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                <Star className="w-4 h-4" />
                Airlines
              </label>
              <div className="flex flex-wrap gap-2">
                {availableAirlines.map((airline) => {
                  const isSelected = flightFilters.airlines.includes(airline.code);
                  return (
                    <button
                      key={airline.code}
                      onClick={() => toggleAirline(airline.code)}
                      className={clsx(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                        isSelected
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {airline.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
          <button
            onClick={() => {
              resetFlightFilters();
            }}
            className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Reset All
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
