import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { RoundData, RoundCalculationResult } from '../../types';
import { OddsData, ProbabilitiesData } from '../../types/bets';
import { defaultRoundData, BET_AMOUNT_MIN } from '../constants';
import {
  calculateRoundData,
  getBetSetPosition,
  parseBetUrl,
  getTableMode,
  getUseWebDomain,
  getUseLogitModel,
  anyBetsExist,
  getBigBrainMode,
  getFaDetailsMode,
  getCustomOddsMode,
  getOddsTimelineMode,
  anyBetAmountsExist,
  makeBetURL,
  getMaxBet,
  type BetSetPosition,
} from '../util';
import {
  rebuildEngine,
  setEngineBetAmount,
  applyCustomOdds,
  applyCustomProbabilities,
} from '../wasmEngine';

import { useBetStore } from './betStore';

let showToast:
  | ((options: {
      title: string;
      description: string;
      status: 'error' | 'success' | 'warning' | 'info';
      duration?: number;
      isClosable?: boolean;
    }) => void)
  | null = null;

export const setToastFunction = (toastFn: typeof showToast): void => {
  showToast = toastFn;
};

const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return 'name' in error && (error as { name?: unknown }).name === 'AbortError';
};

// maxBet uses BET_AMOUNT_DEFAULT (-1000) as its own "unset" sentinel - unlike
// `|| null`, this correctly treats that (truthy, negative) value as unset
// rather than passing it through to the wasm engine's Option<u32> boundary.
const toEngineBetAmount = (maxBet: number): number | null =>
  maxBet >= BET_AMOUNT_MIN ? maxBet : null;

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

interface RoundStore {
  // Round data
  roundData: RoundData;
  currentRound: number;
  currentSelectedRound: number;

  // Settings
  customOdds: OddsData | null;
  customProbs: ProbabilitiesData | null;
  tableMode: string;
  betSetPosition: BetSetPosition;
  viewMode: boolean;
  useWebDomain: boolean;
  bigBrain: boolean;
  faDetails: boolean;
  customOddsMode: boolean;
  oddsTimeline: boolean;
  useLogitModel: boolean;
  maxBet: number;

  // Calculations
  calculations: RoundCalculationResult;

  // Fetching state
  isLoading: boolean;
  error: string | null;
  pollingIntervalId: ReturnType<typeof setTimeout> | null;
  fetchAbortController: AbortController | null;
  isInitializing: boolean;

  // Actions
  updateRoundData: (roundData: RoundData) => void;
  updateSelectedRound: (round: number) => void;
  setCustomOdds: (odds: OddsData) => void;
  setCustomProbs: (probs: ProbabilitiesData) => void;
  setTableMode: (mode: string) => void;
  setBetSetPosition: (position: BetSetPosition) => void;
  setViewMode: (viewMode: boolean) => void;
  setUseWebDomain: (useWebDomain: boolean) => void;
  toggleBigBrain: () => void;
  toggleFaDetails: () => void;
  toggleOddsTimeline: () => void;
  toggleCustomOddsMode: () => void;
  toggleUseLogitModel: () => void;
  setMaxBet: (maxBet: number) => void;

  // Calculations
  recalculate: () => void;

  // Data fetching
  fetchCurrentRound: () => Promise<void>;
  fetchRoundData: (round?: number) => Promise<boolean>;
  startPolling: () => void;
  stopPolling: () => void;
  initialize: () => Promise<void>;
}

// Do NOT parse the URL here - parseBetUrl decodes the `b=`/`a=` hash via the
// wasm engine (see util.ts), which isn't initialized yet at module-eval time
// (src/index.jsx awaits initWasmMath() after this module has already been
// imported and evaluated). Start with safe defaults; hydrateRoundStoreFromUrl(),
// called from index.jsx once wasm is ready, applies the real parsed values.

