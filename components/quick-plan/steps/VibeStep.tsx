'use client';

import { useState, useEffect } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Sparkles, Ban, Heart } from 'lucide-react';
import clsx from 'clsx';

const PACE_OPTIONS = [
  { value: 'chill', label: 'Chill', description: '1-2 activities/day, lots of downtime' },
  { value: 'balanced', label: 'Balanced', description: '2-3 activities/day with breaks' },
  { value: 'packed', label: 'Packed', description: '3-4 activities/day, maximize experiences' },
];

const VIBE_OPTIONS = [
  'Relaxed & peaceful',
  'Lively & social',
  'Adventurous',
  'Romantic',
  'Family-friendly',
  'Luxury',
  'Authentic local',
  'Nature-focused',
];

const COMMON_HARD_NOS = [
  'Long drives (>2 hrs)',
  'Crowded tourist areas',
  'Party atmosphere',
  'Early wake-ups',
  'Extreme heat',
  'Shared accommodations',
  'Unpaved roads',
  'Limited food options',
];

export default function VibeStep() {
  const { preferences, setPace, setVibeAndHardNos } = useQuickPlanStore();
  const [pace, setPaceLocal] = useState(preferences.pace || 'balanced');
  const [selectedVibes, setSelectedVibes] = useState<string[]>(preferences.hotelVibePreferences || []);
  const [hardNos, setHardNos] = useState<string[]>(preferences.hardNos || []);
  const [customMustDo, setCustomMustDo] = useState('');
  const [customHardNo, setCustomHardNo] = useState('');

  useEffect(() => {
    setPace(pace as 'chill' | 'balanced' | 'packed');
    setVibeAndHardNos(preferences.mustDos, hardNos, selectedVibes);
  }, [pace, selectedVibes, hardNos, setPace, setVibeAndHardNos, preferences.mustDos]);

  const toggleVibe = (vibe: string) => {
    setSelectedVibes(prev =>
      prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );
  };

  const toggleHardNo = (item: string) => {
    setHardNos(prev =>
      prev.includes(item) ? prev.filter(n => n !== item) : [...prev, item]
    );
  };

  const addCustomHardNo = () => {
    if (customHardNo.trim() && !hardNos.includes(customHardNo.trim())) {
      setHardNos([...hardNos, customHardNo.trim()]);
      setCustomHardNo('');
    }
  };

  return (
    <div className="space-y-8">
      {/* Pace selection */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Trip pace
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {PACE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPaceLocal(option.value as 'chill' | 'balanced' | 'packed')}
              className={clsx(
                'p-4 rounded-xl border transition-all text-left',
                pace === option.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-orange-300'
              )}
            >
              <p className={clsx('font-medium', pace === option.value ? 'text-orange-700' : 'text-slate-700')}>
                {option.label}
              </p>
              <p className="text-xs text-slate-500 mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Vibe preferences */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4" />
          What vibe are you looking for?
        </h3>
        <div className="flex flex-wrap gap-2">
          {VIBE_OPTIONS.map((vibe) => (
            <button
              key={vibe}
              onClick={() => toggleVibe(vibe)}
              className={clsx(
                'px-4 py-2 rounded-full border transition-all text-sm',
                selectedVibes.includes(vibe)
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 hover:border-orange-300 text-slate-600'
              )}
            >
              {vibe}
            </button>
          ))}
        </div>
      </div>

      {/* Hard nos */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
          <Ban className="w-4 h-4" />
          Dealbreakers (things to avoid)
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_HARD_NOS.map((item) => (
            <button
              key={item}
              onClick={() => toggleHardNo(item)}
              className={clsx(
                'px-4 py-2 rounded-full border transition-all text-sm',
                hardNos.includes(item)
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 hover:border-red-300 text-slate-600'
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customHardNo}
            onChange={(e) => setCustomHardNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomHardNo()}
            placeholder="Add custom dealbreaker..."
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={addCustomHardNo}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm">
        <p className="text-orange-800">
          <strong>Your vibe:</strong> {pace} pace
          {selectedVibes.length > 0 && `, ${selectedVibes.join(', ')}`}
        </p>
        {hardNos.length > 0 && (
          <p className="text-red-700 mt-1">
            <strong>Avoiding:</strong> {hardNos.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
