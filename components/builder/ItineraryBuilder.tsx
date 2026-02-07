'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import LeftSidebar from './LeftSidebar';
import MainItinerary from './MainItinerary';
import RightMapPanel from './RightMapPanel';
import TripHeader from './TripHeader';
import MobileItineraryBuilder from './MobileItineraryBuilder';
import { Map, ChevronRight, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export default function ItineraryBuilder() {
  const router = useRouter();
  const {
    trip,
    scheduleItem,
    unscheduleItem,
    reorderScheduledItem,
    moveItemBetweenDays,
  } = useTripStore(useShallow((state) => ({
    trip: state.trip,
    scheduleItem: state.scheduleItem,
    unscheduleItem: state.unscheduleItem,
    reorderScheduledItem: state.reorderScheduledItem,
    moveItemBetweenDays: state.moveItemBetweenDays,
  })));

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [mapView, setMapView] = useState<'day' | 'all' | 'saved'>('day');
  const [isMobile, setIsMobile] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate total days from destinations
  const totalDays = trip.destinations.reduce((sum, d) => sum + d.nights, 0) + 1;

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    // If dropped in same location, do nothing
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Dragging from collection to day
    if (source.droppableId.startsWith('collection-') && destination.droppableId.startsWith('day-')) {
      const dayIndex = parseInt(destination.droppableId.replace('day-', ''), 10);
      const itemId = draggableId;
      scheduleItem(itemId, dayIndex, destination.index);
      return;
    }

    // Dragging within the same day (reorder)
    if (source.droppableId === destination.droppableId && source.droppableId.startsWith('day-')) {
      const dayIndex = parseInt(source.droppableId.replace('day-', ''), 10);
      reorderScheduledItem(dayIndex, source.index, destination.index);
      return;
    }

    // Dragging between days
    if (source.droppableId.startsWith('day-') && destination.droppableId.startsWith('day-')) {
      const sourceDayIndex = parseInt(source.droppableId.replace('day-', ''), 10);
      const destDayIndex = parseInt(destination.droppableId.replace('day-', ''), 10);
      moveItemBetweenDays(sourceDayIndex, destDayIndex, draggableId, destination.index);
      return;
    }

    // Dragging from day back to collection (unschedule)
    if (source.droppableId.startsWith('day-') && destination.droppableId.startsWith('collection-')) {
      unscheduleItem(draggableId);
      return;
    }
  };

  // Render mobile layout
  if (isMobile) {
    return (
      <MobileItineraryBuilder
        selectedDayIndex={selectedDayIndex}
        setSelectedDayIndex={setSelectedDayIndex}
        totalDays={totalDays}
        mapView={mapView}
        setMapView={setMapView}
      />
    );
  }

  // Desktop three-column layout - use fixed positioning to escape parent layout
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300 z-fixed">
        {/* Header */}
        <TripHeader />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Browse & Saved (narrower) */}
          <div className={clsx(
            "border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden flex flex-col flex-shrink-0 transition-all duration-300",
            isMapExpanded
              ? "w-[320px] lg:w-[360px] xl:w-[400px]"
              : "w-[280px] lg:w-[320px] xl:w-[360px]"
          )}>
            <LeftSidebar />
          </div>

          {/* Main Area - Itinerary (wider) */}
          <div className="overflow-hidden flex flex-col flex-1 min-w-0">
            <MainItinerary
              selectedDayIndex={selectedDayIndex}
              setSelectedDayIndex={setSelectedDayIndex}
              totalDays={totalDays}
            />
          </div>

          {/* Right Panel - Map (Collapsible) */}
          {isMapExpanded ? (
            <div className="w-[340px] lg:w-[380px] xl:w-[420px] flex-shrink-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden flex flex-col transition-all duration-300">
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Map</span>
                <button
                  onClick={() => setIsMapExpanded(false)}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Collapse map panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <RightMapPanel
                  selectedDayIndex={selectedDayIndex}
                  setSelectedDayIndex={setSelectedDayIndex}
                  totalDays={totalDays}
                  mapView={mapView}
                  setMapView={setMapView}
                />
              </div>
            </div>
          ) : (
            <div className="w-14 flex-shrink-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center py-3 transition-all duration-300">
              <button
                onClick={() => setIsMapExpanded(true)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                title="Show Map"
                aria-label="Show Map"
              >
                <Map className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Continue Bar */}
        <div className="h-16 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 sm:px-6 flex items-center justify-between flex-shrink-0">
          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate mr-4">
            {trip.destinations.length > 0 && (
              <span>
                {trip.destinations.map(d => d.place.name).join(' → ')} · {totalDays} days
              </span>
            )}
          </div>
          <button
            onClick={() => router.push('/plan/hotels')}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 min-h-[48px] bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 active:bg-primary-700 transition-all active:scale-[0.98] text-sm sm:text-base whitespace-nowrap flex-shrink-0 shadow-sm"
            aria-label="Continue to Hotels selection"
          >
            <span className="hidden sm:inline">Continue to Hotels</span>
            <span className="sm:hidden">Hotels</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </DragDropContext>
  );
}
