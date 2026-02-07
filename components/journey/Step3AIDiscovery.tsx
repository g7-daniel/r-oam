'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import Card from '@/components/ui/Card';
import RestaurantAvailability from '@/components/ui/RestaurantAvailability';
import ExperienceCart from '@/components/ui/ExperienceCart';
import {
  Send,
  Clock,
  Check,
  ChevronRight,
  AlertCircle,
  Loader2,
  ArrowBigUp,
  X,
  Heart,
  Info,
  UtensilsCrossed,
  Plus,
  ShoppingCart,
  Calendar,
  Sun,
  Moon,
  Sunset,
  Navigation,
} from 'lucide-react';
import clsx from 'clsx';
import type { Recommendation, JourneyChatMessage as ChatMessage } from '@/lib/schemas/trip';

// Category display config
const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  beaches: { color: 'bg-cyan-100 text-cyan-700', icon: '🏖️' },
  museums: { color: 'bg-purple-100 text-purple-700', icon: '🏛️' },
  food_tours: { color: 'bg-orange-100 text-orange-700', icon: '🍽️' },
  nightlife: { color: 'bg-pink-100 text-pink-700', icon: '🎉' },
  day_trips: { color: 'bg-blue-100 text-blue-700', icon: '🚗' },
  hidden_gems: { color: 'bg-amber-100 text-amber-700', icon: '💎' },
  outdoor: { color: 'bg-green-100 text-green-700', icon: '🏃' },
  shopping: { color: 'bg-rose-100 text-rose-700', icon: '🛍️' },
  cultural: { color: 'bg-indigo-100 text-indigo-700', icon: '🎭' },
  wellness: { color: 'bg-teal-100 text-teal-700', icon: '🧘' },
  adventure: { color: 'bg-red-100 text-red-700', icon: '🧗' },
  nature: { color: 'bg-emerald-100 text-emerald-700', icon: '🌿' },
  landmarks: { color: 'bg-yellow-100 text-yellow-700', icon: '🏰' },
  entertainment: { color: 'bg-violet-100 text-violet-700', icon: '🎬' },
  dining: { color: 'bg-red-100 text-red-700', icon: '🍴' },
  water_sports: { color: 'bg-sky-100 text-sky-700', icon: '🏄' },
  wildlife: { color: 'bg-lime-100 text-lime-700', icon: '🦁' },
  tours: { color: 'bg-slate-100 text-slate-700', icon: '🚶' },
  sports: { color: 'bg-orange-100 text-orange-700', icon: '⚽' },
  relaxation: { color: 'bg-purple-100 text-purple-700', icon: '🌴' },
};

// Dining style labels
const DINING_STYLE_LABELS: Record<string, string> = {
  street_food: 'Street Food',
  casual: 'Casual Dining',
  fine_dining: 'Fine Dining',
  local_favorite: 'Local Favorite',
  food_tour: 'Food Tour',
};

// ============ DAY-BY-DAY ITINERARY VIEW (#29) ============

const MAX_HOURS_PER_DAY = 10; // Typical active hours for sightseeing

// Time slot categories for organizing activities
const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', icon: Sun, timeRange: '8am - 12pm', color: 'from-amber-50 to-amber-100/50' },
  { id: 'afternoon', label: 'Afternoon', icon: Sunset, timeRange: '12pm - 6pm', color: 'from-orange-50 to-orange-100/50' },
  { id: 'evening', label: 'Evening', icon: Moon, timeRange: '6pm - 10pm', color: 'from-indigo-50 to-indigo-100/50' },
];

// Determine time slot based on category and meal type
function getTimeSlotForItem(rec: Recommendation): string {
  // Dining items: use meal type if available
  if (rec.category === 'dining' || rec.category === 'food_tours') {
    const mealType = (rec as any).mealType;
    if (mealType === 'breakfast') return 'morning';
    if (mealType === 'lunch') return 'afternoon';
    if (mealType === 'dinner') return 'evening';
  }
  // Nightlife always evening
  if (rec.category === 'nightlife') return 'evening';
  // Museums/cultural often morning
  if (rec.category === 'museums' || rec.category === 'cultural' || rec.category === 'landmarks') return 'morning';
  // Default to afternoon
  return 'afternoon';
}

interface DaySlot {
  dayIndex: number;
  date: string;
  dateFormatted: string;
  items: { id: string; name: string; duration: number; category: string; timeSlot: string; rec: Recommendation }[];
  totalMinutes: number;
}