export const useRoundStore = create<RoundStore>()(
  subscribeWithSelector((set, get) => ({
    // Round data
    roundData: defaultRoundData,
    currentRound: 0,
    currentSelectedRound: 0,

    // Settings
    customOdds: null,
    customProbs: null,
    tableMode: getTableMode(),
    betSetPosition: getBetSetPosition(),
    viewMode: false,
    useWebDomain: getUseWebDomain(),
    bigBrain: getBigBrainMode(),
    faDetails: getFaDetailsMode(),
    customOddsMode: getCustomOddsMode(),
    oddsTimeline: getOddsTimelineMode(),
    useLogitModel: getUseLogitModel(),
    maxBet: getMaxBet(0),

    // Calculations
    calculations: emptyCalculations,

    // Fetching state
    isLoading: false,
    error: null,
    pollingIntervalId: null,
    fetchAbortController: null,
    isInitializing: true,

    updateRoundData: (roundData: RoundData): void => {
      const state = get();

      // Always ignore data for a different round - this prevents stale fetches from overwriting the current round
      // Double-check right before updating to prevent race conditions
      const verifyState = get();
      if (roundData.round !== verifyState.currentSelectedRound) {
        return;
      }

      // Compare current odds with new odds to detect if they've changed
      const currentOdds = state.roundData.currentOdds || [];
      const newOdds = roundData.currentOdds || [];
      const oddsChanged =
        currentOdds.length !== newOdds.length ||
        currentOdds.some((arenaOdds, arenaIndex) => {
          const newArenaOdds = newOdds[arenaIndex] || [];
          return (
            arenaOdds.length !== newArenaOdds.length ||
            arenaOdds.some((odd, pirateIndex) => odd !== newArenaOdds[pirateIndex])
          );
        });

      // Compare winners to detect if they've changed (round ended)
      const currentWinners = state.roundData.winners || [];
      const newWinners = roundData.winners || [];
      const winnersChanged =
        currentWinners.length !== newWinners.length ||
        currentWinners.some((winner, index) => winner !== newWinners[index]);

      // Always update roundData (for timestamp, lastChange, changes, etc.)
      // but only recalculate if odds or winners changed
      // Note: Pirates don't change within a round - if they're different, it's a different round
      // which is already filtered by the round number check above
      // Clear any previous errors when successfully updating round data
      set({ roundData, error: null });

      // Only recalculate if odds or winners changed (this is the expensive operation)
      // Pirates are static for a round, so we don't need to check for pirate changes
      if (oddsChanged || winnersChanged || roundData.round !== state.roundData.round) {
        try {
          rebuildEngine(
            JSON.stringify(roundData),
            toEngineBetAmount(state.maxBet),
            state.useLogitModel,
          );
          // a fresh engine has no override - reapply if custom-odds-mode is active
          if (state.customOddsMode) {
            if (state.customOdds) {
              applyCustomOdds(state.customOdds);
            }
            if (state.customProbs) {
              applyCustomProbabilities(state.customProbs);
            }
          }
        } catch (error) {
          console.error('Failed to rebuild wasm engine:', error);
        }
        get().recalculate();
      }
    },

    updateSelectedRound: (round: number): void => {
      const prev = get();
      const isSameRound = round === prev.currentSelectedRound;

      // Don't do anything if it's the same round
      if (isSameRound) {
        return;
      }

      // Cancel any pending fetch to prevent stale data from overwriting the new round
      if (prev.fetchAbortController) {
        prev.fetchAbortController.abort('round_changed');
      }

      const maxBet = getMaxBet(round);
      set({
        currentSelectedRound: round,
        customOdds: null,
        customProbs: null,
        error: null,
        fetchAbortController: null,
        maxBet,
      });

      // The engine itself gets rebuilt once new round data arrives (see
      // updateRoundData) - just make sure any override from the previous
      // round doesn't linger on the (about-to-be-replaced) engine instance.
      try {
        applyCustomOdds(null);
        applyCustomProbabilities(null);
      } catch (error) {
        console.error('Failed to clear wasm engine overrides:', error);
      }

      if (round > 0) {
        // Always pass the round explicitly to avoid reading stale state
        get().fetchRoundData(round);
        get().startPolling();
      }
    },

    setCustomOdds: (odds: OddsData): void => {
      set({ customOdds: odds });
      if (get().customOddsMode) {
        try {
          applyCustomOdds(odds);
        } catch (error) {
          console.error('Failed to apply custom odds:', error);
        }
      }
      get().recalculate();
    },

    setCustomProbs: (probs: ProbabilitiesData): void => {
      set({ customProbs: probs });
      if (get().customOddsMode) {
        try {
          applyCustomProbabilities(probs);
        } catch (error) {
          console.error('Failed to apply custom probabilities:', error);
        }
      }
      get().recalculate();
    },

    setTableMode: (mode: string): void => set({ tableMode: mode }),
    setBetSetPosition: (position: BetSetPosition): void => set({ betSetPosition: position }),
    setViewMode: (viewMode: boolean): void => set({ viewMode }),
    setUseWebDomain: (useWebDomain: boolean): void => set({ useWebDomain }),

    setMaxBet: (maxBet: number): void => {
      set({ maxBet });
      if (get().roundData !== defaultRoundData) {
        try {
          setEngineBetAmount(toEngineBetAmount(maxBet));
        } catch (error) {
          console.error('Failed to update wasm engine bet amount:', error);
        }
      }
    },

    toggleBigBrain: (): void => set(state => ({ bigBrain: !state.bigBrain })),
    toggleFaDetails: (): void => set(state => ({ faDetails: !state.faDetails })),
    toggleOddsTimeline: (): void => set(state => ({ oddsTimeline: !state.oddsTimeline })),
    toggleCustomOddsMode: (): void => {
      set(state => ({ customOddsMode: !state.customOddsMode }));
      try {
        const state = get();
        if (state.customOddsMode) {
          if (state.customOdds) {
            applyCustomOdds(state.customOdds);
          }
          if (state.customProbs) {
            applyCustomProbabilities(state.customProbs);
          }
        } else {
          applyCustomOdds(null);
          applyCustomProbabilities(null);
        }
      } catch (error) {
        console.error('Failed to toggle wasm engine custom-odds overrides:', error);
      }
      get().recalculate();
    },
    toggleUseLogitModel: (): void => {
      set(state => ({ useLogitModel: !state.useLogitModel }));
      const newState = get();
      // the probability model is baked in at construction, so a full
      // rebuild is needed (setBetAmount alone can't change it)
      if (newState.roundData !== defaultRoundData && newState.roundData.pirates?.length) {
        try {
          rebuildEngine(
            JSON.stringify(newState.roundData),
            toEngineBetAmount(newState.maxBet),
            newState.useLogitModel,
          );
          if (newState.customOddsMode) {
            if (newState.customOdds) {
              applyCustomOdds(newState.customOdds);
            }
            if (newState.customProbs) {
              applyCustomProbabilities(newState.customProbs);
            }
          }
        } catch (error) {
          console.error('Failed to rebuild wasm engine after logit-model toggle:', error);
        }
      }
      get().recalculate();
    },

    recalculate: (): void => {
      const state = get();
      const betState = useBetStore.getState();

      const currentBets = betState.allBets.get(betState.currentBet) ?? new Map();
      const currentBetAmounts = betState.allBetAmounts.get(betState.currentBet) ?? new Map();

      if (state.roundData === defaultRoundData || !state.roundData.pirates?.length) {
        set({ calculations: emptyCalculations });
        return;
      }

      // Build a minimal roundState object for the calculation
      const roundState = {
        roundData: state.roundData,
        currentSelectedRound: state.currentSelectedRound,
        currentRound: state.currentRound,
        customOdds: state.customOdds,
        customProbs: state.customProbs,
        viewMode: state.viewMode,
        useWebDomain: state.useWebDomain,
        tableMode: state.tableMode,
        advanced: {
          bigBrain: state.bigBrain,
          faDetails: state.faDetails,
          oddsTimeline: state.oddsTimeline,
          customOddsMode: state.customOddsMode,
          useLogitModel: state.useLogitModel,
        },
      };

      const calculations = calculateRoundData(roundState, currentBets, currentBetAmounts);
      set({ calculations });
    },

    fetchCurrentRound: async (): Promise<void> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`https://cdn.neofood.club/current_round.txt`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await response.text();
        if (/^\d+$/.test(data.trim())) {
          const roundNumber = parseInt(data.trim(), 10);
          set({ currentRound: roundNumber });

          const state = get();
          if (state.currentSelectedRound === 0) {
            get().updateSelectedRound(roundNumber);

            const currentHash = window.location.hash.slice(1);
            const currentUrlData = parseBetUrl(currentHash);

            if (!currentUrlData.round || currentUrlData.round === 0) {
              const newUrl = makeBetURL(
                roundNumber,
                currentUrlData.bets,
                currentUrlData.betAmounts,
                anyBetsExist(currentUrlData.bets) && anyBetAmountsExist(currentUrlData.betAmounts),
              );
              window.history.replaceState(null, '', newUrl);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch current round:', error);
      }
    },

    fetchRoundData: async (round?: number): Promise<boolean> => {
      const state = get();
      // If round is explicitly provided, use it. Otherwise use currentSelectedRound.
      // This prevents race conditions where currentSelectedRound might be stale.
      const selectedRound = round !== undefined ? round : state.currentSelectedRound;

      if (!selectedRound || selectedRound === 0) {
        return false;
      }

      // Double-check that the round still matches before starting fetch
      // This prevents race conditions where the round changed between the check above and here
      const currentState = get();
      if (selectedRound !== currentState.currentSelectedRound) {
        return false;
      }

      let controller: AbortController | null = null;
      try {
        // Cancel any existing fetch
        if (currentState.fetchAbortController) {
          currentState.fetchAbortController.abort('superseded');
        }

        controller = new AbortController();
        const activeController = controller;
        set({ isLoading: true, error: null, fetchAbortController: activeController });
        const timeoutId = setTimeout(() => activeController.abort('timeout'), 15000);

        let response: Response;
        try {
          response = await fetch(`https://cdn.neofood.club/rounds/${selectedRound}.json`, {
            signal: activeController.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Verify the round still matches before updating (prevent stale data)
        const verifyState = get();
        // Also ensure this request is still the active one (prevent abort races)
        if (!controller || verifyState.fetchAbortController !== controller) {
          return false;
        }
        if (data.round !== verifyState.currentSelectedRound) {
          set({ isLoading: false, fetchAbortController: null });
          return false;
        }

        get().updateRoundData(data);
        set({ isLoading: false, error: null, fetchAbortController: null });

        // Check if round has winners
        if (data?.winners?.[0] > 0) {
          if (selectedRound === state.currentRound) {
            set({ currentRound: selectedRound + 1 });
          }
          if (selectedRound < state.currentRound - 1) {
            return true; // Stop polling
          }
        }

        return false;
      } catch (error) {
        // If we were aborted (superseded/timeout/navigation), treat as expected and don't log.
        if (isAbortError(error)) {
          const abortState = get();
          if (controller && abortState.fetchAbortController === controller) {
            set({ isLoading: false, fetchAbortController: null });
          }
          return false;
        }

        // Only update error state if this fetch is still the active one and we're not initializing
        const errorState = get();
        if (
          selectedRound === errorState.currentSelectedRound &&
          controller &&
          errorState.fetchAbortController === controller
        ) {
          // Don't set errors during initialization - no data at first is not an error
          if (!errorState.isInitializing) {
            // Don't call updateRoundData with defaultRoundData - it has round: 0 which could cause issues
            // Just set the error state and clear switching flag
            set({
              customOdds: null,
              customProbs: null,
              isLoading: false,
              error: `Failed to fetch round ${selectedRound}`,
              fetchAbortController: null,
            });

            if (showToast) {
              showToast({
                title: `Failed to fetch round ${selectedRound}`,
                description: 'Please try again later.',
                status: 'error',
                duration: 3000,
                isClosable: true,
              });
            }
          } else {
            // During initialization, just clean up without setting error
            set({
              isLoading: false,
              fetchAbortController: null,
            });
          }
        } else {
          // Fetch was cancelled or round changed, just clean up
          // Only clean up if we are still the active request.
          if (controller && errorState.fetchAbortController === controller) {
            set({ isLoading: false, fetchAbortController: null });
          }
        }

        console.error(`Failed to fetch round ${selectedRound}:`, error);
        return false;
      }
    },

    startPolling: (): void => {
      const state = get();
      if (state.pollingIntervalId) {
        clearTimeout(state.pollingIntervalId);
      }

      const { currentSelectedRound, currentRound } = state;
      if (!currentSelectedRound) {
        return;
      }

      const getInterval = (): number => {
        if (currentSelectedRound === currentRound) {
          return 10000;
        }
        if (currentSelectedRound === currentRound - 1) {
          return 60000;
        }
        return 300000;
      };

      const pollingIntervalId = setTimeout(async () => {
        // Capture the current selected round at the time the poll was scheduled
        const pollState = get();
        const pollRound = pollState.currentSelectedRound;

        // Only fetch if we're still on the same round
        if (pollRound === currentSelectedRound && pollRound > 0) {
          const shouldStop = await get().fetchRoundData(pollRound);
          if (!shouldStop) {
            // Double-check round hasn't changed before restarting polling
            const checkState = get();
            if (checkState.currentSelectedRound === pollRound) {
              get().startPolling();
            }
          }
        }
      }, getInterval());

      set({ pollingIntervalId });
    },

    stopPolling: (): void => {
      const state = get();
      if (state.pollingIntervalId) {
        clearTimeout(state.pollingIntervalId);
        set({ pollingIntervalId: null });
      }
    },

    initialize: async (): Promise<void> => {
      // Always wait for fetchCurrentRound to complete first to ensure we have the current round
      // This prevents showing errors for stale rounds from the URL
      await get().fetchCurrentRound();

      const updatedState = get();
      if (updatedState.currentSelectedRound > 0) {
        // fetchRoundData returns true when polling should STOP, and false otherwise (including normal success)
        const shouldStop = await get().fetchRoundData();
        if (!shouldStop) {
          get().startPolling();
        }
        // If fetch failed during initialization, don't set error - no data at first is not an error
      }

      // Mark initialization as complete
      set({ isInitializing: false });

      // Trigger initial calculation
      get().recalculate();

      const handleVisibilityChange = (): void => {
        const currentState = get();
        if (document.hidden) {
          currentState.stopPolling();
        } else if (currentState.currentSelectedRound > 0) {
          currentState.fetchRoundData().then(shouldStop => {
            if (!shouldStop) {
              currentState.startPolling();
            }
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      const handleHashChange = (): void => {
        const hash = window.location.hash.slice(1);
        if (!hash) {
          return;
        }

        const parsed = parseBetUrl(hash);
        const currentState = get();
        const betState = useBetStore.getState();

        const currentBets = betState.allBets.get(betState.currentBet) ?? new Map();
        const currentBetAmounts = betState.allBetAmounts.get(betState.currentBet) ?? new Map();

        // Check if the round changed
        if (parsed.round > 0 && parsed.round !== currentState.currentSelectedRound) {
          currentState.updateSelectedRound(parsed.round);
        }

        // Check if bets changed
        const currentBetUrl = makeBetURL(
          currentState.currentSelectedRound,
          currentBets,
          currentBetAmounts,
          anyBetsExist(currentBets) && anyBetAmountsExist(currentBetAmounts),
        );
        const currentBetHash = currentBetUrl.slice(2); // strip "/#"
        if (hash !== currentBetHash) {
          // Replace bets in the current bet set
          const betsForSet = new Map(betState.allBets).set(betState.currentBet, parsed.bets);
          const amountsForSet = new Map(betState.allBetAmounts).set(
            betState.currentBet,
            parsed.betAmounts,
          );
          betState.setAllBets(betsForSet);
          betState.setAllBetAmounts(amountsForSet);
        }
      };

      window.addEventListener('hashchange', handleHashChange);

      (window as unknown as Window & { __roundDataCleanup: () => void }).__roundDataCleanup =
        (): void => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('hashchange', handleHashChange);
          get().stopPolling();
        };
    },
  })),
);

/**
 * Parses the current URL hash and applies the round/view-mode/max-bet it
 * encodes. Must only be called after initWasmMath() has resolved (see
 * src/index.jsx) - calling it earlier will silently see no bets (round still
 * parses fine, since it doesn't touch the wasm engine), since parseBetUrl's
 * bet/amount decoding depends on the wasm engine being initialized.
 */
export function hydrateRoundStoreFromUrl(): void {
  const initialState = parseBetUrl(window.location.hash.slice(1));
  const round = initialState.round || 0;
  useRoundStore.setState({
    currentRound: round,
    currentSelectedRound: round,
    viewMode: anyBetsExist(initialState.bets),
    maxBet: getMaxBet(round),
  });
}

// Subscribe to bet changes and recalculate
// Use dynamic import to avoid circular dependency at module load time
import('./betStore').then(() => {
  let scheduledRecalc: number | null = null;
  const scheduleRecalculate = (): void => {
    if (scheduledRecalc !== null) {
      // cancel any pending recalculation so rapid bet switching doesn't enqueue work
      if (typeof cancelAnimationFrame !== 'undefined') {
        // eslint-disable-next-line no-undef
        cancelAnimationFrame(scheduledRecalc);
      } else {
        clearTimeout(scheduledRecalc);
      }
    }

    // Defer the expensive recalculation to the next frame so the UI can paint
    if (typeof requestAnimationFrame !== 'undefined') {
      // eslint-disable-next-line no-undef
      scheduledRecalc = requestAnimationFrame(() => {
        scheduledRecalc = null;
        useRoundStore.getState().recalculate();
      });
    } else {
      scheduledRecalc = window.setTimeout(() => {
        scheduledRecalc = null;
        useRoundStore.getState().recalculate();
      }, 0);
    }
  };

  useBetStore.subscribe(
    state => {
      const currentBets = state.allBets.get(state.currentBet) ?? new Map();
      const currentBetAmounts = state.allBetAmounts.get(state.currentBet) ?? new Map();
      return { currentBets, currentBetAmounts, currentBet: state.currentBet };
    },
    () => {
      scheduleRecalculate();
    },
    { fireImmediately: false },
  );
  // Trigger initial calculation manually
  scheduleRecalculate();
});

// Subscribe to round changes and update URL
useRoundStore.subscribe(
  state => ({
    currentSelectedRound: state.currentSelectedRound,
  }),
  (data, prevData) => {
    if (prevData && data.currentSelectedRound !== prevData.currentSelectedRound) {
      // Get fresh state to ensure we have the latest round
      const currentState = useRoundStore.getState();

      // Verify the round hasn't changed again (prevent race conditions)
      if (data.currentSelectedRound !== currentState.currentSelectedRound) {
        return; // Don't update URL if round changed again
      }

      // Get current bets from bet store, not from URL hash, to avoid stale data
      const betState = useBetStore.getState();
      const currentBets = betState.allBets.get(betState.currentBet) ?? new Map();
      const currentBetAmounts = betState.allBetAmounts.get(betState.currentBet) ?? new Map();

      const newUrl = makeBetURL(
        currentState.currentSelectedRound, // Use currentState to ensure we have latest
        currentBets,
        currentBetAmounts,
        anyBetsExist(currentBets) && anyBetAmountsExist(currentBetAmounts),
      );

      window.history.replaceState(null, '', newUrl);
    }
  },
  { fireImmediately: false },
);
