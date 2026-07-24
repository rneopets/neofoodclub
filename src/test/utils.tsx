import { render, RenderOptions, RenderResult } from '@testing-library/react';
import React, { ReactElement } from 'react';
import { vi, Mock } from 'vitest';

import { Provider } from '../components/ui/provider';
import type { RoundCalculationResult, RoundData } from '../types';

// Custom render function that includes Chakra UI provider
const AllTheProviders = ({ children }: { children: React.ReactNode }): ReactElement => (
  <Provider>{children}</Provider>
);

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>): RenderResult =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Helper to create mock drag and drop events
export const createMockDataTransfer = (
  data: Record<string, string> = {},
): {
  getData: Mock;
  setData: Mock;
  files: FileList;
  items: DataTransferItemList;
  types: string[];
  effectAllowed: 'all';
  dropEffect: 'none';
  clearData: Mock;
  setDragImage: Mock;
} => ({
  getData: vi.fn((type: string) => data[type] || ''),
  setData: vi.fn(),
  files: [] as unknown as FileList,
  items: [] as unknown as DataTransferItemList,
  types: Object.keys(data),
  effectAllowed: 'all' as const,
  dropEffect: 'none' as const,
  clearData: vi.fn(),
  setDragImage: vi.fn(),
});

// Helper to create mock drag events
export const createMockDragEvent = (type: string, dataTransfer?: Record<string, string>): Event => {
  const event = new Event(type) as DragEvent;

  // Add dataTransfer to the event
  Object.defineProperty(event, 'dataTransfer', {
    value: createMockDataTransfer(dataTransfer),
    writable: false,
  });

  return event;
};

// Helper to wait for async operations
export const waitFor = (fn: () => void | Promise<void>, timeout = 5000): Promise<void> =>
  new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = async (): Promise<void> => {
      try {
        await fn();
        resolve(undefined);
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(error);
        } else {
          setTimeout(check, 100);
        }
      }
    };

    check();
  });

// Fixture builder for RoundData, matching the shape used by the round-fetching tests
// (see hashchange.test.ts). Overrides are merged shallowly on top of the defaults.
export const makeRoundData = (overrides: Partial<RoundData> = {}): RoundData => ({
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
  winners: [],
  ...overrides,
});

// Resets useBetStore and useRoundStore to a clean, minimal known state. Generalizes the
// inline beforeEach pattern used by hashchange.test.ts so future test files don't have
// to duplicate it.
//
// The store modules are imported dynamically (rather than at the top of this file) so that
// merely importing test/utils.tsx (which nearly every test file does, for `render`/`screen`)
// does not eagerly load the real Zustand stores. Eagerly loading them breaks test files that
// partially mock sibling modules (e.g. `vi.mock('../util', ...)`), since those real stores
// import from those same modules at their own top level.
export const resetStores = async (): Promise<void> => {
  const [
    { useBetStore },
    { useRoundStore },
    { defaultRoundData },
    { makeEmptyBets, makeEmptyBetAmounts },
  ] = await Promise.all([
    import('../app/stores/betStore'),
    import('../app/stores/roundStore'),
    import('../app/constants'),
    import('../app/util'),
  ]);

  useRoundStore.setState({
    currentSelectedRound: 8000,
    currentRound: 8000,
    isInitializing: false,
    roundData: defaultRoundData,
  });
  useBetStore.setState({
    currentBet: 0,
    allBets: new Map([[0, makeEmptyBets(10)]]),
    allBetAmounts: new Map([[0, makeEmptyBetAmounts(10)]]),
    allNames: new Map([[0, 'Test Set']]),
  });
};

const emptyCalculationsMock: RoundCalculationResult = {
  calculated: false,
  legacyProbabilities: { min: [], std: [], max: [], used: [] },
  logitProbabilities: { prob: [], used: [] },
  usedProbabilities: [],
  pirateFAs: new Map(),
  arenaRatios: [],
  betOdds: new Map(),
  betPayoffs: new Map(),
  betProbabilities: new Map(),
  betExpectedRatios: new Map(),
  betNetExpected: new Map(),
  betMaxBets: new Map(),
  betBinaries: new Map(),
  odds: [],
  payoutTables: { odds: [], winnings: [] },
  winningBetBinary: 0,
  totalBetAmounts: 0,
  totalBetExpectedRatios: 0,
  totalBetNetExpected: 0,
  totalWinningPayoff: 0,
  totalWinningOdds: 0,
  totalEnabledBets: 0,
};

