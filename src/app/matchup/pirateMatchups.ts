import type { BacktestRound } from '../backtest/types';

/** Which side took a shared arena: `a`, `b`, or neither (the other two pirates won). */
export type MatchupOutcome = 'a' | 'b' | 'neither';

/** One round in which both pirates were placed in the same arena. */
export interface MatchupEncounter {
  round: number;
  arena: number;
  outcome: MatchupOutcome;
}

export interface ArenaMatchupBreakdown {
  arena: number;
  sharedCount: number;
  aWins: number;
  bWins: number;
  neitherCount: number;
}

export interface MatchupSummary {
  sharedRounds: number;
  aWins: number;
  bWins: number;
  neitherCount: number;
  /** A's share of *decided* encounters (aWins / (aWins + bWins)), null when undecided. */
  headToHeadA: number | null;
  /** B's share of *decided* encounters (bWins / (aWins + bWins)), null when undecided. */
  headToHeadB: number | null;
}

export interface WinStreak {
  count: number;
  startRound: number;
  endRound: number;
}

/**
 * Scans every completed round and records each arena in which both pirates were
 * placed together. Because all 20 pirates appear exactly once per round (one per
 * arena slot), a pair can share at most one arena in any given round - so the
 * encounter count equals "played the same arena N times".
 */
export function findSharedEncounters(
  rounds: BacktestRound[],
  aId: number,
  bId: number,
): MatchupEncounter[] {
  const encounters: MatchupEncounter[] = [];

  for (const round of rounds) {
    const winners = round.winners;
    if (!winners || winners.length !== 5) {
      continue;
    }

    for (let arena = 0; arena < 5; arena++) {
      const roster = round.pirates[arena];
      if (!Array.isArray(roster)) {
        continue;
      }

      const aSlot = roster.indexOf(aId);
      if (aSlot === -1) {
        continue;
      }
      const bSlot = roster.indexOf(bId);
      if (bSlot === -1) {
        continue;
      }

      const winnerSlot = winners[arena];
      const winningId = winnerSlot !== undefined ? roster[winnerSlot - 1] : undefined;
      let outcome: MatchupOutcome;
      if (winningId === aId) {
        outcome = 'a';
      } else if (winningId === bId) {
        outcome = 'b';
      } else {
        outcome = 'neither';
      }

      encounters.push({ round: round.round, arena, outcome });
    }
  }

  return encounters;
}

/** Aggregates an encounter list into the headline "who won how often" numbers. */
export function summarizeMatchup(encounters: MatchupEncounter[]): MatchupSummary {
  let aWins = 0;
  let bWins = 0;
  let neitherCount = 0;

  for (const encounter of encounters) {
    if (encounter.outcome === 'a') {
      aWins += 1;
    } else if (encounter.outcome === 'b') {
      bWins += 1;
    } else {
      neitherCount += 1;
    }
  }

  const decided = aWins + bWins;
  return {
    sharedRounds: encounters.length,
    aWins,
    bWins,
    neitherCount,
    headToHeadA: decided > 0 ? aWins / decided : null,
    headToHeadB: decided > 0 ? bWins / decided : null,
  };
}

/** Per-arena totals, always in arena order 0-4 (arenas with no shared rounds are zeroed). */
export function arenaBreakdown(encounters: MatchupEncounter[]): ArenaMatchupBreakdown[] {
  const breakdown = Array.from({ length: 5 }, (_, arena) => ({
    arena,
    sharedCount: 0,
    aWins: 0,
    bWins: 0,
    neitherCount: 0,
  }));

  for (const encounter of encounters) {
    const row = breakdown[encounter.arena];
    if (!row) {
      continue;
    }
    row.sharedCount += 1;
    if (encounter.outcome === 'a') {
      row.aWins += 1;
    } else if (encounter.outcome === 'b') {
      row.bWins += 1;
    } else {
      row.neitherCount += 1;
    }
  }

  return breakdown;
}

/** Longest run of consecutive encounters won by `outcome`, or null if never. */
export function longestWinStreak(
  encounters: MatchupEncounter[],
  outcome: Exclude<MatchupOutcome, 'neither'>,
): WinStreak | null {
  let best: WinStreak | null = null;
  let runStart = -1;

  for (let i = 0; i < encounters.length; i++) {
    const isWin = encounters[i]!.outcome === outcome;
    if (isWin && runStart === -1) {
      runStart = i;
    } else if (!isWin && runStart !== -1) {
      const count = i - runStart;
      if (!best || count > best.count) {
        best = {
          count,
          startRound: encounters[runStart]!.round,
          endRound: encounters[i - 1]!.round,
        };
      }
      runStart = -1;
    }
  }

  if (runStart !== -1) {
    const count = encounters.length - runStart;
    if (!best || count > best.count) {
      best = {
        count,
        startRound: encounters[runStart]!.round,
        endRound: encounters[encounters.length - 1]!.round,
      };
    }
  }

  return best;
}

/** Consecutive wins by `outcome` at the *end* of the encounter list, or null if not on a streak. */
export function currentStreak(
  encounters: MatchupEncounter[],
  outcome: Exclude<MatchupOutcome, 'neither'>,
): WinStreak | null {
  let i = encounters.length - 1;
  while (i >= 0 && encounters[i]!.outcome === outcome) {
    i -= 1;
  }

  if (i === encounters.length - 1) {
    return null; // last encounter was not a win by this side (or no encounters)
  }

  return {
    count: encounters.length - 1 - i,
    startRound: encounters[i + 1]!.round,
    endRound: encounters[encounters.length - 1]!.round,
  };
}

/** Running net win differential (+1 for `a`, -1 for `b`, 0 for neither) across encounters. */
export function cumulativeNetDiff(encounters: MatchupEncounter[]): number[] {
  const series: number[] = [];
  let diff = 0;

  for (const encounter of encounters) {
    if (encounter.outcome === 'a') {
      diff += 1;
    } else if (encounter.outcome === 'b') {
      diff -= 1;
    }
    series.push(diff);
  }

  return series;
}
