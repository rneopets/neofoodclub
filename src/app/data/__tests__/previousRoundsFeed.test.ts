import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearPreviousRoundsFeedCache, getPreviousRoundsFeed } from '../previousRoundsFeed';

afterEach(() => {
  vi.unstubAllGlobals();
  clearPreviousRoundsFeedCache();
});

function stubFetch(impl: () => Promise<{ text: () => Promise<string> }>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('getPreviousRoundsFeed', () => {
  it('parses each line and caches the result across calls', async () => {
    const lines = [
      JSON.stringify({ round: 1, pirates: [[1]], openingOdds: [[1]], currentOdds: [[1]] }),
      JSON.stringify({ round: 2, pirates: [[1]], openingOdds: [[1]], currentOdds: [[1]] }),
    ];
    const fetchMock = stubFetch(() =>
      Promise.resolve({ text: () => Promise.resolve(lines.join('\n')) }),
    );

    const first = await getPreviousRoundsFeed();
    const second = await getPreviousRoundsFeed();

    expect(first.map(r => r.round)).toEqual([1, 2]);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares a single in-flight fetch between concurrent callers', async () => {
    const fetchMock = stubFetch(
      () =>
        new Promise(resolve => setTimeout(() => resolve({ text: () => Promise.resolve('') }), 0)),
    );

    const [a, b] = await Promise.all([getPreviousRoundsFeed(), getPreviousRoundsFeed()]);

    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('forceRefresh triggers a new fetch instead of using the cache', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ text: () => Promise.resolve('') }));

    await getPreviousRoundsFeed();
    await getPreviousRoundsFeed({ forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('skips malformed lines instead of throwing', async () => {
    const lines = [
      JSON.stringify({ round: 1, pirates: [[1]], openingOdds: [[1]], currentOdds: [[1]] }),
      'not json',
    ];
    stubFetch(() => Promise.resolve({ text: () => Promise.resolve(lines.join('\n')) }));

    const rounds = await getPreviousRoundsFeed();

    expect(rounds.map(r => r.round)).toEqual([1]);
  });

  it('does not cache a rejected fetch, so a later call can retry', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        text: () =>
          Promise.resolve(
            JSON.stringify({ round: 1, pirates: [[1]], openingOdds: [[1]], currentOdds: [[1]] }),
          ),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPreviousRoundsFeed()).rejects.toThrow('network error');

    const rounds = await getPreviousRoundsFeed();

    expect(rounds.map(r => r.round)).toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
