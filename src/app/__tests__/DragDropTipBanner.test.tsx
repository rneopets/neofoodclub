import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '../../test/utils';
import DragDropTipBanner from '../components/DragDropTipBanner';
import { useOtherTabHasBets } from '../hooks';
import { useHasAnyBets } from '../stores';

vi.mock('../stores', () => ({
  useHasAnyBets: vi.fn(),
}));

vi.mock('../hooks', () => ({
  useOtherTabHasBets: vi.fn(),
}));

const mockUseHasAnyBets = vi.mocked(useHasAnyBets);
const mockUseOtherTabHasBets = vi.mocked(useOtherTabHasBets);

describe('DragDropTipBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when anyBets is false', () => {
    mockUseHasAnyBets.mockReturnValue(false);
    mockUseOtherTabHasBets.mockReturnValue(true);

    render(<DragDropTipBanner />);

    expect(screen.queryByText(/drag a bet link/i)).not.toBeInTheDocument();
  });

  it('renders nothing when otherTabHasBets is false even if anyBets is true', () => {
    mockUseHasAnyBets.mockReturnValue(true);
    mockUseOtherTabHasBets.mockReturnValue(false);

    render(<DragDropTipBanner />);

    expect(screen.queryByText(/drag a bet link/i)).not.toBeInTheDocument();
  });

  it('renders the tip text when both anyBets and otherTabHasBets are true', () => {
    mockUseHasAnyBets.mockReturnValue(true);
    mockUseOtherTabHasBets.mockReturnValue(true);

    render(<DragDropTipBanner />);

    expect(screen.getByText(/drag a bet link/i)).toBeInTheDocument();
  });

  it('hides the banner when the close button is clicked', () => {
    mockUseHasAnyBets.mockReturnValue(true);
    mockUseOtherTabHasBets.mockReturnValue(true);

    render(<DragDropTipBanner />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss tip/i }));

    expect(screen.queryByText(/drag a bet link/i)).not.toBeInTheDocument();
  });
});
