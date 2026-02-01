'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTripStore } from '@/stores/tripStore';
import StepIndicator from './StepIndicator';
import Step1MultiDestination from './Step1MultiDestination';
import Step2DatesAndTravelers from './Step2DatesAndTravelers';
import Step3BudgetEnhanced from './Step3BudgetEnhanced';
import Step4AIInterview from './Step4AIInterview';
import Step5Flights from './Step5Flights';
import Step6Hotels from './Step6Hotels';
import Step7ExperiencesChat from './Step7ExperiencesChat';
import Step8Experiences from './Step8Experiences';
import Step9Itinerary from './Step9Itinerary';
import Button from '@/components/ui/Button';
import { ArrowLeft, ArrowRight, RotateCcw, Check } from 'lucide-react';

// New 7-Step Experience-First Flow:
// 1. Pick Destinations
// 2. AI Experience Interview (per destination)
// 3. Browse & Select Experiences (with map)
// 4. Hotels (near selected experiences)
// 5. Flights (between destinations)
// 6. Dates & Travelers
// 7. Visual Itinerary with Map
const TOTAL_STEPS = 7;

export default function JourneyWizard() {
  const searchParams = useSearchParams();
  const {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    resetTrip,
    legs,
    activeLegId,
    origin,
    dates,
    budget,
    getChatSession,
  } = useTripStore();

  // Handle destination from URL params
  useEffect(() => {
    const destParam = searchParams.get('destination');
    if (destParam && currentStep === 1) {
      // Pre-fill destination from URL - this would trigger a search
    }
  }, [searchParams, currentStep]);

  const activeLeg = legs.find((l) => l.id === activeLegId);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Destinations - at least one destination
        return legs.length > 0;
      case 2:
        // Step 2: AI Interview - at least one leg with completed interview
        return legs.some((leg) => {
          const session = getChatSession(leg.id, 'destination');
          return session?.isComplete && session.selectedSuggestions.length > 0;
        });
      case 3:
        // Step 3: Experiences - optional, can always proceed
        return true;
      case 4:
        // Step 4: Hotels - at least one leg should have a hotel
        return legs.some((leg) => leg.hotel);
      case 5:
        // Step 5: Flights - at least one leg should have a flight
        return legs.some((leg) => leg.inboundFlight || leg.outboundFlight);
      case 6:
        // Step 6: Dates & Travelers - origin and dates required
        return !!(origin && dates.startDate && dates.endDate);
      case 7:
        // Step 7: Itinerary - always ready
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Pick Destinations
        return <Step1MultiDestination />;
      case 2:
        // Step 2: AI Experience Interview (per destination)
        return <Step4AIInterview />;
      case 3:
        // Step 3: Browse & Select Experiences (with map)
        return <Step8Experiences />;
      case 4:
        // Step 4: Hotels (near selected experiences)
        return <Step6Hotels />;
      case 5:
        // Step 5: Flights (between destinations)
        return <Step5Flights />;
      case 6:
        // Step 6: Dates & Travelers + Budget
        return (
          <div className="space-y-8">
            <Step2DatesAndTravelers />
            <Step3BudgetEnhanced />
          </div>
        );
      case 7:
        // Step 7: Visual Itinerary with Map
        return <Step9Itinerary />;
      default:
        return <Step1MultiDestination />;
    }
  };

  const getStepCompletionInfo = () => {
    switch (currentStep) {
      case 3: {
        // Step 3: Experiences
        const totalExperiences = legs.reduce(
          (sum, l) => sum + l.experiences.length,
          0
        );
        return totalExperiences > 0
          ? `${totalExperiences} experiences selected`
          : null;
      }
      case 4: {
        // Step 4: Hotels
        const legsWithHotels = legs.filter((l) => l.hotel).length;
        return legsWithHotels > 0
          ? `${legsWithHotels}/${legs.length} hotels selected`
          : null;
      }
      case 5: {
        // Step 5: Flights
        const legsWithFlights = legs.filter(
          (l) => l.inboundFlight || l.outboundFlight
        ).length;
        return legsWithFlights > 0
          ? `${legsWithFlights}/${legs.length} flights selected`
          : null;
      }
      default:
        return null;
    }
  };

  const completionInfo = getStepCompletionInfo();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <StepIndicator
          currentStep={currentStep}
          onStepClick={(step) => {
            if (step <= currentStep) {
              setCurrentStep(step);
            }
          }}
        />
      </div>

      {/* Step content */}
      <div className="min-h-[500px]">{renderStep()}</div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
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
            className="text-gray-400 hover:text-gray-600"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {completionInfo && (
            <span className="text-sm text-slate-500 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-500" />
              {completionInfo}
            </span>
          )}

          {currentStep < TOTAL_STEPS ? (
            <Button
              variant="primary"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              variant="accent"
              onClick={() => {
                // Final step - could export or save the trip
              }}
            >
              Complete Trip
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Budget summary (shown from step 5 onwards) */}
      {currentStep >= 5 && (
        <div className="mt-6 p-4 bg-primary-50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-sm text-gray-600">Total Budget</span>
              <p className="font-bold text-lg">${budget.total.toLocaleString()}</p>
            </div>
            <div className="w-px h-10 bg-primary-200" />
            <div>
              <span className="text-sm text-gray-600">Remaining</span>
              <p className="font-bold text-lg text-primary-600">
                ${budget.remaining.toLocaleString()}
              </p>
            </div>
            {legs.length > 1 && (
              <>
                <div className="w-px h-10 bg-primary-200" />
                <div>
                  <span className="text-sm text-gray-600">Destinations</span>
                  <p className="font-bold text-lg">{legs.length}</p>
                </div>
              </>
            )}
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-4">
            {legs.filter((l) => l.inboundFlight || l.outboundFlight).length > 0 && (
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-500" />
                Flights
              </span>
            )}
            {legs.filter((l) => l.hotel).length > 0 && (
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-500" />
                Hotels
              </span>
            )}
            {legs.reduce((sum, l) => sum + l.experiences.length, 0) > 0 && (
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-500" />
                Experiences
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
