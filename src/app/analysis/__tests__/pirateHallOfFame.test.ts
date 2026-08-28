import { describe, expect, it } from 'vitest';

import {
  computePirateHallOfFame,
  type PirateHallOfFameEntry,
  type PirateHallOfFameRound,
} from '../pirateHallOfFame';

// Two arenas: arena 0 has pirates [1,2], arena 1 has pirates [3,4].
// winners[arena] is the 1-indexed slot of the winning pirate in that arena.
const rounds: PirateHallOfFameRound[] = [
  {
    round: 100,
    pirates: [
      [1, 2],
      [3, 4],
    ],
    winners: [1, 1],
  }, // pirates 1, 3
  {
    round: 101,
    pirates: [
      [1, 2],
      [3, 4],
    ],
    winners: [2, 1],
  }, // pirates 2, 3
  {
    round: 102,
    pirates: [
      [1, 2],
      [3, 4],
    ],
    winners: [1, 1],
  }, // pirates 1, 3
  {
    round: 103,
    pirates: [
      [1, 2],
      [3, 4],
    ],
    winners: [2, 2],
  }, // pirates 2, 4
];

function entryFor(entries: PirateHallOfFameEntry[], id: number): PirateHallOfFameEntry {
  const entry = entries.find(e => e.pirateId === id);
  if (!entry) {
    throw new Error(`expected an entry for pirate ${id}`);
  }
  return entry;
}

describe('computePirateHallOfFame', () => {
  it('counts arena wins, win share, last win and streaks per pirate', () => {
    const entries = computePirateHallOfFame(rounds);

    // Pirate 1: won rounds 100, 102.
    const p1 = entryFor(entries, 1);
    expect(p1.wins).toBe(2);
    expect(p1.winPercent).toBeCloseTo(0.5, 6); // 2 / 4 rounds
    expect(p1.lastWinRound).toBe(102);
    expect(p1.currentStreak).toBe(0); // didn't win the final round (103)
    expect(p1.highestStreak).toBe(1); // 100 then broke at 101

    // Pirate 2: won rounds 101, 103.
    const p2 = entryFor(entries, 2);
    expect(p2.wins).toBe(2);
    expect(p2.lastWinRound).toBe(103);
    expect(p2.currentStreak).toBe(1); // won the final round
    expect(p2.highestStreak).toBe(1);

    // Pirate 3: won rounds 100, 101, 102 - a three-round run.
    const p3 = entryFor(entries, 3);
    expect(p3.wins).toBe(3);
    expect(p3.winPercent).toBeCloseTo(0.75, 6); // 3 / 4 rounds
    expect(p3.lastWinRound).toBe(102);
    expect(p3.currentStreak).toBe(0); // broke at 103
    expect(p3.highestStreak).toBe(3);

    // Pirate 4: won only the final round.
    const p4 = entryFor(entries, 4);
    expect(p4.wins).toBe(1);
    expect(p4.winPercent).toBeCloseTo(0.25, 6);
    expect(p4.lastWinRound).toBe(103);
    expect(p4.currentStreak).toBe(1);
    expect(p4.highestStreak).toBe(1);
  });

  it('sorts by most wins, then pirate id', () => {
    const entries = computePirateHallOfFame(rounds);

    // Pirate 3 leads (3 wins). Pirates 1 and 2 tie at 2, id breaks the tie.
    expect(entries.map(e => e.pirateId)).toEqual([3, 1, 2, 4]);
  });

  it('counts a double-arena win twice for the same round', () => {
    const double: PirateHallOfFameRound[] = [
      // pirate 5 in both arenas, wins both -> 2 arena wins in one round.
      { round: 1, pirates: [[5], [5]], winners: [1, 1] },
    ];
    const entries = computePirateHallOfFame(double);
    const p5 = entryFor(entries, 5);
    expect(p5.wins).toBe(2); // two arenas
    expect(p5.winPercent).toBeCloseTo(2, 6); // 2 / 1 round
    expect(p5.currentStreak).toBe(1); // but only one *round* on the streak
    expect(p5.highestStreak).toBe(1);
  });

  it('handles empty input', () => {
    expect(computePirateHallOfFame([])).toEqual([]);
  });

  it('sorts rounds internally when input is out of order', () => {
    const reversed = [...rounds].reverse();
    const entries = computePirateHallOfFame(reversed);

    // Pirate 3's three-round run must still be detected regardless of order.
    expect(entryFor(entries, 3).highestStreak).toBe(3);
    // And the final-round (103) current streaks are still correct.
    expect(entryFor(entries, 2).currentStreak).toBe(1);
    expect(entryFor(entries, 4).currentStreak).toBe(1);
    expect(entryFor(entries, 3).currentStreak).toBe(0);
  });

  it('ignores invalid winner slots (out of range)', () => {
    const bad: PirateHallOfFameRound[] = [
      // slot 9 is out of range for a 2-pirate arena; only pirate 1 (slot 1) counts.
      { round: 1, pirates: [[1, 2]], winners: [9] },
      { round: 2, pirates: [[1, 2]], winners: [1] },
    ];
    const entries = computePirateHallOfFame(bad);
    expect(entries).toHaveLength(1); // only pirate 1 ever won a valid arena
    expect(entryFor(entries, 1).wins).toBe(1);
  });
});
