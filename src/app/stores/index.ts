import { computePiratesBinary } from '../maths';

import { useBetStore } from './betStore';
import { useRoundStore } from './roundStore';

export { useBetStore } from './betStore';
export { useRoundStore, setToastFunction } from './roundStore';

// =============================================================================
// BET HOOKS (from betStore)
// =============================================================================

export const useCurrentBet = () => useBetStore(state => state.currentBet);
export const useAllBets = () => useBetStore(state => state.allBets);
export const useAllBetAmounts = () => useBetStore(state => state.allBetAmounts);
export const useAllBetSetNames = () => useBetStore(state => state.allNames);

export const useCurrentBetName = () =>
  useBetStore(state => state.allNames.get(state.currentBet) ?? 'Unknown Set');

export const useCurrentBets = () =>
  useBetStore(state => state.allBets.get(state.currentBet) ?? new Map());

export const useCurrentBetAmounts = () =>
  useBetStore(state => state.allBetAmounts.get(state.currentBet) ?? new Map());

export const useBetCount = () =>
  useBetStore(state => state.allBets.get(state.currentBet)?.size ?? 0);

export const useBetSetCount = () => useBetStore(state => state.allBets.size);

export const useHasAnyBets = () =>
  useBetStore(state =>
    Array.from(state.allBets.get(state.currentBet)?.values() ?? []).some(bet =>
      bet.some(pirate => pirate > 0),
    ),
  );

// Actions
export const useSetCurrentBet = () => useBetStore(state => state.setCurrentBet);
export const useAddNewSet = () => useBetStore(state => state.addNewSet);
export const useDeleteBetSet = () => useBetStore(state => state.deleteBetSet);
export const useSwapBets = () => useBetStore(state => state.swapBets);
export const useUpdatePirate = () => useBetStore(state => state.updatePirate);
export const useUpdateBetAmount = () => useBetStore(state => state.updateBetAmount);
export const useUpdateBetAmounts = () => useBetStore(state => state.updateBetAmounts);
export const useSetAllBets = () => useBetStore(state => state.setAllBets);
export const useSetAllBetAmounts = () => useBetStore(state => state.setAllBetAmounts);
export const useClearAllBets = () => useBetStore(state => state.clearAllBets);

// =============================================================================
// ROUND DATA HOOKS (from roundStore)
// =============================================================================

export const useRoundData = () => useRoundStore(state => state.roundData);
export const useCurrentRound = () => useRoundStore(state => state.currentRound);
export const useSelectedRound = () => useRoundStore(state => state.currentSelectedRound);
export const useIsLoading = () => useRoundStore(state => state.isLoading);
export const useIsRoundSwitching = () => useRoundStore(state => state.isRoundSwitching);

export const usePirates = () => useRoundStore(state => state.roundData.pirates);
export const useFoods = () => useRoundStore(state => state.roundData.foods);
export const useOpeningOdds = () => useRoundStore(state => state.roundData.openingOdds);
export const useCurrentOdds = () => useRoundStore(state => state.roundData.currentOdds);
export const useChanges = () => useRoundStore(state => state.roundData.changes);
export const useWinners = () => useRoundStore(state => state.roundData.winners);
export const useTimestamp = () => useRoundStore(state => state.roundData.timestamp);
export const useLastChange = () => useRoundStore(state => state.roundData.lastChange);

export const useHasRoundWinners = () =>
  useRoundStore(state => {
    const winners = state.roundData.winners;
    return !!(winners && winners.some(w => w > 0));
  });

export const useRoundWinnersBinary = () =>
  useRoundStore(state => {
    const winners = state.roundData.winners;
    return winners ? computePiratesBinary(winners) : 0;
  });

// Settings
export const useTableMode = () => useRoundStore(state => state.tableMode);
export const useViewMode = () => useRoundStore(state => state.viewMode);
export const useUseWebDomain = () => useRoundStore(state => state.useWebDomain);
export const useBigBrain = () => useRoundStore(state => state.bigBrain);
export const useFaDetails = () => useRoundStore(state => state.faDetails && state.bigBrain);
export const useCustomOddsMode = () =>
  useRoundStore(state => state.customOddsMode && state.bigBrain);
export const useOddsTimeline = () => useRoundStore(state => state.oddsTimeline && state.bigBrain);
export const useLogitModelSetting = () => useRoundStore(state => state.useLogitModel);

