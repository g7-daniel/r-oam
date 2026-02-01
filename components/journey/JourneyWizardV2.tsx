'use client';

import { useMemo } from 'react';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import TripSummary from './TripSummary';
import Step1TripBasics from './Step1TripBasics';
import Step2Destinations from './Step2Destinations';
import Step3AIDiscovery from './Step3AIDiscovery';
import Step8Review from './Step8Review';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  MapPin,
  Sparkles,
  Calendar,
  ClipboardCheck,
} from 'lucide-react';
import clsx from 'clsx';

// NEW SIMPLIFIED FLOW: Destination First!
// 1. Where do you want to go? (Destinations)
// 2. When are you going? (Dates - combined with basics, optional)
// 3. Build your itinerary (AI Discovery + day-by-day view)
// 4. Review and finalize
const STEPS = [
  { number: 1, title: 'Destination', shortTitle: 'Destination', icon: MapPin },
  { number: 2, title: 'Dates & Details', shortTitle: 'Details', icon: Calendar },
  { number: 3, title: 'Build Itinerary', shortTitle: 'Build', icon: Sparkles },
  { number: 4, title: 'Review', shortTitle: 'Review', icon: ClipboardCheck },
];

export default function JourneyWizardV2() {
  const {
    trip,
    setCurrentStep,
    nextStep,
    prevStep,
    resetTrip,
  } = useTripStoreV2();

  const { currentStep, destinations } = trip;

  // Can proceed to next step? (SIMPLIFIED FLOW)
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1: // Destination - need at least one destination
        return destinations.length > 0;
      case 2: // Dates & Details - always optional, can skip
        return true;
      case 3: // Build Itinerary - always can proceed
        return true;
      case 4: // Review
        return true;
      default:
        return false;
    }
  }, [currentStep, destinations]);

  // Handle step navigation
  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  // Handle next step with side effects
  const handleNext = () => {
    // Special handling for Build Itinerary step (step 3)
    // Mark all destinations as discovery complete when moving to Review
    if (currentStep === 3) {
      destinations.forEach(d => {
        if (!d.discovery.isComplete) {
          useTripStoreV2.getState().completeDiscovery(d.destinationId);
        }
      });
    }
    nextStep();
  };

  // Render current step content
  // NEW SIMPLIFIED 4-STEP FLOW:
  // 1. Destination (Where do you want to go?)
  // 2. Dates & Details (When, who, optional)
  // 3. Build Itinerary (AI Discovery + day-by-day)
  // 4. Review (Final summary)
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step2Destinations />;
      case 2:
        return <Step1TripBasics />;
      case 3:
        return <Step3AIDiscovery />;
      case 4:
        return <Step8Review />;
      default:
        return <Step2Destinations />;
    }
  };

  // Get step completion info for the new 4-step flow
  const getCompletionInfo = () => {
    switch (currentStep) {
      case 1: {
        // Destination step - show how many destinations added
        return destinations.length > 0 ? `${destinations.length} destination${destinations.length === 1 ? '' : 's'} added` : null;
      }
      case 3: {
        // Build Itinerary step - show experiences added
        const total = destinations.reduce(
          (sum, d) => sum + d.experiences.selectedExperienceIds.length,
          0
        );
        return total > 0 ? `${total} experience${total === 1 ? '' : 's'} added` : null;
      }
      default:
        return null;
    }
  };

  const completionInfo = getCompletionInfo();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Step indicator */}
          <div className="mb-8">
            {/* Desktop view */}
            <div className="hidden lg:flex items-center justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isComplete = step.number < currentStep;
                const isCurrent = step.number === currentStep;
                const isFuture = step.number > currentStep;

                return (
                  <div key={step.number} className="flex items-center">
                    <button
                      onClick={() => handleStepClick(step.number)}
                      disabled={isFuture}
                      className={clsx(
                        'flex flex-col items-center gap-2 transition-all',
                        isFuture ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      )}
                    >
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                          isComplete && 'bg-green-500 text-white',
                          isCurrent && 'bg-reddit text-white ring-4 ring-reddit-100',
                          isFuture && 'bg-reddit-gray-200 text-reddit-gray-500'
                        )}
                      >
                        {isComplete ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span
                        className={clsx(
                          'text-xs font-medium',
                          isCurrent ? 'text-reddit' : isComplete ? 'text-green-600' : 'text-reddit-gray-400'
                        )}
                      >
                        {step.shortTitle}
                      </span>
                    </button>

                    {index < STEPS.length - 1 && (
                      <div
                        className={clsx(
                          'w-8 xl:w-12 h-1 mx-2 rounded-full transition-colors',
                          isComplete ? 'bg-green-500' : 'bg-reddit-gray-200'
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile view */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-reddit-gray-500">
                  Step {currentStep} of {STEPS.length}
                </span>
                <span className="text-sm font-medium text-reddit">
                  {STEPS[currentStep - 1]?.title}
                </span>
              </div>
              <div className="h-2 bg-reddit-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-reddit transition-all"
                  style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                {STEPS.map((step) => {
                  const Icon = step.icon;
                  const isComplete = step.number < currentStep;
                  const isCurrent = step.number === currentStep;

                  return (
                    <button
                      key={step.number}
                      onClick={() => handleStepClick(step.number)}
                      disabled={step.number > currentStep}
                      className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                        isComplete && 'bg-green-500 text-white',
                        isCurrent && 'bg-reddit text-white',
                        step.number > currentStep && 'bg-reddit-gray-100 text-reddit-gray-400'
                      )}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="min-h-[500px]">{renderStep()}</div>

          {/* Navigation - extra bottom padding to account for sticky cart */}
          <div className="mt-8 pb-24 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentStep > 1 && (
                <Button variant="ghost" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={resetTrip}
                className="text-slate-400 hover:text-slate-600"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            </div>

            <div className="flex items-center gap-4">
              {completionInfo && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-500" />
                  {completionInfo}
                </span>
              )}

              {currentStep < STEPS.length ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={!canProceed}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  variant="accent"
                  onClick={() => {
                    // Final step - export or complete
                  }}
                >
                  Complete Trip
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Trip Summary sidebar - show from step 2 onwards */}
        {currentStep >= 2 && (
          <div className="hidden xl:block w-80 flex-shrink-0">
            <div className="sticky top-4">
              <TripSummary />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
