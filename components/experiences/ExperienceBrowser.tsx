'use client';

import { useState, useMemo, useCallback } from 'react';
import { Map, List, Grid, Search, Loader2 } from 'lucide-react';
import type { Experience } from '@/types';
import TripMap from '@/components/map/TripMap';
import ExperienceCard from './ExperienceCard';
import ExperienceFilters, {
  type ExperienceFiltersState,
  defaultExperienceFilters,
} from '@/components/filters/ExperienceFilters';
import clsx from 'clsx';

interface ExperienceBrowserProps {
  experiences: Experience[];
  selectedExperiences: string[];
  onExperienceSelect: (experienceId: string) => void;
  destination: string;
  isLoading?: boolean;
  onConfirm?: () => void;
}

type ViewMode = 'split' | 'map' | 'list';

export default function ExperienceBrowser({
  experiences,
  selectedExperiences,
  onExperienceSelect,
  destination,
  isLoading = false,
  onConfirm,
}: ExperienceBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [filters, setFilters] = useState<ExperienceFiltersState>(defaultExperienceFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredExperience, setHoveredExperience] = useState<string | null>(null);

  // Apply filters to experiences
  const filteredExperiences = useMemo(() => {
    return experiences.filter((exp) => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !exp.name.toLowerCase().includes(query) &&
          !exp.description.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(exp.category)) {
        return false;
      }

      // Price filter
      if (exp.price < filters.priceRange.min || exp.price > filters.priceRange.max) {
        return false;
      }

      // Rating filter
      if (filters.minRating > 0 && exp.rating < filters.minRating) {
        return false;
      }

      // Duration filter
      if (filters.duration.length > 0) {
        const durationStr = typeof exp.duration === 'string' ? exp.duration.toLowerCase() : '';
        const durationNum = typeof exp.duration === 'number' ? exp.duration : 0;

        const matchesDuration = filters.duration.some((d) => {
          if (d === 'short') {
            return (
              durationStr.includes('1') ||
              durationStr.includes('2') ||
              (durationNum > 0 && durationNum <= 120)
            );
          }
          if (d === 'half_day') {
            return (
              durationStr.includes('half') ||
              durationStr.includes('3') ||
              durationStr.includes('4') ||
              (durationNum > 120 && durationNum <= 300)
            );
          }
          if (d === 'full_day') {
            return (
              durationStr.includes('full') ||
              durationStr.includes('day') ||
              durationNum > 300
            );
          }
          return true;
        });

        if (!matchesDuration) return false;
      }

      // Reddit recommended
      if (filters.redditRecommendedOnly && (!exp.redditTips || exp.redditTips.length === 0)) {
        return false;
      }

      return true;
    });
  }, [experiences, filters, searchQuery]);

  const handleExperienceClick = useCallback(
    (experience: Experience) => {
      setHoveredExperience(experience.id);
    },
    []
  );

  const handleExperienceSelect = useCallback(
    (experience: Experience) => {
      onExperienceSelect(experience.id);
    },
    [onExperienceSelect]
  );

  const selectedCount = selectedExperiences.length;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search experiences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('split')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'split' ? 'bg-white shadow text-sky-600' : 'text-slate-500 hover:text-slate-700'
              )}
              title="Split View"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'map' ? 'bg-white shadow text-sky-600' : 'text-slate-500 hover:text-slate-700'
              )}
              title="Map View"
            >
              <Map className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-white shadow text-sky-600' : 'text-slate-500 hover:text-slate-700'
              )}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Selection Info */}
          <div className="text-sm text-slate-600">
            <span className="font-medium text-sky-600">{selectedCount}</span> selected
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* List Panel */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div
            className={clsx(
              'flex flex-col bg-white border-r border-slate-200 overflow-hidden',
              viewMode === 'split' ? 'w-[450px]' : 'flex-1'
            )}
          >
            {/* Filters */}
            <div className="p-4 border-b border-slate-100">
              <ExperienceFilters
                filters={filters}
                onFiltersChange={setFilters}
                totalCount={experiences.length}
                filteredCount={filteredExperiences.length}
              />
            </div>

            {/* Experience List */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                </div>
              ) : filteredExperiences.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No experiences match your filters</p>
                  <button
                    onClick={() => setFilters(defaultExperienceFilters)}
                    className="mt-2 text-sky-600 hover:underline text-sm"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div
                  className={clsx(
                    'gap-4',
                    viewMode === 'list'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                      : 'space-y-4'
                  )}
                >
                  {filteredExperiences.map((experience) => (
                    <div
                      key={experience.id}
                      onMouseEnter={() => setHoveredExperience(experience.id)}
                      onMouseLeave={() => setHoveredExperience(null)}
                    >
                      <ExperienceCard
                        experience={experience}
                        isSelected={selectedExperiences.includes(experience.id)}
                        onSelect={() => onExperienceSelect(experience.id)}
                        compact={viewMode === 'split'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Map Panel */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className="flex-1 relative">
            <TripMap
              experiences={filteredExperiences}
              selectedExperiences={selectedExperiences}
              onExperienceClick={handleExperienceClick}
              onExperienceSelect={handleExperienceSelect}
              showRoute={selectedExperiences.length > 1}
              height="100%"
            />

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
              <p className="font-medium text-slate-700 mb-2">Legend</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white border-2 border-sky-500" />
                  <span className="text-slate-600">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-500 border-2 border-white shadow" />
                  <span className="text-slate-600">Selected</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {selectedCount > 0 && onConfirm && (
        <div className="bg-white border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">
                {selectedCount} experience{selectedCount !== 1 ? 's' : ''} selected in {destination}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Total estimated cost: $
                {experiences
                  .filter((e) => selectedExperiences.includes(e.id))
                  .reduce((sum, e) => sum + e.price, 0)}
              </p>
            </div>
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 text-white font-medium rounded-xl hover:shadow-lg transition-shadow"
            >
              Continue to Hotels
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
