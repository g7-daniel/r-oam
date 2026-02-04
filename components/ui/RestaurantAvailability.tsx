'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Check,
  Loader2,
  ExternalLink,
  Phone,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

interface TimeSlot {
  time: string;
  seating: 'inside' | 'outside' | 'bar' | 'patio';
  partySize: number;
  available: boolean;
}

interface RestaurantAvailabilityProps {
  restaurantName: string;
  destinationName: string;
  date: string;
  defaultPartySize: number;
  onBook: (slot: TimeSlot) => void;
  onAgentBook: (partySize: number, preferredTime: string) => void;
  onUserBook: () => void;
}

// Mock function to generate availability slots
function generateMockAvailability(partySize: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const seatings: ('inside' | 'outside' | 'bar' | 'patio')[] = ['inside', 'outside', 'bar', 'patio'];

  // Lunch slots
  ['12:00', '12:30', '13:00', '13:30'].forEach((time) => {
    const seating = seatings[Math.floor(Math.random() * 3)];
    slots.push({
      time,
      seating,
      partySize,
      available: Math.random() > 0.3,
    });
  });

  // Dinner slots
  ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'].forEach((time) => {
    const seating = seatings[Math.floor(Math.random() * 4)];
    slots.push({
      time,
      seating,
      partySize,
      available: Math.random() > 0.4,
    });
  });

  return slots.filter((s) => s.available);
}

const SEATING_LABELS: Record<string, string> = {
  inside: 'Indoor',
  outside: 'Outdoor',
  bar: 'Bar',
  patio: 'Patio',
};

export default function RestaurantAvailability({
  restaurantName,
  destinationName: _destinationName,
  date,
  defaultPartySize,
  onBook,
  onAgentBook,
  onUserBook,
}: RestaurantAvailabilityProps) {
  // destinationName is available for future use (e.g., location-based search)
  void _destinationName;
  const [partySize] = useState(defaultPartySize);
  const [additionalGuests, setAdditionalGuests] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  // bookingStatus will be used when actual booking API is integrated
  const [, setBookingStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'booked'>('idle');
  const [preferredTime, setPreferredTime] = useState('19:00');

  const totalPartySize = partySize + additionalGuests;

  // Simulate checking availability
  useEffect(() => {
    setIsLoading(true);
    setBookingStatus('checking');

    // Simulate API call
    const timer = setTimeout(() => {
      const mockSlots = generateMockAvailability(totalPartySize);
      setSlots(mockSlots);
      setIsLoading(false);
      setBookingStatus(mockSlots.length > 0 ? 'available' : 'unavailable');
    }, 1500);

    return () => clearTimeout(timer);
  }, [totalPartySize, date]);

  const handleBookSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setBookingStatus('booked');
    onBook(slot);
  };

  const handleAgentBooking = () => {
    onAgentBook(totalPartySize, preferredTime);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Check Availability
        </h3>
        <p className="text-sm text-white/80 mt-1">{restaurantName}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Party size */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Party Size
          </label>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg flex-1">
              <Users className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-sm text-slate-500">Travelers</p>
                <p className="font-medium">{partySize}</p>
              </div>
            </div>
            <div className="text-slate-300">+</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Users className="w-5 h-5 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Extra Guests</p>
                  <select
                    value={additionalGuests}
                    onChange={(e) => setAdditionalGuests(parseInt(e.target.value))}
                    className="font-medium bg-transparent focus:outline-none"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Total: {totalPartySize} {totalPartySize === 1 ? 'person' : 'people'}
          </p>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
          <Calendar className="w-5 h-5 text-slate-500" />
          <div>
            <p className="text-sm text-slate-500">Date</p>
            <p className="font-medium">
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto text-primary-500 animate-spin mb-3" />
            <p className="text-slate-500">Checking availability...</p>
          </div>
        )}

        {/* Available slots */}
        {!isLoading && slots.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">
              Available Tables
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {slots.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => handleBookSlot(slot)}
                  className={clsx(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    selectedSlot === slot
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-primary-300 bg-white'
                  )}
                >
                  <p className="font-semibold text-slate-900">{formatTime(slot.time)}</p>
                  <p className="text-sm text-slate-500">
                    {SEATING_LABELS[slot.seating]} • {slot.partySize} guests
                  </p>
                  {selectedSlot === slot && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-600 font-medium">
                      <Check className="w-3 h-3" />
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No availability */}
        {!isLoading && slots.length === 0 && (
          <div className="py-6 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
            <p className="text-slate-700 font-medium mb-2">No online availability found</p>
            <p className="text-sm text-slate-500 mb-4">
              The restaurant may not have online booking or all tables are booked.
            </p>
          </div>
        )}

        {/* Booking options */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          {selectedSlot ? (
            <button
              onClick={() => onBook(selectedSlot)}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-5 h-5" />
              Confirm {formatTime(selectedSlot.time)} Reservation
            </button>
          ) : (
            <>
              {/* Preferred time for agent booking */}
              <div>
                <label className="text-sm text-slate-600 mb-1 block">
                  Preferred time (for agent booking)
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="12:00">12:00 PM (Lunch)</option>
                  <option value="13:00">1:00 PM (Lunch)</option>
                  <option value="18:00">6:00 PM (Early Dinner)</option>
                  <option value="19:00">7:00 PM (Dinner)</option>
                  <option value="20:00">8:00 PM (Dinner)</option>
                  <option value="21:00">9:00 PM (Late Dinner)</option>
                </select>
              </div>

              <button
                onClick={handleAgentBooking}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-5 h-5" />
                Have Agent Call to Book
              </button>

              <button
                onClick={onUserBook}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                I'll Book It Myself
              </button>

              <p className="text-xs text-center text-slate-400">
                Agent booking: We'll call the restaurant and confirm your reservation
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
