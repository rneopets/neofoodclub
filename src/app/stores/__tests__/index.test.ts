import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { RoundData } from '../../../types';
import type { Bet, BetAmount } from '../../../types/bets';
import { BET_AMOUNT_DEFAULT } from '../../constants';
import { useBetStore } from '../betStore';
import * as Hooks from '../index';
import { useRoundStore } from '../roundStore';

// Mock universal-cookie before any store imports
vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    };
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Allow the betStore's lazy dynamic import of roundStore to resolve
async function waitForStoreInit(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50));
}

function makeBets(pirates: number[][] = []): Bet {
  const bets: Bet = new Map();
  for (let i = 0; i < pirates.length; i++) {
    bets.set(i + 1, pirates[i] ?? [0, 0, 0, 0, 0]);
  }
  for (let i = pirates.length; i < 10; i++) {
    bets.set(i + 1, [0, 0, 0, 0, 0]);
  }
  return bets;
}

function makeAmounts(amounts: number[] = []): BetAmount {
  const result: BetAmount = new Map();
  for (let i = 0; i < amounts.length; i++) {
    result.set(i + 1, amounts[i] ?? BET_AMOUNT_DEFAULT);
  }
  for (let i = amounts.length; i < 10; i++) {
    result.set(i + 1, BET_AMOUNT_DEFAULT);
  }
  return result;
}

const roundData: RoundData = {
  round: 8000,
  pirates: [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
    [17, 18, 19, 20],
  ],
  openingOdds: [
    [1, 2, 3, 4, 5],
    [1, 2, 3, 4, 5],
    [1, 2, 3, 4, 5],
    [1, 2, 3, 4, 5],
    [1, 2, 3, 4, 5],
  ],
  currentOdds: [
    [1, 2, 3, 4, 5],
    [1, 2, 3, 4, 5],
    [1, 2, 3, 4, 5],
    [1, 2, 3, 4, 5],
    [1, 2, 3, 4, 5],
  ],
  foods: [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  ],
  winners: [0, 0, 0, 0, 0],
};

