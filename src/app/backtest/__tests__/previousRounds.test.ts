import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearPreviousRoundsFeedCache } from '../../data/previousRoundsFeed';
import { fetchPreviousRounds } from '../previousRounds';

afterEach(() => {
  vi.unstubAllGlobals();
  clearPreviousRoundsFeedCache();
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
        foods: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
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
    expect(rounds[0]!.foods).toEqual([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]);
    expect(rounds[1]!.foods).toBeUndefined();
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
  });
});
