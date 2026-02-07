'use client';

import { useTripStore } from '@/stores/tripStore';
import { useShallow } from 'zustand/react/shallow';
import Card from '@/components/ui/Card';
import {
  CheckCircle2,
  Download,
  Share2,
  Plane,
  Hotel,
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
} from 'lucide-react';
import clsx from 'clsx';

export default function Step8Review() {
  const { trip, getTotalBudgetSpent, getRemainingBudget } = useTripStore(useShallow((state) => ({
    trip: state.trip,
    getTotalBudgetSpent: state.getTotalBudgetSpent,
    getRemainingBudget: state.getRemainingBudget,
  })));
  const { basics, destinations, flights } = trip;

  const spent = getTotalBudgetSpent();
  const remaining = getRemainingBudget();

  const totalExperiences = destinations.reduce(
    (sum, d) => sum + d.experiences.selectedExperienceIds.length,
    0
  );

  const totalNights = destinations.reduce((sum, d) => sum + d.nights, 0);

  const handleExport = () => {
    // Generate text export
    let text = '=== YOUR TRIP ITINERARY ===\n\n';

    text += `FROM: ${basics.originAirport?.city} (${basics.originAirport?.iata})\n`;
    text += `DATES: ${basics.startDate} to ${basics.endDate}\n`;
    text += `TRAVELERS: ${basics.travelers.adults} adults`;
    if (basics.travelers.children > 0) {
      text += `, ${basics.travelers.children} children`;
    }
    text += '\n\n';

    destinations.forEach((dest, idx) => {
      text += `--- DESTINATION ${idx + 1}: ${dest.place.name} (${dest.nights} nights) ---\n\n`;

      // Hotel
      if (dest.hotels.selectedHotelId) {
        const hotel = dest.hotels.results.find((h) => h.id === dest.hotels.selectedHotelId);
        if (hotel) {
          text += `HOTEL: ${hotel.name}\n`;
          text += `  ${hotel.address}\n`;
          text += `  $${hotel.pricePerNight}/night (Total: $${hotel.totalPrice})\n\n`;
        }
      }

      // Experiences
      const selectedExps = dest.experiences.items.filter((e) =>
        dest.experiences.selectedExperienceIds.includes(e.id)
      );
      if (selectedExps.length > 0) {
        text += 'EXPERIENCES:\n';
        selectedExps.forEach((exp) => {
          text += `  - ${exp.name}`;
          if (exp.priceUsd > 0) text += ` ($${exp.priceUsd})`;
          text += '\n';
        });
        text += '\n';
      }
    });

    text += '--- FLIGHTS ---\n\n';
    flights.legs.forEach((leg) => {
      if (leg.status === 'skipped_booked') {
        text += `${leg.from.iata} → ${leg.to.iata}: Already booked\n`;
      } else if (leg.selectedFlightId) {
        const flight = leg.flights.find((f) => f.id === leg.selectedFlightId);
        if (flight) {
          text += `${leg.from.iata} → ${leg.to.iata}: ${flight.airline} ${flight.flightNumber}\n`;
          text += `  ${flight.departureTime} - ${flight.arrivalTime} ($${flight.priceUsd})\n`;
        }
      }
    });

    text += `\n--- BUDGET SUMMARY ---\n`;
    text += `Total Budget: $${basics.totalBudgetUsd.toLocaleString()}\n`;
    text += `Total Spent: $${spent.toLocaleString()}\n`;
    text += `Remaining: $${remaining.toLocaleString()}\n`;

    // Download
    const blob = new Blob([text], { type: 'text/plain' });
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
      text: `Check out my ${totalNights}-night trip to ${destinations.map((d) => d.place.name).join(', ')}!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center p-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl text-white">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Your Trip is Ready!</h1>
        <p className="text-green-100 max-w-md mx-auto">
          {totalNights} nights across {destinations.length} amazing destinations
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-primary-500" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalNights}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Nights</p>
        </Card>
        <Card className="text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-primary-500" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{destinations.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Destinations</p>
        </Card>
        <Card className="text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary-500" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalExperiences}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Experiences</p>
        </Card>
        <Card className="text-center">
          <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary-500" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">${spent.toLocaleString()}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Cost</p>
        </Card>
      </div>

      {/* Trip details */}
      <Card>
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-500" />
          Trip Details
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Origin</p>
            <p className="font-medium text-slate-900 dark:text-white">
              {basics.originAirport?.city} ({basics.originAirport?.iata})
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Dates</p>
            <p className="font-medium text-slate-900 dark:text-white">
              {basics.startDate && new Date(basics.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
              {basics.endDate && new Date(basics.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Travelers</p>
            <p className="font-medium text-slate-900 dark:text-white">
              {basics.travelers.adults} adult{basics.travelers.adults > 1 ? 's' : ''}
              {basics.travelers.children > 0 && `, ${basics.travelers.children} child${basics.travelers.children > 1 ? 'ren' : ''}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Budget Style</p>
            <p className="font-medium text-slate-900 dark:text-white capitalize">{basics.budgetStyle || 'mid'}</p>
          </div>
        </div>
      </Card>

      {/* Destinations breakdown */}
      {destinations.map((dest, idx) => {
        const hotel = dest.hotels.results.find((h) => h.id === dest.hotels.selectedHotelId);
        const selectedExps = dest.experiences.items.filter((e) =>
          dest.experiences.selectedExperienceIds.includes(e.id)
        );

        return (
          <Card key={dest.destinationId}>
            <div className="flex items-start gap-4">
              {/* Hero image */}
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                {dest.heroImageUrl && (
                  <img
                    src={dest.heroImageUrl}
                    alt={dest.place.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </span>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{dest.place.name}</h3>
                  <span className="text-sm text-slate-500 dark:text-slate-400">({dest.nights} nights)</span>
                </div>

                <div className="space-y-2 text-sm">
                  {hotel && (
                    <div className="flex items-center gap-2">
                      <Hotel className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300">{hotel.name}</span>
                      <span className="text-slate-500 dark:text-slate-400">${hotel.totalPrice}</span>
                    </div>
                  )}
                  {selectedExps.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300">{selectedExps.length} experiences</span>
                      <span className="text-slate-500">
                        ${selectedExps.reduce((s, e) => s + e.priceUsd, 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Flights */}
      <Card>
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Plane className="w-5 h-5 text-primary-500" />
          Flights
        </h3>
        <div className="space-y-3">
          {flights.legs.map((leg) => {
            const flight = leg.flights.find((f) => f.id === leg.selectedFlightId);

            return (
              <div key={leg.legId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Plane className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {leg.from.city} to {leg.to.city}
                    </p>
                    {flight && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {flight.airline} {flight.flightNumber} • {flight.departureTime}
                      </p>
                    )}
                    {leg.status === 'skipped_booked' && (
                      <p className="text-sm text-amber-600">Already booked separately</p>
                    )}
                  </div>
                </div>
                {flight && (
                  <span className="font-medium text-slate-900 dark:text-white">${flight.priceUsd}</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Budget summary */}
      <Card className={remaining >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Budget Summary</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ${spent.toLocaleString()} of ${basics.totalBudgetUsd.toLocaleString()} spent
            </p>
          </div>
          <div className="text-right">
            <p className={clsx('text-2xl font-bold', remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              ${Math.abs(remaining).toLocaleString()}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {remaining >= 0 ? 'under budget' : 'over budget'}
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Save Your Trip</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Download or share your complete itinerary</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
