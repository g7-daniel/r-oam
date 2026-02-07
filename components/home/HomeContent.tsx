'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function HomeContent() {
  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 relative overflow-hidden transition-colors duration-300"
    >
      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 no-print">
        <ThemeToggle />
      </div>

      {/* Subtle gradient background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-20 dark:opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(255,69,0,0.2) 0%, transparent 50%)',
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 max-w-2xl mx-auto">
        {/* Logo */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold mb-6 sm:mb-8 tracking-tight transition-transform duration-300 hover:scale-105">
          <span className="text-orange-500 transition-colors duration-300">r/</span>
          <span className="text-slate-900 dark:text-white transition-colors duration-300">oam</span>
        </h1>

        {/* Tagline */}
        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-10 sm:mb-14 md:mb-16 font-normal leading-relaxed">
          No paid reviews. No sponsored content.
          <br />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Just honest recommendations from Reddit.</span>
        </p>

        {/* CTA Buttons */}
        <nav className="flex flex-col gap-6 sm:gap-8 items-center justify-center" aria-label="Get started">
          {/* AI Quick Plan - Main CTA */}
          <Link
            href="/quick-plan"
            className="group relative inline-flex items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            aria-label="Start AI-powered quick trip planning"
          >
            {/* Outer mega aura - pulsing slow */}
            <span
              className="absolute w-48 sm:w-64 h-20 sm:h-24 rounded-full bg-orange-500/20 dark:bg-orange-500/30 blur-2xl motion-safe:animate-pulse"
              style={{ animationDuration: '3s' }}
              aria-hidden="true"
            />
            {/* Middle aura - breathing effect */}
            <span
              className="absolute w-44 sm:w-56 h-16 sm:h-20 rounded-full bg-orange-400/30 dark:bg-orange-400/40 blur-xl motion-safe:animate-[breathe_2s_ease-in-out_infinite]"
              aria-hidden="true"
            />
            {/* Inner glow ring */}
            <span
              className="absolute inset-0 rounded-full bg-orange-500/20 dark:bg-orange-500/30 blur-lg scale-110 group-hover:scale-125 motion-safe:transition-transform duration-500"
              aria-hidden="true"
            />

            {/* Button */}
            <span className="relative px-8 sm:px-10 py-4 min-h-[48px] bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 text-white text-base sm:text-lg font-semibold rounded-full transition-all duration-300 shadow-lg shadow-orange-500/40 dark:shadow-orange-500/50 hover:shadow-[0_0_50px_rgba(255,69,0,0.5)] flex items-center gap-3 group-hover:scale-105">
              {/* Lightning icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                aria-hidden="true"
                focusable="false"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Plan/r
            </span>
          </Link>

          {/* Classic Planning - Secondary smaller option */}
          <Link
            href="/plan/start"
            className="group relative inline-flex items-center justify-center opacity-70 hover:opacity-100 transition-all duration-300 rounded-full focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 focus-visible:opacity-100"
            aria-label="Start classic step-by-step trip planning"
          >
            <span className="relative px-6 py-3 min-h-[44px] text-reddit-gray-500 dark:text-slate-400 text-sm font-medium rounded-full border-2 border-reddit-gray-200 dark:border-slate-700 hover:border-reddit-gray-300 dark:hover:border-slate-600 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 group-hover:scale-105 flex items-center gap-2 cursor-pointer">
              <span className="text-reddit-gray-400 dark:text-slate-500 transition-colors duration-300">slow</span>
              <span className="text-orange-500 transition-colors duration-300">r/</span>
              <span className="text-reddit-gray-600 dark:text-slate-400 transition-colors duration-300">owm</span>
            </span>
          </Link>
        </nav>

        {/* Custom animation keyframes */}
        <style jsx global>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(1.2); opacity: 0.5; }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes breathe {
              0%, 100% { transform: none; opacity: 0.3; }
            }
          }
        `}</style>

        {/* Beta badge */}
        <div className="mt-10 sm:mt-14 md:mt-16">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-500 dark:text-slate-400 font-medium" role="status">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 motion-safe:animate-pulse" aria-hidden="true" />
            BETA
          </span>
        </div>
      </div>

      {/* Minimal footer */}
      <footer className="absolute bottom-6 sm:bottom-8 left-0 right-0 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm px-4 safe-area-inset-bottom no-print" role="contentinfo">
        Powered by real travelers on Reddit
      </footer>
    </main>
  );
}
