import type { Bet } from '../../types/bets';
import { computePiratesBinary } from '../maths';
import { deriveDefaultGambitBinary, deriveDefaultTenbetBinary } from '../perf/wasmEnginePerf';
import {
  rebuildEngine,
  wasmMakeBustproofBets,
  wasmMakeCrazyBets,
  wasmMakeGambitBets,
  wasmMakeMaxTerBets,
  wasmMakeTenbetBets,
  wasmMakeWinningGambitBets,
} from '../wasmEngine';

import type {
  AmountSweepPoint,
  BacktestRound,
  BacktestStrategy,
  BacktestSummary,
  ModelBacktestResult,
} from './types';

/** Default bet-amount presets offered by the backtest UI. */
export const AMOUNT_PRESETS = [1000, 5000, 10000, 25000, 50000];

/**
 * Backtests a single round with the given strategy and model, returning null
 * when the strategy is not applicable to this round (e.g. bustproof on a
 * round with no positive arenas, or winningGambit before winners are set).
 */
export function backtestRound(
  round: BacktestRound,
  useLogit: boolean,
  betAmount: number,
  betCount: number,
  strategy: BacktestStrategy,
): { spent: number; won: number } | null {
  // The engine's bet-amount argument selects a different ranking for the
  // max-TER generator: passing a bet amount ranks bets by Net Expected at
  // that (odds-capped) amount ("max-TER"); passing null instead switches the
  // engine to rank by raw, amount-independent Expected Ratio ("general ER" -
  // see is_general() in bets_factory.rs). For every other strategy the
  // argument is ignored by those generators. Scoring below always uses the
  // real betAmount regardless of which strategy selected the bets.
  const engineBetAmount = strategy === 'generalEr' ? null : betAmount;
  rebuildEngine(JSON.stringify(round), engineBetAmount, useLogit);

  let bets: Bet;
  switch (strategy) {
    case 'maxTer':
      ({ bets } = wasmMakeMaxTerBets(betCount));
      break;
    case 'generalEr':
      ({ bets } = wasmMakeMaxTerBets(betCount));
      break;
    case 'gambit':
      ({ bets } = wasmMakeGambitBets(deriveDefaultGambitBinary(), betCount));
      break;
    case 'bustproof': {
      const result = wasmMakeBustproofBets(betCount);
      if (result === null) {
        return null; // no positive arenas - nothing to bet
      }
      bets = result.bets;
      break;
    }
    case 'tenbet':
      ({ bets } = wasmMakeTenbetBets(deriveDefaultTenbetBinary(), betCount));
      break;
    case 'crazy':
      ({ bets } = wasmMakeCrazyBets(betCount));
      break;
    case 'winningGambit': {
      const result = wasmMakeWinningGambitBets(betCount);
      if (result === null) {
        return null; // no winners yet - hindsight strategy not applicable
      }
      bets = result.bets;
      break;
    }
  }

  const winningBetBinary = computePiratesBinary(round.winners);

  let spent = 0;
  let won = 0;

  for (const betIndex of bets.keys()) {
    const bet = bets.get(betIndex) ?? [];
    const betBinary = computePiratesBinary(bet);
    if (betBinary === 0) {
      continue;
    }

    // Use the raw requested betAmount rather than the wasm engine's
    // per-bet amount (which the Rust side pre-caps to whatever it takes
    // to hit the 1,000,000 payout cap, via fill_bet_amounts in bets.rs -
    // that's the real-game "don't waste NP" behavior, but this backtest
    // is exploratory and wants to show what happens if you actually
    // wager the full amount). The Math.min below still enforces the
    // real payout cap on winnings either way.
    spent += betAmount;

    let oddsProduct = 1;
    for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
      const pirateIndex = bet[arenaIndex] ?? 0;
      if (pirateIndex > 0) {
        oddsProduct *= round.currentOdds[arenaIndex]?.[pirateIndex] ?? 1;
      }
    }

    if ((winningBetBinary & betBinary) === betBinary) {
      won += Math.min(oddsProduct * betAmount, 1_000_000);
    }
  }

  return { spent, won };
}

