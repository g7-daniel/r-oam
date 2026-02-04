import type { TripLeg, Experience, ItineraryDay, ItineraryItem } from '@/types';
import { calculateHaversineDistance } from '@/lib/utils/geo';

// Parse ISO 8601 duration string (e.g., "PT2H30M") to minutes
function parseDurationToMinutes(duration: string | number | undefined): number {
  if (typeof duration === 'number') return duration;
  if (!duration) return 120; // Default 2 hours

  // Try ISO 8601 format: PT2H30M
  const isoMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || '0', 10);
    const minutes = parseInt(isoMatch[2] || '0', 10);
    return hours * 60 + minutes;
  }

  // Try simple format: "2h 30m" or "2 hours"
  const simpleMatch = duration.match(/(\d+)\s*(h|hour|min|m)/gi);
  if (simpleMatch) {
    let total = 0;
    for (const part of simpleMatch) {
      const match = part.match(/(\d+)\s*(h|hour|min|m)/i);
      if (match) {
        const value = parseInt(match[1], 10);
        total += match[2].toLowerCase().startsWith('h') ? value * 60 : value;
      }
    }
    return total || 120;
  }

  return 120; // Default
}

// Default durations for different experience categories (in minutes)
const DEFAULT_DURATIONS: Record<string, number> = {
  'beach': 180,
  'museum': 120,
  'restaurant': 90,
  'tour': 240,
  'hiking': 300,
  'nightlife': 180,
  'shopping': 120,
  'landmark': 60,
  'park': 120,
  'show': 150,
  'spa': 180,
  'water-sports': 180,
  'default': 120,
};

// Transit time estimates based on distance (in minutes)
function estimateTransitTime(distanceKm: number): number {
  if (distanceKm < 1) return 10;
  if (distanceKm < 5) return 20;
  if (distanceKm < 15) return 35;
  if (distanceKm < 30) return 50;
  return 60 + Math.floor((distanceKm - 30) * 1.5);
}

// Use centralized Haversine implementation from geo utils
const calculateDistance = calculateHaversineDistance;

// Get duration for an experience based on its category
function getExperienceDuration(experience: Experience): number {
  if (experience.duration) {
    // Handle both number and string formats
    if (typeof experience.duration === 'number') {
      return experience.duration;
    }
    // Try to parse string duration like "2 hours" or "90 minutes"
    const match = experience.duration.match(/(\d+)\s*(hour|min)/i);
    if (match) {
      const value = parseInt(match[1], 10);
      return match[2].toLowerCase().startsWith('hour') ? value * 60 : value;
    }
  }
  const category = experience.category?.toLowerCase() || 'default';
  return DEFAULT_DURATIONS[category] || DEFAULT_DURATIONS['default'];
}

