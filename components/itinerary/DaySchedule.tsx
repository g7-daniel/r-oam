'use client';

import { useState } from 'react';
import type { ItineraryDay, ItineraryItem } from '@/types';
import ItinerarySlot from './ItinerarySlot';
import { Calendar, Sun, Sunset, Moon, Plane, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { formatDate as formatDateUtil } from '@/lib/date-utils';

interface DayScheduleProps {
  day: ItineraryDay;
  legName?: string;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function DaySchedule({
  day,
  legName,
  onReorder,
  isExpanded = true,
  onToggleExpand,
}: DayScheduleProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const formatDate = (dateString: string) => {
    return formatDateUtil(dateString, 'long');
  };

  const getTimeOfDayIcon = () => {
    const firstItem = day.items[0];
    if (!firstItem?.startTime) return <Sun className="w-5 h-5 text-amber-500" />;

    const hour = parseInt(firstItem.startTime.split(':')[0], 10);
    if (hour < 12) return <Sun className="w-5 h-5 text-amber-500" />;
    if (hour < 18) return <Sunset className="w-5 h-5 text-orange-500" />;
    return <Moon className="w-5 h-5 text-indigo-500" />;
  };

  const experienceCount = day.items.filter((i) => i.type === 'experience').length;

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && onReorder) {
      onReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // Group items by type for better visual organization
  const groupedItems = day.items.reduce(
    (acc, item, index) => {
      if (item.type === 'transit') {
        acc.push({ type: 'transit', item, index });
      } else {
        acc.push({ type: 'main', item, index });
      }
      return acc;
    },
    [] as { type: 'transit' | 'main'; item: ItineraryItem; index: number }[]
  );

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border overflow-hidden transition-all',
        day.isTransitionDay ? 'border-sky-200 bg-sky-50/30' : 'border-slate-200'
      )}
    >
      {/* Day Header */}
      <div
        className={clsx(
          'flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors',
          day.isTransitionDay && 'bg-sky-100/50 hover:bg-sky-100'
        )}
        onClick={onToggleExpand}
      >
        <div
          className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold',
            day.isTransitionDay
              ? 'bg-sky-500 text-white'
              : 'bg-gradient-to-br from-orange-500 to-amber-500 text-white'
          )}
        >
          {day.isTransitionDay ? <Plane className="w-6 h-6" /> : day.dayNumber}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-700">
              {day.isTransitionDay ? 'Travel Day' : `Day ${day.dayNumber}`}
            </h3>
            {legName && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                {legName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(day.date)}
            </span>
            {experienceCount > 0 && (
              <span>
                {experienceCount} activit{experienceCount === 1 ? 'y' : 'ies'}
              </span>
            )}
          </div>
        </div>

        {getTimeOfDayIcon()}

        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Day Content */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          {day.notes && (
            <div className="px-4 py-3 bg-amber-50 text-amber-700 text-sm border-b border-amber-100">
              {day.notes}
            </div>
          )}

          <div className="p-4 space-y-2">
            {day.items.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No activities scheduled</p>
                <p className="text-xs">Drag experiences here to add them</p>
              </div>
            ) : (
              day.items.map((item, index) => {
                const experienceIndex = day.items
                  .slice(0, index + 1)
                  .filter((i) => i.type === 'experience').length - 1;

                const isDraggable = item.type === 'experience' && !!onReorder;

                return (
                  <div
                    key={item.id}
                    draggable={isDraggable ? true : undefined}
                    onDragStart={() => isDraggable && handleDragStart(experienceIndex)}
                    onDragOver={(e) => isDraggable && handleDragOver(e, experienceIndex)}
                    onDragEnd={handleDragEnd}
                    onDragLeave={handleDragLeave}
                    className={clsx(
                      dragOverIndex === experienceIndex &&
                        draggedIndex !== experienceIndex &&
                        'border-t-2 border-sky-500'
                    )}
                  >
                    <ItinerarySlot
                      item={item}
                      isDragging={draggedIndex === experienceIndex}
                      dragHandleProps={
                        isDraggable
                          ? {
                              onMouseDown: (e) => e.stopPropagation(),
                            }
                          : undefined
                      }
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
