import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  calculateArenaRatios,
  calculatePayoutTables,
  computeBinaryToPirates,
  computeLegacyProbabilities,
  computeLogitProbabilities,
  computePirateBinary,
  computePiratesBinary,
} from '../maths';
import type { RoundData } from '../../types';
import type { Bet, BetAmount } from '../../types/bets';

/**
 * Regression net for the pure-math core now delegated to the wasm engine
 * (see src/app/wasmMath.ts). Fixtures are a deterministic slice of real
 * historical rounds (automation/raw_json), including both old rounds with
 * `foods: null` and newer ones with full food data. If a future change
 * (e.g. bumping the wasm/neofoodclub_rs submodule) alters these values,
 * this suite is what will catch it - review snapshot diffs carefully rather
 * than blindly updating them.
 */
const fixturesDir = path.resolve(__dirname, '../../../automation/raw_json');
const fixtureFiles = fs
  .readdirSync(fixturesDir)
  .filter(f => f.endsWith('.json'))
  .sort()
  .slice(0, 20);

function loadFixture(file: string): RoundData {
  const raw = fs.readFileSync(path.join(fixturesDir, file), 'utf8');
  return JSON.parse(raw) as RoundData;
}

// A handful of representative bet shapes: single-pirate, two-arena, and a
// full 5-arena bet, covering different "ib" overlap patterns in the payout
// table's binary-combination algorithm.
function makeSampleBets(): { bets: Bet; betAmounts: BetAmount } {
  const bets: Bet = new Map([
    [1, [1, 0, 0, 0, 0]],
    [2, [1, 2, 0, 0, 0]],
    [3, [1, 2, 3, 4, 1]],
    [4, [0, 0, 0, 0, 2]],
  ]);
  const betAmounts: BetAmount = new Map([
    [1, 50],
    [2, 100],
    [3, 500],
    [4, 200],
  ]);
  return { bets, betAmounts };
}

describe('maths.ts golden regression (wasm-backed)', () => {
  for (const file of fixtureFiles) {
    describe(`fixture ${file}`, () => {
      const roundData = loadFixture(file);

      it('computeLegacyProbabilities', () => {
        expect(computeLegacyProbabilities(roundData)).toMatchSnapshot();
      });

      it('computeLogitProbabilities', () => {
        expect(computeLogitProbabilities(roundData)).toMatchSnapshot();
      });

      it('calculateArenaRatios (current odds)', () => {
        expect(calculateArenaRatios(roundData.currentOdds)).toMatchSnapshot();
      });

      it('calculateArenaRatios (opening odds)', () => {
        expect(calculateArenaRatios(roundData.openingOdds)).toMatchSnapshot();
      });

      it('pirate binary round-trips over pirates and winners', () => {
        const piratesBinary = roundData.pirates.map((_, arenaIndex) =>
          roundData.pirates.map((__, pirateIndex) =>
            computePirateBinary(arenaIndex, pirateIndex + 1),
          ),
        );
        expect(piratesBinary).toMatchSnapshot('per-pirate binaries');

        const winnersBinary = computePiratesBinary(roundData.winners ?? [0, 0, 0, 0, 0]);
        expect(winnersBinary).toMatchSnapshot('winners binary');
        expect(computeBinaryToPirates(winnersBinary)).toEqual(roundData.winners ?? [0, 0, 0, 0, 0]);
      });

      it('calculatePayoutTables over a representative bet set', () => {
        const { bets, betAmounts } = makeSampleBets();
        const probabilities = computeLegacyProbabilities(roundData).used;
        const odds = roundData.currentOdds;

        const betOdds = new Map<number, number>();
        const betPayoffs = new Map<number, number>();
        for (const [key, bet] of bets) {
          let oddsProduct = 1;
          for (let arena = 0; arena < 5; arena++) {
            const pirateIndex = bet[arena] ?? 0;
            if (pirateIndex > 0) {
              oddsProduct *= odds[arena]?.[pirateIndex] ?? 1;
            }
          }
          const amount = betAmounts.get(key) ?? 0;
          betOdds.set(key, oddsProduct);
          betPayoffs.set(key, Math.min(1_000_000, amount * oddsProduct));
        }

        const payoutTables = calculatePayoutTables(bets, probabilities, betOdds, betPayoffs);
        expect(payoutTables).toMatchSnapshot();
      });
    });
  }
});
