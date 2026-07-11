import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOtherTabHasBets } from '../hooks/useOtherTabHasBets';
import { useHasAnyBets } from '../stores';

vi.mock('../stores', () => ({
  useHasAnyBets: vi.fn(),
}));

const mockUseHasAnyBets = vi.mocked(useHasAnyBets);

/**
 * Minimal in-memory BroadcastChannel polyfill for jsdom (which does not
 * implement BroadcastChannel). Mirrors real BroadcastChannel semantics: a
 * channel never receives its own posted messages, and delivery to other
 * channels sharing the same name happens asynchronously (via microtask).
 */
class MockBroadcastChannel {
  private static channels = new Map<string, Set<MockBroadcastChannel>>();

  onmessage: ((event: MessageEvent) => void) | null = null;

  private readonly name: string;

  constructor(name: string) {
    this.name = name;
    const set = MockBroadcastChannel.channels.get(name) ?? new Set<MockBroadcastChannel>();
    set.add(this);
    MockBroadcastChannel.channels.set(name, set);
  }

  postMessage(data: unknown): void {
    const set = MockBroadcastChannel.channels.get(this.name);
    if (!set) {
      return;
    }

    for (const instance of set) {
      if (instance === this) {
        continue;
      }
      Promise.resolve().then(() => {
        instance.onmessage?.({ data } as MessageEvent);
      });
    }
  }

  close(): void {
    MockBroadcastChannel.channels.get(this.name)?.delete(this);
  }

  static reset(): void {
    MockBroadcastChannel.channels.clear();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
});

afterEach(() => {
  MockBroadcastChannel.reset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useOtherTabHasBets', () => {
  it('returns false when there are no other tabs', () => {
    mockUseHasAnyBets.mockReturnValue(true);

    const { result } = renderHook(() => useOtherTabHasBets());

    expect(result.current).toBe(false);
  });

  it('becomes true once another tab announces it has bets', async () => {
    mockUseHasAnyBets.mockReturnValue(true);

    const { result: tabA } = renderHook(() => useOtherTabHasBets());
    const { result: tabB } = renderHook(() => useOtherTabHasBets());

    await waitFor(() => expect(tabA.current).toBe(true));
    await waitFor(() => expect(tabB.current).toBe(true));
  });

  it('goes back to false once the other tab goes stale past the prune window', async () => {
    vi.useFakeTimers();
    mockUseHasAnyBets.mockReturnValue(true);

    const { result: tabA } = renderHook(() => useOtherTabHasBets());
    const { result: tabB, unmount: unmountTabB } = renderHook(() => useOtherTabHasBets());

    // Flush the mutual-discovery microtask exchange (initial broadcast + immediate reply).
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(0);
      }
    });

    expect(tabA.current).toBe(true);
    expect(tabB.current).toBe(true);

    // Simulate tab B closing/crashing without signaling (no beforeunload in jsdom).
    unmountTabB();

    // Fast-forward past the 12s prune window.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(13000);
    });

    expect(tabA.current).toBe(false);
  });
});
