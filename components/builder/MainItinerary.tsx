'use client';

import { useMemo, useState } from 'react';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import CitySection from './CitySection';
import DayContainer from './DayContainer';
import { addDays } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MainItineraryProps {
  selectedDayIndex: number;
  setSelectedDayIndex: (index: number) => void;
  totalDays: number;
}

export default function MainItinerary({
  selectedDayIndex,
  setSelectedDayIndex,
  totalDays,
}: MainItineraryProps) {
  const { trip, scheduledItems } = useTripStoreV2();
  const { destinations, basics } = trip;

  const [expandedDays, setExpandedDays] = useState<Set<number>>(() => {
    // Expand first few days by default
    return new Set([0, 1, 2]);
  });

  // Build hotel schedule from check-in/check-out items
  const hotelSchedule = useMemo(() => {
    // Find all check-in and check-out items
    const checkIns = scheduledItems.filter(item => item.category === 'hotel_checkin');
    const checkOuts = scheduledItems.filter(item => item.category === 'hotel_checkout');

    // Build a map of which hotel is active on each day
    const hotelByDay = new Map<number, string>();

    // Sort check-ins by day
    const sortedCheckIns = [...checkIns].sort((a, b) =>
      (a.scheduledDayIndex || 0) - (b.scheduledDayIndex || 0)
    );

    // For each check-in, mark all days until checkout
    sortedCheckIns.forEach(checkIn => {
      const startDay = checkIn.scheduledDayIndex || 0;
      const hotelName = checkIn.hotelName || checkIn.name.replace('Check-in: ', '');

      // Find matching checkout
      const matchingCheckout = checkOuts.find(co =>
        co.hotelName === checkIn.hotelName ||
        co.name.replace('Check-out: ', '') === hotelName
      );
      const endDay = matchingCheckout?.scheduledDayIndex || startDay + 100; // Default to many days

      // Mark all days from check-in to check-out (exclusive) as staying at this hotel
      for (let d = startDay; d < endDay; d++) {
        hotelByDay.set(d, hotelName);
      }
    });

    return hotelByDay;
  }, [scheduledItems]);

  // Build day-by-destination mapping
  const dayStructure = useMemo(() => {
    const structure: {
      destinationId: string;
      destinationName: string;
      cityIcon: string;
      nights: number;
      startDayIndex: number;
      hotelName?: string;
      days: {
        dayIndex: number;
        date: Date | null;
        items: typeof scheduledItems;
        hotelName?: string;
      }[];
      transitTo?: {
        destinationName: string;
        mode: string;
        duration: string;
      };
    }[] = [];

    let currentDayIndex = 0;
    const startDate = basics.startDate ? new Date(basics.startDate) : null;

    destinations.forEach((dest, destIndex) => {
      const cityIcons: Record<string, string> = {
        'Tokyo': '🗼',
        'Kyoto': '⛩️',
        'Osaka': '🏯',
        'Paris': '🗼',
        'London': '🎡',
        'Rome': '🏛️',
        'Barcelona': '🌴',
        'default': '📍',
      };

      // Get selected hotel for this destination (fallback)
      const selectedHotel = dest.hotels?.selectedHotelId
        ? dest.hotels.results?.find(h => h.id === dest.hotels.selectedHotelId)
        : null;

      const cityData = {
        destinationId: dest.destinationId,
        destinationName: dest.place.name,
        cityIcon: cityIcons[dest.place.name] || cityIcons.default,
        nights: dest.nights,
        startDayIndex: currentDayIndex,
        hotelName: selectedHotel?.name,
        days: [] as typeof structure[0]['days'],
        transitTo: undefined as typeof structure[0]['transitTo'],
      };

      // Create days for this destination
      for (let i = 0; i < dest.nights + 1; i++) {
        const dayIndex = currentDayIndex + i;
        const date = startDate ? addDays(startDate, dayIndex) : null;

        // Get scheduled items for this day
        const dayItems = scheduledItems.filter(item => item.scheduledDayIndex === dayIndex);

        // Get hotel name from schedule (derived from check-in/check-out) or fallback
        const dayHotelName = hotelSchedule.get(dayIndex) || selectedHotel?.name;

        cityData.days.push({
          dayIndex,
          date,
          items: dayItems,
          hotelName: dayHotelName,
        });
      }

      // Add transit info to next destination
      if (destIndex < destinations.length - 1) {
        const nextDest = destinations[destIndex + 1];
        cityData.transitTo = {
          destinationName: nextDest.place.name,
          mode: 'train', // Could calculate based on distance
          duration: '2h 15min', // Could calculate
        };
      }

      structure.push(cityData);
      currentDayIndex += dest.nights + 1;
    });

    return structure;
  }, [destinations, basics.startDate, scheduledItems, hotelSchedule]);

  const toggleDayExpanded = (dayIndex: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayIndex)) {
        next.delete(dayIndex);
      } else {
        next.add(dayIndex);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allDays = new Set<number>();
    dayStructure.forEach(city => {
      city.days.forEach(day => allDays.add(day.dayIndex));
    });
    setExpandedDays(allDays);
  };

  const collapseAll = () => {
    setExpandedDays(new Set());
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 flex-shrink-0">
        <h2 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">Itinerary</h2>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={expandAll}
            className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Expand all</span>
            <span className="sm:hidden">All</span>
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Collapse all</span>
            <span className="sm:hidden">None</span>
          </button>
        </div>
      </div>

      {/* Scrollable content - using overflow-y-scroll instead of auto for better drag-drop compatibility */}
      <div className="flex-1 p-2 sm:p-4 overflow-y-scroll bg-slate-50 dark:bg-slate-900">
        <div className="space-y-6">
          {dayStructure.map((city, cityIndex) => (
            <CitySection
              key={city.destinationId}
              destinationId={city.destinationId}
              cityName={city.destinationName}
              cityIcon={city.cityIcon}
              nights={city.nights}
              transitTo={city.transitTo}
              isLast={cityIndex === dayStructure.length - 1}
            >
              {city.days.map((day, dayInCityIndex) => {
                const isArrivalDay = dayInCityIndex === 0 && cityIndex > 0;
                const isDepartureDay = dayInCityIndex === city.days.length - 1 && cityIndex < dayStructure.length - 1;

                return (
                  <DayContainer
                    key={day.dayIndex}
                    dayIndex={day.dayIndex}
                    dayNumber={day.dayIndex + 1}
                    date={day.date}
                    items={day.items}
                    isExpanded={expandedDays.has(day.dayIndex)}
                    onToggleExpand={() => toggleDayExpanded(day.dayIndex)}
                    isSelected={selectedDayIndex === day.dayIndex}
                    onSelect={() => setSelectedDayIndex(day.dayIndex)}
                    isArrivalDay={isArrivalDay}
                    isDepartureDay={isDepartureDay}
                    destinationId={city.destinationId}
                    hotelName={day.hotelName}
                  />
                );
              })}
            </CitySection>
          ))}
        </div>
      </div>
    </div>
  );
}
