import { format } from 'date-fns';

import type { FcDataRow } from '../data/fcDataCsv';
import { parseBetUrl } from '../util';

export interface FcDataWinStreak {
  count: number;
  totalUnitsWon: number;
  startDate: Date;
  endDate: Date;
}

export interface FcDataLossStreak {
  count: number;
  startDate: Date;
  endDate: Date;
}

export interface FcDataTotals {
  roundsRecorded: number;
  totalUnitsWon: number;
  averageUnitsPerRound: number;
  /** Fraction of rounds with unitsWon > 0, 0..1. */
  winRate: number;
  /** Highest unitsWon; first occurrence wins ties. Null when there are no rows. */
  bestRound: FcDataRow | null;
  /** Null when no round ever won anything. */
  longestWinStreak: FcDataWinStreak | null;
  /** Null when every round won something. */
  longestLossStreak: FcDataLossStreak | null;
  firstRound: FcDataRow | null;
  lastRound: FcDataRow | null;
}

export interface FcDataMonthStats {
  /** e.g. "2024-04" - sortable, stable key. */
  monthKey: string;
  /** e.g. "Apr 2024". */
  label: string;
  roundsPlayed: number;
  totalUnitsWon: number;
  averageUnitsPerRound: number;
  winRate: number;
  bestRound: FcDataRow | null;
  /**
   * totalUnitsWon / total active bet lines that month (not real NP wagered -
   * there's no bet-amount data in the CSV, just a per-line proxy). 1.0 means
   * each bet line broke even on average.
   */
  roi: number;
  /** Same as `roi`, but accumulated across every month up to and including this one. */
  cumulativeRoi: number;
}

export interface FcDataCumulativePoint {
  round: number;
  cumulative: number;
}

export interface FcDataRoiPoint {
  round: number;
  /** Cumulative units won / cumulative active bet lines through this round. */
  roi: number;
}

export interface FcDataMissedRoundGap {
  afterRound: number;
  beforeRound: number;
  missingCount: number;
}

export type FcDataReturnBucket = 'bust' | 'partial' | 'profit' | 'double';

/** Round counts per return bucket (see `classifyRoundReturn`). `total` is the sum of all four. */
export type FcDataReturnDistribution = Record<FcDataReturnBucket, number> & { total: number };

/** Number of bet lines with at least one non-zero pirate pick, decoded from the round's URL. */
export function activeBetLineCount(url: string): number {
  return decodeActiveLines(url).length;
}

/** One entry per active bet line: 5 positions (1-4, or 0 for "no pick"), one per arena. */
export function decodeActiveLines(url: string): number[][] {
  const hashIndex = url.indexOf('#');
  const fragment = hashIndex === -1 ? url : url.slice(hashIndex + 1);
  const { bets } = parseBetUrl(fragment);

  const lines: number[][] = [];
  for (const positions of bets.values()) {
    if (positions.some(position => position > 0)) {
      lines.push(positions);
    }
  }
  return lines;
}

export type FcDataBetShapeBucket = 'gambit' | 'bustproof' | 'crazy' | 'tenbet' | 'other';

export interface FcDataBetShapeCounts {
  /** Every active line's picks are a subset of one fixed 5-pirate combo (see `classifyBetShape`). */
  gambitShaped: number;
  /** Some arena has all 4 of its pirates covered across the lines. */
  bustproofShaped: number;
  /** Every line picks a pirate in all 5 arenas (no arena skipped). */
  crazyShaped: number;
  /** One (arena, pirate) pair is held fixed across every active line. */
  tenbetShaped: number;
  other: number;
  total: number;
}

/**
 * Classifies a round's decoded bet lines by structure, checked in order:
 * - `gambit`: every arena has at most one distinct nonzero position across
 *   all lines (every line is a subset of one fixed 5-pirate combo).
 * - `bustproof`: some arena has all 4 of its pirates covered across the
 *   lines (matches `make_bustproof_bets` in the neofoodclub engine, which
 *   fully covers one or more "positive" arenas so that arena can't bust).
 * - `crazy`: every line picks a pirate in all 5 arenas, no arena skipped
 *   (matches `make_crazy_bets`'s "randomly-selected, full-arena bets").
 * - `tenbet`: some arena holds one fixed nonzero position across every
 *   line (one "anchor" pirate present in every line), while other arenas vary.
 * - `other`: none of the above, or too few lines to tell (single-line bets).
 */
