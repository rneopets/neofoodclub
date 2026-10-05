import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, fireEvent, within } from '../../test/utils';
import { UserscriptModal } from '../components/modals/UserscriptModal';
import UserscriptBanner from '../components/UserscriptBanner';
import { USERSCRIPT_URL } from '../constants';
import { useUserscriptModalStore } from '../stores/userscriptModalStore';

describe('UserscriptBanner', () => {
  beforeEach(() => {
    useUserscriptModalStore.setState({ isOpen: false });
  });

  it('is always shown and cannot be dismissed', () => {
    render(<UserscriptBanner />);

    expect(screen.getByTestId('userscript-banner')).toBeInTheDocument();
    expect(screen.getByText(/needs a userscript/i)).toBeInTheDocument();
    // the only controls are the install link and the button that opens the modal
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /dismiss|close/i })).not.toBeInTheDocument();
  });

  it('installs the userscript from a relative link, so it works on non-prod builds', () => {
    render(<UserscriptBanner />);

    const install = screen.getByRole('link', { name: /install the userscript/i });
    expect(install).toHaveAttribute('href', '/scripts/neofoodclub.user.js');
    expect(USERSCRIPT_URL.startsWith('/')).toBe(true);
  });

  it('opens the modal from its button', async () => {
    render(
      <>
        <UserscriptBanner />
        <UserscriptModal />
      </>,
    );
    expect(screen.queryByTestId('userscript-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /what\? why\?/i }));

    const modal = await screen.findByTestId('userscript-modal');
    expect(modal).toBeInTheDocument();
    expect(useUserscriptModalStore.getState().isOpen).toBe(true);
    expect(within(modal).getByText(/every place bet! button opens the same link/i)).toBeVisible();
    expect(within(modal).getByText(/click a bet's row instead/i)).toBeVisible();
    expect(within(modal).getByText(/place to paste a/i)).toBeVisible();
    expect(within(modal).getByText(/off by default/i)).toBeVisible();
    expect(
      within(modal).getByText(/nothing is selected, filled in or placed until you click/i),
    ).toBeVisible();
    expect(
      within(modal).getByText(/can't tell which of your bets have been placed/i),
    ).toBeVisible();
    expect(within(modal).getByRole('link', { name: /install the userscript/i })).toHaveAttribute(
      'href',
      USERSCRIPT_URL,
    );
  });

  it('closes the modal again', async () => {
    useUserscriptModalStore.setState({ isOpen: true });
    render(<UserscriptModal />);

    const modal = await screen.findByTestId('userscript-modal');
    fireEvent.click(within(modal).getByRole('button', { name: /close/i }));

    await vi.waitFor(() => expect(useUserscriptModalStore.getState().isOpen).toBe(false));
  });
});
