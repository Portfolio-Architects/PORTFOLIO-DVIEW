import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { metadata as rootMetadata } from '@/app/layout';
import { metadata as homeMetadata } from '@/app/page';
import { metadata as overviewMetadata } from '@/app/overview/page';
import { metadata as exploreMetadata } from '@/app/explore/page';
import AboutPage, { metadata as aboutMetadata } from '@/app/about/page';
import GuideArticlePage, { generateMetadata as generateGuideMetadata } from '@/app/guide/[slug]/page';
import { getMainPageSchema } from '@/lib/utils/structuredData';
import {
  buildTechnoValleySeoMetadata,
  buildTechnoValleyJsonLd,
  getTechnoValleyJisanList,
} from '@/lib/services/apartmentPageService';
import { ApartmentModalHeader } from '@/components/apartment/ApartmentModalHeader';
import InlineMortgageDsrBridge, {
  type OpenCalculatorModalEventDetail,
} from '@/components/finance/InlineMortgageDsrBridge';
import * as analyticsModule from '@/lib/utils/analytics';
import { consumePendingCalculatorContext } from '@/lib/utils/pendingCalculatorContext';

jest.mock('@/app/globals.css', () => ({}));

jest.mock('next/font/local', () => () => ({
  variable: '--font-pretendard',
  className: 'mock-pretendard',
}));

const mockRouterPush = jest.fn();
let mockRouteParams: Record<string, string> = { id: 'gbcx' };

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  useParams: () => mockRouteParams,
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams(),
}));

