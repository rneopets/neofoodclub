import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock universal-cookie before any store imports (same as hashchange.test.ts)
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

function setHash(hash: string): void {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, hash: `#${hash}` },
  });
}

/**
 * Regression test for the bet-link-loses-all-picks bug: the wasm module is
 * loaded asynchronously (initWasmMath(), awaited in src/index.jsx right
 * before the app mounts), but betStore/roundStore used to parse the URL
 * hash at module-eval time - which, in the real app, always runs *before*
 * that await resolves (static imports execute before any code in the
 * importing module's own body, including code after a top-level await).
 * getWasm() would throw, parseBets/parseBetAmounts would silently catch it
 * and fall back to empty bets, and the bet grid would render empty on
 * every single bet-link load - the round parsed fine (no wasm involved)
 * but the picks were always gone.
 *
 * This test drives the exact same not-ready -> ready transition with a
 * controllable wasm mock instead of a real build, so it exercises the real
 * failure mode without requiring wasm-pack.
 */
describe('bet URL parsing vs. wasm init ordering', () => {
  let wasmReady = false;

  beforeEach(() => {
    vi.resetModules();
    wasmReady = false;
    setHash(`round=${ROUND}&b=${BET_HASH}`);

    vi.doMock('../wasmMath', () => {
      const requireReady = (): void => {
        if (!wasmReady) {
          throw new Error(
            'neofoodclub-wasm module not initialized - initWasmMath() must be awaited before use',
          );
        }
      };

      // Minimal re-implementation of the legacy hand-rolled hash codec,
      // just so the "ready" path decodes something real to assert against.
      const ALPHABET = 'abcdefghijklmnopqrstuvwxy';
      const wasmBetsHashToIndices = (hash: string): number[] => {
        requireReady();
        return hash
          .replace(/[^a-y]/g, '')
          .split('')
          .flatMap(char => {
            const n = ALPHABET.indexOf(char);
            return [Math.floor(n / 5), n % 5];
          });
      };
      const wasmAmountsHashToBetAmounts = (_hash: string, betAmountDefault: number): number[] => (
        requireReady(),
        Array.from({ length: 10 }, () => betAmountDefault)
      );
      const wasmBetsIndicesToHash = (): string => (requireReady(), '');
      const wasmBetAmountsToAmountsHash = (): string => (requireReady(), '');

      return {
        initWasmMath: vi.fn(),
        wasmBetsHashToIndices,
        wasmAmountsHashToBetAmounts,
        wasmBetsIndicesToHash,
        wasmBetAmountsToAmountsHash,
      };
    });
  });

  afterEach(() => {
    vi.doUnmock('../wasmMath');
  });

  it('does not eagerly parse the URL at module-eval time (before wasm is ready)', async () => {
    const { useBetStore } = await import('../stores/betStore');
    const { useRoundStore } = await import('../stores/roundStore');

    // wasm was never marked ready - if the store parsed eagerly at import
    // time, this would have thrown internally and landed on the exact same
    // "empty" state, so the real assertion is in the next test: hydrating
    // *after* wasm becomes ready must still work. Here we just confirm the
    // module import itself didn't blow up and produced safe defaults.
    const betState = useBetStore.getState();
    expect(betState.allBets.get(0)?.get(1)).toEqual([0, 0, 0, 0, 0]);

    const roundState = useRoundStore.getState();
    expect(roundState.currentSelectedRound).toBe(0);
    expect(roundState.viewMode).toBe(false);
  });

  it('correctly decodes the URL once hydrated after wasm becomes ready', async () => {
    const { useBetStore, hydrateBetStoreFromUrl } = await import('../stores/betStore');
    const { useRoundStore, hydrateRoundStoreFromUrl } = await import('../stores/roundStore');

    // Simulate initWasmMath() resolving, then index.jsx's post-await hydrate calls.
    wasmReady = true;
    hydrateBetStoreFromUrl();
    hydrateRoundStoreFromUrl();

    const roundState = useRoundStore.getState();
    expect(roundState.currentSelectedRound).toBe(ROUND);
    expect(roundState.viewMode).toBe(true);

    const betState = useBetStore.getState();
    const firstBet = betState.allBets.get(0)?.get(1);
    expect(firstBet).toBeDefined();
    expect(firstBet?.some(pirate => pirate > 0)).toBe(true);
  });
});
