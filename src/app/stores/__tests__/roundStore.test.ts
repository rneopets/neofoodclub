import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { RoundCalculationResult, RoundData } from '../../../types';
import type { Bet, BetAmount } from '../../../types/bets';
import { BET_AMOUNT_DEFAULT, defaultRoundData } from '../../constants';
import { useBetStore } from '../betStore';
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

// Allow the betStore's lazy dynamic import of roundStore (and vice versa) to resolve
async function waitForStoreInit(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50));
}

function makeRoundData(overrides: Partial<RoundData> = {}): RoundData {
  return {
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
    ...overrides,
  };
}

const blankCalculations: RoundCalculationResult = {
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

function seedRealBets(): void {
  useBetStore.setState({
    currentBet: 0,
    allNames: new Map([[0, 'Test Set']]),
    allBets: new Map([[0, makeBets([[1, 5, 9, 13, 17]])]]),
    allBetAmounts: new Map([[0, makeAmounts([1000])]]),
  });
}

describe('roundStore', () => {
  beforeEach(async () => {
    await waitForStoreInit();

    mockFetch.mockReset();
    mockFetch.mockImplementation(() => Promise.resolve({ ok: false, status: 404 }));

    useRoundStore.setState({
      roundData: defaultRoundData,
      currentRound: 8000,
      currentSelectedRound: 8000,
      customOdds: null,
      customProbs: null,
      tableMode: 'normal',
      betSetPosition: 'below',
      viewMode: false,
      useWebDomain: false,
      bigBrain: true,
      faDetails: false,
      customOddsMode: false,
      oddsTimeline: false,
      useLogitModel: false,
      maxBet: BET_AMOUNT_DEFAULT,
      calculations: blankCalculations,
      isLoading: false,
      error: null,
      pollingIntervalId: null,
      fetchAbortController: null,
      isInitializing: false,
    });

    seedRealBets();
  });

  afterEach(() => {
    useRoundStore.getState().stopPolling();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('updateSelectedRound', () => {
    it('no-ops if round equals currentSelectedRound', () => {
      const before = useRoundStore.getState();
      useRoundStore.getState().updateSelectedRound(8000);
      expect(useRoundStore.getState()).toBe(before);
    });

    it('updates currentSelectedRound and resets customOdds/customProbs/error, recomputes maxBet', () => {
      useRoundStore.setState({
        customOdds: [[1, 2]],
        customProbs: [[0.5, 0.5]],
        error: 'previous error',
        maxBet: 99999,
      });

      useRoundStore.getState().updateSelectedRound(9000);

      const state = useRoundStore.getState();
      expect(state.currentSelectedRound).toBe(9000);
      expect(state.customOdds).toBeNull();
      expect(state.customProbs).toBeNull();
      expect(state.error).toBeNull();
      // cookies are mocked to always return undefined, so getMaxBet falls back to BET_AMOUNT_DEFAULT
      expect(state.maxBet).toBe(BET_AMOUNT_DEFAULT);
    });

    it('aborts any in-flight fetchAbortController', () => {
      const controller = new AbortController();
      const abortSpy = vi.spyOn(controller, 'abort');
      useRoundStore.setState({ fetchAbortController: controller });

      useRoundStore.getState().updateSelectedRound(9500);

      expect(abortSpy).toHaveBeenCalledWith('round_changed');
    });
  });

  describe('setCustomOdds', () => {
    it('sets the value and triggers recalculate', () => {
      useRoundStore.setState({ roundData: makeRoundData(), calculations: blankCalculations });

      useRoundStore.getState().setCustomOdds([[1, 2, 3, 4, 5]]);

      const state = useRoundStore.getState();
      expect(state.customOdds).toEqual([[1, 2, 3, 4, 5]]);
      expect(state.calculations).not.toBe(blankCalculations);
      expect(state.calculations.calculated).toBe(true);
    });
  });

  describe('setCustomProbs', () => {
    it('sets the value and triggers recalculate', () => {
      useRoundStore.setState({ roundData: makeRoundData(), calculations: blankCalculations });

      useRoundStore.getState().setCustomProbs([[0.1, 0.2, 0.3, 0.4]]);

      const state = useRoundStore.getState();
      expect(state.customProbs).toEqual([[0.1, 0.2, 0.3, 0.4]]);
      expect(state.calculations).not.toBe(blankCalculations);
      expect(state.calculations.calculated).toBe(true);
    });
  });

  describe('trivial direct setters', () => {
    it('setTableMode', () => {
      useRoundStore.getState().setTableMode('dropdown');
      expect(useRoundStore.getState().tableMode).toBe('dropdown');
    });

    it('setBetSetPosition', () => {
      useRoundStore.getState().setBetSetPosition('right');
      expect(useRoundStore.getState().betSetPosition).toBe('right');
    });

    it('setViewMode', () => {
      useRoundStore.getState().setViewMode(true);
      expect(useRoundStore.getState().viewMode).toBe(true);
    });

    it('setUseWebDomain', () => {
      useRoundStore.getState().setUseWebDomain(true);
      expect(useRoundStore.getState().useWebDomain).toBe(true);
    });

    it('setMaxBet', () => {
      useRoundStore.getState().setMaxBet(12345);
      expect(useRoundStore.getState().maxBet).toBe(12345);
    });
  });

  describe('simple boolean flips (no recalculate)', () => {
    it('toggleBigBrain flips bigBrain', () => {
      const before = useRoundStore.getState().bigBrain;
      useRoundStore.getState().toggleBigBrain();
      expect(useRoundStore.getState().bigBrain).toBe(!before);
    });

    it('toggleFaDetails flips faDetails', () => {
      const before = useRoundStore.getState().faDetails;
      useRoundStore.getState().toggleFaDetails();
      expect(useRoundStore.getState().faDetails).toBe(!before);
    });

    it('toggleOddsTimeline flips oddsTimeline', () => {
      const before = useRoundStore.getState().oddsTimeline;
      useRoundStore.getState().toggleOddsTimeline();
      expect(useRoundStore.getState().oddsTimeline).toBe(!before);
    });
  });

  describe('boolean flips that also trigger recalculate', () => {
    it('toggleCustomOddsMode flips the flag and recomputes calculations', () => {
      useRoundStore.setState({ roundData: makeRoundData(), calculations: blankCalculations });
      const before = useRoundStore.getState().customOddsMode;

      useRoundStore.getState().toggleCustomOddsMode();

      const state = useRoundStore.getState();
      expect(state.customOddsMode).toBe(!before);
      expect(state.calculations).not.toBe(blankCalculations);
      expect(state.calculations.calculated).toBe(true);
    });

    it('toggleUseLogitModel flips the flag and recomputes calculations', () => {
      useRoundStore.setState({ roundData: makeRoundData(), calculations: blankCalculations });
      const before = useRoundStore.getState().useLogitModel;

      useRoundStore.getState().toggleUseLogitModel();

      const state = useRoundStore.getState();
      expect(state.useLogitModel).toBe(!before);
      expect(state.calculations).not.toBe(blankCalculations);
      expect(state.calculations.calculated).toBe(true);
    });
  });

  describe('updateRoundData', () => {
    it('ignores data for a round that does not match currentSelectedRound', () => {
      const original = makeRoundData({ round: 8000 });
      useRoundStore.setState({ roundData: original, currentSelectedRound: 8000 });

      useRoundStore.getState().updateRoundData(makeRoundData({ round: 9999 }));

      expect(useRoundStore.getState().roundData).toBe(original);
    });

    it('updates roundData and clears error when the round matches', () => {
      useRoundStore.setState({
        roundData: makeRoundData({ round: 8000 }),
        currentSelectedRound: 8000,
        error: 'boom',
      });

      const updated = makeRoundData({ round: 8000, timestamp: '2026-01-01T00:00:00Z' });
      useRoundStore.getState().updateRoundData(updated);

      const state = useRoundStore.getState();
      expect(state.roundData).toBe(updated);
      expect(state.error).toBeNull();
    });

    it('does not trigger recalculate when odds, winners, and round are all unchanged', () => {
      const original = makeRoundData({ round: 8000 });
      useRoundStore.setState({ roundData: original, currentSelectedRound: 8000 });

      const recalcSpy = vi.spyOn(useRoundStore.getState(), 'recalculate');

      // Same values, different object/array references
      useRoundStore.getState().updateRoundData(makeRoundData({ round: 8000 }));

      expect(recalcSpy).not.toHaveBeenCalled();
    });

    it('triggers recalculate when odds changed', () => {
      useRoundStore.setState({
        roundData: makeRoundData({ round: 8000 }),
        currentSelectedRound: 8000,
      });
      const recalcSpy = vi.spyOn(useRoundStore.getState(), 'recalculate');

      useRoundStore.getState().updateRoundData(
        makeRoundData({
          round: 8000,
          currentOdds: [
            [1, 9, 9, 9, 9],
            [1, 2, 3, 4, 5],
            [1, 2, 3, 4, 5],
            [1, 2, 3, 4, 5],
            [1, 2, 3, 4, 5],
          ],
        }),
      );

      expect(recalcSpy).toHaveBeenCalled();
    });

    it('triggers recalculate when winners changed', () => {
      useRoundStore.setState({
        roundData: makeRoundData({ round: 8000 }),
        currentSelectedRound: 8000,
      });
      const recalcSpy = vi.spyOn(useRoundStore.getState(), 'recalculate');

      useRoundStore
        .getState()
        .updateRoundData(makeRoundData({ round: 8000, winners: [1, 0, 0, 0, 0] }));

      expect(recalcSpy).toHaveBeenCalled();
    });

    it('triggers recalculate when the round number itself changed', () => {
      useRoundStore.setState({
        roundData: makeRoundData({ round: 8000 }),
        currentSelectedRound: 8001,
      });
      const recalcSpy = vi.spyOn(useRoundStore.getState(), 'recalculate');

      useRoundStore.getState().updateRoundData(makeRoundData({ round: 8001 }));

      expect(recalcSpy).toHaveBeenCalled();
    });
  });

  describe('recalculate', () => {
    it('early-returns emptyCalculations when roundData is the defaultRoundData sentinel', () => {
      useRoundStore.setState({ roundData: defaultRoundData, calculations: blankCalculations });

      useRoundStore.getState().recalculate();

      expect(useRoundStore.getState().calculations.calculated).toBe(false);
    });

    it('early-returns emptyCalculations when roundData.pirates is empty', () => {
      useRoundStore.setState({
        roundData: makeRoundData({ pirates: [] }),
        calculations: blankCalculations,
      });

      useRoundStore.getState().recalculate();

      expect(useRoundStore.getState().calculations.calculated).toBe(false);
    });

    it('produces real non-empty calculations for valid round data with real bets seeded', () => {
      useRoundStore.setState({
        roundData: makeRoundData(),
        currentSelectedRound: 8000,
        calculations: blankCalculations,
      });

      useRoundStore.getState().recalculate();

      const { calculations } = useRoundStore.getState();
      expect(calculations.calculated).toBe(true);
      expect(calculations.betOdds.size).toBeGreaterThan(0);
      expect(calculations.arenaRatios.length).toBeGreaterThan(0);
    });
  });

  describe('fetchRoundData', () => {
    it('sets error to a non-null string and isLoading to false on a non-ok response', async () => {
      useRoundStore.setState({ currentSelectedRound: 8000, isInitializing: false });
      mockFetch.mockImplementation(() => Promise.resolve({ ok: false, status: 404 }));

      await useRoundStore.getState().fetchRoundData(8000);

      const state = useRoundStore.getState();
      expect(state.error).toEqual(expect.any(String));
      expect(state.error).not.toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('updates roundData and recalculates on a successful response', async () => {
      useRoundStore.setState({ currentSelectedRound: 8000, isInitializing: false });
      const freshRoundData = makeRoundData({ round: 8000, timestamp: '2026-05-01T00:00:00Z' });
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(freshRoundData),
        }),
      );

      const shouldStop = await useRoundStore.getState().fetchRoundData(8000);

      const state = useRoundStore.getState();
      expect(shouldStop).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.roundData.timestamp).toBe('2026-05-01T00:00:00Z');
      expect(state.calculations.calculated).toBe(true);
    });
  });
});
