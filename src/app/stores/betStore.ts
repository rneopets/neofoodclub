import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { Bet, BetAmount } from '../../types/bets';
import {
  parseBetUrl,
  anyBetsExist,
  makeBetURL,
  anyBetAmountsExist,
  makeEmptyBets,
  makeEmptyBetAmounts,
} from '../util';

// Lazy getter to avoid circular dependency
let getRoundStore: (() => ReturnType<typeof import('./roundStore').useRoundStore.getState>) | null = null;
const initRoundStoreGetter = async (): Promise<void> => {
  if (!getRoundStore) {
    const { useRoundStore } = await import('./roundStore');
    getRoundStore = () => useRoundStore.getState();
  }
};
// Initialize immediately but don't block
initRoundStoreGetter();

interface BetStore {
  // State
  currentBet: number;
  allNames: Map<number, string>;
  allBets: Map<number, Bet>;
  allBetAmounts: Map<number, BetAmount>;

  // Actions
  setCurrentBet: (value: number) => void;
  addNewSet: (name: string, bets: Bet, betAmounts: BetAmount, replace?: boolean) => void;
  updateBetName: (index: number, name: string) => void;
  deleteBetSet: (index: number) => void;
  swapBets: (uiIndex1: number, uiIndex2: number) => void;
  updatePirate: (betIndex: number, arenaIndex: number, pirateIndex: number) => void;
  updateBetAmount: (betIndex: number, amount: number) => void;
  updateBetAmounts: (updates: Array<{ betIndex: number; amount: number }>) => void;
  setAllBets: (bets: Map<number, Bet>) => void;
  setAllBetAmounts: (amounts: Map<number, BetAmount>) => void;
  clearAllBets: () => void;
}

// Parse initial state from URL
let initialState: { round: number; bets: Bet; betAmounts: BetAmount };
try {
  initialState = parseBetUrl(window.location.hash.slice(1));
  if (initialState.bets.size === 0) {
    initialState.bets = makeEmptyBets(10);
  }
  if (initialState.betAmounts.size === 0) {
    initialState.betAmounts = makeEmptyBetAmounts(10);
  }
} catch (error) {
  console.error('Failed to parse initial bet URL:', error);
  initialState = {
    round: 0,
    bets: makeEmptyBets(10),
    betAmounts: makeEmptyBetAmounts(10),
  };
}

