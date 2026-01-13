import { useMemo, useCallback } from 'react';

import { Bet, BetAmount } from '../../types/bets';
import { computePiratesBinary, computeBinaryToPirates, computePirateBinary } from '../maths';
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
  useArenaRatios,
  useUsedProbabilities,
  useRoundCurrentOdds,
  useWinningBetBinary,
  useBetCount,
} from '../stores';
import {
  makeEmptyBets,
  determineBetAmount,
  makeEmptyBetAmounts,
  getMaxBet,
  anyBetsExist as anyBetsExistInSet,
  shuffleArray,
  cartesianProduct,
  sortedIndices,
} from '../util';

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
  const arenaRatios = useArenaRatios();
  const currentSelectedRound = useSelectedRound();
  const usedProbabilities = useUsedProbabilities();
  const winningBetBinary = useWinningBetBinary();

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
  const currentOdds = useRoundCurrentOdds();
  const positiveArenas = arenaRatios.filter(x => x > 0).length;

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
    (betIndex: number): number => currentBetAmounts.get(betIndex) ?? -1000,
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
      const amount1 = currentBetAmounts.get(index1) ?? -1000;
      const amount2 = currentBetAmounts.get(index2) ?? -1000;

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
      const betCaps: Map<number, number> = new Map();
      const betOdds: Map<number, number> = new Map();
      const pirateCombos: Map<number, number> = new Map();

      if (!roundData || !usedProbabilities || usedProbabilities.length === 0) {
        return { betCaps, betOdds, pirateCombos };
      }

      const maxBet = getMaxBet(currentSelectedRound);

      for (const p of cartesianProduct(...pirates)) {
        const [a, b, c, d, e] = p;
        const betBinary = computePiratesBinary(p);

        if (betBinary === 0) {
          continue;
        }

        const pirateA = a ?? 0;
        const pirateB = b ?? 0;
        const pirateC = c ?? 0;
        const pirateD = d ?? 0;
        const pirateE = e ?? 0;

        const totalOdds =
          (pirateA === 0 ? 1 : (roundData.currentOdds[0]?.[pirateA] ?? 1)) *
          (pirateB === 0 ? 1 : (roundData.currentOdds[1]?.[pirateB] ?? 1)) *
          (pirateC === 0 ? 1 : (roundData.currentOdds[2]?.[pirateC] ?? 1)) *
          (pirateD === 0 ? 1 : (roundData.currentOdds[3]?.[pirateD] ?? 1)) *
          (pirateE === 0 ? 1 : (roundData.currentOdds[4]?.[pirateE] ?? 1));

        const winChance =
          (pirateA === 0 ? 1 : (usedProbabilities[0]?.[pirateA] ?? 0)) *
          (pirateB === 0 ? 1 : (usedProbabilities[1]?.[pirateB] ?? 0)) *
          (pirateC === 0 ? 1 : (usedProbabilities[2]?.[pirateC] ?? 0)) *
          (pirateD === 0 ? 1 : (usedProbabilities[3]?.[pirateD] ?? 0)) *
          (pirateE === 0 ? 1 : (usedProbabilities[4]?.[pirateE] ?? 0));

        if (totalOdds === 0) {
          continue;
        }

        const betCap = Math.ceil(1_000_000 / totalOdds);
        const winnings = Math.min(maxBet * totalOdds, 1_000_000);

        betCaps.set(betBinary, betCap);
        betOdds.set(betBinary, totalOdds);
        if (maxBet > 0) {
          const maxCap = Math.min(betCap, maxBet);
          pirateCombos.set(betBinary, ((winChance * winnings) / maxCap - 1) * maxCap);
        } else {
          pirateCombos.set(betBinary, totalOdds * winChance);
        }
      }

      return { betCaps, betOdds, pirateCombos };
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

  // Bet generation functions
  const generateMaxTERSet = useCallback((): void => {
    const maxBet = getMaxBet(currentSelectedRound);

    const { betCaps, pirateCombos } = calculateBets(
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
    );
    const topRatios = Array.from(pirateCombos.entries());
    topRatios.sort((a: number[], b: number[]) => (b[1] ?? 0) - (a[1] ?? 0));

    const newBets = new Map<number, number[]>();
    const newBetAmounts = new Map<number, number>();
    for (let bet = 0; bet < betCount; bet++) {
      const pirateBinary = topRatios[bet]?.[0] ?? 0;
      newBets.set(bet + 1, computeBinaryToPirates(pirateBinary));
      newBetAmounts.set(bet + 1, determineBetAmount(maxBet, betCaps.get(pirateBinary) ?? 0));
    }

    addNewSet(`Max TER Set (${maxBet} NP)`, newBets, newBetAmounts, true);
  }, [addNewSet, betCount, calculateBets, currentSelectedRound]);

  const generateTenbetSet = useCallback(
    (tenbetIndices: number[]): void => {
      const maxBet = getMaxBet(currentSelectedRound);
      const tenbetBinary = computePiratesBinary(tenbetIndices);

      const { betCaps, pirateCombos } = calculateBets(
        [0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4],
      );

      const topRatios = Array.from(pirateCombos.entries()).map(([k, v]) => [k, v]);
      topRatios.sort((a: number[], b: number[]) => (b[1] ?? 0) - (a[1] ?? 0));

      const bets = new Map<number, number[]>();
      const betAmounts = new Map<number, number>();
      let bet = 0;
      while (bets.size < betCount) {
        const pirateBinary = topRatios[bet]?.[0] ?? 0;
        if ((pirateBinary & tenbetBinary) === tenbetBinary) {
          const index = bets.size + 1;

          bets.set(index, computeBinaryToPirates(pirateBinary));
          betAmounts.set(index, determineBetAmount(maxBet, betCaps.get(pirateBinary) ?? 0));
        }
        bet += 1;
      }

      addNewSet(`Custom Ten-bet Set (${maxBet} NP)`, bets, betAmounts, true);
    },
    [betCount, calculateBets, currentSelectedRound, addNewSet],
  );

  // Helper function that returns bets and betAmounts
  const createGambitWithPirates = useCallback(
    (pirates: number[]): { bets: Bet; betAmounts: BetAmount } => {
      const maxBet = getMaxBet(currentSelectedRound);
      const { betCaps, betOdds } = calculateBets(
        [0, pirates[0] ?? 0],
        [0, pirates[1] ?? 0],
        [0, pirates[2] ?? 0],
        [0, pirates[3] ?? 0],
        [0, pirates[4] ?? 0],
      );

      const topRatios = Array.from(betOdds.entries()).map(([k, v]) => [k, v]);
      topRatios.sort((a: number[], b: number[]) => (b[1] ?? 0) - (a[1] ?? 0));

      const bets = new Map<number, number[]>();
      const betAmounts = new Map<number, number>();
      for (let bet = 0; bet < betCount; bet++) {
        const pirateBinary = topRatios[bet]?.[0] ?? 0;
        bets.set(bet + 1, computeBinaryToPirates(pirateBinary));
        betAmounts.set(bet + 1, determineBetAmount(maxBet, betCaps.get(pirateBinary) ?? 0));
      }

      return { bets, betAmounts };
    },
    [calculateBets, betCount, currentSelectedRound],
  );

  const generateGambitWithPirates = useCallback(
    (pirates: number[]): void => {
      const maxBet = getMaxBet(currentSelectedRound);
      const { bets, betAmounts } = createGambitWithPirates(pirates);
      addNewSet(`Custom Gambit Set (${maxBet} NP)`, bets as Bet, betAmounts as BetAmount, true);
    },
    [createGambitWithPirates, currentSelectedRound, addNewSet],
  );

  const generateGambitSet = useCallback((): void => {
    const { pirateCombos } = calculateBets(
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
    );

    const topRatios = Array.from(pirateCombos.entries()).map(([k, v]) => [k, v]);
    topRatios.sort((a: number[], b: number[]) => (b[1] as number) - (a[1] as number));

    // get best full bet
    const best = computeBinaryToPirates(topRatios[0]?.[0] as number);

    // generate a set based on those 5 pirates
    generateGambitWithPirates(best);
  }, [calculateBets, generateGambitWithPirates]);

  const generateBustproofSet = useCallback((): void => {
    const maxBet = getMaxBet(currentSelectedRound);
    const { betOdds } = calculateBets(
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
    );

    const bets = makeEmptyBets(10);
    const betAmounts = makeEmptyBetAmounts(10);

    // reverse it, because it's least -> greatest
    const bestArenas = sortedIndices(arenaRatios).reverse();
    const [bestArena, secondBestArena, thirdBestArena] = bestArenas;

    const getBestPirates = (arenaIndex: number): number[] =>
      sortedIndices(currentOdds[arenaIndex] as number[]).reverse();

    if (positiveArenas === 1) {
      // If only one arena is positive, we place 1 bet on each of the pirates of that arena. Total bets = 4.

      for (let x = 1; x < 5; x++) {
        bets.set(x, computeBinaryToPirates(computePirateBinary(bestArena as number, x as number)));
      }
    } else if (positiveArenas === 2) {
      // If two arenas are positive, we place 1 bet on each of the three worst pirates of the best arena and
      // 1 bet on each of the pirates of the second arena + the best pirate of the best arena. Total bets = 7

      const bestPiratesInBestArena = getBestPirates(bestArena as number);

      const [fourthBestInBest, thirdBestInBest, secondBestInBest, bestInBest] =
        bestPiratesInBestArena;

      bets.set(
        1,
        computeBinaryToPirates(
          computePirateBinary(bestArena as number, secondBestInBest as number),
        ),
      );
      bets.set(
        2,
        computeBinaryToPirates(computePirateBinary(bestArena as number, thirdBestInBest as number)),
      );
      bets.set(
        3,
        computeBinaryToPirates(
          computePirateBinary(bestArena as number, fourthBestInBest as number),
        ),
      );

      for (let x = 1; x < 5; x++) {
        bets.set(
          x + 3,
          computeBinaryToPirates(
            computePirateBinary(bestArena as number, bestInBest as number) |
              computePirateBinary(secondBestArena as number, x as number),
          ),
        );
      }
    } else {
      // If three arenas are positive, we place 1 bet on each of the three worst pirates of the best arena,
      // If four or more arenas are positive, we only play the three best arenas, seen below
      // 1 bet on each of the three worst pirates of the second arena + the best pirate of the best arena,
      // and 1 bet on each of the pirates of the third arena + the best pirate of the best arena + the best pirate
      // of the second arena. Total bets = 10.

      const bestPiratesInBestArena = getBestPirates(bestArena as number);

      const [fourthBestInBest, thirdBestInBest, secondBestInBest, bestInBest] =
        bestPiratesInBestArena;

      bets.set(
        1,
        computeBinaryToPirates(
          computePirateBinary(bestArena as number, secondBestInBest as number),
        ),
      );
      bets.set(
        2,
        computeBinaryToPirates(computePirateBinary(bestArena as number, thirdBestInBest as number)),
      );
      bets.set(
        3,
        computeBinaryToPirates(
          computePirateBinary(bestArena as number, fourthBestInBest as number),
        ),
      );

      //

      const bestPiratesInSecondBestArena = getBestPirates(secondBestArena as number);

      for (const [index, value] of bestPiratesInSecondBestArena.slice(0, 3).entries()) {
        bets.set(
          index + 4,
          computeBinaryToPirates(
            computePirateBinary(bestArena as number, bestInBest as number) |
              computePirateBinary(secondBestArena as number, value as number),
          ),
        );
      }

      //
      const bestInSecondBest = bestPiratesInSecondBestArena[3];

      for (let x = 1; x < 5; x++) {
        bets.set(
          x + 6,
          computeBinaryToPirates(
            computePirateBinary(bestArena as number, bestInBest as number) |
              computePirateBinary(secondBestArena as number, bestInSecondBest as number) |
              computePirateBinary(thirdBestArena as number, x as number),
          ),
        );
      }
    }

    // make per-bet maxbets
    if (maxBet > 0) {
      const odds = [];
      const bins = [];
      for (const pirates of bets.values()) {
        const bin = computePiratesBinary(pirates);
        if (bin === 0) {
          continue;
        }
        odds.push(betOdds.get(bin) as number);
        bins.push(bin);
      }

      const lowestOdds = Math.min(...odds);

      for (const [index, value] of bins.entries()) {
        betAmounts.set(
          index + 1,
          Math.floor(((maxBet * lowestOdds) / (betOdds.get(value) as number)) as number),
        );
      }
    }

    addNewSet(`Bustproof Set (round ${currentSelectedRound})`, bets, betAmounts, true);
  }, [addNewSet, currentSelectedRound, arenaRatios, currentOdds, positiveArenas, calculateBets]);

  const generateWinningGambitSet = useCallback((): void => {
    // get round winners
    const piratesToBet = computeBinaryToPirates(winningBetBinary);
    generateGambitWithPirates(piratesToBet);
  }, [generateGambitWithPirates, winningBetBinary]);

  const generateRandomCrazySet = useCallback((): void => {
    const maxBet = getMaxBet(currentSelectedRound);
    const { pirateCombos, betCaps } = calculateBets(
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
    );
    const pirateKeys = Array.from(pirateCombos.keys());
    shuffleArray(pirateKeys);

    const newBets = new Map<number, number[]>();
    const newBetAmounts = new Map<number, number>();

    for (let i = 0; i < betCount; i++) {
      const pirateBinary = pirateKeys[i] as number;
      newBets.set(i + 1, computeBinaryToPirates(pirateBinary));
      newBetAmounts.set(i + 1, determineBetAmount(maxBet, betCaps.get(pirateBinary) as number));
    }
    addNewSet(`Crazy Set (${maxBet} NP)`, newBets, newBetAmounts, true);
  }, [addNewSet, betCount, calculateBets, currentSelectedRound]);

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
