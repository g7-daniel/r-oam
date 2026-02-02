'use client';

import { useEffect, useMemo } from 'react';
import { useQuickPlanStore, useCurrentState, usePreferences, useProgress, useStateMetadata } from '@/lib/quick-plan/store';
import { STATE_METADATA } from '@/lib/quick-plan/state-machine';
import { QuickPlanState } from '@/types/quick-plan';
import Button from '@/components/ui/Button';
import clsx from 'clsx';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Sparkles,
  Activity,
  Scale,
  Map,
  SplitSquareVertical,
  Lock,
  Building,
  Utensils,
  ClipboardList,
  CheckCircle,
  Edit3,
  ThumbsUp,
  Zap,
} from 'lucide-react';

// Step components (to be created)
import DestinationStep from './steps/DestinationStep';
import DatesStep from './steps/DatesStep';
import PartyStep from './steps/PartyStep';
import BudgetStep from './steps/BudgetStep';
import VibeStep from './steps/VibeStep';
import ActivitiesStep from './steps/ActivitiesStep';
import IntensityStep from './steps/IntensityStep';
import TradeoffsStep from './steps/TradeoffsStep';
import AreaDiscoveryStep from './steps/AreaDiscoveryStep';
import AreaSplitStep from './steps/AreaSplitStep';
import PreferencesLockStep from './steps/PreferencesLockStep';
import HotelsStep from './steps/HotelsStep';
import DiningModeStep from './steps/DiningModeStep';
import DiningStep from './steps/DiningStep';
import BuildingStep from './steps/BuildingStep';
import QualityCheckStep from './steps/QualityCheckStep';
import ReviewStep from './steps/ReviewStep';
import SatisfactionStep from './steps/SatisfactionStep';

// State to icon mapping
const STATE_ICONS: Record<QuickPlanState, React.ComponentType<{ className?: string }>> = {
  DESTINATION: MapPin,
  DATES_OR_LENGTH: Calendar,
  PARTY: Users,
  BUDGET: DollarSign,
  VIBE_AND_HARD_NOS: Sparkles,
  ACTIVITIES_PICK: Activity,
  ACTIVITY_INTENSITY: Zap,
  TRADEOFFS_RESOLUTION: Scale,
  AREA_DISCOVERY: Map,
  AREA_SPLIT_SELECTION: SplitSquareVertical,
  PREFERENCES_REVIEW_LOCK: Lock,
  HOTELS_SHORTLIST_AND_PICK: Building,
  DINING_MODE: Utensils,
  DINING_SHORTLIST_AND_PICK: Utensils,
  DAILY_ITINERARY_BUILD: ClipboardList,
  QUALITY_SELF_CHECK: CheckCircle,
  FINAL_REVIEW_AND_EDIT_LOOP: Edit3,
  SATISFACTION_GATE: ThumbsUp,
};

// Grouped steps for mobile progress
const STEP_GROUPS = [
  { name: 'Basics', states: ['DESTINATION', 'DATES_OR_LENGTH', 'PARTY', 'BUDGET'] },
  { name: 'Preferences', states: ['VIBE_AND_HARD_NOS', 'ACTIVITIES_PICK', 'ACTIVITY_INTENSITY', 'TRADEOFFS_RESOLUTION'] },
  { name: 'Areas', states: ['AREA_DISCOVERY', 'AREA_SPLIT_SELECTION', 'PREFERENCES_REVIEW_LOCK'] },
  { name: 'Hotels & Dining', states: ['HOTELS_SHORTLIST_AND_PICK', 'DINING_MODE', 'DINING_SHORTLIST_AND_PICK'] },
  { name: 'Finalize', states: ['DAILY_ITINERARY_BUILD', 'QUALITY_SELF_CHECK', 'FINAL_REVIEW_AND_EDIT_LOOP', 'SATISFACTION_GATE'] },
];