function classifyBetShape(lines: number[][]): FcDataBetShapeBucket {
  if (lines.length <= 1) {
    return 'other';
  }

  const positionsByArena = Array.from(
    { length: 5 },
    (_unused, arena) =>
      new Set(lines.map(line => line[arena]).filter((p): p is number => !!p && p > 0)),
  );

  if (positionsByArena.every(positions => positions.size <= 1)) {
    return 'gambit';
  }

  if (positionsByArena.some(positions => positions.size === 4)) {
    return 'bustproof';
  }

  if (lines.every(line => line.every(position => position > 0))) {
    return 'crazy';
  }

  for (let arena = 0; arena < 5; arena++) {
    const first = lines[0]![arena]!;
    if (first > 0 && lines.every(line => line[arena] === first)) {
      return 'tenbet';
    }
  }

  return 'other';
}

const BET_SHAPE_KEYS: Record<FcDataBetShapeBucket, keyof FcDataBetShapeCounts> = {
  gambit: 'gambitShaped',
  bustproof: 'bustproofShaped',
  crazy: 'crazyShaped',
  tenbet: 'tenbetShaped',
  other: 'other',
};

/**
 * Buckets each row's bet by structural shape, decoded purely from its bet
 * hash - no round-history data needed (unlike pirate/arena identity, this
 * doesn't depend on knowing which real pirate each position maps to).
 */
export function computeBetShapeCounts(rows: FcDataRow[]): FcDataBetShapeCounts {
  const counts: FcDataBetShapeCounts = {
    gambitShaped: 0,
    bustproofShaped: 0,
    crazyShaped: 0,
    tenbetShaped: 0,
    other: 0,
    total: 0,
  };

  for (const row of rows) {
    const lines = decodeActiveLines(row.url);
    if (lines.length === 0) {
      continue;
    }

    const shape = classifyBetShape(lines);
    counts[BET_SHAPE_KEYS[shape]] += 1;
    counts.total += 1;
  }

  return counts;
}

/**
 * Buckets a single round's return relative to its active bet lines: `bust`
 * (won nothing), `partial` (won something but under 1x per line), `profit`
 * (1x-2x per line), `double` (2x or more per line).
 */
export function classifyRoundReturn(row: FcDataRow): FcDataReturnBucket {
  if (row.unitsWon === 0) {
    return 'bust';
  }

  const lines = activeBetLineCount(row.url);
  const roi = lines > 0 ? row.unitsWon / lines : 0;

  if (roi < 1) {
    return 'partial';
  }
  if (roi < 2) {
    return 'profit';
  }
  return 'double';
}

export function computeReturnDistribution(rows: FcDataRow[]): FcDataReturnDistribution {
  const distribution: FcDataReturnDistribution = {
    bust: 0,
    partial: 0,
    profit: 0,
    double: 0,
    total: 0,
  };

  for (const row of rows) {
    distribution[classifyRoundReturn(row)] += 1;
    distribution.total += 1;
  }

  return distribution;
}

function longestWinStreak(rows: FcDataRow[]): FcDataWinStreak | null {
  let best: FcDataWinStreak | null = null;
  let currentCount = 0;
  let currentUnitsWon = 0;
  let currentStartIndex = -1;

  rows.forEach((row, index) => {
    if (row.unitsWon > 0) {
      if (currentCount === 0) {
        currentStartIndex = index;
      }
      currentCount += 1;
      currentUnitsWon += row.unitsWon;
      if (!best || currentCount > best.count) {
        best = {
          count: currentCount,
          totalUnitsWon: currentUnitsWon,
          startDate: rows[currentStartIndex]!.date,
          endDate: row.date,
        };
      }
    } else {
      currentCount = 0;
      currentUnitsWon = 0;
    }
  });

  return best;
}

function longestLossStreak(rows: FcDataRow[]): FcDataLossStreak | null {
  let best: FcDataLossStreak | null = null;
  let currentCount = 0;
  let currentStartIndex = -1;

  rows.forEach((row, index) => {
    if (row.unitsWon === 0) {
      if (currentCount === 0) {
        currentStartIndex = index;
      }
      currentCount += 1;
      if (!best || currentCount > best.count) {
        best = {
          count: currentCount,
          startDate: rows[currentStartIndex]!.date,
          endDate: row.date,
        };
      }
    } else {
      currentCount = 0;
    }
  });

  return best;
}

