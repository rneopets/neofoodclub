import { useMemo } from 'react';

import { useRoundStore } from '../stores';

/**
 * Hook that checks if the current round is over
 * @returns true if the round has winners, false otherwise
 */
export function useIsRoundOver(): boolean {
  const winners = useRoundStore(state => state.roundData.winners);

  return useMemo(() => {
    return !!(winners && winners.some(w => w > 0));
  }, [winners]);
}
