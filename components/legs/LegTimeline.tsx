'use client';

import { useTripStore } from '@/stores/tripStore';
import { Plane, Calendar } from 'lucide-react';

export default function LegTimeline() {
  const { legs, dates } = useTripStore();

  if (legs.length === 0) {
    return null;
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const totalDays = legs.reduce((sum, leg) => sum + (leg.days || 0), 0);

  return (
    <div className="bg-gradient-to-r from-sky-50 to-teal-50 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Trip Timeline
        </h3>
        {totalDays > 0 && (
          <span className="text-sm text-slate-500">
            {totalDays} days total
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-200" />

        {/* Legs */}
        <div className="flex justify-between relative">
          {/* Origin */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-sky-500 flex items-center justify-center z-10">
              <Plane className="w-5 h-5 text-sky-500 -rotate-45" />
            </div>
            <span className="mt-2 text-xs font-medium text-slate-600">
              Depart
            </span>
            <span className="text-xs text-slate-400">
              {formatDate(dates.startDate)}
            </span>
          </div>

          {/* Destination Legs */}
          {legs.map((leg, index) => (
            <div key={leg.id} className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center z-10 bg-cover bg-center overflow-hidden"
                style={{
                  backgroundImage: leg.destination.imageUrl
                    ? `url(${leg.destination.imageUrl})`
                    : undefined,
                }}
              >
                {!leg.destination.imageUrl && (
                  <span className="text-sm font-bold text-teal-500">
                    {index + 1}
                  </span>
                )}
              </div>
              <span className="mt-2 text-xs font-medium text-slate-600 text-center max-w-[80px] truncate">
                {leg.destination.name}
              </span>
              <span className="text-xs text-slate-400">
                {leg.days > 0 ? `${leg.days} days` : 'TBD'}
              </span>
            </div>
          ))}

          {/* Return */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-orange-500 flex items-center justify-center z-10">
              <Plane className="w-5 h-5 text-orange-500 rotate-[135deg]" />
            </div>
            <span className="mt-2 text-xs font-medium text-slate-600">
              Return
            </span>
            <span className="text-xs text-slate-400">
              {formatDate(dates.endDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Day allocation bars */}
      {totalDays > 0 && (
        <div className="mt-4 flex gap-1 h-2 rounded-full overflow-hidden">
          {legs.map((leg, index) => {
            const width = (leg.days / totalDays) * 100;
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
                className={`${colors[index % colors.length]} transition-all`}
                style={{ width: `${width}%` }}
                title={`${leg.destination.name}: ${leg.days} days`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
