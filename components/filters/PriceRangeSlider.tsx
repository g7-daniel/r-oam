'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign } from 'lucide-react';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: { min: number; max: number } | null;
  onChange: (range: { min: number; max: number } | null) => void;
  step?: number;
  formatValue?: (value: number) => string;
  label?: string;
}

export default function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 50,
  formatValue = (v) => `$${v.toLocaleString()}`,
  label = 'Price Range',
}: PriceRangeSliderProps) {
  const [localMin, setLocalMin] = useState(value?.min ?? min);
  const [localMax, setLocalMax] = useState(value?.max ?? max);

  useEffect(() => {
    setLocalMin(value?.min ?? min);
    setLocalMax(value?.max ?? max);
  }, [value, min, max]);

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newMin = Math.min(parseInt(e.target.value, 10), localMax - step);
      setLocalMin(newMin);
    },
    [localMax, step]
  );

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newMax = Math.max(parseInt(e.target.value, 10), localMin + step);
      setLocalMax(newMax);
    },
    [localMin, step]
  );

  const handleMouseUp = useCallback(() => {
    if (localMin === min && localMax === max) {
      onChange(null);
    } else {
      onChange({ min: localMin, max: localMax });
    }
  }, [localMin, localMax, min, max, onChange]);

  const handleReset = () => {
    setLocalMin(min);
    setLocalMax(max);
    onChange(null);
  };

  const minPercent = ((localMin - min) / (max - min)) * 100;
  const maxPercent = ((localMax - min) / (max - min)) * 100;

  const isFiltered = value !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <DollarSign className="w-4 h-4" />
          {label}
        </label>
        {isFiltered && (
          <button
            onClick={handleReset}
            className="text-xs text-sky-600 hover:text-sky-700"
          >
            Reset
          </button>
        )}
      </div>

      {/* Value Display */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{formatValue(localMin)}</span>
        <span className="text-slate-400">to</span>
        <span className="font-medium text-slate-700">{formatValue(localMax)}</span>
      </div>

      {/* Dual Range Slider */}
      <div className="relative h-2 mt-4">
        {/* Track */}
        <div className="absolute inset-0 bg-slate-200 rounded-full" />

        {/* Selected Range */}
        <div
          className="absolute h-full bg-sky-500 rounded-full"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />

        {/* Min Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={handleMinChange}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          className="absolute w-full h-full opacity-0 cursor-pointer pointer-events-auto"
          style={{ zIndex: localMin > max - 10 ? 5 : 3 }}
        />

        {/* Max Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={handleMaxChange}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          className="absolute w-full h-full opacity-0 cursor-pointer pointer-events-auto"
          style={{ zIndex: 4 }}
        />

        {/* Thumb Indicators */}
        <div
          className="absolute w-4 h-4 -mt-1 bg-white border-2 border-sky-500 rounded-full shadow-md"
          style={{ left: `calc(${minPercent}% - 8px)` }}
        />
        <div
          className="absolute w-4 h-4 -mt-1 bg-white border-2 border-sky-500 rounded-full shadow-md"
          style={{ left: `calc(${maxPercent}% - 8px)` }}
        />
      </div>

      {/* Quick Presets */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => {
            setLocalMin(min);
            setLocalMax(Math.round(max * 0.3));
            onChange({ min, max: Math.round(max * 0.3) });
          }}
          className="px-3 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
        >
          Budget
        </button>
        <button
          onClick={() => {
            setLocalMin(Math.round(max * 0.3));
            setLocalMax(Math.round(max * 0.7));
            onChange({ min: Math.round(max * 0.3), max: Math.round(max * 0.7) });
          }}
          className="px-3 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
        >
          Mid-range
        </button>
        <button
          onClick={() => {
            setLocalMin(Math.round(max * 0.7));
            setLocalMax(max);
            onChange({ min: Math.round(max * 0.7), max });
          }}
          className="px-3 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
        >
          Luxury
        </button>
      </div>
    </div>
  );
}
