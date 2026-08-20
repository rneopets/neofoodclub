import fs from 'fs';
import path from 'path';

import { Table } from '@chakra-ui/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render, screen } from '../../test/utils';
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
 * Regression test: the arena ratio header cell rendered
 * `<AnimatedNumber value={currentArenaRatio as number} />` even while
 * currentArenaRatio was genuinely undefined (before the round store's
 * first calculation completes) - the `as number` cast just lied to the
 * type checker. displayAsPercent(undefined, 1) is itself "NaN%", and
 * useTween's lerp interpolating from `undefined` is NaN for the whole
 * transition too, so this showed up both as a momentary flash and (worse)
 * a statically wrong value if calculations were slow to finish.
 */
describe('ArenaTableBody arena ratio', () => {
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

  it('never renders NaN% before the round store has calculated arena ratios', () => {
    useRoundStore.setState({
      roundData,
      currentSelectedRound: roundData.round,
      currentRound: roundData.round,
      bigBrain: true,
    });
    // Deliberately don't call recalculate() - simulates the window right
    // after roundData loads but before calculations (and thus arenaRatios)
    // have run, which is exactly when the bug showed up.
    useRoundStore.setState(state => ({
      calculations: { ...state.calculations, calculated: false, arenaRatios: [] },
    }));

    renderArena();

    const headerRow = screen.getAllByRole('row')[0]!;
    expect(headerRow.textContent).not.toContain('NaN');
  });

  it('shows the real arena ratio once calculations have run', () => {
    useRoundStore.setState({
      roundData,
      currentSelectedRound: roundData.round,
      currentRound: roundData.round,
      bigBrain: true,
    });
    useRoundStore.getState().recalculate();

    renderArena();

    const headerRow = screen.getAllByRole('row')[0]!;
    const arenaRatio = useRoundStore.getState().calculations.arenaRatios[0];
    expect(arenaRatio).toBeDefined();
    expect(headerRow.textContent).toContain(`${(arenaRatio! * 100).toFixed(1)}%`);
    expect(headerRow.textContent).not.toContain('NaN');
  });
});
