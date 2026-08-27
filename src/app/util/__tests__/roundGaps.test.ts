import { describe, expect, it } from 'vitest';

import { findRoundGaps } from '../roundGaps';

describe('findRoundGaps', () => {
  it('returns no gaps for consecutive round numbers', () => {
    expect(findRoundGaps([1, 2, 3])).toEqual([]);
  });

  it('detects a single gap', () => {
    expect(findRoundGaps([1, 5])).toEqual([{ afterRound: 1, beforeRound: 5, missingCount: 3 }]);
  });

  it('detects multiple gaps in order', () => {
    expect(findRoundGaps([1, 3, 4, 10])).toEqual([
      { afterRound: 1, beforeRound: 3, missingCount: 1 },
      { afterRound: 4, beforeRound: 10, missingCount: 5 },
    ]);
  });

  it('returns no gaps for a single-element or empty input', () => {
    expect(findRoundGaps([1])).toEqual([]);
    expect(findRoundGaps([])).toEqual([]);
  });
});
