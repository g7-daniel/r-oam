'use client';

import { useState, useEffect } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { ActivityIntent } from '@/types/quick-plan';
import { Check } from 'lucide-react';
import clsx from 'clsx';

// Available activity types
const ACTIVITY_OPTIONS = [
  { type: 'beach', label: 'Beach & Relaxation', emoji: '🏖️', description: 'Sunbathing, swimming, beach walks' },
  { type: 'surf', label: 'Surfing', emoji: '🏄', description: 'Catch some waves' },
  { type: 'snorkel', label: 'Snorkeling', emoji: '🤿', description: 'Explore underwater life' },
  { type: 'diving', label: 'Scuba Diving', emoji: '🐠', description: 'Deep sea exploration' },
  { type: 'hiking', label: 'Hiking', emoji: '🥾', description: 'Trail walks and mountain hikes' },
  { type: 'adventure', label: 'Adventure Sports', emoji: '🧗', description: 'Zip-lining, rafting, ATV' },
  { type: 'golf', label: 'Golf', emoji: '⛳', description: 'Play a round' },
  { type: 'spa', label: 'Spa & Wellness', emoji: '💆', description: 'Massages and treatments' },
  { type: 'nightlife', label: 'Nightlife', emoji: '🍸', description: 'Bars, clubs, evening entertainment' },
  { type: 'culture', label: 'Culture & History', emoji: '🏛️', description: 'Museums, historic sites' },
  { type: 'food_tour', label: 'Food & Culinary', emoji: '🍽️', description: 'Food tours, cooking classes' },
  { type: 'shopping', label: 'Shopping', emoji: '🛍️', description: 'Markets and boutiques' },
  { type: 'kayak', label: 'Kayaking', emoji: '🛶', description: 'Paddle through bays and rivers' },
  { type: 'paddleboard', label: 'Paddleboarding', emoji: '🏄‍♀️', description: 'SUP on calm waters' },
  { type: 'swimming', label: 'Swimming', emoji: '🏊', description: 'Pools and calm waters' },
];

export default function ActivitiesStep() {
  const { preferences, setActivities } = useQuickPlanStore();
  const [selected, setSelected] = useState<Map<string, 'must-do' | 'nice-to-have'>>(
    new Map(preferences.selectedActivities.map(a => [a.type, a.priority]))
  );

  useEffect(() => {
    const activities: ActivityIntent[] = Array.from(selected.entries()).map(([type, priority]) => ({
      type: type as ActivityIntent['type'],
      priority,
    }));
    setActivities(activities);
  }, [selected, setActivities]);

  const toggleActivity = (type: string) => {
    const newSelected = new Map(selected);

    if (!newSelected.has(type)) {
      // First click: add as must-do
      newSelected.set(type, 'must-do');
    } else if (newSelected.get(type) === 'must-do') {
      // Second click: change to nice-to-have
      newSelected.set(type, 'nice-to-have');
    } else {
      // Third click: remove
      newSelected.delete(type);
    }

    setSelected(newSelected);
  };

  const getSelectionState = (type: string) => {
    if (!selected.has(type)) return 'none';
    return selected.get(type);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
        <p className="mb-2">
          <strong>Click once</strong> to mark as <span className="text-orange-600 font-medium">must-do</span>
        </p>
        <p className="mb-2">
          <strong>Click twice</strong> to mark as <span className="text-blue-600 font-medium">nice-to-have</span>
        </p>
        <p>
          <strong>Click again</strong> to remove
        </p>
      </div>

      {/* Activity grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ACTIVITY_OPTIONS.map((activity) => {
          const state = getSelectionState(activity.type);

          return (
            <button
              key={activity.type}
              onClick={() => toggleActivity(activity.type)}
              className={clsx(
                'p-4 rounded-xl border transition-all text-left relative',
                state === 'must-do' && 'border-orange-500 bg-orange-50',
                state === 'nice-to-have' && 'border-blue-500 bg-blue-50',
                state === 'none' && 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
              )}
            >
              {/* Selection indicator */}
              {state !== 'none' && (
                <div
                  className={clsx(
                    'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center',
                    state === 'must-do' && 'bg-orange-500',
                    state === 'nice-to-have' && 'bg-blue-500'
                  )}
                >
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <span className="text-2xl">{activity.emoji}</span>
              <p
                className={clsx(
                  'font-medium mt-2',
                  state === 'must-do' && 'text-orange-700',
                  state === 'nice-to-have' && 'text-blue-700',
                  state === 'none' && 'text-slate-700'
                )}
              >
                {activity.label}
              </p>
              <p className="text-xs text-slate-500 mt-1">{activity.description}</p>

              {/* Priority badge */}
              {state !== 'none' && (
                <div
                  className={clsx(
                    'mt-2 text-xs font-medium px-2 py-1 rounded-full inline-block',
                    state === 'must-do' && 'bg-orange-100 text-orange-700',
                    state === 'nice-to-have' && 'bg-blue-100 text-blue-700'
                  )}
                >
                  {state === 'must-do' ? 'Must-do' : 'Nice-to-have'}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {selected.size > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <p className="text-sm text-orange-800">
            <strong>{selected.size} activities selected:</strong>{' '}
            {Array.from(selected.entries())
              .filter(([, priority]) => priority === 'must-do')
              .map(([type]) => ACTIVITY_OPTIONS.find(a => a.type === type)?.label)
              .join(', ') || 'None'}{' '}
            (must-do)
            {Array.from(selected.entries()).filter(([, priority]) => priority === 'nice-to-have').length > 0 && (
              <>
                {' + '}
                {Array.from(selected.entries())
                  .filter(([, priority]) => priority === 'nice-to-have')
                  .map(([type]) => ACTIVITY_OPTIONS.find(a => a.type === type)?.label)
                  .join(', ')}{' '}
                (nice-to-have)
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
