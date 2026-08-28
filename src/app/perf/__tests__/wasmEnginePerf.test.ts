import fs from 'fs';
import path from 'path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { RoundData } from '../../../types';
import * as wasmEngineModule from '../../wasmEngine';
import { initWasmMath, wasmPiratesBinary } from '../../wasmMath';
import {
  deriveDefaultGambitBinary,
  deriveDefaultTenbetBinary,
  PERF_BET_COUNT,
  runEnginePerfSuite,
  timeOperation,
} from '../wasmEnginePerf';

// Spy on the engine rebuild so we can assert the suite (re)builds exactly once
// per run - and that a pre-aborted signal doesn't touch the app's engine at all.
vi.mock('../../wasmEngine', async importOriginal => {
  const actual = await importOriginal<typeof import('../../wasmEngine')>();
  return { ...actual, rebuildEngine: vi.fn(actual.rebuildEngine) };
});

const fixturesPath = path.resolve(__dirname, '../../__tests__/fixtures/rounds.jsonl');
const fixtureRounds: RoundData[] = fs
  .readFileSync(fixturesPath, 'utf8')
  .trim()
  .split('\n')
  .map(line => JSON.parse(line) as RoundData);

const OPERATIONS = [
  'makeMaxTerBets',
  'makeGambitBets',
  'makeWinningGambitBets',
  'makeBestGambitBets',
  'makeBustproofBets',
  'makeCrazyBets',
  'makeTenbetBets',
];

beforeAll(async () => {
  await initWasmMath();
});

describe('timeOperation', () => {
  it('invokes the function exactly `iterations` times and reports sane min/avg/max', () => {
    let calls = 0;
    const timing = timeOperation(() => {
      calls++;
    }, 25);

    expect(calls).toBe(25);
    expect(timing.minMs).toBeGreaterThanOrEqual(0);
    expect(timing.minMs).toBeLessThanOrEqual(timing.avgMs);
    expect(timing.avgMs).toBeLessThanOrEqual(timing.maxMs);
  });

  it('has min === max for a single iteration', () => {
    const noop = vi.fn();
    const timing = timeOperation(noop, 1);
    expect(timing.minMs).toBe(timing.maxMs);
    expect(timing.avgMs).toBe(timing.minMs);
  });
});

describe('default binary derivation', () => {
  it('gambit selects pirate index 1 in every arena (exactly one per arena)', () => {
    expect(deriveDefaultGambitBinary()).toBe(wasmPiratesBinary([1, 1, 1, 1, 1]));
  });

  it('tenbet selects pirate index 1 in the first three arenas (<=3 pirates total)', () => {
    expect(deriveDefaultTenbetBinary()).toBe(wasmPiratesBinary([1, 1, 0, 0, 0]));
  });
});

describe('runEnginePerfSuite', () => {
  const round = fixtureRounds[0]!;

  it('rebuilds the engine once and times every operation for a round with winners', async () => {
    vi.mocked(wasmEngineModule.rebuildEngine).mockClear();

    const progressCalls: number[] = [];
    const results = await runEnginePerfSuite({
      roundJson: JSON.stringify(round),
      useLogit: false,
      betAmount: 10000,
      iterations: 5,
      onProgress: done => progressCalls.push(done),
    });

    expect(wasmEngineModule.rebuildEngine).toHaveBeenCalledTimes(1);
    expect(wasmEngineModule.rebuildEngine).toHaveBeenCalledWith(
      JSON.stringify(round),
      10000,
      false,
    );

    expect(results.map(r => r.operation)).toEqual(OPERATIONS);
    expect(progressCalls).toEqual([1, 2, 3, 4, 5, 6, 7]);

    for (const result of results) {
      if (result.timing === null) {
        expect(result.skippedReason).toBeTruthy();
        continue;
      }
      const { minMs, avgMs, maxMs } = result.timing;
      expect(minMs).toBeGreaterThanOrEqual(0);
      expect(minMs).toBeLessThanOrEqual(avgMs);
      expect(avgMs).toBeLessThanOrEqual(maxMs);
    }

    // A finished round must time (not skip) the winner-dependent operation.
    const winningGambit = results.find(r => r.operation === 'makeWinningGambitBets')!;
    expect(winningGambit.timing).not.toBeNull();
  });

  it('skips makeWinningGambitBets with a reason when the round has no winners yet', async () => {
    const pendingRound = { ...round, winners: undefined };
    const results = await runEnginePerfSuite({
      roundJson: JSON.stringify(pendingRound),
      useLogit: false,
      betAmount: 10000,
      iterations: 3,
    });

    const winningGambit = results.find(r => r.operation === 'makeWinningGambitBets')!;
    expect(winningGambit.timing).toBeNull();
    expect(winningGambit.skippedReason).toBeTruthy();

    // The other operations are unaffected by missing winners.
    for (const result of results.filter(r => r.operation !== 'makeWinningGambitBets')) {
      expect(result.timing).not.toBeNull();
    }
  });

  it('reports both logit and legacy runs without throwing', async () => {
    for (const useLogit of [false, true]) {
      const results = await runEnginePerfSuite({
        roundJson: JSON.stringify(round),
        useLogit,
        betAmount: 25000,
        iterations: 3,
      });
      expect(results).toHaveLength(OPERATIONS.length);
    }
  });

  it('throws an AbortError without touching the engine when the signal is already aborted', async () => {
    vi.mocked(wasmEngineModule.rebuildEngine).mockClear();

    const controller = new AbortController();
    controller.abort();

    await expect(
      runEnginePerfSuite({
        roundJson: JSON.stringify(round),
        useLogit: false,
        betAmount: 10000,
        iterations: 3,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(wasmEngineModule.rebuildEngine).not.toHaveBeenCalled();
  });

  it('every operation yields either a timing or a skip reason (no partial results)', async () => {
    const results = await runEnginePerfSuite({
      roundJson: JSON.stringify(round),
      useLogit: false,
      betAmount: 10000,
      iterations: 2,
    });
    expect(PERF_BET_COUNT).toBe(10);
    for (const result of results) {
      expect(result.timing !== null || Boolean(result.skippedReason)).toBe(true);
    }
  });

  // Leaves the shared engine in a known-good state for other test files.
  it('restores the app engine to the current fixture round afterwards', () => {
    wasmEngineModule.rebuildEngine(JSON.stringify(round), 10000, false);
    expect(wasmEngineModule.wasmMakeMaxTerBets(10).bets.size).toBe(10);
  });
});
