import { describe, expect, it } from 'vitest';

import type { BacktestRound } from '../../backtest/types';
import {
  arenaBreakdown,
  cumulativeNetDiff,
  currentStreak,
  findSharedEncounters,
  longestWinStreak,
  summarizeMatchup,
} from '../pirateMatchups';

// Gooblah and Buck for all test cases below.
const A_ID = 15;
const B_ID = 19;

function makeRound(round: number, arenas: (number[] | null)[], winners: number[]): BacktestRound {
  const pirates = arenas.map(arena => arena ?? [0, 0, 0, 0]);
  const odds = (v: number): number[] => [1, v, v + 1, v + 2];
  return {
    round,
    pirates: pirates as number[][],
    openingOdds: [1, 2, 3, 4, 5].map(odds),
    currentOdds: [1, 2, 3, 4, 5].map(odds),
    winners,
  };
}

/** A full, valid 20-pirate roster with Gooblah(15) and Buck(19) in `arena` at the given slots. */
function rosterWithPair(arena: number, aSlot: number, bSlot: number): number[][] {
  const others = Array.from({ length: 20 }, (_, i) => i + 1).filter(
    id => id !== A_ID && id !== B_ID,
  );
  const arenas: (number | undefined)[][] = Array.from({ length: 5 }, () => [
    undefined,
    undefined,
    undefined,
    undefined,
  ]);

  arenas[arena]![aSlot] = A_ID;
  arenas[arena]![bSlot] = B_ID;

  let nextPirate = 0;
  for (let a = 0; a < 5; a++) {
    for (let slot = 0; slot < 4; slot++) {
      if (arenas[a]![slot] === undefined) {
        arenas[a]![slot] = others[nextPirate++]!;
      }
    }
  }

  return arenas as number[][];
}

describe('findSharedEncounters', () => {
  it('records one encounter per round in which both pirates share an arena', () => {
    const rounds: BacktestRound[] = [
      // Round 100: both in arena 0, slot 1/2 -> Gooblah wins (winner slot 1).
      makeRound(100, rosterWithPair(0, 0, 1), [1, 2, 3, 4, 5]),
      // Round 101: both in arena 0, Buck first -> winner slot 2 is Gooblah? No:
      // roster [15,19,...] with winner slot 2 -> index 1 = Buck wins.
      makeRound(101, rosterWithPair(0, 0, 1), [2, 2, 3, 4, 5]),
      // Round 102: both in arena 0, third pirate wins (winner slot 3).
      makeRound(102, rosterWithPair(0, 0, 1), [3, 2, 3, 4, 5]),
      // Round 103: both in arena 2, Gooblah first (winner slot 1).
      makeRound(103, rosterWithPair(2, 0, 1), [2, 2, 1, 4, 5]),
      // Round 104: pirates split across arenas -> no encounter.
      makeRound(
        104,
        [
          [15, 2, 3, 4],
          [19, 5, 6, 7],
          [8, 9, 10, 11],
          [12, 13, 14, 16],
          [17, 18, 20, 1],
        ] as (number[] | null)[],
        [2, 3, 4, 5, 1],
      ),
      // Round 105: both in arena 4, Buck at slot 2 (winner slot 2).
      makeRound(
        105,
        [
          [4, 5, 6, 7],
          [1, 2, 3, 8],
          [9, 10, 11, 12],
          [13, 14, 16, 17],
          [20, 19, 15, 18],
        ] as (number[] | null)[],
        [2, 3, 4, 5, 2],
      ),
      // Round with null winners (filtered upstream by fetchPreviousRounds) must be ignored.
      {
        ...makeRound(106, rosterWithPair(0, 0, 1), [2, 3, 4, 5, 1]),
        winners: null as unknown as number[],
      },
    ];

    const encounters = findSharedEncounters(rounds, A_ID, B_ID);

    expect(encounters).toEqual([
      { round: 100, arena: 0, outcome: 'a' },
      { round: 101, arena: 0, outcome: 'b' },
      { round: 102, arena: 0, outcome: 'neither' },
      { round: 103, arena: 2, outcome: 'a' },
      { round: 105, arena: 4, outcome: 'b' },
    ]);
  });

  it('returns an empty list when the pirates never share an arena', () => {
    const rounds: BacktestRound[] = [
      makeRound(
        1,
        [
          [15, 2, 3, 4],
          [19, 5, 6, 7],
          [8, 9, 10, 11],
          [12, 13, 14, 16],
          [17, 18, 20, 1],
        ] as (number[] | null)[],
        [1, 2, 3, 4, 5],
      ),
    ];

    expect(findSharedEncounters(rounds, A_ID, B_ID)).toEqual([]);
  });

  it('is symmetric with respect to the two pirates (swapping sides flips a/b outcomes)', () => {
    // Roster [B, x, A, x] in arena 3 with winner slot 1 -> B wins for the (A,B) ordering.
    const rounds: BacktestRound[] = [makeRound(1, rosterWithPair(3, 2, 0), [4, 2, 3, 1, 5])];
    expect(findSharedEncounters(rounds, A_ID, B_ID)).toEqual([
      { round: 1, arena: 3, outcome: 'b' },
    ]);
    const ab = findSharedEncounters(rounds, A_ID, B_ID);
    const ba = findSharedEncounters(rounds, B_ID, A_ID).map(e => ({
      ...e,
      outcome: e.outcome === 'a' ? ('b' as const) : e.outcome === 'b' ? ('a' as const) : e.outcome,
    }));

    expect(ab).toEqual(ba);
  });
});

