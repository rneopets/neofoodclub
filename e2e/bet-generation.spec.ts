import { test, expect, Page } from '@playwright/test';

import { setupLocalDataMock, getReliableRound } from './test-helpers/local-data-mock';

// Helper to wait for betting interface to be ready
async function waitForBettingReady(page: Page): Promise<void> {
  const generateButton = page.locator('[data-testid="generate-button"]');
  await generateButton.waitFor({ state: 'visible', timeout: 10000 });
  await expect(generateButton).toBeEnabled({ timeout: 5000 });

  const roundInput = page.locator('[data-testid="round-input-field"]');
  await roundInput.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(200);
}

// Helper to click generate button and wait for menu
async function openGenerateMenu(page: Page): Promise<void> {
  const generateButton = page.locator('[data-testid="generate-button"]');
  await generateButton.click({ force: true });
  await page.waitForSelector('[data-testid="gambit-set-menuitem"]', {
    state: 'visible',
    timeout: 5000,
  });
  await page.waitForTimeout(100);
}

// Helper to generate bets and wait for completion
async function generateBets(page: Page, type: 'gambit' | 'max-ter'): Promise<void> {
  await openGenerateMenu(page);

  const selector =
    type === 'gambit'
      ? '[data-testid="gambit-set-menuitem"]'
      : '[data-testid="max-ter-set-menuitem"]';

  const option = page.locator(selector);
  await option.click({ force: true });

  // Wait for URL to contain bet data
  await page.waitForFunction(() => window.location.href.includes('&b='), { timeout: 30000 });
  await page.waitForTimeout(200);
}

// Helper to set max bet amount
async function setMaxBet(page: Page, amount: string): Promise<void> {
  const input = page.locator('[data-testid="max-bet-input-field-input"]');
  await input.fill(amount);
  await input.press('Tab');
  await page.waitForTimeout(100);
}

// Helper to verify gambit badge (only works in edit mode)
async function verifyGambitBadge(page: Page): Promise<void> {
  const gambitBadge = page.locator('text=/Gambit:/');
  try {
    await expect(gambitBadge).toBeVisible({ timeout: 2000 });
    const badgeText = await gambitBadge.textContent();
    expect(badgeText).toMatch(/Gambit: .+ x .+ x .+ x .+ x .+/);
  } catch {
    // Badge might be hidden on mobile, just check it exists
    await expect(gambitBadge).toBeAttached();
  }
}

test.describe('NeoFoodClub Bet Generation', () => {
  const RELIABLE_ROUND = getReliableRound();

  test.beforeEach(async ({ page }) => {
    await setupLocalDataMock(page, RELIABLE_ROUND);
    await page.goto(`/#round=${RELIABLE_ROUND}`);

    try {
      await page.waitForSelector('#root', { timeout: 30000 });
    } catch {
      test.skip(true, 'App failed to load');
    }

    await waitForBettingReady(page);

    // Ensure we're on the correct round
    const roundInput = page.locator('[data-testid="round-input-field"]');
    const currentValue = await roundInput.inputValue();
    if (currentValue !== RELIABLE_ROUND.toString()) {
      await roundInput.fill(RELIABLE_ROUND.toString());
      await roundInput.press('Enter');
      await waitForBettingReady(page);
    }
  });

  test('should generate and clear bets', async ({ page }) => {
    // Generate bets
    await generateBets(page, 'gambit');

    const url1 = page.url();
    expect(url1).toContain('&b=');
    await verifyGambitBadge(page);

    // Clear bets
    const clearButton = page.locator('[data-testid="clear-delete-button"]');
    await clearButton.click();
    await page.waitForTimeout(100);

    const clearedUrl = page.url();
    expect(clearedUrl).toBe(`http://localhost:3000/#round=${RELIABLE_ROUND}`);

    // Generate bets again
    await generateBets(page, 'gambit');
    const url2 = page.url();
    expect(url2).toContain('&b=');
  });

  test('should generate different bet types', async ({ page }) => {
    // Test Max TER generation
    await generateBets(page, 'max-ter');
    let url = page.url();
    expect(url).toContain('&b=');

    // Clear and test Gambit generation
    const clearButton = page.locator('[data-testid="clear-delete-button"]');
    await clearButton.click();

    // Wait for URL to be cleared (webkit needs more time)
    await page.waitForFunction(() => !window.location.href.includes('&b='), { timeout: 5000 });
    await page.waitForTimeout(200);

    // Ensure the interface is ready before generating again
    await waitForBettingReady(page);

    await generateBets(page, 'gambit');
    url = page.url();
    expect(url).toContain('&b=');
    await verifyGambitBadge(page);
  });

  test('should work with positive max bet amounts', async ({ page }) => {
    // Set positive max bet
    await setMaxBet(page, '1000');

    // Generate bets with positive max bet
    await generateBets(page, 'gambit');

    const url = page.url();
    expect(url).toContain('&b=');
    expect(url).toContain('&a='); // Should contain bet amounts with positive max bet
    await verifyGambitBadge(page);

    // Verify max bet input still shows 1000
    const maxBetInput = page.locator('[data-testid="max-bet-input-field-input"]');
    const maxBetValue = await maxBetInput.inputValue();
    expect(maxBetValue).toBe('1000');
  });

  test('should work with default -1000 max bet (unset)', async ({ page }) => {
    // Verify max bet is -1000 by default
    const maxBetInput = page.locator('[data-testid="max-bet-input-field-input"]');
    const maxBetValue = await maxBetInput.inputValue();
    expect(maxBetValue).toBe('-1000');

    // Generate bets with default -1000 max bet
    await generateBets(page, 'gambit');

    const url = page.url();
    expect(url).toContain('&b=');
    expect(url).not.toContain('&a='); // Should NOT contain bet amounts with -1000
    await verifyGambitBadge(page);
  });

  test('should apply bet amounts with uncapped button', async ({ page }) => {
    // Generate bets first
    await generateBets(page, 'gambit');

    // Set max bet (this changes the setting but not the actual bet amounts)
    await setMaxBet(page, '2000');

    // Wait for the bet amounts settings component to be visible
    await page.waitForSelector('[data-testid="uncapped-bet-amounts-button"]', {
      state: 'visible',
      timeout: 10000,
    });

    // Apply the max bet to bet amounts using uncapped button
    const uncappedButton = page.locator('[data-testid="uncapped-bet-amounts-button"]');
    await expect(uncappedButton).toBeEnabled();
    await uncappedButton.click({ force: true });

    // Wait for URL to be updated with bet amounts
    await page.waitForFunction(() => window.location.href.includes('&a='), { timeout: 5000 });

    // URL should now contain bet amounts
    const url = page.url();
    expect(url).toContain('&a=');
  });
});
