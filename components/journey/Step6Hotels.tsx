'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Hotel, Star, MapPin, Filter, MessageCircle, Map as MapIcon, List, Check, Navigation, Sparkles } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SentimentBadge from '@/components/shared/SentimentBadge';
import PriceTag from '@/components/shared/PriceTag';
import DistanceInfo from '@/components/shared/DistanceInfo';
import RedditBadge from '@/components/shared/RedditBadge';
import MapComponent from '@/components/ui/Map';
import { LegSelector } from '@/components/legs';
import { HotelFiltersPanel } from '@/components/filters';
import { HotelDetailModal } from '@/components/hotels';
import {
  calculateExperienceCentroid,
  sortHotelsByExperienceProximity,
  getOptimalHotelSearchArea,
  getExperienceProximityScore,
} from '@/lib/experience-proximity';
import type { Hotel as HotelType, RoomType, HotelFilters } from '@/types';
import clsx from 'clsx';

// Simulated Reddit-recommended hotels (in real app, would come from API)
const REDDIT_RECOMMENDED_HOTEL_IDS = new Set(['1', '4']);

export default function Step6Hotels() {
  const {
    legs,
    activeLegId,
    travelers,
    budget,
    hotelFilters,
    setLegHotel,
    getActiveLeg,
  } = useTripStore();

  const [hotels, setHotels] = useState<HotelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedHotelForDetail, setSelectedHotelForDetail] = useState<HotelType | null>(null);

  const activeLeg = getActiveLeg();
  const accommodationBudget = Math.round((budget.allocation.accommodation / 100) * budget.total);

  const startDate = activeLeg?.startDate
    ? (typeof activeLeg.startDate === 'string' ? new Date(activeLeg.startDate) : activeLeg.startDate)
    : null;
  const endDate = activeLeg?.endDate
    ? (typeof activeLeg.endDate === 'string' ? new Date(activeLeg.endDate) : activeLeg.endDate)
    : null;

  const tripDuration = startDate && endDate
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : activeLeg?.days || 7;

  useEffect(() => {
    const fetchHotels = async () => {
      if (!activeLeg || !startDate || !endDate) {
        setError('Missing destination or dates');
        setLoading(false);
        setHotels(getMockHotels());
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const checkInDateStr = format(startDate, 'yyyy-MM-dd');
        const checkOutDateStr = format(endDate, 'yyyy-MM-dd');

        const params = new URLSearchParams({
          cityCode: activeLeg.destination.iataCode,
          checkInDate: checkInDateStr,
          checkOutDate: checkOutDateStr,
          adults: travelers.adults.toString(),
          maxPrice: accommodationBudget.toString(),
        });

        const response = await fetch(`/api/hotels?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch hotels');
        }

        if (Array.isArray(data) && data.length > 0) {
          // Mark some as Reddit recommended
          const hotelsWithReddit = data.map((hotel: HotelType, idx: number) => ({
            ...hotel,
            isRedditRecommended: idx % 3 === 0, // Simulate
            redditMentionCount: idx % 3 === 0 ? Math.floor(Math.random() * 50) + 10 : 0,
          }));
          setHotels(hotelsWithReddit);
        } else {
          setHotels(getMockHotels());
        }
      } catch (err) {
        console.error('Hotel search error:', err);
        setHotels(getMockHotels());
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [activeLegId, travelers, accommodationBudget]);

  const getMockHotels = (): (HotelType & { isRedditRecommended?: boolean; redditMentionCount?: number })[] => {
    const nights = tripDuration;
    const destination = activeLeg?.destination;

    return [
      {
        id: '1',
        name: 'Grand Palace Hotel',
        address: '15 Avenue des Champs-Elysees',
        city: destination?.name || 'Paris',
        stars: 5,
        pricePerNight: Math.round(accommodationBudget / nights * 0.8),
        totalPrice: Math.round(accommodationBudget * 0.8),
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        amenities: ['wifi', 'pool', 'spa', 'restaurant', 'gym', 'parking'],
        distanceToCenter: 0.3,
        latitude: 48.8566,
        longitude: 2.3522,
        isRedditRecommended: true,
        redditMentionCount: 45,
        sentiment: {
          score: 0.85,
          label: 'positive',
          mentionCount: 156,
          topComments: [
            { text: 'Absolutely stunning hotel, the service was impeccable', subreddit: 'travel', score: 234, date: '2024-01-15' },
          ],
          subreddits: ['travel', 'luxurytravel'],
        },
      },
      {
        id: '2',
        name: 'City Center Boutique',
        address: '42 Rue de Rivoli',
        city: destination?.name || 'Paris',
        stars: 4,
        pricePerNight: Math.round(accommodationBudget / nights * 0.5),
        totalPrice: Math.round(accommodationBudget * 0.5),
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
        amenities: ['wifi', 'restaurant', 'gym'],
        distanceToCenter: 0.8,
        latitude: 48.8606,
        longitude: 2.3376,
        isRedditRecommended: false,
        redditMentionCount: 0,
        sentiment: {
          score: 0.65,
          label: 'positive',
          mentionCount: 89,
          topComments: [
            { text: 'Great location and reasonable prices, perfect for exploring', subreddit: 'travel', score: 156, date: '2024-01-20' },
          ],
          subreddits: ['travel', 'solotravel'],
        },
      },
      {
        id: '3',
        name: 'Budget Traveler Inn',
        address: '88 Boulevard de Magenta',
        city: destination?.name || 'Paris',
        stars: 3,
        pricePerNight: Math.round(accommodationBudget / nights * 0.3),
        totalPrice: Math.round(accommodationBudget * 0.3),
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
        amenities: ['wifi', 'parking'],
        distanceToCenter: 2.5,
        latitude: 48.8770,
        longitude: 2.3570,
        isRedditRecommended: false,
        redditMentionCount: 0,
        sentiment: {
          score: 0.4,
          label: 'positive',
          mentionCount: 45,
          topComments: [
            { text: 'Basic but clean, you get what you pay for', subreddit: 'budgettravel', score: 78, date: '2024-02-01' },
          ],
          subreddits: ['budgettravel', 'shoestring'],
        },
      },
      {
        id: '4',
        name: 'Historic Quarter Residence',
        address: '25 Rue Saint-Honore',
        city: destination?.name || 'Paris',
        stars: 4,
        pricePerNight: Math.round(accommodationBudget / nights * 0.6),
        totalPrice: Math.round(accommodationBudget * 0.6),
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
        amenities: ['wifi', 'restaurant', 'breakfast'],
        distanceToCenter: 0.5,
        latitude: 48.8610,
        longitude: 2.3420,
        isRedditRecommended: true,
        redditMentionCount: 28,
        sentiment: {
          score: 0.72,
          label: 'positive',
          mentionCount: 112,
          topComments: [
            { text: 'Beautiful building with lots of character, staff very helpful', subreddit: 'travel', score: 189, date: '2024-01-25' },
          ],
          subreddits: ['travel'],
        },
      },
    ];
  };

  // Apply filters
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel: any) => {
      // Reddit recommended only
      if (hotelFilters.redditRecommendedOnly && !hotel.isRedditRecommended) {
        return false;
      }

      // Price filter
      if (hotelFilters.priceRange) {
        if (
          hotel.pricePerNight < hotelFilters.priceRange.min ||
          hotel.pricePerNight > hotelFilters.priceRange.max
        ) {
          return false;
        }
      }

      // Star rating filter
      if (hotelFilters.starRatings.length > 0) {
        if (!hotelFilters.starRatings.includes(hotel.stars)) {
          return false;
        }
      }

      // Distance filter
      if (hotelFilters.maxDistanceFromCenter !== null) {
        if (hotel.distanceToCenter > hotelFilters.maxDistanceFromCenter) {
          return false;
        }
      }

      // Amenities filter
      if (hotelFilters.amenities.length > 0) {
        const hotelAmenitiesLower = hotel.amenities.map((a: string) => a.toLowerCase());
        if (!hotelFilters.amenities.every((amenity) => hotelAmenitiesLower.includes(amenity))) {
          return false;
        }
      }

      // Guest rating filter
      if (hotelFilters.minGuestRating !== null && hotel.sentiment) {
        if (hotel.sentiment.score < hotelFilters.minGuestRating) {
          return false;
        }
      }

      return true;
    });
  }, [hotels, hotelFilters]);

  // Get experience-based sorting if experiences are selected
  const experiencesSorted = useMemo(() => {
    const experiences = activeLeg?.experiences || [];
    if (experiences.length === 0) return filteredHotels;
    return sortHotelsByExperienceProximity(filteredHotels, experiences);
  }, [filteredHotels, activeLeg?.experiences]);

  // Get experience center for map
  const experienceCenter = useMemo(() => {
    const experiences = activeLeg?.experiences || [];
    return calculateExperienceCentroid(experiences);
  }, [activeLeg?.experiences]);

  // Sort: By proximity to experiences first, then Reddit recommended, then by price
  const sortedHotels = [...experiencesSorted].sort((a: any, b: any) => {
    // If user has selected experiences, prioritize proximity
    const experiences = activeLeg?.experiences || [];
    if (experiences.length > 0) {
      const aProximity = a.distanceToExperiences || 0;
      const bProximity = b.distanceToExperiences || 0;
      // Within 2km is considered "close enough"
      const aClose = aProximity <= 2;
      const bClose = bProximity <= 2;
      if (aClose && !bClose) return -1;
      if (!aClose && bClose) return 1;
    }
    // Then Reddit recommended
    if (a.isRedditRecommended && !b.isRedditRecommended) return -1;
    if (!a.isRedditRecommended && b.isRedditRecommended) return 1;
    return a.totalPrice - b.totalPrice;
  });

  const redditRecommendedHotels = sortedHotels.filter((h: any) => h.isRedditRecommended);
  const otherHotels = sortedHotels.filter((h: any) => !h.isRedditRecommended);

  const handleSelectHotel = (hotel: HotelType) => {
    if (!activeLegId) return;
    setLegHotel(activeLegId, hotel);
  };

  const handleSelectRoom = (hotel: HotelType, room: RoomType) => {
    if (!activeLegId) return;
    const updatedHotel: HotelType = {
      ...hotel,
      pricePerNight: room.pricePerNight,
      totalPrice: room.totalPrice,
    };
    setLegHotel(activeLegId, updatedHotel);
    setSelectedHotelForDetail(null);
  };

  const priceRange = hotels.length > 0
    ? {
        min: Math.min(...hotels.map((h) => h.pricePerNight)),
        max: Math.max(...hotels.map((h) => h.pricePerNight)),
      }
    : { min: 0, max: 1000 };

  const mapMarkers = filteredHotels.map((hotel: any) => ({
    id: hotel.id,
    lat: hotel.latitude,
    lng: hotel.longitude,
    title: hotel.name,
    type: 'hotel' as const,
    selected: activeLeg?.hotel?.id === hotel.id,
  }));

  // Use experience center for map if available, otherwise hotel location
  const mapCenter = experienceCenter
    || (activeLeg?.destination
      ? { lat: filteredHotels[0]?.latitude || 48.8566, lng: filteredHotels[0]?.longitude || 2.3522 }
      : { lat: 48.8566, lng: 2.3522 });

  if (legs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Please add destinations first</p>
      </div>
    );
  }

  const hasExperiences = (activeLeg?.experiences?.length || 0) > 0;

  const HotelCard = ({ hotel, isSelected }: { hotel: any; isSelected: boolean }) => {
    const proximityScore = hasExperiences
      ? getExperienceProximityScore(hotel, activeLeg?.experiences || [])
      : null;
    const distanceToExp = hotel.distanceToExperiences;

    return (
      <Card
        variant={isSelected ? 'selected' : 'interactive'}
        padding="none"
        onClick={() => setSelectedHotelForDetail(hotel)}
        className="cursor-pointer overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="sm:w-48 h-48 sm:h-auto shrink-0 relative">
            <img
              src={hotel.imageUrl}
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
            {hotel.isRedditRecommended && (
              <div className="absolute top-2 left-2">
                <RedditBadge variant="compact" mentionCount={hotel.redditMentionCount} />
              </div>
            )}
            {/* Experience proximity badge */}
            {hasExperiences && distanceToExp !== undefined && distanceToExp <= 2 && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                Near activities
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{hotel.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="flex">
                    {Array.from({ length: hotel.stars }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span>|</span>
                  <DistanceInfo distance={hotel.distanceToCenter} />
                </div>
              </div>
              <div className="text-right">
                <PriceTag price={hotel.pricePerNight} perUnit="night" />
                <div className="text-sm text-gray-500">
                  ${hotel.totalPrice.toLocaleString()} total
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
              <MapPin className="w-4 h-4" />
              {hotel.address}
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-2 mb-3">
              {hotel.amenities.slice(0, 5).map((amenity: string) => (
                <span
                  key={amenity}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full capitalize"
                >
                  {amenity}
                </span>
              ))}
              {hotel.amenities.length > 5 && (
                <span className="text-xs text-gray-400">
                  +{hotel.amenities.length - 5} more
                </span>
              )}
            </div>

            {/* Sentiment */}
            {hotel.sentiment && (
              <SentimentBadge sentiment={hotel.sentiment} size="sm" />
            )}

            {/* Experience distance info */}
            {hasExperiences && distanceToExp !== undefined && (
              <div className="flex items-center gap-2 mt-2 text-sm">
                <Navigation className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-600">
                  {distanceToExp < 1
                    ? `${Math.round(distanceToExp * 1000)}m`
                    : `${distanceToExp.toFixed(1)}km`}
                  {' '}avg. to your activities
                </span>
                {proximityScore !== null && proximityScore >= 85 && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Great location
                  </span>
                )}
              </div>
            )}

            {/* Quick select button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelectHotel(hotel);
              }}
              className={clsx(
                'mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto',
                isSelected
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              )}
            >
              {isSelected ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Selected
                </span>
              ) : (
                'Quick Select'
              )}
            </button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Find Your Stay</h1>
        <p className="section-subtitle">
          Hotels in {activeLeg?.destination.name} for {tripDuration} nights
        </p>
      </div>

      {/* Leg Selector */}
      {legs.length > 1 && (
        <div className="flex justify-center mb-6">
          <LegSelector showProgress progressType="hotels" />
        </div>
      )}

      {/* View toggle and filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === 'map' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <MapIcon className="w-4 h-4 mr-2" />
            Map
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(true)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <span className="text-sm text-slate-500">
            {filteredHotels.length} hotels
          </span>
        </div>
      </div>

      {/* Filters Panel */}
      <HotelFiltersPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        priceRange={priceRange}
      />

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Hotel className="w-12 h-12 text-primary-500 animate-bounce mb-4" />
          <p className="text-gray-600">Finding the best hotels...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-8 text-amber-600 bg-amber-50 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className={clsx(viewMode === 'map' && 'grid lg:grid-cols-2 gap-6')}>
          {/* Hotel list */}
          <div className={clsx('space-y-6', viewMode === 'map' && 'order-2 lg:order-1')}>
            {/* Reddit Recommended Section */}
            {redditRecommendedHotels.length > 0 && !hotelFilters.redditRecommendedOnly && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <RedditBadge />
                  <span className="text-sm text-slate-500">
                    {redditRecommendedHotels.length} hotels mentioned positively
                  </span>
                </div>
                <div className="space-y-4">
                  {redditRecommendedHotels.map((hotel: any) => (
                    <HotelCard
                      key={hotel.id}
                      hotel={hotel}
                      isSelected={activeLeg?.hotel?.id === hotel.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Hotels */}
            {otherHotels.length > 0 && (
              <div>
                {redditRecommendedHotels.length > 0 && !hotelFilters.redditRecommendedOnly && (
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">
                    All Hotels
                  </h3>
                )}
                <div className="space-y-4">
                  {otherHotels.map((hotel: any) => (
                    <HotelCard
                      key={hotel.id}
                      hotel={hotel}
                      isSelected={activeLeg?.hotel?.id === hotel.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredHotels.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-500">
                <Hotel className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No hotels found matching your criteria</p>
                <p className="text-sm mt-2">Try adjusting your filters</p>
              </div>
            )}
          </div>

          {/* Map view */}
          {viewMode === 'map' && (
            <div className="order-1 lg:order-2 h-[500px] lg:sticky lg:top-24">
              <MapComponent
                center={mapCenter}
                zoom={13}
                markers={mapMarkers}
                onMarkerClick={(id) => {
                  const hotel = hotels.find((h) => h.id === id);
                  if (hotel) setSelectedHotelForDetail(hotel);
                }}
                className="h-full"
              />
            </div>
          )}
        </div>
      )}

      {/* Hotel Detail Modal */}
      {selectedHotelForDetail && (
        <HotelDetailModal
          hotel={selectedHotelForDetail}
          nights={tripDuration}
          isOpen={!!selectedHotelForDetail}
          onClose={() => setSelectedHotelForDetail(null)}
          onSelectRoom={handleSelectRoom}
        />
      )}
    </div>
  );
}
