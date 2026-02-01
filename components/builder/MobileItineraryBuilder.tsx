'use client';

import { useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import CollectionsPanel from './CollectionsPanel';
import MainItinerary from './MainItinerary';
import RightMapPanel from './RightMapPanel';
import AIAssistantPanel from './AIAssistantPanel';
import TripHeader from './TripHeader';
import { FolderHeart, Calendar, Map, MessageSquare, X } from 'lucide-react';
import clsx from 'clsx';

interface MobileItineraryBuilderProps {
  selectedDayIndex: number;
  setSelectedDayIndex: (index: number) => void;
  totalDays: number;
  mapView: 'day' | 'all' | 'saved';
  setMapView: (view: 'day' | 'all' | 'saved') => void;
}

type MobileTab = 'collections' | 'itinerary' | 'map';

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
  } = useTripStoreV2();

  const [activeTab, setActiveTab] = useState<MobileTab>('itinerary');
  const [showAISheet, setShowAISheet] = useState(false);

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
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        {/* Compact header for mobile */}
        <TripHeader />

        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'collections' && (
            <div className="h-full bg-white dark:bg-slate-800">
              <CollectionsPanel />
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

        {/* Bottom tab bar */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
          <div className="flex">
            <button
              onClick={() => setActiveTab('collections')}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1 py-3 transition-colors',
                activeTab === 'collections'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            >
              <FolderHeart className="w-5 h-5" />
              <span className="text-xs font-medium">Saved</span>
            </button>

            <button
              onClick={() => setActiveTab('itinerary')}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1 py-3 transition-colors',
                activeTab === 'itinerary'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-xs font-medium">Itinerary</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1 py-3 transition-colors',
                activeTab === 'map'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            >
              <Map className="w-5 h-5" />
              <span className="text-xs font-medium">Map</span>
            </button>

            <button
              onClick={() => setShowAISheet(true)}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-slate-400 dark:text-slate-500"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-medium">Snoo</span>
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
            />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 h-[70vh] bg-white dark:bg-slate-800 rounded-t-2xl z-50 flex flex-col shadow-xl">
              {/* Handle */}
              <div className="flex-shrink-0 py-3 flex justify-center">
                <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex-shrink-0 px-4 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">Ask Snoo</span>
                </div>
                <button
                  onClick={() => setShowAISheet(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
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
