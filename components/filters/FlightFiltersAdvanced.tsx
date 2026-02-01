'use client';

import { useState, useCallback } from 'react';
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  Plane,
  Clock,
  Sun,
  Sunset,
  Moon,
  Sunrise,
} from 'lucide-react';
import clsx from 'clsx';
import type { CabinClass, TimeOfDay } from '@/types';

export interface FlightFiltersAdvancedState {
  maxStops: number | null;
  cabinClasses: CabinClass[];
  departureTimeOfDay: TimeOfDay[];
  arrivalTimeOfDay: TimeOfDay[];
  airlines: string[];
  maxDurationMinutes: number | null;
  priceRange: { min: number; max: number };
  directOnly: boolean;
}

interface FlightFiltersAdvancedProps {
  filters: FlightFiltersAdvancedState;
  onFiltersChange: (filters: FlightFiltersAdvancedState) => void;
  availableAirlines?: { code: string; name: string }[];
  maxPrice?: number;
  maxDuration?: number;
  totalCount?: number;
  filteredCount?: number;
}

const cabinClassOptions: { value: CabinClass; label: string; description: string }[] = [
  { value: 'ECONOMY', label: 'Economy', description: 'Best value' },
  { value: 'PREMIUM_ECONOMY', label: 'Premium Economy', description: 'Extra legroom' },
  { value: 'BUSINESS', label: 'Business', description: 'Lie-flat seats' },
  { value: 'FIRST', label: 'First Class', description: 'Ultimate luxury' },
];

const timeOfDayOptions: { value: TimeOfDay; label: string; timeRange: string; icon: React.ReactNode }[] = [
  { value: 'morning', label: 'Morning', timeRange: '5:00 - 11:59', icon: <Sunrise className="w-4 h-4" /> },
  { value: 'afternoon', label: 'Afternoon', timeRange: '12:00 - 17:59', icon: <Sun className="w-4 h-4" /> },
  { value: 'evening', label: 'Evening', timeRange: '18:00 - 21:59', icon: <Sunset className="w-4 h-4" /> },
  { value: 'red_eye', label: 'Red Eye', timeRange: '22:00 - 4:59', icon: <Moon className="w-4 h-4" /> },
];

const stopsOptions = [
  { value: 0, label: 'Non-stop only' },
  { value: 1, label: '1 stop or less' },
  { value: 2, label: '2 stops or less' },
  { value: null, label: 'Any number of stops' },
];

export const defaultFlightFilters: FlightFiltersAdvancedState = {
  maxStops: null,
  cabinClasses: [],
  departureTimeOfDay: [],
  arrivalTimeOfDay: [],
  airlines: [],
  maxDurationMinutes: null,
  priceRange: { min: 0, max: 5000 },
  directOnly: false,
};

