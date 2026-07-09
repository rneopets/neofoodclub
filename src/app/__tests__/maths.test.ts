import { describe, it, expect } from 'vitest';

import { makeRoundData } from '../../test/utils';
import { PayoutData } from '../../types';
import { Bet, ProbabilitiesData } from '../../types/bets';
import {
  makeEmpty,
  computePirateFAs,
  computeLegacyProbabilities,
  computeLogitProbabilities,
  calculateArenaRatios,
  calculatePayoutTables,
  computePirateBinary,
  computePiratesBinary,
  computeBinaryToPirates,
} from '../maths';

// Verifies the internal invariants that `tableToList` (used inside calculatePayoutTables)
// guarantees for every payout table it produces: values sorted ascending, cumulative
// non-decreasing and summing toward 1, and tail == 1 - (cumulative before this entry).
function assertPayoutDataInvariants(list: PayoutData[]): void {
  expect(list.length).toBeGreaterThan(0);

  for (let i = 1; i < list.length; i++) {
    expect(list[i]!.value).toBeGreaterThan(list[i - 1]!.value);
  }

  let runningCumulative = 0;
  for (let i = 0; i < list.length; i++) {
    const item = list[i]!;
    expect(item.tail).toBeCloseTo(1 - runningCumulative, 9);
    runningCumulative += item.probability;
    expect(item.cumulative).toBeCloseTo(runningCumulative, 9);
    expect(item.cumulative).toBeGreaterThanOrEqual(i === 0 ? 0 : list[i - 1]!.cumulative - 1e-9);
  }

  expect(list[list.length - 1]!.cumulative).toBeCloseTo(1, 9);
}

describe('makeEmpty', () => {
  it('creates an array of the given length filled with zeroes', () => {
    expect(makeEmpty(5)).toEqual([0, 0, 0, 0, 0]);
  });

  it('creates an empty array for length 0', () => {
    expect(makeEmpty(0)).toEqual([]);
  });
});

describe('computePirateFAs', () => {
  it('returns a Map with 5 arena entries, each with 4 [favorite, allergy] pairs', () => {
    const result = computePirateFAs(makeRoundData());
    expect(result.size).toBe(5);
    for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
      const arenaFAs = result.get(arenaIndex);
      expect(arenaFAs).toBeDefined();
      expect(arenaFAs).toHaveLength(4);
      arenaFAs!.forEach(pair => {
        expect(pair).toHaveLength(2);
        expect(Number.isFinite(pair[0])).toBe(true);
        expect(Number.isFinite(pair[1])).toBe(true);
      });
    }
  });

  it('computes exact favorite/allergy values for a known pirate/food combination', () => {
    // Default fixture: arena 0 pirate index 0 is pirate 1, arena 0 foods are [1..10].
    // POSITIVE_FAS[1] = { 1: 2, 2: 0, 3: 0, 4: 1, 5: 0, 6: 1, 7: 1, 8: 1, 9: 0, 10: 1, ... }
    //   => sum for foods [1..10] = 2+0+0+1+0+1+1+1+0+1 = 7.
    // NEGATIVE_FAS[1] = { 1: 0, 2: 0, ..., 10: 0 } => sum for foods [1..10] = 0.
    const result = computePirateFAs(makeRoundData());
    const arena0 = result.get(0)!;
    expect(arena0[0]).toEqual([7, 0]);
  });

  it('returns all zeroes when foods is an empty array', () => {
    const result = computePirateFAs(makeRoundData({ foods: [] }));
    for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
      const arenaFAs = result.get(arenaIndex)!;
      arenaFAs.forEach(pair => {
        expect(pair).toEqual([0, 0]);
      });
    }
  });

  it('returns all zeroes when pirates is an empty array', () => {
    const result = computePirateFAs(makeRoundData({ pirates: [] }));
    for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
      const arenaFAs = result.get(arenaIndex)!;
      arenaFAs.forEach(pair => {
        expect(pair).toEqual([0, 0]);
      });
    }
  });
});

