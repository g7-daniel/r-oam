'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  icon?: React.ReactNode;
  value: number;
  showValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  formatValue?: (value: number) => string;
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
      ...props
    },
    ref
  ) => {
    const percentage = ((value - Number(min)) / (Number(max) - Number(min))) * 100;

    const displayValue = formatValue
      ? formatValue(value)
      : `${valuePrefix}${value}${valueSuffix}`;

    return (
      <div className={clsx('w-full', className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {icon && <span className="text-lg">{icon}</span>}
              {label && (
                <span className="text-sm font-medium text-reddit-gray-600">{label}</span>
              )}
            </div>
            {showValue && (
              <span className="text-sm font-semibold text-primary-600">
                {displayValue}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          <div className="h-2 bg-reddit-gray-200 rounded-full">
            <div
              className="h-full bg-gradient-reddit rounded-full transition-all duration-150"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            ref={ref}
            type="range"
            value={value}
            min={min}
            max={max}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            {...props}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-reddit rounded-full shadow-md pointer-events-none transition-all duration-150"
            style={{ left: `calc(${percentage}% - 10px)` }}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export default Slider;
