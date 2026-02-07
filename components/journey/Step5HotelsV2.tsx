'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import Card from '@/components/ui/Card';
import {
  Hotel,
  MapPin,
  Star,
  Check,
  AlertCircle,
  Wifi,
  Car,
  Dumbbell,
  Coffee,
  Loader2,
  X,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Bed,
  Users,
  Utensils,
  Waves,
  Sparkles,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { handleImageError, getPlaceholderImage } from '@/lib/utils';
import HotelSnooChat, { type RedditHotel } from './HotelSnooChat';
import type { Hotel as HotelType } from '@/lib/schemas/trip';

// Amenity icons - used for visual display of hotel amenities
// Note: AMENITY_ICONS, ALL_AMENITIES, and PROPERTY_TYPES are prepared for future filtering features

// Available subreddits for hotel recommendations - grouped by category
const HOTEL_SUBREDDITS = {
  luxury: ['fatfire', 'fattravel', 'luxurytravel'],
  general: ['travel', 'hotels', 'solotravel'],
  budget: ['budgettravel', 'shoestring', 'backpacking'],
  specialty: ['TravelHacks', 'digitalnomad', 'honeymoon'],
};

// All available subreddits flattened
const ALL_SUBREDDITS = Object.values(HOTEL_SUBREDDITS).flat();

// Country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
  'CR': 'Costa Rica', 'PA': 'Panama', 'MX': 'Mexico', 'JM': 'Jamaica', 'DO': 'Dominican Republic',
  'AW': 'Aruba', 'BS': 'Bahamas', 'PR': 'Puerto Rico', 'FR': 'France', 'GB': 'United Kingdom',
  'ES': 'Spain', 'IT': 'Italy', 'NL': 'Netherlands', 'DE': 'Germany', 'AT': 'Austria',
  'CZ': 'Czech Republic', 'HU': 'Hungary', 'PT': 'Portugal', 'GR': 'Greece', 'CH': 'Switzerland',
  'DK': 'Denmark', 'SE': 'Sweden', 'NO': 'Norway', 'IS': 'Iceland', 'IE': 'Ireland',
  'HR': 'Croatia', 'JP': 'Japan', 'TH': 'Thailand', 'ID': 'Indonesia', 'VN': 'Vietnam',
  'SG': 'Singapore', 'HK': 'Hong Kong', 'KR': 'South Korea', 'IN': 'India', 'MV': 'Maldives',
  'LK': 'Sri Lanka', 'PH': 'Philippines', 'MY': 'Malaysia', 'US': 'United States',
  'AU': 'Australia', 'NZ': 'New Zealand', 'ZA': 'South Africa', 'EG': 'Egypt', 'MA': 'Morocco',
  'AE': 'UAE', 'IL': 'Israel', 'TR': 'Turkey', 'BR': 'Brazil', 'AR': 'Argentina',
  'CL': 'Chile', 'PE': 'Peru', 'CO': 'Colombia', 'EC': 'Ecuador', 'XX': '',
};

const getCountryName = (code: string) => COUNTRY_NAMES[code] || code;

// City name to IATA city code mapping for Amadeus API
// Note: Some cities don't have valid IATA codes - use nearby airport/city codes
const CITY_CODES: Record<string, string> = {
  // Japan - Kyoto uses OSA (Osaka/Kansai region) as it has no IATA code
  'Tokyo': 'TYO', 'Kyoto': 'OSA', 'Osaka': 'OSA',
  // USA
  'New York': 'NYC', 'Los Angeles': 'LAX', 'Miami': 'MIA', 'San Francisco': 'SFO', 'Las Vegas': 'LAS',
  'Chicago': 'CHI', 'Boston': 'BOS', 'Washington': 'WAS', 'Seattle': 'SEA', 'Orlando': 'ORL',
  'Hawaii': 'HNL', 'Honolulu': 'HNL', 'Maui': 'OGG',
  // Europe
  'Paris': 'PAR', 'London': 'LON', 'Rome': 'ROM', 'Barcelona': 'BCN', 'Madrid': 'MAD',
  'Amsterdam': 'AMS', 'Berlin': 'BER', 'Munich': 'MUC', 'Vienna': 'VIE', 'Prague': 'PRG',
  'Lisbon': 'LIS', 'Dublin': 'DUB', 'Athens': 'ATH', 'Venice': 'VCE', 'Florence': 'FLR',
  'Santorini': 'JTR', 'Mykonos': 'JMK', 'Dubrovnik': 'DBV', 'Split': 'SPU',
  // Asia
  'Bangkok': 'BKK', 'Singapore': 'SIN', 'Hong Kong': 'HKG', 'Seoul': 'SEL', 'Taipei': 'TPE',
  'Bali': 'DPS', 'Ubud': 'DPS', 'Phuket': 'HKT', 'Chiang Mai': 'CNX', 'Koh Samui': 'USM',
  'Hanoi': 'HAN', 'Ho Chi Minh City': 'SGN',
  // Latin America
  'Mexico City': 'MEX', 'Cancun': 'CUN', 'Tulum': 'CUN', 'Playa del Carmen': 'CUN',
  'Panama City': 'PTY', 'San Jose': 'SJO',
  'Lima': 'LIM', 'Buenos Aires': 'BUE', 'Rio de Janeiro': 'RIO', 'Sao Paulo': 'SAO',
  // Costa Rica
  'Tamarindo': 'LIR', 'La Fortuna': 'SJO', 'Manuel Antonio': 'SJO', 'Monteverde': 'SJO',
  'Santa Teresa': 'SJO', 'Jaco': 'SJO', 'Puerto Viejo': 'SJO', 'Nosara': 'LIR',
  // Caribbean - Dominican Republic
  'Dominican Republic': 'SDQ', 'Punta Cana': 'PUJ', 'Santo Domingo': 'SDQ',
  'Puerto Plata': 'POP', 'La Romana': 'SDQ', 'Samana': 'AZS',
  // Caribbean - Other
  'Jamaica': 'MBJ', 'Montego Bay': 'MBJ', 'Puerto Rico': 'SJU', 'San Juan': 'SJU',
  'Aruba': 'AUA', 'Bahamas': 'NAS', 'Nassau': 'NAS', 'Barbados': 'BGI',
  'St. Lucia': 'UVF', 'Turks and Caicos': 'PLS',
  // Middle East
  'Dubai': 'DXB', 'Tel Aviv': 'TLV', 'Jerusalem': 'TLV', 'Israel': 'TLV', 'Istanbul': 'IST',
  'Jordan': 'AMM', 'Amman': 'AMM', 'Petra': 'AMM', 'Abu Dhabi': 'AUH',
  // Australia/NZ/Pacific
  'Sydney': 'SYD', 'Melbourne': 'MEL', 'Auckland': 'AKL',
  'Fiji': 'NAN', 'Bora Bora': 'BOB', 'Tahiti': 'PPT', 'Maldives': 'MLE',
  // Africa
  'Cape Town': 'CPT', 'Johannesburg': 'JNB', 'Marrakech': 'RAK', 'Morocco': 'RAK',
  // Defaults for countries
  'Costa Rica': 'SJO', 'Panama': 'PTY', 'Thailand': 'BKK', 'Japan': 'TYO', 'Italy': 'ROM',
  'France': 'PAR', 'Spain': 'MAD', 'Germany': 'BER', 'Greece': 'ATH',
};

