import type {
  LogitProbabilityData,
  PayoutTables,
  ProbabilityData,
  RoundCalculationResult,
  RoundData,
} from '../../types';
import type { Bet, BetAmount, OddsData, ProbabilitiesData } from '../../types/bets';
import { computePiratesBinary } from '../maths';

import { useBetStore } from './betStore';
import { useRoundStore } from './roundStore';

export { useBetStore } from './betStore';
export { useRoundStore, setToastFunction } from './roundStore';

// =============================================================================
// BET HOOKS (from betStore)
// =============================================================================

export const useCurrentBet = (): number => useBetStore(state => state.currentBet);
export const useAllBets = (): Map<number, Bet> => useBetStore(state => state.allBets);
export const useAllBetAmounts = (): Map<number, BetAmount> =>
  useBetStore(state => state.allBetAmounts);
export const useAllBetSetNames = (): Map<number, string> => useBetStore(state => state.allNames);

export const useCurrentBetName = (): string =>
  useBetStore(state => state.allNames.get(state.currentBet) ?? 'Unknown Set');

export const useCurrentBets = (): Bet =>
  useBetStore(state => state.allBets.get(state.currentBet) ?? new Map());

export const useCurrentBetAmounts = (): BetAmount =>
  useBetStore(state => state.allBetAmounts.get(state.currentBet) ?? new Map());

export const useBetCount = (): number =>
  useBetStore(state => state.allBets.get(state.currentBet)?.size ?? 0);

export const useBetSetCount = (): number => useBetStore(state => state.allBets.size);

export const useHasAnyBets = (): boolean =>
  useBetStore(state =>
    Array.from(state.allBets.get(state.currentBet)?.values() ?? []).some(bet =>
      bet.some(pirate => pirate > 0),
    ),
  );

// Actions
export const useSetCurrentBet = (): ((value: number) => void) =>
  useBetStore(state => state.setCurrentBet);
export const useAddNewSet = (): ((
  name: string,
  bets: Bet,
  betAmounts: BetAmount,
  replace?: boolean,
) => void) => useBetStore(state => state.addNewSet);
export const useDeleteBetSet = (): ((index: number) => void) =>
  useBetStore(state => state.deleteBetSet);
export const useSwapBets = (): ((uiIndex1: number, uiIndex2: number) => void) =>
  useBetStore(state => state.swapBets);
export const useUpdatePirate = (): ((
  betIndex: number,
  arenaIndex: number,
  pirateIndex: number,
) => void) => useBetStore(state => state.updatePirate);
export const useUpdateBetAmount = (): ((betIndex: number, amount: number) => void) =>
  useBetStore(state => state.updateBetAmount);
export const useUpdateBetAmounts = (): ((
  updates: Array<{ betIndex: number; amount: number }>,
) => void) => useBetStore(state => state.updateBetAmounts);
export const useSetAllBets = (): ((bets: Map<number, Bet>) => void) =>
  useBetStore(state => state.setAllBets);
export const useSetAllBetAmounts = (): ((amounts: Map<number, BetAmount>) => void) =>
  useBetStore(state => state.setAllBetAmounts);
export const useClearAllBets = (): (() => void) => useBetStore(state => state.clearAllBets);

// =============================================================================
// ROUND DATA HOOKS (from roundStore)
// =============================================================================

export const useRoundData = (): RoundData => useRoundStore(state => state.roundData);
export const useCurrentRound = (): number => useRoundStore(state => state.currentRound);
export const useSelectedRound = (): number => useRoundStore(state => state.currentSelectedRound);
export const useIsLoading = (): boolean => useRoundStore(state => state.isLoading);
export const useIsRoundSwitching = (): boolean => useRoundStore(state => state.isRoundSwitching);

export const usePirates = (): number[][] => useRoundStore(state => state.roundData.pirates);
export const useFoods = (): number[][] => useRoundStore(state => state.roundData.foods);
export const useOpeningOdds = (): number[][] => useRoundStore(state => state.roundData.openingOdds);
export const useCurrentOdds = (): number[][] => useRoundStore(state => state.roundData.currentOdds);
export const useChanges = (): RoundData['changes'] =>
  useRoundStore(state => state.roundData.changes);
export const useWinners = (): number[] | undefined =>
  useRoundStore(state => state.roundData.winners);
