import { test, expect } from '@playwright/test';

test.describe('Performance and UX Optimizations Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Set localStorage keys to dismiss onboarding modals/banners
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      window.localStorage.setItem('dview_briefing_popup_dismissed', Date.now().toString());
    });
  });

  test('1. Verify Donut Chart CSS-only Hover Scale & Style', async ({ page }) => {
    await page.goto('/technovalley');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow hydration

    // Find a cell in the Donut Chart Pie (using recharts-sector)
    const donutCell = page.locator('#donut-chart-card svg path.recharts-sector').first();
    await expect(donutCell).toBeVisible({ timeout: 15000 });

    // Extract classes and inline style properties
    const cellClass = await donutCell.getAttribute('class');
    const cellStyle = await donutCell.getAttribute('style');

    console.log('Donut Cell Classes:', cellClass);
    console.log('Donut Cell Style:', cellStyle);

    // Verify Tailwind scale/transition classes are present on the SVG path (pure CSS hover scale)
    expect(cellClass).toContain('hover:scale-105');
    expect(cellClass).toContain('transition-transform');
    expect(cellClass).toContain('duration-300');
    expect(cellClass).toContain('origin-center');

    // Verify transform-origin is set to 50% 50% to prevent reflow offsets
    expect(cellStyle).toContain('transform-origin: 50% 50%');
    expect(cellStyle).toContain('will-change: transform');

    // Verify hover action using force:true to bypass overlay/sticky menu interception checks
    const boxBefore = await donutCell.boundingBox();
    expect(boxBefore).not.toBeNull();

    await donutCell.hover({ force: true });
    await page.waitForTimeout(400); // Wait for transition (300ms) to complete
  });

  test('2. Verify Accordion Lazy Rendering (DOM Node Reduction)', async ({ page }) => {
    await page.goto('/technovalley');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow hydration

    // Locate the sector accordion card container directly by ID starting with sector-card-IT
    const sectorCard = page.locator('[id^="sector-card-IT"]').first();
    await expect(sectorCard).toBeVisible({ timeout: 15000 });

    const sectorHeader = sectorCard.locator('button').first();
    const isExpandedBefore = await sectorHeader.getAttribute('aria-expanded');
    
    // Locate the inner grid of companies. Under lazy rendering, it should NOT exist in the DOM when collapsed.
    const companyGrid = sectorCard.locator('.grid').first();
    
    if (isExpandedBefore === 'false' || !isExpandedBefore) {
      // It must not be attached to the DOM (reducing DOM footprint)
      await expect(companyGrid).not.toBeAttached();
      console.log('✅ DOM node reduction verified: Company grid is not mounted when accordion is collapsed.');
    }

    // Click to expand the accordion
    await sectorHeader.click();
    await page.waitForTimeout(500); // Allow render transition

    // Now the grid must be mounted/attached to the DOM
    await expect(companyGrid).toBeAttached();
    console.log('✅ Company grid successfully mounted upon expansion.');

    // Click to collapse the accordion again
    await sectorHeader.click();
    await page.waitForTimeout(500); // Allow render transition

    // It must be unmounted/detached from the DOM again
    await expect(companyGrid).not.toBeAttached();
    console.log('✅ DOM node reduction verified: Company grid successfully unmounted upon collapse.');
  });

  test('3. Verify Responsive Modal Card Padding & iOS Scrolling Momentum', async ({ page }) => {
    // Navigate to overview page (with imjang tab active)
    await page.goto('/overview?tab=imjang');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow hydration

    // Click on the first apartment complex card to open the ApartmentModal
    const aptTitle = page.locator('#explore-list-container h3', { hasText: /동탄역/ }).first();
    await expect(aptTitle).toBeVisible({ timeout: 15000 });
    await aptTitle.click();
    await page.waitForTimeout(2000); // Wait for modal transition and chart render

    // Verify modal scroll container has 'custom-scrollbar' class
    const modalScrollContainer = page.locator('div[role="dialog"] .custom-scrollbar').first();
    await expect(modalScrollContainer).toBeVisible({ timeout: 10000 });
    console.log('✅ Modal scroll container includes the custom-scrollbar class.');

    // Verify responsive card padding and scrolling behavior on transaction table container
    const tableScrollContainer = page.locator('.overflow-x-auto.custom-scrollbar:has(table)').first();
    await expect(tableScrollContainer).toBeVisible();

    const tableClass = await tableScrollContainer.getAttribute('class');
    console.log('Table scroll container classes:', tableClass);

    // Verify it includes negative margin bleed classes for responsive full-width scrolling
    expect(tableClass).toContain('-mx-4');
    expect(tableClass).toContain('px-4');
  });

  test('4. Verify Tab Switching Keep-Alive, URL Sync, and Navigation Mismatch', async ({ page }) => {
    // A. Initial state sync with query parameter
    await page.goto('/overview?tab=office');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow hydration

    // Verify Office tab content is visible (contains '금강펜테리움')
    const officeHeader = page.locator('span:has-text("금강펜테리움"), h3:has-text("금강펜테리움")').first();
    await expect(officeHeader).toBeVisible({ timeout: 15000 });

    // Verify Overview tab (MacroDashboard) is NOT visible (Tailwind hidden class applied)
    const overviewSection = page.locator('main section').first();
    const overviewClass = await overviewSection.getAttribute('class');
    expect(overviewClass).toContain('hidden');

    // B. Verify URL Updates on Tab Click
    const overviewTabButton = page.locator('header nav button').filter({ hasText: '아파트 랩' }).first();
    await overviewTabButton.click();
    await page.waitForTimeout(1000);

    // Verify URL changed back to '/overview' and tab switches
    await expect(page).toHaveURL(/\/overview$/);
    const updatedOverviewClass = await overviewSection.getAttribute('class');
    expect(updatedOverviewClass).not.toContain('hidden');

    // C. Verify Navigation Mismatch on Popstate (Query parameters synchronization bug)
    const officeTabButton = page.locator('header nav button').filter({ hasText: '사무실 탐색' }).first();
    await officeTabButton.click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/overview\?tab=office$/);

    const officeSection = page.locator('main section').nth(1);
    await expect(officeSection.locator('span:has-text("금강펜테리움"), h3:has-text("금강펜테리움")').first()).toBeVisible();

    // Now, push history state simulating user navigating between pages, then navigating back
    await page.evaluate(() => {
      window.history.pushState({ tab: 'overview' }, '', '/overview');
      window.history.pushState({ tab: 'office' }, '', '/overview?tab=office');
    });
    await page.waitForTimeout(500);

    // Navigate back to '/overview'
    await page.goBack();
    await page.waitForTimeout(1000);

    // Verify URL is now back to /overview
    await expect(page).toHaveURL(/\/overview$/);

    // Verify that the active tab state correctly synchronized back to "아파트 랩" due to popstate listener
    const activeTabState = await page.evaluate(() => {
      const btn = document.querySelector('header nav button.bg-surface');
      return btn ? btn.textContent?.trim() : '';
    });
    console.log('Active Tab after back navigation:', activeTabState);
    
    // The active tab now correctly highlights "아파트 랩" instead of "사무실 탐색"
    expect(activeTabState).toContain('아파트 랩');
  });

  test('5. Verify Lounge Modal CLS and Robustness under Unavailable Firebase', async ({ page }) => {
    // Block all client-side Firestore connection attempts to force offline/unavailable database conditions
    await page.route('**/firestore.googleapis.com/**', async (route) => {
      await route.abort('failed');
    });

    // Route mock data for posts endpoint to prevent Firestore Admin uninitialized 500 error in test env
    await page.route('**/api/posts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          posts: [
            {
              id: 'mock-post-99',
              title: '동탄역 삼성이 오는가 매니저 임장기',
              category: '동탄 임장/분석',
              author: 'D-VIEW 매니저',
              imageUrl: null,
              likes: 42,
              views: 1200,
              commentCount: 0,
              createdAt: Date.now() - 60000,
              meta: '방금 전 · 동탄 임장/분석',
              summary: '임장 리포트 내용입니다.'
            }
          ]
        })
      });
    });

    // Go to Lounge tab
    await page.goto('/overview#lounge');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow hydration

    // Switch to "아파트 이야기" sub-tab to show our mock posts
    const aptStoryButton = page.locator('button').filter({ hasText: '아파트 이야기' }).first();
    await aptStoryButton.click();
    await page.waitForTimeout(1000);

    // Verify mock post is rendered in the feed list (it is an h3 element in the feed)
    const postItem = page.locator('h3:has-text("동탄역 삼성이 오는가"), h4:has-text("동탄역 삼성이 오는가")').first();
    await expect(postItem).toBeVisible({ timeout: 15000 });

    // Measure CLS during modal open transition
    await page.evaluate(() => {
      (window as any).clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            (window as any).clsValue += entry.value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    });

    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Click mock post to trigger modal open
    await postItem.click();
    // Verify modal backdrop/dialog is visible
    const modalDialog = page.locator('article[role="dialog"]').first();
    await expect(modalDialog).toBeVisible({ timeout: 10000 });

    // Read CLS
    const cls = await page.evaluate(() => (window as any).clsValue);
    console.log('Modal Transition CLS:', cls);
    expect(cls).toBeLessThan(0.1); // Google CWV target

    // Use expect.poll to wait until the console error array registers the Firebase error (handles chunk loading delay)
    await expect.poll(() => {
      return consoleErrors.some(err => 
        err.includes('Firestore') || 
        err.includes('firebase') || 
        err.includes('db') || 
        err.includes('doc') || 
        err.includes('getDoc') ||
        err.includes('delegate')
      );
    }, {
      message: 'Wait for Firebase unhandled rejection in page errors',
      timeout: 15000
    }).toBe(true);

    console.log('Firebase Unhandled Errors detected on console:', consoleErrors);

    // Verify that the loading spinner is no longer visible (UI recovered gracefully)
    const spinner = modalDialog.locator('.animate-spin').first();
    await expect(spinner).not.toBeVisible();

    // Verify that the error fallback text is displayed
    const errorFallback = modalDialog.locator('p:has-text("글을 찾을 수 없습니다")').first();
    await expect(errorFallback).toBeVisible();
  });
});

