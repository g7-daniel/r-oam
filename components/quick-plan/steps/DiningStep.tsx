'use client';

import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Utensils, Star, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function DiningStep() {
  const { preferences, restaurantShortlists, selectRestaurant, deselectRestaurant, isLoading } = useQuickPlanStore();

  const stops = preferences.selectedSplit?.stops || [];

  if (preferences.diningMode === 'none') {
    return (
      <div className="text-center py-12">
        <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Dining planning skipped</p>
        <p className="text-sm text-slate-400 mt-1">Click Continue to proceed</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Here are recommended restaurants for your trip. Select the ones you'd like to visit.
      </p>

      {stops.map(({ area }) => {
        const restaurants = restaurantShortlists.get(area.id) || [];
        const selected = (preferences as any).selectedRestaurants?.get?.(area.id) ||
          (preferences as any).selectedRestaurants?.[area.id] || [];

        return (
          <div key={area.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="font-medium text-slate-900">{area.name}</h3>
            </div>

            <div className="p-4 space-y-3">
              {restaurants.length > 0 ? (
                restaurants.slice(0, 5).map((restaurant) => {
                  const isSelected = selected.some((r: any) => r.placeId === restaurant.placeId);

                  return (
                    <button
                      key={restaurant.placeId}
                      onClick={() =>
                        isSelected
                          ? deselectRestaurant(area.id, restaurant.placeId)
                          : selectRestaurant(area.id, restaurant)
                      }
                      className={clsx(
                        'w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3',
                        isSelected
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-orange-300'
                      )}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{restaurant.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                          {restaurant.cuisine?.length > 0 && (
                            <span>{restaurant.cuisine.join(', ')}</span>
                          )}
                          {restaurant.googleRating && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {restaurant.googleRating}
                            </span>
                          )}
                          {restaurant.priceLevel && (
                            <span>{'$'.repeat(restaurant.priceLevel)}</span>
                          )}
                        </div>
                      </div>
                      <div
                        className={clsx(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-slate-300'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Utensils className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No restaurants loaded yet</p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Summary */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
        <p className="text-sm text-orange-800">
          <strong>
            {(() => {
              const selRest = (preferences as any).selectedRestaurants;
              if (!selRest) return 0;
              if (selRest.values) return Array.from(selRest.values()).flat().length;
              return Object.values(selRest).flat().length;
            })()} restaurants
          </strong>{' '}
          selected across all areas
        </p>
      </div>
    </div>
  );
}
