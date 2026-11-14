import { test, expect } from '@playwright/test';

test.describe('Ad Money v5.1 Runtime Audit: CLS, <details> Accordion Geometry & 360px Overflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      (window as unknown as { __dviewCls: number }).__dviewCls = 0;
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
            if (!shift.hadRecentInput && typeof shift.value === 'number') {
              (window as unknown as { __dviewCls: number }).__dviewCls += shift.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // Ignore in unsupported environments
      }
    });
  });

  test('Main Home (/) & Overview (/overview): Desktop 1440px symmetry, Mobile 360px zero overflow, <details> chevron 180deg & CLS < 0.001', async ({
    page,
  }) => {
    test.setTimeout(120000);

    // 1. Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3200);

    const desktopCls = await page.evaluate(
      () => (window as unknown as { __dviewCls: number }).__dviewCls
    );
    expect(desktopCls).toBeLessThan(0.001);

    // Verify root semantic CSS custom properties are defined on Home
    const rootBrandVars = await page.evaluate(() => {
      const cs = window.getComputedStyle(document.documentElement);
      return {
        brandRed: cs.getPropertyValue('--brand-red').trim(),
        brandBlueLight: cs.getPropertyValue('--brand-blue-light').trim(),
      };
    });
    expect(rootBrandVars.brandRed).toBe('#f04452');
    expect(rootBrandVars.brandBlueLight).not.toBe('');

    // Verify Hero 2-col 526px symmetry on Desktop
    const leftCol = page.getByTestId('hero-left-donut-col');
    const rightCol = page.getByTestId('hero-right-chart-col');
    if ((await leftCol.count()) > 0 && (await rightCol.count()) > 0) {
      const leftBox = await leftCol.boundingBox();
      const rightBox = await rightCol.boundingBox();
      expect(leftBox).not.toBeNull();
      expect(rightBox).not.toBeNull();
      expect(Math.round(leftBox!.height)).toBe(526);
      expect(Math.round(rightBox!.height)).toBe(526);
    }

    // Toggle <details.dview-seo-accordion> on Home and verify chevron 180deg rotation + zero AdSlot inside
    const homeAccordion = page.locator('#home-ssr-semantic-catalog details.dview-seo-accordion').first();
    await expect(homeAccordion).toBeAttached();
    expect(await homeAccordion.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);

    const homeSummary = homeAccordion.locator('summary').first();
    await homeSummary.scrollIntoViewIfNeeded();
    await homeSummary.click();
    expect(await homeAccordion.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);
    await page.waitForTimeout(250);

    const chevronRotate = await homeAccordion
      .locator('.dview-seo-accordion-chevron')
      .first()
      .evaluate((el) => window.getComputedStyle(el).rotate);
    expect(chevronRotate).toBe('180deg');

    const catalogText = (await homeAccordion.textContent()) || '';
    expect(catalogText).not.toContain('중개거래 정보 없음');

    const adInsideDetailsCount = await page.evaluate(
      () => document.querySelectorAll('details ins.adsbygoogle, details [data-ad-slot]').length
    );
    expect(adInsideDetailsCount).toBe(0);

    await homeSummary.click();
    expect(await homeAccordion.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);

    // 2. Mobile 360x800 fresh load CLS + horizontal overflow check on Home
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3200);
    const homeMobileCls = await page.evaluate(
      () => (window as unknown as { __dviewCls: number }).__dviewCls
    );
    expect(homeMobileCls).toBeLessThan(0.001);
    const homeMobileOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(homeMobileOverflow.scrollWidth).toBeLessThanOrEqual(homeMobileOverflow.clientWidth);

    // 3. Verify #home-ssr-market-editorial accordion & /overview canonical redirect to /
    const editorialAccordion = page
      .locator('#home-ssr-market-editorial details.dview-seo-accordion')
      .first();
    await expect(editorialAccordion).toBeAttached();
    expect(await editorialAccordion.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    await editorialAccordion.locator('summary').first().click();
    expect(await editorialAccordion.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);

    await page.goto('/overview', { waitUntil: 'domcontentloaded' });
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('Apartment Detail Pages (standard, 23-char longest name, alphanumeric hyphen): CLS < 0.001, 360px zero overflow & <details> toggle', async ({
    page,
  }) => {
    test.setTimeout(120000);

    const slugs = [
      '동탄역롯데캐슬',
      '산척동동탄호수공원금강펜테리움센트럴파크2',
      '동탄파크릭스A51-1BL아파트',
    ];

    for (const slug of slugs) {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(`/apartment/${encodeURIComponent(slug)}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(3200);

      const cls = await page.evaluate(
        () => (window as unknown as { __dviewCls: number }).__dviewCls
      );
      expect(cls).toBeLessThan(0.001);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      // Verify SSR comprehensive report <details> toggle + 180deg chevron
      const firstAccordion = page
        .locator('#apt-ssr-comprehensive-report details.dview-seo-accordion')
        .first();
      await expect(firstAccordion).toBeAttached();
      expect(await firstAccordion.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);

      const summary = firstAccordion.locator('summary').first();
      await summary.scrollIntoViewIfNeeded();
      await summary.click();
      expect(await firstAccordion.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);
      await page.waitForTimeout(250);

      const chevronRotate = await firstAccordion
        .locator('.dview-seo-accordion-chevron')
        .first()
        .evaluate((el) => window.getComputedStyle(el).rotate);
      expect(chevronRotate).toBe('180deg');

      await summary.click();
      expect(await firstAccordion.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    }

    // Desktop 1440x900 CLS check on Apartment Detail Page
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/apartment/${encodeURIComponent('동탄역롯데캐슬')}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3200);
    const aptDesktopCls = await page.evaluate(
      () => (window as unknown as { __dviewCls: number }).__dviewCls
    );
    expect(aptDesktopCls).toBeLessThan(0.001);

    // Verify Tailwind v4 .text-toss-red utility resolves to rgb(240, 68, 82) on Apartment Detail bundle
    const tossRedComputed = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.className = 'text-toss-red';
      document.body.appendChild(probe);
      const color = window.getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    expect(tossRedComputed).toBe('rgb(240, 68, 82)');
  });
});
