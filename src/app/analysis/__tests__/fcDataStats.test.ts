import { describe, expect, it } from 'vitest';

import type { FcDataRow } from '../../data/fcDataCsv';
import {
  computeCumulativeSeries,
  computeDayOfWeekStats,
  computeMonthlyStats,
  computeTotals,
  findMissedRoundGaps,
} from '../fcDataStats';

function makeRow(round: number, unitsWon: number, date: Date): FcDataRow {
  return {
    date,
    rawDate: date.toISOString(),
    round,
    unitsWon,
    url: `https://neofood.club/#round=${round}`,
  };
}

describe('computeTotals', () => {
  it('handles empty input without NaN', () => {
    const totals = computeTotals([]);
    expect(totals).toEqual({
      roundsRecorded: 0,
      totalUnitsWon: 0,
      averageUnitsPerRound: 0,
      winRate: 0,
      bestRound: null,
      longestWinStreak: 0,
      longestLossStreak: 0,
      firstRound: null,
      lastRound: null,
    });
  });

  it('handles an all-zero (never won) history', () => {
    const rows = [
      makeRow(1, 0, new Date(2024, 0, 1)),
      makeRow(2, 0, new Date(2024, 0, 2)),
      makeRow(3, 0, new Date(2024, 0, 3)),
    ];
    const totals = computeTotals(rows);

    expect(totals.winRate).toBe(0);
    expect(totals.longestWinStreak).toBe(0);
    expect(totals.longestLossStreak).toBe(3);
    expect(totals.bestRound).toBe(rows[0]);
  });

  it('handles an all-win history', () => {
    const rows = [
      makeRow(1, 10, new Date(2024, 0, 1)),
      makeRow(2, 5, new Date(2024, 0, 2)),
      makeRow(3, 20, new Date(2024, 0, 3)),
    ];
    const totals = computeTotals(rows);

    expect(totals.winRate).toBe(1);
    expect(totals.longestLossStreak).toBe(0);
    expect(totals.longestWinStreak).toBe(3);
  });

  it('finds the correct longest streak with alternating results', () => {
    // W, W, L, W, W, W, L
    const rows = [10, 5, 0, 3, 8, 12, 0].map((unitsWon, i) =>
      makeRow(i + 1, unitsWon, new Date(2024, 0, i + 1)),
    );
    const totals = computeTotals(rows);

    expect(totals.longestWinStreak).toBe(3);
    expect(totals.longestLossStreak).toBe(1);
  });

  it('breaks a tie for bestRound by taking the first occurrence', () => {
    const rows = [makeRow(1, 50, new Date(2024, 0, 1)), makeRow(2, 50, new Date(2024, 0, 2))];
    const totals = computeTotals(rows);

    expect(totals.bestRound).toBe(rows[0]);
  });
});

describe('computeMonthlyStats', () => {
  it('buckets rows across a year boundary into distinct months', () => {
    const rows = [
      makeRow(1, 10, new Date(2023, 11, 30)),
      makeRow(2, 20, new Date(2024, 0, 1)),
      makeRow(3, 30, new Date(2024, 0, 2)),
    ];
    const months = computeMonthlyStats(rows);

    expect(months.map(m => m.monthKey)).toEqual(['2023-12', '2024-01']);
    expect(months[0]!.roundsPlayed).toBe(1);
    expect(months[1]!.roundsPlayed).toBe(2);
    expect(months[1]!.totalUnitsWon).toBe(50);
  });

  it('produces one entry for a single month', () => {
    const rows = [makeRow(1, 5, new Date(2024, 3, 1)), makeRow(2, 15, new Date(2024, 3, 5))];
    const months = computeMonthlyStats(rows);

    expect(months).toHaveLength(1);
    expect(months[0]!.label).toBe('Apr 2024');
    expect(months[0]!.averageUnitsPerRound).toBe(10);
  });
});

describe('computeCumulativeSeries', () => {
  it('is monotonically non-decreasing and ends at the total', () => {
    const rows = [
      makeRow(1, 5, new Date(2024, 0, 1)),
      makeRow(2, 0, new Date(2024, 0, 2)),
      makeRow(3, 15, new Date(2024, 0, 3)),
    ];
    const series = computeCumulativeSeries(rows);

    expect(series).toHaveLength(3);
    for (let i = 1; i < series.length; i++) {
      expect(series[i]!.cumulative).toBeGreaterThanOrEqual(series[i - 1]!.cumulative);
    }
    expect(series[series.length - 1]!.cumulative).toBe(20);
  });
});

describe('findMissedRoundGaps', () => {
  it('returns no gaps for consecutive rounds', () => {
    const rows = [1, 2, 3].map(round => makeRow(round, 0, new Date(2024, 0, round)));
    expect(findMissedRoundGaps(rows)).toEqual([]);
  });

  it('detects a single gap', () => {
    const rows = [makeRow(1, 0, new Date(2024, 0, 1)), makeRow(5, 0, new Date(2024, 0, 5))];
    expect(findMissedRoundGaps(rows)).toEqual([{ afterRound: 1, beforeRound: 5, missingCount: 3 }]);
  });

  it('detects multiple gaps in order', () => {
    const rows = [1, 3, 4, 10].map(round => makeRow(round, 0, new Date(2024, 0, round)));
    expect(findMissedRoundGaps(rows)).toEqual([
      { afterRound: 1, beforeRound: 3, missingCount: 1 },
      { afterRound: 4, beforeRound: 10, missingCount: 5 },
    ]);
  });

  it('returns no gaps for a single-row input', () => {
    expect(findMissedRoundGaps([makeRow(1, 0, new Date(2024, 0, 1))])).toEqual([]);
    expect(findMissedRoundGaps([])).toEqual([]);
  });
});

describe('computeDayOfWeekStats', () => {
  it('always returns 7 entries in Sun-Sat order, even for empty input', () => {
    const stats = computeDayOfWeekStats([]);
    expect(stats).toHaveLength(7);
    expect(stats.map(s => s.label)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    expect(stats.every(s => s.roundsPlayed === 0 && s.totalUnitsWon === 0)).toBe(true);
  });

  it('buckets rows by day of week', () => {
    // 2024-01-01 is a Monday.
    const rows = [
      makeRow(1, 10, new Date(2024, 0, 1)), // Mon
      makeRow(2, 5, new Date(2024, 0, 8)), // Mon
      makeRow(3, 20, new Date(2024, 0, 2)), // Tue
    ];
    const stats = computeDayOfWeekStats(rows);
    const monday = stats.find(s => s.label === 'Mon')!;
    const tuesday = stats.find(s => s.label === 'Tue')!;

    expect(monday.roundsPlayed).toBe(2);
    expect(monday.totalUnitsWon).toBe(15);
    expect(monday.averageUnitsPerRound).toBe(7.5);
    expect(tuesday.roundsPlayed).toBe(1);
    expect(tuesday.totalUnitsWon).toBe(20);
  });
});
