'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (startDate: string | null, endDate: string | null) => void;
  minDate?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate,
}: DateRangePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (startDate) {
      return new Date(startDate);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [isOpen, setIsOpen] = useState(false);
  const [selectingEnd, setSelectingEnd] = useState(false);

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Add days from previous month to fill the first week
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Add days from next month to complete the grid
    const endPadding = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];

    // Check if date is before minimum
    if (minDate && dateStr < minDate) return;

    // Check if date is in the past
    if (date < today) return;

    if (!selectingEnd || !startDate) {
      // Selecting start date
      onChange(dateStr, null);
      setSelectingEnd(true);
    } else {
      // Selecting end date
      if (dateStr < startDate) {
        // If selected date is before start, make it the new start
        onChange(dateStr, null);
      } else {
        onChange(startDate, dateStr);
        setSelectingEnd(false);
        setIsOpen(false);
      }
    }
  };

  const isDateInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr > startDate && dateStr < endDate;
  };

  const isStartDate = (date: Date) => {
    if (!startDate) return false;
    return date.toISOString().split('T')[0] === startDate;
  };

  const isEndDate = (date: Date) => {
    if (!endDate) return false;
    return date.toISOString().split('T')[0] === endDate;
  };

  const isDisabled = (date: Date) => {
    if (date < today) return true;
    if (minDate && date.toISOString().split('T')[0] < minDate) return true;
    return false;
  };

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTripDuration = () => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return nights;
  };

  const nights = getTripDuration();

  return (
    <div className="relative">
      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Calendar className="w-4 h-4" />
            <span>Start Date</span>
          </div>
          <p className={clsx(
            'font-medium',
            startDate ? 'text-slate-900' : 'text-slate-400'
          )}>
            {startDate ? formatDisplayDate(startDate) : 'Select date'}
          </p>
        </div>

        <div className="h-12 w-px bg-slate-200" />

        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Calendar className="w-4 h-4" />
            <span>End Date</span>
          </div>
          <p className={clsx(
            'font-medium',
            endDate ? 'text-slate-900' : 'text-slate-400'
          )}>
            {endDate ? formatDisplayDate(endDate) : 'Select date'}
          </p>
        </div>

        {nights !== null && (
          <>
            <div className="h-12 w-px bg-slate-200" />
            <div className="px-4 py-2 bg-primary-50 rounded-lg">
              <p className="text-2xl font-bold text-primary-600">{nights}</p>
              <p className="text-xs text-primary-500">nights</p>
            </div>
          </>
        )}
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h3 className="font-semibold text-slate-900">
                {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Instruction */}
            <p className="text-sm text-center text-slate-500 mb-4">
              {!startDate
                ? 'Select your start date'
                : selectingEnd
                ? 'Now select your end date'
                : 'Click to change dates'}
            </p>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="h-8 flex items-center justify-center text-xs font-medium text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                const isStart = isStartDate(date);
                const isEnd = isEndDate(date);
                const isInRange = isDateInRange(date);
                const disabled = isDisabled(date);

                return (
                  <button
                    key={idx}
                    onClick={() => !disabled && handleDateClick(date)}
                    disabled={disabled}
                    className={clsx(
                      'h-10 flex items-center justify-center text-sm rounded-lg transition-all relative',
                      !isCurrentMonth && 'text-slate-300',
                      isCurrentMonth && !disabled && 'text-slate-700 hover:bg-slate-100',
                      disabled && 'text-slate-300 cursor-not-allowed',
                      isStart && 'bg-primary-500 text-white hover:bg-primary-600 rounded-r-none',
                      isEnd && 'bg-primary-500 text-white hover:bg-primary-600 rounded-l-none',
                      isInRange && 'bg-primary-100 rounded-none',
                      (isStart && isEnd) && 'rounded-lg',
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Quick select */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Quick select:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1 Week', days: 7 },
                  { label: '10 Days', days: 10 },
                  { label: '2 Weeks', days: 14 },
                  { label: '3 Weeks', days: 21 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    onClick={() => {
                      const start = startDate ? new Date(startDate) : new Date();
                      start.setHours(0, 0, 0, 0);
                      if (start < today) start.setTime(today.getTime());

                      const end = new Date(start);
                      end.setDate(end.getDate() + days);

                      onChange(
                        start.toISOString().split('T')[0],
                        end.toISOString().split('T')[0]
                      );
                      setSelectingEnd(false);
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear button */}
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  onChange(null, null);
                  setSelectingEnd(false);
                }}
                className="mt-3 w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Clear dates
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
