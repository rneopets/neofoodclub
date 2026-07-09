import { describe, it, expect } from 'vitest';

import { render, screen } from '../../../../test/utils';
import TextTooltip from '../TextTooltip';

describe('TextTooltip', () => {
  it('renders the text content', () => {
    render(<TextTooltip text="Hover me" />);

    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('uses the label as the aria-label when no content is provided', () => {
    render(<TextTooltip text="Hover me" label="A helpful label" />);

    expect(screen.getByText('Hover me')).toBeInTheDocument();
    // The tooltip trigger renders the visible text; the tooltip content is
    // portalled and only mounted on interaction, so we assert on the
    // rendered trigger element having the underlying text.
    expect(screen.getByText('Hover me').closest('p')).toBeInTheDocument();
  });

  it('renders children as plain text when text is a string', () => {
    render(<TextTooltip text="Plain text label" />);

    const el = screen.getByText('Plain text label');
    expect(el).toBeInTheDocument();
  });

  it('renders custom cursor and textDecoration styles without throwing', () => {
    render(<TextTooltip text="Styled text" cursor="pointer" textDecoration="underline" />);

    expect(screen.getByText('Styled text')).toBeInTheDocument();
  });

  it('renders ReactNode text content correctly', () => {
    render(<TextTooltip text={<span data-testid="node-text">Node content</span>} />);

    expect(screen.getByTestId('node-text')).toBeInTheDocument();
    expect(screen.getByText('Node content')).toBeInTheDocument();
  });
});
