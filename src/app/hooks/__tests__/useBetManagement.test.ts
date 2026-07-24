import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { makeRoundData } from '../../../test/utils';
import type { RoundData } from '../../../types';
import type { Bet, BetAmount } from '../../../types/bets';
import { BET_AMOUNT_DEFAULT, defaultRoundData } from '../../constants';
import { computePiratesBinary, computeBinaryToPirates } from '../../maths';
import { useBetStore } from '../../stores/betStore';
import { useRoundStore } from '../../stores/roundStore';
import { useBetManagement } from '../useBetManagement';

// Mock universal-cookie before any store imports (roundStore reads cookies at module init).
// `vi.hoisted` is required here (rather than a plain top-level `const`) because `vi.mock`
// factories are hoisted above all imports, and importing `roundStore`/`betStore` below
// synchronously triggers cookie reads at module init time.
const mockGetCookie = vi.hoisted(() => vi.fn());
vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: mockGetCookie,
      set: vi.fn(),
    };
  }),
}));

// Allow betStore's lazy dynamic import of roundStore to resolve.
async function waitForStoreInit(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50));
}

// A round whose odds produce exactly one "positive" arena (arena 0), used to exercise the
// generateBustproofSet() single-positive-arena branch (4 bets).
function makeSinglePositiveArenaRoundData(): RoundData {
  return makeRoundData({
    currentOdds: [
      [1, 6, 7, 8, 9],
      [1, 2, 2, 2, 2],
      [1, 2, 2, 2, 2],
      [1, 2, 2, 2, 2],
      [1, 2, 2, 2, 2],
    ],
    openingOdds: [
      [1, 6, 7, 8, 9],
      [1, 2, 2, 2, 2],
      [1, 2, 2, 2, 2],
      [1, 2, 2, 2, 2],
      [1, 2, 2, 2, 2],
    ],
  });
}

// Builds a full 10-slot Bet map, matching the app's normal bet-set size. Slots beyond the
// provided pirate arrays are filled with empty ([0,0,0,0,0]) selections.
function makeFullBets(pirateArrays: number[][] = []): Bet {
  const bets: Bet = new Map();
  for (let i = 0; i < 10; i++) {
    bets.set(i + 1, pirateArrays[i] ?? [0, 0, 0, 0, 0]);
  }
  return bets;
}

// Builds a full 10-slot BetAmount map. Slots beyond the provided amounts fall back to
// BET_AMOUNT_DEFAULT, matching the app's normal "unset" bet amount.
function makeFullAmounts(amounts: number[] = []): BetAmount {
  const result: BetAmount = new Map();
  for (let i = 0; i < 10; i++) {
    result.set(i + 1, amounts[i] ?? BET_AMOUNT_DEFAULT);
  }
  return result;
}

// Seeds useRoundStore + useBetStore directly (bypassing resetStores-style sentinel defaults),
// then triggers a real recalculate() so that `calculations` (arenaRatios, usedProbabilities,
// winningBetBinary, etc.) are populated from the given round/bet data.
function seedStores(
  roundData: RoundData,
  pirateArrays: number[][] = [],
  amounts: number[] = [],
): void {
  useRoundStore.setState({
    roundData,
    currentSelectedRound: roundData.round,
    currentRound: roundData.round,
    isInitializing: false,
  });
  useBetStore.setState({
    currentBet: 0,
    allBets: new Map([[0, makeFullBets(pirateArrays)]]),
    allBetAmounts: new Map([[0, makeFullAmounts(amounts)]]),
    allNames: new Map([[0, 'Test Set']]),
  });
  useRoundStore.getState().recalculate();
}

