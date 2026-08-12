import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  generateBetLinkUrl,
  openBetLinkInNewTab,
  getOrdinalSuffix,
  filterChangesByArenaPirate,
} from '../betUtils';

describe('generateBetLinkUrl', () => {
  const pirates = [
    [101, 102, 103, 104],
    [105, 106, 107, 108],
    [109, 110, 111, 112],
    [113, 114, 115, 116],
    [117, 118, 119, 120],
  ];

  it('builds the exact query string for a sample bet', () => {
    const url = generateBetLinkUrl([1, 2, 0, 0, 0], 500, 6, 3000, pirates);
    expect(url).toBe(
      'https://www.neopets.com/pirates/process_foodclub.phtml?winner1=101&winner2=106&matches[]=1&matches[]=2&bet_amount=500&total_odds=6&winnings=3000&type=bet',
    );
  });

  it('skips winnerN and matches[] entries for zero positions', () => {
    const url = generateBetLinkUrl([0, 0, 3, 0, 0], 100, 4, 400, pirates);
    expect(url).not.toContain('winner1=');
    expect(url).not.toContain('winner2=');
    expect(url).not.toContain('winner4=');
    expect(url).not.toContain('winner5=');
    expect(url).toContain('winner3=111');
    expect(url).toContain('matches[]=3');
    expect(url).not.toContain('matches[]=1');
  });

  it('produces no winner/matches entries for an all-zero bet', () => {
    const url = generateBetLinkUrl([0, 0, 0, 0, 0], 100, 1, 100, pirates);
    expect(url).toBe(
      'https://www.neopets.com/pirates/process_foodclub.phtml?bet_amount=100&total_odds=1&winnings=100&type=bet',
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

describe('openBetLinkInNewTab', () => {
  const originalUserAgent = navigator.userAgent;
  let dispatchSpy: ReturnType<typeof vi.spyOn>;
  let openSpy: ReturnType<typeof vi.spyOn>;
  let capturedHref: string | undefined;
  let capturedTarget: string | undefined;
  let capturedEvent: MouseEvent | undefined;

  const setUserAgent = (ua: string): void => {
    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedHref = undefined;
    capturedTarget = undefined;
    capturedEvent = undefined;
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    dispatchSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'dispatchEvent')
      .mockImplementation(function (this: HTMLAnchorElement, event: Event) {
        capturedHref = this.href;
        capturedTarget = this.target;
        capturedEvent = event as MouseEvent;
        return true;
      });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    dispatchSpy.mockRestore();
    openSpy.mockRestore();
  });

  it('dispatches a click event with ctrlKey on desktop Windows', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    openBetLinkInNewTab('https://example.com/bet');

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
    expect(capturedHref).toBe('https://example.com/bet');
    expect(capturedTarget).toBe('_blank');
    expect(capturedEvent?.ctrlKey).toBe(true);
    expect(capturedEvent?.metaKey).toBe(false);
  });

  it('dispatches a click event with metaKey on desktop macOS', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    );

    openBetLinkInNewTab('https://example.com/bet-mac');

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
    expect(capturedHref).toBe('https://example.com/bet-mac');
    expect(capturedEvent?.ctrlKey).toBe(false);
    expect(capturedEvent?.metaKey).toBe(true);
  });

  it('falls back to window.open on Android (mobile)', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile');

    openBetLinkInNewTab('https://example.com/bet-mobile');

    expect(openSpy).toHaveBeenCalledWith('https://example.com/bet-mobile', '_blank');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('falls back to window.open on a generic "Mobi" user agent', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobi/15E148');

    openBetLinkInNewTab('https://example.com/bet-mobi');

    expect(openSpy).toHaveBeenCalledWith('https://example.com/bet-mobi', '_blank');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
