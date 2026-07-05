import type { Bet, BetAmount } from '../types/bets';

import { BET_AMOUNT_DEFAULT } from './constants';
import { flattenGrid, getWasm, type WasmModule } from './wasmMath';

type NfcEngine = InstanceType<WasmModule['NfcEngine']>;

let engine: NfcEngine | null = null;

/**
 * (Re)builds the stateful engine from round JSON, freeing the previous
 * instance first (wasm-bindgen classes hold linear memory that isn't
 * garbage collected). Any active custom-odds/custom-probabilities override
 * does NOT carry over to the new instance - the caller (roundStore.ts) is
 * responsible for reapplying it after a rebuild if it's still active.
 */
export function rebuildEngine(
  roundJson: string,
  betAmount: number | null,
  useLogit: boolean,
): void {
  engine?.free();
  engine = new (getWasm().NfcEngine)(roundJson, betAmount ?? undefined, useLogit);
}

/** Re-seats the bet amount without rebuilding the whole engine. */
export function setEngineBetAmount(betAmount: number | null): void {
  requireEngine().setBetAmount(betAmount ?? undefined);
}

function requireEngine(): NfcEngine {
  if (!engine) {
    throw new Error('wasm engine not initialized - rebuildEngine() must be called before use');
  }
  return engine;
}

/** Applies (or clears, when passed `null`) a custom-odds override. */
export function applyCustomOdds(oddsGrid: number[][] | null): void {
  const e = requireEngine();
  if (oddsGrid === null) {
    e.clearCustomOdds();
    return;
  }
  e.setCustomOdds(Uint8Array.from(flattenGrid(oddsGrid)));
}

/** Applies (or clears, when passed `null`) a custom-probabilities override. */
export function applyCustomProbabilities(probsGrid: number[][] | null): void {
  const e = requireEngine();
  if (probsGrid === null) {
    e.clearCustomProbabilities();
    return;
  }
  e.setCustomProbabilities(Float64Array.from(flattenGrid(probsGrid)));
}

interface WasmBetsOut {
  indices: number[][];
  amounts: (number | null)[] | null;
  betsHash: string;
  amountsHash: string | null;
}

// Some generators (bustproof, tenbet) can produce fewer real bets than the
// UI's current slot count (e.g. a 1-positive-arena bustproof set is only 4
// bets) - pad the remainder with empty bets/BET_AMOUNT_DEFAULT so the shape
// always matches what the rest of the app (10 or 15 slots) expects.
function toBetMaps(out: WasmBetsOut, slotCount: number): { bets: Bet; betAmounts: BetAmount } {
  const bets: Bet = new Map();
  const betAmounts: BetAmount = new Map();
  for (let i = 0; i < slotCount; i++) {
    bets.set(i + 1, out.indices[i] ?? [0, 0, 0, 0, 0]);
    betAmounts.set(i + 1, out.amounts?.[i] ?? BET_AMOUNT_DEFAULT);
  }
  return { bets, betAmounts };
}

/** Wraps `NfcEngine.makeMaxTerBets`. */
export function wasmMakeMaxTerBets(betCount: number): { bets: Bet; betAmounts: BetAmount } {
  return toBetMaps(requireEngine().makeMaxTerBets() as WasmBetsOut, betCount);
}

/** Wraps `NfcEngine.makeBestGambitBets`. */
export function wasmMakeBestGambitBets(betCount: number): { bets: Bet; betAmounts: BetAmount } {
  return toBetMaps(requireEngine().makeBestGambitBets() as WasmBetsOut, betCount);
}

/**
 * Wraps `NfcEngine.makeGambitBets`. Throws if `piratesBinary` doesn't select
 * exactly 5 pirates (one per arena) - callers must catch this (previously
 * unreachable in the old TS implementation, which never validated).
 */
export function wasmMakeGambitBets(
  piratesBinary: number,
  betCount: number,
): { bets: Bet; betAmounts: BetAmount } {
  return toBetMaps(requireEngine().makeGambitBets(piratesBinary) as WasmBetsOut, betCount);
}

/** Wraps `NfcEngine.makeWinningGambitBets`. Returns `null` if the round has no winners yet. */
export function wasmMakeWinningGambitBets(
  betCount: number,
): { bets: Bet; betAmounts: BetAmount } | null {
  const out = requireEngine().makeWinningGambitBets() as WasmBetsOut | undefined;
  return out ? toBetMaps(out, betCount) : null;
}

/** Wraps `NfcEngine.makeBustproofBets`. Returns `null` if no arena is positive. */
export function wasmMakeBustproofBets(
  betCount: number,
): { bets: Bet; betAmounts: BetAmount } | null {
  const out = requireEngine().makeBustproofBets() as WasmBetsOut | undefined;
  return out ? toBetMaps(out, betCount) : null;
}

/** Wraps `NfcEngine.makeCrazyBets`. */
export function wasmMakeCrazyBets(betCount: number): { bets: Bet; betAmounts: BetAmount } {
  return toBetMaps(requireEngine().makeCrazyBets() as WasmBetsOut, betCount);
}

/**
 * Wraps `NfcEngine.makeTenbetBets`. Throws if `piratesBinary` selects more
 * than 1 pirate per arena, or 0/more-than-3 pirates total - callers must
 * catch this (the old TS implementation could hang indefinitely on an
 * unsatisfiable selection instead of erroring).
 */
export function wasmMakeTenbetBets(
  piratesBinary: number,
  betCount: number,
): { bets: Bet; betAmounts: BetAmount } {
  return toBetMaps(requireEngine().makeTenbetBets(piratesBinary) as WasmBetsOut, betCount);
}
