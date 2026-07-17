import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { BUILD_VERSION } from '../src/lib/build-version';

test.describe('SWR Preloading and Duplicate Fetch Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Set localStorage keys to dismiss onboarding modals/banners
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    });

    // Mock backend API endpoints to prevent firebase/database timeouts from failing E2E tests
    await page.route('**/api/macro/news**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.route('**/api/local-notices**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, notices: [] })
      });
    });

    await page.route('**/api/dashboard-init**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, typeMap: [], apartmentMeta: {} })
      });
    });

    await page.route('**/api/macro/rates**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { riskFreeRate: 3.25, fundingCost: 4.0 } })
      });
    });

    // Mock Firestore traffic to speed up loading and prevent abort errors
    await page.route('**/google.firestore.v1.Firestore/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
  });

  test('Verify location-scores SWR preload key matches and has no duplicate fetches', async ({ page }) => {
    test.setTimeout(60000);

    const locationScoresRequests: string[] = [];

    // Capture all requests made by the page
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('location-scores.json')) {
        locationScoresRequests.push(url);
      }
    });

    // Navigate to overview page (which uses useLocationScores)
    await page.goto('/overview?tab=imjang');
    await page.waitForLoadState('domcontentloaded');
    
    // SWRProvider preloads after requestIdleCallback (timeout 3000ms or 1500ms fallback)
    // useLocationScores preloads after requestIdleCallback (timeout 150ms or 100ms fallback)
    // A 7-second wait is plenty for both to fire and SWR's deduping window to apply.
    await page.waitForTimeout(7000);

    console.log('Detected location-scores requests:', locationScoresRequests);

    // 1. Verify that location-scores.json is requested
    expect(locationScoresRequests.length).toBeGreaterThan(0);

    // 2. Verify that every location-scores.json request has the correct build version suffix
    const expectedSuffix = `v=${BUILD_VERSION}`;
    locationScoresRequests.forEach((url) => {
      expect(url).toContain(expectedSuffix);
      expect(url).not.toContain('location-scores.json?v=undefined');
    });

    // 3. Verify there are no duplicate fetches for location-scores.json
    // SWR deduping + preload should resolve this with exactly 1 network request
    expect(locationScoresRequests.length).toBe(1);

    // 4. Verify there is no versionless fallback request (which would mean a preload key mismatch)
    const versionlessRequests = locationScoresRequests.filter(url => !url.includes('?v='));
    expect(versionlessRequests.length).toBe(0);
  });

  test('Verify apartments-by-dong is removed from preloading targets array in SWRProvider.tsx', async () => {
    const swrProviderPath = path.resolve(__dirname, '../src/components/pwa/SWRProvider.tsx');
    const content = fs.readFileSync(swrProviderPath, 'utf8');
    
    // We search for the targets array definition in SWRProvider.tsx
    const targetsMatch = content.match(/const\s+targets\s*=\s*\[([\s\S]*?)\];/);
    expect(targetsMatch).not.toBeNull();
    
    const targetsContent = targetsMatch![1];
    console.log('Targets content in SWRProvider:', targetsContent);
    
    // Verify that apartments-by-dong is not in the preload targets array
    expect(targetsContent).not.toContain('apartments-by-dong');
  });

  test('Adversarial: Verify route mismatches in NewsClient.tsx statically', async () => {
    const newsClientPath = path.resolve(__dirname, '../src/app/news/NewsClient.tsx');
    const content = fs.readFileSync(newsClientPath, 'utf8');

    // Verify route targets in NewsClient.tsx point to correct overview query parameters
    expect(content).toContain("router.push('/overview?tab=overview')");
    expect(content).toContain("router.push('/overview?tab=lounge')");
    expect(content).toContain("router.push('/overview?tab=office')");
  });

  test('Adversarial: SWR Cache versionless entry persistence after build version upgrade', async ({ page }) => {
    // Read the build version dynamically from build-version.ts to make sure it matches the current build version precisely
    const buildVersionPath = path.resolve(__dirname, '../src/lib/build-version.ts');
    const buildVersionFileContent = fs.readFileSync(buildVersionPath, 'utf8');
    const buildVersionMatch = buildVersionFileContent.match(/BUILD_VERSION\s*=\s*'([^']+)'/);
    const activeBuildVersion = buildVersionMatch ? buildVersionMatch[1] : BUILD_VERSION;

    // Seed the localStorage cache BEFORE the page loads using addInitScript to avoid pagehide wipeout
    await page.addInitScript((buildVer) => {
      const cacheData = [
        ['/api/macro/rates', { success: true, data: { riskFreeRate: 9.99, fundingCost: 8.88 } }],
        ['/data/location-scores.json?v=stale_version', { data: 'stale_data' }],
        [`/data/location-scores.json?v=${buildVer}`, { data: 'matching_data' }]
      ];
      localStorage.setItem('app-swr-cache', JSON.stringify(cacheData));
    }, activeBuildVersion);

    await page.goto('/overview'); 
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); 

    // Inspect localStorage to verify what was purged/kept
    const cacheAfterLoad = await page.evaluate(() => {
      const raw = localStorage.getItem('app-swr-cache');
      return raw ? JSON.parse(raw) : [];
    });

    const keys = cacheAfterLoad.map(([k]: [string]) => k);

    // Mismatching versioned key MUST be purged
    expect(keys.some(k => k.includes('location-scores.json?v=stale_version'))).toBe(false);

    // Matching versioned key MUST be kept
    expect(keys.some(k => k.includes(`location-scores.json?v=${activeBuildVersion}`))).toBe(true);

    // Versionless key MUST be purged to prevent stale cache persistence
    expect(keys.some(k => k.includes('/api/macro/rates'))).toBe(false);
  });

  test('Adversarial: Programmatic replaceState in DashboardClient creates immediate URL updates without transition waiting', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('domcontentloaded');

    const officeButton = page.locator('header button:has-text("사무실 탐색")');
    const loungeButton = page.locator('header button:has-text("동탄 라운지")');

    // Click tabs sequentially and check URL state is updated instantly
    await officeButton.click();
    expect(page.url()).toContain('/overview?tab=office');

    await loungeButton.click();
    expect(page.url()).toContain('/overview#lounge');
  });
});
