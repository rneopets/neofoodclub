import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { RoundCalculationResult } from '../../types';
import { defaultRoundData } from '../constants';
import { calculateRoundData } from '../util';

import { useBetManagementStore } from './betManagementStore';
import { useRoundDataStore, roundDataSelectors } from './roundDataStore';

interface CalculationsStore {
  calculations: RoundCalculationResult;
  lastCalculationKey: string;
  isCalculating: boolean;
  batchTimeout: number | null;
  emptyCalculationsCache: Map<string, RoundCalculationResult>;

  updateCalculations: () => void;
  forceRecalculate: () => void;
  batchedUpdateCalculations: () => void;
}

const emptyCalculations: RoundCalculationResult = {
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

export const useCalculationsStore = create<CalculationsStore>()(
  subscribeWithSelector((set, get) => ({
    calculations: emptyCalculations,
    lastCalculationKey: '',
    isCalculating: false,
    batchTimeout: null,
    emptyCalculationsCache: new Map(),

    batchedUpdateCalculations: (): void => {
      const state = get();

      if (state.batchTimeout) {
        clearTimeout(state.batchTimeout);
      }

      const timeout = window.setTimeout(() => {
        get().updateCalculations();
        set({ batchTimeout: null });
      }, 16); // One frame delay - standard for batching

      set({ batchTimeout: timeout });
    },

    updateCalculations: (): void => {
      const roundState = useRoundDataStore.getState().roundState;
      const betManagementState = useBetManagementStore.getState();
      const currentBets =
        betManagementState.allBets.get(betManagementState.currentBet) ?? new Map();
      const currentBetAmounts =
        betManagementState.allBetAmounts.get(betManagementState.currentBet) ?? new Map();

      // Check if all bets are empty (optimization for clear operations)
      const hasAnyBets = Array.from(currentBets.values()).some(bet =>
        bet.some((pirate: number) => pirate > 0),
      );

      const roundNumber = roundState.roundData?.round || 0;
      const selectedRound = roundState.currentSelectedRound;
      const customOddsMode = roundState.advanced?.customOddsMode || false;
      const useLogitModel = roundState.advanced?.useLogitModel || false;

      let customOddsHash = '';
      if (customOddsMode && roundState.customOdds) {
        customOddsHash = JSON.stringify(roundState.customOdds);
      }

      let customProbsHash = '';
      if (roundState.customProbs) {
        customProbsHash = JSON.stringify(roundState.customProbs);
      }

      let calculationKey: string;
      if (!hasAnyBets) {
        calculationKey = `empty-${roundNumber}-${selectedRound}-${customOddsMode}-${useLogitModel}`;
      } else {
        const betHash = JSON.stringify(Array.from(currentBets.entries()));
        const amountHash = JSON.stringify(Array.from(currentBetAmounts.entries()));
        calculationKey = `${roundNumber}-${selectedRound}-${betHash}-${amountHash}-${customOddsHash}-${customProbsHash}`;
      }

      // Skip if already calculated
      if (calculationKey === get().lastCalculationKey) {
        return;
      }

      // Don't calculate if no valid data
      if (
        roundState.roundData === defaultRoundData ||
        !roundState.roundData.pirates ||
        roundState.roundData.pirates.length === 0
      ) {
        set({
          calculations: emptyCalculations,
          lastCalculationKey: calculationKey,
        });
        return;
      }

      // Check cache for empty calculations
      if (!hasAnyBets) {
        const cache = get().emptyCalculationsCache;
        const cacheKey = `${roundNumber}-${selectedRound}-${customOddsMode}-${useLogitModel}`;

        if (cache.has(cacheKey)) {
          const cachedResult = cache.get(cacheKey);
          if (cachedResult) {
            set({
              calculations: cachedResult,
              lastCalculationKey: calculationKey,
            });
            return;
          }
        }

        // Calculate and cache empty result
        const emptyResult = calculateRoundData(roundState, new Map(), new Map());
        cache.set(cacheKey, emptyResult);

        set({
          calculations: emptyResult,
          lastCalculationKey: calculationKey,
          emptyCalculationsCache: cache,
        });
        return;
      }

      const result = calculateRoundData(roundState, currentBets, currentBetAmounts);

      set({
        calculations: result,
        lastCalculationKey: calculationKey,
      });
    },

    forceRecalculate: (): void => {
      set({
        lastCalculationKey: '',
        emptyCalculationsCache: new Map(),
      });

      // Clear the memoized props cache
      memoizedCalculations.lastCalculations = null;
      memoizedCalculations.memoizedProps = {};

      get().updateCalculations();
    },
  })),
);

useRoundDataStore.subscribe(
  roundDataSelectors.calculationData,
  () => {
    useCalculationsStore.getState().updateCalculations();
  },
  { fireImmediately: false },
);

useBetManagementStore.subscribe(
  state => {
    // Skip calculations if we're in batch update mode
    if (state.isBatchUpdating) {
      return 'BATCH_UPDATE_MODE';
    }

    const currentBets = state.allBets.get(state.currentBet) ?? new Map();
    const currentBetAmounts = state.allBetAmounts.get(state.currentBet) ?? new Map();

    // Create lightweight hashes to detect actual changes
    let betHash = '';
    let amountHash = '';

    if (currentBets.size > 0) {
      betHash = Array.from(currentBets.entries())
        .filter(([, bet]) => bet.some((p: number) => p > 0))
        .map(([key, bet]) => `${key}:${bet.join(',')}`)
        .join('|');
    }

    if (currentBetAmounts.size > 0) {
      amountHash = Array.from(currentBetAmounts.entries())
        .filter(([, amount]) => amount > -1000)
        .map(([key, amount]) => `${key}:${amount}`)
        .join('|');
    }

    return `${state.currentBet}-${betHash}-${amountHash}`;
  },
  newValue => {
    // Skip calculations if we're in batch update mode
    if (newValue === 'BATCH_UPDATE_MODE') {
      return;
    }

    const betState = useBetManagementStore.getState();
    if (betState.isBatchUpdating) {
      return;
    }

    useCalculationsStore.getState().batchedUpdateCalculations();
  },
  { fireImmediately: false },
);

// Add near the end of the file, before any subscriptions

export const memoizedCalculations = {
  lastCalculations: null as RoundCalculationResult | null,
  memoizedProps: {} as Record<string, unknown>,
  lastCustomValues: new Map<string, number>(),

  // Get stable reference to a calculation value
  getStableValue: function <T>(
    valueName: string,
    selector: (state: RoundCalculationResult) => T,
  ): T {
    const calculations = useCalculationsStore.getState().calculations;

    if (calculations !== this.lastCalculations) {
      this.lastCalculations = calculations;
      this.memoizedProps = {};
    }

    if (this.memoizedProps[valueName] !== undefined) {
      return this.memoizedProps[valueName] as T;
    }

    // Calculate and store the value
    const value = selector(calculations);
    this.memoizedProps[valueName] = value;
    return value;
  },

  clearCache: function (pattern?: string): void {
    if (!pattern) {
      // If no pattern is provided, clear everything
      this.lastCalculations = null;
      this.memoizedProps = {};
      return;
    }

    // Selective clearing based on pattern
    // This allows us to only clear specific cache entries that match the pattern
    const keysToRemove = Object.keys(this.memoizedProps).filter(key => key.includes(pattern));

    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => {
        delete this.memoizedProps[key];
      });
    }
  },

  // Add a new method to track custom value changes
  trackCustomValue: function (key: string, value: number): boolean {
    const currentValue = this.lastCustomValues.get(key);
    const hasChanged = currentValue !== value;

    if (hasChanged) {
      this.lastCustomValues.set(key, value);
    }

    return hasChanged;
  },
};
