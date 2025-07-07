import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { Bet, BetAmount, NamesState, BetsState, BetAmountsState } from '../../types/bets';
import { computePiratesBinary } from '../maths';
import { parseBetUrl, anyBetsExist, makeBetURL, anyBetAmountsExist } from '../util';

interface BetManagementStore {
  currentBet: number;
  allNames: NamesState;
  allBets: BetsState;
  allBetAmounts: BetAmountsState;
  isBatchUpdating: boolean;

  // Actions
  setCurrentBet: (value: number) => void;
  setAllNames: (names: NamesState | ((prev: NamesState) => NamesState)) => void;
  setAllBets: (bets: BetsState | ((prev: BetsState) => BetsState)) => void;
  setAllBetAmounts: (
    amounts: BetAmountsState | ((prev: BetAmountsState) => BetAmountsState),
  ) => void;
  addNewSet: (name: string, bets: Bet, betAmounts: BetAmount, maybe_replace?: boolean) => void;
  updateBetName: (index: number, name: string) => void;
  updateBet: (index: number, bets: Bet) => void;
  updateBetAmounts: (index: number, amounts: BetAmount) => void;
  deleteBetSet: (index: number) => void;
  swapBets: (uiIndex1: number, uiIndex2: number) => void;

  // Granular update functions for better performance
  updateSinglePirate: (betIndex: number, arenaIndex: number, pirateIndex: number) => void;
  updateSingleBetAmount: (betIndex: number, amount: number) => void;
  batchUpdateBetAmounts: (updates: Array<{ betIndex: number; amount: number }>) => void;

  // Batch update functions
  startBatchUpdate: () => void;
  endBatchUpdate: () => void;
  batchUpdateBets: (
    updates: Array<{ betIndex: number; arenaIndex: number; pirateIndex: number }>,
  ) => void;

  // Computed values
  getCurrentBets: () => Bet;
  getCurrentBetAmounts: () => BetAmount;
  getCurrentName: () => string;

  // Utility functions
  hasValidCurrentBet: () => boolean;
  getBetSetCount: () => number;
}

// Parse initial state from URL with error handling
let initialState;
try {
  initialState = parseBetUrl(window.location.hash.slice(1));
} catch (error) {
  console.error('Failed to parse initial bet URL state:', error);
  // Fallback to default state
  initialState = { round: 0, bets: new Map(), betAmounts: new Map() };
}

// Helper function to safely clone a Map
function cloneMap<K, V>(map: Map<K, V>): Map<K, V> {
  return new Map(map);
}

// Helper function to validate bet index
function isValidBetIndex(index: number): boolean {
  return index >= 0;
}

// Helper function to validate arena index (0-4 for 5 arenas)
function isValidArenaIndex(index: number): boolean {
  return index >= 0 && index < 5;
}

// Helper function to validate pirate index
function isValidPirateIndex(index: number): boolean {
  return index >= 0;
}