export interface RunBacktestOptions {
  betAmount: number;
  betCount: number;
  strategy: BacktestStrategy;
  chunkSize?: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

interface Accumulator {
  totalSpent: number;
  totalWon: number;
  roundsPlayed: number;
  roundsWon: number;
  roundsSkipped: number;
  cumulativeNet: number[];
}

function createAccumulator(): Accumulator {
  return {
    totalSpent: 0,
    totalWon: 0,
    roundsPlayed: 0,
    roundsWon: 0,
    roundsSkipped: 0,
    cumulativeNet: [],
  };
}

function accumulate(acc: Accumulator, result: { spent: number; won: number } | null): void {
  if (result === null) {
    // Strategy not applicable to this round - it neither spent nor won, and
    // contributes no point to the cumulative curve (the chart stays flat).
    acc.roundsSkipped += 1;
    return;
  }

  acc.totalSpent += result.spent;
  acc.totalWon += result.won;
  acc.roundsPlayed += 1;
  if (result.won > result.spent) {
    acc.roundsWon += 1;
  }
  acc.cumulativeNet.push(acc.totalWon - acc.totalSpent);
}

function finalizeAccumulator(acc: Accumulator): ModelBacktestResult {
  const netProfit = acc.totalWon - acc.totalSpent;
  return {
    totalSpent: acc.totalSpent,
    totalWon: acc.totalWon,
    netProfit,
    roi: acc.totalSpent > 0 ? netProfit / acc.totalSpent : 0,
    roundsPlayed: acc.roundsPlayed,
    roundsWon: acc.roundsWon,
    roundsSkipped: acc.roundsSkipped,
    cumulativeNet: acc.cumulativeNet,
  };
}

export async function runFullBacktest(
  rounds: BacktestRound[],
  opts: RunBacktestOptions,
): Promise<BacktestSummary> {
  const chunkSize = opts.chunkSize ?? 100;

  const legacyAcc = createAccumulator();
  const logitAcc = createAccumulator();
  const roundNumbers: number[] = [];

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i]!;
    accumulate(
      legacyAcc,
      backtestRound(round, false, opts.betAmount, opts.betCount, opts.strategy),
    );
    accumulate(logitAcc, backtestRound(round, true, opts.betAmount, opts.betCount, opts.strategy));

    roundNumbers.push(round.round);

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
    legacy: finalizeAccumulator(legacyAcc),
    logit: finalizeAccumulator(logitAcc),
  };
}

export interface RunAmountSweepOptions {
  amounts: number[];
  betCount: number;
  strategy: BacktestStrategy;
  onProgress?: (doneRounds: number, totalRounds: number) => void;
  onStepComplete?: (point: AmountSweepPoint) => void;
  signal?: AbortSignal;
}

export async function runBacktestAmountSweep(
  rounds: BacktestRound[],
  opts: RunAmountSweepOptions,
): Promise<AmountSweepPoint[]> {
  const totalRounds = opts.amounts.length * rounds.length;
  const points: AmountSweepPoint[] = [];

  for (let stepIndex = 0; stepIndex < opts.amounts.length; stepIndex++) {
    const amount = opts.amounts[stepIndex]!;
    const completedRounds = stepIndex * rounds.length;

    const summary = await runFullBacktest(rounds, {
      betAmount: amount,
      betCount: opts.betCount,
      strategy: opts.strategy,
      ...(opts.signal ? { signal: opts.signal } : {}),
      onProgress: done => {
        opts.onProgress?.(completedRounds + done, totalRounds);
      },
    });

    const point: AmountSweepPoint = {
      amount,
      legacy: summary.legacy,
      logit: summary.logit,
    };
    points.push(point);
    opts.onStepComplete?.(point);
  }

  return points;
}

/** Scales `value` by `divisor` to at most 2 decimal places, prefixed with ~ only if that rounding lost precision. */
function formatScaled(value: number, divisor: number, suffix: string): string {
  const scaled = parseFloat((value / divisor).toFixed(2));
  const isExact = scaled * divisor === value;
  return `${isExact ? '' : '~'}${scaled}${suffix}`;
}

/** Formats a backtest money amount (spent/won/net profit), abbreviated with a ~ prefix only when rounded. */
export function formatBacktestAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return formatScaled(value, 1_000_000_000, 'B');
  }
  if (abs >= 1_000_000) {
    return formatScaled(value, 1_000_000, 'M');
  }
  if (abs >= 1_000) {
    return formatScaled(value, 1_000, 'K');
  }
  return value.toFixed(0);
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
