import {
  LogitProbabilityData,
  PayoutData,
  PayoutTables,
  ProbabilityData,
  RoundData,
} from '../types';
import { Bet, OddsData, ProbabilitiesData } from '../types/bets';

import { NEGATIVE_FAS, POSITIVE_FAS } from './constants';
import {
  LOGIT_INTERCEPTS,
  LOGIT_PFA,
  LOGIT_NFA,
  LOGIT_IS_POS2,
  LOGIT_IS_POS3,
  LOGIT_IS_POS4,
} from './constants_logit';

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
    let pirateIndex;
    for (pirateIndex = 1; pirateIndex <= 4; pirateIndex++) {
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

    for (pirateIndex = 1; pirateIndex <= 4; pirateIndex++) {
      const pirateOdd = roundData.openingOdds[arenaIndex]![pirateIndex]!;
      const minOrig = returnValue.min[arenaIndex]![pirateIndex]!;
      const maxOrig = returnValue.max[arenaIndex]![pirateIndex]!;
      returnValue.min[arenaIndex]![pirateIndex] = Math.max(minOrig, 1 + maxOrig - max);
      returnValue.max[arenaIndex]![pirateIndex] = Math.min(maxOrig, 1 + minOrig - min);
      if (pirateOdd === 13) {
        returnValue.std[arenaIndex]![pirateIndex] = 0.05;
      } else {
        returnValue.std[arenaIndex]![pirateIndex] =
          (returnValue.min[arenaIndex]![pirateIndex]! +
            returnValue.max[arenaIndex]![pirateIndex]!) /
          2;
      }
    }

    let rectifyLevel = 2;
    while (rectifyLevel <= 13) {
      let stdTotal = 0;
      let rectifyCount = 0;
      let rectifyValue = 0;
      let maxRectifyValue = 1;
      for (pirateIndex = 1; pirateIndex <= 4; pirateIndex++) {
        stdTotal += returnValue.std[arenaIndex]![pirateIndex]!;
        if (roundData.openingOdds[arenaIndex]![pirateIndex]! <= rectifyLevel) {
          rectifyCount++;
          rectifyValue +=
            returnValue.std[arenaIndex]![pirateIndex]! - returnValue.min[arenaIndex]![pirateIndex]!;
          maxRectifyValue = Math.min(
            maxRectifyValue,
            returnValue.max[arenaIndex]![pirateIndex]! - returnValue.min[arenaIndex]![pirateIndex]!,
          );
        }
      }
      if (stdTotal === 1) {
        break;
      }
      if (
        stdTotal - rectifyValue > 1 ||
        rectifyCount === 0 ||
        rectifyValue + 1 - stdTotal > maxRectifyValue * rectifyCount
      ) {
        rectifyLevel++;
        continue;
      }
      rectifyValue += 1 - stdTotal; // positive or 0
      rectifyValue /= rectifyCount;
      for (pirateIndex = 1; pirateIndex <= 4; pirateIndex++) {
        if (roundData.openingOdds[arenaIndex]![pirateIndex]! <= rectifyLevel) {
          returnValue.std[arenaIndex]![pirateIndex] =
            returnValue.min[arenaIndex]![pirateIndex]! + rectifyValue;
        }
      }
      break;
    }

    let sum = 0;
    for (pirateIndex = 1; pirateIndex <= 4; pirateIndex++) {
      returnValue.used[arenaIndex]![pirateIndex] = returnValue.std[arenaIndex]![pirateIndex]!;
      sum += returnValue.used[arenaIndex]![pirateIndex]!;
    }

    for (pirateIndex = 1; pirateIndex <= 4; pirateIndex++) {
      returnValue.used[arenaIndex]![pirateIndex]! /= sum;
    }
  }
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

  const [favorites, allergies] = computePirateFAPairs(roundData);
  for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
    returnValue.prob[arenaIndex] = [1];
    returnValue.used[arenaIndex] = [1];
    const capabilities: number[] = makeEmpty(5);
    for (let pirateIndex = 0; pirateIndex < 4; pirateIndex++) {
      const pirateNumber = roundData.pirates[arenaIndex]![pirateIndex]!;
      let pirateStrength = LOGIT_INTERCEPTS.get(pirateNumber)!;
      const favorite = favorites[arenaIndex]![pirateIndex]!;
      const allergy = allergies[arenaIndex]![pirateIndex]!;
      pirateStrength += LOGIT_PFA.get(pirateNumber)! * favorite;
      pirateStrength += LOGIT_NFA.get(pirateNumber)! * allergy;
      if (pirateIndex === 1) {
        pirateStrength += LOGIT_IS_POS2.get(pirateNumber)!;
      }
      if (pirateIndex === 2) {
        pirateStrength += LOGIT_IS_POS3.get(pirateNumber)!;
      }
      if (pirateIndex === 3) {
        pirateStrength += LOGIT_IS_POS4.get(pirateNumber)!;
      }
      capabilities[pirateIndex + 1] = Math.exp(pirateStrength);
      capabilities[0]! += capabilities[pirateIndex + 1]!;
    }
    for (let pirateIndex = 1; pirateIndex <= 4; pirateIndex++) {
      returnValue.prob[arenaIndex]![pirateIndex] = capabilities[pirateIndex]! / capabilities[0]!;
      returnValue.used[arenaIndex]![pirateIndex] = returnValue.prob[arenaIndex]![pirateIndex]!;
    }
  }
  return returnValue;
}

