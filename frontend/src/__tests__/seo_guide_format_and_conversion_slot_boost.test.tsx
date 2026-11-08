/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import GuideIndexPage from '@/app/guide/page';
import GuideDetailPage, { renderGuideBodyContent } from '@/app/guide/[slug]/page';
import TechnoValleyPage from '@/app/technovalley/page';
import TechnoValleyDetailPage from '@/app/technovalley/[slug]/page';
import GuideAptPreviewCard from '@/components/guide/GuideAptPreviewCard';
import * as analyticsUtils from '@/lib/utils/analytics';
import {
  GUIDE_ARTICLES,
  buildGuideAptMiniPreview,
  resolveGuideZoneSectionPreviews,
  TOP_ACQUISITION_ENTRY_ROUTES,
  HIGH_CONVERSION_FLAGSHIP_APARTMENTS,
  TECHNOVALLEY_COMMUTER_PREVIEW_APARTMENTS,
  type GuideAptMiniPreviewItem,
} from '@/lib/data/guides';
import {
  getTechnoValleyJisanList,
  formatTechnoValleyJisanSlug,
  getTxSummaryData,
} from '@/lib/services/apartmentPageService';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/guide',
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

jest.mock('@/app/technovalley/TechnoValleyClient', () => {
  return function MockTechnoValleyClient() {
    return <div data-testid="mock-technovalley-client">TechnoValleyClient</div>;
  };
});

jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: function MockAdSlot({
    refreshSlotId,
    minHeightClass,
    cpaCampaignId,
  }: {
    refreshSlotId: string;
    minHeightClass?: string;
    cpaCampaignId?: string;
  }) {
    return (
      <div
        data-testid={`mock-adslot-${refreshSlotId}`}
        data-min-height={minHeightClass}
        data-campaign={cpaCampaignId}
      />
    );
  },
}));

