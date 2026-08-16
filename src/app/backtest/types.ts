export interface BacktestRound {
  round: number;
  pirates: number[][];
  openingOdds: number[][];
  currentOdds: number[][];
  winners: number[];
}

export interface ModelBacktestResult {
  totalSpent: number;
  totalWon: number;
  netProfit: number;
  roi: number;
  roundsPlayed: number;
  roundsWon: number;
  cumulativeNet: number[];
}

export interface BacktestSummary {
  rounds: number[];
  legacy: ModelBacktestResult;
  logit: ModelBacktestResult;
}

export interface CachedPreviousRounds {
  version: number;
  newestRound: number;
  fetchedAt: number;
  rounds: BacktestRound[];
}
