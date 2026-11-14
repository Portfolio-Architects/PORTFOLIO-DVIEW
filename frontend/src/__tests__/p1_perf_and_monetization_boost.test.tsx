/**
 * @file p1_perf_and_monetization_boost.test.tsx
 * @description Empirical Unit & Integration Verification Suite for Phase 1 (P1):
 * - P1-1: MobileStickyAnchorAd component, NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR binding, MobileDock clearance, and document.hidden refresh freeze
 * - P1-2: Pretendard-subset.woff2 (<300KB valid wOF2 subset) and layout.tsx preload: true configuration
 * - P1-3: ApartmentModal & ApartmentPage (/apartment/[aptName]) ad wrapper un-nesting (>=328px mobile width) and SSR report visibility
 * - P1-4: useApartmentDetails on-demand full transaction lazy loading, TransactionTable load-more wiring, and CPA fallback same-tab Link routing
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import MobileStickyAnchorAd, {
  MOBILE_ANCHOR_SLOT_ENV_KEY,
  MOBILE_ANCHOR_REFRESH_SLOT_ID,
} from '@/components/layout/MobileStickyAnchorAd';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';
import { AdSlot } from '@/components/ads/AdSlot';
import { AdSlotCascadeFallbackView } from '@/components/ads/views/AdSlotCascadeFallbackView';
import { AdSlotAdBlockView } from '@/components/ads/views/AdSlotAdBlockView';
import {
  CPA_CAMPAIGN_CATALOG,
  resolveNativeCpaFallbackPayload,
} from '@/lib/ads/cascadeFallback';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { TransactionTable } from '@/components/apartment-modal/TransactionTable';
import ApartmentPage from '@/app/apartment/[aptName]/page';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { TransactionRecord } from '@/types';

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsValues: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
  }),
}));

jest.mock('@/components/DashboardClient', () => {
  return function MockDashboardClient() {
    return <div data-testid="mock-dashboard-client" />;
  };
});

const mockedUseSWR = useSWR as jest.Mock;

describe('Phase 1 (P1): Performance & Monetization Acceleration Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE;
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1103228112872356';
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR = '9988776655';
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      writable: true,
      value: false,
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('P1-1: MobileStickyAnchorAd Component & RootLayout Mounting', () => {
    const originalInnerWidth = window.innerWidth;

    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 390,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: originalInnerWidth,
      });
    });

    it('mounts MobileStickyAnchorAd in src/app/layout.tsx and binds NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR without hardcoded slotId prop', () => {
      const layoutPath = path.resolve(__dirname, '../app/layout.tsx');
      const layoutSrc = fs.readFileSync(layoutPath, 'utf-8');
      expect(layoutSrc).toContain("import MobileStickyAnchorAd from '@/components/layout/MobileStickyAnchorAd'");
      expect(layoutSrc).toContain('<MobileStickyAnchorAd />');

      render(<MobileStickyAnchorAd />);

      const anchorAside = screen.getByTestId('mobile-sticky-anchor-ad');
      expect(anchorAside).toBeInTheDocument();
      expect(anchorAside).toHaveAttribute('data-ad-slot-env', MOBILE_ANCHOR_SLOT_ENV_KEY);
      expect(anchorAside).toHaveAttribute('data-anchor-slot-id', '9988776655');
      expect(anchorAside).toHaveAttribute('data-refresh-paused', 'false');

      // Ensures MobileDock clearance (bottom-[calc(env(safe-area-inset-bottom)+68px)], z-[9990], md:hidden)
      expect(anchorAside.className).toContain('bottom-[calc(env(safe-area-inset-bottom)+68px)]');
      expect(anchorAside.className).toContain('z-[9990]');
      expect(anchorAside.className).toContain('md:hidden');

      const adSlotContainer = within(anchorAside).getByTestId('ad-slot-container');
      expect(adSlotContainer).toHaveAttribute('data-slot-format', 'horizontal-strip');
      expect(adSlotContainer.querySelector('ins.adsbygoogle')).toHaveAttribute('data-ad-slot', '9988776655');
      expect(adSlotContainer.querySelector('ins.adsbygoogle')).toHaveAttribute('data-ad-format', 'horizontal');
    });

    it('pauses and resumes smart refresh via adRefreshManager on document.hidden visibilitychange', () => {
      const visSpy = jest.spyOn(adRefreshManager, 'handleVisibilityChange');
      render(<MobileStickyAnchorAd />);

      const anchorAside = screen.getByTestId('mobile-sticky-anchor-ad');
      expect(anchorAside).toHaveAttribute('data-refresh-paused', 'false');

      act(() => {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          writable: true,
          value: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(visSpy).toHaveBeenCalledWith(true);
      expect(anchorAside).toHaveAttribute('data-refresh-paused', 'true');

      act(() => {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          writable: true,
          value: false,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(visSpy).toHaveBeenCalledWith(false);
      expect(anchorAside).toHaveAttribute('data-refresh-paused', 'false');
      visSpy.mockRestore();
    });

    it('initializes isDocumentHidden to false for SSR hydration parity and syncs hidden tab state in useEffect', () => {
      const anchorComponentPath = path.resolve(__dirname, '../components/layout/MobileStickyAnchorAd.tsx');
      const anchorComponentSrc = fs.readFileSync(anchorComponentPath, 'utf-8');
      expect(anchorComponentSrc).toContain('useState<boolean>(false)');
      expect(anchorComponentSrc).not.toMatch(/useState[\s\S]{0,80}document\.hidden/);

      Object.defineProperty(document, 'hidden', {
        configurable: true,
        writable: true,
        value: true,
      });

      const visSpy = jest.spyOn(adRefreshManager, 'handleVisibilityChange');
      render(<MobileStickyAnchorAd />);

      const anchorAside = screen.getByTestId('mobile-sticky-anchor-ad');
      expect(visSpy).toHaveBeenCalledWith(true);
      expect(anchorAside).toHaveAttribute('data-refresh-paused', 'true');
      visSpy.mockRestore();
    });

    it('supports user dismissal, virtual keyboard auto-hide, and NEXT_PUBLIC_ADSENSE_APPROVAL_MODE suppression', () => {
      let resizeHandler: (() => void) | null = null;
      const mockVisualViewport = {
        height: 800,
        addEventListener: jest.fn((evt: string, cb: () => void) => {
          if (evt === 'resize') resizeHandler = cb;
        }),
        removeEventListener: jest.fn(),
      };
      Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        writable: true,
        value: mockVisualViewport,
      });

      const unobserveSpy = jest.spyOn(adRefreshManager, 'unobserve');
      const { unmount } = render(<MobileStickyAnchorAd />);

      const anchorAside = screen.getByTestId('mobile-sticky-anchor-ad');
      expect(anchorAside.className).toContain('opacity-100');

      // Simulate virtual keyboard opening (height drops below 75% of innerHeight)
      act(() => {
        mockVisualViewport.height = 400;
        resizeHandler?.();
      });
      expect(anchorAside.className).toContain('opacity-0');
      expect(anchorAside.className).toContain('translate-y-8');
      expect(anchorAside).toHaveAttribute('aria-hidden', 'true');
      expect(anchorAside.firstElementChild?.className).toContain('pointer-events-none');
      expect(anchorAside.firstElementChild?.className).not.toContain('pointer-events-auto');

      const closeBtn = screen.getByTestId('mobile-sticky-anchor-close');
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('mobile-sticky-anchor-ad')).not.toBeInTheDocument();
      expect(unobserveSpy).toHaveBeenCalledWith(MOBILE_ANCHOR_REFRESH_SLOT_ID);
      unmount();
      unobserveSpy.mockRestore();

      // Approval mode suppression
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';
      render(<MobileStickyAnchorAd />);
      expect(screen.queryByTestId('mobile-sticky-anchor-ad')).not.toBeInTheDocument();
    });
  });

  describe('P1-2: Pretendard-subset.woff2 Payload Optimization & Preload Contract', () => {
    it('verifies Pretendard-subset.woff2 (<300KB) contains all 2,350 KS X 1001 Hangul glyph outlines, preserves CSS fallback for unkept codepoints, and enables preload: true', () => {
      const subsetFontPath = path.resolve(__dirname, '../../public/fonts/Pretendard-subset.woff2');
      const fullFontPath = path.resolve(__dirname, '../../public/fonts/PretendardVariable.woff2');
      expect(fs.existsSync(subsetFontPath)).toBe(true);

      const subsetBuf = fs.readFileSync(subsetFontPath);
      const fullStats = fs.statSync(fullFontPath);

      // Valid WOFF2 magic bytes ('wOF2')
      expect(subsetBuf.slice(0, 4).toString('ascii')).toBe('wOF2');
      // Size is between 100KB and 300KB (~271KB, >85% reduction from 2.06MB)
      expect(subsetBuf.length).toBeGreaterThan(100 * 1024);
      expect(subsetBuf.length).toBeLessThan(300 * 1024);
      expect(subsetBuf.length).toBeLessThan(fullStats.size * 0.2);

      // Deep WOFF2 glyph outline & cmap verification via fontkit + iconv-lite
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder } = require('util');
      if (typeof globalThis.TextEncoder === 'undefined') {
        Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const iconv = require('iconv-lite');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fontkit = require('next/dist/compiled/@next/font/dist/fontkit');
      const font = fontkit.default(subsetBuf);

      let ksxCount = 0;
      let nonEmptyKsxOutlines = 0;
      for (let b1 = 0xb0; b1 <= 0xc8; b1++) {
        for (let b2 = 0xa1; b2 <= 0xfe; b2++) {
          const ch = iconv.decode(Buffer.from([b1, b2]), 'euc-kr');
          if (ch && ch.length === 1) {
            const cp = ch.codePointAt(0)!;
            if (cp >= 0xac00 && cp <= 0xd7a3) {
              ksxCount++;
              if (font.hasGlyphForCodePoint(cp) && font.glyphForCodePoint(cp).path.commands.length > 0) {
                nonEmptyKsxOutlines++;
              }
            }
          }
        }
      }
      expect(ksxCount).toBe(2350);
      expect(nonEmptyKsxOutlines).toBe(2350);

      // Verify non-KS X 1001 rare syllables are removed from cmap so browser CSS fallback works
      expect(font.hasGlyphForCodePoint('믜'.codePointAt(0)!)).toBe(false);

      const layoutPath = path.resolve(__dirname, '../app/layout.tsx');
      const layoutSrc = fs.readFileSync(layoutPath, 'utf-8');
      expect(layoutSrc).toContain("src: '../../public/fonts/Pretendard-subset.woff2'");
      expect(layoutSrc).toContain('preload: true');
      expect(layoutSrc).not.toContain('preload: false');
    });
  });

  describe('P1-3: ApartmentModal & ApartmentPage Ad Wrapper Un-nesting (>=328px Mobile Width) & SSR Report Visibility', () => {
    it('removes nested p-4 sm:p-5 from apartment-ad-slot-ch02 and apartment-ad-slot-ch05 in ApartmentModal.tsx', () => {
      const modalPath = path.resolve(__dirname, '../components/apartment/ApartmentModal.tsx');
      const modalSrc = fs.readFileSync(modalPath, 'utf-8');

      const ch02Match = modalSrc.match(/data-testid="apartment-ad-slot-ch02"[\s\S]*?>/);
      const ch05Match = modalSrc.match(/data-testid="apartment-ad-slot-ch05"[\s\S]*?>/);
      expect(ch02Match).not.toBeNull();
      expect(ch05Match).not.toBeNull();

      expect(ch02Match![0]).not.toContain('p-4');
      expect(ch02Match![0]).not.toContain('sm:p-5');
      expect(ch02Match![0]).toContain('min-h-[180px] sm:min-h-[220px] md:min-h-[250px]');
      expect(ch02Match![0]).toContain('bg-elevated dark:bg-slate-900');

      expect(ch05Match![0]).not.toContain('p-4');
      expect(ch05Match![0]).not.toContain('sm:p-5');
      expect(ch05Match![0]).toContain('min-h-[180px] sm:min-h-[220px] md:min-h-[250px]');
      expect(ch05Match![0]).toContain('bg-elevated dark:bg-slate-900');
    });

    it('exposes #apt-ssr-comprehensive-report visibly on /apartment/[aptName] and removes nested p-4 / borders on ssr-adslot-ch02 & ssr-adslot-ch05', async () => {
      const PageJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: '동탄역롯데캐슬' }),
      });
      const { container, unmount } = render(PageJsx);

      const reportSection = container.querySelector('#apt-ssr-comprehensive-report');
      expect(reportSection).not.toBeNull();
      expect(reportSection?.className).not.toContain('sr-only');

      const adCh02 = container.querySelector('[data-testid="ssr-adslot-ch02"]');
      const adCh05 = container.querySelector('[data-testid="ssr-adslot-ch05"]');
      expect(adCh02).not.toBeNull();
      expect(adCh05).not.toBeNull();

      expect(adCh02?.className).toContain('min-h-[250px]');
      expect(adCh02?.className).toContain('bg-elevated');
      expect(adCh02?.className).not.toContain('p-4');
      expect(adCh02?.className).not.toContain('backdrop-blur-xl');

      expect(adCh05?.className).toContain('min-h-[250px]');
      expect(adCh05?.className).toContain('bg-elevated');
      expect(adCh05?.className).toContain('dark:bg-slate-900');
      expect(adCh05?.className).not.toContain('p-4');
      expect(adCh05?.className).not.toContain('backdrop-blur-xl');

      unmount();
    });
  });

  describe('P1-4: On-Demand Full Transaction Lazy Loading & CPA Fallback Same-Tab Routing', () => {
    it('does NOT auto-fetch full transaction JSON after 250ms in useApartmentDetails, loading it only when loadAllTransactions() is called', () => {
      jest.useFakeTimers();
      const swrKeys: Array<string | null> = [];
      mockedUseSWR.mockImplementation((key: string | null) => {
        swrKeys.push(key);
        return { data: [], isLoading: false };
      });

      const report: FieldReportData = {
        id: 'stub-1',
        apartmentName: '동탄역롯데캐슬',
        dong: '오산동',
      } as FieldReportData;

      const { result } = renderHook(() =>
        useApartmentDetails(report, {}, undefined, null, {}, {})
      );

      // Advance well past the former 250ms timer
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Full JSON key (/tx-data/...json without -recent) must NOT have been requested
      const fullRequestsBefore = swrKeys.filter(
        (k) => typeof k === 'string' && !k.includes('-recent.json')
      );
      expect(fullRequestsBefore).toHaveLength(0);

      // Trigger loadAllTransactions() explicitly
      act(() => {
        result.current.loadAllTransactions();
      });

      const fullRequestsAfter = swrKeys.filter(
        (k) => typeof k === 'string' && !k.includes('-recent.json')
      );
      expect(fullRequestsAfter.length).toBeGreaterThan(0);
      expect(fullRequestsAfter[0]).toContain(encodeURIComponent('동탄역롯데캐슬') + '.json');

      jest.useRealTimers();
    });

    it('invokes loadAllTransactions when clicking the load-more button in TransactionTable, including mixed-dealType -recent.json (<=defaultCount filtered items) and async full-load expansion', () => {
      const loadAllMock = jest.fn();
      // Scenario 1: 15 records in -recent.json where only 4 are sale ('중개거래') and 11 are '전세'
      const mixedRecentTxs: TransactionRecord[] = Array.from({ length: 15 }, (_, idx) => ({
        no: idx + 1,
        sigungu: '화성시',
        dong: '능동',
        aptName: 'KCC스위첸아파트',
        area: 84,
        areaPyeong: 34,
        contractYm: '202604',
        contractDay: String(idx + 1),
        contractDate: `202604${String(idx + 1).padStart(2, '0')}`,
        price: 60000 + idx * 100,
        priceEok: '6억',
        deposit: 40000,
        floor: 5 + idx,
        buyer: '',
        seller: '',
        buildYear: 2010,
        roadName: '',
        cancelDate: '',
        dealType: idx < 4 ? '중개거래' : '전세',
        agentLocation: '',
        registrationDate: '-',
        housingType: '아파트',
        reqGb: '',
        rnuYn: '',
      }));

      const { rerender } = render(
        <TransactionTable
          transactions={mixedRecentTxs}
          typeMap={{}}
          chartType="sale"
          normalizeAptName={(n) => n}
          loadAllTransactions={loadAllMock}
        />
      );

      // Even though only 4 sale records exist in -recent.json (<= defaultCount 6),
      // transactions.length is 15 so "실거래가 더보기" must still render!
      const moreBtn = screen.getByRole('button', { name: /실거래가 더보기/ });
      fireEvent.click(moreBtn);
      expect(loadAllMock).toHaveBeenCalledTimes(1);

      // Simulate full .json resolving with 12 sale records
      const fullSaleTxs: TransactionRecord[] = Array.from({ length: 12 }, (_, idx) => ({
        ...mixedRecentTxs[0],
        no: idx + 1,
        contractDay: String(idx + 1),
        price: 60000 + idx * 100,
        floor: 1 + idx,
        dealType: '중개거래',
      }));
      rerender(
        <TransactionTable
          transactions={fullSaleTxs}
          typeMap={{}}
          chartType="sale"
          normalizeAptName={(n) => n}
          loadAllTransactions={loadAllMock}
        />
      );

      // Because visibleCount expanded to 4 + 6 = 10 (not clamped to 4), 10 rows are now shown and 2 remain
      expect(screen.getByRole('button', { name: /실거래가 더보기 \(2개 더보기, 10\/12\)/ })).toBeInTheDocument();
    });

    it('renders CPA fallback links via Next.js Link without target="_blank" in AdSlotCascadeFallbackView and AdSlotAdBlockView', () => {
      const payload = resolveNativeCpaFallbackPayload({
        slotId: '1000000002',
        sourceTrigger: 'UNFILLED_ATTRIBUTE',
        cpaCampaignId: 'mortgage-refinance',
      });
      const template = CPA_CAMPAIGN_CATALOG['mortgage-refinance'];
      const onClickMock = jest.fn((e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault());

      const { unmount } = render(
        <AdSlotCascadeFallbackView
          cpaPayload={payload}
          cpaTemplate={template}
          cascadeStatus="FALLBACK_ACTIVE"
          lateFillDiscarded={false}
          minHeightClass="min-h-[250px]"
          onCascadeCtaClick={onClickMock}
        />
      );

      const cascadeCta = screen.getByTestId('ad-slot-cascade-cta');
      expect(cascadeCta).toHaveAttribute('href', payload.targetUrl);
      expect(cascadeCta).not.toHaveAttribute('target', '_blank');
      expect(cascadeCta).not.toHaveAttribute('rel', 'noopener noreferrer');

      fireEvent.click(cascadeCta);
      expect(onClickMock).toHaveBeenCalledTimes(1);
      unmount();

      const onAdBlockClickMock = jest.fn((e?: React.MouseEvent<HTMLAnchorElement>) =>
        e?.preventDefault()
      );
      render(
        <AdSlotAdBlockView
          fallbackType="cpa"
          cpaPayload={payload}
          cpaTemplate={template}
          minHeightClass="min-h-[250px]"
          onAdBlockFallbackClick={onAdBlockClickMock}
        />
      );

      const adblockCta = screen.getByTestId('ad-slot-adblock-cta');
      expect(adblockCta).toHaveAttribute('href', payload.targetUrl);
      expect(adblockCta).not.toHaveAttribute('target', '_blank');
      expect(adblockCta).not.toHaveAttribute('rel', 'noopener noreferrer');

      fireEvent.click(adblockCta);
      expect(onAdBlockClickMock).toHaveBeenCalledTimes(1);
    });
  });
});
