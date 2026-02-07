'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import clsx from 'clsx';
import {
  toDateString,
  toDate,
  formatDate,
  getNights,
  isBefore,
  getToday,
  addDays,
  MONTH_NAMES,
  DAY_NAMES_SHORT,
} from '@/lib/date-utils';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (startDate: string | null, endDate: string | null) => void;
  minDate?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate,
}: DateRangePickerProps) {
  const today = getToday();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const start = toDate(startDate);
    if (start) {
      return new Date(start.getFullYear(), start.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [isOpen, setIsOpen] = useState(false);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Escape key to close and focus trap for the calendar dialog
  useEffect(() => {
    if (!isOpen) return;
    const calendar = calendarRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      if (e.key === 'Tab' && calendar) {
        const focusable = calendar.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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
    const dateStr = toDateString(date);
    if (!dateStr) return;

    // Check if date is before minimum
    if (minDate && dateStr < minDate) return;

    // Check if date is in the past
    if (isBefore(date, today)) return;

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
    const dateStr = toDateString(date);
    return dateStr !== null && dateStr > startDate && dateStr < endDate;
  };

  const isStartDate = (date: Date) => {
    if (!startDate) return false;
    return toDateString(date) === startDate;
  };

  const isEndDate = (date: Date) => {
    if (!endDate) return false;
    return toDateString(date) === endDate;
  };

  const isDisabled = (date: Date) => {
    if (isBefore(date, today)) return true;
    const dateStr = toDateString(date);
    if (minDate && dateStr && dateStr < minDate) return true;
    return false;
  };

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return formatDate(dateStr, 'medium');
  };

  const nights = startDate && endDate ? getNights(startDate, endDate) : null;

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-orange-300 dark:hover:border-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 w-full text-left"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={startDate && endDate ? `Selected dates: ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}. Click to change` : 'Select travel dates'}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <span>Start Date</span>
          </div>
          <p className={clsx(
            'font-medium',
            startDate ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
          )}>
            {startDate ? formatDisplayDate(startDate) : 'Select date'}
          </p>
        </div>

        <div className="h-12 w-px bg-slate-200 dark:bg-slate-600" aria-hidden="true" />

        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <span>End Date</span>
          </div>
          <p className={clsx(
            'font-medium',
            endDate ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
          )}>
            {endDate ? formatDisplayDate(endDate) : 'Select date'}
          </p>
        </div>

        {nights !== null && nights > 0 && (
          <>
            <div className="h-12 w-px bg-slate-200 dark:bg-slate-600" aria-hidden="true" />
            <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" aria-hidden="true">{nights}</p>
              <p className="text-xs text-orange-500 dark:text-orange-400" aria-hidden="true">nights</p>
              <span className="sr-only">{nights} nights selected</span>
            </div>
          </>
        )}

        {/* Show hint when dates not selected */}
        {!startDate && !endDate && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <span>Click to select</span>
          </div>
        )}
      </button>

      {/* Calendar Dropdown - centered modal for better visibility */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar - centered modal */}
          <div
            ref={calendarRef}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50 max-h-[80vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Select travel dates"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" aria-hidden="true" />
              </button>
              <h3 className="font-semibold text-slate-900 dark:text-white" aria-live="polite">
                {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" aria-hidden="true" />
              </button>
            </div>

            {/* Instruction with validation hint */}
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-4">
              {!startDate
                ? 'Select your start date'
                : selectingEnd
                ? 'Now select your end date'
                : 'Click to change dates'}
            </p>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2" role="row" aria-hidden="true">
              {DAY_NAMES_SHORT.map((day) => (
                <div
                  key={day}
                  className="h-8 flex items-center justify-center text-xs font-medium text-slate-500 dark:text-slate-400"
                  aria-label={day}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar days">
              {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                const isStart = isStartDate(date);
                const isEnd = isEndDate(date);
                const isInRange = isDateInRange(date);
                const disabled = isDisabled(date);
                const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => !disabled && handleDateClick(date)}
                    disabled={disabled}
                    role="gridcell"
                    aria-selected={isStart || isEnd}
                    aria-label={`${dateLabel}${isStart ? ', start date' : ''}${isEnd ? ', end date' : ''}${disabled ? ', unavailable' : ''}`}
                    className={clsx(
                      'h-11 flex items-center justify-center text-sm rounded-lg transition-all relative focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset',
                      !isCurrentMonth && 'text-slate-300 dark:text-slate-600',
                      isCurrentMonth && !disabled && 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700',
                      disabled && 'text-slate-300 dark:text-slate-600 cursor-not-allowed',
                      isStart && 'bg-orange-500 text-white hover:bg-orange-600 rounded-r-none',
                      isEnd && 'bg-orange-500 text-white hover:bg-orange-600 rounded-l-none',
                      isInRange && 'bg-orange-100 dark:bg-orange-900/30 rounded-none',
                      (isStart && isEnd) && 'rounded-lg',
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Quick select */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Quick select:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1 Week', days: 7 },
                  { label: '10 Days', days: 10 },
                  { label: '2 Weeks', days: 14 },
                  { label: '3 Weeks', days: 21 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      let start = toDate(startDate) || new Date();
                      if (isBefore(start, today)) {
                        start = today;
                      }

                      const end = addDays(start, days);
                      if (!end) return;

                      const startStr = toDateString(start);
                      const endStr = toDateString(end);
                      if (!startStr || !endStr) return;

                      onChange(startStr, endStr);
                      setSelectingEnd(false);
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full text-slate-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                    aria-label={`Select ${label} trip duration`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear button */}
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  onChange(null, null);
                  setSelectingEnd(false);
                }}
                className="mt-3 w-full py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg"
                aria-label="Clear selected dates"
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
