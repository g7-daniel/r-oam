'use client';

import { useState } from 'react';
import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { ThumbsUp, ThumbsDown, MessageSquare, Check, Edit2, Download, Share2 } from 'lucide-react';
import clsx from 'clsx';

export default function SatisfactionStep() {
  const { itinerary, preferences, goToState, reset } = useQuickPlanStore();
  const [satisfaction, setSatisfaction] = useState<'yes' | 'no' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleSatisfied = () => {
    setSatisfaction('yes');
  };

  const handleNotSatisfied = () => {
    setSatisfaction('no');
  };

  const handleConfirm = () => {
    setIsConfirmed(true);
    // In a real implementation, this would save the itinerary to the database
  };

  const handleExport = () => {
    // Export itinerary as JSON or PDF
    if (itinerary) {
      const blob = new Blob([JSON.stringify(itinerary, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trip-${itinerary.id}.json`;
      a.click();
    }
  };

  if (isConfirmed) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Your trip is ready!
        </h2>
        <p className="text-slate-600 mb-8">
          Your {preferences.tripLength}-night trip to{' '}
          {preferences.destinationContext?.canonicalName} has been saved.
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:border-orange-500"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => {/* Share functionality */}}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:border-orange-500"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Plan Another Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-medium text-slate-900 mb-2">
          Does this itinerary match what you want?
        </h2>
        <p className="text-sm text-slate-500">
          I need your confirmation before we finalize this trip plan.
        </p>
      </div>

      {/* Satisfaction buttons */}
      {satisfaction === null && (
        <div className="flex justify-center gap-4">
          <button
            onClick={handleSatisfied}
            className="flex flex-col items-center gap-2 p-6 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
          >
            <ThumbsUp className="w-8 h-8 text-green-600" />
            <span className="font-medium text-slate-700">Yes, it's great!</span>
          </button>
          <button
            onClick={handleNotSatisfied}
            className="flex flex-col items-center gap-2 p-6 border-2 border-slate-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all"
          >
            <ThumbsDown className="w-8 h-8 text-orange-600" />
            <span className="font-medium text-slate-700">I want changes</span>
          </button>
        </div>
      )}

      {/* Satisfied flow */}
      {satisfaction === 'yes' && (
        <div className="text-center space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <ThumbsUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-green-900 mb-2">
              Excellent! I'm glad you like it.
            </h3>
            <p className="text-sm text-green-700">
              Click below to confirm and save your itinerary.
            </p>
          </div>

          <button
            onClick={handleConfirm}
            className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium"
          >
            Confirm & Save Trip
          </button>

          <button
            onClick={() => setSatisfaction(null)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Go back
          </button>
        </div>
      )}

      {/* Not satisfied flow */}
      {satisfaction === 'no' && (
        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <MessageSquare className="w-8 h-8 text-orange-600 mb-3" />
            <h3 className="font-medium text-orange-900 mb-2">
              What would you like to change?
            </h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell me what's not working and I'll help fix it..."
              className="w-full p-3 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => goToState('ACTIVITIES_PICK')}
              className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg text-sm hover:border-orange-500 justify-center"
            >
              <Edit2 className="w-4 h-4" />
              Change activities
            </button>
            <button
              onClick={() => goToState('HOTELS_SHORTLIST_AND_PICK')}
              className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg text-sm hover:border-orange-500 justify-center"
            >
              <Edit2 className="w-4 h-4" />
              Change hotels
            </button>
            <button
              onClick={() => goToState('AREA_SPLIT_SELECTION')}
              className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg text-sm hover:border-orange-500 justify-center"
            >
              <Edit2 className="w-4 h-4" />
              Change areas
            </button>
            <button
              onClick={() => goToState('DAILY_ITINERARY_BUILD')}
              className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg text-sm hover:border-orange-500 justify-center"
            >
              <Edit2 className="w-4 h-4" />
              Rebuild itinerary
            </button>
          </div>

          <button
            onClick={() => setSatisfaction(null)}
            className="w-full text-sm text-slate-500 hover:text-slate-700"
          >
            Actually, it's fine - go back
          </button>
        </div>
      )}
    </div>
  );
}
