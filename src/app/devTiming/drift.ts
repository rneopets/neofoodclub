import { fromZonedTime, toZonedTime } from 'date-fns-tz';

import { findRoundGaps, type RoundGap } from '../util/roundGaps';

import type { RoundTiming } from './roundTiming';

export const PACIFIC_TIMEZONE = 'America/Los_Angeles';
export const EXPECTED_END_HOUR = 14;
export const EXPECTED_END_MINUTE = 15;

/**
 * The scraper doesn't post winners instantly, so an end time up to this many
 * minutes after the expected 2:15 PM is treated as normal scraper lag, not
 * drift.
 */
export const SCRAPER_LAG_TOLERANCE_MINUTES = 2;

export type DriftStatus = 'early' | 'scraperLag' | 'lateDrift';

export interface DriftPoint {
  round: number;
  timestamp: string;
  offsetMinutes: number;
  status: DriftStatus;
}

export interface DriftSummary {
  countEarly: number;
  countScraperLag: number;
  countLateDrift: number;
  mostDelayedRound: number | null;
  maxOffsetMinutes: number | null;
}

/** A run of round numbers with no end-time data at all - e.g. a NeoFoodClub outage. */
export type DriftDataGap = RoundGap;

/**
 * Builds the expected end-of-round instant (2:15 PM Pacific, DST-aware) for
 * whichever day the given actual end time falls on. `toZonedTime` returns a
 * Date whose wall-clock fields are the Pacific time of that instant, so we can
 * read off its local date and construct 2:15 PM on that same day.
 */
export function expectedEndUtcFor(actualEndUtc: Date): Date {
  const zoned = toZonedTime(actualEndUtc, PACIFIC_TIMEZONE);
  return fromZonedTime(
    new Date(
      zoned.getFullYear(),
      zoned.getMonth(),
      zoned.getDate(),
      EXPECTED_END_HOUR,
      EXPECTED_END_MINUTE,
    ),
    PACIFIC_TIMEZONE,
  );
}

export function computeOffsetMinutes(actualEndUtc: Date): number {
  return (actualEndUtc.getTime() - expectedEndUtcFor(actualEndUtc).getTime()) / 60_000;
}

export function classifyDrift(offsetMinutes: number): DriftStatus {
  if (offsetMinutes < 0) {
    return 'early';
  }
  if (offsetMinutes <= SCRAPER_LAG_TOLERANCE_MINUTES) {
    return 'scraperLag';
  }
  return 'lateDrift';
}

export function computeDrift(timings: RoundTiming[]): DriftPoint[] {
  const points: DriftPoint[] = [];

  for (const timing of timings) {
    const actualEndUtc = new Date(timing.timestamp);
    if (Number.isNaN(actualEndUtc.getTime())) {
      continue;
    }

    const offsetMinutes = computeOffsetMinutes(actualEndUtc);
    points.push({
      round: timing.round,
      timestamp: timing.timestamp,
      offsetMinutes,
      status: classifyDrift(offsetMinutes),
    });
  }

  return points;
}

export function summarizeDrift(points: DriftPoint[]): DriftSummary {
  let countEarly = 0;
  let countScraperLag = 0;
  let countLateDrift = 0;
  let mostDelayedRound: number | null = null;
  let maxOffsetMinutes: number | null = null;

  for (const point of points) {
    switch (point.status) {
      case 'early':
        countEarly += 1;
        break;
      case 'scraperLag':
        countScraperLag += 1;
        break;
      case 'lateDrift':
        countLateDrift += 1;
        if (maxOffsetMinutes === null || point.offsetMinutes > maxOffsetMinutes) {
          maxOffsetMinutes = point.offsetMinutes;
          mostDelayedRound = point.round;
        }
        break;
    }
  }

  return {
    countEarly,
    countScraperLag,
    countLateDrift,
    mostDelayedRound,
    maxOffsetMinutes,
  };
}

/**
 * Finds round-number ranges within `points` that have no end-time data at
 * all, assuming `points` is sorted ascending by round (as `computeDrift`
 * produces). A gap here means the feed itself has nothing for those rounds -
 * most commonly because NeoFoodClub didn't run them (a maintenance outage),
 * not that this chart's round-range filter excluded them.
 */
export function findDriftDataGaps(points: DriftPoint[]): DriftDataGap[] {
  return findRoundGaps(points.map(point => point.round));
}
