'use client';

import { useEffect, useState } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Map, Loader2, Star, Check, Info } from 'lucide-react';
import clsx from 'clsx';

export default function AreaDiscoveryStep() {
  const { preferences, discoveredAreas, setDiscoveredAreas, selectArea, deselectArea, setLoading, isLoading } = useQuickPlanStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (discoveredAreas.length === 0 && preferences.destinationContext) {
      fetchAreas();
    }
  }, []);

  const fetchAreas = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/quick-plan/discover-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: preferences.destinationContext?.canonicalName,
          preferences,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setDiscoveredAreas(data.areas);
      }
    } catch (err) {
      setError('Failed to discover areas. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAreaSelected = (areaId: string) =>
    preferences.selectedAreas.some((a) => a.id === areaId);

  const toggleArea = (area: typeof discoveredAreas[0]) => {
    if (isAreaSelected(area.id)) {
      deselectArea(area.id);
    } else {
      selectArea(area);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
        <p className="text-slate-600">Discovering the best areas for your trip...</p>
        <p className="text-sm text-slate-400 mt-1">Analyzing Reddit recommendations</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchAreas}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Based on your preferences, here are the best areas to visit in{' '}
        {preferences.destinationContext?.canonicalName}. Select the ones you're interested in.
      </p>

      <div className="space-y-4">
        {discoveredAreas.map((area) => (
          <button
            key={area.id}
            onClick={() => toggleArea(area)}
            className={clsx(
              'w-full p-4 rounded-xl border transition-all text-left',
              isAreaSelected(area.id)
                ? 'border-orange-500 bg-orange-50'
                : 'border-slate-200 hover:border-orange-300'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-slate-900">{area.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {Math.round(area.confidenceScore * 100)}% match
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-1">{area.description}</p>

                {/* Why it fits */}
                {area.whyItFits.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {area.whyItFits.slice(0, 3).map((reason, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                {/* Caveats */}
                {area.caveats.length > 0 && (
                  <div className="flex items-start gap-1 mt-2 text-xs text-amber-700">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{area.caveats[0]}</span>
                  </div>
                )}
              </div>

              {/* Selection indicator */}
              <div
                className={clsx(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3',
                  isAreaSelected(area.id)
                    ? 'border-orange-500 bg-orange-500'
                    : 'border-slate-300'
                )}
              >
                {isAreaSelected(area.id) && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Summary */}
      {preferences.selectedAreas.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <p className="text-sm text-orange-800">
            <strong>{preferences.selectedAreas.length} area(s) selected:</strong>{' '}
            {preferences.selectedAreas.map((a) => a.name).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
