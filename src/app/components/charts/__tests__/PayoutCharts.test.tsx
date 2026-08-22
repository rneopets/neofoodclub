import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render, makeRoundData, screen, act } from '../../../../test/utils';
import type { PayoutData } from '../../../../types';
import type { Bet, BetAmount } from '../../../../types/bets';
import { useBetStore } from '../../../stores/betStore';
import { useRoundStore } from '../../../stores/roundStore';
import { displayAsPercent, getMaxSmartPercentDecimals } from '../../../util';
import PayoutCharts from '../PayoutCharts';

vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    };
  }),
}));

// Regression test for the crash reported after selecting a bet: PayoutCharts builds a
// Chart.js "scatter" chart (via PayoutScatter) but only registered LinearScale,
// PointElement, LineElement, Tooltip, Legend, and the annotation plugin - never
// ScatterController. Without it, Chart.js can't resolve the scale type for a "scatter"
// chart and falls back to an unregistered "category" scale, throwing
// `Error: "category" is not a registered scale.` inside a useLayoutEffect, which - with
// no local error boundary around the chart - takes down the whole page.
//
// This only reproduced against a production build (`vite build` + preview), not the dev
// server, so a component test that renders the real chart through the real registration
// path (rather than an e2e test against `vite dev`) is what actually catches it.
describe('PayoutCharts', () => {
  beforeEach(() => {
    const bets: Bet = new Map([[1, [1, 1, 1, 1, 1]]]);
    const betAmounts: BetAmount = new Map([[1, 1000]]);

    useBetStore.setState({
      currentBet: 0,
      allBets: new Map([[0, bets]]),
      allBetAmounts: new Map([[0, betAmounts]]),
      allNames: new Map([[0, 'Test Set']]),
    });

    useRoundStore.setState({
      roundData: makeRoundData(),
      currentSelectedRound: 8000,
      currentRound: 8000,
      bigBrain: false,
      useLogitModel: false,
      customOddsMode: false,
      customOdds: null,
      customProbs: null,
    });
    useRoundStore.getState().recalculate();
  });

  it('has a non-empty payout table once a bet is selected (sanity check for the fixture)', () => {
    const { payoutTables } = useRoundStore.getState().calculations;
    expect(payoutTables.odds.length).toBeGreaterThan(0);
    expect(payoutTables.winnings.length).toBeGreaterThan(0);
  });

  it('renders the odds and winnings scatter charts without crashing after a bet is selected', () => {
    let container: HTMLElement;
    expect(() => {
      ({ container } = render(<PayoutCharts />));
    }).not.toThrow();

    const canvases = container!.querySelectorAll('canvas');
    expect(canvases.length).toBe(2);
  });

  // The table cells render their numbers through AnimatedNumber, which tweens its
  // visible text on a rAF loop. Reading the span's aria-label (always the final
  // formatted value) rather than textContent keeps these assertions stable while a
  // tween is in flight (same convention as ArenaTableBody.customOdds.test.tsx).
  const getTableByTitle = (title: string): HTMLTableElement => {
    const header = screen.getByRole('columnheader', { name: title });
    return header.closest('table') as HTMLTableElement;
  };

  const getDataRowCellLabels = (
    table: HTMLTableElement,
    rowIndex: number,
  ): Array<string | null> => {
    const dataRows = table.querySelectorAll('tbody > tr');
    const row = dataRows[rowIndex]!;
    return Array.from(row.querySelectorAll('td')).map(
      td => td.querySelector('span[aria-label]')?.getAttribute('aria-label') ?? null,
    );
  };

  // Mirror PayoutCharts' makeTable formatting exactly: the value column uses
  // precision=0 + the default toLocaleString, and each percent column is formatted
  // with a shared "smart" decimal count derived from the whole table.
  const expectedRowLabels = (data: PayoutData[], rowIndex: number): string[] => {
    const probabilityDecimals = getMaxSmartPercentDecimals(data.map(d => d.probability));
    const cumulativeDecimals = getMaxSmartPercentDecimals(data.map(d => d.cumulative || 0));
    const tailDecimals = getMaxSmartPercentDecimals(data.map(d => d.tail || 0));
    const row = data[rowIndex]!;

    return [
      Number(row.value.toFixed(0)).toLocaleString(),
      displayAsPercent(row.probability, probabilityDecimals),
      displayAsPercent(row.cumulative || 0, cumulativeDecimals),
      displayAsPercent(row.tail || 0, tailDecimals),
    ];
  };

  const assertTableMatchesCalculations = (title: string, data: PayoutData[]): void => {
    const table = getTableByTitle(title);
    const dataRows = table.querySelectorAll('tbody > tr');
    expect(dataRows.length).toBe(data.length);

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      expect(getDataRowCellLabels(table, rowIndex)).toEqual(expectedRowLabels(data, rowIndex));
    }
  };

  it('renders every payout table cell as an AnimatedNumber whose value matches the calculations', () => {
    render(<PayoutCharts />);

    const { odds, winnings } = useRoundStore.getState().calculations.payoutTables;
    expect(odds.length).toBeGreaterThan(0);
    expect(winnings.length).toBeGreaterThan(0);

    assertTableMatchesCalculations('Odds', odds);
    assertTableMatchesCalculations('Winnings', winnings);
  });

  it('updates payout table cell values when the odds change and the round recalculates', () => {
    render(<PayoutCharts />);

    const before = useRoundStore.getState().calculations.payoutTables;
    assertTableMatchesCalculations('Odds', before.odds);

    // Bump each pirate's odds by one (leaving the no-pirate baseline at index 0,
    // which must stay 1 for valid round data) so the payout values shift.
    const bumpedOdds = useRoundStore
      .getState()
      .roundData.currentOdds.map(arena =>
        arena.map((odds, pirateIndex) => (pirateIndex === 0 ? odds : odds + 1)),
      );
    act(() => {
      useRoundStore.setState({
        roundData: makeRoundData({ currentOdds: bumpedOdds }),
      });
      useRoundStore.getState().recalculate();
    });

    const after = useRoundStore.getState().calculations.payoutTables;
    // Sanity: the bump actually changed at least one displayed value, so this is a
    // genuine update rather than a no-op re-render.
    expect(after.odds.map(d => d.value)).not.toEqual(before.odds.map(d => d.value));

    assertTableMatchesCalculations('Odds', after.odds);
    assertTableMatchesCalculations('Winnings', after.winnings);
  });
});
