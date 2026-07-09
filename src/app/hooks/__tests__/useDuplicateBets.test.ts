import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import type { Bet } from '../../../types/bets';
import { computePiratesBinary } from '../../maths';
import { useDuplicateBets } from '../useDuplicateBets';

function makeBets(pirateArrays: number[][]): Bet {
  const bets: Bet = new Map();
  pirateArrays.forEach((pirates, index) => {
    bets.set(index + 1, pirates);
  });
  return bets;
}

describe('useDuplicateBets', () => {
  it('returns empty results for an empty bets map', () => {
    const { result } = renderHook(() => useDuplicateBets(new Map()));

    expect(result.current.betBinaries).toEqual([]);
    expect(result.current.duplicateBinaries).toEqual([]);
    expect(result.current.hasDuplicates).toBe(false);
  });

  it('finds no duplicates when all non-empty bets are unique', () => {
    const bets = makeBets([
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
      [3, 3, 3, 3, 3],
    ]);

    const { result } = renderHook(() => useDuplicateBets(bets));

    expect(result.current.betBinaries).toHaveLength(3);
    expect(result.current.duplicateBinaries).toEqual([]);
    expect(result.current.hasDuplicates).toBe(false);
  });

  it('flags exactly one duplicate pair', () => {
    const bets = makeBets([
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
    ]);
    const duplicateBinary = computePiratesBinary([1, 1, 1, 1, 1]);
    const uniqueBinary = computePiratesBinary([2, 2, 2, 2, 2]);

    const { result } = renderHook(() => useDuplicateBets(bets));

    expect(result.current.hasDuplicates).toBe(true);
    expect(result.current.duplicateBinaries).toEqual([duplicateBinary]);
    expect(result.current.isBetDuplicate(duplicateBinary)).toBe(true);
    expect(result.current.isBetDuplicate(uniqueBinary)).toBe(false);
  });

  it('flags all bets as duplicate when every bet is identical', () => {
    const bets = makeBets([
      [4, 3, 2, 1, 1],
      [4, 3, 2, 1, 1],
      [4, 3, 2, 1, 1],
    ]);
    const binary = computePiratesBinary([4, 3, 2, 1, 1]);

    const { result } = renderHook(() => useDuplicateBets(bets));

    expect(result.current.hasDuplicates).toBe(true);
    // duplicateBinaries includes one entry per bet beyond the first occurrence.
    expect(result.current.duplicateBinaries).toEqual([binary, binary]);
    expect(result.current.isBetDuplicate(binary)).toBe(true);
  });

  it('filters out all-zero (empty) bets before comparing for duplicates', () => {
    const bets = makeBets([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ]);

    const { result } = renderHook(() => useDuplicateBets(bets));

    // Both empty bets are filtered out of betBinaries entirely, leaving only the one real bet,
    // so there is nothing left to compare and no duplicates.
    expect(result.current.betBinaries).toHaveLength(1);
    expect(result.current.hasDuplicates).toBe(false);
    expect(result.current.duplicateBinaries).toEqual([]);
  });

  it('a single non-empty bet never counts as a duplicate', () => {
    const bets = makeBets([[1, 2, 3, 4, 1]]);

    const { result } = renderHook(() => useDuplicateBets(bets));

    expect(result.current.betBinaries).toHaveLength(1);
    expect(result.current.hasDuplicates).toBe(false);
  });

  it('isBetDuplicate returns false for a binary that was never seen', () => {
    const bets = makeBets([
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]);

    const { result } = renderHook(() => useDuplicateBets(bets));

    expect(result.current.isBetDuplicate(999999)).toBe(false);
  });
});