// Get city code for a destination
const getCityCode = (destinationName: string): string | null => {
  // Direct match
  if (CITY_CODES[destinationName]) return CITY_CODES[destinationName];

  // Try partial match
  for (const [city, code] of Object.entries(CITY_CODES)) {
    if (destinationName.toLowerCase().includes(city.toLowerCase()) ||
        city.toLowerCase().includes(destinationName.toLowerCase())) {
      return code;
    }
  }

  return null;
};

// Hotel image URLs (reliable Unsplash photos)
const HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a6515a6e8d?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400&h=300&fit=crop',
];

// Room types for the modal
const ROOM_TYPES = [
  { id: 'standard', name: 'Standard Room', description: '1 Queen Bed, City View', priceMultiplier: 1.0, maxGuests: 2, sqft: 280 },
  { id: 'deluxe', name: 'Deluxe Room', description: '1 King Bed, Premium View', priceMultiplier: 1.3, maxGuests: 2, sqft: 350 },
  { id: 'suite', name: 'Junior Suite', description: '1 King Bed + Living Area', priceMultiplier: 1.6, maxGuests: 3, sqft: 450 },
  { id: 'family', name: 'Family Room', description: '2 Queen Beds, Extra Space', priceMultiplier: 1.4, maxGuests: 4, sqft: 400 },
];

// Room-type specific images
const ROOM_TYPE_IMAGES: Record<string, string[]> = {
  standard: [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&h=600&fit=crop',
  ],
  deluxe: [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&h=600&fit=crop',
  ],
  suite: [
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop',
  ],
  family: [
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1598928506311-c55ez63a6349?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=800&h=600&fit=crop',
  ],
};

// Amenity icons mapping
const AMENITY_DETAILS: Record<string, { icon: React.ElementType; label: string }> = {
  wifi: { icon: Wifi, label: 'Free WiFi' },
  pool: { icon: Waves, label: 'Swimming Pool' },
  gym: { icon: Dumbbell, label: 'Fitness Center' },
  spa: { icon: Sparkles, label: 'Spa & Wellness' },
  restaurant: { icon: Utensils, label: 'Restaurant' },
  parking: { icon: Car, label: 'Free Parking' },
  breakfast: { icon: Coffee, label: 'Breakfast Included' },
  room_service: { icon: Bed, label: 'Room Service' },
  concierge: { icon: Users, label: 'Concierge' },
  bar: { icon: Utensils, label: 'Bar/Lounge' },
  beach_access: { icon: Waves, label: 'Beach Access' },
  pet_friendly: { icon: ShieldCheck, label: 'Pet Friendly' },
  air_conditioning: { icon: Sparkles, label: 'Air Conditioning' },
  laundry: { icon: ShieldCheck, label: 'Laundry Service' },
  airport_shuttle: { icon: Car, label: 'Airport Shuttle' },
  business_center: { icon: Wifi, label: 'Business Center' },
};

