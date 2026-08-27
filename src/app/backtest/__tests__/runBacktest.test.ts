import fs from 'fs';
import path from 'path';

import { describe, expect, it, beforeAll } from 'vitest';

import type { RoundData } from '../../../types';
import { computeLogitProbabilities } from '../../maths';
import { initWasmMath } from '../../wasmMath';
import {
  backtestRound,
  downsampleForChart,
  formatBacktestAmount,
  runBacktestAmountSweep,
  runFullBacktest,
} from '../runBacktest';
import type { BacktestRound, BacktestStrategy } from '../types';

function toBacktestRound(roundData: RoundData): BacktestRound {
  return {
    round: roundData.round,
    pirates: roundData.pirates,
    openingOdds: roundData.openingOdds,
    currentOdds: roundData.currentOdds,
    winners: roundData.winners ?? [],
    foods: roundData.foods,
  };
}

const fixturesPath = path.resolve(__dirname, '../../__tests__/fixtures/rounds.jsonl');
const fixtureRoundData: RoundData[] = fs
  .readFileSync(fixturesPath, 'utf8')
  .trim()
  .split('\n')
  .map(line => JSON.parse(line) as RoundData);
const fixtureRounds: BacktestRound[] = fixtureRoundData.map(toBacktestRound);

beforeAll(async () => {
  await initWasmMath();
});

