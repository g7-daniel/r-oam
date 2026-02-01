'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Star,
  MapPin,
  Clock,
  Check,
  Wifi,
  Car,
  UtensilsCrossed,
  Waves,
  Loader2,
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
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'amenities' | 'reviews'>('rooms');

  useEffect(() => {
    if (isOpen && hotel) {
      fetchHotelDetails();
    }
  }, [isOpen, hotel?.id]);

  const fetchHotelDetails = async () => {
    setIsLoading(true);
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

      const response = await fetch(`/api/hotels/${hotel.id}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setHotelDetail(data);
      }
    } catch (error) {
      console.error('Failed to fetch hotel details:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">{hotel.name}</h2>
            <div className="flex items-center gap-1">
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            {hotelDetail?.isRedditRecommended && (
              <RedditBadge
                variant="compact"
                mentionCount={hotelDetail.redditMentionCount}
              />
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
          ) : hotelDetail ? (
            <div className="p-6">
              {/* Gallery */}
              <ImageGallery
                images={hotelDetail.gallery}
                alt={hotelDetail.name}
              />

              {/* Location & Info */}
              <div className="flex flex-wrap gap-4 mt-4 mb-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span>{hotelDetail.address}, {hotelDetail.city}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span>{hotelDetail.distanceToCenter}km from center</span>
                </div>
              </div>

              {/* Description */}
              {hotelDetail.fullDescription && (
                <p className="text-slate-600 mb-6">{hotelDetail.fullDescription}</p>
              )}

              {/* Tabs */}
              <div className="flex gap-4 border-b border-slate-200 mb-6">
                {(['rooms', 'amenities', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={clsx(
                      'px-4 py-3 font-medium capitalize transition-colors relative',
                      activeTab === tab
                        ? 'text-sky-600'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'rooms' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700">
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
                <div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">
                    Amenities
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {hotelDetail.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg"
                      >
                        <Check className="w-4 h-4 text-teal-500" />
                        <span className="text-slate-700">{amenity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Policies */}
                  {hotelDetail.policies && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-slate-700 mb-4">
                        Policies
                      </h3>
                      <div className="space-y-2 text-sm text-slate-600">
                        <p><strong>Check-in:</strong> {hotelDetail.policies.checkIn}</p>
                        <p><strong>Check-out:</strong> {hotelDetail.policies.checkOut}</p>
                        <p><strong>Cancellation:</strong> {hotelDetail.policies.cancellation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-slate-700">
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
                          className="p-4 bg-orange-50 border border-orange-200 rounded-xl"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                              r/
                            </div>
                            <span className="text-sm font-medium text-orange-700">
                              r/{comment.subreddit}
                            </span>
                            <span className="text-xs text-slate-400">
                              Score: {comment.score}
                            </span>
                          </div>
                          <p className="text-slate-700 italic">
                            "{comment.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">
                      No Reddit reviews found for this hotel.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Failed to load hotel details
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div>
            {selectedRoom ? (
              <div>
                <span className="text-sm text-slate-500">Selected: </span>
                <span className="font-medium">{selectedRoom.name}</span>
                <span className="text-xl font-bold text-slate-800 ml-3">
                  ${selectedRoom.totalPrice.toLocaleString()}
                </span>
                <span className="text-sm text-slate-500 ml-1">
                  for {nights} nights
                </span>
              </div>
            ) : (
              <span className="text-slate-500">Select a room to continue</span>
            )}
          </div>
          <button
            onClick={handleSelectRoom}
            disabled={!selectedRoom}
            className={clsx(
              'px-6 py-3 rounded-xl font-medium transition-colors',
              selectedRoom
                ? 'bg-sky-500 text-white hover:bg-sky-600'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            Select This Room
          </button>
        </div>
      </div>
    </div>
  );
}
