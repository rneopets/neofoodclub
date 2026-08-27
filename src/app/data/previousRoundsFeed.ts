/** One arena's four pirate IDs, 0-indexed by `position - 1`. */
export type ArenaPirateIds = [number, number, number, number];

/**
 * One arena's odds, indexed 0-4: index 0 is an unused "no pick" placeholder,
 * indices 1-4 are the odds for that arena's four pirates - the same
 * 1-indexed convention used by odds/probability arrays elsewhere in this app.
 */
export type ArenaOddsRow = [number, number, number, number, number];

/** One line of `previous.jsonl`: a single NeoFoodClub round's pirates, odds, and result. */
export interface RawPreviousRoundLine {
  round: number;
  /** One entry per arena (5 total). */
  pirates: ArenaPirateIds[];
  /** One entry per arena (5 total): odds at the start of the round. */
  openingOdds: ArenaOddsRow[];
  /** One entry per arena (5 total): odds as of when this line was recorded. */
  currentOdds: ArenaOddsRow[];
  /**
   * Winning position (1-4) per arena, 5 entries, in arena order. A value of
   * 0 means no result was recorded for that arena (round still in progress,
   * or data never captured) - see `fetchPreviousRounds` in
   * `../backtest/previousRounds.ts`, which filters these rows out entirely.
   */
  winners?: number[] | null;
  /** Food item IDs served in each arena that round, when available. */
  foods?: number[][] | null;
  /** Odds-change log for the round (empty/absent when odds never moved). */
  changes?: unknown[] | null;
  /** ISO 8601 timestamp of when this line was recorded, when available. */
  timestamp?: string | null;
}

let cachedFeedPromise: Promise<RawPreviousRoundLine[]> | null = null;

async function fetchAndParseFeed(): Promise<RawPreviousRoundLine[]> {
  const response = await fetch('https://cdn.neofood.club/previous.jsonl');
  const text = await response.text();

  const lines = text
    .trim()
    .split('\n')
    .filter(line => line.trim().length > 0);

  const rounds: RawPreviousRoundLine[] = [];
  for (const line of lines) {
    try {
      rounds.push(JSON.parse(line) as RawPreviousRoundLine);
    } catch {
      continue;
    }
  }

  return rounds;
}

/**
 * Fetches and parses previous.jsonl (~13MB) at most once per page load and
 * shares the result across every caller, since the feed is otherwise
 * downloaded and re-parsed independently by each dev-tool feature that
 * reads it.
 */
export function getPreviousRoundsFeed(options?: {
  forceRefresh?: boolean;
}): Promise<RawPreviousRoundLine[]> {
  if (options?.forceRefresh || cachedFeedPromise === null) {
    const promise = fetchAndParseFeed();
    cachedFeedPromise = promise;
    promise.catch(() => {
      if (cachedFeedPromise === promise) {
        cachedFeedPromise = null;
      }
    });
  }

  return cachedFeedPromise;
}

export function clearPreviousRoundsFeedCache(): void {
  cachedFeedPromise = null;
}