// Time slot interface
interface TimeSlot {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

// Format time slot to string
function formatTimeSlot(slot: TimeSlot): string {
  const formatTime = (h: number, m: number) =>
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  return `${formatTime(slot.startHour, slot.startMinute)} - ${formatTime(slot.endHour, slot.endMinute)}`;
}

// Add minutes to a time
function addMinutes(
  hour: number,
  minute: number,
  addMins: number
): { hour: number; minute: number } {
  const totalMinutes = hour * 60 + minute + addMins;
  return {
    hour: Math.floor(totalMinutes / 60) % 24,
    minute: totalMinutes % 60,
  };
}

// Check if two experiences can be grouped (same general area)
function canGroupExperiences(exp1: Experience, exp2: Experience): boolean {
  if (!exp1.location?.coordinates || !exp2.location?.coordinates) {
    return false;
  }
  const distance = calculateDistance(
    exp1.location.coordinates.lat,
    exp1.location.coordinates.lng,
    exp2.location.coordinates.lat,
    exp2.location.coordinates.lng
  );
  return distance < 3; // Within 3km
}

// Group experiences by proximity
function groupExperiencesByProximity(experiences: Experience[]): Experience[][] {
  if (experiences.length === 0) return [];

  const groups: Experience[][] = [];
  const used = new Set<string>();

  for (const exp of experiences) {
    if (used.has(exp.id)) continue;

    const group: Experience[] = [exp];
    used.add(exp.id);

    // Find nearby experiences
    for (const other of experiences) {
      if (used.has(other.id)) continue;
      if (canGroupExperiences(exp, other)) {
        group.push(other);
        used.add(other.id);
      }
    }

    groups.push(group);
  }

  return groups;
}

// Categorize experiences by time of day preference
function categorizeByTimeOfDay(experiences: Experience[]): {
  morning: Experience[];
  afternoon: Experience[];
  evening: Experience[];
  anytime: Experience[];
} {
  const result = {
    morning: [] as Experience[],
    afternoon: [] as Experience[],
    evening: [] as Experience[],
    anytime: [] as Experience[],
  };

  for (const exp of experiences) {
    const category = exp.category?.toLowerCase() || '';
    const name = exp.name.toLowerCase();

    if (category === 'nightlife' || name.includes('dinner') || name.includes('sunset')) {
      result.evening.push(exp);
    } else if (category === 'beach' || name.includes('sunrise') || name.includes('breakfast')) {
      result.morning.push(exp);
    } else if (category === 'museum' || category === 'tour') {
      result.afternoon.push(exp);
    } else {
      result.anytime.push(exp);
    }
  }

  return result;
}

// Generate itinerary for a single day
function generateDaySchedule(
  date: Date,
  experiences: Experience[],
  startHour: number = 9
): ItineraryItem[] {
  const items: ItineraryItem[] = [];
  let currentHour = startHour;
  let currentMinute = 0;
  let previousExp: Experience | null = null;

  for (const exp of experiences) {
    // Add transit time if not the first experience
    if (previousExp && previousExp.location?.coordinates && exp.location?.coordinates) {
      const distance = calculateDistance(
        previousExp.location.coordinates.lat,
        previousExp.location.coordinates.lng,
        exp.location.coordinates.lat,
        exp.location.coordinates.lng
      );
      const transitTime = estimateTransitTime(distance);

      // Add transit item
      const transitStart = { hour: currentHour, minute: currentMinute };
      const transitEnd = addMinutes(currentHour, currentMinute, transitTime);

      items.push({
        id: `transit-${previousExp.id}-${exp.id}`,
        type: 'transit',
        title: `Travel to ${exp.name}`,
        startTime: formatTimeSlot({
          startHour: transitStart.hour,
          startMinute: transitStart.minute,
          endHour: transitEnd.hour,
          endMinute: transitEnd.minute,
        }).split(' - ')[0],
        endTime: formatTimeSlot({
          startHour: transitStart.hour,
          startMinute: transitStart.minute,
          endHour: transitEnd.hour,
          endMinute: transitEnd.minute,
        }).split(' - ')[1],
        duration: transitTime,
        transitMode: distance < 2 ? 'walk' : 'drive',
        transitDistance: Math.round(distance * 10) / 10,
      });

      currentHour = transitEnd.hour;
      currentMinute = transitEnd.minute;
    }

    // Add experience item
    const duration = getExperienceDuration(exp);
    const endTime = addMinutes(currentHour, currentMinute, duration);

    items.push({
      id: `exp-${exp.id}`,
      type: 'experience',
      experienceId: exp.id,
      title: exp.name,
      startTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
      endTime: `${endTime.hour.toString().padStart(2, '0')}:${endTime.minute.toString().padStart(2, '0')}`,
      duration,
      location: exp.location,
      notes: exp.redditTips?.[0],
    });

    currentHour = endTime.hour;
    currentMinute = endTime.minute;
    previousExp = exp;

    // Add a short break between activities
    const breakEnd = addMinutes(currentHour, currentMinute, 15);
    currentHour = breakEnd.hour;
    currentMinute = breakEnd.minute;
  }

  return items;
}

// Distribute experiences across days for a leg
function distributeExperiencesAcrossDays(
  experiences: Experience[],
  numDays: number,
  startDate: Date
): ItineraryDay[] {
  if (experiences.length === 0 || numDays === 0) return [];

  // Group by proximity first
  const groups = groupExperiencesByProximity(experiences);

  // Categorize by time preference
  const categorized = categorizeByTimeOfDay(experiences);

  // Target experiences per day
  const targetPerDay = Math.ceil(experiences.length / numDays);
  const maxPerDay = Math.min(5, targetPerDay + 1); // Max 5 experiences per day

  const days: ItineraryDay[] = [];
  const usedExperiences = new Set<string>();

  for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayIndex);

