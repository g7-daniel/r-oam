'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DateRangePicker from '@/components/ui/DateRangePicker';
import DetailDrawer, { ExperienceItem } from '@/components/quick-plan/DetailDrawer';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Minus,
  Plus,
  Check,
  ChevronRight,
  Star,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  Info,
} from 'lucide-react';
import type {
  ReplyCardType,
  ReplyCardConfig,
  ChipOption,
  AreaCandidate,
  HotelCandidate,
  RestaurantCandidate,
  VerifiedActivity,
  ItinerarySplit,
  Tradeoff,
  DissatisfactionReason,
} from '@/types/quick-plan';

// ============================================================================
// MAIN REPLY CARD COMPONENT
// ============================================================================

interface ReplyCardProps {
  type: ReplyCardType;
  config: ReplyCardConfig;
  onSubmit: (value: unknown) => void;
  disabled?: boolean;
}

export default function ReplyCard({ type, config, onSubmit, disabled = false }: ReplyCardProps) {
  const cardVariants = {
    chips: ChipsCard,
    'chips-multi': ChipsMultiCard,
    slider: SliderCard,
    'date-range': DateRangeCard,
    destination: DestinationCard,
    party: PartyCard,
    hotels: HotelsCard,
    restaurants: RestaurantsCard,
    experiences: ExperiencesCard,
    activities: ActivitiesCard,
    tradeoff: TradeoffCard,
    areas: AreasCard,
    split: SplitCard,
    satisfaction: SatisfactionCard,
    text: TextCard,
  };

  const CardComponent = cardVariants[type];

  if (!CardComponent) {
    console.warn(`Unknown reply card type: ${type}`);
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <CardComponent config={config} onSubmit={onSubmit} disabled={disabled} />
    </motion.div>
  );
}

// ============================================================================
// CHIPS CARD (Single Select)
// ============================================================================

interface CardProps {
  config: ReplyCardConfig;
  onSubmit: (value: unknown) => void;
  disabled?: boolean;
}

function ChipsCard({ config, onSubmit, disabled }: CardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleSelect = (optionId: string) => {
    if (disabled) return;
    setSelected(optionId);
    if (optionId !== 'custom') {
      const option = config.options?.find(o => o.id === optionId);
      onSubmit({ id: optionId, label: option?.label || optionId });
    }
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      onSubmit({ id: 'custom', label: customText.trim(), isCustom: true });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {config.options?.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selected === option.id
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {option.icon && <span className="mr-2">{option.icon}</span>}
            {option.label}
          </button>
        ))}
        {config.allowCustomText && (
          <button
            onClick={() => setShowCustom(true)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Other...
          </button>
        )}
      </div>

      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={config.customTextPlaceholder || 'Type your answer...'}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customText.trim()}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// CHIPS MULTI CARD (Multi Select)
// ============================================================================

