'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import Card from '@/components/ui/Card';
import {
  Sparkles,
  Clock,
  DollarSign,
  Check,
  Star,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

// Category config
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
};

export default function Step4Experiences() {
  const {
    trip,
    setActiveDestination,
    seedExperiencesFromDiscovery,
    selectExperience,
    deselectExperience,
  } = useTripStore(useShallow((state) => ({
    trip: state.trip,
    setActiveDestination: state.setActiveDestination,
    seedExperiencesFromDiscovery: state.seedExperiencesFromDiscovery,
    selectExperience: state.selectExperience,
    deselectExperience: state.deselectExperience,
  })));

  const { destinations, activeDestinationId } = trip;
  const activeDestination = destinations.find((d) => d.destinationId === activeDestinationId);

  // Track which destinations have been seeded to prevent infinite loops
  const seededRef = useRef<Set<string>>(new Set());

  // Track if we've already set the initial destination
  const hasSetInitialDestination = useRef(false);

  // Set first destination as active when entering this step
  useEffect(() => {
    if (hasSetInitialDestination.current) return;
    if (destinations.length > 0) {
      hasSetInitialDestination.current = true;
      // Always start with the first destination when entering this step
      const firstDestId = destinations[0].destinationId;
      if (activeDestinationId !== firstDestId) {
        setActiveDestination(firstDestId);
      }
    }
  }, [destinations, activeDestinationId, setActiveDestination]);

  // Seed experiences from discovery on first visit (with dedup to prevent infinite loop)
  useEffect(() => {
    destinations.forEach((dest) => {
      // Skip if already seeded or has experiences
      if (seededRef.current.has(dest.destinationId)) return;
      if (dest.experiences.items.length > 0) return;

      if (dest.discovery.isComplete) {
        seededRef.current.add(dest.destinationId);
        seedExperiencesFromDiscovery(dest.destinationId);
      }
    });
  }, [destinations, seedExperiencesFromDiscovery]);

  // Get experiences for active destination
  const experiences = activeDestination?.experiences.items || [];
  const selectedIds = activeDestination?.experiences.selectedExperienceIds || [];

  const handleToggle = (expId: string) => {
    if (!activeDestination) return;
    if (selectedIds.includes(expId)) {
      deselectExperience(activeDestination.destinationId, expId);
    } else {
      selectExperience(activeDestination.destinationId, expId);
    }
  };

  // Group by from-discovery vs additional
  const { discoveryExps, additionalExps } = useMemo(() => {
    const discovery = experiences.filter((e) => e.isFromDiscovery);
    const additional = experiences.filter((e) => !e.isFromDiscovery);
    return { discoveryExps: discovery, additionalExps: additional };
  }, [experiences]);

  if (destinations.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-600 mb-2">No Destinations Yet</h2>
        <p className="text-slate-500">Go back and add destinations first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="section-title flex items-center justify-center gap-2">
          <Star className="w-6 h-6 text-primary-500" />
          Select Your Experiences
        </h1>
        <p className="section-subtitle">
          Review and select the experiences you want to include in your trip
        </p>
      </div>

      {/* Destination tabs */}
      {destinations.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {destinations.map((dest, idx) => {
            const isActive = dest.destinationId === activeDestinationId;
            const selectedCount = dest.experiences.selectedExperienceIds.length;

            return (
              <button
                key={dest.destinationId}
                onClick={() => setActiveDestination(dest.destinationId)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                <span className="font-medium">{idx + 1}. {dest.place.name}</span>
                {selectedCount > 0 && (
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs',
                    isActive ? 'bg-white/20' : 'bg-primary-100 text-primary-600'
                  )}>
                    {selectedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeDestination && (
        <div className="space-y-6">
          {/* From Discovery */}
          {discoveryExps.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                Preselected from AI Discovery
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {discoveryExps.map((exp) => {
                  const isSelected = selectedIds.includes(exp.id);
                  const categoryConfig = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.cultural;

                  return (
                    <Card
                      key={exp.id}
                      className={clsx(
                        'cursor-pointer transition-all',
                        isSelected
                          ? 'ring-2 ring-primary-500 bg-primary-50'
                          : 'hover:shadow-md'
                      )}
                      onClick={() => handleToggle(exp.id)}
                    >
                      {/* Selection indicator */}
                      <div className="flex items-start justify-between mb-2">
                        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', categoryConfig.color)}>
                          {categoryConfig.icon} {exp.category.replace('_', ' ')}
                        </span>
                        <div
                          className={clsx(
                            'w-6 h-6 rounded-full flex items-center justify-center',
                            isSelected
                              ? 'bg-primary-500 text-white'
                              : 'bg-slate-100'
                          )}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </div>

                      <h4 className="font-semibold text-slate-900 mb-1">{exp.name}</h4>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{exp.description}</p>

                      {/* Reddit tips */}
                      {exp.redditTips && exp.redditTips.length > 0 && (
                        <div className="p-2 bg-orange-50 rounded-lg mb-3">
                          <p className="text-xs text-orange-700 line-clamp-2">
                            &ldquo;{exp.redditTips[0]}&rdquo;
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {exp.durationMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {exp.durationMinutes >= 60
                              ? `${Math.round(exp.durationMinutes / 60)}h`
                              : `${exp.durationMinutes}m`}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {exp.priceUsd === 0 ? 'Free' : `$${exp.priceUsd}`}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional experiences */}
          {additionalExps.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">
                Additional Experiences
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {additionalExps.map((exp) => {
                  const isSelected = selectedIds.includes(exp.id);
                  const categoryConfig = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.cultural;

                  return (
                    <Card
                      key={exp.id}
                      className={clsx(
                        'cursor-pointer transition-all',
                        isSelected
                          ? 'ring-2 ring-primary-500 bg-primary-50'
                          : 'hover:shadow-md'
                      )}
                      onClick={() => handleToggle(exp.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', categoryConfig.color)}>
                          {categoryConfig.icon} {exp.category.replace('_', ' ')}
                        </span>
                        <div
                          className={clsx(
                            'w-6 h-6 rounded-full flex items-center justify-center',
                            isSelected ? 'bg-primary-500 text-white' : 'bg-slate-100'
                          )}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </div>

                      <h4 className="font-semibold text-slate-900 mb-1">{exp.name}</h4>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{exp.description}</p>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {exp.durationMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {exp.durationMinutes >= 60
                              ? `${Math.round(exp.durationMinutes / 60)}h`
                              : `${exp.durationMinutes}m`}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {exp.priceUsd === 0 ? 'Free' : `$${exp.priceUsd}`}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {experiences.length === 0 && (
            <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                No experiences found for this destination yet.
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Complete the AI Discovery step to get personalized recommendations.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {destinations.reduce((sum, d) => sum + d.experiences.selectedExperienceIds.length, 0)} Experiences Selected
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Across {destinations.length} destination{destinations.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600">
              ${destinations.reduce((sum, d) => {
                const selected = d.experiences.items.filter((e) =>
                  d.experiences.selectedExperienceIds.includes(e.id)
                );
                return sum + selected.reduce((s, e) => s + e.priceUsd, 0);
              }, 0).toLocaleString()}
            </p>
            <p className="text-sm text-slate-500">Total cost</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
