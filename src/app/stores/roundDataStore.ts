import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { RoundData, RoundState } from '../../types';
import { OddsData, ProbabilitiesData } from '../../types/bets';
import { defaultRoundData } from '../constants';
import {
  getTableMode,
  parseBetUrl,
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

import { useCalculationsStore } from './calculationsStore';

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

interface RoundDataStore {
  roundState: RoundState;
  // Data fetching state
  isLoading: boolean;
  isRoundSwitching: boolean;
  error: string | null;
  retryCount: number;
  pollingIntervalId: ReturnType<typeof setTimeout> | null;

  // Existing actions
  setRoundState: (value: Partial<RoundState>) => void;
  updateRoundData: (roundData: RoundData) => void;
  updateCurrentRound: (round: number) => void;
  updateSelectedRound: (round: number) => void;

  // New granular toggle functions
  toggleBigBrain: () => void;
  toggleFaDetails: () => void;
  toggleOddsTimeline: () => void;
  toggleCustomOddsMode: () => void;
  toggleUseLogitModel: () => void;

  setCustomOdds: (odds: OddsData) => void;
  setCustomProbs: (probs: ProbabilitiesData) => void;
  setViewMode: (viewMode: boolean) => void;
  setTableMode: (mode: string) => void;
  setUseWebDomain: (useWebDomain: boolean) => void;

  // New data fetching actions
  fetchCurrentRound: () => Promise<void>;
  fetchRoundData: (round?: number) => Promise<boolean>;
  startPolling: () => void;
  stopPolling: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
}

// Parse initial state from URL
const initialState = parseBetUrl(window.location.hash.slice(1));
const initialRound = initialState.round || 0;
const initialViewMode = anyBetsExist(initialState.bets);

export const useRoundDataStore = create<RoundDataStore>()(
  subscribeWithSelector((set, get) => ({
    roundState: {
      roundData: defaultRoundData,
      currentRound: initialRound,
      currentSelectedRound: initialRound,
      customOdds: null,
      customProbs: null,
      tableMode: getTableMode(),
      advanced: {
        bigBrain: getBigBrainMode(),
        faDetails: getFaDetailsMode(),
        customOddsMode: getCustomOddsMode(),
        oddsTimeline: getOddsTimelineMode(),
        useLogitModel: getUseLogitModel(),
      },
      viewMode: initialViewMode,
      useWebDomain: getUseWebDomain(),
    },

    // Data fetching state
    isLoading: false,
    isRoundSwitching: false,
    error: null,
    retryCount: 0,
    pollingIntervalId: null,

    setRoundState: (value: Partial<RoundState>): void =>
      set(state => ({
        roundState: { ...state.roundState, ...value },
      })),

    updateRoundData: (roundData: RoundData): void =>
      set(state => {
        if (JSON.stringify(state.roundState.roundData) === JSON.stringify(roundData)) {
          return state; // No changes, don't re-render
        }

        // Check if this is the data for the round we're switching to
        const isCorrectRound = roundData.round === state.roundState.currentSelectedRound;
        const hasValidData = roundData.pirates && roundData.pirates.length > 0;

        // Clear round switching state only when we have valid data for the correct round
        const shouldClearSwitching = state.isRoundSwitching && isCorrectRound && hasValidData;

        return {
          roundState: { ...state.roundState, roundData },
          isRoundSwitching: shouldClearSwitching ? false : state.isRoundSwitching,
        };
      }),

    updateCurrentRound: (round: number): void =>
      set(state => ({
        roundState: { ...state.roundState, currentRound: round },
      })),

    updateSelectedRound: (round: number): void => {
      const prevState = get();
      const isSameRound = round === prevState.roundState.currentSelectedRound;

      set(state => ({
        roundState: {
          ...state.roundState,
          currentSelectedRound: round,
          // Keep existing round data during switching to avoid expensive re-renders
          // The data will be replaced when new data arrives
          // Clear custom data when switching to a different round
          customOdds: isSameRound ? state.roundState.customOdds : null,
          customProbs: isSameRound ? state.roundState.customProbs : null,
        },
        // Set round switching state immediately when switching rounds
        isRoundSwitching: isSameRound ? state.isRoundSwitching : true,
        error: null,
      }));

      // Start fetching data for the new round
      if (round > 0) {
        get().fetchRoundData(round);
        get().startPolling();
      }
    },

    toggleBigBrain: (): void =>
      set(state => ({
        roundState: {
          ...state.roundState,
          advanced: {
            ...state.roundState.advanced,
            bigBrain: !state.roundState.advanced.bigBrain,
          },
        },
      })),

    toggleFaDetails: (): void =>
      set(state => ({
        roundState: {
          ...state.roundState,
          advanced: {
            ...state.roundState.advanced,
            faDetails: !state.roundState.advanced.faDetails,
          },
        },
      })),

    toggleOddsTimeline: (): void =>
      set(state => ({
        roundState: {
          ...state.roundState,
          advanced: {
            ...state.roundState.advanced,
            oddsTimeline: !state.roundState.advanced.oddsTimeline,
          },
        },
      })),

    toggleCustomOddsMode: (): void =>
      set(state => ({
        roundState: {
          ...state.roundState,
          advanced: {
            ...state.roundState.advanced,
            customOddsMode: !state.roundState.advanced.customOddsMode,
          },
        },
      })),

    toggleUseLogitModel: (): void =>
      set(state => ({
        roundState: {
          ...state.roundState,
          advanced: {
            ...state.roundState.advanced,
            useLogitModel: !state.roundState.advanced.useLogitModel,
          },
        },
      })),

    setCustomOdds: (odds: OddsData): void =>
      set(state => ({
        roundState: { ...state.roundState, customOdds: odds },
      })),

    setCustomProbs: (probs: ProbabilitiesData): void =>
      set(state => ({
        roundState: { ...state.roundState, customProbs: probs },
      })),

    setViewMode: (viewMode: boolean): void =>
      set(state => ({
        roundState: { ...state.roundState, viewMode },
      })),

    setTableMode: (mode: string): void =>
      set(state => ({
        roundState: { ...state.roundState, tableMode: mode },
      })),

    setUseWebDomain: (useWebDomain: boolean): void =>
      set(state => ({
        roundState: { ...state.roundState, useWebDomain },
      })),

    setError: (error: string | null): void => set(() => ({ error })),

    setLoading: (loading: boolean): void => set(() => ({ isLoading: loading })),

    fetchCurrentRound: async (): Promise<void> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const currentRoundResponse = await fetch(`https://cdn.neofood.club/current_round.txt`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const currentRoundData = await currentRoundResponse.text();
        if (/^\d+$/.test(currentRoundData.trim())) {
          const roundNumber = parseInt(currentRoundData.trim(), 10);
          get().updateCurrentRound(roundNumber);

          // If no round is selected, select the current round
          const state = get();
          if (state.roundState.currentSelectedRound === 0) {
            get().updateSelectedRound(roundNumber);

            // Update URL to reflect the current round on initial load
            const currentHash = window.location.hash.slice(1);
            const currentUrlData = parseBetUrl(currentHash);

            // Only update URL if it doesn't already have a round specified
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

          set(() => ({ retryCount: 0 })); // Reset retry count on success
        }
      } catch (error) {
        console.error('Failed to fetch current round:', error);
        // Exponential backoff retry logic could be added here if needed
      }
    },

    fetchRoundData: async (round?: number): Promise<boolean> => {
      const state = get();
      const selectedRound = round ?? state.roundState.currentSelectedRound;
      const currentRoundValue = state.roundState.currentRound;

      if (!selectedRound || selectedRound === 0) {
        return false;
      }

      try {
        set(() => ({ isLoading: true, error: null }));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(`https://cdn.neofood.club/rounds/${selectedRound}.json`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMsg = `HTTP ${response.status}`;
          try {
            const data = await response.json();
            if (data && data.error) {
              errorMsg = data.error;
            }
          } catch {
            // ignore JSON parse error
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();

        get().updateRoundData(data);
        set(() => ({ retryCount: 0, isLoading: false })); // Reset retry count on success

        // Check if round has winners and update current round if needed
        if (data?.winners?.[0] > 0) {
          if (selectedRound === currentRoundValue) {
            get().updateCurrentRound(selectedRound + 1);
          }

          // Stop polling for older rounds
          if (selectedRound < currentRoundValue - 1) {
            return true; // Signal to stop polling
          }
        }

        return false; // Continue polling
      } catch (error) {
        const currentState = get();
        const newRetryCount = currentState.retryCount + 1;

        // Clear round data and custom data when round doesn't exist
        get().updateRoundData(defaultRoundData);
        get().setRoundState({
          customOdds: null,
          customProbs: null,
        });

        set(() => ({
          retryCount: newRetryCount,
          isLoading: false,
          error: `Failed to fetch round ${selectedRound}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }));

        // Only show toast after multiple failures to avoid spam
        if (newRetryCount >= 3 && showToast) {
          showToast({
            title: `Failed to fetch round ${selectedRound}`,
            description: 'Please try again later.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          set(() => ({ retryCount: 0 })); // Reset after showing toast
        }

        console.error(`Failed to fetch round ${selectedRound}:`, error);
        return false; // Continue polling despite error
      }
    },

    startPolling: (): void => {
      const state = get();

      // Clear existing polling
      if (state.pollingIntervalId) {
        clearTimeout(state.pollingIntervalId);
      }

      const currentSelectedRound = state.roundState.currentSelectedRound;
      const currentRound = state.roundState.currentRound;

      if (!currentSelectedRound || currentSelectedRound === 0) {
        return;
      }

      // Determine polling interval based on round relationship
      const getPollingInterval = (): number => {
        if (currentSelectedRound === currentRound) {
          return 10000; // Current round: poll every 10 seconds
        } else if (currentSelectedRound === currentRound - 1) {
          return 60000; // Previous round: poll every minute
        }
        return 300000; // Older rounds: poll every 5 minutes (less frequent)
      };

      const interval = getPollingInterval();

      const pollingIntervalId = setTimeout(async () => {
        const shouldStop = await get().fetchRoundData();
        if (!shouldStop) {
          get().startPolling(); // Schedule next poll
        }
      }, interval);

      set(() => ({ pollingIntervalId }));
    },

    stopPolling: (): void => {
      const state = get();
      if (state.pollingIntervalId) {
        clearTimeout(state.pollingIntervalId);
        set(() => ({ pollingIntervalId: null }));
      }
    },

    initialize: (): void => {
      // Fetch current round immediately
      get().fetchCurrentRound();

      // If we have a selected round, fetch its data and start polling
      const state = get();
      if (state.roundState.currentSelectedRound > 0) {
        get().fetchRoundData();
        get().startPolling();
      }

      // Handle visibility change for better performance
      const handleVisibilityChange = (): void => {
        const currentState = get();
        if (document.hidden) {
          currentState.stopPolling();
        } else if (currentState.roundState.currentSelectedRound > 0) {
          // Fetch immediately when page becomes visible, then resume polling
          currentState.fetchRoundData().then(shouldStop => {
            if (!shouldStop) {
              currentState.startPolling();
            }
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Store cleanup function for later use
      (window as unknown as { __roundDataCleanup?: () => void }).__roundDataCleanup = (): void => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        get().stopPolling();
      };
    },
  })),
);

// Selective selectors for specific parts of roundData
export const roundDataSelectors = {
  // Basic round info
  roundNumbers: (
    state: RoundDataStore,
  ): { currentRound: number; currentSelectedRound: number } => ({
    currentRound: state.roundState.currentRound,
    currentSelectedRound: state.roundState.currentSelectedRound,
  }),

  // Pirates data only
  piratesData: (state: RoundDataStore): { pirates: number[][]; foods: number[][] } => ({
    pirates: state.roundState.roundData.pirates,
    foods: state.roundState.roundData.foods,
  }),

  // Odds data only
  oddsData: (
    state: RoundDataStore,
  ): { openingOdds: number[][]; currentOdds: number[][]; customOdds: OddsData | null } => ({
    openingOdds: state.roundState.roundData.openingOdds,
    currentOdds: state.roundState.roundData.currentOdds,
    customOdds: state.roundState.customOdds,
  }),

  // Probabilities data only
  probabilitiesData: (
    state: RoundDataStore,
  ): { probabilities: number[][] | undefined; customProbs: ProbabilitiesData | null } => {
    const calculations = useCalculationsStore.getState().calculations;
    return {
      probabilities: calculations.usedProbabilities,
      customProbs: state.roundState.customProbs,
    };
  },

  // Advanced settings only
  advancedSettings: (state: RoundDataStore): RoundState['advanced'] => state.roundState.advanced,

  // UI settings only
  uiSettings: (
    state: RoundDataStore,
  ): { tableMode: string; viewMode: boolean; useWebDomain: boolean } => ({
    tableMode: state.roundState.tableMode,
    viewMode: state.roundState.viewMode,
    useWebDomain: state.roundState.useWebDomain,
  }),

  // Calculation-relevant data only
  calculationData: (
    state: RoundDataStore,
  ): {
    roundNumber: number;
    selectedRound: number;
    customOddsMode: boolean;
    useLogitModel: boolean;
    roundData: RoundData;
    customOdds: OddsData | null;
    customProbs: ProbabilitiesData | null;
  } => ({
    roundNumber: state.roundState.roundData?.round || 0,
    selectedRound: state.roundState.currentSelectedRound,
    customOddsMode: state.roundState.advanced?.customOddsMode || false,
    useLogitModel: state.roundState.advanced?.useLogitModel || false,
    roundData: state.roundState.roundData,
    customOdds: state.roundState.customOdds,
    customProbs: state.roundState.customProbs,
  }),

  // Minimal data for URL updates
  urlData: (state: RoundDataStore): { currentSelectedRound: number; viewMode: boolean } => ({
    currentSelectedRound: state.roundState.currentSelectedRound,
    viewMode: state.roundState.viewMode,
  }),
};

export const useRoundPirates = (): number[][] =>
  useRoundDataStore(state => state.roundState.roundData.pirates);
export const useRoundOpeningOdds = (): number[][] =>
  useRoundDataStore(state => state.roundState.roundData.openingOdds);
export const useRoundCurrentOdds = (): number[][] =>
  useRoundDataStore(state => state.roundState.roundData.currentOdds);

// Subscribe to round changes and update URL
useRoundDataStore.subscribe(
  roundDataSelectors.urlData,
  (urlData, prevUrlData) => {
    // Only update URL if the round actually changed and it's not the initial load
    if (prevUrlData && urlData.currentSelectedRound !== prevUrlData.currentSelectedRound) {
      // Parse current URL to preserve existing bet data
      const currentHash = window.location.hash.slice(1);
      const currentUrlData = parseBetUrl(currentHash);

      // Create new URL with updated round, preserving existing bets and bet amounts
      const newUrl = makeBetURL(
        urlData.currentSelectedRound,
        currentUrlData.bets,
        currentUrlData.betAmounts,
        anyBetsExist(currentUrlData.bets) && anyBetAmountsExist(currentUrlData.betAmounts),
      );

      // Update browser URL without adding to history
      window.history.replaceState(null, '', newUrl);
    }
  },
  { fireImmediately: false },
);
