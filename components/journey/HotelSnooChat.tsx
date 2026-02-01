'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Hotel,
  MessageCircle,
  X,
  ExternalLink,
  ArrowUp,
  DollarSign,
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Navigation,
} from 'lucide-react';
import clsx from 'clsx';

interface HotelSnooChatProps {
  destinationName: string;
  onHotelSuggestion?: (hotel: { name: string; priceRange?: string; source?: string }) => void;
}

interface HotelSuggestion {
  name: string;
  description: string;
  priceRange?: string;
  subreddit?: string;
  upvotes?: number;
  url?: string;
}

interface HotelDetails {
  name: string;
  description: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  images: string[];
  amenities: string[];
  priceRange?: string;
  lat?: number;
  lng?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hotelSuggestions?: HotelSuggestion[];
  isStreaming?: boolean;
}

// Subreddits for hotel recommendations
const HOTEL_SUBREDDITS = [
  { name: 'travel', description: 'General travel advice' },
  { name: 'fatfire', description: 'High-end luxury recommendations' },
  { name: 'luxurytravel', description: 'Luxury travel experiences' },
  { name: 'solotravel', description: 'Budget-friendly options' },
  { name: 'TravelHacks', description: 'Deals and tips' },
  { name: 'hotels', description: 'Hotel discussions' },
  { name: 'awardtravel', description: 'Points and rewards' },
];

