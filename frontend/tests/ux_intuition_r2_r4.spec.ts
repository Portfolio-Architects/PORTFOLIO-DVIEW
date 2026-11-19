import { test, expect, type Page, type Locator, type TestInfo } from '@playwright/test';

/**
 * DVIEW Production UI/UX Intuition Refactoring (R2–R4 / Features F1–F8)
 * Opaque-Box Playwright E2E Suite — Tiers 1 to 4 (93 Named Steps)
 *
 * Strictly black-box:
 * - Imports ONLY @playwright/test (zero @/ or ../src/ imports).
 * - Mirrors Design System & Copy Diet SSOT budgets and regexes locally.
 * - Verifies rendered DOM geometry, hydration, accessibility, and real-data integrity
 *   across chromium, Mobile Chrome, and Mobile Safari.
 */

// ---------------------------------------------------------------------------
// 1. Mirrored Ad Money v5.1 Copy Diet & Typography Constants (Opaque-Box SSOT)
// ---------------------------------------------------------------------------

const DVIEW_COPY_BUDGETS = {
  pageH1: 32,
  sectionTitle: 22,
  sectionSubtitle: 40,
  kpiLabel: 10,
  kpiCaption: 18,
  signalBadge: 10,
  keyTakeaway: 45,
  cardDescription: 50,
  accordionSummary: 30,
  inlineNotice: 80,
} as const;

const VERBOSE_PROSE_ENDING_REGEX =
  /(?:계측합니다|진단합니다|산출합니다|확인할\s*수\s*있습니다|확인하실\s*수\s*있습니다|제공합니다|제공해\s*드립니다|비교해\s*드립니다|나타냅니다|형성합니다|공유합니다|기록\s*중입니다|분석합니다|해설합니다|소요됩니다|상승했습니다|하락했습니다)\s*[.!]?$/u;

const DIRECTIVE_SUBTITLE_ENDING_REGEX = /(?:확인하세요|비교하세요|살펴보세요)\s*[.!]?$/u;

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

const PROHIBITED_FONT_TOKENS = [
  'gulim',
  'gulimche',
  'dotumche',
  'batangche',
  'consolas',
  'courier new',
  'ui-monospace',
  'monospace',
] as const;

const PROHIBITED_PALETTE_CLASS_REGEX =
  /\b(?:bg|text|border|ring|from|to|via)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|zinc|neutral|stone|gray|teal|cyan|sky|green)-(?:\d{2,3})\b/;

const ADSLOT_INSIDE_DETAILS_SELECTOR = [
  'details ins.adsbygoogle',
  'details [data-ad-slot]',
  'details [data-testid="ad-slot"]',
  'details [data-testid="ad-slot-container"]',
  'details [data-slot-format]',
  'details [data-testid^="ssr-adslot"]',
  'details [data-testid*="adslot"]',
  'details [data-slot-id]',
].join(', ');

const EXPECTED_ZONE_HREFS = [
  '/zone/metropolis',
  '/zone/community',
  '/zone/gbcx',
  '/zone/techno',
  '/zone/culture',
  '/zone/waterfront',
  '/zone/newtown',
] as const;

interface SegmenterLike {
  segment(input: string): Iterable<{ segment: string }>;
}

type SegmenterConstructor = new (
  locale: string,
  options: { granularity: 'grapheme' | 'word' | 'sentence' }
) => SegmenterLike;

const intlSegmenterCtor: SegmenterConstructor | undefined =
  typeof Intl !== 'undefined'
    ? (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter
    : undefined;

const koGraphemeSegmenter: SegmenterLike | null =
  typeof intlSegmenterCtor === 'function'
    ? new intlSegmenterCtor('ko', { granularity: 'grapheme' })
    : null;

function normalizeMicroCopy(text: string): string {
  return text.replace(/[\u00AD\u200B\u2060\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

function measureGraphemes(text: string): number {
  const normalized = normalizeMicroCopy(text);
  if (!normalized) return 0;
  if (koGraphemeSegmenter) {
    let count = 0;
    for (const seg of koGraphemeSegmenter.segment(normalized)) {
      if (seg.segment) count += 1;
    }
    return count;
  }
  return Array.from(normalized).length;
}

// ---------------------------------------------------------------------------
// 2. Shared Browser Instrumentation & Opaque-Box Assertion Helpers
// ---------------------------------------------------------------------------

interface PageDiagnostics {
  pageErrors: string[];
}

function isMobileProject(testInfo: TestInfo): boolean {
  return /Mobile/i.test(testInfo.project.name);
}

function isMobileViewport(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 768;
}

async function attachCleanInstrumentation(page: Page): Promise<PageDiagnostics> {
  const diag: PageDiagnostics = { pageErrors: [] };

  page.on('pageerror', (err: Error) => {
    const msg = err.message || String(err);
    // WebKit emits a synthetic access-control pageerror when aborting an in-flight Firestore long-poll XHR on page.goto() unload
    if (/\/firestore\.googleapis\.com\/.*\/Listen\/channel.*due to access control checks/i.test(msg)) {
      return;
    }
    diag.pageErrors.push(msg);
  });

  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      window.localStorage.setItem('dview_briefing_popup_dismissed', 'true');
    } catch {
      // Ignore storage failures in restricted contexts
    }

    (window as unknown as { __dviewCls?: number }).__dviewCls = 0;
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!shift.hadRecentInput && typeof shift.value === 'number') {
            const win = window as unknown as { __dviewCls?: number };
            win.__dviewCls = (win.__dviewCls ?? 0) + shift.value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // WebKit / Safari may not support layout-shift PerformanceObserver
    }
  });

  return diag;
}

async function getCls(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __dviewCls?: number }).__dviewCls ?? 0);
}

async function assertZeroRuntimeErrors(page: Page, diag: PageDiagnostics): Promise<void> {
  expect(diag.pageErrors, `Uncaught pageerrors: ${diag.pageErrors.join(' | ')}`).toEqual([]);
  const hasErrorOverlay = await page.evaluate(() => {
    if (document.querySelector('#__next-build-error, [data-nextjs-dialog]')) return true;
    const text = document.body?.innerText ?? '';
    return text.includes('Unhandled Runtime Error') || text.includes('Application error:');
  });
  expect(hasErrorOverlay).toBe(false);
}

async function gotoRoute(page: Page, routePath: string): Promise<void> {
  const response = await page.goto(routePath, { waitUntil: 'domcontentloaded' });
  expect(response, `Expected non-null response for ${routePath}`).not.toBeNull();
  expect(response!.status()).toBeLessThan(400);
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20000 });
  // Wait briefly for client hydration & SWR static JSON caches to settle
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
}

async function clickCentered(locator: Locator): Promise<void> {
  const page = locator.page();
  await locator.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await page
    .waitForFunction(() => !document.body.classList.contains('is-scrolling'), { timeout: 2000 })
    .catch(() => undefined);
  await locator.click();
}

async function expandHomeTimeline(page: Page): Promise<void> {
  const expandBtn = page.getByTestId('timeline-inline-expand-btn');
  if (await expandBtn.isVisible().catch(() => false)) {
    await clickCentered(expandBtn);
  }
  await expect(page.getByTestId('timeline-inline-expanded-view')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('timeline-inline-date-rail')).toBeVisible({ timeout: 20000 });
  // Wait for full recent-transactions.json SWR hydration (> 1 date group in rail)
  await expect
    .poll(async () => page.locator('[data-testid^="timeline-date-rail-item-"]').count(), {
      timeout: 20000,
    })
    .toBeGreaterThan(1);
}

async function assertNoHorizontalOverflow(page: Page, contextLabel: string): Promise<void> {
  // Allow ResizeObserver / responsive media queries 2 frames to settle after viewport resize
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
  await expect
    .poll(
      async () =>
        page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      { timeout: 2000 }
    )
    .toBe(true)
    .catch(() => undefined);
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      innerWidth: window.innerWidth,
    };
  });
  expect(
    metrics.scrollWidth,
    `${contextLabel}: documentElement.scrollWidth (${metrics.scrollWidth}) > clientWidth (${metrics.clientWidth})`
  ).toBeLessThanOrEqual(metrics.clientWidth);
}

async function assertNotClippedHorizontally(locator: Locator, label: string): Promise<void> {
  const result = await locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      text: (el.textContent ?? '').trim(),
      overflowX: style.overflowX,
    };
  });
  expect(
    result.scrollWidth,
    `${label} ("${result.text}") horizontally clipped: scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`
  ).toBeLessThanOrEqual(result.clientWidth + 1);
}

async function assertCleanRealText(text: string, label: string): Promise<void> {
  expect(text, `${label} contains NaN`).not.toMatch(/\bNaN\b/);
  expect(text, `${label} contains undefined`).not.toMatch(/\bundefined\b/);
  expect(text, `${label} contains Infinity`).not.toMatch(/\bInfinity\b/);
}

