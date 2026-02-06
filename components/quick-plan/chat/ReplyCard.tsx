'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Loader2 as LoaderIcon } from 'lucide-react';
import type { ExperienceItem } from '@/components/quick-plan/DetailDrawer';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MessageCircle,
} from 'lucide-react';
import type {
  ReplyCardType,
  ReplyCardConfig,
  HotelCandidate,
  RestaurantCandidate,
  VerifiedActivity,
  DissatisfactionReason,
} from '@/types/quick-plan';
import { estimateInterAreaTransit, getInterAreaTransportIcon } from '@/lib/utils/travelTime';
// getPlaceholderImage available but FallbackImage handles placeholders internally
import FallbackImage from '@/components/ui/FallbackImage';
import AreasMapPreview from '@/components/quick-plan/AreasMapPreview';
import GooglePlacesAutocomplete from '@/components/quick-plan/GooglePlacesAutocomplete';
import {
  SkeletonHotelCard,
  SkeletonRestaurantCard,
  SkeletonExperienceCard,
  SkeletonAreaCard,
} from '@/components/ui/Skeleton';
import { parseAPIErrorResponse, getUserFriendlyMessage } from '@/lib/errors';
import { dedupedFetch } from '@/lib/request-dedup';

// ============================================================================
// DYNAMIC IMPORTS FOR CODE SPLITTING
// Heavy components loaded only when needed to reduce initial bundle size
// ============================================================================

// Loading spinner component for dynamic imports
const DynamicLoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <LoaderIcon className="w-6 h-6 animate-spin text-orange-500" />
  </div>
);

// DateRangePicker - loaded when date selection is needed
const DateRangePicker = dynamic(
  () => import('@/components/ui/DateRangePicker'),
  { ssr: false, loading: DynamicLoadingSpinner }
);

// DetailDrawer - heavy modal for viewing item details
const DetailDrawer = dynamic(
  () => import('@/components/quick-plan/DetailDrawer'),
  { ssr: false, loading: DynamicLoadingSpinner }
);

