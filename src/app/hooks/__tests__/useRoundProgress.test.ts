import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { RoundData } from '../../../types';
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

function makeRoundData(start: string | undefined): RoundData {
  const base = {
    round: 1,
    pirates: [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
      [17, 18, 19, 20],
    ],
    openingOdds: [
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
    ],
    currentOdds: [
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
    ],
    foods: [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    ],
    winners: [0, 0, 0, 0, 0],
  };
  return start === undefined ? base : { ...base, start };
}

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
    useRoundStore.setState({ roundData: makeRoundData(undefined), currentSelectedRound: 1 });

    const { result } = renderHook(() => useRoundProgress());

    expect(result.current).toBe(0);
  });

  it('returns a percentage within the 0-100 range when the round has a start timestamp', () => {
    vi.setSystemTime(new Date('2026-01-01T18:00:00Z'));
    useRoundStore.setState({
      roundData: makeRoundData('2026-01-01T00:00:00Z'),
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
      roundData: makeRoundData('2026-01-01T00:00:00Z'),
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
      roundData: makeRoundData('2026-01-01T00:00:00Z'),
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
