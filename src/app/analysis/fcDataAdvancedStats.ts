import type { BacktestRound } from '../backtest/types';
import { ARENA_NAMES, PIRATE_NAMES } from '../constants';
import type { FcDataRow } from '../data/fcDataCsv';
import { parseBetUrl } from '../util';

export interface FcDataPirateExposure {
  pirateId: number;
  name: string;
  roundsIncluded: number;
  /** roundsIncluded / total matched rounds, 0..1. */
  roundParticipationRate: number;
  /** Average number of active lines (within a round) that include this pirate, among rounds where included. */
  averageLinesWhenIncluded: number;
  /** Average unitsWon in rounds where this pirate was included (co-occurrence proxy, not true per-pirate attribution). */
  averageUnitsWonWhenIncluded: number;
  /** Rounds where this pirate appeared in literally every active line that round. */
  anchorRoundCount: number;
}

export interface FcDataArenaUsage {
  arenaIndex: number;
  name: string;
  /** Share of active bet lines (across matched rounds) that included a pick in this arena, 0..1. */
  lineParticipationRate: number;
}

export interface FcDataBetShapeCounts {
  /** Every active line's picks are a subset of one fixed 5-pirate combo (see `classifyBetShape`). */
  gambitShaped: number;
  /** One (arena, pirate) pair is held fixed across every active line. */
  tenbetShaped: number;
  other: number;
  total: number;
}

export interface FcDataAdvancedFingerprint {
  matchedRounds: number;
  unmatchedRounds: number;
  averagePiratesPerLine: number;
  averageUniquePiratesPerRound: number;
  /** Share of matched rounds with exactly 10 active bet lines, 0..1. */
  tenLineShare: number;
}

export interface FcDataFavoriteAnchor {
  pirateId: number;
  name: string;
  anchorRoundCount: number;
  /** anchorRoundCount / matched rounds, 0..1. */
  share: number;
}

export interface FcDataAdvancedStats {
  /** Sorted by roundParticipationRate descending. */
  pirateExposure: FcDataPirateExposure[];
  /** In arena order (Shipwreck..Harpoon). */
  arenaUsage: FcDataArenaUsage[];
  betShapes: FcDataBetShapeCounts;
  fingerprint: FcDataAdvancedFingerprint;
  favoriteAnchorPirate: FcDataFavoriteAnchor | null;
}

