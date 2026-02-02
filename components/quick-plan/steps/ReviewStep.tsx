'use client';

import { useState } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Calendar, ChevronDown, ChevronUp, Sun, Sunset, Moon } from 'lucide-react';
import clsx from 'clsx';
import type { DayBlock } from '@/types/quick-plan';

export default function ReviewStep() {
  const { itinerary } = useQuickPlanStore();
  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  if (!itinerary) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No itinerary generated yet</p>
      </div>
    );
  }

  const toggleDay = (dayNumber: number) => {
    setExpandedDay(expandedDay === dayNumber ? null : dayNumber);
  };

  const renderDayBlock = (block: DayBlock | null, icon: React.ReactNode, label: string) => {
    if (!block) return null;
    return (
      <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
        <div className="text-slate-400 mt-0.5">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{block.startTime} - {block.endTime}</span>
            <span className="text-xs px-1.5 py-0.5 bg-slate-200 rounded capitalize">{block.type}</span>
          </div>
          <p className="font-medium text-slate-900 mt-1">{block.title}</p>
          {block.description && (
            <p className="text-sm text-slate-500 mt-0.5">{block.description}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
        <p className="text-sm text-orange-800">
          Your {itinerary.days.length}-day trip is ready to review
        </p>
      </div>

      {/* Trip Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Days</p>
          <p className="text-lg font-semibold text-slate-900">
            {itinerary.days.length}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Stops</p>
          <p className="text-lg font-semibold text-slate-900">
            {itinerary.stops.length}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Status</p>
          <p className="text-lg font-semibold text-orange-600">
            {itinerary.qualityCheckPassed ? '✓' : '!'}
          </p>
        </div>
      </div>

      {/* Day by day */}
      <div className="space-y-3">
        {itinerary.days.map((day) => (
          <div
            key={day.dayNumber}
            className="border border-slate-200 rounded-xl overflow-hidden"
          >
            {/* Day header */}
            <button
              onClick={() => toggleDay(day.dayNumber)}
              className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-orange-600">
                    {day.dayNumber}
                  </span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-900">
                    Day {day.dayNumber}{day.isTransitDay ? ' (Travel Day)' : ''}
                  </p>
                  <p className="text-sm text-slate-500">{day.date}</p>
                </div>
              </div>
              {expandedDay === day.dayNumber ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {/* Day details */}
            {expandedDay === day.dayNumber && (
              <div className="p-4 space-y-3">
                {renderDayBlock(day.morning, <Sun className="w-4 h-4" />, 'Morning')}
                {renderDayBlock(day.afternoon, <Sunset className="w-4 h-4" />, 'Afternoon')}
                {renderDayBlock(day.evening, <Moon className="w-4 h-4" />, 'Evening')}

                {!day.morning && !day.afternoon && !day.evening && (
                  <p className="text-sm text-slate-500 italic text-center py-4">
                    Free day - no activities scheduled
                  </p>
                )}

                {/* Notes */}
                {day.notes && (
                  <div className="text-xs text-slate-500 italic pt-2 border-t border-slate-200">
                    {day.notes}
                  </div>
                )}

                {/* Effort */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                  <span className="text-slate-500">
                    Effort: {day.effortPoints.toFixed(1)} points
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