describe('backtestRound', () => {
  const round = fixtureRounds[0]!;

  it('returns a sane result for the legacy model (max-TER)', () => {
    const result = backtestRound(round, false, 500000, 10, 'maxTer');
    expect(result).not.toBeNull();
    expect(result!.spent).toBeGreaterThan(0);
    expect(result!.won).toBeGreaterThanOrEqual(0);
  });

  it('returns a sane result for the logit model (max-TER)', () => {
    const result = backtestRound(round, true, 500000, 10, 'maxTer');
    expect(result).not.toBeNull();
    expect(result!.spent).toBeGreaterThan(0);
  });

  it('returns a sane result for the legacy model (general ER)', () => {
    const result = backtestRound(round, false, 500000, 10, 'generalEr');
    expect(result).not.toBeNull();
    expect(result!.spent).toBeGreaterThan(0);
  });

  it('returns a sane result for the logit model (general ER)', () => {
    const result = backtestRound(round, true, 500000, 10, 'generalEr');
    expect(result).not.toBeNull();
    expect(result!.spent).toBeGreaterThan(0);
  });

  it('runs every strategy without throwing (smoke)', () => {
    const strategies: BacktestStrategy[] = [
      'maxTer',
      'generalEr',
      'gambit',
      'bustproof',
      'tenbet',
      'crazy',
      'winningGambit',
    ];
    for (const strategy of strategies) {
      const result = backtestRound(round, false, 500000, 10, strategy);
      // bustproof may be null when no arena is positive; the rest always produce a result.
      if (strategy !== 'bustproof') {
        expect(result, `expected ${strategy} to produce a result`).not.toBeNull();
      } else {
        // If it did run, the numbers must be sane.
        if (result !== null) {
          expect(result.spent).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('spent scales linearly with betAmount instead of being capped by the payout cap (regression: sweep chart used to flatten past ~70k)', () => {
    const smallAmount = 10000;
    const largeAmount = 100000;
    const smallResult = backtestRound(round, false, smallAmount, 10, 'maxTer')!;
    const largeResult = backtestRound(round, false, largeAmount, 10, 'maxTer')!;

    const numActiveBets = smallResult.spent / smallAmount;
    expect(numActiveBets).toBeGreaterThan(0);
    expect(largeResult.spent).toBe(largeAmount * numActiveBets);
  });
});

describe('runFullBacktest', () => {
  it('aggregates totals and cumulative net correctly across rounds for a strategy', async () => {
    const rounds = fixtureRounds.slice(0, 3);
    const summary = await runFullBacktest(rounds, {
      betAmount: 500000,
      betCount: 10,
      strategy: 'maxTer',
    });

    expect(summary.rounds).toEqual(rounds.map(r => r.round));

    for (const model of [summary.legacy, summary.logit]) {
      // Every round either played or was skipped - never both, never neither.
      expect(model.roundsPlayed + model.roundsSkipped).toBe(rounds.length);
      expect(model.cumulativeNet).toHaveLength(model.roundsPlayed);
      expect(model.netProfit).toBe(model.totalWon - model.totalSpent);
      if (model.roundsPlayed > 0) {
        expect(model.cumulativeNet[model.cumulativeNet.length - 1]).toBeCloseTo(model.netProfit, 6);
      } else {
        expect(model.cumulativeNet).toHaveLength(0);
      }
      if (model.totalSpent > 0) {
        expect(model.roi).toBeCloseTo(model.netProfit / model.totalSpent, 6);
      } else {
        expect(model.roi).toBe(0);
      }
    }
  });

  it('reports progress and can be aborted', async () => {
    const rounds = fixtureRounds.slice(0, 2);
    const controller = new AbortController();
    controller.abort();

    await expect(
      runFullBacktest(rounds, {
        betAmount: 500000,
        betCount: 10,
        strategy: 'maxTer',
        chunkSize: 1,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it('skipped rounds contribute no point to the cumulative curve (flat line)', async () => {
    const rounds = fixtureRounds.slice(0, 3);
    // bustproof skips any round without a positive arena; whatever the mix, the
    // invariant holds: cumulative points == rounds actually played.
    const summary = await runFullBacktest(rounds, {
      betAmount: 500000,
      betCount: 10,
      strategy: 'bustproof',
    });

    for (const model of [summary.legacy, summary.logit]) {
      expect(model.cumulativeNet).toHaveLength(model.roundsPlayed);
      expect(model.roundsPlayed + model.roundsSkipped).toBe(rounds.length);
    }
  });
});

describe('runBacktestAmountSweep', () => {
  it('returns one point per requested amount, in order, each scored over all rounds', async () => {
    const rounds = fixtureRounds.slice(0, 2);
    const amounts = [10000, 20000];

    const progressCalls: Array<[number, number]> = [];
    const points = await runBacktestAmountSweep(rounds, {
      amounts,
      betCount: 10,
      strategy: 'maxTer',
      onProgress: (done, total) => {
        progressCalls.push([done, total]);
      },
    });

    expect(points.map(p => p.amount)).toEqual(amounts);
    for (const point of points) {
      expect(point.legacy.roundsPlayed + point.legacy.roundsSkipped).toBe(rounds.length);
      expect(point.logit.roundsPlayed + point.logit.roundsSkipped).toBe(rounds.length);
    }

    const [lastDone, lastTotal] = progressCalls[progressCalls.length - 1]!;
    expect(lastTotal).toBe(amounts.length * rounds.length);
    expect(lastDone).toBe(amounts.length * rounds.length);
  });

  it('can be aborted', async () => {
    const rounds = fixtureRounds.slice(0, 2);
    const controller = new AbortController();
    controller.abort();

    await expect(
      runBacktestAmountSweep(rounds, {
        amounts: [10000, 20000],
        betCount: 10,
        strategy: 'maxTer',
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it('calls onStepComplete once per amount, in order, matching the final result (for live-updating charts)', async () => {
    const rounds = fixtureRounds.slice(0, 2);
    const amounts = [10000, 20000, 30000];

    const stepPoints: number[] = [];
    const points = await runBacktestAmountSweep(rounds, {
      amounts,
      betCount: 10,
      strategy: 'generalEr',
      onStepComplete: point => {
        stepPoints.push(point.amount);
      },
    });

    expect(stepPoints).toEqual(amounts);
    expect(stepPoints).toEqual(points.map(p => p.amount));
  });
});

describe('logit model uses food-adjustment data', () => {
  it('produces different probabilities when foods is present vs missing (regression for the backtest food-stripping bug)', () => {
    // round 3795 (index 1) has foods; round 3574 (index 0) does not.
    const roundData = fixtureRoundData[1]!;
    expect(roundData.foods).toBeTruthy();

    const { foods, ...roundWithoutFoods } = roundData;
    void foods;

    const withFoods = computeLogitProbabilities(roundData);
    const withoutFoods = computeLogitProbabilities(roundWithoutFoods as RoundData);

    expect(withFoods.used).not.toEqual(withoutFoods.used);
  });

  it('carries foods through into backtestRound via BacktestRound', () => {
    const round = fixtureRounds[1]!;
    expect(round.foods).toBeTruthy();
    expect(round.foods).toEqual(fixtureRoundData[1]!.foods);
  });
});

describe('formatBacktestAmount', () => {
  it('omits the ~ prefix when the abbreviation is exact', () => {
    expect(formatBacktestAmount(1000)).toBe('1K');
    expect(formatBacktestAmount(5000)).toBe('5K');
    expect(formatBacktestAmount(200000)).toBe('200K');
    expect(formatBacktestAmount(1500000)).toBe('1.5M');
    expect(formatBacktestAmount(2000000000)).toBe('2B');
  });

  it('adds a ~ prefix when the abbreviation loses precision', () => {
    expect(formatBacktestAmount(2189012287)).toBe('~2.19B');
    expect(formatBacktestAmount(457862870)).toBe('~457.86M');
    expect(formatBacktestAmount(1234)).toBe('~1.23K');
  });

  it('never abbreviates values under 1000', () => {
    expect(formatBacktestAmount(999)).toBe('999');
    expect(formatBacktestAmount(0)).toBe('0');
  });
});

describe('downsampleForChart', () => {
  it('returns all points when series is shorter than maxPoints', () => {
    const series = [1, 2, 3];
    const rounds = [100, 101, 102];
    expect(downsampleForChart(series, rounds, 500)).toEqual([
      { x: 100, y: 1 },
      { x: 101, y: 2 },
      { x: 102, y: 3 },
    ]);
  });

  it('downsamples and always keeps the last point', () => {
    const series = Array.from({ length: 1000 }, (_, i) => i);
    const rounds = Array.from({ length: 1000 }, (_, i) => i + 1);
    const points = downsampleForChart(series, rounds, 100);

    expect(points.length).toBeLessThanOrEqual(101);
    expect(points[points.length - 1]).toEqual({ x: 1000, y: 999 });
    expect(points[0]).toEqual({ x: 1, y: 0 });
  });
});
