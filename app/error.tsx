'use client';

import { useEffect, useState } from 'react';
import { formatErrorForBoundary, type FormattedError } from '@/lib/errors';
import { AlertCircle, RefreshCw, Home, WifiOff, Clock, Bug } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [formattedError, setFormattedError] = useState<FormattedError | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log error for debugging
    console.error('App error:', error);

    // Format error for display
    const formatted = formatErrorForBoundary(error);
    setFormattedError(formatted);
  }, [error]);

  // Choose icon based on error type
  const getIcon = () => {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch') || message.includes('connect')) {
      return <WifiOff className="w-8 h-8 text-red-600 dark:text-red-400" />;
    }
    if (message.includes('timeout') || message.includes('rate limit')) {
      return <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />;
    }
    return <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />;
  };

  const title = formattedError?.title || 'Something went wrong';
  const message = formattedError?.message || error.message || 'An unexpected error occurred';
  const canRetry = formattedError?.canRetry ?? true;
  const showRefresh = formattedError?.showRefresh ?? true;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          {getIcon()}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {title}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>
        <div className="space-y-3">
          {canRetry && (
            <button
              onClick={reset}
              className="w-full px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          )}
          {showRefresh && !canRetry && (
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh page
            </button>
          )}
          <a
            href="/"
            className="block w-full px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              Go home
            </span>
          </a>
        </div>

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 mx-auto"
            >
              <Bug className="w-3 h-3" />
              {showDetails ? 'Hide' : 'Show'} Error Details
            </button>
            {showDetails && (
              <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-left overflow-auto max-h-48">
                <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                  <strong>Error:</strong> {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs font-mono text-slate-500 mt-2">
                    <strong>Digest:</strong> {error.digest}
                  </p>
                )}
                {error.stack && (
                  <pre className="text-xs font-mono text-slate-500 mt-2 whitespace-pre-wrap">
                    {error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