export const useBetManagementStore = create<BetManagementStore>()(
  subscribeWithSelector(
    (set, get): BetManagementStore => ({
      currentBet: 0,
      allNames: new Map([[0, 'Starting Set']]),
      allBets: new Map([[0, initialState.bets]]),
      allBetAmounts: new Map([[0, initialState.betAmounts]]),
      isBatchUpdating: false,

      setCurrentBet: (value: number): void => {
        if (!isValidBetIndex(value)) {
          console.warn(`Invalid bet index: ${value}`);
          return;
        }
        set({ currentBet: value });
      },

      setAllNames: (names: NamesState | ((prev: NamesState) => NamesState)): void =>
        set(state => ({ allNames: typeof names === 'function' ? names(state.allNames) : names })),

      setAllBets: (bets: BetsState | ((prev: BetsState) => BetsState)): void =>
        set(state => ({ allBets: typeof bets === 'function' ? bets(state.allBets) : bets })),

      setAllBetAmounts: (
        amounts: BetAmountsState | ((prev: BetAmountsState) => BetAmountsState),
      ): void =>
        set(state => ({
          allBetAmounts: typeof amounts === 'function' ? amounts(state.allBetAmounts) : amounts,
        })),

      addNewSet: (
        name: string,
        bets: Bet,
        betAmounts: BetAmount,
        maybe_replace: boolean = false,
      ): void => {
        if (!name.trim()) {
          console.warn('Bet set name cannot be empty');
          return;
        }

        // Start batch update to prevent intermediate calculations
        set(state => ({ ...state, isBatchUpdating: true }));

        // Perform the actual update
        set(state => {
          // Determine if the current bet is empty
          const currentBetsData = state.allBets.get(state.currentBet);
          const isEmpty = !currentBetsData || !anyBetsExist(currentBetsData);

          // Get the last index more efficiently
          const keys = Array.from(state.allBets.keys());
          const lastIndex = keys.length ? Math.max(...keys.filter(k => typeof k === 'number')) : 0;

          const newIndex = maybe_replace && isEmpty ? state.currentBet : lastIndex + 1;

          // Create new maps with the new data
          const newNames = cloneMap(state.allNames);
          newNames.set(newIndex, name.trim());

          const newBets = cloneMap(state.allBets);
          newBets.set(newIndex, bets);

          const newBetAmounts = cloneMap(state.allBetAmounts);
          newBetAmounts.set(newIndex, betAmounts);

          return {
            ...state,
            allNames: newNames,
            allBets: newBets,
            allBetAmounts: newBetAmounts,
            currentBet: newIndex,
          };
        });

        // End batch update to trigger calculations
        set(state => ({ ...state, isBatchUpdating: false }));
      },

      updateBetName: (index: number, name: string): void => {
        if (!isValidBetIndex(index)) {
          console.warn(`Invalid bet index: ${index}`);
          return;
        }

        name = name.trim();

        set(state => {
          // Only update if the bet set exists and name is different
          if (!state.allNames.has(index) || state.allNames.get(index) === name) {
            return state;
          }

          const newNames = cloneMap(state.allNames);
          newNames.set(index, name);
          return { allNames: newNames };
        });
      },

      updateBet: (index: number, bets: Bet): void => {
        if (!isValidBetIndex(index)) {
          console.warn(`Invalid bet index: ${index}`);
          return;
        }

        set(state => {
          // Only update if the bet set exists
          if (!state.allBets.has(index)) {
            return state;
          }

          const newBets = cloneMap(state.allBets);
          newBets.set(index, bets);
          return { allBets: newBets };
        });
      },

      updateBetAmounts: (index: number, amounts: BetAmount): void => {
        if (!isValidBetIndex(index)) {
          console.warn(`Invalid bet index: ${index}`);
          return;
        }

        set(state => {
          // Only update if the bet set exists
          if (!state.allBetAmounts.has(index)) {
            return state;
          }

          const newBetAmounts = cloneMap(state.allBetAmounts);
          newBetAmounts.set(index, amounts);
          return { allBetAmounts: newBetAmounts };
        });
      },

      deleteBetSet: (index: number): void => {
        if (!isValidBetIndex(index)) {
          console.warn(`Invalid bet index: ${index}`);
          return;
        }

        const state = get();

        // Don't delete if it's the only bet set
        if (state.allBets.size <= 1) {
          const newNames = cloneMap(state.allNames);
          newNames.set(0, '');
          set({ allNames: newNames });
          console.warn('Cannot delete the last bet set');
          return;
        }

        // Only proceed if the bet set exists
        if (!state.allBets.has(index)) {
          return;
        }

        // Start batch update to prevent intermediate calculations
        set(currentState => ({ ...currentState, isBatchUpdating: true }));

        // Perform the actual deletion
        set(currentState => {
          const newNames = cloneMap(currentState.allNames);
          newNames.delete(index);

          const newBets = cloneMap(currentState.allBets);
          newBets.delete(index);

          const newBetAmounts = cloneMap(currentState.allBetAmounts);
          newBetAmounts.delete(index);

          // If we deleted the current bet, switch to the first available one
          let newCurrentBet = currentState.currentBet;
          if (currentState.currentBet === index) {
            const remainingKeys = Array.from(newBets.keys());
            newCurrentBet = remainingKeys.length > 0 ? (remainingKeys[0] as number) : 0;
          }

          return {
            ...currentState,
            allNames: newNames,
            allBets: newBets,
            allBetAmounts: newBetAmounts,
            currentBet: newCurrentBet,
          };
        });

        // End batch update to trigger calculations
        set(currentState => ({ ...currentState, isBatchUpdating: false }));
      },

      swapBets: (uiIndex1: number, uiIndex2: number): void => {
        set(state => {
          const betIndex1 = uiIndex1 + 1;
          const betIndex2 = uiIndex2 + 1;

          const currentBetData = state.allBets.get(state.currentBet);
          const currentAmounts = state.allBetAmounts.get(state.currentBet);

          if (!currentBetData || !currentAmounts) {
            return state;
          }

          const bet1 = currentBetData.get(betIndex1) ?? [0, 0, 0, 0, 0];
          const bet2 = currentBetData.get(betIndex2) ?? [0, 0, 0, 0, 0];

          const amount1 = currentAmounts.get(betIndex1) ?? -1000;
          const amount2 = currentAmounts.get(betIndex2) ?? -1000;

          if (computePiratesBinary(bet1) === computePiratesBinary(bet2) && amount1 === amount2) {
            return state;
          }

          const newBetData = new Map(currentBetData);
          newBetData.set(betIndex1, bet2);
          newBetData.set(betIndex2, bet1);

          const newAllBets = new Map(state.allBets);
          newAllBets.set(state.currentBet, newBetData);

          const newAmounts = new Map(currentAmounts);
          newAmounts.set(betIndex1, amount2);
          newAmounts.set(betIndex2, amount1);

          const newAllBetAmounts = new Map(state.allBetAmounts);
          newAllBetAmounts.set(state.currentBet, newAmounts);

          return { allBets: newAllBets, allBetAmounts: newAllBetAmounts };
        });
      },

      // Granular update functions for better performance
      updateSinglePirate: (betIndex: number, arenaIndex: number, pirateIndex: number): void => {
        if (!isValidBetIndex(betIndex)) {
          console.warn(`Invalid bet index: ${betIndex}`);
          return;
        }
        if (!isValidArenaIndex(arenaIndex)) {
          console.warn(`Invalid arena index: ${arenaIndex}`);
          return;
        }
        if (!isValidPirateIndex(pirateIndex)) {
          console.warn(`Invalid pirate index: ${pirateIndex}`);
          return;
        }

        set(state => {
          const currentBetsForSet = state.allBets.get(state.currentBet);
          if (!currentBetsForSet) {
            console.warn(`No bets found for current bet set: ${state.currentBet}`);
            return state;
          }

          const currentBetLine = currentBetsForSet.get(betIndex) || [0, 0, 0, 0, 0];

          // Only update if the value actually changed
          if (currentBetLine[arenaIndex] === pirateIndex) {
            return state;
          }

          // Create new bet line with the updated pirate
          const newBetLine = [...currentBetLine];
          newBetLine[arenaIndex] = pirateIndex;

          // Clone the bets for the current set and update the specific bet
          const newBetsForSet = new Map(currentBetsForSet);
          newBetsForSet.set(betIndex, newBetLine);

          // Clone all bets and update the current set
          const newAllBets = cloneMap(state.allBets);
          newAllBets.set(state.currentBet, newBetsForSet);

          return { allBets: newAllBets };
        });
      },

      updateSingleBetAmount: (betIndex: number, amount: number): void => {
        if (!isValidBetIndex(betIndex)) {
          console.warn(`Invalid bet index: ${betIndex}`);
          return;
        }
        if (!Number.isFinite(amount)) {
          console.warn(`Invalid bet amount: ${amount}`);
          return;
        }

        set(state => {
          const currentBetAmountsForSet = state.allBetAmounts.get(state.currentBet);
          if (!currentBetAmountsForSet) {
            console.warn(`No bet amounts found for current bet set: ${state.currentBet}`);
            return state;
          }

          // Only update if the value actually changed
          if (currentBetAmountsForSet.get(betIndex) === amount) {
            return state;
          }

          // Clone the bet amounts for the current set and update the specific amount
          const newBetAmountsForSet = new Map(currentBetAmountsForSet);
          newBetAmountsForSet.set(betIndex, amount);

          // Clone all bet amounts and update the current set
          const newAllBetAmounts = cloneMap(state.allBetAmounts);
          newAllBetAmounts.set(state.currentBet, newBetAmountsForSet);

          return { allBetAmounts: newAllBetAmounts };
        });
      },

      // Batch update functions
      startBatchUpdate: (): void => {
        set({ isBatchUpdating: true });
      },

      endBatchUpdate: (): void => {
        set({ isBatchUpdating: false });
      },

      batchUpdateBets: (
        updates: Array<{ betIndex: number; arenaIndex: number; pirateIndex: number }>,
      ): void => {
        const { updateSinglePirate } = get();

        set({ isBatchUpdating: true });

        updates.forEach(({ betIndex, arenaIndex, pirateIndex }) => {
          updateSinglePirate(betIndex, arenaIndex, pirateIndex);
        });

        // End batch update after a short delay
        setTimeout(() => {
          set({ isBatchUpdating: false });
        }, 50);
      },

      // Computed values
      getCurrentBets: (): Bet => {
        const state = get();
        return state.allBets.get(state.currentBet) ?? new Map();
      },

      getCurrentBetAmounts: (): BetAmount => {
        const state = get();
        return state.allBetAmounts.get(state.currentBet) ?? new Map();
      },

      getCurrentName: (): string => {
        const state = get();
        return state.allNames.get(state.currentBet) ?? 'Unknown Set';
      },

      // Utility functions
      hasValidCurrentBet: (): boolean => {
        const state = get();
        return state.allBets.has(state.currentBet);
      },

      getBetSetCount: (): number => {
        const state = get();
        return state.allBets.size;
      },

      // Batch update function for multiple bet amounts to reduce calculation triggers
      batchUpdateBetAmounts: (updates: Array<{ betIndex: number; amount: number }>): void => {
        set(state => {
          const currentBetAmountsForSet = state.allBetAmounts.get(state.currentBet);
          if (!currentBetAmountsForSet) {
            console.warn(`No bet amounts found for current bet set: ${state.currentBet}`);
            return state;
          }

          // Start batch mode to prevent intermediate calculations
          const newState = { ...state, isBatchUpdating: true };

          // Clone the bet amounts for the current set
          const newBetAmountsForSet = new Map(currentBetAmountsForSet);
          let hasChanges = false;

          // Apply all updates
          for (const { betIndex, amount: originalAmount } of updates) {
            if (!isValidBetIndex(betIndex) || !Number.isFinite(originalAmount)) {
              continue;
            }
            let amount = originalAmount;

            if (amount < 1) {
              amount = -1000;
            }

            // Only update if the value actually changed
            if (newBetAmountsForSet.get(betIndex) !== amount) {
              newBetAmountsForSet.set(betIndex, amount);
              hasChanges = true;
            }
          }

          if (!hasChanges) {
            return state;
          }

          // Clone all bet amounts and update the current set
          const newAllBetAmounts = cloneMap(state.allBetAmounts);
          newAllBetAmounts.set(state.currentBet, newBetAmountsForSet);

          return {
            ...newState,
            allBetAmounts: newAllBetAmounts,
          };
        });

        // End batch update after a short delay to allow UI to update
        setTimeout(() => {
          set({ isBatchUpdating: false });
        }, 100);
      },
    }),
  ),
);