export const useCustomOdds = () => useRoundStore(state => state.customOdds);
export const useCustomProbs = () => useRoundStore(state => state.customProbs);

// Setting Actions
export const useUpdateSelectedRound = () => useRoundStore(state => state.updateSelectedRound);
export const useSetTableMode = () => useRoundStore(state => state.setTableMode);
export const useSetViewMode = () => useRoundStore(state => state.setViewMode);
export const useSetUseWebDomain = () => useRoundStore(state => state.setUseWebDomain);
export const useToggleBigBrain = () => useRoundStore(state => state.toggleBigBrain);
export const useToggleFaDetails = () => useRoundStore(state => state.toggleFaDetails);
export const useToggleOddsTimeline = () => useRoundStore(state => state.toggleOddsTimeline);
export const useToggleCustomOddsMode = () => useRoundStore(state => state.toggleCustomOddsMode);
export const useToggleUseLogitModel = () => useRoundStore(state => state.toggleUseLogitModel);
export const useSetCustomOdds = () => useRoundStore(state => state.setCustomOdds);
export const useSetCustomProbs = () => useRoundStore(state => state.setCustomProbs);

export const useInitializeRoundData = () => useRoundStore(state => state.initialize);

// =============================================================================
// CALCULATION HOOKS (from roundStore.calculations)
// =============================================================================

export const useCalculations = () => useRoundStore(state => state.calculations);

export const useIsCalculated = () => useRoundStore(state => state.calculations.calculated);

export const useBetOdds = () => useRoundStore(state => state.calculations.betOdds);
export const useBetPayoffs = () => useRoundStore(state => state.calculations.betPayoffs);
export const useBetProbabilities = () =>
  useRoundStore(state => state.calculations.betProbabilities);
export const useBetBinaries = () => useRoundStore(state => state.calculations.betBinaries);
export const useBetExpectedRatios = () =>
  useRoundStore(state => state.calculations.betExpectedRatios);
export const useBetNetExpected = () => useRoundStore(state => state.calculations.betNetExpected);
export const useBetMaxBets = () => useRoundStore(state => state.calculations.betMaxBets);

export const useTotalBetAmounts = () => useRoundStore(state => state.calculations.totalBetAmounts);
export const useTotalBetExpectedRatios = () =>
  useRoundStore(state => state.calculations.totalBetExpectedRatios);
export const useTotalBetNetExpected = () =>
  useRoundStore(state => state.calculations.totalBetNetExpected);
export const useTotalWinningOdds = () =>
  useRoundStore(state => state.calculations.totalWinningOdds);
export const useTotalWinningPayoff = () =>
  useRoundStore(state => state.calculations.totalWinningPayoff);
export const useTotalEnabledBets = () =>
  useRoundStore(state => state.calculations.totalEnabledBets);

export const useWinningBetBinary = () =>
  useRoundStore(state => state.calculations.winningBetBinary);
export const useArenaRatios = () => useRoundStore(state => state.calculations.arenaRatios);
export const useUsedProbabilities = () =>
  useRoundStore(state => state.calculations.usedProbabilities);
export const useLegacyProbabilities = () =>
  useRoundStore(state => state.calculations.legacyProbabilities);
export const useLogitProbabilities = () =>
  useRoundStore(state => state.calculations.logitProbabilities);
export const usePirateFAs = () => useRoundStore(state => state.calculations.pirateFAs);
export const usePayoutTables = () => useRoundStore(state => state.calculations.payoutTables);

// =============================================================================
// DERIVED/COMPUTED HOOKS
// =============================================================================

// These are commonly used patterns that components need

export const useBetLine = (betIndex: number) =>
  useBetStore(state => {
    const bets = state.allBets.get(state.currentBet);
    return bets?.get(betIndex) ?? [0, 0, 0, 0, 0];
  });

export const useBetAmount = (betIndex: number) =>
  useBetStore(state => {
    const amounts = state.allBetAmounts.get(state.currentBet);
    return amounts?.get(betIndex) ?? -1000;
  });

export const useIsPirateSelected = (betIndex: number, arenaIndex: number, pirateIndex: number) =>
  useBetStore(state => {
    const bets = state.allBets.get(state.currentBet);
    const betLine = bets?.get(betIndex);
    return betLine ? betLine[arenaIndex] === pirateIndex : false;
  });

export const useBetOddsValue = (betIndex: number) =>
  useRoundStore(state => state.calculations.betOdds.get(betIndex) ?? 0);

