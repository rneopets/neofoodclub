import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, act, makeRoundData } from '../../test/utils';
import type { RoundCalculationResult } from '../../types';
import type { Bet, BetAmount } from '../../types/bets';
import BetFunctions from '../BetFunctions';
import { BET_AMOUNT_DEFAULT } from '../constants';
import { useBetStore } from '../stores/betStore';
import { useRoundStore } from '../stores/roundStore';

// The round store reads cookies at module init (getMaxBet), so keep that from
// touching the real document.cookie in jsdom. Everything else - bet/round stores,
// calculations (wasm included), useBetManagement - runs for real so the badges'
// numbers are the genuine output of the pipeline.
vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    };
  }),
}));

// One bet on pirate #1 in every arena, amount 100. With the fixture's currentOdds
// of [1,2,3,4,5] per arena that's 2^5 = 32 odds and (once the winners match) a
// 3,200 NP payoff.
const BETS: Bet = new Map([[1, [1, 1, 1, 1, 1]]]);
const BET_AMOUNTS: BetAmount = new Map([[1, 100]]);

// The badge numbers tween on a rAF loop (AnimatedNumber), so read each span's
// aria-label - always the final formatted value - rather than its textContent.
const getBadgeLabels = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll('span[aria-label]'))
    // The set-name heading (Chakra Editable) renders its own edit-affordance span;
    // the badge numbers are every other aria-label span in the card.
    .filter(el => el.getAttribute('aria-label') !== 'edit')
    .map((el): string => el.getAttribute('aria-label')!);

// The badge values come from the same store calculations the component reads, so
// mirror BetBadges' formulas here (including which badges appear at all) to build
// the expected aria-labels in DOM order.
const buildExpectedLabels = (calcs: RoundCalculationResult, isRoundOver: boolean): string[] => {
  const labels: string[] = [];

  // TER badge (always present for a valid, calculated set)
  let totalTer = 0;
  calcs.betBinaries.forEach((binary, betKey) => {
    if (binary > 0) {
      totalTer += calcs.betExpectedRatios.get(betKey) ?? 0;
    }
  });
  labels.push(totalTer.toFixed(3));

  // Once the round is over, performanceBadges early-returns after the TER badge.
  if (!isRoundOver) {
    // Bust chance badge (payout row with value 0); "Bust-proof!" has no number
    const bustChance =
      calcs.payoutTables.odds[0]?.value === 0
        ? (calcs.payoutTables.odds[0]?.probability ?? 0) * 100
        : 0;
    if (bustChance > 0) {
      labels.push(`${Math.floor(bustChance)}%`);
    }

    // Guaranteed profit badge (lowest winnings row beats the total bet amount)
    const betAmountsTotal = Array.from(BET_AMOUNTS.values())
      .filter(amount => amount !== BET_AMOUNT_DEFAULT)
      .reduce<number>((total, amount) => total + amount, 0);
    const lowestProfit = calcs.payoutTables.winnings[0]?.value ?? 0;
    if (betAmountsTotal < lowestProfit) {
      labels.push(Number((lowestProfit - betAmountsTotal).toFixed(0)).toLocaleString());
    }
  }

  // Results badges (round over only)
  if (isRoundOver && calcs.winningBetBinary > 0) {
    let unitsWon = 0;
    let npWon = 0;
    calcs.betBinaries.forEach((binary, betKey) => {
      if (binary > 0 && (calcs.winningBetBinary & binary) === binary) {
        unitsWon += calcs.betOdds.get(betKey) ?? 0;
        npWon += Math.min(
          (calcs.betOdds.get(betKey) ?? 0) * (BET_AMOUNTS.get(betKey) ?? 0),
          1_000_000,
        );
      }
    });

    if (unitsWon > 0) {
      labels.push(Number(unitsWon.toFixed(0)).toLocaleString());
      if (npWon > 0) {
        labels.push(Number(npWon.toFixed(0)).toLocaleString());
      }
    }
  }

  return labels;
};

describe('BetBadges (AnimatedNumber)', () => {
  beforeEach(() => {
    useBetStore.setState({
      currentBet: 0,
      allBets: new Map([[0, BETS]]),
      allBetAmounts: new Map([[0, BET_AMOUNTS]]),
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

  it('shows the TER and bust chance badges as numbers matching the calculations while the round is live', () => {
    const calcs = useRoundStore.getState().calculations;

    // Fixture sanity: the set is calculated and the payout table has a bust row
    expect(calcs.calculated).toBe(true);
    expect(calcs.payoutTables.odds[0]?.value).toBe(0);
    expect(calcs.payoutTables.odds[0]?.probability ?? 0).toBeGreaterThan(0);

    const { container } = render(<BetFunctions />);

    // Sanity on the anchors: TER and a (non-zero) bust chance badge are present.
    // The bust badge's text is split across the emoji and the AnimatedNumber span,
    // so match on the container's text rather than a single element.
    expect(screen.getByText('TER:')).toBeInTheDocument();
    expect(container.textContent).toContain('Bust');

    // No results badges while the round is live
    expect(screen.queryByText('Units won:')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('NP won');

    // The only aria-label spans in the rendered component are the badge numbers,
    // in DOM order: TER then bust chance.
    expect(getBadgeLabels(container!)).toEqual(buildExpectedLabels(calcs, false));
  });

  it('shows the units-won and NP-won badges as numbers matching the calculations once the round is over', () => {
    // The winning pirates are #1 in every arena - exactly the bet's line - so the
    // single bet pays out.
    act(() => {
      useRoundStore.setState({ roundData: makeRoundData({ winners: [1, 1, 1, 1, 1] }) });
      useRoundStore.getState().recalculate();
    });

    const calcs = useRoundStore.getState().calculations;
    expect(calcs.winningBetBinary).toBeGreaterThan(0);

    const { container } = render(<BetFunctions />);

    // Sanity on the anchors: TER plus both results badges. Once the round is over,
    // performanceBadges early-return after TER, so no bust chance badge.
    expect(screen.getByText('TER:')).toBeInTheDocument();
    expect(screen.getByText('Units won:')).toBeInTheDocument();
    expect(container!.textContent).toContain('NP won');
    // The bet paid out, so no "Busted" badge
    expect(container!.textContent).not.toContain('Busted');

    // DOM order: TER, then units won and NP won.
    expect(getBadgeLabels(container!)).toEqual(buildExpectedLabels(calcs, true));
  });
});
