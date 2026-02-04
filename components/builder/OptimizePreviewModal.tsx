'use client';

import { useMemo } from 'react';
import { X, Check, Route } from 'lucide-react';
import clsx from 'clsx';
import type { CollectionItem } from '@/stores/tripStore';
import { getOptimizationComparison, isOptimizationWorthwhile } from '@/lib/utils/itineraryOptimizer';
import { formatDistance } from '@/lib/utils/travelTime';

interface OptimizePreviewModalProps {
  items: CollectionItem[];
  dayIndex: number;
  onApply: (optimizedOrder: string[]) => void;
  onCancel: () => void;
}

export default function OptimizePreviewModal({
  items,
  dayIndex,
  onApply,
  onCancel,
}: OptimizePreviewModalProps) {
  const optimization = useMemo(() => {
    const validItems = items.filter(i => i.lat && i.lng);
    if (validItems.length < 2) return null;

    return getOptimizationComparison(
      validItems.map(i => ({
        id: i.id,
        lat: i.lat!,
        lng: i.lng!,
        category: i.category,
        durationMinutes: i.durationMinutes,
      }))
    );
  }, [items]);

  if (!optimization) {
    return null;
  }

  const itemMap = new Map(items.map(i => [i.id, i]));

  const getItemName = (id: string) => {
    return itemMap.get(id)?.name || 'Unknown';
  };

  const worthwhile = isOptimizationWorthwhile(optimization);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <Route className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Optimize Route for Day {dayIndex + 1}?
              </h2>
              <p className="text-sm text-slate-500">
                Review the suggested order before applying
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Comparison */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Before */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">BEFORE</h3>
              <div className="space-y-2">
                {optimization.originalOrder.map((id, idx) => (
                  <div
                    key={id}
                    className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-300 text-white text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-700 truncate">
                      {getItemName(id)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-slate-500">
                Total: {formatDistance(optimization.originalDistanceKm)}
              </div>
            </div>

            {/* After */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">AFTER</h3>
              <div className="space-y-2">
                {optimization.optimizedOrder.map((id, idx) => {
                  const originalIdx = optimization.originalOrder.indexOf(id);
                  const moved = originalIdx !== idx;

                  return (
                    <div
                      key={id}
                      className={clsx(
                        'flex items-center gap-2 p-2 rounded-lg',
                        moved ? 'bg-green-50 border border-green-200' : 'bg-slate-50'
                      )}
                    >
                      <span className={clsx(
                        'w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-medium',
                        moved ? 'bg-green-500' : 'bg-slate-300'
                      )}>
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-700 truncate">
                        {getItemName(id)}
                      </span>
                      {moved && (
                        <span className="ml-auto text-xs text-green-600">
                          moved
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-sm text-green-600 font-medium">
                Total: {formatDistance(optimization.optimizedDistanceKm)}
                {worthwhile && (
                  <span className="ml-2">
                    ✅ {optimization.distanceSavedPercent}% shorter
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          {worthwhile ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5" />
                <span className="font-medium">
                  This optimization saves {formatDistance(optimization.distanceSavedKm)} ({optimization.distanceSavedPercent}%)
                </span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                You'll save approximately {optimization.timeSavedMinutes} minutes of travel time.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-600">
                The current order is already close to optimal. Changes would save less than 10%.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-slate-700 border border-slate-300 rounded-xl hover:bg-white transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(optimization.optimizedOrder)}
            className={clsx(
              'flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors',
              worthwhile
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            )}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
