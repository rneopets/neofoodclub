import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearPreviousRoundsFeedCache } from '../../data/previousRoundsFeed';
import { fetchRoundTiming } from '../roundTiming';

afterEach(() => {
  vi.unstubAllGlobals();
  clearPreviousRoundsFeedCache();
});

function stubFetch(text: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      text: () => Promise.resolve(text),
    }),
  );
}

describe('fetchRoundTiming', () => {
  it('keeps only rounds that have a valid timestamp and sorts them by round', async () => {
    const lines = [
      JSON.stringify({ round: 3, timestamp: '2026-08-15T21:15:00Z', winners: [1, 2, 3] }),
      JSON.stringify({ round: 1, timestamp: '2026-08-13T21:15:00Z' }),
      JSON.stringify({ round: 2, winners: [1, 1, 1] }), // no timestamp -> dropped
      JSON.stringify({ round: 5, timestamp: 'not-a-date' }), // invalid -> dropped
    ];

    stubFetch(lines.join('\n'));

    const timings = await fetchRoundTiming();
    expect(timings.map(t => t.round)).toEqual([1, 3]);
    expect(timings[0]!.timestamp).toBe('2026-08-13T21:15:00Z');
  });

  it('returns an empty array when the feed has no timestamped rounds', async () => {
    stubFetch(`${JSON.stringify({ round: 1 })}\n${JSON.stringify({ round: 2, winners: null })}`);

    const timings = await fetchRoundTiming();
    expect(timings).toEqual([]);
  });

  it('returns an empty array for a blank feed', async () => {
    stubFetch('');

    const timings = await fetchRoundTiming();
    expect(timings).toEqual([]);
  });

  it('reuses the shared feed cache by default and refetches when forceRefresh is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify({ round: 1, timestamp: '2026-08-13T21:15:00Z' })),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchRoundTiming();
    await fetchRoundTiming();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const refreshed = await fetchRoundTiming(undefined, { forceRefresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshed.map(t => t.round)).toEqual([1]);
  });
});
