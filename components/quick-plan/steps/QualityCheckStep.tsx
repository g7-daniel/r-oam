'use client';

import { useQuickPlanStore } from '@/lib/quick-plan/store';
import { CheckCircle, AlertCircle, Info, Check, X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export default function QualityCheckStep() {
  const { qualityCheckResult, goToNextState, goToPreviousState } = useQuickPlanStore();

  if (!qualityCheckResult) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No quality check results available</p>
        <button
          onClick={goToPreviousState}
          className="mt-4 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:border-orange-500"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { passed, checks, criticalFailures, warnings: warningsList } = qualityCheckResult;

  // Derive severity from check results
  const errors = criticalFailures || [];
  const warnings = warningsList || [];
  const infos = checks.filter((c) => c.passed).map(c => c.name);
  const score = checks.length > 0 ? Math.round((checks.filter(c => c.passed).length / checks.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Overall status */}
      <div
        className={clsx(
          'p-6 rounded-xl text-center',
          passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        )}
      >
        <div
          className={clsx(
            'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
            passed ? 'bg-green-100' : 'bg-red-100'
          )}
        >
          {passed ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-600" />
          )}
        </div>
        <h2
          className={clsx(
            'text-lg font-medium',
            passed ? 'text-green-900' : 'text-red-900'
          )}
        >
          Quality Score: {score}/100
        </h2>
        <p
          className={clsx(
            'text-sm mt-2',
            passed ? 'text-green-700' : 'text-red-700'
          )}
        >
          {passed ? 'Your itinerary looks great!' : 'Some issues need attention'}
        </p>
      </div>

      {/* Issues breakdown */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-4">
          {/* Errors */}
          {errors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                <X className="w-4 h-4" />
                Must Fix ({errors.length})
              </h3>
              <div className="space-y-2">
                {errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <p className="font-medium text-red-900">{error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Suggestions ({warnings.length})
              </h3>
              <div className="space-y-2">
                {warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <p className="font-medium text-amber-900">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          {infos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Notes ({infos.length})
              </h3>
              <div className="space-y-2">
                {infos.map((info, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <p className="text-sm text-slate-700">{info}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Passing Checks */}
      {infos.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <h3 className="text-sm font-medium text-green-800 mb-2">
            Passing Checks
          </h3>
          <ul className="text-sm text-green-700 space-y-1">
            {infos.map((info, i) => (
              <li key={i}>✓ {info}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Passed check */}
      {passed && (
        <div className="flex items-center justify-center gap-2 text-green-600">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">
            All checks passed! Click Continue to review your itinerary.
          </span>
        </div>
      )}
    </div>
  );
}
