import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useRoundStore } from '../../stores';
import { useIsStillSettling } from '../useIsStillSettling';

vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    };
  }),
}));

const setCalculated = (calculated: boolean): void => {
  useRoundStore.setState(state => ({
    calculations: { ...state.calculations, calculated },
  }));
};

describe('useIsStillSettling', () => {
  beforeEach(() => {
    setCalculated(false);
  });

  it('is true before the round store has ever finished a calculation', () => {
    const { result } = renderHook(() => useIsStillSettling());

    expect(result.current).toBe(true);
  });

  /**
   * Regression test: values driven by calculation-derived data (arena
   * ratios, winningBetBinary-derived colors) start empty/wrong and only
   * become real once calculated flips true - that transition must itself
   * still be treated as settling (not a genuine change worth animating),
   * only changes *after* that should be treated as real.
   */
  it('stays true for the render where calculated first flips true, then false from then on', () => {
    const { result, rerender } = renderHook(() => useIsStillSettling());
    expect(result.current).toBe(true);

    act(() => setCalculated(true));
    expect(result.current).toBe(true);

    rerender();
    expect(result.current).toBe(false);

    // Once settled, it never reverts even if calculated somehow flips
    // back (e.g. switching to a round with no data).
    act(() => setCalculated(false));
    rerender();
    expect(result.current).toBe(false);
  });
});
