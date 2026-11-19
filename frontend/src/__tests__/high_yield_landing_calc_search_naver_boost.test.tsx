/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import TopLandingCalculatorQuickBar from '@/components/finance/TopLandingCalculatorQuickBar';
import InlineMortgageDsrBridge from '@/components/finance/InlineMortgageDsrBridge';
import TechnoValleyPage from '@/app/technovalley/page';
import TechnoValleyDetailPage from '@/app/technovalley/[slug]/page';
import GuideArticlePage from '@/app/guide/[slug]/page';
import { metadata as homeMetadata } from '@/app/page';
import { metadata as exploreMetadata } from '@/app/explore/page';
import { metadata as statsMetadata } from '@/app/stats/page';
import { metadata as aboutMetadata } from '@/app/about/page';
import { metadata as contactMetadata } from '@/app/contact/page';
import { metadata as termsMetadata } from '@/app/terms/page';
import { metadata as privacyMetadata } from '@/app/privacy/page';
import { metadata as overviewMetadata } from '@/app/overview/page';
import { generateMetadata as generateZonePageMetadata } from '@/app/zone/[id]/page';
import { generateMetadata as generateZoneLayoutMetadata } from '@/app/zone/[id]/layout';
import {
  buildApartmentSeoMetadata,
  buildTechnoValleySeoMetadata,
  getDefaultApartmentMetadata,
  getTechnoValleyJisanList,
} from '@/lib/services/apartmentPageService';
import {
  buildSearchQueryReportDimensions,
  coalesceSearchQueryRows,
} from '@/lib/services/ga4CustomDimensions';
import {
  collectAndAuditNaverSeoReadiness,
  runNaverSearchAdvisorAudit,
} from '@/lib/seo/naverSearchAdvisorAudit';
import { GUIDE_ARTICLES } from '@/lib/data/guides';
import { hasVerboseProseEnding } from '@/lib/design-system/copyDiet';
import {
  clearPendingCalculatorContext,
  consumePendingCalculatorContext,
} from '@/lib/utils/pendingCalculatorContext';
import * as analyticsModule from '@/lib/utils/analytics';

jest.mock('@/app/globals.css', () => ({}));

jest.mock('next/font/local', () => () => ({
  variable: '--font-pretendard',
  className: 'mock-pretendard',
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/technovalley',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/components/LoungeHeader', () => {
  return function MockLoungeHeader({ activeTab }: { activeTab?: string }) {
    return <header data-testid="mock-lounge-header" data-active-tab={activeTab} />;
  };
});

jest.mock('@/components/pwa/MobileDock', () => {
  return function MockMobileDock({ activeTab }: { activeTab?: string }) {
    return <nav data-testid="mock-mobile-dock" data-active-tab={activeTab} />;
  };
});

jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: ({ refreshSlotId }: { refreshSlotId?: string }) => (
    <div data-testid="mock-ad-slot" data-slot={refreshSlotId || ''} />
  ),
}));

jest.mock('@/components/macro/TechnoValleyDashboard', () => {
  return function MockTechnoValleyDashboard() {
    return (
      <div id="tax-simulator" tabIndex={-1} data-testid="mock-tax-simulator">
        Mock Tax Simulator
      </div>
    );
  };
});

