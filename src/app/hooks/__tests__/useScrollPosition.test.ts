import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useScrollPosition } from '../useScrollPosition';

function makeContainerRef(scrollTop = 0): React.RefObject<HTMLDivElement | null> {
  return { current: { scrollTop } as HTMLDivElement };
}

describe('useScrollPosition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('captures the scrollTop at the time saveScrollPosition is called', () => {
    const containerRef = makeContainerRef(0);
    const { result, rerender } = renderHook(
      ({ shouldRestore }) => useScrollPosition(shouldRestore, containerRef),
      {
        initialProps: { shouldRestore: false },
      },
    );

    if (containerRef.current) {
      containerRef.current.scrollTop = 250;
    }

    act(() => {
      result.current();
    });

    // Move the actual DOM position away from what was saved
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    // Triggering a restore should bring back the value captured at save time (250)
    rerender({ shouldRestore: true });

    act(() => {
      vi.runAllTimers();
    });

    expect(containerRef.current?.scrollTop).toBe(250);
  });

  it('restores the saved scroll position when shouldRestore is true', () => {
    const containerRef = makeContainerRef(250);
    const { result, rerender } = renderHook(
      ({ shouldRestore }) => useScrollPosition(shouldRestore, containerRef),
      {
        initialProps: { shouldRestore: false },
      },
    );

    act(() => {
      result.current();
    });

    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    rerender({ shouldRestore: true });

    act(() => {
      vi.runAllTimers();
    });

    expect(containerRef.current?.scrollTop).toBe(250);
  });

  it('does not restore the scroll position when shouldRestore is false', () => {
    const containerRef = makeContainerRef(250);
    const { result, rerender } = renderHook(
      ({ shouldRestore }) => useScrollPosition(shouldRestore, containerRef),
      {
        initialProps: { shouldRestore: false },
      },
    );

    act(() => {
      result.current();
    });

    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    rerender({ shouldRestore: false });

    act(() => {
      vi.runAllTimers();
    });

    expect(containerRef.current?.scrollTop).toBe(0);
  });

  it('does not restore when the saved position is 0', () => {
    const containerRef = makeContainerRef(0);
    const { result, rerender } = renderHook(
      ({ shouldRestore }) => useScrollPosition(shouldRestore, containerRef),
      {
        initialProps: { shouldRestore: false },
      },
    );

    act(() => {
      result.current();
    });

    if (containerRef.current) {
      containerRef.current.scrollTop = 123;
    }

    rerender({ shouldRestore: true });

    act(() => {
      vi.runAllTimers();
    });

    // Saved position was 0 (falsy), so restoration should be skipped
    expect(containerRef.current?.scrollTop).toBe(123);
  });
});
