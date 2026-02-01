'use client';

import { useState } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import ScheduledItem from './ScheduledItem';
import AddPlaceSearch from './AddPlaceSearch';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Sparkles,
  Route,
  Calendar,
  Plane,
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { CollectionItem } from '@/stores/tripStoreV2';

interface DayContainerProps {
  dayIndex: number;
  dayNumber: number;
  date: Date | null;
  items: CollectionItem[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSelected: boolean;
  onSelect: () => void;
  isArrivalDay?: boolean;
  isDepartureDay?: boolean;
  destinationId: string;
}

export default function DayContainer({
  dayIndex,
  dayNumber,
  date,
  items,
  isExpanded,
  onToggleExpand,
  isSelected,
  onSelect,
  isArrivalDay,
  isDepartureDay,
  destinationId,
}: DayContainerProps) {
  const { optimizeDay, autoFillDay } = useTripStoreV2();
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Calculate total distance for the day
  const totalDistanceKm = sortedItems.length > 1 ? 2.5 : 0;

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      await optimizeDay(dayIndex);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAutoFill = async () => {
    await autoFillDay(dayIndex, destinationId);
  };

  return (
    <div
      className={clsx(
        'relative transition-all',
        isSelected && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900 rounded-xl'
      )}
    >
      {/* Day marker dot */}
      <div className="absolute -left-[21px] top-4 w-3 h-3 rounded-full bg-primary-500 border-2 border-white dark:border-slate-900" />

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Day header */}
        <button
          onClick={() => {
            onToggleExpand();
            onSelect();
          }}
          className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
            )}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0 hidden sm:block" />
              <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">Day {dayNumber}</span>
              {date && (
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                  <span className="hidden sm:inline">- </span>{format(date, 'EEE, MMM d')}
                </span>
              )}
            </div>
            {(isArrivalDay || isDepartureDay) && (
              <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0">
                <Plane className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">{isArrivalDay ? 'Arrival' : 'Departure'}</span>
                <span className="sm:hidden">{isArrivalDay ? 'Arr' : 'Dep'}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
            {sortedItems.length > 0 && (
              <>
                <span>{sortedItems.length} <span className="hidden sm:inline">places</span></span>
                {totalDistanceKm > 0 && (
                  <span className="hidden sm:inline px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs">
                    {totalDistanceKm.toFixed(1)} mi total
                  </span>
                )}
              </>
            )}
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-slate-100 dark:border-slate-700">
            {/* Action buttons */}
            {sortedItems.length > 0 && (
              <div className="px-2 sm:px-4 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-700/50 flex items-center gap-1 sm:gap-2 border-b border-slate-100 dark:border-slate-700 overflow-x-auto">
                <button
                  onClick={handleAutoFill}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Auto-fill day</span>
                  <span className="sm:hidden">Auto-fill</span>
                </button>
                <button
                  onClick={handleOptimize}
                  disabled={sortedItems.length < 2 || isOptimizing}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Route className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {isOptimizing ? 'Optimizing...' : <><span className="hidden sm:inline">Optimize route</span><span className="sm:hidden">Optimize</span></>}
                </button>
              </div>
            )}

            {/* Droppable area for scheduled items */}
            <Droppable droppableId={`day-${dayIndex}`}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={clsx(
                    'min-h-[80px] sm:min-h-[100px] p-2 sm:p-3 transition-colors',
                    snapshot.isDraggingOver && 'bg-primary-50 dark:bg-primary-900/20'
                  )}
                >
                  {sortedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 sm:py-8 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2 sm:mb-3">
                        <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1">No places yet</p>
                      <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                        <span className="hidden sm:inline">Drag places here or click "+ Add a place"</span>
                        <span className="sm:hidden">Tap + to add places</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2">
                      {sortedItems.map((item, index) => (
                        <ScheduledItem
                          key={item.id}
                          item={item}
                          index={index}
                          dayIndex={dayIndex}
                          isLast={index === sortedItems.length - 1}
                          previousItem={index > 0 ? sortedItems[index - 1] : undefined}
                        />
                      ))}
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Add place button */}
            {showAddPlace ? (
              <div className="border-t border-slate-100 dark:border-slate-700">
                <AddPlaceSearch
                  dayIndex={dayIndex}
                  destinationId={destinationId}
                  onClose={() => setShowAddPlace(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowAddPlace(true)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Add a place
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