// HotelBrowserModal - large modal with filtering, sorting, and hotel display
const HotelBrowserModal = dynamic(
  () => import('@/components/quick-plan/HotelBrowserModal'),
  { ssr: false, loading: DynamicLoadingSpinner }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format activity/tag strings for display
 * Converts snake_case to Title Case (e.g., "maldivian_cuisine" -> "Maldivian Cuisine")
 */
function formatTag(tag: string): string {
  return tag
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ============================================================================
// MAIN REPLY CARD COMPONENT
// ============================================================================

interface ReplyCardProps {
  type: ReplyCardType;
  config: ReplyCardConfig;
  onSubmit: (value: unknown) => void;
  onAddNote?: (field: string, note: string) => void;
  disabled?: boolean;
}

export default function ReplyCard({ type, config, onSubmit, onAddNote, disabled = false }: ReplyCardProps) {
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
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full"
    >
      <CardComponent config={config} onSubmit={onSubmit} onAddNote={onAddNote} disabled={disabled} />
    </motion.div>
  );
}

// ============================================================================
// CHIPS CARD (Single Select)
// ============================================================================

interface CardProps {
  config: ReplyCardConfig;
  onSubmit: (value: unknown) => void;
  onAddNote?: (field: string, note: string) => void;
  disabled?: boolean;
}

// ============================================================================
// OPTIONAL NOTES INPUT (Free-text input for nuanced preferences)
// ============================================================================

interface OptionalNotesInputProps {
  field: string;
  placeholder: string;
  onSubmit: (note: string) => void;
  disabled?: boolean;
}

function OptionalNotesInput({ field, placeholder, onSubmit, disabled }: OptionalNotesInputProps) {
  const [note, setNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 mt-3 flex items-center gap-1.5 transition-colors disabled:opacity-50"
      >
        <MessageCircle className="w-4 h-4" />
        Anything specific Snoo should know?
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-3 space-y-2"
    >
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (note.trim()) {
              onSubmit(note.trim());
            }
            setIsExpanded(false);
            setNote('');
          }}
          disabled={disabled}
          className="text-sm px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {note.trim() ? 'Add note' : 'Skip'}
        </button>
        <button
          onClick={() => {
            setIsExpanded(false);
            setNote('');
          }}
          disabled={disabled}
          className="text-sm px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// Field-specific placeholder text for notes
const NOTE_PLACEHOLDERS: Record<string, string> = {
  activities: "Any specific requirements? (e.g., 'surf lessons not rentals', 'kid-friendly only', 'want to pet animals')",
  hotels: "Any must-haves? (e.g., 'needs a pool', 'ocean view', 'quiet location', 'close to beach')",
  party: "Anything about your group? (e.g., 'one child is scared of heights', 'grandma uses walker')",
  dining: "Dietary needs or preferences? (e.g., 'severe nut allergy', 'must try local seafood', 'vegetarian kids')",
  areas: "Any specific neighborhoods or areas you want to be near?",
  experiences: "Any specific experiences you're hoping for? (e.g., 'want to see dolphins', 'photography focused')",
  default: "Any other details that would help plan your perfect trip?",
};

// FIX 4.4: Confidence Indicator component for recommendations
function ConfidenceIndicator({ level }: { level: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };

  const labels = {
    high: 'Verified',
    medium: 'Likely match',
    low: 'Best guess',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[level]}`}>
      {labels[level]}
    </span>
  );
}

// FIX 4.4: Quality tier indicator for experiences
function QualityTierBadge({ tier }: { tier: 'high' | 'medium' }) {
  if (tier === 'high') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        Top pick
      </span>
    );
  }
  return null;
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Select an option">
        {config.options?.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={disabled}
            role="radio"
            aria-checked={selected === option.id}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              selected === option.id
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-sm'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {option.icon && <span className="mr-2" aria-hidden="true">{option.icon}</span>}
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

function ChipsMultiCard({ config, onSubmit, onAddNote, disabled }: CardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState('');
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = config.field || 'general';
  const notePlaceholder = NOTE_PLACEHOLDERS[field] || NOTE_PLACEHOLDERS.default;
  const minSelection = (config as any).minSelection || 1;
  const maxSelection = (config as any).maxSelection || undefined;
  const required = (config as any).required !== false; // Default to required

  const toggleOption = (optionId: string) => {
    if (disabled) return;

    // Clear error when user makes a selection
    setError(null);

    // Auto-advance if selecting "none" option (e.g., "No accessibility needs")
    if (optionId === 'none') {
      const noneOption = config.options?.find(o => o.id === 'none');
      if (noneOption) {
        onSubmit([{ id: 'none', label: noneOption.label }]);
        return;
      }
    }

    const newSelected = new Set(selected);
    // If selecting another option, remove "none" if it was selected
    if (optionId !== 'none') {
      newSelected.delete('none');
    }

    if (newSelected.has(optionId)) {
      newSelected.delete(optionId);
    } else {
      // Check max selection
      if (maxSelection && newSelected.size >= maxSelection) {
        setError(`You can select up to ${maxSelection} options`);
        return;
      }
      newSelected.add(optionId);
    }
    setSelected(newSelected);
  };

  const addCustomItem = () => {
    if (customText.trim() && !customItems.includes(customText.trim())) {
      // Check max selection
      if (maxSelection && selected.size + customItems.length >= maxSelection) {
        setError(`You can select up to ${maxSelection} options`);
        return;
      }
      setCustomItems([...customItems, customText.trim()]);
      setCustomText('');
      setError(null);
    }
  };

  const removeCustomItem = (item: string) => {
    setCustomItems(customItems.filter(i => i !== item));
    setError(null);
  };

  const totalSelected = selected.size + customItems.length;
  const hasSelection = totalSelected > 0;

  // Validate selection
  const validate = (): boolean => {
    if (required && totalSelected < minSelection) {
      setError(`Please select at least ${minSelection === 1 ? 'one option' : `${minSelection} options`}`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    setTouched(true);
    if (!validate()) return;

    const selectedOptions = config.options?.filter(o => selected.has(o.id)) || [];
    const allSelected = [
      ...selectedOptions.map(o => ({ id: o.id, label: o.label })),
      ...customItems.map(item => ({ id: `custom-${item}`, label: item, isCustom: true })),
    ];
    onSubmit(allSelected);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Select one or more options">
        {config.options?.map((option) => (
          <button
            key={option.id}
            onClick={() => toggleOption(option.id)}
            disabled={disabled}
            aria-pressed={selected.has(option.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              selected.has(option.id)
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-sm'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selected.has(option.id) && <Check className="w-3.5 h-3.5 mr-1.5 inline" aria-hidden="true" />}
            {option.icon && <span className="mr-2" aria-hidden="true">{option.icon}</span>}
            {option.label}
          </button>
        ))}
      </div>

      {/* Custom items */}
      {customItems.length > 0 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Selected custom items">
          {customItems.map((item) => (
            <span
              key={item}
              role="listitem"
              className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm flex items-center gap-1"
            >
              {item}
              <button
                onClick={() => removeCustomItem(item)}
                className="hover:text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-0.5"
                aria-label={`Remove ${item}`}
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Custom input */}
      {config.allowCustomText && (
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="custom-item-input">Add custom item</label>
          <input
            id="custom-item-input"
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
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Add custom item"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Optional notes for additional context */}
      {config.allowNotes !== false && onAddNote && hasSelection && (
        <OptionalNotesInput
          field={field}
          placeholder={notePlaceholder}
          onSubmit={(note) => onAddNote(field, note)}
          disabled={disabled}
        />
      )}

      {/* Inline error message */}
      {touched && error && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Selection count indicator */}
      {maxSelection && totalSelected > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {totalSelected} of {maxSelection} selected
        </p>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || (touched && !hasSelection && required)}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-orange-500/20 hover:shadow-md hover:shadow-orange-500/25 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      >
        Continue
        <ChevronRight className="w-4 h-4 inline ml-1.5" aria-hidden="true" />
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
  // PHASE 5 FIX: Use config.defaultValue if provided, otherwise calculate midpoint
  const defaultValue = config.defaultValue ?? Math.floor((max - min) / 2) + min;
  const [value, setValue] = useState(defaultValue);

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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-5 shadow-sm">
      {/* Value display */}
      <div className="text-center">
        <span className="text-3xl sm:text-4xl font-bold text-orange-500">{formatValue(value)}</span>
        {isBudgetSlider && <span className="text-lg text-slate-500 dark:text-slate-400 ml-1">/night</span>}
        {getClosestLabel() && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            {getClosestLabel()}
          </p>
        )}
        {isBudgetSlider && value >= max && (
          <p className="text-xs text-orange-500 mt-1.5 font-medium">
            No upper limit
          </p>
        )}
      </div>

      {/* Slider with gradient track */}
      <div className="px-2">
        <div className="relative">
          {/* Gradient track background */}
          <div
            className="absolute inset-0 h-3 rounded-lg pointer-events-none"
            style={{
              background: isBudgetSlider
                ? 'linear-gradient(to right, #3b82f6, #f97316, #eab308)'
                : '#e2e8f0'
            }}
          />
          {/* Unfilled portion overlay */}
          <div
            className="absolute top-0 right-0 h-3 bg-slate-200 dark:bg-slate-600 rounded-r-lg pointer-events-none"
            style={{
              width: `${100 - ((value - min) / (max - min)) * 100}%`
            }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            disabled={disabled}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={formatValue(value)}
            aria-label={isBudgetSlider ? 'Budget per night' : 'Value selection'}
            className="relative w-full h-3 bg-transparent rounded-lg appearance-none cursor-pointer z-10
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-orange-500
              [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-orange-500
              [&::-moz-range-thumb]:shadow-lg"
          />
        </div>
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
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-orange-500/20 hover:shadow-md hover:shadow-orange-500/25 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      >
        Continue
        <ChevronRight className="w-4 h-4 inline ml-1.5" aria-hidden="true" />
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
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDateChange = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
    // Clear error when user makes a selection
    if (start && end) {
      setError(null);
    }
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

  // Validate dates
  const validate = (): boolean => {
    if (!startDate) {
      setError('Please select a start date for your trip');
      return false;
    }
    if (!endDate) {
      setError('Please select an end date for your trip');
      return false;
    }
    const nights = calculateNights();
    if (nights <= 0) {
      setError('End date must be after start date');
      return false;
    }
    if (nights > 60) {
      setError('Trip cannot exceed 60 nights');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    setTouched(true);
    if (!validate()) return;

    onSubmit({
      startDate: parseLocalDate(startDate!),
      endDate: parseLocalDate(endDate!),
      nights: calculateNights(),
      isFlexible: flexibleDates,
    });
  };

  const nights = calculateNights();
  const isValid = startDate && endDate && nights > 0 && nights <= 60;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Visual date range picker */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onChange={handleDateChange}
        minDate={new Date().toISOString().split('T')[0]}
      />

      {/* Inline error message */}
      {touched && error && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Helpful hint when no dates selected */}
      {!startDate && !endDate && !touched && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          Click above to select your travel dates
        </p>
      )}

      {/* Flexible checkbox */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={flexibleDates}
          onChange={(e) => setFlexibleDates(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
          aria-describedby="flexible-dates-description"
        />
        <span id="flexible-dates-description" className="text-sm text-slate-600 dark:text-slate-400">My dates are flexible (+/- a few days)</span>
      </label>

      <button
        onClick={handleSubmit}
        disabled={disabled || (touched && !isValid)}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-orange-500/20 hover:shadow-md hover:shadow-orange-500/25 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      >
        Continue
        <ChevronRight className="w-4 h-4 inline ml-1.5" aria-hidden="true" />
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
  const [selected, setSelected] = useState<{ name: string; country?: string } | null>(null);
  const [useGooglePlaces, setUseGooglePlaces] = useState(true);

  // Fallback state for when Google Places isn't available
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DestinationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // PHASE 7 FIX: Popular destinations with curated Unsplash images (high quality, free)
  const popularDestinations = [
    { name: 'Bali', country: 'Indonesia', countryCode: 'ID', imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop', lat: -8.4095, lng: 115.1889 },
    { name: 'Tokyo', country: 'Japan', countryCode: 'JP', imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop', lat: 35.6762, lng: 139.6503 },
    { name: 'Paris', country: 'France', countryCode: 'FR', imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop', lat: 48.8566, lng: 2.3522 },
    { name: 'Barcelona', country: 'Spain', countryCode: 'ES', imageUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop', lat: 41.3874, lng: 2.1686 },
    { name: 'London', country: 'United Kingdom', countryCode: 'GB', imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop', lat: 51.5074, lng: -0.1278 },
    { name: 'New York', country: 'United States', countryCode: 'US', imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop', lat: 40.7128, lng: -74.0060 },
    { name: 'Dubai', country: 'UAE', countryCode: 'AE', imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop', lat: 25.2048, lng: 55.2708 },
    { name: 'Maldives', country: 'Maldives', countryCode: 'MV', imageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&h=300&fit=crop', lat: 3.2028, lng: 73.2207 },
    { name: 'Thailand', country: 'Thailand', countryCode: 'TH', imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&h=300&fit=crop', lat: 15.8700, lng: 100.9925 },
    { name: 'Costa Rica', country: 'Costa Rica', countryCode: 'CR', imageUrl: 'https://images.unsplash.com/photo-1518259102261-b40117eabbc9?w=400&h=300&fit=crop', lat: 9.7489, lng: -83.7534 },
  ];

  // Handle Google Places selection
  const handleGooglePlaceSelect = (place: { placeId: string; name: string; fullName: string; country?: string; countryCode?: string; lat: number; lng: number; type: 'city' | 'country' | 'region' }) => {
    setSelected({ name: place.name, country: place.country });
    onSubmit({
      rawInput: place.fullName,
      canonicalName: place.name,
      type: place.type,
      countryCode: place.countryCode || '',
      countryName: place.country || '',
      centerLat: place.lat,
      centerLng: place.lng,
      timezone: '',
      suggestedAreas: [],
      googlePlaceId: place.placeId,
    });
  };

  // Fallback search for when Google Places isn't available
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchDestinations = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    try {
      // Use deduplicated fetch with caching for repeated searches
      const data = await dedupedFetch<{ destinations?: DestinationResult[] }>(
        `/api/destinations/search?q=${encodeURIComponent(searchQuery)}`,
        undefined,
        { cacheTTL: 5 * 60 * 1000 } // Cache search results for 5 minutes
      );
      setResults(data.destinations || []);
    } catch (error) {
      console.error('[DestinationCard] Search failed:', error);
      const friendlyMessage = getUserFriendlyMessage(error);
      setSearchError(friendlyMessage);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (useGooglePlaces) return; // Skip if using Google Places

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
  }, [query, searchDestinations, useGooglePlaces]);

  const handleFallbackSelect = (destination: DestinationResult) => {
    setSelected({ name: destination.name, country: destination.country });
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

  const handleQuickPick = (dest: { name: string; country: string; countryCode: string; lat: number; lng: number }) => {
    // Submit directly with known coordinates - no need for autocomplete
    setSelected({ name: dest.name, country: dest.country });
    onSubmit({
      rawInput: dest.name === dest.country ? dest.name : `${dest.name}, ${dest.country}`,
      canonicalName: dest.name,
      type: dest.name === dest.country ? 'country' : 'city',
      countryCode: dest.countryCode,
      countryName: dest.country,
      centerLat: dest.lat,
      centerLng: dest.lng,
      timezone: '',
      suggestedAreas: [],
      googlePlaceId: '',
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-5 shadow-sm">
      {/* Google Places Autocomplete (primary) */}
      {/* Fix: Use (regions) instead of (cities) to allow countries like "Dominican Republic" */}
      {useGooglePlaces ? (
        <GooglePlacesAutocomplete
          onSelect={handleGooglePlaceSelect}
          placeholder="Where do you want to go?"
          disabled={disabled}
          types={['(regions)']}
        />
      ) : (
        /* Fallback search input */
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
      )}

      {/* Fallback search error message */}
      {!useGooglePlaces && searchError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Fallback search results */}
      {!useGooglePlaces && results.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-600 rounded-xl divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden max-h-64 overflow-y-auto">
          {results.map((destination) => (
            <button
              key={destination.placeId}
              onClick={() => handleFallbackSelect(destination)}
              disabled={disabled}
              className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
            >
              {destination.imageUrl && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <FallbackImage
                    src={destination.imageUrl}
                    alt={destination.name}
                    fill
                    fallbackType="map"
                    sizes="48px"
                  />
                </div>
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

      {/* PHASE 7 FIX: Popular destinations with beautiful image cards */}
      {!selected && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
            Popular destinations
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {popularDestinations.map((dest) => (
              <button
                key={dest.name}
                onClick={() => handleQuickPick(dest)}
                disabled={disabled}
                className="group relative h-20 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image
                  src={dest.imageUrl}
                  alt={dest.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white font-medium text-sm drop-shadow-lg">{dest.name}</p>
                  <p className="text-white/80 text-xs drop-shadow">{dest.country}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected destination indicator */}
      {selected && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div>
            <span className="text-green-700 dark:text-green-400 font-medium">{selected.name}</span>
            {selected.country && (
              <span className="text-green-600 dark:text-green-500 text-sm ml-1">({selected.country})</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PARTY CARD (Adults & Children Counter)
// ============================================================================

const MAX_ADULTS = 20;
const MAX_CHILDREN = 10;
const MAX_TOTAL_TRAVELERS = 30;

function PartyCard({ config, onSubmit, disabled }: CardProps) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addChild = () => {
    if (children < MAX_CHILDREN && adults + children < MAX_TOTAL_TRAVELERS) {
      setChildren(children + 1);
      setChildAges([...childAges, 5]); // Default age
      setError(null);
    }
  };

  const removeChild = () => {
    if (children > 0) {
      setChildren(children - 1);
      setChildAges(childAges.slice(0, -1));
      setError(null);
    }
  };

  const updateAdults = (newAdults: number) => {
    if (newAdults >= 1 && newAdults <= MAX_ADULTS && newAdults + children <= MAX_TOTAL_TRAVELERS) {
      setAdults(newAdults);
      setError(null);
    } else if (newAdults + children > MAX_TOTAL_TRAVELERS) {
      setError(`Maximum ${MAX_TOTAL_TRAVELERS} travelers allowed`);
    }
  };

  const updateChildAge = (index: number, age: number) => {
    const newAges = [...childAges];
    newAges[index] = age;
    setChildAges(newAges);
  };

  // Calculate estimated rooms needed for large groups
  const totalPeople = adults + children;
  const estimatedRooms = useMemo(() => {
    if (totalPeople <= 2) return 1;
    if (totalPeople <= 4) return 1; // Family room or suite
    // For larger groups: ~2 adults per room, kids can share with parents or need extra rooms
    const adultRooms = Math.ceil(adults / 2);
    const kidsNeedingOwnRoom = children > 2 ? Math.ceil((children - 2) / 2) : 0;
    return adultRooms + kidsNeedingOwnRoom;
  }, [adults, children, totalPeople]);

  const isLargeGroup = totalPeople > 4;

  // Validate before submit
  const validate = (): boolean => {
    if (adults < 1) {
      setError('At least one adult is required');
      return false;
    }
    if (totalPeople > MAX_TOTAL_TRAVELERS) {
      setError(`Maximum ${MAX_TOTAL_TRAVELERS} travelers allowed`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      adults,
      children,
      childAges: children > 0 ? childAges : [],
      estimatedRooms: isLargeGroup ? estimatedRooms : undefined,
    });
  };

  const isValid = adults >= 1 && totalPeople <= MAX_TOTAL_TRAVELERS;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-5 shadow-sm">
      {/* Adults */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Adults</p>
            <p className="text-xs text-slate-500">Age 18+</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => updateAdults(adults - 1)}
            disabled={disabled || adults <= 1}
            aria-label="Decrease adults"
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="w-8 text-center font-semibold text-slate-900 dark:text-white" aria-live="polite">{adults}</span>
          <button
            onClick={() => updateAdults(adults + 1)}
            disabled={disabled || adults >= MAX_ADULTS || totalPeople >= MAX_TOTAL_TRAVELERS}
            aria-label="Increase adults"
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Children */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Children</p>
            <p className="text-xs text-slate-500">Age 0-17</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={removeChild}
            disabled={disabled || children <= 0}
            aria-label="Decrease children"
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="w-8 text-center font-semibold text-slate-900 dark:text-white" aria-live="polite">{children}</span>
          <button
            onClick={addChild}
            disabled={disabled || children >= MAX_CHILDREN || totalPeople >= MAX_TOTAL_TRAVELERS}
            aria-label="Increase children"
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Child ages */}
      {children > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Children&apos;s ages (helps us find family-friendly options)
          </p>
          <div className="flex flex-wrap gap-2">
            {childAges.map((age, index) => (
              <select
                key={index}
                value={age}
                onChange={(e) => updateChildAge(index, Number(e.target.value))}
                disabled={disabled}
                aria-label={`Age of child ${index + 1}`}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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

      {/* Inline error message */}
      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Room estimate for large groups */}
      {isLargeGroup && !error && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <span className="text-lg" aria-hidden="true">🏨</span>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Large group ({totalPeople} travelers)
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                You&apos;ll likely need {estimatedRooms} room{estimatedRooms > 1 ? 's' : ''}.
                {totalPeople > 8 && ' Consider booking a villa or multiple apartments for better value.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={disabled || !isValid}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-orange-500/20 hover:shadow-md hover:shadow-orange-500/25 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      >
        Continue
        <ChevronRight className="w-4 h-4 inline ml-1.5" aria-hidden="true" />
      </button>
    </div>
  );
}

// ============================================================================
// HOTELS CARD - AMEX Travel-inspired full-screen browser
// ============================================================================

function HotelsCard({ config, onSubmit, disabled }: CardProps) {
  const hotels = (config.candidates || []) as HotelCandidate[];
  const areaName = (config as any).areaName || '';
  const [selected, setSelected] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);

  // Get top 3 hotels for preview
  const topHotels = useMemo(() => {
    return [...hotels]
      .sort((a, b) => {
        // Sort by Reddit score + stars + rating
        const aScore = (a.redditScore || 0) * 10 + (a.stars || 0) * 5 + (a.googleRating || 0) * 2;
        const bScore = (b.redditScore || 0) * 10 + (b.stars || 0) * 5 + (b.googleRating || 0) * 2;
        return bScore - aScore;
      })
      .slice(0, 3);
  }, [hotels]);

  // Calculate price range
  const priceRange = useMemo(() => {
    const prices = hotels.filter(h => h.pricePerNight).map(h => h.pricePerNight!);
    if (prices.length === 0) return null;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [hotels]);

  const handleSelect = (hotel: HotelCandidate) => {
    if (disabled) return;
    setSelected(hotel.id);
    onSubmit(hotel);
    setShowBrowser(false);
  };

  // Show loading skeleton while hotels are being fetched
  const isLoading = (config as any).isLoading === true;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header skeleton */}
        <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-semibold">Finding hotels{areaName ? ` in ${areaName}` : ''}...</span>
          </div>
          <p className="text-orange-100 text-sm mt-1">Searching for the best options</p>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonHotelCard key={i} />
          ))}
        </div>
      </div>
    );
  }

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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg sm:text-xl flex items-center gap-2">
                <span>Select Your Hotel</span>
                {areaName && <span className="font-normal opacity-90">in {areaName}</span>}
              </h3>
              <p className="text-orange-100 text-sm mt-1.5">
                {hotels.length} hotels available
                {priceRange && ` · $${priceRange.min} - $${priceRange.max}/night`}
              </p>
            </div>
          </div>
        </div>

        {/* Top 3 Preview */}
        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Top Recommendations
          </p>
          {topHotels.map((hotel) => (
            <div
              key={hotel.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${hotel.name}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(hotel); } }}
              className={`flex gap-4 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                selected === hotel.id
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md shadow-orange-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm'
              }`}
              onClick={() => handleSelect(hotel)}
            >
              {/* Image */}
              <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0 shadow-sm">
                <FallbackImage
                  src={hotel.imageUrl}
                  alt={hotel.name}
                  fill
                  fallbackType="hotel"
                  sizes="96px"
                  fallbackContent={
                    <div className="w-full h-full flex items-center justify-center text-3xl bg-slate-100 dark:bg-slate-700">🏨</div>
                  }
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-1 text-base">
                    {hotel.name}
                  </h4>
                  {selected === hotel.id && (
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {hotel.stars > 0 && (
                    <span className="text-xs text-amber-500">{'★'.repeat(hotel.stars)}</span>
                  )}
                  {hotel.googleRating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-slate-600 dark:text-slate-400">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {hotel.googleRating}
                    </span>
                  )}
                  {hotel.redditScore && hotel.redditScore > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded">
                      🔥 Reddit Pick
                    </span>
                  )}
                  {hotel.isAllInclusive && (
                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded">
                      All-Inclusive
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {hotel.city}
                  </span>
                  {hotel.pricePerNight && (
                    <span className={`text-sm font-semibold ${
                      hotel.priceConfidence === 'real'
                        ? 'text-green-600'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      ${hotel.pricePerNight}/night
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Browse All Button */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <button
            onClick={() => setShowBrowser(true)}
            disabled={disabled}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            Browse All {hotels.length} Hotels
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2.5">
            Filter by price, star rating, amenities & more
          </p>
        </div>

        {/* Selected indicator */}
        {selected && (
          <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700 pt-3">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Check className="w-5 h-5" />
              <span className="font-medium">
                {hotels.find(h => h.id === selected)?.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Full-screen Hotel Browser Modal */}
      <HotelBrowserModal
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        hotels={hotels}
        areaName={areaName}
        onSelectHotel={handleSelect}
        selectedHotelId={selected}
      />
    </>
  );
}

// ============================================================================
// HOTEL QUICK QUESTIONS - Phase 4 Fix 4.1
// Helps users compare hotels with one-tap questions
// ============================================================================

interface HotelQuestionAnswer {
  question: string;
  answer: string;
  hotel?: HotelCandidate;
}

function HotelQuestionsInput({
  hotels,
  onAnswer,
}: {
  hotels: HotelCandidate[];
  onAnswer: (answer: HotelQuestionAnswer) => void;
}) {
  const [activeAnswer, setActiveAnswer] = useState<HotelQuestionAnswer | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  // Define quick questions with answer logic
  const quickQuestions = useMemo(() => [
    {
      label: 'Best pool?',
      icon: '🏊',
      getAnswer: () => {
        const withPool = hotels.filter(h => {
          const amenities = ((h as any).amenities || []).join(' ').toLowerCase();
          return amenities.includes('pool') || amenities.includes('swimming');
        });
        if (withPool.length === 0) {
          return { question: 'Which has the best pool?', answer: 'None of these hotels mention pool amenities in their listing.' };
        }
        // Sort by rating among those with pools
        withPool.sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0));
        const best = withPool[0];
        return {
          question: 'Which has the best pool?',
          answer: `${best.name} has a pool and the highest rating (${best.googleRating}/5) among options with pools.`,
          hotel: best,
        };
      },
    },
    {
      label: 'Near beach?',
      icon: '🏖️',
      getAnswer: () => {
        const beachKeywords = ['beach', 'oceanfront', 'beachfront', 'seaside', 'waterfront', 'ocean view'];
        const nearBeach = hotels.filter(h => {
          const text = [h.name, h.address, ...((h as any).amenities || [])].join(' ').toLowerCase();
          return beachKeywords.some(kw => text.includes(kw));
        });
        if (nearBeach.length === 0) {
          return { question: 'Which is closest to the beach?', answer: 'None of these hotels mention beach proximity in their listing. Check Google Maps for distances.' };
        }
        nearBeach.sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0));
        const best = nearBeach[0];
        return {
          question: 'Which is closest to the beach?',
          answer: `${best.name} appears to be near the beach based on its listing.`,
          hotel: best,
        };
      },
    },
    {
      label: 'Quietest?',
      icon: '🤫',
      getAnswer: () => {
        const quietKeywords = ['quiet', 'peaceful', 'tranquil', 'serene', 'boutique', 'adult'];
        const quietHotels = hotels.filter(h => {
          const text = [h.name, h.address, ...((h as any).amenities || []), ...((h as any).vibes || [])].join(' ').toLowerCase();
          return quietKeywords.some(kw => text.includes(kw));
        });
        if (quietHotels.length > 0) {
          quietHotels.sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0));
          const best = quietHotels[0];
          return {
            question: 'Which is quietest?',
            answer: `${best.name} appears to emphasize a quiet/peaceful atmosphere.`,
            hotel: best,
          };
        }
        // Fallback: suggest boutique or smaller hotels (lower review count might indicate smaller)
        const sorted = [...hotels].sort((a, b) => (a.reviewCount || 0) - (b.reviewCount || 0));
        const smallest = sorted[0];
        return {
          question: 'Which is quietest?',
          answer: `${smallest.name} has fewer reviews (${smallest.reviewCount}) which may indicate a smaller, quieter property.`,
          hotel: smallest,
        };
      },
    },
    {
      label: 'Free breakfast?',
      icon: '🍳',
      getAnswer: () => {
        const breakfastKeywords = ['breakfast included', 'free breakfast', 'complimentary breakfast', 'breakfast buffet'];
        const withBreakfast = hotels.filter(h => {
          const amenities = ((h as any).amenities || []).join(' ').toLowerCase();
          return breakfastKeywords.some(kw => amenities.includes(kw));
        });
        if (withBreakfast.length === 0) {
          return { question: 'Any with free breakfast?', answer: 'Breakfast info isn\'t listed for these hotels. Check booking sites for meal plans.' };
        }
        const names = withBreakfast.map(h => h.name).join(', ');
        return {
          question: 'Any with free breakfast?',
          answer: `${names} ${withBreakfast.length === 1 ? 'offers' : 'offer'} complimentary breakfast.`,
          hotel: withBreakfast[0],
        };
      },
    },
  ], [hotels]);

  const handleQuestion = (q: typeof quickQuestions[0]) => {
    const answer = q.getAnswer();
    setActiveAnswer(answer);
    setActiveLabel(q.label);
    onAnswer(answer);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
        <MessageCircle className="w-3 h-3" />
        Quick questions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {quickQuestions.map((q) => (
          <button
            key={q.label}
            onClick={() => handleQuestion(q)}
            className={`text-xs px-2.5 py-1.5 rounded-full transition-colors ${
              activeLabel === q.label
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {q.icon} {q.label}
          </button>
        ))}
      </div>

      {/* Answer display */}
      <AnimatePresence>
        {activeAnswer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
          >
            <p className="text-xs font-medium text-orange-800 dark:text-orange-300 mb-1">
              {activeAnswer.question}
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-400">
              {activeAnswer.answer}
            </p>
            {activeAnswer.hotel && (
              <button
                onClick={() => setActiveAnswer(null)}
                className="mt-1.5 text-xs text-orange-600 dark:text-orange-400 hover:underline"
              >
                ✓ Got it
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// ACCESSIBILITY WARNING - Phase 4 Fix 4.2
// Warns users when accessibility info is estimated, not verified
// ============================================================================

function AccessibilityWarning({ hotels }: { hotels: HotelCandidate[] }) {
  const hasAccessibilityRequest = hotels.some(h => (h as any).accessibilityScore !== undefined);
  const allEstimated = hotels.every(h => (h as any).accessibilityConfidence !== 'verified');

  if (!hasAccessibilityRequest || !allEstimated) return null;

  return (
    <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Accessibility note:</strong> These accessibility scores are estimated from listing data.
          Contact hotels directly to verify specific accessibility features for your needs.
        </span>
      </p>
    </div>
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
    if (km === undefined || km === null) return '';
    if (km === 0) return 'At your hotel';
    const hotelRef = areaName ? `${areaName} hotel` : 'your hotel';
    if (km < 0.5) return `${Math.round(km * 1000)}m from ${hotelRef}`;
    if (km < 2) return `${km.toFixed(1)}km from ${hotelRef}`;
    return `${Math.round(km)}km from ${hotelRef}`;
  };

  // Show loading skeleton while restaurants are being fetched
  const isLoading = (config as any).isLoading === true;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {emoji} Finding {cuisineLabel} restaurants...
            </span>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <SkeletonRestaurantCard key={i} />
          ))}
        </div>
      </div>
    );
  }

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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-slate-200 dark:border-slate-600">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <span>{cuisineLabel} restaurants</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {restaurants.length} options near your hotels
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
                    {/* Restaurant thumbnail image */}
                    <div
                      className="relative w-16 h-14 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-700"
                      onClick={(e) => openDetail(restaurant, e)}
                    >
                      <FallbackImage
                        src={restaurant.imageUrl}
                        alt={restaurant.name}
                        fill
                        fallbackType="restaurant"
                        sizes="64px"
                      />
                    </div>
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
                      {/* Address line */}
                      {restaurant.address && (
                        <p className="text-xs text-slate-400 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{restaurant.address}</span>
                        </p>
                      )}
                      {(restaurant.googleMapsUrl || restaurant.placeId) && (
                        <a
                          href={restaurant.googleMapsUrl || `https://www.google.com/maps/place/?q=place_id:${restaurant.placeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-0.5 inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on Maps
                        </a>
                      )}
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
                      {/* Booking difficulty indicator */}
                      {restaurant.bookingDifficulty && restaurant.bookingDifficulty !== 'easy' && (
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          restaurant.bookingDifficulty === 'very_hard'
                            ? 'text-red-600 dark:text-red-400'
                            : restaurant.bookingDifficulty === 'hard'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          <span>{restaurant.bookingAdvice}</span>
                        </div>
                      )}
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-orange-500/20"
          >
            {selected.size > 0 ? `Add ${selected.size} restaurant${selected.size > 1 ? 's' : ''}` : 'Skip this cuisine'}
            <ChevronRight className="w-4 h-4 inline ml-1.5" />
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
    if (km === undefined || km === null) return '';
    if (km === 0) return 'At your hotel';
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
    nature: '🌿',
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
              {areaActivities.slice(0, 8).map((activity) => (
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
                    {/* Address line */}
                    {(activity as any).address && (
                      <p className="text-xs text-slate-400 dark:text-slate-400 truncate mt-0.5">
                        {(activity as any).address}
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
    if (km === undefined || km === null) return '';
    if (km === 0) return 'At your hotel';
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
    nature: '🌿',
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

  // Show loading skeleton while experiences are being fetched
  const isLoading = (config as any).isLoading === true;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {emoji} Finding {activityLabel} experiences...
            </span>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <SkeletonExperienceCard key={i} />
          ))}
        </div>
      </div>
    );
  }

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
                {areaExperiences.slice(0, 8).map((experience) => (
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
                    {/* Experience thumbnail image */}
                    <div
                      className="relative w-16 h-14 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-700"
                      onClick={(e) => openDetail(experience, e)}
                    >
                      <FallbackImage
                        src={experience.imageUrl}
                        alt={experience.name}
                        fill
                        fallbackType="experience"
                        sizes="64px"
                      />
                    </div>
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
                      {experience.address && (
                        <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{experience.address}</span>
                        </p>
                      )}
                      {(experience.googleMapsUrl || experience.placeId) && (
                        <a
                          href={experience.googleMapsUrl || `https://www.google.com/maps/place/?q=place_id:${experience.placeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-1 inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on Maps
                        </a>
                      )}
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
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-2">
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

  const MAX_AREAS = 3;
  const [limitReached, setLimitReached] = useState(false);

  const toggleSelect = (areaId: string) => {
    if (disabled) return;
    const newSelected = new Set(selected);
    if (newSelected.has(areaId)) {
      newSelected.delete(areaId);
      setLimitReached(false);
    } else if (newSelected.size < MAX_AREAS) {
      newSelected.add(areaId);
      setLimitReached(false);
    } else {
      // Flash limit warning
      setLimitReached(true);
      setTimeout(() => setLimitReached(false), 2000);
      return;
    }
    setSelected(newSelected);
  };

  const handleSubmit = () => {
    const selectedAreas = areas.filter(a => selected.has(a.id));
    onSubmit(selectedAreas);
  };

  // Show loading skeleton while areas are being discovered
  const isLoading = (config as any).isLoading === true;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <span className="font-medium">Discovering areas...</span>
            <Loader2 className="w-4 h-4 animate-spin ml-auto" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonAreaCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (areas.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <span className="font-medium">Areas</span>
          </div>
        </div>
        <div className="p-4 text-center">
          <AlertCircle className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-blue-600 dark:text-blue-400">No areas discovered</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <span className="font-medium">Select up to 3 areas to visit</span>
        </div>
      </div>

      {/* Map preview of areas */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-600">
        <AreasMapPreview
          areas={areas}
          selectedAreaIds={selected}
          onAreaClick={toggleSelect}
        />
        <p className="text-xs text-slate-400 dark:text-slate-400 text-center">
          Click markers to select areas
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
                      {formatTag(tag)}
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
        {limitReached && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-1">
            Maximum {MAX_AREAS} areas — deselect one to choose a different area
          </p>
        )}
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
  const [customOrder, setCustomOrder] = useState<string[]>([]); // Track custom area order

  // Initialize customNights and customOrder when areas or tripLength changes
  useEffect(() => {
    if (areas.length > 0) {
      const perArea = Math.floor(tripLength / areas.length);
      const remainder = tripLength % areas.length;
      const initial: Record<string, number> = {};
      areas.forEach((area: any, idx: number) => {
        initial[area.id] = perArea + (idx === areas.length - 1 ? remainder : 0);
      });
      setCustomNights(initial);
      setCustomOrder(areas.map((a: any) => a.id)); // Initialize order from areas
      if (process.env.NODE_ENV === 'development') console.log('[SplitCard] Initialized customNights:', initial, 'areas:', areas.map((a: any) => a.name), 'tripLength:', tripLength);
    }
  }, [areas, tripLength]);

  // Get areas in custom order
  const orderedAreas = useMemo(() => {
    if (customOrder.length === 0) return areas;
    return customOrder.map(id => areas.find((a: any) => a.id === id)).filter(Boolean);
  }, [areas, customOrder]);

  // Swap two areas (for 2-area trips)
  const swapAreas = () => {
    if (customOrder.length === 2) {
      setCustomOrder([customOrder[1], customOrder[0]]);
      setCustomConfirmed(false);
    }
  };

  // Move area up in order
  const moveAreaUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...customOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setCustomOrder(newOrder);
    setCustomConfirmed(false);
  };

  // Move area down in order
  const moveAreaDown = (index: number) => {
    if (index >= customOrder.length - 1) return;
    const newOrder = [...customOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setCustomOrder(newOrder);
    setCustomConfirmed(false);
  };

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

    // Validation: each area must have at least 1 night
    if (newValue < 1) return;
    if (currentTotal + delta > tripLength && delta > 0) return;

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
      // Use orderedAreas for custom splits to respect user's order preference
      const customSplit = {
        id: 'user-custom',
        name: orderedAreas.map((a: any) => `${customNights[a.id] ?? defaultNightsPerArea}n ${a.name}`).join(' → '),
        stops: orderedAreas.map((area: any) => ({
          areaId: area.id,
          areaName: area.name,
          nights: customNights[area.id] ?? defaultNightsPerArea,
        })),
        fitScore: 1.0,
      };
      if (process.env.NODE_ENV === 'development') console.log('[SplitCard] Submitting custom split:', customSplit);
      onSubmit(customSplit);
    } else if (selected) {
      const selectedSplit = splits.find(s => s.id === selected);
      if (process.env.NODE_ENV === 'development') console.log('[SplitCard] Submitting preset split:', selectedSplit);
      onSubmit(selectedSplit);
    }
  };

  // Debug (dev only)
  if (process.env.NODE_ENV === 'development') {
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
  }

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
            {orderedAreas.map((area: any, idx: number) => {
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
            {orderedAreas.map((area: any, idx: number) => {
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
              <div className="flex flex-wrap items-center gap-1 mt-2">
                {(split.stops || []).map((stop: any, idx: number, arr: any[]) => {
                  const stopName = stop.areaName || stop.area?.name || 'Area';
                  const stopLat = stop.area?.centerLat || stop.lat;
                  const stopLng = stop.area?.centerLng || stop.lng;
                  const nextStop = arr[idx + 1];
                  const nextLat = nextStop?.area?.centerLat || nextStop?.lat;
                  const nextLng = nextStop?.area?.centerLng || nextStop?.lng;

                  // Calculate transit to next stop if coordinates available
                  let transitInfo = null;
                  if (nextStop && stopLat && stopLng && nextLat && nextLng) {
                    transitInfo = estimateInterAreaTransit(stopLat, stopLng, nextLat, nextLng);
                  }

                  return (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300">
                        {stopName} ({stop.nights}n)
                      </span>
                      {transitInfo && (
                        <span
                          className="text-xs text-slate-400 dark:text-slate-400 flex items-center gap-0.5"
                          title={transitInfo.details}
                        >
                          → {getInterAreaTransportIcon(transitInfo.mode)} {transitInfo.timeText} →
                        </span>
                      )}
                    </div>
                  );
                })}
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Adjust nights and order:
              </p>
              {/* Swap button for 2 areas */}
              {orderedAreas.length === 2 && (
                <button
                  onClick={swapAreas}
                  disabled={disabled}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Swap order
                </button>
              )}
            </div>
            {orderedAreas.map((area: any, idx: number) => {
              const nightsForArea = customNights[area.id] ?? defaultNightsPerArea;
              const nextArea = orderedAreas[idx + 1];

              // Calculate transit to next area
              let transitInfo = null;
              const areaCoords = area as { centerLat?: number; centerLng?: number };
              const nextCoords = nextArea as { centerLat?: number; centerLng?: number } | undefined;
              if (nextCoords && areaCoords.centerLat && areaCoords.centerLng && nextCoords.centerLat && nextCoords.centerLng) {
                transitInfo = estimateInterAreaTransit(
                  areaCoords.centerLat,
                  areaCoords.centerLng,
                  nextCoords.centerLat,
                  nextCoords.centerLng
                );
              }

              return (
                <div key={area.id}>
                  <div className="flex items-center justify-between gap-2">
                    {/* Reorder controls for 3+ areas */}
                    {orderedAreas.length > 2 && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveAreaUp(idx)}
                          disabled={disabled || idx === 0}
                          className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveAreaDown(idx)}
                          disabled={disabled || idx === orderedAreas.length - 1}
                          className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex-1">
                      <span className="text-xs text-slate-400 mr-1">{idx + 1}.</span>
                      {area.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adjustNights(area.id, -1)}
                        disabled={disabled || nightsForArea <= 1}
                        className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-16 text-center font-bold text-slate-900 dark:text-white">
                        {nightsForArea}n
                      </span>
                      <button
                        onClick={() => adjustNights(area.id, 1)}
                        disabled={disabled || nightsRemaining <= 0}
                        className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* Transit indicator to next area */}
                  {transitInfo && (
                    <div className="flex items-center justify-center py-2 my-1">
                      <span className="text-xs text-slate-400 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                        ↓ {getInterAreaTransportIcon(transitInfo.mode)} {transitInfo.timeText}
                      </span>
                    </div>
                  )}
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

            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Select reasons for dissatisfaction">
              {DISSATISFACTION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => toggleReason(option.id)}
                  disabled={disabled}
                  aria-pressed={selectedReasons.has(option.id)}
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
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minLength = (config as any).minLength || 0;
  const maxLength = (config as any).maxLength || 500;
  const required = (config as any).required || false;

  // Validate text input
  const validate = (): boolean => {
    if (required && !text.trim()) {
      setError('This field is required');
      return false;
    }
    if (text.trim() && text.trim().length < minLength) {
      setError(`Please enter at least ${minLength} characters`);
      return false;
    }
    if (text.length > maxLength) {
      setError(`Please keep your response under ${maxLength} characters`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleBlur = () => {
    setTouched(true);
    validate();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = () => {
    setTouched(true);
    if (!validate()) return;

    if (text.trim()) {
      onSubmit(text.trim());
    } else {
      // Allow skipping text input if not required
      onSubmit('');
    }
  };

  const charCount = text.length;
  const showCharCount = charCount > maxLength * 0.7;
  const isOverLimit = charCount > maxLength;
  const isValid = !required || text.trim().length > 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="relative">
        <textarea
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={config.placeholder || config.customTextPlaceholder || 'Type your answer...'}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          aria-invalid={touched && !!error}
          aria-describedby={error ? 'text-error' : undefined}
          className={`w-full p-3 rounded-lg border bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            touched && error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-600 focus:border-orange-500 focus:ring-orange-500'
          }`}
          rows={config.multiline ? 4 : 3}
        />

        {/* Character count */}
        {showCharCount && (
          <div className={`absolute bottom-2 right-2 text-xs ${
            isOverLimit ? 'text-red-500' : 'text-slate-400'
          }`}>
            {charCount}/{maxLength}
          </div>
        )}
      </div>

      {/* Inline error message */}
      {touched && error && (
        <div id="text-error" role="alert" className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={disabled || (touched && !isValid && required)}
          className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          {text.trim() ? 'Continue' : (required ? 'Required' : 'Skip')}
          <ChevronRight className="w-4 h-4 inline ml-1" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
