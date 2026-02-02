'use client';

import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { SplitSquareVertical, Check, Clock, MapPin } from 'lucide-react';
import { generateSplitOptions } from '@/lib/quick-plan/area-discovery';
import clsx from 'clsx';

export default function AreaSplitStep() {
  const { preferences, setSelectedSplit, discoveredAreas } = useQuickPlanStore();

  // Generate split options based on selected areas
  const splitOptions = generateSplitOptions(
    preferences.selectedAreas.length > 0 ? preferences.selectedAreas : discoveredAreas.slice(0, 3),
    preferences
  );

  const selectedSplitId = preferences.selectedSplit?.id;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        How would you like to split your {preferences.tripLength}-night trip?
      </p>

      <div className="space-y-4">
        {splitOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setSelectedSplit({
              id: option.id,
              name: option.name,
              description: option.description,
              stops: option.areas.map((a, idx) => ({
                areaId: a.area.id,
                area: a.area,
                nights: a.nights,
                order: idx,
                arrivalDay: 1,
                departureDay: a.nights + 1,
                isArrivalCity: idx === 0,
                isDepartureCity: idx === option.areas.length - 1,
                travelDayBefore: idx > 0,
              })),
              fitScore: 0.9,
              frictionScore: 0.1,
              feasibilityScore: 0.9,
              whyThisWorks: option.pros[0] || '',
              tradeoffs: option.cons,
            })}
            className={clsx(
              'w-full p-4 rounded-xl border transition-all text-left',
              selectedSplitId === option.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-slate-200 hover:border-orange-300'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <SplitSquareVertical className="w-5 h-5 text-orange-500" />
                  <h3 className="font-medium text-slate-900">{option.name}</h3>
                </div>
                <p className="text-sm text-slate-600">{option.description}</p>

                {/* Area breakdown */}
                <div className="mt-3 space-y-2">
                  {option.areas.map(({ area, nights }, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{area.name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{nights} nights</span>
                    </div>
                  ))}
                </div>

                {/* Pros and cons */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {option.pros.slice(0, 2).map((pro, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full"
                    >
                      ✓ {pro}
                    </span>
                  ))}
                  {option.cons.slice(0, 1).map((con, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full"
                    >
                      ⚠ {con}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selection indicator */}
              <div
                className={clsx(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3',
                  selectedSplitId === option.id
                    ? 'border-orange-500 bg-orange-500'
                    : 'border-slate-300'
                )}
              >
                {selectedSplitId === option.id && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Summary */}
      {preferences.selectedSplit && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <p className="text-sm text-orange-800">
            <strong>Selected:</strong> {preferences.selectedSplit.description}
          </p>
        </div>
      )}
    </div>
  );
}
