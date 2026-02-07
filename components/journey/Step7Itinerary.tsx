'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateHaversineDistance } from '@/lib/utils/geo';
import Card from '@/components/ui/Card';
import {
  Map,
  List,
  Calendar,
  MapPin,
  Plane,
  Hotel,
  Sparkles,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Clock,
  DollarSign,
  Plus,
  X,
  Car,
  Footprints,
  Train,
  Navigation,
  Utensils,
  ExternalLink,
  Phone,
  MessageCircle,
  Heart,
  ArrowBigUp,
  Info,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import type { Recommendation, Destination, FlightLeg, Flight, Hotel as HotelType, Trip } from '@/lib/schemas/trip';
import { clientEnv } from '@/lib/env';

// Transport mode options
type TransportMode = 'walk' | 'transit' | 'taxi';

const TRANSPORT_ICONS: Record<TransportMode, React.ElementType> = {
  walk: Footprints,
  transit: Train,
  taxi: Car,
};

// calculateHaversineDistance imported from @/lib/utils/geo

// Estimate travel time based on distance and mode
function estimateTravelTime(distanceKm: number, mode: TransportMode): number {
  switch (mode) {
    case 'walk':
      return Math.ceil(distanceKm * 12); // ~5 km/h walking
    case 'transit':
      return Math.ceil(distanceKm * 4); // ~15 km/h average with waiting
    case 'taxi':
      return Math.ceil(distanceKm * 2); // ~30 km/h average in city
    default:
      return Math.ceil(distanceKm * 4);
  }
}

// Estimate cost based on distance and mode
function estimateTravelCost(distanceKm: number, mode: TransportMode): number {
  switch (mode) {
    case 'walk':
      return 0;
    case 'transit':
      return Math.ceil(distanceKm * 0.5); // ~$0.50/km
    case 'taxi':
      return Math.ceil(distanceKm * 3); // ~$3/km
    default:
      return 0;
  }
}

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  walk: 'Walk',
  transit: 'Transit',
  taxi: 'Taxi/Uber',
};

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

// Day schedule item
interface ScheduleItem {
  id: string;
  type: 'flight' | 'hotel' | 'experience' | 'travel' | 'dining';
  title: string;
  time?: string;
  duration?: number;
  cost?: number;
  location?: string;
  destinationId?: string;
  category?: string;
  recommendation?: Recommendation;
  lat?: number;
  lng?: number;
}

interface ItineraryDay {
  date: string;
  dayNumber: number;
  destinationId: string;
  destinationName: string;
  items: ScheduleItem[];
}

// Travel segment between two items
interface TravelSegment {
  fromItemId: string;
  toItemId: string;
  mode: TransportMode;
  distance: string;
  duration: string;
  estimatedCost?: number;
}

