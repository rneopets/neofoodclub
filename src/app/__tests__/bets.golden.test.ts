import fs from 'fs';
import path from 'path';

import { describe, expect, it, beforeAll } from 'vitest';

import type { RoundData } from '../../types';
import type { Bet, BetAmount } from '../../types/bets';
import {
  rebuildEngine,
  applyCustomOdds,
  applyCustomProbabilities,
  wasmMakeMaxTerBets,
  wasmMakeBestGambitBets,
  wasmMakeGambitBets,
  wasmMakeWinningGambitBets,
  wasmMakeBustproofBets,
  wasmMakeCrazyBets,
  wasmMakeTenbetBets,
} from '../wasmEngine';
import { initWasmMath, wasmPiratesBinary } from '../wasmMath';

/**
 * Regression net for the 7 bet generators now delegated to the wasm engine
 * (see src/app/wasmEngine.ts and src/app/hooks/useBetManagement.ts).
 *
 * Unlike maths.golden.test.ts, divergence from the OLD hand-rolled TS
 * output is expected/desired here for the decided edge cases (see the
 * "behavior changes" suite below) - this suite instead guards against
 * *accidental* future regressions (e.g. a later submodule bump changing
 * max-TER ranking order). Review snapshot diffs carefully rather than
 * blindly updating them.
 */

// Snapshotted values here are always plain JSON-shaped data (numbers,
// arrays, small objects, null) - print them as compact single-line JSON
// instead of vitest's default multi-line pretty-format, which otherwise
// balloons this file's .snap output to one line per array element/field.
// Note: JSON.stringify silently coerces NaN/Infinity to null; none of the
// current fixtures produce those values.
expect.addSnapshotSerializer({
  test: () => true,
  print: val => JSON.stringify(val),
});

const fixturesDir = path.resolve(__dirname, 'fixtures/rounds');
const fixtureFiles = fs
  .readdirSync(fixturesDir)
  .filter(f => f.endsWith('.json'))
  .sort()
  .slice(0, 20);

function loadFixture(file: string): RoundData {
  const raw = fs.readFileSync(path.join(fixturesDir, file), 'utf8');
  return JSON.parse(raw) as RoundData;
}

function serialize(result: { bets: Bet; betAmounts: BetAmount }): unknown {
  return {
    bets: Array.from(result.bets.entries()),
    betAmounts: Array.from(result.betAmounts.entries()),
  };
}

beforeAll(async () => {
  await initWasmMath();
});

describe('bets.ts golden regression (wasm-backed generators)', () => {
  for (const file of fixtureFiles) {
    describe(`fixture ${file}`, () => {
      const roundData = loadFixture(file);

      beforeAll(() => {
        rebuildEngine(JSON.stringify(roundData), 500000, false);
      });

      it('makeMaxTerBets', () => {
        expect(serialize(wasmMakeMaxTerBets(10))).toMatchSnapshot();
      });

      it('makeBestGambitBets', () => {
        expect(serialize(wasmMakeBestGambitBets(10))).toMatchSnapshot();
      });

      it('makeGambitBets with pirate index 1 in every arena', () => {
        const binary = wasmPiratesBinary([1, 1, 1, 1, 1]);
        expect(serialize(wasmMakeGambitBets(binary, 10))).toMatchSnapshot();
      });

      it('makeTenbetBets with a valid 3-arena selection', () => {
        const binary = wasmPiratesBinary([1, 1, 1, 0, 0]);
        expect(serialize(wasmMakeTenbetBets(binary, 10))).toMatchSnapshot();
      });

      it('makeWinningGambitBets', () => {
        const result = wasmMakeWinningGambitBets(10);
        expect(result ? serialize(result) : null).toMatchSnapshot();
      });

      it('makeBustproofBets', () => {
        const result = wasmMakeBustproofBets(10);
        expect(result ? serialize(result) : null).toMatchSnapshot();
      });

      it('makeCrazyBets has the right shape (values are random, not snapshotted)', () => {
        const result = wasmMakeCrazyBets(10);
        expect(result.bets.size).toBe(10);
        expect(result.betAmounts.size).toBe(10);
        for (const bet of result.bets.values()) {
          expect(bet).toHaveLength(5);
        }
      });
    });
  }
});

describe('behavior changes (Tier 2 - intentional divergences from the old TS implementation)', () => {
  const fixture = loadFixture(fixtureFiles[0] as string);

  beforeAll(() => {
    rebuildEngine(JSON.stringify(fixture), 500000, false);
  });

  it('tenbet throws instead of hanging on an unsatisfiable selection (>3 pirates total)', () => {
    // selecting a pirate in all 5 arenas is more than tenbet's 3-pirate cap -
    // the old TS implementation could loop indefinitely searching for a
    // combination containing all 5 required pirates that never appears.
    const binary = wasmPiratesBinary([1, 1, 1, 1, 1]);
    expect(() => wasmMakeTenbetBets(binary, 10)).toThrow();
  });

  it('tenbet throws on a 0-pirate selection', () => {
    const binary = wasmPiratesBinary([0, 0, 0, 0, 0]);
    expect(() => wasmMakeTenbetBets(binary, 10)).toThrow();
  });

  it('gambit with fewer than 5 pirates selected throws a catchable error, not a wasm trap', () => {
    // only 4 arenas selected (one arena left at 0/no-pick) - popcount is 4, not 5
    const binary = wasmPiratesBinary([1, 1, 1, 1, 0]);
    expect(() => wasmMakeGambitBets(binary, 10)).toThrow();

    // critically, the engine must still be usable after a caught error -
    // a stateful long-lived engine could otherwise be left trapped by an
    // uncaught panic under the old (unvalidated) design.
    expect(() => wasmMakeMaxTerBets(10)).not.toThrow();
  });

  it('winningGambitBets is null (not an empty result) when the round has no winners yet', () => {
    const inProgress: RoundData = { ...fixture, winners: [0, 0, 0, 0, 0] };
    rebuildEngine(JSON.stringify(inProgress), 500000, false);
    try {
      expect(wasmMakeWinningGambitBets(10)).toBeNull();
    } finally {
      // restore the engine for subsequent tests in this file
      rebuildEngine(JSON.stringify(fixture), 500000, false);
    }
  });

  it('custom odds and custom probabilities measurably change max-TER output, and clear cleanly', () => {
    const baseline = serialize(wasmMakeMaxTerBets(10));

    const oddsGrid = Array.from({ length: 5 }, () => [0, 2, 13, 13, 13]);
    applyCustomOdds(oddsGrid);
    expect(serialize(wasmMakeMaxTerBets(10))).not.toEqual(baseline);
    applyCustomOdds(null);
    expect(serialize(wasmMakeMaxTerBets(10))).toEqual(baseline);

    const probsGrid = [
      [0, 0.9, 0.03, 0.03, 0.04],
      [0, 0.9, 0.03, 0.03, 0.04],
      [0, 0.9, 0.03, 0.03, 0.04],
      [0, 0.9, 0.03, 0.03, 0.04],
      [0, 0.9, 0.03, 0.03, 0.04],
    ];
    applyCustomProbabilities(probsGrid);
    expect(serialize(wasmMakeMaxTerBets(10))).not.toEqual(baseline);
    applyCustomProbabilities(null);
    expect(serialize(wasmMakeMaxTerBets(10))).toEqual(baseline);
  });
});
