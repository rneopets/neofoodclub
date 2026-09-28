import { NEGATIVE_FAS, PIRATE_NAMES, POSITIVE_FAS } from '../constants';

/** The minimal round shape the food-adjustment matrix needs. */
export interface FoodAdjustmentRound {
  round: number;
  /** Pirates per arena, 0-indexed (pirates[arena] is the arena's pirate id list). */
  pirates: number[][];
  /** Winning slot per arena, 1-indexed (winners[arena] is 1-4). */
  winners: number[];
  /** Food item ids served per arena that round, when available. */
  foods?: number[][] | null;
}

export interface FoodAdjustmentCell {
  /** This pirate's food adjustment for the round, or null when no food data was recorded. */
  fa: number | null;
  /** Whether this pirate won its arena this round. */
  isWinner: boolean;
}

export interface FoodAdjustmentRoundRow {
  round: number;
  cellsByPirateId: Map<number, FoodAdjustmentCell>;
}

export interface PirateFoodAdjustmentColumn {
  pirateId: number;
  name: string;
  winPercent: number;
  /** Average food adjustment across rounds with recorded food data, or null if none. */
  averageFa: number | null;
}

export interface FoodAdjustmentHistory {
  /** Columns, sorted by win% descending (pirate id ascending breaks ties). */
  pirates: PirateFoodAdjustmentColumn[];
  /** Rows, newest round first. */
  rows: FoodAdjustmentRoundRow[];
}

function pirateFoodAdjustment(pirateId: number, foodIds: ReadonlyArray<number>): number {
  let fa = 0;
  for (const foodId of foodIds) {
    fa += POSITIVE_FAS[pirateId]?.[foodId] ?? 0;
    fa -= NEGATIVE_FAS[pirateId]?.[foodId] ?? 0;
  }
  return fa;
}

/**
 * Builds a pirate-by-round food adjustment matrix: one column per pirate
 * (ranked like a win% leaderboard), one row per round (newest first). Each
 * cell carries the pirate's food adjustment for that round (the foods served
 * in their arena shifting their odds) and whether they won that arena -
 * mirroring the classic "Pirate Streaks / Food Adjustments" tool this
 * recreates, where the number is the FA and the color is the round result.
 */
export function computeFoodAdjustmentHistory(
  rounds: ReadonlyArray<FoodAdjustmentRound>,
): FoodAdjustmentHistory {
  const sortedRounds = [...rounds].sort((a, b) => b.round - a.round);

  const winCountById = new Map<number, number>();
  const faSumById = new Map<number, number>();
  const faCountById = new Map<number, number>();
  const rows: FoodAdjustmentRoundRow[] = [];

  for (const round of sortedRounds) {
    const cellsByPirateId = new Map<number, FoodAdjustmentCell>();

    for (let arenaIndex = 0; arenaIndex < round.pirates.length; arenaIndex++) {
      const arenaPirates = round.pirates[arenaIndex];
      if (!arenaPirates) {
        continue;
      }
      const winningSlot = round.winners[arenaIndex];
      const arenaFoods = round.foods?.[arenaIndex];

      arenaPirates.forEach((pirateId, slotIndex) => {
        const isWinner = winningSlot === slotIndex + 1;
        const fa = arenaFoods ? pirateFoodAdjustment(pirateId, arenaFoods) : null;
        cellsByPirateId.set(pirateId, { fa, isWinner });

        if (isWinner) {
          winCountById.set(pirateId, (winCountById.get(pirateId) ?? 0) + 1);
        }
        if (fa !== null) {
          faSumById.set(pirateId, (faSumById.get(pirateId) ?? 0) + fa);
          faCountById.set(pirateId, (faCountById.get(pirateId) ?? 0) + 1);
        }
      });
    }

    rows.push({ round: round.round, cellsByPirateId });
  }

  const totalRounds = sortedRounds.length;

  // Seed with every known pirate so the leaderboard always has all 20
  // columns, even ones without a win or recorded food data in this slice.
  const pirateIds = new Set<number>(PIRATE_NAMES.keys());
  for (const id of winCountById.keys()) {
    pirateIds.add(id);
  }
  for (const id of faSumById.keys()) {
    pirateIds.add(id);
  }

  const pirates: PirateFoodAdjustmentColumn[] = Array.from(pirateIds).map(pirateId => {
    const faCount = faCountById.get(pirateId) ?? 0;
    return {
      pirateId,
      name: PIRATE_NAMES.get(pirateId) ?? `Pirate ${pirateId}`,
      winPercent: totalRounds > 0 ? (winCountById.get(pirateId) ?? 0) / totalRounds : 0,
      averageFa: faCount > 0 ? (faSumById.get(pirateId) ?? 0) / faCount : null,
    };
  });

  pirates.sort((a, b) => b.winPercent - a.winPercent || a.pirateId - b.pirateId);

  return { pirates, rows };
}
