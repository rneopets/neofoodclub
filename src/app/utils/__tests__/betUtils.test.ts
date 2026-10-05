import { describe, it, expect } from 'vitest';

import { generateBetLinkUrl, getOrdinalSuffix, filterChangesByArenaPirate } from '../betUtils';

describe('generateBetLinkUrl', () => {
  it('puts the bet fragment on the Neopets bet page', () => {
    expect(generateBetLinkUrl('/#round=10014&b=aspdyasunxctadxetydyasadw')).toBe(
      'https://www.neopets.com/pirates/foodclub.phtml?tab=bet#round=10014&b=aspdyasunxctadxetydyasadw',
    );
  });

  it('keeps the amounts hash', () => {
    expect(generateBetLinkUrl('/#round=10014&b=faa&a=AaYAbWAcUAdSAeQ')).toBe(
      'https://www.neopets.com/pirates/foodclub.phtml?tab=bet#round=10014&b=faa&a=AaYAbWAcUAdSAeQ',
    );
  });

  it('works for a round-only fragment (no bets)', () => {
    expect(generateBetLinkUrl('/#round=10014')).toBe(
      'https://www.neopets.com/pirates/foodclub.phtml?tab=bet#round=10014',
    );
  });
});

describe('getOrdinalSuffix', () => {
  it.each([
    [1, 'st'],
    [2, 'nd'],
    [3, 'rd'],
    [4, 'th'],
    [11, 'th'],
    [12, 'th'],
    [13, 'th'],
    [21, 'st'],
    [22, 'nd'],
    [23, 'rd'],
    [101, 'st'],
    [111, 'th'],
  ])('returns "%s" -> "%s"', (num, expected) => {
    expect(getOrdinalSuffix(num)).toBe(expected);
  });
});

interface TestChange {
  arena: number;
  pirate: number;
  id: string;
}

describe('filterChangesByArenaPirate', () => {
  it('returns an empty array for an empty input', () => {
    expect(filterChangesByArenaPirate<TestChange>([], 0, 0)).toEqual([]);
  });

  it('returns an empty array when nothing matches', () => {
    const changes: TestChange[] = [{ arena: 1, pirate: 1, id: 'a' }];
    expect(filterChangesByArenaPirate(changes, 2, 3)).toEqual([]);
  });

  it('excludes entries that match arena only (pirate mismatch)', () => {
    const changes: TestChange[] = [{ arena: 2, pirate: 5, id: 'arena-only' }];
    // pirateIndex 2 (0-based) is compared against change.pirate === 3
    expect(filterChangesByArenaPirate(changes, 2, 2)).toEqual([]);
  });

  it('excludes entries that match pirate only (arena mismatch)', () => {
    const changes: TestChange[] = [{ arena: 9, pirate: 3, id: 'pirate-only' }];
    expect(filterChangesByArenaPirate(changes, 2, 2)).toEqual([]);
  });

  it('returns only entries matching both arena and the 1-based pirate', () => {
    const changes: TestChange[] = [
      { arena: 1, pirate: 1, id: 'a' },
      { arena: 2, pirate: 5, id: 'b' },
      { arena: 2, pirate: 3, id: 'c' },
    ];
    const result = filterChangesByArenaPirate(changes, 2, 2);
    expect(result).toEqual([{ arena: 2, pirate: 3, id: 'c' }]);
  });
});