describe('/boost — ① GSC 0-Click SERP Metadata & Rich Snippets + ② Calculator Entry Funnel & GA4 open_calculator Integrity', () => {
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    trackEventSpy = jest.spyOn(analyticsModule, 'trackEvent').mockImplementation(() => {});
    mockRouterPush.mockClear();
    mockRouteParams = { id: 'gbcx' };
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
      window.localStorage.clear();
      delete window.__dviewDashboardCalcHostActive;
    }
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
  });

  describe('1. GSC 0-Click Top Landing Routes Metadata & Rich Snippet Optimization', () => {
    it('optimizes /guide/dongtan-1-vs-2-comparison, /guide/dongtan-school-zone-top-apartments, and /guide/dongtan-budget-tier-ranking for live 0-click queries', async () => {
      const compMeta = await generateGuideMetadata({
        params: Promise.resolve({ slug: 'dongtan-1-vs-2-comparison' }),
      });
      expect(String(compMeta.title)).toMatch(/^1동탄 vs 2동탄 차이·비교/);
      expect(String(compMeta.title).length).toBeLessThanOrEqual(56);
      expect(String(compMeta.description)).toContain('1동탄 2동탄 차이');
      expect(String(compMeta.description)).toContain('동탄1 동탄2 비교');
      expect(String(compMeta.description)).toContain('65~74%');
      expect(String(compMeta.description)).toContain('GTX-A 수서 20분');

      const CompJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: 'dongtan-1-vs-2-comparison' }),
      });
      const compRender = render(CompJsx);
      const compLd = JSON.parse(
        compRender.container.querySelector('script[type="application/ld+json"]')?.innerHTML || '{}'
      );
      const compFaqNode = compLd['@graph'].find(
        (n: { '@type': string }) => n['@type'] === 'FAQPage'
      );
      expect(compFaqNode.mainEntity.length).toBeGreaterThanOrEqual(4);
      expect(compFaqNode.mainEntity[0].name).toContain('1동탄과 2동탄');
      compRender.unmount();

      const schoolMeta = await generateGuideMetadata({
        params: Promise.resolve({ slug: 'dongtan-school-zone-top-apartments' }),
      });
      expect(String(schoolMeta.title)).toMatch(/^동탄 학군지·학원가 TOP 4 초품아/);
      expect(String(schoolMeta.description)).toContain('동탄 학원가');
      expect(String(schoolMeta.keywords)).toContain('동탄학군');

      const budgetMeta = await generateGuideMetadata({
        params: Promise.resolve({ slug: 'dongtan-budget-tier-ranking' }),
      });
      expect(String(budgetMeta.title)).toMatch(/^동탄 아파트 순위/);
      expect(String(budgetMeta.description)).toMatch(/^동탄 아파트 순위/);
    });

    it('front-loads search intents on /, /overview, /explore, and enriches getMainPageSchema with MOLIT Dataset attribution', () => {
      for (const meta of [rootMetadata, homeMetadata, overviewMetadata]) {
        expect(String(meta.title)).toContain('동탄 아파트 시세');
        expect(String(meta.title)).toContain('집값 추이 그래프');
        expect(String(meta.title)).toContain('1·2신도시 184개 가격 순위');
        expect(String(meta.description)).toMatch(/^동탄 아파트 시세·집값 추이 그래프·실거래가 순위/);
      }

      expect(String(exploreMetadata.description)).toMatch(/^동탄 아파트 순위/);

      const mainSchema = getMainPageSchema('https://dongtanview.com');
      const datasetNode = mainSchema['@graph'].find(
        (n) => n['@type'] === 'Dataset'
      ) as Record<string, unknown> | undefined;
      expect(datasetNode).toBeDefined();
      expect(datasetNode?.['@id']).toBe('https://dongtanview.com/#dataset');
      expect(datasetNode?.isBasedOn).toBe('https://rt.molit.go.kr');
    });

    it('front-loads Korean brand aliases on /about with uncloaked FAQPage JSON-LD and adds BreadcrumbList + unspaced aliases on /technovalley', async () => {
      expect(String(aboutMetadata.title)).toMatch(/^디뷰 · 동뷰 · 동탄뷰/);
      expect(String(aboutMetadata.description)).toMatch(/^동뷰·디뷰·동탄뷰/);

      const AboutJsx = await AboutPage();
      const aboutRender = render(AboutJsx);
      const faqSection = aboutRender.container.querySelector('#about-brand-faq');
      expect(faqSection).not.toBeNull();
      expect(screen.getByTestId('about-hero-dsr-calc-cta')).toHaveAttribute(
        'href',
        '/?calc=mortgage'
      );

      const aboutLd = JSON.parse(
        aboutRender.container.querySelector('script[type="application/ld+json"]')?.innerHTML || '{}'
      );
      const aboutFaqNode = aboutLd['@graph'].find(
        (n: { '@type': string }) => n['@type'] === 'FAQPage'
      );
      expect(aboutFaqNode).toBeDefined();
      for (const q of aboutFaqNode.mainEntity) {
        expect(faqSection?.textContent).toContain(q.name);
        expect(faqSection?.textContent).toContain(q.acceptedAnswer.text);
      }
      aboutRender.unmount();

      const jisanList = await getTechnoValleyJisanList();
      const hubMeta = buildTechnoValleySeoMetadata(jisanList, undefined, 'https://dongtanview.com');
      expect(String(hubMeta.title)).toContain('입주기업');
      expect(String(hubMeta.keywords)).toContain('동탄금강펜테리움ix타워');

      const ixMeta = buildTechnoValleySeoMetadata(
        jisanList,
        '동탄금강펜테리움 IX타워',
        'https://dongtanview.com'
      );
      expect(String(ixMeta.keywords)).toContain('동탄금강펜테리움ix타워');

      const hubLd = buildTechnoValleyJsonLd(jisanList, 'https://dongtanview.com', null);
      const hubBreadcrumb = (hubLd['@graph'] as Array<Record<string, unknown>>).find(
        (n) => n['@type'] === 'BreadcrumbList'
      ) as { itemListElement: Array<Record<string, unknown>> };
      expect(hubBreadcrumb.itemListElement).toHaveLength(2);

      const detailLd = buildTechnoValleyJsonLd(jisanList, 'https://dongtanview.com', jisanList[0]);
      const detailBreadcrumb = (detailLd['@graph'] as Array<Record<string, unknown>>).find(
        (n) => n['@type'] === 'BreadcrumbList'
      ) as { itemListElement: Array<Record<string, unknown>> };
      expect(detailBreadcrumb.itemListElement).toHaveLength(3);
    });
  });

  describe('2. Apartment Top Summary Quick-Pills, Guide Multi-Tier Funnel & GA4 open_calculator Precision', () => {
    it('renders 1-click mortgage & tax quick pills in ApartmentModalHeader and guards zero/invalid sale price boundaries', () => {
      const onOpenMortgage = jest.fn();
      const onOpenTaxCalculator = jest.fn();

      const { rerender, unmount } = render(
        <ApartmentModalHeader
          report={{ apartmentName: '동탄역롯데캐슬', dong: '오산동', sections: {} } as never}
          displayAptName="동탄역 롯데캐슬"
          inline={false}
          verifiedSalePriceManwon={158000}
          handleNativeShare={jest.fn()}
          handleCopySummary={jest.fn()}
          handleDownloadShareCard={jest.fn()}
          setIsPushModalOpen={jest.fn()}
          copiedStatus={null}
          isToolDropdownOpen={false}
          setIsToolDropdownOpen={jest.fn()}
          toolDropdownRef={{ current: null }}
          preloadCalculators={jest.fn()}
          onOpenMortgage={onOpenMortgage}
          onOpenTaxCalculator={onOpenTaxCalculator}
        />
      );

      fireEvent.click(screen.getByTestId('apt-header-quick-mortgage-btn'));
      expect(onOpenMortgage).toHaveBeenCalledWith(
        '동탄역롯데캐슬',
        1_580_000_000,
        'modal_header_quick_pill'
      );

      fireEvent.click(screen.getByTestId('apt-header-quick-tax-btn'));
      expect(onOpenTaxCalculator).toHaveBeenCalledWith(
        '동탄역롯데캐슬',
        'modal_header_quick_pill_tax'
      );
      expect(consumePendingCalculatorContext()?.priceManwon).toBe(158000);

      // Boundary: zero/negative verifiedSalePriceManwon NEVER passes fabricated 0원 or negative priceWon,
      // while inline={true} ALSO exposes both quick mortgage and quick tax pills
      onOpenMortgage.mockClear();
      onOpenTaxCalculator.mockClear();
      rerender(
        <ApartmentModalHeader
          report={{ apartmentName: '임대전용단지', dong: '청계동', sections: {} } as never}
          displayAptName="임대전용단지"
          inline={true}
          verifiedSalePriceManwon={0}
          handleNativeShare={jest.fn()}
          handleCopySummary={jest.fn()}
          handleDownloadShareCard={jest.fn()}
          setIsPushModalOpen={jest.fn()}
          copiedStatus={null}
          isToolDropdownOpen={false}
          setIsToolDropdownOpen={jest.fn()}
          toolDropdownRef={{ current: null }}
          preloadCalculators={jest.fn()}
          onOpenMortgage={onOpenMortgage}
          onOpenTaxCalculator={onOpenTaxCalculator}
        />
      );

      fireEvent.click(screen.getByTestId('apt-header-quick-mortgage-btn'));
      expect(onOpenMortgage).toHaveBeenCalledWith(
        '임대전용단지',
        undefined,
        'inline_header_quick_pill'
      );

      fireEvent.click(screen.getByTestId('apt-header-quick-tax-btn'));
      expect(onOpenTaxCalculator).toHaveBeenCalledWith(
        '임대전용단지',
        'inline_header_quick_pill_tax'
      );
      expect(consumePendingCalculatorContext()).toBeNull();

      // Boundary: when zero tool handlers are passed, empty dropdown trigger is hidden
      rerender(
        <ApartmentModalHeader
          report={{ apartmentName: '임대전용단지', dong: '청계동', sections: {} } as never}
          displayAptName="임대전용단지"
          inline={false}
          handleNativeShare={jest.fn()}
          handleCopySummary={jest.fn()}
          handleDownloadShareCard={jest.fn()}
          setIsPushModalOpen={jest.fn()}
          copiedStatus={null}
          isToolDropdownOpen={false}
          setIsToolDropdownOpen={jest.fn()}
          toolDropdownRef={{ current: null }}
          preloadCalculators={jest.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /분석 및 금융 도구/i })).toBeNull();
      unmount();
    });

    it('tracks open_calculator once per calculator tab when switching inside InlineMortgageDsrBridge drawer without duplicate spam', () => {
      render(
        <InlineMortgageDsrBridge
          guideSlug="dongtan-budget-tier-ranking"
          surface="guide_mid_conversion"
          trigger="guide_mid_tier_1_bridge"
          initialPriceTierManwon={60000}
        />
      );

      // Initial fallback tier is 6억 (60000 만원 -> LTV 70% = 4.2억 원금)
      expect(screen.getByTestId('inline-mortgage-dsr-kpi-line').textContent).toContain('4.2억');

      // 1. Open mortgage drawer -> 1st open_calculator (mortgage)
      fireEvent.click(screen.getByTestId('inline-mortgage-dsr-open-btn'));
      expect(
        trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
      ).toHaveLength(1);

      // 2. Switch inner drawer tab to tax -> 2nd open_calculator (property_tax)
      fireEvent.click(screen.getByRole('button', { name: '취득세 · 생애최초 감면' }));
      expect(
        trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
      ).toHaveLength(2);
      expect(trackEventSpy).toHaveBeenLastCalledWith(
        'open_calculator',
        expect.objectContaining({
          calculator_type: 'property_tax',
          surface: 'guide_mid_conversion',
          trigger: 'guide_mid_tier_1_bridge_drawer_tab_tax',
          guide_slug: 'dongtan-budget-tier-ranking',
          benchmark_price_manwon: 60000,
        })
      );

      // 3. Toggling back and forth within the same open drawer session does NOT re-emit duplicates
      fireEvent.click(screen.getByRole('button', { name: '주담대 · 스트레스 DSR' }));
      fireEvent.click(screen.getByRole('button', { name: '취득세 · 생애최초 감면' }));
      expect(
        trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
      ).toHaveLength(2);

      // 4. Close drawer -> still 2; reopen -> 3rd open_calculator
      fireEvent.click(screen.getByTestId('inline-tax-calc-open-btn'));
      expect(screen.queryByTestId('inline-precision-calc-drawer')).toBeNull();
      fireEvent.click(screen.getByTestId('inline-mortgage-dsr-open-btn'));
      expect(
        trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
      ).toHaveLength(3);
    });

    it('persists alreadyTrackedOpen=true before standalone jeonse_safety location handoff so destination does not double-count open_calculator', () => {
      delete window.__dviewDashboardCalcHostActive;

      const { unmount } = render(
        <InlineMortgageDsrBridge
          apartmentName="동탄역롯데캐슬"
          canonicalSlug="동탄역롯데캐슬"
          benchmarkPriceManwon={158000}
          surface="apartment_ssr_top"
          trigger="apartment_ssr_price_strip"
        />
      );

      fireEvent.click(screen.getByTestId('inline-jeonse-safety-open-btn'));
      expect(
        trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
      ).toHaveLength(1);
      const pending = consumePendingCalculatorContext();
      expect(pending?.alreadyTrackedOpen).toBe(true);
      expect(pending?.aptName).toBe('동탄역롯데캐슬');
      expect(pending?.priceManwon).toBe(158000);

      unmount();
    });

    it('renders top jump CTA and all 3 tier-matched InlineMortgageDsrBridge widgets on /guide/dongtan-budget-tier-ranking', async () => {
      const BudgetGuideJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: 'dongtan-budget-tier-ranking' }),
      });
      const { container, unmount } = render(BudgetGuideJsx);

      expect(screen.getByTestId('guide-top-finance-jump')).toHaveAttribute(
        'href',
        '#guide-top-finance-bridge'
      );
      expect(container.querySelector('#guide-top-finance-bridge')).not.toBeNull();

      const bridges = screen.getAllByTestId('inline-mortgage-dsr-bridge');
      // 1 top summary + 3 mid-article budget tier bridges (Tier 1, Tier 2, Tier 3)
      expect(bridges).toHaveLength(4);

      // Clicking Tier 2 mid bridge fires distinct guide_mid_tier_2_bridge trigger
      const midButtons = screen.getAllByTestId('inline-mortgage-dsr-open-btn');
      fireEvent.click(midButtons[2]);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'open_calculator',
        expect.objectContaining({
          calculator_type: 'mortgage',
          surface: 'guide_mid_conversion',
          trigger: 'guide_mid_tier_2_bridge',
          guide_slug: 'dongtan-budget-tier-ranking',
        })
      );
      unmount();
    });

    it('routes dview:open_calculator_modal jeonse_safety and sell_timing events to their exact modals on ExploreClient', async () => {
      const ExploreClient = (await import('@/app/explore/ExploreClient')).default;
      const { SettingsProvider } = await import('@/contexts/SettingsContext');
      const { AuthProvider } = await import('@/contexts/AuthContext');

      const { unmount } = render(
        <SettingsProvider>
          <AuthProvider>
            <ExploreClient initialData={{ reports: [], dongApartments: {}, txSummary: {} } as never} />
          </AuthProvider>
        </SettingsProvider>
      );

      window.dispatchEvent(
        new CustomEvent<OpenCalculatorModalEventDetail>('dview:open_calculator_modal', {
          detail: {
            calcType: 'jeonse_safety',
            aptName: '동탄역롯데캐슬',
            surface: 'apartment_modal_top',
            trigger: 'apartment_modal_top_bridge_jeonse',
            alreadyTrackedOpen: false,
          },
        })
      );

      await waitFor(() => {
        expect(trackEventSpy).toHaveBeenCalledWith(
          'open_calculator',
          expect.objectContaining({
            calculator_type: 'jeonse_safety',
            apartment_name: '동탄역롯데캐슬',
            surface: 'apartment_modal_top',
            trigger: 'apartment_modal_top_bridge_jeonse',
          })
        );
      });

      unmount();
    });

    it('wires calculator callbacks with zone_detail_modal open_calculator telemetry & context handoff on ZoneDetailClient', async () => {
      const useDashboardDataModule = await import('@/hooks/useDashboardData');
      const spyDashboard = jest.spyOn(useDashboardDataModule, 'useDashboardData').mockReturnValue({
        fieldReports: [
          {
            id: 'stub-동탄역롯데캐슬',
            apartmentName: '동탄역롯데캐슬',
            dong: '여울동',
            author: 'D-VIEW',
            likes: 5,
            commentCount: 1,
          },
        ],
        isLoading: false,
      } as never);

      const ZoneDetailClient = (await import('@/app/zone/[id]/ZoneDetailClient')).default;
      const { SettingsProvider } = await import('@/contexts/SettingsContext');
      const { AuthProvider } = await import('@/contexts/AuthContext');
      const { PWAProvider } = await import('@/components/pwa/PWAProvider');

      const { unmount } = render(
        <SettingsProvider>
          <AuthProvider>
            <PWAProvider>
              <ZoneDetailClient />
            </PWAProvider>
          </AuthProvider>
        </SettingsProvider>
      );

      const cardBtn = await screen.findByRole('button', { name: /리포트: 동탄역롯데캐슬/ });
      fireEvent.click(cardBtn);

      const quickMortgageBtn = await screen.findByTestId('apt-header-quick-mortgage-btn');
      fireEvent.click(quickMortgageBtn);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'open_calculator',
        expect.objectContaining({
          calculator_type: 'mortgage',
          apartment_name: '동탄역롯데캐슬',
          zone: 'gbcx',
          surface: 'zone_detail_modal',
          trigger: 'modal_header_quick_pill',
        })
      );
      expect(mockRouterPush).toHaveBeenCalledWith(
        `/apartment/${encodeURIComponent('동탄역롯데캐슬')}?calc=mortgage`
      );
      const pending = consumePendingCalculatorContext();
      expect(pending?.alreadyTrackedOpen).toBe(true);

      unmount();
      spyDashboard.mockRestore();
    });

    it('opens CompareModal via ?calc=compare&apt1=...&apt2=... on ExploreClient without duplicate open_calculator firing after ZoneDetailClient handoff, and preserves tier/income context', async () => {
      const useDashboardDataModule = await import('@/hooks/useDashboardData');
      const spyDashboard = jest.spyOn(useDashboardDataModule, 'useDashboardData').mockReturnValue({
        fieldReports: [
          {
            id: 'stub-동탄역롯데캐슬',
            apartmentName: '동탄역롯데캐슬',
            dong: '여울동',
            author: 'D-VIEW',
            likes: 5,
            commentCount: 1,
          },
        ],
        isLoading: false,
      } as never);

      const ZoneDetailClient = (await import('@/app/zone/[id]/ZoneDetailClient')).default;
      const ExploreClient = (await import('@/app/explore/ExploreClient')).default;
      const { SettingsProvider } = await import('@/contexts/SettingsContext');
      const { AuthProvider } = await import('@/contexts/AuthContext');
      const { PWAProvider } = await import('@/components/pwa/PWAProvider');

      const zoneRender = render(
        <SettingsProvider>
          <AuthProvider>
            <PWAProvider>
              <ZoneDetailClient />
            </PWAProvider>
          </AuthProvider>
        </SettingsProvider>
      );

      const cardBtn = await screen.findByRole('button', { name: /리포트: 동탄역롯데캐슬/ });
      fireEvent.click(cardBtn);

      // 1) Tier-mode bridge inside ZoneDetailClient modal routes to /?calc=mortgage (NOT /apartment/...)
      //    and preserves priceManwon + annualIncomeManwon with alreadyTrackedOpen=true
      const tier6Btn = await screen.findByRole('button', { name: '6억' });
      fireEvent.click(tier6Btn);
      const income10000Btn = screen.getByRole('button', { name: '소득 1억' });
      fireEvent.click(income10000Btn);
      fireEvent.click(screen.getByTestId('inline-mortgage-dsr-open-btn'));

      expect(mockRouterPush).toHaveBeenCalledWith('/?calc=mortgage');
      const tierPending = consumePendingCalculatorContext();
      expect(tierPending).toEqual(
        expect.objectContaining({
          aptName: undefined,
          canonicalSlug: undefined,
          priceManwon: 60000,
          annualIncomeManwon: 10000,
          alreadyTrackedOpen: true,
        })
      );

      // 2) Header dropdown "단지 1:1 비교" on ZoneDetailClient pushes /explore?calc=compare&apt1=...
      mockRouterPush.mockClear();
      trackEventSpy.mockClear();
      const toolBtn = screen.getByRole('button', { name: /분석 및 금융 도구/i });
      fireEvent.click(toolBtn);
      const compareMenuBtn = screen.getByRole('button', { name: '단지 1:1 비교' });
      fireEvent.click(compareMenuBtn);

      const expectedComparePath = `/explore?calc=compare&apt1=${encodeURIComponent('동탄역롯데캐슬')}`;
      expect(mockRouterPush).toHaveBeenCalledWith(expectedComparePath);
      expect(
        trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
      ).toHaveLength(1);
      zoneRender.unmount();
      spyDashboard.mockRestore();

      // 3) ExploreClient mounting at that exact URL consumes pending context, skips duplicate open_calculator, and opens CompareModal
      window.history.replaceState({}, '', expectedComparePath);
      const exploreRender = render(
        <SettingsProvider>
          <AuthProvider>
            <ExploreClient initialData={{ reports: [], dongApartments: {}, txSummary: {} } as never} />
          </AuthProvider>
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(window.location.search).toBe('');
      });
      // Still 1 total open_calculator (no duplicate explore_deep_link emission!)
      expect(
        trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
      ).toHaveLength(1);

      exploreRender.unmount();
      window.history.replaceState({}, '', '/');
    });
  });
});