describe('computeLegacyProbabilities', () => {
  it('returns the default arena-numbers shape when openingOdds is an empty array', () => {
    const result = computeLegacyProbabilities(makeRoundData({ openingOdds: [] }));
    expect(result.min).toEqual([
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
    ]);
    expect(result.std).toEqual(result.min);
    expect(result.max).toEqual(result.min);
    expect(result.used).toEqual(result.min);
  });

  it('index 0 of every sub-array always stays 1 (unused placeholder slot)', () => {
    const result = computeLegacyProbabilities(makeRoundData());
    for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
      expect(result.min[arenaIndex]![0]).toBe(1);
      expect(result.max[arenaIndex]![0]).toBe(1);
      expect(result.std[arenaIndex]![0]).toBe(1);
      expect(result.used[arenaIndex]![0]).toBe(1);
    }
  });

  it('normalizes "used" probabilities to sum to 1 per arena for default odds (hits the odds===2 branch)', () => {
    // Default fixture openingOdds per arena is [1,2,3,4,5], so pirateIndex 1 has odds
    // exactly 2, which hits the `pirateOdd === 2` special case in the implementation.
    const result = computeLegacyProbabilities(makeRoundData());
    for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
      const sum =
        result.used[arenaIndex]![1]! +
        result.used[arenaIndex]![2]! +
        result.used[arenaIndex]![3]! +
        result.used[arenaIndex]![4]!;
      expect(sum).toBeCloseTo(1, 9);
    }
  });

  it('handles odds of exactly 13 without crashing and still normalizes to 1 (hits the odds===13 branch)', () => {
    const roundData = makeRoundData({
      openingOdds: [
        [1, 13, 3, 4, 5],
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5],
      ],
    });
    const result = computeLegacyProbabilities(roundData);
    const sum =
      result.used[0]![1]! + result.used[0]![2]! + result.used[0]![3]! + result.used[0]![4]!;
    expect(sum).toBeCloseTo(1, 9);
    expect(Number.isFinite(result.used[0]![1]!)).toBe(true);
  });
});

describe('computeLogitProbabilities', () => {
  it('returns empty prob/used arrays when pirates is an empty array', () => {
    const result = computeLogitProbabilities(makeRoundData({ pirates: [] }));
    expect(result.prob).toEqual([]);
    expect(result.used).toEqual([]);
  });

  it('computes normalized probabilities for each arena that sum to 1 across pirates 1-4', () => {
    const result = computeLogitProbabilities(makeRoundData());
    expect(result.prob).toHaveLength(5);
    for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
      expect(result.prob[arenaIndex]![0]).toBe(1);
      const sum =
        result.prob[arenaIndex]![1]! +
        result.prob[arenaIndex]![2]! +
        result.prob[arenaIndex]![3]! +
        result.prob[arenaIndex]![4]!;
      expect(sum).toBeCloseTo(1, 9);
      // `used` mirrors `prob` in this implementation
      expect(result.used[arenaIndex]).toEqual(result.prob[arenaIndex]);
    }
  });
});

describe('calculateArenaRatios', () => {
  it('computes 1/(sum of 1/odds) - 1 for each arena', () => {
    const customOdds = [
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
    ];
    const expectedRatio = 1 / (1 / 2 + 1 / 3 + 1 / 4 + 1 / 5) - 1;
    const result = calculateArenaRatios(customOdds);
    expect(result).toHaveLength(5);
    result.forEach(ratio => {
      expect(ratio).toBeCloseTo(expectedRatio, 9);
    });
  });

  it('computes different ratios per arena when odds differ', () => {
    const customOdds = [
      [1, 2, 2, 2, 2],
      [1, 10, 10, 10, 10],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
    ];
    const result = calculateArenaRatios(customOdds);
    const expectedArena0 = 1 / (1 / 2 + 1 / 2 + 1 / 2 + 1 / 2) - 1;
    const expectedArena1 = 1 / (1 / 10 + 1 / 10 + 1 / 10 + 1 / 10) - 1;
    expect(result[0]).toBeCloseTo(expectedArena0, 9);
    expect(result[1]).toBeCloseTo(expectedArena1, 9);
  });
});

describe('computePirateBinary', () => {
  it('returns 0 when pirateIndex is 0, regardless of arena', () => {
    for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
      expect(computePirateBinary(arenaIndex, 0)).toBe(0);
    }
  });

  it('returns the expected bit for arena 0 pirates 1-4', () => {
    expect(computePirateBinary(0, 1)).toBe(0x80000);
    expect(computePirateBinary(0, 2)).toBe(0x40000);
    expect(computePirateBinary(0, 3)).toBe(0x20000);
    expect(computePirateBinary(0, 4)).toBe(0x10000);
  });

  it('returns the expected bit for arena 4 pirates 1-4', () => {
    expect(computePirateBinary(4, 1)).toBe(0x8);
    expect(computePirateBinary(4, 2)).toBe(0x4);
    expect(computePirateBinary(4, 3)).toBe(0x2);
    expect(computePirateBinary(4, 4)).toBe(0x1);
  });
});

