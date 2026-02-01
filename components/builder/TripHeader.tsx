'use client';

import { useState, useRef, useEffect } from 'react';
import { useTripStoreV2 } from '@/stores/tripStoreV2';
import {
  Share2,
  Settings,
  ChevronLeft,
  Check,
  Copy,
  Download,
  Calendar,
  MapPin,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function TripHeader() {
  const { trip, setBasics, resetTrip } = useTripStoreV2();
  const { destinations, basics } = trip;
  const router = useRouter();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tripName, setTripName] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate trip name from destinations
  const defaultTripName = destinations.length > 0
    ? destinations.length === 1
      ? `${destinations[0].place.name} Trip`
      : `${destinations[0].place.name} & ${destinations.length > 2 ? `${destinations.length - 1} more` : destinations[1].place.name} Trip`
    : 'My Trip';

  useEffect(() => {
    setTripName(defaultTripName);
  }, [defaultTripName]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  // Format date range
  const dateRange = basics.startDate && basics.endDate
    ? `${format(new Date(basics.startDate), 'MMM d')} - ${format(new Date(basics.endDate), 'MMM d, yyyy')}`
    : 'Dates not set';

  // Total nights
  const totalNights = destinations.reduce((sum, d) => sum + d.nights, 0);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleExportPDF = () => {
    // In production, this would generate a PDF
    console.log('Exporting PDF...');
    setShowShareMenu(false);
  };

  return (
    <div className="h-14 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-4 flex items-center justify-between flex-shrink-0 transition-colors duration-300">
      {/* Left section - Back & Trip name */}
      <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-1">
        <a
          href="/plan/start"
          className="p-2 -ml-1 sm:-ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>

        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                setIsEditingName(false);
              }
            }}
            className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white bg-transparent border-b-2 border-primary-500 outline-none px-1 min-w-0"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
          >
            {tripName}
          </button>
        )}
      </div>

      {/* Center section - Trip info (hidden on mobile) */}
      <div className="hidden lg:flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>{dateRange}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          <span>
            {destinations.length} {destinations.length === 1 ? 'destination' : 'destinations'}
          </span>
        </div>
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
          {totalNights} nights
        </span>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Share button */}
        <div className="relative">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          {showShareMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowShareMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {copySuccess ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copySuccess ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </>
          )}
        </div>

        {/* Settings button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowSettings(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl z-50 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Trip Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Default transport mode
                </label>
                <div className="flex gap-2">
                  {(['walking', 'driving', 'transit'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBasics({ transportMode: mode })}
                      className={clsx(
                        'flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors capitalize',
                        basics.transportMode === mode
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Trip pace
                </label>
                <div className="flex gap-2">
                  {(['chill', 'balanced', 'packed'] as const).map((pace) => (
                    <button
                      key={pace}
                      onClick={() => setBasics({ pace })}
                      className={clsx(
                        'flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors capitalize',
                        basics.pace === pace
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                      )}
                    >
                      {pace}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-6 w-full py-2 px-4 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              Done
            </button>

            {/* Reset Trip */}
            <button
              onClick={() => {
                if (confirm('This will clear all trip data and start fresh. Are you sure?')) {
                  resetTrip();
                  setShowSettings(false);
                  router.push('/plan/start');
                }
              }}
              className="mt-3 w-full py-2 px-4 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Reset Trip & Start Over
            </button>
          </div>
        </>
      )}
    </div>
  );
}
