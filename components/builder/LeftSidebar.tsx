'use client';

import { useState } from 'react';
import CollectionsPanel from './CollectionsPanel';
import AIAssistantPanel from './AIAssistantPanel';
import CategoryBrowser from './CategoryBrowser';
import { Compass, FolderHeart, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

// Reddit Snoo logo SVG
const SnooLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 0C4.48 0 0 4.48 0 10c0 5.52 4.48 10 10 10s10-4.48 10-10C20 4.48 15.52 0 10 0zm5.86 6.12c.67 0 1.22.55 1.22 1.22 0 .45-.25.84-.62 1.05.03.18.05.36.05.55 0 2.81-3.27 5.09-7.31 5.09-4.04 0-7.31-2.28-7.31-5.09 0-.19.02-.37.05-.55-.37-.21-.62-.6-.62-1.05 0-.67.55-1.22 1.22-1.22.33 0 .62.13.84.34 1.03-.74 2.45-1.23 4.02-1.29l.76-3.57c.02-.09.07-.16.14-.21.07-.05.16-.07.24-.05l2.47.53c.17-.33.52-.57.92-.57.57 0 1.03.46 1.03 1.03s-.46 1.03-1.03 1.03c-.56 0-1.01-.44-1.03-.99l-2.22-.47-.68 3.19c1.54.07 2.94.55 3.95 1.28.22-.21.52-.34.84-.34zM6.5 9.75c-.57 0-1.03.46-1.03 1.03s.46 1.03 1.03 1.03 1.03-.46 1.03-1.03-.46-1.03-1.03-1.03zm7 0c-.57 0-1.03.46-1.03 1.03s.46 1.03 1.03 1.03 1.03-.46 1.03-1.03-.46-1.03-1.03-1.03zm-5.47 3.82c-.1-.1-.1-.26 0-.36.1-.1.26-.1.36 0 .63.63 1.64.93 2.61.93s1.98-.3 2.61-.93c.1-.1.26-.1.36 0 .1.1.1.26 0 .36-.73.73-1.87 1.09-2.97 1.09s-2.24-.36-2.97-1.09z"/>
  </svg>
);

type SidebarTab = 'collections' | 'browse' | 'ai';

export default function LeftSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('browse');
  const [isAIExpanded, setIsAIExpanded] = useState(false); // Collapsed by default

  return (
    <div className="h-full flex flex-col">
      {/* Ask Snoo - Featured at top with Reddit branding */}
      <div className="border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30">
        <button
          onClick={() => setIsAIExpanded(!isAIExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF4500] flex items-center justify-center shadow-sm">
              <SnooLogo className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-slate-800 dark:text-white">Ask Snoo</span>
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Powered by Reddit travelers</span>
            </div>
          </div>
          {isAIExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isAIExpanded && (
          <div className="h-72 border-t border-orange-100 dark:border-orange-900/50">
            <AIAssistantPanel onCollapse={() => setIsAIExpanded(false)} />
          </div>
        )}
      </div>

      {/* Tab buttons - Browse / Saved */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <button
          onClick={() => setActiveTab('browse')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
            activeTab === 'browse'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          )}
        >
          <Compass className="w-4 h-4" />
          Browse
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
            activeTab === 'collections'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          )}
        >
          <FolderHeart className="w-4 h-4" />
          Saved
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'collections' && <CollectionsPanel />}
        {activeTab === 'browse' && <CategoryBrowser />}
      </div>
    </div>
  );
}
