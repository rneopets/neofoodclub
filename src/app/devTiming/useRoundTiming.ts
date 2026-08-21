import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchRoundTiming, type RoundTiming } from './roundTiming';

export type RoundTimingFetchStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseRoundTimingResult {
  status: RoundTimingFetchStatus;
  timings: RoundTiming[];
  error: string | null;
  refetch: () => void;
}

interface InternalState {
  status: RoundTimingFetchStatus;
  timings: RoundTiming[];
  error: string | null;
}

const INITIAL_STATE: InternalState = {
  status: 'idle',
  timings: [],
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
 * Fetches per-round end timestamps for the drift visualizer and holds them in
 * memory for the lifetime of the page (the drawer/modal that owns this hook
 * never unmounts, so reopening the tool doesn't refetch). No persistence
 * across page reloads is intended - a reload starts fresh.
 */
export function useRoundTiming({ enabled }: { enabled: boolean }): UseRoundTimingResult {
  const [state, setState] = useState<InternalState>(INITIAL_STATE);
  const hasLoadedRef = useRef<boolean>(false);

  const load = useCallback(async (signal: AbortSignal, forceRefresh = false): Promise<void> => {
    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      const timings = await fetchRoundTiming(signal, { forceRefresh });
      setState({ status: 'ready', timings, error: null });
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      setState({ status: 'error', timings: [], error: String(err) });
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
    void load(controller.signal, true);
  }, [load]);

  return {
    status: state.status,
    timings: state.timings,
    error: state.error,
    refetch,
  };
}