describe('stores/index hook smoke suite', () => {
  beforeEach(async () => {
    await waitForStoreInit();

    mockFetch.mockReset();
    mockFetch.mockImplementation(() => Promise.resolve({ ok: false, status: 404 }));

    useBetStore.setState({
      currentBet: 0,
      allNames: new Map([
        [0, 'Set A'],
        [1, 'Set B'],
      ]),
      allBets: new Map([
        [0, makeBets([[1, 5, 9, 13, 17]])],
        [1, makeBets()],
      ]),
      allBetAmounts: new Map([
        [0, makeAmounts([1000])],
        [1, makeAmounts()],
      ]),
    });

    useRoundStore.setState({
      roundData,
      currentRound: 8000,
      currentSelectedRound: 8000,
      customOdds: [
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
      ],
      customProbs: null,
      tableMode: 'normal',
      betSetPosition: 'below',
      viewMode: true,
      useWebDomain: false,
      bigBrain: true,
      faDetails: true,
      customOddsMode: true,
      oddsTimeline: false,
      useLogitModel: false,
      maxBet: 5000,
      isLoading: false,
      error: null,
      pollingIntervalId: null,
      fetchAbortController: null,
      isInitializing: false,
    });

    // Populate real calculations from the seeded state above
    useRoundStore.getState().recalculate();
  });

  describe('number-returning hooks', () => {
    it.each<[string, () => number]>([
      ['useCurrentBet', Hooks.useCurrentBet],
      ['useBetCount', Hooks.useBetCount],
      ['useBetSetCount', Hooks.useBetSetCount],
      ['useCurrentRound', Hooks.useCurrentRound],
      ['useSelectedRound', Hooks.useSelectedRound],
      ['useRoundWinnersBinary', Hooks.useRoundWinnersBinary],
      ['useMaxBet', Hooks.useMaxBet],
      ['useTotalBetAmounts', Hooks.useTotalBetAmounts],
      ['useTotalBetExpectedRatios', Hooks.useTotalBetExpectedRatios],
      ['useTotalBetNetExpected', Hooks.useTotalBetNetExpected],
      ['useTotalWinningOdds', Hooks.useTotalWinningOdds],
      ['useTotalWinningPayoff', Hooks.useTotalWinningPayoff],
      ['useTotalEnabledBets', Hooks.useTotalEnabledBets],
      ['useWinningBetBinary', Hooks.useWinningBetBinary],
      ['useWinnersBinary', Hooks.useWinnersBinary],
    ])('%s returns a number', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('number');
    });
  });

  describe('parameterized number-returning hooks', () => {
    it.each<[string, () => number]>([
      ['useBetAmount(1)', (): number => Hooks.useBetAmount(1)],
      ['useBetOddsValue(1)', (): number => Hooks.useBetOddsValue(1)],
      ['useBetPayoffValue(1)', (): number => Hooks.useBetPayoffValue(1)],
      ['useBetProbabilityValue(1)', (): number => Hooks.useBetProbabilityValue(1)],
      ['useBetBinaryValue(1)', (): number => Hooks.useBetBinaryValue(1)],
      ['useBetExpectedRatioValue(1)', (): number => Hooks.useBetExpectedRatioValue(1)],
      ['useBetNetExpectedValue(1)', (): number => Hooks.useBetNetExpectedValue(1)],
      ['useBetMaxBetValue(1)', (): number => Hooks.useBetMaxBetValue(1)],
      ['useUsedProbabilityValue(0,0)', (): number => Hooks.useUsedProbabilityValue(0, 0)],
      ['useLogitProbabilityValue(0,0)', (): number => Hooks.useLogitProbabilityValue(0, 0)],
      ['useLegacyProbabilityMin(0,0)', (): number => Hooks.useLegacyProbabilityMin(0, 0)],
      ['useLegacyProbabilityMax(0,0)', (): number => Hooks.useLegacyProbabilityMax(0, 0)],
      ['useLegacyProbabilityStd(0,0)', (): number => Hooks.useLegacyProbabilityStd(0, 0)],
      ['usePirateFA(0,0)', (): number => Hooks.usePirateFA(0, 0)],
      ['useSpecificBetAmount(1)', (): number => Hooks.useSpecificBetAmount(1)],
      ['useSpecificBetOdds(1)', (): number => Hooks.useSpecificBetOdds(1)],
      ['useSpecificBetPayoff(1)', (): number => Hooks.useSpecificBetPayoff(1)],
      ['useSpecificBetProbability(1)', (): number => Hooks.useSpecificBetProbability(1)],
      ['useSpecificBetBinary(1)', (): number => Hooks.useSpecificBetBinary(1)],
      ['useSpecificBetExpectedRatio(1)', (): number => Hooks.useSpecificBetExpectedRatio(1)],
      ['useSpecificBetNetExpected(1)', (): number => Hooks.useSpecificBetNetExpected(1)],
      ['useSpecificBetMaxBet(1)', (): number => Hooks.useSpecificBetMaxBet(1)],
      ['useStableUsedProbability(0,0)', (): number => Hooks.useStableUsedProbability(0, 0)],
      ['useStableLogitProbability(0,0)', (): number => Hooks.useStableLogitProbability(0, 0)],
      [
        'useStableLegacyProbabilityMin(0,0)',
        (): number => Hooks.useStableLegacyProbabilityMin(0, 0),
      ],
      [
        'useStableLegacyProbabilityMax(0,0)',
        (): number => Hooks.useStableLegacyProbabilityMax(0, 0),
      ],
      [
        'useStableLegacyProbabilityStd(0,0)',
        (): number => Hooks.useStableLegacyProbabilityStd(0, 0),
      ],
      ['useStablePirateFA(0,0)', (): number => Hooks.useStablePirateFA(0, 0)],
      ['useOptimizedBetAmount(1)', (): number => Hooks.useOptimizedBetAmount(1)],
      ['useCurrentBetForURL', (): number => Hooks.useCurrentBetForURL()],
    ])('%s returns a number', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('number');
    });
  });

  describe('parameterized number-or-undefined-returning hooks', () => {
    it.each<[string, () => number | undefined]>([
      ['usePirateForArena(0,0)', (): number | undefined => Hooks.usePirateForArena(0, 0)],
      ['useFoodForArena(0,0)', (): number | undefined => Hooks.useFoodForArena(0, 0)],
      ['useOpeningOddsValue(0,0)', (): number | undefined => Hooks.useOpeningOddsValue(0, 0)],
      ['useCurrentOddsValue(0,0)', (): number | undefined => Hooks.useCurrentOddsValue(0, 0)],
      ['useCustomOddsValue(0,0)', (): number | undefined => Hooks.useCustomOddsValue(0, 0)],
      ['useCustomProbsValue(0,0)', (): number | undefined => Hooks.useCustomProbsValue(0, 0)],
      ['usePirateId(0,0)', (): number | undefined => Hooks.usePirateId(0, 0)],
    ])('%s returns a number or undefined', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(['number', 'undefined']).toContain(typeof result.current);
    });
  });

  describe('boolean-returning hooks', () => {
    it.each<[string, () => boolean]>([
      ['useIsLoading', Hooks.useIsLoading],
      ['useHasAnyBets', Hooks.useHasAnyBets],
      ['useHasAnyBetsAnywhere', Hooks.useHasAnyBetsAnywhere],
      ['useHasRoundWinners', Hooks.useHasRoundWinners],
      ['useViewMode', Hooks.useViewMode],
      ['useUseWebDomain', Hooks.useUseWebDomain],
      ['useBigBrain', Hooks.useBigBrain],
      ['useFaDetails', Hooks.useFaDetails],
      ['useCustomOddsMode', Hooks.useCustomOddsMode],
      ['useOddsTimeline', Hooks.useOddsTimeline],
      ['useLogitModelSetting', Hooks.useLogitModelSetting],
      ['useIsCalculated', Hooks.useIsCalculated],
      ['useHasRoundData', Hooks.useHasRoundData],
      ['useCalculationsStatus', Hooks.useCalculationsStatus],
    ])('%s returns a boolean', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(typeof result.current).toBe('boolean');
    });

    it.each<[string, () => boolean]>([
      ['useIsPirateSelected(1,0,1)', (): boolean => Hooks.useIsPirateSelected(1, 0, 1)],
    ])('%s returns a boolean', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(typeof result.current).toBe('boolean');
    });
  });

  describe('string / string-or-undefined-returning hooks', () => {
    it.each<[string, () => string]>([
      ['useCurrentBetName', Hooks.useCurrentBetName],
      ['useTableMode', Hooks.useTableMode],
      ['useBetSetPosition', Hooks.useBetSetPosition],
    ])('%s returns a string', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(typeof result.current).toBe('string');
    });

    it.each<[string, () => string | undefined]>([
      ['useTimestamp', Hooks.useTimestamp],
      ['useLastChange', Hooks.useLastChange],
      ['useTimestampValue', Hooks.useTimestampValue],
    ])('%s returns a string or undefined', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(['string', 'undefined']).toContain(typeof result.current);
    });
  });

  describe('array-returning hooks (no args)', () => {
    it.each<[string, () => unknown]>([
      ['usePirates', Hooks.usePirates],
      ['useFoods', Hooks.useFoods],
      ['useOpeningOdds', Hooks.useOpeningOdds],
      ['useCurrentOdds', Hooks.useCurrentOdds],
      ['useArenaRatios', Hooks.useArenaRatios],
      ['useUsedProbabilities', Hooks.useUsedProbabilities],
      ['useRoundPirates', Hooks.useRoundPirates],
      ['useRoundOpeningOdds', Hooks.useRoundOpeningOdds],
      ['useRoundCurrentOdds', Hooks.useRoundCurrentOdds],
    ])('%s returns an array', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(Array.isArray(result.current)).toBe(true);
    });

    it.each<[string, () => unknown]>([
      ['useChanges', Hooks.useChanges],
      ['useWinners', Hooks.useWinners],
      ['useRoundWinners', Hooks.useRoundWinners],
      ['useCustomOdds', Hooks.useCustomOdds],
      ['useCustomProbs', Hooks.useCustomProbs],
    ])('%s returns an array, null, or undefined', (_name, hook) => {
      const { result } = renderHook(() => hook());
      const isArrayNullOrUndefined =
        result.current === undefined || result.current === null || Array.isArray(result.current);
      expect(isArrayNullOrUndefined).toBe(true);
    });
  });

  describe('parameterized array-or-undefined-returning hooks', () => {
    it.each<[string, () => unknown]>([
      ['useBetLine(1)', (): unknown => Hooks.useBetLine(1)],
      ['useBetLineSpecific(1)', (): unknown => Hooks.useBetLineSpecific(1)],
      ['usePiratesForArena(0)', (): unknown => Hooks.usePiratesForArena(0)],
      ['useFoodsForArena(0)', (): unknown => Hooks.useFoodsForArena(0)],
    ])('%s returns an array or undefined', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(result.current === undefined || Array.isArray(result.current)).toBe(true);
    });
  });

  describe('Map-returning hooks (no args)', () => {
    it.each<[string, () => unknown]>([
      ['useAllBets', Hooks.useAllBets],
      ['useAllBetAmounts', Hooks.useAllBetAmounts],
      ['useAllBetSetNames', Hooks.useAllBetSetNames],
      ['useCurrentBets', Hooks.useCurrentBets],
      ['useCurrentBetAmounts', Hooks.useCurrentBetAmounts],
      ['useBetOdds', Hooks.useBetOdds],
      ['useBetPayoffs', Hooks.useBetPayoffs],
      ['useBetProbabilities', Hooks.useBetProbabilities],
      ['useBetBinaries', Hooks.useBetBinaries],
      ['useBetExpectedRatios', Hooks.useBetExpectedRatios],
      ['useBetNetExpected', Hooks.useBetNetExpected],
      ['useBetMaxBets', Hooks.useBetMaxBets],
      ['usePirateFAs', Hooks.usePirateFAs],
      ['useAllBetsForURLData', Hooks.useAllBetsForURLData],
      ['useAllBetAmountsForURLData', Hooks.useAllBetAmountsForURLData],
    ])('%s returns a Map', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(result.current instanceof Map).toBe(true);
    });
  });

  describe('parameterized Map-returning hooks', () => {
    it.each<[string, () => unknown]>([
      ['useOptimizedBetsForIndex(0)', (): unknown => Hooks.useOptimizedBetsForIndex(0)],
      ['useOptimizedBetAmountsForIndex(0)', (): unknown => Hooks.useOptimizedBetAmountsForIndex(0)],
    ])('%s returns a Map', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(result.current instanceof Map).toBe(true);
    });
  });

  describe('object-returning hooks (no args)', () => {
    it.each<[string, () => unknown]>([
      ['useRoundData', Hooks.useRoundData],
      ['useCalculations', Hooks.useCalculations],
      ['useLegacyProbabilities', Hooks.useLegacyProbabilities],
      ['useLogitProbabilities', Hooks.useLogitProbabilities],
      ['usePayoutTables', Hooks.usePayoutTables],
    ])('%s returns a defined object', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('object');
      expect(result.current).not.toBeNull();
    });
  });

  describe('action/function-returning hooks', () => {
    it.each<[string, () => unknown]>([
      ['useSetCurrentBet', Hooks.useSetCurrentBet],
      ['useAddNewSet', Hooks.useAddNewSet],
      ['useDeleteBetSet', Hooks.useDeleteBetSet],
      ['useSwapBets', Hooks.useSwapBets],
      ['useUpdatePirate', Hooks.useUpdatePirate],
      ['useSwapPiratesForAllBets', Hooks.useSwapPiratesForAllBets],
      ['useUpdateBetAmount', Hooks.useUpdateBetAmount],
      ['useUpdateBetAmounts', Hooks.useUpdateBetAmounts],
      ['useSetAllBets', Hooks.useSetAllBets],
      ['useSetAllBetAmounts', Hooks.useSetAllBetAmounts],
      ['useClearAllBets', Hooks.useClearAllBets],
      ['useUpdateSelectedRound', Hooks.useUpdateSelectedRound],
      ['useSetTableMode', Hooks.useSetTableMode],
      ['useSetBetSetPosition', Hooks.useSetBetSetPosition],
      ['useSetViewMode', Hooks.useSetViewMode],
      ['useSetUseWebDomain', Hooks.useSetUseWebDomain],
      ['useToggleBigBrain', Hooks.useToggleBigBrain],
      ['useToggleFaDetails', Hooks.useToggleFaDetails],
      ['useToggleOddsTimeline', Hooks.useToggleOddsTimeline],
      ['useToggleCustomOddsMode', Hooks.useToggleCustomOddsMode],
      ['useToggleUseLogitModel', Hooks.useToggleUseLogitModel],
      ['useSetMaxBet', Hooks.useSetMaxBet],
      ['useSetCustomOdds', Hooks.useSetCustomOdds],
      ['useSetCustomProbs', Hooks.useSetCustomProbs],
      ['useInitializeRoundData', Hooks.useInitializeRoundData],
      ['useUpdateSinglePirate', Hooks.useUpdateSinglePirate],
      ['useUpdateSingleBetAmount', Hooks.useUpdateSingleBetAmount],
      ['useBatchUpdateBetAmounts', Hooks.useBatchUpdateBetAmounts],
    ])('%s returns a function', (_name, hook) => {
      const { result } = renderHook(() => hook());
      expect(typeof result.current).toBe('function');
    });
  });

  describe('re-exported stores', () => {
    it('exposes useBetStore and useRoundStore', () => {
      expect(typeof Hooks.useBetStore).toBe('function');
      expect(typeof Hooks.useRoundStore).toBe('function');
      expect(typeof Hooks.setToastFunction).toBe('function');
    });
  });
});
