'use client';

import { useTripStore } from '@/stores/tripStore';
import {
  Plane,
  Hotel,
  Sparkles,
  Users,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { formatDate, formatDateRange } from '@/lib/date-utils';

interface TripSummaryProps {
  className?: string;
  compact?: boolean;
}

export default function TripSummary({ className, compact = false }: TripSummaryProps) {
  const { trip, getTotalBudgetSpent, getRemainingBudget, getFlightsSummary, experienceCart, diningReservations } = useTripStore();
  const { basics, destinations, flights } = trip;

  const spent = getTotalBudgetSpent();
  const remaining = getRemainingBudget();
  const flightsSummary = getFlightsSummary();

  const totalExperiences = destinations.reduce(
    (sum, d) => sum + d.experiences.selectedExperienceIds.length,
    0
  );

  if (compact) {
    return (
      <div className={clsx('bg-white border border-slate-200 rounded-xl p-4', className)}>
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-500" />
          Trip Summary
        </h3>

        <div className="space-y-2 text-sm">
          {basics.originAirport && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">From</span>
              <span className="font-medium">{basics.originAirport.city} ({basics.originAirport.iata})</span>
            </div>
          )}
          {basics.startDate && basics.endDate && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Dates</span>
              <span className="font-medium">
                {formatDateRange(basics.startDate, basics.endDate)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Destinations</span>
            <span className="font-medium">{destinations.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Budget</span>
            <span className="font-medium">${remaining.toLocaleString()} left</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white border border-slate-200 rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Trip Summary
        </h3>
        {basics.startDate && basics.endDate && (
          <p className="text-sm text-white/80 mt-1">
            {formatDateRange(basics.startDate, basics.endDate)}
          </p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Basics */}
        <div className="space-y-2">
          {basics.originAirport && (
            <div className="flex items-center gap-2 text-sm">
              <Plane className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">From:</span>
              <span className="font-medium text-slate-900">
                {basics.originAirport.city} ({basics.originAirport.iata})
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Travelers:</span>
            <span className="font-medium text-slate-900">
              {basics.travelers.adults} adult{basics.travelers.adults > 1 ? 's' : ''}
              {basics.travelers.children > 0 && `, ${basics.travelers.children} child${basics.travelers.children > 1 ? 'ren' : ''}`}
            </span>
          </div>
        </div>

        {/* Budget */}
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Budget</span>
            <span className="text-sm font-medium">${basics.totalBudgetUsd.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full transition-all',
                remaining >= 0 ? 'bg-primary-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(100, (spent / basics.totalBudgetUsd) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-500">${spent.toLocaleString()} spent</span>
            <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
              ${Math.abs(remaining).toLocaleString()} {remaining >= 0 ? 'remaining' : 'over'}
            </span>
          </div>
        </div>

        {/* Destinations */}
        {destinations.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Destinations
            </h4>
            <div className="space-y-2">
              {destinations.map((dest, idx) => {
                const spotsSelected = dest.discovery.selectedSpotIds.length;
                const experiencesSelected = dest.experiences.selectedExperienceIds.length;
                const hotelSelected = dest.hotels.selectedHotelId !== null;

                return (
                  <div key={dest.destinationId} className="p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-900 flex-1">{dest.place.name}</span>
                      <span className="text-xs text-slate-500">{dest.nights}n</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-7 text-xs">
                      {dest.discovery.isComplete ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Check className="w-3 h-3" />
                          {spotsSelected} spots
                        </span>
                      ) : (
                        <span className="text-slate-400">Discovery pending</span>
                      )}
                      {experiencesSelected > 0 && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Sparkles className="w-3 h-3" />
                          {experiencesSelected}
                        </span>
                      )}
                      {hotelSelected ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Hotel className="w-3 h-3" />
                          <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Hotel className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Flights */}
        {flights.legs.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Flights ({flightsSummary.completedLegs + flightsSummary.skippedLegs}/{flightsSummary.totalLegs})
            </h4>
            <div className="space-y-1">
              {flights.legs.map((leg) => (
                <div
                  key={leg.legId}
                  className="flex items-center gap-2 text-sm p-2 bg-slate-50 rounded-lg"
                >
                  <Plane className="w-4 h-4 text-slate-400" />
                  <span className="flex-1 text-slate-700">
                    {leg.from.iata} <ChevronRight className="w-3 h-3 inline" /> {leg.to.iata}
                  </span>
                  {leg.status === 'selected' && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {leg.status === 'skipped_booked' && (
                    <span className="text-xs text-amber-600">Booked</span>
                  )}
                  {leg.status === 'pending' && (
                    <X className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        {(experienceCart.length > 0 || totalExperiences > 0 || destinations.some((d) => d.hotels.selectedHotelId)) && (
          <div className="pt-3 border-t border-slate-100">
            {experienceCart.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">🛒 In Cart</span>
                <span className="font-medium text-reddit">{experienceCart.length}</span>
              </div>
            )}
            {diningReservations.length > 0 && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-500">🍴 Reservations</span>
                <span className="font-medium text-green-600">{diningReservations.length}</span>
              </div>
            )}
            {totalExperiences > 0 && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-500">Experiences</span>
                <span className="font-medium">{totalExperiences}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-500">Hotels</span>
              <span className="font-medium">
                {destinations.filter((d) => d.hotels.selectedHotelId).length}/{destinations.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
