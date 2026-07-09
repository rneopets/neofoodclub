import { describe, it, expect } from 'vitest';

import { DUPLICATE_BET_COLOR_PALETTE, computeDuplicateBetGroupColors } from '../duplicateBetColors';

describe('computeDuplicateBetGroupColors', () => {
  it('returns an empty map for an empty input', () => {
    const result = computeDuplicateBetGroupColors(new Map());
    expect(result.size).toBe(0);
  });

  it('assigns no colors when no binaries are duplicated', () => {
    const betBinaries = new Map([
      [1, 100],
      [2, 200],
      [3, 300],
    ]);
    const result = computeDuplicateBetGroupColors(betBinaries);
    expect(result.size).toBe(0);
  });

  it('assigns a color when 2+ bets share the same non-zero binary', () => {
    const betBinaries = new Map([
      [1, 100],
      [2, 100],
      [3, 300],
    ]);
    const result = computeDuplicateBetGroupColors(betBinaries);
    expect(result.size).toBe(1);
    expect(result.get(100)).toBe(DUPLICATE_BET_COLOR_PALETTE[0]);
  });

  it('assigns a color when 3 bets share the same non-zero binary', () => {
    const betBinaries = new Map([
      [1, 100],
      [2, 100],
      [3, 100],
    ]);
    const result = computeDuplicateBetGroupColors(betBinaries);
    expect(result.size).toBe(1);
    expect(result.get(100)).toBe(DUPLICATE_BET_COLOR_PALETTE[0]);
  });

  it('always excludes binary === 0 entries, even when duplicated', () => {
    const betBinaries = new Map([
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    const result = computeDuplicateBetGroupColors(betBinaries);
    expect(result.size).toBe(0);
    expect(result.has(0)).toBe(false);
  });

  it('excludes binary 0 duplicates while still coloring other duplicate groups', () => {
    const betBinaries = new Map([
      [1, 0],
      [2, 0],
      [3, 500],
      [4, 500],
    ]);
    const result = computeDuplicateBetGroupColors(betBinaries);
    expect(result.size).toBe(1);
    expect(result.has(0)).toBe(false);
    expect(result.get(500)).toBe(DUPLICATE_BET_COLOR_PALETTE[0]);
  });

  it('assigns distinct colors to multiple duplicate groups in insertion order', () => {
    const betBinaries = new Map([
      [1, 100],
      [2, 100],
      [3, 200],
      [4, 200],
    ]);
    const result = computeDuplicateBetGroupColors(betBinaries);
    expect(result.size).toBe(2);
    expect(result.get(100)).toBe(DUPLICATE_BET_COLOR_PALETTE[0]);
    expect(result.get(200)).toBe(DUPLICATE_BET_COLOR_PALETTE[1]);
  });

  it('wraps color index around the palette when there are more than 7 duplicate groups', () => {
    const entries: [number, number][] = [];
    // 8 duplicate groups (binaries 1000..1007), each with 2 bets sharing that binary.
    for (let group = 0; group < 8; group++) {
      const binary = 1000 + group;
      entries.push([group * 2 + 1, binary]);
      entries.push([group * 2 + 2, binary]);
    }
    const betBinaries = new Map(entries);
    const result = computeDuplicateBetGroupColors(betBinaries);
    expect(result.size).toBe(8);
    expect(DUPLICATE_BET_COLOR_PALETTE).toHaveLength(7);
    // The 8th group (index 7) should wrap back around to palette index 0.
    expect(result.get(1000)).toBe(DUPLICATE_BET_COLOR_PALETTE[0]);
    expect(result.get(1006)).toBe(DUPLICATE_BET_COLOR_PALETTE[6]);
    expect(result.get(1007)).toBe(DUPLICATE_BET_COLOR_PALETTE[0]);
  });
});
