import type { RoundData } from '../../types';

/**
 * Utility functions for bet operations
 */

export const NEOPETS_BET_PAGE = 'https://www.neopets.com/pirates/foodclub.phtml?tab=bet';

/**
 * Generates a link to the Neopets bet page carrying a bet set in the URL fragment.
 *
 * Neopets no longer accepts bets through a URL, so the fragment is only read by the
 * neofoodclub userscript, which shows the bets on that page so they can be placed there.
 * @param betPath The output of makeBetURL, e.g. `/#round=1234&b=abc&a=def`
 * @returns The URL of the Neopets bet page with the bet set as the fragment
 */
export function generateBetLinkUrl(betPath: string): string {
  return `${NEOPETS_BET_PAGE}${betPath.replace(/^\//, '')}`;
}

/**
 * Returns the ordinal suffix for a given number (e.g., 1st, 2nd, 3rd, 4th)
 * @param num The number to get the ordinal suffix for
 * @returns The ordinal suffix string
 */
export function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}

/**
 * Filters changes array by arena and pirate indices
 * @param changes Array of odds changes to filter
 * @param arenaId The arena ID to filter by
 * @param pirateIndex The pirate index to filter by (0-based, will be converted to 1-based)
 * @returns Filtered array of changes for the specified arena and pirate
 */
export function filterChangesByArenaPirate<T extends { arena: number; pirate: number }>(
  changes: T[],
  arenaId: number,
  pirateIndex: number,
): T[] {
  return changes.filter(change => change.arena === arenaId && change.pirate === pirateIndex + 1);
}

export function hasHistoricalOddsData(roundData: RoundData): boolean {
  return Boolean(roundData.start && roundData.timestamp);
}
