import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock universal-cookie before any store imports
vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import { useRoundStore } from '../stores/roundStore';
import { useBetStore } from '../stores/betStore';
import { makeBetURL, parseBetUrl } from '../util';
import type { Bet, BetAmount } from '../../types/bets';

function makeBetsForHash(pirates: number[][]): Bet {
  const bets: Bet = new Map();
  for (let i = 0; i < pirates.length; i++) {
    bets.set(i + 1, pirates[i] ?? [0, 0, 0, 0, 0]);
  }
  for (let i = pirates.length; i < 10; i++) {
    bets.set(i + 1, [0, 0, 0, 0, 0]);
  }
  return bets;
}

function makeAmountsForHash(amounts: number[]): BetAmount {
  const result: BetAmount = new Map();
  for (let i = 0; i < amounts.length; i++) {
    result.set(i + 1, amounts[i] ?? -1000);
  }
  for (let i = amounts.length; i < 10; i++) {
    result.set(i + 1, -1000);
  }
  return result;
}

function setHashAndDispatch(hash: string): void {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, hash: `#${hash}` },
  });
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// Allow the betStore's lazy dynamic import of roundStore to resolve
async function waitForStoreInit(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50));
}

describe('hashchange listener', () => {
  let cleanup: (() => void) | undefined;

  beforeEach(async () => {
    // Wait for the betStore's dynamic import of roundStore to resolve
    await waitForStoreInit();

    // Reset stores to a known state
    useRoundStore.setState({
      currentSelectedRound: 8000,
      currentRound: 8000,
      isInitializing: false,
    });
    useBetStore.setState({
      currentBet: 0,
      allBets: new Map([[0, makeBetsForHash([])]]),
      allBetAmounts: new Map([[0, makeAmountsForHash([])]]),
      allNames: new Map([[0, 'Test Set']]),
    });

    // Mock fetch to return valid responses so initialize() completes
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('current_round.txt')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('8000'),
        });
      }
      if (url.includes('/rounds/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
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
                [1, 2, 3, 4],
                [5, 6, 7, 8],
                [9, 10, 11, 12],
                [13, 14, 15, 16],
                [17, 18, 19, 20],
              ],
              winners: [],
            }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    // Set initial hash
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, hash: '#round=8000' },
    });

    // Run initialize to register the hashchange listener
    await useRoundStore.getState().initialize();

    cleanup = (
      window as unknown as Window & { __roundDataCleanup?: () => void }
    ).__roundDataCleanup;
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it('updates currentSelectedRound when hash round changes', () => {
    setHashAndDispatch('round=9000');

    expect(useRoundStore.getState().currentSelectedRound).toBe(9000);
  });

  it('does not update round when hash round is the same', () => {
    const spy = vi.spyOn(useRoundStore.getState(), 'updateSelectedRound');

    setHashAndDispatch('round=8000');

    expect(spy).not.toHaveBeenCalled();
    expect(useRoundStore.getState().currentSelectedRound).toBe(8000);

    spy.mockRestore();
  });

  it('updates bets when hash bets change', () => {
    const newBets = makeBetsForHash([
      [1, 2, 0, 0, 0],
      [0, 0, 3, 0, 0],
    ]);
    const newUrl = makeBetURL(8000, newBets);
    const hash = newUrl.slice(2);

    setHashAndDispatch(hash);

    const betState = useBetStore.getState();
    const currentBets = betState.allBets.get(betState.currentBet)!;
    expect(currentBets.get(1)).toEqual([1, 2, 0, 0, 0]);
    expect(currentBets.get(2)).toEqual([0, 0, 3, 0, 0]);
  });

  it('updates bet amounts when hash amounts change', () => {
    const newBets = makeBetsForHash([[1, 0, 0, 0, 0]]);
    const newAmounts = makeAmountsForHash([5000]);
    const newUrl = makeBetURL(8000, newBets, newAmounts, true);
    const hash = newUrl.slice(2);

    setHashAndDispatch(hash);

    const betState = useBetStore.getState();
    const currentAmounts = betState.allBetAmounts.get(betState.currentBet)!;
    expect(currentAmounts.get(1)).toBe(5000);
  });

  it('updates both round and bets in a single hash change', () => {
    const newBets = makeBetsForHash([[0, 3, 0, 1, 0]]);
    const newUrl = makeBetURL(9500, newBets);
    const hash = newUrl.slice(2);

    setHashAndDispatch(hash);

    expect(useRoundStore.getState().currentSelectedRound).toBe(9500);

    const betState = useBetStore.getState();
    const currentBets = betState.allBets.get(betState.currentBet)!;
    expect(currentBets.get(1)).toEqual([0, 3, 0, 1, 0]);
  });

  it('does nothing when hash is empty', () => {
    const roundBefore = useRoundStore.getState().currentSelectedRound;
    const betsBefore = new Map(useBetStore.getState().allBets);

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, hash: '' },
    });
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(useRoundStore.getState().currentSelectedRound).toBe(roundBefore);
    // Bets map reference may differ but content should be the same
    const betsAfter = useBetStore.getState().allBets;
    expect(betsAfter.get(0)?.get(1)).toEqual(betsBefore.get(0)?.get(1));
  });

  it('round-trips through makeBetURL and parseBetUrl consistently', () => {
    const bets = makeBetsForHash([
      [1, 2, 3, 4, 1],
      [2, 0, 0, 0, 3],
    ]);
    const amounts = makeAmountsForHash([10000, 5000]);
    const url = makeBetURL(8500, bets, amounts, true);
    const parsed = parseBetUrl(url.slice(2));

    expect(parsed.round).toBe(8500);
    expect(parsed.bets.get(1)).toEqual([1, 2, 3, 4, 1]);
    expect(parsed.bets.get(2)).toEqual([2, 0, 0, 0, 3]);
    expect(parsed.betAmounts.get(1)).toBe(10000);
    expect(parsed.betAmounts.get(2)).toBe(5000);
  });

  it('cleans up hashchange listener on cleanup', () => {
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

    cleanup?.();
    cleanup = undefined;

    expect(removeListenerSpy).toHaveBeenCalledWith('hashchange', expect.any(Function));
    removeListenerSpy.mockRestore();
  });
});
