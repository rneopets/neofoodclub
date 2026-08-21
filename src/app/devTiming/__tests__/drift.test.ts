import { describe, expect, it } from 'vitest';

import {
  SCRAPER_LAG_TOLERANCE_MINUTES,
  classifyDrift,
  computeDrift,
  computeOffsetMinutes,
  expectedEndUtcFor,
  summarizeDrift,
} from '../drift';

describe('expectedEndUtcFor', () => {
  it('is DST-aware: a summer and winter end at the same Pacific wall-clock time map to different UTC instants', () => {
    const summer = new Date('2026-08-15T21:15:00Z'); // 2:15 PM PDT
    const winter = new Date('2026-01-15T22:15:00Z'); // 2:15 PM PST

    expect(expectedEndUtcFor(summer).getTime()).toBe(new Date('2026-08-15T21:15:00Z').getTime());
    expect(expectedEndUtcFor(winter).getTime()).toBe(new Date('2026-01-15T22:15:00Z').getTime());
  });

  it('anchors to the Pacific date of the actual end, not the UTC date', () => {
    // 2026-08-15T07:15:00Z is 12:15 AM PDT on Aug 15 - same Pacific day.
    const lateNight = new Date('2026-08-15T07:15:00Z');
    expect(expectedEndUtcFor(lateNight).getTime()).toBe(new Date('2026-08-15T21:15:00Z').getTime());
  });
});

describe('computeOffsetMinutes', () => {
  it('is ~0 when the round ends exactly at the expected time (summer)', () => {
    expect(computeOffsetMinutes(new Date('2026-08-15T21:15:00Z'))).toBeCloseTo(0, 3);
  });

  it('is ~0 when the round ends exactly at the expected time (winter)', () => {
    expect(computeOffsetMinutes(new Date('2026-01-15T22:15:00Z'))).toBeCloseTo(0, 3);
  });

  it('is positive when the round ends late', () => {
    // 2:17 PM PDT = +2 min.
    expect(computeOffsetMinutes(new Date('2026-08-15T21:17:00Z'))).toBeCloseTo(2, 3);
    // 5:15 PM PDT = +3 hours.
    expect(computeOffsetMinutes(new Date('2026-08-15T00:15:00Z'))).toBeCloseTo(180, 3);
  });

  it('is negative when the round ends early', () => {
    // 2:10 PM PDT = -5 min.
    expect(computeOffsetMinutes(new Date('2026-08-15T21:10:00Z'))).toBeCloseTo(-5, 3);
  });
});

describe('classifyDrift', () => {
  it('treats ends up to and including the tolerance as scraper lag, not drift', () => {
    expect(classifyDrift(0)).toBe('scraperLag');
    expect(classifyDrift(SCRAPER_LAG_TOLERANCE_MINUTES)).toBe('scraperLag');
    expect(classifyDrift(1.5)).toBe('scraperLag');
  });

  it('treats anything just past the tolerance as late drift', () => {
    expect(classifyDrift(SCRAPER_LAG_TOLERANCE_MINUTES + 0.01)).toBe('lateDrift');
    expect(classifyDrift(30)).toBe('lateDrift');
  });

  it('treats anything before the expected time as early', () => {
    expect(classifyDrift(-0.01)).toBe('early');
    expect(classifyDrift(-60)).toBe('early');
  });
});

describe('computeDrift', () => {
  it('skips rows with unparseable timestamps and classifies the rest', () => {
    const points = computeDrift([
      { round: 1, timestamp: '2026-08-15T21:15:30Z' }, // +0.5 min -> scraperLag
      { round: 2, timestamp: 'not-a-date' }, // skipped
      { round: 3, timestamp: '2026-08-15T22:45:00Z' }, // +90 min -> lateDrift
      { round: 4, timestamp: '2026-08-15T21:00:00Z' }, // -15 min -> early
    ]);

    expect(points.map(p => p.round)).toEqual([1, 3, 4]);
    expect(points[0]!.status).toBe('scraperLag');
    expect(points[1]!.status).toBe('lateDrift');
    expect(points[2]!.status).toBe('early');
    expect(points[1]!.offsetMinutes).toBeCloseTo(90, 3);
  });

  it('returns an empty array for no input', () => {
    expect(computeDrift([])).toEqual([]);
  });
});

describe('summarizeDrift', () => {
  it('counts statuses and finds the most delayed round', () => {
    const points = computeDrift([
      { round: 1, timestamp: '2026-08-15T21:15:30Z' }, // scraperLag
      { round: 2, timestamp: '2026-08-15T23:45:00Z' }, // +150 min lateDrift
      { round: 3, timestamp: '2026-08-15T22:45:00Z' }, // +90 min lateDrift
      { round: 4, timestamp: '2026-08-15T21:00:00Z' }, // early
    ]);

    const summary = summarizeDrift(points);
    expect(summary.countEarly).toBe(1);
    expect(summary.countScraperLag).toBe(1);
    expect(summary.countLateDrift).toBe(2);
    expect(summary.mostDelayedRound).toBe(2);
    expect(summary.maxOffsetMinutes).toBeCloseTo(150, 3);
  });

  it('reports null for the most-delayed fields when nothing ended late', () => {
    const points = computeDrift([
      { round: 1, timestamp: '2026-08-15T21:15:30Z' }, // scraperLag
      { round: 2, timestamp: '2026-08-15T21:00:00Z' }, // early
    ]);

    const summary = summarizeDrift(points);
    expect(summary.mostDelayedRound).toBeNull();
    expect(summary.maxOffsetMinutes).toBeNull();
  });
});
