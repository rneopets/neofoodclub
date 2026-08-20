import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useRoundStore } from '../../stores';
import { useIsStillSettling, __resetIsStillSettlingForTests } from '../useIsStillSettling';

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
    __resetIsStillSettlingForTests();
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

  /**
   * Regression test: a row that unmounts and remounts (e.g. a different
   * pirate occupying the same table slot after a round switch) must not
   * be treated as settling again just because it's a brand new component
   * instance - the app already settled once, globally, and that's what
   * matters for whether the remounted row's first value should animate.
   */
  it('is already settled for a component that mounts after the app has settled once', () => {
    setCalculated(true);
    const { result: firstMount } = renderHook(() => useIsStillSettling());
    expect(firstMount.current).toBe(true); // the flip-to-true render itself

    // A brand new hook instance, as if a different component just mounted.
    const { result: freshMount } = renderHook(() => useIsStillSettling());
    expect(freshMount.current).toBe(false);
  });
});
