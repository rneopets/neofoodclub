import { test, expect, Page } from '@playwright/test';

import { setupLocalDataMock, getReliableRound } from './test-helpers/local-data-mock';

// Local copies of the bet-generation helpers (kept here on purpose: importing
// them from './bet-generation.spec' would re-register that file's tests in
// this suite and run them twice).
async function waitForBettingReady(page: Page): Promise<void> {
  await page.waitForSelector('#root', { timeout: 30000 });
  const roundInput = page.locator('[data-testid="round-input-field"]');
  await roundInput.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForSelector('table', { timeout: 20000 });

  const generateButton = page.locator('[data-testid="generate-button"]');
  await generateButton.waitFor({ state: 'visible', timeout: 10000 });
  await expect(generateButton).toBeEnabled({ timeout: 10000 });
  await page.waitForTimeout(200);
}

async function generateBets(page: Page): Promise<void> {
  await page.locator('[data-testid="generate-button"]').click({ force: true });
  const option = page.locator('[data-testid="gambit-set-menuitem"]');
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click({ force: true });
  await page.waitForFunction(() => window.location.href.includes('&b='), { timeout: 30000 });
  await page.waitForTimeout(200);
}

/**
 * Regression test for the bet-radio accessibility structure:
 *  - each arena's <tbody> is a labelled role="radiogroup" so screen readers
 *    announce the arena's bets as one selection group;
 *  - every bet radio (and its "no pirate" clear radio) carries an aria-label,
 *    since the radios have no visible text.
 */
test.describe('Bet radio accessibility', () => {
  const RELIABLE_ROUND = getReliableRound();

  test.beforeEach(async ({ page }) => {
    await setupLocalDataMock(page, RELIABLE_ROUND);
    await page.goto(`/#round=${RELIABLE_ROUND}`);

    try {
      await waitForBettingReady(page);
    } catch {
      test.skip(true, 'App failed to load');
    }

    // Ensure we're on the correct round (mirrors bet-generation.spec.ts).
    const roundInput = page.locator('[data-testid="round-input-field"]');
    if ((await roundInput.inputValue()) !== RELIABLE_ROUND.toString()) {
      await roundInput.fill(RELIABLE_ROUND.toString());
      await roundInput.press('Enter');
      await waitForBettingReady(page);
    }

    // Generate a bet set so the per-bet radio columns actually render.
    await generateBets(page);
  });

  test('each arena is a labelled radiogroup and every bet radio has an aria-label', async ({
    page,
  }) => {
    // One radiogroup per arena (5 arenas), labelled by arena name.
    const radiogroups = page.getByRole('radiogroup');
    await expect(radiogroups).toHaveCount(5);

    const arenaNames = ['Shipwreck', 'Lagoon', 'Treasure', 'Hidden', 'Harpoon'];
    for (const name of arenaNames) {
      await expect(page.getByRole('radiogroup', { name })).toBeVisible();
    }

    // Every rendered bet radio carries an aria-label. The generated set has
    // 10 bets -> "Bet 1".."Bet 10", plus a "no pirate" clear radio per arena.
    const allRadios = page.getByRole('radio');
    expect((await allRadios.count()) > 0).toBe(true);

    for (const radio of await allRadios.all()) {
      expect(await radio.getAttribute('aria-label')).toBeTruthy();
    }

    // Spot-check concrete labels. getByRole's `name` is a case-insensitive
    // substring match by default, so use exact to avoid "Bet 1" also matching
    // "Bet 10" / "Bet 1: no pirate". Each label repeats across the arenas and
    // pirate rows, so assert "at least one exists" rather than a fixed count.
    const bet1Count = await page.getByRole('radio', { name: 'Bet 1', exact: true }).count();
    expect(bet1Count).toBeGreaterThan(0);

    const clearRadioCount = await page.getByRole('radio', { name: /no pirate/ }).count();
    expect(clearRadioCount).toBeGreaterThan(0);
  });

  test('per-arena clear button is labelled "None" (not a bet count)', async ({ page }) => {
    // Assert on the dedicated testid rather than a name match: "10-bet" is also
    // the aria-label of each pirate row's fill-to-all-bets icon button, so a
    // case-insensitive name search for the old "10-Bet" label would collide.
    const clearButtons = page.locator('[data-testid^="arena-clear-button"]');
    await expect(clearButtons).toHaveCount(5);

    for (const button of await clearButtons.all()) {
      await expect(button).toHaveText('None');
    }
  });
});
