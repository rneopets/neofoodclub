import * as fs from 'fs';
import * as path from 'path';

import { Page } from '@playwright/test';

/**
 * Sets up mocking of neofood.club CDN requests to use local data from automation folder
 */
export async function setupLocalDataMock(page: Page, baseRound: number = 9000): Promise<void> {
  // Mock the current round endpoint
  await page.route('https://cdn.neofood.club/current_round.txt', async route => {
    // Return a round number that we know exists locally
    // Use baseRound + 1 as the "current" round to simulate normal behavior
    const currentRound = baseRound + 50; // Use a slightly higher round as "current"
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: currentRound.toString(),
    });
  });

  // Mock the round data endpoints
  await page.route('https://cdn.neofood.club/rounds/*.json', async route => {
    const url = route.request().url();
    const roundMatch = url.match(/\/rounds\/(\d+)\.json$/);

    if (roundMatch && roundMatch[1]) {
      const roundNumber = parseInt(roundMatch[1], 10);
      const jsonPath = path.join(process.cwd(), 'automation', 'raw_json', `${roundNumber}.json`);

      try {
        if (fs.existsSync(jsonPath)) {
          const jsonData = fs.readFileSync(jsonPath, 'utf8');
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: jsonData,
          });
        } else {
          // Return 404 for rounds that don't exist locally
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: `Round ${roundNumber} not found` }),
          });
        }
      } catch (error) {
        console.error(`Failed to read round data for ${roundNumber}:`, error);
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      }
    } else {
      // Fallback for malformed URLs
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid round URL format' }),
      });
    }
  });
}
/**
 * Gets a reliable round number that exists locally
 */
export function getReliableRound(): number {
  return 9000;
}
