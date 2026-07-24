import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { makeRoundData } from '../../../test/utils';
import type { RoundData } from '../../../types';
import { defaultRoundData } from '../../constants';
import { useRoundStore } from '../../stores/roundStore';
import { useProbabilities } from '../useProbabilities';

// Mock universal-cookie before any store imports (roundStore reads cookies at module init).
// `vi.hoisted` is required here (rather than a plain top-level `const`) because `vi.mock`
// factories are hoisted above all imports, and importing `roundStore` below synchronously
// triggers cookie reads at module init time.
const mockGetCookie = vi.hoisted(() => vi.fn());
vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: mockGetCookie,
      set: vi.fn(),
    };
  }),
}));

// Allow betStore's lazy dynamic import of roundStore to resolve.
async function waitForStoreInit(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50));
}

describe('useProbabilities', () => {
  beforeEach(async () => {
    await waitForStoreInit();

    mockGetCookie.mockReset();
    mockGetCookie.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('computes non-empty legacy and logit probability arrays for real round data', () => {
    useRoundStore.setState({ roundData: makeRoundData() });

    const { result } = renderHook(() => useProbabilities());

    expect(result.current.legacyProbabilities.length).toBe(5);
    expect(result.current.logitProbabilities.length).toBe(5);
    expect(result.current.legacyProbabilities.every(arena => arena.length > 0)).toBe(true);
    expect(result.current.logitProbabilities.every(arena => arena.length > 0)).toBe(true);
  });

  it('returns [] for both when roundData is falsy', () => {
    // This hook itself guards `if (!roundData) return [];` before doing any computation,
    // separately from computeLegacyProbabilities/computeLogitProbabilities's own internal
    // guards -- roundData is typed as non-nullable RoundData in the store, so this is only
    // reachable via a defensive cast, exercising that guard directly.
    useRoundStore.setState({ roundData: null as unknown as RoundData });

    const { result } = renderHook(() => useProbabilities());

    expect(result.current.legacyProbabilities).toEqual([]);
    expect(result.current.logitProbabilities).toEqual([]);
  });

  it('handles missing pirates/openingOdds distinctly per the underlying compute functions', () => {
    // defaultRoundData has empty pirates and empty openingOdds arrays. computeLogitProbabilities
    // early-returns `used: []` when pirates is empty, but computeLegacyProbabilities only checks
    // openingOdds and otherwise falls back to its non-empty sentinel (5 arenas of [1, 0, 0, 0, 0]).
    useRoundStore.setState({ roundData: defaultRoundData });

    const { result } = renderHook(() => useProbabilities());

    expect(result.current.logitProbabilities).toEqual([]);
    expect(result.current.legacyProbabilities).toEqual([
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
    ]);
  });

  it('recomputes when roundData changes', () => {
    useRoundStore.setState({ roundData: makeRoundData() });

    const { result, rerender } = renderHook(() => useProbabilities());
    const firstLegacy = result.current.legacyProbabilities;

    useRoundStore.setState({
      roundData: makeRoundData({
        currentOdds: [
          [1, 8, 9, 10, 11],
          [1, 3, 4, 5, 6],
          [1, 2, 5, 6, 7],
          [1, 4, 3, 7, 8],
          [1, 5, 6, 2, 9],
        ],
        openingOdds: [
          [1, 8, 9, 10, 11],
          [1, 3, 4, 5, 6],
          [1, 2, 5, 6, 7],
          [1, 4, 3, 7, 8],
          [1, 5, 6, 2, 9],
        ],
      }),
    });
    rerender();

    expect(result.current.legacyProbabilities).not.toEqual(firstLegacy);
  });
});
