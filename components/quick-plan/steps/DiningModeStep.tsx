'use client';

import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Utensils, Calendar, List, X } from 'lucide-react';
import clsx from 'clsx';

const DINING_MODES = [
  {
    id: 'schedule' as const,
    icon: Calendar,
    title: 'Scheduled Dinners',
    description: 'Get specific restaurant recommendations for each day',
    details: 'I\'ll suggest restaurants and help you plan reservations',
  },
  {
    id: 'list' as const,
    icon: List,
    title: 'Restaurant List',
    description: 'Get a curated list of restaurants to choose from',
    details: 'Flexible dining - pick from the list when you\'re ready',
  },
  {
    id: 'none' as const,
    icon: X,
    title: 'Skip Dining Planning',
    description: 'I\'ll focus on activities and hotels only',
    details: 'You\'ll handle dining on your own',
  },
];

export default function DiningModeStep() {
  const { preferences, setDiningMode } = useQuickPlanStore();

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        How would you like to handle dining for this trip?
      </p>

      <div className="space-y-3">
        {DINING_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = preferences.diningMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => setDiningMode(mode.id)}
              className={clsx(
                'w-full p-4 rounded-xl border transition-all text-left',
                isSelected
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-orange-300'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    isSelected ? 'bg-orange-100' : 'bg-slate-100'
                  )}
                >
                  <Icon
                    className={clsx(
                      'w-6 h-6',
                      isSelected ? 'text-orange-600' : 'text-slate-500'
                    )}
                  />
                </div>
                <div className="flex-1">
                  <h3
                    className={clsx(
                      'font-medium',
                      isSelected ? 'text-orange-900' : 'text-slate-900'
                    )}
                  >
                    {mode.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{mode.description}</p>
                  <p className="text-xs text-slate-500 mt-2">{mode.details}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {preferences.diningMode && preferences.diningMode !== 'none' && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-orange-800">
          <strong>Selected:</strong>{' '}
          {DINING_MODES.find((m) => m.id === preferences.diningMode)?.title}
        </div>
      )}
    </div>
  );
}
