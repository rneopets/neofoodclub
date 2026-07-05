import { useMemo } from 'react';

import { Bet } from '../../types/bets';
import { computePiratesBinary } from '../maths';

/**
 * Custom hook for efficiently detecting duplicate bets
 * @param bets - The current bets map
 * @returns Object with utility functions for duplicate detection
 */
export function useDuplicateBets(bets: Bet): {
  duplicateBinaries: number[];
  hasDuplicates: boolean;
  isBetDuplicate: (betBinary: number) => boolean;
  betBinaries: number[];
} {
  // Memoized calculation of bet binaries for all bets
  const betBinaries = useMemo(
    () =>
      Array.from(bets.values())
        .filter(bet => bet.some(pirate => pirate > 0))
        .map(bet => computePiratesBinary(bet)),
    [bets],
  );

  // Memoized calculation of duplicate binaries
  const duplicateBinaries = useMemo(() => {
    if (!bets || bets.size === 0 || betBinaries.length <= 1) {
      return [];
    }

    const uniqueBinaries = new Set(betBinaries);
    if (uniqueBinaries.size !== betBinaries.length) {
      return betBinaries.filter((binary, index, self) => self.indexOf(binary) !== index);
    }

    return [];
  }, [bets, betBinaries]);

  // Check if any bet is a duplicate
  const hasDuplicates = useMemo(() => duplicateBinaries.length > 0, [duplicateBinaries]);

  // Check if a specific bet is a duplicate
  const isBetDuplicate = useMemo(
    () =>
      (betBinary: number): boolean =>
        duplicateBinaries.includes(betBinary),
    [duplicateBinaries],
  );

  return {
    duplicateBinaries,
    hasDuplicates,
    isBetDuplicate,
    betBinaries,
  };
}
