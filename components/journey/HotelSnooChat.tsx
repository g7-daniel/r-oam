'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  Hotel,
  X,
  ArrowUp,
  DollarSign,
  Star,
  Sparkles,
  ChevronRight,
  Check,
} from 'lucide-react';
import clsx from 'clsx';

// Reddit Snoo logo
const SnooLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 0C4.48 0 0 4.48 0 10c0 5.52 4.48 10 10 10s10-4.48 10-10C20 4.48 15.52 0 10 0zm5.86 6.12c.67 0 1.22.55 1.22 1.22 0 .45-.25.84-.62 1.05.03.18.05.36.05.55 0 2.81-3.27 5.09-7.31 5.09-4.04 0-7.31-2.28-7.31-5.09 0-.19.02-.37.05-.55-.37-.21-.62-.6-.62-1.05 0-.67.55-1.22 1.22-1.22.33 0 .62.13.84.34 1.03-.74 2.45-1.23 4.02-1.29l.76-3.57c.02-.09.07-.16.14-.21.07-.05.16-.07.24-.05l2.47.53c.17-.33.52-.57.92-.57.57 0 1.03.46 1.03 1.03s-.46 1.03-1.03 1.03c-.56 0-1.01-.44-1.03-.99l-2.22-.47-.68 3.19c1.54.07 2.94.55 3.95 1.28.22-.21.52-.34.84-.34zM6.5 9.75c-.57 0-1.03.46-1.03 1.03s.46 1.03 1.03 1.03 1.03-.46 1.03-1.03-.46-1.03-1.03-1.03zm7 0c-.57 0-1.03.46-1.03 1.03s.46 1.03 1.03 1.03 1.03-.46 1.03-1.03-.46-1.03-1.03-1.03zm-5.47 3.82c-.1-.1-.1-.26 0-.36.1-.1.26-.1.36 0 .63.63 1.64.93 2.61.93s1.98-.3 2.61-.93c.1-.1.26-.1.36 0 .1.1.1.26 0 .36-.73.73-1.87 1.09-2.97 1.09s-2.24-.36-2.97-1.09z"/>
  </svg>
);

export interface RedditHotel {
  id: string;
  name: string;
  description: string;
  priceRange?: string;
  estimatedPrice?: number;
  priceEstimate?: number;
  subreddit?: string;
  upvotes?: number;
  url?: string;
  tags?: string[];
  matchScore?: number;
  verified?: boolean;
  lat?: number;
  lng?: number;
  rating?: number;
  address?: string;
  imageUrl?: string;
  imageRef?: string;
  priceLevel?: number;
  mentionCount?: number;
}

interface HotelSnooChatProps {
  destinationName: string;
  lat?: number;
  lng?: number;
  onHotelsFound?: (hotels: RedditHotel[]) => void;
}

// Preference questions
const QUESTIONS = [
  {
    id: 'budget',
    multiSelect: false,
    question: "What's your budget per night?",
    options: [
      { value: 'budget', label: 'Budget', description: 'Under $150', icon: '$' },
      { value: 'mid', label: 'Mid-range', description: '$150-300', icon: '$$' },
      { value: 'upscale', label: 'Upscale', description: '$300-500', icon: '$$$' },
      { value: 'luxury', label: 'Luxury', description: '$500+', icon: '$$$$' },
    ],
  },
  {
    id: 'style',
    multiSelect: false,
    question: 'What type of stay?',
    options: [
      { value: 'resort', label: 'Resort', description: 'All-inclusive vibes' },
      { value: 'boutique', label: 'Boutique', description: 'Unique & charming' },
      { value: 'chain', label: 'Chain Hotel', description: 'Reliable brands' },
      { value: 'villa', label: 'Villa/Airbnb', description: 'Private space' },
    ],
  },
  {
    id: 'priority',
    multiSelect: true, // Enable multi-select for priorities
    question: "What matters most? (select all that apply)",
    options: [
      { value: 'beach', label: 'Beach Access', description: 'Steps from sand' },
      { value: 'pool', label: 'Amazing Pool', description: 'Pool vibes' },
      { value: 'service', label: 'Top Service', description: '5-star treatment' },
      { value: 'food', label: 'Great Food', description: 'On-site dining' },
    ],
  },
];

