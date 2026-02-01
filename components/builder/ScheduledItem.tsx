'use client';

import { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import {
  GripVertical,
  Clock,
  Star,
  MapPin,
  Utensils,
  X,
  Navigation,
  AlertCircle,
  Calendar,
  Edit3,
  Trash2,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import type { CollectionItem } from '@/stores/tripStoreV2';
import { calculateAllTravelModes, formatDistance, getTransportIcon, formatTravelTime } from '@/lib/utils/travelTime';
import PlaceDetailModal from './PlaceDetailModal';
import RestaurantAvailability from '@/components/ui/RestaurantAvailability';

interface ScheduledItemProps {
  item: CollectionItem;
  index: number;
  dayIndex: number;
  isLast: boolean;
  previousItem?: CollectionItem;
}

export default function ScheduledItem({
  item,
  index,
  dayIndex,
  isLast,
  previousItem,
}: ScheduledItemProps) {
  const { unscheduleItem, trip, updateScheduledItem } = useTripStoreV2();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReservationMenu, setShowReservationMenu] = useState(false);
  const [showTransportMenu, setShowTransportMenu] = useState(false);
  const [selectedTransportMode, setSelectedTransportMode] = useState<'walking' | 'driving' | 'transit' | null>(null);

  // Get destination for this item
  const destination = trip.destinations.find(d => d.destinationId === item.destinationId);
  const destinationName = destination?.place.name || '';

  // Get date for this day
  const startDate = trip.basics.startDate ? new Date(trip.basics.startDate) : new Date();
  const dayDate = new Date(startDate);
  dayDate.setDate(dayDate.getDate() + dayIndex);
  const dateStr = dayDate.toISOString().split('T')[0];

  // Handle restaurant booking
  const handleBook = (slot: { time: string; seating: string }) => {
    updateScheduledItem(item.id, {
      reservationTime: slot.time,
    });
    setShowBookingModal(false);
  };

  const handleAgentBook = (partySize: number, preferredTime: string) => {
    updateScheduledItem(item.id, {
      reservationTime: `Pending (${preferredTime})`,
    });
    setShowBookingModal(false);
  };

  const handleUserBook = () => {
    // Open restaurant website or Google Maps
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.name + ' ' + destinationName + ' reservations')}`;
    window.open(searchUrl, '_blank');
    setShowBookingModal(false);
  };

  const handleCancelReservation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateScheduledItem(item.id, { reservationTime: '' });
    setShowReservationMenu(false);
  };

  const handleModifyReservation = () => {
    setShowReservationMenu(false);
    setShowBookingModal(true);
  };

  // Calculate all travel modes from previous item
  const allTravelModes = previousItem && previousItem.lat && previousItem.lng && item.lat && item.lng
    ? calculateAllTravelModes(previousItem.lat, previousItem.lng, item.lat, item.lng)
    : null;

  // Use selected mode, or smart recommendation (walking only if < 30 min)
  const activeMode = selectedTransportMode || allTravelModes?.recommendedMode || 'walking';
  const travelInfo = allTravelModes ? {
    distanceKm: allTravelModes.distanceKm,
    timeMinutes: allTravelModes[activeMode].timeMinutes,
    mode: activeMode,
  } : null;

  const isRestaurant = item.category === 'dining' || item.category === 'restaurants';

  // Get opening hours display
  const getHoursDisplay = () => {
    if (item.openingHours) {
      return item.openingHours;
    }
    // Default estimate
    return '9 AM - 5 PM';
  };

  // Get duration display
  const getDurationDisplay = () => {
    if (item.durationMinutes) {
      if (item.durationMinutes >= 60) {
        const hours = Math.floor(item.durationMinutes / 60);
        const mins = item.durationMinutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
      return `${item.durationMinutes}m`;
    }
    return isRestaurant ? '1.5h' : '1-2h';
  };

  // Generate Google Maps directions URL using active transport mode
  const getDirectionsUrl = () => {
    if (!previousItem?.lat || !previousItem?.lng || !item.lat || !item.lng) return null;

    return `https://www.google.com/maps/dir/?api=1&origin=${previousItem.lat},${previousItem.lng}&destination=${item.lat},${item.lng}&travelmode=${activeMode}`;
  };

  const directionsUrl = getDirectionsUrl();

  // Handle transport mode selection
  const handleSelectTransportMode = (mode: 'walking' | 'driving' | 'transit') => {
    setSelectedTransportMode(mode);
    setShowTransportMenu(false);
  };

  return (
    <>
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={clsx(
            'relative',
            snapshot.isDragging && 'z-50'
          )}
        >
          {/* Travel segment (if not first item) */}
          {travelInfo && allTravelModes && index > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTransportMenu(!showTransportMenu);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full transition-colors cursor-pointer"
                >
                  <span>{getTransportIcon(travelInfo.mode)}</span>
                  <span className="font-medium">{travelInfo.timeMinutes} min</span>
                  <span className="text-slate-400">({formatDistance(travelInfo.distanceKm)})</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Transport mode dropdown */}
                {showTransportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTransportMenu(false);
                      }}
                    />
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 min-w-[180px]">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase">Travel mode</p>

                      {/* Walking option */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTransportMode('walking');
                        }}
                        className={clsx(
                          'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200',
                          travelInfo.mode === 'walking' && 'bg-primary-50 dark:bg-primary-900/30'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>🚶</span>
                          <span className="font-medium">Walk</span>
                          {allTravelModes.walking.timeMinutes > 30 && (
                            <span className="text-amber-600 dark:text-amber-400 text-[10px]">Long walk</span>
                          )}
                        </div>
                        <span className="text-slate-500 dark:text-slate-400">{allTravelModes.walking.timeMinutes} min</span>
                      </button>

                      {/* Transit option */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTransportMode('transit');
                        }}
                        className={clsx(
                          'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200',
                          travelInfo.mode === 'transit' && 'bg-primary-50 dark:bg-primary-900/30'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>🚇</span>
                          <span className="font-medium">Transit</span>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400">{allTravelModes.transit.timeMinutes} min</span>
                      </button>

                      {/* Driving option */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTransportMode('driving');
                        }}
                        className={clsx(
                          'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200',
                          travelInfo.mode === 'driving' && 'bg-primary-50 dark:bg-primary-900/30'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>🚗</span>
                          <span className="font-medium">Drive</span>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400">{allTravelModes.driving.timeMinutes} min</span>
                      </button>

                      {/* Divider and directions link */}
                      {directionsUrl && (
                        <>
                          <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Navigation className="w-3 h-3" />
                            Open in Google Maps
                          </a>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          )}

          {/* Item card */}
          <div
            onClick={() => setShowDetailModal(true)}
            className={clsx(
              'group flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border transition-all cursor-pointer',
              snapshot.isDragging
                ? 'shadow-lg border-primary-300 dark:border-primary-500 bg-white dark:bg-slate-800 rotate-1'
                : isRestaurant
                ? 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
            )}
          >
            {/* Drag handle - hidden on small mobile */}
            <div
              {...provided.dragHandleProps}
              className="hidden sm:flex flex-shrink-0 p-1 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 cursor-grab mt-1"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Number badge */}
            <div className={clsx(
              'flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold mt-1',
              isRestaurant
                ? 'bg-amber-500 text-white'
                : 'bg-primary-500 text-white'
            )}>
              {index + 1}
            </div>

            {/* Photo thumbnail with fallback initial */}
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/50 relative">
              {/* Fallback initial - always rendered behind */}
              <span className="absolute inset-0 flex items-center justify-center text-primary-400 dark:text-primary-300 font-bold text-sm sm:text-lg z-0">
                {item.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
              {/* Image on top - hides on error to reveal initial */}
              {item.imageUrl && item.imageUrl.length > 0 && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="absolute inset-0 w-full h-full object-cover z-10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1 sm:gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-1 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    {/* Rating */}
                    {item.rating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {item.rating.toFixed(1)}
                      </span>
                    )}

                    {/* Category */}
                    <span className="capitalize">{item.category?.replace('_', ' ')}</span>

                    {/* Duration */}
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {getDurationDisplay()}
                    </span>

                    {/* Restaurant-specific: Price range & cuisine */}
                    {isRestaurant && (
                      <>
                        {item.priceLevel && (
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            {'$'.repeat(item.priceLevel)}
                          </span>
                        )}
                        {item.cuisineType && (
                          <span>{item.cuisineType}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Opening hours - hidden on very small screens */}
                  <p className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {getHoursDisplay()}
                  </p>

                  {/* Reservation badge or booking button for restaurants */}
                  {isRestaurant && (
                    item.reservationTime ? (
                      <div className="mt-2 relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReservationMenu(!showReservationMenu);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/70 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Reserved: {item.reservationTime}
                        </button>

                        {/* Reservation menu dropdown */}
                        {showReservationMenu && (
                          <>
                            {/* Backdrop to close menu */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowReservationMenu(false);
                              }}
                            />
                            <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 min-w-[140px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleModifyReservation();
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                              >
                                <Edit3 className="w-3 h-3" />
                                Change Time
                              </button>
                              <button
                                onClick={handleCancelReservation}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                              >
                                <Trash2 className="w-3 h-3" />
                                Cancel Reservation
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowBookingModal(true);
                        }}
                        className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-medium transition-colors"
                      >
                        <Calendar className="w-3 h-3" />
                        Book Table
                      </button>
                    )
                  )}
                </div>

                {/* Remove button - always visible on mobile */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    unscheduleItem(item.id);
                  }}
                  className="sm:opacity-0 sm:group-hover:opacity-100 p-1 sm:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>

    {/* Detail Modal */}
    {showDetailModal && (
      <PlaceDetailModal
        item={item}
        onClose={() => setShowDetailModal(false)}
      />
    )}

    {/* Restaurant Booking Modal */}
    {showBookingModal && isRestaurant && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setShowBookingModal(false)}
        />
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
    </>
  );
}
