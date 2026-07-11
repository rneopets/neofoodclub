import { renderHook, waitFor } from '@testing-library/react';
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

  it('stays true after the other tab closes, since this is a discoverability tip, not a live presence indicator', async () => {
    mockUseHasAnyBets.mockReturnValue(true);

    const { result: tabA } = renderHook(() => useOtherTabHasBets());
    const { result: tabB, unmount: unmountTabB } = renderHook(() => useOtherTabHasBets());

    await waitFor(() => expect(tabA.current).toBe(true));
    await waitFor(() => expect(tabB.current).toBe(true));

    // Simulate tab B closing/crashing without signaling (no beforeunload in jsdom).
    unmountTabB();

    expect(tabA.current).toBe(true);
  });

  it('becomes true once the other tab gains bets, even though it announced no bets on mount', async () => {
    mockUseHasAnyBets.mockReturnValue(false);

    const { result: tabA } = renderHook(() => useOtherTabHasBets());
    const { rerender: rerenderTabB, result: tabB } = renderHook(() => useOtherTabHasBets());

    await waitFor(() => expect(tabB.current).toBe(false));
    expect(tabA.current).toBe(false);

    mockUseHasAnyBets.mockReturnValue(true);
    rerenderTabB();

    await waitFor(() => expect(tabA.current).toBe(true));
  });
});
