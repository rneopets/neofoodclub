import { useMemo, useCallback } from 'react';

import { Bet, BetAmount } from '../../types/bets';
import { BET_AMOUNT_DEFAULT } from '../constants';
import { computePiratesBinary } from '../maths';
import {
  useAllBetsForURLData,
  useAllBetAmountsForURLData,
  useRoundData,
  useSelectedRound,
  useCurrentBet,
  useCurrentBetName,
  useAddNewSet,
  useDeleteBetSet,
  useBetStore,
  useUsedProbabilities,
  useBetCount,
} from '../stores';
import {
  makeEmptyBets,
  makeEmptyBetAmounts,
  getMaxBet,
  anyBetsExist as anyBetsExistInSet,
  calculateBetMaps,
} from '../util';
import {
  wasmMakeMaxTerBets,
  wasmMakeBestGambitBets,
  wasmMakeGambitBets,
  wasmMakeWinningGambitBets,
  wasmMakeBustproofBets,
  wasmMakeCrazyBets,
  wasmMakeTenbetBets,
} from '../wasmEngine';

import { useDuplicateBets } from './useDuplicateBets';

export function useBetManagement(): {
  currentBetIndex: number;
  currentSetName: string;
  betCount: number;
  totalBetAmount: number;
  hasBets: boolean;
  isBetValid: (betIndex: number) => boolean;
  getDuplicateInfo: () => number[];
  isBetDuplicate: (betBinary: number) => boolean;
  getBet: (betIndex: number) => number[];
  getBetAmount: (betIndex: number) => number;
  anyBetsExist: () => boolean;
  setBetAmount: (betIndex: number, amount: number) => void;
  setBetAmounts: (value: number, capped?: boolean) => void;
  calculateBets: (...pirates: number[][]) => {
    betCaps: Map<number, number>;
    betOdds: Map<number, number>;
    pirateCombos: Map<number, number>;
  };
  swapBets: (index1: number, index2: number) => void;
  newEmptySet: () => void;
  cloneSet: () => void;
  deleteSet: () => void;
  generateMaxTERSet: () => void;
  generateGambitSet: () => void;
  generateBustproofSet: () => void;
  generateWinningGambitSet: () => void;
  generateRandomCrazySet: () => void;
  generateTenbetSet: (pirateIndices: number[]) => void;
  generateGambitWithPirates: (pirates: number[]) => void;
} {
  const currentSelectedRound = useSelectedRound();
  const usedProbabilities = useUsedProbabilities();

  // Use selective hooks for better performance
  const currentBetIndex = useCurrentBet();
  const currentSetName = useCurrentBetName();
  const betCount = useBetCount();

  // Get actions separately to avoid re-renders
  const addNewSet = useAddNewSet();
  const setAllBets = useBetStore(state => state.setAllBets);
  const setAllBetAmounts = useBetStore(state => state.setAllBetAmounts);

  // Get the full data structures
  const allBets = useAllBetsForURLData();
  const allBetAmounts = useAllBetAmountsForURLData();

  const currentBets = useMemo(
    () => allBets.get(currentBetIndex) ?? new Map(),
    [allBets, currentBetIndex],
  );

  const currentBetAmounts = useMemo(
    () => allBetAmounts.get(currentBetIndex) ?? new Map(),
    [allBetAmounts, currentBetIndex],
  );

  const roundData = useRoundData();

  // Get total bet amount for current set
  const totalBetAmount = useMemo(
    () =>
      Array.from(currentBetAmounts.values()).reduce(
        (acc: number, amount: number) => acc + (amount > 0 ? amount : 0),
        0,
      ),
    [currentBetAmounts],
  );

  // Check if any bets exist in current set
  const hasBets = useMemo(
    () => Array.from(currentBets.values()).some(bet => bet.some((pirate: number) => pirate > 0)),
    [currentBets],
  );

  // Get a specific bet by index
  const getBet = useCallback(
    (betIndex: number): number[] => currentBets.get(betIndex) ?? [],
    [currentBets],
  );

  // Optimized bet amount getter
  const getBetAmount = useCallback(
    (betIndex: number): number => currentBetAmounts.get(betIndex) ?? BET_AMOUNT_DEFAULT,
    [currentBetAmounts],
  );

  // Use our custom hook for duplicate detection
  const { duplicateBinaries, isBetDuplicate } = useDuplicateBets(currentBets);

  // Get comprehensive duplicate information
  const getDuplicateInfo = useCallback(() => duplicateBinaries, [duplicateBinaries]);

  // Check if a bet at a specific index is valid (has bets + no duplicates)
  const isBetValid = useCallback(
    (betIndex: number): boolean => {
      // use the bet binary to check if it is valid
      const betBinary = computePiratesBinary(currentBets.get(betIndex) ?? []);

      return !isBetDuplicate(betBinary);
    },
    [currentBets, isBetDuplicate],
  );

  // Set bet amount for a single bet
  const setBetAmount = useCallback(
    (betIndex: number, amount: number): void => {
      const betAmounts = new Map(currentBetAmounts);
      betAmounts.set(betIndex, amount);
      const newAllBetAmounts = new Map(allBetAmounts);
      newAllBetAmounts.set(currentBetIndex, betAmounts);
      setAllBetAmounts(newAllBetAmounts);
    },
    [currentBetIndex, currentBetAmounts, allBetAmounts, setAllBetAmounts],
  );

  // Swap bets at two indices
  const swapBets = useCallback(
    (index1: number, index2: number): void => {
      const bet1 = currentBets.get(index1) ?? [];
      const bet2 = currentBets.get(index2) ?? [];
      const amount1 = currentBetAmounts.get(index1) ?? BET_AMOUNT_DEFAULT;
      const amount2 = currentBetAmounts.get(index2) ?? BET_AMOUNT_DEFAULT;

      const bets = new Map(currentBets);
      bets.set(index1, bet2);
      bets.set(index2, bet1);

      const amounts = new Map(currentBetAmounts);
      amounts.set(index1, amount2);
      amounts.set(index2, amount1);

      const newAllBets = new Map(allBets);
      newAllBets.set(currentBetIndex, bets);
      const newAllBetAmounts = new Map(allBetAmounts);
      newAllBetAmounts.set(currentBetIndex, amounts);

      setAllBets(newAllBets);
      setAllBetAmounts(newAllBetAmounts);
    },
    [
      currentBetIndex,
      currentBets,
      currentBetAmounts,
      allBets,
      allBetAmounts,
      setAllBets,
      setAllBetAmounts,
    ],
  );

  const setBetAmounts = useCallback(
    (value: number, capped: boolean = false): void => {
      const betAmounts = new Map(currentBetAmounts);

      // Get current bets to check which ones are active
      const bets = currentBets;

      bets.forEach((bet, betIndex) => {
        if (bet.some((pirate: number) => pirate > 0)) {
          if (capped) {
            // we will need to calculate the bet cap for this bet
            const betOdds =
              roundData?.pirates.reduce((acc, _arena, arenaIndex) => {
                const pirate = bet[arenaIndex];
                if (pirate && pirate > 0) {
                  return acc * (roundData.currentOdds[arenaIndex]?.[pirate - 1] ?? 1);
                }
                return acc;
              }, 1) ?? 1;

            const betCap = Math.ceil(1000000 / betOdds);

            betAmounts.set(betIndex, Math.min(value, betCap));
          } else {
            betAmounts.set(betIndex, value);
          }
        }
      });
      const newAllBetAmounts = new Map(allBetAmounts);
      newAllBetAmounts.set(currentBetIndex, betAmounts);
      setAllBetAmounts(newAllBetAmounts);
    },
    [currentBetIndex, currentBets, currentBetAmounts, allBetAmounts, setAllBetAmounts, roundData],
  );

  const calculateBets = useCallback(
    (
      ...pirates: number[][]
    ): {
      betCaps: Map<number, number>;
      betOdds: Map<number, number>;
      pirateCombos: Map<number, number>;
    } => {
      if (!roundData || !usedProbabilities || usedProbabilities.length === 0) {
        return { betCaps: new Map(), betOdds: new Map(), pirateCombos: new Map() };
      }

      return calculateBetMaps(
        pirates,
        roundData.currentOdds,
        usedProbabilities,
        getMaxBet(currentSelectedRound),
        {
          includePirateCombos: true,
        },
      );
    },
    [roundData, currentSelectedRound, usedProbabilities],
  );

  // Set management functions
  const newEmptySet = useCallback(() => {
    addNewSet('New Set', makeEmptyBets(betCount), makeEmptyBetAmounts(betCount));
  }, [addNewSet, betCount]);

  const cloneSet = useCallback(() => {
    addNewSet(`${currentSetName || 'Unnamed Set'} (Clone)`, currentBets, currentBetAmounts);
  }, [addNewSet, currentSetName, currentBets, currentBetAmounts]);

  const deleteBetSet = useDeleteBetSet();

  const deleteSet = useCallback(() => {
    // Use the store's deleteBetSet method which handles batching internally
    deleteBetSet(currentBetIndex);
  }, [deleteBetSet, currentBetIndex]);

  // Bet generation functions - delegated to the wasm engine (see wasmEngine.ts).
  const generateMaxTERSet = useCallback((): void => {
    const maxBet = getMaxBet(currentSelectedRound);
    const { bets, betAmounts } = wasmMakeMaxTerBets(betCount);
    addNewSet(`Max TER Set (${maxBet} NP)`, bets, betAmounts, true);
  }, [addNewSet, betCount, currentSelectedRound]);

  const generateTenbetSet = useCallback(
    (tenbetIndices: number[]): void => {
      const maxBet = getMaxBet(currentSelectedRound);
      const tenbetBinary = computePiratesBinary(tenbetIndices);

      // Unlike the old TS implementation (which could loop indefinitely on an
      // unsatisfiable selection), the wasm engine errors instead of hanging.
      try {
        const { bets, betAmounts } = wasmMakeTenbetBets(tenbetBinary, betCount);
        addNewSet(`Custom Ten-bet Set (${maxBet} NP)`, bets, betAmounts, true);
      } catch (error) {
        console.error('Could not generate ten-bet set:', error);
      }
    },
    [betCount, currentSelectedRound, addNewSet],
  );

  // Helper function that returns bets and betAmounts
  const createGambitWithPirates = useCallback(
    (pirates: number[]): { bets: Bet; betAmounts: BetAmount } => {
      const piratesBinary = computePiratesBinary(pirates);
      try {
        return wasmMakeGambitBets(piratesBinary, betCount);
      } catch (error) {
        console.error('Could not generate gambit set:', error);
        return { bets: new Map(), betAmounts: new Map() };
      }
    },
    [betCount],
  );

  const generateGambitWithPirates = useCallback(
    (pirates: number[]): void => {
      const maxBet = getMaxBet(currentSelectedRound);
      const { bets, betAmounts } = createGambitWithPirates(pirates);
      if (bets.size === 0) {
        return;
      }
      addNewSet(`Custom Gambit Set (${maxBet} NP)`, bets, betAmounts, true);
    },
    [createGambitWithPirates, currentSelectedRound, addNewSet],
  );

  const generateGambitSet = useCallback((): void => {
    const maxBet = getMaxBet(currentSelectedRound);
    const { bets, betAmounts } = wasmMakeBestGambitBets(betCount);
    addNewSet(`Custom Gambit Set (${maxBet} NP)`, bets, betAmounts, true);
  }, [addNewSet, betCount, currentSelectedRound]);

  const generateBustproofSet = useCallback((): void => {
    const result = wasmMakeBustproofBets(betCount);
    if (!result) {
      console.warn('Bustproof set not possible: no arena has a positive ratio this round.');
      return;
    }
    addNewSet(
      `Bustproof Set (round ${currentSelectedRound})`,
      result.bets,
      result.betAmounts,
      true,
    );
  }, [addNewSet, currentSelectedRound, betCount]);

  const generateWinningGambitSet = useCallback((): void => {
    const maxBet = getMaxBet(currentSelectedRound);
    const result = wasmMakeWinningGambitBets(betCount);
    if (!result) {
      console.warn('No winners yet: cannot generate a winning gambit set.');
      return;
    }
    addNewSet(`Custom Gambit Set (${maxBet} NP)`, result.bets, result.betAmounts, true);
  }, [addNewSet, currentSelectedRound, betCount]);

  const generateRandomCrazySet = useCallback((): void => {
    const maxBet = getMaxBet(currentSelectedRound);
    const { bets, betAmounts } = wasmMakeCrazyBets(betCount);
    addNewSet(`Crazy Set (${maxBet} NP)`, bets, betAmounts, true);
  }, [addNewSet, betCount, currentSelectedRound]);

  return {
    // Current data
    currentBetIndex,
    currentSetName,
    betCount,
    totalBetAmount,
    hasBets,

    // Bet validation
    isBetValid,
    getDuplicateInfo,
    isBetDuplicate,
    anyBetsExist: anyBetsExistInSet,

    // Single bet manipulation
    getBet,
    getBetAmount,
    setBetAmount,
    swapBets,

    // Batch bet manipulation
    setBetAmounts,

    // Calculations
    calculateBets,

    // Set management
    newEmptySet,
    cloneSet,
    deleteSet,
    generateMaxTERSet,
    generateBustproofSet,
    generateWinningGambitSet,
    generateGambitSet,
    generateGambitWithPirates,
    generateRandomCrazySet,
    generateTenbetSet,
  };
}
