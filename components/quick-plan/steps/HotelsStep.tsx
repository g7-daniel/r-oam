'use client';

import { useEffect, useState } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Building, Loader2, Star, Check, DollarSign } from 'lucide-react';
import clsx from 'clsx';

export default function HotelsStep() {
  const {
    preferences,
    hotelShortlists,
    setHotelShortlist,
    selectHotel,
    isLoading,
    setLoading,
  } = useQuickPlanStore();
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

  const stops = preferences.selectedSplit?.stops || [];

  useEffect(() => {
    if (stops.length > 0 && !activeAreaId) {
      setActiveAreaId(stops[0].area.id);
      fetchHotelsForArea(stops[0].area.id);
    }
  }, [stops]);

  const fetchHotelsForArea = async (areaId: string) => {
    if (hotelShortlists.has(areaId)) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/quick-plan/hotels?area=${encodeURIComponent(areaId)}&destination=${encodeURIComponent(preferences.destinationContext?.canonicalName || '')}`
      );
      const data = await response.json();
      setHotelShortlist(areaId, data.hotels || []);
    } catch (error) {
      console.error('Failed to fetch hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAreaChange = (areaId: string) => {
    setActiveAreaId(areaId);
    fetchHotelsForArea(areaId);
  };

  const currentHotels = activeAreaId ? hotelShortlists.get(activeAreaId) || [] : [];
  const selectedHotel = activeAreaId ? preferences.selectedHotels?.[activeAreaId] : null;

  return (
    <div className="space-y-6">
      {/* Area tabs */}
      {stops.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {stops.map(({ area, nights }) => (
            <button
              key={area.id}
              onClick={() => handleAreaChange(area.id)}
              className={clsx(
                'px-4 py-2 rounded-lg border whitespace-nowrap transition-all',
                activeAreaId === area.id
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 text-slate-600 hover:border-orange-300'
              )}
            >
              {area.name} ({nights}n)
              {preferences.selectedHotels?.[area.id] && (
                <Check className="w-4 h-4 ml-2 inline-block text-green-500" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Hotels list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {currentHotels.map((hotel) => (
            <button
              key={hotel.placeId}
              onClick={() => activeAreaId && selectHotel(activeAreaId, hotel)}
              className={clsx(
                'w-full p-4 rounded-xl border transition-all text-left',
                selectedHotel?.placeId === hotel.placeId
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-orange-300'
              )}
            >
              <div className="flex gap-4">
                {hotel.imageUrl && (
                  <img
                    src={hotel.imageUrl}
                    alt={hotel.name}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-slate-900 truncate">{hotel.name}</h3>
                    {selectedHotel?.placeId === hotel.placeId && (
                      <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{hotel.address}</p>

                  <div className="flex items-center gap-3 mt-2">
                    {hotel.googleRating && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{hotel.googleRating}</span>
                        {hotel.reviewCount && (
                          <span className="text-slate-400">({hotel.reviewCount})</span>
                        )}
                      </div>
                    )}
                    {hotel.pricePerNight && (
                      <div className="flex items-center gap-1 text-sm text-green-700">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-medium">${hotel.pricePerNight}/night</span>
                      </div>
                    )}
                  </div>

                  {hotel.reasons && hotel.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {hotel.reasons.slice(0, 2).map((reason, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}

          {currentHotels.length === 0 && !isLoading && (
            <div className="text-center py-8 text-slate-500">
              <Building className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No hotels found for this area</p>
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
        <p className="text-sm text-orange-800">
          <strong>Hotels selected:</strong> {Object.keys(preferences.selectedHotels || {}).length} of {stops.length}
        </p>
      </div>
    </div>
  );
}
