import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileStickyAnchorAd, {
  MOBILE_ANCHOR_OFFSET_CSS_VAR,
} from '@/components/layout/MobileStickyAnchorAd';
import ScrollToTop from '@/components/ui/ScrollToTop';
import Footer from '@/components/Footer';
import MobileDock from '@/components/pwa/MobileDock';
import { ApartmentModalHeader } from '@/components/apartment/ApartmentModalHeader';
import TossApartmentExploreClient from '@/components/TossApartmentExploreClient';
import { TimelineFilterControls } from '@/components/macro/components/MacroControls';
import {
  StatsFilterBar,
  computeClampedDropdownLeftOffset,
  DONG_MENU_DEFAULT_WIDTH,
  DONG_MENU_VIEWPORT_MARGIN,
} from '@/components/stats/StatsFilterBar';
import NotificationBanner from '@/components/NotificationBanner';
import PageHeroHeader from '@/components/PageHeroHeader';
import { useApartmentModalState } from '@/components/apartment/hooks/useApartmentModalState';
import type { FieldReportData } from '@/types/report';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: ({ format, refreshSlotId }: { format?: string; refreshSlotId?: string }) => (
    <div data-testid="mock-anchor-adslot" data-format={format} data-refresh-slot={refreshSlotId} />
  ),
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    userFavorites: new Set<string>(),
    handleToggleFavorite: jest.fn(),
    toggleFavorite: jest.fn(),
  }),
}));

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    showToast: jest.fn(),
  }),
}));