// Hotel Detail Modal Component
function HotelDetailModal({
  hotel,
  nights,
  onClose,
  onSelect,
  isSelected,
}: {
  hotel: HotelType;
  nights: number;
  onClose: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(ROOM_TYPES[0].id);

  // Get room-type specific images (falls back to standard if not found)
  const roomImages = ROOM_TYPE_IMAGES[selectedRoom] || ROOM_TYPE_IMAGES.standard;

  // Combine hotel main image with room-type specific images
  const hotelImages = [
    hotel.imageUrl,
    ...roomImages.slice(0, 3),
  ];

  // Reset image index when room type changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedRoom]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const selectedRoomType = ROOM_TYPES.find(r => r.id === selectedRoom) || ROOM_TYPES[0];
  const roomPrice = Math.round(hotel.pricePerNight * selectedRoomType.priceMultiplier);
  const totalPrice = roomPrice * nights;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${hotel.name} details`}>
      <div
        className="bg-white dark:bg-slate-800 sm:rounded-2xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="relative">
          {/* Image gallery */}
          <div className="relative h-64 md:h-80 bg-slate-200 dark:bg-slate-700">
            <img
              src={hotelImages[currentImageIndex] || ROOM_TYPE_IMAGES.standard[0]}
              alt={`${hotel.name} - ${currentImageIndex === 0 ? 'Hotel' : selectedRoomType.name}`}
              className="w-full h-full object-cover"
              onError={(e) => handleImageError(e, 'hotel')}
            />
            {/* Image label */}
            <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {currentImageIndex === 0 ? 'Hotel Exterior' : `${selectedRoomType.name} Preview`}
            </div>
            {/* Image navigation */}
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev - 1 + hotelImages.length) % hotelImages.length)}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-800/80 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 dark:text-white" />
            </button>
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev + 1) % hotelImages.length)}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-800/80 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-6 h-6 dark:text-white" />
            </button>
            {/* Image indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {hotelImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  aria-label={`View image ${idx + 1} of ${hotelImages.length}`}
                  className={clsx(
                    'w-3 h-3 rounded-full transition-colors',
                    idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  )}
                />
              ))}
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close hotel details"
              className="absolute top-4 right-4 w-10 h-10 bg-white/80 dark:bg-slate-800/80 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-6 h-6 dark:text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-320px)]">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left column - Hotel info */}
            <div className="md:col-span-2 space-y-6">
              {/* Hotel name and rating */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{hotel.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={clsx('w-4 h-4', i < hotel.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-600')} />
                        ))}
                      </div>
                      {hotel.guestRating && (
                        <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-sm font-medium rounded">
                          {hotel.guestRating}/10 Excellent
                        </span>
                      )}
                    </div>
                  </div>
                  {hotel.isRedditRecommended && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-sm font-medium rounded-full">
                      <MessageCircle className="w-4 h-4" />
                      Reddit Pick
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mt-2">
                  <MapPin className="w-4 h-4" />
                  <span>{hotel.address}</span>
                  <span className="mx-1">•</span>
                  <span>{typeof hotel.distanceToCenter === 'number' ? hotel.distanceToCenter.toFixed(1) : hotel.distanceToCenter} km from center</span>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {hotel.amenities.map((amenity) => {
                    const amenityInfo = AMENITY_DETAILS[amenity] || { icon: Check, label: amenity };
                    const Icon = amenityInfo.icon;
                    return (
                      <div key={amenity} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Icon className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                        <span className="text-sm">{amenityInfo.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Room selection */}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Select Room Type</h3>
                <div className="space-y-3">
                  {ROOM_TYPES.map((room) => {
                    const price = Math.round(hotel.pricePerNight * room.priceMultiplier);
                    return (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoom(room.id)}
                        className={clsx(
                          'w-full p-4 rounded-xl border-2 text-left transition-all',
                          selectedRoom === room.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-white">{room.name}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{room.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Up to {room.maxGuests} guests
                              </span>
                              <span className="flex items-center gap-1">
                                <Bed className="w-3 h-3" />
                                {room.sqft} sq ft
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900 dark:text-white">${price.toLocaleString()}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">per night</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column - Booking summary */}
            <div>
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 sticky top-0">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Booking Summary</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Room type</span>
                    <span className="font-medium dark:text-white">{selectedRoomType.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Price per night</span>
                    <span className="font-medium dark:text-white">${roomPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Duration</span>
                    <span className="font-medium dark:text-white">{nights} nights</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-600 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                      <span className="text-xl font-bold text-primary-600 dark:text-primary-400">${totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {(hotel as any).freeCancellation && (
                  <div className="flex items-center gap-2 mt-4 p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300">Free cancellation</span>
                  </div>
                )}

                <button
                  onClick={onSelect}
                  className={clsx(
                    'w-full mt-4 py-3 rounded-xl font-semibold transition-colors',
                    isSelected
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  )}
                >
                  {isSelected ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      Selected
                    </span>
                  ) : (
                    'Select This Hotel'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Step5HotelsV2() {
  const {
    trip,
    setActiveDestination,
    setHotelResults,
    selectHotel,
  } = useTripStore(useShallow((state) => ({
    trip: state.trip,
    setActiveDestination: state.setActiveDestination,
    setHotelResults: state.setHotelResults,
    selectHotel: state.selectHotel,
  })));

  const { destinations, activeDestinationId, basics } = trip;
  const activeDestination = destinations.find((d) => d.destinationId === activeDestinationId);

  const [isLoading, setIsLoading] = useState(false);
  const [hotelNameSearch, setHotelNameSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState<[number, number]>([0, 2000]);
  const [starFilter, setStarFilter] = useState<number[]>([]);
  const [guestRatingFilter, setGuestRatingFilter] = useState<number>(0);
  const [amenityFilters, setAmenityFilters] = useState<string[]>([]);
  const [freeCancellationOnly, setFreeCancellationOnly] = useState(false);
  const [redditRecommendedOnly, setRedditRecommendedOnly] = useState(false);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string[]>([]);
  const [distanceFilter, setDistanceFilter] = useState<number>(300); // Default 300km for country/region searches
  const [modalHotel, setModalHotel] = useState<HotelType | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [redditHotels, setRedditHotels] = useState<RedditHotel[]>([]);
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(
    new Set(['travel', 'hotels', 'luxurytravel', 'fatfire'])
  );
  const [isLoadingReddit, setIsLoadingReddit] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const HOTELS_PER_PAGE = 50;
  // Track hotels currently fetching pricing
  const [pricingLoadingIds, setPricingLoadingIds] = useState<Set<string>>(new Set());
  // Sort state
  const [sortBy, setSortBy] = useState<'recommended' | 'price' | 'rating' | 'distance'>('recommended');

  // Handler for Snoo Reddit recommendations - only applies when subreddits are selected
  const handleRedditHotelsFound = (hotels: RedditHotel[]) => {
    // Only set Reddit recommendations if user has subreddits selected
    if (selectedSubreddits.size === 0) {
      return;
    }

    setRedditHotels(hotels);
    // Mark these hotels in the main list as Reddit-recommended
    if (activeDestination && hotels.length > 0) {
      const hotelNames = hotels.map(h => h.name.toLowerCase());
      const updatedResults = activeDestination.hotels.results.map(hotel => ({
        ...hotel,
        isRedditRecommended: hotelNames.some(name =>
          hotel.name.toLowerCase().includes(name) || name.includes(hotel.name.toLowerCase())
        ),
      }));
      setHotelResults(activeDestination.destinationId, updatedResults);
    }
  };

  // Toggle subreddit selection
  const toggleSubreddit = (sub: string) => {
    setSelectedSubreddits(prev => {
      const next = new Set(prev);
      if (next.has(sub)) {
        next.delete(sub);
      } else {
        next.add(sub);
      }
      return next;
    });
  };

  // Fetch Reddit recommendations and merge with main hotel list
  const fetchRedditRecommendations = useCallback(async () => {
    if (!activeDestination || selectedSubreddits.size === 0) return;

    setIsLoadingReddit(true);
    try {
      // Get city code and dates for Amadeus price lookup
      const cityCode = getCityCode(activeDestination.place.name);

      // Calculate dates (same logic as fetchHotels)
      const today = new Date();
      today.setDate(today.getDate() + 7);
      const startDate = basics.startDate || today.toISOString().split('T')[0];
      const startDateObj = new Date(startDate);

      // Calculate offset for this destination
      let offsetDays = 0;
      for (let i = 0; i < destinations.length; i++) {
        if (destinations[i].destinationId === activeDestination.destinationId) break;
        offsetDays += destinations[i].nights;
      }

      const checkInDate = new Date(startDateObj);
      checkInDate.setDate(checkInDate.getDate() + offsetDays);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + activeDestination.nights);

      const response = await fetch('/api/reddit/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: activeDestination.place.name,
          subreddits: Array.from(selectedSubreddits),
          lat: activeDestination.place.lat,
          lng: activeDestination.place.lng,
          cityCode: cityCode || undefined,
          checkInDate: checkInDate.toISOString().split('T')[0],
          checkOutDate: checkOutDate.toISOString().split('T')[0],
          adults: basics.travelers.adults,
          preferences: {
            budget: selectedSubreddits.has('fatfire') || selectedSubreddits.has('luxurytravel') ? 'luxury' : 'mid',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Reddit API error:', response.status, errorText);
        return;
      }

      const data = await response.json();
      const hotels = data.hotels || [];
      setRedditHotels(hotels);

      if (hotels.length === 0) {
        return;
      }

      // CORE FIX: Add Reddit hotels to results AND mark existing matches
      const existingResults = activeDestination.hotels.results || [];

      // Create a map of Reddit hotel info for quick lookup
      const redditHotelMap: Record<string, { hotel: any; upvotes: number; mentionCount: number }> = {};
      hotels.forEach((rh: any) => {
        const key = rh.name?.toLowerCase().trim() || '';
        if (key && !redditHotelMap[key]) { // Avoid duplicate Reddit entries
          redditHotelMap[key] = {
            hotel: rh,
            upvotes: rh.upvotes || 0,
            mentionCount: rh.mentionCount || 1,
          };
        }
      });

      // Track hotel names we've already processed to avoid duplicates
      const processedNames = new Set<string>();
      const matchedRedditNames = new Set<string>();

      // Mark matching existing hotels as Reddit recommended
      const updatedResults = existingResults
        .filter(hotel => {
          // Deduplicate by normalized name
          const normalizedName = hotel.name.toLowerCase().trim().replace(/\s+/g, ' ');
          if (processedNames.has(normalizedName)) {
            return false;
          }
          processedNames.add(normalizedName);
          return true;
        })
        .map(hotel => {
          let redditInfo: { upvotes: number; mentionCount: number } | undefined;
          const hotelNameLower = hotel.name.toLowerCase();

          for (const redditName of Object.keys(redditHotelMap)) {
            if (fuzzyMatchHotelName(hotelNameLower, redditName)) {
              redditInfo = redditHotelMap[redditName];
              matchedRedditNames.add(redditName);
              break;
            }
          }

          return {
            ...hotel,
            isRedditRecommended: !!redditInfo,
            redditUpvotes: redditInfo?.upvotes || 0,
          };
        });

      // ADD Reddit hotels that weren't matched to existing results
      const newRedditHotels: HotelType[] = [];
      for (const [redditNameLower, info] of Object.entries(redditHotelMap)) {
        // Skip if already matched to an existing hotel
        if (matchedRedditNames.has(redditNameLower)) continue;

        // Skip if we already have this name in our processed list
        const normalizedRedditName = redditNameLower.trim().replace(/\s+/g, ' ');
        if (processedNames.has(normalizedRedditName)) {
          continue;
        }

        if (info.hotel.name) {
          processedNames.add(normalizedRedditName);
          const rh = info.hotel;
          // Create a hotel entry from Reddit data
          const newHotel: HotelType = {
            id: rh.id || `reddit-${normalizedRedditName.replace(/\s+/g, '-').slice(0, 30)}`,
            name: rh.name,
            address: rh.address || activeDestination.place.name,
            city: activeDestination.place.name,
            countryCode: activeDestination.place.countryCode || 'XX',
            stars: Math.round(rh.rating) || 4,
            pricePerNight: rh.pricePerNight || rh.priceEstimate || 250,
            totalPrice: rh.totalPrice || ((rh.pricePerNight || 250) * activeDestination.nights),
            currency: 'USD',
            imageUrl: rh.imageUrl || HOTEL_IMAGES[Math.floor(Math.random() * HOTEL_IMAGES.length)],
            amenities: ['wifi'],
            distanceToCenter: 10, // Unknown - set moderate distance
            lat: rh.lat || activeDestination.place.lat || 0,
            lng: rh.lng || activeDestination.place.lng || 0,
            guestRating: rh.rating ? rh.rating * 2 : 8.0,
            isRedditRecommended: true,
            redditUpvotes: info.upvotes,
            source: 'reddit',
            hasRealPricing: rh.priceIsReal === true,
          };
          newRedditHotels.push(newHotel);
        }
      }

      // Combine: Reddit-only hotels first, then matched+existing
      const allHotels = [...newRedditHotels, ...updatedResults];

      // Sort: Reddit picks first (by upvotes), then others
      const sortedResults = allHotels.sort((a, b) => {
        // Reddit recommended hotels come first
        if (a.isRedditRecommended && !b.isRedditRecommended) return -1;
        if (!a.isRedditRecommended && b.isRedditRecommended) return 1;
        // Among Reddit picks, sort by upvotes
        if (a.isRedditRecommended && b.isRedditRecommended) {
          return ((b as any).redditUpvotes || 0) - ((a as any).redditUpvotes || 0);
        }
        // For non-Reddit hotels, keep original order (by rating/distance)
        return 0;
      });

      setHotelResults(activeDestination.destinationId, sortedResults);
    } catch (error) {
      console.error('Failed to fetch Reddit recommendations:', error);
      // Show a message but don't block
      setRedditHotels([]);
    } finally {
      setIsLoadingReddit(false);
    }
  }, [activeDestination, selectedSubreddits, setHotelResults, basics, destinations]);

  // Track which destinations we've searched for in this session
  const searchedDestinations = useRef<Set<string>>(new Set());
  const isSearching = useRef(false);
  const hasInitialized = useRef(false);

  // Clear search cache on mount to ensure fresh data when entering hotels page
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      searchedDestinations.current.clear();
    }
  }, []);

  // Set first destination as active when entering this step
  useEffect(() => {
    if (destinations.length > 0 && !activeDestinationId) {
      const firstDestId = destinations[0].destinationId;
      setActiveDestination(firstDestId);
    }
  }, [destinations.length, activeDestinationId, setActiveDestination]);

  // Fuzzy match hotel names
  const fuzzyMatchHotelName = (name1: string, name2: string): boolean => {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    // Exact match
    if (n1 === n2) return true;
    // Contains match (either direction)
    if (n1.includes(n2.slice(0, 10)) || n2.includes(n1.slice(0, 10))) return true;
    // Word match - check if significant words overlap
    const words1 = n1.split(/\s+/).filter(w => w.length > 3);
    const words2 = n2.split(/\s+/).filter(w => w.length > 3);
    const matchingWords = words1.filter(w => words2.some(w2 => w.includes(w2) || w2.includes(w)));
    return matchingWords.length >= 2;
  };

  // Fetch hotels for active destination
  const fetchHotels = useCallback(async () => {
    if (!activeDestination) return;
    if (isSearching.current) return; // Prevent duplicate requests

    isSearching.current = true;
    setIsLoading(true);
    setCurrentPage(1); // Reset pagination on new search
    try {
      // Calculate check-in and check-out dates
      // Use future date if no start date set to avoid API errors
      const today = new Date();
      today.setDate(today.getDate() + 7); // Default to 1 week from now
      const startDate = basics.startDate || today.toISOString().split('T')[0];
      const startDateObj = new Date(startDate);

      // Ensure start date is in the future
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 1);
      if (startDateObj < minDate) {
        startDateObj.setTime(minDate.getTime());
      }

      // Calculate offset days for this destination based on previous destinations
      const destIndex = destinations.findIndex(d => d.destinationId === activeDestination.destinationId);
      let offsetDays = 0;
      for (let i = 0; i < destIndex; i++) {
        offsetDays += destinations[i].nights;
      }

      const checkInDate = new Date(startDateObj);
      checkInDate.setDate(checkInDate.getDate() + offsetDays);

      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + activeDestination.nights);

      let hotelsFetched = false;

      // Use new API with destination parameter (uses multi-city config)
      const params = new URLSearchParams({
        destination: activeDestination.place.name,
        checkInDate: checkInDate.toISOString().split('T')[0],
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        adults: String(basics.travelers.adults),
      });

      // Add coordinates as fallback
      if (activeDestination.place.lat) {
        params.append('lat', String(activeDestination.place.lat));
      }
      if (activeDestination.place.lng) {
        params.append('lng', String(activeDestination.place.lng));
      }

      const response = await fetch(`/api/hotels?${params}`);

      if (response.ok) {
        const data = await response.json();
        const apiHotels = data.hotels || data; // Support both new and old format

        if (Array.isArray(apiHotels) && apiHotels.length > 0) {
          // Transform API response to match our schema and add images
          // Layer 1 returns hotels without pricing - that's fetched on demand via Layer 2
          const hotels: HotelType[] = apiHotels.map((h: any, idx: number) => ({
            id: h.id,
            placeId: h.placeId, // Needed for Layer 2 pricing lookup
            name: h.name,
            address: h.address || activeDestination.place.name,
            city: h.city || activeDestination.place.name,
            countryCode: activeDestination.place.countryCode || h.countryCode || 'XX',
            stars: h.stars || 4,
            // Layer 1 may return null pricing - use estimate if not available
            pricePerNight: h.pricePerNight != null ? Math.round(h.pricePerNight) : 200,
            totalPrice: h.totalPrice != null ? Math.round(h.totalPrice) : 200 * activeDestination.nights,
            currency: h.currency || 'USD',
            imageUrl: h.imageUrl || HOTEL_IMAGES[idx % HOTEL_IMAGES.length],
            amenities: h.amenities || ['wifi'],
            distanceToCenter: h.distanceToCenter || 1.0,
            lat: h.latitude || h.lat || 0,
            lng: h.longitude || h.lng || 0,
            guestRating: h.guestRating || null,
            reviewCount: h.reviewCount || 0,
            isRedditRecommended: false, // Will be set after Reddit fetch
            source: h.source || 'google_places_index',
            hasRealPricing: h.hasRealPricing === true,
            pricingStatus: h.pricingStatus || (h.hasRealPricing ? 'available' : 'not_fetched'),
          }));
          setHotelResults(activeDestination.destinationId, hotels);
          hotelsFetched = true;
        }
      }

      // Show empty state with retry option if API didn't return results
      if (!hotelsFetched) {
        setHotelResults(activeDestination.destinationId, []);
      }
    } catch (error) {
      console.error('Failed to fetch hotels:', error);
      setHotelResults(activeDestination.destinationId, []);
    } finally {
      isSearching.current = false;
      setIsLoading(false);
    }
  }, [activeDestination, setHotelResults, basics.startDate, basics.travelers.adults, destinations]);

  // Fetch on destination change - always search if we haven't searched this session
  useEffect(() => {
    if (activeDestination && !searchedDestinations.current.has(activeDestination.destinationId)) {
      searchedDestinations.current.add(activeDestination.destinationId);
      fetchHotels();
    }
  }, [activeDestination?.destinationId, fetchHotels]);

  // Fetch Reddit recommendations when subreddits change or destination changes
  // Use stringified subreddits to avoid Set reference comparison issues
  const subredditsKey = Array.from(selectedSubreddits).sort().join(',');
  useEffect(() => {
    if (!activeDestination) return;

    // If no subreddits selected, CLEAR all Reddit recommendations
    if (selectedSubreddits.size === 0) {
      setRedditHotels([]);
      // ALWAYS clear isRedditRecommended from all existing hotels
      const existingResults = activeDestination.hotels.results || [];
      const redditCount = existingResults.filter(h => h.isRedditRecommended).length;

      // Force clear even if count is 0 (in case of stale data)
      const clearedResults = existingResults.map(hotel => ({
        ...hotel,
        isRedditRecommended: false,
        redditUpvotes: 0,
      }));
      setHotelResults(activeDestination.destinationId, clearedResults);
      return;
    }

    const debounceTimer = setTimeout(() => {
      fetchRedditRecommendations();
    }, 500);
    return () => clearTimeout(debounceTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDestination?.destinationId, subredditsKey]);

  // Filter hotels
  const allHotels = activeDestination?.hotels.results || [];

  const filteredHotels = allHotels.filter((hotel) => {
    // Name search filter
    if (hotelNameSearch.trim() && !hotel.name.toLowerCase().includes(hotelNameSearch.toLowerCase().trim())) {
      return false;
    }
    // Price filter - handle null pricing (show hotels without pricing if filter allows estimate range)
    const price = hotel.pricePerNight || 200; // Default estimate
    if (price < priceFilter[0] || price > priceFilter[1]) {
      return false;
    }
    // Star filter
    if (starFilter.length > 0 && !starFilter.includes(hotel.stars)) {
      return false;
    }
    // Guest rating filter
    if (guestRatingFilter > 0 && (hotel.guestRating || 0) < guestRatingFilter) {
      return false;
    }
    // Amenity filters
    if (amenityFilters.length > 0) {
      const hasAllAmenities = amenityFilters.every((a) => hotel.amenities.includes(a));
      if (!hasAllAmenities) return false;
    }
    // Free cancellation filter - only apply if hotel has the property
    if (freeCancellationOnly && (hotel as any).freeCancellation === false) {
      return false;
    }
    // Reddit recommended filter - only apply if hotel has the property
    if (redditRecommendedOnly && hotel.isRedditRecommended === false) {
      return false;
    }
    // Property type filter - only apply if hotel has the property AND filter is active
    if (propertyTypeFilter.length > 0 && (hotel as any).propertyType && !propertyTypeFilter.includes((hotel as any).propertyType)) {
      return false;
    }
    // Distance filter
    if (hotel.distanceToCenter && hotel.distanceToCenter > distanceFilter) {
      return false;
    }
    return true;
  });

  // Sort filtered hotels
  const sortedHotels = [...filteredHotels].sort((a, b) => {
    switch (sortBy) {
      case 'recommended':
        // Reddit picks first, then by rating
        if (a.isRedditRecommended && !b.isRedditRecommended) return -1;
        if (!a.isRedditRecommended && b.isRedditRecommended) return 1;
        if (a.isRedditRecommended && b.isRedditRecommended) {
          return ((b as any).redditUpvotes || 0) - ((a as any).redditUpvotes || 0);
        }
        return (b.guestRating || 0) - (a.guestRating || 0);
      case 'price':
        return a.pricePerNight - b.pricePerNight;
      case 'rating':
        return (b.guestRating || 0) - (a.guestRating || 0);
      case 'distance':
        return (a.distanceToCenter || 999) - (b.distanceToCenter || 999);
      default:
        return 0;
    }
  });

  const handleSelectHotel = (hotelId: string) => {
    if (!activeDestination) return;
    const currentSelection = activeDestination.hotels.selectedHotelId;
    selectHotel(activeDestination.destinationId, currentSelection === hotelId ? null : hotelId);
  };

  // Fetch pricing for a single hotel (Layer 2)
  const fetchPricing = useCallback(async (placeId: string) => {
    if (!activeDestination || pricingLoadingIds.has(placeId)) return;

    // Calculate dates
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const startDate = basics.startDate || today.toISOString().split('T')[0];
    const startDateObj = new Date(startDate);

    const destIndex = destinations.findIndex(d => d.destinationId === activeDestination.destinationId);
    let offsetDays = 0;
    for (let i = 0; i < destIndex; i++) {
      offsetDays += destinations[i].nights;
    }

    const checkInDate = new Date(startDateObj);
    checkInDate.setDate(checkInDate.getDate() + offsetDays);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + activeDestination.nights);

    setPricingLoadingIds(prev => new Set(prev).add(placeId));

    try {
      const params = new URLSearchParams({
        placeId,
        checkIn: checkInDate.toISOString().split('T')[0],
        checkOut: checkOutDate.toISOString().split('T')[0],
        adults: String(basics.travelers.adults),
      });

      const response = await fetch(`/api/hotels/pricing?${params}`);
      if (response.ok) {
        const data = await response.json();

        // Update the hotel in results with pricing
        const updatedResults = activeDestination.hotels.results.map(hotel => {
          if ((hotel as any).placeId === placeId) {
            return {
              ...hotel,
              pricePerNight: data.pricePerNight || hotel.pricePerNight,
              totalPrice: data.totalPrice || (data.pricePerNight ? data.pricePerNight * activeDestination.nights : hotel.totalPrice),
              hasRealPricing: data.hasAvailability,
              pricingStatus: data.hasAvailability ? 'available' : 'unavailable',
            };
          }
          return hotel;
        });
        setHotelResults(activeDestination.destinationId, updatedResults);
      }
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    } finally {
      setPricingLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
    }
  }, [activeDestination, basics, destinations, setHotelResults, pricingLoadingIds]);

  const toggleStarFilter = (stars: number) => {
    setStarFilter((prev) =>
      prev.includes(stars) ? prev.filter((s) => s !== stars) : [...prev, stars]
    );
  };

  if (destinations.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2">No Destinations Yet</h2>
        <p className="text-slate-500 dark:text-slate-400">Go back and add destinations first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="section-title flex items-center justify-center gap-2">
          <Hotel className="w-6 h-6 text-primary-500" />
          Choose Your Hotels
        </h1>
        <p className="section-subtitle">
          Select a hotel for each destination
        </p>
      </div>

      {/* Destination tabs */}
      {destinations.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {destinations.map((dest, idx) => {
            const isActive = dest.destinationId === activeDestinationId;
            const hasHotel = dest.hotels.selectedHotelId !== null;

            return (
              <button
                key={dest.destinationId}
                onClick={() => setActiveDestination(dest.destinationId)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-primary-500 text-white'
                    : hasHotel
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                )}
              >
                {hasHotel && <Check className="w-4 h-4" />}
                <span className="font-medium">{idx + 1}. {dest.place.name}</span>
                <span className="text-sm opacity-75">{dest.nights}n</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Subreddit selection for Reddit recommendations */}
      {activeDestination && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Reddit Recommendations
                </h3>
                {isLoadingReddit && (
                  <span className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Searching...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Select subreddits to find traveler-recommended hotels
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Select subreddits for recommendations">
                {ALL_SUBREDDITS.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => toggleSubreddit(sub)}
                    aria-pressed={selectedSubreddits.has(sub)}
                    className={clsx(
                      'flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-full text-xs font-medium transition-all',
                      selectedSubreddits.has(sub)
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600 hover:border-orange-300 dark:hover:border-orange-500'
                    )}
                  >
                    <span className="text-[10px] opacity-75">r/</span>
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Reddit recommendations are now integrated as badges in the main hotel list */}

      {activeDestination && (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Mobile filter toggle button */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full justify-center"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
              {(() => {
                const activeCount = [
                  hotelNameSearch.trim().length > 0,
                  starFilter.length > 0,
                  priceFilter[0] > 0,
                  priceFilter[1] < 2000,
                  guestRatingFilter > 0,
                  amenityFilters.length > 0,
                  freeCancellationOnly,
                  redditRecommendedOnly,
                  distanceFilter < 300
                ].filter(Boolean).length;
                return activeCount > 0 ? (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-500 text-white text-xs font-bold">
                    {activeCount}
                  </span>
                ) : null;
              })()}
            </button>
          </div>

          {/* Filters - Compact Modern Design */}
          <div className={clsx('lg:col-span-1', showMobileFilters ? 'block' : 'hidden lg:block')}>
            <div className="sticky top-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[calc(100vh-120px)] overflow-y-auto">
              {/* Filter Header */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Filters</h3>
                  {(hotelNameSearch || starFilter.length > 0 || priceFilter[0] > 0 || priceFilter[1] < 2000 || guestRatingFilter > 0 || amenityFilters.length > 0 || freeCancellationOnly || redditRecommendedOnly || propertyTypeFilter.length > 0 || distanceFilter < 300) && (
                    <button
                      onClick={() => {
                        setHotelNameSearch('');
                        setStarFilter([]);
                        setPriceFilter([0, 2000]);
                        setGuestRatingFilter(0);
                        setAmenityFilters([]);
                        setFreeCancellationOnly(false);
                        setRedditRecommendedOnly(false);
                        setPropertyTypeFilter([]);
                        setDistanceFilter(300);
                      }}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      Reset all
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-5">
                {/* Hotel name search */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                    Search Hotels
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={hotelNameSearch}
                      onChange={(e) => setHotelNameSearch(e.target.value)}
                      placeholder="Hotel name..."
                      aria-label="Search hotels by name"
                      className="w-full pl-9 pr-9 py-2.5 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-base focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400"
                    />
                    {hotelNameSearch && (
                      <button
                        onClick={() => setHotelNameSearch('')}
                        aria-label="Clear hotel search"
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Price range - Compact */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                    Price / Night
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        value={priceFilter[0]}
                        onChange={(e) => setPriceFilter([parseInt(e.target.value) || 0, priceFilter[1]])}
                        className="w-full pl-6 pr-2 py-2 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        min={0}
                        placeholder="Min"
                      />
                    </div>
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        value={priceFilter[1]}
                        onChange={(e) => setPriceFilter([priceFilter[0], parseInt(e.target.value) || 2000])}
                        className="w-full pl-6 pr-2 py-2 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        min={0}
                        placeholder="Max"
                      />
                    </div>
                  </div>
                </div>

                {/* Star rating - Horizontal pills */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                    Star Rating
                  </label>
                  <div className="flex gap-1" role="group" aria-label="Filter by star rating">
                    {[5, 4, 3].map((stars) => (
                      <button
                        key={stars}
                        onClick={() => toggleStarFilter(stars)}
                        aria-pressed={starFilter.includes(stars)}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-1 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-all',
                          starFilter.includes(stars)
                            ? 'bg-primary-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        )}
                      >
                        {stars}<Star className="w-3 h-3 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guest rating - Segmented control */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                    Guest Rating
                  </label>
                  <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1" role="radiogroup" aria-label="Minimum guest rating">
                    {[{ label: 'Any', value: 0 }, { label: '7+', value: 7 }, { label: '8+', value: 8 }, { label: '9+', value: 9 }].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setGuestRatingFilter(option.value)}
                        role="radio"
                        aria-checked={guestRatingFilter === option.value}
                        className={clsx(
                          'flex-1 py-1.5 min-h-[36px] rounded-md text-xs font-medium transition-all',
                          guestRatingFilter === option.value
                            ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance slider - Clean */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="distanceSlider" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Distance
                    </label>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {distanceFilter} km
                    </span>
                  </div>
                  <input
                    id="distanceSlider"
                    type="range"
                    min={10}
                    max={300}
                    step={10}
                    value={distanceFilter}
                    onChange={(e) => setDistanceFilter(parseInt(e.target.value))}
                    aria-valuemin={10}
                    aria-valuemax={300}
                    aria-valuenow={distanceFilter}
                    aria-valuetext={`${distanceFilter} kilometers`}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    <span>10 km</span>
                    <span>300 km</span>
                  </div>
                </div>

                {/* Amenities - Compact grid */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                    Amenities
                  </label>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by amenities">
                    {['wifi', 'pool', 'gym', 'spa', 'breakfast', 'parking'].map((amenity) => (
                      <button
                        key={amenity}
                        onClick={() => {
                          if (amenityFilters.includes(amenity)) {
                            setAmenityFilters((prev) => prev.filter((a) => a !== amenity));
                          } else {
                            setAmenityFilters((prev) => [...prev, amenity]);
                          }
                        }}
                        aria-pressed={amenityFilters.includes(amenity)}
                        className={clsx(
                          'px-2.5 py-1 min-h-[36px] rounded-full text-xs font-medium transition-all capitalize',
                          amenityFilters.includes(amenity)
                            ? 'bg-primary-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        )}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={clsx(
                      'w-9 h-5 rounded-full transition-colors relative',
                      freeCancellationOnly ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-600'
                    )}>
                      <div className={clsx(
                        'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                        freeCancellationOnly ? 'translate-x-4' : 'translate-x-0.5'
                      )} />
                    </div>
                    <input
                      type="checkbox"
                      checked={freeCancellationOnly}
                      onChange={(e) => setFreeCancellationOnly(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      Free cancellation
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={clsx(
                      'w-9 h-5 rounded-full transition-colors relative',
                      redditRecommendedOnly ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-600'
                    )}>
                      <div className={clsx(
                        'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                        redditRecommendedOnly ? 'translate-x-4' : 'translate-x-0.5'
                      )} />
                    </div>
                    <input
                      type="checkbox"
                      checked={redditRecommendedOnly}
                      onChange={(e) => setRedditRecommendedOnly(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-orange-500" />
                      Reddit Picks Only
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Hotel list */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  Searching for hotels in {activeDestination.place.name}...
                </p>
                {/* Skeleton hotel cards */}
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-48 h-40 sm:h-36 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <div key={j} className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                          ))}
                        </div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                        <div className="flex gap-2">
                          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                        </div>
                      </div>
                      <div className="flex-shrink-0 space-y-2 sm:text-right">
                        <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-20 sm:ml-auto" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 sm:ml-auto" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredHotels.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <Hotel className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                {hotelNameSearch.trim() ? (
                  <>
                    <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">
                      No hotels matching "{hotelNameSearch}" in current results
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                      Would you like to search for this hotel specifically?
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={async () => {
                          setIsLoading(true);
                          try {
                            // Search Google Places for this specific hotel
                            const response = await fetch('/api/places', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                query: hotelNameSearch + ' hotel',
                                destination: activeDestination.place.name,
                                lat: activeDestination.place.lat,
                                lng: activeDestination.place.lng,
                              }),
                            });
                            if (response.ok) {
                              const data = await response.json();
                              const places = data.places || [];
                              if (places.length > 0) {
                                const place = places[0];
                                const nights = activeDestination.nights;
                                const newHotel: HotelType = {
                                  id: `search-${place.id}`,
                                  name: place.name,
                                  address: place.address || activeDestination.place.name,
                                  city: activeDestination.place.name,
                                  countryCode: activeDestination.place.countryCode || 'XX',
                                  stars: Math.round(place.rating) || 4,
                                  pricePerNight: 200, // Estimated
                                  totalPrice: 200 * nights,
                                  currency: 'USD',
                                  imageUrl: place.imageUrl || HOTEL_IMAGES[0],
                                  amenities: ['wifi'],
                                  distanceToCenter: 2.0,
                                  lat: place.lat || activeDestination.place.lat || 0,
                                  lng: place.lng || activeDestination.place.lng || 0,
                                  guestRating: place.rating ? place.rating * 2 : 8.0,
                                };
                                // Add to hotel results
                                setHotelResults(activeDestination.destinationId, [newHotel, ...activeDestination.hotels.results]);
                                setHotelNameSearch(''); // Clear search
                              } else {
                                alert('Hotel not found. Try a different name.');
                              }
                            }
                          } catch (error) {
                            console.error('Hotel search error:', error);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        Search for "{hotelNameSearch}"
                      </button>
                      <button
                        onClick={() => setHotelNameSearch('')}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        Clear Search
                      </button>
                    </div>
                  </>
                ) : activeDestination.hotels.results.length === 0 ? (
                  <>
                    <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">No hotels found from Amadeus</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                      Try searching for a different destination or check your dates.
                    </p>
                    <button
                      onClick={() => fetchHotels()}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      Retry Search
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">No hotels match your filters.</p>
                    <button
                      onClick={() => {
                        setHotelNameSearch('');
                        setStarFilter([]);
                        setPriceFilter([0, 2000]);
                        setGuestRatingFilter(0);
                        setAmenityFilters([]);
                        setFreeCancellationOnly(false);
                        setRedditRecommendedOnly(false);
                        setPropertyTypeFilter([]);
                        setDistanceFilter(300);
                      }}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Results count and sort options */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {filteredHotels.length} hotel{filteredHotels.length !== 1 ? 's' : ''} found
                      {allHotels.length > filteredHotels.length && (
                        <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
                          ({allHotels.length - filteredHotels.length} filtered)
                        </span>
                      )}
                    </span>
                    {selectedSubreddits.size > 0 && filteredHotels.filter(h => h.isRedditRecommended).length > 0 && (
                      <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {filteredHotels.filter(h => h.isRedditRecommended).length} Reddit pick{filteredHotels.filter(h => h.isRedditRecommended).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="hotelSortSelect" className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      Sort by:
                    </label>
                    <select
                      id="hotelSortSelect"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'recommended' | 'price' | 'rating' | 'distance')}
                      className="text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 min-h-[40px] font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="price">Price: Low to High</option>
                      <option value="rating">Guest Rating: High to Low</option>
                      <option value="distance">Distance: Closest First</option>
                    </select>
                  </div>
                </div>

                {/* Hotel cards - paginated */}
                {sortedHotels.slice(0, currentPage * HOTELS_PER_PAGE).map((hotel) => {
                  const isSelected = activeDestination.hotels.selectedHotelId === hotel.id;
                  const redditUpvotes = (hotel as any).redditUpvotes || 0;

                  return (
                    <Card
                      key={hotel.id}
                      className={clsx(
                        'cursor-pointer transition-all group/card',
                        isSelected
                          ? 'ring-2 ring-primary-500 !bg-primary-50 dark:!bg-primary-900/30'
                          : hotel.isRedditRecommended && selectedSubreddits.size > 0
                          ? '!bg-orange-50 dark:!bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:shadow-md'
                          : 'hover:shadow-md'
                      )}
                      onClick={() => setModalHotel(hotel)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setModalHotel(hotel);
                        }
                      }}
                      aria-label={`${hotel.name}, ${hotel.stars} stars, $${hotel.pricePerNight.toLocaleString()} per night${isSelected ? ', selected' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Image - full width on mobile, fixed width on desktop */}
                        <div className="relative w-full sm:w-48 h-40 sm:h-36 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                          <img
                            src={hotel.imageUrl || getPlaceholderImage('hotel')}
                            alt={hotel.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                            loading="lazy"
                            onError={(e) => handleImageError(e, 'hotel')}
                          />
                          {/* Reddit Pick badge - only show when subreddits are selected */}
                          {hotel.isRedditRecommended && selectedSubreddits.size > 0 && (
                            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full shadow-sm">
                              <MessageCircle className="w-3 h-3" />
                              Reddit Pick
                              {redditUpvotes > 0 && <span>• {redditUpvotes}↑</span>}
                            </div>
                          )}
                          {/* Price type badge - only show if not Reddit recommended */}
                          {!hotel.isRedditRecommended && (
                            <div className="absolute top-2 left-2">
                              {(hotel as any).pricingStatus === 'available' || hotel.hasRealPricing ? (
                                <span className="px-1.5 py-0.5 bg-green-500/90 text-white text-[10px] font-medium rounded backdrop-blur-sm">
                                  Live Price
                                </span>
                              ) : (hotel as any).pricingStatus === 'unavailable' ? (
                                <span className="px-1.5 py-0.5 bg-amber-500/90 text-white text-[10px] font-medium rounded backdrop-blur-sm">
                                  No Rates
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-slate-500/80 text-white text-[10px] font-medium rounded backdrop-blur-sm">
                                  Est. Price
                                </span>
                              )}
                            </div>
                          )}
                          {/* Selection check overlay on image for mobile */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-md sm:hidden">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-slate-900 dark:text-white truncate">{hotel.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={clsx('w-3.5 h-3.5 sm:w-4 sm:h-4', i < hotel.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-600')} />
                                  ))}
                                </div>
                                {hotel.guestRating && (
                                  <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-medium rounded">
                                    {hotel.guestRating.toFixed(1)}/10
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Selection indicator - desktop only */}
                            <div
                              className={clsx(
                                'hidden sm:flex w-8 h-8 rounded-full items-center justify-center flex-shrink-0',
                                isSelected
                                  ? 'bg-primary-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700'
                              )}
                            >
                              {isSelected && <Check className="w-5 h-5" />}
                            </div>
                          </div>

                          {/* Location and Distance */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">{hotel.city}{getCountryName(hotel.countryCode) ? `, ${getCountryName(hotel.countryCode)}` : ''}</span>
                            </div>
                            {hotel.distanceToCenter !== undefined && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-medium rounded">
                                {typeof hotel.distanceToCenter === 'number' ? hotel.distanceToCenter.toFixed(1) : hotel.distanceToCenter} km to center
                              </span>
                            )}
                          </div>

                          {/* Amenities */}
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                            {hotel.amenities.slice(0, 4).map((amenity) => (
                              <span
                                key={amenity}
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs rounded capitalize"
                              >
                                {amenity}
                              </span>
                            ))}
                            {hotel.amenities.length > 4 && (
                              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs">
                                +{hotel.amenities.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price - horizontal on mobile, vertical on desktop */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start flex-shrink-0 sm:min-w-[120px] pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                          {/* Pricing status display */}
                          {(hotel as any).pricingStatus === 'available' || hotel.hasRealPricing ? (
                            <div className="sm:text-right">
                              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                                ${hotel.pricePerNight.toLocaleString()}
                              </p>
                              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">per night</p>
                              <p className="text-base sm:text-lg font-semibold text-primary-600 dark:text-primary-400 mt-1 sm:mt-2">
                                ${hotel.totalPrice.toLocaleString()}
                              </p>
                              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                                {activeDestination.nights} nights total
                              </p>
                            </div>
                          ) : (hotel as any).pricingStatus === 'unavailable' ? (
                            <div className="sm:text-right">
                              <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm mb-1">No live rates</p>
                              <p className="text-lg sm:text-xl font-bold text-slate-600 dark:text-slate-300">
                                ~${hotel.pricePerNight.toLocaleString()}
                              </p>
                              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 italic">estimated</p>
                            </div>
                          ) : pricingLoadingIds.has((hotel as any).placeId) ? (
                            <div className="flex flex-col sm:items-end">
                              <Loader2 className="w-5 h-5 animate-spin text-primary-500 mb-1" />
                              <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500">Checking rates...</span>
                            </div>
                          ) : (
                            <div className="sm:text-right">
                              <p className="text-lg sm:text-xl font-bold text-slate-600 dark:text-slate-300 mb-1">
                                ~${hotel.pricePerNight.toLocaleString()}
                              </p>
                              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 italic mb-2">estimated</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchPricing((hotel as any).placeId);
                                }}
                                className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900 transition-colors"
                              >
                                Get live price
                              </button>
                            </div>
                          )}
                          {/* Select button CTA on mobile */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectHotel(hotel.id);
                            }}
                            className={clsx(
                              'sm:hidden px-4 py-2 rounded-lg text-xs font-medium transition-colors',
                              isSelected
                                ? 'bg-green-500 text-white'
                                : 'bg-primary-500 text-white hover:bg-primary-600'
                            )}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {/* Load More button */}
                {currentPage * HOTELS_PER_PAGE < sortedHotels.length && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="px-6 py-3 min-h-[44px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Load More ({sortedHotels.length - currentPage * HOTELS_PER_PAGE} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      <Card className="bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {destinations.filter((d) => d.hotels.selectedHotelId).length} of {destinations.length} Hotels Selected
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {destinations.filter((d) => !d.hotels.selectedHotelId).length > 0
                ? 'Select a hotel for each destination to continue'
                : 'All hotels selected!'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              ${destinations.reduce((sum, d) => {
                if (!d.hotels.selectedHotelId) return sum;
                const hotel = d.hotels.results.find((h) => h.id === d.hotels.selectedHotelId);
                return sum + (hotel?.totalPrice || 0);
              }, 0).toLocaleString()}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total accommodation</p>
          </div>
        </div>
      </Card>

      {/* Hotel Detail Modal */}
      {modalHotel && activeDestination && (
        <HotelDetailModal
          hotel={modalHotel}
          nights={activeDestination.nights}
          onClose={() => setModalHotel(null)}
          onSelect={() => {
            handleSelectHotel(modalHotel.id);
            setModalHotel(null);
          }}
          isSelected={activeDestination.hotels.selectedHotelId === modalHotel.id}
        />
      )}

      {/* Snoo Hotel Assistant */}
      {activeDestination && (() => {
        // Calculate dates for Amadeus price lookup
        const cityCode = getCityCode(activeDestination.place.name) || undefined;
        const today = new Date();
        today.setDate(today.getDate() + 7);
        const startDate = basics.startDate || today.toISOString().split('T')[0];
        const startDateObj = new Date(startDate);
        let offsetDays = 0;
        for (let i = 0; i < destinations.length; i++) {
          if (destinations[i].destinationId === activeDestination.destinationId) break;
          offsetDays += destinations[i].nights;
        }
        const checkIn = new Date(startDateObj);
        checkIn.setDate(checkIn.getDate() + offsetDays);
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + activeDestination.nights);

        return (
          <HotelSnooChat
            destinationName={activeDestination.place.name}
            lat={activeDestination.place.lat}
            lng={activeDestination.place.lng}
            cityCode={cityCode}
            checkInDate={checkIn.toISOString().split('T')[0]}
            checkOutDate={checkOut.toISOString().split('T')[0]}
            adults={basics.travelers.adults}
            onHotelsFound={handleRedditHotelsFound}
          />
        );
      })()}
    </div>
  );
}
