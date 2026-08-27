import { format } from 'date-fns';

import type { FcDataRow } from '../data/fcDataCsv';

export interface FcDataTotals {
  roundsRecorded: number;
  totalUnitsWon: number;
  averageUnitsPerRound: number;
  /** Fraction of rounds with unitsWon > 0, 0..1. */
  winRate: number;
  /** Highest unitsWon; first occurrence wins ties. Null when there are no rows. */
  bestRound: FcDataRow | null;
  longestWinStreak: number;
  longestLossStreak: number;
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
}

export interface FcDataCumulativePoint {
  round: number;
  cumulative: number;
}

export interface FcDataMissedRoundGap {
  afterRound: number;
  beforeRound: number;
  missingCount: number;
}

export interface FcDataDayOfWeekStats {
  /** 0=Sun..6=Sat, matching Date#getDay(). */
  dayOfWeek: number;
  label: string;
  roundsPlayed: number;
  totalUnitsWon: number;
  averageUnitsPerRound: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function longestRun(rows: FcDataRow[], predicate: (row: FcDataRow) => boolean): number {
  let longest = 0;
  let current = 0;
  for (const row of rows) {
    if (predicate(row)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

export function computeTotals(rows: FcDataRow[]): FcDataTotals {
  if (rows.length === 0) {
    return {
      roundsRecorded: 0,
      totalUnitsWon: 0,
      averageUnitsPerRound: 0,
      winRate: 0,
      bestRound: null,
      longestWinStreak: 0,
      longestLossStreak: 0,
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
    longestWinStreak: longestRun(rows, row => row.unitsWon > 0),
    longestLossStreak: longestRun(rows, row => row.unitsWon === 0),
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

      return {
        monthKey,
        label: format(monthRows[0]!.date, 'MMM yyyy'),
        roundsPlayed: monthRows.length,
        totalUnitsWon,
        averageUnitsPerRound: totalUnitsWon / monthRows.length,
        winRate: winningRounds / monthRows.length,
        bestRound,
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

export function computeDayOfWeekStats(rows: FcDataRow[]): FcDataDayOfWeekStats[] {
  const buckets: FcDataRow[][] = Array.from({ length: 7 }, () => []);

  for (const row of rows) {
    buckets[row.date.getDay()]!.push(row);
  }

  return buckets.map((bucketRows, dayOfWeek) => {
    const totalUnitsWon = bucketRows.reduce((sum, row) => sum + row.unitsWon, 0);
    return {
      dayOfWeek,
      label: DAY_LABELS[dayOfWeek]!,
      roundsPlayed: bucketRows.length,
      totalUnitsWon,
      averageUnitsPerRound: bucketRows.length > 0 ? totalUnitsWon / bucketRows.length : 0,
    };
  });
}
