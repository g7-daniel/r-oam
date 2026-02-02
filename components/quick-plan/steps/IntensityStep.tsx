'use client';

import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Zap } from 'lucide-react';
import clsx from 'clsx';

const INTENSITY_LEVELS = [
  { value: 1, label: 'Light', description: 'Once during the trip' },
  { value: 2, label: 'Moderate', description: 'A couple times' },
  { value: 3, label: 'Regular', description: 'Every other day' },
  { value: 4, label: 'Intensive', description: 'Most days' },
];

export default function IntensityStep() {
  const { preferences, updateActivityIntensity } = useQuickPlanStore();

  const selectedActivities = preferences.selectedActivities.filter(
    (a) => a.priority === 'must-do'
  );

  if (selectedActivities.length === 0) {
    return (
      <div className="text-center py-12">
        <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">
          No must-do activities selected. Go back to select some activities first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Let's dial in how often you want to do each must-do activity during your{' '}
        {preferences.tripLength}-night trip.
      </p>

      {selectedActivities.map((activity) => (
        <div
          key={activity.type}
          className="bg-slate-50 rounded-xl p-4"
        >
          <h3 className="font-medium text-slate-900 capitalize mb-3">
            {activity.type.replace('_', ' ')}
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {INTENSITY_LEVELS.map((level) => {
              const targetDays = Math.ceil((level.value / 4) * preferences.tripLength);
              const isSelected = activity.targetDays === targetDays;

              return (
                <button
                  key={level.value}
                  onClick={() =>
                    updateActivityIntensity(activity.type, { targetDays })
                  }
                  className={clsx(
                    'p-3 rounded-lg border transition-all text-center',
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-orange-300'
                  )}
                >
                  <p
                    className={clsx(
                      'text-sm font-medium',
                      isSelected ? 'text-orange-700' : 'text-slate-700'
                    )}
                  >
                    {level.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    ~{targetDays} day{targetDays !== 1 ? 's' : ''}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
