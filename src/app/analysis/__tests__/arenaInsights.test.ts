import { describe, expect, it } from 'vitest';

import type { BacktestRound } from '../../backtest/types';
import {
  computeArenaPositionWinRates,
  positiveArenaCount,
  positiveArenaDistribution,
} from '../arenaInsights';

/** Builds a minimal backtest round - every arena gets `[1, ...pirateOdds]` rows. */
function makeRound(overrides: Partial<BacktestRound> = {}): BacktestRound {
  return {
    round: 1,
    pirates: [
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [1, 2, 3, 4],
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
    winners: [1, 1, 1, 1, 1],
    ...overrides,
  };
}

describe('positiveArenaCount', () => {
  it('counts an arena as positive when sum(1/odds) over the four pirates is under 1', () => {
    // [2,3,4,5] -> 0.5+0.333+0.25+0.2 = 1.283 (not positive)
    // [4,5,6,7] -> 0.25+0.2+0.166+0.143 = 0.759 (positive)
    const round = makeRound({
      currentOdds: [
        [1, 4, 5, 6, 7], // positive
        [1, 2, 3, 4, 5], // not
        [1, 4, 5, 6, 7], // positive
        [1, 2, 3, 4, 5], // not
        [1, 4, 5, 6, 7], // positive
      ],
    });
    expect(positiveArenaCount(round)).toBe(3);
  });

  it('ignores the clear-bet odds at index 0', () => {
    const round = makeRound({
      currentOdds: [
        [1, 4, 5, 6, 7], // positive regardless of the leading 1
        [1, 4, 5, 6, 7],
        [1, 4, 5, 6, 7],
        [1, 4, 5, 6, 7],
        [1, 4, 5, 6, 7],
      ],
    });
    expect(positiveArenaCount(round)).toBe(5);
  });

  it('treats an implied total of exactly 1 as not positive', () => {
    // [2,4,6,12] -> 0.5+0.25+0.1667+0.0833 = 1.0 exactly
    const row = [1, 2, 4, 6, 12];
    const round = makeRound({ currentOdds: [row, row, row, row, row] });
    expect(positiveArenaCount(round)).toBe(0);
  });

  it('skips short/malformed odds rows instead of counting them as positive', () => {
    const round = makeRound({
      currentOdds: [[1, 2], [], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]],
    });
    expect(positiveArenaCount(round)).toBe(0);
  });
});

describe('positiveArenaDistribution', () => {
  it('buckets rounds by positive-arena count and reports the total', () => {
    const positiveRow = [1, 4, 5, 6, 7];
    const negativeRow = [1, 2, 3, 4, 5];
    const rounds: BacktestRound[] = [
      makeRound({ currentOdds: [positiveRow, positiveRow, negativeRow, negativeRow, negativeRow] }),
      makeRound({ currentOdds: [positiveRow, positiveRow, positiveRow, negativeRow, negativeRow] }),
      makeRound({ currentOdds: [positiveRow, positiveRow, positiveRow, positiveRow, negativeRow] }),
    ];

    const { buckets, totalRounds } = positiveArenaDistribution(rounds);
    expect(totalRounds).toBe(3);
    expect(buckets[2]).toBe(1);
    expect(buckets[3]).toBe(1);
    expect(buckets[4]).toBe(1);
    expect(buckets.reduce((sum, count) => sum + count, 0)).toBe(totalRounds);
  });

  it('returns zeroed buckets for an empty feed', () => {
    const { buckets, totalRounds } = positiveArenaDistribution([]);
    expect(totalRounds).toBe(0);
    expect(buckets).toHaveLength(6);
    expect(buckets.every(count => count === 0)).toBe(true);
  });
});

describe('computeArenaPositionWinRates', () => {
  it('counts wins per arena by 1-indexed position', () => {
    const rounds: BacktestRound[] = [
      makeRound({ winners: [1, 2, 3, 4, 1] }),
      makeRound({ winners: [1, 2, 3, 4, 2] }),
      makeRound({ winners: [4, 4, 4, 4, 3] }),
    ];

    const { arenas, overall } = computeArenaPositionWinRates(rounds);

    expect(arenas).toHaveLength(5);
    expect(arenas[0]!.arenaName).toBe('Shipwreck');
    expect(arenas[0]!.positionCounts).toEqual([2, 0, 0, 1]);
    expect(arenas[0]!.totalRounds).toBe(3);

    expect(arenas[1]!.positionCounts).toEqual([0, 2, 0, 1]);
    expect(arenas[4]!.positionCounts).toEqual([1, 1, 1, 0]);

    expect(overall.arenaName).toBe('Overall');
    expect(overall.totalRounds).toBe(15);
    expect(overall.positionCounts.reduce((sum, count) => sum + count, 0)).toBe(15);
  });

  it('treats a missing/invalid winner position as contributing no win', () => {
    const rounds: BacktestRound[] = [makeRound({ winners: [0, 1, 1, 1, 1] })];
    const { arenas } = computeArenaPositionWinRates(rounds);
    expect(arenas[0]!.positionCounts).toEqual([0, 0, 0, 0]);
    expect(arenas[0]!.totalRounds).toBe(1);
  });

  it('returns zeroed results for an empty feed', () => {
    const { arenas, overall } = computeArenaPositionWinRates([]);
    expect(arenas.every(a => a.totalRounds === 0)).toBe(true);
    expect(overall.totalRounds).toBe(0);
  });
});
