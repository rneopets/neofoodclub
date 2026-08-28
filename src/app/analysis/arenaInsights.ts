import type { BacktestRound } from '../backtest/types';
import { ARENA_NAMES } from '../constants';

/** Indices of the pirate odds within an arena's odds row (index 0 is always the clear bet). */
const PIRATE_ODD_INDICES = [1, 2, 3, 4] as const;

/**
 * How many of the round's arenas are "positive" - i.e. where the sum of
 * 1/current-odds across all four pirates is less than 1 (the book's implied
 * probability of the arena totals to under 100%). Mirrors `Arena::is_positive`
 * in the wasm core, which is what bustproof bets operate on.
 */
export function positiveArenaCount(round: BacktestRound): number {
  let count = 0;

  for (let arena = 0; arena < 5; arena++) {
    const row = round.currentOdds[arena] ?? [];

    // A row missing any pirate odd can't be evaluated - skip it rather than
    // treating an incomplete arena as positive (implied total 0).
    let impliedTotal = 0;
    let complete = true;
    for (const index of PIRATE_ODD_INDICES) {
      const odd = row[index];
      if (odd === undefined || odd <= 0) {
        complete = false;
        break;
      }
      impliedTotal += 1 / odd;
    }

    if (complete && impliedTotal < 1) {
      count++;
    }
  }

  return count;
}

export interface PositiveArenaDistribution {
  /** `buckets[i]` = number of rounds with exactly i positive arenas (i: 0..5). */
  buckets: number[];
  totalRounds: number;
}

/**
 * Distribution of positive-arena counts across rounds - rounds with many
 * zero-positive arenas are where bustproof/crazy bets struggle.
 */
export function positiveArenaDistribution(rounds: BacktestRound[]): PositiveArenaDistribution {
  const buckets = [0, 0, 0, 0, 0, 0];

  for (const round of rounds) {
    const count = positiveArenaCount(round);
    buckets[count] = (buckets[count] ?? 0) + 1;
  }

  return { buckets, totalRounds: rounds.length };
}

/** One arena's win counts by 0-indexed position (position 0 is `winners[arena] === 1`, etc.). */
export interface ArenaPositionWinRate {
  arenaIndex: number;
  arenaName: string;
  /** `positionCounts[i]` = number of rounds where position i+1 won this arena. */
  positionCounts: number[];
  totalRounds: number;
}

const POSITION_COUNT = 4;

function emptyPositionCounts(): number[] {
  return new Array<number>(POSITION_COUNT).fill(0);
}

/**
 * Win rate by a pirate's position (1-4) within its arena, per arena and
 * overall. Tests the hypothesis that later positions win more often than
 * earlier ones - `winners[arena]` is the 1-indexed winning position, so
 * position `p` is credited whenever `winners[arena] === p`.
 */
export function computeArenaPositionWinRates(rounds: BacktestRound[]): {
  arenas: ArenaPositionWinRate[];
  overall: ArenaPositionWinRate;
} {
  const arenas: ArenaPositionWinRate[] = ARENA_NAMES.map((name, arenaIndex) => ({
    arenaIndex,
    arenaName: name,
    positionCounts: emptyPositionCounts(),
    totalRounds: 0,
  }));

  for (const round of rounds) {
    for (let arenaIndex = 0; arenaIndex < arenas.length; arenaIndex++) {
      const position = round.winners[arenaIndex];
      const arena = arenas[arenaIndex]!;
      arena.totalRounds++;
      if (position === undefined || position < 1 || position > POSITION_COUNT) {
        continue;
      }
      arena.positionCounts[position - 1] = (arena.positionCounts[position - 1] ?? 0) + 1;
    }
  }

  const overallCounts = emptyPositionCounts();
  let overallTotal = 0;
  for (const arena of arenas) {
    overallTotal += arena.totalRounds;
    for (let i = 0; i < POSITION_COUNT; i++) {
      overallCounts[i] = (overallCounts[i] ?? 0) + (arena.positionCounts[i] ?? 0);
    }
  }

  return {
    arenas,
    overall: {
      arenaIndex: -1,
      arenaName: 'Overall',
      positionCounts: overallCounts,
      totalRounds: overallTotal,
    },
  };
}
