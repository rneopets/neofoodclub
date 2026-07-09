import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useDebouncedRoundInput } from '../useDebouncedRoundInput';

describe('useDebouncedRoundInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call onDebouncedChange before the delay elapses', () => {
    const onChange = vi.fn();
    renderHook(() => useDebouncedRoundInput('123', '123', 500, onChange));

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onDebouncedChange with the latest value once the delay elapses', () => {
    const onChange = vi.fn();
    const { rerender } = renderHook(
      ({ value, externalValue }) => useDebouncedRoundInput(value, externalValue, 500, onChange),
      { initialProps: { value: '123', externalValue: '123' } },
    );

    rerender({ value: '456', externalValue: '123' });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('456');
  });

  it('restarts the debounce window on every value change, only firing once for the final value', () => {
    const onChange = vi.fn();
    const { rerender } = renderHook(
      ({ value, externalValue }) => useDebouncedRoundInput(value, externalValue, 500, onChange),
      { initialProps: { value: '1', externalValue: '1' } },
    );

    rerender({ value: '12', externalValue: '1' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({ value: '123', externalValue: '1' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Only 300ms elapsed since the last change so far; the debounce should not have fired yet.
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('123');
  });

  it('cancels a pending debounce for a stale user-typed value when the external value changes and the local value is resynced', () => {
    // This mirrors RoundInput.tsx's real usage: the caller keeps a local `value` state that is
    // resynced to the new `externalValue` via its own effect whenever the round changes
    // externally, so the debounce that was pending for the pre-sync (stale) value must never
    // reach onDebouncedChange -- only the resynced value's own debounce cycle should fire.
    const onChange = vi.fn();
    const { rerender } = renderHook(
      ({ value, externalValue }) => useDebouncedRoundInput(value, externalValue, 500, onChange),
      { initialProps: { value: 'stale-user-value', externalValue: 'round-1' } },
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onChange).not.toHaveBeenCalled();

    // External round change arrives, followed by the caller resyncing its local value to match.
    rerender({ value: 'stale-user-value', externalValue: 'round-2' });
    rerender({ value: 'round-2', externalValue: 'round-2' });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('round-2');
  });

  it('truly cancels (not just leaves running) the pending timeout when externalValue changes', () => {
    const onChange = vi.fn();
    const { rerender } = renderHook(
      ({ value, externalValue }) => useDebouncedRoundInput(value, externalValue, 500, onChange),
      { initialProps: { value: 'stale-user-value', externalValue: 'round-1' } },
    );

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(onChange).not.toHaveBeenCalled();

    // externalValue changes just 1ms before the pending timeout would have fired -- this must
    // clear that original timeout rather than let it fire alongside a new one.
    rerender({ value: 'stale-user-value', externalValue: 'round-2' });

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('cleans up its pending timeout on unmount without throwing', () => {
    const onChange = vi.fn();
    const { unmount } = renderHook(() => useDebouncedRoundInput('123', '999', 500, onChange));

    expect(() => unmount()).not.toThrow();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
