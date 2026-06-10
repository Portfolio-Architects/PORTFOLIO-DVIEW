import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('UI/UX Diagnostics Audit', () => {
  const consoleLogs: any[] = [];
  const pageErrors: any[] = [];

  test.beforeEach(async ({ page }) => {
    // 1. Capture console logs and page errors
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleLogs.push({ type: msg.type(), text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', err => {
      pageErrors.push({ message: err.message, stack: err.stack });
    });

    // 2. Pre-inject Performance Observer for Web Vitals (LCP, CLS)
    await page.addInitScript(() => {
      (window as any).webVitals = { lcp: 0, cls: 0 };
      
      // LCP Observer
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          (window as any).webVitals.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}

      // CLS Observer
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              (window as any).webVitals.cls += (entry as any).value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}
    });
  });

  test('Perform full UI/UX audit on explore tab and apartment detail modal', async ({ page }) => {
    test.setTimeout(60000); // Give plenty of time for audit engines

    // Dismiss welcome modal and ad block banner before navigation using localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    });

    // Navigate to the main page
    await page.goto('/#imjang');
    await page.waitForLoadState('domcontentloaded');

    // Click first apartment card (uses the new strict-mode-safe regex and first locator)
    const aptTitle = page.locator('#explore-list-container span', { hasText: /동탄역\s*(?:롯데캐슬|힐스테이트)/ })
                         .or(page.locator('#explore-list-container span', { hasText: /동탄역/ }))
                         .first();
    await expect(aptTitle).toBeVisible({ timeout: 15000 });
    await aptTitle.click();
    
    // Wait for modal transition and chart rendering to complete
    await page.waitForTimeout(1500);

    // Run custom browser audits
    const diagnostics = await page.evaluate(() => {
      // 1. Navigation Timing Performance Metrics
      const [navigation] = performance.getEntriesByType('navigation') as any[];
      const navTiming = navigation ? {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        ttfb: navigation.responseStart - navigation.requestStart,
        domLoad: navigation.domContentLoadedEventEnd - navigation.startTime,
        pageLoad: navigation.loadEventEnd - navigation.startTime,
      } : null;

      // 2. Layout Overflow Diagnostics
      const overflowElements: any[] = [];
      const viewportWidth = window.innerWidth;
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Check elements exceeding viewport horizontally
        if (rect.right > viewportWidth && rect.width < viewportWidth) {
          // Identify element with selector path
          let path = el.tagName.toLowerCase();
          if (el.id) path += `#${el.id}`;
          if (el.className) path += `.${String(el.className).trim().split(/\s+/)[0]}`;
          overflowElements.push({
            tag: el.tagName,
            selector: path.substring(0, 100),
            width: Math.round(rect.width),
            right: Math.round(rect.right),
            viewportWidth
          });
        }
      });

      return {
        navTiming,
        webVitals: (window as any).webVitals,
        overflowElements: overflowElements.slice(0, 10), // Limit to top 10 overflow items
      };
    });

    // 3. Accessibility Audit using Axe-Core CDN script injection (focused on the modal container for speed)
    let axeViolations: any[] = [];
    try {
      await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js' });
      const axeResult = await page.evaluate(async () => {
        // Run axe audit specifically on the modal report container to optimize performance
        return await (window as any).axe.run('#pdf-report-content');
      });
      axeViolations = axeResult.violations.map((v: any) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n: any) => ({
          target: n.target.join(', '),
          html: n.html.substring(0, 150)
        }))
      }));
    } catch (err) {
      console.error('Failed to run axe-core accessibility audit:', err);
    }

    // Build raw diagnostics JSON payload
    const reportPayload = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      consoleLogs: consoleLogs,
      pageErrors: pageErrors,
      performance: {
        navigation: diagnostics.navTiming,
        vitals: diagnostics.webVitals
      },
      accessibility: axeViolations,
      layout: {
        overflows: diagnostics.overflowElements
      }
    };

    // Write results to scratch/ui-ux-audit-results.json
    const scratchDir = path.resolve(__dirname, '../scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(scratchDir, 'ui-ux-audit-results.json'),
      JSON.stringify(reportPayload, null, 2),
      'utf-8'
    );
    console.log('✅ UI/UX raw audit results written successfully.');
  });
});
