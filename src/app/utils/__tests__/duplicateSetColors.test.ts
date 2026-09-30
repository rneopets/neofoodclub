import { describe, it, expect } from 'vitest';

import type { Bet } from '../../../types/bets';
import { computePiratesBinary } from '../../maths';
import { DUPLICATE_BET_COLOR_PALETTE } from '../duplicateBetColors';
import { computeBetSetIdentity, computeDuplicateSetGroupColors } from '../duplicateSetColors';

function makeBets(pirateArrays: number[][]): Bet {
  const bets: Bet = new Map();
  pirateArrays.forEach((pirates, index) => {
    bets.set(index + 1, pirates);
  });
  return bets;
}

describe('computeBetSetIdentity', () => {
  it('returns null for an empty set', () => {
    expect(computeBetSetIdentity(new Map())).toBeNull();
  });

  it('returns null when every bet is empty', () => {
    expect(
      computeBetSetIdentity(
        makeBets([
          [0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0],
        ]),
      ),
    ).toBeNull();
  });

  it('ignores empty bets when computing the identity', () => {
    const withEmpty = computeBetSetIdentity(
      makeBets([
        [1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ]),
    );
    const withoutEmpty = computeBetSetIdentity(makeBets([[1, 0, 0, 0, 0]]));
    expect(withEmpty).toBe(withoutEmpty);
    expect(withEmpty).not.toBeNull();
  });

  it('is independent of bet order', () => {
    const a = computeBetSetIdentity(
      makeBets([
        [1, 0, 0, 0, 0],
        [2, 0, 0, 0, 0],
      ]),
    );
    const b = computeBetSetIdentity(
      makeBets([
        [2, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
      ]),
    );
    expect(a).toBe(b);
  });

  it('distinguishes sets with different bets', () => {
    const a = computeBetSetIdentity(makeBets([[1, 0, 0, 0, 0]]));
    const b = computeBetSetIdentity(makeBets([[2, 0, 0, 0, 0]]));
    expect(a).not.toBe(b);
  });

  it('encodes each bet as its pirates binary', () => {
    const identity = computeBetSetIdentity(makeBets([[1, 0, 0, 0, 0]]));
    expect(identity).toBe(String(computePiratesBinary([1, 0, 0, 0, 0])));
  });
});

describe('computeDuplicateSetGroupColors', () => {
  it('returns no colors when there are no sets', () => {
    expect(computeDuplicateSetGroupColors(new Map()).size).toBe(0);
  });

  it('returns no colors when all sets are unique', () => {
    const allBets = new Map<number, Bet>([
      [0, makeBets([[1, 0, 0, 0, 0]])],
      [1, makeBets([[2, 0, 0, 0, 0]])],
      [2, makeBets([[3, 0, 0, 0, 0]])],
    ]);

    expect(computeDuplicateSetGroupColors(allBets).size).toBe(0);
  });

  it('ignores empty sets', () => {
    const allBets = new Map<number, Bet>([
      [0, makeBets([])],
      [1, new Map()],
    ]);

    expect(computeDuplicateSetGroupColors(allBets).size).toBe(0);
  });

  it('assigns the first palette color to a pair of identical sets', () => {
    const identity = computeBetSetIdentity(makeBets([[1, 0, 0, 0, 0]]))!;
    const allBets = new Map<number, Bet>([
      [0, makeBets([[1, 0, 0, 0, 0]])],
      [1, makeBets([[1, 0, 0, 0, 0]])],
    ]);

    const colors = computeDuplicateSetGroupColors(allBets);
    expect(colors).toEqual(new Map([[identity, DUPLICATE_BET_COLOR_PALETTE[0]]]));
  });

  it('treats sets with the same bets in a different order as duplicates', () => {
    const allBets = new Map<number, Bet>([
      [
        0,
        makeBets([
          [1, 0, 0, 0, 0],
          [2, 0, 0, 0, 0],
        ]),
      ],
      [
        1,
        makeBets([
          [2, 0, 0, 0, 0],
          [1, 0, 0, 0, 0],
        ]),
      ],
    ]);

    const colors = computeDuplicateSetGroupColors(allBets);
    expect(colors.size).toBe(1);
  });

  it('does not treat a subset as a duplicate of the full set', () => {
    const allBets = new Map<number, Bet>([
      [
        0,
        makeBets([
          [1, 0, 0, 0, 0],
          [2, 0, 0, 0, 0],
        ]),
      ],
      [1, makeBets([[1, 0, 0, 0, 0]])],
    ]);

    expect(computeDuplicateSetGroupColors(allBets).size).toBe(0);
  });

  it('assigns distinct colors to distinct duplicate groups in lowest-index order', () => {
    const allBets = new Map<number, Bet>([
      [0, makeBets([[1, 0, 0, 0, 0]])],
      [1, makeBets([[2, 0, 0, 0, 0]])],
      [2, makeBets([[1, 0, 0, 0, 0]])],
      [3, makeBets([[2, 0, 0, 0, 0]])],
    ]);

    const colors = computeDuplicateSetGroupColors(allBets);
    expect(colors.size).toBe(2);

    const identityA = computeBetSetIdentity(makeBets([[1, 0, 0, 0, 0]]))!;
    const identityB = computeBetSetIdentity(makeBets([[2, 0, 0, 0, 0]]))!;
    expect(colors.get(identityA)).toBe(DUPLICATE_BET_COLOR_PALETTE[0]);
    expect(colors.get(identityB)).toBe(DUPLICATE_BET_COLOR_PALETTE[1]);
  });

  it('assigns the same color regardless of Map insertion order', () => {
    const setA = makeBets([[1, 0, 0, 0, 0]]);
    const setB = makeBets([[2, 0, 0, 0, 0]]);

    const forward = computeDuplicateSetGroupColors(
      new Map<number, Bet>([
        [0, setA],
        [1, setB],
        [2, makeBets([[1, 0, 0, 0, 0]])],
        [3, makeBets([[2, 0, 0, 0, 0]])],
      ]),
    );

    const reversed = computeDuplicateSetGroupColors(
      new Map<number, Bet>([
        [3, makeBets([[2, 0, 0, 0, 0]])],
        [2, makeBets([[1, 0, 0, 0, 0]])],
        [1, setB],
        [0, setA],
      ]),
    );

    expect(reversed).toEqual(forward);
  });

  it('cycles through the palette for more groups than colors', () => {
    const allBets = new Map<number, Bet>();
    // 8 duplicate groups (16 sets) - one more than the palette length.
    for (let group = 0; group < 8; group += 1) {
      const pirates = [group + 1, 0, 0, 0, 0];
      allBets.set(group * 2, makeBets([pirates]));
      allBets.set(group * 2 + 1, makeBets([pirates]));
    }

    const colors = computeDuplicateSetGroupColors(allBets);
    expect(colors.size).toBe(8);

    const expected = new Map<string, string>();
    for (let group = 0; group < 8; group += 1) {
      const identity = computeBetSetIdentity(makeBets([[group + 1, 0, 0, 0, 0]]))!;
      expected.set(
        identity,
        DUPLICATE_BET_COLOR_PALETTE[group % DUPLICATE_BET_COLOR_PALETTE.length]!,
      );
    }

    expect(colors).toEqual(expected);
  });
});
