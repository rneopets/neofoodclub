import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, fireEvent } from '../../../../test/utils';
import { makeBetURL } from '../../../util';
import PlaceThisBetButton from '../PlaceThisBetButton';

const ROUND = 10014;

const state = vi.hoisted(() => ({
  isRoundOver: false,
  betAmount: 5000,
  binaries: new Map<number, number>(),
  // bet set 1 holds one bet: arena 1 pirate 1 and arena 3 pirate 3
  allBets: new Map([[1, new Map([[1, [1, 0, 3, 0, 0]]])]]),
  allBetAmounts: new Map([[1, new Map([[1, 5000]])]]),
}));

vi.mock('../../../hooks/useIsRoundOver', () => ({
  useIsRoundOver: (): boolean => state.isRoundOver,
}));

vi.mock('../../../stores', () => ({
  useSelectedRound: (): number => 10014,
  useCurrentBet: (): number => 1,
  useAllBets: (): typeof state.allBets => state.allBets,
  useAllBetAmounts: (): typeof state.allBetAmounts => state.allBetAmounts,
  useBetAmount: (): number => state.betAmount,
  useBetBinaries: (): typeof state.binaries => state.binaries,
}));

describe('PlaceThisBetButton', () => {
  beforeEach(() => {
    state.isRoundOver = false;
    state.betAmount = 5000;
    state.binaries = new Map();
  });

  it('is a link to the Neopets bet page carrying the bet set', () => {
    render(<PlaceThisBetButton bet={[1, 0, 3, 0, 0]} betNum={1} />);

    const link = screen.getByRole('link', { name: /place bet!/i });
    const expectedFragment = makeBetURL(
      ROUND,
      state.allBets.get(1),
      state.allBetAmounts.get(1),
      true,
    ).replace(/^\//, '');

    expect(link).toHaveAttribute(
      'href',
      `https://www.neopets.com/pirates/foodclub.phtml?tab=bet${expectedFragment}`,
    );
    expect(link.getAttribute('href')).toMatch(/#round=10014&b=[a-y]+&a=[a-zA-Z]+$/);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('says "Bet placed!" after the link is clicked', () => {
    render(<PlaceThisBetButton bet={[1, 0, 3, 0, 0]} betNum={1} />);

    const link = screen.getByRole('link', { name: /place bet!/i });
    // keep the click from navigating jsdom
    link.addEventListener('click', event => event.preventDefault());
    fireEvent.click(link);

    expect(screen.getByRole('link', { name: /bet placed!/i })).toBeInTheDocument();
  });

  it('is not a link when the round is over', () => {
    state.isRoundOver = true;
    render(<PlaceThisBetButton bet={[1, 0, 3, 0, 0]} betNum={1} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /round is over!/i })).toBeDisabled();
  });

  it('is not a link when the bet amount is invalid', () => {
    state.betAmount = 0;
    render(<PlaceThisBetButton bet={[1, 0, 3, 0, 0]} betNum={1} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invalid bet amount!/i })).toBeDisabled();
  });
});
