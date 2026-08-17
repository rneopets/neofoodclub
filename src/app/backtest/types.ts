export interface BacktestRound {
  round: number;
  pirates: number[][];
  openingOdds: number[][];
  currentOdds: number[][];
  winners: number[];
  foods?: number[][];
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
  legacyGeneralEr: ModelBacktestResult;
  logitGeneralEr: ModelBacktestResult;
}

export interface AmountSweepPoint {
  amount: number;
  legacy: ModelBacktestResult;
  logit: ModelBacktestResult;
  legacyGeneralEr: ModelBacktestResult;
  logitGeneralEr: ModelBacktestResult;
}
