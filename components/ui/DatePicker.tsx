'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import {
  toDate,
  toDateString,
  formatDate,
  addDays as addDaysUtil,
  isBefore as isBeforeUtil,
  startOfDay as startOfDayUtil,
  getToday,
  isSameDay,
  MONTH_NAMES,
} from '@/lib/date-utils';

interface DatePickerProps {
  label?: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  minDate?: Date;
  className?: string;
}

export default function DatePicker({
  label,
  startDate: startDateProp,
  endDate: endDateProp,
  onStartDateChange,
  onEndDateChange,
  minDate = new Date(),
  className,
}: DatePickerProps) {
  const startDate = toDate(startDateProp);
  const endDate = toDate(endDateProp);

  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startDate || new Date());
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

  // Close calendar when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    1
  ).getDay();

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      day,
      12, 0, 0 // Set to noon to avoid timezone issues
    );

    // Don't allow selecting dates before minDate
    const minDateStart = startOfDayUtil(minDate);
    if (minDateStart && isBeforeUtil(selectedDate, minDateStart)) return;

    if (!selectingEnd || !startDate) {
      // First click - set start date
      onStartDateChange(selectedDate);
      onEndDateChange(null);
      setSelectingEnd(true);
    } else {
      // Second click - set end date
      if (isBeforeUtil(selectedDate, startDate)) {
        // If clicked date is before start, make it the new start
        onStartDateChange(selectedDate);
        onEndDateChange(null);
      } else {
        // Set as end date and close
        onEndDateChange(selectedDate);
        setSelectingEnd(false);
        setIsOpen(false);
      }
    }
  };

  const isInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day, 12, 0, 0);
    return date > startDate && date < endDate;
  };

  const isSelected = (day: number) => {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day, 12, 0, 0);
    const dateStr = toDateString(date);
    const startStr = toDateString(startDate);
    const endStr = toDateString(endDate);
    return dateStr === startStr || dateStr === endStr;
  };

  const isDisabled = (day: number) => {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day, 12, 0, 0);
    const minDateStart = startOfDayUtil(minDate);
    return minDateStart ? isBeforeUtil(date, minDateStart) : false;
  };

  const handleQuickSelect = (days: number) => {
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    const end = addDaysUtil(start, days);
    if (!end) return;
    onStartDateChange(start);
    onEndDateChange(end);
    setSelectingEnd(false);
    setIsOpen(false);
  };

  return (
    <div className={clsx('relative', className)}>
      {label && <label className="label">{label}</label>}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input flex items-center justify-between w-full text-left"
        aria-label={startDate && endDate ? `Selected dates: ${formatDate(startDate, 'short')} to ${formatDate(endDate, 'full')}. Click to change` : 'Open date picker'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className={clsx(!startDate && 'text-reddit-gray-400 dark:text-slate-500')}>
          {startDate
            ? endDate
              ? `${formatDate(startDate, 'short')} - ${formatDate(endDate, 'full')}`
              : `${formatDate(startDate, 'full')} - Select end date`
            : 'Select dates'}
        </span>
        <Calendar className="w-5 h-5 text-reddit-gray-400 dark:text-slate-500" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          ref={calendarRef}
          className="absolute z-50 mt-2 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-reddit-gray-200 dark:border-slate-700 min-w-[320px]"
          role="dialog"
          aria-modal="true"
          aria-label="Date picker calendar"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() =>
                setViewMonth(
                  new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1)
                )
              }
              className="p-2 hover:bg-reddit-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-reddit"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <span className="font-semibold text-slate-900 dark:text-white" aria-live="polite">
              {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() =>
                setViewMonth(
                  new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1)
                )
              }
              className="p-2 hover:bg-reddit-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-reddit"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Instruction text */}
          <div className="text-xs text-center text-reddit-gray-500 dark:text-slate-400 mb-3">
            {!startDate
              ? 'Select your start date'
              : selectingEnd
              ? 'Now select your end date'
              : 'Click to change dates'}
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div
                key={day}
                className="w-10 h-8 flex items-center justify-center text-xs font-medium text-reddit-gray-500 dark:text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar days">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="w-10 h-10" role="gridcell" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const disabled = isDisabled(day);
              const selected = isSelected(day);
              const inRange = isInRange(day);
              const currentDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day, 12, 0, 0);
              const dateLabel = formatDate(currentDate, 'long');

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDateClick(day)}
                  aria-label={`${dateLabel}${selected ? ', selected' : ''}${disabled ? ', unavailable' : ''}`}
                  aria-selected={selected || undefined}
                  role="gridcell"
                  className={clsx(
                    'w-10 h-10 flex items-center justify-center rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-reddit focus:ring-inset',
                    disabled && 'text-reddit-gray-300 dark:text-slate-600 cursor-not-allowed',
                    !disabled && !selected && 'text-slate-700 dark:text-slate-200 hover:bg-primary-100 dark:hover:bg-slate-700 cursor-pointer',
                    selected && 'bg-primary-500 text-white font-medium',
                    inRange && !selected && 'bg-primary-50 dark:bg-orange-900/30'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick selections */}
          <div className="mt-4 pt-4 border-t border-reddit-gray-100 dark:border-slate-700">
            <div className="text-xs text-reddit-gray-500 dark:text-slate-400 mb-2">Quick select:</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect(7)}
                className="text-xs px-3 py-1.5 bg-reddit-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-reddit-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-reddit"
              >
                1 week
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(14)}
                className="text-xs px-3 py-1.5 bg-reddit-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-reddit-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-reddit"
              >
                2 weeks
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(30)}
                className="text-xs px-3 py-1.5 bg-reddit-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-reddit-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-reddit"
              >
                1 month
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full text-center text-sm text-reddit-gray-500 dark:text-slate-400 hover:text-reddit-gray-600 dark:hover:text-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-reddit py-1"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
