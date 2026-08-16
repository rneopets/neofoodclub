import { computePiratesBinary } from '../maths';
import { rebuildEngine, wasmMakeMaxTerBets } from '../wasmEngine';

import type { BacktestRound, BacktestSummary } from './types';

export function backtestRound(
  round: BacktestRound,
  useLogit: boolean,
  betAmount: number,
  betCount: number,
): { spent: number; won: number } {
  rebuildEngine(JSON.stringify(round), betAmount, useLogit);
  const { bets, betAmounts } = wasmMakeMaxTerBets(betCount);
  const winningBetBinary = computePiratesBinary(round.winners);

  let spent = 0;
  let won = 0;

  for (const betIndex of bets.keys()) {
    const bet = bets.get(betIndex) ?? [];
    const betBinary = computePiratesBinary(bet);
    if (betBinary === 0) {
      continue;
    }

    const amount = betAmounts.get(betIndex) ?? 0;
    spent += amount;

    let oddsProduct = 1;
    for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
      const pirateIndex = bet[arenaIndex] ?? 0;
      if (pirateIndex > 0) {
        oddsProduct *= round.currentOdds[arenaIndex]?.[pirateIndex] ?? 1;
      }
    }

    if ((winningBetBinary & betBinary) === betBinary) {
      won += Math.min(oddsProduct * amount, 1_000_000);
    }
  }

  return { spent, won };
}

export interface RunBacktestOptions {
  betAmount: number;
  betCount: number;
  chunkSize?: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export async function runFullBacktest(
  rounds: BacktestRound[],
  opts: RunBacktestOptions,
): Promise<BacktestSummary> {
  const chunkSize = opts.chunkSize ?? 100;

  let legacyTotalSpent = 0;
  let legacyTotalWon = 0;
  let legacyRoundsWon = 0;
  let legacyRoundsPlayed = 0;
  let logitTotalSpent = 0;
  let logitTotalWon = 0;
  let logitRoundsWon = 0;
  let logitRoundsPlayed = 0;
  const roundNumbers: number[] = [];
  const legacyCumulativeNet: number[] = [];
  const logitCumulativeNet: number[] = [];

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i]!;
    const legacyResult = backtestRound(round, false, opts.betAmount, opts.betCount);
    const logitResult = backtestRound(round, true, opts.betAmount, opts.betCount);

    legacyTotalSpent += legacyResult.spent;
    legacyTotalWon += legacyResult.won;
    legacyRoundsPlayed += 1;
    if (legacyResult.won > legacyResult.spent) {
      legacyRoundsWon += 1;
    }

    logitTotalSpent += logitResult.spent;
    logitTotalWon += logitResult.won;
    logitRoundsPlayed += 1;
    if (logitResult.won > logitResult.spent) {
      logitRoundsWon += 1;
    }

    roundNumbers.push(round.round);
    legacyCumulativeNet.push(legacyTotalWon - legacyTotalSpent);
    logitCumulativeNet.push(logitTotalWon - logitTotalSpent);

    if ((i + 1) % chunkSize === 0 || i === rounds.length - 1) {
      if (opts.signal?.aborted) {
        throw new DOMException('Backtest aborted', 'AbortError');
      }
      opts.onProgress?.(i + 1, rounds.length);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  }

  return {
    rounds: roundNumbers,
    legacy: {
      totalSpent: legacyTotalSpent,
      totalWon: legacyTotalWon,
      netProfit: legacyTotalWon - legacyTotalSpent,
      roi: legacyTotalSpent > 0 ? (legacyTotalWon - legacyTotalSpent) / legacyTotalSpent : 0,
      roundsPlayed: legacyRoundsPlayed,
      roundsWon: legacyRoundsWon,
      cumulativeNet: legacyCumulativeNet,
    },
    logit: {
      totalSpent: logitTotalSpent,
      totalWon: logitTotalWon,
      netProfit: logitTotalWon - logitTotalSpent,
      roi: logitTotalSpent > 0 ? (logitTotalWon - logitTotalSpent) / logitTotalSpent : 0,
      roundsPlayed: logitRoundsPlayed,
      roundsWon: logitRoundsWon,
      cumulativeNet: logitCumulativeNet,
    },
  };
}

export function downsampleForChart(
  series: number[],
  rounds: number[],
  maxPoints = 500,
): { x: number; y: number }[] {
  if (series.length <= maxPoints) {
    return series.map((y, i) => ({ x: rounds[i]!, y }));
  }

  const stride = Math.ceil(series.length / maxPoints);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < series.length; i += stride) {
    points.push({ x: rounds[i]!, y: series[i]! });
  }
  const lastIndex = series.length - 1;
  if (points.length === 0 || points[points.length - 1]!.x !== rounds[lastIndex]!) {
    points.push({ x: rounds[lastIndex]!, y: series[lastIndex]! });
  }
  return points;
}
