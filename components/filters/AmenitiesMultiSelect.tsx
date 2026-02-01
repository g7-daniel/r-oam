'use client';

import { useState } from 'react';
import {
  Wifi,
  Car,
  Dumbbell,
  Waves,
  UtensilsCrossed,
  Snowflake,
  Coffee,
  Sparkles,
  PawPrint,
  Baby,
  Accessibility,
  Tv,
  Shirt,
  Wind,
  Check,
} from 'lucide-react';
import clsx from 'clsx';

const HOTEL_AMENITIES = [
  { id: 'wifi', label: 'Free WiFi', icon: Wifi },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'gym', label: 'Gym', icon: Dumbbell },
  { id: 'pool', label: 'Pool', icon: Waves },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { id: 'aircon', label: 'Air Conditioning', icon: Snowflake },
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'spa', label: 'Spa', icon: Sparkles },
  { id: 'pets', label: 'Pet Friendly', icon: PawPrint },
  { id: 'family', label: 'Family Rooms', icon: Baby },
  { id: 'accessible', label: 'Accessible', icon: Accessibility },
  { id: 'tv', label: 'Flat Screen TV', icon: Tv },
  { id: 'laundry', label: 'Laundry', icon: Shirt },
  { id: 'balcony', label: 'Balcony', icon: Wind },
];

interface AmenitiesMultiSelectProps {
  value: string[];
  onChange: (amenities: string[]) => void;
  maxVisible?: number;
}

export default function AmenitiesMultiSelect({
  value,
  onChange,
  maxVisible = 8,
}: AmenitiesMultiSelectProps) {
  const [showAll, setShowAll] = useState(false);

  const toggleAmenity = (amenityId: string) => {
    if (value.includes(amenityId)) {
      onChange(value.filter((id) => id !== amenityId));
    } else {
      onChange([...value, amenityId]);
    }
  };

  const visibleAmenities = showAll
    ? HOTEL_AMENITIES
    : HOTEL_AMENITIES.slice(0, maxVisible);

  const hiddenCount = HOTEL_AMENITIES.length - maxVisible;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">Amenities</label>
        {value.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-xs text-sky-600 hover:text-sky-700"
          >
            Clear ({value.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {visibleAmenities.map((amenity) => {
          const Icon = amenity.icon;
          const isSelected = value.includes(amenity.id);

          return (
            <button
              key={amenity.id}
              onClick={() => toggleAmenity(amenity.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left text-sm',
                isSelected
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{amenity.label}</span>
              {isSelected && (
                <Check className="w-4 h-4 text-sky-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
        >
          {showAll ? 'Show less' : `Show ${hiddenCount} more amenities`}
        </button>
      )}
    </div>
  );
}

export { HOTEL_AMENITIES };
