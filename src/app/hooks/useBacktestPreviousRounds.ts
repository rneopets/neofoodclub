import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchPreviousRounds } from '../backtest/previousRounds';
import type { BacktestRound } from '../backtest/types';

export type BacktestFetchStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseBacktestPreviousRoundsResult {
  status: BacktestFetchStatus;
  rounds: BacktestRound[];
  newestRound: number;
  error: string | null;
  refetch: () => void;
}

interface InternalState {
  status: BacktestFetchStatus;
  rounds: BacktestRound[];
  newestRound: number;
  error: string | null;
}

const INITIAL_STATE: InternalState = {
  status: 'idle',
  rounds: [],
  newestRound: 0,
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
 * Fetches previous NeoFoodClub rounds for backtesting and holds them in
 * memory for the lifetime of the page (the drawer/modal that owns this hook
 * never unmounts, so reopening the tool doesn't refetch). No persistence
 * across page reloads is intended - a reload starts fresh.
 */
export function useBacktestPreviousRounds({
  enabled,
}: {
  enabled: boolean;
}): UseBacktestPreviousRoundsResult {
  const [state, setState] = useState<InternalState>(INITIAL_STATE);
  const hasLoadedRef = useRef<boolean>(false);

  const load = useCallback(async (signal: AbortSignal): Promise<void> => {
    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      const { rounds, newestRound } = await fetchPreviousRounds(signal);
      setState({ status: 'ready', rounds, newestRound, error: null });
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      setState({ status: 'error', rounds: [], newestRound: 0, error: String(err) });
    }
  }, []);

  useEffect(() => {
    if (!enabled || hasLoadedRef.current) {
      return undefined;
    }
    hasLoadedRef.current = true;
    const controller = new AbortController();
    void load(controller.signal);
    return (): void => {
      controller.abort();
    };
  }, [enabled, load]);

  const refetch = useCallback((): void => {
    const controller = new AbortController();
    void load(controller.signal);
  }, [load]);

  return {
    status: state.status,
    rounds: state.rounds,
    newestRound: state.newestRound,
    error: state.error,
    refetch,
  };
}
