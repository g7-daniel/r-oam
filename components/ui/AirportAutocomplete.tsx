'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plane, MapPin, X, Check } from 'lucide-react';
import clsx from 'clsx';
import { searchAirports, groupAirportsByCity, type AirportData } from '@/lib/data/airports';

interface AirportAutocompleteProps {
  value: AirportData | null;
  onChange: (airport: AirportData | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  error?: string;
}

export default function AirportAutocomplete({
  value,
  onChange,
  placeholder = 'Search city or airport code...',
  label,
  required,
  className,
  error,
}: AirportAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<AirportData[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search when query changes
  useEffect(() => {
    if (query.length >= 2) {
      const matches = searchAirports(query, 15);
      setResults(matches);
      setHighlightedIndex(matches.length > 0 ? 0 : -1);
    } else {
      setResults([]);
      setHighlightedIndex(-1);
    }
  }, [query]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (airport: AirportData) => {
      onChange(airport);
      setQuery('');
      setIsOpen(false);
      setResults([]);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setQuery('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Group results by city for display
  const groupedResults = groupAirportsByCity(results);

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected value display */}
      {value && !isOpen ? (
        <div
          onClick={() => {
            setIsOpen(true);
            setQuery('');
            inputRef.current?.focus();
          }}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 bg-white border rounded-xl cursor-pointer',
            'hover:border-primary-300 transition-colors',
            error ? 'border-red-300' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg">
            <span className="text-sm font-bold text-primary-600">{value.iata}</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">{value.city}</p>
            <p className="text-sm text-slate-500">{value.name}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Plane className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={clsx(
              'w-full pl-12 pr-4 py-3 bg-white border rounded-xl',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'placeholder:text-slate-400',
              error ? 'border-red-300' : 'border-slate-200'
            )}
          />
        </div>
      )}

      {/* Error message */}
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {Array.from(groupedResults.entries()).map(([cityKey, airports], groupIndex) => (
            <div key={cityKey}>
              {/* City header */}
              <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                {cityKey}
              </div>

              {/* Airports in this city */}
              {airports.map((airport) => {
                const globalIndex = results.findIndex((r) => r.iata === airport.iata);
                const isHighlighted = globalIndex === highlightedIndex;

                return (
                  <button
                    key={airport.iata}
                    type="button"
                    onClick={() => handleSelect(airport)}
                    onMouseEnter={() => setHighlightedIndex(globalIndex)}
                    className={clsx(
                      'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                      isHighlighted
                        ? 'bg-primary-50'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    <div
                      className={clsx(
                        'flex items-center justify-center w-10 h-10 rounded-lg',
                        airport.isPrimary
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      <span className="text-sm font-bold">{airport.iata}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {airport.name}
                      </p>
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <span>{airport.country}</span>
                        {airport.isPrimary && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                            <Check className="w-3 h-3" />
                            Primary
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 p-4 bg-white border border-slate-200 rounded-xl shadow-lg">
          <p className="text-sm text-slate-500 text-center">
            No airports found for "{query}"
          </p>
        </div>
      )}

      {/* Hint */}
      {isOpen && query.length > 0 && query.length < 2 && (
        <div className="absolute z-50 w-full mt-2 p-4 bg-white border border-slate-200 rounded-xl shadow-lg">
          <p className="text-sm text-slate-500 text-center">
            Type at least 2 characters to search
          </p>
        </div>
      )}
    </div>
  );
}
