'use client';

import { useState, useMemo } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import type { CartItem } from '@/lib/schemas/trip';
import {
  ShoppingCart,
  ChevronUp,
  ChevronDown,
  X,
  MapPin,
  Clock,
  ArrowRight,
  Map,
} from 'lucide-react';
import clsx from 'clsx';
import { handleImageError } from '@/lib/utils';
import { clientEnv } from '@/lib/env';

// Category icons for display
const CATEGORY_ICONS: Record<string, string> = {
  beaches: '🏖️',
  museums: '🏛️',
  food_tours: '🍽️',
  nightlife: '🎉',
  day_trips: '🚗',
  hidden_gems: '💎',
  outdoor: '🏃',
  shopping: '🛍️',
  cultural: '🎭',
  wellness: '🧘',
  adventure: '🧗',
  nature: '🌿',
  landmarks: '🏰',
  entertainment: '🎬',
  dining: '🍴',
};

// Simple static map preview using Google Static Maps API
function StaticMapPreview({ items }: { items: CartItem[] }) {
  const validItems = items.filter(item => item.recommendation.lat && item.recommendation.lng);
  if (validItems.length === 0) return null;

  // Calculate center
  const lats = validItems.map(item => item.recommendation.lat!);
  const lngs = validItems.map(item => item.recommendation.lng!);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  // Build markers string
  const markers = validItems.map((item, idx) => {
    const color = item.recommendation.category === 'dining' || item.recommendation.category === 'food_tours'
      ? 'red'
      : 'orange';
    return `markers=color:${color}|label:${idx + 1}|${item.recommendation.lat},${item.recommendation.lng}`;
  }).join('&');

  const apiKey = clientEnv.GOOGLE_MAPS_API_KEY;
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=12&size=600x150&maptype=roadmap&${markers}&key=${apiKey}`;

  return (
    <img
      src={mapUrl}
      alt="Map of your experiences"
      className="w-full h-full object-cover"
      onError={(e) => handleImageError(e, 'map')}
    />
  );
}

interface ExperienceCartProps {
  onContinue?: () => void;
  showContinue?: boolean;
}

export default function ExperienceCart({ onContinue, showContinue = true }: ExperienceCartProps) {
  const { experienceCart, removeFromCart, trip } = useTripStore(useShallow((state) => ({
    experienceCart: state.experienceCart,
    removeFromCart: state.removeFromCart,
    trip: state.trip,
  })));
  const [isExpanded, setIsExpanded] = useState(false);

  // Group cart items by destination
  const cartByDestination = useMemo(() => {
    const grouped: Record<string, typeof experienceCart> = {};
    experienceCart.forEach((item) => {
      if (!grouped[item.destinationId]) {
        grouped[item.destinationId] = [];
      }
      grouped[item.destinationId].push(item);
    });
    return grouped;
  }, [experienceCart]);

  // Get destination names
  const destinationNames = useMemo(() => {
    const names: Record<string, string> = {};
    trip.destinations.forEach((dest) => {
      names[dest.destinationId] = dest.place.name;
    });
    return names;
  }, [trip.destinations]);

  const itemCount = experienceCart.length;

  // Don't render if cart is empty
  if (itemCount === 0) {
    return null;
  }

  return (
    <div
      className={clsx(
        'fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t-2 border-reddit shadow-lg dark:shadow-slate-900/70 z-50 transition-all duration-300',
        isExpanded ? 'max-h-[60vh]' : 'max-h-24'
      )}
    >
      {/* Collapsed header - always visible. Uses a div instead of a single button
           to avoid nesting interactive elements (the Continue button) inside a button. */}
      <div
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-none p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-reddit focus:ring-offset-2 dark:focus:ring-offset-slate-800 rounded-lg"
          aria-expanded={isExpanded}
          aria-label={`Your Trip Cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}. ${isExpanded ? 'Collapse' : 'Expand'} cart.`}
        >
          <div className="relative flex-shrink-0">
            <ShoppingCart className="w-6 h-6 text-reddit" aria-hidden="true" />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-reddit text-white text-xs font-bold rounded-full flex items-center justify-center" aria-hidden="true">
              {itemCount}
            </span>
          </div>
          <div className="text-left min-w-0">
            <span className="font-semibold text-slate-900 dark:text-white">Your Trip Cart</span>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              {Object.entries(cartByDestination).map(([destId, items], idx) => (
                <span key={destId}>
                  {idx > 0 && <span className="mx-1">•</span>}
                  {destinationNames[destId]} ({items.length})
                </span>
              ))}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 ml-2" aria-hidden="true">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            ) : (
              <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            )}
          </div>
        </button>

        {showContinue && onContinue && (
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 ml-4 bg-reddit hover:bg-reddit-dark text-white font-medium rounded-xl transition-colors text-sm sm:text-base flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-reddit focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            aria-label="Continue to review"
          >
            <span className="hidden sm:inline">Continue</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 max-h-[calc(60vh-80px)] overflow-y-auto">
          {/* Mini map preview showing cart item locations */}
          {experienceCart.some(item => item.recommendation.lat && item.recommendation.lng) && (
            <div className="mb-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <div className="bg-slate-100 dark:bg-slate-900/50 px-3 py-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Map className="w-4 h-4" />
                <span className="font-medium">Your experiences on the map</span>
              </div>
              <div className="h-32 bg-slate-50 dark:bg-slate-900 relative">
                <StaticMapPreview items={experienceCart} />
              </div>
            </div>
          )}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-4">
            {Object.entries(cartByDestination).map(([destId, items]) => (
              <div key={destId}>
                <h4 className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  <MapPin className="w-4 h-4 text-reddit" />
                  {destinationNames[destId]} ({items.length} experiences)
                </h4>
                <div className="space-y-2 pl-6">
                  {items.map((item) => {
                    const rec = item.recommendation;
                    const icon = CATEGORY_ICONS[rec.category] || '📍';
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg flex-shrink-0">{icon}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">
                              {rec.name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                              {rec.estimatedDurationMinutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {rec.estimatedDurationMinutes >= 60
                                    ? `${Math.round(rec.estimatedDurationMinutes / 60)}h`
                                    : `${rec.estimatedDurationMinutes}m`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                          aria-label={`Remove ${rec.name} from cart`}
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer with continue button */}
          {showContinue && onContinue && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 flex justify-end">
              <button
                onClick={onContinue}
                className="flex items-center gap-2 px-6 py-3 bg-reddit hover:bg-reddit-dark text-white font-semibold rounded-xl transition-colors"
              >
                Continue to Review
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
