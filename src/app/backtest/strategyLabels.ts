import type { BacktestStrategy } from './types';

/** Human-readable name + one-line description for each backtestable strategy. */
export const STRATEGY_LABELS: Record<BacktestStrategy, { name: string; blurb: string }> = {
  maxTer: {
    name: 'Max-TER',
    blurb: "Net Expected ranked at your bet amount - what the app's Generate button uses.",
  },
  generalEr: {
    name: 'General ER',
    blurb: 'Raw Expected Ratio, independent of bet amount - a different ranking than Max-TER.',
  },
  bestGambit: {
    name: 'Best Gambit',
    blurb: 'The highest-expected-value full-arena bet and its supporting gambit set.',
  },
  gambit: {
    name: 'Gambit (default)',
    blurb: 'Best bets containing the default pirate-1-everywhere selection.',
  },
  bustproof: {
    name: 'Bustproof',
    blurb: 'Guaranteed-profit sets on positive arenas; rounds with none are skipped.',
  },
  tenbet: {
    name: 'Ten-bet (default)',
    blurb: 'Up to 10 bets from the default first-three-arenas selection.',
  },
  crazy: {
    name: 'Crazy',
    blurb: 'Random full-arena bets - a baseline for how bad luck can be.',
  },
  winningGambit: {
    name: 'Winning Gambit (oracle)',
    blurb: 'Bets the actual winners - a hindsight upper bound, not a real strategy.',
  },
};

/** Display order for the strategy picker. */
export const STRATEGY_ORDER: BacktestStrategy[] = [
  'maxTer',
  'generalEr',
  'bestGambit',
  'gambit',
  'bustproof',
  'tenbet',
  'crazy',
  'winningGambit',
];
