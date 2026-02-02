'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, DollarSign, MapPin, Clock, ExternalLink, MessageSquare, Check } from 'lucide-react';
import type { HotelCandidate, RestaurantCandidate, Evidence } from '@/types/quick-plan';

type ItemType = 'hotel' | 'restaurant' | 'experience';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
  type: ItemType;
  item: HotelCandidate | RestaurantCandidate | ExperienceItem | null;
}

// Experience type for the drawer (matches API response)
export interface ExperienceItem {
  id: string;
  placeId?: string;
  name: string;
  activityType: string;
  address?: string;
  googleMapsUrl?: string;
  googleRating?: number;
  reviewCount?: number;
  priceLevel?: number;
  imageUrl?: string | null;
  lat?: number;
  lng?: number;
  reasons?: string[];
  nearArea?: string;
  distanceFromHotel?: number;
  duration?: string;
  priceEstimate?: number;
  redditMentions?: number;
  redditEvidence?: Array<{ quote: string; subreddit?: string; upvotes?: number }>;
}

export default function DetailDrawer({
  isOpen,
  onClose,
  onSelect,
  isSelected,
  type,
  item,
}: DetailDrawerProps) {
  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Drawer - slide up from bottom */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">
                  {type === 'hotel' ? 'Hotel' : type === 'restaurant' ? 'Restaurant' : 'Experience'}
                </p>
                <h2 className="font-semibold text-slate-900 text-lg leading-tight">{item.name}</h2>
                {(item as HotelCandidate | RestaurantCandidate).address && (
                  <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {(item as HotelCandidate | RestaurantCandidate).address}
                  </p>
                )}
                {/* Google Maps Link */}
                {((item as any).googleMapsUrl || (item as any).placeId) && (
                  <a
                    href={(item as any).googleMapsUrl || `https://www.google.com/maps/place/?q=place_id:${(item as any).placeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Google Maps
                  </a>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors -mr-2"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {type === 'hotel' && <HotelDetails hotel={item as HotelCandidate} />}
              {type === 'restaurant' && <RestaurantDetails restaurant={item as RestaurantCandidate} />}
              {type === 'experience' && <ExperienceDetails experience={item as ExperienceItem} />}
            </div>

            {/* Footer with action button */}
            {onSelect && (
              <div className="p-4 border-t border-slate-100 bg-white">
                <button
                  onClick={() => {
                    onSelect();
                    onClose();
                  }}
                  className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-green-500 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-5 h-5" />
                      Selected
                    </>
                  ) : (
                    `Select this ${type}`
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// HOTEL DETAILS
// ============================================================================

function HotelDetails({ hotel }: { hotel: HotelCandidate }) {
  return (
    <div className="p-4 space-y-5">
      {/* Image */}
      <div className="w-full h-48 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
        {hotel.imageUrl ? (
          <img
            src={hotel.imageUrl}
            alt={hotel.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-6xl">🏨</div>';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🏨</div>
        )}
      </div>

      {/* Rating & Price Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {hotel.googleRating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-lg">{hotel.googleRating}</span>
              {hotel.reviewCount > 0 && (
                <span className="text-slate-500 text-sm">({hotel.reviewCount} reviews)</span>
              )}
            </div>
          )}
          {hotel.stars > 0 && (
            <div className="text-sm text-slate-600">
              {'★'.repeat(hotel.stars)} {hotel.stars}-star
            </div>
          )}
        </div>
        {hotel.pricePerNight && (
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">${hotel.pricePerNight}</p>
            <p className="text-xs text-slate-500">
              per night
              {hotel.priceConfidence === 'real' ? (
                <span className="ml-1 text-green-600">✓ verified</span>
              ) : hotel.priceConfidence === 'estimated' ? (
                <span className="ml-1 text-slate-400">(estimated)</span>
              ) : (
                <span className="ml-1 text-slate-400">(approx)</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Price Comparison - only show if we have real prices from Makcorps */}
      {hotel.priceComparison && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-xl p-4">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            ✓ Live Prices from Booking Sites
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-700 dark:text-green-400">{hotel.priceComparison.cheapest.vendor}</span>
              <span className="font-semibold text-green-800 dark:text-green-300">${hotel.priceComparison.cheapest.price}</span>
            </div>
            {hotel.priceComparison.alternatives.map((alt, i) => (
              <div key={i} className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
                <span>{alt.vendor}</span>
                <span>${alt.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {hotel.isAllInclusive && (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            All-Inclusive
          </span>
        )}
        {hotel.isAdultsOnly && (
          <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
            Adults Only
          </span>
        )}
      </div>

      {/* Amenities */}
      {hotel.amenities && hotel.amenities.length > 0 && (
        <div>
          <h3 className="font-medium text-slate-900 mb-2">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {hotel.amenities.slice(0, 8).map((amenity, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Why this hotel */}
      {hotel.reasons && hotel.reasons.length > 0 && (
        <div>
          <h3 className="font-medium text-slate-900 mb-2">Why we recommend it</h3>
          <ul className="space-y-1.5">
            {hotel.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-green-500 mt-0.5">✓</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reddit Evidence */}
      <EvidenceSection evidence={hotel.evidence} redditScore={hotel.redditScore} />
    </div>
  );
}

// ============================================================================
// RESTAURANT DETAILS
// ============================================================================

function RestaurantDetails({ restaurant }: { restaurant: RestaurantCandidate }) {
  return (
    <div className="p-4 space-y-5">
      {/* Image */}
      <div className="w-full h-48 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
        {restaurant.imageUrl ? (
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-6xl">🍽️</div>';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
        )}
      </div>

      {/* Rating & Price Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {restaurant.googleRating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-lg">{restaurant.googleRating}</span>
              {restaurant.reviewCount > 0 && (
                <span className="text-slate-500 text-sm">({restaurant.reviewCount} reviews)</span>
              )}
            </div>
          )}
        </div>
        <div className="text-lg font-medium text-slate-700">
          {'$'.repeat(restaurant.priceLevel || 2)}
          <span className="text-slate-300">{'$'.repeat(4 - (restaurant.priceLevel || 2))}</span>
        </div>
      </div>

      {/* Cuisine Tags */}
      {restaurant.cuisine && restaurant.cuisine.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {restaurant.cuisine.map((c, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Best for */}
      {restaurant.bestFor && restaurant.bestFor.length > 0 && (
        <div>
          <h3 className="font-medium text-slate-900 mb-2">Best for</h3>
          <div className="flex gap-2">
            {restaurant.bestFor.map((time, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize"
              >
                {time}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reservation required */}
      {restaurant.requiresReservation && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
          <Clock className="w-5 h-5" />
          <span className="text-sm font-medium">Reservations recommended</span>
        </div>
      )}

      {/* Why we recommend */}
      {restaurant.reasons && restaurant.reasons.length > 0 && (
        <div>
          <h3 className="font-medium text-slate-900 mb-2">Why we recommend it</h3>
          <ul className="space-y-1.5">
            {restaurant.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-green-500 mt-0.5">✓</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Distance info */}
      {restaurant.nearArea && (
        <p className="text-sm text-slate-500">
          Near your hotel in {restaurant.nearArea}
          {restaurant.distanceFromHotel && ` (${restaurant.distanceFromHotel} km away)`}
        </p>
      )}

      {/* Reddit Evidence */}
      <EvidenceSection evidence={restaurant.evidence} redditScore={restaurant.redditScore} />
    </div>
  );
}

// ============================================================================
// EXPERIENCE DETAILS
// ============================================================================

function ExperienceDetails({ experience }: { experience: ExperienceItem }) {
  return (
    <div className="p-4 space-y-5">
      {/* Image */}
      <div className="w-full h-48 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30">
        {experience.imageUrl ? (
          <img
            src={experience.imageUrl}
            alt={experience.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-6xl">🎯</div>';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🎯</div>
        )}
      </div>

      {/* Rating & Type Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {experience.googleRating && experience.googleRating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-lg">{experience.googleRating}</span>
              {experience.reviewCount && experience.reviewCount > 0 && (
                <span className="text-slate-500 text-sm">({experience.reviewCount} reviews)</span>
              )}
            </div>
          )}
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
          {experience.activityType}
        </span>
      </div>

      {/* Duration & Price */}
      <div className="flex gap-4">
        {experience.duration && (
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{experience.duration}</span>
          </div>
        )}
        {experience.priceEstimate && (
          <div className="flex items-center gap-2 text-green-600">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-medium">~${experience.priceEstimate}</span>
          </div>
        )}
        {experience.priceLevel && (
          <div className="text-sm text-slate-600">
            {'$'.repeat(experience.priceLevel)}
          </div>
        )}
      </div>

      {/* Why we recommend */}
      {experience.reasons && experience.reasons.length > 0 && (
        <div>
          <h3 className="font-medium text-slate-900 mb-2">Why we recommend it</h3>
          <ul className="space-y-1.5">
            {experience.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-green-500 mt-0.5">✓</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Location info */}
      {experience.nearArea && (
        <p className="text-sm text-slate-500">
          Near your hotel in {experience.nearArea}
          {experience.distanceFromHotel && ` (${experience.distanceFromHotel} km away)`}
        </p>
      )}

      {/* Reddit mentions */}
      {experience.redditMentions && experience.redditMentions > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">
              Mentioned {experience.redditMentions}x on Reddit
            </span>
          </div>
          {experience.redditEvidence && experience.redditEvidence.length > 0 && (
            <div className="space-y-2">
              {experience.redditEvidence.slice(0, 2).map((ev, i) => (
                <p key={i} className="text-sm text-slate-600 italic">
                  "{ev.quote}"
                  {ev.subreddit && (
                    <span className="text-slate-400 not-italic"> — r/{ev.subreddit}</span>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SHARED: EVIDENCE SECTION
// ============================================================================

function EvidenceSection({ evidence, redditScore }: { evidence?: Evidence[]; redditScore?: number }) {
  const redditEvidence = evidence?.filter(e => e.type === 'reddit_thread') || [];

  if (redditEvidence.length === 0 && (!redditScore || redditScore === 0)) {
    return null;
  }

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
          {redditScore && redditScore > 0 ? `Mentioned ${redditScore}x on Reddit` : 'Reddit mentions'}
        </span>
      </div>
      {redditEvidence.length > 0 && (
        <div className="space-y-3">
          {redditEvidence.slice(0, 2).map((ev, i) => (
            <div key={i} className="border-l-2 border-orange-300 dark:border-orange-600 pl-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{ev.snippet}"</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 dark:text-slate-500">
                {ev.subreddit && <span>r/{ev.subreddit}</span>}
                {ev.score && <span>↑ {ev.score}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
