'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, ChevronRight, X, Clock, MessageSquare, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { DebugInfo, DebugEntry, EnrichmentStatus } from '@/types/quick-plan';

interface DebugDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debugInfo: Partial<DebugInfo>;
  debugLog: DebugEntry[];
  enrichmentStatus: Record<string, EnrichmentStatus>;
}

export default function DebugDrawer({
  isOpen,
  onClose,
  debugInfo,
  debugLog,
  enrichmentStatus,
}: DebugDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'log' | 'enrichment'>('overview');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900 text-white z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-orange-500" />
                <h2 className="font-semibold">Debug Panel</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700">
              {(['overview', 'log', 'enrichment'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-slate-800 text-white border-b-2 border-orange-500'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'overview' && (
                <OverviewTab debugInfo={debugInfo} />
              )}
              {activeTab === 'log' && (
                <LogTab debugLog={debugLog} />
              )}
              {activeTab === 'enrichment' && (
                <EnrichmentTab enrichmentStatus={enrichmentStatus} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ debugInfo }: { debugInfo: Partial<DebugInfo> }) {
  return (
    <div className="space-y-6">
      {/* Reddit Stats */}
      <StatSection title="Reddit" icon="📱">
        <StatItem label="Threads fetched" value={debugInfo.redditThreadsFetched || 0} />
        <StatItem label="Posts analyzed" value={debugInfo.redditPostsAnalyzed || 0} />
        <StatItem
          label="Top subreddits"
          value={debugInfo.topSubreddits?.join(', ') || 'None'}
          isText
        />
        <StatItem
          label="Fetch time"
          value={debugInfo.redditFetchTimeMs ? `${debugInfo.redditFetchTimeMs}ms` : '-'}
          isText
        />
      </StatSection>

      {/* Activities Stats */}
      <StatSection title="Activities" icon="🎯">
        <StatItem label="Candidates extracted" value={debugInfo.activitiesCandidates || 0} />
        <StatItem label="Validated" value={debugInfo.activitiesValidated || 0} color="green" />
        <StatItem label="Rejected" value={debugInfo.activitiesRejected || 0} color="red" />
        <div className="mt-2 pt-2 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Verification methods:</p>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
              Places: {debugInfo.validationMethod?.placeId || 0}
            </span>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
              Operator: {debugInfo.validationMethod?.operatorUrl || 0}
            </span>
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
              Reddit: {debugInfo.validationMethod?.reddit || 0}
            </span>
          </div>
        </div>
      </StatSection>

      {/* Hotels Stats */}
      <StatSection title="Hotels" icon="🏨">
        <StatItem label="In database" value={debugInfo.hotelsInDb || 0} />
        <StatItem label="Indexed this session" value={debugInfo.hotelsIndexedThisSession || 0} />
        <StatItem label="Prices fetched" value={debugInfo.hotelsPriced || 0} />
        <StatItem label="Price cache hits" value={debugInfo.pricingCacheHits || 0} color="green" />
      </StatSection>

      {/* LLM Stats */}
      <StatSection title="Groq/LLM" icon="🤖">
        <StatItem label="API calls" value={debugInfo.grokCallsMade || 0} />
        <StatItem label="Tokens used" value={debugInfo.grokTokensUsed || 0} />
      </StatSection>

      {/* Timing */}
      <StatSection title="Performance" icon="⏱️">
        <StatItem
          label="Total enrichment time"
          value={debugInfo.totalEnrichmentTimeMs ? `${(debugInfo.totalEnrichmentTimeMs / 1000).toFixed(1)}s` : '-'}
          isText
        />
        <StatItem
          label="Place validation time"
          value={debugInfo.placeValidationTimeMs ? `${debugInfo.placeValidationTimeMs}ms` : '-'}
          isText
        />
      </StatSection>

      {/* Errors */}
      {debugInfo.errors && debugInfo.errors.length > 0 && (
        <StatSection title="Errors" icon="⚠️">
          <div className="space-y-1">
            {debugInfo.errors.map((error, idx) => (
              <p key={idx} className="text-xs text-red-400 font-mono">
                {error}
              </p>
            ))}
          </div>
        </StatSection>
      )}
    </div>
  );
}

function StatSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <span>{icon}</span>
        <h3 className="font-medium text-sm">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function StatItem({
  label,
  value,
  color,
  isText,
}: {
  label: string;
  value: number | string;
  color?: 'green' | 'red';
  isText?: boolean;
}) {
  const colorClass = color === 'green'
    ? 'text-green-400'
    : color === 'red'
    ? 'text-red-400'
    : 'text-white';

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono ${colorClass}`}>
        {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

// ============================================================================
// LOG TAB
// ============================================================================

function LogTab({ debugLog }: { debugLog: DebugEntry[] }) {
  if (debugLog.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No debug logs yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {debugLog.slice(-50).reverse().map((entry, idx) => (
        <LogEntry key={idx} entry={entry} />
      ))}
    </div>
  );
}

function LogEntry({ entry }: { entry: DebugEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeColors: Record<string, string> = {
    grok: 'bg-purple-500/20 text-purple-400',
    reddit: 'bg-orange-500/20 text-orange-400',
    places: 'bg-blue-500/20 text-blue-400',
    hotels: 'bg-green-500/20 text-green-400',
    pricing: 'bg-yellow-500/20 text-yellow-400',
    orchestrator: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-2 flex items-center gap-2 text-left hover:bg-slate-700/50 transition-colors"
      >
        <ChevronRight
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
        <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${typeColors[entry.type] || 'bg-slate-600'}`}>
          {entry.type}
        </span>
        <span className="text-sm text-white flex-1 truncate">{entry.action}</span>
        {entry.durationMs && (
          <span className="text-xs text-slate-400">{entry.durationMs}ms</span>
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-700">
          <pre className="text-xs text-slate-300 font-mono overflow-x-auto mt-2">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
          <p className="text-xs text-slate-500 mt-2">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ENRICHMENT TAB
// ============================================================================

function EnrichmentTab({
  enrichmentStatus,
}: {
  enrichmentStatus: Record<string, EnrichmentStatus>;
}) {
  const statusConfig: Record<
    EnrichmentStatus,
    { icon: React.ReactNode; color: string; label: string }
  > = {
    pending: {
      icon: <Clock className="w-4 h-4" />,
      color: 'text-slate-400',
      label: 'Pending',
    },
    loading: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      color: 'text-blue-400',
      label: 'Loading',
    },
    done: {
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'text-green-400',
      label: 'Done',
    },
    error: {
      icon: <XCircle className="w-4 h-4" />,
      color: 'text-red-400',
      label: 'Error',
    },
  };

  const enrichmentTypes = [
    { key: 'reddit', label: 'Reddit Search', icon: '📱' },
    { key: 'areas', label: 'Area Discovery', icon: '📍' },
    { key: 'hotels', label: 'Hotel Indexing', icon: '🏨' },
    { key: 'activities', label: 'Activity Verification', icon: '🎯' },
    { key: 'pricing', label: 'Price Fetching', icon: '💰' },
    { key: 'restaurants', label: 'Restaurant Discovery', icon: '🍽️' },
  ];

  return (
    <div className="space-y-3">
      {enrichmentTypes.map(({ key, label, icon }) => {
        const status = enrichmentStatus[key] || 'pending';
        const config = statusConfig[status];

        return (
          <div
            key={key}
            className="bg-slate-800 rounded-lg p-3 flex items-center gap-3"
          >
            <span className="text-lg">{icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{label}</p>
              <div className={`flex items-center gap-1 text-xs ${config.color}`}>
                {config.icon}
                <span>{config.label}</span>
              </div>
            </div>
            {status === 'loading' && (
              <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse w-1/2" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// DEBUG BUTTON (Floating)
// ============================================================================

export function DebugButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-30"
      title="Open Debug Panel"
    >
      <Bug className="w-5 h-5" />
    </button>
  );
}
