import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '../../test/utils';
import BetFunctions from '../BetFunctions';

const noop = vi.fn<() => void>();

type BetManagementMock = {
  newEmptySet: typeof noop;
  cloneSet: typeof noop;
  generateMaxTERSet: typeof noop;
  generateGambitSet: typeof noop;
  generateBustproofSet: typeof noop;
  generateWinningGambitSet: typeof noop;
  generateRandomCrazySet: typeof noop;
  generateTenbetSet: typeof noop;
  generateGambitWithPirates: typeof noop;
};

type RoundDataMock = {
  round: number;
  pirates: number[][];
  currentOdds: number[][];
  openingOdds: number[][];
  winners: number[];
};

vi.mock('../hooks/useBetManagement', (): { useBetManagement: () => BetManagementMock } => ({
  useBetManagement: (): BetManagementMock => ({
    newEmptySet: noop,
    cloneSet: noop,
    generateMaxTERSet: noop,
    generateGambitSet: noop,
    generateBustproofSet: noop,
    generateWinningGambitSet: noop,
    generateRandomCrazySet: noop,
    generateTenbetSet: noop,
    generateGambitWithPirates: noop,
  }),
}));

vi.mock('../hooks/useIsRoundOver', (): { useIsRoundOver: () => boolean } => ({
  useIsRoundOver: (): boolean => true,
}));

vi.mock('../stores', () => ({
  useSelectedRound: (): number => 9000,
  useRoundStore: { getState: (): Record<string, never> => ({}) },
  useBetStore: {
    getState: (): { clearAllBets: typeof noop; updateBetName: typeof noop } => ({
      clearAllBets: noop,
      updateBetName: noop,
    }),
  },
  useRoundData: (): RoundDataMock => ({
    round: 9000,
    pirates: [[1]],
    currentOdds: [[1]],
    openingOdds: [[1]],
    winners: [1],
  }),
  useUseWebDomain: (): boolean => true,
  useCalculationsStatus: (): string => 'done',
  useArenaRatios: (): number[] => [1, 1, 1, 1, 1],
  useBigBrain: (): boolean => false,
  useWinningBetBinary: (): number => 1,
  useUsedProbabilities: (): Record<string, never> => ({}),
  useBetSetCount: (): number => 0,
  useAllBetSetNames: (): Map<number, string> => new Map(),
  useCurrentBet: (): number => 0,
  useSetCurrentBet: (): typeof noop => noop,
  useDeleteBetSet: (): typeof noop => noop,
  useHasAnyBets: (): boolean => false,
  useHasAnyBetsAnywhere: (): boolean => false,
  useRoundPirates: (): number[][] => [[1]],
  useOptimizedBetsForIndex: (): Map<number, number> => new Map(),
  useOptimizedBetAmountsForIndex: (): Map<number, number> => new Map(),
}));

describe('BetFunctions', () => {
  it('places inline round-over banner in its own toolbar row', () => {
    render(<BetFunctions variant="inline" />);

    const banner = screen.getByTestId('round-over-banner');
    const bannerRow = screen.getByTestId('round-over-banner-row');
    const toolbarActions = screen.getByTestId('bet-set-toolbar-actions');
    const generateButton = screen.getByTestId('generate-button');

    expect(banner).toHaveTextContent('Round 9000 is over');
    expect(bannerRow).toContainElement(banner);
    expect(bannerRow).not.toContainElement(generateButton);
    expect(toolbarActions).toContainElement(generateButton);
  });
});
