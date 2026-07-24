import { describe, it, expect } from 'vitest';

import { render, screen } from '../../../../test/utils';
import GlowCard from '../GlowCard';

describe('GlowCard', () => {
  it('renders children', () => {
    render(
      <GlowCard>
        <div data-testid="glow-child">Inside the card</div>
      </GlowCard>,
    );

    expect(screen.getByTestId('glow-child')).toBeInTheDocument();
    expect(screen.getByText('Inside the card')).toBeInTheDocument();
  });

  it('forwards additional Box props such as data-testid', () => {
    render(
      <GlowCard data-testid="glow-card">
        <span>Content</span>
      </GlowCard>,
    );

    expect(screen.getByTestId('glow-card')).toBeInTheDocument();
  });

  it('renders without crashing when animate is true', () => {
    render(
      <GlowCard animate>
        <span>Animated Content</span>
      </GlowCard>,
    );

    expect(screen.getByText('Animated Content')).toBeInTheDocument();
  });

  it('renders without crashing when animate is false/undefined', () => {
    render(
      <GlowCard>
        <span>Static Content</span>
      </GlowCard>,
    );

    expect(screen.getByText('Static Content')).toBeInTheDocument();
  });
});
