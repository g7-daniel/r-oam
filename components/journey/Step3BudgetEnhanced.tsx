'use client';

import { useState, useEffect } from 'react';
import { Plane, Hotel, Sparkles, Utensils, Car, Crown, Compass, Wallet, DollarSign } from 'lucide-react';
import { useTripStore, BUDGET_PRESETS } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import Slider from '@/components/ui/Slider';
import type { BudgetPreset, BudgetAllocation } from '@/types';
import clsx from 'clsx';

const presets: {
  id: BudgetPreset;
  name: string;
  icon: React.ReactNode;
  description: string;
  subreddits: string[];
}[] = [
  {
    id: 'luxury',
    name: 'Luxury Seeker',
    icon: <Crown className="w-6 h-6" />,
    description: 'Premium hotels, first-class flights',
    subreddits: ['r/fattravel', 'r/luxurytravel'],
  },
  {
    id: 'experience',
    name: 'Experience Hunter',
    icon: <Compass className="w-6 h-6" />,
    description: 'Unique experiences over comfort',
    subreddits: ['r/travel', 'r/solotravel'],
  },
  {
    id: 'budget',
    name: 'Budget Adventurer',
    icon: <Wallet className="w-6 h-6" />,
    description: 'Maximize value, minimize spend',
    subreddits: ['r/budgettravel', 'r/shoestring'],
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: <Sparkles className="w-6 h-6" />,
    description: 'Full control over allocation',
    subreddits: ['r/travel'],
  },
];

const allocationItems: {
  key: keyof BudgetAllocation;
  icon: React.ReactNode;
  label: string;
  color: string;
}[] = [
  { key: 'flights', icon: <Plane className="w-4 h-4" />, label: 'Flights', color: 'bg-blue-500' },
  { key: 'accommodation', icon: <Hotel className="w-4 h-4" />, label: 'Accommodation', color: 'bg-purple-500' },
  { key: 'experiences', icon: <Sparkles className="w-4 h-4" />, label: 'Experiences', color: 'bg-orange-500' },
  { key: 'food', icon: <Utensils className="w-4 h-4" />, label: 'Food & Dining', color: 'bg-green-500' },
  { key: 'transit', icon: <Car className="w-4 h-4" />, label: 'Local Transit', color: 'bg-gray-500' },
];

