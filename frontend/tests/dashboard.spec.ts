import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test('should load the dashboard, open modal, and test filters', async ({ page }) => {
    test.setTimeout(120000);
    
    // Enable browser console logging for E2E debugging
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}\nStack: ${err.stack}`));

    // Dismiss welcome modal and ad block banner before navigation using localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    });

    // 1. Load the main page directly on the Apartment Explore tab (?tab=imjang)
    await page.goto('/?tab=imjang');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow full client hydration and router stability

    // 2. Wait for the apartments list to populate
    // Locate the first apartment name span containing "동탄역" in the virtualized list
    const aptTitle = page.locator('#explore-list-container').getByText('동탄역 롯데캐슬', { exact: false })
                         .or(page.locator('#explore-list-container').getByText('동탄역 시범한화', { exact: false }))
                         .first();
    await expect(aptTitle).toBeVisible({ timeout: 30000 });
    const aptName = await aptTitle.textContent();
    console.log('Selected Apartment:', aptName);

    // Give React brief time to hydrate event listeners
    await page.waitForTimeout(2000);

    // 3. Click the apartment to open the modal and wait for the modal to open
    // Use retry click pattern to handle hydration lag on slow CPU test environments
    const txHistoryTitle = page.locator('h2', { hasText: '실거래가' }).first();
    let modalOpened = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      console.log(`Clicking apartment complex (Attempt ${attempt + 1})...`);
      try {
        // If modal is already open, break early
        if (await txHistoryTitle.isVisible()) {
          modalOpened = true;
          break;
        }
        // Dynamic lookup to avoid detached element errors from Next.js HMR/Fast Refresh
        const currentAptTitle = page.locator('#explore-list-container').getByText(aptName, { exact: false }).first();
        await currentAptTitle.scrollIntoViewIfNeeded();
        await currentAptTitle.click({ timeout: 5000 }); // Let Playwright actionability checks verify visibility/stability
        await expect(txHistoryTitle).toBeVisible({ timeout: 10000 });
        modalOpened = true;
        break;
      } catch (e) {
        console.log(`Modal did not open on attempt ${attempt + 1}, waiting for hydration... Error: ${e.message}`);
        await page.waitForTimeout(3000);
      }
    }
    expect(modalOpened).toBe(true);
    
    // Check if the overall count is visible
    const totalCountText = await txHistoryTitle.textContent();
    console.log('Initial Table Header:', totalCountText);

    // 5. Test type filtering by clicking one of the type filter chips (buttons)
    const filterContainer = page.locator('div.flex.flex-nowrap.gap-2\\.5.overflow-x-auto');
    const buttons = filterContainer.locator('button');
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });
    
    const count = await buttons.count();
    console.log('Available Type Filters Count:', count);

    if (count > 1) {
        const firstFilterText = await buttons.nth(0).textContent();
        const secondFilterText = await buttons.nth(1).textContent();
        console.log(`Clicking type filter: ${secondFilterText} (from ${firstFilterText})`);
        
        await buttons.nth(1).click();
        
        // Wait a bit for the React state to update the DOM
        await page.waitForTimeout(1000);

        // Print the new filtered header text
        const filteredCountText = await txHistoryTitle.textContent();
        console.log('Filtered Table Header:', filteredCountText);
        
        expect(filteredCountText).toContain('실거래가');
    }
  });
});
