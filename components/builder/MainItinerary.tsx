'use client';

import { useMemo, useState } from 'react';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import CitySection from './CitySection';
import DayContainer from './DayContainer';
import { addDays, format } from 'date-fns';
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

  // Build day-by-destination mapping
  const dayStructure = useMemo(() => {
    const structure: {
      destinationId: string;
      destinationName: string;
      cityIcon: string;
      nights: number;
      startDayIndex: number;
      days: {
        dayIndex: number;
        date: Date | null;
        items: typeof scheduledItems;
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

      const cityData = {
        destinationId: dest.destinationId,
        destinationName: dest.place.name,
        cityIcon: cityIcons[dest.place.name] || cityIcons.default,
        nights: dest.nights,
        startDayIndex: currentDayIndex,
        days: [] as typeof structure[0]['days'],
        transitTo: undefined as typeof structure[0]['transitTo'],
      };

      // Create days for this destination
      for (let i = 0; i < dest.nights + 1; i++) {
        const dayIndex = currentDayIndex + i;
        const date = startDate ? addDays(startDate, dayIndex) : null;

        // Get scheduled items for this day
        const dayItems = scheduledItems.filter(item => item.scheduledDayIndex === dayIndex);

        cityData.days.push({
          dayIndex,
          date,
          items: dayItems,
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
  }, [destinations, basics.startDate, scheduledItems]);

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
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 flex-shrink-0">
        <h2 className="font-semibold text-slate-900 dark:text-white">Itinerary</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Collapse all
          </button>
        </div>
      </div>

      {/* Scrollable content - using overflow-y-scroll instead of auto for better drag-drop compatibility */}
      <div className="flex-1 p-4 overflow-y-scroll bg-slate-50 dark:bg-slate-900">
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
