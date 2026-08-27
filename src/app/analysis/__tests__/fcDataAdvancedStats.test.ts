import { describe, expect, it } from 'vitest';

import type { BacktestRound } from '../../backtest/types';
import type { FcDataRow } from '../../data/fcDataCsv';
import { wasmBetsIndicesToHash } from '../../wasmMath';
import { computeAdvancedStats, findMissedRoundGapsFromFeed } from '../fcDataAdvancedStats';

/** 5 arenas x 4 pirates: arena N gets pirate IDs [4N+1 .. 4N+4]. */
function makeRound(round: number): BacktestRound {
  return {
    round,
    pirates: [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
      [17, 18, 19, 20],
    ],
    openingOdds: [],
    currentOdds: [],
    winners: [1, 1, 1, 1, 1],
  };
}

function makeRow(round: number, unitsWon: number, lines: number[][]): FcDataRow {
  const flat = lines.flat();
  const hash = wasmBetsIndicesToHash(flat);
  return {
    date: new Date(2024, 0, round),
    rawDate: '',
    round,
    unitsWon,
    url: `https://neofood.club/#round=${round}&b=${hash}`,
  };
}

describe('computeAdvancedStats', () => {
  it('separates matched rounds from unmatched (not present in the feed)', () => {
    const rows = [
      makeRow(1, 5, [[1, 0, 0, 0, 0]]),
      makeRow(2, 5, [[1, 0, 0, 0, 0]]), // no round 2 in the feed
    ];
    const roundsByNumber = new Map([[1, makeRound(1)]]);
    const stats = computeAdvancedStats(rows, roundsByNumber);

    expect(stats.fingerprint.matchedRounds).toBe(1);
    expect(stats.fingerprint.unmatchedRounds).toBe(1);
  });

  it('maps decoded arena positions to real pirate identities via the round grid', () => {
    // Arena 0 position 1 -> pirate 1; arena 1 position 2 -> pirate 6.
    const rows = [makeRow(1, 10, [[1, 2, 0, 0, 0]])];
    const roundsByNumber = new Map([[1, makeRound(1)]]);
    const stats = computeAdvancedStats(rows, roundsByNumber);

    const ids = stats.pirateExposure.map(p => p.pirateId).sort((a, b) => a - b);
    expect(ids).toEqual([1, 6]);
    expect(stats.pirateExposure.find(p => p.pirateId === 1)?.name).toBe('Dan');
  });

  it('tracks pirate participation rate, average lines when included, and co-occurring units won', () => {
    const rows = [
      makeRow(1, 10, [[1, 0, 0, 0, 0]]), // pirate 1 in 1 line
      makeRow(
        2,
        20,
        [
          [1, 0, 0, 0, 0],
          [1, 0, 0, 0, 0],
        ], // pirate 1 in both lines this round
      ),
    ];
    const roundsByNumber = new Map([
      [1, makeRound(1)],
      [2, makeRound(2)],
    ]);
    const stats = computeAdvancedStats(rows, roundsByNumber);

    const pirate1 = stats.pirateExposure.find(p => p.pirateId === 1)!;
    expect(pirate1.roundsIncluded).toBe(2);
    expect(pirate1.roundParticipationRate).toBe(1);
    expect(pirate1.averageLinesWhenIncluded).toBe(1.5); // (1 + 2) / 2
    expect(pirate1.averageUnitsWonWhenIncluded).toBe(15); // (10 + 20) / 2
  });

  it("identifies the pirate present in every line of a round as that round's anchor", () => {
    const rows = [
      makeRow(1, 10, [
        [1, 2, 0, 0, 0],
        [1, 3, 0, 0, 0],
      ]),
    ];
    const roundsByNumber = new Map([[1, makeRound(1)]]);
    const stats = computeAdvancedStats(rows, roundsByNumber);

    expect(stats.favoriteAnchorPirate).toEqual({
      pirateId: 1,
      name: 'Dan',
      anchorRoundCount: 1,
      share: 1,
    });
  });

  it('is null for favoriteAnchorPirate when no round has a consistent anchor', () => {
    const rows = [
      makeRow(1, 10, [
        [1, 0, 0, 0, 0],
        [2, 0, 0, 0, 0],
      ]),
    ];
    const roundsByNumber = new Map([[1, makeRound(1)]]);
    const stats = computeAdvancedStats(rows, roundsByNumber);

    expect(stats.favoriteAnchorPirate).toBeNull();
  });

  it('computes arena usage as a share of all active lines', () => {
    const rows = [makeRow(1, 10, [[1, 2, 0, 0, 0]])]; // 1 line, picks in arena 0 and 1 only
    const roundsByNumber = new Map([[1, makeRound(1)]]);
    const stats = computeAdvancedStats(rows, roundsByNumber);

    expect(stats.arenaUsage[0]).toMatchObject({ name: 'Shipwreck', lineParticipationRate: 1 });
    expect(stats.arenaUsage[1]).toMatchObject({ name: 'Lagoon', lineParticipationRate: 1 });
    expect(stats.arenaUsage[2]).toMatchObject({ name: 'Treasure', lineParticipationRate: 0 });
  });

  it('computes fingerprint averages across matched rounds', () => {
    const rows = [
      makeRow(1, 10, [[1, 2, 0, 0, 0]]), // 1 line, 2 pirates
      makeRow(2, 10, [
        [3, 0, 0, 0, 0],
        [3, 4, 0, 0, 0],
      ]), // 2 lines, 2 pirates
    ];
    const roundsByNumber = new Map([
      [1, makeRound(1)],
      [2, makeRound(2)],
    ]);
    const stats = computeAdvancedStats(rows, roundsByNumber);

    expect(stats.fingerprint.matchedRounds).toBe(2);
  });

  it('returns empty/zeroed results for no rows', () => {
    const stats = computeAdvancedStats([], new Map());
    expect(stats.pirateExposure).toEqual([]);
    expect(stats.favoriteAnchorPirate).toBeNull();
    expect(stats.fingerprint).toEqual({
      matchedRounds: 0,
      unmatchedRounds: 0,
      averagePiratesPerLine: 0,
      averageUniquePiratesPerRound: 0,
    });
  });
});

