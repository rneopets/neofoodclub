import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchPreviousRounds,
  isStale,
  loadCache,
  saveCache,
} from '../backtest/previousRoundsCache';
import type { BacktestRound, CachedPreviousRounds } from '../backtest/types';
import { useCurrentRound } from '../stores';

export type BacktestFetchStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseBacktestPreviousRoundsResult {
  status: BacktestFetchStatus;
  rounds: BacktestRound[];
  fromCache: boolean;
  newestRound: number;
  fetchedAt: number | null;
  error: string | null;
  refetch: (force?: boolean) => void;
}

interface InternalState {
  status: BacktestFetchStatus;
  rounds: BacktestRound[];
  fromCache: boolean;
  newestRound: number;
  fetchedAt: number | null;
  error: string | null;
}

const INITIAL_STATE: InternalState = {
  status: 'idle',
  rounds: [],
  fromCache: false,
  newestRound: 0,
  fetchedAt: null,
  error: null,
};

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return true;
  }
  return (
    typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError'
  );
}

/**
 * Fetches and caches previous NeoFoodClub rounds for backtesting.
 *
 * Checks the localStorage cache first; if it exists and is not stale
 * relative to the current live round from the CDN, it is used immediately
 * with no network request. Otherwise (or when `force` is requested via
 * `refetch`), it fetches fresh data from the CDN and updates the cache.
 * If a fresh fetch fails, it falls back to a stale cache (if one exists)
 * and surfaces a non-fatal error message.
 */
export function useBacktestPreviousRounds({
  enabled,
}: {
  enabled: boolean;
}): UseBacktestPreviousRoundsResult {
  const [state, setState] = useState<InternalState>(INITIAL_STATE);
  const currentRoundFromCdn = useCurrentRound();
  const hasLoadedRef = useRef<boolean>(false);

  const load = useCallback(
    async (force: boolean, signal: AbortSignal): Promise<void> => {
      let cache: CachedPreviousRounds | null;

      if (!force) {
        cache = loadCache();
        if (cache !== null && !isStale(cache, currentRoundFromCdn)) {
          setState({
            status: 'ready',
            rounds: cache.rounds,
            fromCache: true,
            newestRound: cache.newestRound,
            fetchedAt: cache.fetchedAt,
            error: null,
          });
          return;
        }
      } else {
        cache = loadCache();
      }

      setState(prev => ({ ...prev, status: 'loading' }));

      try {
        const { rounds, newestRound } = await fetchPreviousRounds(signal);
        const newCache: CachedPreviousRounds = {
          version: 1,
          newestRound,
          fetchedAt: Date.now(),
          rounds,
        };
        saveCache(newCache);
        setState({
          status: 'ready',
          rounds,
          fromCache: false,
          newestRound,
          fetchedAt: newCache.fetchedAt,
          error: null,
        });
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }
        if (cache !== null) {
          setState({
            status: 'ready',
            rounds: cache.rounds,
            fromCache: true,
            newestRound: cache.newestRound,
            fetchedAt: cache.fetchedAt,
            error: 'Failed to refresh data, showing cached results',
          });
        } else {
          setState({
            status: 'error',
            rounds: [],
            fromCache: false,
            newestRound: 0,
            fetchedAt: null,
            error: String(err),
          });
        }
      }
    },
    [currentRoundFromCdn],
  );

  useEffect(() => {
    if (!enabled || hasLoadedRef.current) {
      return undefined;
    }
    hasLoadedRef.current = true;
    const controller = new AbortController();
    void load(false, controller.signal);
    return (): void => {
      controller.abort();
    };
  }, [enabled, load]);

  const refetch = useCallback(
    (force: boolean = true): void => {
      const controller = new AbortController();
      void load(force, controller.signal);
    },
    [load],
  );

  return {
    status: state.status,
    rounds: state.rounds,
    fromCache: state.fromCache,
    newestRound: state.newestRound,
    fetchedAt: state.fetchedAt,
    error: state.error,
    refetch,
  };
}
