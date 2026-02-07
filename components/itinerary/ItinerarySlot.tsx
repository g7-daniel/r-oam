'use client';

import type { ItineraryItem } from '@/types';
import { Plane, Hotel, MapPin, Car, Footprints, Clock, GripVertical } from 'lucide-react';
import clsx from 'clsx';

interface ItinerarySlotProps {
  item: ItineraryItem;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export default function ItinerarySlot({
  item,
  isDragging = false,
  dragHandleProps,
}: ItinerarySlotProps) {
  const getIcon = () => {
    switch (item.type) {
      case 'flight':
        return <Plane className="w-5 h-5" />;
      case 'hotel':
        return <Hotel className="w-5 h-5" />;
      case 'transit':
        return item.transitMode === 'walk' ? (
          <Footprints className="w-5 h-5" />
        ) : (
          <Car className="w-5 h-5" />
        );
      case 'experience':
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getTypeStyles = () => {
    switch (item.type) {
      case 'flight':
        return 'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300';
      case 'hotel':
        return 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300';
      case 'transit':
        return 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400';
      case 'experience':
      default:
        return 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isTransit = item.type === 'transit';

  if (isTransit) {
    return (
      <div className="flex items-center gap-3 py-2 px-4">
        <div className="w-16 text-xs text-slate-400 dark:text-slate-500 text-right">
          {item.startTime}
        </div>
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            {getIcon()}
          </div>
          <div className="flex-1 border-t border-dashed border-slate-300 dark:border-slate-600" />
          <span className="text-xs whitespace-nowrap">
            {item.transitMode === 'walk' ? 'Walk' : 'Drive'} {item.transitDistance}km
            ({formatDuration(item.duration || 0)})
          </span>
          <div className="flex-1 border-t border-dashed border-slate-300 dark:border-slate-600" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-stretch gap-3 p-3 rounded-xl border transition-all',
        getTypeStyles(),
        isDragging && 'shadow-lg ring-2 ring-primary-500 opacity-90'
      )}
    >
      {/* Time Column */}
      <div className="w-20 flex-shrink-0 text-right pr-3 border-r border-current/20">
        <div className="text-sm font-semibold">{item.startTime}</div>
        <div className="text-xs opacity-70">{item.endTime}</div>
      </div>

      {/* Drag Handle */}
      {item.type === 'experience' && dragHandleProps && (
        <div
          {...dragHandleProps}
          className="flex-shrink-0 flex items-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 min-w-[28px] min-h-[28px] justify-center touch-manipulation"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}

      {/* Icon */}
      <div className="flex-shrink-0 flex items-center">
        <div className="w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center">
          {getIcon()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{item.title}</h4>
        <div className="flex items-center gap-3 mt-1 text-xs opacity-70">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(item.duration || 0)}
          </span>
          {item.flightNumber && (
            <span>Flight {item.flightNumber}</span>
          )}
          {item.location?.name && (
            <span className="truncate">{item.location.name}</span>
          )}
        </div>
        {item.notes && (
          <p className="mt-2 text-xs opacity-70 italic line-clamp-2">
            "{item.notes}"
          </p>
        )}
      </div>
    </div>
  );
}
