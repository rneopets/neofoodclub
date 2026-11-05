import { useMemo } from 'react';

import { calculatePayoutTables, computePiratesBinary } from '../maths';
import {
  useBetCount,
  useBetGenerationMaxBetMode,
  useIsCalculated,
  useMaxBet,
  useRoundStore,
  useUsedProbabilities,
} from '../stores';
import { makeBetValues } from '../util';
import { type SetPreviewSummary, summarizeSet } from '../utils/setPreview';
import { wasmMakeGambitBets, wasmMakeTenbetBets } from '../wasmEngine';

import { applyBetGenerationMaxBetMode } from './useBetManagement';

// Builds the candidate set for the Build set dialog without committing it to the
// store, and summarizes it. Returns null when the selection is invalid.
export function useSetPreview(
  mode: string,
  pirateIndices: number[],
  enabled: boolean,
): SetPreviewSummary | null {
  const betCount = useBetCount();
  const maxBet = useMaxBet();
  const maxBetMode = useBetGenerationMaxBetMode();
  const usedProbabilities = useUsedProbabilities();
  const odds = useRoundStore(state => state.roundData.currentOdds || []);
  const calculated = useIsCalculated();

  return useMemo(() => {
    if (!enabled || !calculated || betCount === 0) {
      return null;
    }
    try {
      const binary = computePiratesBinary(pirateIndices);
      const generated =
        mode === 'Gambit'
          ? wasmMakeGambitBets(binary, betCount)
          : wasmMakeTenbetBets(binary, betCount);
      if (generated.bets.size === 0) {
        return null;
      }
      const betAmounts = applyBetGenerationMaxBetMode(
        generated.bets,
        generated.betAmounts,
        maxBet,
        maxBetMode,
      );
      const values = makeBetValues(generated.bets, betAmounts, odds, usedProbabilities);
      const tables = calculatePayoutTables(
        generated.bets,
        usedProbabilities,
        values.betOdds,
        values.betPayoffs,
      );
      return summarizeSet(generated.bets, betAmounts, values, tables);
    } catch {
      return null;
    }
  }, [
    enabled,
    calculated,
    betCount,
    mode,
    pirateIndices,
    maxBet,
    maxBetMode,
    odds,
    usedProbabilities,
  ]);
}
