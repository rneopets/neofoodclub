import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBackgroundColorTween } from '../useBackgroundColorTween';

function TestCell({ colorKey }: { colorKey: string | undefined }): React.ReactElement {
  // durationMs=0 so the returned color is the resolved target immediately,
  // isolating the CSS-custom-property retry logic under test from the
  // color tween's own animation.
  const bg = useBackgroundColorTween(colorKey, 0);
  return <div data-testid="cell" style={{ backgroundColor: bg }} />;
}

function TestCellAnimated({ colorKey }: { colorKey: string | undefined }): React.ReactElement {
  const bg = useBackgroundColorTween(colorKey, 400);
  return <div data-testid="cell" style={{ backgroundColor: bg }} />;
}

/**
 * Regression test: a pirate whose name-cell color key is 'nfc-green' from
 * the very first render (the default odds tier) previously stayed stuck
 * fully transparent forever if the CSS custom property backing that color
 * wasn't readable on the very first resolve attempt, because the old fix
 * only re-resolved when colorKey itself changed - which never happens for
 * a color key that's constant since mount.
 */
describe('useBackgroundColorTween', () => {
  let rafQueue: { id: number; cb: (now: number) => void }[];
  let nextRafId: number;
  let now: number;

  beforeEach(() => {
    rafQueue = [];
    nextRafId = 1;
    now = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: (t: number) => void) => {
        const id = nextRafId++;
        rafQueue.push({ id, cb });
        return id;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => {
        rafQueue = rafQueue.filter(entry => entry.id !== id);
      }),
    );
    vi.stubGlobal('performance', { now: () => now });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const flushRaf = (times: number, step = 16): void => {
    act(() => {
      for (let i = 0; i < times && rafQueue.length > 0; i++) {
        const frame = rafQueue.shift()!;
        now += step;
        frame.cb(now);
      }
    });
  };

  const mockCssVar = (values: Record<string, string[]>): void => {
    const callCounts: Record<string, number> = {};
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          getPropertyValue: (prop: string) => {
            const queue = values[prop];
            if (!queue) {
              return '';
            }
            const idx = Math.min(callCounts[prop] ?? 0, queue.length - 1);
            callCounts[prop] = (callCounts[prop] ?? 0) + 1;
            return queue[idx] ?? '';
          },
        }) as unknown as CSSStyleDeclaration,
    );
  };

  it('retries until the CSS custom property resolves, instead of getting stuck transparent', () => {
    mockCssVar({
      '--chakra-colors-nfc-green-subtle': ['', '', '#50C17F'],
    });

    render(<TestCell colorKey="nfc-green" />);

    expect(screen.getByTestId('cell').style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(rafQueue.length).toBeGreaterThan(0);

    flushRaf(5);

    expect(screen.getByTestId('cell').style.backgroundColor).toBe('rgb(80, 193, 127)');
    expect(rafQueue).toHaveLength(0);
  });

  it('resolves immediately when the CSS custom property is ready on the first read', () => {
    mockCssVar({
      '--chakra-colors-nfc-red-subtle': ['#F76C6C'],
    });

    render(<TestCell colorKey="nfc-red" />);

    expect(screen.getByTestId('cell').style.backgroundColor).toBe('rgb(247, 108, 108)');
    expect(rafQueue).toHaveLength(0);
  });

  it('stays transparent without retrying when there is no color key', () => {
    mockCssVar({});

    render(<TestCell colorKey={undefined} />);

    expect(screen.getByTestId('cell').style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(rafQueue).toHaveLength(0);
  });

  /**
   * Regression test: establishing a cell's first-ever color (whether on the
   * very first render or after a few CSS-var retries) must never itself be
   * a visible animation - only a real colorKey change afterward (e.g. a
   * pirate winning) should tween. An earlier attempt at this used a global
   * page-load timer, which incorrectly suppressed genuine changes that
   * happened to land shortly after mount too (e.g. a fast round switch).
   */
  it('snaps to the first resolved color but animates a later genuine colorKey change', () => {
    mockCssVar({
      '--chakra-colors-nfc-green-subtle': ['#50C17F'],
      '--chakra-colors-nfc-red-subtle': ['#F76C6C'],
    });

    const { rerender } = render(<TestCellAnimated colorKey="nfc-green" />);

    expect(screen.getByTestId('cell').style.backgroundColor).toBe('rgb(80, 193, 127)');
    expect(rafQueue).toHaveLength(0);

    rerender(<TestCellAnimated colorKey="nfc-red" />);

    expect(rafQueue.length).toBeGreaterThan(0);
    expect(screen.getByTestId('cell').style.backgroundColor).not.toBe('rgb(247, 108, 108)');

    flushRaf(30);

    expect(screen.getByTestId('cell').style.backgroundColor).toBe('rgb(247, 108, 108)');
  });
});
