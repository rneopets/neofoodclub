import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchPreviousRounds, isStale, loadCache, saveCache } from '../previousRoundsCache';
import type { CachedPreviousRounds } from '../types';

/** In-memory localStorage stand-in, since jsdom's real implementation is
 * unreliable across Node versions/environments in this test setup. */
function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store.clear();
    },
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    get length(): number {
      return store.size;
    },
  };
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: createMockLocalStorage(),
    writable: true,
    configurable: true,
  });
  vi.restoreAllMocks();
});

describe('loadCache / saveCache', () => {
  it('returns null when nothing is cached', () => {
    expect(loadCache()).toBeNull();
  });

  it('round-trips a saved cache', () => {
    const data: CachedPreviousRounds = {
      version: 1,
      newestRound: 5000,
      fetchedAt: Date.now(),
      rounds: [],
    };
    saveCache(data);
    expect(loadCache()).toEqual(data);
  });

  it('returns null for a version mismatch', () => {
    window.localStorage.setItem(
      'nfc.previousRoundsCache.v1',
      JSON.stringify({ version: 999, newestRound: 1, fetchedAt: 1, rounds: [] }),
    );
    expect(loadCache()).toBeNull();
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    window.localStorage.setItem('nfc.previousRoundsCache.v1', '{not json');
    expect(loadCache()).toBeNull();
  });

  it('does not throw when localStorage.setItem fails', () => {
    const brokenStorage = createMockLocalStorage();
    vi.spyOn(brokenStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    Object.defineProperty(window, 'localStorage', {
      value: brokenStorage,
      writable: true,
      configurable: true,
    });

    expect(() =>
      saveCache({ version: 1, newestRound: 1, fetchedAt: Date.now(), rounds: [] }),
    ).not.toThrow();
  });
});

describe('isStale', () => {
  it('is stale when there is no cache', () => {
    expect(isStale(null, 100)).toBe(true);
  });

  it('is not stale when the cache is at most one round behind the live round', () => {
    const cache: CachedPreviousRounds = {
      version: 1,
      newestRound: 99,
      fetchedAt: Date.now(),
      rounds: [],
    };
    expect(isStale(cache, 100)).toBe(false);
  });

  it('is stale when the cache is more than one round behind the live round', () => {
    const cache: CachedPreviousRounds = {
      version: 1,
      newestRound: 90,
      fetchedAt: Date.now(),
      rounds: [],
    };
    expect(isStale(cache, 100)).toBe(true);
  });

  it('falls back to a 24h time check when the live round is unavailable', () => {
    const recentCache: CachedPreviousRounds = {
      version: 1,
      newestRound: 90,
      fetchedAt: Date.now() - 1000,
      rounds: [],
    };
    const oldCache: CachedPreviousRounds = {
      version: 1,
      newestRound: 90,
      fetchedAt: Date.now() - 25 * 60 * 60 * 1000,
      rounds: [],
    };
    expect(isStale(recentCache, 0)).toBe(false);
    expect(isStale(oldCache, 0)).toBe(true);
  });
});

describe('fetchPreviousRounds', () => {
  it('filters out rounds with missing or incomplete winners', async () => {
    const lines = [
      JSON.stringify({
        round: 1,
        pirates: [[1]],
        currentOdds: [[1, 2]],
        openingOdds: [[1, 2]],
        winners: [1, 1, 1, 1, 1],
      }),
      JSON.stringify({
        round: 2,
        pirates: [[1]],
        currentOdds: [[1, 2]],
        openingOdds: [[1, 2]],
        winners: null,
      }),
      JSON.stringify({
        round: 3,
        pirates: [[1]],
        currentOdds: [[1, 2]],
        openingOdds: [[1, 2]],
        winners: [1, 0, 1, 1, 1],
      }),
      JSON.stringify({
        round: 4,
        pirates: [[1]],
        currentOdds: [[1, 2]],
        openingOdds: [[1, 2]],
        winners: [2, 2, 2, 2, 2],
      }),
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        text: () => Promise.resolve(lines.join('\n')),
      }),
    );

    const { rounds, newestRound } = await fetchPreviousRounds();

    expect(rounds.map(r => r.round)).toEqual([1, 4]);
    expect(newestRound).toBe(4);

    vi.unstubAllGlobals();
  });

  it('returns newestRound 0 when there are no valid rounds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        text: () => Promise.resolve(''),
      }),
    );

    const { rounds, newestRound } = await fetchPreviousRounds();

    expect(rounds).toEqual([]);
    expect(newestRound).toBe(0);

    vi.unstubAllGlobals();
  });
});