export const useBetStore = create<BetStore>()(
  subscribeWithSelector(set => ({
    currentBet: 0,
    allNames: new Map([[0, 'Starting Set']]),
    allBets: new Map([[0, initialState.bets]]),
    allBetAmounts: new Map([[0, initialState.betAmounts]]),

    setCurrentBet: (value: number): void => {
      set({ currentBet: value });
    },

    addNewSet: (name: string, bets: Bet, betAmounts: BetAmount, replace = false): void => {
      set(state => {
        const currentBetsData = state.allBets.get(state.currentBet);
        const isEmpty = !currentBetsData || !anyBetsExist(currentBetsData);
        const lastIndex = Math.max(...Array.from(state.allBets.keys()), 0);
        const newIndex = replace && isEmpty ? state.currentBet : lastIndex + 1;

        return {
          allNames: new Map(state.allNames).set(newIndex, name.trim()),
          allBets: new Map(state.allBets).set(newIndex, bets),
          allBetAmounts: new Map(state.allBetAmounts).set(newIndex, betAmounts),
          currentBet: newIndex,
        };
      });
    },

    updateBetName: (index: number, name: string): void => {
      set(state => {
        if (!state.allNames.has(index)) {
          return state;
        }
        return { allNames: new Map(state.allNames).set(index, name.trim()) };
      });
    },

    deleteBetSet: (index: number): void => {
      set(state => {
        if (state.allBets.size <= 1) {
          return state;
        }
        if (!state.allBets.has(index)) {
          return state;
        }

        const newNames = new Map(state.allNames);
        newNames.delete(index);
        const newBets = new Map(state.allBets);
        newBets.delete(index);
        const newBetAmounts = new Map(state.allBetAmounts);
        newBetAmounts.delete(index);

        let newCurrentBet = state.currentBet;
        if (state.currentBet === index) {
          newCurrentBet = Array.from(newBets.keys())[0] ?? 0;
        }

        return {
          allNames: newNames,
          allBets: newBets,
          allBetAmounts: newBetAmounts,
          currentBet: newCurrentBet,
        };
      });
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

        const newBetData = new Map(currentBetData);
        newBetData.set(betIndex1, bet2);
        newBetData.set(betIndex2, bet1);

        const newAmounts = new Map(currentAmounts);
        newAmounts.set(betIndex1, amount2);
        newAmounts.set(betIndex2, amount1);

        return {
          allBets: new Map(state.allBets).set(state.currentBet, newBetData),
          allBetAmounts: new Map(state.allBetAmounts).set(state.currentBet, newAmounts),
        };
      });
    },

    updatePirate: (betIndex: number, arenaIndex: number, pirateIndex: number): void => {
      set(state => {
        const currentBetsForSet = state.allBets.get(state.currentBet);
        if (!currentBetsForSet) {
          return state;
        }

        const currentBetLine = currentBetsForSet.get(betIndex) ?? [0, 0, 0, 0, 0];
        if (currentBetLine[arenaIndex] === pirateIndex) {
          return state;
        }

        const newBetLine = [...currentBetLine];
        newBetLine[arenaIndex] = pirateIndex;

        const newBetsForSet = new Map(currentBetsForSet).set(betIndex, newBetLine);
        return { allBets: new Map(state.allBets).set(state.currentBet, newBetsForSet) };
      });
    },

    updateBetAmount: (betIndex: number, amount: number): void => {
      set(state => {
        const currentAmountsForSet = state.allBetAmounts.get(state.currentBet);
        if (!currentAmountsForSet) {
          return state;
        }
        if (currentAmountsForSet.get(betIndex) === amount) {
          return state;
        }

        const newAmountsForSet = new Map(currentAmountsForSet).set(betIndex, amount);
        return {
          allBetAmounts: new Map(state.allBetAmounts).set(state.currentBet, newAmountsForSet),
        };
      });
    },

    updateBetAmounts: (updates: Array<{ betIndex: number; amount: number }>): void => {
      set(state => {
        const currentAmountsForSet = state.allBetAmounts.get(state.currentBet);
        if (!currentAmountsForSet) {
          return state;
        }

        const newAmountsForSet = new Map(currentAmountsForSet);
        let hasChanges = false;

        for (const { betIndex, amount } of updates) {
          const finalAmount = amount < 1 ? -1000 : amount;
          if (newAmountsForSet.get(betIndex) !== finalAmount) {
            newAmountsForSet.set(betIndex, finalAmount);
            hasChanges = true;
          }
        }

        if (!hasChanges) {
          return state;
        }
        return {
          allBetAmounts: new Map(state.allBetAmounts).set(state.currentBet, newAmountsForSet),
        };
      });
    },

    setAllBets: (bets: Map<number, Bet>): void => {
      set({ allBets: bets });
    },

    setAllBetAmounts: (amounts: Map<number, BetAmount>): void => {
      set({ allBetAmounts: amounts });
    },

    clearAllBets: (): void => {
      set(state => ({
        allBets: new Map(state.allBets).set(state.currentBet, makeEmptyBets(10)),
        allBetAmounts: new Map(state.allBetAmounts).set(state.currentBet, makeEmptyBetAmounts(10)),
      }));
    },
  })),
);

// Subscribe to bet changes and update URL
useBetStore.subscribe(
  state => {
    const currentBets = state.allBets.get(state.currentBet) ?? new Map();
    const currentBetAmounts = state.allBetAmounts.get(state.currentBet) ?? new Map();

    const betHash = Array.from(currentBets.entries())
      .filter(([, bet]) => bet.some((p: number) => p > 0))
      .map(([key, bet]) => `${key}:${bet.join(',')}`)
      .join('|');

    const amountHash = Array.from(currentBetAmounts.entries())
      .filter(([, amount]) => amount > -1000)
      .map(([key, amount]) => `${key}:${amount}`)
      .join('|');

    return `${state.currentBet}-${betHash}-${amountHash}`;
  },
  (_newValue, prevValue) => {
    if (!prevValue) {
      return;
    }

    const state = useBetStore.getState();
    // Use lazy getter to avoid circular dependency
    if (!getRoundStore) {
      // If not initialized yet, skip this update
      return;
    }
    const roundState = getRoundStore();

    // Don't update URL if round data doesn't match selected round (round is switching)
    // This prevents URL updates during round transitions
    if (roundState.roundData.round !== roundState.currentSelectedRound) {
      return;
    }

    // Get the current selected round from the round store, not from URL hash
    // This ensures we use the actual selected round, not what's in the URL
    const currentSelectedRound = roundState.currentSelectedRound;
    const currentBets = state.allBets.get(state.currentBet) ?? new Map();
    const currentBetAmounts = state.allBetAmounts.get(state.currentBet) ?? new Map();

    const newUrl = makeBetURL(
      currentSelectedRound,
      currentBets,
      currentBetAmounts,
      anyBetsExist(currentBets) && anyBetAmountsExist(currentBetAmounts),
    );

    const currentHash = window.location.hash.slice(1);
    if (currentHash !== newUrl.slice(1)) {
      window.history.replaceState(null, '', newUrl);
    }
  },
  { fireImmediately: false },
);
