'use client';

import { useState, useCallback } from 'react';
import type { ItineraryDay, TripLeg } from '@/types';
import DaySchedule from './DaySchedule';
import { reorderDayItems } from '@/lib/itinerary-scheduler';
import { Calendar, Filter, Maximize2, Minimize2 } from 'lucide-react';
import clsx from 'clsx';

interface DragDropSchedulerProps {
  days: ItineraryDay[];
  legs: TripLeg[];
  onDaysChange: (days: ItineraryDay[]) => void;
}

export default function DragDropScheduler({
  days,
  legs,
  onDaysChange,
}: DragDropSchedulerProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set(days.map((d) => d.date))
  );
  const [filterLeg, setFilterLeg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDays(new Set(days.map((d) => d.date)));
  };

  const collapseAll = () => {
    setExpandedDays(new Set());
  };

  const handleReorder = useCallback(
    (dayIndex: number, fromIndex: number, toIndex: number) => {
      const day = days[dayIndex];
      const updatedDay = reorderDayItems(day, fromIndex, toIndex);
      const newDays = [...days];
      newDays[dayIndex] = updatedDay;
      onDaysChange(newDays);
    },
    [days, onDaysChange]
  );

  const getLegName = (legId?: string) => {
    if (!legId) return undefined;
    const leg = legs.find((l) => l.id === legId);
    return leg?.destination.name;
  };

  const filteredDays = filterLeg
    ? days.filter((d) => d.legId === filterLeg || d.isTransitionDay)
    : days;

  // Group days by leg
  const daysByLeg = legs.map((leg) => ({
    leg,
    days: days.filter((d) => d.legId === leg.id),
  }));

  const transitionDays = days.filter((d) => d.isTransitionDay);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Leg Filter */}
        {legs.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <div className="flex gap-1">
              <button
                onClick={() => setFilterLeg(null)}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  filterLeg === null
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                All
              </button>
              {legs.map((leg) => (
                <button
                  key={leg.id}
                  onClick={() => setFilterLeg(leg.id)}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded-lg transition-colors',
                    filterLeg === leg.id
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {leg.destination.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
            Collapse All
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="space-y-4">
        {filteredDays.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              No Itinerary Yet
            </h3>
            <p className="text-slate-500">
              Add experiences to your trip to build your itinerary
            </p>
          </div>
        ) : (
          filteredDays.map((day, index) => (
            <DaySchedule
              key={day.date}
              day={day}
              legName={getLegName(day.legId)}
              isExpanded={expandedDays.has(day.date)}
              onToggleExpand={() => toggleDay(day.date)}
              onReorder={(fromIdx, toIdx) => handleReorder(index, fromIdx, toIdx)}
            />
          ))
        )}
      </div>
    </div>
  );
}