    const dayExperiences: Experience[] = [];

    // Try to add a morning activity
    const morningExp = categorized.morning.find((e) => !usedExperiences.has(e.id));
    if (morningExp && dayExperiences.length < maxPerDay) {
      dayExperiences.push(morningExp);
      usedExperiences.add(morningExp.id);
    }

    // Add anytime/afternoon activities
    for (const exp of [...categorized.anytime, ...categorized.afternoon]) {
      if (usedExperiences.has(exp.id)) continue;
      if (dayExperiences.length >= maxPerDay) break;

      // Prefer experiences near already-scheduled ones
      if (dayExperiences.length > 0) {
        const canGroup = dayExperiences.some((de) => canGroupExperiences(de, exp));
        if (canGroup || dayExperiences.length < 2) {
          dayExperiences.push(exp);
          usedExperiences.add(exp.id);
        }
      } else {
        dayExperiences.push(exp);
        usedExperiences.add(exp.id);
      }
    }

    // Try to add an evening activity
    const eveningExp = categorized.evening.find((e) => !usedExperiences.has(e.id));
    if (eveningExp && dayExperiences.length < maxPerDay) {
      dayExperiences.push(eveningExp);
      usedExperiences.add(eveningExp.id);
    }

    // Sort by optimal order (morning first, evening last)
    dayExperiences.sort((a, b) => {
      const aCategory = a.category?.toLowerCase() || '';
      const bCategory = b.category?.toLowerCase() || '';

      if (aCategory === 'nightlife' || a.name.toLowerCase().includes('dinner')) return 1;
      if (bCategory === 'nightlife' || b.name.toLowerCase().includes('dinner')) return -1;
      if (aCategory === 'beach' || a.name.toLowerCase().includes('sunrise')) return -1;
      if (bCategory === 'beach' || b.name.toLowerCase().includes('sunrise')) return 1;
      return 0;
    });

    // Generate schedule with proper time slots
    const items = generateDaySchedule(date, dayExperiences, 9);

    days.push({
      date: date.toISOString().split('T')[0],
      dayNumber: dayIndex + 1,
      items,
      notes: dayExperiences.length === 0 ? 'Free day - explore on your own!' : undefined,
    });
  }

  // Handle any remaining experiences
  const remaining = experiences.filter((e) => !usedExperiences.has(e.id));
  if (remaining.length > 0) {
    // Distribute remaining to days with fewer activities
    for (const exp of remaining) {
      const dayWithFewest = days.reduce((min, day) =>
        day.items.filter((i) => i.type === 'experience').length <
        min.items.filter((i) => i.type === 'experience').length
          ? day
          : min
      );

      const dayDate = new Date(dayWithFewest.date);
      const existingExps = dayWithFewest.items
        .filter((i) => i.type === 'experience')
        .map((i) => experiences.find((e) => `exp-${e.id}` === i.id))
        .filter(Boolean) as Experience[];

      existingExps.push(exp);
      dayWithFewest.items = generateDaySchedule(dayDate, existingExps, 9);
    }
  }

  return days;
}

