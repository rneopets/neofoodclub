import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RoundData } from '../../../types';
import { useRoundStore } from '../../stores';
import { useIsRoundOver } from '../useIsRoundOver';

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

function makeRoundData(winners: number[] | undefined): RoundData {
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
  };
  return winners === undefined ? base : { ...base, winners };
}

describe('useIsRoundOver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCookie.mockReset();
  });

  it('returns false when no winner value is greater than zero', () => {
    useRoundStore.setState({ roundData: makeRoundData([0, 0, 0, 0, 0]) });

    const { result } = renderHook(() => useIsRoundOver());

    expect(result.current).toBe(false);
  });

  it('returns true when at least one winner value is greater than zero', () => {
    useRoundStore.setState({ roundData: makeRoundData([1, 0, 0, 0, 0]) });

    const { result } = renderHook(() => useIsRoundOver());

    expect(result.current).toBe(true);
  });

  it('returns false when winners is undefined', () => {
    useRoundStore.setState({ roundData: makeRoundData(undefined) });

    const { result } = renderHook(() => useIsRoundOver());

    expect(result.current).toBe(false);
  });

  it('returns false when winners is an empty array', () => {
    useRoundStore.setState({ roundData: makeRoundData([]) });

    const { result } = renderHook(() => useIsRoundOver());

    expect(result.current).toBe(false);
  });
});
