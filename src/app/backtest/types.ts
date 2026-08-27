export interface BacktestRound {
  round: number;
  pirates: number[][];
  openingOdds: number[][];
  currentOdds: number[][];
  winners: number[];
  foods?: number[][];
}

/**
 * A bet-selection strategy to backtest. 'maxTer' and 'generalEr' both use the
 * engine's max-TER generator - the difference is whether bets are ranked by
 * Net Expected at the chosen amount (maxTer) or by raw, amount-independent
 * Expected Ratio (generalEr). The rest wrap the other wasm bet generators.
 * 'winningGambit' is hindsight-biased by design (it bets the actual round
 * winners) and serves as an upper bound, not a real strategy.
 */
export type BacktestStrategy =
  'maxTer' | 'generalEr' | 'gambit' | 'bustproof' | 'tenbet' | 'crazy' | 'winningGambit';

export interface ModelBacktestResult {
  totalSpent: number;
  totalWon: number;
  netProfit: number;
  roi: number;
  roundsPlayed: number;
  roundsWon: number;
  /** Rounds where the strategy produced no bets (e.g. bustproof on a round with no positive arenas) and so contributed nothing to cumulativeNet. */
  roundsSkipped: number;
  cumulativeNet: number[];
}

export interface BacktestSummary {
  rounds: number[];
  legacy: ModelBacktestResult;
  logit: ModelBacktestResult;
}

export interface AmountSweepPoint {
  amount: number;
  legacy: ModelBacktestResult;
  logit: ModelBacktestResult;
}