// Experience Detail Modal
function ExperienceDetailModal({
  item,
  destinationName,
  onClose,
  onBookNow,
  onAgentBooking,
}: {
  item: ScheduleItem;
  destinationName: string;
  onClose: () => void;
  onBookNow?: () => void;
  onAgentBooking?: () => void;
}) {
  const categoryConfig = CATEGORY_CONFIG[item.category || 'cultural'] || CATEGORY_CONFIG.cultural;
  const rec = item.recommendation;
  const isDining = item.type === 'dining' || item.category === 'dining';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative h-48 bg-gradient-to-br from-primary-500 to-accent-500">
          <div className="absolute inset-0 bg-black/20" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <span className={clsx('inline-flex px-3 py-1 rounded-full text-sm font-medium mb-2', categoryConfig.color)}>
              {categoryConfig.icon} {(item.category || 'experience').replace('_', ' ')}
            </span>
            <h2 className="text-2xl font-bold text-white">{item.title}</h2>
            <p className="text-white/80 text-sm mt-1">{destinationName}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-256px)]">
          {/* Description */}
          {rec?.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary-500" />
                About
              </h3>
              <p className="text-slate-600">{rec.description}</p>
            </div>
          )}

          {/* Why it matches */}
          {rec?.whyMatch && (
            <div className="mb-6 p-4 bg-primary-50 rounded-xl">
              <h3 className="font-semibold text-primary-900 mb-2 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary-500" />
                Why we recommend this
              </h3>
              <p className="text-primary-700">{rec.whyMatch}</p>
            </div>
          )}

          {/* Quick info */}
          <div className="flex flex-wrap gap-4 mb-6">
            {item.time && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <Clock className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="font-medium text-slate-900">{item.time}</p>
                </div>
              </div>
            )}
            {item.duration && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <Clock className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="font-medium text-slate-900">
                    {item.duration >= 60 ? `${Math.round(item.duration / 60)}h` : `${item.duration}m`}
                  </p>
                </div>
              </div>
            )}
            {item.cost !== undefined && item.cost > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Cost</p>
                  <p className="font-medium text-slate-900">${item.cost}</p>
                </div>
              </div>
            )}
            {item.location && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <MapPin className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="font-medium text-slate-900 text-sm">{item.location}</p>
                </div>
              </div>
            )}
          </div>

          {/* Reddit quote */}
          {rec?.source.type === 'reddit' && rec.source.quote && (
            <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-orange-500" />
                What travelers say
              </h3>
              <p className="text-orange-800 italic">&ldquo;{rec.source.quote}&rdquo;</p>
              {rec.source.upvotes && (
                <span className="flex items-center gap-1 mt-2 text-sm text-orange-700 font-medium">
                  <ArrowBigUp className="w-4 h-4 fill-orange-500 text-orange-500" />
                  {rec.source.upvotes.toLocaleString()} upvotes
                </span>
              )}
            </div>
          )}

          {/* Dining-specific booking buttons */}
          {isDining && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-red-500" />
                Book a Table
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onBookNow?.();
                    // Open external booking (e.g., OpenTable, Resy)
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(item.title + ' ' + destinationName + ' reservations')}`, '_blank');
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Book Now (DIY)
                </button>
                <button
                  onClick={() => {
                    onAgentBooking?.();
                    alert('Our AI agent will contact the restaurant and book a table for you. You will receive a confirmation via email within 24 hours.');
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 rounded-xl font-medium text-white transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Agent Booking
                </button>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Agent Booking: Our AI will book the reservation for you
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Travel segment component
function TravelSegmentCard({
  segment,
  onModeChange,
}: {
  segment: TravelSegment;
  onModeChange: (mode: TransportMode) => void;
}) {
  const Icon = TRANSPORT_ICONS[segment.mode];

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg my-2">
      <div className="flex items-center gap-1">
        {(['walk', 'transit', 'taxi'] as TransportMode[]).map((mode) => {
          const ModeIcon = TRANSPORT_ICONS[mode];
          const isActive = segment.mode === mode;
          return (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                isActive ? 'bg-primary-500 text-white' : 'bg-white text-slate-400 hover:bg-slate-100'
              )}
              title={TRANSPORT_LABELS[mode]}
            >
              <ModeIcon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
      <div className="flex-1 flex items-center gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-1">
          <Navigation className="w-3 h-3" />
          {segment.distance}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {segment.duration}
        </span>
        {segment.estimatedCost && segment.estimatedCost > 0 && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            ~${segment.estimatedCost}
          </span>
        )}
      </div>
    </div>
  );
}

// Types for itinerary assignments
interface ItineraryAssignment {
  experienceId: string;
  dayIndex: number;
  timeSlot: string;
}

// Generate itinerary days with support for custom assignments
function generateItinerary(
  trip: Trip,
  assignments: ItineraryAssignment[] = []
): ItineraryDay[] {
  const { basics, destinations, flights } = trip;
  if (!basics.startDate || !basics.endDate) return [];

  const days: ItineraryDay[] = [];
  const startDate = new Date(basics.startDate);
  const endDate = new Date(basics.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Build a map of assignments by experience ID
  const assignmentMap: Record<string, ItineraryAssignment> = {};
  assignments.forEach((a) => {
    assignmentMap[a.experienceId] = a;
  });

  // Collect all selected experiences with their default day assignments
  const allExperiences: { rec: Recommendation; destId: string; defaultDayIndex: number }[] = [];

  let dayOffset = 0;

  // First pass: create day structure and collect all experiences with defaults
  destinations.forEach((dest: Destination) => {
    const selectedRecs = dest.discovery.recommendations.filter((r: Recommendation) =>
      dest.discovery.selectedSpotIds.includes(r.id)
    );
    const recsPerDay = Math.ceil(selectedRecs.length / dest.nights) || 1;

    for (let i = 0; i < dest.nights && dayOffset + i < totalDays; i++) {
      const dayRecs = selectedRecs.slice(i * recsPerDay, (i + 1) * recsPerDay);
      dayRecs.forEach((rec) => {
        allExperiences.push({
          rec,
          destId: dest.destinationId,
          defaultDayIndex: dayOffset + i,
        });
      });
    }
    dayOffset += dest.nights;
  });

  // Reset day offset for building days
  dayOffset = 0;

  destinations.forEach((dest: Destination) => {
    for (let i = 0; i < dest.nights && dayOffset + i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset + i);
      const globalDayIndex = dayOffset + i;

      const items: ScheduleItem[] = [];

      // First day of destination - add arrival flight
      if (i === 0) {
        const flightLeg = flights.legs.find(
          (l: FlightLeg) => l.to.city.toLowerCase().includes(dest.place.name.toLowerCase())
        );
        if (flightLeg?.selectedFlightId) {
          const flight = flightLeg.flights.find((f: Flight) => f.id === flightLeg.selectedFlightId);
          if (flight) {
            items.push({
              id: `flight_arrive_${dest.destinationId}`,
              type: 'flight',
              title: `Arrive from ${flightLeg.from.city}`,
              time: flight.arrivalTime,
              duration: flight.durationMinutes,
              cost: flight.priceUsd,
            });
          }
        }

        // Hotel check-in
        if (dest.hotels.selectedHotelId) {
          const hotel = dest.hotels.results.find((h: HotelType) => h.id === dest.hotels.selectedHotelId);
          if (hotel) {
            items.push({
              id: `hotel_checkin_${dest.destinationId}`,
              type: 'hotel',
              title: `Check in: ${hotel.name}`,
              time: '15:00',
              location: hotel.address,
              lat: hotel.lat,
              lng: hotel.lng,
            });
          }
        }
      }

      // Add experiences for this day (respecting assignments)
      allExperiences.forEach(({ rec, destId }, recIdx) => {
        const assignment = assignmentMap[rec.id];
        const assignedDayIndex = assignment ? assignment.dayIndex : null;
        const assignedTime = assignment?.timeSlot;

        // Experience belongs to this day if:
        // 1. It has a custom assignment to this day, OR
        // 2. It has no assignment and this is its default day
        const belongsToThisDay =
          assignedDayIndex === globalDayIndex ||
          (assignedDayIndex === null &&
            allExperiences.find((e) => e.rec.id === rec.id)?.defaultDayIndex === globalDayIndex);

        if (!belongsToThisDay) return;

        const isDining = rec.category === 'dining' || rec.category === 'food_tours';
        const defaultTime = isDining && rec.preferredTime ? rec.preferredTime : `${10 + (recIdx % 4) * 3}:00`;

        items.push({
          id: rec.id,
          type: isDining ? 'dining' : 'experience',
          title: rec.name,
          time: assignedTime || defaultTime,
          duration: rec.estimatedDurationMinutes || 120,
          cost: rec.estimatedCostUsd,
          location: rec.description?.substring(0, 50) + '...',
          destinationId: destId,
          category: rec.category,
          recommendation: rec,
          lat: rec.lat,
          lng: rec.lng,
        });
      });

      // Last day of destination - add departure flight
      if (i === dest.nights - 1) {
        // Hotel check-out
        if (dest.hotels.selectedHotelId) {
          items.unshift({
            id: `hotel_checkout_${dest.destinationId}`,
            type: 'hotel',
            title: 'Check out',
            time: '11:00',
          });
        }

        const flightLeg = flights.legs.find(
          (l: FlightLeg) => l.from.city.toLowerCase().includes(dest.place.name.toLowerCase())
        );
        if (flightLeg?.selectedFlightId) {
          const flight = flightLeg.flights.find((f: Flight) => f.id === flightLeg.selectedFlightId);
          if (flight) {
            items.push({
              id: `flight_depart_${dest.destinationId}`,
              type: 'flight',
              title: `Depart to ${flightLeg.to.city}`,
              time: flight.departureTime,
              duration: flight.durationMinutes,
              cost: flight.priceUsd,
            });
          }
        }
      }

      days.push({
        date: currentDate.toISOString().split('T')[0],
        dayNumber: dayOffset + i + 1,
        destinationId: dest.destinationId,
        destinationName: dest.place.name,
        items: items.sort((a, b) => (a.time || '').localeCompare(b.time || '')),
      });
    }

    dayOffset += dest.nights;
  });

  return days;
}

// Generate travel segments between experiences using real coordinates
function generateTravelSegments(items: ScheduleItem[]): TravelSegment[] {
  const segments: TravelSegment[] = [];
  const experienceItems = items.filter(
    (item) => item.type === 'experience' || item.type === 'dining'
  );

  for (let i = 0; i < experienceItems.length - 1; i++) {
    const from = experienceItems[i];
    const to = experienceItems[i + 1];

    // Calculate real distance if both items have coordinates
    let distanceKm: number;
    if (from.lat && from.lng && to.lat && to.lng) {
      distanceKm = calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng);
    } else {
      // Fallback: estimate 2km if coordinates are missing
      distanceKm = 2;
    }

    const isWalkable = distanceKm < 1.5;
    const mode: TransportMode = isWalkable ? 'walk' : 'transit';

    segments.push({
      fromItemId: from.id,
      toItemId: to.id,
      mode,
      distance: `${distanceKm.toFixed(1)} km`,
      duration: `${estimateTravelTime(distanceKm, mode)} min`,
      estimatedCost: estimateTravelCost(distanceKm, mode),
    });
  }

  return segments;
}

export default function Step7Itinerary() {
  const { trip, setCurrentStep, moveExperienceToDay, updateExperienceTime, itineraryAssignments } = useTripStore(useShallow((state) => ({
    trip: state.trip,
    setCurrentStep: state.setCurrentStep,
    moveExperienceToDay: state.moveExperienceToDay,
    updateExperienceTime: state.updateExperienceTime,
    itineraryAssignments: state.itineraryAssignments,
  })));
  const [viewMode, setViewMode] = useState<'schedule' | 'map'>('schedule');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [modalItem, setModalItem] = useState<ScheduleItem | null>(null);
  const [travelSegments, setTravelSegments] = useState<Record<number, TravelSegment[]>>({});
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);

  const itinerary = useMemo(() => generateItinerary(trip, itineraryAssignments), [trip, itineraryAssignments]);
  const selectedDay = itinerary[selectedDayIndex];

  // Generate travel segments for each day
  useEffect(() => {
    const segments: Record<number, TravelSegment[]> = {};
    itinerary.forEach((day, idx) => {
      segments[idx] = generateTravelSegments(day.items);
    });
    setTravelSegments(segments);
  }, [itinerary]);

  // Handle changing transport mode
  const handleModeChange = useCallback((dayIdx: number, segmentIdx: number, mode: TransportMode) => {
    setTravelSegments((prev) => {
      const daySegments = [...(prev[dayIdx] || [])];
      const segment = daySegments[segmentIdx];
      if (segment) {
        // Recalculate duration based on mode
        const distanceKm = parseFloat(segment.distance);
        let duration = '';
        let cost = 0;

        switch (mode) {
          case 'walk':
            duration = `${Math.ceil(distanceKm * 12)} min`;
            cost = 0;
            break;
          case 'transit':
            duration = `${Math.ceil(distanceKm * 4)} min`;
            cost = Math.ceil(distanceKm * 0.5);
            break;
          case 'taxi':
            duration = `${Math.ceil(distanceKm * 2)} min`;
            cost = Math.ceil(distanceKm * 3);
            break;
        }

        daySegments[segmentIdx] = {
          ...segment,
          mode,
          duration,
          estimatedCost: cost,
        };
      }
      return { ...prev, [dayIdx]: daySegments };
    });
  }, []);

  // Handle moving experience between days
  const handleMoveExperience = useCallback((itemId: string, currentDayIndex: number, direction: 'up' | 'down') => {
    const newDayIndex = direction === 'up' ? currentDayIndex - 1 : currentDayIndex + 1;

    // Validate bounds
    if (newDayIndex < 0) {
      return; // Can't move before first day
    }
    if (newDayIndex >= itinerary.length) {
      return; // Can't move after last day
    }

    // Move the experience to the new day
    moveExperienceToDay(itemId, newDayIndex);
  }, [itinerary.length, moveExperienceToDay]);

  // Handle adding more experiences
  const handleAddMoreExperiences = useCallback(() => {
    // Navigate back to AI discovery step
    setCurrentStep(3);
  }, [setCurrentStep]);

  // Handle time change for experience
  const handleTimeChange = useCallback((itemId: string, newTime: string) => {
    updateExperienceTime(itemId, newTime);
    setEditingTimeId(null);
  }, [updateExperienceTime]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Get unique destination coordinates for map
  const mapMarkers = useMemo(() => {
    return trip.destinations.map((dest, idx) => ({
      id: dest.destinationId,
      name: dest.place.name,
      lat: dest.place.lat,
      lng: dest.place.lng,
      order: idx + 1,
    }));
  }, [trip.destinations]);

  if (trip.destinations.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-600 mb-2">No Itinerary Yet</h2>
        <p className="text-slate-500">Complete the previous steps to generate your itinerary.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="section-title flex items-center justify-center gap-2">
          <Map className="w-6 h-6 text-primary-500" />
          Your Itinerary
        </h1>
        <p className="section-subtitle">
          {itinerary.length} days across {trip.destinations.length} destinations
        </p>
      </div>

      {/* Summary stats */}
      <Card className="bg-gradient-to-r from-primary-500 to-accent-500 text-white">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold">{itinerary.length}</div>
              <div className="text-sm text-white/80">Days</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{trip.destinations.length}</div>
              <div className="text-sm text-white/80">Destinations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                {trip.destinations.reduce(
                  (sum, d) => sum + d.discovery.selectedSpotIds.length,
                  0
                )}
              </div>
              <div className="text-sm text-white/80">Experiences</div>
            </div>
          </div>
        </div>
      </Card>

      {/* View toggle */}
      <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-lg w-fit mx-auto">
        <button
          onClick={() => setViewMode('schedule')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            viewMode === 'schedule'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <List className="w-4 h-4" />
          Schedule
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            viewMode === 'map'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Map className="w-4 h-4" />
          Map View
        </button>
      </div>

      {viewMode === 'schedule' ? (
        /* Schedule view */
        <div className="space-y-6">
          {itinerary.map((day, dayIdx) => {
            const isExpanded = selectedDayIndex === dayIdx;
            const dayTravelSegments = travelSegments[dayIdx] || [];
            const experienceItems = day.items.filter(
              (item) => item.type === 'experience' || item.type === 'dining'
            );
            const hasExperiences = experienceItems.length > 0;

            return (
              <Card
                key={day.date}
                className={clsx(
                  'transition-all cursor-pointer',
                  isExpanded && 'ring-2 ring-primary-500'
                )}
                onClick={() => setSelectedDayIndex(dayIdx)}
              >
                {/* Day header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg">
                      {day.dayNumber}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Day {day.dayNumber} - {day.destinationName}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">
                      {experienceItems.length} activities
                    </p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-1">
                  {day.items.map((item, itemIdx) => {
                    const isExperience = item.type === 'experience' || item.type === 'dining';
                    const categoryConfig = CATEGORY_CONFIG[item.category || 'cultural'] || CATEGORY_CONFIG.cultural;

                    // Find travel segment after this item
                    const segmentAfter = isExperience
                      ? dayTravelSegments.find((s) => s.fromItemId === item.id)
                      : null;
                    const segmentIdx = segmentAfter
                      ? dayTravelSegments.findIndex((s) => s.fromItemId === item.id)
                      : -1;

                    return (
                      <div key={item.id}>
                        <div
                          className={clsx(
                            'flex items-start gap-4 p-3 rounded-lg',
                            item.type === 'flight' && 'bg-amber-50',
                            item.type === 'hotel' && 'bg-green-50',
                            item.type === 'experience' && 'bg-primary-50',
                            item.type === 'dining' && 'bg-red-50'
                          )}
                        >
                          <div
                            className={clsx(
                              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                              item.type === 'flight' && 'bg-amber-100 text-amber-600',
                              item.type === 'hotel' && 'bg-green-100 text-green-600',
                              item.type === 'experience' && 'bg-primary-100 text-primary-600',
                              item.type === 'dining' && 'bg-red-100 text-red-600'
                            )}
                          >
                            {item.type === 'flight' && <Plane className="w-5 h-5" />}
                            {item.type === 'hotel' && <Hotel className="w-5 h-5" />}
                            {item.type === 'experience' && <span className="text-lg">{categoryConfig.icon}</span>}
                            {item.type === 'dining' && <Utensils className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div
                                className={clsx(
                                  isExperience && 'cursor-pointer hover:text-primary-600'
                                )}
                                onClick={(e) => {
                                  if (isExperience) {
                                    e.stopPropagation();
                                    setModalItem(item);
                                  }
                                }}
                              >
                                <p className="font-medium text-slate-900">{item.title}</p>
                                {item.location && (
                                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {item.location}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Move buttons for experiences */}
                                {isExperience && (
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveExperience(item.id, dayIdx, 'up');
                                      }}
                                      disabled={dayIdx === 0}
                                      className="w-6 h-6 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                      title="Move to previous day"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveExperience(item.id, dayIdx, 'down');
                                      }}
                                      disabled={dayIdx === itinerary.length - 1}
                                      className="w-6 h-6 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                      title="Move to next day"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                                <div className="text-right text-sm">
                                  {item.time && (
                                    isExperience && editingTimeId === item.id ? (
                                      <input
                                        type="time"
                                        defaultValue={item.time}
                                        autoFocus
                                        onBlur={(e) => handleTimeChange(item.id, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleTimeChange(item.id, e.currentTarget.value);
                                          } else if (e.key === 'Escape') {
                                            setEditingTimeId(null);
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-20 px-2 py-1 text-sm font-medium border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      />
                                    ) : (
                                      <p
                                        className={clsx(
                                          'font-medium text-slate-700',
                                          isExperience && 'cursor-pointer hover:text-primary-600 hover:underline'
                                        )}
                                        onClick={(e) => {
                                          if (isExperience) {
                                            e.stopPropagation();
                                            setEditingTimeId(item.id);
                                          }
                                        }}
                                        title={isExperience ? 'Click to edit time' : undefined}
                                      >
                                        {item.time}
                                      </p>
                                    )
                                  )}
                                  {item.duration && (
                                    <p className="text-slate-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDuration(item.duration)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            {item.cost !== undefined && item.cost > 0 && (
                              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                ${item.cost}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Travel segment */}
                        {segmentAfter && segmentIdx >= 0 && (
                          <TravelSegmentCard
                            segment={segmentAfter}
                            onModeChange={(mode) => handleModeChange(dayIdx, segmentIdx, mode)}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Empty day - add experiences button */}
                  {!hasExperiences && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-slate-500 mb-3">No activities planned for this day</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddMoreExperiences();
                        }}
                        className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Experiences
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Map view */
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="h-[500px] flex flex-col">
              {/* Google Maps embed */}
              {clientEnv.GOOGLE_MAPS_API_KEY ? (
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0, borderRadius: '0.75rem' }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/directions?key=${clientEnv.GOOGLE_MAPS_API_KEY}&origin=${mapMarkers[0]?.lat},${mapMarkers[0]?.lng}&destination=${mapMarkers[mapMarkers.length - 1]?.lat},${mapMarkers[mapMarkers.length - 1]?.lng}${mapMarkers.length > 2 ? `&waypoints=${mapMarkers.slice(1, -1).map(m => `${m.lat},${m.lng}`).join('|')}` : ''}&mode=driving`}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-slate-100 rounded-xl">
                  <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
                  <p className="text-slate-700 font-medium mb-2">Google Maps API Not Connected</p>
                  <p className="text-sm text-slate-500 text-center max-w-sm mb-4">
                    Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables to enable the interactive map.
                  </p>

                  {/* Simplified destination list as map stand-in */}
                  <div className="flex flex-wrap gap-4 justify-center">
                    {mapMarkers.map((marker, idx) => (
                      <div
                        key={marker.id}
                        className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
                          {marker.order}
                        </div>
                        <span className="font-medium text-slate-700">{marker.name}</span>
                        {idx < mapMarkers.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-slate-400 ml-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Day selector */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 mb-4">Jump to Day</h3>
            {itinerary.map((day, idx) => (
              <button
                key={day.date}
                onClick={() => {
                  setSelectedDayIndex(idx);
                  setViewMode('schedule');
                }}
                className={clsx(
                  'w-full p-3 rounded-lg text-left transition-all',
                  selectedDayIndex === idx
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      selectedDayIndex === idx
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    )}
                  >
                    {day.dayNumber}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{day.destinationName}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Experience Detail Modal */}
      {modalItem && selectedDay && (
        <ExperienceDetailModal
          item={modalItem}
          destinationName={selectedDay.destinationName}
          onClose={() => setModalItem(null)}
        />
      )}
    </div>
  );
}