function mockMatchMedia(mobileMatches: boolean, smMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches:
        query === '(max-width: 767px)'
          ? mobileMatches
          : query === '(min-width: 640px)'
          ? smMatches
          : false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe('Mobile UI / UX Boost Verification Suite', () => {
  const originalEnv = { ...process.env };
  const originalMatchMedia = window.matchMedia;
  const originalVisualViewport = window.visualViewport;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 });
    document.documentElement.style.removeProperty(MOBILE_ANCHOR_OFFSET_CSS_VAR);
    document.documentElement.removeAttribute('data-mobile-anchor-visible');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: originalVisualViewport,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    document.documentElement.style.removeProperty(MOBILE_ANCHOR_OFFSET_CSS_VAR);
    document.documentElement.removeAttribute('data-mobile-anchor-visible');
  });

  describe('1. Viewport Accessibility, Safe-Area & Global Mobile CSS Ergonomics', () => {
    it('enables WCAG pinch-to-zoom, viewportFit cover, and Live Spark dark themeColor in layout.tsx', () => {
      const layoutSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8');
      const viewportBlockMatch = layoutSrc.match(/export const viewport:\s*Viewport\s*=\s*\{[\s\S]*?\n\};/);
      expect(viewportBlockMatch).not.toBeNull();
      const viewportBlock = viewportBlockMatch![0];
      expect(viewportBlock).toContain('userScalable: true');
      expect(viewportBlock).not.toContain('userScalable: false');
      expect(viewportBlock).toContain('maximumScale: 5');
      expect(viewportBlock).not.toContain('maximumScale: 1');
      expect(viewportBlock).toContain("viewportFit: 'cover'");
      expect(viewportBlock).toContain("color: '#0e1117'");
      expect(viewportBlock).toContain("color: '#ffffff'");
    });

    it('declares layered touch-action rules, iOS 16px input/select anti-zoom, .dview-range-slider, and pointer-events-none descendant-safe scroll override without @apply', () => {
      const css = fs.readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
      expect(css).toContain('touch-action: manipulation;');
      expect(css).toContain('input:not([type="range"])');
      expect(css).toContain('touch-action: pan-x;');
      expect(css).toContain('@supports (-webkit-touch-callout: none)');
      expect(css).toContain('input:not([type])');
      expect(css).toContain('select,');
      expect(css).toContain('font-size: 16px;');
      expect(css).toContain('.dview-range-slider');
      expect(css).toContain('body.is-scrolling [data-scroll-interactive="true"]');
      expect(css).toContain('body.is-scrolling [data-scroll-interactive="true"].pointer-events-none');
      expect(css).toContain('body.is-scrolling [data-scroll-interactive="true"] .pointer-events-none');
      expect(css).toContain('body.is-scrolling [data-scroll-interactive="true"] .pointer-events-auto');
      expect(css).toContain(
        'body.is-scrolling .pointer-events-none [data-scroll-interactive="true"]:not(.pointer-events-auto):not(.pointer-events-none)'
      );
      expect(css).toContain(
        'body.is-scrolling [data-scroll-interactive="true"] .disabled\\:pointer-events-none:disabled'
      );
      expect(css).toContain(
        'body.is-scrolling [data-scroll-interactive="true"] [style*="pointer-events: none" i]'
      );
      // Descendants of [data-scroll-interactive="true"] MUST inherit pointer-events rather than forcing auto !important,
      // so hidden .pointer-events-none containers (ScrollToTop <svg>, keyboard-hidden MobileStickyAnchorAd, PageHeroHeader)
      // never resurrect clicks on their descendants during scroll.
      expect(css).toMatch(
        /body\.is-scrolling\s+\[data-scroll-interactive="true"\]\s+\*\s*\{\s*pointer-events:\s*inherit\s*!important;\s*\}/
      );
      expect(css).not.toMatch(
        /body\.is-scrolling\s+\[data-scroll-interactive="true"\]\s+\*\s*\{\s*pointer-events:\s*auto\s*!important;/
      );
      // Cascade order: inherit (*) < auto (container & .pointer-events-auto) < none (.pointer-events-none)
      const inheritIdx = css.indexOf('body.is-scrolling [data-scroll-interactive="true"] *');
      const autoIdx = css.indexOf('body.is-scrolling [data-scroll-interactive="true"],');
      const noneIdx = css.indexOf('body.is-scrolling [data-scroll-interactive="true"].pointer-events-none');
      expect(inheritIdx).toBeGreaterThan(-1);
      expect(autoIdx).toBeGreaterThan(inheritIdx);
      expect(noneIdx).toBeGreaterThan(autoIdx);
      expect(css).toContain('.dview-safe-sticky-top-12');
      expect(css).not.toContain('@apply');
    });
  });

  describe('2. Mobile Bottom-Chrome Coexistence (Anchor Ad <-> ScrollToTop <-> Footer <-> MobileDock)', () => {
    it('syncs --dview-mobile-anchor-offset for <640px (64px) and 640px..767px (98px) and resets to 0px on dismiss/keyboard/unmount', () => {
      let resizeHandlers: Array<() => void> = [];
      const mockVV = {
        height: 800,
        addEventListener: jest.fn((ev: string, fn: () => void) => {
          if (ev === 'resize') resizeHandlers.push(fn);
        }),
        removeEventListener: jest.fn((ev: string, fn: () => void) => {
          if (ev === 'resize') resizeHandlers = resizeHandlers.filter((h) => h !== fn);
        }),
      };
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
      Object.defineProperty(window, 'visualViewport', { writable: true, configurable: true, value: mockVV });

      // < 640px mobile viewport
      mockMatchMedia(true, false);
      const { unmount } = render(<MobileStickyAnchorAd />);

      const anchor = screen.getByTestId('mobile-sticky-anchor-ad');
      expect(anchor).toHaveAttribute('data-scroll-interactive', 'true');
      expect(document.documentElement.style.getPropertyValue(MOBILE_ANCHOR_OFFSET_CSS_VAR)).toBe('64px');
      expect(document.documentElement.getAttribute('data-mobile-anchor-visible')).toBe('true');

      // Keyboard opens -> offset drops to 0px immediately
      act(() => {
        mockVV.height = 420;
        resizeHandlers.forEach((fn) => fn());
      });
      expect(document.documentElement.style.getPropertyValue(MOBILE_ANCHOR_OFFSET_CSS_VAR)).toBe('0px');
      expect(document.documentElement.getAttribute('data-mobile-anchor-visible')).toBeNull();

      // Keyboard closes -> restores 64px
      act(() => {
        mockVV.height = 800;
        resizeHandlers.forEach((fn) => fn());
      });
      expect(document.documentElement.style.getPropertyValue(MOBILE_ANCHOR_OFFSET_CSS_VAR)).toBe('64px');

      // Dismiss anchor ad -> resets to 0px cleanly
      fireEvent.click(screen.getByTestId('mobile-sticky-anchor-close'));
      expect(screen.queryByTestId('mobile-sticky-anchor-ad')).toBeNull();
      expect(document.documentElement.style.getPropertyValue(MOBILE_ANCHOR_OFFSET_CSS_VAR)).toBe('0px');
      unmount();

      // 640px..767px (sm mobile) -> 98px clearance
      mockMatchMedia(true, true);
      const { unmount: unmountSm } = render(<MobileStickyAnchorAd />);
      expect(document.documentElement.style.getPropertyValue(MOBILE_ANCHOR_OFFSET_CSS_VAR)).toBe('98px');
      unmountSm();
      expect(document.documentElement.style.getPropertyValue(MOBILE_ANCHOR_OFFSET_CSS_VAR)).toBe('0px');

      // Desktop viewport (>= 768px) -> does not mount & keeps offset 0px
      mockMatchMedia(false, true);
      const { unmount: unmountDesktop } = render(<MobileStickyAnchorAd />);
      expect(screen.queryByTestId('mobile-sticky-anchor-ad')).toBeNull();
      expect(document.documentElement.style.getPropertyValue(MOBILE_ANCHOR_OFFSET_CSS_VAR)).toBe('0px');
      unmountDesktop();
    });

    it('layers ScrollToTop above MobileStickyAnchorAd, ignores nested non-modal scrollables, and hides when dialog or keyboard opens', async () => {
      let resizeHandlers: Array<() => void> = [];
      const mockVV = {
        height: 800,
        addEventListener: jest.fn((ev: string, fn: () => void) => {
          if (ev === 'resize') resizeHandlers.push(fn);
        }),
        removeEventListener: jest.fn((ev: string, fn: () => void) => {
          if (ev === 'resize') resizeHandlers = resizeHandlers.filter((h) => h !== fn);
        }),
      };
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
      Object.defineProperty(window, 'visualViewport', { writable: true, configurable: true, value: mockVV });

      const { container } = render(
        <div>
          <div data-testid="inner-table-scroller" style={{ overflowY: 'auto' }} />
          <ScrollToTop />
        </div>
      );

      const btn = screen.getByTestId('mobile-scroll-to-top');
      expect(btn).toHaveAttribute('data-scroll-interactive', 'true');
      expect(btn.className).toContain('z-[9995]');
      expect(btn.className).toContain('var(--dview-mobile-anchor-offset,0px)');
      expect(btn.className).toContain('env(safe-area-inset-bottom,0px)');
      expect(btn).toHaveAttribute('aria-hidden', 'true');

      // Nested non-modal scrollable scroll event MUST NOT trigger page ScrollToTop
      const innerScroller = screen.getByTestId('inner-table-scroller');
      Object.defineProperty(innerScroller, 'scrollTop', { value: 300, configurable: true });
      act(() => {
        fireEvent.scroll(innerScroller);
      });
      expect(btn).toHaveAttribute('aria-hidden', 'true');

      // Document scroll > 120px reveals ScrollToTop
      Object.defineProperty(window, 'scrollY', { value: 260, writable: true, configurable: true });
      act(() => {
        fireEvent.scroll(document);
      });
      expect(btn).toHaveAttribute('aria-hidden', 'false');
      expect(btn.className).toContain('opacity-100');

      // Virtual keyboard open hides ScrollToTop
      act(() => {
        mockVV.height = 420;
        resizeHandlers.forEach((fn) => fn());
      });
      expect(btn).toHaveAttribute('aria-hidden', 'true');

      // Virtual keyboard close restores visibility
      act(() => {
        mockVV.height = 800;
        resizeHandlers.forEach((fn) => fn());
      });
      expect(btn).toHaveAttribute('aria-hidden', 'false');

      // When a visible modal dialog mounts, ScrollToTop hides on the next animation frame even WITHOUT scrolling,
      // and restores when the dialog unmounts. Hidden aria-modal dialogs must NOT suppress ScrollToTop.
      const flushFrame = () =>
        new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });

      const hiddenDialog = document.createElement('div');
      hiddenDialog.setAttribute('role', 'dialog');
      hiddenDialog.setAttribute('aria-modal', 'true');
      hiddenDialog.setAttribute('aria-hidden', 'true');
      await act(async () => {
        container.appendChild(hiddenDialog);
        await Promise.resolve();
        await flushFrame();
      });
      expect(btn).toHaveAttribute('aria-hidden', 'false');
      await act(async () => {
        hiddenDialog.remove();
        await Promise.resolve();
        await flushFrame();
      });

      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      await act(async () => {
        container.appendChild(dialog);
        await Promise.resolve();
        await flushFrame();
      });
      expect(btn).toHaveAttribute('aria-hidden', 'true');

      await act(async () => {
        dialog.remove();
        await Promise.resolve();
        await flushFrame();
      });
      expect(btn).toHaveAttribute('aria-hidden', 'false');
    });

    it('coalesces ScrollToTop MutationObserver checks via rAF, ignores body.is-scrolling and chart tooltip storms, and cancels pending rAF on unmount', async () => {
      const queuedFrames = new Map<number, FrameRequestCallback>();
      let nextFrameId = 1;
      const rafSpy = jest
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb: FrameRequestCallback) => {
          const id = nextFrameId++;
          queuedFrames.set(id, cb);
          return id;
        });
      const cafSpy = jest
        .spyOn(window, 'cancelAnimationFrame')
        .mockImplementation((id: number) => {
          queuedFrames.delete(id);
        });
      const qsaSpy = jest.spyOn(document, 'querySelectorAll');

      const flushQueuedFrames = async () => {
        await act(async () => {
          await Promise.resolve();
          const callbacks = Array.from(queuedFrames.values());
          queuedFrames.clear();
          callbacks.forEach((cb) => cb(16));
        });
      };

      try {
        const { container, unmount } = render(
          <div>
            <div data-testid="mock-chart-tooltip" className="recharts-tooltip-wrapper" />
            <ScrollToTop />
          </div>
        );

        const btn = screen.getByTestId('mobile-scroll-to-top');
        Object.defineProperty(window, 'scrollY', { value: 300, writable: true, configurable: true });
        act(() => {
          fireEvent.scroll(document);
        });
        expect(btn).toHaveAttribute('aria-hidden', 'false');

        // Clear initial mount calls
        rafSpy.mockClear();
        cafSpy.mockClear();
        qsaSpy.mockClear();

        // Storm 1: 20 rapid body.is-scrolling toggles & chart tooltip style/class updates with no modal in DOM
        const tooltip = screen.getByTestId('mock-chart-tooltip');
        await act(async () => {
          for (let i = 0; i < 20; i += 1) {
            document.body.classList.toggle('is-scrolling');
            tooltip.setAttribute('style', `transform: translate(${i * 5}px, ${i * 2}px);`);
            tooltip.className = `recharts-tooltip-wrapper step-${i}`;
          }
          await Promise.resolve();
        });
        expect(rafSpy).not.toHaveBeenCalled();
        expect(qsaSpy).not.toHaveBeenCalled();

        // Storm 2: Multiple relevant modal mutations in the same frame MUST coalesce into 1 rAF (zero synchronous qsa)
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        const innerTooltip = document.createElement('div');
        innerTooltip.className = 'recharts-tooltip-wrapper';
        dialog.appendChild(innerTooltip);

        await act(async () => {
          container.appendChild(dialog);
          dialog.classList.add('open');
          dialog.style.opacity = '1';
          await Promise.resolve();
        });
        // Zero synchronous querySelectorAll; exactly one coalesced rAF scheduled
        expect(qsaSpy).not.toHaveBeenCalled();
        expect(rafSpy).toHaveBeenCalledTimes(1);

        await flushQueuedFrames();
        expect(qsaSpy).toHaveBeenCalledTimes(1);
        expect(btn).toHaveAttribute('aria-hidden', 'true');

        // Storm 3: Chart tooltip style/class mutations INSIDE an open dialog + body.is-scrolling toggles + unrelated role updates must NOT re-query
        rafSpy.mockClear();
        qsaSpy.mockClear();
        const unrelatedStatus = document.createElement('div');
        container.appendChild(unrelatedStatus);
        await flushQueuedFrames();
        rafSpy.mockClear();
        qsaSpy.mockClear();
        await act(async () => {
          for (let i = 0; i < 15; i += 1) {
            document.body.classList.toggle('is-scrolling');
            innerTooltip.style.transform = `translate(${i}px, ${i}px)`;
            innerTooltip.className = `recharts-tooltip-wrapper active-${i}`;
            unrelatedStatus.setAttribute('role', i % 2 === 0 ? 'status' : 'tooltip');
          }
          await Promise.resolve();
        });
        expect(rafSpy).not.toHaveBeenCalled();
        expect(qsaSpy).not.toHaveBeenCalled();
        unrelatedStatus.remove();

        // Hiding the mounted dialog via style.display = 'none' restores ScrollToTop on the next animation frame
        await act(async () => {
          dialog.style.display = 'none';
          await Promise.resolve();
        });
        expect(rafSpy).toHaveBeenCalledTimes(1);
        await flushQueuedFrames();
        expect(btn).toHaveAttribute('aria-hidden', 'false');

        // Re-showing dialog schedules a pending rAF; unmounting BEFORE frame fires must cancelAnimationFrame
        rafSpy.mockClear();
        cafSpy.mockClear();
        qsaSpy.mockClear();
        await act(async () => {
          dialog.style.display = '';
          await Promise.resolve();
        });
        expect(rafSpy).toHaveBeenCalledTimes(1);
        const pendingFrameId = rafSpy.mock.results[0].value as number;

        unmount();
        expect(cafSpy).toHaveBeenCalledWith(pendingFrameId);
        expect(queuedFrames.size).toBe(0);
        expect(qsaSpy).not.toHaveBeenCalled();

        dialog.remove();
        document.body.classList.remove('is-scrolling');
      } finally {
        rafSpy.mockRestore();
        cafSpy.mockRestore();
        qsaSpy.mockRestore();
      }
    });

    it('handles ScrollToTop edge cases: ancestor-hidden dialogs (display:none/hidden/aria-hidden), same-tick scroll before microtask flush, and detached dialog with stripped role', async () => {
      const flushFrame = () =>
        new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });

      const { container } = render(<ScrollToTop />);
      const btn = screen.getByTestId('mobile-scroll-to-top');

      Object.defineProperty(window, 'scrollY', { value: 300, writable: true, configurable: true });
      act(() => {
        fireEvent.scroll(document);
      });
      expect(btn).toHaveAttribute('aria-hidden', 'false');

      // Edge 1: Dialog inside an ancestor with display:none MUST NOT suppress ScrollToTop
      const wrapper = document.createElement('div');
      wrapper.style.display = 'none';
      const nestedDialog = document.createElement('div');
      nestedDialog.setAttribute('role', 'dialog');
      nestedDialog.setAttribute('aria-modal', 'true');
      wrapper.appendChild(nestedDialog);

      await act(async () => {
        container.appendChild(wrapper);
        await Promise.resolve();
        await flushFrame();
      });
      expect(btn).toHaveAttribute('aria-hidden', 'false');

      // Revealing the ancestor wrapper suppresses ScrollToTop
      await act(async () => {
        wrapper.style.display = 'block';
        await Promise.resolve();
        await flushFrame();
      });
      expect(btn).toHaveAttribute('aria-hidden', 'true');

      // Hiding the ancestor via hidden attribute restores ScrollToTop
      await act(async () => {
        wrapper.hidden = true;
        await Promise.resolve();
        await flushFrame();
      });
      expect(btn).toHaveAttribute('aria-hidden', 'false');

      // Unhiding and setting aria-hidden="true" on ancestor keeps ScrollToTop visible
      await act(async () => {
        wrapper.hidden = false;
        wrapper.setAttribute('aria-hidden', 'true');
        await Promise.resolve();
        await flushFrame();
      });
      expect(btn).toHaveAttribute('aria-hidden', 'false');

      wrapper.remove();
      await act(async () => {
        await Promise.resolve();
        await flushFrame();
      });

      // Edge 2: Same-tick modal mount + synchronous scroll event BEFORE MutationObserver microtask flushes
      const sameTickDialog = document.createElement('div');
      sameTickDialog.setAttribute('role', 'dialog');
      sameTickDialog.setAttribute('aria-modal', 'true');
      act(() => {
        container.appendChild(sameTickDialog);
        fireEvent.scroll(document);
      });
      expect(btn).toHaveAttribute('aria-hidden', 'true');

      // Edge 3: Removing dialog and stripping role/aria-modal in the same tick still restores ScrollToTop
      await act(async () => {
        sameTickDialog.remove();
        sameTickDialog.removeAttribute('role');
        sameTickDialog.removeAttribute('aria-modal');
        await Promise.resolve();
        await flushFrame();
      });
      expect(btn).toHaveAttribute('aria-hidden', 'false');
    });

    it('keeps Footer clearance across all <md mobile widths (including 640-767px) and MobileDock scroll-interactive & safe-area aligned', () => {
      const { container: footerContainer } = render(<Footer />);
      const footerEl = footerContainer.querySelector('footer')!;
      expect(footerEl.className).toContain('md:pb-6');
      expect(footerEl.className).not.toContain('sm:pb-6');
      expect(footerEl.className).toContain('var(--dview-mobile-anchor-offset,0px)');

      const { container: dockContainer } = render(<MobileDock activeTab="stats" />);
      const nav = dockContainer.querySelector('nav')!;
      expect(nav).toHaveAttribute('data-scroll-interactive', 'true');
      expect(nav).toHaveAttribute('aria-label', '모바일 하단 내비게이션');

      const activeStatsLink = dockContainer.querySelector('a[href="/stats"]')!;
      expect(activeStatsLink).toHaveAttribute('aria-current', 'page');
      expect(activeStatsLink.className).toContain('overflow-hidden');

      fireEvent.click(within(dockContainer).getByTestId('mobile-dock-more-button'));
      const moreMenu = within(dockContainer).getByTestId('mobile-dock-more-menu');
      expect(moreMenu).toHaveAttribute('data-scroll-interactive', 'true');
      expect(moreMenu.className).toContain('env(safe-area-inset-bottom,0px)');
    });
  });

  describe('3. Inline ApartmentModalHeader Mobile Dropdown Clipping Fix & Share Menu', () => {
    const sampleReport = {
      id: 'apt-1',
      apartmentName: '동탄역롯데캐슬',
      dong: '오산동',
      author: 'D-VIEW',
      content: '',
      rating: 5,
      metrics: {} as FieldReportData['metrics'],
      images: [],
      likes: 0,
      commentCount: 0,
      createdAt: new Date('2026-11-01T00:00:00Z'),
    } as FieldReportData;

    it('never clips tool dropdown with overflow-x-auto in inline mode and provides mobile share popover with touchstart & Escape dismissal', () => {
      const setIsToolDropdownOpen = jest.fn();
      const handleNativeShare = jest.fn();

      render(
        <ApartmentModalHeader
          report={sampleReport}
          displayAptName="동탄역 롯데캐슬"
          inline={true}
          verifiedSalePriceManwon={158000}
          handleNativeShare={handleNativeShare}
          handleCopySummary={jest.fn()}
          handleDownloadShareCard={jest.fn()}
          setIsPushModalOpen={jest.fn()}
          copiedStatus={null}
          isToolDropdownOpen={false}
          setIsToolDropdownOpen={setIsToolDropdownOpen}
          toolDropdownRef={{ current: null }}
          preloadCalculators={jest.fn()}
          onOpenMortgage={jest.fn()}
        />
      );

      const inlineActions = screen.getByTestId('apt-inline-header-actions');
      expect(inlineActions.className).not.toContain('overflow-x-auto');
      expect(inlineActions.className).toContain('flex-wrap');

      // Mobile compact share button opens popover, elevates header stacking context above ApartmentChapterNavBar (z-[60]),
      // aligns right-0 to stay inside 320px-375px viewports, and closes on touchstart outside
      const shareBtn = screen.getByTestId('apt-header-share-menu-btn');
      const inlineHeaderRoot = inlineActions.closest('div.border-b') as HTMLElement;
      expect(inlineHeaderRoot.className).toContain('z-20');

      fireEvent.click(shareBtn);
      expect(setIsToolDropdownOpen).toHaveBeenCalledWith(false);
      const shareMenu = screen.getByTestId('apt-header-share-menu');
      expect(shareMenu).toBeInTheDocument();
      expect(shareMenu.className).toContain('right-0');
      expect(shareMenu.className).toContain('max-w-[calc(100vw-32px)]');
      expect(inlineHeaderRoot.className).toContain('z-[65]');

      fireEvent.touchStart(document.body);
      expect(screen.queryByTestId('apt-header-share-menu')).toBeNull();
      expect(inlineHeaderRoot.className).toContain('z-20');

      // Reopen and close with Escape
      fireEvent.click(shareBtn);
      expect(screen.getByTestId('apt-header-share-menu')).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('apt-header-share-menu')).toBeNull();

      // Verify no ancestor of apt-header-tool-menu has overflow-x-auto when opened AND header elevates to z-[65]
      const { container: toolOpenContainer, rerender } = render(
        <ApartmentModalHeader
          report={sampleReport}
          displayAptName="동탄역 롯데캐슬"
          inline={true}
          verifiedSalePriceManwon={158000}
          handleNativeShare={handleNativeShare}
          handleCopySummary={jest.fn()}
          handleDownloadShareCard={jest.fn()}
          setIsPushModalOpen={jest.fn()}
          copiedStatus={null}
          isToolDropdownOpen={true}
          setIsToolDropdownOpen={setIsToolDropdownOpen}
          toolDropdownRef={{ current: null }}
          preloadCalculators={jest.fn()}
          onOpenMortgage={jest.fn()}
        />
      );
      expect(toolOpenContainer.firstElementChild?.className).toContain('z-[65]');
      let cursor: HTMLElement | null = screen.getByTestId('apt-header-tool-menu').parentElement;
      while (cursor) {
        expect(cursor.className || '').not.toContain('overflow-x-auto');
        cursor = cursor.parentElement;
      }
      rerender(<></>);
    });

    it('dismisses tool dropdown on outside touchstart in useApartmentModalState', () => {
      function Harness() {
        const { isToolDropdownOpen, setIsToolDropdownOpen, toolDropdownRef } = useApartmentModalState({ inline: true });
        return (
          <div>
            <div ref={toolDropdownRef}>
              <button type="button" onClick={() => setIsToolDropdownOpen(true)}>open-tools</button>
              {isToolDropdownOpen && <div data-testid="harness-tool-menu">menu</div>}
            </div>
            <div data-testid="outside-area">outside</div>
          </div>
        );
      }

      render(<Harness />);
      fireEvent.click(screen.getByText('open-tools'));
      expect(screen.getByTestId('harness-tool-menu')).toBeInTheDocument();
      fireEvent.touchStart(screen.getByTestId('outside-area'));
      expect(screen.queryByTestId('harness-tool-menu')).toBeNull();
    });
  });

  describe('4. Explore Bottom Sheet Z-Index, Search Anchoring, MacroControls Contrast & StatsFilterBar Touch Outside', () => {
    it('elevates /explore mobile bottom sheet above MobileDock (z-[10020]), closes on Escape, and anchors SearchSuggestionDropdown inside search input container', () => {
      const sheetApartments = {
        오산동: [
          { name: '동탄역롯데캐슬', dong: '오산동', lat: 37.2, lng: 127.1, householdCount: 940, yearBuilt: '2021' },
        ],
      };
      const txSummaryData = {
        동탄역롯데캐슬: {
          dong: '오산동',
          avg1MPrice: 158000,
          avg1MPerPyeong: 4650,
          avg3MTxCount: 12,
        } as never,
      };

      const { container } = render(
        <TossApartmentExploreClient
          sheetApartments={sheetApartments as never}
          txSummaryData={txSummaryData}
          nameMapping={{}}
          fieldReportsMap={new Map()}
          publicRentalSet={new Set()}
          typeMap={{}}
          handleSelectApt={jest.fn()}
        />
      );

      // Focus search input -> dropdown must mount inside the same relative wrapper as the input
      const searchInput = screen.getByLabelText('단지명 검색');
      fireEvent.focus(searchInput);
      const listbox = screen.getByRole('listbox', { name: '검색 추천 및 자동완성' });
      expect(listbox).toHaveAttribute('data-scroll-interactive', 'true');
      expect(listbox.className).toContain('max-h-[min(460px,55dvh)]');
      expect(searchInput.parentElement?.contains(listbox)).toBe(true);

      // Open mobile category bottom sheet
      const categoryHeadingButtons = screen.getAllByRole('button', { name: /단지별 평단가 랭킹/ });
      fireEvent.click(categoryHeadingButtons[0]);
      const sheet = screen.getByTestId('explore-mobile-category-sheet');
      expect(sheet.className).toContain('z-[10020]');
      expect(sheet).toHaveAttribute('data-scroll-interactive', 'true');
      expect(sheet).toHaveAttribute('role', 'dialog');
      expect(sheet).toHaveAttribute('aria-modal', 'true');

      // Escape dismisses bottom sheet
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('explore-mobile-category-sheet')).toBeNull();

      // Suppress unused warning
      expect(container).toBeTruthy();
    });

    it('inverts active icon & badge contrast when MacroControls mobile filter toggle is expanded', () => {
      render(
        <TimelineFilterControls
          availableDongs={['오산동', '청계동']}
          availableApts={['동탄역롯데캐슬']}
          regionFilter="청계동"
          setRegionFilter={jest.fn()}
          setPyeongFilter={jest.fn()}
          pyeongFilter="30s"
        />
      );

      const toggleBtn = screen.getByTestId('timeline-mobile-filter-toggle');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
      expect(toggleBtn.textContent).toContain('상세조건 펼치기');

      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(toggleBtn.textContent).toContain('상세조건 접기');
      // Active count badge uses white-on-dark translucent surface instead of black-on-black
      const badge = within(toggleBtn).getByText('2');
      expect(badge.className).toContain('bg-white/20');
      expect(badge.className).not.toContain('bg-slate-900 text-white');
    });

    it('closes StatsFilterBar legal-dong dropdown on outside touchstart and elevates NotificationBanner PWA modal above MobileDock', () => {
      render(
        <div>
          <StatsFilterBar
            region="ALL"
            pyeong="ALL"
            timeframe="3M"
            onRegionChange={jest.fn()}
            onPyeongChange={jest.fn()}
            onTimeframeChange={jest.fn()}
          />
          <NotificationBanner />
        </div>
      );

      // Open dong menu and dismiss via mobile touchstart outside
      fireEvent.click(screen.getByRole('button', { name: /법정동 선택/ }));
      expect(screen.getByText('동탄1동 법정동')).toBeInTheDocument();
      fireEvent.touchStart(document.body);
      expect(screen.queryByText('동탄1동 법정동')).toBeNull();

      // Open NotificationBanner PWA guide modal -> z-[10020] > MobileDock z-[10000]
      fireEvent.click(screen.getByRole('button', { name: /D-VIEW 앱 홈 화면에 설치하기/ }));
      const pwaDialog = screen.getByRole('dialog');
      expect(pwaDialog.parentElement?.className).toContain('z-[10020]');
      expect(pwaDialog.parentElement).toHaveAttribute('data-scroll-interactive', 'true');
    });

    it('clamps StatsFilterBar legal-dong dropdown strictly inside [12px, innerWidth - 12px] across all mobile widths (320px~680px) including narrow centered triggers', () => {
      // Exhaustive pure-math boundary check across 320px..680px + ultra-narrow 240px + invalid inputs
      const widths = [240, 320, 340, 360, 375, 390, 414, 480, 560, 640, 680];
      for (const vw of widths) {
        const expectedMenuWidth = Math.min(DONG_MENU_DEFAULT_WIDTH, vw - DONG_MENU_VIEWPORT_MARGIN * 2);
        for (let triggerLeft = 0; triggerLeft <= vw - 40; triggerLeft += 17) {
          const offset = computeClampedDropdownLeftOffset(
            triggerLeft,
            DONG_MENU_DEFAULT_WIDTH,
            vw,
            DONG_MENU_VIEWPORT_MARGIN
          );
          const actualLeft = triggerLeft + offset;
          const actualRight = actualLeft + expectedMenuWidth;
          expect(actualLeft).toBeGreaterThanOrEqual(DONG_MENU_VIEWPORT_MARGIN);
          expect(actualRight).toBeLessThanOrEqual(vw - DONG_MENU_VIEWPORT_MARGIN);
        }
      }
      expect(computeClampedDropdownLeftOffset(100, 224, 0)).toBe(0);
      expect(computeClampedDropdownLeftOffset(Number.NaN, 224, 375)).toBe(0);

      // Component integration check for exact narrow-mobile centered trigger cases where rect.left + 224 > vw - 12 AND rect.right < 224
      const originalInnerWidth = window.innerWidth;
      const scenarios = [
        { vw: 320, triggerLeft: 110, triggerRight: 192 }, // 110+224=334 > 308 AND 192 < 224
        { vw: 360, triggerLeft: 140, triggerRight: 215 }, // 140+224=364 > 348 AND 215 < 224
        { vw: 375, triggerLeft: 155, triggerRight: 220 }, // 155+224=379 > 363 AND 220 < 224
        { vw: 680, triggerLeft: 510, triggerRight: 590 }, // right-aligned on wide mobile
        { vw: 1280, triggerLeft: 320, triggerRight: 400 }, // desktop left-aligned (offset 0)
      ];

      try {
        for (const { vw, triggerLeft, triggerRight } of scenarios) {
          Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: vw });
          const { unmount } = render(
            <StatsFilterBar
              region="ALL"
              pyeong="ALL"
              timeframe="3M"
              onRegionChange={jest.fn()}
              onPyeongChange={jest.fn()}
              onTimeframeChange={jest.fn()}
            />
          );

          const triggerBtn = screen.getByRole('button', { name: /법정동 선택/ });
          const wrapper = triggerBtn.parentElement as HTMLDivElement;
          jest.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
            left: triggerLeft,
            right: triggerRight,
            top: 100,
            bottom: 132,
            width: triggerRight - triggerLeft,
            height: 32,
            x: triggerLeft,
            y: 100,
            toJSON: () => ({}),
          });

          fireEvent.click(triggerBtn);
          const menu = screen.getByTestId('stats-dong-dropdown-menu');
          const offsetPx = Number.parseFloat(menu.style.left || '0');
          const resolvedLeft = triggerLeft + offsetPx;
          const resolvedRight = resolvedLeft + DONG_MENU_DEFAULT_WIDTH;

          expect(resolvedLeft).toBeGreaterThanOrEqual(DONG_MENU_VIEWPORT_MARGIN);
          expect(resolvedRight).toBeLessThanOrEqual(vw - DONG_MENU_VIEWPORT_MARGIN);
          if (vw === 1280) {
            expect(offsetPx).toBe(0);
          }

          // Resize viewport dynamically while menu is open -> must re-clamp inside [12px, 320 - 12px]
          Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 320 });
          act(() => {
            window.dispatchEvent(new Event('resize'));
          });
          const resizedOffsetPx = Number.parseFloat(menu.style.left || '0');
          const resizedLeft = triggerLeft + resizedOffsetPx;
          const resizedRight = resizedLeft + DONG_MENU_DEFAULT_WIDTH;
          expect(resizedLeft).toBeGreaterThanOrEqual(DONG_MENU_VIEWPORT_MARGIN);
          expect(resizedRight).toBeLessThanOrEqual(320 - DONG_MENU_VIEWPORT_MARGIN);

          unmount();
        }

        // Scrollbar-adjusted maxWidth & orientationchange / visualViewport resize / reflow re-clamping
        let vvResizeHandlers: Array<() => void> = [];
        const mockVV = {
          height: 700,
          width: 320,
          addEventListener: jest.fn((ev: string, fn: () => void) => {
            if (ev === 'resize') vvResizeHandlers.push(fn);
          }),
          removeEventListener: jest.fn((ev: string, fn: () => void) => {
            if (ev === 'resize') vvResizeHandlers = vvResizeHandlers.filter((h) => h !== fn);
          }),
        };
        const originalClientWidthDescriptor = Object.getOwnPropertyDescriptor(
          document.documentElement,
          'clientWidth'
        );
        Object.defineProperty(window, 'visualViewport', {
          writable: true,
          configurable: true,
          value: mockVV,
        });
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 240 });
        Object.defineProperty(document.documentElement, 'clientWidth', {
          writable: true,
          configurable: true,
          value: 225, // e.g. 15px vertical scrollbar
        });

        try {
          const { unmount: unmountScrollbar } = render(
            <StatsFilterBar
              region="ALL"
              pyeong="ALL"
              timeframe="3M"
              onRegionChange={jest.fn()}
              onPyeongChange={jest.fn()}
              onTimeframeChange={jest.fn()}
            />
          );
          const triggerBtn = screen.getByRole('button', { name: /법정동 선택/ });
          const wrapper = triggerBtn.parentElement as HTMLDivElement;
          let currentLeft = 90;
          jest.spyOn(wrapper, 'getBoundingClientRect').mockImplementation(() => ({
            left: currentLeft,
            right: currentLeft + 80,
            top: 100,
            bottom: 132,
            width: 80,
            height: 32,
            x: currentLeft,
            y: 100,
            toJSON: () => ({}),
          }));

          fireEvent.click(triggerBtn);
          const menu = screen.getByTestId('stats-dong-dropdown-menu');
          // Must explicitly cap maxWidth to clientWidth - 24 (201px), NOT 100vw - 24 (216px)
          expect(menu.style.maxWidth).toBe('201px');
          const sbLeft = currentLeft + Number.parseFloat(menu.style.left || '0');
          expect(sbLeft).toBeGreaterThanOrEqual(12);
          expect(sbLeft + 201).toBeLessThanOrEqual(225 - 12);

          // Simulate orientationchange moving trigger to x=150 on 360px viewport
          Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 360 });
          Object.defineProperty(document.documentElement, 'clientWidth', {
            writable: true,
            configurable: true,
            value: 360,
          });
          currentLeft = 150;
          act(() => {
            window.dispatchEvent(new Event('orientationchange'));
          });
          expect(menu.style.maxWidth).toBe('336px');
          const orientLeft = currentLeft + Number.parseFloat(menu.style.left || '0');
          expect(orientLeft).toBeGreaterThanOrEqual(12);
          expect(orientLeft + DONG_MENU_DEFAULT_WIDTH).toBeLessThanOrEqual(360 - 12);

          // Simulate visualViewport resize shrinking to 320px with trigger at x=120
          Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 320 });
          Object.defineProperty(document.documentElement, 'clientWidth', {
            writable: true,
            configurable: true,
            value: 320,
          });
          currentLeft = 120;
          act(() => {
            vvResizeHandlers.forEach((fn) => fn());
          });
          const vvLeft = currentLeft + Number.parseFloat(menu.style.left || '0');
          expect(vvLeft).toBeGreaterThanOrEqual(12);
          expect(vvLeft + DONG_MENU_DEFAULT_WIDTH).toBeLessThanOrEqual(320 - 12);

          unmountScrollbar();
        } finally {
          if (originalClientWidthDescriptor) {
            Object.defineProperty(document.documentElement, 'clientWidth', originalClientWidthDescriptor);
          } else {
            delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
          }
        }
      } finally {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: originalInnerWidth,
        });
      }
    });

    it('verifies all secondary modals/calculators use dvh mobile sizing, z-index > MobileDock (10000), and data-scroll-interactive', () => {
      const filesWithMinZ: Array<[string, RegExp]> = [
        ['src/components/consumer/AptFitFinder.tsx', /z-\[10020\]/],
        ['src/components/consumer/AdvancedValuationMetrics.tsx', /z-\[11000\]/],
        ['src/components/pwa/CustomA2HSModal.tsx', /z-\[10021\]/],
        ['src/components/pwa/PushSubscriptionModal.tsx', /z-\[11001\]/],
        ['src/components/ui/WelcomeModal.tsx', /z-\[20000\]/],
        ['src/components/apartment-modal/PhotoUploadModal.tsx', /max-h-\[90dvh\]/],
        ['src/components/macro/ZoneDonutFullscreenModal.tsx', /z-\[10025\]/],
        ['src/components/board/ApartmentTitleSelectorModal.tsx', /z-\[10025\]/],
        ['src/components/board/BoardPostDetailModal.tsx', /z-\[10020\]/],
        ['src/components/board/BoardPostWriteModal.tsx', /z-\[10020\]/],
        ['src/components/board/GpsVerificationModal.tsx', /z-\[10020\]/],
        ['src/components/macro/CoLeasingBoard.tsx', /z-\[10020\]/],
        ['src/components/macro/TechnoValleyDashboard.tsx', /z-\[10020\]/],
        ['src/components/consumer/MortgageCalculator.tsx', /max-h-\[92dvh\]/],
        ['src/components/consumer/JeonseSafetyCalculator.tsx', /max-h-\[92dvh\]/],
        ['src/components/consumer/PropertyTaxCalculator.tsx', /max-h-\[92dvh\]/],
        ['src/components/consumer/SellTimingCalculator.tsx', /max-h-\[92dvh\]/],
        ['src/components/consumer/AptCompareModal.tsx', /h-\[92dvh\]/],
      ];

      for (const [relPath, pattern] of filesWithMinZ) {
        const src = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
        expect(src).toMatch(pattern);
        expect(src).toContain('data-scroll-interactive="true"');
      }

      // AptFitFinder scrollable body must not apply justify-center (prevents top cutoff on tall mobile results)
      const fitFinderSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/consumer/AptFitFinder.tsx'), 'utf8');
      expect(fitFinderSrc).not.toMatch(/overflow-y-auto[^"]*justify-center/);
      expect(fitFinderSrc).toContain('acquireBodyScrollLock()');

      // GuideMobileScrollDepthBar respects safe-area-inset-top below PageHeroHeader
      const guideBarSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/guide/GuideMobileScrollDepthBar.tsx'), 'utf8');
      expect(guideBarSrc).toContain('dview-safe-sticky-top-12');

      // PageHeroHeader suppresses duplicate mobile sticky bar when hideMobileStickyBar is passed
      const { container: hiddenSticky } = render(
        <PageHeroHeader title="테스트" subtitleStrong="강조" hideMobileStickyBar />
      );
      expect(hiddenSticky.querySelector('.fixed.top-0')).toBeNull();
    });
  });
});
