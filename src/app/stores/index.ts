import { OddsChange } from '../../types';
import { Bet, BetAmount } from '../../types/bets';
import { computePiratesBinary } from '../maths';
import { makeEmptyBetAmounts } from '../util';

import { useBetManagementStore } from './betManagementStore';
import { useCalculationsStore, memoizedCalculations } from './calculationsStore';
import { useRoundDataStore } from './roundDataStore';
import { useTimestampStore } from './timestampStore';

export {
  useRoundDataStore,
  useRoundPirates,
  useRoundOpeningOdds,
  useRoundCurrentOdds,
} from './roundDataStore';
export { useBetManagementStore } from './betManagementStore';
export { useCalculationsStore } from './calculationsStore';

const DEFAULT_BET_LINE: number[] = [0, 0, 0, 0, 0];

export const useCurrentBet = (): number => useBetManagementStore(state => state.currentBet);

export const useCurrentBetName = (): string =>
  useBetManagementStore(state => state.allNames.get(state.currentBet) ?? 'Unknown Set');

export const useCurrentBetForURL = (): number => useBetManagementStore(state => state.currentBet);

export const useUpdateSinglePirate = (): ((
  betIndex: number,
  arenaIndex: number,
  pirateIndex: number,
) => void) => useBetManagementStore(state => state.updateSinglePirate);
export const useUpdateSingleBetAmount = (): ((betIndex: number, amount: number) => void) =>
  useBetManagementStore(state => state.updateSingleBetAmount);
export const useUpdateBetAmounts = (): ((betIndex: number, amounts: Map<number, number>) => void) =>
  useBetManagementStore(state => state.updateBetAmounts);
export const useAddNewSet = (): ((
  name: string,
  bets: Bet,
  betAmounts: BetAmount,
  maybe_replace?: boolean,
) => void) => useBetManagementStore(state => state.addNewSet);
export const useDeleteBetSet = (): ((betIndex: number) => void) =>
  useBetManagementStore(state => state.deleteBetSet);
export const useSetCurrentBet = (): ((bet: number) => void) =>
  useBetManagementStore(state => state.setCurrentBet);
export const useSetAllBets = (): ((bets: Map<number, Map<number, number[]>>) => void) =>
  useBetManagementStore(state => state.setAllBets);
export const useSetAllBetAmounts = (): ((amounts: Map<number, Map<number, number>>) => void) =>
  useBetManagementStore(state => state.setAllBetAmounts);
export const useSwapBets = (): ((uiIndex1: number, uiIndex2: number) => void) =>
  useBetManagementStore(state => state.swapBets);

export const useBatchUpdateBetAmounts = (): ((
  updates: Array<{ betIndex: number; amount: number }>,
) => void) => useBetManagementStore(state => state.batchUpdateBetAmounts);

export const useTableMode = (): string => useRoundDataStore(state => state.roundState.tableMode);

export const useViewMode = (): boolean => useRoundDataStore(state => state.roundState.viewMode);

export const useSpecificBetAmount = (betIndex: number): number =>
  useBetManagementStore(
    (state): number => state.allBetAmounts.get(state.currentBet)?.get(betIndex) ?? -1000,
  );

// Hook that subscribes to the count of bets (for iteration)
export const useBetCount = (): number =>
  useBetManagementStore(state => state.allBets.get(state.currentBet)?.size ?? 0);

// Hook that subscribes to whether any bets exist in the current set
export const useHasAnyBets = (): boolean =>
  useBetManagementStore(state =>
    Array.from(state.allBets.get(state.currentBet)?.values() ?? []).some(bet =>
      bet.some((pirate: number) => pirate > 0),
    ),
  );

// Hook that subscribes to the total number of bet sets
export const useBetSetCount = (): number => useBetManagementStore(state => state.allBets.size);

// Hook that subscribes to a specific pirate selection
export const useIsPirateSelected = (
  betIndex: number,
  arenaIndex: number,
  pirateIndex: number,
): boolean =>
  useBetManagementStore(state => {
    const currentBets = state.allBets.get(state.currentBet);
    if (!currentBets) {
      return false;
    }

    const betLine = currentBets.get(betIndex);
    if (!betLine) {
      return false;
    }

    return betLine[arenaIndex] === pirateIndex;
  });

