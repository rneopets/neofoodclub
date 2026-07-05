import type { PayoutTables } from '../types';

type WasmModule = typeof import('@wasm/neofoodclub_wasm.js');

let wasmModule: WasmModule | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Loads the neofoodclub-wasm module. Must be awaited once before app mount
 * (see src/index.jsx) so that every synchronous call below - including ones
 * made from inside React render bodies via useMemo - is safe.
 */
export function initWasmMath(): Promise<void> {
  if (!initPromise) {
    initPromise = import('@wasm/neofoodclub_wasm.js').then(mod => {
      wasmModule = mod;
    });
  }
  return initPromise;
}

function getWasm(): WasmModule {
  if (!wasmModule) {
    throw new Error(
      'neofoodclub-wasm module not initialized - initWasmMath() must be awaited before use',
    );
  }
  return wasmModule;
}

function flatten(grid: number[][]): number[] {
  const out: number[] = [];
  for (let arena = 0; arena < 5; arena++) {
    for (let pirate = 0; pirate < 5; pirate++) {
      out.push(grid[arena]?.[pirate] ?? 0);
    }
  }
  return out;
}

function unflatten(flat: ArrayLike<number>): number[][] {
  const out: number[][] = [];
  for (let arena = 0; arena < 5; arena++) {
    out.push(Array.from(flat).slice(arena * 5, arena * 5 + 5));
  }
  return out;
}

/** Wraps `computeStdProbabilities` (round JSON in, flattened grid out). */
export function wasmStdProbabilities(roundJson: string, useLogit: boolean): number[][] {
  const flat = getWasm().computeStdProbabilities(roundJson, useLogit);
  return unflatten(flat);
}

/** Wraps `computeArenaRatios` (odds grid in, one ratio per arena out). */
export function wasmArenaRatios(odds: number[][]): number[] {
  const flat = Float64Array.from(flatten(odds));
  return Array.from(getWasm().computeArenaRatios(flat));
}

// odds/payoffs are never negative by definition; clamp defensively so a
// stray negative (e.g. transient/stale state) can't wrap into a huge u32
// via JS's ToUint32 coercion and trip the wasm engine's overflow checks.
function toU32Array(values: number[]): Uint32Array {
  return Uint32Array.from(values, v => Math.max(0, Math.floor(v)));
}

/** Wraps `computePayoutTables`. */
export function wasmPayoutTables(
  betIndices: number[],
  probabilities: number[][],
  betOdds: number[],
  betPayoffs: number[],
): PayoutTables {
  const result = getWasm().computePayoutTables(
    Uint8Array.from(betIndices),
    Float64Array.from(flatten(probabilities)),
    toU32Array(betOdds),
    toU32Array(betPayoffs),
  );
  return result as PayoutTables;
}

/** Wraps `computePirateBinary`. */
export function wasmPirateBinary(arenaIndex: number, pirateIndex: number): number {
  return getWasm().computePirateBinary(arenaIndex, pirateIndex);
}

/** Wraps `computePiratesBinary`. */
export function wasmPiratesBinary(pirates: number[]): number {
  return getWasm().computePiratesBinary(Uint8Array.from(pirates));
}

/** Wraps `computeBinaryToPirates`. */
export function wasmBinaryToPirates(bin: number): number[] {
  return Array.from(getWasm().computeBinaryToPirates(bin));
}
