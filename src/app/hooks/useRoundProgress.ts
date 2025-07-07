import { useEffect, useState } from 'react';

import { useRoundDataStore } from '../stores';
import { calculateRoundOverPercentage } from '../util';

export const useRoundProgress = (): number => {
  const roundState = useRoundDataStore(state => state.roundState);
  const [roundPercentOver, setRoundPercentOver] = useState<number>(0);

  useEffect(() => {
    // Initial calculation
    setRoundPercentOver(calculateRoundOverPercentage(roundState));

    const interval = setInterval((): void => {
      setRoundPercentOver(calculateRoundOverPercentage(roundState));
    }, 1000);

    return (): void => clearInterval(interval);
  }, [roundState]);

  return roundPercentOver;
};
