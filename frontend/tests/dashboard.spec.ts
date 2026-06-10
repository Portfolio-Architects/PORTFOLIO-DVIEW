import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test('should load the dashboard, open modal, and test filters', async ({ page }) => {
    // Dismiss welcome modal and ad block banner before navigation using localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    });

    // 1. Load the main page directly on the Apartment Explore tab (#imjang)
    await page.goto('/#imjang');

    // 2. Wait for the apartments list to populate
    // Locate the first apartment name span containing "동탄역" in the virtualized list
    const aptTitle = page.locator('#explore-list-container span', { hasText: /동탄역\s*(?:롯데캐슬|힐스테이트)/ })
                         .or(page.locator('#explore-list-container span', { hasText: /동탄역/ }))
                         .first();
    await expect(aptTitle).toBeVisible({ timeout: 15000 });

    const aptName = await aptTitle.textContent();
    console.log('Selected Apartment:', aptName);

    // 3. Click the apartment to open the modal
    await aptTitle.click();

    // 4. Verify the modal opens and displays '실거래가'
    const txHistoryTitle = page.locator('h4', { hasText: '실거래가' }).first();
    await expect(txHistoryTitle).toBeVisible({ timeout: 10000 });
    
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
