/**
 * React hook for deduplicated API fetching
 *
 * Provides a clean interface for making deduplicated API calls from React components.
 * Prevents duplicate requests when users rapidly click buttons or when components
 * re-render and trigger the same fetch multiple times.
 *
 * Features:
 * - Automatic request deduplication
 * - Loading state management
 * - Error handling with user-friendly messages
 * - Optional result caching
 * - Abort support for cleanup
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { requestDedup, dedupedFetch, dedupedPost, DedupOptions } from '@/lib/request-dedup';

// ============================================================================
// TYPES
// ============================================================================

export interface UseDedupedFetchState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

export interface UseDedupedFetchReturn<T> extends UseDedupedFetchState<T> {
  /** Trigger the fetch manually */
  execute: () => Promise<T | null>;
  /** Reset the state to initial values */
  reset: () => void;
  /** Check if a request with the same key is in flight */
  isInFlight: boolean;
}

export interface UseDedupedPostReturn<T, P> extends UseDedupedFetchState<T> {
  /** Trigger the fetch manually with params */
  execute: (params: P) => Promise<T | null>;
  /** Reset the state to initial values */
  reset: () => void;
  /** Check if a request with the same key is in flight */
  isInFlight: boolean;
}

// ============================================================================
// HOOK: useDedupedFetch
// ============================================================================

/**
 * Hook for making deduplicated GET requests
 *
 * @example
 * ```tsx
 * const { data, isLoading, execute } = useDedupedFetch<HotelsResponse>(
 *   '/api/quick-plan/hotels',
 *   { cacheTTL: 60000 }
 * );
 *
 * // Trigger fetch
 * await execute();
 * ```
 */
export function useDedupedFetch<T>(
  url: string | null,
  options?: DedupOptions
): UseDedupedFetchReturn<T> {
  const [state, setState] = useState<UseDedupedFetchState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    if (!url) return null;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isError: false,
    }));

    try {
      const data = await dedupedFetch<T>(url, undefined, options);

      if (mountedRef.current) {
        setState({
          data,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: true,
        });
      }

      return data;
    } catch (error) {
      if (mountedRef.current) {
        setState({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
          isError: true,
          isSuccess: false,
        });
      }
      return null;
    }
  }, [url, options]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, []);

  const isInFlight = url ? requestDedup.isInFlight(`GET:${url}:`) : false;

  return {
    ...state,
    execute,
    reset,
    isInFlight,
  };
}

// ============================================================================
// HOOK: useDedupedPost
// ============================================================================

/**
 * Hook for making deduplicated POST requests
 *
 * @example
 * ```tsx
 * const { data, isLoading, execute } = useDedupedPost<HotelsResponse, HotelsRequest>(
 *   '/api/quick-plan/hotels',
 *   { cacheTTL: 60000 }
 * );
 *
 * // Trigger fetch with params
 * await execute({ destination: 'Paris', areaIds: ['1', '2'] });
 * ```
 */
export function useDedupedPost<T, P = Record<string, unknown>>(
  url: string | null,
  options?: DedupOptions
): UseDedupedPostReturn<T, P> {
  const [state, setState] = useState<UseDedupedFetchState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const mountedRef = useRef(true);
  const lastParamsRef = useRef<P | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (params: P) => {
    if (!url) return null;

    lastParamsRef.current = params;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isError: false,
    }));

    try {
      const data = await dedupedPost<T, P>(url, params, options);

      if (mountedRef.current) {
        setState({
          data,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: true,
        });
      }

      return data;
    } catch (error) {
      if (mountedRef.current) {
        setState({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
          isError: true,
          isSuccess: false,
        });
      }
      return null;
    }
  }, [url, options]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
    lastParamsRef.current = null;
  }, []);

  // Check if current request is in flight
  const isInFlight = url && lastParamsRef.current
    ? requestDedup.isInFlight(`POST:${url}:${JSON.stringify(lastParamsRef.current)}`)
    : false;

  return {
    ...state,
    execute,
    reset,
    isInFlight,
  };
}

// ============================================================================
// HOOK: useDedupedMutation
// ============================================================================

/**
 * Hook for making deduplicated mutations (POST/PUT/DELETE)
 * Similar to useDedupedPost but with more explicit naming for mutations
 *
 * @example
 * ```tsx
 * const { trigger, data, isLoading } = useDedupedMutation<Response, Params>(
 *   async (params) => {
 *     return await api.updateHotel(params);
 *   }
 * );
 *
 * // Trigger mutation
 * await trigger({ hotelId: '123', rating: 5 });
 * ```
 */
export function useDedupedMutation<T, P>(
  mutationFn: (params: P) => Promise<T>,
  keyGenerator: (params: P) => string,
  options?: DedupOptions
): {
  trigger: (params: P) => Promise<T | null>;
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
} {
  const [state, setState] = useState<UseDedupedFetchState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const trigger = useCallback(async (params: P) => {
    const key = keyGenerator(params);

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isError: false,
    }));

    try {
      const data = await requestDedup.dedupe(key, () => mutationFn(params), options);

      if (mountedRef.current) {
        setState({
          data,
          error: null,
          isLoading: false,
          isError: false,
          isSuccess: true,
        });
      }

      return data;
    } catch (error) {
      if (mountedRef.current) {
        setState({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
          isError: true,
          isSuccess: false,
        });
      }
      return null;
    }
  }, [mutationFn, keyGenerator, options]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, []);

  return {
    trigger,
    ...state,
    reset,
  };
}
