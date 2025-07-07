import { OddsData, ProbabilitiesData } from './bets';

export interface OddsChange {
  arena: number;
  pirate: number;
  old: number;
  new: number;
  t: string;
}

export interface RoundData {
  round: number;
  pirates: number[][];
  openingOdds: number[][];
  currentOdds: number[][];
  foods: number[][];
  winners?: number[];
  timestamp?: string;
  start?: string;
  lastChange?: string;
  changes?: OddsChange[];
  source?: string;
}

export interface RoundState {
  roundData: RoundData;
  currentSelectedRound: number;
  currentRound: number;
  advanced: {
    bigBrain: boolean;
    faDetails: boolean;
    oddsTimeline: boolean;
    customOddsMode: boolean;
    useLogitModel: boolean;
  };
  customOdds: OddsData | null;
  customProbs: ProbabilitiesData | null;
  viewMode: boolean;
  useWebDomain: boolean;
  tableMode: string;
}

export interface PayoutData {
  value: number;
  probability: number;
  cumulative: number;
  tail: number;
}

export interface PayoutTables {
  odds: PayoutData[];
  winnings: PayoutData[];
}

export interface ProbabilityData {
  min: number[][];
  std: number[][];
  max: number[][];
  used: number[][];
}

export interface LogitProbabilityData {
  prob: number[][];
  used: number[][];
}

export interface RoundCalculationResult {
  calculated: boolean;
  legacyProbabilities: ProbabilityData;
  logitProbabilities: LogitProbabilityData;
  usedProbabilities: ProbabilitiesData;
  pirateFAs: Map<number, number[][]>;
  arenaRatios: number[];
  betOdds: Map<number, number>;
  betPayoffs: Map<number, number>;
  betProbabilities: Map<number, number>;
  betExpectedRatios: Map<number, number>;
  betNetExpected: Map<number, number>;
  betMaxBets: Map<number, number>;
  betBinaries: Map<number, number>;
  odds: OddsData;
  payoutTables: PayoutTables;
  winningBetBinary: number;
  totalBetAmounts: number;
  totalBetExpectedRatios: number;
  totalBetNetExpected: number;
  totalWinningPayoff: number;
  totalWinningOdds: number;
  totalEnabledBets: number;
}
