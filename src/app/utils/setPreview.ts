import { PayoutTables } from '../../types';
import { Bet, BetAmount, BetValues } from '../../types/bets';
import { BET_AMOUNT_MIN } from '../constants';

export interface SetPreviewSummary {
  bustRate: number;
  partialRate: number;
  likelyWinner: {
    betIndex: number;
    probability: number;
    units: number;
    np: number | null;
  } | null;
  highestOutcome: {
    units: number;
    probability: number;
    np: number | null;
  } | null;
  er: number | null;
}

// Summarizes a candidate bet set for the "Build set" dialog preview.
// "Partial" means winning something, but fewer units than the number of bets.
export function summarizeSet(
  bets: Bet,
  betAmounts: BetAmount,
  betValues: Pick<
    BetValues,
    'betOdds' | 'betPayoffs' | 'betProbabilities' | 'betExpectedRatios' | 'betBinaries'
  >,
  payoutTables: PayoutTables,
): SetPreviewSummary | null {
  const validKeys = Array.from(bets.keys()).filter(
    key => (betValues.betBinaries.get(key) ?? 0) > 0,
  );
  if (validKeys.length === 0 || payoutTables.odds.length === 0) {
    return null;
  }

  const binaries = validKeys.map(key => betValues.betBinaries.get(key));
  const hasDuplicates = new Set(binaries).size !== binaries.length;

  let bustRate = 0;
  let partialRate = 0;
  for (const row of payoutTables.odds) {
    if (row.value === 0) {
      bustRate += row.probability;
    } else if (row.value < validKeys.length) {
      partialRate += row.probability;
    }
  }

  let likelyKey = validKeys[0] as number;
  for (const key of validKeys) {
    if (
      (betValues.betProbabilities.get(key) ?? 0) > (betValues.betProbabilities.get(likelyKey) ?? 0)
    ) {
      likelyKey = key;
    }
  }
  const likelyAmount = betAmounts.get(likelyKey) ?? 0;

  const topOdds = payoutTables.odds[payoutTables.odds.length - 1];
  const topWinnings = payoutTables.winnings[payoutTables.winnings.length - 1];
  const highestOutcome =
    topOdds && topOdds.value > 0
      ? {
          units: topOdds.value,
          probability: topOdds.probability,
          np: topWinnings && topWinnings.value > 0 ? topWinnings.value : null,
        }
      : null;

  let er: number | null = null;
  if (!hasDuplicates) {
    er = validKeys.reduce((sum, key) => sum + (betValues.betExpectedRatios.get(key) ?? 0), 0);
  }

  return {
    bustRate,
    partialRate,
    likelyWinner: {
      betIndex: likelyKey,
      probability: betValues.betProbabilities.get(likelyKey) ?? 0,
      units: betValues.betOdds.get(likelyKey) ?? 0,
      np: likelyAmount >= BET_AMOUNT_MIN ? (betValues.betPayoffs.get(likelyKey) ?? 0) : null,
    },
    highestOutcome,
    er,
  };
}
