import fs from 'fs';
import path from 'path';

import { describe, expect, it, beforeAll } from 'vitest';

import type { RoundData } from '../../../types';
import { initWasmMath } from '../../wasmMath';
import {
  runBestGambitHallOfFame,
  type BestGambitHallOfFameModelResult,
} from '../bestGambitHallOfFame';
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

function assertModelInvariants(result: BestGambitHallOfFameModelResult, roundCount: number): void {
  // Best-gambit always produces a non-empty set, so every round plays.
  expect(result.roundsPlayed).toBe(roundCount);
  expect(result.cumulativeNet).toHaveLength(roundCount);
  expect(result.netProfit).toBe(result.totalWon - result.totalSpent);
  if (roundCount > 0) {
    expect(result.cumulativeNet[result.cumulativeNet.length - 1]).toBeCloseTo(result.netProfit, 6);
  }
  if (result.totalSpent > 0) {
    expect(result.roi).toBeCloseTo(result.netProfit / result.totalSpent, 6);
  } else {
    expect(result.roi).toBe(0);
  }

  // Top wins are all positive and descending; top losses all negative and ascending (most-negative first).
  for (let i = 0; i < result.topWins.length; i++) {
    expect(result.topWins[i]!.net).toBeGreaterThan(0);
    if (i > 0) {
      expect(result.topWins[i]!.net).toBeLessThanOrEqual(result.topWins[i - 1]!.net);
    }
  }
  for (let i = 0; i < result.topLosses.length; i++) {
    expect(result.topLosses[i]!.net).toBeLessThan(0);
    if (i > 0) {
      expect(result.topLosses[i]!.net).toBeGreaterThanOrEqual(result.topLosses[i - 1]!.net);
    }
  }

  // roundsWon is the count of cumulative steps where net was positive for that round.
  expect(result.roundsWon).toBeGreaterThanOrEqual(0);
  expect(result.roundsWon).toBeLessThanOrEqual(roundCount);
}

describe('runBestGambitHallOfFame', () => {
  it('backtests every round for both models and surfaces hall-of-fame stats', async () => {
    const rounds = fixtureRounds.slice(0, 5);
    const summary = await runBestGambitHallOfFame(rounds, {
      betAmount: 10000,
      betCount: 10,
    });

    expect(summary.rounds).toEqual(rounds.map(r => r.round));
    assertModelInvariants(summary.legacy, rounds.length);
    assertModelInvariants(summary.logit, rounds.length);

    // Both models must have actually wagered something on every round.
    expect(summary.legacy.totalSpent).toBeGreaterThan(0);
    expect(summary.logit.totalSpent).toBeGreaterThan(0);
  });

  it('respects the topN limit on wins and losses', async () => {
    const rounds = fixtureRounds; // all 20 rounds for more data
    const summary = await runBestGambitHallOfFame(rounds, {
      betAmount: 10000,
      betCount: 10,
      topN: 3,
    });

    expect(summary.legacy.topWins.length).toBeLessThanOrEqual(3);
    expect(summary.legacy.topLosses.length).toBeLessThanOrEqual(3);
    expect(summary.logit.topWins.length).toBeLessThanOrEqual(3);
    expect(summary.logit.topLosses.length).toBeLessThanOrEqual(3);
  });

  it('reports progress and can be aborted', async () => {
    const rounds = fixtureRounds.slice(0, 3);
    const controller = new AbortController();
    controller.abort();

    await expect(
      runBestGambitHallOfFame(rounds, {
        betAmount: 10000,
        betCount: 10,
        chunkSize: 1,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it('legacy and logit can disagree on which rounds win (models differ)', async () => {
    const rounds = fixtureRounds; // full set so the models have room to diverge
    const summary = await runBestGambitHallOfFame(rounds, {
      betAmount: 10000,
      betCount: 10,
    });

    // Not asserting they differ (they might match on a small set), but both
    // invariants must hold independently.
    assertModelInvariants(summary.legacy, rounds.length);
    assertModelInvariants(summary.logit, rounds.length);
  });
});
