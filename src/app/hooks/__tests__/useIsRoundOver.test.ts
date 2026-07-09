import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { makeRoundData } from '../../../test/utils';
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

describe('useIsRoundOver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCookie.mockReset();
  });

  it('returns false when no winner value is greater than zero', () => {
    useRoundStore.setState({ roundData: makeRoundData({ winners: [0, 0, 0, 0, 0] }) });

    const { result } = renderHook(() => useIsRoundOver());

    expect(result.current).toBe(false);
  });

  it('returns true when at least one winner value is greater than zero', () => {
    useRoundStore.setState({ roundData: makeRoundData({ winners: [1, 0, 0, 0, 0] }) });

    const { result } = renderHook(() => useIsRoundOver());

    expect(result.current).toBe(true);
  });

  it('returns false when winners is omitted (defaults to an empty array, same falsy effect as undefined)', () => {
    useRoundStore.setState({ roundData: makeRoundData() });

    const { result } = renderHook(() => useIsRoundOver());

    expect(result.current).toBe(false);
  });

  it('returns false when winners is an empty array', () => {
    useRoundStore.setState({ roundData: makeRoundData({ winners: [] }) });

    const { result } = renderHook(() => useIsRoundOver());

    expect(result.current).toBe(false);
  });
});
