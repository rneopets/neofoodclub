import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { useSelectOnFocus } from '../useSelectOnFocus';

function makeFocusEvent(select: () => void): React.FocusEvent<HTMLInputElement> {
  return { target: { select } } as unknown as React.FocusEvent<HTMLInputElement>;
}

describe('useSelectOnFocus', () => {
  it('calls select() on the event target when invoked', () => {
    const { result } = renderHook(() => useSelectOnFocus());
    const select = vi.fn();

    result.current(makeFocusEvent(select));

    expect(select).toHaveBeenCalledTimes(1);
  });

  it('returns a stable function reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useSelectOnFocus());

    const firstFn = result.current;
    rerender();
    const secondFn = result.current;

    expect(firstFn).toBe(secondFn);
  });
});
