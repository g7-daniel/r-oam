'use client';

import { useState } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Calendar, Clock } from 'lucide-react';
import clsx from 'clsx';

const TRIP_LENGTH_OPTIONS = [
  { nights: 4, label: 'Long weekend', description: '4 nights' },
  { nights: 7, label: 'One week', description: '7 nights' },
  { nights: 10, label: 'Extended', description: '10 nights' },
  { nights: 14, label: 'Two weeks', description: '14 nights' },
];

export default function DatesStep() {
  const { preferences, setDates } = useQuickPlanStore();
  const [mode, setMode] = useState<'flexible' | 'specific'>(
    preferences.startDate ? 'specific' : 'flexible'
  );
  const [selectedLength, setSelectedLength] = useState(preferences.tripLength || 7);
  const [startDate, setStartDate] = useState(
    preferences.startDate?.toISOString().split('T')[0] || ''
  );

  const handleLengthSelect = (nights: number) => {
    setSelectedLength(nights);
    if (mode === 'flexible') {
      setDates(null, null, nights);
    } else if (startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + nights);
      setDates(start, end, nights);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    setStartDate(dateStr);

    if (dateStr) {
      const start = new Date(dateStr);
      const end = new Date(start);
      end.setDate(end.getDate() + selectedLength);
      setDates(start, end, selectedLength);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setMode('flexible')}
          className={clsx(
            'flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all',
            mode === 'flexible'
              ? 'bg-white shadow text-orange-600'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Clock className="w-4 h-4 inline-block mr-2" />
          Flexible dates
        </button>
        <button
          onClick={() => setMode('specific')}
          className={clsx(
            'flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all',
            mode === 'specific'
              ? 'bg-white shadow text-orange-600'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Calendar className="w-4 h-4 inline-block mr-2" />
          Specific dates
        </button>
      </div>

      {/* Trip length selection */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">
          How long is your trip?
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TRIP_LENGTH_OPTIONS.map((option) => (
            <button
              key={option.nights}
              onClick={() => handleLengthSelect(option.nights)}
              className={clsx(
                'p-4 rounded-xl border transition-all text-left',
                selectedLength === option.nights
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-orange-300'
              )}
            >
              <p
                className={clsx(
                  'font-medium',
                  selectedLength === option.nights
                    ? 'text-orange-700'
                    : 'text-slate-700'
                )}
              >
                {option.label}
              </p>
              <p className="text-sm text-slate-500">{option.description}</p>
            </button>
          ))}
        </div>

        {/* Custom length input */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-slate-600">Or enter custom:</span>
          <input
            type="number"
            min={2}
            max={30}
            value={selectedLength}
            onChange={(e) => handleLengthSelect(parseInt(e.target.value) || 7)}
            className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <span className="text-sm text-slate-600">nights</span>
        </div>
      </div>

      {/* Specific dates input */}
      {mode === 'specific' && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            When does your trip start?
          </h3>
          <input
            type="date"
            value={startDate}
            onChange={handleDateChange}
            min={new Date().toISOString().split('T')[0]}
            className="w-full md:w-64 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {startDate && (
            <p className="mt-2 text-sm text-slate-500">
              Trip ends:{' '}
              {new Date(
                new Date(startDate).getTime() + selectedLength * 24 * 60 * 60 * 1000
              ).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
        <p className="text-sm text-orange-800">
          <strong>{selectedLength} nights</strong>
          {mode === 'specific' && startDate
            ? ` starting ${new Date(startDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}`
            : ' with flexible dates'}
        </p>
      </div>
    </div>
  );
}
