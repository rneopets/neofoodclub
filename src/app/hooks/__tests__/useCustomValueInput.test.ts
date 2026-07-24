import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { makeRoundData } from '../../../test/utils';
import type { RoundData } from '../../../types';
import { useRoundStore } from '../../stores/roundStore';
import { useCustomValueInput } from '../useCustomValueInput';

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

// Seeds useRoundStore with real round data and triggers a real recalculate() so that
// `calculations.usedProbabilities` is populated, matching the pattern used across the other
// hook tests in this directory (see useBetManagement.test.ts's seedStores()).
function seedRoundStore(overrides: Partial<RoundData> = {}): void {
  const roundData = makeRoundData(overrides);
  useRoundStore.setState({
    roundData,
    currentSelectedRound: roundData.round,
    currentRound: roundData.round,
    customOdds: null,
    customProbs: null,
    isInitializing: false,
  });
  useRoundStore.getState().recalculate();
}

describe('useCustomValueInput', () => {
  beforeEach(async () => {
    await waitForStoreInit();

    mockGetCookie.mockReset();
    mockGetCookie.mockReturnValue(undefined);

    seedRoundStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial inputValue', () => {
    it('initializes from originalValue when customValue is undefined (non-percent)', () => {
      const originalValue = useRoundStore.getState().roundData.currentOdds[0]![1]!; // 2

      const { result } = renderHook(() =>
        useCustomValueInput({
          arenaIndex: 0,
          pirateIndex: 1,
          type: 'odds',
          customValue: undefined,
          originalValue,
          isPercent: false,
        }),
      );

      expect(result.current.inputValue).toBe(originalValue.toString());
    });

    it('initializes from originalValue with percent conversion when isPercent is true', () => {
      const originalValue = 0.25;

      const { result } = renderHook(() =>
        useCustomValueInput({
          arenaIndex: 0,
          pirateIndex: 1,
          type: 'probs',
          customValue: undefined,
          originalValue,
          isPercent: true,
        }),
      );

      expect(result.current.inputValue).toBe('25');
    });

    it('initializes from customValue (percent-converted) when provided, overriding originalValue', () => {
      const { result } = renderHook(() =>
        useCustomValueInput({
          arenaIndex: 0,
          pirateIndex: 1,
          type: 'probs',
          customValue: 0.5,
          originalValue: 0.25,
          isPercent: true,
        }),
      );

      expect(result.current.inputValue).toBe('50');
    });
  });

  describe('handleChange', () => {
    it('updates local inputValue only, without touching the store', () => {
      const { result } = renderHook(() =>
        useCustomValueInput({
          arenaIndex: 0,
          pirateIndex: 1,
          type: 'odds',
          customValue: undefined,
          originalValue: 2,
          isPercent: false,
        }),
      );

      act(() => {
        result.current.handleChange('99');
      });

      expect(result.current.inputValue).toBe('99');
      expect(useRoundStore.getState().customOdds).toBeNull();
    });
  });

  describe('handleBlur - empty input', () => {
    it('clears only the targeted arena/pirate slot back to originalValue (odds)', () => {
      const currentOdds = useRoundStore.getState().roundData.currentOdds;
      const originalValue = currentOdds[0]![1]!; // 2
      const customOddsGrid = currentOdds.map(row => row.map(value => value + 100));
      useRoundStore.setState({ customOdds: customOddsGrid });

      const { result } = renderHook(() =>
        useCustomValueInput({
          arenaIndex: 0,
          pirateIndex: 1,
          type: 'odds',
          customValue: customOddsGrid[0]![1],
          originalValue,
          isPercent: false,
        }),
      );

      expect(result.current.inputValue).toBe(customOddsGrid[0]![1]!.toString());

      act(() => {
        result.current.handleChange('');
      });

      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.inputValue).toBe(originalValue.toString());

      const updatedCustomOdds = useRoundStore.getState().customOdds!;
      expect(updatedCustomOdds[0]![1]).toBe(originalValue);
      // Other slots must be left untouched.
      expect(updatedCustomOdds[0]![2]).toBe(customOddsGrid[0]![2]);
      expect(updatedCustomOdds[1]![1]).toBe(customOddsGrid[1]![1]);
    });
  });

  describe('handleBlur - valid new value', () => {
    it('parses and stores a percent value (divided by 100) for probs', () => {
      const usedProbabilities = useRoundStore.getState().calculations.usedProbabilities;
      const originalValue = usedProbabilities[0]![1]!;
      const untouchedNeighbor = usedProbabilities[0]![2]!;

      const { result } = renderHook(() =>
        useCustomValueInput({
          arenaIndex: 0,
          pirateIndex: 1,
          type: 'probs',
          customValue: undefined,
          originalValue,
          isPercent: true,
        }),
      );

      act(() => {
        result.current.handleChange('30');
      });

      act(() => {
        result.current.handleBlur();
      });

      const updatedCustomProbs = useRoundStore.getState().customProbs!;
      expect(updatedCustomProbs[0]![1]).toBe(0.3);
      expect(updatedCustomProbs[0]![2]).toBe(untouchedNeighbor);
      expect(result.current.inputValue).toBe('30');
    });

    it('parses and stores a non-percent integer value for odds', () => {
      const currentOdds = useRoundStore.getState().roundData.currentOdds;
      const originalValue = currentOdds[0]![1]!; // 2
      const untouchedNeighbor = currentOdds[1]![2]!;

      const { result } = renderHook(() =>
        useCustomValueInput({
          arenaIndex: 0,
          pirateIndex: 1,
          type: 'odds',
          customValue: undefined,
          originalValue,
          isPercent: false,
        }),
      );

      act(() => {
        result.current.handleChange('7');
      });

      act(() => {
        result.current.handleBlur();
      });

      const updatedCustomOdds = useRoundStore.getState().customOdds!;
      expect(updatedCustomOdds[0]![1]).toBe(7);
      expect(updatedCustomOdds[1]![2]).toBe(untouchedNeighbor);
      expect(result.current.inputValue).toBe('7');
    });
  });

  describe('handleBlur - invalid input', () => {
    it('reverts the display value and does not touch the store for non-numeric input', () => {
      const { result } = renderHook(() =>
        useCustomValueInput({
          arenaIndex: 0,
          pirateIndex: 1,
          type: 'odds',
          customValue: undefined,
          originalValue: 2,
          isPercent: false,
        }),
      );

      act(() => {
        result.current.handleChange('not-a-number');
      });

      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.inputValue).toBe('2');
      expect(useRoundStore.getState().customOdds).toBeNull();
    });

    it('reverts the display value without a store update when the value is unchanged', () => {
      const { result } = renderHook(() =>
        useCustomValueInput({
          arenaIndex: 0,
          pirateIndex: 1,
          type: 'odds',
          customValue: undefined,
          originalValue: 2,
          isPercent: false,
        }),
      );

      act(() => {
        result.current.handleChange('2');
      });

      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.inputValue).toBe('2');
      expect(useRoundStore.getState().customOdds).toBeNull();
    });
  });
});
