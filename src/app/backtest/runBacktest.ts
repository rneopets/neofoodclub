import { computePiratesBinary } from '../maths';
import { rebuildEngine, wasmMakeMaxTerBets } from '../wasmEngine';

import type {
  AmountSweepPoint,
  BacktestRound,
  BacktestSummary,
  ModelBacktestResult,
} from './types';

export function backtestRound(
  round: BacktestRound,
  useLogit: boolean,
  betAmount: number,
  betCount: number,
  useEr: boolean,
): { spent: number; won: number } {
  // useEr selects a different bet-selection strategy in the wasm engine:
  // passing a bet amount ranks bets by Net Expected at that (odds-capped)
  // amount ("max-TER"); passing null instead switches the engine to rank by
  // raw, amount-independent Expected Ratio ("general ER" - see is_general()
  // in bets_factory.rs). Scoring below always uses the real betAmount
  // regardless of which strategy selected the bets.
  rebuildEngine(JSON.stringify(round), useEr ? null : betAmount, useLogit);
  const { bets } = wasmMakeMaxTerBets(betCount);
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
  chunkSize?: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

interface Accumulator {
  totalSpent: number;
  totalWon: number;
  roundsPlayed: number;
  roundsWon: number;
  cumulativeNet: number[];
}

function createAccumulator(): Accumulator {
  return { totalSpent: 0, totalWon: 0, roundsPlayed: 0, roundsWon: 0, cumulativeNet: [] };
}

function accumulate(acc: Accumulator, result: { spent: number; won: number }): void {
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
  const legacyGeneralErAcc = createAccumulator();
  const logitGeneralErAcc = createAccumulator();
  const roundNumbers: number[] = [];

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i]!;
    accumulate(legacyAcc, backtestRound(round, false, opts.betAmount, opts.betCount, false));
    accumulate(logitAcc, backtestRound(round, true, opts.betAmount, opts.betCount, false));
    accumulate(
      legacyGeneralErAcc,
      backtestRound(round, false, opts.betAmount, opts.betCount, true),
    );
    accumulate(logitGeneralErAcc, backtestRound(round, true, opts.betAmount, opts.betCount, true));

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
    legacyGeneralEr: finalizeAccumulator(legacyGeneralErAcc),
    logitGeneralEr: finalizeAccumulator(logitGeneralErAcc),
  };
}

export interface RunAmountSweepOptions {
  amounts: number[];
  betCount: number;
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
      ...(opts.signal ? { signal: opts.signal } : {}),
      onProgress: done => {
        opts.onProgress?.(completedRounds + done, totalRounds);
      },
    });

    const point: AmountSweepPoint = {
      amount,
      legacy: summary.legacy,
      logit: summary.logit,
      legacyGeneralEr: summary.legacyGeneralEr,
      logitGeneralEr: summary.logitGeneralEr,
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
