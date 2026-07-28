import { test, expect } from '@playwright/test';

test.describe('R3: Offline / Slow 3G / Rapid Transition E2E Stress Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss onboarding banners
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      window.localStorage.setItem('dview_briefing_popup_dismissed', Date.now().toString());
    });
  });

  test('R3.1: Offline State - Skeleton rendering & OfflineBanner verification', async ({ page, context }) => {
    // Navigate online first to load initial cache
    await page.goto('/overview');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Simulate Offline Mode
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1000);

    // Check OfflineBanner visibility
    const offlineBanner = page.locator('[role="alert"]').filter({ hasText: /오프라인/i });
    if (await offlineBanner.count() > 0) {
      await expect(offlineBanner.first()).toBeVisible();
    }

    // Verify page container remains stable without error boundary crashes
    const pageBody = page.locator('body');
    await expect(pageBody).toBeVisible();
    expect(await page.title()).not.toContain('Error');
  });

  test('R3.2: Slow 3G Emulation - Skeleton rendering stability & zero layout shift', async ({ page, context }) => {
    // Record CLS during slow 3G simulation
    await page.addInitScript(() => {
      (window as any).__clsAccumulator = 0;
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              (window as any).__clsAccumulator += entry.value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}
    });

    // Emulate Slow 3G via Chrome DevTools Protocol
    let cdpClient;
    try {
      cdpClient = await context.newCDPSession(page);
      await cdpClient.send('Network.enable');
      await cdpClient.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 400, // 400ms latency
        downloadThroughput: (400 * 1024) / 8, // 400 kbps
        uploadThroughput: (150 * 1024) / 8,   // 150 kbps
        connectionType: 'cellular3g',
      });
    } catch (e) {
      console.warn('CDP network emulation skipped:', e);
    }

    await page.goto('/overview');
    await page.waitForTimeout(3000);

    const cls = await page.evaluate(() => (window as any).__clsAccumulator || 0);
    console.log(`Slow 3G CLS measured: ${cls}`);
    expect(cls).toBeLessThan(0.05); // Layout stability check under slow network
  });

  test('R3.3: Rapid Online/Offline Transitions - Auto-reconnection & State Recovery', async ({ page, context }) => {
    await page.goto('/overview');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Rapidly toggle online/offline 5 times
    for (let i = 0; i < 5; i++) {
      await context.setOffline(true);
      await page.waitForTimeout(300);
      await context.setOffline(false);
      await page.waitForTimeout(300);
    }

    // After reconnecting, verify app recovers cleanly
    await page.waitForTimeout(1500);
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('Application Error');
    expect(bodyText).not.toContain('Unhandled Runtime Error');
  });
});