export default function QuickPlanWizard() {
  const currentState = useCurrentState();
  const preferences = usePreferences();
  const progress = useProgress();
  const stateMetadata = useStateMetadata();
  const { goToNextState, goToPreviousState, canGoBack, canGoForward, reset, detectAndSetTradeoffs } = useQuickPlanStore();

  // Detect tradeoffs when entering that state
  useEffect(() => {
    if (currentState === 'TRADEOFFS_RESOLUTION') {
      detectAndSetTradeoffs();
    }
  }, [currentState, detectAndSetTradeoffs]);

  // Get current group index
  const currentGroupIndex = useMemo(() => {
    for (let i = 0; i < STEP_GROUPS.length; i++) {
      if (STEP_GROUPS[i].states.includes(currentState)) {
        return i;
      }
    }
    return 0;
  }, [currentState]);

  // Render step content
  const renderStep = () => {
    switch (currentState) {
      case 'DESTINATION':
        return <DestinationStep />;
      case 'DATES_OR_LENGTH':
        return <DatesStep />;
      case 'PARTY':
        return <PartyStep />;
      case 'BUDGET':
        return <BudgetStep />;
      case 'VIBE_AND_HARD_NOS':
        return <VibeStep />;
      case 'ACTIVITIES_PICK':
        return <ActivitiesStep />;
      case 'ACTIVITY_INTENSITY':
        return <IntensityStep />;
      case 'TRADEOFFS_RESOLUTION':
        return <TradeoffsStep />;
      case 'AREA_DISCOVERY':
        return <AreaDiscoveryStep />;
      case 'AREA_SPLIT_SELECTION':
        return <AreaSplitStep />;
      case 'PREFERENCES_REVIEW_LOCK':
        return <PreferencesLockStep />;
      case 'HOTELS_SHORTLIST_AND_PICK':
        return <HotelsStep />;
      case 'DINING_MODE':
        return <DiningModeStep />;
      case 'DINING_SHORTLIST_AND_PICK':
        return <DiningStep />;
      case 'DAILY_ITINERARY_BUILD':
        return <BuildingStep />;
      case 'QUALITY_SELF_CHECK':
        return <QualityCheckStep />;
      case 'FINAL_REVIEW_AND_EDIT_LOOP':
        return <ReviewStep />;
      case 'SATISFACTION_GATE':
        return <SatisfactionStep />;
      default:
        return <DestinationStep />;
    }
  };

  const Icon = STATE_ICONS[currentState];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header with progress */}
      <div className="mb-8">
        {/* Desktop progress */}
        <div className="hidden lg:block">
          <div className="flex items-center justify-between mb-4">
            {STEP_GROUPS.map((group, index) => {
              const isComplete = index < currentGroupIndex;
              const isCurrent = index === currentGroupIndex;
              const isFuture = index > currentGroupIndex;

              return (
                <div key={group.name} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                        isComplete && 'bg-green-500 text-white',
                        isCurrent && 'bg-orange-500 text-white ring-4 ring-orange-100',
                        isFuture && 'bg-slate-200 text-slate-500'
                      )}
                    >
                      {isComplete ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <span
                      className={clsx(
                        'text-xs mt-1 font-medium',
                        isCurrent ? 'text-orange-600' : isComplete ? 'text-green-600' : 'text-slate-400'
                      )}
                    >
                      {group.name}
                    </span>
                  </div>
                  {index < STEP_GROUPS.length - 1 && (
                    <div
                      className={clsx(
                        'flex-1 h-1 mx-3 rounded-full transition-colors',
                        isComplete ? 'bg-green-500' : 'bg-slate-200'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile progress */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">
              {STEP_GROUPS[currentGroupIndex]?.name}
            </span>
            <span className="text-sm font-medium text-orange-600">
              {progress}% complete
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current step header */}
        <div className="flex items-center gap-3 mt-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <Icon className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {stateMetadata.title}
            </h1>
            <p className="text-sm text-slate-500">
              {stateMetadata.description}
            </p>
          </div>
        </div>
      </div>

      {/* Chat-like assistant prompt */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <p className="text-slate-700 text-sm leading-relaxed">
            {stateMetadata.chatPrompt}
          </p>
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[400px] mb-8">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-6">
        <div className="flex items-center gap-3">
          {canGoBack() && (
            <Button
              variant="ghost"
              onClick={goToPreviousState}
              className="text-slate-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={reset}
            className="text-slate-400 hover:text-slate-600"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>

        <Button
          variant="primary"
          onClick={goToNextState}
          disabled={!canGoForward()}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {currentState === 'SATISFACTION_GATE' ? (
            <>
              Finish
              <Check className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
