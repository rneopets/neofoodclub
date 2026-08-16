import fs from 'fs';
import path from 'path';

import { describe, expect, it, beforeAll } from 'vitest';

import type { RoundData } from '../../../types';
import { computeLogitProbabilities } from '../../maths';
import { initWasmMath } from '../../wasmMath';
import {
  backtestRound,
  downsampleForChart,
  runBacktestAmountSweep,
  runFullBacktest,
} from '../runBacktest';
import type { BacktestRound } from '../types';

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

  it('returns a sane result for the legacy model', () => {
    const result = backtestRound(round, false, 500000, 10);
    expect(result.spent).toBeGreaterThan(0);
    expect(result.won).toBeGreaterThanOrEqual(0);
  });

  it('returns a sane result for the logit model', () => {
    const result = backtestRound(round, true, 500000, 10);
    expect(result.spent).toBeGreaterThan(0);
    expect(result.won).toBeGreaterThanOrEqual(0);
  });
});

describe('runFullBacktest', () => {
  it('aggregates totals and cumulative net correctly across rounds', async () => {
    const rounds = fixtureRounds.slice(0, 3);
    const summary = await runFullBacktest(rounds, { betAmount: 500000, betCount: 10 });

    expect(summary.rounds).toEqual(rounds.map(r => r.round));

    for (const model of [summary.legacy, summary.logit]) {
      expect(model.roundsPlayed).toBe(rounds.length);
      expect(model.cumulativeNet).toHaveLength(rounds.length);
      expect(model.netProfit).toBe(model.totalWon - model.totalSpent);
      expect(model.cumulativeNet[model.cumulativeNet.length - 1]).toBeCloseTo(model.netProfit, 6);
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
        chunkSize: 1,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
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
      onProgress: (done, total) => {
        progressCalls.push([done, total]);
      },
    });

    expect(points.map(p => p.amount)).toEqual(amounts);
    for (const point of points) {
      expect(point.legacy.roundsPlayed).toBe(rounds.length);
      expect(point.logit.roundsPlayed).toBe(rounds.length);
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
        signal: controller.signal,
      }),
    ).rejects.toThrow();
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
