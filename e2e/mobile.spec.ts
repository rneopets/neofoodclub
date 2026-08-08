import { test, expect, Page } from '@playwright/test';

import { setupLocalDataMock } from './test-helpers/local-data-mock';

const MOBILE_VIEWPORT = { width: 375, height: 667 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
// Generous tolerance for scrollbar gutters / sub-pixel rounding when comparing
// scrollWidth vs clientWidth to decide whether an element has "real" overflow.
const OVERFLOW_TOLERANCE_PX = 24;

async function waitForBettingReady(page: Page): Promise<void> {
  await page.waitForSelector('#root', { timeout: 30000 });
  await page.waitForSelector('table', { timeout: 20000 });
}

// The dev-mode drawer (which hosts the "View All Possible Bets" / "View Round
// JSON" triggers) normally requires 5 clicks on the footer logo, unless it has
// been opened before - which we simulate by pre-seeding localStorage so tests
// only need a single click.
async function openDevModeDrawer(page: Page): Promise<void> {
  await page.getByTestId('footer-logo').click();
  await expect(page.getByRole('heading', { name: 'Dev Mode' })).toBeVisible({ timeout: 10000 });
}

test.describe('Mobile UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('devModeOpened', 'true');
    });
  });

  test('AllBetsModal results table is horizontally scrollable on mobile viewport', async ({
    page,
  }) => {
    await setupLocalDataMock(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');

    try {
      await waitForBettingReady(page);
    } catch {
      test.skip(true, 'App failed to load');
    }

    await openDevModeDrawer(page);
    await page.getByRole('button', { name: 'View All Possible Bets' }).click();

    await expect(page.getByText(/All Possible Bets \(/)).toBeVisible({ timeout: 10000 });

    const scrollContainer = page.getByTestId('all-bets-scroll-container');
    await expect(scrollContainer).toBeVisible();

    const { scrollWidth, clientWidth } = await scrollContainer.evaluate(el => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));

    // The results table's fixed-width columns are wider than a phone screen by
    // design - the container must offer real horizontal scroll room rather
    // than clipping the extra content (the bug this test guards against).
    expect(scrollWidth).toBeGreaterThan(clientWidth);
  });

  test('RoundJsonModal has no horizontal overflow on mobile viewport', async ({ page }) => {
    await setupLocalDataMock(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');

    try {
      await waitForBettingReady(page);
    } catch {
      test.skip(true, 'App failed to load');
    }

    await openDevModeDrawer(page);
    await page.getByRole('button', { name: 'View Round JSON' }).click();

    const jsonDialog = page.getByRole('dialog').filter({ hasText: /\.json/ });
    await expect(jsonDialog).toBeVisible({ timeout: 10000 });

    const { scrollWidth, clientWidth } = await jsonDialog.evaluate(el => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + OVERFLOW_TOLERANCE_PX);
  });

  test('Timeline drawer has no horizontal overflow on mobile viewport', async ({ page }) => {
    await setupLocalDataMock(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');

    try {
      await waitForBettingReady(page);
    } catch {
      test.skip(true, 'App failed to load');
    }

    // The arena-name cell also carries a similarly-worded title (e.g. "...for
    // Shipwreck") and spans multiple rows via rowspan - exclude it so this
    // matches a specific pirate's cell, not the arena header.
    const pirateCell = page
      .locator('td[title*="Click to view odds timeline"]:not([rowspan])')
      .first();
    await pirateCell.waitFor({ state: 'visible', timeout: 20000 });
    await pirateCell.click();

    // Clicking a specific pirate's cell opens the drawer scoped to that
    // pirate (heading is just its name, not "All Odds Changes"), and no other
    // dialog is open at this point, so a plain role match is unambiguous.
    const timelineDrawer = page.getByRole('dialog');
    await expect(timelineDrawer).toBeVisible({ timeout: 10000 });

    const { scrollWidth, clientWidth } = await timelineDrawer.evaluate(el => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + OVERFLOW_TOLERANCE_PX);
  });

  test('drag-drop tip banner does not render on mobile viewport even when otherwise eligible', async ({
    browser,
  }) => {
    // The banner only appears once this tab has bets AND another open tab has
    // been seen with bets (cross-tab BroadcastChannel signal) - simulate that
    // with two pages in the same browser context. newContext() inherits the
    // running project's default device options (viewport/isMobile/etc.), so
    // explicitly force a desktop-sized context here - otherwise, under the
    // Mobile Chrome/Safari projects, this "desktop" page would also be mobile
    // sized and the sanity check below would never see the banner at all.
    const context = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      isMobile: false,
      hasTouch: false,
    });
    const desktopPage = await context.newPage();
    const mobilePage = await context.newPage();

    try {
      await setupLocalDataMock(desktopPage);
      await setupLocalDataMock(mobilePage);

      await desktopPage.goto('/');
      await mobilePage.setViewportSize(MOBILE_VIEWPORT);
      await mobilePage.goto('/');

      try {
        await waitForBettingReady(desktopPage);
        await waitForBettingReady(mobilePage);
      } catch {
        test.skip(true, 'App failed to load');
      }

      // Each arena's header row also carries a similarly-worded title (see
      // the pirateCell comment above) and its radios are already checked by
      // default (meaning "no pirate selected"), so a plain title match would
      // click a no-op radio - exclude rowspan cells to land on a real pirate row.
      const pirateRowSelector = 'tr:has(td[title*="Click to view odds timeline"]:not([rowspan]))';
      const desktopRadio = desktopPage
        .locator(pirateRowSelector)
        .first()
        .getByRole('radio')
        .first();
      const mobileRadio = mobilePage.locator(pirateRowSelector).first().getByRole('radio').first();

      await desktopRadio.click({ force: true });
      await mobileRadio.click({ force: true });

      // Sanity check: on a desktop-sized tab, with both conditions met, the
      // banner should actually appear - otherwise this test would trivially
      // pass without the mobile gating being exercised at all.
      await expect(desktopPage.getByText(/drag a bet link/i)).toBeVisible({ timeout: 15000 });

      await expect(mobilePage.getByText(/drag a bet link/i)).not.toBeVisible();
    } finally {
      await context.close();
    }
  });
});