// Hook that subscribes to all bet set names
export const useAllBetSetNames = (): Map<number, string> =>
  useBetManagementStore(state => state.allNames);

export const useBetLineSpecific = (betIndex: number): number[] =>
  useBetManagementStore((state): number[] => {
    const currentBets = state.allBets.get(state.currentBet);
    return currentBets?.get(betIndex) ?? DEFAULT_BET_LINE;
  });

export const useAllBetsForURLData = (): Map<number, Map<number, number[]>> =>
  useBetManagementStore(state => state.allBets);

export const useAllBetAmountsForURLData = (): Map<number, Map<number, number>> =>
  useBetManagementStore(state => state.allBetAmounts);

// More granular calculation hooks to prevent unnecessary re-renders
export const useCalculationsStatus = (): boolean =>
  useCalculationsStore(state => state.calculations.calculated);

export const useBetOdds = (): Map<number, number> =>
  useCalculationsStore(state => state.calculations.betOdds);

export const useBetPayoffs = (): Map<number, number> =>
  useCalculationsStore(state => state.calculations.betPayoffs);

export const useBetBinaries = (): Map<number, number> =>
  useCalculationsStore(state => state.calculations.betBinaries);

export const useTotalBetAmounts = (): number =>
  useCalculationsStore(state => state.calculations.totalBetAmounts);

export const useTotalBetExpectedRatios = (): number =>
  useCalculationsStore(state => state.calculations.totalBetExpectedRatios);

export const useTotalBetNetExpected = (): number =>
  useCalculationsStore(state => state.calculations.totalBetNetExpected);

export const useTotalWinningOdds = (): number =>
  useCalculationsStore(state => state.calculations.totalWinningOdds);

export const useTotalWinningPayoff = (): number =>
  useCalculationsStore(state => state.calculations.totalWinningPayoff);

export const useTotalEnabledBets = (): number =>
  useCalculationsStore(state => state.calculations.totalEnabledBets);

export const useArenaRatios = (): number[] =>
  useCalculationsStore(state => state.calculations.arenaRatios);

export const useWinningBetBinary = (): number =>
  useCalculationsStore(state => state.calculations.winningBetBinary);

export const useUsedProbabilities = (): number[][] =>
  useCalculationsStore(state => state.calculations.usedProbabilities);

// Round data hooks
export const usePirateId = (arenaId: number, pirateIndex: number): number =>
  useRoundDataStore(
    state => state.roundState.roundData?.pirates?.[arenaId]?.[pirateIndex] as number,
  );

export const useOpeningOdds = (arenaId: number, pirateIndex: number): number =>
  useRoundDataStore(
    state => state.roundState.roundData?.openingOdds?.[arenaId]?.[pirateIndex + 1] as number,
  );

export const useCurrentOdds = (arenaId: number, pirateIndex: number): number =>
  useRoundDataStore(
    state => state.roundState.roundData?.currentOdds?.[arenaId]?.[pirateIndex + 1] as number,
  );

export const usePiratesForArena = (arenaId: number): number[] | undefined =>
  useRoundDataStore(state => state.roundState.roundData?.pirates?.[arenaId]);

export const useFoodsForArena = (arenaId: number): number[] | undefined =>
  useRoundDataStore(state => state.roundState.roundData?.foods?.[arenaId]);

export const useChanges = (): OddsChange[] | undefined =>
  useRoundDataStore(state => state.roundState.roundData?.changes);

export const useWinnersBinary = (): number =>
  useCalculationsStore(state => state.calculations.winningBetBinary);

export const useRoundWinners = (): number[] =>
  useRoundDataStore(state => state.roundState.roundData.winners ?? []);

export const useHasRoundWinners = (): boolean =>
  useRoundDataStore(state => {
    const winners = state.roundState.roundData.winners;
    return !!(winners && winners.some(winner => winner > 0));
  });

