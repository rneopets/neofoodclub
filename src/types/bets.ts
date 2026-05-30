/**
 * Types related to bet data and state management
 */

// A single bet with arena-pirate mapping
export type Bet = Map<number, number[]>;

// A mapping of bet amounts
export type BetAmount = Map<number, number>;

// State for bet names
export type NamesState = Map<number, string>;

// State for all bets
export type BetsState = Map<number, Bet>;

// State for all bet amounts
export type BetAmountsState = Map<number, BetAmount>;

// BetValues returned by calculation functions
export interface BetValues {
  betOdds: Map<number, number>;
  betPayoffs: Map<number, number>;
  betProbabilities: Map<number, number>;
  betExpectedRatios: Map<number, number>;
  betNetExpected: Map<number, number>;
  betMaxBets: Map<number, number>;
  betBinaries: Map<number, number>;
}

export type OddsData = number[][];
export type ProbabilitiesData = number[][];
