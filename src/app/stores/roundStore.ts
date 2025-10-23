import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { RoundData, RoundCalculationResult } from '../../types';
import { OddsData, ProbabilitiesData } from '../../types/bets';
import { defaultRoundData } from '../constants';
import {
  calculateRoundData,
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
} from '../util';

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
  viewMode: boolean;
  useWebDomain: boolean;
  bigBrain: boolean;
  faDetails: boolean;
  customOddsMode: boolean;
  oddsTimeline: boolean;
  useLogitModel: boolean;

  // Calculations
  calculations: RoundCalculationResult;

  // Fetching state
  isLoading: boolean;
  isRoundSwitching: boolean;
  error: string | null;
  pollingIntervalId: ReturnType<typeof setTimeout> | null;

  // Actions
  updateRoundData: (roundData: RoundData) => void;
  updateSelectedRound: (round: number) => void;
  setCustomOdds: (odds: OddsData) => void;
  setCustomProbs: (probs: ProbabilitiesData) => void;
  setTableMode: (mode: string) => void;
  setViewMode: (viewMode: boolean) => void;
  setUseWebDomain: (useWebDomain: boolean) => void;
  toggleBigBrain: () => void;
  toggleFaDetails: () => void;
  toggleOddsTimeline: () => void;
  toggleCustomOddsMode: () => void;
  toggleUseLogitModel: () => void;

  // Calculations
  recalculate: () => void;

  // Data fetching
  fetchCurrentRound: () => Promise<void>;
  fetchRoundData: (round?: number) => Promise<boolean>;
  startPolling: () => void;
  stopPolling: () => void;
  initialize: () => void;
}

const initialState = parseBetUrl(window.location.hash.slice(1));

export const useRoundStore = create<RoundStore>()(
  subscribeWithSelector((set, get) => ({
    // Round data
    roundData: defaultRoundData,
    currentRound: initialState.round || 0,
    currentSelectedRound: initialState.round || 0,

    // Settings
    customOdds: null,
    customProbs: null,
    tableMode: getTableMode(),
    viewMode: anyBetsExist(initialState.bets),
    useWebDomain: getUseWebDomain(),
    bigBrain: getBigBrainMode(),
    faDetails: getFaDetailsMode(),
    customOddsMode: getCustomOddsMode(),
    oddsTimeline: getOddsTimelineMode(),
    useLogitModel: getUseLogitModel(),

    // Calculations
    calculations: emptyCalculations,

    // Fetching state
    isLoading: false,
    isRoundSwitching: false,
    error: null,
    pollingIntervalId: null,

    updateRoundData: (roundData: RoundData) => {
      set(state => {
        const isCorrectRound = roundData.round === state.currentSelectedRound;
        const hasValidData = roundData.pirates && roundData.pirates.length > 0;
        const shouldClearSwitching = state.isRoundSwitching && isCorrectRound && hasValidData;

        return {
          roundData,
          isRoundSwitching: shouldClearSwitching ? false : state.isRoundSwitching,
        };
      });
      get().recalculate();
    },

    updateSelectedRound: (round: number) => {
      const prev = get();
      const isSameRound = round === prev.currentSelectedRound;

      set({
        currentSelectedRound: round,
        customOdds: isSameRound ? prev.customOdds : null,
        customProbs: isSameRound ? prev.customProbs : null,
        isRoundSwitching: !isSameRound,
        error: null,
      });

      if (round > 0) {
        get().fetchRoundData(round);
        get().startPolling();
      }
    },

    setCustomOdds: (odds: OddsData) => {
      set({ customOdds: odds });
      get().recalculate();
    },

    setCustomProbs: (probs: ProbabilitiesData) => {
      set({ customProbs: probs });
      get().recalculate();
    },

    setTableMode: (mode: string) => set({ tableMode: mode }),
    setViewMode: (viewMode: boolean) => set({ viewMode }),
    setUseWebDomain: (useWebDomain: boolean) => set({ useWebDomain }),

    toggleBigBrain: () => set(state => ({ bigBrain: !state.bigBrain })),
    toggleFaDetails: () => set(state => ({ faDetails: !state.faDetails })),
    toggleOddsTimeline: () => set(state => ({ oddsTimeline: !state.oddsTimeline })),
    toggleCustomOddsMode: () => {
      set(state => ({ customOddsMode: !state.customOddsMode }));
      get().recalculate();
    },
    toggleUseLogitModel: () => {
      set(state => ({ useLogitModel: !state.useLogitModel }));
      get().recalculate();
    },

    recalculate: () => {
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

    fetchCurrentRound: async () => {
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

    fetchRoundData: async (round?: number) => {
      const state = get();
      const selectedRound = round ?? state.currentSelectedRound;

      if (!selectedRound || selectedRound === 0) {
        return false;
      }

      try {
        set({ isLoading: true, error: null });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`https://cdn.neofood.club/rounds/${selectedRound}.json`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        get().updateRoundData(data);
        set({ isLoading: false });

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
        get().updateRoundData(defaultRoundData);
        set({
          customOdds: null,
          customProbs: null,
          isLoading: false,
          error: `Failed to fetch round ${selectedRound}`,
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

        console.error(`Failed to fetch round ${selectedRound}:`, error);
        return false;
      }
    },

    startPolling: () => {
      const state = get();
      if (state.pollingIntervalId) {
        clearTimeout(state.pollingIntervalId);
      }

      const { currentSelectedRound, currentRound } = state;
      if (!currentSelectedRound) {
        return;
      }

      const getInterval = () => {
        if (currentSelectedRound === currentRound) {
          return 10000;
        }
        if (currentSelectedRound === currentRound - 1) {
          return 60000;
        }
        return 300000;
      };

      const pollingIntervalId = setTimeout(async () => {
        const shouldStop = await get().fetchRoundData();
        if (!shouldStop) {
          get().startPolling();
        }
      }, getInterval());

      set({ pollingIntervalId });
    },

    stopPolling: () => {
      const state = get();
      if (state.pollingIntervalId) {
        clearTimeout(state.pollingIntervalId);
        set({ pollingIntervalId: null });
      }
    },

    initialize: () => {
      get().fetchCurrentRound();

      const state = get();
      if (state.currentSelectedRound > 0) {
        get().fetchRoundData();
        get().startPolling();
      }

      // Trigger initial calculation
      get().recalculate();

      const handleVisibilityChange = () => {
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

      (window as any).__roundDataCleanup = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        get().stopPolling();
      };
    },
  })),
);

// Subscribe to bet changes and recalculate
useBetStore.subscribe(
  state => {
    const currentBets = state.allBets.get(state.currentBet) ?? new Map();
    const currentBetAmounts = state.allBetAmounts.get(state.currentBet) ?? new Map();
    return { currentBets, currentBetAmounts, currentBet: state.currentBet };
  },
  () => {
    useRoundStore.getState().recalculate();
  },
  { fireImmediately: true },
);

// Subscribe to round changes and update URL
useRoundStore.subscribe(
  state => ({ currentSelectedRound: state.currentSelectedRound }),
  (data, prevData) => {
    if (prevData && data.currentSelectedRound !== prevData.currentSelectedRound) {
      const currentHash = window.location.hash.slice(1);
      const currentUrlData = parseBetUrl(currentHash);

      const newUrl = makeBetURL(
        data.currentSelectedRound,
        currentUrlData.bets,
        currentUrlData.betAmounts,
        anyBetsExist(currentUrlData.bets) && anyBetAmountsExist(currentUrlData.betAmounts),
      );

      window.history.replaceState(null, '', newUrl);
    }
  },
  { fireImmediately: false },
);
