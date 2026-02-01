'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTripStore } from '@/stores/tripStore';
import { DragDropScheduler } from '@/components/itinerary';
import { generateFullItinerary, optimizeItinerary } from '@/lib/itinerary-scheduler';
import TripMap from '@/components/map/TripMap';
import type { ItineraryDay, Experience } from '@/types';
import Card from '@/components/ui/Card';
import {
  Calendar,
  Download,
  Share2,
  Sparkles,
  RefreshCw,
  Clock,
  MapPin,
  Plane,
  CheckCircle2,
  Map,
  List,
} from 'lucide-react';
import clsx from 'clsx';

export default function Step9Itinerary() {
  const { legs } = useTripStore();

  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [summary, setSummary] = useState<{
    totalExperiences: number;
    totalTransitTime: number;
    legBreakdown: { legId: string; destination: string; days: number; experiences: number }[];
  } | null>(null);

  // Collect all experiences for map display
  const allExperiences = useMemo(() => {
    const experiences: Experience[] = [];
    for (const leg of legs) {
      experiences.push(...leg.experiences);
    }
    return experiences;
  }, [legs]);

  // Get experiences for selected day
  const selectedDayExperiences = useMemo(() => {
    if (!days[selectedDayIndex]) return [];
    const dayItems = days[selectedDayIndex].items;
    const expIds = dayItems
      .filter((item) => item.type === 'experience' && item.experienceId)
      .map((item) => item.experienceId!);
    return allExperiences.filter((exp) => expIds.includes(exp.id));
  }, [days, selectedDayIndex, allExperiences]);

  // Get all selected experience IDs
  const selectedExperienceIds = useMemo(() => {
    return selectedDayExperiences.map((exp) => exp.id);
  }, [selectedDayExperiences]);

  // Generate itinerary on mount or when legs change
  useEffect(() => {
    if (legs.length > 0) {
      generateItinerary();
    }
  }, []);

  const generateItinerary = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Use the scheduler directly for now
      // In production, could call the API endpoint
      const result = generateFullItinerary(legs);
      setDays(result.days);
      setSummary(result.summary);
    } catch (error) {
      console.error('Failed to generate itinerary:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [legs]);

  const handleOptimize = useCallback(() => {
    const optimized = optimizeItinerary(days);
    setDays(optimized);
  }, [days]);

  const handleDaysChange = useCallback((newDays: ItineraryDay[]) => {
    setDays(newDays);
  }, []);

  const handleExport = () => {
    // Generate a simple text export
    let exportText = 'TRIP ITINERARY\n';
    exportText += '='.repeat(50) + '\n\n';

    for (const day of days) {
      exportText += `DAY ${day.dayNumber} - ${new Date(day.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}\n`;
      exportText += '-'.repeat(40) + '\n';

      if (day.notes) {
        exportText += `Note: ${day.notes}\n`;
      }

      for (const item of day.items) {
        if (item.type === 'transit') {
          exportText += `  ${item.startTime} - Travel (${item.transitDistance}km)\n`;
        } else {
          exportText += `  ${item.startTime} - ${item.endTime}: ${item.title}\n`;
          if (item.notes) {
            exportText += `    Tip: ${item.notes}\n`;
          }
        }
      }
      exportText += '\n';
    }

    // Download as text file
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trip-itinerary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'My Trip Itinerary',
      text: `Check out my ${days.length}-day trip itinerary!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy link to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const totalExperiences = summary?.totalExperiences || 0;
  const totalDays = days.length;

  if (legs.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-600 mb-2">
          No Trip Data Yet
        </h2>
        <p className="text-slate-500">
          Please complete the previous steps to build your itinerary
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="section-title mb-2">Your Trip Itinerary</h1>
        <p className="section-subtitle">
          Review and customize your day-by-day schedule
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold">{totalDays}</div>
                <div className="text-sky-100 text-sm">Days</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">{legs.length}</div>
                <div className="text-sky-100 text-sm">Destinations</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">{totalExperiences}</div>
                <div className="text-sky-100 text-sm">Activities</div>
              </div>
              {summary?.totalTransitTime && summary.totalTransitTime > 0 && (
                <div className="text-center">
                  <div className="text-4xl font-bold">
                    {formatDuration(summary.totalTransitTime).split(' ')[0]}
                  </div>
                  <div className="text-sky-100 text-sm">Travel Time</div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleOptimize}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Optimize
              </button>
              <button
                onClick={generateItinerary}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={clsx('w-4 h-4', isGenerating && 'animate-spin')} />
                Regenerate
              </button>
            </div>
          </div>
        </Card>

        {/* Leg Breakdown */}
        {summary?.legBreakdown && summary.legBreakdown.length > 1 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {summary.legBreakdown.map((lb, index) => (
              <Card key={lb.legId} padding="sm" className="bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-700">{lb.destination}</h4>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {lb.days} days
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {lb.experiences} activities
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                viewMode === 'list'
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

          {/* Day selector for map view */}
          {viewMode === 'map' && days.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Showing day:</span>
              <select
                value={selectedDayIndex}
                onChange={(e) => setSelectedDayIndex(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {days.map((day, idx) => (
                  <option key={idx} value={idx}>
                    Day {day.dayNumber} - {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Itinerary Timeline or Map */}
        {isGenerating ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-sky-500 animate-spin" />
            <p className="text-slate-500">Generating your itinerary...</p>
          </div>
        ) : viewMode === 'list' ? (
          <DragDropScheduler
            days={days}
            legs={legs}
            onDaysChange={handleDaysChange}
          />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2 h-[500px] rounded-xl overflow-hidden border border-slate-200">
              <TripMap
                experiences={allExperiences}
                selectedExperiences={selectedExperienceIds}
                showRoute={selectedDayExperiences.length > 1}
                height="100%"
              />
            </div>

            {/* Day Schedule */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sky-500" />
                  Day {days[selectedDayIndex]?.dayNumber} Schedule
                </h3>

                {days[selectedDayIndex]?.notes && (
                  <div className="text-sm text-slate-500 mb-4 pb-4 border-b border-slate-100">
                    {days[selectedDayIndex].notes}
                  </div>
                )}

                <div className="space-y-3">
                  {days[selectedDayIndex]?.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={clsx(
                        'p-3 rounded-lg',
                        item.type === 'experience' && 'bg-sky-50 border border-sky-100',
                        item.type === 'transit' && 'bg-slate-50 border border-slate-100',
                        item.type === 'flight' && 'bg-amber-50 border border-amber-100',
                        item.type === 'hotel' && 'bg-emerald-50 border border-emerald-100'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-medium text-slate-500">
                            {item.startTime} - {item.endTime}
                          </span>
                          <h4 className="font-medium text-slate-900 text-sm mt-0.5">
                            {item.title}
                          </h4>
                          {item.notes && (
                            <p className="text-xs text-slate-500 mt-1 italic">
                              Tip: {item.notes}
                            </p>
                          )}
                        </div>
                        <span
                          className={clsx(
                            'text-xs px-2 py-0.5 rounded-full',
                            item.type === 'experience' && 'bg-sky-100 text-sky-700',
                            item.type === 'transit' && 'bg-slate-200 text-slate-600',
                            item.type === 'flight' && 'bg-amber-100 text-amber-700',
                            item.type === 'hotel' && 'bg-emerald-100 text-emerald-700'
                          )}
                        >
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ))}

                  {(!days[selectedDayIndex]?.items || days[selectedDayIndex].items.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Free day - explore on your own!
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Export Options */}
        {days.length > 0 && (
          <Card className="bg-slate-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-700">Save Your Itinerary</h3>
                <p className="text-sm text-slate-500">
                  Download or share your trip plan with others
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Completion Message */}
        {days.length > 0 && (
          <div className="mt-8 p-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-center text-white">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">
              Your Trip is Ready!
            </h3>
            <p className="text-emerald-100 max-w-md mx-auto">
              Your {totalDays}-day adventure across {legs.length} destination
              {legs.length > 1 ? 's' : ''} is planned. Have an amazing trip!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
