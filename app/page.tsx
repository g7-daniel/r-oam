'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">
      {/* Theme toggle in top right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>


      {/* Subtle gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-20 dark:opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(255,69,0,0.2) 0%, transparent 50%)',
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        {/* Logo */}
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-bold mb-8 tracking-tight">
          <span className="text-orange-500">r/</span>
          <span className="text-slate-900 dark:text-white">oam</span>
        </h1>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-16 font-light leading-relaxed">
          No paid reviews. No sponsored content.
          <br />
          <span className="text-slate-700 dark:text-slate-300">Just honest recommendations from Reddit.</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-8 items-center justify-center">
          {/* AI Quick Plan - Main CTA */}
          <Link
            href="/quick-plan"
            className="group relative inline-flex items-center justify-center"
          >
            {/* Outer mega aura - pulsing slow */}
            <span
              className="absolute w-64 h-24 rounded-full bg-orange-500/20 blur-2xl animate-pulse"
              style={{ animationDuration: '3s' }}
            />
            {/* Middle aura - breathing effect */}
            <span
              className="absolute w-56 h-20 rounded-full bg-orange-400/30 blur-xl"
              style={{
                animation: 'breathe 2s ease-in-out infinite',
              }}
            />
            {/* Inner glow ring */}
            <span className="absolute inset-0 rounded-full bg-orange-500/20 blur-lg scale-110 group-hover:scale-125 transition-transform duration-500" />

            {/* Button */}
            <span className="relative px-10 py-4 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 text-white text-lg font-semibold rounded-full transition-all duration-300 shadow-lg shadow-orange-500/40 hover:shadow-[0_0_50px_rgba(255,69,0,0.5)] flex items-center gap-3 group-hover:scale-105">
              {/* Lightning icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Plan/r
            </span>
          </Link>

          {/* Classic Planning - Secondary smaller option */}
          <Link
            href="/plan/start"
            className="group relative inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-300"
          >
            <span className="relative px-6 py-2 text-slate-500 dark:text-slate-400 text-sm font-medium rounded-full border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2">
              <span className="text-slate-400 dark:text-slate-500">slow</span>
              <span className="text-orange-500">r/</span>
              <span className="text-slate-600 dark:text-slate-400">owm</span>
            </span>
          </Link>
        </div>

        {/* Custom animation keyframes */}
        <style jsx>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(1.2); opacity: 0.5; }
          }
        `}</style>

        {/* Beta badge */}
        <div className="mt-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            BETA
          </span>
        </div>
      </div>

      {/* Minimal footer */}
      <div className="absolute bottom-8 text-center text-slate-400 dark:text-slate-600 text-sm">
        Powered by real travelers on Reddit
      </div>
    </div>
  );
}
