import type { BacktestRound } from './types';

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
      foods?: number[][] | null;
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
      ...(parsed.foods ? { foods: parsed.foods } : {}),
    });
  }

  const newestRound = rounds.length > 0 ? Math.max(...rounds.map(r => r.round)) : 0;

  return { rounds, newestRound };
}
