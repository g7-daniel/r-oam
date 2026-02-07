'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const label = theme === 'light'
    ? 'Switch to dark mode'
    : 'Switch to light mode';

  const icon = theme === 'light'
    ? <Sun className="w-5 h-5 text-amber-700 transition-transform duration-300 hover:rotate-90" aria-hidden="true" />
    : <Moon className="w-5 h-5 text-blue-400 transition-transform duration-300 hover:-rotate-12" aria-hidden="true" />;

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-200/80 dark:bg-slate-700/80 backdrop-blur-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reddit focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 touch-manipulation hover:bg-slate-300 dark:hover:bg-slate-600 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}
