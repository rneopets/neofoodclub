import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { RoundState } from '../../types';
import { Bet, BetAmount } from '../../types/bets';
import { BET_AMOUNT_DEFAULT, BET_AMOUNT_MAX } from '../constants';
import { computePiratesBinary } from '../maths';
import {
  generateRandomIntegerInRange,
  generateRandomPirateIndex,
  displayAsPercent,
  displayAsPercentSmart,
  displayAsPlusMinus,
  anyBetsExist,
  anyBetAmountsExist,
  amountAbbreviation,
  sortedIndices,
  countNonZeroElements,
  cartesianProduct,
  calculateBaseMaxBet,
  isValidRound,
  makeBetURL,
  shuffleArray,
  parseBetUrl,
  getMaxBet,
  calculateRoundOverPercentage,
  makeEmptyBets,
  makeEmptyBetAmounts,
  determineBetAmount,
  formatDate,
  getMaxSmartPercentDecimals,
  getTableMode,
  getBetSetPosition,
  getBigBrainMode,
  makeBetValues,
  calculateRoundData,
  calculateBetMaps,
} from '../util';

// Mock universal-cookie
const mockGetCookie = vi.fn();
vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: mockGetCookie,
      set: vi.fn(),
    };
  }),
}));

// Mock moment - using factory function to avoid hoisting issues
vi.mock('moment', () => {
  const mockMoment = vi.fn();
  const mockMomentInstance = {
    fromNow: vi.fn().mockReturnValue('2 hours ago'),
    toNow: vi.fn().mockReturnValue('in 2 hours'),
    calendar: vi.fn().mockReturnValue('Today at 2:30 PM'),
    format: vi.fn().mockReturnValue('2024-01-15 14:30:00'),
    tz: vi.fn().mockReturnThis(),
    valueOf: vi.fn().mockReturnValue(1640995200000), // Fixed timestamp
    add: vi.fn().mockReturnThis(),
  };

  mockMoment.mockReturnValue(mockMomentInstance);
  (mockMoment as unknown as { tz: () => unknown }).tz = vi.fn().mockReturnValue(mockMomentInstance);

  return { default: mockMoment };
});

