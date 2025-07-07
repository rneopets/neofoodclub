import { test, expect } from '@playwright/test';

import { setupLocalDataMock } from './test-helpers/local-data-mock';

test.describe('Basic App Tests', () => {
  test('should load the app', async ({ page }) => {
    // Set up local data mocking before navigation
    await setupLocalDataMock(page);

    await page.goto('/');

    // Wait for the page to load with a very long timeout
    await page.waitForLoadState('domcontentloaded');

    // Check that the title is correct
    await expect(page).toHaveTitle('NeoFoodClub');

    // Check that the #root element exists
    await expect(page.locator('#root')).toBeAttached();
  });

  test('should have interactive elements', async ({ page }) => {
    // Set up local data mocking before navigation
    await setupLocalDataMock(page);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for interactive elements that are actually visible (not hidden by responsive design)
    const visibleInteractiveElements = page.locator(
      'button:visible, input:visible, a:visible, select:visible',
    );
    await visibleInteractiveElements.first().waitFor({ timeout: 30000 });

    const count = await visibleInteractiveElements.count();
    expect(count).toBeGreaterThan(0);
  });
});
