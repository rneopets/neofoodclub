import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Bet, BetAmount } from '../../../types/bets';
import { BET_AMOUNT_DEFAULT, BET_AMOUNT_MIN } from '../../constants';
import { useBetStore } from '../betStore';

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

describe('betStore', () => {
  beforeEach(async () => {
    // Wait for the betStore's dynamic import of roundStore to resolve
    await waitForStoreInit();

    mockFetch.mockImplementation(() => Promise.resolve({ ok: false, status: 404 }));

    useBetStore.setState({
      currentBet: 0,
      allNames: new Map([[0, 'Starting Set']]),
      allBets: new Map([[0, makeBets()]]),
      allBetAmounts: new Map([[0, makeAmounts()]]),
    });
  });

  describe('setCurrentBet', () => {
    it('updates currentBet', () => {
      useBetStore.getState().setCurrentBet(3);
      expect(useBetStore.getState().currentBet).toBe(3);
    });
  });

  describe('addNewSet', () => {
    it('adds a new index when replace is false', () => {
      const bets = makeBets([[1, 0, 0, 0, 0]]);
      const amounts = makeAmounts([1000]);

      useBetStore.getState().addNewSet('New Set', bets, amounts, false);

      const state = useBetStore.getState();
      expect(state.allBets.size).toBe(2);
      expect(state.currentBet).toBe(1);
      expect(state.allNames.get(1)).toBe('New Set');
      expect(state.allBets.get(1)).toBe(bets);
      expect(state.allBetAmounts.get(1)).toBe(amounts);
      // original set untouched
      expect(state.allBets.has(0)).toBe(true);
    });

    it('adds a new index when replace is true but the current set has real bets', () => {
      useBetStore.setState({
        allBets: new Map([[0, makeBets([[1, 0, 0, 0, 0]])]]),
        allBetAmounts: new Map([[0, makeAmounts()]]),
        allNames: new Map([[0, 'Starting Set']]),
        currentBet: 0,
      });

      const bets = makeBets([[2, 0, 0, 0, 0]]);
      const amounts = makeAmounts();

      useBetStore.getState().addNewSet('Replacement', bets, amounts, true);

      const state = useBetStore.getState();
      expect(state.allBets.size).toBe(2);
      expect(state.currentBet).toBe(1);
      expect(state.allNames.get(1)).toBe('Replacement');
    });

    it('replaces the current index in-place when replace is true and current set is empty', () => {
      // starting set has no real bets (all zeros)
      const bets = makeBets([[3, 0, 0, 0, 0]]);
      const amounts = makeAmounts([2000]);

      useBetStore.getState().addNewSet('Replaced', bets, amounts, true);

      const state = useBetStore.getState();
      expect(state.allBets.size).toBe(1);
      expect(state.currentBet).toBe(0);
      expect(state.allNames.get(0)).toBe('Replaced');
      expect(state.allBets.get(0)).toBe(bets);
      expect(state.allBetAmounts.get(0)).toBe(amounts);
    });

    it('trims the provided name', () => {
      useBetStore.getState().addNewSet('  spaced name  ', makeBets(), makeAmounts(), false);
      expect(useBetStore.getState().allNames.get(1)).toBe('spaced name');
    });
  });

  describe('updateBetName', () => {
    it('updates an existing index name, trimmed', () => {
      useBetStore.getState().updateBetName(0, '  Renamed  ');
      expect(useBetStore.getState().allNames.get(0)).toBe('Renamed');
    });

    it('no-ops silently for a nonexistent index', () => {
      const before = useBetStore.getState().allNames;
      useBetStore.getState().updateBetName(99, 'Nope');
      expect(useBetStore.getState().allNames).toBe(before);
      expect(useBetStore.getState().allNames.has(99)).toBe(false);
    });
  });

  describe('deleteBetSet', () => {
    beforeEach(() => {
      useBetStore.setState({
        currentBet: 1,
        allNames: new Map([
          [0, 'Set 0'],
          [1, 'Set 1'],
          [2, 'Set 2'],
        ]),
        allBets: new Map([
          [0, makeBets()],
          [1, makeBets()],
          [2, makeBets()],
        ]),
        allBetAmounts: new Map([
          [0, makeAmounts()],
          [1, makeAmounts()],
          [2, makeAmounts()],
        ]),
      });
    });

    it('removes a set when more than 1 exists', () => {
      useBetStore.getState().deleteBetSet(2);
      const state = useBetStore.getState();
      expect(state.allBets.has(2)).toBe(false);
      expect(state.allBets.size).toBe(2);
    });

    it('refuses to delete when only 1 set remains', () => {
      useBetStore.setState({
        currentBet: 0,
        allNames: new Map([[0, 'Only Set']]),
        allBets: new Map([[0, makeBets()]]),
        allBetAmounts: new Map([[0, makeAmounts()]]),
      });
      const before = useBetStore.getState();
      useBetStore.getState().deleteBetSet(0);
      const after = useBetStore.getState();
      expect(after).toBe(before);
      expect(after.allBets.size).toBe(1);
    });

    it('refuses for a nonexistent index', () => {
      const before = useBetStore.getState();
      useBetStore.getState().deleteBetSet(99);
      expect(useBetStore.getState()).toBe(before);
    });

    it('moves currentBet to the previous key when deleting the current index', () => {
      // currentBet = 1, deleting 1, prevKey should be 0
      useBetStore.getState().deleteBetSet(1);
      expect(useBetStore.getState().currentBet).toBe(0);
    });

    it('moves currentBet to the next key when deleting the current index and no previous key exists', () => {
      useBetStore.setState({ currentBet: 0 });
      // deleting 0, no prevKey, nextKey should be 1
      useBetStore.getState().deleteBetSet(0);
      expect(useBetStore.getState().currentBet).toBe(1);
    });

    it('moves currentBet to the first remaining key when neither prev nor next exist for that index', () => {
      // Only keys 0 and 2 remain scenario: delete middle key 1 while current is 1 covered above.
      // Here test deleting the last remaining current index with no next/prev by using a fresh 2-set fixture
      useBetStore.setState({
        currentBet: 5,
        allNames: new Map([
          [5, 'Only current'],
          [7, 'Other'],
        ]),
        allBets: new Map([
          [5, makeBets()],
          [7, makeBets()],
        ]),
        allBetAmounts: new Map([
          [5, makeAmounts()],
          [7, makeAmounts()],
        ]),
      });
      useBetStore.getState().deleteBetSet(5);
      expect(useBetStore.getState().currentBet).toBe(7);
    });
  });

  describe('swapBets', () => {
    it('swaps bet lines and amounts at the computed indices, leaving others untouched', () => {
      const bets = makeBets([
        [1, 0, 0, 0, 0],
        [2, 0, 0, 0, 0],
        [3, 0, 0, 0, 0],
      ]);
      const amounts = makeAmounts([100, 200, 300]);
      useBetStore.setState({
        currentBet: 0,
        allBets: new Map([[0, bets]]),
        allBetAmounts: new Map([[0, amounts]]),
      });

      // UI indices 0 and 1 correspond to betIndex 1 and 2
      useBetStore.getState().swapBets(0, 1);

      const state = useBetStore.getState();
      const newBets = state.allBets.get(0)!;
      const newAmounts = state.allBetAmounts.get(0)!;
      expect(newBets.get(1)).toEqual([2, 0, 0, 0, 0]);
      expect(newBets.get(2)).toEqual([1, 0, 0, 0, 0]);
      expect(newAmounts.get(1)).toBe(200);
      expect(newAmounts.get(2)).toBe(100);
      // untouched
      expect(newBets.get(3)).toEqual([3, 0, 0, 0, 0]);
      expect(newAmounts.get(3)).toBe(300);
    });

    it('no-ops if the current set does not exist', () => {
      useBetStore.setState({
        currentBet: 99,
        allBets: new Map([[0, makeBets()]]),
        allBetAmounts: new Map([[0, makeAmounts()]]),
      });
      const before = useBetStore.getState();
      useBetStore.getState().swapBets(0, 1);
      expect(useBetStore.getState()).toBe(before);
    });
  });

  describe('updatePirate', () => {
    it('sets a single arena slot in a single bet line', () => {
      useBetStore.getState().updatePirate(1, 2, 4);
      const state = useBetStore.getState();
      expect(state.allBets.get(0)!.get(1)).toEqual([0, 0, 4, 0, 0]);
    });

    it('no-ops (returns unchanged state) when the value is already the same', () => {
      useBetStore.getState().updatePirate(1, 2, 4);
      const before = useBetStore.getState();
      useBetStore.getState().updatePirate(1, 2, 4);
      expect(useBetStore.getState()).toBe(before);
    });
  });

  describe('swapPiratesForAllBets', () => {
    beforeEach(() => {
      useBetStore.setState({
        currentBet: 0,
        allBets: new Map([
          [
            0,
            makeBets([
              [1, 0, 0, 0, 0],
              [2, 0, 0, 0, 0],
              [3, 0, 0, 0, 0],
            ]),
          ],
        ]),
        allBetAmounts: new Map([[0, makeAmounts()]]),
      });
    });

    it('swaps a specific pirate index for another across all bet lines in the given arena', () => {
      useBetStore.getState().swapPiratesForAllBets(0, 1, 2);
      const state = useBetStore.getState();
      const bets = state.allBets.get(0)!;
      expect(bets.get(1)).toEqual([2, 0, 0, 0, 0]);
      expect(bets.get(2)).toEqual([1, 0, 0, 0, 0]);
      // bet line 3 (value 3) doesn't contain pirateIndexA/B, untouched
      expect(bets.get(3)).toEqual([3, 0, 0, 0, 0]);
    });

    it('no-ops for arenaIndex outside 0-4', () => {
      const before = useBetStore.getState();
      useBetStore.getState().swapPiratesForAllBets(5, 1, 2);
      expect(useBetStore.getState()).toBe(before);

      useBetStore.getState().swapPiratesForAllBets(-1, 1, 2);
      expect(useBetStore.getState()).toBe(before);
    });

    it('no-ops when pirateIndexA === pirateIndexB', () => {
      const before = useBetStore.getState();
      useBetStore.getState().swapPiratesForAllBets(0, 1, 1);
      expect(useBetStore.getState()).toBe(before);
    });

    it('leaves bet lines untouched that do not contain either pirate index in that arena', () => {
      const before = useBetStore.getState().allBets.get(0)!.get(3);
      useBetStore.getState().swapPiratesForAllBets(0, 1, 2);
      const after = useBetStore.getState().allBets.get(0)!.get(3);
      expect(after).toEqual(before);
    });
  });

  describe('updateBetAmount', () => {
    it('updates one amount', () => {
      useBetStore.getState().updateBetAmount(1, 5000);
      expect(useBetStore.getState().allBetAmounts.get(0)!.get(1)).toBe(5000);
    });

    it('no-ops if the value is unchanged', () => {
      useBetStore.getState().updateBetAmount(1, 5000);
      const before = useBetStore.getState();
      useBetStore.getState().updateBetAmount(1, 5000);
      expect(useBetStore.getState()).toBe(before);
    });
  });

  describe('updateBetAmounts', () => {
    it('batch updates amounts', () => {
      useBetStore.getState().updateBetAmounts([
        { betIndex: 1, amount: 1000 },
        { betIndex: 2, amount: 2000 },
      ]);
      const amounts = useBetStore.getState().allBetAmounts.get(0)!;
      expect(amounts.get(1)).toBe(1000);
      expect(amounts.get(2)).toBe(2000);
    });

    it('coerces amounts below BET_AMOUNT_MIN to BET_AMOUNT_DEFAULT', () => {
      useBetStore.getState().updateBetAmounts([{ betIndex: 1, amount: BET_AMOUNT_MIN - 1 }]);
      const amounts = useBetStore.getState().allBetAmounts.get(0)!;
      expect(amounts.get(1)).toBe(BET_AMOUNT_DEFAULT);
    });

    it('no-ops entirely if nothing actually changed', () => {
      const before = useBetStore.getState();
      useBetStore.getState().updateBetAmounts([{ betIndex: 1, amount: BET_AMOUNT_DEFAULT }]);
      expect(useBetStore.getState()).toBe(before);
    });
  });

  describe('setAllBets / setAllBetAmounts', () => {
    it('setAllBets directly replaces the allBets map', () => {
      const newBets = new Map([[0, makeBets([[1, 0, 0, 0, 0]])]]);
      useBetStore.getState().setAllBets(newBets);
      expect(useBetStore.getState().allBets).toBe(newBets);
    });

    it('setAllBetAmounts directly replaces the allBetAmounts map', () => {
      const newAmounts = new Map([[0, makeAmounts([1234])]]);
      useBetStore.getState().setAllBetAmounts(newAmounts);
      expect(useBetStore.getState().allBetAmounts).toBe(newAmounts);
    });
  });

  describe('clearAllBets', () => {
    it('resets only the current set bets/amounts to empty maps, other sets untouched', () => {
      useBetStore.setState({
        currentBet: 0,
        allBets: new Map([
          [0, makeBets([[1, 0, 0, 0, 0]])],
          [1, makeBets([[2, 0, 0, 0, 0]])],
        ]),
        allBetAmounts: new Map([
          [0, makeAmounts([1000])],
          [1, makeAmounts([2000])],
        ]),
      });

      useBetStore.getState().clearAllBets();

      const state = useBetStore.getState();
      const clearedBets = state.allBets.get(0)!;
      const clearedAmounts = state.allBetAmounts.get(0)!;
      expect(clearedBets.size).toBe(10);
      expect(Array.from(clearedBets.values()).every(line => line.every(v => v === 0))).toBe(true);
      expect(clearedAmounts.size).toBe(10);
      expect(
        Array.from(clearedAmounts.values()).every(amount => amount === BET_AMOUNT_DEFAULT),
      ).toBe(true);

      // other set untouched
      expect(state.allBets.get(1)!.get(1)).toEqual([2, 0, 0, 0, 0]);
      expect(state.allBetAmounts.get(1)!.get(1)).toBe(2000);
    });
  });
});
