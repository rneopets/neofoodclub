/** Minimal round shape the odds-anomaly analyses need (the CDN feed lines satisfy this). */
export interface AnomalyRound {
  round: number;
  openingOdds: number[][];
  currentOdds: number[][];
  /** Odds-change log for the round (empty/absent when odds never moved). */
  changes?: unknown[] | null;
}

/** Indices of the pirate odds within an arena's odds row (index 0 is always the clear bet). */
const PIRATE_ODD_INDICES = [1, 2, 3, 4] as const;

/** The game's max-odds cap - "13" in the odds grids. */
const ODDS_CAP = 13;

/**
 * Whether an arena had a capped (13:1) price in either its opening or current
 * odds - the per-arena half of the "thirteens" check.
 */
function arenaHadThirteen(openingRow: number[], currentRow: number[]): boolean {
  return openingRow.includes(ODDS_CAP) || currentRow.includes(ODDS_CAP);
}

/**
 * Whether every one of the round's five arenas had a 13:1 opening or closing
 * price - the "thirteens" anomaly (a round where the book capped everything).
 */
export function isThirteenRound(round: AnomalyRound): boolean {
  for (let arena = 0; arena < 5; arena++) {
    const openingRow = round.openingOdds[arena] ?? [];
    const currentRow = round.currentOdds[arena] ?? [];
    if (!arenaHadThirteen(openingRow, currentRow)) {
      return false;
    }
  }
  return true;
}

/** Round numbers of every "thirteens" round, in feed order. */
export function findThirteenRounds(rounds: AnomalyRound[]): number[] {
  return rounds.filter(isThirteenRound).map(round => round.round);
}

/** The single most-changed round ({round, changeCount}), or null when no round has any changes. */
export function findMostChangesRound(
  rounds: AnomalyRound[],
): { round: number; changeCount: number } | null {
  let best: { round: number; changeCount: number } | null = null;

  for (const round of rounds) {
    const changeCount = Array.isArray(round.changes) ? round.changes.length : 0;
    if (changeCount === 0) {
      continue;
    }
    // Strictly-greater keeps the first (oldest) round on ties, matching a
    // stable "ORDER BY changes DESC LIMIT 1" over an ordered feed.
    if (best === null || changeCount > best.changeCount) {
      best = { round: round.round, changeCount };
    }
  }

  return best;
}

/**
 * How many of the round's arenas are "positive" - i.e. where the sum of
 * 1/current-odds across all four pirates is less than 1 (the book's implied
 * probability of the arena totals to under 100%). Mirrors `Arena::is_positive`
 * in the wasm core, which is what bustproof bets operate on.
 */
export function positiveArenaCount(round: AnomalyRound): number {
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
 * Distribution of positive-arena counts across rounds - the "negativearenas"
 * anomaly (rounds with many zero-positive arenas are where bustproof/crazy
 * bets struggle).
 */
export function positiveArenaDistribution(rounds: AnomalyRound[]): PositiveArenaDistribution {
  const buckets = [0, 0, 0, 0, 0, 0];

  for (const round of rounds) {
    const count = positiveArenaCount(round);
    buckets[count] = (buckets[count] ?? 0) + 1;
  }

  return { buckets, totalRounds: rounds.length };
}