export default function Step3BudgetEnhanced() {
  const {
    legs,
    travelers,
    dates,
    budget,
    setBudget,
    updateBudgetAllocation,
    adjustLegBudget,
    distributeBudgetAcrossLegs,
  } = useTripStore();

  const [localTotal, setLocalTotal] = useState(budget.total.toString());
  const [showLegBreakdown, setShowLegBreakdown] = useState(false);

  const totalTravelers = travelers.adults + travelers.children;
  const totalDays = legs.reduce((sum, leg) => sum + (leg.days || 0), 0) || 7;

  const perPersonPerDay = budget.total > 0 && totalTravelers > 0 && totalDays > 0
    ? (budget.total / totalTravelers / totalDays).toFixed(0)
    : 0;

  const budgetTier = budget.total / totalTravelers >= 5000
    ? 'luxury'
    : budget.total / totalTravelers >= 2000
    ? 'mid-range'
    : 'budget';

  const handleTotalChange = (value: string) => {
    setLocalTotal(value);
    const numValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
    setBudget({
      ...budget,
      total: numValue,
      remaining: numValue,
    });
  };

  // Auto-distribute when total changes
  useEffect(() => {
    if (legs.length > 0) {
      distributeBudgetAcrossLegs();
    }
  }, [budget.total, legs.length]);

  const handlePresetChange = (presetId: BudgetPreset) => {
    const allocation = BUDGET_PRESETS[presetId];
    setBudget({
      ...budget,
      preset: presetId,
      allocation,
    });
  };

  const handleAllocationChange = (key: keyof BudgetAllocation, value: number) => {
    const currentTotal = Object.values(budget.allocation).reduce((a, b) => a + b, 0);
    const currentValue = budget.allocation[key];
    const diff = value - currentValue;

    if (currentTotal + diff > 100) {
      return;
    }

    updateBudgetAllocation({ [key]: value });
  };

  const handleLegBudgetChange = (legId: string, value: number) => {
    adjustLegBudget(legId, value);
  };

  const getAllocationAmount = (key: keyof BudgetAllocation) => {
    return Math.round((budget.allocation[key] / 100) * budget.total);
  };

  const totalAllocatedToLegs = legs.reduce((sum, leg) => sum + leg.budget.allocated, 0);

  const destinationsText = legs.length > 0
    ? legs.map((l) => l.destination.name).join(' & ')
    : 'your destination';

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Set Your Budget</h1>
        <p className="section-subtitle">
          How much would you like to spend on your trip to {destinationsText}?
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Total budget input */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Total Trip Budget</h2>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                $
              </span>
              <input
                type="text"
                value={localTotal}
                onChange={(e) => handleTotalChange(e.target.value)}
                className="input text-3xl font-bold pl-10 text-center"
                placeholder="3000"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500">Per person</div>
              <div className="font-bold text-lg">
                ${totalTravelers > 0 ? Math.round(budget.total / totalTravelers).toLocaleString() : 0}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500">Per day</div>
              <div className="font-bold text-lg">
                ${perPersonPerDay}/person
              </div>
            </div>
            <div className="p-3 bg-primary-50 rounded-lg">
              <div className="text-primary-600">Budget tier</div>
              <div className="font-bold text-lg capitalize text-primary-700">
                {budgetTier}
              </div>
            </div>
          </div>

          {/* Quick budget buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[1000, 2000, 3000, 5000, 10000].map((amount) => (
              <button
                key={amount}
                onClick={() => handleTotalChange(amount.toString())}
                className={clsx(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  budget.total === amount
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                ${amount.toLocaleString()}
              </button>
            ))}
          </div>
        </Card>

        {/* Per-Leg Budget Distribution */}
        {legs.length > 1 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Budget Per Destination</h2>
              <button
                onClick={() => setShowLegBreakdown(!showLegBreakdown)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {showLegBreakdown ? 'Hide Details' : 'Customize'}
              </button>
            </div>

            {/* Visual distribution bar */}
            <div className="h-4 rounded-full overflow-hidden flex mb-4">
              {legs.map((leg, index) => {
                const width = budget.total > 0
                  ? (leg.budget.allocated / budget.total) * 100
                  : 100 / legs.length;
                const colors = [
                  'bg-sky-400',
                  'bg-teal-400',
                  'bg-orange-400',
                  'bg-purple-400',
                  'bg-pink-400',
                ];
                return (
                  <div
                    key={leg.id}
                    className={`${colors[index % colors.length]} transition-all relative group`}
                    style={{ width: `${width}%` }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      ${leg.budget.allocated.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend / Quick View */}
            <div className="flex flex-wrap gap-3 mb-4">
              {legs.map((leg, index) => {
                const colors = [
                  'bg-sky-400',
                  'bg-teal-400',
                  'bg-orange-400',
                  'bg-purple-400',
                  'bg-pink-400',
                ];
                const percentage = budget.total > 0
                  ? Math.round((leg.budget.allocated / budget.total) * 100)
                  : Math.round(100 / legs.length);
                return (
                  <div key={leg.id} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                    <span className="text-sm text-slate-600">
                      {leg.destination.name}: ${leg.budget.allocated.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Detailed Breakdown */}
            {showLegBreakdown && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                {legs.map((leg, index) => {
                  const maxBudget = budget.total;
                  const percentage = budget.total > 0
                    ? Math.round((leg.budget.allocated / budget.total) * 100)
                    : 0;

                  return (
                    <div key={leg.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                      <div
                        className="w-10 h-10 rounded-lg bg-cover bg-center flex-shrink-0"
                        style={{
                          backgroundImage: leg.destination.imageUrl
                            ? `url(${leg.destination.imageUrl})`
                            : 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)',
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-700">{leg.destination.name}</span>
                          <span className="text-sm text-slate-500">{leg.days} days</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={maxBudget}
                          value={leg.budget.allocated}
                          onChange={(e) => handleLegBudgetChange(leg.id, parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                      </div>
                      <div className="text-right min-w-[100px]">
                        <div className="font-bold text-slate-700">
                          ${leg.budget.allocated.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">{percentage}%</div>
                      </div>
                    </div>
                  );
                })}

                {totalAllocatedToLegs !== budget.total && (
                  <p className="text-sm text-amber-600 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {totalAllocatedToLegs > budget.total
                      ? `Over budget by $${(totalAllocatedToLegs - budget.total).toLocaleString()}`
                      : `$${(budget.total - totalAllocatedToLegs).toLocaleString()} unallocated`}
                  </p>
                )}

                <button
                  onClick={distributeBudgetAcrossLegs}
                  className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  Auto-distribute evenly
                </button>
              </div>
            )}
          </Card>
        )}

        {/* Budget presets */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Budget Style</h2>
          <p className="text-sm text-gray-500 mb-4">
            Choose a preset to automatically allocate your budget and get relevant Reddit recommendations
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                className={clsx(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  budget.preset === preset.id
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div
                  className={clsx(
                    'mb-2',
                    budget.preset === preset.id ? 'text-primary-500' : 'text-gray-400'
                  )}
                >
                  {preset.icon}
                </div>
                <div className="font-medium mb-1">{preset.name}</div>
                <div className="text-xs text-gray-500 mb-2">{preset.description}</div>
                <div className="flex flex-wrap gap-1">
                  {preset.subreddits.map((sub) => (
                    <span
                      key={sub}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Allocation sliders */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Budget Allocation</h2>
            <span className="text-sm text-gray-500">
              Total: {Object.values(budget.allocation).reduce((a, b) => a + b, 0)}%
            </span>
          </div>

          {/* Visual allocation bar */}
          <div className="h-8 rounded-full overflow-hidden flex mb-6">
            {allocationItems.map((item) => (
              <div
                key={item.key}
                className={clsx(item.color, 'transition-all duration-300')}
                style={{ width: `${budget.allocation[item.key]}%` }}
                title={`${item.label}: ${budget.allocation[item.key]}%`}
              />
            ))}
          </div>

          {/* Sliders */}
          <div className="space-y-6">
            {allocationItems.map((item) => (
              <div key={item.key} className="flex items-center gap-4">
                <div className={clsx('w-3 h-3 rounded-full', item.color)} />
                <div className="flex-1">
                  <Slider
                    icon={item.icon}
                    label={item.label}
                    value={budget.allocation[item.key]}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      handleAllocationChange(item.key, parseInt(e.target.value, 10))
                    }
                    formatValue={(v) => `${v}% ($${getAllocationAmount(item.key).toLocaleString()})`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Allocation summary */}
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-5 gap-4 text-center">
            {allocationItems.map((item) => (
              <div key={item.key}>
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className="font-bold">${getAllocationAmount(item.key).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Reddit recommendations preview */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0">
              r/
            </div>
            <div>
              <h3 className="font-semibold mb-1">Reddit Sources</h3>
              <p className="text-sm text-gray-600 mb-3">
                Based on your ${budget.total.toLocaleString()} budget ({budgetTier} tier), we'll search:
              </p>
              <div className="flex flex-wrap gap-2">
                {budgetTier === 'luxury' && (
                  <>
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium">r/fattravel</span>
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium">r/luxurytravel</span>
                  </>
                )}
                {budgetTier === 'mid-range' && (
                  <>
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium">r/travel</span>
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium">r/solotravel</span>
                  </>
                )}
                {budgetTier === 'budget' && (
                  <>
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium">r/budgettravel</span>
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium">r/shoestring</span>
                  </>
                )}
                {legs.map((leg) => (
                  <span key={leg.id} className="px-3 py-1 bg-white rounded-full text-sm font-medium">
                    r/{leg.destination.name.toLowerCase().replace(/\s/g, '')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
