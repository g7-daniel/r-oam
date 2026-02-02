'use client';

import { useState } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Scale, Check, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

export default function TradeoffsStep() {
  const { preferences, resolveTradeoff, goToNextState } = useQuickPlanStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const unresolvedTradeoffs = preferences.detectedTradeoffs.filter(
    (t) => !preferences.resolvedTradeoffs.some((r) => r.tradeoffId === t.id)
  );

  const resolvedTradeoffs = preferences.detectedTradeoffs.filter((t) =>
    preferences.resolvedTradeoffs.some((r) => r.tradeoffId === t.id)
  );

  if (preferences.detectedTradeoffs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          No conflicts detected!
        </h3>
        <p className="text-slate-500">
          Your preferences are compatible. You can continue to the next step.
        </p>
      </div>
    );
  }

  const handleResolve = (tradeoffId: string, optionId: string) => {
    resolveTradeoff(tradeoffId, optionId, customInputs[tradeoffId]);
    setExpandedId(null);
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-3 text-sm">
        <Scale className="w-5 h-5 text-orange-500" />
        <span className="text-slate-600">
          {resolvedTradeoffs.length} of {preferences.detectedTradeoffs.length} resolved
        </span>
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all"
            style={{
              width: `${(resolvedTradeoffs.length / preferences.detectedTradeoffs.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Unresolved tradeoffs */}
      {unresolvedTradeoffs.map((tradeoff) => (
        <div
          key={tradeoff.id}
          className="border border-orange-200 bg-orange-50 rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setExpandedId(expandedId === tradeoff.id ? null : tradeoff.id)}
            className="w-full p-4 flex items-start justify-between text-left"
          >
            <div>
              <h3 className="font-medium text-orange-900">{tradeoff.title}</h3>
              <p className="text-sm text-orange-700 mt-1">{tradeoff.description}</p>
            </div>
            {expandedId === tradeoff.id ? (
              <ChevronUp className="w-5 h-5 text-orange-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-orange-500 flex-shrink-0" />
            )}
          </button>

          {expandedId === tradeoff.id && (
            <div className="px-4 pb-4 space-y-4">
              {/* Conflicting preferences */}
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  CONFLICTING PREFERENCES
                </p>
                <ul className="text-sm text-slate-700 space-y-1">
                  {tradeoff.conflictingPreferences.map((pref, i) => (
                    <li key={i}>• {pref}</li>
                  ))}
                </ul>
              </div>

              {/* Resolution options */}
              <div className="space-y-2">
                {tradeoff.resolutionOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleResolve(tradeoff.id, option.id)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg text-left hover:border-orange-500 transition-all"
                  >
                    <p className="font-medium text-slate-900">{option.label}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {option.description}
                    </p>
                    {option.impact && (
                      <p className="text-xs text-slate-500 mt-2 italic">
                        Impact: {option.impact}
                      </p>
                    )}
                  </button>
                ))}

                {/* Custom input for "custom" option */}
                {tradeoff.resolutionOptions.some((o) => o.id === 'custom') && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Describe your preferred solution..."
                      value={customInputs[tradeoff.id] || ''}
                      onChange={(e) =>
                        setCustomInputs({ ...customInputs, [tradeoff.id]: e.target.value })
                      }
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => handleResolve(tradeoff.id, 'custom')}
                      disabled={!customInputs[tradeoff.id]}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Resolved tradeoffs */}
      {resolvedTradeoffs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-500">Resolved</h4>
          {resolvedTradeoffs.map((tradeoff) => {
            const resolution = preferences.resolvedTradeoffs.find(
              (r) => r.tradeoffId === tradeoff.id
            );
            const selectedOption = tradeoff.resolutionOptions.find(
              (o) => o.id === resolution?.selectedOptionId
            );

            return (
              <div
                key={tradeoff.id}
                className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3"
              >
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-green-900 truncate">
                    {tradeoff.title}
                  </p>
                  <p className="text-sm text-green-700 truncate">
                    {selectedOption?.label || 'Custom solution'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
