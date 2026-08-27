import { rebuildEngine, wasmMakeBestGambitBets } from '../wasmEngine';

import { scoreBets } from './runBacktest';
import type { BacktestRound } from './types';

/** A single completed round's best-gambit outcome. */
export interface BestGambitHallOfFameEntry {
  round: number;
  spent: number;
  won: number;
  /** Net for the round (won - spent); positive is a profit, negative a loss. */
  net: number;
}

export interface BestGambitHallOfFameModelResult {
  totalSpent: number;
  totalWon: number;
  netProfit: number;
  roi: number;
  roundsPlayed: number;
  /** Rounds where the best-gambit set came out ahead (net > 0). */
  roundsWon: number;
  cumulativeNet: number[];
  /** The biggest single-round profits, descending. Empty if never ahead. */
  topWins: BestGambitHallOfFameEntry[];
  /** The worst single-round losses, most-negative first. Empty if never behind. */
  topLosses: BestGambitHallOfFameEntry[];
}

export interface BestGambitHallOfFameSummary {
  rounds: number[];
  legacy: BestGambitHallOfFameModelResult;
  logit: BestGambitHallOfFameModelResult;
}

export interface RunBestGambitHallOfFameOptions {
  betAmount: number;
  betCount: number;
  /** How many top wins / losses to surface in the hall of fame (default 10). */
  topN?: number;
  chunkSize?: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

interface HoFAccumulator {
  totalSpent: number;
  totalWon: number;
  roundsPlayed: number;
  roundsWon: number;
  cumulativeNet: number[];
  entries: BestGambitHallOfFameEntry[];
}

function createHoFAccumulator(): HoFAccumulator {
  return {
    totalSpent: 0,
    totalWon: 0,
    roundsPlayed: 0,
    roundsWon: 0,
    cumulativeNet: [],
    entries: [],
  };
}

/** Backtests one round with the best-gambit strategy and model. */
function backtestBestGambitRound(
  round: BacktestRound,
  useLogit: boolean,
  betAmount: number,
  betCount: number,
): { spent: number; won: number } {
  // The best-gambit anchor (the full-arena bet with the highest expected value)
  // is amount-dependent: passing a bet amount makes it rank by Net Expected at
  // that amount, matching what the user would actually bet. So we pass the real
  // betAmount here (not null, unlike generalEr). Best-gambit always produces a
  // non-empty set (the anchor itself is always in the pool), so every round plays.
  rebuildEngine(JSON.stringify(round), betAmount, useLogit);
  const { bets } = wasmMakeBestGambitBets(betCount);
  return scoreBets(round, bets, betAmount);
}

function accumulateHoFAccumulator(
  acc: HoFAccumulator,
  roundNumber: number,
  result: { spent: number; won: number },
): void {
  acc.totalSpent += result.spent;
  acc.totalWon += result.won;
  acc.roundsPlayed += 1;
  const net = result.won - result.spent;
  if (net > 0) {
    acc.roundsWon += 1;
  }
  acc.cumulativeNet.push(acc.totalWon - acc.totalSpent);
  acc.entries.push({ round: roundNumber, spent: result.spent, won: result.won, net });
}

function finalizeHoFAccumulator(
  acc: HoFAccumulator,
  topN: number,
): BestGambitHallOfFameModelResult {
  const netProfit = acc.totalWon - acc.totalSpent;

  // One ascending sort serves both: the leading entries are the worst losses,
  // the trailing ones the biggest wins.
  const byNetAsc = [...acc.entries].sort((a, b) => a.net - b.net);
  const topLosses = byNetAsc.filter(entry => entry.net < 0).slice(0, topN);
  const topWins = byNetAsc
    .filter(entry => entry.net > 0)
    .slice(-topN)
    .reverse();

  return {
    totalSpent: acc.totalSpent,
    totalWon: acc.totalWon,
    netProfit,
    roi: acc.totalSpent > 0 ? netProfit / acc.totalSpent : 0,
    roundsPlayed: acc.roundsPlayed,
    roundsWon: acc.roundsWon,
    cumulativeNet: acc.cumulativeNet,
    topWins,
    topLosses,
  };
}

/**
 * Backtests the best-gambit strategy across every round, once with the legacy
 * model and once with the logit model, surfacing hall-of-fame style stats:
 * per-model cumulative profit plus the biggest single-round wins and losses.
 */
export async function runBestGambitHallOfFame(
  rounds: BacktestRound[],
  opts: RunBestGambitHallOfFameOptions,
): Promise<BestGambitHallOfFameSummary> {
  const chunkSize = opts.chunkSize ?? 100;
  const topN = opts.topN ?? 10;

  const legacyAcc = createHoFAccumulator();
  const logitAcc = createHoFAccumulator();
  const roundNumbers: number[] = [];

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i]!;

    accumulateHoFAccumulator(
      legacyAcc,
      round.round,
      backtestBestGambitRound(round, false, opts.betAmount, opts.betCount),
    );
    accumulateHoFAccumulator(
      logitAcc,
      round.round,
      backtestBestGambitRound(round, true, opts.betAmount, opts.betCount),
    );

    roundNumbers.push(round.round);

    if ((i + 1) % chunkSize === 0 || i === rounds.length - 1) {
      if (opts.signal?.aborted) {
        throw new DOMException('Hall of Fame aborted', 'AbortError');
      }
      opts.onProgress?.(i + 1, rounds.length);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  }

  return {
    rounds: roundNumbers,
    legacy: finalizeHoFAccumulator(legacyAcc, topN),
    logit: finalizeHoFAccumulator(logitAcc, topN),
  };
}