// Create leg transition day
function createLegTransitionDay(
  fromLeg: TripLeg,
  toLeg: TripLeg,
  date: Date
): ItineraryDay {
  const items: ItineraryItem[] = [];

  // Morning: checkout
  items.push({
    id: `checkout-${fromLeg.id}`,
    type: 'hotel',
    title: `Check out from ${fromLeg.hotel?.name || 'hotel'} in ${fromLeg.destination.name}`,
    startTime: '10:00',
    endTime: '11:00',
    duration: 60,
  });

  // Flight if available
  if (fromLeg.outboundFlight || toLeg.inboundFlight) {
    const flight = fromLeg.outboundFlight || toLeg.inboundFlight;
    items.push({
      id: `flight-${fromLeg.id}-${toLeg.id}`,
      type: 'flight',
      title: `Flight to ${toLeg.destination.name}`,
      startTime: flight?.departureTime || '14:00',
      endTime: flight?.arrivalTime || '16:00',
      duration: parseDurationToMinutes(flight?.duration),
      flightNumber: flight?.flightNumber,
    });
  } else {
    // Transit placeholder
    items.push({
      id: `transit-${fromLeg.id}-${toLeg.id}`,
      type: 'transit',
      title: `Travel to ${toLeg.destination.name}`,
      startTime: '12:00',
      endTime: '16:00',
      duration: 240,
      transitMode: 'drive',
    });
  }

  // Check-in at new destination
  items.push({
    id: `checkin-${toLeg.id}`,
    type: 'hotel',
    title: `Check in at ${toLeg.hotel?.name || 'hotel'} in ${toLeg.destination.name}`,
    startTime: '17:00',
    endTime: '18:00',
    duration: 60,
  });

  return {
    date: date.toISOString().split('T')[0],
    dayNumber: 0, // Will be set properly in full itinerary
    isTransitionDay: true,
    fromLeg: fromLeg.id,
    toLeg: toLeg.id,
    items,
    notes: `Travel day: ${fromLeg.destination.name} → ${toLeg.destination.name}`,
  };
}

// Generate full itinerary for all legs
export function generateFullItinerary(legs: TripLeg[]): {
  days: ItineraryDay[];
  totalDays: number;
  summary: {
    totalExperiences: number;
    totalTransitTime: number;
    legBreakdown: { legId: string; destination: string; days: number; experiences: number }[];
  };
} {
  if (legs.length === 0) {
    return {
      days: [],
      totalDays: 0,
      summary: { totalExperiences: 0, totalTransitTime: 0, legBreakdown: [] },
    };
  }

  const allDays: ItineraryDay[] = [];
  let currentDayNumber = 1;
  let totalTransitTime = 0;
  const legBreakdown: { legId: string; destination: string; days: number; experiences: number }[] = [];

  for (let legIndex = 0; legIndex < legs.length; legIndex++) {
    const leg = legs[legIndex];
    const startDate = leg.startDate ? new Date(leg.startDate) : new Date();
    const numDays = leg.days || 3;

    // Add arrival day for first leg
    if (legIndex === 0) {
      const arrivalItems: ItineraryItem[] = [];

      if (leg.inboundFlight) {
        arrivalItems.push({
          id: `arrival-flight-${leg.id}`,
          type: 'flight',
          title: `Arrive in ${leg.destination.name}`,
          startTime: leg.inboundFlight.departureTime || '10:00',
          endTime: leg.inboundFlight.arrivalTime || '14:00',
          duration: parseDurationToMinutes(leg.inboundFlight.duration),
          flightNumber: leg.inboundFlight.flightNumber,
        });
      }

      arrivalItems.push({
        id: `checkin-${leg.id}`,
        type: 'hotel',
        title: `Check in at ${leg.hotel?.name || 'hotel'}`,
        startTime: '15:00',
        endTime: '16:00',
        duration: 60,
      });

      allDays.push({
        date: startDate.toISOString().split('T')[0],
        dayNumber: currentDayNumber++,
        items: arrivalItems,
        notes: `Arrival day in ${leg.destination.name}`,
      });
    }

    // Generate days for this leg's experiences
    const legDays = distributeExperiencesAcrossDays(
      leg.experiences,
      numDays - 1, // Subtract 1 for arrival/transition day
      new Date(startDate.getTime() + 24 * 60 * 60 * 1000) // Start from day after arrival
    );

    for (const day of legDays) {
      day.dayNumber = currentDayNumber++;
      day.legId = leg.id;
      allDays.push(day);

      // Calculate transit time
      for (const item of day.items) {
        if (item.type === 'transit') {
          totalTransitTime += item.duration || 0;
        }
      }
    }

    legBreakdown.push({
      legId: leg.id,
      destination: leg.destination.name,
      days: legDays.length + 1,
      experiences: leg.experiences.length,
    });

    // Add transition day to next leg
    if (legIndex < legs.length - 1) {
      const nextLeg = legs[legIndex + 1];
      const transitionDate = leg.endDate ? new Date(leg.endDate) : new Date();
      const transitionDay = createLegTransitionDay(leg, nextLeg, transitionDate);
      transitionDay.dayNumber = currentDayNumber++;
      allDays.push(transitionDay);
    }
  }

  // Add departure day for last leg
  const lastLeg = legs[legs.length - 1];
  if (lastLeg) {
    const departureDate = lastLeg.endDate ? new Date(lastLeg.endDate) : new Date();
    const departureItems: ItineraryItem[] = [];

    departureItems.push({
      id: `checkout-final-${lastLeg.id}`,
      type: 'hotel',
      title: `Check out from ${lastLeg.hotel?.name || 'hotel'}`,
      startTime: '10:00',
      endTime: '11:00',
      duration: 60,
    });

    if (lastLeg.outboundFlight) {
      departureItems.push({
        id: `departure-flight-${lastLeg.id}`,
        type: 'flight',
        title: 'Departure flight home',
        startTime: lastLeg.outboundFlight.departureTime || '14:00',
        endTime: lastLeg.outboundFlight.arrivalTime || '20:00',
        duration: parseDurationToMinutes(lastLeg.outboundFlight.duration),
        flightNumber: lastLeg.outboundFlight.flightNumber,
      });
    }

    allDays.push({
      date: departureDate.toISOString().split('T')[0],
      dayNumber: currentDayNumber,
      items: departureItems,
      notes: 'Departure day',
    });
  }

  const totalExperiences = legs.reduce((sum, leg) => sum + leg.experiences.length, 0);

  return {
    days: allDays,
    totalDays: allDays.length,
    summary: {
      totalExperiences,
      totalTransitTime,
      legBreakdown,
    },
  };
}

