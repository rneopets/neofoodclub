import { useMemo } from 'react';

import type { RoundState } from '../../types';
import { computeLegacyProbabilities, computeLogitProbabilities } from '../maths';
import { useRoundStore } from '../stores';
import { getOdds } from '../util';

/**
 * Hook that computes both legacy and logit probabilities
 * @returns Object with legacy and logit probabilities
 */
export function useProbabilities(): {
  legacyProbabilities: number[][];
  logitProbabilities: number[][];
} {
  const roundData = useRoundStore(state => state.roundData);
  const customOdds = useRoundStore(state => state.customOdds);
  const bigBrain = useRoundStore(state => state.bigBrain);
  const customOddsMode = useRoundStore(state => state.customOddsMode);

  // Compute effective odds using getOdds, which respects customOddsMode and bigBrain
  const effectiveOdds = useMemo(() => {
    if (!roundData) {
      return [];
    }
    const partialRoundState: Partial<RoundState> = {
      roundData,
      customOdds,
      advanced: {
        bigBrain,
        customOddsMode,
        oddsTimeline: false,
        faDetails: false,
        useLogitModel: false,
      },
    };
    return getOdds(partialRoundState);
  }, [roundData, customOdds, bigBrain, customOddsMode]);

  // Build effectiveRoundData with custom odds applied if needed
  const effectiveRoundData = useMemo(() => {
    if (!roundData || !effectiveOdds.length) {
      return roundData;
    }
    if (effectiveOdds !== roundData.currentOdds) {
      return { ...roundData, currentOdds: effectiveOdds };
    }
    return roundData;
  }, [roundData, effectiveOdds]);

  const legacyProbabilities = useMemo(() => {
    if (!effectiveRoundData) {
      return [];
    }
    return computeLegacyProbabilities(effectiveRoundData).used;
  }, [effectiveRoundData]);

  const logitProbabilities = useMemo(() => {
    if (!effectiveRoundData) {
      return [];
    }
    return computeLogitProbabilities(effectiveRoundData).used;
  }, [effectiveRoundData]);

  return {
    legacyProbabilities,
    logitProbabilities,
  };
}
