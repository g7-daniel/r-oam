'use client';

import { OverlayView } from '@react-google-maps/api';
import type { Experience } from '@/types';
import { MapPin, Star } from 'lucide-react';

interface ExperienceMarkerProps {
  experience: Experience;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
}

const categoryIcons: Record<string, string> = {
  beaches: '🏖️',
  museums: '🏛️',
  food_tours: '🍽️',
  nightlife: '🎉',
  day_trips: '🚗',
  hidden_gems: '💎',
  outdoor: '🥾',
  shopping: '🛍️',
  cultural: '⛩️',
  wellness: '🧘',
};

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  beaches: { bg: 'bg-sky-500', border: 'border-sky-500', text: 'text-sky-500' },
  museums: { bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-500' },
  food_tours: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500' },
  nightlife: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-500' },
  day_trips: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-500' },
  hidden_gems: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-500' },
  outdoor: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-500' },
  shopping: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-500' },
  cultural: { bg: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-500' },
  wellness: { bg: 'bg-teal-500', border: 'border-teal-500', text: 'text-teal-500' },
};

export default function ExperienceMarker({
  experience,
  isSelected = false,
  isHovered = false,
  onClick,
}: ExperienceMarkerProps) {
  const colors = categoryColors[experience.category] || {
    bg: 'bg-slate-500',
    border: 'border-slate-500',
    text: 'text-slate-500',
  };
  const icon = categoryIcons[experience.category] || '📍';

  return (
    <OverlayView
      position={{ lat: experience.latitude, lng: experience.longitude }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        onClick={onClick}
        className={`
          relative cursor-pointer transform transition-all duration-200
          ${isHovered || isSelected ? 'scale-110 z-50' : 'z-10'}
        `}
      >
        {/* Main Marker */}
        <div
          className={`
            relative flex items-center justify-center
            w-10 h-10 rounded-full shadow-lg
            ${isSelected ? colors.bg : 'bg-white'}
            ${isSelected ? 'border-2 border-white' : `border-2 ${colors.border}`}
            transition-all duration-200
            hover:shadow-xl
          `}
        >
          <span className="text-lg">{icon}</span>

          {/* Rating Badge */}
          {experience.rating >= 4.5 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow">
              <Star className="w-3 h-3 text-white fill-white" />
            </div>
          )}
        </div>

        {/* Pointer */}
        <div
          className={`
            absolute left-1/2 -translate-x-1/2 top-full -mt-1
            w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px]
            border-l-transparent border-r-transparent
            ${isSelected ? colors.border.replace('border-', 'border-t-') : 'border-t-white'}
          `}
        />

        {/* Hover Label */}
        {(isHovered || isSelected) && (
          <div
            className={`
              absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full
              px-3 py-1.5 rounded-lg shadow-lg
              whitespace-nowrap max-w-xs
              ${isSelected ? colors.bg + ' text-white' : 'bg-white text-slate-900'}
              transition-opacity duration-200
            `}
          >
            <p className="font-medium text-sm truncate">{experience.name}</p>
            <div className="flex items-center gap-2 text-xs opacity-80">
              <span>{experience.duration}</span>
              <span>•</span>
              <span>{experience.price > 0 ? `$${experience.price}` : 'Free'}</span>
            </div>
          </div>
        )}
      </div>
    </OverlayView>
  );
}

// Simple marker for use without OverlayView
export function SimpleMarker({
  category,
  isSelected = false,
}: {
  category: string;
  isSelected?: boolean;
}) {
  const colors = categoryColors[category] || {
    bg: 'bg-slate-500',
    border: 'border-slate-500',
    text: 'text-slate-500',
  };
  const icon = categoryIcons[category] || '📍';

  return (
    <div
      className={`
        flex items-center justify-center
        w-8 h-8 rounded-full shadow-md
        ${isSelected ? colors.bg : 'bg-white'}
        ${isSelected ? 'border-2 border-white' : `border-2 ${colors.border}`}
      `}
    >
      <span className="text-sm">{icon}</span>
    </div>
  );
}
