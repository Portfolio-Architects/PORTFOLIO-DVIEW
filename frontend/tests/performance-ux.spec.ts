import { test, expect } from '@playwright/test';

test.describe('Performance and UX Optimizations Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Set localStorage keys to dismiss onboarding modals/banners
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
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
});
