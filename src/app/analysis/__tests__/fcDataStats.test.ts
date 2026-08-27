import { describe, expect, it } from 'vitest';

import type { FcDataRow } from '../../data/fcDataCsv';
import { wasmBetsIndicesToHash } from '../../wasmMath';
import {
  activeBetLineCount,
  classifyRoundReturn,
  computeBetShapeCounts,
  computeCumulativeSeries,
  computeMonthlyStats,
  computeReturnDistribution,
  computeRoiSeries,
  computeTotals,
  findMissedRoundGaps,
} from '../fcDataStats';

function makeRow(round: number, unitsWon: number, date: Date, url?: string): FcDataRow {
  return {
    date,
    rawDate: date.toISOString(),
    round,
    unitsWon,
    url: url ?? `https://neofood.club/#round=${round}`,
  };
}

/** Builds a NeoFoodClub bet URL encoding the given bet lines (each a 5-element arena pick array). */
function makeBetUrl(round: number, lines: number[][]): string {
  const flat = lines.flat();
  const hash = wasmBetsIndicesToHash(flat);
  return `https://neofood.club/#round=${round}&b=${hash}`;
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
      longestWinStreak: null,
      longestLossStreak: null,
      currentStreak: null,
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
    expect(totals.longestWinStreak).toBeNull();
    expect(totals.longestLossStreak).toEqual({
      count: 3,
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 0, 3),
    });
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
    expect(totals.longestLossStreak).toBeNull();
    expect(totals.longestWinStreak).toEqual({
      count: 3,
      totalUnitsWon: 35,
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 0, 3),
    });
  });

  it('finds the correct longest streak with alternating results', () => {
    // W, W, L, W, W, W, L
    const rows = [10, 5, 0, 3, 8, 12, 0].map((unitsWon, i) =>
      makeRow(i + 1, unitsWon, new Date(2024, 0, i + 1)),
    );
    const totals = computeTotals(rows);

    // The longest streak is the run of 3 wins (3, 8, 12), not the earlier run of 2 (10, 5),
    // spanning rows 4-6 (Jan 4-6).
    expect(totals.longestWinStreak).toEqual({
      count: 3,
      totalUnitsWon: 23,
      startDate: new Date(2024, 0, 4),
      endDate: new Date(2024, 0, 6),
    });
    expect(totals.longestLossStreak).toEqual({
      count: 1,
      startDate: new Date(2024, 0, 3),
      endDate: new Date(2024, 0, 3),
    });
  });

  it('breaks a tie for bestRound by taking the first occurrence', () => {
    const rows = [makeRow(1, 50, new Date(2024, 0, 1)), makeRow(2, 50, new Date(2024, 0, 2))];
    const totals = computeTotals(rows);

    expect(totals.bestRound).toBe(rows[0]);
  });

  it('reports an ongoing win streak when the most recent round won', () => {
    // L, W, W (still winning as of the last row)
    const rows = [0, 5, 10].map((unitsWon, i) =>
      makeRow(i + 1, unitsWon, new Date(2024, 0, i + 1)),
    );
    const totals = computeTotals(rows);

    expect(totals.currentStreak).toEqual({
      type: 'win',
      count: 2,
      totalUnitsWon: 15,
      startDate: new Date(2024, 0, 2),
      endDate: new Date(2024, 0, 3),
    });
  });

  it('reports an ongoing bust streak when the most recent round busted', () => {
    // W, L, L (still busting as of the last row)
    const rows = [10, 0, 0].map((unitsWon, i) =>
      makeRow(i + 1, unitsWon, new Date(2024, 0, i + 1)),
    );
    const totals = computeTotals(rows);

    expect(totals.currentStreak).toEqual({
      type: 'bust',
      count: 2,
      totalUnitsWon: 0,
      startDate: new Date(2024, 0, 2),
      endDate: new Date(2024, 0, 3),
    });
  });

  it('reports a current streak of 1 when the last round flips the trend', () => {
    // W, W, L
    const rows = [10, 5, 0].map((unitsWon, i) =>
      makeRow(i + 1, unitsWon, new Date(2024, 0, i + 1)),
    );
    const totals = computeTotals(rows);

    expect(totals.currentStreak).toEqual({
      type: 'bust',
      count: 1,
      totalUnitsWon: 0,
      startDate: new Date(2024, 0, 3),
      endDate: new Date(2024, 0, 3),
    });
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

describe('computeRoiSeries', () => {
  it('tracks running cumulative roi per round', () => {
    const oneLineUrl = makeBetUrl(1, [[1, 0, 0, 0, 0]]);
    const rows = [
      makeRow(1, 2, new Date(2024, 0, 1), oneLineUrl), // 2/1 = 2.0x
      makeRow(2, 0, new Date(2024, 0, 2), oneLineUrl), // (2+0)/(1+1) = 1.0x
      makeRow(3, 4, new Date(2024, 0, 3), oneLineUrl), // (2+0+4)/(1+1+1) = 2.0x
    ];
    const series = computeRoiSeries(rows);

    expect(series).toEqual([
      { round: 1, roi: 2 },
      { round: 2, roi: 1 },
      { round: 3, roi: 2 },
    ]);
  });

  it('is 0 for rounds with no active bet lines yet, avoiding division by zero', () => {
    const rows = [makeRow(1, 5, new Date(2024, 0, 1), 'https://neofood.club/#round=1')];
    expect(computeRoiSeries(rows)).toEqual([{ round: 1, roi: 0 }]);
  });

  it('returns an empty series for empty input', () => {
    expect(computeRoiSeries([])).toEqual([]);
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

describe('activeBetLineCount', () => {
  it('counts only lines with at least one non-zero pirate pick', () => {
    // Line 1 picks a pirate in arena 0; line 2 picks a pirate in arena 1; both active.
    const url = makeBetUrl(1, [
      [1, 0, 0, 0, 0],
      [0, 2, 0, 0, 0],
    ]);
    expect(activeBetLineCount(url)).toBe(2);
  });

  it('does not count all-zero lines', () => {
    const url = makeBetUrl(1, [
      [1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(activeBetLineCount(url)).toBe(1);
  });

  it('returns 0 for a URL with no bet hash', () => {
    expect(activeBetLineCount('https://neofood.club/#round=1')).toBe(0);
  });
});

describe('computeBetShapeCounts', () => {
  it('classifies a gambit-shaped bet: every arena has at most one distinct position across lines', () => {
    const url = makeBetUrl(1, [
      [1, 2, 0, 0, 0],
      [1, 2, 3, 0, 0],
    ]);
    const rows = [makeRow(1, 10, new Date(2024, 0, 1), url)];
    expect(computeBetShapeCounts(rows)).toEqual({
      gambitShaped: 1,
      bustproofShaped: 0,
      crazyShaped: 0,
      tenbetShaped: 0,
      other: 0,
      total: 1,
    });
  });

  it('classifies a bustproof-shaped bet: one arena has all 4 pirates covered', () => {
    const url = makeBetUrl(1, [
      [1, 0, 0, 0, 0],
      [2, 0, 0, 0, 0],
      [3, 0, 0, 0, 0],
      [4, 0, 0, 0, 0],
    ]);
    const rows = [makeRow(1, 10, new Date(2024, 0, 1), url)];
    expect(computeBetShapeCounts(rows)).toEqual({
      gambitShaped: 0,
      bustproofShaped: 1,
      crazyShaped: 0,
      tenbetShaped: 0,
      other: 0,
      total: 1,
    });
  });

  it('classifies a crazy-shaped bet: every line picks a pirate in all 5 arenas', () => {
    const url = makeBetUrl(1, [
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
    ]);
    const rows = [makeRow(1, 10, new Date(2024, 0, 1), url)];
    expect(computeBetShapeCounts(rows)).toEqual({
      gambitShaped: 0,
      bustproofShaped: 0,
      crazyShaped: 1,
      tenbetShaped: 0,
      other: 0,
      total: 1,
    });
  });

  it('classifies a tenbet-shaped bet: one arena position fixed, others vary', () => {
    const url = makeBetUrl(1, [
      [1, 2, 0, 0, 0],
      [1, 3, 0, 0, 0],
    ]);
    const rows = [makeRow(1, 10, new Date(2024, 0, 1), url)];
    expect(computeBetShapeCounts(rows)).toEqual({
      gambitShaped: 0,
      bustproofShaped: 0,
      crazyShaped: 0,
      tenbetShaped: 1,
      other: 0,
      total: 1,
    });
  });

  it('classifies as other when no arena is shared and it is not a gambit subset', () => {
    const url = makeBetUrl(1, [
      [1, 0, 0, 0, 0],
      [2, 0, 0, 0, 0],
    ]);
    const rows = [makeRow(1, 10, new Date(2024, 0, 1), url)];
    expect(computeBetShapeCounts(rows)).toEqual({
      gambitShaped: 0,
      bustproofShaped: 0,
      crazyShaped: 0,
      tenbetShaped: 0,
      other: 1,
      total: 1,
    });
  });

  it('classifies single-line bets as other, not gambit', () => {
    const rows = [makeRow(1, 10, new Date(2024, 0, 1), makeBetUrl(1, [[1, 0, 0, 0, 0]]))];
    expect(computeBetShapeCounts(rows).other).toBe(1);
  });

  it('skips rows with no active bet lines and returns zeroed counts for empty input', () => {
    expect(computeBetShapeCounts([])).toEqual({
      gambitShaped: 0,
      bustproofShaped: 0,
      crazyShaped: 0,
      tenbetShaped: 0,
      other: 0,
      total: 0,
    });
  });
});

describe('classifyRoundReturn', () => {
  const oneLineUrl = makeBetUrl(1, [[1, 0, 0, 0, 0]]);
  const twoLineUrl = makeBetUrl(1, [
    [1, 0, 0, 0, 0],
    [0, 2, 0, 0, 0],
  ]);

  it('classifies a round with no units won as bust', () => {
    expect(classifyRoundReturn(makeRow(1, 0, new Date(2024, 0, 1), oneLineUrl))).toBe('bust');
  });

  it('classifies under 1x per line as partial', () => {
    // 1 unit won / 2 active lines = 0.5x.
    expect(classifyRoundReturn(makeRow(1, 1, new Date(2024, 0, 1), twoLineUrl))).toBe('partial');
  });

  it('classifies 1x up to 2x per line as profit (inclusive of 1x)', () => {
    expect(classifyRoundReturn(makeRow(1, 1, new Date(2024, 0, 1), oneLineUrl))).toBe('profit');
  });

  it('classifies 2x or more per line as double', () => {
    expect(classifyRoundReturn(makeRow(1, 2, new Date(2024, 0, 1), oneLineUrl))).toBe('double');
  });
});

describe('computeReturnDistribution', () => {
  it('counts rounds into buckets and tracks the total', () => {
    const oneLineUrl = makeBetUrl(1, [[1, 0, 0, 0, 0]]);
    const rows = [
      makeRow(1, 0, new Date(2024, 0, 1), oneLineUrl), // bust
      makeRow(2, 1, new Date(2024, 0, 2), oneLineUrl), // profit (1x)
      makeRow(3, 2, new Date(2024, 0, 3), oneLineUrl), // double
    ];
    expect(computeReturnDistribution(rows)).toEqual({
      bust: 1,
      partial: 0,
      profit: 1,
      double: 1,
      total: 3,
    });
  });

  it('returns all-zero counts for empty input', () => {
    expect(computeReturnDistribution([])).toEqual({
      bust: 0,
      partial: 0,
      profit: 0,
      double: 0,
      total: 0,
    });
  });
});

describe('computeMonthlyStats roi', () => {
  it('divides total units won by total active bet lines for the month', () => {
    const url1 = makeBetUrl(1, [
      [1, 0, 0, 0, 0],
      [0, 2, 0, 0, 0],
    ]); // 2 active lines
    const url2 = makeBetUrl(2, [[3, 0, 0, 0, 0]]); // 1 active line
    const rows = [
      makeRow(1, 6, new Date(2024, 0, 1), url1),
      makeRow(2, 3, new Date(2024, 0, 2), url2),
    ];
    const months = computeMonthlyStats(rows);

    // (6 + 3) units won / (2 + 1) active lines = 3.0x
    expect(months[0]!.roi).toBe(3);
  });

  it('is 0 when there are no active bet lines to avoid dividing by zero', () => {
    const rows = [makeRow(1, 5, new Date(2024, 0, 1), 'https://neofood.club/#round=1')];
    const months = computeMonthlyStats(rows);

    expect(months[0]!.roi).toBe(0);
  });

  it('accumulates roi across months in cumulativeRoi', () => {
    const oneLineUrl = makeBetUrl(1, [[1, 0, 0, 0, 0]]);
    const rows = [
      // January: 2 units won / 1 line = 2.0x that month.
      makeRow(1, 2, new Date(2024, 0, 1), oneLineUrl),
      // February: 0 units won / 1 line = 0.0x that month, but cumulative
      // stays (2 + 0) / (1 + 1) = 1.0x.
      makeRow(2, 0, new Date(2024, 1, 1), oneLineUrl),
    ];
    const months = computeMonthlyStats(rows);

    expect(months[0]!.roi).toBe(2);
    expect(months[0]!.cumulativeRoi).toBe(2);
    expect(months[1]!.roi).toBe(0);
    expect(months[1]!.cumulativeRoi).toBe(1);
  });
});