export const useTimestamp = (): string | undefined =>
  useRoundStore(state => state.roundData.timestamp);
export const useLastChange = (): string | undefined =>
  useRoundStore(state => state.roundData.lastChange);

export const useHasRoundWinners = (): boolean =>
  useRoundStore(state => {
    const winners = state.roundData.winners;
    return !!(winners && winners.some(w => w > 0));
  });

export const useRoundWinnersBinary = (): number =>
  useRoundStore(state => {
    const winners = state.roundData.winners;
    return winners ? computePiratesBinary(winners) : 0;
  });

// Settings
export const useTableMode = (): string => useRoundStore(state => state.tableMode);
export const useViewMode = (): boolean => useRoundStore(state => state.viewMode);
export const useUseWebDomain = (): boolean => useRoundStore(state => state.useWebDomain);
export const useBigBrain = (): boolean => useRoundStore(state => state.bigBrain);
export const useFaDetails = (): boolean =>
  useRoundStore(state => state.faDetails && state.bigBrain);
export const useCustomOddsMode = (): boolean =>
  useRoundStore(state => state.customOddsMode && state.bigBrain);
export const useOddsTimeline = (): boolean =>
  useRoundStore(state => state.oddsTimeline && state.bigBrain);
export const useLogitModelSetting = (): boolean => useRoundStore(state => state.useLogitModel);

export const useCustomOdds = (): OddsData | null => useRoundStore(state => state.customOdds);
export const useCustomProbs = (): ProbabilitiesData | null =>
  useRoundStore(state => state.customProbs);

// Setting Actions
export const useUpdateSelectedRound = (): ((round: number) => void) =>
  useRoundStore(state => state.updateSelectedRound);
export const useSetTableMode = (): ((mode: string) => void) =>
  useRoundStore(state => state.setTableMode);
export const useSetViewMode = (): ((viewMode: boolean) => void) =>
  useRoundStore(state => state.setViewMode);
export const useSetUseWebDomain = (): ((useWebDomain: boolean) => void) =>
  useRoundStore(state => state.setUseWebDomain);
export const useToggleBigBrain = (): (() => void) => useRoundStore(state => state.toggleBigBrain);
export const useToggleFaDetails = (): (() => void) => useRoundStore(state => state.toggleFaDetails);
export const useToggleOddsTimeline = (): (() => void) =>
  useRoundStore(state => state.toggleOddsTimeline);
export const useToggleCustomOddsMode = (): (() => void) =>
  useRoundStore(state => state.toggleCustomOddsMode);
export const useToggleUseLogitModel = (): (() => void) =>
  useRoundStore(state => state.toggleUseLogitModel);
export const useSetCustomOdds = (): ((odds: OddsData) => void) =>
  useRoundStore(state => state.setCustomOdds);
export const useSetCustomProbs = (): ((probs: ProbabilitiesData) => void) =>
  useRoundStore(state => state.setCustomProbs);

export const useInitializeRoundData = (): (() => void) => useRoundStore(state => state.initialize);

// =============================================================================
// CALCULATION HOOKS (from roundStore.calculations)
// =============================================================================

export const useCalculations = (): RoundCalculationResult =>
  useRoundStore(state => state.calculations);

export const useIsCalculated = (): boolean => useRoundStore(state => state.calculations.calculated);

export const useBetOdds = (): Map<number, number> =>
  useRoundStore(state => state.calculations.betOdds);
export const useBetPayoffs = (): Map<number, number> =>
  useRoundStore(state => state.calculations.betPayoffs);
export const useBetProbabilities = (): Map<number, number> =>
  useRoundStore(state => state.calculations.betProbabilities);
export const useBetBinaries = (): Map<number, number> =>
  useRoundStore(state => state.calculations.betBinaries);
export const useBetExpectedRatios = (): Map<number, number> =>
  useRoundStore(state => state.calculations.betExpectedRatios);
export const useBetNetExpected = (): Map<number, number> =>
  useRoundStore(state => state.calculations.betNetExpected);
export const useBetMaxBets = (): Map<number, number> =>
  useRoundStore(state => state.calculations.betMaxBets);

export const useTotalBetAmounts = (): number =>
  useRoundStore(state => state.calculations.totalBetAmounts);
export const useTotalBetExpectedRatios = (): number =>
  useRoundStore(state => state.calculations.totalBetExpectedRatios);