describe('computePiratesBinary', () => {
  it('returns 0 for an all-zero selection', () => {
    expect(computePiratesBinary([0, 0, 0, 0, 0])).toBe(0);
  });

  it('ORs together the per-arena bits for pirateIndex 1 in every arena', () => {
    expect(computePiratesBinary([1, 1, 1, 1, 1])).toBe(0x88888);
  });

  it('matches manual OR of computePirateBinary for a mixed selection', () => {
    const selection = [1, 2, 3, 4, 0];
    const expected =
      computePirateBinary(0, 1) |
      computePirateBinary(1, 2) |
      computePirateBinary(2, 3) |
      computePirateBinary(3, 4) |
      computePirateBinary(4, 0);
    expect(computePiratesBinary(selection)).toBe(expected);
  });
});

describe('computeBinaryToPirates', () => {
  it('returns all zeroes for binary 0', () => {
    expect(computeBinaryToPirates(0)).toEqual([0, 0, 0, 0, 0]);
  });

  it.each([
    [0, 0, 0, 0, 0],
    [1, 2, 3, 4, 1],
    [4, 3, 2, 1, 0],
    [1, 1, 1, 1, 1],
    [4, 4, 4, 4, 4],
    [0, 4, 0, 1, 0],
  ])('round-trips computeBinaryToPirates(computePiratesBinary(%j))', (...selection) => {
    // Since computePiratesBinary sets at most one bit per arena (or none for pirateIndex 0),
    // the encode/decode pair is a true round-trip for any single-pirate-per-arena selection.
    const binary = computePiratesBinary(selection);
    expect(computeBinaryToPirates(binary)).toEqual(selection);
  });
});

describe('calculatePayoutTables', () => {
  it('produces internally consistent odds/winnings tables for a small 2-bet set', () => {
    const bets: Bet = new Map([
      [1, [1, 0, 0, 0, 0]],
      [2, [2, 0, 0, 0, 0]],
    ]);
    const probabilities: ProbabilitiesData = [
      [0, 0.4, 0.3, 0.2, 0.1],
      [0, 0.25, 0.25, 0.25, 0.25],
      [0, 0.25, 0.25, 0.25, 0.25],
      [0, 0.25, 0.25, 0.25, 0.25],
      [0, 0.25, 0.25, 0.25, 0.25],
    ];
    const betOdds = new Map([
      [1, 2],
      [2, 3],
    ]);
    const betPayoffs = new Map([
      [1, 200],
      [2, 300],
    ]);

    const result = calculatePayoutTables(bets, probabilities, betOdds, betPayoffs);

    assertPayoutDataInvariants(result.odds);
    assertPayoutDataInvariants(result.winnings);

    // Both bets are single-arena, mutually exclusive (arena 0 pirate 1 vs pirate 2), so the
    // "no bet wins" outcome must also appear as one of the entries (value 0).
    expect(result.odds.some(entry => entry.value === 0)).toBe(true);
    expect(result.winnings.some(entry => entry.value === 0)).toBe(true);
  });

  it('produces internally consistent tables for a 3-bet set with overlapping arenas', () => {
    const bets: Bet = new Map([
      [1, [1, 1, 0, 0, 0]],
      [2, [1, 2, 0, 0, 0]],
      [3, [2, 0, 0, 0, 0]],
    ]);
    const probabilities: ProbabilitiesData = [
      [0, 0.4, 0.3, 0.2, 0.1],
      [0, 0.5, 0.2, 0.2, 0.1],
      [0, 0.25, 0.25, 0.25, 0.25],
      [0, 0.25, 0.25, 0.25, 0.25],
      [0, 0.25, 0.25, 0.25, 0.25],
    ];
    const betOdds = new Map([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
    const betPayoffs = new Map([
      [1, 400],
      [2, 500],
      [3, 600],
    ]);

    const result = calculatePayoutTables(bets, probabilities, betOdds, betPayoffs);

    assertPayoutDataInvariants(result.odds);
    assertPayoutDataInvariants(result.winnings);
  });
});
