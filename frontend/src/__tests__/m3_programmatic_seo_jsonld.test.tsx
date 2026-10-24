/**
 * @file m3_programmatic_seo_jsonld.test.tsx
 * @description Phase 3 Verification Suite: Programmatic High-CPC RTB Semantic Injection & Full-Scale JSON-LD Mesh
 *
 * Verifies all 5 invariants from ADSENSE_ARCHITECTURE_BLUEPRINT.md Section 3.3:
 * 1. Zero-CLS Visible AdSlot Invariant (/apartment/[aptName] Ch02 & Ch05, /technovalley, /guide, /guide/[slug], /mbti, /zone/[id])
 * 2. Schema.org Completeness & Zod Schema Invariants (TechnoValleyJisanSchema, RealEstateListingSchema, buildApartmentJsonLd)
 * 3. Deterministic SSG Generation (184 apartments, 56 Jisan, 16 MBTI, 7 zones, 3 guides) & SSR Semantic HTML
 * 4. Accessibility Masking Removal Invariant (/zone/[id] aria-hidden="true" removal)
 * 5. Unified Sitemap ([266, ±0, 개] URLs) & Robots (0 404 URLs) Completeness Invariant
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  TechnoValleyJisanSchema,
  RealEstateListingSchema,
  getTechnoValleyJisanList,
  getTxSummaryData,
  getApartmentPageData,
  buildApartmentJsonLd,
} from '@/lib/services/apartmentPageService';
import ApartmentPage, {
  generateStaticParams as generateAptStaticParams,
  generateMetadata as generateAptMetadata,
} from '@/app/apartment/[aptName]/page';
import TechnoValleyPage, { buildTechnoValleyJsonLd } from '@/app/technovalley/page';
import GuideIndexPage from '@/app/guide/page';
import GuideArticlePage, {
  generateStaticParams as generateGuideStaticParams,
} from '@/app/guide/[slug]/page';
import MBTIHubPage from '@/app/mbti/page';
import MBTIDirectResultPage, {
  generateStaticParams as generateMbtiStaticParams,
} from '@/app/mbti/[type]/page';
import ZoneDetailPage, {
  generateStaticParams as generateZoneStaticParams,
} from '@/app/zone/[id]/page';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';

jest.mock('@/components/DashboardClient', () => {
  return function MockDashboardClient({ preselectedAptName }: { preselectedAptName?: string }) {
    return <div data-testid="mock-dashboard-client">DashboardClient:{preselectedAptName}</div>;
  };
});

jest.mock('@/app/technovalley/TechnoValleyClient', () => {
  return function MockTechnoValleyClient() {
    return <div data-testid="mock-technovalley-client">TechnoValleyClient</div>;
  };
});

jest.mock('@/app/zone/[id]/ZoneDetailClient', () => {
  return function MockZoneDetailClient() {
    return <div data-testid="mock-zone-detail-client">ZoneDetailClient</div>;
  };
});

jest.mock('@/components/LoungeHeader', () => {
  return function MockLoungeHeader() {
    return <header data-testid="mock-lounge-header" />;
  };
});

jest.mock('@/components/pwa/MobileDock', () => {
  return function MockMobileDock() {
    return <nav data-testid="mock-mobile-dock" />;
  };
});

describe('Phase 3: Programmatic High-CPC RTB Semantic Injection & Full-Scale JSON-LD Mesh', () => {
  describe('1. Zod Schemas: TechnoValleyJisanSchema & RealEstateListingSchema', () => {
    it('validates all 56 items in public/data/jisan-status-list.json with 0 errors', async () => {
      const jisanList = await getTechnoValleyJisanList();
      expect(jisanList).toHaveLength(56);
      jisanList.forEach((item) => {
        const res = TechnoValleyJisanSchema.safeParse(item);
        expect(res.success).toBe(true);
      });
    });

    it('rejects invalid TechnoValleyJisan payloads (empty name or missing seq)', () => {
      expect(TechnoValleyJisanSchema.safeParse({ seq: '1', name: '' }).success).toBe(false);
      expect(TechnoValleyJisanSchema.safeParse({ name: '동탄지산' }).success).toBe(false);
    });

    it('enforces RealEstateListingSchema lowPrice <= highPrice and positive constraints', () => {
      const validRange = RealEstateListingSchema.safeParse({
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: '동탄역 롯데캐슬 실거래 리스팅',
        description: '동탄역 초역세권 대장 단지',
        url: 'https://dongtanview.com/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'KRW',
          lowPrice: 1200000000,
          highPrice: 1650000000,
          offerCount: 24,
        },
      });
      expect(validRange.success).toBe(true);

      const validEqual = RealEstateListingSchema.safeParse({
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: '단일 실거래 단지',
        description: '단일 가격 검증',
        url: 'https://dongtanview.com/apartment/single',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'KRW',
          lowPrice: 900000000,
          highPrice: 900000000,
          offerCount: 1,
        },
      });
      expect(validEqual.success).toBe(true);

      const invertedPrices = RealEstateListingSchema.safeParse({
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: '역전 가격 단지',
        description: '역전 가격 거부 검증',
        url: 'https://dongtanview.com/apartment/inverted',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'KRW',
          lowPrice: 1800000000,
          highPrice: 1200000000,
          offerCount: 5,
        },
      });
      expect(invertedPrices.success).toBe(false);
      if (!invertedPrices.success) {
        expect(invertedPrices.error.issues[0].message).toBe('lowPrice must be <= highPrice');
      }

      const zeroOfferCount = RealEstateListingSchema.safeParse({
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: '0건 단지',
        description: '0건 거부 검증',
        url: 'https://dongtanview.com/apartment/zero',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'KRW',
          lowPrice: 500000000,
          highPrice: 600000000,
          offerCount: 0,
        },
      });
      expect(zeroOfferCount.success).toBe(false);
    });
  });

  describe('2. Schema.org Completeness & Zero-CLS AdSlots in /apartment/[aptName]', () => {
    it('injects RealEstateListing, AggregateOffer, and LoanOrCredit into buildApartmentJsonLd', async () => {
      const pageData = await getApartmentPageData('동탄역롯데캐슬');
      const jsonLd = buildApartmentJsonLd(pageData, 'https://dongtanview.com');
      const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;

      const listingNode = graph.find((node) => node['@type'] === 'RealEstateListing');
      expect(listingNode).toBeDefined();
      const parsedListing = RealEstateListingSchema.safeParse({
        '@context': 'https://schema.org',
        '@type': listingNode?.['@type'],
        name: listingNode?.name,
        description: listingNode?.description,
        url: listingNode?.url,
        offers: listingNode?.offers,
      });
      expect(parsedListing.success).toBe(true);

      const loanNode = graph.find((node) => {
        const t = node['@type'];
        return Array.isArray(t) && t.includes('FinancialProduct') && t.includes('LoanOrCredit');
      });
      expect(loanNode).toBeDefined();
    });

    it('derives RealEstateListing from real rent deposit records for rent-only complexes and omits node when all prices are 0', async () => {
      // 1. Rent-only apartment in tx-summary.json (서해더블루93-8: latestPrice = 0, latestRentDeposit = 55182, deposit = 40950)
      const rentOnlyPageData = await getApartmentPageData('서해더블루93-8');
      const rentOnlyJsonLd = buildApartmentJsonLd(rentOnlyPageData, 'https://dongtanview.com');
      const rentGraph = rentOnlyJsonLd['@graph'] as Array<Record<string, unknown>>;
      const rentListing = rentGraph.find((node) => node['@type'] === 'RealEstateListing');
      expect(rentListing).toBeDefined();
      const offers = rentListing?.offers as { lowPrice: number; highPrice: number };
      expect(offers.lowPrice).toBe(409500000);
      expect(offers.highPrice).toBe(409500000);
      expect(offers.lowPrice).not.toBe(500000000);

      // 2. Ghost apartment with 0 prices across all fields omits RealEstateListing instead of fabricating fake prices
      const ghostData = await getApartmentPageData('존재하지않는유령단지_999');
      const ghostJsonLd = buildApartmentJsonLd(ghostData, 'https://dongtanview.com');
      const ghostGraph = ghostJsonLd['@graph'] as Array<Record<string, unknown>>;
      const ghostListing = ghostGraph.find((node) => node['@type'] === 'RealEstateListing');
      expect(ghostListing).toBeUndefined();
    });

    it('renders 2 pre-reserved min-h-[250px] AdSlot units after Chapter 02 and Chapter 05 in SSR body', async () => {
      const PageJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: '동탄역롯데캐슬' }),
      });
      const { container, getByTestId } = render(PageJsx);

      const ch02Slot = getByTestId('ssr-adslot-ch02');
      const ch05Slot = getByTestId('ssr-adslot-ch05');

      expect(ch02Slot).toBeInTheDocument();
      expect(ch02Slot.className).toContain('min-h-[250px]');

      expect(ch05Slot).toBeInTheDocument();
      expect(ch05Slot.className).toContain('min-h-[250px]');

      // Verify DOM order: #chapter-02-pyeong-ssr -> ssr-adslot-ch02 -> #chapter-05-mortgage-ssr -> ssr-adslot-ch05
      const ch02Section = container.querySelector('#chapter-02-pyeong-ssr');
      const ch05Section = container.querySelector('#chapter-05-mortgage-ssr');
      expect(ch02Section).not.toBeNull();
      expect(ch05Section).not.toBeNull();
      expect(ch02Section?.nextElementSibling).toBe(ch02Slot);
      expect(ch05Section?.nextElementSibling).toBe(ch05Slot);
    });

    it('generates static params for all 184 apartments and static metadata without dynamic bailout', async () => {
      const staticParams = await generateAptStaticParams();
      const txSummary = await getTxSummaryData();
      expect(staticParams.length).toBe(184);
      expect(staticParams.length).toBe(Object.keys(txSummary).length);

      const metadata = await generateAptMetadata({
        params: Promise.resolve({ aptName: '동탄역롯데캐슬' }),
      });
      expect(metadata.title).toContain('동탄역롯데캐슬');
    });
  });

  describe('3. /technovalley SSR Catalog, Tax Benefit Table & B2B AdSlots', () => {
    it('renders 56 Knowledge Industry Centers, tax benefit table (취득세/재산세/법인세), JSON-LD, and B2B AdSlots', async () => {
      const PageJsx = await TechnoValleyPage();
      const { container, getByTestId } = render(PageJsx);

      expect(container.textContent).toContain('지식산업센터');
      expect(container.textContent).toContain('취득세 35% 감면');
      expect(container.textContent).toContain('재산세 35% 감면');
      expect(container.textContent).toContain('법인세');

      // Verify 56 rows in the catalog table (#jisan-catalog)
      const catalogSection = container.querySelector('#technovalley-jisan-ssr-catalog');
      expect(catalogSection).not.toBeNull();
      const jisanCatalogTable = container.querySelector('#jisan-catalog');
      expect(jisanCatalogTable).not.toBeNull();
      const catalogRows = jisanCatalogTable?.querySelectorAll('tbody tr');
      expect(catalogRows?.length).toBe(56);

      // Verify B2B AdSlots with min-h-[250px]
      const topSlot = getByTestId('technovalley-b2b-adslot-top');
      const bottomSlot = getByTestId('technovalley-b2b-adslot-bottom');
      expect(topSlot.className).toContain('min-h-[250px]');
      expect(bottomSlot.className).toContain('min-h-[250px]');

      // Verify JSON-LD
      const jisanList = await getTechnoValleyJisanList();
      const jsonLd = buildTechnoValleyJsonLd(jisanList);
      const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
      expect(graph.some((n) => n['@type'] === 'CollectionPage')).toBe(true);
    });
  });

  describe('4. /guide, /mbti, and /zone/[id] SSR Semantic & Accessibility Invariants', () => {
    it('renders Zero-CLS AdSlots and recirculation links in /guide and /guide/[slug]', async () => {
      const guideParams = await generateGuideStaticParams();
      expect(guideParams).toHaveLength(6);

      const indexRender = render(GuideIndexPage());
      expect(indexRender.getByTestId('guide-index-adslot-top').className).toContain('min-h-[250px]');
      expect(indexRender.getByTestId('guide-index-adslot-bottom').className).toContain('min-h-[250px]');

      const ArticleJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: guideParams[0].slug }),
      });
      const articleRender = render(ArticleJsx);
      expect(articleRender.getByTestId('guide-article-adslot-top').className).toContain('min-h-[250px]');
      expect(articleRender.getByTestId('guide-article-adslot-bottom').className).toContain('min-h-[250px]');
    });

    it('renders Quiz/Place JSON-LD and visible SSR semantic analysis in /mbti and /mbti/[type]', async () => {
      const mbtiParams = await generateMbtiStaticParams();
      expect(mbtiParams).toHaveLength(16);

      const hubRender = render(MBTIHubPage());
      const hubSummary = hubRender.container.querySelector('#mbti-hub-ssr-summary');
      expect(hubSummary).not.toBeNull();
      expect(hubSummary?.querySelectorAll('tbody tr').length).toBe(16);
      expect(hubRender.getByTestId('mbti-hub-adslot').className).toContain('min-h-[250px]');

      const TypeJsx = await MBTIDirectResultPage({
        params: Promise.resolve({ type: 'ENTJ' }),
      });
      const typeRender = render(TypeJsx);
      const typeSection = typeRender.container.querySelector('#mbti-type-ssr-analysis');
      expect(typeSection).not.toBeNull();
      expect(typeSection?.textContent).toContain('동탄역 롯데캐슬');
      expect(typeRender.getByTestId('mbti-type-ssr-adslot').className).toContain('min-h-[250px]');

      const jsonLdScript = typeRender.container.querySelector('script[type="application/ld+json"]');
      expect(jsonLdScript).not.toBeNull();
      expect(jsonLdScript?.innerHTML).toContain('Quiz');
      expect(jsonLdScript?.innerHTML).toContain('ApartmentComplex');
    });

    it('eliminates aria-hidden="true" from /zone/[id] data table and exposes accessible SSR table', async () => {
      const zoneParams = await generateZoneStaticParams();
      expect(zoneParams).toHaveLength(7);

      const ZoneJsx = await ZoneDetailPage({
        params: Promise.resolve({ id: zoneParams[0].id }),
      });
      const { container, getByTestId } = render(ZoneJsx);

      const zoneTableSection = container.querySelector('#zone-ssr-data-table');
      expect(zoneTableSection).not.toBeNull();
      expect(zoneTableSection?.getAttribute('aria-hidden')).toBeNull();

      const hiddenTables = container.querySelectorAll('[aria-hidden="true"] table');
      expect(hiddenTables.length).toBe(0);

      const table = zoneTableSection?.querySelector('table');
      expect(table).not.toBeNull();
      expect(table?.querySelector('caption')).not.toBeNull();
      expect(getByTestId('zone-ssr-adslot').className).toContain('min-h-[250px]');
    });
  });

  describe('5. Unified Sitemap (277 URLs) & Robots (0 404 URLs) Completeness Invariant', () => {
    it('registers exact [277, ±0, 개] programmatic and core trust URLs in sitemap.ts (including Next.js 16 async Promise id)', async () => {
      const entries = await sitemap({ id: 0 });
      expect(entries).toHaveLength(277);

      const asyncEntries = await sitemap({ id: Promise.resolve('0') });
      expect(asyncEntries).toHaveLength(277);

      const defaultEntries = await sitemap();
      expect(defaultEntries).toHaveLength(277);

      const aptUrls = entries.filter((e) => e.url.includes('/apartment/'));
      const jisanUrls = entries.filter((e) => e.url.includes('/technovalley'));
      const mbtiUrls = entries.filter((e) => e.url.includes('/mbti/'));
      const zoneUrls = entries.filter((e) => e.url.includes('/zone/'));
      const guideUrls = entries.filter((e) => e.url.includes('/guide/'));
      const coreStaticUrls = entries.filter((e) =>
        ['https://dongtanview.com', 'https://dongtanview.com/guide', 'https://dongtanview.com/explore', 'https://dongtanview.com/news', 'https://dongtanview.com/about', 'https://dongtanview.com/contact', 'https://dongtanview.com/terms', 'https://dongtanview.com/privacy'].includes(e.url)
      );

      expect(aptUrls).toHaveLength(184);
      expect(jisanUrls).toHaveLength(56);
      expect(mbtiUrls).toHaveLength(16);
      expect(zoneUrls).toHaveLength(7);
      expect(guideUrls).toHaveLength(6);
      expect(coreStaticUrls).toHaveLength(8);

      const emptyChunk = await sitemap({ id: 99 });
      expect(emptyChunk).toEqual([]);

      const asyncEmptyChunk = await sitemap({ id: Promise.resolve('99') });
      expect(asyncEmptyChunk).toEqual([]);
    });

    it('removes non-existent 404 URLs (sitemap/1.xml, feed.xml) from robots.ts', () => {
      const robotsConfig = robots();
      const sitemapField = robotsConfig.sitemap;
      const serialized = JSON.stringify(sitemapField);

      expect(serialized).not.toContain('sitemap/1.xml');
      expect(serialized).not.toContain('feed.xml');
      expect(serialized).toContain('/sitemap.xml');
    });
  });
});
