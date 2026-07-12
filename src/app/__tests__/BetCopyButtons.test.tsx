import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render, screen, fireEvent, createMockDataTransfer } from '../../test/utils';
import { BetCopyButtons } from '../BetFunctions';
import { BET_DRAG_SOURCE_TYPE, TAB_INSTANCE_ID } from '../dragSource';
import {
  useSelectedRound,
  useRoundData,
  useUseWebDomain,
  useOptimizedBetsForIndex,
  useOptimizedBetAmountsForIndex,
  useAllBetSetNames,
} from '../stores';
import { makeBetURL } from '../util';

// Create mock data for a simple round
const mockRoundData = {
  round: 9000,
  pirates: [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
    [17, 18, 19, 20],
  ],
  openingOdds: [[2, 3, 4, 5]],
  currentOdds: [[2, 3, 4, 5]],
  foods: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
};

vi.mock('../stores', () => {
  const mockCalculations = {
    calculated: true,
    payoutTables: { odds: [], winnings: [] },
    betExpectedRatios: new Map(),
    betBinaries: new Map(),
    betOdds: new Map(),
  };
  const useRoundStoreMock = Object.assign(
    (selector: (s: { calculations: typeof mockCalculations }) => unknown) =>
      selector({ calculations: mockCalculations }),
    {
      getState: () => ({ calculations: mockCalculations }),
    },
  );
  return {
    useSelectedRound: vi.fn(),
    useRoundData: vi.fn(),
    useUseWebDomain: vi.fn(),
    useRoundStore: useRoundStoreMock,
    useOptimizedBetsForIndex: vi.fn(),
    useOptimizedBetAmountsForIndex: vi.fn(),
    useAllBetSetNames: vi.fn(),
  };
});

// Mock the hooks with default implementations
const mockUseSelectedRound = vi.mocked(useSelectedRound);
const mockUseRoundData = vi.mocked(useRoundData);
const mockUseUseWebDomain = vi.mocked(useUseWebDomain);
const mockUseOptimizedBetsForIndex = vi.mocked(useOptimizedBetsForIndex);
const mockUseOptimizedBetAmountsForIndex = vi.mocked(useOptimizedBetAmountsForIndex);
const mockUseAllBetSetNames = vi.mocked(useAllBetSetNames);

describe('BetCopyButtons', () => {
  beforeEach(() => {
    // Reset all mocks
    mockUseSelectedRound.mockReturnValue(9000);
    mockUseRoundData.mockReturnValue(mockRoundData);
    mockUseUseWebDomain.mockReturnValue(false);
    mockUseOptimizedBetsForIndex.mockReturnValue(new Map([[1, [1, 0, 0, 0, 0]]]));
    mockUseOptimizedBetAmountsForIndex.mockReturnValue(new Map([[1, 500]]));
    mockUseAllBetSetNames.mockReturnValue(new Map([[0, 'My Set']]));

    // Setup navigator.clipboard for useClipboard
    if (typeof window !== 'undefined' && !('clipboard' in window.navigator)) {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    }
  });

  it('drags URL button sets correct dataTransfer values', () => {
    // Compute expected URL using the real makeBetURL function
    const bets = new Map([[1, [1, 0, 0, 0, 0]]]);
    const expectedUrl = makeBetURL(9000, bets);

    render(<BetCopyButtons index={0} />);

    const dataTransfer = createMockDataTransfer();
    fireEvent.dragStart(screen.getByTestId('copy-bet-url-button'), { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith('text/uri-list', expectedUrl);
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', expectedUrl);
    // Check that text/html contains an anchor with the bet name
    const htmlCall = dataTransfer.setData.mock.calls.find(call => call[0] === 'text/html');
    expect(htmlCall?.[1]).toContain(`<a href="${expectedUrl}">My Set</a>`);
    expect(dataTransfer.setData).toHaveBeenCalledWith(BET_DRAG_SOURCE_TYPE, TAB_INSTANCE_ID);
  });

  it('drags URL with amounts button sets correct dataTransfer values', () => {
    // Compute expected URL using the real makeBetURL function
    const bets = new Map([[1, [1, 0, 0, 0, 0]]]);
    const betAmounts = new Map([[1, 500]]);
    const expectedUrl = makeBetURL(9000, bets, betAmounts, true);

    render(<BetCopyButtons index={0} />);

    const dataTransfer = createMockDataTransfer();
    fireEvent.dragStart(screen.getByTestId('copy-bet-url-with-amounts-button'), { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith('text/uri-list', expectedUrl);
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', expectedUrl);
    // Check that text/html contains an anchor with the bet name
    const htmlCall = dataTransfer.setData.mock.calls.find(call => call[0] === 'text/html');
    expect(htmlCall?.[1]).toContain(`<a href="${expectedUrl}">My Set</a>`);
    expect(dataTransfer.setData).toHaveBeenCalledWith(BET_DRAG_SOURCE_TYPE, TAB_INSTANCE_ID);
  });

  it('does not setData when button is disabled (no bets)', () => {
    // Return empty Map for bets to disable the button
    mockUseOptimizedBetsForIndex.mockReturnValue(new Map([[1, [0, 0, 0, 0, 0]]]));

    render(<BetCopyButtons index={0} />);

    const dataTransfer = createMockDataTransfer();
    fireEvent.dragStart(screen.getByTestId('copy-bet-url-button'), { dataTransfer });

    expect(dataTransfer.setData).not.toHaveBeenCalled();
  });

  it('escapes HTML special characters in bet name for text/html', () => {
    // Set a bet name with special characters that need escaping
    mockUseAllBetSetNames.mockReturnValue(new Map([[0, 'Foo <bar> & Baz']]));

    render(<BetCopyButtons index={0} />);

    const dataTransfer = createMockDataTransfer();
    fireEvent.dragStart(screen.getByTestId('copy-bet-url-button'), { dataTransfer });

    // Find the text/html setData call
    const htmlCall = dataTransfer.setData.mock.calls.find(call => call[0] === 'text/html');
    expect(htmlCall?.[1]).toContain('&lt;bar&gt;');
    expect(htmlCall?.[1]).toContain('&amp;');

    // Make sure raw special chars are NOT present in the HTML output
    expect(htmlCall?.[1]).not.toContain('<bar>');
  });

  it('falls back to default name when bet set has no name', () => {
    // Return empty Map for allBetSetNames (no name for index 0)
    mockUseAllBetSetNames.mockReturnValue(new Map());

    render(<BetCopyButtons index={0} />);

    const dataTransfer = createMockDataTransfer();
    fireEvent.dragStart(screen.getByTestId('copy-bet-url-button'), { dataTransfer });

    // Find the text/html setData call
    const htmlCall = dataTransfer.setData.mock.calls.find(call => call[0] === 'text/html');
    expect(htmlCall?.[1]).toContain('<a href="'); // Contains anchor tag with URL
    expect(htmlCall?.[1]).toContain('Bet Set [Round 9000]');
  });

  it('copy button click does not throw and remains functional', () => {
    render(<BetCopyButtons index={0} />);

    const copyButton = screen.getByTestId('copy-bet-url-button');

    // Click should not throw
    expect(() => fireEvent.click(copyButton)).not.toThrow();

    // Button should still be present and enabled after click
    expect(copyButton).toBeInTheDocument();
  });
});
