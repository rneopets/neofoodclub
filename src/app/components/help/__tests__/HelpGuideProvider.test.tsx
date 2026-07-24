import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';

import { render, screen } from '../../../../test/utils';
import { HelpGuideProvider, useHelpGuide } from '../HelpGuideProvider';

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const ThrowingConsumer = (): null => {
  useHelpGuide();
  return null;
};

const OpenGlossaryButton = (): ReactElement => {
  const { openHelpGuide } = useHelpGuide();
  return <button onClick={() => openHelpGuide()}>Open Help</button>;
};

const OpenFaqEntryButton = (): ReactElement => {
  const { openHelpGuide } = useHelpGuide();
  return <button onClick={() => openHelpGuide('faq', 'trophies')}>Open FAQ Entry</button>;
};

describe('useHelpGuide', () => {
  it('throws when called outside of a HelpGuideProvider', () => {
    // Suppress the expected React error boundary console noise for this assertion.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<ThrowingConsumer />)).toThrow(
      'useHelpGuide must be used within HelpGuideProvider',
    );

    consoleErrorSpy.mockRestore();
  });
});

describe('HelpGuideProvider', () => {
  it('opens the modal on the default glossary tab when openHelpGuide() is called with no args', async () => {
    const user = userEvent.setup();
    render(
      <HelpGuideProvider>
        <OpenGlossaryButton />
      </HelpGuideProvider>,
    );

    expect(screen.queryByTestId('help-guide-modal')).not.toBeInTheDocument();

    await user.click(screen.getByText('Open Help'));

    expect(screen.getByTestId('help-guide-modal')).toBeInTheDocument();
    expect(screen.getByTestId('help-guide-glossary')).toBeInTheDocument();
  });

  it('opens the modal on the requested tab/entry when openHelpGuide(tab, entryId) is called', async () => {
    const user = userEvent.setup();
    render(
      <HelpGuideProvider>
        <OpenFaqEntryButton />
      </HelpGuideProvider>,
    );

    await user.click(screen.getByText('Open FAQ Entry'));

    expect(screen.getByTestId('help-guide-modal')).toBeInTheDocument();
    expect(screen.getByTestId('help-guide-faq')).toBeInTheDocument();
  });
});
