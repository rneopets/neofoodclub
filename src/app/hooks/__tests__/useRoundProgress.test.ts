import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { makeRoundData } from '../../../test/utils';
import { useRoundStore } from '../../stores';
import { useRoundProgress } from '../useRoundProgress';

// Mock universal-cookie before any store imports
const mockGetCookie = vi.hoisted(() => vi.fn());
vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: mockGetCookie,
      set: vi.fn(),
    };
  }),
}));

describe('useRoundProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCookie.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 when the round has no start timestamp', () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    useRoundStore.setState({ roundData: makeRoundData(), currentSelectedRound: 1 });

    const { result } = renderHook(() => useRoundProgress());

    expect(result.current).toBe(0);
  });

  it('returns a percentage within the 0-100 range when the round has a start timestamp', () => {
    vi.setSystemTime(new Date('2026-01-01T18:00:00Z'));
    useRoundStore.setState({
      roundData: makeRoundData({ start: '2026-01-01T00:00:00Z' }),
      currentSelectedRound: 1,
    });

    const { result } = renderHook(() => useRoundProgress());

    // 18 of 24 hours elapsed => 75%
    expect(result.current).toBeCloseTo(75, 5);
    expect(result.current).toBeGreaterThanOrEqual(0);
    expect(result.current).toBeLessThanOrEqual(100);
  });

  it('recomputes the percentage on the 1 second interval tick', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    useRoundStore.setState({
      roundData: makeRoundData({ start: '2026-01-01T00:00:00Z' }),
      currentSelectedRound: 1,
    });

    const { result } = renderHook(() => useRoundProgress());

    expect(result.current).toBeCloseTo(0, 5);

    act(() => {
      // Account for the 1000ms that advanceTimersByTime will additionally elapse
      vi.setSystemTime(new Date('2026-01-01T11:59:59Z'));
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBeCloseTo(50, 5);
  });

  it('clears the interval on unmount', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    useRoundStore.setState({
      roundData: makeRoundData({ start: '2026-01-01T00:00:00Z' }),
      currentSelectedRound: 1,
    });

    const { result, unmount } = renderHook(() => useRoundProgress());

    unmount();

    act(() => {
      vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
      vi.advanceTimersByTime(5000);
    });

    // Value from before unmount should remain unchanged since the interval was cleared
    expect(result.current).toBeCloseTo(0, 5);
  });
});