describe('summarizeMatchup', () => {
  it('aggregates wins, losses and neither outcomes with head-to-head rates', () => {
    const encounters = [
      { round: 1, arena: 0, outcome: 'a' as const },
      { round: 2, arena: 0, outcome: 'a' as const },
      { round: 3, arena: 1, outcome: 'b' as const },
      { round: 4, arena: 0, outcome: 'neither' as const },
    ];

    expect(summarizeMatchup(encounters)).toEqual({
      sharedRounds: 4,
      aWins: 2,
      bWins: 1,
      neitherCount: 1,
      headToHeadA: 2 / 3,
      headToHeadB: 1 / 3,
    });
  });

  it('returns null head-to-head rates when nothing was decided', () => {
    const encounters = [
      { round: 1, arena: 0, outcome: 'neither' as const },
      { round: 2, arena: 0, outcome: 'neither' as const },
    ];

    expect(summarizeMatchup(encounters)).toEqual({
      sharedRounds: 2,
      aWins: 0,
      bWins: 0,
      neitherCount: 2,
      headToHeadA: null,
      headToHeadB: null,
    });
  });

  it('handles an empty encounter list', () => {
    expect(summarizeMatchup([])).toEqual({
      sharedRounds: 0,
      aWins: 0,
      bWins: 0,
      neitherCount: 0,
      headToHeadA: null,
      headToHeadB: null,
    });
  });
});

describe('arenaBreakdown', () => {
  it('splits encounters by arena and keeps zero rows for unused arenas', () => {
    const encounters = [
      { round: 1, arena: 0, outcome: 'a' as const },
      { round: 2, arena: 0, outcome: 'b' as const },
      { round: 3, arena: 0, outcome: 'neither' as const },
      { round: 4, arena: 2, outcome: 'a' as const },
      { round: 5, arena: 4, outcome: 'b' as const },
    ];

    expect(arenaBreakdown(encounters)).toEqual([
      { arena: 0, sharedCount: 3, aWins: 1, bWins: 1, neitherCount: 1 },
      { arena: 1, sharedCount: 0, aWins: 0, bWins: 0, neitherCount: 0 },
      { arena: 2, sharedCount: 1, aWins: 1, bWins: 0, neitherCount: 0 },
      { arena: 3, sharedCount: 0, aWins: 0, bWins: 0, neitherCount: 0 },
      { arena: 4, sharedCount: 1, aWins: 0, bWins: 1, neitherCount: 0 },
    ]);
  });
});

describe('streaks', () => {
  const encounters = [
    { round: 100, arena: 0, outcome: 'a' as const },
    { round: 101, arena: 0, outcome: 'b' as const },
    { round: 102, arena: 0, outcome: 'neither' as const },
    { round: 103, arena: 2, outcome: 'a' as const },
    { round: 105, arena: 4, outcome: 'b' as const },
    { round: 106, arena: 0, outcome: 'a' as const },
    { round: 107, arena: 1, outcome: 'a' as const },
  ];

  it('finds the longest win streak for each side', () => {
    expect(longestWinStreak(encounters, 'a')).toEqual({ count: 2, startRound: 106, endRound: 107 });
    expect(longestWinStreak(encounters, 'b')).toEqual({ count: 1, startRound: 101, endRound: 101 });
    expect(longestWinStreak(encounters.slice(0, 3), 'a')).toEqual({
      count: 1,
      startRound: 100,
      endRound: 100,
    });
  });

  it('returns null when the side never won', () => {
    expect(longestWinStreak(encounters.slice(1, 3), 'a')).toBeNull();
    expect(longestWinStreak([], 'b')).toBeNull();
  });

  it('reports the streak at the end of the list, or null when not currently on one', () => {
    expect(currentStreak(encounters, 'a')).toEqual({ count: 2, startRound: 106, endRound: 107 });
    expect(currentStreak(encounters, 'b')).toBeNull();
    // Entire list is one side's wins.
    expect(currentStreak([encounters[0]!], 'a')).toEqual({
      count: 1,
      startRound: 100,
      endRound: 100,
    });
    expect(currentStreak([], 'a')).toBeNull();
  });
});

describe('cumulativeNetDiff', () => {
  it('tracks the running net win differential, ignoring neither outcomes', () => {
    const encounters = [
      { round: 1, arena: 0, outcome: 'a' as const },
      { round: 2, arena: 0, outcome: 'b' as const },
      { round: 3, arena: 0, outcome: 'neither' as const },
      { round: 4, arena: 0, outcome: 'a' as const },
    ];

    expect(cumulativeNetDiff(encounters)).toEqual([1, 0, 0, 1]);
    expect(cumulativeNetDiff([])).toEqual([]);
  });
});
