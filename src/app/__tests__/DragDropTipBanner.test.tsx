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

/** In-memory localStorage stand-in, since jsdom's real implementation is
 * unreliable across Node versions/environments in this test setup. */
function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store.clear();
    },
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    get length(): number {
      return store.size;
    },
  } as Storage;
}

describe('DragDropTipBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: createMockLocalStorage(),
      writable: true,
      configurable: true,
    });
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

  it('persists dismissal across remounts via localStorage', () => {
    mockUseHasAnyBets.mockReturnValue(true);
    mockUseOtherTabHasBets.mockReturnValue(true);

    const { unmount } = render(<DragDropTipBanner />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss tip/i }));
    unmount();

    render(<DragDropTipBanner />);

    expect(screen.queryByText(/drag a bet link/i)).not.toBeInTheDocument();
    expect(window.localStorage.getItem('dragDropTipDismissed')).toBe('true');
  });
});