describe('High-Yield Landing Conversion, GA4 search_term Coalescing & Naver Search Advisor Hygiene', () => {
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    trackEventSpy = jest.spyOn(analyticsModule, 'trackEvent').mockImplementation(() => {});
    clearPendingCalculatorContext();
    if (typeof window !== 'undefined') {
      window.__dviewPendingRelocationSim = undefined;
      window.history.replaceState({}, '', '/');
    }
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
    clearPendingCalculatorContext();
    jest.useRealTimers();
  });

  describe('Track 1: Above-the-Fold Financial Calculator Quick-Entry Bars (/technovalley & Top Guides)', () => {
    it('places TopLandingCalculatorQuickBar above the bounce defense strip on /technovalley with both corporate_tax_simulator & mortgage CTAs', async () => {
      const PageJsx = await TechnoValleyPage();
      const { container, unmount } = render(PageJsx);

      const quickBar = screen.getByTestId('top-landing-calculator-quick-bar');
      const bounceStrip = screen.getByTestId('technovalley-hub-bounce-defense-strip');
      expect(quickBar).toHaveAttribute('data-variant', 'technovalley');
      expect(quickBar.className).toContain('min-h-[56px]');
      expect(
        Boolean(quickBar.compareDocumentPosition(bounceStrip) & Node.DOCUMENT_POSITION_FOLLOWING)
      ).toBe(true);
      expect(container.querySelectorAll('.font-mono')).toHaveLength(0);
      expect(hasVerboseProseEnding(quickBar.textContent || '')).toBe(false);

      // 1) Corporate Tax Simulator CTA fires open_calculator + syncs #tax-simulator bridge
      const simEl = screen.getByTestId('mock-tax-simulator');
      const scrollSpy = jest.fn();
      simEl.scrollIntoView = scrollSpy;
      const receivedEvents: CustomEvent[] = [];
      const eventListener = (e: Event) => receivedEvents.push(e as CustomEvent);
      window.addEventListener('dview:set_relocation_sim_price', eventListener);

      fireEvent.click(within(quickBar).getByTestId('top-calc-quick-corporate-tax-btn'));
      expect(trackEventSpy).toHaveBeenCalledWith(
        'open_calculator',
        expect.objectContaining({
          calculator_type: 'corporate_tax_simulator',
          surface: 'technovalley_top_quick_bar',
          trigger: 'top_quick_bar_corporate_tax',
          apartment_name: '동탄테크노밸리',
          purchase_price_manwon: 30000,
        })
      );
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].detail).toEqual({
        purchasePriceManwon: 30000,
        existingLocation: 'overconcentrated',
      });
      expect(scrollSpy).toHaveBeenCalled();
      window.removeEventListener('dview:set_relocation_sim_price', eventListener);

      // 2) Mortgage Quick CTA links to /?calc=mortgage, emits open_calculator, and sets alreadyTrackedOpen=true
      const mortgageLink = within(quickBar).getByTestId('top-calc-quick-mortgage-btn');
      expect(mortgageLink).toHaveAttribute('href', '/?calc=mortgage');

      // Modified click (Cmd/Ctrl+click) must not pre-consume tracking
      fireEvent.click(mortgageLink, { ctrlKey: true });
      expect(
        trackEventSpy.mock.calls.filter(
          ([name, params]) => name === 'open_calculator' && params?.calculator_type === 'mortgage'
        )
      ).toHaveLength(0);

      fireEvent.click(mortgageLink);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'open_calculator',
        expect.objectContaining({
          calculator_type: 'mortgage',
          surface: 'technovalley_top_quick_bar',
          trigger: 'top_quick_bar_mortgage',
          apartment_name: '동탄테크노밸리',
        })
      );
      const pendingCtx = consumePendingCalculatorContext();
      expect(pendingCtx?.alreadyTrackedOpen).toBe(true);
      unmount();
    });

    it('renders TopLandingCalculatorQuickBar on /technovalley/[slug] detail page and /technovalley?jisan=... SSR path', async () => {
      const jisanList = await getTechnoValleyJisanList();
      const sampleSlug = jisanList[0].name.trim().replace(/\s+/g, '-');
      const DetailJsx = await TechnoValleyDetailPage({
        params: Promise.resolve({ slug: sampleSlug }),
        initialTransactions: [],
      });
      const { unmount } = render(DetailJsx);

      const quickBar = screen.getByTestId('top-landing-calculator-quick-bar');
      expect(quickBar).toHaveAttribute('data-variant', 'technovalley');
      expect(within(quickBar).getByTestId('top-calc-quick-corporate-tax-btn')).toBeInTheDocument();
      expect(within(quickBar).getByTestId('top-calc-quick-mortgage-btn')).toBeInTheDocument();
      unmount();

      // Also verify /technovalley?jisan=... SSR card renders TopLandingCalculatorQuickBar
      const QueryJsx = await TechnoValleyPage({
        searchParams: Promise.resolve({ jisan: jisanList[0].name }),
        initialTransactions: [],
      });
      const { unmount: unmountQuery } = render(QueryJsx);
      const queryQuickBar = screen.getByTestId('top-landing-calculator-quick-bar');
      expect(queryQuickBar).toHaveAttribute('data-surface', 'technovalley_query_top_quick_bar');
      expect(within(queryQuickBar).getByTestId('top-calc-quick-corporate-tax-btn')).toBeInTheDocument();
      expect(within(queryQuickBar).getByTestId('top-calc-quick-mortgage-btn')).toBeInTheDocument();
      unmountQuery();
    });

    it('places TopLandingCalculatorQuickBar above-the-fold BEFORE GuideMobileScrollDepthBar on /guide/dongtan-budget-tier-ranking & lake-vs-station, opens ONLY the top inline precision drawer without double-firing open_calculator', async () => {
      for (const slug of [
        'dongtan-budget-tier-ranking',
        'dongtan-lake-vs-station-comparison',
      ] as const) {
        trackEventSpy.mockClear();
        const PageJsx = await GuideArticlePage({
          params: Promise.resolve({ slug }),
        });
        const { container, unmount } = render(PageJsx);

        const quickBar = screen.getByTestId('top-landing-calculator-quick-bar');
        const stickyTocBar = screen.getByTestId('guide-mobile-scroll-depth-bar');
        const factSheet = container.querySelector('#guide-geo-fact-sheet')!;
        const topBridgeContainer = container.querySelector('#guide-top-finance-bridge')!;
        const keyTakeaways = container.querySelector('#guide-key-takeaways')!;

        expect(quickBar).toHaveAttribute('data-variant', 'guide');
        expect(
          Boolean(quickBar.compareDocumentPosition(stickyTocBar) & Node.DOCUMENT_POSITION_FOLLOWING)
        ).toBe(true);
        expect(
          Boolean(quickBar.compareDocumentPosition(factSheet) & Node.DOCUMENT_POSITION_FOLLOWING)
        ).toBe(true);
        expect(
          Boolean(
            quickBar.compareDocumentPosition(keyTakeaways) & Node.DOCUMENT_POSITION_FOLLOWING
          )
        ).toBe(true);

        if (slug === 'dongtan-lake-vs-station-comparison') {
          const matchupBridge = screen.getByTestId('guide-top-h2h-matchup-bridge');
          expect(
            Boolean(
              quickBar.compareDocumentPosition(matchupBridge) & Node.DOCUMENT_POSITION_FOLLOWING
            )
          ).toBe(true);
        }

        const scrollSpy = jest.fn();
        topBridgeContainer.scrollIntoView = scrollSpy;

        // Before click: 0 inline precision drawers open
        expect(screen.queryAllByTestId('inline-precision-calc-drawer')).toHaveLength(0);

        // Click Mortgage Quick CTA -> opens ONLY #guide-top-finance-bridge drawer and fires open_calculator ONCE
        fireEvent.click(within(quickBar).getByTestId('top-calc-quick-mortgage-btn'));

        const openDrawers = screen.getAllByTestId('inline-precision-calc-drawer');
        expect(openDrawers).toHaveLength(1);
        expect(topBridgeContainer.contains(openDrawers[0])).toBe(true);
        expect(scrollSpy).toHaveBeenCalledTimes(1);

        const mortgageOpens = trackEventSpy.mock.calls.filter(
          ([name, params]) =>
            name === 'open_calculator' && params?.calculator_type === 'mortgage'
        );
        expect(mortgageOpens).toHaveLength(1);
        expect(mortgageOpens[0][1]).toEqual(
          expect.objectContaining({
            calculator_type: 'mortgage',
            surface: 'guide_top_quick_bar',
            trigger: 'guide_top_quick_bar_mortgage',
            guide_slug: slug,
          })
        );

        // Click Tax Quick CTA -> switches drawer to tax tab and emits property_tax ONCE
        fireEvent.click(within(quickBar).getByTestId('top-calc-quick-tax-btn'));
        const taxOpens = trackEventSpy.mock.calls.filter(
          ([name, params]) =>
            name === 'open_calculator' && params?.calculator_type === 'property_tax'
        );
        expect(taxOpens).toHaveLength(1);
        expect(within(topBridgeContainer).getByText('비조정 1·2주택')).toBeInTheDocument();

        // Click Corporate Tax Quick CTA -> links to /technovalley#tax-simulator and emits corporate_tax_simulator
        const corpTaxLink = within(quickBar).getByTestId('top-calc-quick-corporate-tax-btn');
        expect(corpTaxLink).toHaveAttribute('href', '/technovalley#tax-simulator');
        fireEvent.click(corpTaxLink);
        expect(trackEventSpy).toHaveBeenCalledWith(
          'open_calculator',
          expect.objectContaining({
            calculator_type: 'corporate_tax_simulator',
            surface: 'guide_top_quick_bar',
            trigger: 'guide_top_quick_bar_corporate_tax',
            guide_slug: slug,
          })
        );
        expect(window.__dviewPendingRelocationSim).toEqual({
          purchasePriceManwon: 30000,
          existingLocation: 'overconcentrated',
        });

        unmount();
      }
    });

    it('handles boundary/edge cases: emphasizes corporate tax on B2B relocation guide, clamps NaN/oversized prices, and cleans up retry timers on unmount', async () => {
      // 1) B2B corporate relocation guide emphasizes corporate tax CTA first
      const B2bGuideJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: 'dongtan-technovalley-corporate-relocation-tax' }),
      });
      const { unmount: unmountB2b } = render(B2bGuideJsx);
      const b2bQuickBar = screen.getByTestId('top-landing-calculator-quick-bar');
      const corpBtn = within(b2bQuickBar).getByTestId('top-calc-quick-corporate-tax-btn');
      expect(corpBtn.className).toContain('bg-emerald-600');
      unmountB2b();

      // 2) Boundary price clamping (NaN -> 30000, negative -> 30000, huge -> 500000) + missing #tax-simulator retry cleanup
      jest.useFakeTimers();
      const { unmount: unmountEdge } = render(
        <TopLandingCalculatorQuickBar
          variant="technovalley"
          surface="technovalley_top_quick_bar"
          targetName="   "
          benchmarkPriceManwon={Number.NaN}
        />
      );
      fireEvent.click(screen.getByTestId('top-calc-quick-corporate-tax-btn'));
      expect(trackEventSpy).toHaveBeenLastCalledWith(
        'open_calculator',
        expect.objectContaining({
          calculator_type: 'corporate_tax_simulator',
          apartment_name: '동탄테크노밸리',
          purchase_price_manwon: 30000,
        })
      );
      unmountEdge();
      jest.advanceTimersByTime(5000);

      // 3) Guide variant fallback when #guide-top-finance-bridge is absent from DOM
      const { unmount: unmountFallback } = render(
        <TopLandingCalculatorQuickBar
          variant="guide"
          surface="guide_top_quick_bar"
          guideSlug="dongtan-budget-tier-ranking"
          targetName="힐스테이트동탄"
          canonicalSlug="힐스테이트동탄"
          benchmarkPriceManwon={95000}
          inlineBridgeTargetId="nonexistent-bridge-id"
        />
      );
      fireEvent.click(screen.getByTestId('top-calc-quick-mortgage-btn'));
      expect(consumePendingCalculatorContext()).toMatchObject({
        aptName: '힐스테이트동탄',
        canonicalSlug: '힐스테이트동탄',
        priceManwon: 95000,
        alreadyTrackedOpen: true,
      });
      unmountFallback();

      // 4) InlineMortgageDsrBridge ignores drawer events targeting a different bridgeId
      const { unmount: unmountBridge } = render(
        <InlineMortgageDsrBridge
          apartmentName="동탄역롯데캐슬"
          benchmarkPriceManwon={150000}
          surface="guide_mid_conversion"
          trigger="mid_tier"
          bridgeId="mid-bridge-2"
        />
      );
      window.dispatchEvent(
        new CustomEvent('dview:open_inline_finance_drawer', {
          detail: { targetId: 'guide-top-finance-bridge', tab: 'mortgage', alreadyTrackedOpen: true },
        })
      );
      expect(screen.queryByTestId('inline-precision-calc-drawer')).toBeNull();
      unmountBridge();
    });
  });

  describe('Track 2: GA4 search_query / search_term (not set) Coalescing', () => {
    it('builds dual searchTerm + customEvent:search_term query plan and recovers all 4 live pre-registration production search queries', () => {
      const dims = buildSearchQueryReportDimensions([
        { apiName: 'customEvent:search_term' },
        { apiName: 'searchTerm' },
        { apiName: 'customEvent:surface' },
      ]);
      expect(dims).toEqual(['customEvent:search_term', 'searchTerm', 'customEvent:surface']);
      expect(buildSearchQueryReportDimensions([{ apiName: 'searchTerm' }])).toEqual(['searchTerm']);
      expect(buildSearchQueryReportDimensions([])).toEqual([]);

      // Exact live production GA4 rows from 2026-11-05 ~ 2026-11-13 before customEvent:search_term registration
      const liveHistoricalRows = [
        {
          'customEvent:search_term': '(not set)',
          searchTerm: '하우스디',
          'customEvent:surface': '(not set)',
          eventCount: 1,
          totalUsers: 1,
        },
        {
          'customEvent:search_term': '(not set)',
          searchTerm: '베라체',
          'customEvent:surface': '(not set)',
          eventCount: 1,
          totalUsers: 1,
        },
        {
          'customEvent:search_term': '(not set)',
          searchTerm: '벽적골',
          'customEvent:surface': '(not set)',
          eventCount: 1,
          totalUsers: 1,
        },
        {
          'customEvent:search_term': '(not set)',
          searchTerm: '영통역',
          'customEvent:surface': '(not set)',
          eventCount: 1,
          totalUsers: 1,
        },
      ];

      const coalesced = coalesceSearchQueryRows(liveHistoricalRows);
      expect(coalesced.totalEvents).toBe(4);
      expect(coalesced.recoveredFromBuiltInEvents).toBe(4);
      expect(coalesced.unresolvedNotSetEvents).toBe(0);
      expect(coalesced.rows.map((r) => r.search_term).sort()).toEqual(
        ['베라체', '벽적골', '영통역', '하우스디'].sort()
      );
      for (const row of coalesced.rows) {
        expect(row.termSource).toBe('built_in_searchTerm');
        expect(row.search_term).not.toBe('(not set)');
      }
    });

    it('merges pre-sync and post-sync rows for the same search term and guards empty/invalid/unresolved rows', () => {
      const merged = coalesceSearchQueryRows([
        {
          'customEvent:search_term': '(not set)',
          searchTerm: '동탄역 롯데캐슬',
          'customEvent:surface': 'explore_catalog',
          eventCount: 2,
          totalUsers: 2,
        },
        {
          'customEvent:search_term': '동탄역 롯데캐슬',
          searchTerm: '동탄역 롯데캐슬',
          'customEvent:surface': 'explore_catalog',
          eventCount: 3,
          totalUsers: 2,
        },
        {
          'customEvent:search_term': '(not set)',
          searchTerm: '   ',
          'customEvent:surface': '(not set)',
          eventCount: 1,
          totalUsers: 1,
        },
        {
          'customEvent:search_term': '(other)',
          searchTerm: '시범한빛',
          'customEvent:surface': 'dashboard_chart',
          eventCount: 2,
          totalUsers: 1,
        },
        {
          'customEvent:search_term': '(not provided)',
          searchTerm: '(not set)',
          'customEvent:surface': 'dashboard_chart',
          eventCount: 0,
          totalUsers: 0,
        },
      ]);

      expect(merged.totalEvents).toBe(8);
      expect(merged.recoveredFromBuiltInEvents).toBe(4);
      expect(merged.unresolvedNotSetEvents).toBe(1);
      expect(merged.rows).toHaveLength(3);
      expect(merged.rows[0]).toMatchObject({
        search_term: '동탄역 롯데캐슬',
        surface: 'explore_catalog',
        eventCount: 5,
        totalUsers: 4,
        termSource: 'custom_dimension',
      });
      expect(merged.rows[1]).toMatchObject({
        search_term: '시범한빛',
        surface: 'dashboard_chart',
        eventCount: 2,
        termSource: 'built_in_searchTerm',
      });
      expect(merged.rows[2]).toMatchObject({
        search_term: '(not set)',
        surface: '(not set)',
        eventCount: 1,
        termSource: 'not_set',
      });

      expect(coalesceSearchQueryRows([])).toEqual({
        rows: [],
        totalEvents: 0,
        recoveredFromBuiltInEvents: 0,
        unresolvedNotSetEvents: 0,
      });
    });
  });

  describe('Track 3: Naver Search Advisor Crawl, Single Verification Meta & Full-Route RSS Autodiscovery', () => {
    it('emits exactly 1 naver-site-verification declaration in layout.tsx and preserves RSS autodiscovery across /, /technovalley, /explore, /stats, /zone/[id], and /apartment/[aptName]', async () => {
      const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
      const layoutSource = fs.readFileSync(layoutPath, 'utf-8');
      const verificationMatches = layoutSource.match(/naver-site-verification/g) || [];
      expect(verificationMatches).toHaveLength(1);

      expect(homeMetadata.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      expect(exploreMetadata.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      expect(statsMetadata.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      expect(aboutMetadata.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      expect(contactMetadata.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      expect(termsMetadata.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      expect(privacyMetadata.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      expect(overviewMetadata.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );

      const jisanList = await getTechnoValleyJisanList();
      const tvHubMeta = buildTechnoValleySeoMetadata(jisanList, undefined, 'https://dongtanview.com');
      expect(tvHubMeta.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      const tvDetailMeta = buildTechnoValleySeoMetadata(
        jisanList,
        jisanList[0].name,
        'https://dongtanview.com'
      );
      expect(tvDetailMeta.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );

      const zonePageMeta = await generateZonePageMetadata({
        params: Promise.resolve({ id: 'gbcx' }),
      });
      const zoneLayoutMeta = await generateZoneLayoutMetadata({
        params: Promise.resolve({ id: 'gbcx' }),
        children: null,
      });
      expect(zonePageMeta.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      expect(zoneLayoutMeta.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );

      const aptMeta = await buildApartmentSeoMetadata('동탄역롯데캐슬');
      expect(aptMeta.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
      const defaultAptMeta = getDefaultApartmentMetadata('https://dongtanview.com', '동탄역롯데캐슬');
      expect(defaultAptMeta.alternates?.types?.['application/rss+xml']).toBe(
        'https://dongtanview.com/feed.xml'
      );
    });

    it('passes live Naver Search Advisor audit 6/6 and catches duplicate verification meta & missing home/technovalley RSS links', async () => {
      const liveReport = await collectAndAuditNaverSeoReadiness(process.cwd());
      expect(liveReport.passed).toBe(true);
      expect(liveReport.passedCount).toBe(6);

      const failingReport = runNaverSearchAdvisorAudit({
        baseUrl: 'https://dongtanview.com',
        now: new Date('2026-11-19T10:00:00Z'),
        rootVerificationToken: 'e0240efa3f3f36785b2ca54faa765e9058f3707a',
        verificationTagCount: 2,
        rssAutodiscovery: {
          rootLayout: true,
          homePage: false,
          technovalley: false,
          explore: true,
          stats: true,
          about: false,
          contact: true,
          terms: true,
          privacy: true,
          guideIndex: true,
          guideDetail: true,
        },
        robotsConfig: {
          rules: [{ userAgent: ['Yeti', 'Daumoa', 'Googlebot', 'GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'], allow: '/' }],
          sitemap: 'https://dongtanview.com/sitemap.xml',
        },
        sitemapEntries: [],
        feedXml: '',
        rssXml: '',
        guides: GUIDE_ARTICLES.slice(0, 1),
        guideJsonLds: [],
      });

      const verifyCheck = failingReport.checks.find((c) => c.id === 'naver_site_verification')!;
      expect(verifyCheck.passed).toBe(false);
      expect(verifyCheck.issues.some((m) => m.includes('중복 선언'))).toBe(true);

      const rssDiscoveryCheck = failingReport.checks.find(
        (c) => c.id === 'rss_autodiscovery_links'
      )!;
      expect(rssDiscoveryCheck.passed).toBe(false);
      expect(rssDiscoveryCheck.issues.some((m) => m.includes('src/app/page.tsx'))).toBe(true);
      expect(rssDiscoveryCheck.issues.some((m) => m.includes('/technovalley'))).toBe(true);
      expect(rssDiscoveryCheck.issues.some((m) => m.includes('/about/page.tsx'))).toBe(true);
    });
  });
});
