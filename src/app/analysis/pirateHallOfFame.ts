import { PIRATE_NAMES } from '../constants';

/** The minimal round shape pirate win statistics need. */
export interface PirateHallOfFameRound {
  round: number;
  /** Pirates per arena, 0-indexed (pirates[arena] is the arena's pirate id list). */
  pirates: number[][];
  /** Winning slot per arena, 1-indexed (winners[arena] is 1-4). */
  winners: number[];
}

export interface PirateHallOfFameEntry {
  pirateId: number;
  name: string;
  /** Total arena wins - a pirate winning two arenas in one round counts twice. */
  wins: number;
  /** Arena wins divided by the total number of rounds (0-1, can exceed it in theory). */
  winPercent: number;
  /** The most recent round the pirate won an arena, or null if never. */
  lastWinRound: number | null;
  /** Consecutive rounds won up to the most recent round (0 when not currently on a streak). */
  currentStreak: number;
  /** Longest run of consecutive rounds ever won. */
  highestStreak: number;
}

/**
 * Computes a pirate hall of fame from completed rounds, mirroring neobot's
 * `fcstats`: per-pirate arena-win totals, win share of all rounds, last win,
 * and current/highest streaks. Wins are counted per arena (a double-arena win
 * counts twice), while streaks count rounds - a pirate is "on" for a round if
 * they won at least one arena in it. Rounds may be passed in any order; they
 * are sorted internally, since streaks depend on round sequence.
 */
export function computePirateHallOfFame(
  rounds: ReadonlyArray<PirateHallOfFameRound>,
): PirateHallOfFameEntry[] {
  const sorted = [...rounds].sort((a, b) => a.round - b.round);
  const totalRounds = sorted.length;

  const winsById = new Map<number, number>();
  const lastWinRoundById = new Map<number, number>();
  const streaksById = new Map<number, number>();
  const highestStreakById = new Map<number, number>();

  for (const round of sorted) {
    const winningIds = new Set<number>();

    for (let arenaIndex = 0; arenaIndex < round.winners.length; arenaIndex++) {
      const slot = round.winners[arenaIndex];
      if (slot === undefined || slot < 1) {
        continue;
      }
      const pirateId = round.pirates[arenaIndex]?.[slot - 1];
      if (pirateId === undefined) {
        continue;
      }
      winsById.set(pirateId, (winsById.get(pirateId) ?? 0) + 1);
      lastWinRoundById.set(pirateId, round.round);
      winningIds.add(pirateId);
    }

    for (const pirateId of winningIds) {
      const streak = (streaksById.get(pirateId) ?? 0) + 1;
      streaksById.set(pirateId, streak);
      highestStreakById.set(pirateId, Math.max(highestStreakById.get(pirateId) ?? 0, streak));
    }

    // Everyone not on this round's winning line falls off their streak. Only
    // pirates seen so far are tracked, which keeps this O(pirates) per round.
    for (const pirateId of streaksById.keys()) {
      if (!winningIds.has(pirateId)) {
        streaksById.set(pirateId, 0);
      }
    }
  }

  const entries: PirateHallOfFameEntry[] = [];
  for (const [pirateId, wins] of winsById) {
    entries.push({
      pirateId,
      name: PIRATE_NAMES.get(pirateId) ?? `Pirate ${pirateId}`,
      wins,
      winPercent: totalRounds > 0 ? wins / totalRounds : 0,
      lastWinRound: lastWinRoundById.get(pirateId) ?? null,
      currentStreak: streaksById.get(pirateId) ?? 0,
      highestStreak: highestStreakById.get(pirateId) ?? 0,
    });
  }

  // Most wins first (like neobot's Counter.most_common), pirate id as a stable
  // tie-breaker.
  entries.sort((a, b) => b.wins - a.wins || a.pirateId - b.pirateId);
  return entries;
}
