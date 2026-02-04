'use client';

import { Users, Check, Bed } from 'lucide-react';
import type { RoomType } from '@/types';
import clsx from 'clsx';

interface RoomTypeCardProps {
  room: RoomType;
  nights: number;
  isSelected: boolean;
  onSelect: () => void;
}

export default function RoomTypeCard({
  room,
  nights,
  isSelected,
  onSelect,
}: RoomTypeCardProps) {
  return (
    <div
      onClick={room.available ? onSelect : undefined}
      className={clsx(
        'relative p-3 sm:p-4 rounded-xl border-2 transition-all min-h-[44px]',
        room.available
          ? isSelected
            ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 cursor-pointer'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 opacity-60 cursor-not-allowed'
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Unavailable badge */}
      {!room.available && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
          Sold Out
        </div>
      )}

      <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white truncate">{room.name}</h4>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-none">{room.description}</p>
        </div>
        {room.imageUrl && (
          <img
            src={room.imageUrl}
            alt={room.name}
            className="w-14 h-10 sm:w-16 sm:h-12 rounded-lg object-cover flex-shrink-0"
          />
        )}
      </div>

      {/* Room details */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-2 sm:mb-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <Bed className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="truncate">{room.bedType}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          <span>Up to {room.maxOccupancy}</span>
        </div>
      </div>

      {/* Amenities */}
      <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
        {room.amenities.slice(0, 3).map((amenity) => (
          <span
            key={amenity}
            className="px-1.5 sm:px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs rounded-full"
          >
            {amenity}
          </span>
        ))}
        {room.amenities.length > 3 && (
          <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
            +{room.amenities.length - 3} more
          </span>
        )}
      </div>

      {/* Pricing */}
      <div className="flex items-end justify-between pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-700">
        <div>
          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            ${room.pricePerNight.toLocaleString()}/night
          </span>
        </div>
        <div className="text-right">
          <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
            ${room.totalPrice.toLocaleString()}
          </div>
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
            Total for {nights} nights
          </span>
        </div>
      </div>
    </div>
  );
}
