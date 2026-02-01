'use client';

import { useTripStore } from '@/stores/tripStore';
import { MapPin, Check } from 'lucide-react';

interface LegSelectorProps {
  showProgress?: boolean;
  progressType?: 'flights' | 'hotels' | 'experiences';
}

export default function LegSelector({ showProgress, progressType }: LegSelectorProps) {
  const { legs, activeLegId, setActiveLeg } = useTripStore();

  if (legs.length <= 1) {
    return null;
  }

  const getProgressStatus = (legId: string) => {
    const leg = legs.find((l) => l.id === legId);
    if (!leg) return false;

    switch (progressType) {
      case 'flights':
        return !!leg.inboundFlight;
      case 'hotels':
        return !!leg.hotel;
      case 'experiences':
        return leg.experiences.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
      {legs.map((leg, index) => {
        const isActive = leg.id === activeLegId;
        const isComplete = showProgress && getProgressStatus(leg.id);

        return (
          <button
            key={leg.id}
            onClick={() => setActiveLeg(leg.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              isActive
                ? 'bg-white shadow-sm text-slate-800'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                isActive
                  ? 'bg-sky-500 text-white'
                  : isComplete
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-300 text-white'
              }`}
            >
              {isComplete ? (
                <Check className="w-3 h-3" />
              ) : (
                index + 1
              )}
            </span>
            <span className="font-medium truncate max-w-[120px]">
              {leg.destination.name}
            </span>
            {showProgress && isComplete && (
              <Check className="w-4 h-4 text-teal-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
