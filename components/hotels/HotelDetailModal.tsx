'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Star,
  MapPin,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import ImageGallery from './ImageGallery';
import RoomTypeCard from './RoomTypeCard';
import RedditBadge from '@/components/shared/RedditBadge';
import type { Hotel, HotelDetail, RoomType } from '@/types';
import clsx from 'clsx';

interface HotelDetailModalProps {
  hotel: Hotel;
  nights: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectRoom: (hotel: Hotel, room: RoomType) => void;
}

export default function HotelDetailModal({
  hotel,
  nights,
  isOpen,
  onClose,
  onSelectRoom,
}: HotelDetailModalProps) {
  const [hotelDetail, setHotelDetail] = useState<HotelDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'amenities' | 'reviews'>('rooms');
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHotelDetails = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
      const params = new URLSearchParams({
        name: hotel.name,
        city: hotel.city,
        basePrice: hotel.pricePerNight.toString(),
        nights: nights.toString(),
        stars: hotel.stars.toString(),
        amenities: hotel.amenities.join(','),
        distance: hotel.distanceToCenter.toString(),
        lat: hotel.latitude.toString(),
        lng: hotel.longitude.toString(),
      });

      // Add timeout to prevent hanging requests
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 30000);

      try {
        const response = await fetch(`/api/hotels/${hotel.id}?${params}`, {
          signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        // Only update state if this request was not aborted
        if (!signal?.aborted) {
          setHotelDetail(data);
          setError(null);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // Silently ignore aborted requests (component unmounted or new hotel opened)
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch hotel details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Set user-friendly error message
      if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load hotel details. Please try again.');
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [hotel, nights]);

  // Reset selectedRoom and fetch details when a different hotel is opened
  useEffect(() => {
    if (isOpen && hotel) {
      // Abort any in-flight request from a previous hotel
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setSelectedRoom(null);
      fetchHotelDetails(controller.signal);

      return () => {
        // Abort the request if the modal closes or hotel changes
        controller.abort();
      };
    }
  }, [isOpen, hotel.id, fetchHotelDetails]);

  const handleSelectRoom = () => {
    if (selectedRoom) {
      // Create updated hotel with selected room price
      const updatedHotel: Hotel = {
        ...hotel,
        pricePerNight: selectedRoom.pricePerNight,
        totalPrice: selectedRoom.totalPrice,
      };
      onSelectRoom(updatedHotel, selectedRoom);
      onClose();
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus when modal closes
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="hotel-detail-title">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal - full screen on mobile, centered on larger screens */}
      <div ref={modalRef} className="absolute inset-0 sm:inset-4 md:inset-8 lg:inset-12 bg-white dark:bg-slate-800 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header - responsive */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 safe-area-inset-top">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <h2 id="hotel-detail-title" className="text-base sm:text-xl font-bold text-slate-800 dark:text-white truncate">{hotel.name}</h2>
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0" role="img" aria-label={`${hotel.stars} star hotel`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={clsx('w-3 h-3 sm:w-4 sm:h-4', i < hotel.stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 dark:text-slate-600')} aria-hidden="true" />
              ))}
            </div>
            {hotelDetail?.isRedditRecommended && (
              <div className="hidden sm:block">
                <RedditBadge
                  variant="compact"
                  mentionCount={hotelDetail.redditMentionCount}
                />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close hotel details"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500 dark:text-orange-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 gap-3 py-12">
              <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              <p className="font-medium">{error}</p>
              <button
                onClick={() => {
                  abortControllerRef.current?.abort();
                  const controller = new AbortController();
                  abortControllerRef.current = controller;
                  fetchHotelDetails(controller.signal);
                }}
                className="px-4 py-2 min-h-[44px] bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : hotelDetail ? (
            <div className="p-3 sm:p-6">
              {/* Gallery */}
              <ImageGallery
                images={hotelDetail.gallery}
                alt={hotelDetail.name}
              />

              {/* Location & Info - responsive */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 mt-3 sm:mt-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{hotelDetail.address}, {hotelDetail.city}</span>
                </div>
                <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{hotelDetail.distanceToCenter}km from center</span>
                </div>
              </div>

              {/* Description */}
              {hotelDetail.fullDescription && (
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-4 sm:mb-6">{hotelDetail.fullDescription}</p>
              )}

              {/* Tabs - responsive and touch-friendly */}
              <div className="flex gap-1 sm:gap-4 border-b border-slate-200 dark:border-slate-700 mb-4 sm:mb-6 overflow-x-auto" role="tablist" aria-label="Hotel information tabs">
                {(['rooms', 'amenities', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={`detail-tabpanel-${tab}`}
                    id={`detail-tab-${tab}`}
                    className={clsx(
                      'min-h-[44px] px-3 sm:px-4 py-3 font-medium capitalize transition-colors relative whitespace-nowrap text-sm sm:text-base',
                      activeTab === tab
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    )}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'rooms' && (
                <div className="space-y-4" role="tabpanel" id="detail-tabpanel-rooms" aria-labelledby="detail-tab-rooms">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                    Select a Room
                  </h3>
                  {hotelDetail.roomTypes.map((room) => (
                    <RoomTypeCard
                      key={room.id}
                      room={room}
                      nights={nights}
                      isSelected={selectedRoom?.id === room.id}
                      onSelect={() => setSelectedRoom(room)}
                    />
                  ))}
                </div>
              )}

              {activeTab === 'amenities' && (
                <div role="tabpanel" id="detail-tabpanel-amenities" aria-labelledby="detail-tab-amenities">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
                    Amenities
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {hotelDetail.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                      >
                        <Check className="w-4 h-4 text-accent-500 dark:text-accent-400" />
                        <span className="text-slate-700 dark:text-slate-300">{amenity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Policies */}
                  {hotelDetail.policies && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
                        Policies
                      </h3>
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p><strong className="dark:text-slate-300">Check-in:</strong> {hotelDetail.policies.checkIn}</p>
                        <p><strong className="dark:text-slate-300">Check-out:</strong> {hotelDetail.policies.checkOut}</p>
                        <p><strong className="dark:text-slate-300">Cancellation:</strong> {hotelDetail.policies.cancellation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div role="tabpanel" id="detail-tabpanel-reviews" aria-labelledby="detail-tab-reviews">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                      Reddit Reviews
                    </h3>
                    {hotelDetail.isRedditRecommended && (
                      <RedditBadge mentionCount={hotelDetail.redditMentionCount} />
                    )}
                  </div>

                  {hotelDetail.redditComments.length > 0 ? (
                    <div className="space-y-4">
                      {hotelDetail.redditComments.map((comment, index) => (
                        <div
                          key={index}
                          className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                              r/
                            </div>
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                              r/{comment.subreddit}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              Score: {comment.score}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 italic">
                            "{comment.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400">
                      No Reddit reviews found for this hotel.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer - responsive and touch-friendly */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 safe-area-inset-bottom">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-center sm:text-left">
              {selectedRoom ? (
                <div>
                  <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Selected: </span>
                  <span className="font-medium text-sm sm:text-base dark:text-white">{selectedRoom.name}</span>
                  <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white ml-2 sm:ml-3">
                    ${selectedRoom.totalPrice.toLocaleString()}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 ml-1">
                    for {nights} nights
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">Select a room to continue</span>
              )}
            </div>
            <button
              onClick={handleSelectRoom}
              disabled={!selectedRoom}
              className={clsx(
                'w-full sm:w-auto min-h-[48px] sm:min-h-[44px] px-6 py-3 rounded-xl font-medium transition-colors text-base sm:text-sm',
                selectedRoom
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              )}
            >
              Select This Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
