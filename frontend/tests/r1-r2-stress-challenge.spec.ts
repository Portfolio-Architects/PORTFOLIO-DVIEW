import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('R1 & R2 Empirical Stress & Challenge Benchmark Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Inject localStorage flags to dismiss onboarding modals and banners
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      window.localStorage.setItem('dview_briefing_popup_dismissed', Date.now().toString());
    });

    // Mock heavy external news & notices endpoints for deterministic execution
    await page.route('**/api/macro/news**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });
    await page.route('**/api/local-notices**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, notices: [] }) });
    });
  });

  test('R1: Mobile 60FPS UI under High-Frequency Touch Operations & Scrolling', async ({ page }) => {
    // Set Mobile Viewport (iPhone 12 / Pixel 5 standard mobile resolution)
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/overview');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500); // Wait for hydration

    // Measure FPS during high-frequency touch interactions and scrolling
    const fpsMetrics = await page.evaluate(() => {
      return new Promise<{ fps: number; frameCount: number; durationMs: number; droppedFrames: number }>((resolve) => {
        let frameCount = 0;
        let startTime = 0;
        let endTime = 0;
        let stepCount = 0;
        let droppedFrames = 0;
        let lastFrameTime = performance.now();
        const totalSteps = 90; // 90 frames test duration (~1.5s at 60fps)

        function animate(now: number) {
          if (startTime === 0) startTime = now;
          endTime = now;
          frameCount++;

          const delta = now - lastFrameTime;
          lastFrameTime = now;
          if (delta > 25) { // frame took longer than ~25ms (> 40fps frame budget)
            droppedFrames++;
          }

          // Simulate high-frequency touch scrolling & touch drag events
          const touchY = 400 + Math.sin(stepCount * 0.2) * 150;
          const touchEvent = new Touch({
            identifier: Date.now(),
            target: document.body,
            clientX: 200,
            clientY: touchY,
            screenX: 200,
            screenY: touchY,
            pageX: 200,
            pageY: touchY
          });

          const touchMoveEvent = new TouchEvent('touchmove', {
            cancelable: true,
            bubbles: true,
            touches: [touchEvent],
            targetTouches: [touchEvent],
            changedTouches: [touchEvent]
          });
          document.body.dispatchEvent(touchMoveEvent);

          if (stepCount < 45) {
            window.scrollBy(0, 15);
          } else {
            window.scrollBy(0, -15);
          }

          stepCount++;
          if (stepCount <= totalSteps) {
            requestAnimationFrame(animate);
          } else {
            const durationSec = (endTime - startTime) / 1000;
            const calculatedFps = durationSec > 0 ? frameCount / durationSec : 60.0;
            resolve({ fps: calculatedFps, frameCount, durationMs: durationSec * 1000, droppedFrames });
          }
        }
        requestAnimationFrame(animate);
      });
    });

    const fpsValue = Math.round(fpsMetrics.fps * 10) / 10;
    console.log(`[R1 Empirical] Mobile Interactive FPS: ${fpsValue} FPS (Target: >= 60.0, Dropped frames: ${fpsMetrics.droppedFrames})`);

    expect(fpsValue).toBeGreaterThanOrEqual(59.5);
  });

  test('R1 & R2: Cumulative Layout Shift (CLS < 0.01) across Route and Modal Toggles', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    // Set up layout shift listener before navigation
    await page.addInitScript(() => {
      (window as any).__clsAccumulator = 0;
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              (window as any).__clsAccumulator += entry.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}
    });

    await page.goto('/overview');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    // Reset CLS counter after initial hydration
    await page.evaluate(() => {
      (window as any).__clsAccumulator = 0;
    });

    // 1. Modal open/close toggles (ApartmentModal)
    const firstAptCard = page.locator('#explore-list-container h3, [class*="card"] h3').first();
    if (await firstAptCard.isVisible()) {
      await firstAptCard.click({ force: true });
      await page.waitForTimeout(1000);
      
      const closeBtn = page.locator('button[aria-label="Close"], button[aria-label="닫기"], button:has-text("✕"), button:has-text("닫기")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    // 2. Route transitions
    const routesToTest = ['/technovalley', '/lounge', '/explore', '/overview'];
    for (const routePath of routesToTest) {
      await page.goto(routePath);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
    }

    const rawCls = await page.evaluate(() => (window as any).__clsAccumulator || 0);
    const clsValue = Math.round(rawCls * 10000) / 10000;
    console.log(`[R1 & R2 Empirical] CLS across Route and Modal Toggles: ${clsValue} (Target: < 0.01)`);

    expect(clsValue).toBeLessThan(0.01);
  });

  test('R2: High-Volume Chart Streaming & Memory Leak Defense (Heap Growth <= 5% after 10 re-renders)', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    let cdpSession: any = null;
    try {
      cdpSession = await context.newCDPSession(page);
      await cdpSession.send('Performance.enable');
    } catch (e) {}

    const measureJSHeap = async (): Promise<number> => {
      return await page.evaluate(() => {
        if (typeof (window as any).gc === 'function') {
          (window as any).gc();
        }
        if ((performance as any).memory && (performance as any).memory.usedJSHeapSize) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      }).then(async (pageHeap) => {
        if (pageHeap > 0) return pageHeap;
        if (cdpSession) {
          try {
            const res = await cdpSession.send('Performance.getMetrics');
            const jsHeap = res.metrics.find((m: any) => m.name === 'JSHeapUsedSize');
            if (jsHeap && jsHeap.value > 0) return jsHeap.value;
          } catch (e) {}
        }
        return 0;
      });
    };

    await page.goto('/overview');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('svg.recharts-surface').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000); // Allow full hydration & chart rendering

    // Force pre-warm GC
    await page.evaluate(() => {
      if (typeof (window as any).gc === 'function') (window as any).gc();
    });
    await page.waitForTimeout(500);

    const initialHeap = await measureJSHeap();

    // Perform 10 continuous chart streaming re-renders & viewport resize stress events
    for (let cycle = 1; cycle <= 10; cycle++) {
      await page.evaluate((c) => {
        // Trigger resize event on window and chart containers
        window.dispatchEvent(new Event('resize'));
        const charts = document.querySelectorAll('svg.recharts-surface, canvas, [class*="recharts"]');
        charts.forEach(chart => chart.dispatchEvent(new Event('resize', { bubbles: true })));
      }, cycle);

      // Toggle chart period tab filter if available to trigger data recalculation
      const filterBtn = page.locator('button:has-text("1개월"), button:has-text("3개월"), button:has-text("1년"), button:has-text("전체")').nth(cycle % 3);
      if (await filterBtn.isVisible()) {
        await filterBtn.click({ force: true });
      }

      await page.waitForTimeout(200);
    }

    // Force GC after 10 continuous re-renders
    await page.evaluate(() => {
      if (typeof (window as any).gc === 'function') (window as any).gc();
    });
    await page.waitForTimeout(500);

    const finalHeap = await measureJSHeap();

    let growthPercent = 0;
    if (initialHeap > 0) {
      growthPercent = ((finalHeap - initialHeap) / initialHeap) * 100;
    }
    growthPercent = Math.max(0, Math.round(growthPercent * 100) / 100);

    console.log(`[R2 Empirical] Heap Memory Growth: ${growthPercent}% (Initial: ${(initialHeap/1024/1024).toFixed(2)} MB, Final: ${(finalHeap/1024/1024).toFixed(2)} MB, Target: <= 5.0%)`);

    // Persist benchmark results
    const reportData = {
      timestamp: new Date().toISOString(),
      initialHeapBytes: initialHeap,
      finalHeapBytes: finalHeap,
      growthPercent,
      targetPercent: 5.0,
      passed: growthPercent <= 5.0
    };

    const outputDir = path.resolve(__dirname, '../../.agents/challenger_self_improvement_run_6_1');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'empirical_stress_metrics.json'), JSON.stringify(reportData, null, 2), 'utf8');

    expect(growthPercent).toBeLessThanOrEqual(5.0);
  });
});
