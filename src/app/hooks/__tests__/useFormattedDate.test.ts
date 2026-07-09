import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { formatDate } from '../../util';
import { useFormattedDate } from '../useFormattedDate';

// formatDate itself (date-fns formatting/timezone conversion logic) is already thoroughly
// covered by src/app/__tests__/util.test.ts's `formatDate` describe block -- here we only spy
// on it to verify this hook wires it up correctly (calls it, stores the result, and re-invokes
// it on each interval tick), without re-testing its internals.
vi.mock('../../util', async importOriginal => {
  const actual = await importOriginal<typeof import('../../util')>();
  return {
    ...actual,
    formatDate: vi.fn(actual.formatDate),
  };
});

describe('useFormattedDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(formatDate).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces a non-empty formattedDate string for a given date', () => {
    const { result } = renderHook(() => useFormattedDate('2024-01-15T14:30:00Z'));

    expect(result.current.formattedDate).not.toBe('');
    expect(typeof result.current.formattedDate).toBe('string');
    expect(formatDate).toHaveBeenCalled();
  });

  it('leaves title empty when withTitle is not requested', () => {
    const { result } = renderHook(() => useFormattedDate('2024-01-15T14:30:00Z'));

    expect(result.current.title).toBe('');
  });

  it('populates title when withTitle and titleFormat are provided', () => {
    const { result } = renderHook(() =>
      useFormattedDate('2024-01-15T14:30:00Z', {
        withTitle: true,
        titleFormat: 'YYYY-MM-DD',
      }),
    );

    expect(result.current.title).not.toBe('');
    expect(result.current.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not populate title when withTitle is true but titleFormat is missing', () => {
    const { result } = renderHook(() =>
      useFormattedDate('2024-01-15T14:30:00Z', { withTitle: true }),
    );

    expect(result.current.title).toBe('');
  });

  it('does not set up a recurring interval when no interval option is given', () => {
    renderHook(() => useFormattedDate('2024-01-15T14:30:00Z'));

    const callsAfterMount = vi.mocked(formatDate).mock.calls.length;
    expect(callsAfterMount).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    // No interval was requested, so no additional formatDate calls should occur over time.
    expect(vi.mocked(formatDate).mock.calls.length).toBe(callsAfterMount);
  });

  it('recomputes formattedDate on each tick when interval is provided (in seconds)', () => {
    renderHook(() => useFormattedDate('2024-01-15T14:30:00Z', { interval: 1 }));

    const callsAfterMount = vi.mocked(formatDate).mock.calls.length;
    expect(callsAfterMount).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(vi.mocked(formatDate).mock.calls.length).toBe(callsAfterMount + 1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(vi.mocked(formatDate).mock.calls.length).toBe(callsAfterMount + 2);
  });

  it('does not call formatDate when the date is falsy (empty string)', () => {
    const { result } = renderHook(() => useFormattedDate(''));

    expect(formatDate).not.toHaveBeenCalled();
    expect(result.current.formattedDate).toBe('');
  });
});
