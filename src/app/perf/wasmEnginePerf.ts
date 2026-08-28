import { computePiratesBinary } from '../maths';
import {
  rebuildEngine,
  wasmMakeBestGambitBets,
  wasmMakeBustproofBets,
  wasmMakeCrazyBets,
  wasmMakeGambitBets,
  wasmMakeMaxTerBets,
  wasmMakeTenbetBets,
  wasmMakeWinningGambitBets,
} from '../wasmEngine';

/** Number of bets every timed operation generates. Kept small on purpose - the
 *  perf panel is about measuring per-operation cost, not sweeping bet counts. */
export const PERF_BET_COUNT = 10;

/** Per-operation timing captured by `timeOperation`. */
export interface PerfTiming {
  minMs: number;
  maxMs: number;
  avgMs: number;
}

/** Result of timing one engine operation. `timing` is null when the operation
 *  was skipped (e.g. the round has no winners yet) - `skippedReason` explains why. */
export interface EnginePerfResult {
  operation: string;
  timing: PerfTiming | null;
  skippedReason?: string;
}

export interface RunEnginePerfOptions {
  roundJson: string;
  useLogit: boolean;
  /** Bet amount the timed engine is built with (max-TER ranking). */
  betAmount: number;
  /** How many times to invoke each operation. */
  iterations: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

/** Each timed sample batches at least this many calls together (rather than
 *  timing one call at a time) so its duration comfortably clears
 *  performance.now()'s clamped resolution - a single bet-generation call is
 *  fast enough that per-call timing quantizes straight to 0 in most browsers,
 *  no matter how many iterations are run. */
const MIN_BATCH_SIZE = 10;

/** Caps the number of distinct timed samples, so a large iteration count
 *  grows the batch size (for a steadier per-call reading) instead of just
 *  adding more still-quantized samples. */
const MAX_SAMPLES = 10;

/**
 * Times `fn` over `iterations` invocations, reporting min/max/avg ms per call.
 * Calls are grouped into batches of at least `MIN_BATCH_SIZE`; each batch's
 * elapsed time is divided by its call count to get a per-call reading, which
 * is far less prone to the timer-resolution quantization that per-call timing
 * hits.
 */
export function timeOperation(fn: () => void, iterations: number): PerfTiming {
  const samples = Math.max(1, Math.min(MAX_SAMPLES, Math.floor(iterations / MIN_BATCH_SIZE)));
  const batchSize = Math.floor(iterations / samples);
  const remainder = iterations - batchSize * samples;

  let minMs = Number.POSITIVE_INFINITY;
  let maxMs = 0;
  let totalMs = 0;
  let totalCalls = 0;

  for (let s = 0; s < samples; s++) {
    const callsInSample = batchSize + (s < remainder ? 1 : 0);
    const start = window.performance.now();
    for (let i = 0; i < callsInSample; i++) {
      fn();
    }
    const elapsed = window.performance.now() - start;
    const perCallMs = elapsed / callsInSample;
    if (perCallMs < minMs) {
      minMs = perCallMs;
    }
    if (perCallMs > maxMs) {
      maxMs = perCallMs;
    }
    totalMs += elapsed;
    totalCalls += callsInSample;
  }

  return { minMs, maxMs, avgMs: totalMs / totalCalls };
}

/**
 * The "default" gambit selection - pirate index 1 in every arena. `wasmMakeGambitBets`
 * requires exactly one pirate per arena, so this is the simplest valid binary; it's
 * also what a user gets when they pick pirate 1 on every row of the bet table.
 */
export function deriveDefaultGambitBinary(): number {
  return computePiratesBinary([1, 1, 1, 1, 1]);
}

/**
 * The "default" tenbet selection - pirate index 1 in the first three arenas. Tenbet
 * accepts up to 3 pirates total, so this is the largest valid selection with the
 * simplest shape (and matches the existing golden tests' `[1, 1, 1, 0, 0]` usage).
 */
export function deriveDefaultTenbetBinary(): number {
  return computePiratesBinary([1, 1, 0, 0, 0]);
}

interface OpDef {
  operation: string;
  /**
   * Probes whether the operation is applicable to this round WITHOUT timing.
   * Returns a skip reason when it isn't (the engine's null-returning ops mean
   * "not applicable" - no winners yet, or no positive arena for bustproof).
   */
  prepare?: () => string | null;
  run: () => void;
}

/**
 * Rebuilds the shared wasm engine for `roundJson` and times each bet-generation
 * operation over `iterations` invocations. Runs chunked (one op per await tick)
 * so a large iteration count can't freeze the UI, and aborts on `signal`.
 *
 * Note: this clobbers the app's engine instance - callers (the dev modal) are
 * expected to rebuild it for their own round afterwards.
 */
export async function runEnginePerfSuite(opts: RunEnginePerfOptions): Promise<EnginePerfResult[]> {
  if (opts.signal?.aborted) {
    throw new DOMException('Engine perf run aborted', 'AbortError');
  }

  const results: EnginePerfResult[] = [];

  rebuildEngine(opts.roundJson, opts.betAmount, opts.useLogit);
  const gambitBinary = deriveDefaultGambitBinary();
  const tenbetBinary = deriveDefaultTenbetBinary();

  // rebuildEngine itself is not timed - the suite measures bet generation on a
  // freshly built engine, and rebuilding in a loop would just time allocation.
  const ops: OpDef[] = [
    { operation: 'makeMaxTerBets', run: () => wasmMakeMaxTerBets(PERF_BET_COUNT) },
    { operation: 'makeGambitBets', run: () => wasmMakeGambitBets(gambitBinary, PERF_BET_COUNT) },
    {
      operation: 'makeWinningGambitBets',
      prepare: () => (wasmMakeWinningGambitBets(PERF_BET_COUNT) ? null : 'no winners yet'),
      run: () => wasmMakeWinningGambitBets(PERF_BET_COUNT),
    },
    { operation: 'makeBestGambitBets', run: () => wasmMakeBestGambitBets(PERF_BET_COUNT) },
    {
      operation: 'makeBustproofBets',
      prepare: () => (wasmMakeBustproofBets(PERF_BET_COUNT) ? null : 'no positive arena'),
      run: () => wasmMakeBustproofBets(PERF_BET_COUNT),
    },
    { operation: 'makeCrazyBets', run: () => wasmMakeCrazyBets(PERF_BET_COUNT) },
    { operation: 'makeTenbetBets', run: () => wasmMakeTenbetBets(tenbetBinary, PERF_BET_COUNT) },
  ];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;

    if (opts.signal?.aborted) {
      throw new DOMException('Engine perf run aborted', 'AbortError');
    }

    const skippedReason = op.prepare?.() ?? null;
    if (skippedReason !== null) {
      results.push({ operation: op.operation, timing: null, skippedReason });
    } else {
      results.push({ operation: op.operation, timing: timeOperation(op.run, opts.iterations) });
    }

    opts.onProgress?.(i + 1, ops.length);
    // Yield to the event loop between operations so progress renders and the
    // Cancel button can land (same idiom as runFullBacktest).
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }

  return results;
}
