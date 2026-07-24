import { fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { render, screen } from '../../../../test/utils';
import ErrorBoundary from '../ErrorBoundary';

const Bomb = (): React.ReactElement => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">All good</div>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('catches an error thrown during render and shows the fallback UI', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    expect(
      screen.getByText('The application encountered an unexpected error and needs to be reloaded.'),
    ).toBeInTheDocument();
  });

  it('resets hasError back to false when "Try Again" is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { rerender } = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();

    // Swap in a non-throwing child before resetting. The class component's
    // state still has hasError=true at this point, so the fallback UI
    // remains on screen (render() ignores the new children until reset).
    rerender(
      <ErrorBoundary>
        <div data-testid="recovered">Recovered</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();

    const tryAgainButton = screen.getByRole('button', { name: 'Try Again' });
    fireEvent.click(tryAgainButton);

    // Resetting hasError now lets the (already-swapped) non-throwing
    // children render instead of the fallback UI.
    expect(screen.queryByText('Something went wrong!')).not.toBeInTheDocument();
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  it('calls window.location.reload when "Reload Page" is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const reloadMock = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    try {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      );

      const reloadButton = screen.getByRole('button', { name: 'Reload Page' });
      fireEvent.click(reloadButton);

      expect(reloadMock).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });
});