function ChipsMultiCard({ config, onSubmit, disabled }: CardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState('');
  const [customItems, setCustomItems] = useState<string[]>([]);

  const toggleOption = (optionId: string) => {
    if (disabled) return;
    const newSelected = new Set(selected);
    if (newSelected.has(optionId)) {
      newSelected.delete(optionId);
    } else {
      newSelected.add(optionId);
    }
    setSelected(newSelected);
  };

  const addCustomItem = () => {
    if (customText.trim() && !customItems.includes(customText.trim())) {
      setCustomItems([...customItems, customText.trim()]);
      setCustomText('');
    }
  };

  const removeCustomItem = (item: string) => {
    setCustomItems(customItems.filter(i => i !== item));
  };

  const handleSubmit = () => {
    const selectedOptions = config.options?.filter(o => selected.has(o.id)) || [];
    const allSelected = [
      ...selectedOptions.map(o => ({ id: o.id, label: o.label })),
      ...customItems.map(item => ({ id: `custom-${item}`, label: item, isCustom: true })),
    ];
    onSubmit(allSelected);
  };

  const hasSelection = selected.size > 0 || customItems.length > 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {config.options?.map((option) => (
          <button
            key={option.id}
            onClick={() => toggleOption(option.id)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selected.has(option.id)
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selected.has(option.id) && <Check className="w-3 h-3 mr-1 inline" />}
            {option.icon && <span className="mr-2">{option.icon}</span>}
            {option.label}
          </button>
        ))}
      </div>

      {/* Custom items */}
      {customItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customItems.map((item) => (
            <span
              key={item}
              className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm flex items-center gap-1"
            >
              {item}
              <button onClick={() => removeCustomItem(item)} className="hover:text-orange-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Custom input */}
      {config.allowCustomText && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={config.customTextPlaceholder || 'Add your own...'}
            onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <button
            onClick={addCustomItem}
            disabled={!customText.trim()}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || !hasSelection}
        className="w-full py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Continue
        <ChevronRight className="w-4 h-4 inline ml-1" />
      </button>
    </div>
  );
}

// ============================================================================
// SLIDER CARD
// ============================================================================

function SliderCard({ config, onSubmit, disabled }: CardProps) {
  const min = config.min ?? 1;
  const max = config.max ?? 10;
  const step = config.step ?? 1;
  const [value, setValue] = useState(Math.floor((max - min) / 2) + min);

  // Detect if this is a budget/money slider (values > 25 with step >= 25)
  const isBudgetSlider = min >= 25 && step >= 25;

  const formatValue = (val: number) => {
    if (isBudgetSlider) {
      if (val >= 1000) {
        return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
      }
      return `$${val}`;
    }
    return `${val}`;
  };

  // Get the label closest to current value
  const getClosestLabel = () => {
    if (!config.labels) return null;
    const keys = Object.keys(config.labels).map(Number).sort((a, b) => a - b);
    let closest = keys[0];
    for (const key of keys) {
      if (key <= value) closest = key;
    }
    return config.labels[closest];
  };

  const handleSubmit = () => {
    const label = config.labels?.[value] || formatValue(value);
    onSubmit({ value, label });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      {/* Value display */}
      <div className="text-center">
        <span className="text-3xl font-bold text-orange-500">{formatValue(value)}</span>
        {isBudgetSlider && <span className="text-lg text-slate-500 dark:text-slate-400">/night</span>}
        {getClosestLabel() && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {getClosestLabel()}
          </p>
        )}
        {isBudgetSlider && value >= max && (
          <p className="text-xs text-orange-500 mt-1">
            No upper limit
          </p>
        )}
      </div>

      {/* Slider */}
      <div className="px-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-3 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
            [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
        />
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}{isBudgetSlider ? '+' : ''}</span>
        </div>
      </div>

      {/* Labels for key points */}
      {config.labels && (
        <div className="flex justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
          {Object.entries(config.labels)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([key, label]) => (
              <span key={key} className={Number(key) <= value ? 'text-orange-500 font-medium' : ''}>
                {label}
              </span>
            ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Continue
        <ChevronRight className="w-4 h-4 inline ml-1" />
      </button>
    </div>
  );
}

// ============================================================================
// DATE RANGE CARD
// ============================================================================

function DateRangeCard({ config, onSubmit, disabled }: CardProps) {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [flexibleDates, setFlexibleDates] = useState(false);

  const handleDateChange = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Parse YYYY-MM-DD without timezone conversion
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const calculateNights = () => {
    if (!startDate || !endDate) return 0;
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleSubmit = () => {
    if (!startDate || !endDate) return;
    onSubmit({
      startDate: parseLocalDate(startDate),
      endDate: parseLocalDate(endDate),
      nights: calculateNights(),
      isFlexible: flexibleDates,
    });
  };

  const nights = calculateNights();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      {/* Visual date range picker */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onChange={handleDateChange}
        minDate={new Date().toISOString().split('T')[0]}
      />

      {/* Flexible checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={flexibleDates}
          onChange={(e) => setFlexibleDates(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
        />
        <span className="text-sm text-slate-600 dark:text-slate-400">My dates are flexible (+/- a few days)</span>
      </label>

      <button
        onClick={handleSubmit}
        disabled={disabled || !startDate || !endDate || nights <= 0}
        className="w-full py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Continue
      </button>
    </div>
  );
}

// ============================================================================
// DESTINATION CARD (Reuses /api/destinations/search)
// ============================================================================

interface DestinationResult {
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  imageUrl: string;
  placeId: string;
  fullDescription: string;
}

function DestinationCard({ config, onSubmit, disabled }: CardProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DestinationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<DestinationResult | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Popular destinations for quick selection
  const popularDestinations = [
    'Dominican Republic',
    'Costa Rica',
    'Mexico',
    'Puerto Rico',
    'Jamaica',
  ];

  const searchDestinations = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/destinations/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.destinations || []);
    } catch (error) {
      console.error('Destination search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchDestinations(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchDestinations]);

  const handleSelect = (destination: DestinationResult) => {
    setSelected(destination);
    setQuery(destination.name);
    setResults([]);
    onSubmit({
      rawInput: destination.name,
      canonicalName: destination.name,
      type: 'country' as const,
      countryCode: destination.countryCode,
      countryName: destination.country,
      centerLat: destination.lat,
      centerLng: destination.lng,
      timezone: '',
      suggestedAreas: [],
      googlePlaceId: destination.placeId,
    });
  };

  const handleQuickPick = (name: string) => {
    setQuery(name);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a destination..."
          disabled={disabled}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
        )}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-600 rounded-xl divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden max-h-64 overflow-y-auto">
          {results.map((destination) => (
            <button
              key={destination.placeId}
              onClick={() => handleSelect(destination)}
              disabled={disabled}
              className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
            >
              {destination.imageUrl && (
                <img
                  src={destination.imageUrl}
                  alt={destination.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-white truncate">
                  {destination.name}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {destination.country}
                </div>
              </div>
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Popular destinations */}
      {results.length === 0 && query.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
            Popular destinations
          </p>
          <div className="flex flex-wrap gap-2">
            {popularDestinations.map((name) => (
              <button
                key={name}
                onClick={() => handleQuickPick(name)}
                disabled={disabled}
                className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected destination indicator */}
      {selected && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-700 dark:text-green-400 font-medium">{selected.name}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PARTY CARD (Adults & Children Counter)
// ============================================================================

function PartyCard({ config, onSubmit, disabled }: CardProps) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);

  const addChild = () => {
    if (children < 6) {
      setChildren(children + 1);
      setChildAges([...childAges, 5]); // Default age
    }
  };

  const removeChild = () => {
    if (children > 0) {
      setChildren(children - 1);
      setChildAges(childAges.slice(0, -1));
    }
  };

  const updateChildAge = (index: number, age: number) => {
    const newAges = [...childAges];
    newAges[index] = age;
    setChildAges(newAges);
  };

  const handleSubmit = () => {
    onSubmit({
      adults,
      children,
      childAges: children > 0 ? childAges : [],
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      {/* Adults */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-400" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Adults</p>
            <p className="text-xs text-slate-500">Age 18+</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => adults > 1 && setAdults(adults - 1)}
            disabled={disabled || adults <= 1}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-semibold text-slate-900 dark:text-white">{adults}</span>
          <button
            onClick={() => adults < 10 && setAdults(adults + 1)}
            disabled={disabled || adults >= 10}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Children */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-400" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Children</p>
            <p className="text-xs text-slate-500">Age 0-17</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={removeChild}
            disabled={disabled || children <= 0}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-semibold text-slate-900 dark:text-white">{children}</span>
          <button
            onClick={addChild}
            disabled={disabled || children >= 6}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Child ages */}
      {children > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Children&apos;s ages
          </p>
          <div className="flex flex-wrap gap-2">
            {childAges.map((age, index) => (
              <select
                key={index}
                value={age}
                onChange={(e) => updateChildAge(index, Number(e.target.value))}
                disabled={disabled}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              >
                {Array.from({ length: 18 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? 'Under 1' : `${i} years`}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Continue
        <ChevronRight className="w-4 h-4 inline ml-1" />
      </button>
    </div>
  );
}

// ============================================================================
// HOTELS CARD
// ============================================================================

function HotelsCard({ config, onSubmit, disabled }: CardProps) {
  const hotels = (config.candidates || []) as HotelCandidate[];
  const [selected, setSelected] = useState<string | null>(null);
  const [detailHotel, setDetailHotel] = useState<HotelCandidate | null>(null);

  const handleSelect = (hotelId: string) => {
    if (disabled) return;
    setSelected(hotelId);
    const hotel = hotels.find(h => h.id === hotelId);
    onSubmit(hotel);
  };

  const openDetail = (hotel: HotelCandidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailHotel(hotel);
  };

  if (hotels.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500 dark:text-slate-400">No hotels available</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Select a hotel
          </p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
          {hotels.slice(0, 5).map((hotel) => (
            <div
              key={hotel.id}
              className={`w-full p-4 flex items-start gap-3 text-left transition-colors ${
                selected === hotel.id
                  ? 'bg-orange-50 dark:bg-orange-900/20'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="w-20 h-16 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-700" onClick={(e) => openDetail(hotel, e)}>
                {hotel.imageUrl ? (
                  <img
                    src={hotel.imageUrl}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-2xl">🏨</div>';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🏨</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className="font-medium text-slate-900 dark:text-white truncate cursor-pointer hover:text-orange-600"
                    onClick={(e) => openDetail(hotel, e)}
                  >
                    {hotel.name}
                  </h4>
                  <button
                    onClick={(e) => openDetail(hotel, e)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors flex-shrink-0"
                    title="View details"
                  >
                    <Info className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {hotel.googleRating}
                    </span>
                  </span>
                  {hotel.redditScore && hotel.redditScore > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded">
                      🔥 {hotel.redditScore}x Reddit
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">{hotel.city}</span>
                  {hotel.pricePerNight && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                        ${hotel.pricePerNight}/night
                      </span>
                      {hotel.priceConfidence === 'real' ? (
                        <span className="text-xs px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded" title="Real price from booking sites">
                          ✓
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400" title="Estimated price">
                          ~
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleSelect(hotel.id)}
                  disabled={disabled}
                  className={`mt-2 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    selected === hotel.id
                      ? 'bg-green-500 text-white'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                  }`}
                >
                  {selected === hotel.id ? '✓ Selected' : 'Select this hotel'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={!!detailHotel}
        onClose={() => setDetailHotel(null)}
        onSelect={() => detailHotel && handleSelect(detailHotel.id)}
        isSelected={detailHotel?.id === selected}
        type="hotel"
        item={detailHotel}
      />
    </>
  );
}

// ============================================================================
// RESTAURANTS CARD (Grouped by Cuisine with Area/Distance Info)
// ============================================================================

function RestaurantsCard({ config, onSubmit, disabled }: CardProps) {
  const restaurants = (config.candidates || []) as (RestaurantCandidate & { nearArea?: string; distanceFromHotel?: number })[];
  const cuisineLabel = (config as any).cuisineLabel || 'your cuisine';
  const cuisineType = (config as any).cuisineType || '';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailRestaurant, setDetailRestaurant] = useState<RestaurantCandidate | null>(null);

  // Cuisine emojis
  const cuisineEmojis: Record<string, string> = {
    italian: '🍝',
    steakhouse: '🥩',
    sushi: '🍣',
    fine_dining: '🍽️',
    seafood: '🦞',
    local: '🍲',
    mexican: '🌮',
    asian: '🥢',
    mediterranean: '🫒',
    casual: '🍔',
  };
  const emoji = cuisineEmojis[cuisineType] || '🍴';

  const toggleSelect = (restaurantId: string) => {
    if (disabled) return;
    const newSelected = new Set(selected);
    if (newSelected.has(restaurantId)) {
      newSelected.delete(restaurantId);
    } else {
      newSelected.add(restaurantId);
    }
    setSelected(newSelected);
  };

  const handleSubmit = () => {
    const selectedRestaurants = restaurants.filter(r => selected.has(r.id));
    onSubmit(selectedRestaurants);
  };

  const openDetail = (restaurant: RestaurantCandidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailRestaurant(restaurant);
  };

  // Group restaurants by area for better display
  const restaurantsByArea = restaurants.reduce((acc, r) => {
    const area = r.nearArea || 'Other';
    if (!acc[area]) acc[area] = [];
    acc[area].push(r);
    return acc;
  }, {} as Record<string, typeof restaurants>);

  // BUG #8 FIX: Format distance with context (from hotel)
  const formatDistance = (km?: number, areaName?: string) => {
    if (!km) return '';
    const hotelRef = areaName ? `${areaName} hotel` : 'your hotel';
    if (km < 0.5) return `${Math.round(km * 1000)}m from ${hotelRef}`;
    if (km < 2) return `${km.toFixed(1)}km from ${hotelRef}`;
    return `${Math.round(km)}km from ${hotelRef}`;
  };

  if (restaurants.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500 dark:text-slate-400">No {cuisineLabel.toLowerCase()} restaurants found near your hotels</p>
        <button
          onClick={() => onSubmit([])}
          className="mt-3 px-4 py-2 text-sm text-orange-500 hover:text-orange-600"
        >
          Skip this cuisine
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-slate-200 dark:border-slate-600">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {emoji} {cuisineLabel} restaurants near your hotels
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {restaurants.length} options found · Tap name for details, checkbox to select
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {Object.entries(restaurantsByArea).map(([area, areaRestaurants]) => (
            <div key={area}>
              {/* Area header */}
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Near {area}
                </p>
              </div>
              {/* Restaurants in this area */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {areaRestaurants.slice(0, 4).map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className={`w-full p-3 flex items-start gap-3 text-left transition-colors ${
                      selected.has(restaurant.id)
                        ? 'bg-orange-50 dark:bg-orange-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <button
                      onClick={() => toggleSelect(restaurant.id)}
                      disabled={disabled}
                      className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                        selected.has(restaurant.id)
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selected.has(restaurant.id) && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className="font-medium text-slate-900 dark:text-white text-sm cursor-pointer hover:text-orange-600"
                          onClick={(e) => openDetail(restaurant, e)}
                        >
                          {restaurant.name}
                        </h4>
                        <button
                          onClick={(e) => openDetail(restaurant, e)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors flex-shrink-0"
                          title="View details"
                        >
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {restaurant.googleRating}
                        </span>
                        <span>·</span>
                        <span>{'$'.repeat(restaurant.priceLevel || 2)}</span>
                        {restaurant.distanceFromHotel !== undefined && restaurant.distanceFromHotel > 0 && (
                          <>
                            <span>·</span>
                            <span>{formatDistance(restaurant.distanceFromHotel, restaurant.nearArea)}</span>
                          </>
                        )}
                        {restaurant.redditScore && restaurant.redditScore > 0 && (
                          <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded">
                            🔥 {restaurant.redditScore}x Reddit
                          </span>
                        )}
                      </div>
                      {/* Reasons/highlights */}
                      {restaurant.reasons && restaurant.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {restaurant.reasons.slice(0, 2).map((reason, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {selected.size > 0 ? `Add ${selected.size} restaurant${selected.size > 1 ? 's' : ''}` : 'Skip this cuisine'}
          </button>
        </div>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={!!detailRestaurant}
        onClose={() => setDetailRestaurant(null)}
        onSelect={detailRestaurant ? () => toggleSelect(detailRestaurant.id) : undefined}
        isSelected={detailRestaurant ? selected.has(detailRestaurant.id) : false}
        type="restaurant"
        item={detailRestaurant}
      />
    </>
  );
}

// ============================================================================
// ACTIVITIES CARD (Enhanced - matches ExperiencesCard structure)
// ============================================================================

function ActivitiesCard({ config, onSubmit, disabled }: CardProps) {
  const activities = (config.candidates || []) as (VerifiedActivity & { nearArea?: string; distanceFromHotel?: number; googleRating?: number; reviewCount?: number; reasons?: string[] })[];
  const activityLabel = (config as any).activityLabel || 'activities';
  const activityType = (config as any).activityType || '';
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (activityId: string) => {
    if (disabled) return;
    const newSelected = new Set(selected);
    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
    } else {
      newSelected.add(activityId);
    }
    setSelected(newSelected);
  };

  const handleSubmit = () => {
    const selectedActivities = activities.filter(a => selected.has(a.id));
    onSubmit(selectedActivities);
  };

  // Group activities by area
  const activitiesByArea = activities.reduce((acc, a) => {
    const area = a.nearArea || a.location || 'Other';
    if (!acc[area]) acc[area] = [];
    acc[area].push(a);
    return acc;
  }, {} as Record<string, typeof activities>);

  // BUG #8 FIX: Format distance with context (from hotel)
  const formatDistance = (km?: number, areaName?: string) => {
    if (!km) return '';
    const hotelRef = areaName ? `${areaName} hotel` : 'your hotel';
    if (km < 0.5) return `${Math.round(km * 1000)}m from ${hotelRef}`;
    if (km < 2) return `${km.toFixed(1)}km from ${hotelRef}`;
    return `${Math.round(km)}km from ${hotelRef}`;
  };

  // Activity type emojis
  const activityEmojis: Record<string, string> = {
    surf: '🏄',
    snorkel: '🤿',
    dive: '🐠',
    swimming: '🏊',
    wildlife: '🐋',
    hiking: '🥾',
    adventure: '🧗',
    cultural: '🏛️',
    food_tour: '🍽️',
    nightlife: '🎉',
    beach: '🏖️',
    spa_wellness: '💆',
    golf: '⛳',
    photography: '📸',
    horseback: '🐎',
    boat: '⛵',
    fishing: '🎣',
  };

  const emoji = activityEmojis[activityType] || '🎯';

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500 dark:text-slate-400">No {activityLabel.toLowerCase()} found near your hotels</p>
        <button
          onClick={() => onSubmit([])}
          className="mt-3 px-4 py-2 text-sm text-orange-500 hover:text-orange-600"
        >
          Skip this activity
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-slate-200 dark:border-slate-600">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {emoji} {activityLabel} near your hotels
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {activities.length} options found · Pick your favorites
        </p>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {(Object.entries(activitiesByArea) as [string, typeof activities][]).map(([area, areaActivities]) => (
          <div key={area}>
            {/* Area header */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Near {area}
              </p>
            </div>
            {/* Activities in this area */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {areaActivities.slice(0, 5).map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => toggleSelect(activity.id)}
                  disabled={disabled}
                  className={`w-full p-3 flex items-start gap-3 text-left transition-colors ${
                    selected.has(activity.id)
                      ? 'bg-orange-50 dark:bg-orange-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                    selected.has(activity.id)
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {selected.has(activity.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                        {activity.name}
                      </h4>
                      {activity.distanceFromHotel !== undefined && activity.distanceFromHotel > 0 && (
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {formatDistance(activity.distanceFromHotel, activity.nearArea)}
                        </span>
                      )}
                    </div>
                    {activity.operator && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        by {activity.operator}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      {activity.googleRating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {activity.googleRating}
                          {activity.reviewCount && (
                            <span className="text-slate-400">({activity.reviewCount})</span>
                          )}
                        </span>
                      )}
                      {activity.duration && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                          {activity.duration}
                        </span>
                      )}
                      {activity.priceEstimate && (
                        <span>~${activity.priceEstimate}</span>
                      )}
                      {activity.redditMentions && activity.redditMentions > 0 && (
                        <span className="text-orange-500">
                          {activity.redditMentions} mentions
                        </span>
                      )}
                    </div>
                    {/* Reasons/highlights */}
                    {activity.reasons && activity.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {activity.reasons.slice(0, 2).map((reason: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Verification badge */}
                    {activity.verification && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-green-600 dark:text-green-400">
                        <Check className="w-3 h-3" />
                        Verified
                        {activity.verification.placeId && ' via Google'}
                        {activity.verification.operatorUrl && ' operator'}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-200 dark:border-slate-600">
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {selected.size > 0 ? `Add ${selected.size} ${activityLabel}` : `Skip ${activityLabel}`}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// EXPERIENCES CARD (Tours/Activities near hotels by type)
// ============================================================================

function ExperiencesCard({ config, onSubmit, disabled }: CardProps) {
  const experiences = (config.candidates || []) as (any & { nearArea?: string; distanceFromHotel?: number })[];
  const activityLabel = (config as any).activityLabel || 'experiences';
  const activityType = (config as any).activityType || '';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailExperience, setDetailExperience] = useState<ExperienceItem | null>(null);

  const toggleSelect = (experienceId: string) => {
    if (disabled) return;
    const newSelected = new Set(selected);
    if (newSelected.has(experienceId)) {
      newSelected.delete(experienceId);
    } else {
      newSelected.add(experienceId);
    }
    setSelected(newSelected);
  };

  const handleSubmit = () => {
    const selectedExperiences = experiences.filter(e => selected.has(e.id));
    onSubmit(selectedExperiences);
  };

  const openDetail = (experience: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailExperience({
      ...experience,
      activityType: experience.activityType || activityLabel,
    } as ExperienceItem);
  };

  // Group experiences by area
  const experiencesByArea = experiences.reduce((acc, e) => {
    const area = e.nearArea || 'Other';
    if (!acc[area]) acc[area] = [];
    acc[area].push(e);
    return acc;
  }, {} as Record<string, typeof experiences>);

  // BUG #8 FIX: Format distance with context (from hotel)
  const formatDistance = (km?: number, areaName?: string) => {
    if (!km) return '';
    const hotelRef = areaName ? `${areaName} hotel` : 'your hotel';
    if (km < 0.5) return `${Math.round(km * 1000)}m from ${hotelRef}`;
    if (km < 2) return `${km.toFixed(1)}km from ${hotelRef}`;
    return `${Math.round(km)}km from ${hotelRef}`;
  };

  // Activity type emojis
  const activityEmojis: Record<string, string> = {
    surf: '🏄',
    snorkel: '🤿',
    dive: '🐠',
    swimming: '🏊',
    wildlife: '🐋',
    hiking: '🥾',
    adventure: '🧗',
    cultural: '🏛️',
    food_tour: '🍽️',
    nightlife: '🎉',
    beach: '🏖️',
    spa_wellness: '💆',
    golf: '⛳',
    photography: '📸',
    horseback: '🐎',
    boat: '⛵',
    fishing: '🎣',
    kids_activities: '🎠',
    water_park: '🎢',
  };

  const emoji = activityEmojis[activityType] || '🎯';

  if (experiences.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500 dark:text-slate-400">No {activityLabel.toLowerCase()} experiences found near your hotels</p>
        <button
          onClick={() => onSubmit([])}
          className="mt-3 px-4 py-2 text-sm text-orange-500 hover:text-orange-600"
        >
          Skip this activity
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-b border-slate-200 dark:border-slate-600">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {emoji} {activityLabel} experiences near your hotels
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {experiences.length} options found · Tap name for details, checkbox to select
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {(Object.entries(experiencesByArea) as [string, typeof experiences][]).map(([area, areaExperiences]) => (
            <div key={area}>
              {/* Area header */}
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Near {area}
                </p>
              </div>
              {/* Experiences in this area */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {areaExperiences.slice(0, 4).map((experience) => (
                  <div
                    key={experience.id}
                    className={`w-full p-3 flex items-start gap-3 text-left transition-colors ${
                      selected.has(experience.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <button
                      onClick={() => toggleSelect(experience.id)}
                      disabled={disabled}
                      className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                        selected.has(experience.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selected.has(experience.id) && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className="font-medium text-slate-900 dark:text-white text-sm cursor-pointer hover:text-blue-600"
                          onClick={(e) => openDetail(experience, e)}
                        >
                          {experience.name}
                        </h4>
                        <button
                          onClick={(e) => openDetail(experience, e)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors flex-shrink-0"
                          title="View details"
                        >
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {experience.googleRating}
                          {experience.reviewCount && (
                            <span className="text-slate-400">({experience.reviewCount})</span>
                          )}
                        </span>
                        {experience.distanceFromHotel !== undefined && experience.distanceFromHotel > 0 && (
                          <>
                            <span>·</span>
                            <span>{formatDistance(experience.distanceFromHotel, experience.nearArea)}</span>
                          </>
                        )}
                      </div>
                      {/* Reasons/highlights */}
                      {experience.reasons && experience.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {experience.reasons.slice(0, 2).map((reason: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="w-full py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {selected.size > 0 ? `Add ${selected.size} experience${selected.size > 1 ? 's' : ''}` : 'Skip this activity'}
          </button>
        </div>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={!!detailExperience}
        onClose={() => setDetailExperience(null)}
        onSelect={detailExperience ? () => toggleSelect(detailExperience.id) : undefined}
        isSelected={detailExperience ? selected.has(detailExperience.id) : false}
        type="experience"
        item={detailExperience}
      />
    </>
  );
}

// ============================================================================
// TRADEOFF CARD
// ============================================================================

function TradeoffCard({ config, onSubmit, disabled }: CardProps) {
  const tradeoff = config.tradeoff;
  const [selected, setSelected] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  if (!tradeoff) {
    return null;
  }

  const handleSelect = (optionId: string) => {
    if (disabled) return;
    setSelected(optionId);
  };

  const handleSubmit = () => {
    if (!selected) return;
    const selectedOption = tradeoff.resolutionOptions.find(o => o.id === selected);
    onSubmit({
      tradeoffId: tradeoff.id,
      selectedOptionId: selected,
      selectedLabel: selectedOption?.label,
      customInput: selected === 'custom' ? customInput : undefined,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-orange-200 dark:border-orange-800 overflow-hidden">
      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <h4 className="font-medium text-orange-800 dark:text-orange-300">
            {tradeoff.title}
          </h4>
        </div>
        <p className="mt-1 text-sm text-orange-700 dark:text-orange-400">
          {tradeoff.description}
        </p>
      </div>
      <div className="p-4 space-y-3">
        {tradeoff.resolutionOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={disabled}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              selected === option.id
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                selected === option.id
                  ? 'border-orange-500 bg-orange-500'
                  : 'border-slate-300 dark:border-slate-600'
              }`}>
                {selected === option.id && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {option.label}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {option.description}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Impact: {option.impact}
                </p>
              </div>
            </div>
          </button>
        ))}

        {/* Custom option */}
        {config.allowCustomText && (
          <div>
            <button
              onClick={() => handleSelect('custom')}
              disabled={disabled}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selected === 'custom'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
            >
              <p className="font-medium text-slate-900 dark:text-white">Other</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tell us what you prefer
              </p>
            </button>
            {selected === 'custom' && (
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Describe your preference..."
                className="mt-2 w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
              />
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={disabled || !selected || (selected === 'custom' && !customInput.trim())}
          className="w-full py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Resolve tradeoff
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// AREAS CARD
// ============================================================================

function AreasCard({ config, onSubmit, disabled }: CardProps) {
  const areas = config.areaCandidates || [];
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (areaId: string) => {
    if (disabled) return;
    const newSelected = new Set(selected);
    if (newSelected.has(areaId)) {
      newSelected.delete(areaId);
    } else if (newSelected.size < 3) { // Max 3 areas
      newSelected.add(areaId);
    }
    setSelected(newSelected);
  };

  const handleSubmit = () => {
    const selectedAreas = areas.filter(a => selected.has(a.id));
    onSubmit(selectedAreas);
  };

  if (areas.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500 dark:text-slate-400">No areas discovered</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Select up to 3 areas to visit
        </p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
        {areas.map((area) => (
          <button
            key={area.id}
            onClick={() => toggleSelect(area.id)}
            disabled={disabled || (selected.size >= 3 && !selected.has(area.id))}
            className={`w-full p-4 text-left transition-colors ${
              selected.has(area.id)
                ? 'bg-orange-50 dark:bg-orange-900/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
            } ${selected.size >= 3 && !selected.has(area.id) ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                selected.has(area.id)
                  ? 'border-orange-500 bg-orange-500'
                  : 'border-slate-300 dark:border-slate-600'
              }`}>
                {selected.has(area.id) && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    {area.name}
                  </h4>
                  <span className="text-xs text-orange-500 font-medium">
                    {Math.round(area.overallScore * 100)}% match
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {area.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {area.bestFor.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {area.suggestedNights > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    Suggested: {area.suggestedNights} nights
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-slate-200 dark:border-slate-600">
        <button
          onClick={handleSubmit}
          disabled={disabled || selected.size === 0}
          className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {selected.size > 0 ? `Continue with ${selected.size} area${selected.size > 1 ? 's' : ''}` : 'Select at least 1 area'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SPLIT CARD (Itinerary Split Selection)
// ============================================================================

function SplitCard({ config, onSubmit, disabled }: CardProps) {
  const splits = config.splitOptions || [];
  const areas = config.areas || [];
  const tripLength = config.tripLength || 7;

  const [selected, setSelected] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customNights, setCustomNights] = useState<Record<string, number>>({});
  const [customConfirmed, setCustomConfirmed] = useState(false);

  // Initialize customNights when areas or tripLength changes
  useEffect(() => {
    if (areas.length > 0) {
      const perArea = Math.floor(tripLength / areas.length);
      const remainder = tripLength % areas.length;
      const initial: Record<string, number> = {};
      areas.forEach((area: any, idx: number) => {
        initial[area.id] = perArea + (idx === areas.length - 1 ? remainder : 0);
      });
      setCustomNights(initial);
      console.log('[SplitCard] Initialized customNights:', initial, 'areas:', areas.map((a: any) => a.name), 'tripLength:', tripLength);
    }
  }, [areas, tripLength]);

  const handleSelect = (splitId: string) => {
    if (disabled) return;
    setSelected(splitId);
    setShowCustom(false);
    setCustomConfirmed(false);
  };

  const handleCustomClick = () => {
    setSelected('custom');
    setShowCustom(true);
    setCustomConfirmed(false);
  };

  const adjustNights = (areaId: string, delta: number) => {
    const defaultNightsPerArea = Math.floor(tripLength / Math.max(areas.length, 1));
    const current = customNights[areaId] ?? defaultNightsPerArea;
    const newValue = current + delta;

    // Calculate current total
    let currentTotal = 0;
    for (const area of areas) {
      currentTotal += customNights[area.id] ?? defaultNightsPerArea;
    }

    // Validation
    if (newValue < 1) return;
    if (currentTotal + delta > tripLength && delta > 0) return;
    if (currentTotal + delta < areas.length && delta < 0) return;

    setCustomNights({ ...customNights, [areaId]: newValue });
  };

  // Calculate totals
  const defaultNightsPerArea = Math.floor(tripLength / Math.max(areas.length, 1));
  const totalCustomNights = areas.reduce((sum, area: any) => {
    return sum + (customNights[area.id] ?? defaultNightsPerArea);
  }, 0);
  const nightsRemaining = tripLength - totalCustomNights;
  const isCustomValid = totalCustomNights === tripLength;

  const handleConfirmCustom = () => {
    setCustomConfirmed(true);
  };

  const handleSubmit = () => {
    if (selected === 'custom') {
      const customSplit = {
        id: 'user-custom',
        name: areas.map((a: any) => `${customNights[a.id] ?? defaultNightsPerArea}n ${a.name}`).join(' → '),
        stops: areas.map((area: any) => ({
          areaId: area.id,
          areaName: area.name,
          nights: customNights[area.id] ?? defaultNightsPerArea,
        })),
        fitScore: 1.0,
      };
      console.log('[SplitCard] Submitting custom split:', customSplit);
      onSubmit(customSplit);
    } else if (selected) {
      const selectedSplit = splits.find(s => s.id === selected);
      console.log('[SplitCard] Submitting preset split:', selectedSplit);
      onSubmit(selectedSplit);
    }
  };

  // Debug
  console.log('[SplitCard] Rendering:', {
    splitsCount: splits.length,
    areasCount: areas.length,
    areaNames: areas.map((a: any) => a.name),
    tripLength,
    showCustom,
    selected,
    customConfirmed,
    customNights,
    totalCustomNights,
  });

  if (splits.length === 0 && areas.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-500 dark:text-slate-400">No itinerary options available</p>
      </div>
    );
  }

  // Determine if submit should be enabled
  const canSubmit = selected && (selected !== 'custom' || (isCustomValid && customConfirmed));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-slate-200 dark:border-slate-600">
        <p className="font-medium text-slate-900 dark:text-white">
          How do you want to split your {tripLength} nights?
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          You've selected {areas.length} area{areas.length > 1 ? 's' : ''} to visit.
          {areas.length > 1
            ? " Choose how to divide your time between them."
            : " All nights will be in this area."}
        </p>

        {/* Visual explanation */}
        <div className="mt-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">Day 1</span>
            <span>→</span>
            <span className="flex-1 text-center">Your {tripLength} nights</span>
            <span>→</span>
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">Day {tripLength + 1}</span>
          </div>
          <div className="flex gap-1 mt-2">
            {areas.map((area: any, idx: number) => {
              const nights = customNights[area.id] ?? Math.floor(tripLength / areas.length);
              const width = `${(nights / tripLength) * 100}%`;
              const colors = ['bg-orange-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400'];
              return (
                <div
                  key={area.id}
                  className={`${colors[idx % colors.length]} rounded h-2`}
                  style={{ width }}
                  title={`${area.name}: ${nights} nights`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            {areas.map((area: any, idx: number) => {
              const nights = customNights[area.id] ?? Math.floor(tripLength / areas.length);
              const colors = ['text-orange-600', 'text-blue-600', 'text-green-600', 'text-purple-600'];
              return (
                <span key={area.id} className={`text-xs ${colors[idx % colors.length]} dark:opacity-80`}>
                  {area.name} ({nights}n)
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {/* Preset options */}
        {splits.map((split) => {
          // Generate reasoning based on split characteristics
          const getReasoningText = () => {
            if (split.whyThisWorks) return split.whyThisWorks;
            const stops = split.stops || [];
            if (stops.length === 1) {
              return `Focus all your time in one area - no travel days needed!`;
            }
            const nightsDistribution = stops.map((s: any) => s.nights);
            const maxNights = Math.max(...nightsDistribution);
            const minNights = Math.min(...nightsDistribution);
            if (maxNights === minNights) {
              return `Equal time in each area for a balanced experience`;
            }
            const longestStop = stops.find((s: any) => s.nights === maxNights) as any;
            if (longestStop) {
              return `More time in ${longestStop.areaName || longestStop.area?.name || 'the main area'} to fully explore`;
            }
            return `Balanced time across ${stops.length} areas`;
          };

          return (
            <button
              key={split.id}
              onClick={() => handleSelect(split.id)}
              disabled={disabled}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selected === split.id
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-slate-900 dark:text-white">
                  {split.name}
                </h4>
                <span className="text-xs text-orange-500 font-medium">
                  {Math.round(split.fitScore * 100)}% fit
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(split.stops || []).map((stop: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300"
                  >
                    {stop.areaName || stop.area?.name || 'Area'} ({stop.nights}n)
                  </span>
                ))}
              </div>
              {/* Reasoning explanation */}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                💡 {getReasoningText()}
              </p>
              {/* Tradeoffs if any */}
              {split.tradeoffs && split.tradeoffs.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ {split.tradeoffs[0]}
                </p>
              )}
            </button>
          );
        })}

        {/* Custom option button */}
        {areas.length > 0 && (
          <button
            onClick={handleCustomClick}
            disabled={disabled}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              selected === 'custom'
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                : 'border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
            }`}
          >
            <h4 className="font-medium text-slate-900 dark:text-white">
              Custom split
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Choose exactly how many nights in each area
            </p>
          </button>
        )}

        {/* Custom split editor - appears when custom is selected */}
        {showCustom && areas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl space-y-4 border-2 border-orange-200 dark:border-orange-800"
          >
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              Adjust nights for each area:
            </p>
            {areas.map((area: any) => {
              const nightsForArea = customNights[area.id] ?? defaultNightsPerArea;
              return (
                <div key={area.id} className="flex items-center justify-between">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {area.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjustNights(area.id, -1)}
                      disabled={disabled || nightsForArea <= 1}
                      className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="w-20 text-center font-bold text-lg text-slate-900 dark:text-white">
                      {nightsForArea} nights
                    </span>
                    <button
                      onClick={() => adjustNights(area.id, 1)}
                      disabled={disabled || nightsRemaining <= 0}
                      className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Total and confirm */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-600 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total:</span>
                <span className={`font-bold ${isCustomValid ? 'text-green-600' : 'text-orange-500'}`}>
                  {totalCustomNights} / {tripLength} nights
                  {!isCustomValid && ` (${nightsRemaining > 0 ? `${nightsRemaining} remaining` : 'too many!'})`}
                </span>
              </div>

              {/* Confirm button inside the editor */}
              {isCustomValid && !customConfirmed && (
                <button
                  onClick={handleConfirmCustom}
                  className="w-full py-2.5 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Confirm this split
                </button>
              )}

              {customConfirmed && (
                <div className="flex items-center justify-center gap-2 py-2 text-green-600 dark:text-green-400">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Split confirmed!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Main submit button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-600">
        <button
          onClick={handleSubmit}
          disabled={disabled || !canSubmit}
          className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {!selected
            ? 'Select a split option'
            : selected === 'custom' && !customConfirmed
            ? 'Confirm your custom split above'
            : 'Continue with this plan'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SATISFACTION CARD
// ============================================================================

const DISSATISFACTION_OPTIONS: { id: DissatisfactionReason; label: string; description: string }[] = [
  { id: 'wrong_areas', label: 'Wrong areas', description: 'The locations don\'t match what I wanted' },
  { id: 'wrong_vibe', label: 'Wrong vibe', description: 'The overall feel isn\'t right' },
  { id: 'too_packed', label: 'Too packed', description: 'Too many activities, I need more downtime' },
  { id: 'too_chill', label: 'Too chill', description: 'Not enough activities, I want more to do' },
  { id: 'surf_days_wrong', label: 'Surf schedule wrong', description: 'Adjust the surfing days' },
  { id: 'dining_wrong', label: 'Dining issues', description: 'Restaurant choices need work' },
  { id: 'too_touristy', label: 'Too touristy', description: 'I want more local/authentic spots' },
  { id: 'missing_activity', label: 'Missing activity', description: 'There\'s something I really wanted to do' },
  { id: 'hotel_wrong', label: 'Hotel issues', description: 'The hotel choices don\'t fit' },
  { id: 'budget_exceeded', label: 'Over budget', description: 'It\'s more expensive than I planned' },
];

function SatisfactionCard({ config, onSubmit, disabled }: CardProps) {
  const [satisfied, setSatisfied] = useState<boolean | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<Set<DissatisfactionReason>>(new Set());
  const [customFeedback, setCustomFeedback] = useState('');

  const toggleReason = (reason: DissatisfactionReason) => {
    const newReasons = new Set(selectedReasons);
    if (newReasons.has(reason)) {
      newReasons.delete(reason);
    } else {
      newReasons.add(reason);
    }
    setSelectedReasons(newReasons);
  };

  const handleYes = () => {
    onSubmit({ satisfied: true });
  };

  const handleSubmitFeedback = () => {
    onSubmit({
      satisfied: false,
      reasons: Array.from(selectedReasons),
      customFeedback: customFeedback.trim() || undefined,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-slate-200 dark:border-slate-700">
        <h4 className="font-medium text-slate-900 dark:text-white">
          Does this itinerary look good?
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Let me know if you&apos;re happy or if anything needs to change.
        </p>
      </div>

      <div className="p-4">
        {satisfied === null && (
          <div className="flex gap-3">
            <button
              onClick={handleYes}
              disabled={disabled}
              className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              <Check className="w-5 h-5 inline mr-2" />
              Yes, looks great!
            </button>
            <button
              onClick={() => setSatisfied(false)}
              disabled={disabled}
              className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              <AlertCircle className="w-5 h-5 inline mr-2" />
              Something&apos;s off
            </button>
          </div>
        )}

        {satisfied === false && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <p className="text-sm text-slate-600 dark:text-slate-400">
              What would you like to change? (select all that apply)
            </p>

            <div className="grid grid-cols-2 gap-2">
              {DISSATISFACTION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => toggleReason(option.id)}
                  disabled={disabled}
                  className={`p-3 rounded-lg border text-left transition-all text-sm ${
                    selectedReasons.has(option.id)
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <p className="font-medium text-slate-900 dark:text-white">
                    {option.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>

            <div>
              <textarea
                value={customFeedback}
                onChange={(e) => setCustomFeedback(e.target.value)}
                placeholder="Any other details? (optional)"
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSatisfied(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={disabled || selectedReasons.size === 0}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Fix these issues
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TEXT CARD (Free Text Input)
// ============================================================================

function TextCard({ config, onSubmit, disabled }: CardProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={config.customTextPlaceholder || 'Type your answer...'}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        rows={3}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="w-full py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Continue
        <ChevronRight className="w-4 h-4 inline ml-1" />
      </button>
    </div>
  );
}
