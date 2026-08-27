export interface RoundGap {
  afterRound: number;
  beforeRound: number;
  missingCount: number;
}

/**
 * Finds gaps in a sorted-ascending list of round numbers - runs of
 * consecutive round numbers that never appear at all between two rounds that
 * do. Only interior gaps are reported; nothing before the first or after the
 * last round number counts as a gap.
 */
export function findRoundGaps(roundNumbers: number[]): RoundGap[] {
  const gaps: RoundGap[] = [];

  for (let i = 1; i < roundNumbers.length; i++) {
    const afterRound = roundNumbers[i - 1]!;
    const beforeRound = roundNumbers[i]!;
    const missingCount = beforeRound - afterRound - 1;
    if (missingCount > 0) {
      gaps.push({ afterRound, beforeRound, missingCount });
    }
  }

  return gaps;
}