/** One entry per active bet line: 5 positions (1-4, or 0 for "no pick"), one per arena. */
function decodeActiveLines(url: string): number[][] {
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

/**
 * Classifies a round's decoded bet lines by structure:
 * - `gambit`: every arena has at most one distinct nonzero position across
 *   all lines (every line is a subset of one fixed 5-pirate combo).
 * - `tenbet`: some arena holds one fixed nonzero position across every
 *   line (one "anchor" pirate present in every line), while other arenas vary.
 * - `other`: neither shape, or too few lines to tell (single-line bets).
 */
function classifyBetShape(lines: number[][]): 'gambit' | 'tenbet' | 'other' {
  if (lines.length <= 1) {
    return 'other';
  }

  let isGambit = true;
  for (let arena = 0; arena < 5; arena++) {
    const positions = new Set(
      lines.map(line => line[arena]).filter((p): p is number => !!p && p > 0),
    );
    if (positions.size > 1) {
      isGambit = false;
      break;
    }
  }
  if (isGambit) {
    return 'gambit';
  }

  for (let arena = 0; arena < 5; arena++) {
    const first = lines[0]![arena]!;
    if (first > 0 && lines.every(line => line[arena] === first)) {
      return 'tenbet';
    }
  }

  return 'other';
}

interface PirateAggregate {
  roundsIncluded: number;
  lineSum: number;
  unitsWonSum: number;
  anchorRoundCount: number;
}

export function computeAdvancedStats(
  rows: FcDataRow[],
  roundsByNumber: Map<number, BacktestRound>,
): FcDataAdvancedStats {
  const pirateAgg = new Map<number, PirateAggregate>();
  const arenaLineCount = [0, 0, 0, 0, 0];
  const betShapes: FcDataBetShapeCounts = { gambitShaped: 0, tenbetShaped: 0, other: 0, total: 0 };

  let totalActiveLines = 0;
  let totalPirateLinePicks = 0;
  let uniquePiratesPerRoundSum = 0;
  let tenLineRounds = 0;
  let matchedRounds = 0;
  let unmatchedRounds = 0;

  for (const row of rows) {
    const round = roundsByNumber.get(row.round);
    if (!round) {
      unmatchedRounds += 1;
      continue;
    }
    matchedRounds += 1;

    const lines = decodeActiveLines(row.url);
    if (lines.length === 0) {
      continue;
    }

    if (lines.length === 10) {
      tenLineRounds += 1;
    }

    const shape = classifyBetShape(lines);
    betShapes[
      shape === 'gambit' ? 'gambitShaped' : shape === 'tenbet' ? 'tenbetShaped' : 'other'
    ] += 1;
    betShapes.total += 1;

    const pirateLineCounts = new Map<number, number>();

    for (const line of lines) {
      totalActiveLines += 1;
      for (let arena = 0; arena < 5; arena++) {
        const position = line[arena] ?? 0;
        if (position <= 0) {
          continue;
        }
        arenaLineCount[arena] = (arenaLineCount[arena] ?? 0) + 1;
        totalPirateLinePicks += 1;

        const pirateId = round.pirates[arena]?.[position - 1];
        if (!pirateId) {
          continue;
        }
        pirateLineCounts.set(pirateId, (pirateLineCounts.get(pirateId) ?? 0) + 1);
      }
    }

    uniquePiratesPerRoundSum += pirateLineCounts.size;

    let anchorPirateId: number | null = null;
    for (const [pirateId, count] of pirateLineCounts) {
      if (count === lines.length) {
        anchorPirateId = pirateId;
        break;
      }
    }

    for (const [pirateId, lineCount] of pirateLineCounts) {
      const agg = pirateAgg.get(pirateId) ?? {
        roundsIncluded: 0,
        lineSum: 0,
        unitsWonSum: 0,
        anchorRoundCount: 0,
      };
      agg.roundsIncluded += 1;
      agg.lineSum += lineCount;
      agg.unitsWonSum += row.unitsWon;
      if (pirateId === anchorPirateId) {
        agg.anchorRoundCount += 1;
      }
      pirateAgg.set(pirateId, agg);
    }
  }

  const pirateExposure: FcDataPirateExposure[] = Array.from(pirateAgg.entries())
    .map(([pirateId, agg]) => ({
      pirateId,
      name: PIRATE_NAMES.get(pirateId) ?? `Pirate ${pirateId}`,
      roundsIncluded: agg.roundsIncluded,
      roundParticipationRate: matchedRounds > 0 ? agg.roundsIncluded / matchedRounds : 0,
      averageLinesWhenIncluded: agg.roundsIncluded > 0 ? agg.lineSum / agg.roundsIncluded : 0,
      averageUnitsWonWhenIncluded:
        agg.roundsIncluded > 0 ? agg.unitsWonSum / agg.roundsIncluded : 0,
      anchorRoundCount: agg.anchorRoundCount,
    }))
    .sort((a, b) => b.roundParticipationRate - a.roundParticipationRate);

  const arenaUsage: FcDataArenaUsage[] = ARENA_NAMES.map((name, arenaIndex) => ({
    arenaIndex,
    name,
    lineParticipationRate:
      totalActiveLines > 0 ? (arenaLineCount[arenaIndex] ?? 0) / totalActiveLines : 0,
  }));

  let favoriteAnchorPirate: FcDataFavoriteAnchor | null = null;
  for (const pirate of pirateExposure) {
    if (pirate.anchorRoundCount === 0) {
      continue;
    }
    if (!favoriteAnchorPirate || pirate.anchorRoundCount > favoriteAnchorPirate.anchorRoundCount) {
      favoriteAnchorPirate = {
        pirateId: pirate.pirateId,
        name: pirate.name,
        anchorRoundCount: pirate.anchorRoundCount,
        share: matchedRounds > 0 ? pirate.anchorRoundCount / matchedRounds : 0,
      };
    }
  }

  return {
    pirateExposure,
    arenaUsage,
    betShapes,
    fingerprint: {
      matchedRounds,
      unmatchedRounds,
      averagePiratesPerLine: totalActiveLines > 0 ? totalPirateLinePicks / totalActiveLines : 0,
      averageUniquePiratesPerRound:
        matchedRounds > 0 ? uniquePiratesPerRoundSum / matchedRounds : 0,
      tenLineShare: matchedRounds > 0 ? tenLineRounds / matchedRounds : 0,
    },
    favoriteAnchorPirate,
  };
}
