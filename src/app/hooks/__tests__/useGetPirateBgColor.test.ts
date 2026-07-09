import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useGetPirateBgColor } from '../useGetPirateBgColor';

describe('useGetPirateBgColor', () => {
  it('returns nfc-blue for odds 3, 4, and 5', () => {
    const { result } = renderHook(() => useGetPirateBgColor());

    expect(result.current(3)).toBe('nfc-blue');
    expect(result.current(4)).toBe('nfc-blue');
    expect(result.current(5)).toBe('nfc-blue');
  });

  it('returns nfc-orange for odds 6, 7, 8, and 9', () => {
    const { result } = renderHook(() => useGetPirateBgColor());

    expect(result.current(6)).toBe('nfc-orange');
    expect(result.current(7)).toBe('nfc-orange');
    expect(result.current(8)).toBe('nfc-orange');
    expect(result.current(9)).toBe('nfc-orange');
  });

  it('returns nfc-red for odds 10, 11, 12, and 13', () => {
    const { result } = renderHook(() => useGetPirateBgColor());

    expect(result.current(10)).toBe('nfc-red');
    expect(result.current(11)).toBe('nfc-red');
    expect(result.current(12)).toBe('nfc-red');
    expect(result.current(13)).toBe('nfc-red');
  });

  it('returns nfc-green for any other odds value', () => {
    const { result } = renderHook(() => useGetPirateBgColor());

    expect(result.current(0)).toBe('nfc-green');
    expect(result.current(1)).toBe('nfc-green');
    expect(result.current(2)).toBe('nfc-green');
    expect(result.current(14)).toBe('nfc-green');
  });

  it('returns a stable function reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useGetPirateBgColor());

    const firstFn = result.current;
    rerender();
    const secondFn = result.current;

    expect(firstFn).toBe(secondFn);
  });
});
