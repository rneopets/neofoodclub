export interface RawPreviousRoundLine {
  round: number;
  pirates: number[][];
  openingOdds: number[][];
  currentOdds: number[][];
  winners?: number[] | null;
  foods?: number[][] | null;
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
