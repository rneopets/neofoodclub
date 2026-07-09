import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { render, screen } from '../../../../test/utils';
import { HelpGuideModal } from '../HelpGuideModal';

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

describe('HelpGuideModal', () => {
  it('renders nothing visible when isOpen is false', () => {
    render(<HelpGuideModal isOpen={false} onClose={vi.fn()} initialTab="glossary" />);

    expect(screen.queryByTestId('help-guide-modal')).not.toBeInTheDocument();
  });

  it('shows modal content when isOpen is true', () => {
    render(<HelpGuideModal isOpen={true} onClose={vi.fn()} initialTab="glossary" />);

    expect(screen.getByTestId('help-guide-modal')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Help guide')).toBeInTheDocument();
  });

  it('respects the initialTab prop - glossary', () => {
    render(<HelpGuideModal isOpen={true} onClose={vi.fn()} initialTab="glossary" />);

    expect(screen.getByTestId('help-guide-glossary')).toBeInTheDocument();
    expect(screen.queryByTestId('help-guide-faq')).not.toBeInTheDocument();
  });

  it('respects the initialTab prop - faq', () => {
    render(<HelpGuideModal isOpen={true} onClose={vi.fn()} initialTab="faq" />);

    expect(screen.getByTestId('help-guide-faq')).toBeInTheDocument();
    expect(screen.queryByTestId('help-guide-glossary')).not.toBeInTheDocument();
  });

  it('switches tabs when a different segment is selected', async () => {
    const user = userEvent.setup();
    render(<HelpGuideModal isOpen={true} onClose={vi.fn()} initialTab="glossary" />);

    expect(screen.getByTestId('help-guide-glossary')).toBeInTheDocument();

    await user.click(screen.getByText('FAQs'));

    expect(screen.getByTestId('help-guide-faq')).toBeInTheDocument();
    expect(screen.queryByTestId('help-guide-glossary')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpGuideModal isOpen={true} onClose={onClose} initialTab="glossary" />);

    await user.click(screen.getByTestId('help-guide-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the footer Close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpGuideModal isOpen={true} onClose={onClose} initialTab="glossary" />);

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    const footerCloseButton = closeButtons.find(
      button => button.getAttribute('data-testid') !== 'help-guide-close',
    );
    if (!footerCloseButton) {
      throw new Error('Footer close button not found');
    }
    await user.click(footerCloseButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
