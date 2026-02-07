'use client';

import { forwardRef, InputHTMLAttributes, useId } from 'react';
import clsx from 'clsx';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  icon?: React.ReactNode;
  value: number;
  showValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  formatValue?: (value: number) => string;
  /** Accessible label for screen readers (required if no visible label) */
  'aria-label'?: string;
  /** Error message to display */
  error?: string | null;
  /** Helper text below the slider */
  helperText?: string;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      label,
      icon,
      value,
      showValue = true,
      valuePrefix = '',
      valueSuffix = '%',
      formatValue,
      min = 0,
      max = 100,
      error,
      helperText,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const percentage = ((value - Number(min)) / (Number(max) - Number(min))) * 100;

    const displayValue = formatValue
      ? formatValue(value)
      : `${valuePrefix}${value}${valueSuffix}`;

    // Use provided id or generate one
    const sliderId = props.id || generatedId;
    const errorId = error ? `${sliderId}-error` : undefined;
    const helperId = helperText ? `${sliderId}-helper` : undefined;

    return (
      <div className={clsx('w-full', className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {icon && <span className="text-lg" aria-hidden="true">{icon}</span>}
              {label && (
                <label
                  htmlFor={sliderId}
                  className={clsx(
                    'text-sm font-medium',
                    error
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-700 dark:text-slate-300'
                  )}
                >
                  {label}
                </label>
              )}
            </div>
            {showValue && (
              <span
                className={clsx(
                  'text-sm font-semibold',
                  error
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-orange-600 dark:text-orange-400'
                )}
                aria-hidden="true"
              >
                {displayValue}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          <div
            className={clsx(
              'h-3 rounded-full transition-colors',
              error
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-slate-200 dark:bg-slate-700'
            )}
            aria-hidden="true"
          >
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-150',
                error
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-orange-500 to-amber-500'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            ref={ref}
            id={sliderId}
            type="range"
            value={value}
            min={min}
            max={max}
            aria-valuemin={Number(min)}
            aria-valuemax={Number(max)}
            aria-valuenow={value}
            aria-valuetext={displayValue}
            aria-invalid={!!error}
            aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:outline-none peer"
            {...props}
          />
          <div
            className={clsx(
              'absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-200 rounded-full shadow-lg pointer-events-none transition-all duration-150',
              error
                ? 'border-2 border-red-500'
                : 'border-2 border-orange-500',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-900'
            )}
            style={{ left: `calc(${percentage}% - 12px)` }}
            aria-hidden="true"
          />
        </div>

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {/* Helper text (only show when no error) */}
        {helperText && !error && (
          <p
            id={helperId}
            className="mt-1 text-xs text-slate-500 dark:text-slate-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export default Slider;
