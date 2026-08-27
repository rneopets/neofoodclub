import { useCallback, useEffect, useRef, useState } from 'react';

import type { AnomalyRound } from '../analysis/oddsAnomalies';
import { getPreviousRoundsFeed } from '../data/previousRoundsFeed';

export type OddsAnomalyLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseOddsAnomalyRoundsResult {
  status: OddsAnomalyLoadStatus;
  rounds: AnomalyRound[];
  error: string | null;
  refetch: () => void;
}

const INITIAL_STATE: {
  status: OddsAnomalyLoadStatus;
  rounds: AnomalyRound[];
  error: string | null;
} = {
  status: 'idle',
  rounds: [],
  error: null,
};

/**
 * Loads the previous-rounds feed for odds-anomaly analysis. Unlike the backtest
 * hook this keeps EVERY round (no winner filter) - thirteens and most-changes
 * are properties of the odds, not the result. The feed itself is fetched at most
 * once per page load (shared cache in previousRoundsFeed), so this is cheap to
 * enable from the drawer. The feed fetch is a shared cached promise with no
 * abort support, so there is nothing to cancel on unmount.
 */
export function useOddsAnomalyRounds({
  enabled,
}: {
  enabled: boolean;
}): UseOddsAnomalyRoundsResult {
  const [state, setState] = useState(INITIAL_STATE);
  const hasLoadedRef = useRef<boolean>(false);

  const load = useCallback(async (forceRefresh = false): Promise<void> => {
    setState({ status: 'loading', rounds: [], error: null });

    try {
      const lines = await getPreviousRoundsFeed(forceRefresh ? { forceRefresh: true } : undefined);
      const rounds: AnomalyRound[] = lines.map(line => ({
        round: line.round,
        openingOdds: line.openingOdds,
        currentOdds: line.currentOdds,
        ...(line.changes !== undefined ? { changes: line.changes } : {}),
      }));
      setState({ status: 'ready', rounds, error: null });
    } catch (err) {
      setState({ status: 'error', rounds: [], error: String(err) });
    }
  }, []);

  useEffect(() => {
    if (!enabled || hasLoadedRef.current) {
      return undefined;
    }
    hasLoadedRef.current = true;
    void load();
  }, [enabled, load]);

  const refetch = useCallback((): void => {
    void load(true);
  }, [load]);

  return { status: state.status, rounds: state.rounds, error: state.error, refetch };
}