export const useBetPayoffValue = (betIndex: number) =>
  useRoundStore(state => state.calculations.betPayoffs.get(betIndex) ?? 0);

export const useBetProbabilityValue = (betIndex: number) =>
  useRoundStore(state => state.calculations.betProbabilities.get(betIndex) ?? 0);

export const useBetBinaryValue = (betIndex: number) =>
  useRoundStore(state => state.calculations.betBinaries.get(betIndex) ?? 0);

export const useBetExpectedRatioValue = (betIndex: number) =>
  useRoundStore(state => state.calculations.betExpectedRatios.get(betIndex) ?? 0);

export const useBetNetExpectedValue = (betIndex: number) =>
  useRoundStore(state => state.calculations.betNetExpected.get(betIndex) ?? 0);

export const useBetMaxBetValue = (betIndex: number) =>
  useRoundStore(state => state.calculations.betMaxBets.get(betIndex) ?? 0);

export const usePirateForArena = (arenaId: number, pirateIndex: number) =>
  useRoundStore(state => state.roundData.pirates?.[arenaId]?.[pirateIndex]);

export const useFoodForArena = (arenaId: number, pirateIndex: number) =>
  useRoundStore(state => state.roundData.foods?.[arenaId]?.[pirateIndex]);

export const useOpeningOddsValue = (arenaId: number, pirateIndex: number) =>
  useRoundStore(state => state.roundData.openingOdds?.[arenaId]?.[pirateIndex + 1]);

export const useCurrentOddsValue = (arenaId: number, pirateIndex: number) =>
  useRoundStore(state => state.roundData.currentOdds?.[arenaId]?.[pirateIndex + 1]);

export const useCustomOddsValue = (arenaIndex: number, pirateIndex: number) =>
  useRoundStore(state => state.customOdds?.[arenaIndex]?.[pirateIndex]);

export const useCustomProbsValue = (arenaIndex: number, pirateIndex: number) =>
  useRoundStore(state => state.customProbs?.[arenaIndex]?.[pirateIndex]);

export const useUsedProbabilityValue = (arenaId: number, pirateIndex: number) =>
  useRoundStore(state => state.calculations.usedProbabilities?.[arenaId]?.[pirateIndex] ?? 0);

export const useLogitProbabilityValue = (arenaId: number, pirateIndex: number) =>
  useRoundStore(
    state => state.calculations.logitProbabilities?.prob?.[arenaId]?.[pirateIndex] ?? 0,
  );

export const useLegacyProbabilityMin = (arenaId: number, pirateIndex: number) =>
  useRoundStore(
    state => state.calculations.legacyProbabilities?.min?.[arenaId]?.[pirateIndex] ?? 0,
  );

export const useLegacyProbabilityMax = (arenaId: number, pirateIndex: number) =>
  useRoundStore(
    state => state.calculations.legacyProbabilities?.max?.[arenaId]?.[pirateIndex] ?? 0,
  );

export const useLegacyProbabilityStd = (arenaId: number, pirateIndex: number) =>
  useRoundStore(
    state => state.calculations.legacyProbabilities?.std?.[arenaId]?.[pirateIndex] ?? 0,
  );

export const usePirateFA = (arenaId: number, pirateIndex: number) =>
  useRoundStore(state => {
    const faArr = state.calculations.pirateFAs?.get(arenaId)?.[pirateIndex];
    return faArr ? faArr.reduce((acc, curr) => acc + curr, 0) : 0;
  });

// Legacy aliases for backwards compatibility (will update components to use new names)
export const useCalculationsStatus = useIsCalculated;
export const useHasRoundData = () => useRoundStore(state => state.roundData !== null);
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
export const usePiratesForArena = (arenaId: number) =>
  useRoundStore(state => state.roundData.pirates?.[arenaId]);
export const useFoodsForArena = (arenaId: number) =>
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
export const useOptimizedBetsForIndex = (index: number) =>
  useBetStore(state => state.allBets.get(index) ?? new Map());

export const useOptimizedBetAmountsForIndex = (index: number) =>
  useBetStore(state => state.allBetAmounts.get(index) ?? new Map());

// Pirate selection helpers (aliases for backwards compatibility)
export const useRoundPirates = usePirates;
export const useRoundOpeningOdds = () => useRoundStore(state => state.roundData.openingOdds);
export const useRoundCurrentOdds = () => useRoundStore(state => state.roundData.currentOdds);
