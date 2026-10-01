import { test, expect, Browser, Page } from '@playwright/test';

import { setupLocalDataMock, getReliableRound } from './test-helpers/local-data-mock';

const ROUND = getReliableRound();

async function waitForRoundLoaded(page: Page): Promise<void> {
  await page.waitForSelector('#root', { timeout: 30000 });
  await page.locator('[data-testid="round-input-field"]').waitFor({ timeout: 20000 });
  await page.waitForSelector('table', { timeout: 20000 });
}

function hashParams(url: string): URLSearchParams {
  return new URLSearchParams(new URL(url).hash.slice(1));
}

async function openFreshPage(browser: Browser, url: string): Promise<Page> {
  // A brand new context shares no cookies/storage with the sharer
  const context = await browser.newContext();
  const page = await context.newPage();
  await setupLocalDataMock(page, ROUND);
  await page.goto(url);
  return page;
}

test.describe('Share URL round trip', () => {
  test('restores round + bets from a shared URL, then persists edits across reload', async ({
    page,
    browser,
  }) => {
    // --- Sharer: build a set with amounts ---
    await setupLocalDataMock(page, ROUND);
    await page.goto(`/#round=${ROUND}`);
    await waitForRoundLoaded(page);

    const maxBetInput = page.locator('[data-testid="max-bet-input-field-input"]');
    await maxBetInput.fill('2000');
    await maxBetInput.press('Tab');

    await page.locator('[data-testid="generate-button"]').click({ force: true });
    await page.locator('[data-testid="gambit-set-menuitem"]').click({ force: true });
    await page.waitForFunction(() => window.location.hash.includes('&b='), { timeout: 30000 });
    await page.waitForFunction(() => window.location.hash.includes('&a='), { timeout: 30000 });

    const shareUrl = page.url();
    const shared = hashParams(shareUrl);
    expect(shared.get('round')).toBe(String(ROUND));
    expect(shared.get('b')).toBeTruthy();
    expect(shared.get('a')).toBeTruthy();

    // --- Recipient: fresh context loads the shared URL ---
    const recipient = await openFreshPage(browser, shareUrl);
    try {
      await waitForRoundLoaded(recipient).catch(async () => {
        // Shared URLs with bets open in view mode, which may not render the editor table
        await recipient.locator('[data-testid="round-input-field"]').waitFor({ timeout: 20000 });
      });

      await expect(recipient.locator('[data-testid="round-input-field"]')).toHaveValue(
        String(ROUND),
      );
      const restored = hashParams(recipient.url());
      expect(restored.get('round')).toBe(String(ROUND));
      expect(restored.get('b')).toBe(shared.get('b'));
      expect(restored.get('a')).toBe(shared.get('a'));

      // Shared bets open in view mode; switch to edit mode to change them
      await recipient.getByRole('button', { name: /Edit these bets/ }).click();
      const amountInput = recipient.locator('[data-testid="bet-amount-input-1"]');
      await amountInput.waitFor({ state: 'visible', timeout: 20000 });
      const originalAmount = await amountInput.inputValue();
      expect(originalAmount).not.toBe('');

      // --- Edit a bet amount ---
      const newAmount = originalAmount === '5000' ? '6000' : '5000';
      await amountInput.fill(newAmount);
      await amountInput.press('Tab');
      await recipient.waitForFunction(
        previous => new URLSearchParams(window.location.hash.slice(1)).get('a') !== previous,
        shared.get('a'),
        { timeout: 10000 },
      );

      const edited = hashParams(recipient.url());
      expect(edited.get('round')).toBe(String(ROUND));
      expect(edited.get('b')).toBe(shared.get('b')); // bets themselves unchanged
      expect(edited.get('a')).not.toBe(shared.get('a'));
      await expect(amountInput).toHaveValue(newAmount);

      // --- Reload: the edit persists via the URL ---
      const editedUrl = recipient.url();
      await recipient.reload();
      await recipient.locator('[data-testid="round-input-field"]').waitFor({ timeout: 20000 });
      await expect(recipient.locator('[data-testid="round-input-field"]')).toHaveValue(
        String(ROUND),
      );
      expect(recipient.url()).toBe(editedUrl);

      await recipient.getByRole('button', { name: /Edit these bets/ }).click();
      const reloadedInput = recipient.locator('[data-testid="bet-amount-input-1"]');
      await reloadedInput.waitFor({ state: 'visible', timeout: 20000 });
      await expect(reloadedInput).toHaveValue(newAmount);
    } finally {
      await recipient.context().close();
    }
  });
});