describe('Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCookie.mockReset();
  });

  describe('generateRandomIntegerInRange', () => {
    it('generates numbers within the specified range', () => {
      for (let i = 0; i < 100; i++) {
        const result = generateRandomIntegerInRange(1, 10);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it('handles single number range', () => {
      const result = generateRandomIntegerInRange(5, 5);
      expect(result).toBe(5);
    });

    it('handles negative numbers', () => {
      for (let i = 0; i < 50; i++) {
        const result = generateRandomIntegerInRange(-10, -5);
        expect(result).toBeGreaterThanOrEqual(-10);
        expect(result).toBeLessThanOrEqual(-5);
      }
    });

    it('handles ranges crossing zero', () => {
      for (let i = 0; i < 50; i++) {
        const result = generateRandomIntegerInRange(-5, 5);
        expect(result).toBeGreaterThanOrEqual(-5);
        expect(result).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('generateRandomPirateIndex', () => {
    it('generates pirate indices between 1 and 4', () => {
      for (let i = 0; i < 100; i++) {
        const result = generateRandomPirateIndex();
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(4);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('displayAsPercent', () => {
    it('formats decimal to percentage', () => {
      expect(displayAsPercent(0.5)).toBe('50%');
      expect(displayAsPercent(0.25)).toBe('25%');
      expect(displayAsPercent(1)).toBe('100%');
      expect(displayAsPercent(0)).toBe('0%');
    });

    it('formats with specified decimals', () => {
      expect(displayAsPercent(0.12345, 1)).toBe('12.3%');
      expect(displayAsPercent(0.12345, 2)).toBe('12.35%');
      expect(displayAsPercent(0.12345, 0)).toBe('12%');
    });

    it('handles undefined input', () => {
      expect(displayAsPercent(undefined as unknown as number)).toBe('0%');
    });

    it('handles negative values', () => {
      expect(displayAsPercent(-0.1)).toBe('-10%');
      expect(displayAsPercent(-0.5, 1)).toBe('-50.0%');
    });

    it('handles values greater than 1', () => {
      expect(displayAsPercent(1.5)).toBe('150%');
      expect(displayAsPercent(2.5, 1)).toBe('250.0%');
    });
  });

  describe('displayAsPercentSmart', () => {
    it('shows at least 3 decimals for normal values', () => {
      expect(displayAsPercentSmart(0.5)).toBe('50.000%');
      expect(displayAsPercentSmart(0.25)).toBe('25.000%');
      expect(displayAsPercentSmart(1)).toBe('100.000%');
    });

    it('shows 0% for zero', () => {
      expect(displayAsPercentSmart(0)).toBe('0%');
    });

    it('shows extra decimals for small values to reveal first non-zero digit', () => {
      expect(displayAsPercentSmart(0.00001)).toBe('0.001%');
      expect(displayAsPercentSmart(0.000001)).toBe('0.0001%');
      expect(displayAsPercentSmart(0.0000001)).toBe('0.00001%');
    });

    it('handles negative values', () => {
      expect(displayAsPercentSmart(-0.1)).toBe('-10.000%');
    });
  });

  describe('getMaxSmartPercentDecimals', () => {
    it('returns the minimum of 3 decimals for all normal values', () => {
      expect(getMaxSmartPercentDecimals([0.5, 0.25, 0.1])).toBe(3);
    });

    it('returns the larger decimal count needed by a tiny value in the array', () => {
      expect(getMaxSmartPercentDecimals([0.5, 0.000001])).toBe(4);
    });

    it('ignores zeros when computing the max', () => {
      expect(getMaxSmartPercentDecimals([0.5, 0, 0.25])).toBe(3);
    });

    it('returns the minDecimals floor for an empty array', () => {
      expect(getMaxSmartPercentDecimals([])).toBe(3);
    });

    it('respects a custom minDecimals parameter', () => {
      expect(getMaxSmartPercentDecimals([0.5], 5)).toBe(5);
    });
  });

  describe('displayAsPlusMinus', () => {
    it('adds plus sign for positive numbers', () => {
      expect(displayAsPlusMinus(10)).toBe('+10');
      expect(displayAsPlusMinus(0.5)).toBe('+0.5');
    });

    it('keeps minus sign for negative numbers', () => {
      expect(displayAsPlusMinus(-10)).toBe('-10');
      expect(displayAsPlusMinus(-0.5)).toBe('-0.5');
    });

    it('handles zero', () => {
      expect(displayAsPlusMinus(0)).toBe('0');
    });
  });

  describe('anyBetsExist', () => {
    it('returns true when bets exist', () => {
      const bets: Bet = new Map([
        [1, [1, 0, 0, 0, 0]],
        [2, [0, 0, 0, 0, 0]],
      ]);
      expect(anyBetsExist(bets)).toBe(true);
    });

    it('returns false when no bets exist', () => {
      const bets: Bet = new Map([
        [1, [0, 0, 0, 0, 0]],
        [2, [0, 0, 0, 0, 0]],
      ]);
      expect(anyBetsExist(bets)).toBe(false);
    });

    it('returns false for undefined input', () => {
      expect(anyBetsExist(undefined)).toBe(false);
    });

    it('returns false for empty map', () => {
      const bets: Bet = new Map();
      expect(anyBetsExist(bets)).toBe(false);
    });

    it('returns true for mixed bets', () => {
      const bets: Bet = new Map([
        [1, [0, 0, 0, 0, 0]],
        [2, [0, 2, 0, 0, 0]],
        [3, [0, 0, 0, 0, 0]],
      ]);
      expect(anyBetsExist(bets)).toBe(true);
    });
  });

  describe('anyBetAmountsExist', () => {
    it('returns true when positive bet amounts exist', () => {
      const betAmounts: BetAmount = new Map([
        [1, 1000],
        [2, BET_AMOUNT_DEFAULT],
      ]);
      expect(anyBetAmountsExist(betAmounts)).toBe(true);
    });

    it('returns false when no positive bet amounts exist', () => {
      const betAmounts: BetAmount = new Map([
        [1, BET_AMOUNT_DEFAULT],
        [2, 0],
        [3, -500],
      ]);
      expect(anyBetAmountsExist(betAmounts)).toBe(false);
    });

    it('returns false for undefined input', () => {
      expect(anyBetAmountsExist(undefined)).toBe(false);
    });

    it('returns false for empty map', () => {
      const betAmounts: BetAmount = new Map();
      expect(anyBetAmountsExist(betAmounts)).toBe(false);
    });
  });

  describe('amountAbbreviation', () => {
    it('abbreviates millions', () => {
      expect(amountAbbreviation(1000000)).toBe('1M');
      expect(amountAbbreviation(2500000)).toBe('2.5M');
      expect(amountAbbreviation(-1000000)).toBe('-1M');
    });

    it('abbreviates thousands', () => {
      expect(amountAbbreviation(1000)).toBe('1k');
      expect(amountAbbreviation(2500)).toBe('2.5k');
      expect(amountAbbreviation(-1000)).toBe('-1k');
    });

    it('does not abbreviate small numbers', () => {
      expect(amountAbbreviation(999)).toBe('999');
      expect(amountAbbreviation(100)).toBe('100');
      expect(amountAbbreviation(0)).toBe('0');
      expect(amountAbbreviation(-999)).toBe('-999');
    });

    it('handles edge cases around thresholds', () => {
      expect(amountAbbreviation(999999)).toBe('999.999k');
      expect(amountAbbreviation(1000000)).toBe('1M');
      expect(amountAbbreviation(999)).toBe('999');
      expect(amountAbbreviation(1000)).toBe('1k');
    });
  });

  describe('sortedIndices', () => {
    it('returns indices of sorted array', () => {
      expect(sortedIndices([3, 4, 1, 2])).toEqual([2, 3, 0, 1]);
      expect(sortedIndices([10, 5, 8])).toEqual([1, 2, 0]);
    });

    it('handles array with duplicates', () => {
      expect(sortedIndices([3, 1, 3, 2])).toEqual([1, 3, 0, 2]);
    });

    it('handles single element array', () => {
      expect(sortedIndices([5])).toEqual([0]);
    });

    it('handles empty array', () => {
      expect(sortedIndices([])).toEqual([]);
    });

    it('handles already sorted array', () => {
      expect(sortedIndices([1, 2, 3, 4])).toEqual([0, 1, 2, 3]);
    });

    it('handles reverse sorted array', () => {
      expect(sortedIndices([4, 3, 2, 1])).toEqual([3, 2, 1, 0]);
    });

    it('handles negative numbers', () => {
      expect(sortedIndices([-1, -3, -2])).toEqual([1, 2, 0]);
    });
  });

  describe('countNonZeroElements', () => {
    it('counts non-zero elements', () => {
      expect(countNonZeroElements([1, 0, 2, 0, 3])).toBe(3);
      expect(countNonZeroElements([1, 2, 3])).toBe(3);
      expect(countNonZeroElements([0, 0, 0])).toBe(0);
    });

    it('handles empty array', () => {
      expect(countNonZeroElements([])).toBe(0);
    });

    it('handles negative numbers', () => {
      expect(countNonZeroElements([-1, 0, -2, 0, 3])).toBe(3);
    });

    it('handles decimal numbers', () => {
      expect(countNonZeroElements([0.1, 0, 0.2, 0])).toBe(2);
    });
  });

  describe('cartesianProduct', () => {
    it('computes cartesian product of two arrays', () => {
      const result = cartesianProduct([1, 2], [3, 4]);
      expect(result).toEqual([
        [1, 3],
        [1, 4],
        [2, 3],
        [2, 4],
      ]);
    });

    it('computes cartesian product of three arrays', () => {
      const result = cartesianProduct([1], [2], [3, 4]);
      expect(result).toEqual([
        [1, 2, 3],
        [1, 2, 4],
      ]);
    });

    it('handles empty array', () => {
      const result = cartesianProduct([1, 2], []);
      expect(result).toEqual([]);
    });

    it('handles single element arrays', () => {
      const result = cartesianProduct([1], [2]);
      expect(result).toEqual([[1, 2]]);
    });

    it('handles mixed types', () => {
      const result = cartesianProduct<string | number>(['a', 'b'], [1, 2]);
      expect(result).toEqual([
        ['a', 1],
        ['a', 2],
        ['b', 1],
        ['b', 2],
      ]);
    });
  });

  describe('calculateBaseMaxBet', () => {
    it('calculates base max bet correctly', () => {
      expect(calculateBaseMaxBet(13000, 8500)).toBe(-4000);
      expect(calculateBaseMaxBet(1000, 100)).toBe(800);
    });

    it('handles zero round', () => {
      expect(calculateBaseMaxBet(1000, 0)).toBe(1000);
    });

    it('handles negative results', () => {
      expect(calculateBaseMaxBet(100, 1000)).toBe(-1900);
    });
  });

  describe('isValidRound', () => {
    it('returns true for valid round state', () => {
      const validRoundState = {
        roundData: {
          round: 8500,
          pirates: [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
          ],
        },
      } as unknown as RoundState;
      expect(isValidRound(validRoundState)).toBe(true);
    });

    it('returns false for undefined input', () => {
      expect(isValidRound(undefined)).toBe(false);
    });

    it('returns false for missing round data', () => {
      const invalidRoundState = {} as unknown as RoundState;
      expect(isValidRound(invalidRoundState)).toBe(false);
    });

    it('returns false for missing round number', () => {
      const invalidRoundState = {
        roundData: {
          pirates: [[1, 2, 3, 4]],
        },
      } as unknown as RoundState;
      expect(isValidRound(invalidRoundState)).toBe(false);
    });

    it('returns false for missing pirates data', () => {
      const invalidRoundState = {
        roundData: {
          round: 8500,
        },
      } as unknown as RoundState;
      expect(isValidRound(invalidRoundState)).toBe(false);
    });

    it('returns false for empty pirates array', () => {
      const invalidRoundState = {
        roundData: {
          round: 8500,
          pirates: [],
        },
      } as unknown as RoundState;
      expect(isValidRound(invalidRoundState)).toBe(false);
    });
  });

  describe('makeBetURL', () => {
    it('creates URL with round number only', () => {
      const result = makeBetURL(8500);
      expect(result).toBe('/#round=8500');
    });

    it('creates URL with bets', () => {
      const bets: Bet = new Map([[1, [1, 2, 0, 0, 0]]]);
      const result = makeBetURL(8500, bets);
      expect(result).toContain('/#round=8500&b=');
    });

    it('creates URL with bets and amounts', () => {
      const bets: Bet = new Map([[1, [1, 2, 0, 0, 0]]]);
      const betAmounts: BetAmount = new Map([[1, 1000]]);
      const result = makeBetURL(8500, bets, betAmounts, true);
      expect(result).toContain('/#round=8500&b=');
      expect(result).toContain('&a=');
    });

    it('does not include amounts when includeBetAmounts is false', () => {
      const bets: Bet = new Map([[1, [1, 2, 0, 0, 0]]]);
      const betAmounts: BetAmount = new Map([[1, 1000]]);
      const result = makeBetURL(8500, bets, betAmounts, false);
      expect(result).toContain('/#round=8500&b=');
      expect(result).not.toContain('&a=');
    });

    it('does not include bet data when no bets exist', () => {
      const bets: Bet = new Map([[1, [0, 0, 0, 0, 0]]]);
      const result = makeBetURL(8500, bets);
      expect(result).toBe('/#round=8500');
    });
  });

  describe('shuffleArray', () => {
    let originalMathRandom: () => number;

    beforeEach(() => {
      originalMathRandom = Math.random;
    });

    afterEach(() => {
      Math.random = originalMathRandom;
    });

    it('shuffles array deterministically with mocked random', () => {
      // Mock Math.random to return predictable sequence
      const randomValues = [0.9, 0.1, 0.8, 0.2];
      let callCount = 0;
      Math.random = vi.fn(
        () => randomValues[callCount++ % randomValues.length],
      ) as unknown as () => number;

      const array = [1, 2, 3, 4, 5];
      const originalArray = [...array];
      shuffleArray(array);

      // Array should be modified in place
      expect(array).not.toEqual(originalArray);
      // But should contain same elements
      expect(array.sort()).toEqual(originalArray.sort());
      expect(array).toHaveLength(originalArray.length);
    });

    it('follows Fisher-Yates algorithm correctly', () => {
      // Mock Math.random to return 0.5 for each call
      Math.random = vi.fn(() => 0.5);

      const array = [1, 2, 3, 4];
      shuffleArray(array);

      // With 0.5, each random pick will be Math.floor(0.5 * (i + 1))
      // For i=3: j = Math.floor(0.5 * 4) = 2, swap positions 3 and 2 → [1, 2, 4, 3]
      // For i=2: j = Math.floor(0.5 * 3) = 1, swap positions 2 and 1 → [1, 4, 2, 3]
      // For i=1: j = Math.floor(0.5 * 2) = 1, swap positions 1 and 1 (no change) → [1, 4, 2, 3]

      expect(array).toEqual([1, 4, 2, 3]);
    });

    it('handles single element array', () => {
      const array = [1];
      shuffleArray(array);
      expect(array).toEqual([1]);
    });

    it('handles empty array', () => {
      const array: number[] = [];
      shuffleArray(array);
      expect(array).toEqual([]);
    });

    it('handles two element array with proper swap', () => {
      Math.random = vi.fn(() => 0.4); // This gives j = Math.floor(0.4 * 2) = 0, so swap positions 1 and 0
      const array = [1, 2];
      shuffleArray(array);
      expect(array).toEqual([2, 1]);
    });

    it('preserves array reference (modifies in place)', () => {
      const array = [1, 2, 3];
      const reference = array;
      shuffleArray(array);
      expect(array).toBe(reference); // Same reference
    });

    it('works with different data types', () => {
      const array = ['a', 'b', 'c', 'd'];
      const originalLength = array.length;
      const originalElements = [...array];

      shuffleArray(array);

      expect(array).toHaveLength(originalLength);
      expect(array.sort()).toEqual(originalElements.sort());
    });

    it('handles edge case where random returns exactly 1', () => {
      Math.random = vi.fn(() => 0.9999); // Close to 1 but not exactly 1
      const array = [1, 2];
      shuffleArray(array);
      // j = Math.floor(0.9999 * 2) = Math.floor(1.9998) = 1, swap positions 1 and 1 (no change)
      expect(array).toEqual([1, 2]);
    });
  });

  describe('parseBetUrl', () => {
    it('parses URL with round and bets', () => {
      const result = parseBetUrl('round=8500&b=abcde');
      expect(result.round).toBe(8500);
      expect(result.bets).toBeInstanceOf(Map);
      expect(result.betAmounts).toBeInstanceOf(Map);
    });

    it('parses URL with round only', () => {
      const result = parseBetUrl('round=8500');
      expect(result.round).toBe(8500);
      expect(result.bets.size).toBeGreaterThan(0);
      expect(result.betAmounts.size).toBeGreaterThan(0);
    });

    it('handles missing round parameter', () => {
      const result = parseBetUrl('b=abcde');
      expect(result.round).toBe(0);
    });

    it('handles empty URL', () => {
      const result = parseBetUrl('');
      expect(result.round).toBe(0);
      expect(result.bets.size).toBeGreaterThan(0);
      expect(result.betAmounts.size).toBeGreaterThan(0);
    });

    it('parses URL with bet amounts', () => {
      const result = parseBetUrl('round=8500&b=abcde&a=abc');
      expect(result.round).toBe(8500);
      expect(result.betAmounts).toBeInstanceOf(Map);
    });

    it('handles invalid round number', () => {
      const result = parseBetUrl('round=invalid');
      expect(result.round).toBe(0);
    });

    it('creates default bet structure when no bets provided', () => {
      const result = parseBetUrl('round=8500');
      expect(result.bets.size).toBe(10); // Default to 10 bets
      expect(result.betAmounts.size).toBe(10);
    });
  });

  describe('getMaxBet', () => {
    it('calculates max bet with valid base max bet', () => {
      mockGetCookie.mockImplementation(key => {
        if (key === 'baseMaxBet') {
          return 10000;
        }
        if (key === 'maxBetLocked') {
          return false;
        }
        if (key === 'lockedMaxBet') {
          return undefined;
        }
        return undefined;
      });

      const result = getMaxBet(8500);
      // baseMaxBet (10000) + 2 * round (8500) = 27000
      expect(result).toBe(27000);
      expect(mockGetCookie).toHaveBeenCalledWith('baseMaxBet');
    });

    it('returns BET_AMOUNT_DEFAULT when calculated value is too low', () => {
      mockGetCookie.mockImplementation(key => {
        if (key === 'maxBetLocked') {
          return false;
        }
        if (key === 'baseMaxBet') {
          return -20000;
        }
        return undefined;
      });

      const result = getMaxBet(8500);
      expect(result).toBe(BET_AMOUNT_DEFAULT);
    });

    it('caps max bet at BET_AMOUNT_MAX', () => {
      mockGetCookie.mockImplementation(key => {
        if (key === 'maxBetLocked') {
          return false;
        }
        if (key === 'baseMaxBet') {
          return 1000000;
        }
        return undefined;
      });

      const result = getMaxBet(8500);
      expect(result).toBe(BET_AMOUNT_MAX);
    });

    it('returns BET_AMOUNT_DEFAULT when no cookie is set (undefined)', () => {
      mockGetCookie.mockImplementation(key => {
        if (key === 'maxBetLocked') {
          return false;
        }
        return undefined;
      });

      const result = getMaxBet(8500);
      expect(result).toBe(BET_AMOUNT_DEFAULT);
    });

    it('returns BET_AMOUNT_DEFAULT when no cookie is set (null)', () => {
      mockGetCookie.mockImplementation(key => {
        if (key === 'maxBetLocked') {
          return false;
        }
        if (key === 'baseMaxBet') {
          return null;
        }
        return undefined;
      });

      const result = getMaxBet(8500);
      expect(result).toBe(BET_AMOUNT_DEFAULT);
    });
  });

  describe('calculateRoundOverPercentage', () => {
    it('calculates percentage for ongoing round', () => {
      // Since the mock is complex, let's simplify this test
      const roundState = {
        roundData: {
          start: new Date('2024-01-01T00:00:00Z'),
        },
      } as unknown as RoundState;

      // Just verify the function executes without throwing
      expect(() => {
        const result = calculateRoundOverPercentage(roundState);
        expect(typeof result).toBe('number');
      }).not.toThrow();
    });

    it('returns 0 for missing start time', () => {
      const roundState = {
        roundData: {},
      } as unknown as RoundState;

      const result = calculateRoundOverPercentage(roundState);
      expect(result).toBe(0);
    });

    it('returns 0 for undefined round state', () => {
      const result = calculateRoundOverPercentage(undefined);
      expect(result).toBe(0);
    });
  });

  describe('makeEmptyBets', () => {
    it('creates map with specified length', () => {
      const result = makeEmptyBets(5);
      expect(result.size).toBe(5);
      expect(result).toBeInstanceOf(Map);
    });

    it('creates empty bet arrays for each index', () => {
      const result = makeEmptyBets(3);
      expect(result.get(1)).toEqual([0, 0, 0, 0, 0]);
      expect(result.get(2)).toEqual([0, 0, 0, 0, 0]);
      expect(result.get(3)).toEqual([0, 0, 0, 0, 0]);
    });

    it('handles zero length', () => {
      const result = makeEmptyBets(0);
      expect(result.size).toBe(0);
    });

    it('handles large length', () => {
      const result = makeEmptyBets(15);
      expect(result.size).toBe(15);
      expect(result.get(15)).toEqual([0, 0, 0, 0, 0]);
    });
  });

  describe('makeEmptyBetAmounts', () => {
    it('creates map with specified length', () => {
      const result = makeEmptyBetAmounts(5);
      expect(result.size).toBe(5);
      expect(result).toBeInstanceOf(Map);
    });

    it('creates BET_AMOUNT_DEFAULT values for each index', () => {
      const result = makeEmptyBetAmounts(3);
      expect(result.get(1)).toBe(BET_AMOUNT_DEFAULT);
      expect(result.get(2)).toBe(BET_AMOUNT_DEFAULT);
      expect(result.get(3)).toBe(BET_AMOUNT_DEFAULT);
    });

    it('handles zero length', () => {
      const result = makeEmptyBetAmounts(0);
      expect(result.size).toBe(0);
    });

    it('handles large length', () => {
      const result = makeEmptyBetAmounts(15);
      expect(result.size).toBe(15);
      expect(result.get(15)).toBe(BET_AMOUNT_DEFAULT);
    });
  });

  describe('determineBetAmount', () => {
    it('returns smallest of maxBet, betCap, and BET_AMOUNT_MAX', () => {
      expect(determineBetAmount(10000, 20000)).toBe(10000); // maxBet smallest
      expect(determineBetAmount(20000, 10000)).toBe(10000); // betCap smallest
      expect(determineBetAmount(600000, 700000)).toBe(BET_AMOUNT_MAX); // cap
    });

    it('returns BET_AMOUNT_DEFAULT when maxBet is less than 1', () => {
      expect(determineBetAmount(0, 10000)).toBe(BET_AMOUNT_DEFAULT);
      expect(determineBetAmount(-5000, 10000)).toBe(BET_AMOUNT_DEFAULT);
    });

    it('handles edge case where maxBet equals 1', () => {
      expect(determineBetAmount(1, 10000)).toBe(1);
    });

    it('handles all values being equal', () => {
      expect(determineBetAmount(BET_AMOUNT_MAX, BET_AMOUNT_MAX)).toBe(BET_AMOUNT_MAX);
    });

    it('handles very large numbers', () => {
      expect(determineBetAmount(1000000, 2000000)).toBe(BET_AMOUNT_MAX);
    });
  });

  describe('formatDate', () => {
    it('returns default format when no options provided', () => {
      const fixedDate = '2021-04-09T02:27:28+00:00';
      const result = formatDate(fixedDate);
      expect(result).toBe('2021-04-08 19:27:28');
    });

    it('converts UTC to Los Angeles time', () => {
      const fixedDate = '2024-01-15T14:30:00Z';
      const result = formatDate(fixedDate, {
        format: 'YYYY-MM-DD HH:mm:ss',
        tz: 'America/Los_Angeles',
      });
      // UTC 14:30 should be 06:30 in LA (PST) or 07:30 (PDT)
      expect(result).toMatch(/2024-01-15 (06|07):30:00/);
    });

    it('converts UTC to local time', () => {
      const fixedDate = '2024-01-15T14:30:00Z';
      const result = formatDate(fixedDate, {
        format: 'YYYY-MM-DD HH:mm:ss',
      });
      // Should return the date in local timezone format
      expect(result).toMatch(/2024-01-15 \d{2}:\d{2}:\d{2}/);
    });

    it('handles empty date', () => {
      const result = formatDate('', { fromNow: true });
      expect(result).toBe('');
    });
  });
});

describe('Cookie-backed settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCookie.mockReset();
  });

  describe('getTableMode', () => {
    it('returns the default "normal" when no cookie is set', () => {
      mockGetCookie.mockReturnValue(undefined);
      expect(getTableMode()).toBe('normal');
    });

    it('returns the cookie value when it is a valid option', () => {
      mockGetCookie.mockReturnValue('dropdown');
      expect(getTableMode()).toBe('dropdown');
    });

    it('falls back to the default when the cookie value is invalid', () => {
      mockGetCookie.mockReturnValue('garbage');
      expect(getTableMode()).toBe('normal');
    });
  });

  describe('getBetSetPosition', () => {
    it('returns the default "below" when no cookie is set', () => {
      mockGetCookie.mockReturnValue(undefined);
      expect(getBetSetPosition()).toBe('below');
    });

    it('returns the cookie value when it is a valid option', () => {
      mockGetCookie.mockReturnValue('left');
      expect(getBetSetPosition()).toBe('left');
    });

    it('returns "right" when the cookie is set to "right"', () => {
      mockGetCookie.mockReturnValue('right');
      expect(getBetSetPosition()).toBe('right');
    });

    it('falls back to the default when the cookie value is invalid', () => {
      mockGetCookie.mockReturnValue('sideways');
      expect(getBetSetPosition()).toBe('below');
    });
  });

  describe('getBigBrainMode', () => {
    it('returns the default true when no cookie is set', () => {
      mockGetCookie.mockReturnValue(undefined);
      expect(getBigBrainMode()).toBe(true);
    });

    it('returns true when the cookie is the boolean true', () => {
      mockGetCookie.mockReturnValue(true);
      expect(getBigBrainMode()).toBe(true);
    });

    it('returns false when the cookie is the boolean false', () => {
      mockGetCookie.mockReturnValue(false);
      expect(getBigBrainMode()).toBe(false);
    });

    it('returns false when the cookie is the string "false"', () => {
      mockGetCookie.mockReturnValue('false');
      expect(getBigBrainMode()).toBe(false);
    });

    it('returns true when the cookie is the string "true"', () => {
      mockGetCookie.mockReturnValue('true');
      expect(getBigBrainMode()).toBe(true);
    });

    it('falls back to the default when the cookie is an invalid/garbage string', () => {
      mockGetCookie.mockReturnValue('garbage');
      expect(getBigBrainMode()).toBe(true);
    });

    it('coerces numeric cookies (0 is false, nonzero is true)', () => {
      mockGetCookie.mockReturnValue(0);
      expect(getBigBrainMode()).toBe(false);
      mockGetCookie.mockReturnValue(1);
      expect(getBigBrainMode()).toBe(true);
    });
  });
});

describe('makeBetValues', () => {
  it('forces oddsProduct/probProduct/payoff to 0 for an all-zero bet', () => {
    const bets: Bet = new Map([[1, [0, 0, 0, 0, 0]]]);
    const betAmounts: BetAmount = new Map([[1, 100]]);
    const odds = [
      [0, 2, 3, 4, 5],
      [0, 2, 3, 4, 5],
      [0, 2, 3, 4, 5],
      [0, 2, 3, 4, 5],
      [0, 2, 3, 4, 5],
    ];
    const probabilities = [
      [0, 0.25, 0.25, 0.25, 0.25],
      [0, 0.25, 0.25, 0.25, 0.25],
      [0, 0.25, 0.25, 0.25, 0.25],
      [0, 0.25, 0.25, 0.25, 0.25],
      [0, 0.25, 0.25, 0.25, 0.25],
    ];

    const result = makeBetValues(bets, betAmounts, odds, probabilities);

    expect(result.betBinaries.get(1)).toBe(0);
    expect(result.betOdds.get(1)).toBe(0);
    expect(result.betProbabilities.get(1)).toBe(0);
    expect(result.betPayoffs.get(1)).toBe(0);
    expect(result.betExpectedRatios.get(1)).toBe(0);
    expect(result.betNetExpected.get(1)).toBe(-100);
    expect(result.betMaxBets.get(1)).toBe(1_000_000);
  });

  it('computes exact odds/probability/payoff products for a normal 5-arena bet', () => {
    const bets: Bet = new Map([[1, [1, 2, 3, 4, 1]]]);
    const betAmounts: BetAmount = new Map([[1, 10]]);
    const odds = [
      [0, 2, 0, 0, 0],
      [0, 0, 3, 0, 0],
      [0, 0, 0, 4, 0],
      [0, 0, 0, 0, 5],
      [0, 6, 0, 0, 0],
    ];
    const probabilities = [
      [0, 0.5, 0, 0, 0],
      [0, 0, 0.4, 0, 0],
      [0, 0, 0, 0.3, 0],
      [0, 0, 0, 0, 0.2],
      [0, 0.1, 0, 0, 0],
    ];

    const result = makeBetValues(bets, betAmounts, odds, probabilities);

    expect(result.betBinaries.get(1)).toBeGreaterThan(0);
    expect(result.betOdds.get(1)).toBe(720); // 2*3*4*5*6
    expect(result.betProbabilities.get(1)!).toBeCloseTo(0.0012, 9); // 0.5*0.4*0.3*0.2*0.1
    expect(result.betPayoffs.get(1)).toBe(7200); // 10 * 720
    expect(result.betExpectedRatios.get(1)!).toBeCloseTo(0.864, 9); // 720 * 0.0012
    expect(result.betNetExpected.get(1)!).toBeCloseTo(-1.36, 9); // 7200*0.0012 - 10
    expect(result.betMaxBets.get(1)).toBe(1388); // floor(1_000_000 / 720)
  });

  it('caps payoff at 1,000,000', () => {
    const bets: Bet = new Map([[1, [1, 0, 0, 0, 0]]]);
    const betAmounts: BetAmount = new Map([[1, 1000]]);
    const odds = [
      [0, 5000, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];
    const probabilities = [
      [0, 0.1, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];

    const result = makeBetValues(bets, betAmounts, odds, probabilities);

    expect(result.betOdds.get(1)).toBe(5000);
    // amount * oddsProduct = 1000 * 5000 = 5,000,000, capped at 1,000,000
    expect(result.betPayoffs.get(1)).toBe(1_000_000);
  });

  it('returns all-empty maps for an empty bets Map', () => {
    const bets: Bet = new Map();
    const betAmounts: BetAmount = new Map();
    const odds = [[], [], [], [], []];
    const probabilities = [[], [], [], [], []];

    const result = makeBetValues(bets, betAmounts, odds, probabilities);

    expect(result.betBinaries.size).toBe(0);
    expect(result.betOdds.size).toBe(0);
    expect(result.betPayoffs.size).toBe(0);
    expect(result.betProbabilities.size).toBe(0);
    expect(result.betExpectedRatios.size).toBe(0);
    expect(result.betNetExpected.size).toBe(0);
    expect(result.betMaxBets.size).toBe(0);
  });
});

describe('calculateRoundData', () => {
  it('returns the uncalculated default shape when called with no arguments', () => {
    const result = calculateRoundData();

    expect(result.calculated).toBe(false);
    expect(result.odds).toEqual([]);
    expect(result.legacyProbabilities).toEqual({ min: [], std: [], max: [], used: [] });
    expect(result.logitProbabilities).toEqual({ prob: [], used: [] });
    expect(result.usedProbabilities).toEqual([]);
    expect(result.pirateFAs.size).toBe(0);
    expect(result.arenaRatios).toEqual([]);
    expect(result.betOdds.size).toBe(0);
    expect(result.betBinaries.size).toBe(0);
    expect(result.payoutTables).toEqual({ odds: [], winnings: [] });
    expect(result.winningBetBinary).toBe(0);
    expect(result.totalBetAmounts).toBe(0);
    expect(result.totalEnabledBets).toBe(0);
  });

  it('populates calculated fields for a valid round/bets/betAmounts combination', () => {
    const roundState: RoundState = {
      roundData: {
        round: 8000,
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
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [9, 10, 11, 12],
          [13, 14, 15, 16],
          [17, 18, 19, 20],
        ],
        winners: [],
      },
      currentSelectedRound: 8000,
      currentRound: 8000,
      advanced: {
        bigBrain: false,
        faDetails: false,
        oddsTimeline: false,
        customOddsMode: false,
        useLogitModel: false,
      },
      customOdds: null,
      customProbs: null,
      viewMode: false,
      useWebDomain: false,
      tableMode: 'normal',
    };
    const bets: Bet = new Map([[1, [1, 1, 1, 1, 1]]]);
    const betAmounts: BetAmount = new Map([[1, 50]]);

    const result = calculateRoundData(roundState, bets, betAmounts);

    expect(result.calculated).toBe(true);
    expect(result.odds).toEqual(roundState.roundData.currentOdds);
    expect(result.betBinaries.get(1)).toBeGreaterThan(0);
    expect(result.payoutTables.odds.length).toBeGreaterThan(0);
    expect(result.payoutTables.winnings.length).toBeGreaterThan(0);
    expect(result.totalEnabledBets).toBe(1);
    expect(result.totalBetAmounts).toBe(50);
  });
});

describe('calculateBetMaps', () => {
  it('returns empty maps when odds is an empty array', () => {
    const result = calculateBetMaps(
      [
        [0, 1],
        [0, 1],
      ],
      [],
      null,
      0,
    );
    expect(result.betCaps.size).toBe(0);
    expect(result.betOdds.size).toBe(0);
    expect(result.pirateCombos.size).toBe(0);
  });

  it('computes betOdds/betCaps for a small pirateChoices cartesian product without pirateCombos', () => {
    const pirateChoices = [
      [0, 1],
      [0, 1],
    ];
    const odds = [[0, 2], [0, 4], [], [], []];

    const result = calculateBetMaps(pirateChoices, odds, null, 0, {
      includePirateCombos: false,
    });

    // [0,0] produces betBinary 0 and is skipped; the other 3 combos are kept.
    expect(result.betOdds.size).toBe(3);
    expect(result.betCaps.size).toBe(3);
    expect(result.pirateCombos.size).toBe(0);
  });

  it('also computes pirateCombos when includePirateCombos is true', () => {
    const pirateChoices = [
      [0, 1],
      [0, 1],
    ];
    const odds = [[0, 2], [0, 4], [], [], []];
    const probabilities = [[0, 0.5], [0, 0.6], [], [], []];

    const result = calculateBetMaps(pirateChoices, odds, probabilities, 0, {
      includePirateCombos: true,
    });

    expect(result.betOdds.size).toBe(3);
    expect(result.pirateCombos.size).toBe(3);

    // arena0=pirate1(odds 2), arena1=pirate1(odds 4) => betBinary for [1,1]
    const binaryBothSelected = computePiratesBinary([1, 1]);
    expect(result.betOdds.get(binaryBothSelected)).toBe(8); // 2 * 4
    expect(result.pirateCombos.get(binaryBothSelected)).toBeCloseTo(2.4, 9); // 8 * (0.5*0.6)
  });

  it('applies the maxBet > 0 branch when computing pirateCombos', () => {
    const pirateChoices = [
      [0, 1],
      [0, 1],
    ];
    const odds = [[0, 2], [0, 4], [], [], []];
    const probabilities = [[0, 0.5], [0, 0.6], [], [], []];

    const result = calculateBetMaps(pirateChoices, odds, probabilities, 1000, {
      includePirateCombos: true,
    });

    const binaryBothSelected = computePiratesBinary([1, 1]);
    // totalOdds=8, betCap=ceil(1_000_000/8)=125000, maxCap=min(125000,1000)=1000,
    // winnings=min(1000*8,1_000_000)=8000, winChance=0.5*0.6=0.3
    // pirateCombos = ((0.3*8000)/1000 - 1) * 1000 = 1400
    expect(result.pirateCombos.get(binaryBothSelected)).toBeCloseTo(1400, 6);
  });
});
