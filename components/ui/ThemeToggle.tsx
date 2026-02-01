'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Track icons */}
      <Sun className="absolute left-1.5 top-1.5 w-4 h-4 text-amber-500 transition-opacity duration-300 opacity-100 dark:opacity-30" />
      <Moon className="absolute right-1.5 top-1.5 w-4 h-4 text-slate-400 dark:text-blue-300 transition-opacity duration-300 opacity-30 dark:opacity-100" />

      {/* Thumb */}
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
          theme === 'dark' ? 'left-[calc(100%-26px)]' : 'left-0.5'
        }`}
      >
        {theme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-blue-500" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </span>
    </button>
  );
}