function DayByDayItinerary({
  nights,
  startDate,
  cartItems,
  onRemoveItem,
  destinationName,
}: {
  nights: number;
  startDate: string | null;
  cartItems: { recommendation: Recommendation }[];
  onRemoveItem: (id: string) => void;
  destinationName: string;
}) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Generate day slots with smart time-of-day assignment
  const days: DaySlot[] = useMemo(() => {
    const result: DaySlot[] = [];
    const start = startDate ? new Date(startDate) : new Date();

    for (let i = 0; i < Math.max(nights, 1); i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);

      // Distribute cart items across days (smart distribution based on duration)
      const dayItems = cartItems
        .filter((_, idx) => idx % Math.max(nights, 1) === i)
        .map((item) => ({
          id: item.recommendation.id,
          name: item.recommendation.name,
          duration: item.recommendation.estimatedDurationMinutes || 60,
          category: item.recommendation.category,
          timeSlot: getTimeSlotForItem(item.recommendation),
          rec: item.recommendation,
        }));

      // Sort by time slot order: morning, afternoon, evening
      dayItems.sort((a, b) => {
        const order = { morning: 0, afternoon: 1, evening: 2 };
        return (order[a.timeSlot as keyof typeof order] || 1) - (order[b.timeSlot as keyof typeof order] || 1);
      });

      const totalMinutes = dayItems.reduce((sum, item) => sum + item.duration, 0);

      result.push({
        dayIndex: i,
        date: date.toISOString().split('T')[0],
        dateFormatted: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        items: dayItems,
        totalMinutes,
      });
    }
    return result;
  }, [nights, startDate, cartItems]);

  if (cartItems.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-reddit-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-slate-900">Your {destinationName} Itinerary</h3>
          </div>
          <span className="text-sm text-slate-500">{cartItems.length} experience{cartItems.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Day columns */}
      <div className="divide-y divide-slate-100">
        {days.map((day) => {
          const hoursUsed = day.totalMinutes / 60;
          const capacityPercent = Math.min(100, (hoursUsed / MAX_HOURS_PER_DAY) * 100);
          const isOverCapacity = hoursUsed > MAX_HOURS_PER_DAY;
          const isExpanded = expandedDay === day.dayIndex;

          // Group items by time slot
          const itemsBySlot = TIME_SLOTS.map(slot => ({
            ...slot,
            items: day.items.filter(item => item.timeSlot === slot.id)
          }));

          return (
            <div key={day.dayIndex} className="transition-all">
              {/* Day header - always visible */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day.dayIndex)}
                className={clsx(
                  'w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors',
                  isExpanded && 'bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-lg flex flex-col items-center justify-center',
                    day.items.length > 0 ? 'bg-primary-100' : 'bg-slate-100'
                  )}>
                    <span className="text-xs font-bold text-primary-700">Day</span>
                    <span className="text-lg font-bold text-primary-600 -mt-1">{day.dayIndex + 1}</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-900">{day.dateFormatted}</div>
                    <div className="text-xs text-slate-500">
                      {day.items.length === 0 ? 'No activities yet' : `${day.items.length} activit${day.items.length === 1 ? 'y' : 'ies'}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Capacity indicator */}
                  <div className="w-24 hidden sm:block">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          isOverCapacity ? 'bg-red-500' : capacityPercent > 70 ? 'bg-amber-500' : 'bg-green-500'
                        )}
                        style={{ width: `${capacityPercent}%` }}
                      />
                    </div>
                    <div className={clsx(
                      'text-[10px] mt-0.5 text-right',
                      isOverCapacity ? 'text-red-600' : 'text-slate-500'
                    )}>
                      {hoursUsed.toFixed(1)}h
                    </div>
                  </div>

                  {/* Mini item icons */}
                  <div className="flex -space-x-1">
                    {day.items.slice(0, 4).map((item) => {
                      const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.cultural;
                      return (
                        <div
                          key={item.id}
                          className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs', config.color)}
                          title={item.name}
                        >
                          {config.icon}
                        </div>
                      );
                    })}
                    {day.items.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-600">
                        +{day.items.length - 4}
                      </div>
                    )}
                  </div>

                  <ChevronRight className={clsx(
                    'w-5 h-5 text-slate-400 transition-transform',
                    isExpanded && 'rotate-90'
                  )} />
                </div>
              </button>

              {/* Expanded day detail */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {day.items.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-lg">
                      <p className="text-slate-500 text-sm">No activities added yet.</p>
                      <p className="text-slate-400 text-xs mt-1">Add experiences from Snoo's recommendations!</p>
                    </div>
                  ) : (
                    /* Time slots */
                    itemsBySlot.map((slot) => {
                      const SlotIcon = slot.icon;
                      if (slot.items.length === 0) return null;

                      return (
                        <div key={slot.id} className={clsx('rounded-lg p-3 bg-gradient-to-r', slot.color)}>
                          <div className="flex items-center gap-2 mb-2">
                            <SlotIcon className="w-4 h-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-700">{slot.label}</span>
                            <span className="text-xs text-slate-500">{slot.timeRange}</span>
                          </div>
                          <div className="space-y-2">
                            {slot.items.map((item) => {
                              const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.cultural;
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm"
                                >
                                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-sm', config.color)}>
                                    {config.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-slate-900 truncate">{item.name}</div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {item.duration >= 60
                                          ? `${Math.round(item.duration / 60)}h`
                                          : `${item.duration}m`}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemoveItem(item.id);
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remove from trip"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ GEOGRAPHIC CLUSTERING (#21) ============

interface GeoCluster {
  name: string;
  icon: string;
  items: Recommendation[];
  centerLat: number;
  centerLng: number;
}

function clusterByGeography(recommendations: Recommendation[]): GeoCluster[] {
  // Filter items with valid coordinates
  const withCoords = recommendations.filter((r) => r.lat && r.lng);
  const withoutCoords = recommendations.filter((r) => !r.lat || !r.lng);

  if (withCoords.length === 0) {
    // No coordinates, return single "All" cluster
    return [{ name: 'All Recommendations', icon: '📍', items: recommendations, centerLat: 0, centerLng: 0 }];
  }

  // Simple clustering: divide into quadrants based on center point
  const lats = withCoords.map((r) => r.lat!);
  const lngs = withCoords.map((r) => r.lng!);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  const clusters: GeoCluster[] = [];

  // North/Central area
  const north = withCoords.filter((r) => r.lat! > centerLat);
  if (north.length > 0) {
    clusters.push({
      name: 'Northern Area',
      icon: '🧭',
      items: north,
      centerLat: north.reduce((sum, r) => sum + r.lat!, 0) / north.length,
      centerLng: north.reduce((sum, r) => sum + r.lng!, 0) / north.length,
    });
  }

  // South/Central area
  const south = withCoords.filter((r) => r.lat! <= centerLat);
  if (south.length > 0) {
    clusters.push({
      name: 'Southern Area',
      icon: '🏙️',
      items: south,
      centerLat: south.reduce((sum, r) => sum + r.lat!, 0) / south.length,
      centerLng: south.reduce((sum, r) => sum + r.lng!, 0) / south.length,
    });
  }

  // Items without coordinates
  if (withoutCoords.length > 0) {
    clusters.push({
      name: 'Other Locations',
      icon: '📍',
      items: withoutCoords,
      centerLat: 0,
      centerLng: 0,
    });
  }

  // If clustering resulted in only 1 or 2 items per cluster, just return all as one
  if (clusters.every((c) => c.items.length <= 2)) {
    return [{ name: 'All Recommendations', icon: '📍', items: recommendations, centerLat: centerLat, centerLng: centerLng }];
  }

  return clusters;
}

function GeographicClusters({
  recommendations,
  onSelectCluster,
  activeCluster,
}: {
  recommendations: Recommendation[];
  onSelectCluster: (clusterName: string | null) => void;
  activeCluster: string | null;
}) {
  const clusters = useMemo(() => clusterByGeography(recommendations), [recommendations]);

  // Don't show if only one cluster or no meaningful clustering
  if (clusters.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
      <Navigation className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <button
        onClick={() => onSelectCluster(null)}
        className={clsx(
          'px-2 py-1 text-xs rounded-full whitespace-nowrap transition-all',
          activeCluster === null
            ? 'bg-primary-500 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        )}
      >
        All Areas
      </button>
      {clusters.map((cluster) => (
        <button
          key={cluster.name}
          onClick={() => onSelectCluster(cluster.name)}
          className={clsx(
            'px-2 py-1 text-xs rounded-full whitespace-nowrap transition-all flex items-center gap-1',
            activeCluster === cluster.name
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          <span>{cluster.icon}</span>
          {cluster.name} ({cluster.items.length})
        </button>
      ))}
    </div>
  );
}

// Meal type labels
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  any: 'Any Meal',
};

// Quick interest chips for one-click selection
const INTEREST_CHIPS = [
  { id: 'food', label: '🍽️ Food & Dining', message: "I'm interested in food - local restaurants, street food, and food tours" },
  { id: 'culture', label: '🏛️ Culture & History', message: "I want to explore museums, historical sites, and cultural experiences" },
  { id: 'outdoor', label: '🌿 Nature & Outdoors', message: "I love outdoor activities - hiking, beaches, parks, and nature" },
  { id: 'nightlife', label: '🎉 Nightlife', message: "Show me the best bars, clubs, and nightlife spots" },
  { id: 'adventure', label: '🧗 Adventure', message: "I'm looking for adventure activities - tours, excursions, and unique experiences" },
  { id: 'romantic', label: '❤️ Romantic', message: "We're looking for romantic experiences - couples activities, scenic spots, fine dining" },
  { id: 'family', label: '👨‍👩‍👧 Family Fun', message: "We're traveling with kids - family-friendly activities and attractions" },
  { id: 'relaxation', label: '🧘 Relaxation', message: "I want to relax - spas, beaches, wellness, and peaceful spots" },
];

// Welcome messages are now simplified - the getWelcomeMessage function handles all destinations

interface TripContext {
  travelers: { adults: number; children: number };
  pace: string;
  budgetStyle: string;
  tripTypeTags: string[];
  nights: number;
}

function getWelcomeMessage(destinationName: string, tripContext?: TripContext): string {
  // Build contextual welcome based on trip info
  const travelerCount = tripContext ? tripContext.travelers.adults + tripContext.travelers.children : 1;
  const hasKids = tripContext?.travelers.children && tripContext.travelers.children > 0;
  const isRelaxed = tripContext?.pace === 'relaxed';
  const isBudget = tripContext?.budgetStyle === 'budget';
  const nights = tripContext?.nights || 3;

  // Personalized intro
  let intro = `Hey! I'm Snoo 🧭 - I find the best experiences based on what REAL Reddit travelers say, not sponsored content.`;

  // Add trip-specific context
  if (tripContext) {
    const contextParts: string[] = [];
    if (hasKids) {
      contextParts.push(`traveling with kids`);
    } else if (travelerCount > 1) {
      contextParts.push(`${travelerCount} travelers`);
    }
    if (nights) {
      contextParts.push(`${nights} nights`);
    }
    if (tripContext.tripTypeTags?.length > 0) {
      const tags = tripContext.tripTypeTags.slice(0, 2).join(' & ');
      contextParts.push(`looking for ${tags}`);
    }

    if (contextParts.length > 0) {
      intro += `\n\nI see you're ${contextParts.join(', ')}. I'll personalize my recommendations!`;
    }
  }

  // Suggest appropriate first question based on context
  let suggestion = `\n\n**Click an interest below** and I'll show you top picks for ${destinationName}!`;

  if (hasKids) {
    suggestion = `\n\n**For family-friendly experiences**, click 👨‍👩‍👧 Family Fun below, or tell me what your crew enjoys!`;
  } else if (isRelaxed) {
    suggestion = `\n\n**For your relaxed pace**, I'll focus on quality over quantity. Click an interest below!`;
  }

  return intro + suggestion;
}

// Stock photos for different experience categories
const CATEGORY_IMAGES: Record<string, string[]> = {
  beaches: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=600&fit=crop',
  ],
  museums: [
    'https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&h=600&fit=crop',
  ],
  food_tours: [
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
  ],
  nightlife: [
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
  ],
  outdoor: [
    'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop',
  ],
  cultural: [
    'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=600&fit=crop',
  ],
  adventure: [
    'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=800&h=600&fit=crop',
  ],
  nature: [
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
  ],
  landmarks: [
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&h=600&fit=crop',
  ],
  shopping: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1555529771-7888783a18d3?w=800&h=600&fit=crop',
  ],
  wellness: [
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop',
  ],
  hidden_gems: [
    'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop',
  ],
  day_trips: [
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=600&fit=crop',
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
  ],
  dining: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop',
  ],
};

function getImageForCategory(category: string): string {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.cultural;
  return images[Math.floor(Math.random() * images.length)];
}

// Attraction Detail Modal
function AttractionDetailModal({
  rec,
  destinationName,
  isSelected,
  onClose,
  onToggle,
  tripDate,
  partySize,
  onDiningReservation,
}: {
  rec: Recommendation;
  destinationName: string;
  isSelected: boolean;
  onClose: () => void;
  onToggle: () => void;
  tripDate: string | null;
  partySize: number;
  onDiningReservation?: (slot: { time: string; partySize: number; seating: 'inside' | 'outside' | 'bar' | 'patio' }) => void;
}) {
  const [showAvailability, setShowAvailability] = useState(false);
  const categoryConfig = CATEGORY_CONFIG[rec.category] || CATEGORY_CONFIG.cultural;
  const imageUrl = getImageForCategory(rec.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-48 md:h-64 bg-slate-200">
          <img
            src={imageUrl}
            alt={rec.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Title overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <span className={clsx('inline-flex px-3 py-1 rounded-full text-sm font-medium mb-2', categoryConfig.color)}>
              {categoryConfig.icon} {rec.category.replace('_', ' ')}
            </span>
            <h2 className="text-2xl font-bold text-white">{rec.name}</h2>
            <p className="text-white/80 text-sm mt-1">{destinationName}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-256px)]">
          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary-500" />
              About this experience
            </h3>
            <p className="text-slate-600">{rec.description}</p>
          </div>

          {/* Why it matches */}
          <div className="mb-6 p-4 bg-primary-50 rounded-xl">
            <h3 className="font-semibold text-primary-900 mb-2 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary-500" />
              Why we recommend this for you
            </h3>
            <p className="text-primary-700">{rec.whyMatch}</p>
          </div>

          {/* Quick info */}
          <div className="flex flex-wrap gap-4 mb-6">
            {rec.estimatedDurationMinutes && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <Clock className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="font-medium text-slate-900">
                    {rec.estimatedDurationMinutes >= 60
                      ? `${Math.round(rec.estimatedDurationMinutes / 60)} hour${Math.round(rec.estimatedDurationMinutes / 60) === 1 ? '' : 's'}`
                      : `${rec.estimatedDurationMinutes} minute${rec.estimatedDurationMinutes === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dining-specific info */}
          {rec.category === 'dining' && (
            <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                🍴 Dining Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(rec as any).mealType && (
                  <div>
                    <p className="text-xs text-red-600">Meal</p>
                    <p className="font-medium text-red-900">{MEAL_TYPE_LABELS[(rec as any).mealType] || (rec as any).mealType}</p>
                  </div>
                )}
                {(rec as any).preferredTime && (
                  <div>
                    <p className="text-xs text-red-600">Suggested Time</p>
                    <p className="font-medium text-red-900">{(rec as any).preferredTime}</p>
                  </div>
                )}
                {(rec as any).diningStyle && (
                  <div>
                    <p className="text-xs text-red-600">Style</p>
                    <p className="font-medium text-red-900">{DINING_STYLE_LABELS[(rec as any).diningStyle] || (rec as any).diningStyle}</p>
                  </div>
                )}
                {(rec as any).cuisineType && (
                  <div>
                    <p className="text-xs text-red-600">Cuisine</p>
                    <p className="font-medium text-red-900">{(rec as any).cuisineType}</p>
                  </div>
                )}
              </div>
              {(rec as any).reservationRequired && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>Reservation recommended</span>
                </div>
              )}

              {/* Check availability button */}
              {!showAvailability && (
                <button
                  onClick={() => setShowAvailability(true)}
                  className="mt-4 w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <UtensilsCrossed className="w-5 h-5" />
                  Check Table Availability
                </button>
              )}
            </div>
          )}

          {/* Restaurant Availability component for dining */}
          {rec.category === 'dining' && showAvailability && tripDate && (
            <div className="mb-6">
              <RestaurantAvailability
                restaurantName={rec.name}
                destinationName={destinationName}
                date={tripDate}
                defaultPartySize={partySize}
                onBook={(slot) => {
                  // Add to dining reservations and cart
                  if (onDiningReservation) {
                    onDiningReservation(slot);
                  }
                  onClose();
                }}
                onAgentBook={(size, time) => {
                  // Add to cart with agent booking status
                  onToggle();
                  onClose();
                }}
                onUserBook={() => {
                  // Add to cart anyway
                  onToggle();
                  onClose();
                }}
              />
            </div>
          )}

          {/* Reddit quote - more prominent styling */}
          {rec.source.type === 'reddit' && rec.source.quote && (
            <div className="mb-6 p-4 bg-gradient-to-r from-reddit-50 to-white rounded-xl border-2 border-reddit-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-reddit flex items-center justify-center">
                    <span className="text-white font-bold text-xs">r/</span>
                  </div>
                  <span className="text-sm font-medium text-reddit">
                    r/{(rec.source.subreddit || 'travel').replace(/^r\//, '')}
                  </span>
                </div>
                {rec.source.upvotes && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-reddit/10 rounded-full text-sm text-reddit font-bold">
                    <ArrowBigUp className="w-4 h-4 fill-reddit" />
                    {rec.source.upvotes.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-slate-700 italic">"{rec.source.quote}"</p>
            </div>
          )}

          {/* Action button - Cart style */}
          <button
            onClick={() => {
              onToggle();
              onClose();
            }}
            disabled={isSelected}
            className={clsx(
              'w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2',
              isSelected
                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                : rec.category === 'dining'
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-reddit text-white hover:bg-reddit-600'
            )}
          >
            {isSelected ? (
              <>
                <Check className="w-5 h-5" />
                In Your Cart
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add to Trip
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({
  rec,
  isInCart,
  onAddToCart,
  onShowDetails,
}: {
  rec: Recommendation;
  isInCart: boolean;
  onAddToCart: () => void;
  onShowDetails: () => void;
}) {
  const categoryConfig = CATEGORY_CONFIG[rec.category] || CATEGORY_CONFIG.cultural;
  const isDining = rec.category === 'dining';

  // Don't render if already in cart - items disappear when added
  if (isInCart) {
    return null;
  }

  return (
    <div
      className={clsx(
        'relative rounded-xl border-2 p-3 transition-all cursor-pointer hover:shadow-md flex flex-col h-full',
        isDining
          ? 'border-red-200 hover:border-red-400 bg-white'
          : 'border-slate-200 hover:border-reddit/50 bg-white'
      )}
      onClick={onShowDetails}
    >
      {/* Prominent Reddit upvotes badge at top */}
      {rec.source.type === 'reddit' && rec.source.upvotes && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-reddit/10 rounded-full">
            <ArrowBigUp className="w-4 h-4 text-reddit fill-reddit" />
            <span className="text-xs font-bold text-reddit">
              {rec.source.upvotes.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            on r/{(rec.source.subreddit || 'travel').replace(/^r\//, '')}
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Left: Category icon */}
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0', categoryConfig.color)}>
          {categoryConfig.icon}
        </div>

        {/* Middle: Content */}
        <div className="flex-1 min-w-0">
          {/* Stack category badge above name for better visibility */}
          <div className="flex flex-col gap-0.5 mb-1">
            <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-medium w-fit', categoryConfig.color)}>
              {categoryConfig.icon} {rec.category.replace('_', ' ')}
            </span>
            <h4 className="font-medium text-slate-900 text-sm line-clamp-2 leading-tight">
              {rec.name}
            </h4>
          </div>
          <p className="text-xs text-slate-500 line-clamp-1 mb-1">{rec.description}</p>

          {/* Meta info inline */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {rec.estimatedDurationMinutes && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {rec.estimatedDurationMinutes >= 60
                  ? `${Math.round(rec.estimatedDurationMinutes / 60)}h`
                  : `${rec.estimatedDurationMinutes}m`}
              </span>
            )}
          </div>

          {/* Dining-specific: Show meal type and availability CTA */}
          {isDining && (
            <div className="flex items-center gap-2 mt-1.5">
              {(rec as any).mealType && (
                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                  {MEAL_TYPE_LABELS[(rec as any).mealType] || (rec as any).mealType}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowDetails();
                }}
                className="text-[10px] text-red-500 font-medium flex items-center gap-0.5 hover:text-red-600"
              >
                <UtensilsCrossed className="w-3 h-3" />
                Check availability →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spacer to push button to bottom */}
      <div className="flex-1" />

      {/* Add to Trip button - full width at bottom */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart();
        }}
        className={clsx(
          'mt-3 w-full py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all',
          isDining
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-reddit hover:bg-reddit-600 text-white'
        )}
      >
        <Plus className="w-4 h-4" />
        Add to Trip
      </button>
    </div>
  );
}

export default function Step3AIDiscovery() {
  const {
    trip,
    addChatMessage,
    updateLastMessage,
    getChatThread,
    setRecommendations,
    selectSpot,
    deselectSpot,
    completeDiscovery,
    setActiveDestination,
    getNextIncompleteDestination,
    // Cart actions
    addToCart,
    removeFromCart,
    isInCart,
    experienceCart,
    // Dining reservation
    addDiningReservation,
  } = useTripStore(useShallow((state) => ({
    trip: state.trip,
    addChatMessage: state.addChatMessage,
    updateLastMessage: state.updateLastMessage,
    getChatThread: state.getChatThread,
    setRecommendations: state.setRecommendations,
    selectSpot: state.selectSpot,
    deselectSpot: state.deselectSpot,
    completeDiscovery: state.completeDiscovery,
    setActiveDestination: state.setActiveDestination,
    getNextIncompleteDestination: state.getNextIncompleteDestination,
    addToCart: state.addToCart,
    removeFromCart: state.removeFromCart,
    isInCart: state.isInCart,
    experienceCart: state.experienceCart,
    addDiningReservation: state.addDiningReservation,
  })));

  const { destinations, activeDestinationId, basics } = trip;
  const activeDestination = destinations.find((d) => d.destinationId === activeDestinationId);
  const chatThread = activeDestination ? getChatThread(activeDestination.destinationId) : null;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalRec, setModalRec] = useState<Recommendation | null>(null);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'experiences' | 'dining'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeGeoCluster, setActiveGeoCluster] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track toast timeout for cleanup
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);
  const welcomeSentRef = useRef<Set<string>>(new Set()); // Track which destinations got welcome message

  // Get geographic clusters for current recommendations
  const geoClusters = useMemo(() => {
    if (!activeDestination) return [];
    const notInCart = activeDestination.discovery.recommendations.filter((rec) => !isInCart(rec.id));
    return clusterByGeography(notInCart);
  }, [activeDestination?.discovery.recommendations, isInCart]);

  // Filter out recommendations that are already in cart and apply category + geo filter
  const visibleRecommendations = useMemo(() => {
    if (!activeDestination) return [];
    return activeDestination.discovery.recommendations.filter((rec) => {
      // Filter out items already in cart
      if (isInCart(rec.id)) return false;
      // Apply category filter
      if (activeFilter === 'dining') {
        if (rec.category !== 'dining' && rec.category !== 'food_tours') return false;
      }
      if (activeFilter === 'experiences') {
        if (rec.category === 'dining' || rec.category === 'food_tours') return false;
      }
      // Apply geographic cluster filter
      if (activeGeoCluster) {
        const cluster = geoClusters.find((c) => c.name === activeGeoCluster);
        if (cluster && !cluster.items.some((item) => item.id === rec.id)) return false;
      }
      return true;
    });
  }, [activeDestination?.discovery.recommendations, isInCart, activeFilter, activeGeoCluster, geoClusters]);

  // Count items by category for filter badges
  const categoryCount = useMemo(() => {
    if (!activeDestination) return { all: 0, experiences: 0, dining: 0 };
    const all = activeDestination.discovery.recommendations.filter((rec) => !isInCart(rec.id));
    const dining = all.filter((rec) => rec.category === 'dining' || rec.category === 'food_tours');
    const experiences = all.filter((rec) => rec.category !== 'dining' && rec.category !== 'food_tours');
    return { all: all.length, experiences: experiences.length, dining: dining.length };
  }, [activeDestination?.discovery.recommendations, isInCart]);

  // Track if we've already set the initial destination
  const hasSetInitialDestination = useRef(false);

  // Set first destination as active when entering this step
  useEffect(() => {
    if (hasSetInitialDestination.current) return;
    if (destinations.length > 0) {
      hasSetInitialDestination.current = true;
      // Find first incomplete destination, or first destination if all complete
      const firstIncomplete = destinations.find((d) => !d.discovery.isComplete);
      const targetDestId = firstIncomplete?.destinationId || destinations[0].destinationId;
      if (activeDestinationId !== targetDestId) {
        setActiveDestination(targetDestId);
      }
    }
  }, [destinations, activeDestinationId, setActiveDestination]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatThread?.messages]);

  // Initialize chat with welcome message if empty (with dedup to prevent double messages)
  useEffect(() => {
    if (activeDestination && chatThread && chatThread.messages.length === 0) {
      // Prevent sending welcome message twice (React strict mode / race conditions)
      if (welcomeSentRef.current.has(activeDestination.destinationId)) {
        return;
      }
      welcomeSentRef.current.add(activeDestination.destinationId);

      const welcomeMessage: ChatMessage = {
        id: `msg_welcome_${Date.now()}`,
        role: 'assistant',
        content: getWelcomeMessage(activeDestination.place.name, {
          travelers: basics.travelers,
          pace: basics.pace,
          budgetStyle: basics.budgetStyle,
          tripTypeTags: basics.tripTypeTags,
          nights: activeDestination.nights,
        }),
        timestamp: new Date().toISOString(),
      };
      addChatMessage(activeDestination.destinationId, welcomeMessage);
    }
  }, [activeDestination, chatThread, addChatMessage]);

  // Send a message (from input or chip click)
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || !activeDestination || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    addChatMessage(activeDestination.destinationId, userMessage);
    setInput('');
    setSelectedChips([]);
    setIsLoading(true);
    setError(null);

    // Add placeholder assistant message
    const assistantMessage: ChatMessage = {
      id: `msg_assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };
    addChatMessage(activeDestination.destinationId, assistantMessage);

    try {
      // Get conversation history
      const history = (chatThread?.messages || [])
        .filter((m) => m.role !== 'system' && m.content)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      // Calculate total nights for the entire trip
      const totalNights = destinations.reduce((sum, d) => sum + d.nights, 0);

      const response = await fetch('/api/ai/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationId: activeDestination.destinationId,
          destinationName: activeDestination.place.name,
          countryCode: activeDestination.place.countryCode,
          message: messageText.trim(),
          conversationHistory: history,
          tripContext: {
            totalBudget: basics.totalBudgetUsd, // Total budget for ENTIRE trip
            totalDestinations: destinations.length,
            allDestinations: destinations.map(d => d.place.name),
            destinationNights: activeDestination.nights, // Nights for THIS destination
            totalNights: totalNights, // Total nights for entire trip
            pace: basics.pace,
            budgetStyle: basics.budgetStyle,
            tripTypeTags: basics.tripTypeTags,
            travelers: basics.travelers,
          },
        }),
      });

      const data = await response.json();

      if (data.type === 'error') {
        setError(data.message);
        updateLastMessage(activeDestination.destinationId, data.message);
      } else {
        // Update message content
        updateLastMessage(
          activeDestination.destinationId,
          data.message,
          data.recommendations
        );

        // Store recommendations in destination
        if (data.recommendations && data.recommendations.length > 0) {
          setRecommendations(activeDestination.destinationId, data.recommendations);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to send message. Please try again.');
      updateLastMessage(
        activeDestination.destinationId,
        'Sorry, I had trouble responding. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeDestination, isLoading, chatThread, basics, destinations, addChatMessage, updateLastMessage, setRecommendations]);

  // Handle send button click
  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  // Handle chip click - toggle selection and auto-send after selection
  const handleChipClick = useCallback((chipId: string) => {
    const chip = INTEREST_CHIPS.find(c => c.id === chipId);
    if (!chip) return;

    setSelectedChips(prev => {
      const isSelected = prev.includes(chipId);
      if (isSelected) {
        return prev.filter(id => id !== chipId);
      } else {
        return [...prev, chipId];
      }
    });
  }, []);

  // Send selected chips as a message
  const handleSendChips = useCallback(() => {
    if (selectedChips.length === 0) return;
    const messages = selectedChips.map(id => {
      const chip = INTEREST_CHIPS.find(c => c.id === id);
      return chip?.label.replace(/^[^\s]+\s/, '') || ''; // Remove emoji
    }).filter(Boolean);
    const combinedMessage = `I'm interested in: ${messages.join(', ')}`;
    sendMessage(combinedMessage);
  }, [selectedChips, sendMessage]);

  // Quick send a single chip immediately
  const handleQuickSend = useCallback((chipId: string) => {
    const chip = INTEREST_CHIPS.find(c => c.id === chipId);
    if (chip) {
      sendMessage(chip.message);
    }
  }, [sendMessage]);

  // Skip discovery and proceed without recommendations
  const handleSkip = useCallback(() => {
    if (!activeDestination) return;
    completeDiscovery(activeDestination.destinationId);
    const next = getNextIncompleteDestination();
    if (next) {
      setActiveDestination(next.destinationId);
    }
  }, [activeDestination, completeDiscovery, getNextIncompleteDestination, setActiveDestination]);

  // Handle adding a recommendation to the cart
  const handleAddToCart = useCallback((rec: Recommendation) => {
    if (!activeDestination) return;
    addToCart(activeDestination.destinationId, rec);
    // Show toast notification with cleanup tracking
    setToastMessage(`Added "${rec.name}" to your trip!`);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
  }, [activeDestination, addToCart]);

  const handleComplete = () => {
    if (!activeDestination) return;
    completeDiscovery(activeDestination.destinationId);

    // Auto-advance to next incomplete destination
    const next = getNextIncompleteDestination();
    if (next) {
      setActiveDestination(next.destinationId);
    }
  };

  // Handle dining reservation booking
  const handleDiningReservation = (rec: Recommendation, slot: { time: string; partySize: number; seating: 'inside' | 'outside' | 'bar' | 'patio' }) => {
    if (!activeDestination || !basics.startDate) return;
    addDiningReservation({
      recommendationId: rec.id,
      restaurantName: rec.name,
      destinationId: activeDestination.destinationId,
      date: basics.startDate,
      time: slot.time,
      partySize: slot.partySize,
      seating: slot.seating,
      status: 'confirmed',
    });
    // Also add to cart
    handleAddToCart(rec);
  };

  // No destinations
  if (destinations.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-600 mb-2">No Destinations Yet</h2>
        <p className="text-slate-500">Go back and add destinations first.</p>
      </div>
    );
  }

  // Cart item count for current destination
  const cartItemCount = experienceCart.filter(
    (item) => item.destinationId === activeDestination?.destinationId
  ).length;

  return (
    <div className="space-y-6 pb-28"> {/* Extra padding for sticky cart */}
      <div className="text-center">
        <h1 className="section-title flex items-center justify-center gap-2">
          <span className="text-2xl">🧭</span>
          Snoo: AI Experience Discovery
        </h1>
        <p className="section-subtitle">
          Find experiences based on what <span className="text-reddit font-medium">REAL travelers</span> say on Reddit
        </p>
      </div>

      {/* Destination tabs */}
      {destinations.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {destinations.map((dest, idx) => {
            const isActive = dest.destinationId === activeDestinationId;
            const isComplete = dest.discovery.isComplete;
            return (
              <button
                key={dest.destinationId}
                onClick={() => setActiveDestination(dest.destinationId)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-primary-500 text-white'
                    : isComplete
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {isComplete && <Check className="w-4 h-4" />}
                <span className="font-medium">{idx + 1}. {dest.place.name}</span>
                {dest.discovery.selectedSpotIds.length > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {dest.discovery.selectedSpotIds.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeDestination && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chat panel */}
          <Card className="flex flex-col h-[500px]">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-reddit to-primary-500 flex items-center justify-center text-white text-sm">
                🧭
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Snoo</h3>
                <p className="text-xs text-slate-500">Planning {activeDestination.place.name}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {chatThread?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    'flex gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {/* Snoo avatar for assistant messages */}
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-reddit to-primary-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                      🧭
                    </div>
                  )}
                  <div
                    className={clsx(
                      'max-w-[80%] rounded-2xl px-4 py-2',
                      msg.role === 'user'
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 text-slate-900'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <p className="text-xs text-reddit font-medium mb-1">Snoo</p>
                    )}
                    {msg.isStreaming && !msg.content ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching Reddit for the best experiences...</span>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Interest chips - show when no recommendations yet */}
            {activeDestination.discovery.recommendations.length === 0 && !isLoading && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2 font-medium">Quick select your interests:</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_CHIPS.map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => handleQuickSend(chip.id)}
                      className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-reddit hover:text-white text-slate-700 rounded-full transition-all border border-transparent hover:border-reddit"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="pt-3 border-t border-slate-100">
              {error && (
                <p className="text-sm text-red-500 mb-2">{error}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isLoading ? "Snoo is searching..." : "Or type what you're looking for..."}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 text-base border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-reddit focus:border-transparent disabled:bg-slate-50 dark:disabled:bg-slate-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 bg-reddit text-white rounded-xl hover:bg-reddit-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </Card>

          {/* Recommendations panel */}
          <div className="space-y-4">
            {/* Day-by-Day Itinerary View (#29) */}
            {cartItemCount > 0 && activeDestination && (
              <DayByDayItinerary
                nights={activeDestination.nights}
                startDate={basics.startDate}
                cartItems={experienceCart.filter((item) => item.destinationId === activeDestination.destinationId)}
                onRemoveItem={removeFromCart}
                destinationName={activeDestination.place.name}
              />
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <ArrowBigUp className="w-5 h-5 text-reddit" />
                  Reddit-Powered Picks
                </h3>
                {visibleRecommendations.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cartItemCount > 0 ? `${cartItemCount} in cart • ` : ''}
                    {visibleRecommendations.length} more to explore
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {cartItemCount === 0 && activeDestination.discovery.recommendations.length > 0 && (
                  <button
                    onClick={handleSkip}
                    className="text-sm text-slate-400 hover:text-slate-600"
                  >
                    Skip
                  </button>
                )}
                {cartItemCount > 0 && (
                  <button
                    onClick={handleComplete}
                    className="flex items-center gap-2 px-4 py-2 bg-reddit text-white rounded-xl hover:bg-reddit-600 transition-colors text-sm font-medium"
                  >
                    <Check className="w-4 h-4" />
                    Done with {activeDestination.place.name}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter tabs for Experiences vs Dining */}
            {activeDestination && activeDestination.discovery.recommendations.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    activeFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  All ({categoryCount.all})
                </button>
                <button
                  onClick={() => setActiveFilter('experiences')}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    activeFilter === 'experiences'
                      ? 'bg-white text-reddit shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  🎯 Experiences ({categoryCount.experiences})
                </button>
                <button
                  onClick={() => setActiveFilter('dining')}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    activeFilter === 'dining'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  🍴 Dining ({categoryCount.dining})
                </button>
              </div>
            )}

            {/* Geographic Clustering (#21) */}
            {activeDestination && activeDestination.discovery.recommendations.length > 0 && geoClusters.length > 1 && (
              <GeographicClusters
                recommendations={activeDestination.discovery.recommendations.filter((rec) => !isInCart(rec.id))}
                onSelectCluster={setActiveGeoCluster}
                activeCluster={activeGeoCluster}
              />
            )}

            {activeDestination.discovery.recommendations.length === 0 ? (
              <div className="text-center py-8 px-4 bg-gradient-to-br from-reddit-50 to-white rounded-xl border border-reddit-100">
                <span className="text-4xl mb-3 block">🧭</span>
                <p className="text-slate-700 font-medium mb-1">
                  Click an interest to get started!
                </p>
                <p className="text-slate-500 text-sm mb-4">
                  Snoo will search Reddit for real traveler recommendations.
                </p>

                {/* Quick interest buttons in the empty state too */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {INTEREST_CHIPS.slice(0, 4).map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => handleQuickSend(chip.id)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm bg-white hover:bg-reddit hover:text-white text-slate-700 rounded-full transition-all border border-slate-200 hover:border-reddit disabled:opacity-50"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSkip}
                  className="text-sm text-slate-400 hover:text-slate-600 underline"
                >
                  Skip and continue without recommendations
                </button>
              </div>
            ) : visibleRecommendations.length === 0 ? (
              <div className="text-center py-8 px-4 bg-green-50 rounded-xl border border-green-200">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-green-500" />
                <p className="text-green-700 font-medium">
                  All recommendations added to cart!
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Ask Snoo for more options, or continue to hotels.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                  {visibleRecommendations.map((rec) => (
                    <RecommendationCard
                      key={rec.id}
                      rec={rec}
                      isInCart={isInCart(rec.id)}
                      onAddToCart={() => handleAddToCart(rec)}
                      onShowDetails={() => setModalRec(rec)}
                    />
                  ))}
                </div>

                {/* Get more recommendations */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Want more? Click to explore:</p>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_CHIPS.filter(chip =>
                      // Show chips that weren't the main focus of current recommendations
                      !visibleRecommendations.some(rec =>
                        rec.category === chip.id ||
                        (chip.id === 'food' && (rec.category === 'dining' || rec.category === 'food_tours'))
                      )
                    ).slice(0, 4).map((chip) => (
                      <button
                        key={chip.id}
                        onClick={() => handleQuickSend(chip.id)}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-reddit hover:text-white text-slate-600 rounded-full transition-all disabled:opacity-50"
                      >
                        + {chip.label}
                      </button>
                    ))}
                    <button
                      onClick={() => sendMessage("Show me more hidden gems and unique experiences")}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-reddit hover:text-white text-slate-600 rounded-full transition-all disabled:opacity-50"
                    >
                      + 💎 Hidden Gems
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Progress summary */}
      {destinations.length > 1 && (
        <div className="p-4 bg-gradient-to-r from-reddit-50 to-white rounded-xl border border-reddit-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Discovery Progress: {destinations.filter((d) => d.discovery.isComplete).length} / {destinations.length} destinations
            </span>
            {destinations.every((d) => d.discovery.isComplete) && (
              <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <Check className="w-4 h-4" />
                All destinations complete!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sticky Experience Cart */}
      <ExperienceCart onContinue={handleComplete} showContinue={cartItemCount > 0} />

      {/* Toast notification for feedback */}
      {toastMessage && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Attraction Detail Modal */}
      {modalRec && activeDestination && (
        <AttractionDetailModal
          rec={modalRec}
          destinationName={activeDestination.place.name}
          isSelected={isInCart(modalRec.id)}
          onClose={() => setModalRec(null)}
          onToggle={() => handleAddToCart(modalRec)}
          tripDate={basics.startDate}
          partySize={basics.travelers.adults + basics.travelers.children}
          onDiningReservation={(slot) => handleDiningReservation(modalRec, slot)}
        />
      )}
    </div>
  );
}
