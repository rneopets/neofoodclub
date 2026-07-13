import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock universal-cookie before any store imports (same as other store tests)
vi.mock('universal-cookie', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    };
  }),
}));

const BET_HASH = 'sjaqwsjntuqjequnjeqpsicqp';
const ROUND = 9927;

describe('betStore URL-sync subscriber vs. cold-boot hydration order', () => {
  beforeEach(() => {
    vi.resetModules();
    // Use a real (writable) jsdom location so history.replaceState genuinely
    // updates window.location.hash, matching real-browser behavior.
    window.location.hash = `#round=${ROUND}&b=${BET_HASH}`;
  });

  /**
   * Regression test for a bug where opening a shared bet-set link for an old
   * round (with bets) reverted to the current round instead. Root cause:
   * src/index.jsx calls hydrateBetStoreFromUrl() before hydrateRoundStoreFromUrl().
   * hydrateBetStoreFromUrl() populates real bets, which fires betStore.ts's
   * URL-sync subscriber (it only fires when bets actually change - hence this
   * never reproduced with a bets-less URL). At that point roundStore hasn't
   * hydrated yet, so both currentSelectedRound and roundData.round are still
   * their shared startup default of 0 - the subscriber's old guard
   * (`roundData.round !== currentSelectedRound`) treated 0 === 0 as "in sync"
   * and rewrote the URL to round=0 using makeBetURL, clobbering the real round
   * before hydrateRoundStoreFromUrl() ever got to read it. fetchCurrentRound()
   * would then see currentSelectedRound === 0 and jump to the live round.
   */
  it('does not clobber the URL round when bets hydrate before the round store', async () => {
    // vi.resetModules() gives wasmMath.ts a fresh, not-yet-initialized module
    // instance, so it must be re-awaited here - matching src/index.jsx's real
    // "await initWasmMath()" before the hydrate calls.
    const { initWasmMath } = await import('../wasmMath');
    await initWasmMath();

    const { hydrateBetStoreFromUrl } = await import('../stores/betStore');
    const { hydrateRoundStoreFromUrl, useRoundStore } = await import('../stores/roundStore');

    // Exact boot order from src/index.jsx.
    hydrateBetStoreFromUrl();
    hydrateRoundStoreFromUrl();

    expect(useRoundStore.getState().currentSelectedRound).toBe(ROUND);
    expect(window.location.hash).toContain(`round=${ROUND}`);
    expect(window.location.hash).not.toContain('round=0');
  });
});
