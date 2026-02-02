'use client';

import { useState, useEffect } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Users, Plus, Minus, Baby } from 'lucide-react';
import clsx from 'clsx';

export default function PartyStep() {
  const { preferences, setParty } = useQuickPlanStore();
  const [adults, setAdults] = useState(preferences.adults || 2);
  const [children, setChildren] = useState(preferences.children || 0);
  const [childAges, setChildAges] = useState<number[]>(preferences.childAges || []);

  useEffect(() => {
    setParty(adults, children, childAges);
  }, [adults, children, childAges, setParty]);

  const adjustAdults = (delta: number) => {
    const newValue = Math.max(1, Math.min(10, adults + delta));
    setAdults(newValue);
  };

  const adjustChildren = (delta: number) => {
    const newValue = Math.max(0, Math.min(8, children + delta));
    setChildren(newValue);

    // Adjust child ages array
    if (delta > 0) {
      setChildAges([...childAges, 5]); // Default age 5
    } else if (delta < 0) {
      setChildAges(childAges.slice(0, -1));
    }
  };

  const updateChildAge = (index: number, age: number) => {
    const newAges = [...childAges];
    newAges[index] = age;
    setChildAges(newAges);
  };

  return (
    <div className="space-y-8">
      {/* Adults */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Adults</p>
            <p className="text-sm text-slate-500">Ages 18+</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => adjustAdults(-1)}
            disabled={adults <= 1}
            className={clsx(
              'w-10 h-10 rounded-full border flex items-center justify-center transition-colors',
              adults <= 1
                ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                : 'border-slate-300 text-slate-600 hover:border-orange-500 hover:text-orange-600'
            )}
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="text-2xl font-semibold w-8 text-center">{adults}</span>
          <button
            onClick={() => adjustAdults(1)}
            disabled={adults >= 10}
            className={clsx(
              'w-10 h-10 rounded-full border flex items-center justify-center transition-colors',
              adults >= 10
                ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                : 'border-slate-300 text-slate-600 hover:border-orange-500 hover:text-orange-600'
            )}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Children */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <Baby className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Children</p>
              <p className="text-sm text-slate-500">Under 18</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => adjustChildren(-1)}
              disabled={children <= 0}
              className={clsx(
                'w-10 h-10 rounded-full border flex items-center justify-center transition-colors',
                children <= 0
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'border-slate-300 text-slate-600 hover:border-orange-500 hover:text-orange-600'
              )}
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-2xl font-semibold w-8 text-center">{children}</span>
            <button
              onClick={() => adjustChildren(1)}
              disabled={children >= 8}
              className={clsx(
                'w-10 h-10 rounded-full border flex items-center justify-center transition-colors',
                children >= 8
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'border-slate-300 text-slate-600 hover:border-orange-500 hover:text-orange-600'
              )}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Child ages */}
        {children > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-3">
              How old are the children?
            </p>
            <div className="flex flex-wrap gap-3">
              {childAges.map((age, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Child {index + 1}:</span>
                  <select
                    value={age}
                    onChange={(e) => updateChildAge(index, parseInt(e.target.value))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {[...Array(18)].map((_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? 'Under 1' : `${i} years`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
        <p className="text-sm text-orange-800">
          <strong>
            {adults} adult{adults !== 1 ? 's' : ''}
            {children > 0 && `, ${children} child${children !== 1 ? 'ren' : ''}`}
          </strong>
          {children > 0 && childAges.length > 0 && (
            <span className="text-orange-600">
              {' '}
              (ages {childAges.join(', ')})
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
