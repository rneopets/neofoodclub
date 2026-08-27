import { describe, expect, it } from 'vitest';

import type { BacktestRound } from '../../backtest/types';
import type { FcDataRow } from '../../data/fcDataCsv';
import { wasmBetsIndicesToHash } from '../../wasmMath';
import { computeAdvancedStats } from '../fcDataAdvancedStats';

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

  it('computes fingerprint averages and the 10-line share', () => {
    // 10 lines, each with exactly one pick so every line is "active".
    const tenLines = Array.from({ length: 10 }, (_, i) => {
      const line = [0, 0, 0, 0, 0];
      line[i % 5] = (i % 4) + 1;
      return line;
    });
    const rows = [
      makeRow(1, 10, [[1, 2, 0, 0, 0]]), // 1 line, 2 pirates
      makeRow(2, 10, tenLines), // 10 active lines
    ];
    const roundsByNumber = new Map([
      [1, makeRound(1)],
      [2, makeRound(2)],
    ]);
    const stats = computeAdvancedStats(rows, roundsByNumber);

    expect(stats.fingerprint.matchedRounds).toBe(2);
    expect(stats.fingerprint.tenLineShare).toBe(0.5); // 1 of 2 rounds had exactly 10 lines
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
      tenLineShare: 0,
    });
  });
});
