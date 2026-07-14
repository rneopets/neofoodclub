import fs from 'fs';
import path from 'path';

import { Table } from '@chakra-ui/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render, screen, act } from '../../test/utils';
import type { RoundData } from '../../types';
import ArenaTableBody from '../components/tables/ArenaTableBody';
import { useBetStore } from '../stores/betStore';
import { useRoundStore } from '../stores/roundStore';

vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    };
  }),
}));

/**
 * Regression test for the per-pirate "Payout" cell (odds * probability - 1,
 * ArenaTableBody.tsx's PirateRow) silently ignoring Custom Odds - it read
 * `currentOdds` directly instead of resolving through Custom Odds mode like
 * the bet-level Odds/Payoff columns already do via getOdds().
 */
describe('ArenaTableBody Payout cell vs Custom Odds', () => {
  const fixturesPath = path.resolve(__dirname, 'fixtures/rounds.jsonl');
  const roundData: RoundData = JSON.parse(
    fs.readFileSync(fixturesPath, 'utf8').trim().split('\n')[0]!,
  );

  const noop = vi.fn();

  beforeEach(() => {
    useBetStore.setState({
      currentBet: 0,
      allBets: new Map([[0, new Map()]]),
      allBetAmounts: new Map([[0, new Map()]]),
      allNames: new Map([[0, 'Test Set']]),
    });
  });

  function renderArena(): void {
    render(
      <Table.Root>
        <ArenaTableBody
          arenaId={0}
          handleTimelineClick={noop}
          handleArenaTimelineClick={noop}
          handleBetLineChange={noop}
        />
      </Table.Root>,
    );
  }

  it('changes the Payout % for a pirate when Custom Odds are set for that pirate', () => {
    // Baseline: Big Brain on, Custom Odds mode off - Payout uses real currentOdds.
    useRoundStore.setState({
      roundData,
      currentSelectedRound: roundData.round,
      currentRound: roundData.round,
      bigBrain: true,
      useLogitModel: true, // collapses Min/Max/Std Prob into a single "Prob" cell
      customOddsMode: false,
      customOdds: null,
      customProbs: null,
    });
    useRoundStore.getState().recalculate();

    renderArena();
    const rowBefore = screen.getAllByRole('row')[1]!; // [0] is the arena header row
    const percentCellsBefore = rowBefore.querySelectorAll('td');
    // Column order (Big Brain, Logit model, Custom Odds mode off) is:
    // [pirate name, Prob%, Payout%, FA, ...]. Take the 2nd '%' cell (Payout).
    const payoutTextBefore = Array.from(percentCellsBefore)
      .map(td => td.textContent)
      .filter(text => text?.includes('%'))[1];

    // Now enable Custom Odds mode with a value for pirate 1 (index 0) in arena 0
    // that differs from its real currentOdds.
    const realOdds = roundData.currentOdds[0]![1]!;
    const customOddsValue = realOdds === 2 ? 3 : 2;
    const customOdds = roundData.currentOdds.map(arena => [...arena]);
    customOdds[0]![1] = customOddsValue;

    act(() => {
      useRoundStore.setState({
        customOddsMode: true,
        customOdds,
      });
      useRoundStore.getState().recalculate();
    });

    const rowAfter = screen.getAllByRole('row')[1]!;
    const percentCellsAfter = rowAfter.querySelectorAll('td');
    // Column order now includes the Custom Prob input before Payout, but
    // that's a NumberInput (no '%' text node), so Payout is still the 2nd match.
    const payoutTextAfter = Array.from(percentCellsAfter)
      .map(td => td.textContent)
      .filter(text => text?.includes('%'))[1];

    expect(payoutTextAfter).not.toBe(payoutTextBefore);

    // Verify it matches customOddsValue * prob - 1 exactly, using the same
    // usedProbabilities the component itself reads.
    const prob = useRoundStore.getState().calculations.usedProbabilities?.[0]?.[1] ?? 0;
    const expectedPayout = customOddsValue * prob - 1;
    const expectedText = `${(expectedPayout * 100).toFixed(1)}%`;
    expect(payoutTextAfter).toBe(expectedText);
  });
});