export default function FlightFiltersAdvanced({
  filters,
  onFiltersChange,
  availableAirlines = [],
  maxPrice = 5000,
  maxDuration = 1440, // 24 hours in minutes
  totalCount,
  filteredCount,
}: FlightFiltersAdvancedProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    stops: true,
    cabin: true,
    departure: false,
    arrival: false,
    airlines: false,
    duration: false,
    price: true,
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toggleCabinClass = (cabin: CabinClass) => {
    const newCabins = filters.cabinClasses.includes(cabin)
      ? filters.cabinClasses.filter((c) => c !== cabin)
      : [...filters.cabinClasses, cabin];
    onFiltersChange({ ...filters, cabinClasses: newCabins });
  };

  const toggleDepartureTime = (time: TimeOfDay) => {
    const newTimes = filters.departureTimeOfDay.includes(time)
      ? filters.departureTimeOfDay.filter((t) => t !== time)
      : [...filters.departureTimeOfDay, time];
    onFiltersChange({ ...filters, departureTimeOfDay: newTimes });
  };

  const toggleArrivalTime = (time: TimeOfDay) => {
    const newTimes = filters.arrivalTimeOfDay.includes(time)
      ? filters.arrivalTimeOfDay.filter((t) => t !== time)
      : [...filters.arrivalTimeOfDay, time];
    onFiltersChange({ ...filters, arrivalTimeOfDay: newTimes });
  };

  const toggleAirline = (code: string) => {
    const newAirlines = filters.airlines.includes(code)
      ? filters.airlines.filter((a) => a !== code)
      : [...filters.airlines, code];
    onFiltersChange({ ...filters, airlines: newAirlines });
  };

  const resetFilters = () => {
    onFiltersChange(defaultFlightFilters);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const activeFilterCount =
    filters.cabinClasses.length +
    filters.departureTimeOfDay.length +
    filters.arrivalTimeOfDay.length +
    filters.airlines.length +
    (filters.maxStops !== null ? 1 : 0) +
    (filters.maxDurationMinutes !== null ? 1 : 0) +
    (filters.directOnly ? 1 : 0) +
    (filters.priceRange.max < maxPrice || filters.priceRange.min > 0 ? 1 : 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-slate-500" />
          <span className="font-semibold text-slate-900">Flight Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-medium rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-sm text-sky-600 hover:text-sky-700 font-medium"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Results count */}
      {filteredCount !== undefined && totalCount !== undefined && (
        <div className="px-4 py-2 bg-slate-50 text-sm text-slate-600">
          Showing <span className="font-medium">{filteredCount}</span> of{' '}
          <span className="font-medium">{totalCount}</span> flights
        </div>
      )}

      {/* Stops */}
      <FilterSection
        title="Stops"
        isExpanded={expandedSections.stops}
        onToggle={() => toggleSection('stops')}
      >
        <div className="space-y-2">
          {stopsOptions.map((option) => (
            <label key={option.label} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="stops"
                checked={filters.maxStops === option.value}
                onChange={() => onFiltersChange({ ...filters, maxStops: option.value })}
                className="w-5 h-5 border-slate-300 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Cabin Class */}
      <FilterSection
        title="Cabin class"
        isExpanded={expandedSections.cabin}
        onToggle={() => toggleSection('cabin')}
        count={filters.cabinClasses.length}
      >
        <div className="grid grid-cols-2 gap-2">
          {cabinClassOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleCabinClass(option.value)}
              className={clsx(
                'flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left',
                filters.cabinClasses.includes(option.value)
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <span
                className={clsx(
                  'font-medium text-sm',
                  filters.cabinClasses.includes(option.value)
                    ? 'text-sky-700'
                    : 'text-slate-900'
                )}
              >
                {option.label}
              </span>
              <span className="text-xs text-slate-500">{option.description}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Departure Time */}
      <FilterSection
        title="Departure time"
        isExpanded={expandedSections.departure}
        onToggle={() => toggleSection('departure')}
        count={filters.departureTimeOfDay.length}
      >
        <div className="grid grid-cols-2 gap-2">
          {timeOfDayOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleDepartureTime(option.value)}
              className={clsx(
                'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
                filters.departureTimeOfDay.includes(option.value)
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div
                className={clsx(
                  filters.departureTimeOfDay.includes(option.value)
                    ? 'text-sky-600'
                    : 'text-slate-400'
                )}
              >
                {option.icon}
              </div>
              <div>
                <span
                  className={clsx(
                    'block font-medium text-sm',
                    filters.departureTimeOfDay.includes(option.value)
                      ? 'text-sky-700'
                      : 'text-slate-900'
                  )}
                >
                  {option.label}
                </span>
                <span className="text-xs text-slate-500">{option.timeRange}</span>
              </div>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Arrival Time */}
      <FilterSection
        title="Arrival time"
        isExpanded={expandedSections.arrival}
        onToggle={() => toggleSection('arrival')}
        count={filters.arrivalTimeOfDay.length}
      >
        <div className="grid grid-cols-2 gap-2">
          {timeOfDayOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleArrivalTime(option.value)}
              className={clsx(
                'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
                filters.arrivalTimeOfDay.includes(option.value)
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div
                className={clsx(
                  filters.arrivalTimeOfDay.includes(option.value)
                    ? 'text-sky-600'
                    : 'text-slate-400'
                )}
              >
                {option.icon}
              </div>
              <div>
                <span
                  className={clsx(
                    'block font-medium text-sm',
                    filters.arrivalTimeOfDay.includes(option.value)
                      ? 'text-sky-700'
                      : 'text-slate-900'
                  )}
                >
                  {option.label}
                </span>
                <span className="text-xs text-slate-500">{option.timeRange}</span>
              </div>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Airlines */}
      {availableAirlines.length > 0 && (
        <FilterSection
          title="Airlines"
          isExpanded={expandedSections.airlines}
          onToggle={() => toggleSection('airlines')}
          count={filters.airlines.length}
        >
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableAirlines.map((airline) => (
              <label key={airline.code} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.airlines.includes(airline.code)}
                  onChange={() => toggleAirline(airline.code)}
                  className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                />
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">
                    {airline.name}
                  </span>
                  <span className="text-xs text-slate-400">({airline.code})</span>
                </div>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Flight Duration */}
      <FilterSection
        title="Maximum duration"
        isExpanded={expandedSections.duration}
        onToggle={() => toggleSection('duration')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              {filters.maxDurationMinutes
                ? formatDuration(filters.maxDurationMinutes)
                : 'Any duration'}
            </span>
          </div>
          <input
            type="range"
            min="60"
            max={maxDuration}
            step="30"
            value={filters.maxDurationMinutes || maxDuration}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              onFiltersChange({
                ...filters,
                maxDurationMinutes: value >= maxDuration ? null : value,
              });
            }}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>1h</span>
            <span>{formatDuration(maxDuration)}</span>
          </div>
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection
        title="Price range"
        isExpanded={expandedSections.price}
        onToggle={() => toggleSection('price')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              ${filters.priceRange.min} - ${filters.priceRange.max}
            </span>
          </div>
          <div className="relative pt-1">
            <div className="h-2 bg-slate-200 rounded-full">
              <div
                className="absolute h-2 bg-sky-500 rounded-full"
                style={{
                  left: `${(filters.priceRange.min / maxPrice) * 100}%`,
                  width: `${((filters.priceRange.max - filters.priceRange.min) / maxPrice) * 100}%`,
                }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={maxPrice}
              step="50"
              value={filters.priceRange.min}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceRange: {
                    min: Math.min(parseInt(e.target.value), filters.priceRange.max - 50),
                    max: filters.priceRange.max,
                  },
                })
              }
              className="absolute top-0 w-full h-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
            />
            <input
              type="range"
              min="0"
              max={maxPrice}
              step="50"
              value={filters.priceRange.max}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceRange: {
                    min: filters.priceRange.min,
                    max: Math.max(parseInt(e.target.value), filters.priceRange.min + 50),
                  },
                })
              }
              className="absolute top-0 w-full h-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>$0</span>
            <span>${maxPrice}+</span>
          </div>
        </div>
      </FilterSection>
    </div>
  );
}

// Filter Section Component
function FilterSection({
  title,
  isExpanded,
  onToggle,
  count,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 text-xs font-medium rounded-full">
              {count}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