export const useTotalBetNetExpected = (): number =>
  useRoundStore(state => state.calculations.totalBetNetExpected);
export const useTotalWinningOdds = (): number =>
  useRoundStore(state => state.calculations.totalWinningOdds);
export const useTotalWinningPayoff = (): number =>
  useRoundStore(state => state.calculations.totalWinningPayoff);
export const useTotalEnabledBets = (): number =>
  useRoundStore(state => state.calculations.totalEnabledBets);

export const useWinningBetBinary = (): number =>
  useRoundStore(state => state.calculations.winningBetBinary);
export const useArenaRatios = (): number[] =>
  useRoundStore(state => state.calculations.arenaRatios);
export const useUsedProbabilities = (): ProbabilitiesData =>
  useRoundStore(state => state.calculations.usedProbabilities);
export const useLegacyProbabilities = (): ProbabilityData =>
  useRoundStore(state => state.calculations.legacyProbabilities);
export const useLogitProbabilities = (): LogitProbabilityData =>
  useRoundStore(state => state.calculations.logitProbabilities);
export const usePirateFAs = (): Map<number, number[][]> =>
  useRoundStore(state => state.calculations.pirateFAs);
export const usePayoutTables = (): PayoutTables =>
  useRoundStore(state => state.calculations.payoutTables);

// =============================================================================
// DERIVED/COMPUTED HOOKS
// =============================================================================

// These are commonly used patterns that components need

export const useBetLine = (betIndex: number): number[] =>
  useBetStore(state => {
    const bets = state.allBets.get(state.currentBet);
    return bets?.get(betIndex) ?? [0, 0, 0, 0, 0];
  });

export const useBetAmount = (betIndex: number): number =>
  useBetStore(state => {
    const amounts = state.allBetAmounts.get(state.currentBet);
    return amounts?.get(betIndex) ?? -1000;
  });

export const useIsPirateSelected = (
  betIndex: number,
  arenaIndex: number,
  pirateIndex: number,
): boolean =>
  useBetStore(state => {
    const bets = state.allBets.get(state.currentBet);
    const betLine = bets?.get(betIndex);
    return betLine ? betLine[arenaIndex] === pirateIndex : false;
  });

export const useBetOddsValue = (betIndex: number): number =>
  useRoundStore(state => state.calculations.betOdds.get(betIndex) ?? 0);

export const useBetPayoffValue = (betIndex: number): number =>
  useRoundStore(state => state.calculations.betPayoffs.get(betIndex) ?? 0);

export const useBetProbabilityValue = (betIndex: number): number =>
  useRoundStore(state => state.calculations.betProbabilities.get(betIndex) ?? 0);

export const useBetBinaryValue = (betIndex: number): number =>
  useRoundStore(state => state.calculations.betBinaries.get(betIndex) ?? 0);

export const useBetExpectedRatioValue = (betIndex: number): number =>
  useRoundStore(state => state.calculations.betExpectedRatios.get(betIndex) ?? 0);

export const useBetNetExpectedValue = (betIndex: number): number =>
  useRoundStore(state => state.calculations.betNetExpected.get(betIndex) ?? 0);

export const useBetMaxBetValue = (betIndex: number): number =>
  useRoundStore(state => state.calculations.betMaxBets.get(betIndex) ?? 0);

export const usePirateForArena = (arenaId: number, pirateIndex: number): number | undefined =>
  useRoundStore(state => state.roundData.pirates?.[arenaId]?.[pirateIndex]);

export const useFoodForArena = (arenaId: number, pirateIndex: number): number | undefined =>
  useRoundStore(state => state.roundData.foods?.[arenaId]?.[pirateIndex]);

export const useOpeningOddsValue = (arenaId: number, pirateIndex: number): number | undefined =>
  useRoundStore(state => state.roundData.openingOdds?.[arenaId]?.[pirateIndex + 1]);

export const useCurrentOddsValue = (arenaId: number, pirateIndex: number): number | undefined =>
  useRoundStore(state => state.roundData.currentOdds?.[arenaId]?.[pirateIndex + 1]);

export const useCustomOddsValue = (arenaIndex: number, pirateIndex: number): number | undefined =>
  useRoundStore(state => state.customOdds?.[arenaIndex]?.[pirateIndex]);

