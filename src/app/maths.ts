import { LogitProbabilityData, PayoutTables, ProbabilityData, RoundData } from '../types';
import { Bet, OddsData, ProbabilitiesData } from '../types/bets';

import { NEGATIVE_FAS, POSITIVE_FAS } from './constants';
import {
  wasmArenaRatios,
  wasmBinaryToPirates,
  wasmPayoutTables,
  wasmPirateBinary,
  wasmPiratesBinary,
  wasmStdProbabilities,
} from './wasmMath';

export function makeEmpty(length: number): number[] {
  return Array(length).fill(0);
}

function computePirateFAPairs(roundData: RoundData): [number[][], number[][]] {
  // pre-populate with zeroes because really old rounds don't have this data
  // I'm not sure how, but the original neofoodclub somehow made up values to make up for this
  // I will be having none of that here.
  const favorites: number[][] = [
    makeEmpty(4),
    makeEmpty(4),
    makeEmpty(4),
    makeEmpty(4),
    makeEmpty(4),
  ];
  const allergies: number[][] = [
    makeEmpty(4),
    makeEmpty(4),
    makeEmpty(4),
    makeEmpty(4),
    makeEmpty(4),
  ];

  if (roundData.foods?.length && roundData.pirates.length) {
    for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
      for (let pirateIndex = 0; pirateIndex < 4; pirateIndex++) {
        for (let foodIndex = 0; foodIndex < 10; foodIndex++) {
          const foodId = roundData.foods[arenaIndex]?.[foodIndex];
          const pirateId = roundData.pirates[arenaIndex]?.[pirateIndex];
          if (foodId !== undefined && pirateId !== undefined) {
            favorites[arenaIndex]![pirateIndex]! += POSITIVE_FAS[pirateId]![foodId] ?? 0;
            allergies[arenaIndex]![pirateIndex]! -= NEGATIVE_FAS[pirateId]![foodId] ?? 0;
          }
        }
      }
    }
  }

  return [favorites, allergies];
}

function makeArenasNumbers(): number[][] {
  return [
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ];
}

export function computePirateFAs(roundData: RoundData): Map<number, number[][]> {
  const [favorites, allergies] = computePirateFAPairs(roundData);
  const fas: Map<number, number[][]> = new Map();
  for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
    const arenaFAs: number[][] = [];
    for (let pirateIndex = 0; pirateIndex < 4; pirateIndex++) {
      arenaFAs.push([favorites[arenaIndex]![pirateIndex]!, allergies[arenaIndex]![pirateIndex]!]);
    }
    fas.set(arenaIndex, arenaFAs);
  }
  return fas;
}

/**
 * min/max bounds are a small, self-contained, purely-derived-from-openingOdds
 * computation - kept in TS rather than round-tripped through wasm (the Rust
 * engine computes and discards these; see neofoodclub.rs's original.rs).
 * std/used come from the wasm engine below, which owns the actual
 * rectification algorithm.
 */
export function computeLegacyProbabilities(roundData: RoundData): ProbabilityData {
  const returnValue: ProbabilityData = {
    min: makeArenasNumbers(),
    std: makeArenasNumbers(),
    max: makeArenasNumbers(),
    used: makeArenasNumbers(),
  };

  // Return early if openingOdds is an empty array
  if (!roundData.openingOdds?.length) {
    return returnValue;
  }

  for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
    let min = 0;
    let max = 0;
    for (let pirateIndex = 1; pirateIndex <= 4; pirateIndex++) {
      const pirateOdd = roundData.openingOdds[arenaIndex]![pirateIndex]!;
      if (pirateOdd === 13) {
        returnValue.min[arenaIndex]![pirateIndex] = 0;
        returnValue.max[arenaIndex]![pirateIndex] = 1 / 13;
      } else if (pirateOdd === 2) {
        returnValue.min[arenaIndex]![pirateIndex] = 1 / 3;
        returnValue.max[arenaIndex]![pirateIndex] = 1;
      } else {
        returnValue.min[arenaIndex]![pirateIndex] = 1 / (1 + pirateOdd);
        returnValue.max[arenaIndex]![pirateIndex] = 1 / pirateOdd;
      }
      min += returnValue.min[arenaIndex]![pirateIndex]!;
      max += returnValue.max[arenaIndex]![pirateIndex]!;
    }

    for (let pirateIndex = 1; pirateIndex <= 4; pirateIndex++) {
      const minOrig = returnValue.min[arenaIndex]![pirateIndex]!;
      const maxOrig = returnValue.max[arenaIndex]![pirateIndex]!;
      returnValue.min[arenaIndex]![pirateIndex] = Math.max(minOrig, 1 + maxOrig - max);
      returnValue.max[arenaIndex]![pirateIndex] = Math.min(maxOrig, 1 + minOrig - min);
    }
  }

  const std = wasmStdProbabilities(JSON.stringify(roundData), false);
  returnValue.std = std;
  returnValue.used = std.map(row => [...row]);

  return returnValue;
}

export function computeLogitProbabilities(roundData: RoundData): LogitProbabilityData {
  const returnValue: LogitProbabilityData = {
    prob: [],
    used: [],
  };

  // Return early if no pirates
  if (!roundData.pirates?.length) {
    return returnValue;
  }

  const prob = wasmStdProbabilities(JSON.stringify(roundData), true);
  returnValue.prob = prob;
  returnValue.used = prob.map(row => [...row]);
  return returnValue;
}

export function calculateArenaRatios(customOdds: OddsData): number[] {
  return wasmArenaRatios(customOdds);
}

export function calculatePayoutTables(
  bets: Bet,
  probabilities: ProbabilitiesData,
  betOdds: Map<number, number>,
  betPayoffs: Map<number, number>,
): PayoutTables {
  const betIndices: number[] = [];
  const oddsArr: number[] = [];
  const payoffsArr: number[] = [];

  for (const key of bets.keys()) {
    const bet = bets.get(key) ?? makeEmpty(5);
    for (let i = 0; i < 5; i++) {
      betIndices.push(bet[i] ?? 0);
    }
    oddsArr.push(betOdds.get(key) ?? 0);
    payoffsArr.push(betPayoffs.get(key) ?? 0);
  }

  return wasmPayoutTables(betIndices, probabilities, oddsArr, payoffsArr);
}

export function computePirateBinary(arenaIndex: number, pirateIndex: number): number {
  return wasmPirateBinary(arenaIndex, pirateIndex);
}

export function computePiratesBinary(piratesArray: number[]): number {
  return wasmPiratesBinary(piratesArray);
}

export function computeBinaryToPirates(bin: number): number[] {
  return wasmBinaryToPirates(bin);
}
