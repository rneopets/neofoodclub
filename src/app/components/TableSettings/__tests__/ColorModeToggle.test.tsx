import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render, screen } from '../../../../test/utils';
import ColorModeToggle from '../ColorModeToggle';

const cookiesSetMock = vi.fn();

// Mock universal-cookie following this repo's established convention
// (see src/app/__tests__/hashchange.test.ts).
vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: vi.fn().mockReturnValue(undefined),
      set: cookiesSetMock,
    };
  }),
}));

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

describe('ColorModeToggle', () => {
  beforeEach(() => {
    cookiesSetMock.mockClear();
  });

  it('renders the three theme options', () => {
    render(<ColorModeToggle />);

    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Night')).toBeInTheDocument();
  });

  it('reflects the currently active color mode as the selected segment', () => {
    render(<ColorModeToggle />);

    // ColorModeProvider defaults to "dark".
    const darkRadio = screen.getByDisplayValue('dark') as HTMLInputElement;
    expect(darkRadio.checked).toBe(true);
  });

  it('calls setColorMode (reflected via data-theme) and sets a colorMode cookie when a new option is chosen', async () => {
    const user = userEvent.setup();
    render(<ColorModeToggle />);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    await user.click(screen.getByText('Light'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(cookiesSetMock).toHaveBeenCalledWith('colorMode', 'light');
  });

  it('does not call setColorMode/cookies.set when clicking the already active option', async () => {
    const user = userEvent.setup();
    render(<ColorModeToggle />);

    await user.click(screen.getByText('Dark'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(cookiesSetMock).not.toHaveBeenCalled();
  });
});
