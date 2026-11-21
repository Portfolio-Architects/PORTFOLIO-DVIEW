import { test, expect } from '@playwright/test';
import {
  computeClampedDropdownLeftOffset,
  computeClampedDropdownMaxWidth,
  DONG_MENU_DEFAULT_WIDTH,
  DONG_MENU_VIEWPORT_MARGIN,
} from '../src/components/stats/statsFilterBarPosition';

test.describe('Mobile UI / UX Boost Follow-up Regression Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    });
  });

  test('1. globals.css suppresses .pointer-events-none descendants, nested interactive nodes, inline pointer-events:none, and disabled controls during body.is-scrolling while keeping .pointer-events-auto children interactive', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/stats', { waitUntil: 'load' });
    // Waiting for client-only MobileStickyAnchorAd guarantees React hydration has completed
    await page.waitForSelector('[data-testid="mobile-sticky-anchor-ad"]', { state: 'attached', timeout: 30000 });
    await page.waitForSelector('[data-testid="mobile-scroll-to-top"]', { state: 'attached', timeout: 30000 });

    const preScrollResult = await page.evaluate(() => {
      document.body.classList.add('is-scrolling');

      const scrollTopBtn = document.querySelector('[data-testid="mobile-scroll-to-top"]') as HTMLElement | null;
      const scrollTopSvg = scrollTopBtn?.querySelector('svg') as SVGElement | null;
      const scrollTopPath = scrollTopSvg?.querySelector('path, polyline') as SVGElement | null;

      // PageHeroHeader hidden mobile sticky bar (data-scroll-interactive="true" + pointer-events-none)
      const hiddenStickyHeader = Array.from(
        document.querySelectorAll<HTMLElement>('[data-scroll-interactive="true"].pointer-events-none')
      ).find((el) => el.tagName === 'DIV' && el.className.includes('fixed') && el.className.includes('top-0'));
      const hiddenStickyInnerDiv = hiddenStickyHeader?.firstElementChild as HTMLElement | null;

      // Real mounted visible MobileStickyAnchorAd on /stats
      const realAnchorAside = document.querySelector('[data-testid="mobile-sticky-anchor-ad"]') as HTMLElement | null;
      const realAnchorInner = realAnchorAside?.firstElementChild as HTMLElement | null;
      const realAnchorClose = document.querySelector('[data-testid="mobile-sticky-anchor-close"]') as HTMLElement | null;
      const realAnchorCloseSvg = realAnchorClose?.querySelector('svg') as SVGElement | null;

      // Probe keyboard-hidden MobileStickyAnchorAd, nested .pointer-events-none -> .pointer-events-auto (SellTimingCalculator FAB),
      // hidden .pointer-events-none ancestor -> nested [data-scroll-interactive="true"], Recharts inline tooltip, and disabled:pointer-events-none
      const probeRoot = document.createElement('div');
      probeRoot.id = 'pointer-events-probe';
      probeRoot.innerHTML = `
        <aside id="probe-anchor-kbd" data-scroll-interactive="true" class="fixed bottom-20 left-0 right-0 pointer-events-none">
          <div id="probe-anchor-kbd-inner" class="pointer-events-none">
            <button id="probe-anchor-kbd-close" type="button"><svg id="probe-anchor-kbd-svg"></svg></button>
            <div id="probe-anchor-kbd-slot"><a id="probe-anchor-kbd-link" href="#">Ad</a></div>
          </div>
        </aside>
        <div id="probe-nested-modal" data-scroll-interactive="true">
          <div id="probe-sticky-wrap" class="pointer-events-none">
            <button id="probe-fab-btn" class="pointer-events-auto"><span id="probe-fab-label">Share</span></button>
          </div>
          <div id="probe-recharts-tooltip" class="recharts-tooltip-wrapper" style="z-index: 30; pointer-events: none;">
            <span id="probe-recharts-tooltip-text">Tooltip</span>
          </div>
          <button id="probe-disabled-btn" type="button" disabled class="disabled:pointer-events-none">
            <span id="probe-disabled-btn-label">Disabled</span>
          </button>
          <button id="probe-enabled-btn" type="button" class="disabled:pointer-events-none">
            <span id="probe-enabled-btn-label">Enabled</span>
          </button>
        </div>
        <div id="probe-hidden-pane" class="pointer-events-none">
          <div id="probe-nested-interactive" data-scroll-interactive="true">
            <button id="probe-nested-interactive-btn" type="button">Hidden</button>
          </div>
          <div class="pointer-events-auto">
            <div id="probe-rehidden-interactive" data-scroll-interactive="true" class="pointer-events-none">
              <span id="probe-rehidden-span">Rehidden</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(probeRoot);

      const pe = (el: Element | null) => (el ? window.getComputedStyle(el).pointerEvents : null);
      const mainEl = document.querySelector('main#main-content h1');
      const mobileDock = document.querySelector('nav[aria-label="모바일 하단 내비게이션"]');
      const mobileDockLink = mobileDock?.querySelector('a') ?? null;

      const snapshot = {
        scrollTopBtn: pe(scrollTopBtn),
        scrollTopSvg: pe(scrollTopSvg),
        scrollTopPath: pe(scrollTopPath),
        hiddenStickyHeader: pe(hiddenStickyHeader ?? null),
        hiddenStickyInnerDiv: pe(hiddenStickyInnerDiv),
        regularMainContent: pe(mainEl),
        mobileDock: pe(mobileDock),
        mobileDockLink: pe(mobileDockLink),
        visibleAnchorAside: pe(realAnchorAside),
        visibleAnchorInner: pe(realAnchorInner),
        visibleAnchorClose: pe(realAnchorClose),
        visibleAnchorSvg: pe(realAnchorCloseSvg),
        kbdAnchorAside: pe(document.getElementById('probe-anchor-kbd')),
        kbdAnchorInner: pe(document.getElementById('probe-anchor-kbd-inner')),
        kbdAnchorClose: pe(document.getElementById('probe-anchor-kbd-close')),
        kbdAnchorSvg: pe(document.getElementById('probe-anchor-kbd-svg')),
        kbdAnchorLink: pe(document.getElementById('probe-anchor-kbd-link')),
        nestedModalWrap: pe(document.getElementById('probe-sticky-wrap')),
        nestedModalFab: pe(document.getElementById('probe-fab-btn')),
        nestedModalFabLabel: pe(document.getElementById('probe-fab-label')),
        rechartsTooltip: pe(document.getElementById('probe-recharts-tooltip')),
        rechartsTooltipText: pe(document.getElementById('probe-recharts-tooltip-text')),
        disabledBtn: pe(document.getElementById('probe-disabled-btn')),
        disabledBtnLabel: pe(document.getElementById('probe-disabled-btn-label')),
        enabledBtn: pe(document.getElementById('probe-enabled-btn')),
        enabledBtnLabel: pe(document.getElementById('probe-enabled-btn-label')),
        nestedInteractiveInHiddenPane: pe(document.getElementById('probe-nested-interactive')),
        nestedInteractiveBtnInHiddenPane: pe(document.getElementById('probe-nested-interactive-btn')),
        rehiddenInteractive: pe(document.getElementById('probe-rehidden-interactive')),
        rehiddenSpan: pe(document.getElementById('probe-rehidden-span')),
      };

      probeRoot.remove();
      document.body.classList.remove('is-scrolling');
      return snapshot;
    });

    // Hidden ScrollToTop & its SVG descendants must all be pointer-events: none during scroll
    expect(preScrollResult.scrollTopBtn).toBe('none');
    expect(preScrollResult.scrollTopSvg).toBe('none');
    expect(preScrollResult.scrollTopPath).toBe('none');

    // Hidden PageHeroHeader sticky bar & its inner title div must both be pointer-events: none during scroll
    expect(preScrollResult.hiddenStickyHeader).toBe('none');
    expect(preScrollResult.hiddenStickyInnerDiv).toBe('none');

    // Non-interactive page content stays suppressed; visible MobileDock stays interactive
    expect(preScrollResult.regularMainContent).toBe('none');
    expect(preScrollResult.mobileDock).toBe('auto');
    expect(preScrollResult.mobileDockLink).toBe('auto');

    // Real mounted visible MobileStickyAnchorAd: outer passthrough aside is none, inner banner + close button + svg are auto
    expect(preScrollResult.visibleAnchorAside).toBe('none');
    expect(preScrollResult.visibleAnchorInner).toBe('auto');
    expect(preScrollResult.visibleAnchorClose).toBe('auto');
    expect(preScrollResult.visibleAnchorSvg).toBe('auto');

    // Keyboard-hidden MobileStickyAnchorAd: aside, inner div, close button, svg, and ad link are ALL none
    expect(preScrollResult.kbdAnchorAside).toBe('none');
    expect(preScrollResult.kbdAnchorInner).toBe('none');
    expect(preScrollResult.kbdAnchorClose).toBe('none');
    expect(preScrollResult.kbdAnchorSvg).toBe('none');
    expect(preScrollResult.kbdAnchorLink).toBe('none');

    // Nested .pointer-events-none wrapper with .pointer-events-auto child (e.g. SellTimingCalculator sticky FAB)
    expect(preScrollResult.nestedModalWrap).toBe('none');
    expect(preScrollResult.nestedModalFab).toBe('auto');
    expect(preScrollResult.nestedModalFabLabel).toBe('auto');

    // Recharts inline pointer-events: none tooltip & disabled:pointer-events-none inside [data-scroll-interactive="true"]
    expect(preScrollResult.rechartsTooltip).toBe('none');
    expect(preScrollResult.rechartsTooltipText).toBe('none');
    expect(preScrollResult.disabledBtn).toBe('none');
    expect(preScrollResult.disabledBtnLabel).toBe('none');
    expect(preScrollResult.enabledBtn).toBe('auto');
    expect(preScrollResult.enabledBtnLabel).toBe('auto');

    // Nested [data-scroll-interactive="true"] inside hidden .pointer-events-none pane must NOT resurrect clicks
    expect(preScrollResult.nestedInteractiveInHiddenPane).toBe('none');
    expect(preScrollResult.nestedInteractiveBtnInHiddenPane).toBe('none');
    expect(preScrollResult.rehiddenInteractive).toBe('none');
    expect(preScrollResult.rehiddenSpan).toBe('none');

    // Now scroll past 200px so ScrollToTop becomes visible and verify it & its SVG are interactive during body.is-scrolling
    await page.evaluate(() => window.scrollTo(0, 320));
    await expect(page.locator('[data-testid="mobile-scroll-to-top"]')).toHaveAttribute('aria-hidden', 'false');

    const postScrollResult = await page.evaluate(() => {
      document.body.classList.add('is-scrolling');
      const btn = document.querySelector('[data-testid="mobile-scroll-to-top"]') as HTMLElement;
      const svg = btn.querySelector('svg') as SVGElement;
      const rect = btn.getBoundingClientRect();
      const hitEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const res = {
        btnPe: window.getComputedStyle(btn).pointerEvents,
        svgPe: window.getComputedStyle(svg).pointerEvents,
        hitIsInsideBtn: Boolean(hitEl && btn.contains(hitEl)),
      };
      document.body.classList.remove('is-scrolling');
      return res;
    });

    expect(postScrollResult.btnPe).toBe('auto');
    expect(postScrollResult.svgPe).toBe('auto');
    expect(postScrollResult.hitIsInsideBtn).toBe(true);
  });

  test('2. ScrollToTop coalesces modal MutationObserver via rAF, ignores storms & ancestor-hidden dialogs, and handles same-tick scroll races', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/stats', { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="mobile-sticky-anchor-ad"]', { state: 'attached', timeout: 30000 });
    await page.waitForSelector('[data-testid="mobile-scroll-to-top"]', { state: 'attached', timeout: 30000 });

    await page.evaluate(() => window.scrollTo(0, 320));
    await expect(page.locator('[data-testid="mobile-scroll-to-top"]')).toHaveAttribute('aria-hidden', 'false');

    const metrics = await page.evaluate(async () => {
      const waitFrames = (count = 2) =>
        new Promise<void>((resolve) => {
          let remaining = count;
          const step = () => {
            remaining -= 1;
            if (remaining <= 0) resolve();
            else window.requestAnimationFrame(step);
          };
          window.requestAnimationFrame(step);
        });

      let modalQsaCalls = 0;
      const originalQsa = document.querySelectorAll.bind(document);
      document.querySelectorAll = ((selectors: string) => {
        if (selectors.includes('[role="dialog"][aria-modal="true"]')) {
          modalQsaCalls += 1;
        }
        return originalQsa(selectors);
      }) as typeof document.querySelectorAll;

      const btn = document.querySelector('[data-testid="mobile-scroll-to-top"]') as HTMLElement;
      const tooltip = document.createElement('div');
      tooltip.className = 'recharts-tooltip-wrapper';
      const unrelatedRoleNode = document.createElement('div');
      document.body.appendChild(tooltip);
      document.body.appendChild(unrelatedRoleNode);
      await waitFrames(2);
      modalQsaCalls = 0;

      // Storm 1: 30 rapid body.is-scrolling toggles + tooltip style/class + unrelated role mutations with no modal in DOM
      for (let i = 0; i < 30; i += 1) {
        document.body.classList.toggle('is-scrolling');
        tooltip.style.transform = `translate(${i * 4}px, ${i * 3}px)`;
        tooltip.className = `recharts-tooltip-wrapper frame-${i}`;
        unrelatedRoleNode.setAttribute('role', i % 2 === 0 ? 'status' : 'tooltip');
      }
      await waitFrames(2);
      const afterIrrelevantStorm = modalQsaCalls;

      // Storm 2: Mount visible modal + mutate its class/style multiple times synchronously
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      const innerTooltip = document.createElement('div');
      innerTooltip.className = 'recharts-tooltip-wrapper';
      dialog.appendChild(innerTooltip);

      document.body.appendChild(dialog);
      dialog.classList.add('open');
      dialog.style.opacity = '1';
      await Promise.resolve();
      const syncCallsBeforeRaf = modalQsaCalls;

      await waitFrames(2);
      const coalescedCallsAfterRaf = modalQsaCalls;
      const hiddenWhenModalOpen = btn.getAttribute('aria-hidden');

      // Storm 3: 20 tooltip mutations inside open dialog + body.is-scrolling toggles + unrelated role updates
      modalQsaCalls = 0;
      for (let i = 0; i < 20; i += 1) {
        document.body.classList.toggle('is-scrolling');
        innerTooltip.style.transform = `translate(${i * 6}px, ${i * 2}px)`;
        innerTooltip.className = `recharts-tooltip-wrapper active-${i}`;
        unrelatedRoleNode.setAttribute('role', i % 2 === 0 ? 'status' : 'tooltip');
      }
      await waitFrames(2);
      const callsDuringOpenModalTooltipStorm = modalQsaCalls;

      // Remove dialog -> ScrollToTop restores on next animation frame
      dialog.remove();
      await waitFrames(2);
      const hiddenAfterModalRemoved = btn.getAttribute('aria-hidden');

      // Ancestor-hidden dialog (Tailwind .hidden / display:none wrapper) MUST NOT suppress ScrollToTop
      const hiddenWrapper = document.createElement('div');
      hiddenWrapper.className = 'hidden';
      const ancestorHiddenDialog = document.createElement('div');
      ancestorHiddenDialog.setAttribute('role', 'dialog');
      ancestorHiddenDialog.setAttribute('aria-modal', 'true');
      hiddenWrapper.appendChild(ancestorHiddenDialog);
      document.body.appendChild(hiddenWrapper);
      await waitFrames(2);
      const hiddenWhileAncestorDisplayNone = btn.getAttribute('aria-hidden');

      // Removing .hidden from ancestor reveals dialog -> suppresses ScrollToTop
      hiddenWrapper.classList.remove('hidden');
      await waitFrames(2);
      const hiddenWhenAncestorShown = btn.getAttribute('aria-hidden');

      hiddenWrapper.remove();
      await waitFrames(2);
      const hiddenAfterAncestorRemoved = btn.getAttribute('aria-hidden');

      // Same-tick mount + synchronous scroll event before microtasks flush
      const sameTickDialog = document.createElement('div');
      sameTickDialog.setAttribute('role', 'dialog');
      sameTickDialog.setAttribute('aria-modal', 'true');
      document.body.appendChild(sameTickDialog);
      document.dispatchEvent(new Event('scroll', { bubbles: false }));
      await waitFrames(2);
      const hiddenAfterSameTickScroll = btn.getAttribute('aria-hidden');

      sameTickDialog.remove();
      sameTickDialog.removeAttribute('role');
      await waitFrames(2);
      const hiddenAfterDetachedStrippedRole = btn.getAttribute('aria-hidden');

      tooltip.remove();
      unrelatedRoleNode.remove();
      document.body.classList.remove('is-scrolling');
      document.querySelectorAll = originalQsa;

      return {
        afterIrrelevantStorm,
        syncCallsBeforeRaf,
        coalescedCallsAfterRaf,
        hiddenWhenModalOpen,
        callsDuringOpenModalTooltipStorm,
        hiddenAfterModalRemoved,
        hiddenWhileAncestorDisplayNone,
        hiddenWhenAncestorShown,
        hiddenAfterAncestorRemoved,
        hiddenAfterSameTickScroll,
        hiddenAfterDetachedStrippedRole,
      };
    });

    expect(metrics.afterIrrelevantStorm).toBe(0);
    expect(metrics.syncCallsBeforeRaf).toBe(0);
    expect(metrics.coalescedCallsAfterRaf).toBe(1);
    expect(metrics.hiddenWhenModalOpen).toBe('true');
    expect(metrics.callsDuringOpenModalTooltipStorm).toBe(0);
    expect(metrics.hiddenAfterModalRemoved).toBe('false');
    expect(metrics.hiddenWhileAncestorDisplayNone).toBe('false');
    expect(metrics.hiddenWhenAncestorShown).toBe('true');
    expect(metrics.hiddenAfterAncestorRemoved).toBe('false');
    expect(metrics.hiddenAfterSameTickScroll).toBe('true');
    expect(metrics.hiddenAfterDetachedStrippedRole).toBe('false');
  });

  test('3. Mobile viewports (320px~680px) maintain zero horizontal overflow and clamp StatsFilterBar dropdown via production positioning helper inside [12px, viewportWidth - 12px]', async ({
    page,
  }) => {
    const mobileWidths = [320, 340, 360, 375, 414, 680];

    for (const width of mobileWidths) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/stats', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('main#main-content', { state: 'visible', timeout: 30000 });

      const baseMetrics = await page.evaluate(() => ({
        vw: window.innerWidth,
        clientW: document.documentElement.clientWidth || window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth,
      }));
      const effectiveViewportW = Math.min(baseMetrics.vw, baseMetrics.clientW);
      expect(baseMetrics.docScrollWidth).toBeLessThanOrEqual(baseMetrics.vw + 1);

      // Mount exact StatsFilterBar Row-1 flex-wrap + dropdown classes in the real browser layout engine,
      // and drive positioning using the real imported production computeClampedDropdownLeftOffset / MaxWidth functions.
      await page.evaluate(() => {
        const existing = document.getElementById('stats-filter-bar-probe');
        if (existing) existing.remove();
        const host = document.createElement('div');
        host.id = 'stats-filter-bar-probe';
        host.className = 'w-full px-4';
        host.innerHTML = `
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" class="px-3 py-1.5 rounded-xl text-xs font-extrabold">동탄 전체</button>
            <button type="button" class="px-3 py-1.5 rounded-xl text-xs font-extrabold">동탄1</button>
            <button type="button" class="px-3 py-1.5 rounded-xl text-xs font-extrabold">동탄2</button>
            <button type="button" class="px-3 py-1.5 rounded-xl text-xs font-extrabold">청계동</button>
            <div id="dong-trigger-wrap" class="relative">
              <button type="button" class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold">법정동 선택</button>
              <div id="dong-menu-probe" class="absolute left-0 top-full mt-1.5 z-50 w-56 max-w-[calc(100vw-24px)] rounded-2xl p-2"></div>
            </div>
          </div>
        `;
        document.body.appendChild(host);
      });

      const triggerPositions: Array<number | null> = [
        null, // Natural wrapped position in flex-wrap layout
        0,
        16,
        Math.round(effectiveViewportW * 0.35), // Narrow centered edge case (rect.left + 224 > vw - 12 && rect.right < 224)
        Math.round(effectiveViewportW * 0.45),
        Math.max(16, effectiveViewportW - 96),
      ];

      for (const syntheticLeft of triggerPositions) {
        const triggerMetrics = await page.evaluate((forcedLeft) => {
          const triggerWrap = document.getElementById('dong-trigger-wrap') as HTMLElement;
          const menuProbe = document.getElementById('dong-menu-probe') as HTMLElement;
          if (forcedLeft !== null) {
            triggerWrap.style.position = 'fixed';
            triggerWrap.style.left = `${forcedLeft}px`;
            triggerWrap.style.top = '120px';
          }
          const rect = triggerWrap.getBoundingClientRect();
          const viewportW = Math.min(
            window.innerWidth,
            document.documentElement.clientWidth || window.innerWidth
          );
          return {
            containingBlockLeft: rect.left + (triggerWrap.clientLeft || 0),
            measuredMenuWidth: menuProbe.offsetWidth,
            viewportW,
          };
        }, syntheticLeft);

        const maxW = computeClampedDropdownMaxWidth(
          triggerMetrics.viewportW,
          DONG_MENU_VIEWPORT_MARGIN
        );
        const offsetX = computeClampedDropdownLeftOffset(
          triggerMetrics.containingBlockLeft,
          triggerMetrics.measuredMenuWidth || DONG_MENU_DEFAULT_WIDTH,
          triggerMetrics.viewportW,
          DONG_MENU_VIEWPORT_MARGIN
        );

        const menuRect = await page.evaluate(
          ({ leftPx, maxWidthPx }) => {
            const menuProbe = document.getElementById('dong-menu-probe') as HTMLElement;
            menuProbe.style.left = `${leftPx}px`;
            if (maxWidthPx > 0) {
              menuProbe.style.maxWidth = `${maxWidthPx}px`;
            }
            const rect = menuProbe.getBoundingClientRect();
            return { left: rect.left, right: rect.right, width: rect.width };
          },
          { leftPx: offsetX, maxWidthPx: maxW }
        );

        expect(menuRect.left).toBeGreaterThanOrEqual(DONG_MENU_VIEWPORT_MARGIN - 0.5);
        expect(menuRect.right).toBeLessThanOrEqual(
          triggerMetrics.viewportW - DONG_MENU_VIEWPORT_MARGIN + 0.5
        );
      }

      await page.evaluate(() => {
        document.getElementById('stats-filter-bar-probe')?.remove();
      });
    }
  });
});
