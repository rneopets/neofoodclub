import { test, expect } from '@playwright/test';

import { setupLocalDataMock } from './test-helpers/local-data-mock';

test.describe('Bet userscript', () => {
  test.beforeEach(async ({ page }) => {
    await setupLocalDataMock(page);
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 30000 });
  });

  test('shows a banner that cannot be dismissed', async ({ page }) => {
    const banner = page.getByTestId('userscript-banner');
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('button')).toHaveCount(1);
    await expect(banner.getByRole('link', { name: /install the userscript/i })).toHaveAttribute(
      'href',
      '/scripts/neofoodclub.user.js',
    );
    await expect(banner.getByRole('button', { name: /close|dismiss/i })).toHaveCount(0);
  });

  test('opens the modal from the banner', async ({ page }) => {
    await page.getByRole('button', { name: /what\? why\?/i }).click();

    const modal = page.getByTestId('userscript-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('link', { name: /install the userscript/i })).toHaveAttribute(
      'href',
      '/scripts/neofoodclub.user.js',
    );
  });

  test('opens the modal from the footer link', async ({ page }) => {
    await page.getByTestId('userscript-footer-link').click();

    await expect(page.getByTestId('userscript-modal')).toBeVisible();
  });

  test('serves the userscript at the install URL', async ({ page }) => {
    const response = await page.request.get('/scripts/neofoodclub.user.js');

    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('==UserScript==');
    expect(body).toContain('@downloadURL  https://neofood.club/scripts/neofoodclub.user.js');
  });
});
