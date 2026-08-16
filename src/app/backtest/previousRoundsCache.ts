import type { BacktestRound, CachedPreviousRounds } from './types';

const CACHE_KEY = 'nfc.previousRoundsCache.v1';
const CACHE_VERSION = 1;

export function loadCache(): CachedPreviousRounds | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedPreviousRounds;
    if (parsed.version !== CACHE_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCache(data: CachedPreviousRounds): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache previous rounds:', error);
  }
}

export function isStale(cache: CachedPreviousRounds | null, currentRoundFromCdn: number): boolean {
  if (cache === null) {
    return true;
  }
  if (currentRoundFromCdn > 0) {
    return currentRoundFromCdn - cache.newestRound > 1;
  }
  return Date.now() - cache.fetchedAt > 24 * 60 * 60 * 1000;
}

export async function fetchPreviousRounds(
  signal?: AbortSignal,
): Promise<{ rounds: BacktestRound[]; newestRound: number }> {
  const response = await fetch('https://cdn.neofood.club/previous.jsonl', {
    signal: signal ?? null,
  });
  const text = await response.text();

  const lines = text
    .trim()
    .split('\n')
    .filter(line => line.trim().length > 0);

  const rounds: BacktestRound[] = [];
  for (const line of lines) {
    const parsed = JSON.parse(line) as {
      round: number;
      pirates: number[][];
      openingOdds: number[][];
      currentOdds: number[][];
      winners?: number[] | null;
    };

    if (parsed.winners === null || parsed.winners === undefined) {
      continue;
    }
    if (parsed.winners.length !== 5) {
      continue;
    }
    if (!parsed.winners.every(w => w !== 0 && w !== null && w !== undefined)) {
      continue;
    }

    rounds.push({
      round: parsed.round,
      pirates: parsed.pirates,
      openingOdds: parsed.openingOdds,
      currentOdds: parsed.currentOdds,
      winners: parsed.winners,
    });
  }

  const newestRound = rounds.length > 0 ? Math.max(...rounds.map(r => r.round)) : 0;

  return { rounds, newestRound };
}
