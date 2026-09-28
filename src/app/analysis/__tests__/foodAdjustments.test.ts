import { describe, expect, it } from 'vitest';

import { computeFoodAdjustmentHistory, type FoodAdjustmentRound } from '../foodAdjustments';

// Foods 1, 4, 14 give pirate 1 a food adjustment of 2+1-1=2 and pirate 2 a
// food adjustment of 1+1-0=2 (values taken straight from POSITIVE_FAS /
// NEGATIVE_FAS in ../../constants).
const rounds: FoodAdjustmentRound[] = [
  {
    round: 100,
    pirates: [[1, 2]],
    winners: [1], // pirate 1 wins this round's only arena
    foods: [[1, 4, 14]],
  },
  {
    round: 99,
    pirates: [[1, 2]],
    winners: [2], // pirate 2 wins; no food data recorded for this round
  },
];

describe('computeFoodAdjustmentHistory', () => {
  it('always includes all 20 known pirates as columns', () => {
    const { pirates } = computeFoodAdjustmentHistory(rounds);
    expect(pirates).toHaveLength(20);
  });

  it('computes win% and average FA per pirate', () => {
    const { pirates } = computeFoodAdjustmentHistory(rounds);
    const p1 = pirates.find(p => p.pirateId === 1);
    const p2 = pirates.find(p => p.pirateId === 2);

    expect(p1?.winPercent).toBeCloseTo(0.5, 6); // won round 100 of 2 rounds
    expect(p1?.averageFa).toBeCloseTo(2, 6); // only recorded in round 100

    expect(p2?.winPercent).toBeCloseTo(0.5, 6); // won round 99 of 2 rounds
    expect(p2?.averageFa).toBeCloseTo(2, 6);
  });

  it('gives pirates with no wins or food data a zero win% and null average', () => {
    const { pirates } = computeFoodAdjustmentHistory(rounds);
    const p3 = pirates.find(p => p.pirateId === 3);
    expect(p3?.winPercent).toBe(0);
    expect(p3?.averageFa).toBeNull();
  });

  it('sorts pirates by win% descending, pirate id ascending as a tie-break', () => {
    const { pirates } = computeFoodAdjustmentHistory(rounds);
    // Pirates 1 and 2 tie at 50% - id order breaks the tie - and both lead
    // the rest, who are all at 0%.
    expect(pirates.slice(0, 2).map(p => p.pirateId)).toEqual([1, 2]);
  });

  it('builds newest-round-first rows with per-pirate FA and win result', () => {
    const { rows } = computeFoodAdjustmentHistory(rounds);
    expect(rows.map(r => r.round)).toEqual([100, 99]);

    const round100 = rows[0];
    expect(round100?.cellsByPirateId.get(1)).toEqual({ fa: 2, isWinner: true });
    expect(round100?.cellsByPirateId.get(2)).toEqual({ fa: 2, isWinner: false });

    const round99 = rows[1];
    expect(round99?.cellsByPirateId.get(1)).toEqual({ fa: null, isWinner: false });
    expect(round99?.cellsByPirateId.get(2)).toEqual({ fa: null, isWinner: true });
  });

  it('handles empty input by still returning all known pirates with no rows', () => {
    const { pirates, rows } = computeFoodAdjustmentHistory([]);
    expect(rows).toEqual([]);
    expect(pirates).toHaveLength(20);
    expect(pirates.every(p => p.winPercent === 0 && p.averageFa === null)).toBe(true);
  });
});