async function assertDesignTokensInScope(page: Page, scopeSelector: string): Promise<void> {
  const audit = await page.evaluate(
    ({
      selector,
      bannedFonts,
      emojiPattern,
      palettePattern,
    }: {
      selector: string;
      bannedFonts: readonly string[];
      emojiPattern: string;
      palettePattern: string;
    }) => {
      const root = document.querySelector(selector) ?? document.body;
      const fontMonoCount = root.querySelectorAll('.font-mono').length;

      const bodyFont = window.getComputedStyle(document.body).fontFamily.toLowerCase();
      const rootFont = window.getComputedStyle(root).fontFamily.toLowerCase();
      const hasPretendard = bodyFont.includes('pretendard') || rootFont.includes('pretendard');

      const bannedFontMatches: string[] = [];
      for (const token of bannedFonts) {
        if (bodyFont.includes(token) || rootFont.includes(token)) {
          bannedFontMatches.push(token);
        }
      }

      // Check ALL text-bearing & interactive elements in scope (zero arbitrary slice cap)
      const candidates = Array.from(root.querySelectorAll('h1, h2, h3, h4, p, span, td, th, a, button, li'));
      const nonPretendardSamples: string[] = [];
      const nonTabularSamples: string[] = [];
      const emojiSamples: string[] = [];
      const bannedPaletteSamples: string[] = [];

      const emojiRe = new RegExp(emojiPattern, 'u');
      const paletteRe = new RegExp(palettePattern);

      for (const el of candidates) {
        const cls = typeof el.className === 'string' ? el.className : '';
        if (paletteRe.test(cls)) {
          bannedPaletteSamples.push(cls.slice(0, 80));
        }
        const txt = (el.textContent ?? '').trim();
        if (txt && emojiRe.test(txt)) {
          emojiSamples.push(txt.slice(0, 40));
        }
        const cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const ff = cs.fontFamily.toLowerCase();
        if (!ff.includes('pretendard')) {
          nonPretendardSamples.push(`${el.tagName}:${ff.slice(0, 40)}`);
        }
        for (const token of bannedFonts) {
          if (ff.includes(token)) {
            bannedFontMatches.push(`${el.tagName}:${token}`);
          }
        }
      }

      const keyNumericSelectors = [
        '[data-testid="dongtan1-weighted-avg-price"]',
        '[data-testid="dongtan2-weighted-avg-price"]',
        '[data-testid="vs-weighted-price-diff"]',
        '[data-testid="timeline-inline-stat-volume"] .tabular-nums',
        '[data-testid="timeline-inline-stat-price"] .tabular-nums',
        '.tabular-nums',
      ];
      const matchedVisibleCounts: Record<string, number> = {};
      for (const numSel of keyNumericSelectors) {
        const els = Array.from(root.querySelectorAll(numSel)).slice(0, 40);
        let visibleCount = 0;
        for (const el of els) {
          const cs = window.getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          visibleCount += 1;
          const fvn = cs.fontVariantNumeric.toLowerCase();
          const ffs = cs.fontFeatureSettings.toLowerCase();
          if (!fvn.includes('tabular-nums') && !ffs.includes('tnum')) {
            nonTabularSamples.push(`${numSel}(${fvn}/${ffs})`);
          }
        }
        matchedVisibleCounts[numSel] = visibleCount;
      }

      const adInsideDetailsCount = document.querySelectorAll(
        'details ins.adsbygoogle, details [data-ad-slot], details [data-testid="ad-slot"], details [data-testid="ad-slot-container"], details [data-slot-format], details [data-testid^="ssr-adslot"], details [data-testid*="adslot"], details [data-slot-id]'
      ).length;

      return {
        fontMonoCount,
        hasPretendard,
        bannedFontMatches: Array.from(new Set(bannedFontMatches)),
        nonPretendardSamples: nonPretendardSamples.slice(0, 5),
        nonTabularSamples: nonTabularSamples.slice(0, 5),
        matchedVisibleCounts,
        emojiSamples: emojiSamples.slice(0, 5),
        bannedPaletteSamples: bannedPaletteSamples.slice(0, 5),
        adInsideDetailsCount,
      };
    },
    {
      selector: scopeSelector,
      bannedFonts: PROHIBITED_FONT_TOKENS,
      emojiPattern: EMOJI_REGEX.source,
      palettePattern: PROHIBITED_PALETTE_CLASS_REGEX.source,
    }
  );

  expect(audit.fontMonoCount, `${scopeSelector}: .font-mono forbidden`).toBe(0);
  expect(audit.hasPretendard, `${scopeSelector}: Pretendard font missing`).toBe(true);
  expect(audit.nonPretendardSamples, `${scopeSelector}: non-Pretendard computed fonts`).toEqual([]);
  if (scopeSelector === '[data-testid="timeline-inline-expanded-view"]') {
    expect(
      audit.matchedVisibleCounts['[data-testid="timeline-inline-stat-volume"] .tabular-nums'] ?? 0,
      `${scopeSelector}: expected visible timeline-inline-stat-volume .tabular-nums elements`
    ).toBeGreaterThan(0);
    expect(
      audit.matchedVisibleCounts['[data-testid="timeline-inline-stat-price"] .tabular-nums'] ?? 0,
      `${scopeSelector}: expected visible timeline-inline-stat-price .tabular-nums elements`
    ).toBeGreaterThan(0);
  }
  if (scopeSelector === '#dongtan-1-vs-2-comparison') {
    expect(
      audit.matchedVisibleCounts['[data-testid="dongtan1-weighted-avg-price"]'] ?? 0,
      `${scopeSelector}: expected visible dongtan1-weighted-avg-price element`
    ).toBeGreaterThan(0);
    expect(
      audit.matchedVisibleCounts['[data-testid="dongtan2-weighted-avg-price"]'] ?? 0,
      `${scopeSelector}: expected visible dongtan2-weighted-avg-price element`
    ).toBeGreaterThan(0);
    expect(
      audit.matchedVisibleCounts['[data-testid="vs-weighted-price-diff"]'] ?? 0,
      `${scopeSelector}: expected visible vs-weighted-price-diff element`
    ).toBeGreaterThan(0);
  }
  expect(audit.nonTabularSamples, `${scopeSelector}: key metrics missing tabular-nums`).toEqual([]);
  expect(audit.bannedFontMatches, `${scopeSelector}: banned font tokens`).toEqual([]);
  expect(audit.emojiSamples, `${scopeSelector}: Unicode emojis forbidden`).toEqual([]);
  expect(audit.bannedPaletteSamples, `${scopeSelector}: prohibited palette classes`).toEqual([]);
  expect(audit.adInsideDetailsCount, `${scopeSelector}: AdSlot inside <details> forbidden`).toBe(0);
}

async function assertStickyHeaderClearance(
  page: Page,
  targetSelector: string,
  label: string
): Promise<void> {
  const target = page.locator(targetSelector).first();
  await expect(target, `${label}: target not visible`).toBeVisible({ timeout: 20000 });
  await target.evaluate((el) => {
    el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });

  const metrics = await target.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const scrollY = window.scrollY;
    const desktopHeader = document.querySelector('header[role="banner"]');
    const desktopHeaderVisible =
      vw >= 768 && desktopHeader !== null && window.getComputedStyle(desktopHeader).display !== 'none';
    const headerBottom = desktopHeaderVisible
      ? desktopHeader.getBoundingClientRect().bottom
      : scrollY > 80
        ? 48
        : 0;
    return {
      rectTop: rect.top,
      vw,
      scrollY,
      desktopHeaderVisible,
      headerBottom,
    };
  });

  if (metrics.vw >= 768) {
    expect(
      metrics.headerBottom,
      `${label}: desktop sticky header bottom expected >= 78px`
    ).toBeGreaterThanOrEqual(78);
    expect(
      metrics.rectTop,
      `${label}: clipped under desktop sticky header (rectTop=${metrics.rectTop}, headerBottom=${metrics.headerBottom})`
    ).toBeGreaterThanOrEqual(metrics.headerBottom - 1);
    expect(
      metrics.rectTop,
      `${label}: desktop scroll-mt target landed too far below sticky header (rectTop=${metrics.rectTop}, headerBottom=${metrics.headerBottom})`
    ).toBeLessThanOrEqual(metrics.headerBottom + 160);
  } else if (metrics.scrollY > 80) {
    expect(
      metrics.rectTop,
      `${label}: clipped under mobile 48px fixed header (rectTop=${metrics.rectTop}, scrollY=${metrics.scrollY})`
    ).toBeGreaterThanOrEqual(47);
  }
}

async function navigateViaNav(page: Page, href: string, mobileNavLabel: string): Promise<void> {
  if (isMobileViewport(page)) {
    const mobileDockNav = page
      .locator('nav.fixed, nav[class*="bottom-0"]')
      .filter({ has: page.locator('a[href="/stats"]') })
      .filter({ has: page.locator('a[href="/guide"]') })
      .first();
    const dockLink = mobileDockNav.locator(`a[href="${href}"]`).first();
    await expect(dockLink, `MobileDock link for ${href} (${mobileNavLabel}) not visible`).toBeVisible({
      timeout: 10000,
    });
    await expect(dockLink).toContainText(mobileNavLabel);
    await page
      .waitForFunction(() => !document.body.classList.contains('is-scrolling'), { timeout: 2000 })
      .catch(() => undefined);
    await dockLink.click();
  } else {
    await page
      .waitForFunction(() => !document.body.classList.contains('is-scrolling'), { timeout: 2000 })
      .catch(() => undefined);
    await page.locator(`header[role="banner"] a[href="${href}"]`).first().click();
  }
  await page.waitForURL((url) => url.pathname === href, { timeout: 20000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20000 });
}

// ===========================================================================
// TIER 1: FEATURE COVERAGE (40 Cases — 5 per Feature F1–F8)
// ===========================================================================