export const useRoundWinnersBinary = (): number =>
  useRoundDataStore(state => {
    const winners = state.roundState.roundData.winners;
    return winners ? computePiratesBinary(winners) : 0;
  });

// Settings hooks
export const useBigBrain = (): boolean =>
  useRoundDataStore(state => !!state.roundState.advanced?.bigBrain);

export const useLogitModelSetting = (): boolean =>
  useRoundDataStore(state => !!state.roundState.advanced.useLogitModel);

export const useCustomOddsMode = (): boolean =>
  useRoundDataStore(
    state => !!state.roundState.advanced?.bigBrain && !!state.roundState.advanced?.customOddsMode,
  );

export const useFaDetails = (): boolean =>
  useRoundDataStore(
    state => !!state.roundState.advanced?.bigBrain && !!state.roundState.advanced?.faDetails,
  );

export const useOddsTimeline = (): boolean =>
  useRoundDataStore(
    state => !!state.roundState.advanced?.bigBrain && !!state.roundState.advanced?.oddsTimeline,
  );

// Separate hooks for timestamp data to avoid object creation
export const useTimestampValue = (): string | undefined =>
  useTimestampStore(state => state.timestamp);

export const useLastChange = (): string | undefined => useTimestampStore(state => state.lastChange);

export const useSelectedRound = (): number =>
  useRoundDataStore(state => state.roundState.currentSelectedRound);

// Separate action hooks to avoid object creation
export const useInitializeRoundData = (): (() => void) =>
  useRoundDataStore(state => state.initialize);

export const useUpdateSelectedRound = (): ((round: number) => void) =>
  useRoundDataStore(state => state.updateSelectedRound);

// New granular toggle hooks for better performance
export const useToggleBigBrain = (): (() => void) =>
  useRoundDataStore(state => state.toggleBigBrain);

export const useToggleFaDetails = (): (() => void) =>
  useRoundDataStore(state => state.toggleFaDetails);

export const useToggleOddsTimeline = (): (() => void) =>
  useRoundDataStore(state => state.toggleOddsTimeline);

export const useToggleCustomOddsMode = (): (() => void) =>
  useRoundDataStore(state => state.toggleCustomOddsMode);

export const useToggleUseLogitModel = (): (() => void) =>
  useRoundDataStore(state => state.toggleUseLogitModel);

// New optimized hooks for specific bet data to prevent re-renders
export const useSpecificBetOdds = (betIndex: number): number =>
  useCalculationsStore(state => state.calculations.betOdds.get(betIndex) ?? 0);

export const useSpecificBetPayoff = (betIndex: number): number =>
  useCalculationsStore(state => state.calculations.betPayoffs.get(betIndex) ?? 0);

export const useSpecificBetProbability = (betIndex: number): number =>
  useCalculationsStore(state => state.calculations.betProbabilities.get(betIndex) ?? 0);

export const useSpecificBetBinary = (betIndex: number): number =>
  useCalculationsStore(state => state.calculations.betBinaries.get(betIndex) ?? 0);

export const useSpecificBetExpectedRatio = (betIndex: number): number =>
  useCalculationsStore(state => state.calculations.betExpectedRatios.get(betIndex) ?? 0);

export const useSpecificBetNetExpected = (betIndex: number): number =>
  useCalculationsStore(state => state.calculations.betNetExpected.get(betIndex) ?? 0);

export const useSpecificBetMaxBet = (betIndex: number): number =>
  useCalculationsStore(state => state.calculations.betMaxBets.get(betIndex) ?? 0);

// Hook for getting only the calculation status without the full calculations object
export const useIsCalculated = (): boolean =>
  useCalculationsStore(state => state.calculations.calculated);

// Hook for getting only the round data status without the full round data
export const useHasRoundData = (): boolean =>
  useRoundDataStore(state => state.roundState.roundData !== null);

export const useOptimizedBetAmount = (betIndex: number): number =>
  useBetManagementStore(state => {
    const currentBetAmounts = state.allBetAmounts.get(state.currentBet);
    return currentBetAmounts?.get(betIndex) || 0;
  });

