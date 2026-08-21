import { getPreviousRoundsFeed, type RawPreviousRoundLine } from '../data/previousRoundsFeed';

export interface RoundTiming {
  round: number;
  timestamp: string;
}

function extractRoundTimings(lines: RawPreviousRoundLine[]): RoundTiming[] {
  const rounds: RoundTiming[] = [];

  for (const line of lines) {
    if (typeof line.round !== 'number' || typeof line.timestamp !== 'string') {
      continue;
    }

    const t = new Date(line.timestamp);
    if (Number.isNaN(t.getTime())) {
      continue;
    }

    rounds.push({ round: line.round, timestamp: line.timestamp });
  }

  rounds.sort((a, b) => a.round - b.round);
  return rounds;
}

/**
 * Returns the end timestamp of every round that has one, read from the shared
 * previous.jsonl cache (downloaded at most once per page load unless a refresh
 * is forced).
 */
export async function fetchRoundTiming(
  _signal?: AbortSignal,
  options?: { forceRefresh?: boolean },
): Promise<RoundTiming[]> {
  const lines = await getPreviousRoundsFeed(
    options?.forceRefresh ? { forceRefresh: true } : undefined,
  );
  return extractRoundTimings(lines);
}
