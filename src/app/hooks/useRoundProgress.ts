import { useEffect, useState } from 'react';

import { useRoundStore } from '../stores';
import { calculateRoundOverPercentage } from '../util';

export const useRoundProgress = (): number => {
  const roundData = useRoundStore(state => state.roundData);
  const currentSelectedRound = useRoundStore(state => state.currentSelectedRound);
  const [roundPercentOver, setRoundPercentOver] = useState<number>(0);

  useEffect(() => {
    // Build a minimal roundState object for the calculation
    const roundState = {
      roundData,
      currentSelectedRound,
    };

    // Initial calculation
    setRoundPercentOver(calculateRoundOverPercentage(roundState));

    const interval = setInterval((): void => {
      setRoundPercentOver(calculateRoundOverPercentage(roundState));
    }, 1000);

    return (): void => clearInterval(interval);
  }, [roundData, currentSelectedRound]);

  return roundPercentOver;
};
