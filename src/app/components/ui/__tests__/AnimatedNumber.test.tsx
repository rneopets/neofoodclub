import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AnimatedNumber from '../AnimatedNumber';

describe('AnimatedNumber', () => {
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
  });

  const flushFrames = (duration: number, step = 16): void => {
    const until = now + duration;
    act(() => {
      while (now < until && rafQueue.length > 0) {
        const frame = rafQueue.shift()!;
        now += step;
        frame.cb(now);
      }
    });
  };

  it('renders the initial value without animating', () => {
    render(<AnimatedNumber value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(rafQueue).toHaveLength(0);
  });

  it('tweens from the previous value to the new value', () => {
    const { rerender } = render(<AnimatedNumber value={20} />);
    rerender(<AnimatedNumber value={24} />);

    expect(rafQueue.length).toBeGreaterThan(0);
    expect(screen.queryByText('24')).not.toBeInTheDocument();

    flushFrames(400);
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(rafQueue).toHaveLength(0);
  });

  it('shows intermediate values mid-tween', () => {
    const { rerender } = render(<AnimatedNumber value={20} />);
    rerender(<AnimatedNumber value={24} />);

    act(() => {
      const frame = rafQueue.shift()!;
      now += 16;
      frame.cb(now);
    });
    const mid = Number(screen.getByText(/2[0-4]/).textContent);
    expect(mid).toBeGreaterThan(20);
    expect(mid).toBeLessThan(24);
  });

  it('retargets from the currently displayed value when interrupted', () => {
    const { rerender } = render(<AnimatedNumber value={20} />);
    rerender(<AnimatedNumber value={24} />);
    flushFrames(200); // partway toward 24

    rerender(<AnimatedNumber value={22} />);
    flushFrames(400);
    expect(screen.getByText('22')).toBeInTheDocument();
  });

  it('rounds the tweened value to whole numbers when precision is 0', () => {
    const { rerender } = render(<AnimatedNumber value={2} precision={0} />);
    rerender(<AnimatedNumber value={5} precision={0} />);

    act(() => {
      const frame = rafQueue.shift()!;
      now += 16;
      frame.cb(now);
    });
    const mid = screen.getByText(/2|3|4/).textContent as string;
    expect(mid).toMatch(/^[0-9]+$/);
    const midNum = Number(mid);
    expect(Number.isInteger(midNum)).toBe(true);
    expect(midNum).toBeGreaterThanOrEqual(2);
    expect(midNum).toBeLessThanOrEqual(5);

    flushFrames(400);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('uses the custom format function', () => {
    render(<AnimatedNumber value={1234.5} format={v => `${v.toFixed(2)}%`} />);
    expect(screen.getByText('1234.50%')).toBeInTheDocument();
  });

  it('jumps instantly when prefers-reduced-motion is set', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      query =>
        ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );

    const { rerender } = render(<AnimatedNumber value={20} />);
    rerender(<AnimatedNumber value={24} />);
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(rafQueue).toHaveLength(0);
    vi.restoreAllMocks();
  });
});
