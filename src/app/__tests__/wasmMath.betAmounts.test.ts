import { describe, it, expect } from 'vitest';

import { BET_AMOUNT_DEFAULT, BET_AMOUNT_HASH_MAX } from '../constants';
import {
  canHashBetAmounts,
  wasmAmountsHashToBetAmounts,
  wasmBetAmountsToAmountsHash,
} from '../wasmMath';

describe('canHashBetAmounts', () => {
  it('accepts amounts up to and including the hash maximum', () => {
    expect(canHashBetAmounts([1, 50, BET_AMOUNT_HASH_MAX])).toBe(true);
  });

  it('rejects any amount above the hash maximum', () => {
    expect(canHashBetAmounts([50, BET_AMOUNT_HASH_MAX + 1])).toBe(false);
    expect(canHashBetAmounts([500_000])).toBe(false);
  });

  it('treats unset amounts and an empty list as hashable', () => {
    expect(canHashBetAmounts([BET_AMOUNT_DEFAULT, 0, -1])).toBe(true);
    expect(canHashBetAmounts([])).toBe(true);
  });
});

describe('wasmBetAmountsToAmountsHash', () => {
  it('round-trips the largest hashable amount', () => {
    const hash = wasmBetAmountsToAmountsHash([BET_AMOUNT_HASH_MAX]);
    expect(wasmAmountsHashToBetAmounts(hash, BET_AMOUNT_DEFAULT)).toEqual([BET_AMOUNT_HASH_MAX]);
  });

  it.each([BET_AMOUNT_HASH_MAX + 1, 80_000, 500_000])(
    'throws for %i instead of encoding a different amount',
    tooBig => {
      expect(() => wasmBetAmountsToAmountsHash([50, tooBig])).toThrow();
    },
  );
});
