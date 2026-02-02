'use client';

import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { Lock, Check, Edit2, MapPin, Calendar, Users, DollarSign, Activity, Map } from 'lucide-react';
import clsx from 'clsx';

export default function PreferencesLockStep() {
  const { preferences, lockPreferences, unlockPreferences, goToState } = useQuickPlanStore();

  const sections = [
    {
      icon: MapPin,
      title: 'Destination',
      value: preferences.destinationContext?.canonicalName || 'Not set',
      state: 'DESTINATION' as const,
    },
    {
      icon: Calendar,
      title: 'Trip Length',
      value: `${preferences.tripLength} nights${preferences.startDate ? ` starting ${preferences.startDate.toLocaleDateString()}` : ''}`,
      state: 'DATES_OR_LENGTH' as const,
    },
    {
      icon: Users,
      title: 'Travelers',
      value: `${preferences.adults} adult${preferences.adults !== 1 ? 's' : ''}${preferences.children > 0 ? `, ${preferences.children} child${preferences.children !== 1 ? 'ren' : ''}` : ''}`,
      state: 'PARTY' as const,
    },
    {
      icon: DollarSign,
      title: 'Budget',
      value: `$${preferences.budgetPerNight.min}-${preferences.budgetPerNight.max}/night`,
      state: 'BUDGET' as const,
    },
    {
      icon: Activity,
      title: 'Activities',
      value: preferences.selectedActivities.length > 0
        ? preferences.selectedActivities.map(a => a.type.replace('_', ' ')).join(', ')
        : 'None selected',
      state: 'ACTIVITIES_PICK' as const,
    },
    {
      icon: Map,
      title: 'Itinerary',
      value: preferences.selectedSplit?.description || 'Not configured',
      state: 'AREA_SPLIT_SELECTION' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-900">Review & Lock Preferences</h3>
            <p className="text-sm text-orange-700 mt-1">
              Please confirm these details are correct before I start building your itinerary.
              Once locked, you'll need to unlock to make changes.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <Icon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{section.title}</p>
                  <p className="font-medium text-slate-900">{section.value}</p>
                </div>
              </div>
              {!preferences.preferencesLocked && (
                <button
                  onClick={() => goToState(section.state)}
                  className="p-2 text-slate-400 hover:text-orange-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Lock/Unlock button */}
      <div className="flex justify-center pt-4">
        {preferences.preferencesLocked ? (
          <button
            onClick={unlockPreferences}
            className="flex items-center gap-2 px-6 py-3 border border-slate-300 rounded-xl text-slate-700 hover:border-orange-500 hover:text-orange-600 transition-all"
          >
            <Edit2 className="w-5 h-5" />
            Unlock to Edit
          </button>
        ) : (
          <button
            onClick={lockPreferences}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all"
          >
            <Lock className="w-5 h-5" />
            Lock & Continue
          </button>
        )}
      </div>

      {preferences.preferencesLocked && (
        <div className="flex items-center justify-center gap-2 text-green-600">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">Preferences locked</span>
        </div>
      )}
    </div>
  );
}
