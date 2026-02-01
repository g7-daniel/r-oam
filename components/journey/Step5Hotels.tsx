'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Hotel, Star, MapPin, Wifi, Car, Dumbbell, Coffee, MessageCircle, Map as MapIcon, List } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SentimentBadge from '@/components/shared/SentimentBadge';
import PriceTag from '@/components/shared/PriceTag';
import DistanceInfo from '@/components/shared/DistanceInfo';
import MapComponent from '@/components/ui/Map';
import type { Hotel as HotelType } from '@/types';
import clsx from 'clsx';

const amenityIcons: Record<string, React.ReactNode> = {
  WiFi: <Wifi className="w-4 h-4" />,
  Wifi: <Wifi className="w-4 h-4" />,
  Parking: <Car className="w-4 h-4" />,
  Gym: <Dumbbell className="w-4 h-4" />,
  Restaurant: <Coffee className="w-4 h-4" />,
};

export default function Step5Hotels() {
  const {
    destination,
    dates,
    travelers,
    budget,
    selectedFlight,
    selectedHotel,
    setSelectedHotel,
  } = useTripStore();

  const [hotels, setHotels] = useState<HotelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [starFilter, setStarFilter] = useState<number | null>(null);

  const accommodationBudget = Math.round((budget.allocation.accommodation / 100) * budget.total);
  const remainingBudget = budget.remaining - (selectedFlight?.price || 0);

  // Convert dates from strings if needed (happens after localStorage restore)
  const startDate = dates.startDate
    ? (typeof dates.startDate === 'string' ? new Date(dates.startDate) : dates.startDate)
    : null;
  const endDate = dates.endDate
    ? (typeof dates.endDate === 'string' ? new Date(dates.endDate) : dates.endDate)
    : null;

  const tripDuration = startDate && endDate
    ? Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 7;

  useEffect(() => {
    const fetchHotels = async () => {
      if (!destination || !startDate || !endDate) {
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

        console.log('Hotel search request:', {
          cityCode: destination.iataCode,
          checkInDate: checkInDateStr,
          checkOutDate: checkOutDateStr,
        });

        const params = new URLSearchParams({
          cityCode: destination.iataCode,
          checkInDate: checkInDateStr,
          checkOutDate: checkOutDateStr,
          adults: travelers.adults.toString(),
          maxPrice: accommodationBudget.toString(),
        });

        const response = await fetch(`/api/hotels?${params}`);
        const data = await response.json();

        if (!response.ok) {
          console.error('Hotel API error:', data);
          throw new Error(data.error || 'Failed to fetch hotels');
        }

        if (Array.isArray(data) && data.length > 0) {
          setHotels(data);
        } else {
          setError('No hotels found. Using sample data.');
          setHotels(getMockHotels());
        }
      } catch (err) {
        console.error('Hotel search error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Unable to fetch hotels: ${errorMessage}. Using sample data.`);
        setHotels(getMockHotels());
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [destination, startDate, endDate, travelers, accommodationBudget]);

  const getMockHotels = (): HotelType[] => {
    const nights = tripDuration;
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
        amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Gym', 'Parking'],
        distanceToCenter: 0.3,
        latitude: 48.8566,
        longitude: 2.3522,
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
        amenities: ['WiFi', 'Restaurant', 'Gym'],
        distanceToCenter: 0.8,
        latitude: 48.8606,
        longitude: 2.3376,
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
        amenities: ['WiFi', 'Parking'],
        distanceToCenter: 2.5,
        latitude: 48.8770,
        longitude: 2.3570,
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
        amenities: ['WiFi', 'Restaurant', 'Bar'],
        distanceToCenter: 0.5,
        latitude: 48.8610,
        longitude: 2.3420,
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

  const filteredHotels = hotels.filter((hotel) => {
    if (starFilter !== null && hotel.stars !== starFilter) return false;
    return true;
  }).sort((a, b) => a.totalPrice - b.totalPrice);

  const mapMarkers = filteredHotels.map((hotel) => ({
    id: hotel.id,
    lat: hotel.latitude,
    lng: hotel.longitude,
    title: hotel.name,
    type: 'hotel' as const,
    selected: selectedHotel?.id === hotel.id,
  }));

  const mapCenter = destination
    ? { lat: filteredHotels[0]?.latitude || 48.8566, lng: filteredHotels[0]?.longitude || 2.3522 }
    : { lat: 48.8566, lng: 2.3522 };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Find Your Stay</h1>
        <p className="section-subtitle">
          Hotels in {destination?.name} for {tripDuration} nights (Budget: ${accommodationBudget.toLocaleString()})
        </p>
      </div>

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
          <span className="text-sm text-gray-500">Stars:</span>
          {[null, 3, 4, 5].map((stars) => (
            <button
              key={stars ?? 'all'}
              onClick={() => setStarFilter(stars)}
              className={clsx(
                'px-3 py-1 rounded-full text-sm flex items-center gap-1',
                starFilter === stars
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {stars === null ? (
                'All'
              ) : (
                <>
                  {stars}
                  <Star className="w-3 h-3 fill-current" />
                </>
              )}
            </button>
          ))}
        </div>
      </div>

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
          <div className={clsx('space-y-4', viewMode === 'map' && 'order-2 lg:order-1')}>
            {filteredHotels.map((hotel) => (
              <Card
                key={hotel.id}
                variant={selectedHotel?.id === hotel.id ? 'selected' : 'interactive'}
                padding="none"
                onClick={() => setSelectedHotel(hotel)}
                className="cursor-pointer overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Image */}
                  <div className="sm:w-48 h-48 sm:h-auto shrink-0">
                    <img
                      src={hotel.imageUrl}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{hotel.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <div className="flex">
                            {Array.from({ length: hotel.stars }).map((_, i) => (
                              <Star
                                key={i}
                                className="w-3 h-3 fill-yellow-400 text-yellow-400"
                              />
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
                      {hotel.amenities.slice(0, 5).map((amenity) => (
                        <span
                          key={amenity}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {amenityIcons[amenity] || null}
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
                      <div className="flex items-center gap-2">
                        <SentimentBadge sentiment={hotel.sentiment} size="sm" />
                      </div>
                    )}

                    {/* Reddit highlight */}
                    {hotel.sentiment?.topComments[0] && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <MessageCircle className="w-3 h-3" />
                          r/{hotel.sentiment.topComments[0].subreddit}
                        </div>
                        <p className="text-sm text-gray-600 italic">
                          "{hotel.sentiment.topComments[0].text.slice(0, 100)}..."
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected indicator */}
                {selectedHotel?.id === hotel.id && (
                  <div className="px-4 py-3 bg-primary-50 border-t border-primary-200 flex items-center justify-between">
                    <span className="text-primary-600 font-medium">
                      Selected Hotel
                    </span>
                    <span className="text-sm text-gray-500">
                      ${hotel.totalPrice.toLocaleString()} for {tripDuration} nights
                    </span>
                  </div>
                )}
              </Card>
            ))}

            {filteredHotels.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-500">
                <Hotel className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No hotels found matching your criteria</p>
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
                  if (hotel) setSelectedHotel(hotel);
                }}
                className="h-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
