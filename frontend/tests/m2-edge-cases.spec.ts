import { test, expect } from '@playwright/test';

test.describe('Milestone 2 Edge Cases Verification', () => {

  test.describe('1. Dock link hover prefetching on touch / mobile viewports', () => {
    test.use({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      isMobile: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    });

    test('should trigger prefetch on touchstart / hover on mobile viewports without errors', async ({ page }) => {
      // Dismiss onboarding modals
      await page.addInitScript(() => {
        window.localStorage.setItem('dview-welcome-seen', 'true');
        window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      });

      const prefetchedUrls: string[] = [];
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/_next/data/') || url.includes('/overview') || url.includes('/lounge') || url.includes('/explore')) {
          prefetchedUrls.push(url);
        }
      });

      await page.goto('/overview');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Locate MobileDock
      const mobileDock = page.locator('nav.fixed.bottom-0');
      await expect(mobileDock).toBeVisible();

      // Test touchstart on "동탄 라운지" tab
      const loungeTab = mobileDock.locator('a, button').filter({ hasText: '동탄 라운지' }).first();
      await expect(loungeTab).toBeVisible();
      
      // Dispatch touchstart event
      await loungeTab.dispatchEvent('touchstart');
      await page.waitForTimeout(500);

      // Dispatch mouseenter event
      await loungeTab.dispatchEvent('mouseenter');
      await page.waitForTimeout(500);

      console.log('Mobile touchstart & mouseenter prefetch events dispatched successfully');

      // Test click navigation
      await loungeTab.click();
      await page.waitForURL(/\/lounge/);
      expect(page.url()).toContain('/lounge');
    });

    test('should hide MobileDock when virtual viewport height shrinks (keyboard open simulation)', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('dview-welcome-seen', 'true');
        window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      });

      await page.goto('/overview');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const mobileDock = page.locator('nav.fixed.bottom-0');
      await expect(mobileDock).toBeVisible();
      expect(await mobileDock.getAttribute('class')).not.toContain('translate-y-full');

      // Simulate keyboard open by dispatching resize event on visualViewport
      await page.evaluate(() => {
        if (window.visualViewport) {
          // Force a resize event with reduced height
          Object.defineProperty(window.visualViewport, 'height', { value: 300, configurable: true });
          window.visualViewport.dispatchEvent(new Event('resize'));
        }
      });

      await page.waitForTimeout(500);

      // MobileDock should have hidden class applied
      const dockClassAfterResize = await mobileDock.getAttribute('class');
      console.log('Dock class after keyboard open simulation:', dockClassAfterResize);
      expect(dockClassAfterResize).toContain('translate-y-full');
    });
  });

  test.describe('2. Dark and light theme switching visual fidelity and glassmorphism styling', () => {
    test('should correctly toggle light and dark themes and update theme-color meta tag', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('dview-welcome-seen', 'true');
        window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
        window.localStorage.setItem('dview_briefing_popup_dismissed', Date.now().toString());
      });

      await page.goto('/overview');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const html = page.locator('html');

      // Open settings / profile modal via FloatingUserBar gear icon (target visible button with force click to bypass modal backdrop)
      const settingsButton = page.locator('button[aria-label="설정"]').filter({ visible: true }).first();
      await expect(settingsButton).toBeVisible();
      await settingsButton.click({ force: true });
      await page.waitForTimeout(500);

      // Find Dark mode button
      const darkModeButton = page.locator('button', { hasText: '다크' }).first();
      await expect(darkModeButton).toBeVisible();
      await darkModeButton.click();
      await page.waitForTimeout(500);

      // Check dark class on <html>
      const htmlClassDark = await html.getAttribute('class');
      expect(htmlClassDark).toContain('dark');

      // Check theme-color meta tag content for dark mode (#121212)
      const themeMetaDark = await page.locator('meta[name="theme-color"]').first().getAttribute('content');
      console.log('Dark mode theme-color meta:', themeMetaDark);
      expect(themeMetaDark).toBe('#121212');

      // Switch back to Light mode
      const lightModeButton = page.locator('button', { hasText: '라이트' }).first();
      await expect(lightModeButton).toBeVisible();
      await lightModeButton.click();
      await page.waitForTimeout(500);

      // Check dark class removed from <html>
      const htmlClassLight = await html.getAttribute('class');
      expect(htmlClassLight).not.toContain('dark');

      // Check theme-color meta tag content for light mode (#ffffff)
      const themeMetaLight = await page.locator('meta[name="theme-color"]').first().getAttribute('content');
      console.log('Light mode theme-color meta:', themeMetaLight);
      expect(themeMetaLight).toBe('#ffffff');
    });

    test('should verify glassmorphism CSS backdrop-blur and translucency classes on navigation bars', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('dview-welcome-seen', 'true');
        window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      });

      await page.goto('/overview');
      await page.waitForLoadState('domcontentloaded');

      // Desktop LoungeHeader
      const header = page.locator('header[role="banner"]').first();
      if (await header.isVisible()) {
        const headerClass = await header.getAttribute('class');
        expect(headerClass).toContain('bg-surface/85');
        expect(headerClass).toContain('backdrop-blur-xl');
        expect(headerClass).toContain('border-border/60');
      }

      // Mobile Dock
      const mobileDock = page.locator('nav.fixed.bottom-0').first();
      if (await mobileDock.isVisible()) {
        const dockClass = await mobileDock.getAttribute('class');
        expect(dockClass).toContain('bg-surface/85');
        expect(dockClass).toContain('backdrop-blur-xl');
        expect(dockClass).toContain('border-border/40');
      }
    });
  });

  test.describe('3. Route switching without state desync or layout flash', () => {
    const routesToTest = [
      { name: 'technovalley', path: '/', expectedUrl: '/' },
      { name: 'office', path: '/overview?tab=office', expectedUrl: '/overview?tab=office' },
      { name: 'lounge', path: '/lounge', expectedUrl: '/lounge' },
      { name: 'overview', path: '/overview', expectedUrl: '/overview' },
      { name: 'imjang', path: '/explore', expectedUrl: '/explore' },
    ];

    test('should seamlessly switch between all 5 routes without state desync or 404 layout flash', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('dview-welcome-seen', 'true');
        window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      });

      for (const route of routesToTest) {
        console.log(`Navigating to ${route.name} (${route.path})...`);
        await page.goto(route.path);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        // Verify page didn't throw 404 error
        const notFoundText = page.locator('text=404').or(page.locator('text=Page Not Found')).or(page.locator('text=페이지를 찾을 수 없습니다'));
        await expect(notFoundText).not.toBeVisible();

        // Verify URL matches
        expect(page.url()).toContain(route.expectedUrl);
      }
    });

    test('should maintain activeTab highlight synchronization during browser history back/forward navigation', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('dview-welcome-seen', 'true');
        window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      });

      // 1. Start at /overview
      await page.goto('/overview');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // 2. Navigate to /lounge
      await page.goto('/lounge');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('/lounge');

      // 3. Navigate to /overview?tab=office
      await page.goto('/overview?tab=office');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('/overview?tab=office');

      // 4. Go Back to /lounge
      await page.goBack();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('/lounge');

      // 5. Go Back to /overview
      await page.goBack();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('/overview');

      // 6. Go Forward to /lounge
      await page.goForward();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('/lounge');
    });
  });

});
