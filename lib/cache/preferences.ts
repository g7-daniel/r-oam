/**
 * LocalStorage caching for user preferences
 *
 * Features:
 * - Typed preference storage
 * - TTL-based expiration
 * - Namespace isolation
 * - Safe parsing with fallbacks
 * - Session state persistence
 */

const CACHE_NAMESPACE = 'roam-prefs';
const DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedValue<T> {
  value: T;
  expiresAt: number;
  version: number;
}

// Current schema version - increment when breaking changes occur
const SCHEMA_VERSION = 1;

/**
 * Get a value from localStorage with type safety
 */
export function getPreference<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const stored = localStorage.getItem(`${CACHE_NAMESPACE}:${key}`);
    if (!stored) return defaultValue;

    const parsed: CachedValue<T> = JSON.parse(stored);

    // Check version compatibility
    if (parsed.version !== SCHEMA_VERSION) {
      localStorage.removeItem(`${CACHE_NAMESPACE}:${key}`);
      return defaultValue;
    }

    // Check expiration
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(`${CACHE_NAMESPACE}:${key}`);
      return defaultValue;
    }

    return parsed.value;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Set a value in localStorage with optional TTL
 */
export function setPreference<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL): void {
  if (typeof window === 'undefined') return;

  try {
    const cached: CachedValue<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
      version: SCHEMA_VERSION,
    };
    localStorage.setItem(`${CACHE_NAMESPACE}:${key}`, JSON.stringify(cached));
  } catch (error) {
    // If storage is full, try to clear old entries
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      clearExpiredPreferences();
      try {
        const cached: CachedValue<T> = {
          value,
          expiresAt: Date.now() + ttlMs,
          version: SCHEMA_VERSION,
        };
        localStorage.setItem(`${CACHE_NAMESPACE}:${key}`, JSON.stringify(cached));
      } catch {
        // Give up
      }
    }
  }
}

/**
 * Remove a preference
 */
export function removePreference(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${CACHE_NAMESPACE}:${key}`);
}

/**
 * Clear all expired preferences
 */
export function clearExpiredPreferences(): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_NAMESPACE)) continue;

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt && now > parsed.expiresAt) {
          keysToRemove.push(key);
        }
      }
    } catch {
      // Invalid entry, remove it
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  if (keysToRemove.length > 0) {
  }
}

/**
 * Clear all preferences
 */
export function clearAllPreferences(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_NAMESPACE)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

// ============================================================================
// TYPED PREFERENCE HELPERS
// ============================================================================

/**
 * Recently searched destinations
 */
export interface RecentDestination {
  name: string;
  canonicalName: string;
  countryCode?: string;
  timestamp: number;
}

const MAX_RECENT_DESTINATIONS = 10;

export function getRecentDestinations(): RecentDestination[] {
  return getPreference<RecentDestination[]>('recent-destinations', []);
}

export function addRecentDestination(destination: Omit<RecentDestination, 'timestamp'>): void {
  const recent = getRecentDestinations();

  // Remove if already exists
  const filtered = recent.filter(
    d => d.canonicalName.toLowerCase() !== destination.canonicalName.toLowerCase()
  );

  // Add to front with timestamp
  const updated = [
    { ...destination, timestamp: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_DESTINATIONS);

  setPreference('recent-destinations', updated);
}

/**
 * Recently selected activities
 */
export interface RecentActivity {
  type: string;
  label: string;
  count: number;
}

export function getRecentActivities(): RecentActivity[] {
  return getPreference<RecentActivity[]>('recent-activities', []);
}

export function incrementActivityCount(activity: { type: string; label: string }): void {
  const recent = getRecentActivities();
  const existing = recent.find(a => a.type === activity.type);

  if (existing) {
    existing.count++;
    setPreference('recent-activities', recent.sort((a, b) => b.count - a.count));
  } else {
    setPreference('recent-activities', [
      ...recent,
      { ...activity, count: 1 },
    ].slice(0, 20));
  }
}

/**
 * User's default preferences
 */
export interface DefaultPreferences {
  adults?: number;
  children?: number;
  budgetStyle?: 'budget' | 'mid-range' | 'upscale' | 'luxury';
  pace?: 'chill' | 'balanced' | 'packed';
  originAirportCode?: string;
  originAirportName?: string;
}

export function getDefaultPreferences(): DefaultPreferences {
  return getPreference<DefaultPreferences>('default-preferences', {});
}

export function setDefaultPreferences(prefs: Partial<DefaultPreferences>): void {
  const current = getDefaultPreferences();
  setPreference('default-preferences', { ...current, ...prefs });
}

/**
 * Theme preference
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export function getThemePreference(): ThemePreference {
  return getPreference<ThemePreference>('theme', 'system');
}

export function setThemePreference(theme: ThemePreference): void {
  setPreference('theme', theme);
}

/**
 * Session state - for resuming incomplete trips
 */
export interface SessionState {
  tripId?: string;
  currentStep?: number;
  lastActive: number;
  quickPlanState?: {
    phase: 'gathering' | 'enriching' | 'generating' | 'reviewing';
    destination?: string;
    answeredQuestions: string[];
  };
}

export function getSessionState(): SessionState | null {
  const state = getPreference<SessionState | null>('session', null);

  // Session expires after 24 hours of inactivity
  if (state && Date.now() - state.lastActive > 24 * 60 * 60 * 1000) {
    removePreference('session');
    return null;
  }

  return state;
}

export function setSessionState(state: Partial<SessionState>): void {
  const current = getSessionState() || { lastActive: Date.now() };
  setPreference('session', {
    ...current,
    ...state,
    lastActive: Date.now(),
  }, 24 * 60 * 60 * 1000); // 24 hour TTL
}

export function clearSessionState(): void {
  removePreference('session');
}

/**
 * Dismissed tips and onboarding
 */
export function getDismissedTips(): string[] {
  return getPreference<string[]>('dismissed-tips', []);
}

export function dismissTip(tipId: string): void {
  const dismissed = getDismissedTips();
  if (!dismissed.includes(tipId)) {
    setPreference('dismissed-tips', [...dismissed, tipId]);
  }
}

export function isTipDismissed(tipId: string): boolean {
  return getDismissedTips().includes(tipId);
}

/**
 * Feature flags override (for testing)
 */
export function getFeatureFlags(): Record<string, boolean> {
  return getPreference<Record<string, boolean>>('feature-flags', {});
}

export function setFeatureFlag(flag: string, enabled: boolean): void {
  const flags = getFeatureFlags();
  setPreference('feature-flags', { ...flags, [flag]: enabled });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Clean up expired entries on module load (client-side only)
if (typeof window !== 'undefined') {
  // Run cleanup on load (after a short delay to not block initial render)
  setTimeout(clearExpiredPreferences, 1000);
}