export function computeTotals(rows: FcDataRow[]): FcDataTotals {
  if (rows.length === 0) {
    return {
      roundsRecorded: 0,
      totalUnitsWon: 0,
      averageUnitsPerRound: 0,
      winRate: 0,
      bestRound: null,
      longestWinStreak: null,
      longestLossStreak: null,
      firstRound: null,
      lastRound: null,
    };
  }

  const totalUnitsWon = rows.reduce((sum, row) => sum + row.unitsWon, 0);
  const winningRounds = rows.filter(row => row.unitsWon > 0).length;

  let bestRound = rows[0]!;
  for (const row of rows) {
    if (row.unitsWon > bestRound.unitsWon) {
      bestRound = row;
    }
  }

  return {
    roundsRecorded: rows.length,
    totalUnitsWon,
    averageUnitsPerRound: totalUnitsWon / rows.length,
    winRate: winningRounds / rows.length,
    bestRound,
    longestWinStreak: longestWinStreak(rows),
    longestLossStreak: longestLossStreak(rows),
    firstRound: rows[0]!,
    lastRound: rows[rows.length - 1]!,
  };
}

export function computeMonthlyStats(rows: FcDataRow[]): FcDataMonthStats[] {
  const byMonth = new Map<string, FcDataRow[]>();

  for (const row of rows) {
    const monthKey = format(row.date, 'yyyy-MM');
    const bucket = byMonth.get(monthKey);
    if (bucket) {
      bucket.push(row);
    } else {
      byMonth.set(monthKey, [row]);
    }
  }

  let cumulativeUnitsWon = 0;
  let cumulativeBetLines = 0;

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, monthRows]) => {
      const totalUnitsWon = monthRows.reduce((sum, row) => sum + row.unitsWon, 0);
      const winningRounds = monthRows.filter(row => row.unitsWon > 0).length;

      let bestRound = monthRows[0]!;
      for (const row of monthRows) {
        if (row.unitsWon > bestRound.unitsWon) {
          bestRound = row;
        }
      }

      const totalBetLines = monthRows.reduce((sum, row) => sum + activeBetLineCount(row.url), 0);

      cumulativeUnitsWon += totalUnitsWon;
      cumulativeBetLines += totalBetLines;

      return {
        monthKey,
        label: format(monthRows[0]!.date, 'MMM yyyy'),
        roundsPlayed: monthRows.length,
        totalUnitsWon,
        averageUnitsPerRound: totalUnitsWon / monthRows.length,
        winRate: winningRounds / monthRows.length,
        bestRound,
        roi: totalBetLines > 0 ? totalUnitsWon / totalBetLines : 0,
        cumulativeRoi: cumulativeBetLines > 0 ? cumulativeUnitsWon / cumulativeBetLines : 0,
      };
    });
}

export function computeCumulativeSeries(rows: FcDataRow[]): FcDataCumulativePoint[] {
  let cumulative = 0;
  return rows.map(row => {
    cumulative += row.unitsWon;
    return { round: row.round, cumulative };
  });
}

export function computeRoiSeries(rows: FcDataRow[]): FcDataRoiPoint[] {
  let cumulativeUnitsWon = 0;
  let cumulativeBetLines = 0;

  return rows.map(row => {
    cumulativeUnitsWon += row.unitsWon;
    cumulativeBetLines += activeBetLineCount(row.url);
    return {
      round: row.round,
      roi: cumulativeBetLines > 0 ? cumulativeUnitsWon / cumulativeBetLines : 0,
    };
  });
}

export function findMissedRoundGaps(rows: FcDataRow[]): FcDataMissedRoundGap[] {
  const gaps: FcDataMissedRoundGap[] = [];

  for (let i = 1; i < rows.length; i++) {
    const afterRound = rows[i - 1]!.round;
    const beforeRound = rows[i]!.round;
    const missingCount = beforeRound - afterRound - 1;
    if (missingCount > 0) {
      gaps.push({ afterRound, beforeRound, missingCount });
    }
  }

  return gaps;
}
