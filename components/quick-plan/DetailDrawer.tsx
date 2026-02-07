'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation, useDragControls, useReducedMotion, type PanInfo } from 'framer-motion';
import { X, Star, DollarSign, MapPin, Clock, ExternalLink, MessageSquare, Check } from 'lucide-react';
import type { HotelCandidate, RestaurantCandidate, Evidence } from '@/types/quick-plan';
import FallbackImage from '@/components/ui/FallbackImage';

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

// Threshold in pixels: if the user drags down more than this, close the drawer
const SWIPE_CLOSE_THRESHOLD = 100;

export default function DetailDrawer({
  isOpen,
  onClose,
  onSelect,
  isSelected,
  type,
  item,
}: DetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const dragY = useMotionValue(0);
  const controls = useAnimation();
  const dragControls = useDragControls();
  const prefersReducedMotion = useReducedMotion();

  // Backdrop opacity driven by drag position (dims as user drags down)
  const backdropOpacity = useTransform(dragY, [0, 300], [1, 0]);

  // Handle swipe-to-close gesture
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > SWIPE_CLOSE_THRESHOLD || info.velocity.y > 500) {
        // User swiped down far enough or fast enough -- close
        controls.start({ y: '100%' }).then(() => {
          onClose();
        });
      } else {
        // Snap back to open position
        controls.start({ y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } });
      }
    },
    [controls, onClose],
  );

  // Handle escape key to close drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Save trigger element and focus close button when drawer opens; restore focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      closeButtonRef.current?.focus();
      // Animate from initial y:'100%' to y:0 with spring physics.
      // Do NOT call dragY.set(0) here -- that would instantly snap the drawer
      // to its open position, bypassing the slide-up animation.
      controls.start({ y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } });
    } else {
      // Restore focus to the element that opened the drawer
      if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
    }
  }, [isOpen, controls]);

  // Focus trap: keep Tab cycling within the drawer
  useEffect(() => {
    if (!isOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = drawer.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabTrap);
    return () => document.removeEventListener('keydown', handleTabTrap);
  }, [isOpen]);

  // Prevent body scroll when drawer is open
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

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - opacity tracks drag position via MotionValue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            aria-hidden="true"
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              style={{ opacity: backdropOpacity }}
            />
          </motion.div>

          {/* Drawer - slide up from bottom, swipe-to-close enabled */}
          <motion.div
            ref={drawerRef}
            initial={{ y: '100%' }}
            animate={controls}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            style={{ y: dragY }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl z-50 max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            {/* Handle bar - wider, taller, with generous touch target; initiates drag */}
            <div
              className="flex justify-center pt-4 pb-3 cursor-grab active:cursor-grabbing touch-none select-none min-h-[48px]"
              onPointerDown={(e) => dragControls.start(e)}
              aria-hidden="true"
            >
              <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* Header - responsive padding and text */}
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-0.5">
                  {type === 'hotel' ? 'Hotel' : type === 'restaurant' ? 'Restaurant' : 'Experience'}
                </p>
                <h2 id="drawer-title" className="font-semibold text-slate-900 dark:text-white text-base sm:text-lg leading-tight">{item.name}</h2>
                {(item as HotelCandidate | RestaurantCandidate).address && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="truncate">{(item as HotelCandidate | RestaurantCandidate).address}</span>
                  </p>
                )}
                {/* Google Maps Link - consistent touch target */}
                {((item as any).googleMapsUrl || (item as any).placeId) && (
                  <a
                    href={(item as any).googleMapsUrl || `https://www.google.com/maps/place/?q=place_id:${(item as any).placeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-1 inline-flex items-center gap-1.5 min-h-[44px] py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View on Google Maps
                  </a>
                )}
              </div>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors -mr-1 -mt-1"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            {/* Content - scrollable area without scroll-smooth (causes laggy touch scrolling) */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {type === 'hotel' && <HotelDetails hotel={item as HotelCandidate} />}
              {type === 'restaurant' && <RestaurantDetails restaurant={item as RestaurantCandidate} />}
              {type === 'experience' && <ExperienceDetails experience={item as ExperienceItem} />}
            </div>

            {/* Footer with action button - elevated with stronger border */}
            {onSelect && (
              <div className="p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))] border-t-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <button
                  onClick={() => {
                    onSelect();
                    onClose();
                  }}
                  className={`w-full min-h-[48px] sm:min-h-[44px] py-3 rounded-xl font-semibold text-base sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
                    isSelected
                      ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/25'
                      : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-orange-500/30'
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
    <div className="p-4 sm:p-5 space-y-5">
      {/* Image - aspect ratio for consistent proportions */}
      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 group">
        <FallbackImage
          src={hotel.imageUrl}
          alt={hotel.name}
          fill
          fallbackType="hotel"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 50vw"
          showSkeleton
        />
      </div>

      {/* Rating & Price Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {hotel.googleRating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg text-slate-900 dark:text-white">{hotel.googleRating}</span>
              {hotel.reviewCount > 0 && (
                <span className="text-slate-500 dark:text-slate-400 text-sm">({hotel.reviewCount.toLocaleString()} reviews)</span>
              )}
            </div>
          )}
          {hotel.stars > 0 && (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <span className="text-amber-500">{'★'.repeat(hotel.stars)}</span> {hotel.stars}-star
            </div>
          )}
        </div>
        {hotel.pricePerNight && (
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">${hotel.pricePerNight}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              per night
              {hotel.priceConfidence === 'real' ? (
                <span className="ml-1 text-green-600 dark:text-green-400">✓ verified</span>
              ) : hotel.priceConfidence === 'estimated' ? (
                <span className="ml-1 text-slate-400 dark:text-slate-500">(estimated)</span>
              ) : (
                <span className="ml-1 text-slate-400 dark:text-slate-500">(approx)</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Price Comparison - only show if we have real prices from Makcorps */}
      {hotel.priceComparison && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2.5">
            ✓ Live Prices from Booking Sites
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">{hotel.priceComparison.cheapest.vendor}</span>
              <span className="font-bold text-green-800 dark:text-green-300">${hotel.priceComparison.cheapest.price}</span>
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
      {(hotel.isAllInclusive || hotel.isAdultsOnly) && (
        <div className="flex flex-wrap gap-2">
          {hotel.isAllInclusive && (
            <span className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
              All-Inclusive
            </span>
          )}
          {hotel.isAdultsOnly && (
            <span className="px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full text-sm font-medium">
              Adults Only
            </span>
          )}
        </div>
      )}

      {/* Amenities */}
      {hotel.amenities && hotel.amenities.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2.5 text-sm uppercase tracking-wide">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {hotel.amenities.slice(0, 8).map((amenity, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm border border-slate-200 dark:border-slate-700"
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
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2.5 text-sm uppercase tracking-wide">Why we recommend it</h3>
          <ul className="space-y-2">
            {hotel.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0">✓</span>
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
    <div className="p-4 sm:p-5 space-y-5">
      {/* Image - aspect ratio for consistent proportions */}
      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 group">
        <FallbackImage
          src={restaurant.imageUrl}
          alt={restaurant.name}
          fill
          fallbackType="restaurant"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 50vw"
          showSkeleton
        />
      </div>

      {/* Rating & Price Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {restaurant.googleRating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg text-slate-900 dark:text-white">{restaurant.googleRating}</span>
              {restaurant.reviewCount > 0 && (
                <span className="text-slate-500 dark:text-slate-400 text-sm">({restaurant.reviewCount.toLocaleString()} reviews)</span>
              )}
            </div>
          )}
        </div>
        <div className="text-lg font-semibold tracking-wide">
          <span className="text-green-600 dark:text-green-400">{'$'.repeat(restaurant.priceLevel || 2)}</span>
          <span className="text-slate-300 dark:text-slate-600">{'$'.repeat(4 - (restaurant.priceLevel || 2))}</span>
        </div>
      </div>

      {/* Cuisine Tags */}
      {restaurant.cuisine && restaurant.cuisine.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {restaurant.cuisine.map((c, i) => (
            <span
              key={i}
              className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Best for */}
      {restaurant.bestFor && restaurant.bestFor.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2.5 text-sm uppercase tracking-wide">Best for</h3>
          <div className="flex flex-wrap gap-2">
            {restaurant.bestFor.map((time, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium capitalize"
              >
                {time}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reservation required */}
      {restaurant.requiresReservation && (
        <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-3.5 rounded-xl">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Reservations recommended</span>
        </div>
      )}

      {/* Why we recommend */}
      {restaurant.reasons && restaurant.reasons.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2.5 text-sm uppercase tracking-wide">Why we recommend it</h3>
          <ul className="space-y-2">
            {restaurant.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0">✓</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Distance info */}
      {restaurant.nearArea && (
        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Near your hotel in {restaurant.nearArea}
            {restaurant.distanceFromHotel && ` (${restaurant.distanceFromHotel} km away)`}
          </span>
        </div>
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
    <div className="p-4 sm:p-5 space-y-5">
      {/* Image - aspect ratio for consistent proportions */}
      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 group">
        <FallbackImage
          src={experience.imageUrl}
          alt={experience.name}
          fill
          fallbackType="experience"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 50vw"
          showSkeleton
        />
      </div>

      {/* Rating & Type Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {experience.googleRating && experience.googleRating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg text-slate-900 dark:text-white">{experience.googleRating}</span>
              {experience.reviewCount && experience.reviewCount > 0 && (
                <span className="text-slate-500 dark:text-slate-400 text-sm">({experience.reviewCount.toLocaleString()} reviews)</span>
              )}
            </div>
          )}
        </div>
        <span className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium flex-shrink-0">
          {experience.activityType}
        </span>
      </div>

      {/* Duration & Price - card-style for visual grouping */}
      {(experience.duration || experience.priceEstimate || experience.priceLevel) && (
        <div className="flex flex-wrap gap-4 py-3 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
          {experience.duration && (
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="text-sm font-medium">{experience.duration}</span>
            </div>
          )}
          {experience.priceEstimate && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-semibold">~${experience.priceEstimate}</span>
            </div>
          )}
          {experience.priceLevel && (
            <div className="text-sm font-semibold tracking-wide">
              <span className="text-green-600 dark:text-green-400">{'$'.repeat(experience.priceLevel)}</span>
              <span className="text-slate-300 dark:text-slate-600">{'$'.repeat(4 - experience.priceLevel)}</span>
            </div>
          )}
        </div>
      )}

      {/* Why we recommend */}
      {experience.reasons && experience.reasons.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2.5 text-sm uppercase tracking-wide">Why we recommend it</h3>
          <ul className="space-y-2">
            {experience.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0">✓</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Location info */}
      {experience.nearArea && (
        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Near your hotel in {experience.nearArea}
            {experience.distanceFromHotel && ` (${experience.distanceFromHotel} km away)`}
          </span>
        </div>
      )}

      {/* Reddit mentions */}
      {experience.redditMentions && experience.redditMentions > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              Mentioned {experience.redditMentions}x on Reddit
            </span>
          </div>
          {experience.redditEvidence && experience.redditEvidence.length > 0 && (
            <div className="space-y-3">
              {experience.redditEvidence.slice(0, 2).map((ev, i) => (
                <div key={i} className="border-l-2 border-orange-300 dark:border-orange-600 pl-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                    &ldquo;{ev.quote}&rdquo;
                  </p>
                  {ev.subreddit && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 not-italic mt-1 block">r/{ev.subreddit}</span>
                  )}
                </div>
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
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
          {redditScore && redditScore > 0 ? `Mentioned ${redditScore}x on Reddit` : 'Reddit mentions'}
        </span>
      </div>
      {redditEvidence.length > 0 && (
        <div className="space-y-3">
          {redditEvidence.slice(0, 2).map((ev, i) => (
            <div key={i} className="border-l-2 border-orange-300 dark:border-orange-600 pl-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">&ldquo;{ev.snippet}&rdquo;</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                {ev.subreddit && <span className="font-medium">r/{ev.subreddit}</span>}
                {ev.score && <span>↑ {ev.score}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