export default function HotelSnooChat({ destinationName, onHotelSuggestion }: HotelSnooChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hotel detail modal state
  const [selectedHotel, setSelectedHotel] = useState<HotelSuggestion | null>(null);
  const [hotelDetails, setHotelDetails] = useState<HotelDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const quickSuggestions = [
    `What do people on r/fatfire recommend for ${destinationName}?`,
    `Best boutique hotels in ${destinationName} under $300`,
    `Luxury hotels with great views in ${destinationName}`,
    `What's the best value hotel in ${destinationName}?`,
  ];

  // Fetch hotel details when a hotel is clicked
  const handleHotelClick = async (hotel: HotelSuggestion) => {
    setSelectedHotel(hotel);
    setIsLoadingDetails(true);
    setCurrentImageIndex(0);

    try {
      // Search for the hotel via Google Places to get images and details
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `${hotel.name} hotel ${destinationName}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const place = data.places?.[0];

        if (place) {
          // Generate multiple image URLs
          const images: string[] = [];
          if (place.imageUrl) images.push(place.imageUrl);
          // Add Unsplash fallbacks for variety
          images.push(`https://source.unsplash.com/800x600/?${encodeURIComponent(hotel.name + ' hotel lobby')}`);
          images.push(`https://source.unsplash.com/800x600/?${encodeURIComponent(hotel.name + ' hotel room')}`);
          images.push(`https://source.unsplash.com/800x600/?${encodeURIComponent(hotel.name + ' hotel pool')}`);

          setHotelDetails({
            name: place.name || hotel.name,
            description: place.description || hotel.description,
            rating: place.rating,
            reviewCount: place.reviewCount,
            address: place.address,
            images,
            amenities: ['WiFi', 'Pool', 'Fitness Center', 'Restaurant', 'Room Service', 'Spa'],
            priceRange: hotel.priceRange,
            lat: place.lat,
            lng: place.lng,
          });
        } else {
          // Fallback with Unsplash images
          setHotelDetails({
            name: hotel.name,
            description: hotel.description,
            images: [
              `https://source.unsplash.com/800x600/?${encodeURIComponent(hotel.name + ' hotel')}`,
              `https://source.unsplash.com/800x600/?luxury+hotel+lobby`,
              `https://source.unsplash.com/800x600/?luxury+hotel+room`,
            ],
            amenities: ['WiFi', 'Pool', 'Fitness Center', 'Restaurant'],
            priceRange: hotel.priceRange,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch hotel details:', error);
      // Fallback
      setHotelDetails({
        name: hotel.name,
        description: hotel.description,
        images: [`https://source.unsplash.com/800x600/?${encodeURIComponent(hotel.name + ' hotel')}`],
        amenities: ['WiFi', 'Pool', 'Restaurant'],
        priceRange: hotel.priceRange,
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeHotelDetail = () => {
    setSelectedHotel(null);
    setHotelDetails(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    const userQuery = input;
    setInput('');
    setIsLoading(true);

    const assistantMessageId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }]);

    try {
      const response = await fetch('/api/ai/hotel-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery,
          destination: destinationName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => prev.map(m =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: data.message || 'Here are some Reddit recommendations:',
                hotelSuggestions: data.hotels || [],
                isStreaming: false,
              }
            : m
        ));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: 'Sorry, I had trouble finding recommendations. Try again!', isStreaming: false }
            : m
        ));
      }
    } catch (error) {
      console.error('Hotel chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: 'Sorry, something went wrong. Please try again.', isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-6 z-30 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all hover:shadow-xl border border-orange-400"
      >
        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
          <span className="text-orange-500 font-bold text-xs">r/</span>
        </div>
        <span className="font-medium">Ask Snoo for hotel tips</span>
        <MessageCircle className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed top-20 right-6 z-30 w-[420px] h-[520px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-reddit text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-reddit font-bold text-sm">r/</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Ask Snoo</h3>
            <p className="text-xs text-orange-100">Reddit-powered hotel tips</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-orange-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Subreddit pills */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">POWERED BY</p>
        <div className="flex flex-wrap gap-1">
          {HOTEL_SUBREDDITS.slice(0, 5).map(sub => (
            <span
              key={sub.name}
              className="text-[10px] px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full"
            >
              r/{sub.name}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-4">
            <Hotel className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-1 font-medium">
              Hotel recommendations from Reddit
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Ask about hotels in {destinationName}
            </p>
            <div className="space-y-2">
              {quickSuggestions.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="block w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id}>
              <div className={clsx(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}>
                <div className={clsx(
                  'max-w-[85%] rounded-2xl px-3 py-2',
                  message.role === 'user'
                    ? 'bg-reddit text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                )}>
                  {message.isStreaming ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching Reddit...</span>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>

              {/* Hotel suggestions */}
              {message.hotelSuggestions && message.hotelSuggestions.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.hotelSuggestions.map((hotel, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleHotelClick(hotel)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-slate-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400">{hotel.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{hotel.description}</p>
                        </div>
                        {hotel.priceRange && (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/50 px-2 py-1 rounded-full whitespace-nowrap">
                            <DollarSign className="w-3 h-3" />
                            {hotel.priceRange}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          {hotel.subreddit && (
                            <span className="text-[10px] px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full">
                              r/{hotel.subreddit}
                            </span>
                          )}
                          {hotel.upvotes && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                              <ArrowUp className="w-3 h-3" />
                              {hotel.upvotes}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          Click for details →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about hotels..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-slate-400"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={clsx(
              'p-2 rounded-xl transition-colors',
              input.trim() && !isLoading
                ? 'bg-reddit text-white hover:bg-orange-600'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hotel Detail Modal */}
      {selectedHotel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeHotelDetail} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{selectedHotel.name}</h3>
              <button
                onClick={closeHotelDetail}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 dark:text-slate-300" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
              ) : hotelDetails ? (
                <div>
                  {/* Image Gallery */}
                  <div className="relative aspect-video bg-slate-100">
                    <img
                      src={hotelDetails.images[currentImageIndex]}
                      alt={hotelDetails.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://source.unsplash.com/800x600/?luxury+hotel`;
                      }}
                    />
                    {hotelDetails.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) =>
                              prev === 0 ? hotelDetails.images.length - 1 : prev - 1
                            );
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) =>
                              prev === hotelDetails.images.length - 1 ? 0 : prev + 1
                            );
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        {/* Dots indicator */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {hotelDetails.images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex(idx);
                              }}
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

                  {/* Details */}
                  <div className="p-4 space-y-4">
                    {/* Rating & Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {hotelDetails.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="font-semibold text-slate-900 dark:text-white">{hotelDetails.rating.toFixed(1)}</span>
                            {hotelDetails.reviewCount && (
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                ({hotelDetails.reviewCount.toLocaleString()} reviews)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {hotelDetails.priceRange && (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full font-medium">
                          <DollarSign className="w-4 h-4" />
                          {hotelDetails.priceRange}
                        </span>
                      )}
                    </div>

                    {/* Address */}
                    {hotelDetails.address && (
                      <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{hotelDetails.address}</span>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">About</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{hotelDetails.description}</p>
                    </div>

                    {/* Reddit Source */}
                    {selectedHotel.subreddit && (
                      <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] px-2 py-0.5 bg-orange-500 text-white rounded-full font-medium">
                            r/{selectedHotel.subreddit}
                          </span>
                          {selectedHotel.upvotes && (
                            <span className="flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300">
                              <ArrowUp className="w-3 h-3" />
                              {selectedHotel.upvotes} upvotes
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                          Recommended by Reddit travelers
                        </p>
                      </div>
                    )}

                    {/* Amenities */}
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Amenities</h4>
                      <div className="flex flex-wrap gap-2">
                        {hotelDetails.amenities.map((amenity) => (
                          <span
                            key={amenity}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {hotelDetails.lat && hotelDetails.lng && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${hotelDetails.lat},${hotelDetails.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <Navigation className="w-4 h-4" />
                          View on Map
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(hotelDetails.name + ' ' + destinationName + ' booking')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
                      >
                        <Hotel className="w-4 h-4" />
                        Book Now
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
