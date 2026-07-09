import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { render, screen } from '../../../../test/utils';
import { GlossaryRef } from '../GlossaryRef';
import { HelpGuideNavigationProvider } from '../HelpGuideNavigationContext';

describe('GlossaryRef', () => {
  it('renders as a non-interactive span when not inside a HelpGuideNavigationContext provider', () => {
    render(<GlossaryRef id="odds">odds</GlossaryRef>);

    const el = screen.getByText('odds');
    expect(el.tagName.toLowerCase()).toBe('span');
  });

  it('does not invoke any navigation when clicked outside a provider', async () => {
    const user = userEvent.setup();
    render(<GlossaryRef id="odds">odds</GlossaryRef>);

    // Should not throw when clicked, since there's no click handler attached.
    await user.click(screen.getByText('odds'));

    expect(screen.getByText('odds')).toBeInTheDocument();
  });

  it('renders as a clickable button when inside a HelpGuideNavigationContext provider', () => {
    const navigate = vi.fn();
    render(
      <HelpGuideNavigationProvider value={navigate}>
        <GlossaryRef id="odds">odds</GlossaryRef>
      </HelpGuideNavigationProvider>,
    );

    const el = screen.getByText('odds');
    expect(el.tagName.toLowerCase()).toBe('button');
  });

  it('calls the navigate function with the given id when clicked inside a provider', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(
      <HelpGuideNavigationProvider value={navigate}>
        <GlossaryRef id="odds-timeline">odds timeline</GlossaryRef>
      </HelpGuideNavigationProvider>,
    );

    await user.click(screen.getByText('odds timeline'));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('odds-timeline');
  });
});
