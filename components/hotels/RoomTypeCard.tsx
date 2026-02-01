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
        'relative p-4 rounded-xl border-2 transition-all',
        room.available
          ? isSelected
            ? 'border-sky-500 bg-sky-50 cursor-pointer'
            : 'border-slate-200 hover:border-slate-300 cursor-pointer'
          : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
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

      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-slate-800">{room.name}</h4>
          <p className="text-sm text-slate-500">{room.description}</p>
        </div>
        {room.imageUrl && (
          <img
            src={room.imageUrl}
            alt={room.name}
            className="w-16 h-12 rounded-lg object-cover"
          />
        )}
      </div>

      {/* Room details */}
      <div className="flex flex-wrap gap-3 mb-3 text-sm text-slate-600">
        <div className="flex items-center gap-1">
          <Bed className="w-4 h-4" />
          <span>{room.bedType}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>Up to {room.maxOccupancy} guests</span>
        </div>
      </div>

      {/* Amenities */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {room.amenities.slice(0, 4).map((amenity) => (
          <span
            key={amenity}
            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
          >
            {amenity}
          </span>
        ))}
        {room.amenities.length > 4 && (
          <span className="text-xs text-slate-400">
            +{room.amenities.length - 4} more
          </span>
        )}
      </div>

      {/* Pricing */}
      <div className="flex items-end justify-between pt-3 border-t border-slate-100">
        <div>
          <span className="text-sm text-slate-500">
            ${room.pricePerNight.toLocaleString()}/night
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">
            ${room.totalPrice.toLocaleString()}
          </div>
          <span className="text-xs text-slate-500">
            Total for {nights} nights
          </span>
        </div>
      </div>
    </div>
  );
}
