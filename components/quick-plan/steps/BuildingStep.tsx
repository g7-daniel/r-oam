'use client';

import { useEffect, useState } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Loader2, Check, Calendar, Building, Utensils, Activity } from 'lucide-react';

const BUILD_STEPS = [
  { id: 'skeleton', label: 'Building trip structure', icon: Calendar },
  { id: 'hotels', label: 'Confirming hotels', icon: Building },
  { id: 'dining', label: 'Arranging dining', icon: Utensils },
  { id: 'activities', label: 'Scheduling activities', icon: Activity },
];

export default function BuildingStep() {
  const { preferences, setItinerary, setQualityCheckResult, goToNextState } = useQuickPlanStore();
  const [currentBuildStep, setCurrentBuildStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    buildItinerary();
  }, []);

  const buildItinerary = async () => {
    setError(null);

    // Simulate progress through build steps
    for (let i = 0; i < BUILD_STEPS.length; i++) {
      setCurrentBuildStep(i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      // Call the API to generate the itinerary
      const response = await fetch('/api/quick-plan/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            ...preferences,
            selectedHotels: preferences.selectedHotels || {},
            selectedRestaurants: {},
          },
          areas: preferences.selectedAreas,
          hotels: preferences.selectedHotels || {},
          restaurants: {},
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setItinerary(data.itinerary);
      setQualityCheckResult(data.qualityCheck);

      // Auto-advance after a brief delay
      setTimeout(() => {
        goToNextState();
      }, 1500);
    } catch (err) {
      setError('Failed to build itinerary. Please try again.');
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={buildItinerary}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
        <h2 className="text-lg font-medium text-slate-900">
          Building your itinerary...
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          This will just take a moment
        </p>
      </div>

      <div className="space-y-4">
        {BUILD_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isComplete = index < currentBuildStep;
          const isCurrent = index === currentBuildStep;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                isCurrent ? 'bg-orange-50' : isComplete ? 'bg-green-50' : 'bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isComplete
                    ? 'bg-green-500'
                    : isCurrent
                    ? 'bg-orange-500'
                    : 'bg-slate-200'
                }`}
              >
                {isComplete ? (
                  <Check className="w-4 h-4 text-white" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isComplete
                    ? 'text-green-700'
                    : isCurrent
                    ? 'text-orange-700'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
