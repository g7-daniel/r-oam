'use client';

import { useState } from 'react';
import { GripVertical, X, MapPin, Calendar, DollarSign } from 'lucide-react';
import type { TripLeg } from '@/types';

interface LegCardProps {
  leg: TripLeg;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export default function LegCard({
  leg,
  index,
  isActive,
  onSelect,
  onRemove,
  isDragging,
  dragHandleProps,
}: LegCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={`relative rounded-xl border-2 transition-all duration-200 cursor-pointer ${
        isActive
          ? 'border-sky-500 bg-sky-50 shadow-lg'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
      } ${isDragging ? 'shadow-xl rotate-2 scale-105' : ''}`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>

      {/* Remove Button */}
      {(isHovered || isActive) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Leg Number Badge */}
      <div
        className={`absolute -left-3 top-4 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          isActive
            ? 'bg-sky-500 text-white'
            : 'bg-slate-200 text-slate-600'
        }`}
      >
        {index + 1}
      </div>

      {/* Content */}
      <div className="pl-8 pr-4 py-4">
        {/* Destination Image & Name */}
        <div className="flex items-start gap-3">
          <div
            className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
            style={{
              backgroundImage: leg.destination.imageUrl
                ? `url(${leg.destination.imageUrl})`
                : 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)',
            }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">
              {leg.destination.name}
            </h3>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {leg.destination.country}
            </p>

            {/* Specific Locations */}
            {leg.specificLocations.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {leg.specificLocations.slice(0, 2).map((loc) => (
                  <span
                    key={loc.id}
                    className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full"
                  >
                    {loc.name}
                  </span>
                ))}
                {leg.specificLocations.length > 2 && (
                  <span className="text-xs text-slate-400">
                    +{leg.specificLocations.length - 2} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Details Row */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {leg.startDate && leg.endDate
                ? `${formatDate(leg.startDate)} - ${formatDate(leg.endDate)}`
                : `${leg.days || '?'} days`}
            </span>
          </div>
          {leg.budget.allocated > 0 && (
            <div className="flex items-center gap-1 text-slate-500">
              <DollarSign className="w-3.5 h-3.5" />
              <span>${leg.budget.allocated.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Progress Indicators */}
        <div className="mt-2 flex gap-1.5">
          <ProgressDot
            filled={!!leg.inboundFlight}
            label="Flight"
          />
          <ProgressDot
            filled={!!leg.hotel}
            label="Hotel"
          />
          <ProgressDot
            filled={leg.experiences.length > 0}
            label="Activities"
          />
        </div>
      </div>
    </div>
  );
}

function ProgressDot({ filled, label }: { filled: boolean; label: string }) {
  return (
    <div
      className={`w-2 h-2 rounded-full ${
        filled ? 'bg-teal-500' : 'bg-slate-200'
      }`}
      title={label}
    />
  );
}
