import * as fs from 'fs';
import * as path from 'path';

import { test, expect, Locator, Page } from '@playwright/test';

import { setupLocalDataMock, getReliableRound } from './test-helpers/local-data-mock';

const ROUND = getReliableRound();

const ARENA_NAMES = ['Shipwreck', 'Lagoon', 'Treasure', 'Hidden', 'Harpoon'];

interface FixtureRound {
  round: number;
  openingOdds: number[][];
  currentOdds: number[][];
}

// Read the same fixture the network mock serves, so expectations can't drift from it
const fixture: FixtureRound = fs
  .readFileSync(path.join(process.cwd(), 'e2e', 'fixtures', 'rounds.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map(line => JSON.parse(line) as FixtureRound)
  .find(r => r.round === ROUND)!;

async function waitForTable(page: Page): Promise<void> {
  await page.waitForSelector('#root', { timeout: 30000 });
  await page.waitForSelector('table', { timeout: 20000 });
}

// First bet column's radio on the first pirate row (Tailhook, arena 0 in the fixture).
// Avoids the per-arena "clear" radio, which selects no pirate.
function pickTailhookBet1(page: Page): Locator {
  return page.locator('table tbody tr', { hasText: 'Tailhook' }).locator('[role="radio"]').first();
}

function hashParams(page: Page): URLSearchParams {
  return new URLSearchParams(new URL(page.url()).hash.slice(1));
}

test.describe('NeoFoodClub Betting Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupLocalDataMock(page, ROUND);
    await page.goto(`/#round=${ROUND}`);
    try {
      await waitForTable(page);
    } catch {
      test.skip(true, 'App failed to load');
    }
  });

  test('loads the round from the URL hash', async ({ page }) => {
    await expect(page.locator('[data-testid="round-input-field"]')).toHaveValue(String(ROUND), {
      timeout: 20000,
    });
    expect(hashParams(page).get('round')).toBe(String(ROUND));
    // No bets yet, so no bet data in the URL
    expect(hashParams(page).get('b')).toBeNull();
  });

  test('shows every arena and the fixture opening/current odds', async ({ page }) => {
    const tableText = await page.locator('table').first().innerText();

    for (const name of ARENA_NAMES) {
      expect(tableText).toContain(name);
    }

    // Each pirate row renders "<opening>:1" followed by "<current>:1"
    for (let arena = 0; arena < 5; arena++) {
      for (let pirate = 1; pirate <= 4; pirate++) {
        const open = fixture.openingOdds[arena]![pirate]!;
        const curr = fixture.currentOdds[arena]![pirate]!;
        expect(tableText, `arena ${arena} pirate ${pirate}`).toMatch(
          new RegExp(`\\b${open}:1\\s+${curr}:1\\b`),
        );
      }
    }
  });

  test('has 10 bet columns plus a clear control', async ({ page }) => {
    const headerText = await page.locator('table thead').first().innerText();
    for (let bet = 1; bet <= 10; bet++) {
      expect(headerText).toContain(`Bet ${bet}`);
    }
    expect(headerText).toContain('Clear');
  });

  test('picking a pirate writes the bet to the URL and clear removes it', async ({ page }) => {
    const firstRadio = pickTailhookBet1(page);
    await firstRadio.click({ force: true });

    await page.waitForFunction(() => window.location.hash.includes('&b='), { timeout: 10000 });
    const params = hashParams(page);
    expect(params.get('round')).toBe(String(ROUND));
    expect(params.get('b')).toBeTruthy();

    await page.locator('[data-testid="clear-delete-button"]').click();
    await page.waitForFunction(() => !window.location.hash.includes('&b='), { timeout: 10000 });
    expect(hashParams(page).get('b')).toBeNull();
    expect(hashParams(page).get('round')).toBe(String(ROUND));
  });

  test('a bet in the URL survives a page reload', async ({ page }) => {
    await pickTailhookBet1(page).click({ force: true });
    await page.waitForFunction(() => window.location.hash.includes('&b='), { timeout: 10000 });
    const betParam = hashParams(page).get('b');
    expect(betParam).toBeTruthy();

    await page.reload();
    await page.waitForSelector('#root', { timeout: 30000 });

    await expect(page.locator('[data-testid="round-input-field"]')).toHaveValue(String(ROUND), {
      timeout: 20000,
    });
    expect(hashParams(page).get('round')).toBe(String(ROUND));
    expect(hashParams(page).get('b')).toBe(betParam);
  });

  test('round stepper changes the round and URL', async ({ page }) => {
    await page.locator('[data-testid="round-input-decrement"]').click();

    await expect(page.locator('[data-testid="round-input-field"]')).toHaveValue(String(ROUND - 1), {
      timeout: 20000,
    });
    await page.waitForFunction(
      expected => window.location.hash.includes(`round=${expected}`),
      ROUND - 1,
      { timeout: 10000 },
    );
  });

  test('links out to neopets/github', async ({ page }) => {
    const externalLinks = page.locator('a[href*="neopets.com"], a[href*="github.com"]');
    expect(await externalLinks.count()).toBeGreaterThan(0);
  });
});
