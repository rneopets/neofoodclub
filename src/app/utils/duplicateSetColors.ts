import { Bet } from '../../types/bets';
import { computePiratesBinary } from '../maths';

// Reuses the in-set duplicate-bet palette so a circle with the same number is
// always the same color, whether it marks duplicate bets within one set or
// duplicate sets across cards.
import { DUPLICATE_BET_COLOR_PALETTE } from './duplicateBetColors';

/**
 * Computes the identity of a bet set: its non-zero bet binaries, sorted and
 * joined. This mirrors `Bets::identity()` in neofoodclub.rs - the amountless
 * representation of a unique bet set, so two sets with the same bets in any
 * order (and with any amounts) share an identity. Returns `null` for a set
 * with no valid bets, so empty sets are never treated as duplicates of each
 * other.
 */
export function computeBetSetIdentity(bets: Bet): string | null {
  const binaries = Array.from(bets.values())
    .filter(bet => bet.some(pirate => pirate > 0))
    .map(bet => computePiratesBinary(bet));

  if (binaries.length === 0) {
    return null;
  }

  binaries.sort((a, b) => a - b);
  return binaries.join(',');
}

/**
 * Groups all bet sets by identity and assigns each group of 2+ sets a color,
 * cycling through DUPLICATE_BET_COLOR_PALETTE. Groups are visited in order of
 * their lowest set index so the same sets always get the same color. Returns a
 * map of identity -> color; singletons are omitted.
 */
export function computeDuplicateSetGroupColors(allBets: Map<number, Bet>): Map<string, string> {
  const groups = new Map<string, number[]>();

  for (const [setIndex, bets] of allBets) {
    const identity = computeBetSetIdentity(bets);
    if (identity === null) {
      continue;
    }

    const existing = groups.get(identity);
    if (existing) {
      existing.push(setIndex);
    } else {
      groups.set(identity, [setIndex]);
    }
  }

  const result = new Map<string, string>();

  // Visit duplicate groups in order of their lowest set index so the same sets
  // always get the same color, regardless of Map insertion order.
  const duplicateGroups = Array.from(groups.entries())
    .filter(([, setIndices]) => setIndices.length >= 2)
    .sort((groupA, groupB) => Math.min(...groupA[1]) - Math.min(...groupB[1]));

  duplicateGroups.forEach(([identity], colorIndex) => {
    result.set(
      identity,
      DUPLICATE_BET_COLOR_PALETTE[colorIndex % DUPLICATE_BET_COLOR_PALETTE.length] as string,
    );
  });

  return result;
}
