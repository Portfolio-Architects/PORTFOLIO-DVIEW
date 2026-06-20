import { test, expect } from '@playwright/test';

test.use({ 
  viewport: { width: 375, height: 812 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
  hasTouch: true,
  isMobile: true
});

test.describe('Routing Bug Diagnosis', () => {
  test('MOBILE: should navigate from news page to curation page correctly via MobileDock', async ({ page }) => {
    // Enable browser console logging
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}`));

    // Dismiss welcome modal and ad block banner using localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    });

    // Navigate to /news directly (no notice query param first)
    console.log('Navigating to /news on mobile');
    await page.goto('/news');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // wait for hydration

    console.log('Current URL on News page:', page.url());

    // Locate the "큐레이션" tab in the MobileDock
    const curationNav = page.locator('nav.fixed.bottom-0 a, nav.fixed.bottom-0 button').filter({ hasText: '큐레이션' }).first();
    await expect(curationNav).toBeVisible();

    console.log('Clicking Curation tab in MobileDock...');
    await curationNav.click();

    // Wait for navigation and hydration
    await page.waitForTimeout(3000);
    console.log('URL after clicking Curation:', page.url());

    // Let's check which section is visible on the home page.
    const curationHeader = page.locator('h1', { hasText: 'D-VIEW 단지 큐레이션' }).or(page.locator('h2', { hasText: '초품아 큐레이션' })).first();
    const loungeHeader = page.locator('h1', { hasText: 'D-VIEW 라운지' }).first();

    const isCurationVisible = await curationHeader.isVisible();
    const isLoungeVisible = await loungeHeader.isVisible();

    console.log('Is Curation visible?', isCurationVisible);
    console.log('Is Lounge visible?', isLoungeVisible);

    expect(isCurationVisible).toBe(true);
    expect(isLoungeVisible).toBe(false);
  });

  test('MOBILE: should navigate from news page WITH notice query param to curation page correctly via MobileDock', async ({ page }) => {
    // Enable browser console logging
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}`));

    // Dismiss welcome modal and ad block banner using localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    });

    // Navigate to /news?notice=some-notice-id
    console.log('Navigating to /news?notice=some-notice-id on mobile');
    await page.goto('/news?notice=some-notice-id');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // wait for hydration

    console.log('Current URL on News page:', page.url());

    // Locate the "큐레이션" tab in the MobileDock
    const curationNav = page.locator('nav.fixed.bottom-0 a, nav.fixed.bottom-0 button').filter({ hasText: '큐레이션' }).first();
    await expect(curationNav).toBeVisible();

    console.log('Clicking Curation tab in MobileDock...');
    await curationNav.click();

    // Wait for navigation and hydration
    await page.waitForTimeout(3000);
    console.log('URL after clicking Curation:', page.url());

    // Let's check which section is visible on the home page.
    const curationHeader = page.locator('h1', { hasText: 'D-VIEW 단지 큐레이션' }).or(page.locator('h2', { hasText: '초품아 큐레이션' })).first();
    const loungeHeader = page.locator('h1', { hasText: 'D-VIEW 라운지' }).first();

    const isCurationVisible = await curationHeader.isVisible();
    const isLoungeVisible = await loungeHeader.isVisible();

    console.log('Is Curation visible?', isCurationVisible);
    console.log('Is Lounge visible?', isLoungeVisible);

    expect(isCurationVisible).toBe(true);
    expect(isLoungeVisible).toBe(false);
  });
});
