import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render, makeRoundData } from '../../../../test/utils';
import type { Bet, BetAmount } from '../../../../types/bets';
import { useBetStore } from '../../../stores/betStore';
import { useRoundStore } from '../../../stores/roundStore';
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
});
