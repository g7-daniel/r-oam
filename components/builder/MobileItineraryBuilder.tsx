'use client';

import { useState, useEffect, useRef } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import LeftSidebar from './LeftSidebar';
import MainItinerary from './MainItinerary';
import RightMapPanel from './RightMapPanel';
import AIAssistantPanel from './AIAssistantPanel';
import TripHeader from './TripHeader';
import { Compass, Calendar, Map, X } from 'lucide-react';
import clsx from 'clsx';

// Reddit Snoo logo SVG
const SnooLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 0C4.48 0 0 4.48 0 10c0 5.52 4.48 10 10 10s10-4.48 10-10C20 4.48 15.52 0 10 0zm5.86 6.12c.67 0 1.22.55 1.22 1.22 0 .45-.25.84-.62 1.05.03.18.05.36.05.55 0 2.81-3.27 5.09-7.31 5.09-4.04 0-7.31-2.28-7.31-5.09 0-.19.02-.37.05-.55-.37-.21-.62-.6-.62-1.05 0-.67.55-1.22 1.22-1.22.33 0 .62.13.84.34 1.03-.74 2.45-1.23 4.02-1.29l.76-3.57c.02-.09.07-.16.14-.21.07-.05.16-.07.24-.05l2.47.53c.17-.33.52-.57.92-.57.57 0 1.03.46 1.03 1.03s-.46 1.03-1.03 1.03c-.56 0-1.01-.44-1.03-.99l-2.22-.47-.68 3.19c1.54.07 2.94.55 3.95 1.28.22-.21.52-.34.84-.34zM6.5 9.75c-.57 0-1.03.46-1.03 1.03s.46 1.03 1.03 1.03 1.03-.46 1.03-1.03-.46-1.03-1.03-1.03zm7 0c-.57 0-1.03.46-1.03 1.03s.46 1.03 1.03 1.03 1.03-.46 1.03-1.03-.46-1.03-1.03-1.03zm-5.47 3.82c-.1-.1-.1-.26 0-.36.1-.1.26-.1.36 0 .63.63 1.64.93 2.61.93s1.98-.3 2.61-.93c.1-.1.26-.1.36 0 .1.1.1.26 0 .36-.73.73-1.87 1.09-2.97 1.09s-2.24-.36-2.97-1.09z"/>
  </svg>
);

interface MobileItineraryBuilderProps {
  selectedDayIndex: number;
  setSelectedDayIndex: (index: number) => void;
  totalDays: number;
  mapView: 'day' | 'all' | 'saved';
  setMapView: (view: 'day' | 'all' | 'saved') => void;
}

type MobileTab = 'browse' | 'itinerary' | 'map';

export default function MobileItineraryBuilder({
  selectedDayIndex,
  setSelectedDayIndex,
  totalDays,
  mapView,
  setMapView,
}: MobileItineraryBuilderProps) {
  const {
    scheduleItem,
    unscheduleItem,
    reorderScheduledItem,
    moveItemBetweenDays,
  } = useTripStore(useShallow((state) => ({
    scheduleItem: state.scheduleItem,
    unscheduleItem: state.unscheduleItem,
    reorderScheduledItem: state.reorderScheduledItem,
    moveItemBetweenDays: state.moveItemBetweenDays,
  })));

  const [activeTab, setActiveTab] = useState<MobileTab>('itinerary');
  const [showAISheet, setShowAISheet] = useState(false);
  const aiSheetRef = useRef<HTMLDivElement>(null);

  // Escape key to close and focus trap for the AI sheet dialog
  useEffect(() => {
    if (!showAISheet) return;
    const sheet = aiSheetRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAISheet(false);
        return;
      }
      if (e.key === 'Tab' && sheet) {
        const focusable = sheet.querySelectorAll<HTMLElement>(
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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAISheet]);

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Dragging from collection to day
    if (source.droppableId.startsWith('collection-') && destination.droppableId.startsWith('day-')) {
      const dayIndex = parseInt(destination.droppableId.replace('day-', ''), 10);
      scheduleItem(draggableId, dayIndex, destination.index);
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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-slate-900 z-fixed">
        {/* Compact header for mobile */}
        <TripHeader />

        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'browse' && (
            <div className="h-full bg-white dark:bg-slate-800">
              <LeftSidebar />
            </div>
          )}

          {activeTab === 'itinerary' && (
            <div className="h-full">
              <MainItinerary
                selectedDayIndex={selectedDayIndex}
                setSelectedDayIndex={setSelectedDayIndex}
                totalDays={totalDays}
              />
            </div>
          )}

          {activeTab === 'map' && (
            <div className="h-full">
              <RightMapPanel
                selectedDayIndex={selectedDayIndex}
                setSelectedDayIndex={setSelectedDayIndex}
                totalDays={totalDays}
                mapView={mapView}
                setMapView={setMapView}
              />
            </div>
          )}
        </div>

        {/* Bottom tab bar - compact design */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 safe-area-inset-bottom">
          <div className="flex min-h-[56px]" role="tablist" aria-label="Main navigation">
            <button
              onClick={() => setActiveTab('browse')}
              role="tab"
              aria-selected={activeTab === 'browse'}
              aria-controls="panel-browse"
              className={clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors',
                activeTab === 'browse'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            >
              <Compass className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">Browse</span>
            </button>

            <button
              onClick={() => setActiveTab('itinerary')}
              role="tab"
              aria-selected={activeTab === 'itinerary'}
              aria-controls="panel-itinerary"
              className={clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors',
                activeTab === 'itinerary'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            >
              <Calendar className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">Itinerary</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              role="tab"
              aria-selected={activeTab === 'map'}
              aria-controls="panel-map"
              className={clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors',
                activeTab === 'map'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            >
              <Map className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">Map</span>
            </button>

            <button
              onClick={() => setShowAISheet(true)}
              aria-label="Open Snoo AI assistant"
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
            >
              <div className="w-6 h-6 rounded-full bg-[#FF4500] flex items-center justify-center">
                <SnooLogo className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-medium text-[#FF4500]">Snoo</span>
            </button>
          </div>
        </div>

        {/* AI Assistant Bottom Sheet */}
        {showAISheet && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowAISheet(false)}
              aria-hidden="true"
            />

            {/* Sheet */}
            <div
              ref={aiSheetRef}
              className="fixed bottom-0 left-0 right-0 h-[70vh] bg-white dark:bg-slate-800 rounded-t-2xl z-50 flex flex-col shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-sheet-title"
            >
              {/* Handle */}
              <div
                className="flex-shrink-0 py-3 flex justify-center cursor-grab"
                aria-hidden="true"
              >
                <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" aria-hidden="true" />
              </div>

              {/* Header */}
              <div className="flex-shrink-0 px-4 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#FF4500] flex items-center justify-center">
                    <SnooLogo className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span id="ai-sheet-title" className="font-semibold text-slate-900 dark:text-white">Ask Snoo</span>
                    <span className="text-[10px] text-orange-600 dark:text-orange-400">Powered by Reddit travelers</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAISheet(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
                  aria-label="Close AI assistant"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <AIAssistantPanel onCollapse={() => setShowAISheet(false)} />
              </div>
            </div>
          </>
        )}
      </div>
    </DragDropContext>
  );
}
