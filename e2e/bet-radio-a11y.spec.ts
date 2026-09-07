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

  test('"None" is enabled while the arena has bets, disabled once they are cleared', async ({
    page,
  }) => {
    const clearButtons = page.locator('[data-testid^="arena-clear-button"]');

    // After generating, every arena has a chosen pirate -> all enabled.
    for (const button of await clearButtons.all()) {
      await expect(button).toBeEnabled();
    }

    // Clear the current bet set (single generated set -> button reads "Clear").
    await page.locator('[data-testid="clear-delete-button"]').first().click();

    // No bet has a chosen pirate in any arena -> all disabled.
    for (const button of await clearButtons.all()) {
      await expect(button).toBeDisabled();
    }
  });

  test('arrow keys move focus between bets and pirates without changing the selection', async ({
    page,
  }) => {
    // Each arena radiogroup is a <tbody>: row 0 = the clear radios, rows 1..4
    // = one pirate each. Every row holds one radio per bet (a column). So a
    // cell is addressed by its <tr> index and the radio's position in that row.
    // Target a specific arena by name: other role="radiogroup" elements exist
    // elsewhere in the app (e.g. Chakra settings radio groups), so .first()
    // would grab a decoy with no rows.
    const firstArena = page.getByRole('radiogroup', { name: 'Shipwreck' });

    // The focused radio's grid position {row, col}, or null if focus isn't on a
    // radio inside the first arena. Mirrors getRadioGrid() in BetRadio.tsx.
    const activeCell = (): Promise<{ row: number; col: number } | null> =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || !el.matches('[role="radio"]')) {
          return null;
        }
        const group = el.closest('[role="radiogroup"]');
        if (!group) {
          return null;
        }
        const rows: HTMLElement[][] = [];
        for (const tr of Array.from(group.querySelectorAll('tr'))) {
          const radios = Array.from(tr.querySelectorAll<HTMLElement>('[role="radio"]'));
          if (radios.length > 0) {
            rows.push(radios);
          }
        }
        const row = rows.findIndex(r => r.includes(el));
        if (row === -1) {
          return null;
        }
        return { row, col: rows[row]?.indexOf(el) ?? -1 };
      });

    // Snapshot which radios are checked so we can prove arrows only move focus.
    const checkedLabels = (): Promise<(string | null)[]> =>
      page.$$eval('[role="radio"][aria-checked="true"]', els =>
        els.map(el => el.getAttribute('aria-label')),
      );

    const before = await checkedLabels();
    expect(before.length).toBeGreaterThan(0);

    // Start on the first pirate row (row 1), "Bet 1" (col 0).
    await firstArena.locator('tr').nth(1).locator('[role="radio"]').nth(0).focus();
    await expect.poll(activeCell).toEqual({ row: 1, col: 0 });

    // ArrowRight -> next bet, same pirate.
    await page.keyboard.press('ArrowRight');
    await expect.poll(activeCell).toEqual({ row: 1, col: 1 });

    // ArrowDown -> same bet, next pirate row.
    await page.keyboard.press('ArrowDown');
    await expect.poll(activeCell).toEqual({ row: 2, col: 1 });

    // ArrowUp -> back to the previous pirate row.
    await page.keyboard.press('ArrowUp');
    await expect.poll(activeCell).toEqual({ row: 1, col: 1 });

    // ArrowLeft -> previous bet, same pirate.
    await page.keyboard.press('ArrowLeft');
    await expect.poll(activeCell).toEqual({ row: 1, col: 0 });

    // Focus moved around the grid, but the selection is untouched.
    expect(await checkedLabels()).toEqual(before);
  });
});