describe('High-Efficiency SEO Guide Format Expansion & Top/Mid Conversion Slot Boost', () => {
  const originalApprovalMode = process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE;

  afterEach(() => {
    if (originalApprovalMode === undefined) {
      delete process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE;
    } else {
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = originalApprovalMode;
    }
  });

  describe('1. Acquisition Channel Metadata & Dual-Inflow Guide (dongtan-indeogwon-line-station-impact-analysis) Enrichment', () => {
    it('defines TOP_ACQUISITION_ENTRY_ROUTES, HIGH_CONVERSION_FLAGSHIP_APARTMENTS, and TECHNOVALLEY_COMMUTER_PREVIEW_APARTMENTS backed by 100% real MOLIT transaction data', () => {
      expect(TOP_ACQUISITION_ENTRY_ROUTES).toHaveLength(3);
      expect(TOP_ACQUISITION_ENTRY_ROUTES.map((r) => r.href)).toEqual([
        '/guide/dongtan-1-vs-2-comparison',
        '/guide/dongtan-indeogwon-line-station-impact-analysis',
        '/technovalley',
      ]);
      expect(TOP_ACQUISITION_ENTRY_ROUTES.map((r) => r.badge)).toEqual([
        '구글 검색 1위',
        'ChatGPT·구글 동시 유입',
        '최근 7일 급상승',
      ]);

      for (const route of TOP_ACQUISITION_ENTRY_ROUTES) {
        const preview = buildGuideAptMiniPreview(route.highlightAptSlug);
        expect(preview).not.toBeNull();
        expect(preview!.latestPrice).toBeGreaterThan(0);
      }

      expect(HIGH_CONVERSION_FLAGSHIP_APARTMENTS).toContain('동탄더샵레이크에듀타운');
      for (const aptName of HIGH_CONVERSION_FLAGSHIP_APARTMENTS) {
        const preview = buildGuideAptMiniPreview(aptName);
        expect(preview).not.toBeNull();
        expect(preview!.latestPrice).toBeGreaterThan(0);
      }

      expect(TECHNOVALLEY_COMMUTER_PREVIEW_APARTMENTS).toHaveLength(6);
      expect(TECHNOVALLEY_COMMUTER_PREVIEW_APARTMENTS).toContain('동탄더샵레이크에듀타운');
      for (const aptName of TECHNOVALLEY_COMMUTER_PREVIEW_APARTMENTS) {
        const preview = buildGuideAptMiniPreview(aptName);
        expect(preview).not.toBeNull();
        expect(preview!.latestPrice).toBeGreaterThan(0);
      }
    });

    it('enriches dongtan-indeogwon-line-station-impact-analysis with 동탄더샵레이크에듀타운 in Top 4 featuredApartments and 3 zoneSectionPreviews', () => {
      const guide = GUIDE_ARTICLES.find(
        (g) => g.slug === 'dongtan-indeogwon-line-station-impact-analysis'
      );
      expect(guide).toBeDefined();
      expect(guide!.featuredApartments?.slice(0, 4)).toContain('동탄더샵레이크에듀타운');
      expect(guide!.featuredZones).toContain('waterfront');
      expect(guide!.zoneSectionPreviews).toHaveLength(3);

      const resolvedSections = resolveGuideZoneSectionPreviews(guide!, {});
      expect(resolvedSections).toHaveLength(3);
      const thirdSection = resolvedSections[2];
      expect(thirdSection.sectionHeadingMatch).toBe('3. 동탄1·동탄2 역세권 스프레드 축소 전망');
      expect(thirdSection.items.map((item) => item.canonicalSlug)).toEqual([
        '동탄더샵레이크에듀타운',
        '더샵센트럴시티',
        '동탄역롯데캐슬',
      ]);
    });
  });

  describe('2. GuideAptPreviewCard High-Dwell & Flagship Badges + Boundary Resilience', () => {
    it('renders "평균 15분 체류 대장" badge for 동탄더샵레이크에듀타운, "고전환 핵심 대장" for flagship apartments, and no conversion badge for standard apartments', () => {
      const lakeEduItem = buildGuideAptMiniPreview('동탄더샵레이크에듀타운')!;
      const centralCityItem = buildGuideAptMiniPreview('더샵센트럴시티')!;
      const standardItem = buildGuideAptMiniPreview('푸르지오')!;

      const r1 = render(
        <GuideAptPreviewCard
          item={lakeEduItem}
          guideSlug="dongtan-1-vs-2-comparison"
          placement="article_top"
        />
      );
      expect(
        r1.container.querySelector('[data-testid="guide-apt-preview-high-dwell-badge"]')?.textContent
      ).toBe('평균 15분 체류 대장');
      expect(
        r1.container.querySelector('[data-testid="guide-apt-preview-flagship-badge"]')
      ).toBeNull();
      r1.unmount();

      const r2 = render(
        <GuideAptPreviewCard
          item={centralCityItem}
          guideSlug="dongtan-1-vs-2-comparison"
          placement="zone_section"
        />
      );
      expect(
        r2.container.querySelector('[data-testid="guide-apt-preview-flagship-badge"]')?.textContent
      ).toBe('고전환 핵심 대장');
      expect(
        r2.container.querySelector('[data-testid="guide-apt-preview-high-dwell-badge"]')
      ).toBeNull();
      r2.unmount();

      const r3 = render(
        <GuideAptPreviewCard
          item={standardItem}
          guideSlug="dongtan-1-vs-2-comparison"
          placement="article_bottom"
        />
      );
      expect(
        r3.container.querySelector('[data-testid="guide-apt-preview-high-dwell-badge"]')
      ).toBeNull();
      expect(
        r3.container.querySelector('[data-testid="guide-apt-preview-flagship-badge"]')
      ).toBeNull();
      r3.unmount();
    });

    it('gracefully handles empty/zero boundary fields in GuideAptPreviewCard without NaN/undefined leaks and emits normalized safeHref/safeSlug in GA4 click telemetry', () => {
      const trackVirtualSpy = jest.spyOn(analyticsUtils, 'trackVirtualPageView');
      const trackEventSpy = jest.spyOn(analyticsUtils, 'trackEvent');

      const boundaryItem: GuideAptMiniPreviewItem = {
        name: '테스트단지',
        canonicalSlug: '',
        displayName: '테스트단지',
        href: '',
        dong: '반송동',
        zoneId: 'dongtan1',
        zoneName: '동탄1신도시',
        latestPrice: 0,
        latestPriceStr: '실거래 집계중',
        latestRent: 0,
        latestRentStr: '-',
        jeonseRatio: 0,
        perValue: null,
        latestArea: 0,
        latestFloor: 0,
        latestDate: '',
        txCount: 0,
      };

      const { container, unmount } = render(
        <GuideAptPreviewCard
          item={boundaryItem}
          guideSlug="dongtan-1-vs-2-comparison"
          placement="article_top"
          sectionTitle="상단 대장 단지"
        />
      );
      expect(container.textContent).toContain('반송동 · 동탄1신도시');
      expect(container.textContent).toContain('실거래 집계중');
      expect(container.textContent).not.toContain('NaN');
      expect(container.textContent).not.toContain('undefined');
      const link = container.querySelector('a');
      const expectedSafeHref = `/apartment/${encodeURIComponent('테스트단지')}`;
      expect(link?.getAttribute('href')).toBe(expectedSafeHref);
      expect(link?.getAttribute('data-apt-slug')).toBe('테스트단지');

      fireEvent.click(link!);
      expect(trackVirtualSpy).toHaveBeenCalledWith(
        expectedSafeHref,
        expect.objectContaining({
          guide_slug: 'dongtan-1-vs-2-comparison',
          placement: 'article_top',
          apartment_name: '테스트단지',
        })
      );
      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_apt_preview_click',
        expect.objectContaining({
          guide_slug: 'dongtan-1-vs-2-comparison',
          placement: 'article_top',
          section_title: '상단 대장 단지',
          apartment_name: '테스트단지',
          target_path: expectedSafeHref,
        })
      );

      trackVirtualSpy.mockRestore();
      trackEventSpy.mockRestore();
      unmount();
    });
  });

  describe('3. /guide/[slug] Top & Mid Conversion Slots and In-Body Zero-CLS AdSlot', () => {
    it('renders Top Conversion Slot, Mid Conversion Slot, and In-Body AdSlot with dynamically bound real MOLIT prices on Google #1 and ChatGPT·Google dual-inflow guides', async () => {
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
      const txSummary = await getTxSummaryData();
      const lakeEduPreview = buildGuideAptMiniPreview('동탄더샵레이크에듀타운', txSummary)!;
      expect(lakeEduPreview).not.toBeNull();

      for (const slug of [
        'dongtan-1-vs-2-comparison',
        'dongtan-indeogwon-line-station-impact-analysis',
      ]) {
        const jsx = await GuideDetailPage({ params: Promise.resolve({ slug }) });
        const { container, unmount } = render(jsx);

        // Top conversion boost slot
        const topBoostSlot = container.querySelector(
          '[data-testid="guide-top-conversion-boost-slot"]'
        );
        expect(topBoostSlot).not.toBeNull();

        const lakeEduSpotlight = container.querySelector(
          '[data-testid="guide-top-lake-edutown-spotlight"]'
        );
        expect(lakeEduSpotlight).not.toBeNull();
        expect(lakeEduSpotlight?.getAttribute('href')).toBe(lakeEduPreview.href);
        expect(lakeEduSpotlight?.textContent).toContain('15분 체류');
        expect(lakeEduSpotlight?.textContent).toContain(lakeEduPreview.latestPriceStr);

        // Top inflow hub links render all 3 top acquisition entry routes
        const inflowHubLinks = container.querySelector(
          '[data-testid="guide-top-inflow-hub-links"]'
        );
        expect(inflowHubLinks).not.toBeNull();
        const hubAnchors = Array.from(inflowHubLinks!.querySelectorAll('a'));
        expect(hubAnchors.length).toBe(3);
        expect(hubAnchors.map((a) => a.getAttribute('href'))).toEqual([
          '/guide/dongtan-1-vs-2-comparison',
          '/guide/dongtan-indeogwon-line-station-impact-analysis',
          '/technovalley',
        ]);

        // High-dwell badge present in Top 4 preview cards for both guides
        const topQuickJump = container.querySelector('#guide-top-apt-quick-jump');
        expect(
          topQuickJump?.querySelector('[data-testid="guide-apt-preview-high-dwell-badge"]')
        ).not.toBeNull();

        // Mid-article conversion slots inside zone section previews
        const midConversionSlots = container.querySelectorAll(
          '[data-testid="guide-mid-conversion-slot"]'
        );
        expect(midConversionSlots.length).toBeGreaterThanOrEqual(2);
        const midLakeCta = container.querySelector('[data-testid="guide-mid-lake-edutown-cta"]');
        expect(midLakeCta).not.toBeNull();
        expect(midLakeCta?.getAttribute('href')).toBe(lakeEduPreview.href);
        expect(midLakeCta?.textContent).toContain(lakeEduPreview.latestPriceStr);

        // In-body Zero-CLS AdSlot rendered exactly once after first mid-article zone preview
        const inbodyAdSlots = container.querySelectorAll(
          '[data-testid="guide-article-adslot-inbody"]'
        );
        expect(inbodyAdSlots).toHaveLength(1);
        expect(inbodyAdSlots[0].className).toContain('min-h-[250px]');
        expect(inbodyAdSlots[0].className).toContain('empty:hidden');

        // Design system invariants
        expect(container.querySelectorAll('.font-mono')).toHaveLength(0);
        expect(container.querySelectorAll('h1')).toHaveLength(1);

        unmount();
      }
    });

    it('suppresses guide-article-adslot-inbody when NEXT_PUBLIC_ADSENSE_APPROVAL_MODE is true', async () => {
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';

      const jsx = await GuideDetailPage({
        params: Promise.resolve({ slug: 'dongtan-1-vs-2-comparison' }),
      });
      const { container, unmount } = render(jsx);

      expect(container.querySelector('[data-testid="guide-article-adslot-inbody"]')).toBeNull();
      expect(container.querySelector('[data-testid="guide-article-adslot-top"]')).toBeNull();
      expect(container.querySelector('[data-testid="guide-article-adslot-bottom"]')).toBeNull();
      // Conversion slots remain visible for user navigation
      expect(container.querySelector('[data-testid="guide-top-conversion-boost-slot"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="guide-mid-conversion-slot"]')).not.toBeNull();

      unmount();
    });

    it('injects fallback mid-article conversion slot and in-body AdSlot when a guide has 0 matching zoneSectionPreviews headings', () => {
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
      const markdownWithNoZoneMatch = [
        '### 1. 개요 및 시장 배경',
        '동탄 실거래 시장 데이터 분석 본문 첫 번째 단락입니다.',
        '---',
        '### 2. 핵심 체크리스트',
        '동탄 실거래 시장 데이터 분석 본문 두 번째 단락입니다.',
      ].join('\n');

      const nodes = renderGuideBodyContent(markdownWithNoZoneMatch, {
        guideSlug: 'custom-unmatched-guide',
        zoneSectionPreviews: [],
        inlineSlugLookup: new Map(),
      });
      const { container, unmount } = render(<div>{nodes}</div>);

      expect(container.querySelector('[data-testid="guide-mid-conversion-slot"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="guide-mid-lake-edutown-cta"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-testid="guide-article-adslot-inbody"]')).toHaveLength(1);
      unmount();

      // Also verify approval mode gating on the fallback slot
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';
      const approvalNodes = renderGuideBodyContent(markdownWithNoZoneMatch, {
        guideSlug: 'custom-unmatched-guide',
        zoneSectionPreviews: [],
        inlineSlugLookup: new Map(),
      });
      const r2 = render(<div>{approvalNodes}</div>);
      expect(r2.container.querySelector('[data-testid="guide-mid-conversion-slot"]')).not.toBeNull();
      expect(r2.container.querySelector('[data-testid="guide-article-adslot-inbody"]')).toBeNull();
      r2.unmount();
    });
  });

  describe('4. /technovalley & /technovalley/[slug] High-Efficiency SEO Guide Format Expansion', () => {
    it('renders SEO Guide Top Slot, 6 Commuter Apartment Preview Cards, and Mid Zero-CLS AdSlot on /technovalley and tracks click events', async () => {
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
      const trackEventSpy = jest.spyOn(analyticsUtils, 'trackEvent');

      const jsx = await TechnoValleyPage({
        searchParams: Promise.resolve({}),
        initialTransactions: [],
      });
      const { container, unmount } = render(jsx);

      const seoTopSlot = container.querySelector(
        '[data-testid="technovalley-seo-guide-top-slot"]'
      );
      expect(seoTopSlot).not.toBeNull();
      expect(seoTopSlot?.textContent).toContain('최근 7일 급상승');
      expect(seoTopSlot?.textContent).toContain('Key Takeaways');

      const topGuideCta = container.querySelector('[data-testid="technovalley-top-guide-cta"]');
      expect(topGuideCta?.getAttribute('href')).toBe(
        '/guide/dongtan-technovalley-corporate-relocation-tax'
      );

      const commuterSection = container.querySelector(
        '[data-testid="technovalley-commuter-apt-preview-section"]'
      );
      expect(commuterSection).not.toBeNull();
      const previewCards = commuterSection!.querySelectorAll(
        '[data-testid="guide-apt-preview-card-zone_section"]'
      );
      expect(previewCards).toHaveLength(6);
      expect(
        commuterSection!.querySelector('[data-testid="guide-apt-preview-high-dwell-badge"]')
      ).not.toBeNull();

      // Verify GA4 click tracking dimensions on /technovalley commuter preview card
      fireEvent.click(previewCards[0]);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_apt_preview_click',
        expect.objectContaining({
          guide_slug: 'technovalley',
          placement: 'zone_section',
          section_title: '동탄테크노밸리 직주근접 배후 단지 실거래 프리뷰',
        })
      );

      const midAdSlot = container.querySelector('[data-testid="technovalley-b2b-adslot-mid"]');
      expect(midAdSlot).not.toBeNull();
      expect(midAdSlot?.className).toContain('min-h-[250px]');
      expect(midAdSlot?.className).toContain('empty:hidden');

      expect(container.querySelectorAll('.font-mono')).toHaveLength(0);
      expect(container.querySelectorAll('h1')).toHaveLength(1);

      trackEventSpy.mockRestore();
      unmount();
    });

    it('suppresses technovalley-b2b-adslot-mid when NEXT_PUBLIC_ADSENSE_APPROVAL_MODE is true', async () => {
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';

      const jsx = await TechnoValleyPage({
        searchParams: Promise.resolve({}),
        initialTransactions: [],
      });
      const { container, unmount } = render(jsx);

      expect(container.querySelector('[data-testid="technovalley-b2b-adslot-mid"]')).toBeNull();
      expect(container.querySelector('[data-testid="technovalley-b2b-adslot-top"]')).toBeNull();
      expect(
        container.querySelector('[data-testid="technovalley-commuter-apt-preview-section"]')
      ).not.toBeNull();

      unmount();
    });

    it('renders commuter apartment previews and top inflow links on /technovalley/[slug] with descriptive sectionTitle telemetry while preserving single h1 and zero font-mono', async () => {
      const trackEventSpy = jest.spyOn(analyticsUtils, 'trackEvent');
      const jisanList = await getTechnoValleyJisanList();
      const firstSlug = formatTechnoValleyJisanSlug(jisanList[0].name);

      const jsx = await TechnoValleyDetailPage({
        params: Promise.resolve({ slug: firstSlug }),
        initialTransactions: [],
      });
      const { container, unmount } = render(jsx);

      const detailSlot = container.querySelector(
        '[data-testid="technovalley-detail-commuter-preview-slot"]'
      );
      expect(detailSlot).not.toBeNull();
      const previewCards = detailSlot!.querySelectorAll(
        '[data-testid="guide-apt-preview-card-zone_section"]'
      );
      expect(previewCards).toHaveLength(4);
      expect(
        detailSlot!.querySelector('[data-testid="guide-apt-preview-high-dwell-badge"]')
      ).not.toBeNull();

      fireEvent.click(previewCards[0]);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_apt_preview_click',
        expect.objectContaining({
          guide_slug: `technovalley-${firstSlug}`,
          placement: 'zone_section',
          section_title: `${jisanList[0].name} 직주근접 배후 대장 단지`,
        })
      );

      expect(container.querySelectorAll('h1')).toHaveLength(1);
      expect(container.querySelectorAll('.font-mono')).toHaveLength(0);

      trackEventSpy.mockRestore();
      unmount();
    });
  });

  describe('5. /guide Hub Top Conversion & Inflow Slot', () => {
    it('renders guide-index-top-conversion-hub with dynamically bound real MOLIT spotlight price, 3 acquisition channel links, and 4 flagship preview cards while keeping 20 article cards', () => {
      const trackEventSpy = jest.spyOn(analyticsUtils, 'trackEvent');
      const lakeEduPreview = buildGuideAptMiniPreview('동탄더샵레이크에듀타운')!;
      const { container, unmount } = render(<GuideIndexPage />);

      const topHub = container.querySelector('[data-testid="guide-index-top-conversion-hub"]');
      expect(topHub).not.toBeNull();
      expect(topHub?.textContent).toContain('구글 검색 1위');
      expect(topHub?.textContent).toContain('ChatGPT·구글 동시 유입');
      expect(topHub?.textContent).toContain('최근 7일 급상승');

      const hubSpotlight = container.querySelector(
        '[data-testid="guide-index-lake-edutown-spotlight"]'
      );
      expect(hubSpotlight).not.toBeNull();
      expect(hubSpotlight?.getAttribute('href')).toBe(lakeEduPreview.href);
      expect(hubSpotlight?.textContent).toContain(lakeEduPreview.latestPriceStr);

      const flagshipCards = topHub!.querySelectorAll(
        '[data-testid="guide-apt-preview-card-article_top"]'
      );
      expect(flagshipCards).toHaveLength(4);
      expect(
        topHub!.querySelector('[data-testid="guide-apt-preview-high-dwell-badge"]')
      ).not.toBeNull();

      fireEvent.click(flagshipCards[0]);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_apt_preview_click',
        expect.objectContaining({
          guide_slug: 'guide-index',
          placement: 'article_top',
          section_title: '가이드 허브 고전환 핵심 대장 단지',
        })
      );

      expect(container.querySelectorAll('article')).toHaveLength(20);
      expect(container.querySelectorAll('.font-mono')).toHaveLength(0);

      trackEventSpy.mockRestore();
      unmount();
    });
  });
});