test.describe('Tier 1: Feature Coverage (F1–F8, 40 Cases)', () => {
  test('Tier 1A: Main Page (/) Features F1–F5 (T1-F1-01 .. T1-F5-05)', async ({ page }) => {
    test.setTimeout(120000);
    const diag = await attachCleanInstrumentation(page);

    await gotoRoute(page, '/');
    await expandHomeTimeline(page);

    // --- F1: Main Timeline Left Rail (일자별 요약) ---
    await test.step('T1-F1-01: 일자별 요약 좌측 레일 컨테이너 및 헤더가 마운트되어 표시된다', async () => {
      const rail = page.getByTestId('timeline-inline-date-rail');
      await expect(rail).toBeVisible();
      await expect(rail).toContainText('일자별 요약');
    });

    await test.step('T1-F1-02: 실거래 JSON 하이드레이션 후 다수 일자 행과 전체 일자 버튼이 노출된다', async () => {
      const allBtn = page.getByTestId('timeline-date-rail-all');
      await expect(allBtn).toBeVisible();
      await expect(allBtn).toContainText(/총\s*[\d,]+건/);
      const itemCount = await page.locator('[data-testid^="timeline-date-rail-item-"]').count();
      expect(itemCount).toBeGreaterThan(1);
    });

    await test.step('T1-F1-03: 각 일자 요약 행에 날짜, 거래 건수, 평균가 정보가 2줄 포맷으로 표시된다', async () => {
      const firstRow = page.locator('[data-testid^="timeline-date-rail-item-"]').first();
      const text = (await firstRow.innerText()).trim();
      expect(text).toMatch(/\d{4}\.\d{2}\.\d{2}/);
      expect(text).toMatch(/[\d,]+건/);
      expect(text).toMatch(/평균\s*(?:\d+억|\d[\d,]*만|-)/);
    });

    await test.step('T1-F1-04: 일자별 상대 거래량 비율 바가 접근 가능한 라벨 또는 의미 설명을 제공한다', async () => {
      const rows = page.locator('[data-testid^="timeline-date-rail-item-"]');
      const barInfo = await rows.first().evaluate((row) => {
        const accessibleBar = row.querySelector('[role="progressbar"], [aria-label*="거래"], [title*="거래"], [title*="비율"], [aria-label*="비율"]');
        if (accessibleBar) {
          const label = (
            accessibleBar.getAttribute('aria-label') ||
            accessibleBar.getAttribute('title') ||
            accessibleBar.textContent ||
            ''
          ).trim();
          return {
            barCount: 1,
            hasAccessibleBar: label.length > 0,
            label,
          };
        }
        const widthStyled = row.querySelector('[style*="width"]');
        if (!widthStyled) {
          return { barCount: 0, hasAccessibleBar: false, label: '' };
        }
        const parentLabel = (
          widthStyled.getAttribute('title') ||
          widthStyled.getAttribute('aria-label') ||
          widthStyled.parentElement?.getAttribute('title') ||
          widthStyled.parentElement?.getAttribute('aria-label') ||
          ''
        ).trim();
        return { barCount: 1, hasAccessibleBar: parentLabel.length > 0, label: parentLabel };
      });
      expect(barInfo.barCount, 'Expected relative volume bar element inside rail row').toBeGreaterThan(0);
      expect(barInfo.hasAccessibleBar, 'Relative volume bar must have non-empty title/aria-label/progressbar role').toBe(
        true
      );
    });

    await test.step('T1-F1-05: 일자별 요약 전체 영역에 NaN, undefined, Infinity가 존재하지 않는다', async () => {
      const railText = await page.getByTestId('timeline-inline-date-rail').innerText();
      await assertCleanRealText(railText, 'timeline-inline-date-rail');
    });

    // --- F2: Main Timeline Right Grid (일자별 실거래 내역) ---
    await test.step('T1-F2-01: 일자별 실거래 내역 스크롤 컨테이너와 날짜 그룹이 표시된다', async () => {
      await expect(page.getByTestId('timeline-scroll-container')).toBeVisible();
      const groupCount = await page.locator('[data-testid^="timeline-group-"]').count();
      expect(groupCount).toBeGreaterThan(0);
    });

    await test.step('T1-F2-02: 실거래 카드에 단지명, 법정동, 면적, 층, 실거래가(억/만)가 표시된다', async () => {
      const firstCardBtn = page.locator('[data-testid="timeline-scroll-container"] button[aria-label^="실거래 분석 아파트 선택:"]').first();
      await expect(firstCardBtn).toBeVisible();
      const cardContainer = firstCardBtn.locator('xpath=ancestor::*[.//button[contains(@aria-label, "상세 정보 보기")]][1]');
      const cardText = await cardContainer.innerText();
      expect(cardText).toMatch(/동/);
      expect(cardText).toMatch(/층/);
      expect(cardText).toMatch(/억|만/);
    });

    await test.step('T1-F2-03: 신고가 배지가 있는 카드에서도 단지명 식별이 가능하다', async () => {
      const newHighCards = page.locator('[data-testid="timeline-scroll-container"] button[aria-label^="실거래 분석 아파트 선택:"]', {
        hasText: '신고가',
      });
      let switchedToNewHigh = false;
      if ((await newHighCards.count()) === 0) {
        await clickCentered(page.getByTestId('timeline-segment-new-high'));
        switchedToNewHigh = true;
      }
      await expect.poll(async () => newHighCards.count(), { timeout: 10000 }).toBeGreaterThan(0);

      const firstNewHigh = newHighCards.first();
      await expect(firstNewHigh).toContainText('신고가');
      const titleNode = firstNewHigh.getByTestId('timeline-card-title');
      await expect(titleNode).toBeVisible();
      const fullTitle = ((await titleNode.getAttribute('title')) ?? '').trim();
      const visibleText = (await titleNode.innerText()).trim();
      expect(fullTitle.length).toBeGreaterThan(0);
      expect(visibleText).not.toMatch(/^.{1,5}(?:\.\.\.|…)$/u);
      expect(visibleText.replace(/(?:\.\.\.|…)$/u, '').length).toBeGreaterThanOrEqual(
        Math.min(8, fullTitle.length)
      );

      if (switchedToNewHigh) {
        await clickCentered(page.getByTestId('timeline-segment-all'));
        await expect(page.getByTestId('timeline-segment-all')).toHaveAttribute('aria-selected', 'true');
      }
    });

    await test.step('T1-F2-04: 세그먼트 필터 탭과 뷰 전환 탭이 렌더링되고 상호작용이 동작한다', async () => {
      await expect(page.getByTestId('timeline-segment-tabs')).toBeVisible();
      await expect(page.getByTestId('timeline-view-tab-switcher')).toBeVisible();
      await clickCentered(page.getByTestId('timeline-tab-live-rankings'));
      await expect(page.getByTestId('timeline-tab-live-rankings')).toHaveAttribute('aria-selected', 'true');
      await clickCentered(page.getByTestId('timeline-tab-transactions'));
      await expect(page.getByTestId('timeline-tab-transactions')).toHaveAttribute('aria-selected', 'true');
    });

    await test.step('T1-F2-05: 일자별 실거래 카드 그리드에 NaN, undefined, 중개거래 정보 없음이 없다', async () => {
      const gridText = await page.getByTestId('timeline-scroll-container').innerText();
      await assertCleanRealText(gridText, 'timeline-scroll-container');
      expect(gridText).not.toContain('중개거래 정보 없음');
    });

    // --- F3: Main Bottom Report Hub & Accordions ---
    await test.step('T1-F3-01: 메인 하단 #home-ssr-market-editorial과 통합 리포트 허브가 표시되고 H1은 정확히 1개다', async () => {
      await expect(page.locator('#home-ssr-market-editorial')).toBeVisible();
      await expect(page.locator('#home-lab-to-guide-interlink')).toBeVisible();
      await expect(page.locator('h1:visible')).toHaveCount(1);
    });

    await test.step('T1-F3-02: 통합 리포트 허브에서 /guide 전체보기 링크와 #home-guide-4col-grid가 제공된다', async () => {
      await expect(page.locator('#home-ssr-market-editorial a[href="/guide"]').first()).toBeVisible();
      await expect(page.locator('#home-guide-4col-grid')).toBeAttached();
    });

    await test.step('T1-F3-03: #home-ssr-recent-tx-accordion 내 15개 이상 실거래 단지 링크와 정상 가격이 포함된다', async () => {
      const recentTxAccordion = page.locator('#home-ssr-recent-tx-accordion');
      await expect(recentTxAccordion).toBeAttached();
      const aptLinkCount = await recentTxAccordion.locator('a[href^="/apartment/"]').count();
      expect(aptLinkCount).toBeGreaterThanOrEqual(15);
      const rawText = (await recentTxAccordion.innerHTML()) ?? '';
      expect(rawText).toMatch(/억|만원/);
      expect(rawText).not.toContain('정보 없음');
    });

    await test.step('T1-F3-04: #home-guide-4col-grid 내 20개 이상의 /guide/ 리포트 링크가 존재한다', async () => {
      const guideLinks = await page.locator('#home-guide-4col-grid a[href^="/guide/"]').count();
      expect(guideLinks).toBeGreaterThanOrEqual(20);
    });

    await test.step('T1-F3-05: #home-ssr-market-editorial 내부 텍스트 및 aria-label에 구버전 용어 "가이드"가 없다', async () => {
      const staleCheck = await page.locator('#home-ssr-market-editorial').evaluate((root) => {
        const text = root.textContent ?? '';
        const ariaLabels = Array.from(root.querySelectorAll('[aria-label]'))
          .map((el) => el.getAttribute('aria-label') ?? '')
          .join(' ');
        return { hasInText: text.includes('가이드'), hasInAria: ariaLabels.includes('가이드') };
      });
      expect(staleCheck.hasInText).toBe(false);
      expect(staleCheck.hasInAria).toBe(false);
    });

    // --- F4: Main Bottom 7대 권역별 실거래 · 입지 ---
    await test.step('T1-F4-01: 7대 권역별 실거래 · 입지 섹션 제목이 표시된다', async () => {
      const heading = page.locator('#home-ssr-market-editorial h3', { hasText: '7대 권역별 실거래' });
      await expect(heading).toBeVisible();
    });

    await test.step('T1-F4-02: 정확히 7개의 /zone/ 권역 카드가 렌더링된다', async () => {
      const zoneLinks = page.locator('#home-ssr-market-editorial a[href^="/zone/"]');
      await expect(zoneLinks).toHaveCount(7);
    });

    await test.step('T1-F4-03: 모든 권역 카드가 권역명(h4)과 요약 설명(p)을 표출한다', async () => {
      const zoneLinks = page.locator('#home-ssr-market-editorial a[href^="/zone/"]');
      const count = await zoneLinks.count();
      for (let i = 0; i < count; i += 1) {
        const card = zoneLinks.nth(i);
        await expect(card.locator('h4')).toBeVisible();
        await expect(card.locator('p')).toBeVisible();
      }
    });

    await test.step('T1-F4-04: 7개 권역 href가 중복 없이 표준 동탄 7대 권역 경로와 일치한다', async () => {
      const hrefs = await page
        .locator('#home-ssr-market-editorial a[href^="/zone/"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
      expect(new Set(hrefs).size).toBe(7);
      for (const expectedHref of EXPECTED_ZONE_HREFS) {
        expect(hrefs).toContain(expectedHref);
      }
    });

    await test.step('T1-F4-05: 7대 권역 카드 텍스트에 NaN, undefined, 0만 결함이 없다', async () => {
      const zoneTexts = await page
        .locator('#home-ssr-market-editorial a[href^="/zone/"]')
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText).join(' | '));
      await assertCleanRealText(zoneTexts, '7-zones');
      expect(zoneTexts).not.toMatch(/\b0만/);
    });

    // --- F5: Main Bottom 시세 리더 TOP 10 단지 ---
    await test.step('T1-F5-01: 시세 리더 TOP 10 단지 섹션 제목이 표시된다', async () => {
      const heading = page.locator('#home-ssr-market-editorial h3', { hasText: '시세 리더 TOP 10 단지' });
      await expect(heading).toBeVisible();
    });

    await test.step('T1-F5-02: 정확히 10개의 TOP 10 아파트 랭킹 카드(#1~#10)가 표시된다', async () => {
      const top10Section = page
        .locator('#home-ssr-market-editorial h3', { hasText: '시세 리더 TOP 10 단지' })
        .locator('xpath=ancestor::*[.//a[starts-with(@href, "/apartment/")]][1]');
      const links = top10Section.locator('a[href^="/apartment/"]');
      await expect(links).toHaveCount(10);
    });

    await test.step('T1-F5-03: 각 TOP 10 카드에 순위(#1~#10), 법정동, 단지명, 거래가(억/만원)가 포함된다', async () => {
      const top10Section = page
        .locator('#home-ssr-market-editorial h3', { hasText: '시세 리더 TOP 10 단지' })
        .locator('xpath=ancestor::*[.//a[starts-with(@href, "/apartment/")]][1]');
      const texts = await top10Section
        .locator('a[href^="/apartment/"]')
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText.trim()));
      expect(texts).toHaveLength(10);
      texts.forEach((txt, idx) => {
        expect(txt).toContain(`#${idx + 1}`);
        expect(txt).toMatch(/동/);
        expect(txt).toMatch(/억|만원/);
      });
    });

    await test.step('T1-F5-04: 전체 단지 탐색(/explore) 바로가기 링크가 표시된다', async () => {
      const exploreLink = page.locator('#home-ssr-market-editorial a[href="/explore"]', {
        hasText: '전체 단지 탐색',
      });
      await expect(exploreLink).toBeVisible();
    });

    await test.step('T1-F5-05: TOP 10 카드에 NaN, undefined, %20 공백 인코딩 오류가 없다', async () => {
      const top10Section = page
        .locator('#home-ssr-market-editorial h3', { hasText: '시세 리더 TOP 10 단지' })
        .locator('xpath=ancestor::*[.//a[starts-with(@href, "/apartment/")]][1]');
      const data = await top10Section.locator('a[href^="/apartment/"]').evaluateAll((els) =>
        els.map((el) => ({
          href: el.getAttribute('href') ?? '',
          text: (el as HTMLElement).innerText,
        }))
      );
      for (const item of data) {
        await assertCleanRealText(item.text, 'TOP10 card');
        expect(item.href).not.toContain('%20');
      }
    });

    await assertZeroRuntimeErrors(page, diag);
  });

  test('Tier 1B: Stats Page (/stats) Features F6–F7 (T1-F6-01 .. T1-F7-05)', async ({ page }) => {
    test.setTimeout(120000);
    const diag = await attachCleanInstrumentation(page);

    await gotoRoute(page, '/stats');

    // --- F6: /stats 동탄1 vs 동탄2 1:1 매치업 ---
    await test.step('T1-F6-01: /stats 페이지에 단일 H1 "아파트 통계"가 표시된다', async () => {
      await expect(page.locator('h1:visible')).toHaveCount(1);
      await expect(page.locator('h1').first()).toContainText('아파트 통계');
    });

    await test.step('T1-F6-02: #dongtan-1-vs-2-comparison 스코어보드와 비교 가이드 CTA가 표시된다', async () => {
      await expect(page.locator('#dongtan-1-vs-2-comparison')).toBeVisible();
      await expect(page.getByTestId('dongtan1-weighted-avg-price')).toBeVisible();
      await expect(page.getByTestId('dongtan2-weighted-avg-price')).toBeVisible();
      await expect(page.getByTestId('vs-weighted-price-diff')).toBeVisible();
      const cta = page.getByTestId('stats-to-guide-hero-cta');
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute('href', '/guide/dongtan-1-vs-2-comparison');
    });

    await test.step('T1-F6-03: 정확히 4개의 1:1 매치업 카드(rival-matchup-*)가 렌더링된다', async () => {
      const matchups = page.locator('[data-testid^="rival-matchup-"]');
      await expect(matchups).toHaveCount(4);
      await expect(page.getByTestId('rival-matchup-landmark-flagship')).toBeVisible();
      await expect(page.getByTestId('rival-matchup-sibeom-prime')).toBeVisible();
      await expect(page.getByTestId('rival-matchup-school-zone-rival')).toBeVisible();
      await expect(page.getByTestId('rival-matchup-park-lake-lifestyle')).toBeVisible();
    });

    await test.step('T1-F6-04: 각 1:1 매치업 카드가 면적(㎡), 평당가(평당) 비교와 단지/리포트 링크를 간결히 표출한다', async () => {
      const matchups = page.locator('[data-testid^="rival-matchup-"]');
      const count = await matchups.count();
      expect(count).toBe(4);
      for (let i = 0; i < count; i += 1) {
        const card = matchups.nth(i);
        const txt = await card.innerText();
        expect(txt).toMatch(/㎡/);
        expect(txt).toMatch(/평당/);
        expect(txt).toMatch(/만\/평|평당\s*[\d,]+만/);
        expect(await card.locator('a[href^="/apartment/"]').count()).toBeGreaterThanOrEqual(2);
        expect(await card.locator('a[href^="/guide/"]').count()).toBeGreaterThanOrEqual(1);

        const descP = card.locator('p').first();
        await expect(descP).toHaveCount(1);
        const descText = (await descP.innerText()).trim();
        expect(measureGraphemes(descText), `Matchup card ${i} description > 50 chars: "${descText}"`).toBeLessThanOrEqual(
          DVIEW_COPY_BUDGETS.cardDescription
        );
        expect(VERBOSE_PROSE_ENDING_REGEX.test(descText), `Verbose prose in matchup card ${i}: "${descText}"`).toBe(
          false
        );
      }
    });

    await test.step('T1-F6-05: #dongtan-1-vs-2-comparison 영역에 NaN, undefined가 없다', async () => {
      const txt = await page.locator('#dongtan-1-vs-2-comparison').innerText();
      await assertCleanRealText(txt, '#dongtan-1-vs-2-comparison');
    });

    // --- F7: /stats OLS 선형회귀 요약 (#stats-ssr-regression-summary) ---
    await test.step('T1-F7-01: #stats-ssr-regression-summary가 렌더링되고 Layer 1/2 요약 지표를 표출한다', async () => {
      const section = page.locator('#stats-ssr-regression-summary');
      await expect(section).toBeVisible();
      const visibleTxt = await section.innerText();
      expect(visibleTxt).toMatch(/동탄역 거리별.*요약/);
      expect(visibleTxt).toMatch(/단지/);
      expect(visibleTxt).toMatch(/건/);
      const fullDomTxt = (await section.textContent()) ?? '';
      expect(fullDomTxt).toContain('동탄역 거리별 아파트 실거래가 OLS 선형회귀 요약');
    });

    await test.step('T1-F7-02: 거리 구간 <li> 요소가 정확히 5개(500m~3km 이상) 존재한다', async () => {
      const lis = page.locator('#stats-ssr-regression-summary li');
      await expect(lis).toHaveCount(5);
      const joined = (await lis.allInnerTexts()).join(' ');
      expect(joined).toContain('500m');
      expect(joined).toContain('3km');
    });

    await test.step('T1-F7-03: 5개 주제별 요약 앵커 ID가 모두 DOM에 존재하고 표시된다', async () => {
      const ids = [
        '#stats-ssr-undervalued-summary',
        '#stats-ssr-dongtan-1-vs-2-summary',
        '#stats-ssr-school-district-summary',
        '#stats-ssr-lake-park-summary',
        '#stats-ssr-building-age-summary',
      ];
      for (const id of ids) {
        await expect(page.locator(id)).toBeVisible();
      }
    });

    await test.step('T1-F7-04: 5개 주제별 요약 블록 내 유효한 /guide/ 및 /apartment/ 링크가 연결된다', async () => {
      const guideLinks = await page.locator('#stats-ssr-regression-summary a[href^="/guide/"]').count();
      const aptLinks = await page.locator('#stats-ssr-undervalued-summary a[href^="/apartment/"]').count();
      expect(guideLinks).toBeGreaterThanOrEqual(5);
      expect(aptLinks).toBeGreaterThanOrEqual(1);
    });

    await test.step('T1-F7-05: #stats-ssr-regression-summary 텍스트에 NaN, undefined가 없다', async () => {
      const txt = await page.locator('#stats-ssr-regression-summary').innerText();
      await assertCleanRealText(txt, '#stats-ssr-regression-summary');
    });

    await assertZeroRuntimeErrors(page, diag);
  });

  test('Tier 1C: Guide Page (/guide) Feature F8 (T1-F8-01 .. T1-F8-05)', async ({ page }) => {
    test.setTimeout(120000);
    const diag = await attachCleanInstrumentation(page);

    await gotoRoute(page, '/guide');

    await test.step('T1-F8-01: /guide 페이지에 단일 H1 "D-VIEW 분석 리포트"가 표시된다', async () => {
      await expect(page.locator('h1:visible')).toHaveCount(1);
      await expect(page.locator('h1').first()).toContainText('D-VIEW 분석 리포트');
    });

    await test.step('T1-F8-02: 상단 전환 허브와 에듀타운 스포트라이트가 표시된다', async () => {
      await expect(page.getByTestId('guide-index-top-conversion-hub')).toBeVisible();
      await expect(page.getByTestId('guide-index-lake-edutown-spotlight')).toBeVisible();
    });

    await test.step('T1-F8-03: 정확히 23개의 분석 리포트 카드(<article>)가 렌더링된다', async () => {
      await expect(page.locator('main article')).toHaveCount(23);
    });

    await test.step('T1-F8-04: 23개 카드 모두 카테고리/날짜/H2 제목/유효한 /guide/[slug] 링크를 가진다', async () => {
      const cards = page.locator('main article');
      const count = await cards.count();
      for (let i = 0; i < count; i += 1) {
        const card = cards.nth(i);
        const h2Link = card.locator('h2 a[href^="/guide/"]');
        await expect(h2Link).toBeVisible();
        const href = await h2Link.getAttribute('href');
        expect(href).toMatch(/^\/guide\/[a-z0-9-]+$/);
        const cardText = await card.innerText();
        expect(cardText).toMatch(/\d{4}-\d{2}-\d{2}/);
      }
    });

    await test.step('T1-F8-05: /guide 메인 영역에 NaN, undefined가 존재하지 않는다', async () => {
      const txt = await page.locator('main').innerText();
      await assertCleanRealText(txt, '/guide main');
    });

    await assertZeroRuntimeErrors(page, diag);
  });
});

