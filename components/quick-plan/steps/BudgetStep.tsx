'use client';

import { useState, useEffect } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { DollarSign, Sparkles } from 'lucide-react';
import clsx from 'clsx';

const BUDGET_PRESETS = [
  { min: 100, max: 200, label: 'Budget-friendly', description: '$100-200/night' },
  { min: 200, max: 400, label: 'Mid-range', description: '$200-400/night' },
  { min: 400, max: 700, label: 'Upscale', description: '$400-700/night' },
  { min: 700, max: 1500, label: 'Luxury', description: '$700+/night' },
];

export default function BudgetStep() {
  const { preferences, setBudget } = useQuickPlanStore();
  const [minBudget, setMinBudget] = useState(preferences.budgetPerNight.min || 150);
  const [maxBudget, setMaxBudget] = useState(preferences.budgetPerNight.max || 350);
  const [flexNights, setFlexNights] = useState(preferences.flexNights || 0);

  useEffect(() => {
    setBudget(minBudget, maxBudget, flexNights);
  }, [minBudget, maxBudget, flexNights, setBudget]);

  const selectPreset = (preset: typeof BUDGET_PRESETS[0]) => {
    setMinBudget(preset.min);
    setMaxBudget(preset.max);
  };

  const isPresetSelected = (preset: typeof BUDGET_PRESETS[0]) => {
    return minBudget === preset.min && maxBudget === preset.max;
  };

  const totalEstimate = ((minBudget + maxBudget) / 2) * preferences.tripLength;

  return (
    <div className="space-y-6">
      {/* Budget presets */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">
          What's your nightly budget for accommodations?
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BUDGET_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => selectPreset(preset)}
              className={clsx(
                'p-4 rounded-xl border transition-all text-left',
                isPresetSelected(preset)
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-orange-300'
              )}
            >
              <p
                className={clsx(
                  'font-medium',
                  isPresetSelected(preset) ? 'text-orange-700' : 'text-slate-700'
                )}
              >
                {preset.label}
              </p>
              <p className="text-sm text-slate-500">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom range */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-4">
          Or set a custom range:
        </h4>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">$</span>
            <input
              type="number"
              value={minBudget}
              onChange={(e) => setMinBudget(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              min={0}
            />
          </div>
          <span className="text-slate-400">to</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">$</span>
            <input
              type="number"
              value={maxBudget}
              onChange={(e) => setMaxBudget(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              min={minBudget}
            />
          </div>
          <span className="text-slate-500">per night</span>
        </div>
      </div>

      {/* Flex nights */}
      <div className="bg-slate-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-900">Splurge nights</h4>
            <p className="text-sm text-slate-500 mb-3">
              Allow a few nights above your budget for special accommodations?
            </p>
            <div className="flex items-center gap-3">
              <select
                value={flexNights}
                onChange={(e) => setFlexNights(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={0}>No splurge nights</option>
                <option value={1}>1 splurge night</option>
                <option value={2}>2 splurge nights</option>
                <option value={3}>3 splurge nights</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Estimate */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-orange-600" />
          <span className="font-medium text-orange-800">Estimated hotel cost</span>
        </div>
        <p className="text-2xl font-bold text-orange-900">
          ${totalEstimate.toLocaleString()}
        </p>
        <p className="text-sm text-orange-600">
          for {preferences.tripLength} nights at ${minBudget}-${maxBudget}/night
        </p>
      </div>
    </div>
  );
}