export function calculateArenaRatios(customOdds: OddsData): number[] {
  const arenas: number[] = [];
  for (let arenaIndex = 0; arenaIndex < 5; arenaIndex++) {
    let ratio = 0;
    for (let pirateIndex = 1; pirateIndex <= 4; pirateIndex++) {
      ratio += 1 / customOdds[arenaIndex]![pirateIndex]!;
    }
    ratio = 1 / ratio - 1;
    arenas[arenaIndex] = ratio;
  }
  return arenas;
}

function tableToList(oddsTable: Map<number, number>): PayoutData[] {
  const oddsList: PayoutData[] = [];
  oddsTable.forEach((probability, odds) => {
    oddsList.push({ value: odds, probability, cumulative: 0, tail: 0 });
  });
  oddsList.sort((a, b) => a.value - b.value);
  let cumulative = 0;
  let tail = 1;
  oddsList.forEach(item => {
    cumulative += item.probability;
    item.cumulative = cumulative;
    item.tail = tail;
    tail -= item.probability;
  });
  return oddsList;
}

export function calculatePayoutTables(
  bets: Bet,
  probabilities: ProbabilitiesData,
  betOdds: Map<number, number>,
  betPayoffs: Map<number, number>,
): PayoutTables {
  /*
    ib is a binary format to represent bets.
    It works on 20 bits (because there are 20 pirates).
    Each of the bits of an ib represents whether it accepts some pirate. (whether the bet can win if this pirate wins)
    From most significant to least significant bits, the pirates are in the usual arena-by-arena order.
    This binary format allows some easy operations:
    ib1&ib2 accepts the pirates that both ib1 and ib2 accepts. The winning combinations of ib1&ib2 is the intersection of the winning combinations of ib1 and ib2.
    ib1|ib2 accepts the pirates that ib1 or ib2 accepts. The winning combinations of ib1&ib2 is BIGGER or equal to the union of the winning combinations of ib1 and ib2.
    */

  // arIb[i] will accept pirates from arena i and only them. arIb[4] == 1111, arIb[3] == 11110000, etc...
  const arIb: number[] = [0xf0000, 0xf000, 0xf00, 0xf0, 0xf];
  // allIb will accept all pirates. allIb = 11111111111111111111 (should be 20 '1's)
  const allIb: number = 0xfffff;
  // pirIb[i] will accept pirates of index i (from 0 to 3) pirIb[0] = 10001000100010001000, pirIb[1] = 01000100010001000100, pirIb[2] = 00100010001000100010, pirIb[3] = 00010001000100010001
  const pirIb: number[] = [0x88888, 0x44444, 0x22222, 0x11111];

  // this will allow an easier conversion from the old bet format to the new
  const convrtPirIb: number[] = [allIb].concat(pirIb);

  // betToIb converts from old bet format to the new.
  function betToIb(bet: number[]): number {
    let ib = 0;
    for (let i = 0; i < 5; i++) {
      // this adds pirates meant by bet[i] to the pirates accepted by ib.
      ib |= convrtPirIb[bet[i]!]! & arIb[i]!;
    }
    return ib;
  }

  // checks if there are possible winning combinations for ib
  function ibDoable(ib: number): boolean {
    // checks whether ib accepts at least one pirate in each arena
    return (
      (ib & arIb[0]!) !== 0 &&
      (ib & arIb[1]!) !== 0 &&
      (ib & arIb[2]!) !== 0 &&
      (ib & arIb[3]!) !== 0 &&
      (ib & arIb[4]!) !== 0
    );
  }

  /*
    an ibObj has the following format:
    {
        ibBet1: winnings1,
        ibBet2: winnings2,
        ...
    }
    */

  /*
    expandIbObject takes an ibObj and returns an ibObj.
    The returned bet set "res" satisfies the following properties:
    - for all possible winning combinations it has the same value as the old set
    - two different bets in "res" will have 0 common accepted winning combinations
    - all winning combinations are accepted by a bet in "res" (giving the value 0 to combinations that busts)
    It's done so that the probability distribution becomes easy to compute.
    */
  function expandIbObject(ibObj: Map<number, number>): Map<number, number> {
    // magic for now, just accept that it works
    const res: Map<number, number> = new Map();
    res.set(allIb, 0);
    for (const bet of ibObj.keys()) {
      const valBet = ibObj.get(bet)!;
      const iter = Array.from(res.keys());
      iter.forEach(function (ibKey: number) {
        const com = bet & ibKey;
        if (ibDoable(com)) {
          const valKey = res.get(ibKey)!;
          res.delete(ibKey);
          res.set(com, valBet + valKey);
          for (let i = 0; i < 5; i++) {
            const ar = arIb[i]!;
            const tst = ibKey ^ (com & ar);
            if (ibDoable(tst)) {
              res.set(tst, valKey);
              ibKey = (ibKey & ~ar) | (com & ar);
            }
          }
        }
      });
    }
    return res;
  }

  // computes the probability that the winning combination is accepted by ib
  function ibProb(ib: number): number {
    let totProb = 1;
    for (let i = 0; i < 5; i++) {
      let arProb = 0;
      const arenaProbs = probabilities?.[i];
      if (arenaProbs) {
        for (let j = 0; j < 4; j++) {
          if ((ib & arIb[i]! & pirIb[j]!) !== 0) {
            arProb += arenaProbs[j + 1] ?? 0;
          }
        }
      }
      totProb *= arProb;
    }
    return totProb;
  }

  /*
    Takes a bet set in ibObj satisfying the following condition:
    - two different bets in the bet set will have 0 common accepted winning combinations
    and computes its win table.
    */
  function computeWinTableIbExpObj(ibExpObj: Map<number, number>): PayoutData[] {
    const winTable: Map<number, number> = new Map();
    for (const ibKey of ibExpObj.keys()) {
      const actualValue = ibExpObj.get(ibKey)!;
      winTable.set(actualValue, (winTable.get(actualValue) || 0) + ibProb(ibKey));
    }
    return tableToList(winTable);
  }

  // making the ibObjs
  const ibObjOdds: Map<number, number> = new Map();
  const ibObjWinnings: Map<number, number> = new Map();
  for (const betIndex of bets.keys()) {
    const ib = betToIb(bets.get(betIndex)!);
    ibObjOdds.set(ib, (ibObjOdds.get(ib) || 0) + betOdds.get(betIndex)!);
    ibObjWinnings.set(ib, (ibObjWinnings.get(ib) || 0) + betPayoffs.get(betIndex)!);
  }

  // expanding the ibObj so that computing its probability distribution is easier
  const ibExpObjOdds = expandIbObject(ibObjOdds);
  const ibExpObjWinnings = expandIbObject(ibObjWinnings);

  // computing the win tables
  const winTblOdds = computeWinTableIbExpObj(ibExpObjOdds);
  const winTblWinnings = computeWinTableIbExpObj(ibExpObjWinnings);

  return {
    odds: winTblOdds,
    winnings: winTblWinnings,
  };
}

export function computePirateBinary(arenaIndex: number, pirateIndex: number): number {
  if (pirateIndex === 0) {
    return 0;
  }
  return 1 << (20 - (pirateIndex + arenaIndex * 4));
}

export function computePiratesBinary(piratesArray: number[]): number {
  // transform a 5-length list to a bet-shaped binary number using reduce
  return piratesArray.reduce(
    (binary, pirateIndex, arenaIndex) => binary | computePirateBinary(arenaIndex, pirateIndex),
    0,
  );
}

export function computeBinaryToPirates(bin: number): number[] {
  const indices: number[] = [];
  [0xf0000, 0xf000, 0xf00, 0xf0, 0xf].forEach(arenaValue => {
    let value = arenaValue & bin;
    if (value > 0) {
      value = 4 - ((value.toString(2).length - 1) % 4);
    }
    indices.push(value);
  });
  return indices;
}