// Subscribe to bet changes and update URL
useBetManagementStore.subscribe(
  state => {
    // Skip URL updates if we're in batch update mode
    if (state.isBatchUpdating) {
      return 'BATCH_UPDATE_MODE';
    }

    const currentBets = state.allBets.get(state.currentBet) ?? new Map();
    const currentBetAmounts = state.allBetAmounts.get(state.currentBet) ?? new Map();

    // Create hashes to detect changes
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
  (newValue, prevValue) => {
    // Skip URL updates if we're in batch update mode or if this is the initial call
    if (newValue === 'BATCH_UPDATE_MODE' || !prevValue) {
      return;
    }

    const betState = useBetManagementStore.getState();
    if (betState.isBatchUpdating) {
      return;
    }

    // Parse current URL to get round information
    const currentHash = window.location.hash.slice(1);
    const currentUrlData = parseBetUrl(currentHash);

    // Get current bet data
    const currentBets = betState.allBets.get(betState.currentBet) ?? new Map();
    const currentBetAmounts = betState.allBetAmounts.get(betState.currentBet) ?? new Map();

    // Update URL with current round and bet data
    const newUrl = makeBetURL(
      currentUrlData.round || 0,
      currentBets,
      currentBetAmounts,
      anyBetsExist(currentBets) && anyBetAmountsExist(currentBetAmounts),
    );

    // Only update if the URL would actually change
    if (currentHash !== newUrl.slice(1)) {
      window.history.replaceState(null, '', newUrl);
    }
  },
  { fireImmediately: false },
);
