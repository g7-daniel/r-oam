'use client';

import { Check } from 'lucide-react';
import clsx from 'clsx';

interface Step {
  number: number;
  title: string;
  shortTitle: string;
}

// New 7-step experience-first flow
const steps: Step[] = [
  { number: 1, title: 'Destinations', shortTitle: 'Destinations' },
  { number: 2, title: 'AI Discovery', shortTitle: 'Chat' },
  { number: 3, title: 'Experiences', shortTitle: 'Experiences' },
  { number: 4, title: 'Hotels', shortTitle: 'Hotels' },
  { number: 5, title: 'Flights', shortTitle: 'Flights' },
  { number: 6, title: 'Details', shortTitle: 'Details' },
  { number: 7, title: 'Itinerary', shortTitle: 'Plan' },
];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function StepIndicator({
  currentStep,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <nav className="w-full" aria-label="Trip planning progress">
      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-between" role="list">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center" role="listitem">
            <button
              onClick={() => onStepClick?.(step.number)}
              disabled={step.number > currentStep}
              aria-label={`Step ${step.number}: ${step.title}${step.number === currentStep ? ' (current)' : step.number < currentStep ? ' (completed)' : ''}`}
              aria-current={step.number === currentStep ? 'step' : undefined}
              className={clsx(
                'flex flex-col items-center gap-2 transition-all duration-300',
                step.number <= currentStep
                  ? 'cursor-pointer'
                  : 'cursor-not-allowed opacity-50'
              )}
            >
              <div
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300',
                  step.number < currentStep &&
                    'bg-accent-500 text-white',
                  step.number === currentStep &&
                    'bg-reddit text-white ring-4 ring-reddit-100',
                  step.number > currentStep &&
                    'bg-reddit-gray-200 text-reddit-gray-500'
                )}
              >
                {step.number < currentStep ? (
                  <Check className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{step.number}</span>
                )}
              </div>
              <span
                className={clsx(
                  'text-sm font-medium',
                  step.number === currentStep
                    ? 'text-reddit'
                    : step.number < currentStep
                    ? 'text-accent-600'
                    : 'text-reddit-gray-400'
                )}
              >
                {step.title}
              </span>
            </button>

            {index < steps.length - 1 && (
              <div
                className={clsx(
                  'w-12 lg:w-20 h-1 mx-2 rounded-full transition-colors duration-300',
                  step.number < currentStep
                    ? 'bg-accent-500'
                    : 'bg-reddit-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-reddit-gray-500">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-sm font-medium text-reddit">
            {steps[currentStep - 1]?.title}
          </span>
        </div>
        <div className="h-2 bg-reddit-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={steps.length} aria-label={`Progress: Step ${currentStep} of ${steps.length}`}>
          <div
            className="h-full bg-gradient-reddit transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((step) => (
            <button
              key={step.number}
              onClick={() => onStepClick?.(step.number)}
              disabled={step.number > currentStep}
              aria-label={`Step ${step.number}: ${step.title}${step.number === currentStep ? ' (current)' : step.number < currentStep ? ' (completed)' : ''}`}
              aria-current={step.number === currentStep ? 'step' : undefined}
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                step.number < currentStep &&
                  'bg-accent-500 text-white',
                step.number === currentStep &&
                  'bg-reddit text-white',
                step.number > currentStep &&
                  'bg-reddit-gray-100 text-reddit-gray-400'
              )}
            >
              {step.number < currentStep ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <span aria-hidden="true">{step.number}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
