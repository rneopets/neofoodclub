import { describe, expect, it } from 'vitest';

import {
  findMostChangesRound,
  findThirteenRounds,
  isThirteenRound,
  positiveArenaCount,
  positiveArenaDistribution,
  type AnomalyRound,
} from '../oddsAnomalies';

/** Builds a minimal anomaly round - every arena gets `[1, ...pirateOdds]` rows. */
function makeRound(overrides: Partial<AnomalyRound> = {}): AnomalyRound {
  return {
    round: 1,
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
    ...overrides,
  };
}

describe('isThirteenRound / findThirteenRounds', () => {
  it('counts a round as thirteens when every arena has a 13 in opening OR current odds', () => {
    const round = makeRound({
      openingOdds: [
        [1, 13, 2, 3],
        [1, 2, 3, 4], // no 13 in opening - but current has one
        [1, 2, 13, 4],
        [1, 2, 3, 13],
        [1, 13, 4, 5],
      ],
      currentOdds: [
        [1, 2, 3, 4], // no 13 in current - but opening had one
        [1, 2, 13, 4],
        [1, 2, 3, 4],
        [1, 2, 3, 4],
        [1, 2, 3, 4],
      ],
    });
    expect(isThirteenRound(round)).toBe(true);
  });

  it('is not thirteens when any arena lacks a 13 in both opening and current odds', () => {
    const round = makeRound({
      // arena 1 never hits 13
      currentOdds: [
        [1, 13, 2, 3],
        [1, 2, 3, 4],
        [1, 13, 2, 3],
        [1, 13, 2, 3],
        [1, 13, 2, 3],
      ],
    });
    expect(isThirteenRound(round)).toBe(false);
  });

  it('finds all thirteens rounds across a feed', () => {
    const allThirteen = [13, 2, 13, 4];
    const rounds: AnomalyRound[] = [
      makeRound({ round: 10, currentOdds: [[1, ...allThirteen]] as number[][] }),
      makeRound({ round: 11 }), // no thirteens at all
      makeRound({ round: 12, openingOdds: [[1, ...allThirteen]] as number[][] }),
    ];
    // rounds 10 and 12 have thirteens only in arena 0 - not all five, so neither qualifies
    expect(findThirteenRounds(rounds)).toEqual([]);

    const fullThirteen = (): number[][] => Array.from({ length: 5 }, () => [1, ...allThirteen]);
    expect(
      findThirteenRounds([
        makeRound({ round: 10, currentOdds: fullThirteen() }),
        makeRound({ round: 11 }),
        makeRound({ round: 12, openingOdds: fullThirteen() }),
      ]),
    ).toEqual([10, 12]);
  });
});

describe('findMostChangesRound', () => {
  it('returns the round with the most changes, keeping the first on ties', () => {
    const rounds: AnomalyRound[] = [
      makeRound({ round: 1, changes: [{}, {}, {}] }),
      makeRound({ round: 2, changes: [{}, {}, {}, {}] }),
      makeRound({ round: 3, changes: [{}, {}, {}, {}] }), // tie - earlier round wins
      makeRound({ round: 4, changes: null }),
    ];
    expect(findMostChangesRound(rounds)).toEqual({ round: 2, changeCount: 4 });
  });

  it('returns null when no round has any changes', () => {
    expect(findMostChangesRound([makeRound(), makeRound({ round: 2, changes: [] })])).toBeNull();
    expect(findMostChangesRound([makeRound({ round: 1, changes: null })])).toBeNull();
  });

  it('treats a missing changes field as zero changes', () => {
    const rounds: AnomalyRound[] = [makeRound({ round: 1, changes: [{}, {}] }), makeRound()];
    expect(findMostChangesRound(rounds)).toEqual({ round: 1, changeCount: 2 });
  });
});

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
    const round = makeRound({ currentOdds: [row] as number[][] });
    expect(positiveArenaCount(round)).toBe(0);
  });

  it('skips short/malformed odds rows instead of counting them as positive', () => {
    const round = makeRound({ currentOdds: [[1, 2], []] as number[][] });
    expect(positiveArenaCount(round)).toBe(0);
  });
});

describe('positiveArenaDistribution', () => {
  it('buckets rounds by positive-arena count and reports the total', () => {
    const positiveRow = [1, 4, 5, 6, 7];
    const negativeRow = [1, 2, 3, 4, 5];
    const rounds: AnomalyRound[] = [
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
