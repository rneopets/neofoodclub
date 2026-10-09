import confetti from 'canvas-confetti';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, fireEvent } from '../../test/utils';
import CertifiedFansiteBanner from '../components/CertifiedFansiteBanner';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

describe('CertifiedFansiteBanner', () => {
  beforeEach(() => {
    vi.mocked(confetti).mockClear();
  });

  it('is always shown and cannot be dismissed', () => {
    render(<CertifiedFansiteBanner />);

    expect(screen.getByTestId('certified-fansite-banner')).toBeInTheDocument();
    expect(screen.getByText(/certified Neopets fansite/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('fires confetti from all four corners when clicking Yay!', () => {
    render(<CertifiedFansiteBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Yay!' }));

    expect(confetti).toHaveBeenCalledTimes(4);
    expect(confetti).toHaveBeenCalledWith(expect.objectContaining({ origin: { x: 0, y: 1 } }));
    expect(confetti).toHaveBeenCalledWith(expect.objectContaining({ origin: { x: 1, y: 1 } }));
    expect(confetti).toHaveBeenCalledWith(expect.objectContaining({ origin: { x: 0, y: 0 } }));
    expect(confetti).toHaveBeenCalledWith(expect.objectContaining({ origin: { x: 1, y: 0 } }));
  });
});
