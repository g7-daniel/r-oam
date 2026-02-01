'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import Card from '@/components/ui/Card';
import {
  Hotel,
  MapPin,
  Star,
  DollarSign,
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
  Bath,
  Utensils,
  Waves,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';
import HotelSnooChat, { type RedditHotel } from './HotelSnooChat';
import type { Hotel as HotelType } from '@/lib/schemas/trip';

// Amenity icons
const AMENITY_ICONS: Record<string, React.ElementType> = {
  wifi: Wifi,
  parking: Car,
  gym: Dumbbell,
  breakfast: Coffee,
};

// All available amenities
const ALL_AMENITIES = [
  'wifi', 'pool', 'gym', 'spa', 'restaurant', 'parking', 'breakfast',
  'beach_access', 'airport_shuttle', 'pet_friendly', 'room_service',
  'air_conditioning', 'bar', 'laundry', 'concierge', 'business_center'
];

const PROPERTY_TYPES = ['hotel', 'resort', 'apartment', 'villa', 'hostel', 'boutique'];

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

  const selectedRoomType = ROOM_TYPES.find(r => r.id === selectedRoom) || ROOM_TYPES[0];
  const roomPrice = Math.round(hotel.pricePerNight * selectedRoomType.priceMultiplier);
  const totalPrice = roomPrice * nights;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="relative">
          {/* Image gallery */}
          <div className="relative h-64 md:h-80 bg-slate-200 dark:bg-slate-700">
            <img
              src={hotelImages[currentImageIndex]}
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
            {/* Image navigation */}
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev - 1 + hotelImages.length) % hotelImages.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-800/80 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 dark:text-white" />
            </button>
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev + 1) % hotelImages.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-800/80 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            {/* Image indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {hotelImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={clsx(
                    'w-2 h-2 rounded-full transition-colors',
                    idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  )}
                />
              ))}
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
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
                        {Array.from({ length: hotel.stars }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
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
                        <Icon className="w-4 h-4 text-primary-500" />
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
                            <p className="text-lg font-bold text-slate-900 dark:text-white">${price}</p>
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
                    <span className="font-medium dark:text-white">${roomPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Duration</span>
                    <span className="font-medium dark:text-white">{nights} nights</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-600 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                      <span className="text-xl font-bold text-primary-600 dark:text-primary-400">${totalPrice}</span>
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
  } = useTripStoreV2();

  const { destinations, activeDestinationId, basics } = trip;
  const activeDestination = destinations.find((d) => d.destinationId === activeDestinationId);

  const [isLoading, setIsLoading] = useState(false);
  const [priceFilter, setPriceFilter] = useState<[number, number]>([0, 2000]);
  const [starFilter, setStarFilter] = useState<number[]>([]);
  const [guestRatingFilter, setGuestRatingFilter] = useState<number>(0);
  const [amenityFilters, setAmenityFilters] = useState<string[]>([]);
  const [freeCancellationOnly, setFreeCancellationOnly] = useState(false);
  const [redditRecommendedOnly, setRedditRecommendedOnly] = useState(false);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string[]>([]);
  const [distanceFilter, setDistanceFilter] = useState<number>(10);
  const [modalHotel, setModalHotel] = useState<HotelType | null>(null);
  const [redditHotels, setRedditHotels] = useState<RedditHotel[]>([]);
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(
    new Set(['travel', 'hotels', 'luxurytravel', 'fatfire'])
  );
  const [isLoadingReddit, setIsLoadingReddit] = useState(false);

  // Handler for Snoo Reddit recommendations
  const handleRedditHotelsFound = (hotels: RedditHotel[]) => {
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

  // Fetch Reddit recommendations based on selected subreddits
  const fetchRedditRecommendations = useCallback(async () => {
    if (!activeDestination || selectedSubreddits.size === 0) return;

    setIsLoadingReddit(true);
    try {
      const response = await fetch('/api/reddit/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: activeDestination.place.name,
          subreddits: Array.from(selectedSubreddits),
          preferences: {
            budget: selectedSubreddits.has('fatfire') || selectedSubreddits.has('luxurytravel') ? 'luxury' : 'mid',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const hotels = data.hotels || [];
        setRedditHotels(hotels);

        // Mark matching hotels in the main list AND add unmatched Reddit hotels
        if (hotels.length > 0) {
          const hotelNames = hotels.map((h: RedditHotel) => h.name.toLowerCase());

          // Find existing hotels and mark them
          const updatedResults = activeDestination.hotels.results.map(hotel => ({
            ...hotel,
            isRedditRecommended: hotelNames.some((name: string) =>
              hotel.name.toLowerCase().includes(name) || name.includes(hotel.name.toLowerCase())
            ),
          }));

          // Find Reddit hotels that don't match existing hotels
          const unmatchedRedditHotels = hotels.filter((rh: RedditHotel) => {
            const rhName = rh.name.toLowerCase();
            return !updatedResults.some(h =>
              h.name.toLowerCase().includes(rhName.slice(0, 10)) ||
              rhName.includes(h.name.toLowerCase().slice(0, 10))
            );
          });

          // Convert unmatched Reddit hotels to HotelType and add to results
          const nights = activeDestination.nights;
          const convertedRedditHotels: HotelType[] = unmatchedRedditHotels.slice(0, 8).map((rh: RedditHotel, idx: number) => ({
            id: rh.id || `reddit-${rh.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`,
            name: rh.name,
            address: `${activeDestination.place.name}`,
            city: activeDestination.place.name,
            countryCode: activeDestination.place.countryCode || 'XX',
            stars: 4,
            pricePerNight: rh.priceEstimate || 200,
            totalPrice: (rh.priceEstimate || 200) * nights,
            currency: 'USD',
            imageUrl: HOTEL_IMAGES[idx % HOTEL_IMAGES.length],
            amenities: ['wifi', 'pool', 'restaurant'],
            distanceToCenter: 3.0,
            lat: activeDestination.place.lat || 0,
            lng: activeDestination.place.lng || 0,
            guestRating: 8.5,
            reviewCount: rh.mentionCount || 1,
            isRedditRecommended: true,
            source: 'reddit',
            hasRealPricing: false,
          }));

          // Add Reddit hotels at the beginning of results
          setHotelResults(activeDestination.destinationId, [...convertedRedditHotels, ...updatedResults]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch Reddit recommendations:', error);
    } finally {
      setIsLoadingReddit(false);
    }
  }, [activeDestination, selectedSubreddits, setHotelResults]);

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

  // Fetch hotels for active destination
  const fetchHotels = useCallback(async () => {
    if (!activeDestination) return;
    if (isSearching.current) return; // Prevent duplicate requests

    isSearching.current = true;
    setIsLoading(true);
    try {
      // Get city code for Amadeus API
      const cityCode = getCityCode(activeDestination.place.name);

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

      // Try API if we have a city code OR coordinates (for Google Places fallback)
      const hasCoordinates = activeDestination.place.lat && activeDestination.place.lng;
      if (cityCode || hasCoordinates) {
        try {
          const params = new URLSearchParams({
            cityName: activeDestination.place.name,
            checkInDate: checkInDate.toISOString().split('T')[0],
            checkOutDate: checkOutDate.toISOString().split('T')[0],
            adults: String(basics.travelers.adults),
          });

          // Add city code if available (for Amadeus)
          if (cityCode) {
            params.append('cityCode', cityCode);
          }

          // Add coordinates (for Google Places fallback)
          if (activeDestination.place.lat) {
            params.append('lat', String(activeDestination.place.lat));
          }
          if (activeDestination.place.lng) {
            params.append('lng', String(activeDestination.place.lng));
          }

          const response = await fetch(`/api/hotels?${params}`);
          console.log('Hotel API response status:', response.status);

          if (response.ok) {
            const apiHotels = await response.json();
            console.log('Hotel API returned:', apiHotels?.length || 0, 'hotels', apiHotels);
            if (Array.isArray(apiHotels) && apiHotels.length > 0) {
              // Transform API response to match our schema and add images
              const hotels: HotelType[] = apiHotels.map((h: any, idx: number) => ({
                id: h.id,
                name: h.name,
                address: h.address,
                city: activeDestination.place.name,
                countryCode: activeDestination.place.countryCode,
                stars: h.stars || 4,
                pricePerNight: Math.round(h.pricePerNight),
                totalPrice: Math.round(h.totalPrice),
                currency: h.currency || 'USD',
                imageUrl: h.imageUrl || HOTEL_IMAGES[idx % HOTEL_IMAGES.length],
                amenities: h.amenities || ['wifi'],
                distanceToCenter: h.distanceToCenter || 1.0,
                lat: h.latitude || 0,
                lng: h.longitude || 0,
                guestRating: h.guestRating || 8.0,
                reviewCount: h.reviewCount || 0,
                isRedditRecommended: idx < 2,
                source: h.source || 'amadeus',
                hasRealPricing: h.hasRealPricing !== false,
              }));
              setHotelResults(activeDestination.destinationId, hotels);
              hotelsFetched = true;
            }
          }
        } catch (apiError) {
          console.error('API hotel search failed:', apiError);
        }
      }

      // Show empty state with retry option if API didn't return results
      if (!hotelsFetched) {
        console.log('No hotels fetched for', activeDestination.place.name);
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
    if (activeDestination && selectedSubreddits.size > 0) {
      const debounceTimer = setTimeout(() => {
        fetchRedditRecommendations();
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDestination?.destinationId, subredditsKey]);

  // Filter hotels
  const allHotels = activeDestination?.hotels.results || [];

  const filteredHotels = allHotels.filter((hotel) => {
    // Price filter
    if (hotel.pricePerNight < priceFilter[0] || hotel.pricePerNight > priceFilter[1]) {
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

  const handleSelectHotel = (hotelId: string) => {
    if (!activeDestination) return;
    const currentSelection = activeDestination.hotels.selectedHotelId;
    selectHotel(activeDestination.destinationId, currentSelection === hotelId ? null : hotelId);
  };

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
              <div className="flex flex-wrap gap-1.5">
                {ALL_SUBREDDITS.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => toggleSubreddit(sub)}
                    className={clsx(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
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

      {/* Reddit Recommended Hotels Section - Compact horizontal scroll */}
      {activeDestination && (() => {
        // Filter Reddit hotels by quality (20+ upvotes) and apply same filters as main list
        const qualityRedditHotels = redditHotels
          .filter(h => (h.upvotes || 0) >= 20)
          .filter(hotel => {
            // Apply same filters as main hotel list
            const estimatedPrice = hotel.priceEstimate || 200;
            if (estimatedPrice < priceFilter[0] || estimatedPrice > priceFilter[1]) return false;
            // Star filter based on price level
            const estimatedStars = hotel.priceLevel ? Math.min(5, hotel.priceLevel + 2) : 4;
            if (starFilter.length > 0 && !starFilter.includes(estimatedStars)) return false;
            // Guest rating filter
            const estimatedRating = hotel.rating ? hotel.rating * 2 : 8.5;
            if (guestRatingFilter > 0 && estimatedRating < guestRatingFilter) return false;
            return true;
          })
          .slice(0, 6); // Max 6 Reddit hotels

        // Only show section if we have at least 3 quality hotels
        if (qualityRedditHotels.length < 3) return null;

        return (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Reddit Picks
            </span>
            <span className="text-xs text-slate-400">
              ({qualityRedditHotels.length})
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {qualityRedditHotels
              .map((hotel, idx) => {
                const estimatedPrice = hotel.priceEstimate || (
                  selectedSubreddits.has('fatfire') || selectedSubreddits.has('luxurytravel') ? 450 : 180
                );
                const nights = activeDestination.nights;
                const hotelImage = hotel.imageUrl || HOTEL_IMAGES[idx % HOTEL_IMAGES.length];
                const hotelAddress = hotel.address || activeDestination.place.name;

                return (
                  <div
                    key={hotel.id || `reddit-${idx}`}
                    className={clsx(
                      "flex-shrink-0 w-56 bg-white dark:bg-slate-800 rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-shadow",
                      hotel.verified
                        ? "border-green-300 dark:border-green-700"
                        : "border-orange-200 dark:border-orange-800/50"
                    )}
                    onClick={() => {
                      const hotelData: HotelType = {
                        id: hotel.id || `reddit-${hotel.name.toLowerCase().replace(/\s+/g, '-')}`,
                        name: hotel.name,
                        address: hotelAddress,
                        city: activeDestination.place.name,
                        countryCode: activeDestination.place.countryCode || 'XX',
                        stars: hotel.priceLevel ? Math.min(5, hotel.priceLevel + 2) : 4,
                        pricePerNight: estimatedPrice,
                        totalPrice: estimatedPrice * nights,
                        currency: 'USD',
                        imageUrl: hotelImage,
                        amenities: ['wifi', 'pool', 'restaurant'],
                        distanceToCenter: 2.0,
                        lat: hotel.lat || activeDestination.place.lat || 0,
                        lng: hotel.lng || activeDestination.place.lng || 0,
                        guestRating: hotel.rating ? hotel.rating * 2 : 8.5,
                        reviewCount: hotel.mentionCount || 1,
                        isRedditRecommended: true,
                        source: 'reddit',
                        hasRealPricing: false,
                      };
                      setModalHotel(hotelData);
                    }}
                  >
                    {/* Compact image */}
                    <div className="relative h-24 bg-slate-100 dark:bg-slate-700">
                      <img
                        src={hotelImage}
                        alt={hotel.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.src = HOTEL_IMAGES[idx % HOTEL_IMAGES.length];
                        }}
                      />
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/90 text-white text-[10px] font-medium rounded backdrop-blur-sm">
                        <span>▲</span>
                        {hotel.upvotes?.toLocaleString() || hotel.mentionCount || '?'}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-2.5">
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-1 mb-1">
                        {hotel.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 line-clamp-1">
                        {hotelAddress}
                      </p>
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-base font-bold text-slate-900 dark:text-white">
                            ${estimatedPrice}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-0.5">/night</span>
                        </div>
                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                          ${estimatedPrice * nights} total
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        );
      })()}

      {activeDestination && (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters - Compact Modern Design */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[calc(100vh-120px)] overflow-y-auto">
              {/* Filter Header */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Filters</h3>
                  {(starFilter.length > 0 || priceFilter[0] > 0 || priceFilter[1] < 2000 || guestRatingFilter > 0 || amenityFilters.length > 0 || freeCancellationOnly || redditRecommendedOnly || propertyTypeFilter.length > 0 || distanceFilter < 10) && (
                    <button
                      onClick={() => {
                        setStarFilter([]);
                        setPriceFilter([0, 2000]);
                        setGuestRatingFilter(0);
                        setAmenityFilters([]);
                        setFreeCancellationOnly(false);
                        setRedditRecommendedOnly(false);
                        setPropertyTypeFilter([]);
                        setDistanceFilter(10);
                      }}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      Reset all
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-5">
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
                  <div className="flex gap-1">
                    {[5, 4, 3].map((stars) => (
                      <button
                        key={stars}
                        onClick={() => toggleStarFilter(stars)}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all',
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
                  <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                    {[{ label: 'Any', value: 0 }, { label: '7+', value: 7 }, { label: '8+', value: 8 }, { label: '9+', value: 9 }].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setGuestRatingFilter(option.value)}
                        className={clsx(
                          'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
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
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Distance
                    </label>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {distanceFilter} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={distanceFilter}
                    onChange={(e) => setDistanceFilter(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                </div>

                {/* Amenities - Compact grid */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                    Amenities
                  </label>
                  <div className="flex flex-wrap gap-1.5">
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
                        className={clsx(
                          'px-2.5 py-1 rounded-full text-xs font-medium transition-all capitalize',
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
              <div className="text-center py-12">
                <Loader2 className="w-10 h-10 mx-auto mb-4 text-primary-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400">Searching for hotels in {activeDestination.place.name}...</p>
              </div>
            ) : filteredHotels.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <Hotel className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                {activeDestination.hotels.results.length === 0 ? (
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
                        setStarFilter([]);
                        setPriceFilter([0, 2000]);
                        setGuestRatingFilter(0);
                        setAmenityFilters([]);
                        setFreeCancellationOnly(false);
                        setRedditRecommendedOnly(false);
                        setPropertyTypeFilter([]);
                        setDistanceFilter(10);
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
                {filteredHotels.map((hotel) => {
                  const isSelected = activeDestination.hotels.selectedHotelId === hotel.id;

                  return (
                    <Card
                      key={hotel.id}
                      className={clsx(
                        'cursor-pointer transition-all',
                        isSelected
                          ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30'
                          : 'hover:shadow-md'
                      )}
                      onClick={() => setModalHotel(hotel)}
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="relative w-48 h-36 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                          <img
                            src={hotel.imageUrl}
                            alt={hotel.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.src = HOTEL_IMAGES[Math.floor(Math.random() * HOTEL_IMAGES.length)];
                            }}
                          />
                          {/* Source badge */}
                          <div className="absolute top-2 left-2">
                            {hotel.source === 'amadeus' ? (
                              <span className="px-1.5 py-0.5 bg-green-500/90 text-white text-[10px] font-medium rounded backdrop-blur-sm">
                                Live Price
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-slate-500/80 text-white text-[10px] font-medium rounded backdrop-blur-sm">
                                Est. Price
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-white">{hotel.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: hotel.stars }).map((_, i) => (
                                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                                  ))}
                                </div>
                                {hotel.guestRating && (
                                  <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-medium rounded">
                                    {hotel.guestRating}/10
                                  </span>
                                )}
                                {hotel.isRedditRecommended && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs font-medium rounded">
                                    <MessageCircle className="w-3 h-3" />
                                    Reddit Pick
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className={clsx(
                                'w-8 h-8 rounded-full flex items-center justify-center',
                                isSelected
                                  ? 'bg-primary-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700'
                              )}
                            >
                              {isSelected && <Check className="w-5 h-5" />}
                            </div>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-2">
                            <MapPin className="w-4 h-4" />
                            <span>{hotel.city}{getCountryName(hotel.countryCode) ? `, ${getCountryName(hotel.countryCode)}` : ''}</span>
                            <span className="mx-1">•</span>
                            <span>{typeof hotel.distanceToCenter === 'number' ? hotel.distanceToCenter.toFixed(1) : hotel.distanceToCenter} km from center</span>
                          </div>

                          {/* Amenities */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {hotel.amenities.slice(0, 5).map((amenity) => (
                              <span
                                key={amenity}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded"
                              >
                                {amenity}
                              </span>
                            ))}
                            {hotel.amenities.length > 5 && (
                              <span className="px-2 py-1 text-slate-500 dark:text-slate-400 text-xs">
                                +{hotel.amenities.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            ${hotel.pricePerNight}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">per night</p>
                          <p className="text-lg font-semibold text-primary-600 dark:text-primary-400 mt-2">
                            ${hotel.totalPrice}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {activeDestination.nights} nights total
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
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
      {activeDestination && (
        <HotelSnooChat
          destinationName={activeDestination.place.name}
          onHotelsFound={handleRedditHotelsFound}
        />
      )}
    </div>
  );
}