export default function HotelSnooChat({ destinationName, lat, lng, onHotelsFound }: HotelSnooChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [foundCount, setFoundCount] = useState(0);

  // Handle multi-select toggle
  const handleMultiSelectToggle = (questionId: string, value: string) => {
    const current = (answers[questionId] as string[]) || [];
    const newValue = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setAnswers({ ...answers, [questionId]: newValue });
  };

  // Handle continue for multi-select questions
  const handleMultiSelectContinue = async () => {
    const currentQuestion = QUESTIONS[currentStep];
    const selectedValues = (answers[currentQuestion.id] as string[]) || [];

    if (selectedValues.length === 0) return;

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await fetchRecommendations(answers);
    }
  };

  // Fetch recommendations helper
  const fetchRecommendations = async (finalAnswers: Record<string, string | string[]>) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reddit/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destinationName,
          lat,
          lng,
          preferences: finalAnswers,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const hotels = data.hotels || [];
        setFoundCount(hotels.length);
        setIsComplete(true);

        // Notify parent to display hotels on the page
        if (onHotelsFound && hotels.length > 0) {
          onHotelsFound(hotels);
        }
      }
    } catch (error) {
      console.error('Failed to fetch Reddit hotel recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      // Move to next question
      setCurrentStep(currentStep + 1);
    } else {
      // All questions answered - fetch recommendations
      await fetchRecommendations(newAnswers);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers({});
    setIsComplete(false);
    setFoundCount(0);
  };

  const currentQuestion = QUESTIONS[currentStep];

  // Collapsed button state - hidden on mobile (there's a separate menu item for mobile)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex fixed top-20 right-6 z-50 items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all hover:shadow-xl border border-orange-400"
      >
        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
          <SnooLogo className="w-4 h-4 text-orange-500" />
        </div>
        <span className="font-medium text-sm">Ask Snoo</span>
        <Sparkles className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed top-20 right-6 z-50 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <SnooLogo className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Ask Snoo</h3>
            <p className="text-[10px] text-orange-100">Reddit hotel finder</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-orange-600/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-1.5">
          {QUESTIONS.map((_, idx) => (
            <div
              key={idx}
              className={clsx(
                'flex-1 h-1 rounded-full transition-colors',
                idx < currentStep ? 'bg-orange-500' :
                idx === currentStep ? 'bg-orange-400' :
                'bg-slate-200 dark:bg-slate-600'
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              Searching Reddit for the best hotels...
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Scanning r/travel, r/luxurytravel, r/hotels...
            </p>
          </div>
        ) : isComplete ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              Found {foundCount} Reddit-recommended hotels!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Look for the <span className="text-orange-500">r/</span> badge on hotels below
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Search Again
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Question */}
            <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">
              {currentQuestion.question}
            </p>

            {/* Options */}
            <div className="grid grid-cols-2 gap-2">
              {currentQuestion.options.map((option) => {
                const isMultiSelect = currentQuestion.multiSelect;
                const selectedValues = isMultiSelect
                  ? ((answers[currentQuestion.id] as string[]) || [])
                  : [];
                const isSelected = isMultiSelect && selectedValues.includes(option.value);

                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      isMultiSelect
                        ? handleMultiSelectToggle(currentQuestion.id, option.value)
                        : handleAnswer(currentQuestion.id, option.value)
                    }
                    className={clsx(
                      'flex flex-col items-start p-3 border rounded-xl transition-all text-left group relative',
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-400 dark:border-orange-500 ring-2 ring-orange-500'
                        : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/30 border-slate-200 dark:border-slate-600 hover:border-orange-300 dark:hover:border-orange-500'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-orange-500" />
                      </div>
                    )}
                    <span className={clsx(
                      'font-medium text-sm',
                      isSelected
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400'
                    )}>
                      {option.label}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {option.description}
                    </span>
                    {'icon' in option && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-medium">
                        {option.icon}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Continue button for multi-select */}
            {currentQuestion.multiSelect && (
              <button
                onClick={handleMultiSelectContinue}
                disabled={!answers[currentQuestion.id] || (answers[currentQuestion.id] as string[]).length === 0}
                className={clsx(
                  'w-full mt-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  answers[currentQuestion.id] && (answers[currentQuestion.id] as string[]).length > 0
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                )}
              >
                Continue →
              </button>
            )}

            {/* Skip option - only for single-select questions */}
            {!currentQuestion.multiSelect && currentStep > 0 && (
              <button
                onClick={() => handleAnswer(currentQuestion.id, 'any')}
                className="w-full mt-3 py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Skip this question
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer - show subreddits being searched */}
      {!isComplete && !isLoading && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-600">
          <div className="flex flex-wrap gap-1">
            {['travel', 'luxurytravel', 'hotels', 'fatfire'].map(sub => (
              <span
                key={sub}
                className="text-[9px] px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 rounded-full"
              >
                r/{sub}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