// Stable probability value hooks
export const useStableUsedProbability = (arenaId: number, pirateIndex: number): number =>
  useCalculationsStore(() =>
    memoizedCalculations.getStableValue(
      `usedProb_${arenaId}_${pirateIndex}`,
      calc => calc.usedProbabilities?.[arenaId]?.[pirateIndex] ?? 0,
    ),
  );

export const useStableLogitProbability = (arenaId: number, pirateIndex: number): number =>
  useCalculationsStore(() =>
    memoizedCalculations.getStableValue(
      `logitProb_${arenaId}_${pirateIndex}`,
      calc => calc.logitProbabilities?.prob?.[arenaId]?.[pirateIndex] ?? 0,
    ),
  );

export const useStableLegacyProbabilityMin = (arenaId: number, pirateIndex: number): number =>
  useCalculationsStore(() =>
    memoizedCalculations.getStableValue(
      `legacyProbMin_${arenaId}_${pirateIndex}`,
      calc => calc.legacyProbabilities?.min?.[arenaId]?.[pirateIndex] ?? 0,
    ),
  );

export const useStableLegacyProbabilityMax = (arenaId: number, pirateIndex: number): number =>
  useCalculationsStore(() =>
    memoizedCalculations.getStableValue(
      `legacyProbMax_${arenaId}_${pirateIndex}`,
      calc => calc.legacyProbabilities?.max?.[arenaId]?.[pirateIndex] ?? 0,
    ),
  );

export const useStableLegacyProbabilityStd = (arenaId: number, pirateIndex: number): number =>
  useCalculationsStore(() =>
    memoizedCalculations.getStableValue(
      `legacyProbStd_${arenaId}_${pirateIndex}`,
      calc => calc.legacyProbabilities?.std?.[arenaId]?.[pirateIndex] ?? 0,
    ),
  );

export const useStablePirateFA = (arenaId: number, pirateIndex: number): number =>
  useCalculationsStore(() =>
    memoizedCalculations.getStableValue(`pirateFA_${arenaId}_${pirateIndex}`, calc => {
      const faArr = calc.pirateFAs?.get(arenaId)?.[pirateIndex];
      return faArr ? faArr.reduce((acc, curr) => acc + curr, 0) : 0;
    }),
  );

// Optimized hooks for custom values that will prevent cross-component re-renders
export const useCustomOddsValue = (arenaIndex: number, pirateIndex: number): number | undefined =>
  // Use this explicit subscription to ensure we rerender when this specific value changes
  useRoundDataStore(state => {
    // We need to access specific parts of the state directly to ensure proper subscription
    const customOdds = state.roundState.customOdds;

    // If there's no custom odds matrix or empty at this position, return undefined
    if (!customOdds || !customOdds[arenaIndex]) {
      return undefined;
    }

    // Return the specific value at this position
    const arenaOdds = customOdds[arenaIndex];
    return arenaOdds ? arenaOdds[pirateIndex] : undefined;
  });

export const useCustomProbsValue = (arenaIndex: number, pirateIndex: number): number | undefined =>
  // Use this explicit subscription to ensure we rerender when this specific value changes
  useRoundDataStore(state => {
    // We need to access specific parts of the state directly to ensure proper subscription
    const customProbs = state.roundState.customProbs;

    // If there's no custom probs matrix or empty at this position, return undefined
    if (!customProbs || !customProbs[arenaIndex]) {
      return undefined;
    }

    // Return the specific value at this position
    const arenaProbs = customProbs[arenaIndex];
    return arenaProbs ? arenaProbs[pirateIndex] : undefined;
  });

// Optimized selectors for BetBadges component performance - cached empty objects to prevent recreation
const emptyBetsMap = new Map() as Bet;
const emptyBetAmountsMap = makeEmptyBetAmounts(10) as BetAmount;

export const useOptimizedBetsForIndex = (index: number): Bet =>
  useBetManagementStore(state => state.allBets.get(index) || emptyBetsMap) as Bet;

export const useOptimizedBetAmountsForIndex = (index: number): BetAmount =>
  useBetManagementStore(state => state.allBetAmounts.get(index) || emptyBetAmountsMap) as BetAmount;
