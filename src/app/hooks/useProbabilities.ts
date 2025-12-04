import { useMemo } from 'react';

import { computeLegacyProbabilities, computeLogitProbabilities } from '../maths';
import { useRoundStore } from '../stores';

/**
 * Hook that computes both legacy and logit probabilities
 * @returns Object with legacy and logit probabilities
 */
export function useProbabilities(): {
  legacyProbabilities: number[][];
  logitProbabilities: number[][];
} {
  const roundData = useRoundStore(state => state.roundData);

  const legacyProbabilities = useMemo(() => {
    if (!roundData) {
      return [];
    }
    return computeLegacyProbabilities(roundData).used;
  }, [roundData]);

  const logitProbabilities = useMemo(() => {
    if (!roundData) {
      return [];
    }
    return computeLogitProbabilities(roundData).used;
  }, [roundData]);

  return {
    legacyProbabilities,
    logitProbabilities,
  };
}
