import { getPreviousRoundsFeed } from '../data/previousRoundsFeed';

import type { BacktestRound } from './types';

export async function fetchPreviousRounds(
  _signal?: AbortSignal,
  options?: { forceRefresh?: boolean },
): Promise<{ rounds: BacktestRound[]; newestRound: number }> {
  const lines = await getPreviousRoundsFeed(
    options?.forceRefresh ? { forceRefresh: true } : undefined,
  );

  const rounds: BacktestRound[] = [];
  for (const parsed of lines) {
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
      ...(parsed.foods ? { foods: parsed.foods } : {}),
    });
  }

  const newestRound = rounds.length > 0 ? Math.max(...rounds.map(r => r.round)) : 0;

  return { rounds, newestRound };
}
