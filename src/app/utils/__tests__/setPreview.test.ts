import { describe, expect, it } from 'vitest';

import { summarizeSet } from '../setPreview';

const row = (
  value: number,
  probability: number,
): { value: number; probability: number; cumulative: number; tail: number } => ({
  value,
  probability,
  cumulative: 0,
  tail: 0,
});

const values = (
  binaries: number[],
  probs: number[],
  odds: number[],
  ers: number[],
): Parameters<typeof summarizeSet>[2] => ({
  betBinaries: new Map(binaries.map((b, i) => [i + 1, b])),
  betProbabilities: new Map(probs.map((p, i) => [i + 1, p])),
  betOdds: new Map(odds.map((o, i) => [i + 1, o])),
  betPayoffs: new Map(odds.map((o, i) => [i + 1, o * 100])),
  betExpectedRatios: new Map(ers.map((e, i) => [i + 1, e])),
});

describe('summarizeSet', () => {
  const bets = new Map([
    [1, [1, 0, 0, 0, 0]],
    [2, [2, 0, 0, 0, 0]],
    [3, [3, 0, 0, 0, 0]],
  ]);
  const amounts = new Map([
    [1, 100],
    [2, 100],
    [3, 100],
  ]);

  it('computes bust, partial, likely winner, highest outcome and ER', () => {
    const tables = {
      odds: [row(0, 0.4), row(2, 0.2), row(8, 0.1), row(3, 0.2), row(12, 0.1)].sort(
        (a, b) => a.value - b.value,
      ),
      winnings: [row(0, 0.4), row(5000, 0.1)],
    };
    const summary = summarizeSet(
      bets,
      amounts,
      values([1, 2, 4], [0.1, 0.3, 0.2], [5, 2, 3], [0.5, 0.6, 0.6]),
      tables,
    );
    expect(summary?.bustRate).toBeCloseTo(0.4);
    // values 2 (< 3 bets) is partial; 3, 8, 12 are not
    expect(summary?.partialRate).toBeCloseTo(0.2);
    expect(summary?.likelyWinner).toMatchObject({ betIndex: 2, units: 2, np: 200 });
    expect(summary?.highestOutcome).toEqual({ units: 12, probability: 0.1, np: 5000 });
    expect(summary?.er).toBeCloseTo(1.7);
  });

  it('reports zero bust when there is no zero row and null ER for duplicates', () => {
    const summary = summarizeSet(
      bets,
      amounts,
      values([1, 1, 4], [0.1, 0.1, 0.2], [5, 5, 3], [0.5, 0.5, 0.6]),
      { odds: [row(3, 1)], winnings: [row(300, 1)] },
    );
    expect(summary?.bustRate).toBe(0);
    expect(summary?.er).toBeNull();
  });

  it('returns null for an empty set', () => {
    expect(
      summarizeSet(new Map(), new Map(), values([], [], [], []), { odds: [], winnings: [] }),
    ).toBeNull();
  });
});