// Reorder items within a day
export function reorderDayItems(
  day: ItineraryDay,
  fromIndex: number,
  toIndex: number
): ItineraryDay {
  const experienceItems = day.items.filter((item) => item.type === 'experience');
  const [moved] = experienceItems.splice(fromIndex, 1);
  experienceItems.splice(toIndex, 0, moved);

  // Regenerate schedule with new order
  const experiences: Experience[] = experienceItems
    .map((item) => ({
      id: item.experienceId || item.id.replace('exp-', ''),
      name: item.title,
      location: item.location,
      duration: item.duration,
    }))
    .filter((e) => e.id) as Experience[];

  const newItems = generateDaySchedule(new Date(day.date), experiences, 9);

  return {
    ...day,
    items: newItems,
  };
}

// Move item between days
export function moveItemBetweenDays(
  days: ItineraryDay[],
  fromDayIndex: number,
  toDayIndex: number,
  itemId: string
): ItineraryDay[] {
  const newDays = [...days];
  const fromDay = { ...newDays[fromDayIndex] };
  const toDay = { ...newDays[toDayIndex] };

  const itemIndex = fromDay.items.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) return days;

  const [item] = fromDay.items.splice(itemIndex, 1);

  // Add to new day
  const experienceItems = toDay.items.filter((i) => i.type === 'experience');
  experienceItems.push({
    ...item,
    // Will be rescheduled
  });

  // Regenerate both days
  // This is simplified - in production, would need full experience data
  newDays[fromDayIndex] = fromDay;
  newDays[toDayIndex] = toDay;

  return newDays;
}

// Optimize itinerary (group by location, balance days)
export function optimizeItinerary(days: ItineraryDay[]): ItineraryDay[] {
  // For now, return as-is - optimization is already done during generation
  // Future: Could add more sophisticated optimization
  return days;
}
