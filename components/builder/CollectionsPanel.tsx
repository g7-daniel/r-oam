'use client';

import { useState } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import {
  MapPin,
  Utensils,
  Plus,
  Clock,
  Star,
  GripVertical,
  Trash2,
  FolderPlus,
  X,
  ArrowUp,
} from 'lucide-react';
import clsx from 'clsx';
import { handleImageError, getPlaceholderImage } from '@/lib/utils';

type CollectionType = 'experiences' | 'restaurants' | string;

export default function CollectionsPanel() {
  const { trip, collections, removeFromCollection, customLists, createCustomList } = useTripStore();
  const [activeCollection, setActiveCollection] = useState<CollectionType>('experiences');
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Get items for active collection
  const getCollectionItems = () => {
    if (activeCollection === 'experiences') {
      return collections.experiences;
    }
    if (activeCollection === 'restaurants') {
      return collections.restaurants;
    }
    // Custom list
    const customList = customLists.find(l => l.id === activeCollection);
    return customList?.items || [];
  };

  const items = getCollectionItems();
  const unscheduledItems = items.filter(item => !item.scheduledDayIndex);

  const handleCreateList = () => {
    if (newListName.trim()) {
      createCustomList(newListName.trim());
      setNewListName('');
      setShowNewListInput(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      beaches: '🏖️',
      museums: '🏛️',
      food_tours: '🍜',
      nightlife: '🌙',
      day_trips: '🚗',
      hidden_gems: '💎',
      outdoor: '🌲',
      shopping: '🛍️',
      cultural: '🎭',
      wellness: '🧘',
      adventure: '🧗',
      nature: '🌿',
      landmarks: '🗼',
      entertainment: '🎢',
      dining: '🍽️',
    };
    return icons[category] || '📍';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Collection tabs */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCollection('experiences')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              activeCollection === 'experiences'
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            Experiences
            {collections.experiences.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
                {collections.experiences.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveCollection('restaurants')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              activeCollection === 'restaurants'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            )}
          >
            <Utensils className="w-3.5 h-3.5" />
            Restaurants
            {collections.restaurants.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
                {collections.restaurants.length}
              </span>
            )}
          </button>

          {/* Custom lists */}
          {customLists.map(list => (
            <button
              key={list.id}
              onClick={() => setActiveCollection(list.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                activeCollection === list.id
                  ? 'bg-violet-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              )}
            >
              {list.icon || '📁'}
              {list.name}
              {list.items.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
                  {list.items.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Create new list */}
        {showNewListInput ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name..."
              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateList();
                if (e.key === 'Escape') setShowNewListInput(false);
              }}
              autoFocus
            />
            <button
              onClick={handleCreateList}
              className="p-1.5 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowNewListInput(false)}
              className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewListInput(true)}
            className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Create new list
          </button>
        )}
      </div>

      {/* Items list */}
      <Droppable droppableId={`collection-${activeCollection}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={clsx(
              'flex-1 overflow-y-auto px-3 pb-3',
              snapshot.isDraggingOver && 'bg-primary-50/50 dark:bg-primary-900/20'
            )}
          >
            {unscheduledItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                  {activeCollection === 'restaurants' ? (
                    <Utensils className="w-6 h-6 text-slate-400" />
                  ) : (
                    <MapPin className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">No saved places yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Browse or ask Snoo for recommendations
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                {unscheduledItems.map((item, index) => (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={clsx(
                          'group flex items-start gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm transition-all',
                          snapshot.isDragging && 'shadow-lg border-primary-300 dark:border-primary-500 rotate-2'
                        )}
                      >
                        {/* Drag handle - hidden on mobile */}
                        <div
                          {...provided.dragHandleProps}
                          className="hidden sm:flex flex-shrink-0 p-1 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 cursor-grab"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Image with fallback placeholder */}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/50">
                          <img
                            src={item.imageUrl || getPlaceholderImage('generic')}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => handleImageError(e, 'generic')}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1 sm:gap-2">
                            <div className="min-w-0 flex-1">
                              {/* Reddit source badge */}
                              {item.source?.type === 'reddit' && item.source.subreddit && (
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-[9px] font-medium">
                                    <ArrowUp className="w-2 h-2" />
                                    {item.source.upvotes?.toLocaleString() || '?'}
                                  </span>
                                  <span className="text-[9px] text-slate-500 dark:text-slate-400">
                                    r/{item.source.subreddit}
                                  </span>
                                </div>
                              )}
                              <p className="font-medium text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {item.name}
                              </p>
                              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                                <span>{getCategoryIcon(item.category)}</span>
                                {item.rating && (
                                  <span className="flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 fill-amber-400" />
                                    {item.rating.toFixed(1)}
                                  </span>
                                )}
                                {item.durationMinutes && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    {item.durationMinutes >= 60
                                      ? `${Math.floor(item.durationMinutes / 60)}h`
                                      : `${item.durationMinutes}m`}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Remove button - always visible on mobile */}
                            <button
                              onClick={() => removeFromCollection(activeCollection, item.id)}
                              className="sm:opacity-0 sm:group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