export const useCustomProbsValue = (arenaIndex: number, pirateIndex: number): number | undefined =>
  useRoundStore(state => state.customProbs?.[arenaIndex]?.[pirateIndex]);

export const useUsedProbabilityValue = (arenaId: number, pirateIndex: number): number =>
  useRoundStore(state => state.calculations.usedProbabilities?.[arenaId]?.[pirateIndex] ?? 0);

export const useLogitProbabilityValue = (arenaId: number, pirateIndex: number): number =>
  useRoundStore(
    state => state.calculations.logitProbabilities?.prob?.[arenaId]?.[pirateIndex] ?? 0,
  );

export const useLegacyProbabilityMin = (arenaId: number, pirateIndex: number): number =>
  useRoundStore(
    state => state.calculations.legacyProbabilities?.min?.[arenaId]?.[pirateIndex] ?? 0,
  );

export const useLegacyProbabilityMax = (arenaId: number, pirateIndex: number): number =>
  useRoundStore(
    state => state.calculations.legacyProbabilities?.max?.[arenaId]?.[pirateIndex] ?? 0,
  );

export const useLegacyProbabilityStd = (arenaId: number, pirateIndex: number): number =>
  useRoundStore(
    state => state.calculations.legacyProbabilities?.std?.[arenaId]?.[pirateIndex] ?? 0,
  );

export const usePirateFA = (arenaId: number, pirateIndex: number): number =>
  useRoundStore(state => {
    const faArr = state.calculations.pirateFAs?.get(arenaId)?.[pirateIndex];
    return faArr ? faArr.reduce((acc, curr) => acc + curr, 0) : 0;
  });

// Legacy aliases for backwards compatibility (will update components to use new names)
export const useCalculationsStatus = useIsCalculated;
export const useHasRoundData = (): boolean => useRoundStore(state => state.roundData !== null);
export const useWinnersBinary = useRoundWinnersBinary;
export const useRoundWinners = useWinners;
export const useBetLineSpecific = useBetLine;
export const useSpecificBetAmount = useBetAmount;
export const useSpecificBetOdds = useBetOddsValue;
export const useSpecificBetPayoff = useBetPayoffValue;
export const useSpecificBetProbability = useBetProbabilityValue;
export const useSpecificBetBinary = useBetBinaryValue;
export const useSpecificBetExpectedRatio = useBetExpectedRatioValue;
export const useSpecificBetNetExpected = useBetNetExpectedValue;
export const useSpecificBetMaxBet = useBetMaxBetValue;
export const usePirateId = usePirateForArena;
export const usePiratesForArena = (arenaId: number): number[] | undefined =>
  useRoundStore(state => state.roundData.pirates?.[arenaId]);
export const useFoodsForArena = (arenaId: number): number[] | undefined =>
  useRoundStore(state => state.roundData.foods?.[arenaId]);
export const useTimestampValue = useTimestamp;
export const useUpdateSinglePirate = useUpdatePirate;
export const useUpdateSingleBetAmount = useUpdateBetAmount;
export const useBatchUpdateBetAmounts = useUpdateBetAmounts;
export const useStableUsedProbability = useUsedProbabilityValue;
export const useStableLogitProbability = useLogitProbabilityValue;
export const useStableLegacyProbabilityMin = useLegacyProbabilityMin;
export const useStableLegacyProbabilityMax = useLegacyProbabilityMax;
export const useStableLegacyProbabilityStd = useLegacyProbabilityStd;
export const useStablePirateFA = usePirateFA;
export const useOptimizedBetAmount = useBetAmount;
export const useAllBetsForURLData = useAllBets;
export const useAllBetAmountsForURLData = useAllBetAmounts;
export const useCurrentBetForURL = useCurrentBet;

// For components that need whole bet sets
export const useOptimizedBetsForIndex = (index: number): Bet =>
  useBetStore(state => state.allBets.get(index) ?? new Map());

export const useOptimizedBetAmountsForIndex = (index: number): BetAmount =>
  useBetStore(state => state.allBetAmounts.get(index) ?? new Map());

// Pirate selection helpers (aliases for backwards compatibility)
export const useRoundPirates = usePirates;
export const useRoundOpeningOdds = (): number[][] =>
  useRoundStore(state => state.roundData.openingOdds);
export const useRoundCurrentOdds = (): number[][] =>
  useRoundStore(state => state.roundData.currentOdds);
