/**
 * Utility functions for bet operations
 */

/**
 * Generates a bet link URL
 * @param bet The bet to generate a link for
 * @param betAmount The amount of the bet
 * @param betOdds The odds of the bet
 * @param betPayoffs The payoffs of the bet
 * @param pirates The pirates data
 * @returns The URL for placing the bet
 */
export function generateBetLinkUrl(
  bet: number[],
  betAmount: number,
  betOdds: number,
  betPayoffs: number,
  pirates: number[][],
): string {
  let urlString = 'https://www.neopets.com/pirates/process_foodclub.phtml?';

  // Add winners
  for (let i = 0; i < 5; i++) {
    if (bet[i] !== 0) {
      // @ts-expect-error - guaranteed to be defined
      urlString += `winner${i + 1}=${pirates[i][bet[i] - 1]}&`;
    }
  }

  // Add matches
  for (let i = 0; i < 5; i++) {
    if (bet[i] !== 0) {
      urlString += `matches[]=${i + 1}&`;
    }
  }

  // Add bet info
  urlString += `bet_amount=${betAmount}&`;
  urlString += `total_odds=${betOdds}&`;
  urlString += `winnings=${betPayoffs}&`;
  urlString += 'type=bet';

  return urlString;
}

/**
 * Opens the bet link in a new tab
 * @param url The URL to open
 */
export function openBetLinkInNewTab(url: string): void {
  // Detect if the user is on desktop or mobile
  const isDesktop = !/Mobi|Android/i.test(navigator.userAgent);

  // Detect if the user is on macOS
  const isMac = /Mac/i.test(navigator.userAgent);

  if (isDesktop) {
    // Use metaKey for MacOS, ctrlKey for Windows/Linux
    const e = new MouseEvent('click', {
      ctrlKey: !isMac, // ctrlKey for Windows/Linux
      metaKey: isMac, // metaKey for MacOS
    });

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.dispatchEvent(e);
  } else {
    // For mobile devices, fallback to window.open
    window.open(url, '_blank');
  }
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