// ===========================================================================
// TIER 2: BOUNDARY, CORNER CASES & VISUAL GEOMETRY (40 Cases — 5 per Feature)
// ===========================================================================

test.describe('Tier 2: Boundary & Visual Geometry Cases (F1–F8, 40 Cases)', () => {
  test('Tier 2A: Main Page (/) Geometry & BVA F1–F5 (T2-F1-01 .. T2-F5-05)', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const mobileProj = isMobileProject(testInfo);
    const diag = await attachCleanInstrumentation(page);

    if (!mobileProj) {
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await gotoRoute(page, '/');
    await expandHomeTimeline(page);

    // --- F1 Boundary & Geometry ---
    await test.step('T2-F1-01: 일자별 요약 내 긴 단지명이 우측 최고가 가격 텍스트를 잘리게(16억2...) 만들지 않는다', async () => {
      const railRows = page.locator('[data-testid^="timeline-date-rail-item-"]');
      const count = Math.min(await railRows.count(), 20);
      for (let i = 0; i < count; i += 1) {
        const row = railRows.nth(i);
        const rowText = (await row.innerText()).trim();
        expect(rowText, `Peak price clipped in rail row ${i}: ${rowText}`).not.toMatch(/\d+억\s*\d*(?:\.\.\.|…)/u);
      }
    });

    await test.step('T2-F1-02: 일자별 요약 행 내 핵심 수치(날짜, 건수, 평균, 최고가)가 가로 잘림 없이 표시된다', async () => {
      const rail = page.getByTestId('timeline-inline-date-rail');
      const items = rail.locator('[data-testid^="timeline-date-rail-item-"]');
      const checkCount = Math.min(await items.count(), 6);
      for (let i = 0; i < checkCount; i += 1) {
        await assertNotClippedHorizontally(items.nth(i), `rail item ${i}`);
      }
    });

    await test.step('T2-F1-03: 특정 일자 클릭 시 aria-pressed="true"로 전환되고 우측 실거래 그리드가 해당 일자로 필터링된다', async () => {
      const secondDateRow = page.locator('[data-testid^="timeline-date-rail-item-"]').nth(1);
      await clickCentered(secondDateRow);
      await expect(secondDateRow).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-testid^="timeline-group-"]')).toHaveCount(1);
    });

    await test.step('T2-F1-04: 전체 일자 복원 버튼 클릭 시 다중 일자 그룹으로 복귀한다', async () => {
      const resetBtn = page.getByTestId('timeline-date-rail-reset');
      if (await resetBtn.isVisible().catch(() => false)) {
        await clickCentered(resetBtn);
      } else {
        await clickCentered(page.getByTestId('timeline-date-rail-all'));
      }
      await expect(page.getByTestId('timeline-date-rail-all')).toHaveAttribute('aria-pressed', 'true');
      await expect
        .poll(async () => page.locator('[data-testid^="timeline-group-"]').count())
        .toBeGreaterThan(1);
    });

    await test.step('T2-F1-05: 모바일 뷰포트(375px 이하)에서 일자별 요약 레일이 가로 오버플로우 없이 적층된다', async () => {
      if (!mobileProj) {
        await page.setViewportSize({ width: 375, height: 812 });
      }
      await assertNoHorizontalOverflow(page, 'Home timeline rail mobile');
      if (!mobileProj) {
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    });

    // --- F2 Boundary & Geometry ---
    await test.step('T2-F2-01: 데스크톱 1440px에서 실거래 카드 너비가 3열 과밀(>260px) 이상으로 확보된다', async () => {
      const firstCard = page
        .locator('[data-testid="timeline-scroll-container"] button[aria-label^="실거래 분석 아파트 선택:"]')
        .first()
        .locator('xpath=ancestor::*[.//button[contains(@aria-label, "상세 정보 보기")]][1]');
      const box = await firstCard.boundingBox();
      expect(box).not.toBeNull();
      if (!mobileProj) {
        expect(box!.width).toBeGreaterThan(260);
      } else {
        expect(box!.width).toBeGreaterThan(240);
      }
    });

    await test.step('T2-F2-02: 최장 단지명과 신고가 배지가 함께 표시되어도 단지명이 2~3자("동탄...")로 붕괴되지 않는다', async () => {
      const titleStats = await page
        .locator('[data-testid="timeline-scroll-container"] button[aria-label^="실거래 분석 아파트 선택:"] [data-testid="timeline-card-title"]')
        .evaluateAll((els) =>
          els.slice(0, 30).map((el) => {
            const cardBtn = el.closest('button');
            const row = el.parentElement;
            const cs = window.getComputedStyle(el);
            return {
              full: (el.getAttribute('title') ?? '').trim(),
              shown: (el.textContent ?? '').trim(),
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              rowClientWidth: row ? row.clientWidth : el.clientWidth,
              cardWidth: cardBtn ? cardBtn.getBoundingClientRect().width : el.clientWidth,
              whiteSpace: cs.whiteSpace,
            };
          })
        );
      expect(titleStats.length).toBeGreaterThan(0);
      for (const item of titleStats) {
        expect(item.full.length, 'timeline-card-title missing title attribute').toBeGreaterThan(0);
        expect(item.cardWidth, `Card squeezed too narrow for "${item.full}"`).toBeGreaterThanOrEqual(240);
        expect(
          item.rowClientWidth,
          `Title row width < 140px for "${item.full}": rowClientWidth=${item.rowClientWidth}`
        ).toBeGreaterThanOrEqual(mobileProj ? 140 : 200);
        expect(item.shown, `Collapsed complex title: "${item.shown}" (full: "${item.full}")`).not.toMatch(
          /^.{1,5}(?:\.\.\.|…)$/u
        );
        expect(
          item.shown.replace(/(?:\.\.\.|…)$/u, '').length,
          `Insufficient visible prefix for "${item.full}": "${item.shown}"`
        ).toBeGreaterThanOrEqual(Math.min(8, item.full.length));

        if (item.scrollWidth > item.clientWidth + 1) {
          if (mobileProj) {
            expect(
              item.clientWidth,
              `Mobile truncated title "${item.full}" squeezed < 140px: clientWidth=${item.clientWidth}`
            ).toBeGreaterThanOrEqual(140);
          } else {
            expect(
              item.clientWidth,
              `Desktop truncated title "${item.full}" squeezed < 200px: clientWidth=${item.clientWidth}`
            ).toBeGreaterThanOrEqual(200);
            if (item.full.length <= 18) {
              expect(
                item.scrollWidth,
                `Desktop wide card truncated <=18-char title "${item.full}": scrollWidth=${item.scrollWidth} > clientWidth=${item.clientWidth}`
              ).toBeLessThanOrEqual(item.clientWidth + 1);
            }
          }
        }
      }
    });

    await test.step('T2-F2-03: 실거래 카드 및 좌측 레일 가격 포맷이 일관된 띄어쓰기("15억 5,800")를 유지하고 취소선 직전가 경쟁이 없다', async () => {
      const cardTexts = await page
        .locator('[data-testid="timeline-scroll-container"] button[aria-label^="실거래 분석 아파트 선택:"]')
        .evaluateAll((els) => els.slice(0, 20).map((el) => (el as HTMLElement).innerText));
      expect(cardTexts.length).toBeGreaterThan(0);
      for (const txt of cardTexts) {
        expect(txt, `Inconsistent price spacing without space after 억: ${txt}`).not.toMatch(/\d+억\d/);
      }

      const railTexts = await page
        .locator('[data-testid^="timeline-date-rail-item-"]')
        .evaluateAll((els) => els.slice(0, 20).map((el) => (el as HTMLElement).innerText));
      expect(railTexts.length).toBeGreaterThan(0);
      for (const txt of railTexts) {
        expect(txt, `Inconsistent left-rail price spacing without space after 억: ${txt}`).not.toMatch(/\d+억\d/);
      }

      const strikethroughCount = await page
        .locator('[data-testid="timeline-scroll-container"] .line-through')
        .count();
      expect(strikethroughCount, 'Competing strikethrough prior-price elements must be removed (S1-02/S1-03)').toBe(0);
    });

    await test.step('T2-F2-04: 데스크톱 일자 그룹 헤더에 일일 평균 거래가 배지가 정상 표시된다', async () => {
      if (!mobileProj) {
        const firstGroupHeader = page.locator('[data-testid^="timeline-group-"]').first();
        const avgText = await firstGroupHeader.innerText();
        expect(avgText).toMatch(/평균/);
      } else {
        await expect(page.locator('[data-testid^="timeline-group-"]').first()).toBeVisible();
      }
    });

    await test.step('T2-F2-05: 데스크톱과 모바일 모두에서 실거래 그리드의 가로 오버플로우가 0이다', async () => {
      await assertNoHorizontalOverflow(page, 'Home timeline grid desktop/current');
      if (!mobileProj) {
        await page.setViewportSize({ width: 375, height: 812 });
        await assertNoHorizontalOverflow(page, 'Home timeline grid mobile 375');
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    });

    // --- F3 Boundary & Geometry ---
    await test.step('T2-F3-01: 초기 로드 시 #home-ssr-market-editorial 내 모든 <details> 아코디언은 닫혀 있다', async () => {
      const detailsStates = await page
        .locator('#home-ssr-market-editorial details')
        .evaluateAll((els) => els.map((el) => (el as HTMLDetailsElement).open));
      expect(detailsStates.length).toBeGreaterThanOrEqual(2);
      expect(detailsStates.every((open) => open === false)).toBe(true);
    });

    await test.step('T2-F3-02: <summary> 클릭 시 <details.dview-seo-accordion>이 열리고 쉐브론이 180도 회전하며 재클릭 시 닫힌다', async () => {
      const acc = page.locator('#home-ssr-market-editorial details.dview-seo-accordion').first();
      const summary = acc.locator('summary').first();
      await clickCentered(summary);
      expect(await acc.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);
      const chevron = acc.locator('.dview-seo-accordion-chevron').first();
      await expect(chevron).toHaveCount(1);
      await expect
        .poll(() => chevron.evaluate((el) => window.getComputedStyle(el).rotate), { timeout: 2000 })
        .toBe('180deg');
      await clickCentered(summary);
      expect(await acc.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    });

    await test.step('T2-F3-03: 페이지 내 모든 <details> 요소 내부에 AdSlot이 0개다', async () => {
      const adInDetails = await page.locator(ADSLOT_INSIDE_DETAILS_SELECTOR).count();
      expect(adInDetails).toBe(0);
    });

    await test.step('T2-F3-04: 아코디언 토글 전후 누적 레이아웃 시프트(CLS)가 0.001 미만이다', async () => {
      expect(await getCls(page)).toBeLessThan(0.001);
    });

    await test.step('T2-F3-05: #home-ssr-market-editorial 내 중복 "심층 분석 리포트" 헤딩 배너 난립이 없다', async () => {
      const reportHeadings = await page
        .locator('#home-ssr-market-editorial h2, #home-ssr-market-editorial h3')
        .evaluateAll((els) =>
          els
            .map((el) => (el.textContent ?? '').trim())
            .filter((t) => t.includes('심층 분석 리포트'))
        );
      expect(reportHeadings.length).toBeLessThanOrEqual(1);
    });

    // --- F4 Boundary & Geometry ---
    await test.step('T2-F4-01: 데스크톱 1440px에서 7대 권역 카드 너비가 180px 초과로 확보된다(7열 과밀 해소)', async () => {
      if (!mobileProj) {
        const zoneLinks = page.locator('#home-ssr-market-editorial a[href^="/zone/"]');
        const count = await zoneLinks.count();
        for (let i = 0; i < count; i += 1) {
          const box = await zoneLinks.nth(i).boundingBox();
          expect(box).not.toBeNull();
          expect(box!.width, `Zone card ${i} squeezed too narrow (${box!.width}px)`).toBeGreaterThan(180);
        }
      } else {
        await expect(page.locator('#home-ssr-market-editorial a[href^="/zone/"]')).toHaveCount(7);
      }
    });

    await test.step('T2-F4-02: 모든 권역 카드 설명(<p>)이 50자(한글 음절 기준) 이하이며 서술형 어미를 사용하지 않는다', async () => {
      const descriptions = await page
        .locator('#home-ssr-market-editorial a[href^="/zone/"] p')
        .evaluateAll((els) => els.map((el) => (el.textContent ?? '').trim()));
      expect(descriptions).toHaveLength(7);
      for (const desc of descriptions) {
        expect(measureGraphemes(desc), `Zone card description over 50 chars: "${desc}"`).toBeLessThanOrEqual(
          DVIEW_COPY_BUDGETS.cardDescription
        );
        expect(VERBOSE_PROSE_ENDING_REGEX.test(desc), `Verbose ending in zone desc: "${desc}"`).toBe(false);
      }
    });

    await test.step('T2-F4-03: 7대 권역 카드의 제목(h4) 및 설명(p)에 중간 말줄임 잘림이 없다', async () => {
      const zoneNodes = await page
        .locator('#home-ssr-market-editorial a[href^="/zone/"]')
        .evaluateAll((cards) =>
          cards.map((card) => {
            const h4 = card.querySelector('h4');
            const p = card.querySelector('p');
            return {
              h4Text: (h4?.textContent ?? '').trim(),
              h4Clipped: h4 ? h4.scrollWidth > h4.clientWidth + 1 : false,
              pText: (p?.textContent ?? '').trim(),
              pClipped: p ? p.scrollWidth > p.clientWidth + 1 || p.scrollHeight > p.clientHeight + 1 : false,
            };
          })
        );
      for (const z of zoneNodes) {
        expect(z.h4Clipped, `Zone h4 clipped: ${z.h4Text}`).toBe(false);
        expect(z.pClipped, `Zone p clipped: ${z.pText}`).toBe(false);
        expect(/(?:\.\.\.|…)$/.test(z.pText), `Zone p truncated with ellipsis: ${z.pText}`).toBe(false);
      }
    });

    await test.step('T2-F4-04: 7대 권역 카드에 실거래·단지 지표가 표출되며 0만/NaN 플레이스홀더가 없다', async () => {
      const cardsText = await page
        .locator('#home-ssr-market-editorial a[href^="/zone/"]')
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText.trim()));
      expect(cardsText).toHaveLength(7);
      for (const txt of cardsText) {
        await assertCleanRealText(txt, 'Zone card');
        expect(txt).not.toMatch(/\b0만/);
        expect(txt, `Zone card missing complex count metric: ${txt}`).toMatch(/\d+\s*개?\s*단지/);
        expect(txt, `Zone card missing price metric: ${txt}`).toMatch(/\d+(?:,\d{3})*\s*(?:억|만)/);
      }
    });

    await test.step('T2-F4-05: 7대 권역 섹션이 데스크톱 및 모바일 375px에서 가로 오버플로우 없이 렌더링된다', async () => {
      await assertNoHorizontalOverflow(page, '7-zones current');
      if (!mobileProj) {
        await page.setViewportSize({ width: 375, height: 812 });
        await assertNoHorizontalOverflow(page, '7-zones mobile 375');
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    });

    // --- F5 Boundary & Geometry ---
    await test.step('T2-F5-01: 데스크톱 1440px에서 TOP 10 카드 너비가 140px 초과로 확보된다(10열 105px 과밀 해소)', async () => {
      const top10Section = page
        .locator('#home-ssr-market-editorial h3', { hasText: '시세 리더 TOP 10 단지' })
        .locator('xpath=ancestor::*[.//a[starts-with(@href, "/apartment/")]][1]');
      if (!mobileProj) {
        const cards = top10Section.locator('a[href^="/apartment/"]');
        const count = await cards.count();
        for (let i = 0; i < count; i += 1) {
          const box = await cards.nth(i).boundingBox();
          expect(box).not.toBeNull();
          expect(box!.width, `TOP 10 card #${i + 1} squeezed too narrow (${box!.width}px)`).toBeGreaterThan(140);
        }
      } else {
        await expect(top10Section.locator('a[href^="/apartment/"]')).toHaveCount(10);
      }
    });

    await test.step('T2-F5-02: TOP 10 단지명 전체(#1~#10)가 말줄임(...) 잘림 없이 온전히 읽힌다', async () => {
      const top10Section = page
        .locator('#home-ssr-market-editorial h3', { hasText: '시세 리더 TOP 10 단지' })
        .locator('xpath=ancestor::*[.//a[starts-with(@href, "/apartment/")]][1]');
      const cards = await top10Section.locator('a[href^="/apartment/"]').evaluateAll((els) =>
        els.map((el) => {
          const textNodes = Array.from(el.querySelectorAll('div, span, p, h4'));
          const clipped = textNodes.filter((n) => n.scrollWidth > n.clientWidth + 1);
          return {
            text: (el as HTMLElement).innerText.trim(),
            clippedCount: clipped.length,
          };
        })
      );
      for (const c of cards) {
        expect(c.clippedCount, `TOP 10 card text clipped: ${c.text}`).toBe(0);
        expect(/(?:\.\.\.|…)/.test(c.text), `TOP 10 card contains ellipsis: ${c.text}`).toBe(false);
      }
    });

    await test.step('T2-F5-03: TOP 10 법정동과 가격 텍스트에 겹침·누락이 없고 tabular-nums를 사용한다', async () => {
      const top10Section = page
        .locator('#home-ssr-market-editorial h3', { hasText: '시세 리더 TOP 10 단지' })
        .locator('xpath=ancestor::*[.//a[starts-with(@href, "/apartment/")]][1]');
      const cardsAudit = await top10Section
        .locator('a[href^="/apartment/"]')
        .evaluateAll((els) =>
          els.map((el) => {
            const text = (el as HTMLElement).innerText.trim();
            const tabularNodes = Array.from(el.querySelectorAll('.tabular-nums'));
            const priceNode =
              tabularNodes.find((n) => /(?:억|만)/.test(n.textContent ?? '')) ?? tabularNodes[0] ?? null;
            const cs = priceNode ? window.getComputedStyle(priceNode) : null;
            const fvn = cs?.fontVariantNumeric.toLowerCase() ?? '';
            const ffs = cs?.fontFeatureSettings.toLowerCase() ?? '';

            // Check pairwise vertical/2D overlap between sibling block rows inside the card
            const leafRects = Array.from(el.querySelectorAll('span, div'))
              .filter((n) => n.children.length === 0 && (n.textContent ?? '').trim().length > 0)
              .map((n) => ({
                txt: (n.textContent ?? '').trim(),
                r: n.getBoundingClientRect(),
              }));
            const overlaps: string[] = [];
            for (let i = 0; i < leafRects.length; i += 1) {
              for (let j = i + 1; j < leafRects.length; j += 1) {
                const a = leafRects[i].r;
                const b = leafRects[j].r;
                const xOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                const yOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                if (xOverlap > 2 && yOverlap > 2) {
                  overlaps.push(`${leafRects[i].txt}<->${leafRects[j].txt}`);
                }
              }
            }
            return {
              text,
              hasPriceNode: priceNode !== null,
              hasTabularNums: fvn.includes('tabular-nums') || ffs.includes('tnum'),
              overlaps,
            };
          })
        );
      expect(cardsAudit).toHaveLength(10);
      for (const item of cardsAudit) {
        expect(item.text).toMatch(/동/);
        expect(item.text).toMatch(/\d+(?:억|만)/);
        expect(item.hasPriceNode, `Missing tabular-nums price node in TOP 10 card: ${item.text}`).toBe(true);
        expect(item.hasTabularNums, `TOP 10 price missing tabular-nums: ${item.text}`).toBe(true);
        expect(item.overlaps, `Overlapping text nodes in TOP 10 card: ${item.overlaps.join(', ')}`).toEqual([]);
      }
    });

    await test.step('T2-F5-04: TOP 10 카드에 면적 또는 기준 정보와 실거래가가 함께 표출된다', async () => {
      const top10Section = page
        .locator('#home-ssr-market-editorial h3', { hasText: '시세 리더 TOP 10 단지' })
        .locator('xpath=ancestor::*[.//a[starts-with(@href, "/apartment/")]][1]');
      const cardsText = await top10Section
        .locator('a[href^="/apartment/"]')
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText.trim()));
      expect(cardsText).toHaveLength(10);
      for (const txt of cardsText) {
        expect(txt, `TOP 10 card missing price: ${txt}`).toMatch(/\d+(?:억|만)/);
        expect(txt, `TOP 10 card missing area/date context: ${txt}`).toMatch(/(?:\d+(?:\.\d+)?(?:평|㎡)|\d{2}\.\d{2})/);
      }
    });

    await test.step('T2-F5-05: TOP 10 그리드가 데스크톱과 모바일 375px 모두에서 가로 오버플로우 0이다', async () => {
      await assertNoHorizontalOverflow(page, 'TOP 10 current');
      if (!mobileProj) {
        await page.setViewportSize({ width: 375, height: 812 });
        await assertNoHorizontalOverflow(page, 'TOP 10 mobile 375');
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    });

    await assertZeroRuntimeErrors(page, diag);
  });

  test('Tier 2B: Stats Page (/stats) Geometry & BVA F6–F7 (T2-F6-01 .. T2-F7-05)', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const mobileProj = isMobileProject(testInfo);
    const diag = await attachCleanInstrumentation(page);

    if (!mobileProj) {
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    // --- F6 Boundary & Geometry ---
    await test.step('T2-F6-01: /stats#dongtan-1-vs-2-comparison 앵커 이동 시 sticky 헤더에 제목이 잘리지 않는다', async () => {
      await gotoRoute(page, '/stats#dongtan-1-vs-2-comparison');

      // Wait for initial hash/smooth scroll to settle and verify #dongtan-1-vs-2-comparison arrival clearance
      await expect
        .poll(
          async () =>
            page.evaluate(() => {
              const sec = document.getElementById('dongtan-1-vs-2-comparison');
              if (!sec) return -999;
              const rect = sec.getBoundingClientRect();
              const vw = window.innerWidth;
              const desktopHeader = document.querySelector('header[role="banner"]');
              const desktopHeaderVisible =
                vw >= 768 && desktopHeader !== null && window.getComputedStyle(desktopHeader).display !== 'none';
              const headerBottom = desktopHeaderVisible
                ? desktopHeader.getBoundingClientRect().bottom
                : window.scrollY > 80
                  ? 48
                  : 0;
              return rect.top - (headerBottom - 1);
            }),
          { timeout: 10000 }
        )
        .toBeGreaterThanOrEqual(0);

      // Explicitly verify scrollIntoView({ behavior: 'instant', block: 'start' }) on BOTH sections across ALL projects
      await assertStickyHeaderClearance(page, '#dongtan-1-vs-2-comparison', '#dongtan-1-vs-2-comparison');
      await assertStickyHeaderClearance(page, '#dongtan-1-vs-2-matchup', '#dongtan-1-vs-2-matchup');

      const matchupHeading = page.locator('#dongtan-1-vs-2-matchup h3', {
        hasText: '동탄1 vs 동탄2 상징 단지 집값 1:1 매치업',
      }).first();
      await expect(matchupHeading).toBeVisible();
      const headingGeometry = await matchupHeading.evaluate((el) => {
        const vw = window.innerWidth;
        const desktopHeader = document.querySelector('header[role="banner"]');
        const desktopHeaderVisible =
          vw >= 768 && desktopHeader !== null && window.getComputedStyle(desktopHeader).display !== 'none';
        const headerBottom = desktopHeaderVisible
          ? desktopHeader.getBoundingClientRect().bottom
          : window.scrollY > 80
            ? 48
            : 0;
        return {
          headingTop: el.getBoundingClientRect().top,
          headerBottom,
          vw,
          scrollY: window.scrollY,
        };
      });
      if (headingGeometry.vw >= 768) {
        expect(headingGeometry.headingTop).toBeGreaterThanOrEqual(headingGeometry.headerBottom - 1);
      } else if (headingGeometry.scrollY > 80) {
        expect(headingGeometry.headingTop).toBeGreaterThanOrEqual(47);
      }
    });

    await test.step('T2-F6-02: 1:1 매치업 부제가 40자 이하이며 서술형 어미("~확인하세요.")가 없다', async () => {
      const matchupHeading = page
        .locator('#dongtan-1-vs-2-matchup h3, #dongtan-1-vs-2-comparison h3, #dongtan-1-vs-2-comparison h2', {
          hasText: '동탄1 vs 동탄2 상징 단지 집값 1:1 매치업',
        })
        .first();
      await expect(matchupHeading).toBeVisible();
      const subtitleP = matchupHeading.locator('xpath=following-sibling::p[1]');
      expect(await subtitleP.count(), '1:1 매치업 heading must have a subtitle <p>').toBeGreaterThan(0);
      const subText = (await subtitleP.first().innerText()).trim();
      expect(subText.length).toBeGreaterThan(0);
      expect(measureGraphemes(subText), `Matchup subtitle too long: "${subText}"`).toBeLessThanOrEqual(
        DVIEW_COPY_BUDGETS.sectionSubtitle
      );
      expect(VERBOSE_PROSE_ENDING_REGEX.test(subText), `Verbose predicate in subtitle: "${subText}"`).toBe(false);
      expect(DIRECTIVE_SUBTITLE_ENDING_REGEX.test(subText), `Directive ending in subtitle: "${subText}"`).toBe(false);
    });

    await test.step('T2-F6-03: 20평대 소형(동탄1 0단지 경계) 선택 시 "-" 및 "해당 평형 단지 없음"으로 정직 표출된다', async () => {
      await clickCentered(page.getByTestId('vs-area-filter-small'));
      await expect(page.getByTestId('vs-area-filter-small')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('dongtan1-weighted-avg-price')).toHaveText('-');
      await expect(page.getByTestId('vs-weighted-price-diff')).toHaveText('-');
      const sectionText = await page.locator('#dongtan-1-vs-2-comparison').innerText();
      expect(sectionText).toContain('해당 평형 단지 없음');
      expect(sectionText).not.toContain('평당 0만');
      expect(sectionText).not.toContain('0년 (0년차)');
      await assertCleanRealText(sectionText, 'vs-area-filter-small');
    });

    await test.step('T2-F6-04: 40평대+ 대형 필터 전환 시 실거래 평균가가 재계산되고 전 평형 복원 시 정상 복구된다', async () => {
      await clickCentered(page.getByTestId('vs-area-filter-large'));
      await expect(page.getByTestId('vs-area-filter-large')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('dongtan1-weighted-avg-price')).toContainText(/\d+\.\d+억원/);
      await expect(page.getByTestId('dongtan2-weighted-avg-price')).toContainText(/\d+\.\d+억원/);

      await clickCentered(page.getByTestId('vs-area-filter-all'));
      await expect(page.getByTestId('vs-area-filter-all')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('dongtan1-weighted-avg-price')).toContainText(/\d+\.\d+억원/);
    });

    await test.step('T2-F6-05: 1:1 매치업 카드가 border-2 중첩 없이 데스크톱 및 모바일 375px에서 가로 오버플로우 0이다', async () => {
      const heavyBorders = await page.locator('#dongtan-1-vs-2-comparison .border-2').count();
      expect(heavyBorders).toBe(0);
      await assertNoHorizontalOverflow(page, '/stats matchup current');
      if (!mobileProj) {
        await page.setViewportSize({ width: 375, height: 812 });
        await assertNoHorizontalOverflow(page, '/stats matchup mobile 375');
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    });

    // --- F7 Boundary & Geometry ---
    await test.step('T2-F7-01: #stats-ssr-regression-summary 내 거리 구간 <li> 개수는 정확히 5개다', async () => {
      await expect(page.locator('#stats-ssr-regression-summary li')).toHaveCount(5);
    });

    await test.step('T2-F7-02: 4자리 이상 거래 건수가 모두 쉼표 포맷(8,382건 등)을 따르며 "퍼센트" 표기가 없다', async () => {
      const txt = await page.locator('#stats-ssr-regression-summary').innerText();
      expect(txt, 'Expected comma-formatted 4+ digit tx count').toMatch(/\d{1,3}(?:,\d{3})+건/);
      expect(txt, `Unformatted 4+ digit tx count found in: ${txt}`).not.toMatch(
        /(?<!\d,)\b\d{4,}건(?![가-힣A-Za-z0-9_])/
      );
      expect(txt, 'Spelled-out "퍼센트" forbidden; use "%"').not.toContain('퍼센트');
    });

    await test.step('T2-F7-03: Layer 1 가시 영역(닫힌 <details> 제외)에 원시 회귀 전문용어("절편", "피어슨 상관계수", "결정계수")가 노출되지 않는다', async () => {
      const layer1Audit = await page.locator('#stats-ssr-regression-summary').evaluate((root) => {
        const clone = root.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('details').forEach((d) => d.remove());
        const fullText = (clone.textContent ?? '').replace(/\s+/g, ' ').trim();

        const liveLines = (root as HTMLElement).innerText
          .split('\n')
          .map((l) => l.replace(/\s+/g, ' ').trim())
          .filter(Boolean);

        const elementBlocks = Array.from(root.querySelectorAll('h2, h3, h4, p, li, a, span, div'))
          .filter((el) => !el.closest('details'))
          .filter((el) => {
            const tag = el.tagName.toLowerCase();
            return tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'p' || tag === 'li' || tag === 'a' || el.children.length === 0;
          })
          .map((el) => ((el as HTMLElement).innerText || el.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean);

        return {
          fullText,
          units: Array.from(new Set([...liveLines, ...elementBlocks])),
        };
      });
      expect(layer1Audit.fullText).not.toContain('절편');
      expect(layer1Audit.fullText).not.toContain('피어슨 상관계수');
      expect(layer1Audit.fullText).not.toContain('결정계수');
      expect(layer1Audit.units.length).toBeGreaterThan(0);
      for (const unit of layer1Audit.units) {
        expect(VERBOSE_PROSE_ENDING_REGEX.test(unit), `Verbose prose in Layer 1 unit: "${unit}"`).toBe(false);
      }
    });

    await test.step('T2-F7-04: Layer 2 <details> 아코디언은 초기 닫힘 상태이며 열면 OLS 상세 기준을 표출하고 AdSlot이 0개다', async () => {
      const olsDetails = page.locator('#stats-ssr-regression-summary details').first();
      await expect(olsDetails).toBeAttached();
      expect(await olsDetails.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);

      const summary = olsDetails.locator('summary').first();
      await clickCentered(summary);
      expect(await olsDetails.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);

      const detailsText = await olsDetails.innerText();
      expect(detailsText).toContain('동탄역 거리별 아파트 실거래가 OLS 선형회귀 요약');
      expect(detailsText).toMatch(/절편|피어슨|R²|결정계수/);
      expect(await page.locator(ADSLOT_INSIDE_DETAILS_SELECTOR).count()).toBe(0);

      await clickCentered(summary);
      expect(await olsDetails.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    });

    await test.step('T2-F7-05: /stats 아코디언 토글 전후 CLS < 0.001이며 데스크톱/모바일 가로 오버플로우 0이다', async () => {
      expect(await getCls(page)).toBeLessThan(0.001);
      await assertNoHorizontalOverflow(page, '/stats OLS current');
      if (!mobileProj) {
        await page.setViewportSize({ width: 375, height: 812 });
        await assertNoHorizontalOverflow(page, '/stats OLS mobile 375');
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    });

    await assertZeroRuntimeErrors(page, diag);
  });

  test('Tier 2C: Guide Page (/guide) Geometry & BVA F8 (T2-F8-01 .. T2-F8-05)', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const mobileProj = isMobileProject(testInfo);
    const diag = await attachCleanInstrumentation(page);

    if (!mobileProj) {
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await gotoRoute(page, '/guide');

    await test.step('T2-F8-01: 데스크톱 1440px에서 23개 리포트 카드가 2열 그리드로 배치된다', async () => {
      const cards = page.locator('main article');
      await expect(cards).toHaveCount(23);
      if (!mobileProj) {
        const box0 = await cards.nth(0).boundingBox();
        const box1 = await cards.nth(1).boundingBox();
        expect(box0).not.toBeNull();
        expect(box1).not.toBeNull();
        expect(Math.abs(box0!.y - box1!.y)).toBeLessThan(20);
        expect(box1!.x).toBeGreaterThan(box0!.x + box0!.width * 0.5);
      }
    });

    await test.step('T2-F8-02: 리포트 카드 내부에 해시태그 클라우드(#태그 나열)가 0개다', async () => {
      const hashtagMatches = await page.locator('main article').evaluateAll((articles) => {
        const hits: string[] = [];
        for (const art of articles) {
          const spans = Array.from(art.querySelectorAll('span, a, div'));
          for (const el of spans) {
            if (el.children.length > 0) continue;
            const txt = (el.textContent ?? '').trim();
            if (/^#[가-힣A-Za-z0-9_-]{2,}$/.test(txt)) {
              hits.push(txt);
            }
          }
        }
        return hits;
      });
      expect(hashtagMatches, `Unexpected hashtag spam inside /guide cards: ${hashtagMatches.join(', ')}`).toEqual([]);
    });

    await test.step('T2-F8-03: 각 리포트 카드 내 대표 단지 바로가기 링크(/apartment/)가 최대 3개로 제한된다', async () => {
      const counts = await page
        .locator('main article')
        .evaluateAll((articles) => articles.map((art) => art.querySelectorAll('a[href^="/apartment/"]').length));
      expect(counts).toHaveLength(23);
      for (const c of counts) {
        expect(c, `Card has > 3 /apartment/ links (${c})`).toBeLessThanOrEqual(3);
      }
    });

    await test.step('T2-F8-04: 리포트 카드 요약(<p>)이 50자 이하이며 서술형 어미, 3단 불릿 요약박스, 23회 반복 출처 문구가 없다', async () => {
      const cardAudit = await page.locator('main article').evaluateAll((articles) => {
        const boilerplateHits: number[] = [];
        const proseHits: string[] = [];
        const bulletBoxHits: number[] = [];
        const summaryTexts: string[] = [];
        const proseRe =
          /(?:계측합니다|진단합니다|산출합니다|확인할\s*수\s*있습니다|확인하실\s*수\s*있습니다|제공합니다|제공해\s*드립니다|비교해\s*드립니다|나타냅니다|형성합니다|공유합니다|기록\s*중입니다|분석합니다|해설합니다|소요됩니다|상승했습니다|하락했습니다)\s*[.!]?$/u;
        articles.forEach((art, idx) => {
          const txt = (art as HTMLElement).innerText;
          if (txt.includes('실증 공공데이터 기반 리서치')) {
            boilerplateHits.push(idx);
          }
          if (txt.includes('핵심 리포트 요약') || art.querySelectorAll('ul, li').length > 0) {
            bulletBoxHits.push(idx);
          }
          const summaryP = art.querySelector('p');
          summaryTexts.push((summaryP?.textContent ?? '').trim());

          const lines = txt.split('\n').map((l) => l.trim()).filter(Boolean);
          for (const line of lines) {
            if (proseRe.test(line)) {
              proseHits.push(`[${idx}] ${line}`);
            }
          }
        });
        return { boilerplateHits, proseHits, bulletBoxHits, summaryTexts };
      });
      expect(cardAudit.boilerplateHits, 'Repeated "실증 공공데이터 기반 리서치" inside cards').toEqual([]);
      expect(cardAudit.bulletBoxHits, 'Removed 3-bullet "핵심 리포트 요약" box must stay absent inside cards').toEqual(
        []
      );
      expect(
        cardAudit.proseHits,
        `Verbose predicate endings in /guide cards: ${cardAudit.proseHits.join(' | ')}`
      ).toEqual([]);
      expect(cardAudit.summaryTexts).toHaveLength(23);
      for (const summary of cardAudit.summaryTexts) {
        expect(summary.length).toBeGreaterThan(0);
        expect(
          measureGraphemes(summary),
          `/guide card summary > ${DVIEW_COPY_BUDGETS.cardDescription} graphemes: "${summary}"`
        ).toBeLessThanOrEqual(DVIEW_COPY_BUDGETS.cardDescription);
      }
    });

    await test.step('T2-F8-05: /guide 페이지가 데스크톱과 모바일 375px에서 가로 오버플로우 0으로 렌더링된다', async () => {
      await assertNoHorizontalOverflow(page, '/guide current');
      if (!mobileProj) {
        await page.setViewportSize({ width: 375, height: 812 });
        await assertNoHorizontalOverflow(page, '/guide mobile 375');
        await page.setViewportSize({ width: 1440, height: 900 });
      }
    });

    await assertZeroRuntimeErrors(page, diag);
  });
});

// ===========================================================================
// TIER 3: CROSS-FEATURE PAIRWISE INTERACTIONS (8 Cases: T3-01 .. T3-08)
// ===========================================================================

test.describe('Tier 3: Cross-Feature Pairwise Interactions (T3-01 .. T3-08)', () => {
  test('Tier 3A: Home & Stats Cross-Feature Interactions (T3-01 .. T3-06)', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const mobileProj = isMobileProject(testInfo);
    const diag = await attachCleanInstrumentation(page);

    if (!mobileProj) {
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    await test.step('T3-01: / 타임라인 일자 선택(F1) + 검색·세그먼트 필터(F2) 조합 동작', async () => {
      await gotoRoute(page, '/');
      await expandHomeTimeline(page);

      const secondDateRow = page.locator('[data-testid^="timeline-date-rail-item-"]').nth(1);
      await clickCentered(secondDateRow);
      await expect(secondDateRow).toHaveAttribute('aria-pressed', 'true');

      await clickCentered(page.getByTestId('timeline-segment-new-high'));
      await expect(page.getByTestId('timeline-segment-new-high')).toHaveAttribute('aria-selected', 'true');

      const searchInput = page.locator('input[aria-label="단지명 검색"]').first();
      await searchInput.fill('동탄역');
      await expect(searchInput).toHaveValue('동탄역');
      await searchInput.fill('');

      await clickCentered(page.getByTestId('timeline-segment-all'));
      await clickCentered(page.getByTestId('timeline-date-rail-all'));
    });

    await test.step('T3-02: / 실거래 카드 상세 버튼(F2) -> 인스펙터 열기 및 닫기 복원', async () => {
      const detailBtn = page
        .locator('[data-testid="timeline-scroll-container"] button[aria-label$="상세 정보 보기"]')
        .first();
      await clickCentered(detailBtn);

      const inspectorPane = page.getByTestId('detail-workspace-pane');
      await expect(inspectorPane).toHaveAttribute('aria-hidden', 'false', { timeout: 15000 });
      await expect(page.getByTestId('apartment-inspector-panel')).toBeVisible({ timeout: 15000 });
      expect(new URL(page.url()).pathname).toMatch(/^\/apartment\//);

      const closeBtn = page.locator('[data-testid="detail-workspace-pane"] button[aria-label="닫기"]').first();
      await closeBtn.click();
      await expect(inspectorPane).toHaveAttribute('aria-hidden', 'true', { timeout: 15000 });
      expect(new URL(page.url()).pathname).toBe('/');
    });

    await test.step('T3-03: / 하단 리포트 허브(F3) 아코디언 전개 + 권역 카드(/zone/[id], F4) 이동', async () => {
      const tocLink = page.locator('#home-lab-to-guide-interlink a[href="#home-guide-4col-grid"]').first();
      if (await tocLink.isVisible().catch(() => false)) {
        await clickCentered(tocLink);
      }
      const guideAccordion = page.locator('#home-guide-4col-grid details.dview-seo-accordion').first();
      await clickCentered(guideAccordion.locator('summary').first());
      expect(await guideAccordion.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);

      const firstZone = page.locator('#home-ssr-market-editorial a[href^="/zone/"]').first();
      const targetHref = await firstZone.getAttribute('href');
      expect(targetHref).toMatch(/^\/zone\//);
      await clickCentered(firstZone);
      await page.waitForURL((url) => url.pathname === targetHref, { timeout: 20000 });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 20000 });
    });

    await test.step('T3-04: / 시세 리더 TOP 10 카드(F5) 클릭 -> /apartment/[slug] 상세 페이지 이동', async () => {
      await gotoRoute(page, '/');
      const top10First = page
        .locator('#home-ssr-market-editorial h3', { hasText: '시세 리더 TOP 10 단지' })
        .locator('xpath=ancestor::*[.//a[starts-with(@href, "/apartment/")]][1]')
        .locator('a[href^="/apartment/"]')
        .first();
      await clickCentered(top10First);
      await page.waitForURL((url) => url.pathname.startsWith('/apartment/'), { timeout: 20000 });
      await expect(page.locator('h1:visible')).toHaveCount(1);
    });

    await test.step('T3-05: /stats 평형 필터(F6) 변경 및 #dongtan-1-vs-2-comparison sticky 안전 스크롤', async () => {
      await gotoRoute(page, '/stats#dongtan-1-vs-2-comparison');
      await clickCentered(page.getByTestId('vs-area-filter-medium'));
      await expect(page.getByTestId('vs-area-filter-medium')).toHaveAttribute('aria-pressed', 'true');
      await clickCentered(page.getByTestId('vs-area-filter-large'));
      await expect(page.getByTestId('vs-area-filter-large')).toHaveAttribute('aria-pressed', 'true');
      await clickCentered(page.getByTestId('vs-area-filter-all'));

      await assertStickyHeaderClearance(page, '#dongtan-1-vs-2-comparison', 'T3-05 #dongtan-1-vs-2-comparison');
      await assertStickyHeaderClearance(page, '#dongtan-1-vs-2-matchup', 'T3-05 #dongtan-1-vs-2-matchup');

      const matchupH = page
        .locator('#dongtan-1-vs-2-matchup h3, #dongtan-1-vs-2-comparison h3, #dongtan-1-vs-2-comparison h2', {
          hasText: '동탄1 vs 동탄2 상징 단지 집값 1:1 매치업',
        })
        .first();
      await expect(matchupH).toBeVisible();
      const topMetrics = await matchupH.evaluate((el) => {
        const vw = window.innerWidth;
        const desktopHeader = document.querySelector('header[role="banner"]');
        const desktopHeaderVisible =
          vw >= 768 && desktopHeader !== null && window.getComputedStyle(desktopHeader).display !== 'none';
        const headerBottom = desktopHeaderVisible
          ? desktopHeader.getBoundingClientRect().bottom
          : window.scrollY > 80
            ? 48
            : 0;
        return {
          top: el.getBoundingClientRect().top,
          headerBottom,
          vw,
          scrollY: window.scrollY,
        };
      });
      if (topMetrics.vw >= 768) {
        expect(topMetrics.top).toBeGreaterThanOrEqual(topMetrics.headerBottom - 1);
      } else if (topMetrics.scrollY > 80) {
        expect(topMetrics.top).toBeGreaterThanOrEqual(47);
      }
    });

    await test.step('T3-06: /stats 매치업 CTA(F6) 검증 + OLS 아코디언 전개 + 주제별 요약 링크(F7) 이동', async () => {
      const heroCta = page.getByTestId('stats-to-guide-hero-cta');
      await expect(heroCta).toHaveAttribute('href', '/guide/dongtan-1-vs-2-comparison');

      const olsDetails = page.locator('#stats-ssr-regression-summary details').first();
      await clickCentered(olsDetails.locator('summary').first());
      expect(await olsDetails.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);

      const schoolLink = page.locator('#stats-ssr-school-district-summary a[href^="/guide/"]').first();
      const schoolHref = await schoolLink.getAttribute('href');
      await clickCentered(schoolLink);
      await page.waitForURL((url) => url.pathname === schoolHref, { timeout: 20000 });
      await expect(page.locator('h1:visible')).toHaveCount(1);
    });

    await assertZeroRuntimeErrors(page, diag);
  });

  test('Tier 3B: Guide & Cross-Route Navigation (T3-07 .. T3-08)', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const mobileProj = isMobileProject(testInfo);
    const diag = await attachCleanInstrumentation(page);

    if (!mobileProj) {
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    await test.step('T3-07: /guide 카드(F8) 클릭 -> /guide/[slug] 단일 H1 및 #guide-geo-fact-sheet 확인', async () => {
      await gotoRoute(page, '/guide');
      await expect(page.getByTestId('guide-index-top-conversion-hub')).toBeVisible();
      const firstArticleLink = page.locator('main article h2 a[href^="/guide/"]').first();
      const slugHref = await firstArticleLink.getAttribute('href');
      expect(slugHref).toMatch(/^\/guide\//);
      await clickCentered(firstArticleLink);
      await page.waitForURL((url) => url.pathname === slugHref, { timeout: 20000 });
      await expect(page.locator('h1:visible')).toHaveCount(1);
      await expect(page.getByTestId('guide-geo-fact-sheet')).toBeVisible({ timeout: 20000 });
    });

    await test.step('T3-08: 헤더/모바일독을 통한 / -> /stats -> /guide -> /guide/[slug] 연속 라우팅 무결성', async () => {
      await gotoRoute(page, '/');
      await navigateViaNav(page, '/stats', '아파트 통계');
      await navigateViaNav(page, '/guide', '분석 리포트');
      const cardLink = page.locator('main article h2 a[href^="/guide/"]').nth(1);
      const targetSlug = await cardLink.getAttribute('href');
      await clickCentered(cardLink);
      await page.waitForURL((url) => url.pathname === targetSlug, { timeout: 20000 });
      await expect(page.locator('h1:visible')).toHaveCount(1);
    });

    await assertZeroRuntimeErrors(page, diag);
  });
});

// ===========================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 Scenarios: T4-01 .. T4-05)
// ===========================================================================

test.describe('Tier 4: Real-World E2E Scenarios (T4-01 .. T4-05)', () => {
  test('T4-01 & T4-03: Desktop Buyer Research & Stats Regression Deep Dive', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const mobileProj = isMobileProject(testInfo);
    const diag = await attachCleanInstrumentation(page);

    if (!mobileProj) {
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    await test.step('T4-01: 데스크톱 매수자 탐색 시나리오 (/ 타임라인 확장 -> 신고가 필터 -> 상세 -> 7대 권역/TOP10)', async () => {
      await gotoRoute(page, '/');
      await expandHomeTimeline(page);

      await clickCentered(page.getByTestId('timeline-segment-new-high'));
      await expect(page.getByTestId('timeline-segment-new-high')).toHaveAttribute('aria-selected', 'true');
      await clickCentered(page.getByTestId('timeline-segment-all'));

      const detailBtn = page
        .locator('[data-testid="timeline-scroll-container"] button[aria-label$="상세 정보 보기"]')
        .first();
      await clickCentered(detailBtn);
      await expect(page.getByTestId('detail-workspace-pane')).toHaveAttribute('aria-hidden', 'false', {
        timeout: 15000,
      });
      await page.locator('[data-testid="detail-workspace-pane"] button[aria-label="닫기"]').first().click();
      await expect(page.getByTestId('detail-workspace-pane')).toHaveAttribute('aria-hidden', 'true', {
        timeout: 15000,
      });

      await page.locator('#home-ssr-market-editorial a[href^="/zone/"]').first().scrollIntoViewIfNeeded();
      await expect(page.locator('#home-ssr-market-editorial a[href^="/zone/"]')).toHaveCount(7);
      expect(await getCls(page)).toBeLessThan(0.001);
    });

    await test.step('T4-03: 데스크톱 /stats 동탄1 vs 2 매치업 및 역세권 OLS 회귀 심층 분석 시나리오', async () => {
      await gotoRoute(page, '/stats#dongtan-1-vs-2-comparison');
      await clickCentered(page.getByTestId('vs-area-filter-medium'));
      await expect(page.getByTestId('dongtan1-weighted-avg-price')).toContainText(/\d+\.\d+억원/);
      await clickCentered(page.getByTestId('vs-area-filter-large'));
      await expect(page.getByTestId('dongtan2-weighted-avg-price')).toContainText(/\d+\.\d+억원/);

      const olsSection = page.locator('#stats-ssr-regression-summary');
      await olsSection.scrollIntoViewIfNeeded();
      const summary = olsSection.locator('details summary').first();
      await clickCentered(summary);
      expect(await olsSection.locator('details').first().evaluate((el) => (el as HTMLDetailsElement).open)).toBe(
        true
      );
      expect(await getCls(page)).toBeLessThan(0.001);
      await assertNoHorizontalOverflow(page, 'T4-03 /stats');
    });

    await assertZeroRuntimeErrors(page, diag);
  });

  test('T4-02 & T4-04: Mobile Commuter & Report Reading Flows', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const mobileProj = isMobileProject(testInfo);
    const diag = await attachCleanInstrumentation(page);

    if (!mobileProj) {
      await page.setViewportSize({ width: 375, height: 812 });
    }

    await test.step('T4-02: 모바일(375x812) 출퇴근 중 시세 확인 (/ 타임라인 확장 -> 필터 드로어 -> MobileDock 통계 이동)', async () => {
      await gotoRoute(page, '/');
      await expandHomeTimeline(page);

      const filterToggle = page.getByTestId('timeline-mobile-filter-toggle');
      await expect(filterToggle, 'Mobile filter toggle must be visible on <640px viewport').toBeVisible({
        timeout: 10000,
      });
      await clickCentered(filterToggle);
      await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');
      await clickCentered(filterToggle);
      await expect(filterToggle).toHaveAttribute('aria-expanded', 'false');

      await assertNoHorizontalOverflow(page, 'T4-02 mobile /');
      await navigateViaNav(page, '/stats', '아파트 통계');
      await assertNoHorizontalOverflow(page, 'T4-02 mobile /stats');
    });

    await test.step('T4-04: 모바일(375x812) 분석 리포트 탐색 -> 전문 읽기 플로우 (/guide -> /guide/dongtan-1-vs-2-comparison)', async () => {
      await gotoRoute(page, '/guide');
      await assertNoHorizontalOverflow(page, 'T4-04 mobile /guide');
      const targetLink = page.locator('a[href="/guide/dongtan-1-vs-2-comparison"]').first();
      await clickCentered(targetLink);
      await page.waitForURL((url) => url.pathname === '/guide/dongtan-1-vs-2-comparison', { timeout: 20000 });
      await expect(page.locator('h1:visible')).toHaveCount(1);
      await assertNoHorizontalOverflow(page, 'T4-04 mobile /guide/dongtan-1-vs-2-comparison');
    });

    await assertZeroRuntimeErrors(page, diag);
  });

  test('T4-05: Global Design-System, Font, Tabular-Nums, Asset & CLS Audit Across /, /stats, /guide', async ({
    page,
  }) => {
    test.setTimeout(120000);
    const diag = await attachCleanInstrumentation(page);

    await test.step('T4-05: /, /stats, /guide 전역 Pretendard 폰트·이모지 0·이미지 정상 로드·CLS < 0.001 검증', async () => {
      const routes: Array<{ path: string; expandHome?: boolean; scopes: string[] }> = [
        {
          path: '/',
          expandHome: true,
          scopes: ['[data-testid="timeline-inline-expanded-view"]', '#home-ssr-market-editorial'],
        },
        {
          path: '/stats',
          scopes: ['#dongtan-1-vs-2-comparison', '#stats-ssr-regression-summary'],
        },
        {
          path: '/guide',
          scopes: ['main'],
        },
      ];

      for (const route of routes) {
        await gotoRoute(page, route.path);
        if (route.expandHome) {
          await expandHomeTimeline(page);
        }
        for (const scope of route.scopes) {
          await expect(page.locator(scope).first()).toBeVisible({ timeout: 20000 });
          await assertDesignTokensInScope(page, scope);
        }
        await assertNoHorizontalOverflow(page, `T4-05 ${route.path}`);

        // Verify all visible <img> elements loaded cleanly
        const brokenImages = await page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('img'));
          return imgs
            .filter((img) => {
              const cs = window.getComputedStyle(img);
              if (cs.display === 'none' || cs.visibility === 'hidden') return false;
              return img.complete && img.naturalWidth === 0;
            })
            .map((img) => img.getAttribute('src') ?? 'unknown');
        });
        expect(brokenImages, `Broken images on ${route.path}: ${brokenImages.join(', ')}`).toEqual([]);
        expect(await getCls(page), `CLS >= 0.001 on ${route.path}`).toBeLessThan(0.001);
      }
    });

    await assertZeroRuntimeErrors(page, diag);
  });
});