function makeSimpleRow(round: number): FcDataRow {
  return {
    date: new Date(2024, 0, round),
    rawDate: '',
    round,
    unitsWon: 0,
    url: `https://neofood.club/#round=${round}`,
  };
}

describe('findMissedRoundGapsFromFeed', () => {
  it('does not report a gap when the missing rounds never existed in the feed', () => {
    // Rounds 2-4 are absent from the CSV *and* from the feed (e.g. a maintenance outage).
    const rows = [makeSimpleRow(1), makeSimpleRow(5)];
    const roundsByNumber = new Map([
      [1, makeRound(1)],
      [5, makeRound(5)],
    ]);

    expect(findMissedRoundGapsFromFeed(rows, roundsByNumber)).toEqual([]);
  });

  it('reports a gap only for rounds that exist in the feed but are missing from the CSV', () => {
    const rows = [makeSimpleRow(1), makeSimpleRow(5)];
    // Rounds 2 and 3 really happened (in the feed); round 4 never did.
    const roundsByNumber = new Map([
      [1, makeRound(1)],
      [2, makeRound(2)],
      [3, makeRound(3)],
      [5, makeRound(5)],
    ]);

    expect(findMissedRoundGapsFromFeed(rows, roundsByNumber)).toEqual([
      { afterRound: 1, beforeRound: 5, missingCount: 2 },
    ]);
  });

  it('returns no gaps for a single-row input', () => {
    expect(findMissedRoundGapsFromFeed([makeSimpleRow(1)], new Map())).toEqual([]);
  });

  it('returns no gaps for empty input', () => {
    expect(findMissedRoundGapsFromFeed([], new Map())).toEqual([]);
  });
});