// NOTE: `vi.mock` factories are hoisted above imports by Vitest, so this object cannot be
// passed in or customized at call time -- it is a static set of sane defaults only.
// Future test files should spread it and override specific keys, e.g.:
//   vi.mock('../../stores', () => ({ ...defaultStoreMocks, useSelectedRound: () => 1234 }))
export const defaultStoreMocks = {
  useBetStore: { getState: (): Record<string, never> => ({}) },
  useRoundStore: { getState: (): Record<string, never> => ({}) },
  setToastFunction: vi.fn(),

  // Bet hooks
  useCurrentBet: (): number => 0,
  useAllBets: (): Map<number, Map<number, number[]>> => new Map(),
  useAllBetAmounts: (): Map<number, Map<number, number>> => new Map(),
  useAllBetSetNames: (): Map<number, string> => new Map(),
  useCurrentBetName: (): string => 'Test Set',
  useCurrentBets: (): Map<number, number[]> => new Map(),
  useCurrentBetAmounts: (): Map<number, number> => new Map(),
  useBetCount: (): number => 0,
  useBetSetCount: (): number => 0,
  useHasAnyBets: (): boolean => false,
  useHasAnyBetsAnywhere: (): boolean => false,
  useSetCurrentBet: (): ((value: number) => void) => vi.fn(),
  useAddNewSet: (): ((
    name: string,
    bets: Map<number, number[]>,
    betAmounts: Map<number, number>,
    replace?: boolean,
  ) => void) => vi.fn(),
  useDeleteBetSet: (): ((index: number) => void) => vi.fn(),
  useSwapBets: (): ((uiIndex1: number, uiIndex2: number) => void) => vi.fn(),
  useUpdatePirate: (): ((betIndex: number, arenaIndex: number, pirateIndex: number) => void) =>
    vi.fn(),
  useSwapPiratesForAllBets: (): ((
    arenaIndex: number,
    pirateIndexA: number,
    pirateIndexB: number,
  ) => void) => vi.fn(),
  useUpdateBetAmount: (): ((betIndex: number, amount: number) => void) => vi.fn(),
  useUpdateBetAmounts: (): ((updates: Array<{ betIndex: number; amount: number }>) => void) =>
    vi.fn(),
  useSetAllBets: (): ((bets: Map<number, Map<number, number[]>>) => void) => vi.fn(),
  useSetAllBetAmounts: (): ((amounts: Map<number, Map<number, number>>) => void) => vi.fn(),
  useClearAllBets: (): (() => void) => vi.fn(),

  // Round data hooks
  useRoundData: (): RoundData => makeRoundData(),
  useCurrentRound: (): number => 8000,
  useSelectedRound: (): number => 8000,
  useIsLoading: (): boolean => false,
  usePirates: (): number[][] => [],
  useFoods: (): number[][] => [],
  useOpeningOdds: (): number[][] => [],
  useCurrentOdds: (): number[][] => [],
  useChanges: (): RoundData['changes'] => [],
  useWinners: (): number[] | undefined => [],
  useTimestamp: (): string | undefined => '',
  useLastChange: (): string | undefined => '',
  useHasRoundWinners: (): boolean => false,
  useRoundWinnersBinary: (): number => 0,

  // Settings
  useTableMode: (): string => '',
  useBetSetPosition: (): 'above' | 'below' | 'left' | 'right' => 'below',
  useViewMode: (): boolean => false,
  useUseWebDomain: (): boolean => false,
  useBigBrain: (): boolean => false,
  useFaDetails: (): boolean => false,
  useCustomOddsMode: (): boolean => false,
  useOddsTimeline: (): boolean => false,
  useLogitModelSetting: (): boolean => false,
  useCustomOdds: (): number[][] | null => null,
  useCustomProbs: (): number[][] | null => null,

  // Setting actions
  useUpdateSelectedRound: (): ((round: number) => void) => vi.fn(),
  useSetTableMode: (): ((mode: string) => void) => vi.fn(),
  useSetBetSetPosition: (): ((position: 'above' | 'below' | 'left' | 'right') => void) => vi.fn(),
  useSetViewMode: (): ((viewMode: boolean) => void) => vi.fn(),
  useSetUseWebDomain: (): ((useWebDomain: boolean) => void) => vi.fn(),
  useToggleBigBrain: (): (() => void) => vi.fn(),
  useToggleFaDetails: (): (() => void) => vi.fn(),
  useToggleOddsTimeline: (): (() => void) => vi.fn(),
  useToggleCustomOddsMode: (): (() => void) => vi.fn(),
  useToggleUseLogitModel: (): (() => void) => vi.fn(),
  useMaxBet: (): number => 0,
  useSetMaxBet: (): ((maxBet: number) => void) => vi.fn(),
  useSetCustomOdds: (): ((odds: number[][]) => void) => vi.fn(),
  useSetCustomProbs: (): ((probs: number[][]) => void) => vi.fn(),
  useInitializeRoundData: (): (() => void) => vi.fn(),

  // Calculation hooks
  useCalculations: (): RoundCalculationResult => emptyCalculationsMock,
  useIsCalculated: (): boolean => false,
  useBetOdds: (): Map<number, number> => new Map(),
  useBetPayoffs: (): Map<number, number> => new Map(),
  useBetProbabilities: (): Map<number, number> => new Map(),
  useBetBinaries: (): Map<number, number> => new Map(),
  useBetExpectedRatios: (): Map<number, number> => new Map(),
  useBetNetExpected: (): Map<number, number> => new Map(),
  useBetMaxBets: (): Map<number, number> => new Map(),
  useTotalBetAmounts: (): number => 0,
  useTotalBetExpectedRatios: (): number => 0,
  useTotalBetNetExpected: (): number => 0,
  useTotalWinningOdds: (): number => 0,
  useTotalWinningPayoff: (): number => 0,
  useTotalEnabledBets: (): number => 0,
  useWinningBetBinary: (): number => 0,
  useArenaRatios: (): number[] => [],
  useUsedProbabilities: (): number[][] => [],
  useLegacyProbabilities: (): {
    min: number[][];
    std: number[][];
    max: number[][];
    used: number[][];
  } => ({
    min: [],
    std: [],
    max: [],
    used: [],
  }),
  useLogitProbabilities: (): { prob: number[][]; used: number[][] } => ({ prob: [], used: [] }),
  usePirateFAs: (): Map<number, number[][]> => new Map(),
  usePayoutTables: (): {
    odds: Array<{ value: number; probability: number; cumulative: number; tail: number }>;
    winnings: Array<{ value: number; probability: number; cumulative: number; tail: number }>;
  } => ({ odds: [], winnings: [] }),

  // Derived/computed hooks
  useBetLine: (): number[] => [0, 0, 0, 0, 0],
  useBetAmount: (): number => 0,
  useIsPirateSelected: (): boolean => false,
  useBetOddsValue: (): number => 0,
  useBetPayoffValue: (): number => 0,
  useBetProbabilityValue: (): number => 0,
  useBetBinaryValue: (): number => 0,
  useBetExpectedRatioValue: (): number => 0,
  useBetNetExpectedValue: (): number => 0,
  useBetMaxBetValue: (): number => 0,
  usePirateForArena: (): number | undefined => undefined,
  useFoodForArena: (): number | undefined => undefined,
  useOpeningOddsValue: (): number | undefined => undefined,
  useCurrentOddsValue: (): number | undefined => undefined,
  useCustomOddsValue: (): number | undefined => undefined,
  useCustomProbsValue: (): number | undefined => undefined,
  useUsedProbabilityValue: (): number => 0,
  useLogitProbabilityValue: (): number => 0,
  useLegacyProbabilityMin: (): number => 0,
  useLegacyProbabilityMax: (): number => 0,
  useLegacyProbabilityStd: (): number => 0,
  usePirateFA: (): number => 0,

  // Legacy aliases (kept as separate keys since vi.mock replaces the whole module)
  useCalculationsStatus: (): boolean => false,
  useHasRoundData: (): boolean => true,
  useWinnersBinary: (): number => 0,
  useRoundWinners: (): number[] | undefined => [],
  useBetLineSpecific: (): number[] => [0, 0, 0, 0, 0],
  useSpecificBetAmount: (): number => 0,
  useSpecificBetOdds: (): number => 0,
  useSpecificBetPayoff: (): number => 0,
  useSpecificBetProbability: (): number => 0,
  useSpecificBetBinary: (): number => 0,
  useSpecificBetExpectedRatio: (): number => 0,
  useSpecificBetNetExpected: (): number => 0,
  useSpecificBetMaxBet: (): number => 0,
  usePirateId: (): number | undefined => undefined,
  usePiratesForArena: (): number[] | undefined => undefined,
  useFoodsForArena: (): number[] | undefined => undefined,
  useTimestampValue: (): string | undefined => '',
  useUpdateSinglePirate: (): ((
    betIndex: number,
    arenaIndex: number,
    pirateIndex: number,
  ) => void) => vi.fn(),
  useUpdateSingleBetAmount: (): ((betIndex: number, amount: number) => void) => vi.fn(),
  useBatchUpdateBetAmounts: (): ((updates: Array<{ betIndex: number; amount: number }>) => void) =>
    vi.fn(),
  useStableUsedProbability: (): number => 0,
  useStableLogitProbability: (): number => 0,
  useStableLegacyProbabilityMin: (): number => 0,
  useStableLegacyProbabilityMax: (): number => 0,
  useStableLegacyProbabilityStd: (): number => 0,
  useStablePirateFA: (): number => 0,
  useOptimizedBetAmount: (): number => 0,
  useAllBetsForURLData: (): Map<number, Map<number, number[]>> => new Map(),
  useAllBetAmountsForURLData: (): Map<number, Map<number, number>> => new Map(),
  useCurrentBetForURL: (): number => 0,
  useOptimizedBetsForIndex: (): Map<number, number[]> => new Map(),
  useOptimizedBetAmountsForIndex: (): Map<number, number> => new Map(),
  useRoundPirates: (): number[][] => [],
  useRoundOpeningOdds: (): number[][] => [],
  useRoundCurrentOdds: (): number[][] => [],
};
