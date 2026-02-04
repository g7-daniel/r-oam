'use client';

import { useState } from 'react';
import { useTripStore } from '@/stores/tripStore';
import {
  X,
  Star,
  Clock,
  MapPin,
  Navigation,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Utensils,
} from 'lucide-react';
import clsx from 'clsx';
import type { CollectionItem } from '@/stores/tripStore';
import { handleImageError, getPlaceholderImage } from '@/lib/utils';
import RestaurantAvailability from '@/components/ui/RestaurantAvailability';

interface PlaceDetailModalProps {
  item: CollectionItem;
  onClose: () => void;
  onSchedule?: (dayIndex: number) => void;
}

export default function PlaceDetailModal({
  item,
  onClose,
  onSchedule,
}: PlaceDetailModalProps) {
  const { trip, addToCollection, scheduleItem, updateScheduledItem, scheduledItems, unscheduleItem } = useTripStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Use item image or null (we'll show a nice gradient fallback)
  const images = item.imageUrl ? [item.imageUrl] : [];
  const [imageError, setImageError] = useState(false);

  // Check if item is already scheduled
  const foundScheduledItem = scheduledItems.find(si => si.id === item.id);
  const isScheduled = !!foundScheduledItem;
  const scheduledDayIndex = foundScheduledItem?.scheduledDayIndex;

  // Initialize selected day to the day item is on (if scheduled), otherwise 0
  const [selectedDay, setSelectedDay] = useState(scheduledDayIndex ?? 0);

  // Calculate total days for day selector
  const totalDays = trip.destinations.reduce((sum, d) => sum + d.nights, 0) + 1;

  const isRestaurant = item.category === 'dining' || item.category === 'restaurants' || item.category === 'cafes';

  // Get destination for booking
  const destination = trip.destinations.find(d => d.destinationId === item.destinationId);
  const destinationName = destination?.place.name || '';

  // Get date for booking
  const startDate = trip.basics.startDate ? new Date(trip.basics.startDate) : new Date();
  const dayDate = new Date(startDate);
  dayDate.setDate(dayDate.getDate() + selectedDay);
  const dateStr = dayDate.toISOString().split('T')[0];

  // Booking handlers
  const handleBook = (slot: { time: string; seating: string }) => {
    updateScheduledItem(item.id, { reservationTime: slot.time });
    setShowBookingModal(false);
  };

  const handleAgentBook = (_partySize: number, preferredTime: string) => {
    // partySize is available for future use (e.g., sending to booking API)
    updateScheduledItem(item.id, { reservationTime: `Pending (${preferredTime})` });
    setShowBookingModal(false);
  };

  const handleUserBook = () => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.name + ' ' + destinationName + ' reservations')}`;
    window.open(searchUrl, '_blank');
    setShowBookingModal(false);
  };

  // Generate Google Maps URL
  const mapsUrl = item.lat && item.lng
    ? `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`;

  const handleAddToCollection = () => {
    addToCollection(isRestaurant ? 'restaurants' : 'experiences', item);
  };

  const handleSchedule = () => {
    scheduleItem(item.id, selectedDay);
    onSchedule?.(selectedDay);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal - full screen on mobile, modal on larger screens */}
      <div className="relative w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] bg-white dark:bg-slate-800 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Close button - touch-friendly */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image gallery - responsive height */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary-200 to-primary-300 dark:from-primary-900 dark:to-primary-800 flex-shrink-0">
          {/* Image with placeholder fallback */}
          <img
            src={images.length > 0 && !imageError ? images[currentImageIndex] : getPlaceholderImage('generic')}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              setImageError(true);
              handleImageError(e, 'generic');
            }}
          />

          {/* Image navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                disabled={currentImageIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))}
                disabled={currentImageIndex === images.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      'w-2 h-2 rounded-full transition-colors',
                      idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content - responsive padding */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Title and rating */}
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {item.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              {item.rating && (
                <span className="flex items-center gap-1 font-medium text-slate-900 dark:text-white">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  {item.rating.toFixed(1)}
                </span>
              )}
              <span className="capitalize text-slate-500 dark:text-slate-400">
                {item.category?.replace('_', ' ')}
              </span>
              {item.durationMinutes && (
                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Clock className="w-4 h-4" />
                  {item.durationMinutes >= 60
                    ? `${Math.floor(item.durationMinutes / 60)}-${Math.ceil(item.durationMinutes / 60) + 1} hours`
                    : `${item.durationMinutes} min`}
                </span>
              )}
              {isRestaurant && item.priceLevel && (
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {'$'.repeat(item.priceLevel)}
                </span>
              )}
            </div>
          </div>

          {/* Why we recommend this */}
          {item.whyMatch && (
            <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                Why we recommend this for you
              </p>
              <p className="text-slate-700 dark:text-slate-300">{item.whyMatch}</p>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {item.description}
            </p>
          )}

          {/* Dining-specific info */}
          {isRestaurant && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {item.mealType && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                  <Utensils className="w-3.5 h-3.5" />
                  {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}
                </span>
              )}
              {item.diningStyle && (
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm">
                  {item.diningStyle}
                </span>
              )}
              {item.reservationRequired && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-sm">
                  📞 Reservations recommended
                </span>
              )}
              {item.reservationTime && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                  ✓ Reserved: {item.reservationTime}
                </span>
              )}
            </div>
          )}

          {/* Details */}
          <div className="space-y-3 mb-6">
            {item.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">{item.address}</span>
              </div>
            )}

            {item.openingHours && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">{item.openingHours}</span>
              </div>
            )}

            {isRestaurant && item.cuisineType && (
              <div className="flex items-start gap-3">
                <span className="text-xl">🍽️</span>
                <span className="text-slate-600 dark:text-slate-300">{item.cuisineType}</span>
              </div>
            )}
          </div>

          {/* Reddit tip - enhanced with upvotes */}
          {item.source?.quote && (
            <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
                <span>💬</span>
                {item.source.upvotes && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 rounded-full text-xs">
                    <ArrowUp className="w-3 h-3" />
                    {item.source.upvotes.toLocaleString()}
                  </span>
                )}
                {item.source.subreddit ? (
                  <span>r/{item.source.subreddit}</span>
                ) : (
                  <span>From Reddit</span>
                )}
              </div>
              <p className="text-slate-700 dark:text-slate-300 italic">"{item.source.quote}"</p>
              {item.source.url && (
                <a
                  href={item.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline mt-2 inline-block"
                >
                  View original post →
                </a>
              )}
            </div>
          )}

          {/* Day selector for scheduling */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {isScheduled ? (
                <span>
                  Currently on <span className="text-green-600 dark:text-green-400">Day {(scheduledDayIndex ?? 0) + 1}</span>
                  {selectedDay !== scheduledDayIndex && (
                    <span className="text-slate-500 dark:text-slate-400"> → Move to:</span>
                  )}
                </span>
              ) : (
                'Schedule for:'
              )}
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {Array.from({ length: Math.min(totalDays, 7) }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(idx)}
                  className={clsx(
                    'min-h-[44px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative',
                    selectedDay === idx
                      ? 'bg-primary-500 text-white'
                      : scheduledDayIndex === idx
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 ring-2 ring-green-500'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  )}
                >
                  Day {idx + 1}
                  {scheduledDayIndex === idx && selectedDay !== idx && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>
              ))}
              {totalDays > 7 && (
                <span className="px-3 py-1.5 text-sm text-slate-400">
                  +{totalDays - 7} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions - responsive layout with touch-friendly buttons */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 safe-area-inset-bottom">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
            {/* Secondary actions row on mobile */}
            <div className="flex gap-2 sm:contents">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-3 sm:px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors text-sm"
              >
                <Navigation className="w-4 h-4" />
                <span className="hidden xs:inline">Directions</span>
              </a>
              {/* Only show Save button if not already scheduled */}
              {!isScheduled && (
                <button
                  onClick={handleAddToCollection}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-3 sm:px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Save
                </button>
              )}
              {isRestaurant && !item.reservationTime && (
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-3 sm:px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden xs:inline">Book</span>
                </button>
              )}
            </div>

            {/* Primary action button - full width on mobile */}
            {isScheduled ? (
              scheduledDayIndex === selectedDay ? (
                // Already on this day - show remove option
                <button
                  onClick={() => {
                    unscheduleItem(item.id);
                    onClose();
                  }}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[44px] px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                >
                  <X className="w-4 h-4" />
                  Remove from Day {selectedDay + 1}
                </button>
              ) : (
                // On a different day - show move option
                <button
                  onClick={() => {
                    unscheduleItem(item.id);
                    scheduleItem(item.id, selectedDay);
                    onSchedule?.(selectedDay);
                    onClose();
                  }}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[44px] px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  Move to Day {selectedDay + 1}
                </button>
              )
            ) : (
              // Not scheduled - show add option
              <button
                onClick={handleSchedule}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[44px] px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
              >
                <Calendar className="w-4 h-4" />
                Add to Day {selectedDay + 1}
              </button>
            )}
          </div>
        </div>

        {/* Restaurant Booking Modal */}
        {showBookingModal && isRestaurant && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/40">
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setShowBookingModal(false)}
                className="absolute -top-2 -right-2 z-10 p-2 bg-white shadow-lg rounded-full text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
              <RestaurantAvailability
                restaurantName={item.name}
                destinationName={destinationName}
                date={dateStr}
                defaultPartySize={trip.basics.travelers?.adults || 2}
                onBook={handleBook}
                onAgentBook={handleAgentBook}
                onUserBook={handleUserBook}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
