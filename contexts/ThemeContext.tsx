'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  /** The user's explicit preference (light, dark, or system) */
  preference: ThemePreference;
  /** The currently active resolved theme (light or dark) */
  theme: ResolvedTheme;
  toggleTheme: () => void;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);
  const isInitialMount = useRef(true);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('roam-theme') as ThemePreference | null;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setPreference(savedTheme);
      setResolvedTheme(resolveTheme(savedTheme));
    } else {
      // Default to system preference
      setPreference('system');
      setResolvedTheme(getSystemTheme());
    }
  }, []);

  // Listen for OS theme changes when preference is 'system'
  useEffect(() => {
    if (!mounted) return;
    if (preference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [preference, mounted]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Only add transitioning class for user-initiated theme changes, not on
    // initial page load (the inline script in <head> already set the correct
    // dark class, so transitioning on mount causes unnecessary visual jank).
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      root.classList.add('transitioning');
    }

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('roam-theme', preference);

    // Remove transitioning class after animation completes
    const timer = setTimeout(() => {
      root.classList.remove('transitioning');
    }, 300);

    return () => clearTimeout(timer);
  }, [resolvedTheme, preference, mounted]);

  const setTheme = useCallback((newPreference: ThemePreference) => {
    setPreference(newPreference);
    setResolvedTheme(resolveTheme(newPreference));
  }, []);

  const toggleTheme = useCallback(() => {
    // Simple 2-state toggle: light <-> dark
    // If currently in system mode, toggle based on the resolved theme
    setPreference(prev => {
      const currentResolved = prev === 'system' ? getSystemTheme() : prev;
      const next: ThemePreference = currentResolved === 'light' ? 'dark' : 'light';
      setResolvedTheme(resolveTheme(next));
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, theme: resolvedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