describe('useBetManagement', () => {
  beforeEach(async () => {
    await waitForStoreInit();

    mockGetCookie.mockReset();
    mockGetCookie.mockReturnValue(undefined);

    seedStores(makeRoundData());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('read-only derived values', () => {
    it('exposes currentBetIndex and currentSetName from the store', () => {
      const { result } = renderHook(() => useBetManagement());

      expect(result.current.currentBetIndex).toBe(0);
      expect(result.current.currentSetName).toBe('Test Set');
    });

    it('betCount reflects the number of bet slots in the current set', () => {
      const { result } = renderHook(() => useBetManagement());

      expect(result.current.betCount).toBe(10);
    });

    it('totalBetAmount sums only positive amounts in the current set', () => {
      seedStores(
        makeRoundData(),
        [
          [1, 0, 0, 0, 0],
          [2, 0, 0, 0, 0],
        ],
        [1000, 2000],
      );
      // remaining 8 slots default to BET_AMOUNT_DEFAULT (-1000), which must not count.

      const { result } = renderHook(() => useBetManagement());

      expect(result.current.totalBetAmount).toBe(3000);
    });

    it('hasBets is false when no bet slot has a selected pirate', () => {
      const { result } = renderHook(() => useBetManagement());

      expect(result.current.hasBets).toBe(false);
    });

    it('hasBets is true when at least one bet slot has a selected pirate', () => {
      seedStores(makeRoundData(), [[1, 0, 0, 0, 0]]);

      const { result } = renderHook(() => useBetManagement());

      expect(result.current.hasBets).toBe(true);
    });
  });

  describe('getBet / getBetAmount', () => {
    it('returns the seeded bet and amount for a valid index', () => {
      seedStores(makeRoundData(), [[1, 2, 3, 4, 1]], [5000]);

      const { result } = renderHook(() => useBetManagement());

      expect(result.current.getBet(1)).toEqual([1, 2, 3, 4, 1]);
      expect(result.current.getBetAmount(1)).toBe(5000);
    });

    it('returns an empty array / BET_AMOUNT_DEFAULT for an out-of-range index', () => {
      const { result } = renderHook(() => useBetManagement());

      expect(result.current.getBet(999)).toEqual([]);
      expect(result.current.getBetAmount(999)).toBe(BET_AMOUNT_DEFAULT);
    });
  });

  describe('isBetValid / isBetDuplicate / getDuplicateInfo', () => {
    it('flags two identical bets as duplicate/invalid, and a unique bet as valid', () => {
      seedStores(makeRoundData(), [
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [2, 2, 2, 2, 2],
      ]);

      const { result } = renderHook(() => useBetManagement());
      const duplicateBinary = computePiratesBinary([1, 1, 1, 1, 1]);
      const uniqueBinary = computePiratesBinary([2, 2, 2, 2, 2]);

      expect(result.current.isBetValid(1)).toBe(false);
      expect(result.current.isBetValid(2)).toBe(false);
      expect(result.current.isBetValid(3)).toBe(true);

      expect(result.current.isBetDuplicate(duplicateBinary)).toBe(true);
      expect(result.current.isBetDuplicate(uniqueBinary)).toBe(false);

      expect(result.current.getDuplicateInfo()).toContain(duplicateBinary);
    });
  });

  describe('setBetAmount', () => {
    it('updates only the targeted bet slot', () => {
      seedStores(
        makeRoundData(),
        [
          [1, 0, 0, 0, 0],
          [2, 0, 0, 0, 0],
        ],
        [100, 200],
      );

      const { result } = renderHook(() => useBetManagement());

      act(() => {
        result.current.setBetAmount(1, 4242);
      });

      const betState = useBetStore.getState();
      const currentAmounts = betState.allBetAmounts.get(betState.currentBet)!;
      expect(currentAmounts.get(1)).toBe(4242);
      expect(currentAmounts.get(2)).toBe(200);
      expect(result.current.getBetAmount(1)).toBe(4242);
    });
  });

  describe('setBetAmounts', () => {
    it('applies a flat value only to bet slots with a selected pirate (capped: false)', () => {
      seedStores(
        makeRoundData(),
        [
          [1, 2, 3, 4, 1],
          [2, 1, 4, 3, 2],
        ],
        [100, 100, 777],
      );

      const { result } = renderHook(() => useBetManagement());

      act(() => {
        result.current.setBetAmounts(500, false);
      });

      const betState = useBetStore.getState();
      const currentAmounts = betState.allBetAmounts.get(betState.currentBet)!;
      expect(currentAmounts.get(1)).toBe(500);
      expect(currentAmounts.get(2)).toBe(500);
      // slot 3 has no selected pirate, so it must be untouched.
      expect(currentAmounts.get(3)).toBe(777);
    });

    it('caps the amount at the computed bet cap when capped: true', () => {
      mockGetCookie.mockImplementation((key: string) => {
        if (key === 'baseMaxBet') {
          return 10000;
        }
        return undefined;
      });
      seedStores(makeRoundData(), [[2, 3, 4, 1, 2]], [100]);

      const { result } = renderHook(() => useBetManagement());

      const hugeValue = 999_999_999;
      act(() => {
        result.current.setBetAmounts(hugeValue, true);
      });

      const betState = useBetStore.getState();
      const currentAmounts = betState.allBetAmounts.get(betState.currentBet)!;
      const cappedAmount = currentAmounts.get(1)!;
      expect(cappedAmount).toBeGreaterThan(0);
      expect(cappedAmount).toBeLessThan(hugeValue);
    });
  });

  describe('swapBets', () => {
    it('swaps bets and amounts between two slots, leaving other slots untouched', () => {
      seedStores(
        makeRoundData(),
        [
          [1, 1, 1, 1, 1],
          [2, 2, 2, 2, 2],
          [3, 3, 3, 3, 3],
        ],
        [100, 200, 300],
      );

      const { result } = renderHook(() => useBetManagement());

      act(() => {
        result.current.swapBets(1, 2);
      });

      const betState = useBetStore.getState();
      const currentBets = betState.allBets.get(betState.currentBet)!;
      const currentAmounts = betState.allBetAmounts.get(betState.currentBet)!;

      expect(currentBets.get(1)).toEqual([2, 2, 2, 2, 2]);
      expect(currentBets.get(2)).toEqual([1, 1, 1, 1, 1]);
      expect(currentAmounts.get(1)).toBe(200);
      expect(currentAmounts.get(2)).toBe(100);

      // slot 3 must be untouched.
      expect(currentBets.get(3)).toEqual([3, 3, 3, 3, 3]);
      expect(currentAmounts.get(3)).toBe(300);
    });
  });

  describe('calculateBets', () => {
    it('returns non-empty bet caps/odds for a real cartesian pirate selection', () => {
      const { result } = renderHook(() => useBetManagement());

      const { betCaps, betOdds, pirateCombos } = result.current.calculateBets(
        [0, 1],
        [0, 1],
        [0, 1],
        [0, 1],
        [0, 1],
      );

      expect(betCaps.size).toBeGreaterThan(0);
      expect(betOdds.size).toBeGreaterThan(0);
      expect(pirateCombos.size).toBeGreaterThan(0);
    });

    it('returns all-empty maps when usedProbabilities is empty', () => {
      // Seeding with the literal defaultRoundData sentinel keeps `calculations` (and thus
      // usedProbabilities) empty, since recalculate() early-returns for it.
      seedStores(defaultRoundData);

      const { result } = renderHook(() => useBetManagement());

      const { betCaps, betOdds, pirateCombos } = result.current.calculateBets(
        [0, 1],
        [0, 1],
        [0, 1],
        [0, 1],
        [0, 1],
      );

      expect(betCaps.size).toBe(0);
      expect(betOdds.size).toBe(0);
      expect(pirateCombos.size).toBe(0);
    });
  });

  describe('newEmptySet / cloneSet / deleteSet', () => {
    it('newEmptySet adds a new, empty bet set and switches to it', () => {
      const { result } = renderHook(() => useBetManagement());

      const sizeBefore = useBetStore.getState().allBets.size;

      act(() => {
        result.current.newEmptySet();
      });

      const betState = useBetStore.getState();
      expect(betState.allBets.size).toBe(sizeBefore + 1);
      expect(betState.allNames.get(betState.currentBet)).toBe('New Set');
    });

    it('cloneSet adds a new set with the current bets/amounts and a "(Clone)" suffix', () => {
      seedStores(makeRoundData(), [[1, 2, 3, 4, 1]], [5000]);

      const { result } = renderHook(() => useBetManagement());
      const sizeBefore = useBetStore.getState().allBets.size;

      act(() => {
        result.current.cloneSet();
      });

      const betState = useBetStore.getState();
      expect(betState.allBets.size).toBe(sizeBefore + 1);
      expect(betState.allNames.get(betState.currentBet)).toBe('Test Set (Clone)');
      expect(betState.allBets.get(betState.currentBet)!.get(1)).toEqual([1, 2, 3, 4, 1]);
    });

    it('deleteSet removes the current bet set via the store action', () => {
      // Seed a second bet set so deleteBetSet is allowed to remove one (it refuses to go below 1).
      useBetStore.setState({
        currentBet: 0,
        allBets: new Map([
          [0, makeFullBets([[1, 0, 0, 0, 0]])],
          [1, makeFullBets([[2, 0, 0, 0, 0]])],
        ]),
        allBetAmounts: new Map([
          [0, makeFullAmounts()],
          [1, makeFullAmounts()],
        ]),
        allNames: new Map([
          [0, 'Set A'],
          [1, 'Set B'],
        ]),
      });

      const { result } = renderHook(() => useBetManagement());

      act(() => {
        result.current.deleteSet();
      });

      const betState = useBetStore.getState();
      expect(betState.allBets.has(0)).toBe(false);
      expect(betState.allBets.size).toBe(1);
    });
  });

  describe('generateMaxTERSet', () => {
    it('adds a "Max TER Set" with betCount valid, non-empty bets', () => {
      mockGetCookie.mockImplementation((key: string) => {
        if (key === 'baseMaxBet') {
          return 10000;
        }
        return undefined;
      });
      seedStores(makeRoundData());

      const { result } = renderHook(() => useBetManagement());
      const betCount = result.current.betCount;

      act(() => {
        result.current.generateMaxTERSet();
      });

      const betState = useBetStore.getState();
      const newName = betState.allNames.get(betState.currentBet)!;
      expect(newName).toContain('Max TER Set');

      const newBets = betState.allBets.get(betState.currentBet)!;
      expect(newBets.size).toBe(betCount);
      for (const bet of newBets.values()) {
        expect(bet).toHaveLength(5);
        expect(computePiratesBinary(bet)).toBeGreaterThan(0);
      }
    });
  });

  describe('generateBustproofSet', () => {
    // NOTE: only the single-positive-arena branch (positiveArenas === 1) is covered here.
    // The 2-positive-arena and 3+-positive-arena branches are left as a possible future
    // addition -- they follow the same shape but need more elaborate odds fixtures.
    it('produces 4 bets when exactly one arena is positive', () => {
      mockGetCookie.mockImplementation((key: string) => {
        if (key === 'baseMaxBet') {
          return 5000;
        }
        return undefined;
      });
      seedStores(makeSinglePositiveArenaRoundData());

      const { result } = renderHook(() => useBetManagement());

      act(() => {
        result.current.generateBustproofSet();
      });

      const betState = useBetStore.getState();
      const newName = betState.allNames.get(betState.currentBet)!;
      expect(newName).toContain('Bustproof Set');

      const newBets = betState.allBets.get(betState.currentBet)!;
      const nonEmptyBets = Array.from(newBets.values()).filter(bet => bet.some(p => p > 0));
      expect(nonEmptyBets).toHaveLength(4);

      // every non-empty bet should only involve arena 0 (the sole positive arena).
      for (const bet of nonEmptyBets) {
        expect(bet[0]).toBeGreaterThan(0);
        expect(bet.slice(1).every(p => p === 0)).toBe(true);
      }
    });
  });

  describe('generateWinningGambitSet', () => {
    it('builds a gambit set from the round winners', () => {
      seedStores(makeRoundData({ winners: [1, 2, 3, 4, 1] }));

      const { result } = renderHook(() => useBetManagement());
      const betCount = result.current.betCount;

      act(() => {
        result.current.generateWinningGambitSet();
      });

      const betState = useBetStore.getState();
      const newName = betState.allNames.get(betState.currentBet)!;
      expect(newName).toContain('Gambit');

      const newBets = betState.allBets.get(betState.currentBet)!;
      expect(newBets.size).toBe(betCount);
      for (const bet of newBets.values()) {
        expect(computePiratesBinary(bet)).toBeGreaterThan(0);
      }
    });
  });

  describe('generateGambitSet', () => {
    it('builds a gambit set from the best full pirate combo', () => {
      const { result } = renderHook(() => useBetManagement());
      const betCount = result.current.betCount;

      act(() => {
        result.current.generateGambitSet();
      });

      const betState = useBetStore.getState();
      const newName = betState.allNames.get(betState.currentBet)!;
      expect(newName).toContain('Gambit');

      const newBets = betState.allBets.get(betState.currentBet)!;
      expect(newBets.size).toBe(betCount);
      for (const bet of newBets.values()) {
        expect(computePiratesBinary(bet)).toBeGreaterThan(0);
      }
    });
  });

  describe('generateGambitWithPirates', () => {
    it('builds a custom gambit set from the provided pirates', () => {
      const { result } = renderHook(() => useBetManagement());
      const betCount = result.current.betCount;

      act(() => {
        result.current.generateGambitWithPirates([1, 2, 3, 4, 1]);
      });

      const betState = useBetStore.getState();
      const newName = betState.allNames.get(betState.currentBet)!;
      expect(newName).toContain('Gambit');

      const newBets = betState.allBets.get(betState.currentBet)!;
      expect(newBets.size).toBe(betCount);
      for (const bet of newBets.values()) {
        expect(computePiratesBinary(bet)).toBeGreaterThan(0);
      }
    });
  });

  describe('generateTenbetSet', () => {
    it('builds a "Custom Ten-bet Set" whose bets all satisfy the tenbet mask', () => {
      const { result } = renderHook(() => useBetManagement());
      const betCount = result.current.betCount;
      const tenbetIndices = [1, 0, 0, 0, 0];
      const tenbetBinary = computePiratesBinary(tenbetIndices);

      act(() => {
        result.current.generateTenbetSet(tenbetIndices);
      });

      const betState = useBetStore.getState();
      const newName = betState.allNames.get(betState.currentBet)!;
      expect(newName).toContain('Ten-bet');

      const newBets = betState.allBets.get(betState.currentBet)!;
      expect(newBets.size).toBe(betCount);
      for (const bet of newBets.values()) {
        const betBinary = computePiratesBinary(bet);
        expect((betBinary & tenbetBinary) === tenbetBinary).toBe(true);
      }
    });
  });

  describe('generateRandomCrazySet', () => {
    let originalMathRandom: () => number;

    beforeEach(() => {
      originalMathRandom = Math.random;
      Math.random = vi.fn(() => 0.5);
    });

    afterEach(() => {
      Math.random = originalMathRandom;
    });

    it('adds a "Crazy Set" with betCount unique, valid bets', () => {
      const { result } = renderHook(() => useBetManagement());
      const betCount = result.current.betCount;

      act(() => {
        result.current.generateRandomCrazySet();
      });

      const betState = useBetStore.getState();
      const newName = betState.allNames.get(betState.currentBet)!;
      expect(newName).toContain('Crazy Set');

      const newBets = betState.allBets.get(betState.currentBet)!;
      expect(newBets.size).toBe(betCount);

      const binaries = Array.from(newBets.values()).map(bet => computePiratesBinary(bet));
      expect(binaries.every(bin => bin > 0)).toBe(true);
      expect(new Set(binaries).size).toBe(binaries.length);
    });
  });

  describe('anyBetsExist', () => {
    it('is exposed as a callable re-export of the util function', () => {
      const { result } = renderHook(() => useBetManagement());

      // The hook's declared return type re-exports util's `anyBetsExist` as a 0-arg function
      // (see useBetManagement.ts's return type), so it is only sanity-checked here for shape;
      // the underlying util function itself (with its optional `Bet` argument) is already
      // covered directly in src/app/__tests__/util.test.ts.
      expect(typeof result.current.anyBetsExist).toBe('function');
      expect(result.current.anyBetsExist()).toBe(false);
    });
  });

  // Sanity check that computeBinaryToPirates round-trips through the bet-generation helpers
  // used throughout this file (used indirectly via computePiratesBinary above).
  describe('computeBinaryToPirates sanity', () => {
    it('round-trips with computePiratesBinary', () => {
      const pirates = [1, 2, 3, 4, 1];
      expect(computeBinaryToPirates(computePiratesBinary(pirates))).toEqual(pirates);
    });
  });
});
