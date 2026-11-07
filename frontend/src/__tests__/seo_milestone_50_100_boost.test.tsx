/**
 * @jest-environment jsdom
 *
 * @file seo_milestone_50_100_boost.test.tsx
 * @description Empirical Verification Suite for Next GSC Milestone (50 · 100 Clicks) SEO Enhancements:
 * - Sitemap (`sitemap.ts`) hyphenated `YYYY-MM-DD` real transaction `lastModified` date parsing & Jisan historical date parsing
 * - RSS 2.0 Feed (`/feed.xml`) enrichment with 20 comparison guides + 7 investment zones & XML escaping
 * - `/stats` CTR metadata, keywords, OpenGraph/Twitter `/api/og` tags, and `BreadcrumbList` + `Dataset` JSON-LD
 * - `/explore` & `/guide` `CollectionPage` JSON-LD enrichment (`BreadcrumbList`, `isPartOf`, `about`, `publisher`)
 * - E-E-A-T Trust Pages (`/contact`, `/terms`, `/privacy`) brand-alias metadata, OG images, and `WebPage` + `BreadcrumbList` JSON-LD
 */

import React from 'react';
import { render } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/stats',
  useSearchParams: () => new URLSearchParams(),
  notFound: jest.fn(),
}));

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

jest.mock('@/components/ads/AdSlot', () => {
  const MockAdSlot = ({ minHeightClass }: { minHeightClass?: string }) => (
    <div data-testid="mock-adslot" className={minHeightClass || 'min-h-[250px]'} />
  );
  return {
    __esModule: true,
    default: MockAdSlot,
    AdSlot: MockAdSlot,
  };
});

jest.mock('@/app/stats/StatsPageClient', () => {
  const MockStatsPageClient = () => <div data-testid="mock-stats-page-client" />;
  return {
    __esModule: true,
    default: MockStatsPageClient,
    StatsPageClient: MockStatsPageClient,
  };
});

import sitemap, { parseSitemapDate } from '@/app/sitemap';
import { GET as getRssFeed, parseRssPubDate } from '@/app/feed.xml/route';
import StatsPage, { metadata as statsMetadata } from '@/app/stats/page';
import { metadata as exploreMetadata } from '@/app/explore/page';
import GuideIndexPage, { metadata as guideHubMetadata } from '@/app/guide/page';
import GuideArticlePage, { renderInlineBold } from '@/app/guide/[slug]/page';
import ContactPage, { metadata as contactMetadata } from '@/app/contact/page';
import TermsPage, { metadata as termsMetadata } from '@/app/terms/page';
import PrivacyPage, { metadata as privacyMetadata } from '@/app/privacy/page';
import { getExploreSchema } from '@/lib/utils/structuredData';
import {
  getTxSummaryData,
  getTechnoValleyJisanList,
  buildJisanTaxBenefitSummary,
} from '@/lib/services/apartmentPageService';
import {
  GUIDE_ARTICLES,
  TOP_POPULAR_GUIDE_SLUGS,
  GUIDE_TOPIC_CLUSTERS,
  getTopicClusterForGuide,
  getRelatedGuidesForGuide,
  buildGuideAptMiniPreview,
  resolveGuideZoneSectionPreviews,
} from '@/lib/data/guides';
import { ZONES } from '@/lib/zones';

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('GSC 50·100 Clicks Milestone SEO Enhancement Verification Suite', () => {
  describe('1. Sitemap (sitemap.ts) Real Transaction Date Parsing & Invariants', () => {
    it('parses YYYYMMDD, YYYY-MM-DD, YYYY.MM.DD, and ISO dates into UTC Date objects, rejects impossible calendar rollover dates, caps future/invalid dates safely, and preserves 277 URLs', async () => {
      const fallback = new Date('2026-06-26T00:00:00.000Z');
      const refNow = new Date('2026-11-07T12:00:00.000Z');

      expect(parseSitemapDate('20260630', fallback, refNow).toISOString()).toBe(
        '2026-06-30T00:00:00.000Z'
      );
      expect(parseSitemapDate('2026-06-30', fallback, refNow).toISOString()).toBe(
        '2026-06-30T00:00:00.000Z'
      );
      expect(parseSitemapDate('2026.06.30', fallback, refNow).toISOString()).toBe(
        '2026-06-30T00:00:00.000Z'
      );
      expect(parseSitemapDate('2026-10-31T09:00:00.000Z', fallback, refNow).toISOString()).toBe(
        '2026-10-31T09:00:00.000Z'
      );
      // Future date, impossible calendar date (Feb 31), out-of-range month/day, empty, and null fall back safely
      expect(parseSitemapDate('2099-12-31', fallback, refNow)).toBe(fallback);
      expect(parseSitemapDate('2026-02-31', fallback, refNow)).toBe(fallback);
      expect(parseSitemapDate('2026-13-45', fallback, refNow)).toBe(fallback);
      expect(parseSitemapDate('', fallback, refNow)).toBe(fallback);
      expect(parseSitemapDate(null, fallback, refNow)).toBe(fallback);
      expect(parseSitemapDate(undefined, fallback, refNow)).toBe(fallback);
      expect(parseSitemapDate('invalid-date', fallback, refNow)).toBe(fallback);

      const nonZeroSitemap = await sitemap({ id: 1 });
      expect(nonZeroSitemap).toEqual([]);

      const entries = await sitemap({ id: 0 });
      expect(entries).toHaveLength(277);

      const txSummary = await getTxSummaryData();
      const richeSummary = txSummary['동탄역시범리슈빌아파트'];
      expect(richeSummary?.latestDate).toMatch(/^\d{4}-?\d{2}-?\d{2}$/);

      const expectedRicheDigits = String(richeSummary.latestDate).replace(/\D/g, '');
      const expectedRicheUtc = new Date(
        Date.UTC(
          parseInt(expectedRicheDigits.slice(0, 4), 10),
          parseInt(expectedRicheDigits.slice(4, 6), 10) - 1,
          parseInt(expectedRicheDigits.slice(6, 8), 10)
        )
      );

      const richeUrl = `https://dongtanview.com/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`;
      const richeEntry = entries.find((e) => e.url === richeUrl);
      expect(richeEntry).toBeDefined();
      expect(new Date(richeEntry!.lastModified as Date).toISOString()).toBe(
        expectedRicheUtc.toISOString()
      );

      // Verify TechnoValley Jisan entries parse real 8-digit completion/approval dates <= nowDate
      const jisanList = await getTechnoValleyJisanList();
      expect(jisanList).toHaveLength(56);
      const jisanEntries = entries.filter((e) => e.url.includes('/technovalley/'));
      expect(jisanEntries).toHaveLength(56);

      const nowMs = Date.now() + 60_000;
      for (const entry of entries) {
        const ts = new Date(entry.lastModified as Date).getTime();
        expect(Number.isNaN(ts)).toBe(false);
        expect(ts).toBeLessThanOrEqual(nowMs);
      }
    });
  });

  describe('2. RSS 2.0 Feed (/feed.xml) Programmatic Guide & Zone Items & Date Resilience', () => {
    it('emits valid RSS 2.0 XML with 20 comparison guides, 7 investment zones, atom:link self-reference, and resilient pubDate parsing', async () => {
      const fallbackUtc = 'Sat, 07 Nov 2026 00:00:00 GMT';
      expect(parseRssPubDate('2026-10-31', fallbackUtc)).toBe('Sat, 31 Oct 2026 00:00:00 GMT');
      expect(parseRssPubDate('20261031', fallbackUtc)).toBe('Sat, 31 Oct 2026 00:00:00 GMT');
      expect(parseRssPubDate('2026.10.31', fallbackUtc)).toBe('Sat, 31 Oct 2026 00:00:00 GMT');
      expect(parseRssPubDate('2026-11-07T09:00:00Z', fallbackUtc)).toBe(
        'Sat, 07 Nov 2026 09:00:00 GMT'
      );
      expect(parseRssPubDate('2026-02-31', fallbackUtc)).toBe(fallbackUtc);
      expect(parseRssPubDate('malformed-date', fallbackUtc)).toBe(fallbackUtc);
      expect(parseRssPubDate('', fallbackUtc)).toBe(fallbackUtc);
      expect(parseRssPubDate(null, fallbackUtc)).toBe(fallbackUtc);
      expect(parseRssPubDate(undefined, fallbackUtc)).toBe(fallbackUtc);

      const response = await getRssFeed();
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/xml');

      const xml = await response.text();
      expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
      expect(xml).toContain('D-VIEW (디뷰 · 동뷰 · 동탄뷰)');
      expect(xml).toContain('184개 단지');
      expect(xml).toContain('56개 지식산업센터');
      expect(xml).toContain('rel="self" type="application/rss+xml"');
      expect(xml).not.toContain('Invalid Date');

      const itemMatches = xml.match(/<item>/g) || [];
      expect(itemMatches).toHaveLength(GUIDE_ARTICLES.length + ZONES.length);

      for (const article of GUIDE_ARTICLES) {
        expect(xml).toContain(`/guide/${encodeURIComponent(article.slug)}</link>`);
      }
      for (const zone of ZONES) {
        expect(xml).toContain(`/zone/${encodeURIComponent(zone.id)}</link>`);
      }
    });
  });

  describe('3. /stats CTR Metadata, Keywords, OG Image & BreadcrumbList + Dataset JSON-LD', () => {
    it('upgrades /stats metadata and renders WebPage, BreadcrumbList, and enriched Dataset JSON-LD with zero emojis or font-mono', () => {
      const title = String(statsMetadata.title);
      const desc = String(statsMetadata.description);
      expect(title).toContain('동탄 아파트 통계');
      expect(title).toContain('동탄역 거리별 실거래가');
      expect(title).toContain('역세권 프리미엄 회귀분석');
      expect(title).toContain('127개 단지');
      expect(desc).toContain('127개 아파트 단지');
      expect(desc).toContain('OLS 회귀분석');
      expect(EMOJI_REGEX.test(title + desc)).toBe(false);

      const keywords = statsMetadata.keywords as string[];
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords).toEqual(
        expect.arrayContaining(['동탄 아파트 통계', '동탄역 거리별 시세', '디뷰', '동뷰', '동탄뷰'])
      );

      const ogImages = statsMetadata.openGraph?.images as Array<{ url: string }>;
      expect(ogImages).toBeDefined();
      expect(ogImages[0].url).toContain('/api/og?title=');
      expect(ogImages[0].url).not.toContain(' ');

      const { container, unmount } = render(<StatsPage />);
      expect(container.querySelectorAll('.font-mono').length).toBe(0);

      const ldScript = container.querySelector('script[type="application/ld+json"]');
      expect(ldScript).not.toBeNull();
      const parsedLd = JSON.parse(ldScript?.innerHTML || '{}');
      const graph = parsedLd['@graph'] as Array<Record<string, unknown>>;

      const webpageNode = graph.find((n) => n['@type'] === 'WebPage');
      const breadcrumbNode = graph.find((n) => n['@type'] === 'BreadcrumbList');
      const datasetNode = graph.find((n) => n['@type'] === 'Dataset');

      expect(webpageNode).toBeDefined();
      expect(webpageNode?.breadcrumb).toEqual({ '@id': 'https://dongtanview.com/stats#breadcrumb' });
      expect(breadcrumbNode).toBeDefined();
      expect((breadcrumbNode?.itemListElement as unknown[]).length).toBe(2);
      expect(datasetNode).toBeDefined();
      expect(datasetNode?.isAccessibleForFree).toBe(true);
      expect((datasetNode?.spatialCoverage as { name?: string })?.name).toBe(
        '경기도 화성시 동탄신도시'
      );

      unmount();
    });
  });

  describe('4. /explore & /guide CollectionPage Structured Data & Keywords', () => {
    it('enriches /explore metadata keywords and getExploreSchema CollectionPage JSON-LD', () => {
      const exploreKeywords = exploreMetadata.keywords as string[];
      expect(Array.isArray(exploreKeywords)).toBe(true);
      expect(exploreKeywords).toEqual(
        expect.arrayContaining([
          '동탄 아파트 탐색',
          '동탄 아파트 실거래가 순위',
          '동탄 평당가 랭킹',
          '디뷰',
          '동뷰',
          '동탄뷰',
        ])
      );

      const schema = getExploreSchema('https://dongtanview.com');
      expect(schema['@type']).toBe('CollectionPage');
      expect(schema.inLanguage).toBe('ko-KR');
      expect(schema.isPartOf).toEqual({ '@id': 'https://dongtanview.com/#website' });
      expect(schema.about).toEqual({
        '@type': 'Place',
        name: '경기도 화성시 동탄신도시',
      });
      expect(schema.publisher.name).toContain('D-VIEW');
      expect(schema.breadcrumb['@type']).toBe('BreadcrumbList');
      expect(schema.breadcrumb.itemListElement).toHaveLength(2);
    });

    it('enriches /guide hub CollectionPage JSON-LD with BreadcrumbList, isPartOf, and publisher while preserving 20 hasPart articles', () => {
      expect(String(guideHubMetadata.title)).toContain('동탄1 vs 2');
      const { container, unmount } = render(<GuideIndexPage />);
      const ldScript = container.querySelector('script[type="application/ld+json"]');
      expect(ldScript).not.toBeNull();
      const parsedLd = JSON.parse(ldScript?.innerHTML || '{}');

      expect(parsedLd['@type']).toBe('CollectionPage');
      expect(parsedLd.inLanguage).toBe('ko-KR');
      expect(parsedLd.isPartOf).toEqual({ '@id': 'https://dongtanview.com/#website' });
      expect(parsedLd.breadcrumb?.['@type']).toBe('BreadcrumbList');
      expect(parsedLd.breadcrumb?.itemListElement).toHaveLength(2);
      expect(parsedLd.hasPart).toHaveLength(20);
      unmount();
    });
  });

  describe('5. E-E-A-T Trust Pages (/contact, /terms, /privacy) & Jisan Tax Benefit Reconciliation', () => {
    it('upgrades /contact, /terms, and /privacy metadata with Korean brand aliases, percent-encoded OG images, and WebPage/ContactPage + BreadcrumbList JSON-LD', async () => {
      for (const [meta, expectedCanonical] of [
        [contactMetadata, 'https://dongtanview.com/contact'],
        [termsMetadata, 'https://dongtanview.com/terms'],
        [privacyMetadata, 'https://dongtanview.com/privacy'],
      ] as const) {
        const title = String(meta.title);
        const desc = String(meta.description);
        expect(title).toContain('디뷰 · 동뷰 · 동탄뷰');
        expect(desc.length).toBeGreaterThan(40);
        expect(EMOJI_REGEX.test(title + desc)).toBe(false);
        expect(meta.alternates?.canonical).toBe(expectedCanonical);
        expect(meta.openGraph?.url).toBe(expectedCanonical);
        const ogImages = meta.openGraph?.images as Array<{ url: string }>;
        expect(ogImages[0].url).toContain('/api/og?title=');
        expect(ogImages[0].url).not.toContain(' ');
      }

      const contactUi = await ContactPage();
      const contactRender = render(contactUi);
      expect(contactRender.container.querySelectorAll('.font-mono').length).toBe(0);
      const contactLd = JSON.parse(
        contactRender.container.querySelector('script[type="application/ld+json"]')?.innerHTML ||
          '{}'
      );
      expect(
        contactLd['@graph'].some((n: { '@type': string }) => n['@type'] === 'ContactPage')
      ).toBe(true);
      expect(
        contactLd['@graph'].some((n: { '@type': string }) => n['@type'] === 'BreadcrumbList')
      ).toBe(true);
      contactRender.unmount();

      const termsRender = render(<TermsPage />);
      expect(termsRender.container.querySelectorAll('.font-mono').length).toBe(0);
      const termsLd = JSON.parse(
        termsRender.container.querySelector('script[type="application/ld+json"]')?.innerHTML || '{}'
      );
      expect(termsLd['@graph'].some((n: { '@type': string }) => n['@type'] === 'WebPage')).toBe(
        true
      );
      expect(
        termsLd['@graph'].some((n: { '@type': string }) => n['@type'] === 'BreadcrumbList')
      ).toBe(true);
      termsRender.unmount();

      const privacyRender = render(<PrivacyPage />);
      expect(privacyRender.container.querySelectorAll('.font-mono').length).toBe(0);
      const privacyLd = JSON.parse(
        privacyRender.container.querySelector('script[type="application/ld+json"]')?.innerHTML ||
          '{}'
      );
      expect(privacyLd['@graph'].some((n: { '@type': string }) => n['@type'] === 'WebPage')).toBe(
        true
      );
      expect(
        privacyLd['@graph'].some((n: { '@type': string }) => n['@type'] === 'BreadcrumbList')
      ).toBe(true);
      privacyRender.unmount();

      const taxSummary = buildJisanTaxBenefitSummary(null, [
        {
          date: '2026-09-18',
          type: '매매',
          sizeSqM: 89.42,
          floor: 7,
          price: '3억 2,000만원',
          priceRaw: 32000,
        },
      ]);
      expect(taxSummary.standardAcquisitionTaxManwon).toBe(1472);
      expect(taxSummary.savedAcquisitionTaxManwon).toBe(515);
      expect(taxSummary.savedTaxManwon).toBe(515);
      expect(taxSummary.referenceLabel).toBe(taxSummary.benchmarkLabel);
      expect(taxSummary.acquisitionTaxReductionRatePct).toBe(35);
      expect(taxSummary.propertyTaxReductionRatePct).toBe(35);
    });
  });

  describe('6. Step 3: TOP 5 Popular Guides In-Article CTA, Rival Matchups & 20-Guide Topic Clustering Cross-Links', () => {
    it('maps all 20 guides into 5 semantic Topic Clusters with explicit topicClusterId & relatedGuideSlugs and falls back safely on empty/partial txMap', () => {
      expect(TOP_POPULAR_GUIDE_SLUGS).toEqual([
        'dongtan-1-vs-2-comparison',
        'dongtan-school-zone-top-apartments',
        'dongtan-indeogwon-line-station-impact-analysis',
        'dongtan-budget-tier-ranking',
        'dongtan-lake-vs-station-comparison',
      ]);
      expect(GUIDE_TOPIC_CLUSTERS).toHaveLength(5);

      const allGuideSlugSet = new Set(GUIDE_ARTICLES.map((a) => a.slug));
      const clusteredSlugs = new Set<string>();

      for (const cluster of GUIDE_TOPIC_CLUSTERS) {
        expect(allGuideSlugSet.has(cluster.pillarSlug)).toBe(true);
        for (const gSlug of cluster.guideSlugs) {
          expect(allGuideSlugSet.has(gSlug)).toBe(true);
          clusteredSlugs.add(gSlug);
        }
      }
      expect(clusteredSlugs.size).toBe(20);

      for (const article of GUIDE_ARTICLES) {
        expect(article.topicClusterId).toBeDefined();
        expect(article.relatedGuideSlugs).toBeDefined();
        expect(article.relatedGuideSlugs!.length).toBeGreaterThanOrEqual(4);
        for (const relSlug of article.relatedGuideSlugs!) {
          expect(allGuideSlugSet.has(relSlug)).toBe(true);
          expect(relSlug).not.toBe(article.slug);
        }

        const clusterByArticle = getTopicClusterForGuide(article);
        const clusterBySlug = getTopicClusterForGuide(article.slug);
        expect(clusterByArticle).toBeDefined();
        expect(clusterByArticle?.id).toBe(article.topicClusterId);
        expect(clusterBySlug).toEqual(clusterByArticle);

        const related = getRelatedGuidesForGuide(article, 6);
        expect(related).toHaveLength(6);
        expect(related.some((r) => r.slug === article.slug)).toBe(false);
        const uniqueRelatedSlugs = new Set(related.map((r) => r.slug));
        expect(uniqueRelatedSlugs.size).toBe(6);
      }

      // Edge cases: empty/unknown slug
      expect(getTopicClusterForGuide('')).toBeUndefined();
      expect(getTopicClusterForGuide('non-existent-guide-slug')).toBeUndefined();
      expect(getRelatedGuidesForGuide('')).toEqual([]);
      expect(getRelatedGuidesForGuide('non-existent-guide-slug', 5)).toEqual([]);

      // Edge case: empty or partial txMap falls back to GUIDE_DEFAULT_TX_SUMMARY_MAP
      const fallbackPreview = buildGuideAptMiniPreview('동탄더샵레이크에듀타운', {});
      expect(fallbackPreview).not.toBeNull();
      expect(fallbackPreview?.canonicalSlug).toBe('동탄더샵레이크에듀타운');
      expect(fallbackPreview?.latestPrice).toBeGreaterThan(0);

      const partialMapPreview = buildGuideAptMiniPreview('동탄더샵레이크에듀타운', {
        더샵센트럴시티: { dong: '청계동', latestPrice: 155000, txCount: 280 },
      });
      expect(partialMapPreview).not.toBeNull();
      expect(partialMapPreview?.latestPrice).toBeGreaterThan(0);
      expect(partialMapPreview?.txCount).toBeGreaterThan(0);

      const guide1 = GUIDE_ARTICLES.find((a) => a.slug === 'dongtan-1-vs-2-comparison')!;
      expect(resolveGuideZoneSectionPreviews(guide1, {}).length).toBe(2);
      expect(
        guide1.featuredApartments!.map((apt) => buildGuideAptMiniPreview(apt, {})).filter(Boolean)
          .length
      ).toBe(guide1.featuredApartments!.length);
    });

    it('renders Top/Middle/Bottom flagship complex CTAs, all 3 rival matchups, inline cross-links, and 6-card Topic Cluster hubs across all TOP 5 popular guides', async () => {
      const allGuideSlugSet = new Set(GUIDE_ARTICLES.map((a) => a.slug));
      const txSummary = await getTxSummaryData();

      for (const slug of TOP_POPULAR_GUIDE_SLUGS) {
        const article = GUIDE_ARTICLES.find((a) => a.slug === slug)!;
        expect(article.headToHeadComparisons?.length).toBeGreaterThanOrEqual(3);

        const ui = await GuideArticlePage({ params: Promise.resolve({ slug }) });
        const { container, unmount } = render(ui);

        // 1. Top Flagship Complex Quick-Jump & Rival Matchup CTA
        const topJump = container.querySelector('[data-testid="guide-top-apt-quick-jump"]');
        expect(topJump).not.toBeNull();
        const topPreviewCards = topJump!.querySelectorAll(
          '[data-testid="guide-apt-preview-card-article_top"]'
        );
        expect(topPreviewCards.length).toBe(4);
        const topPills = topJump!.querySelectorAll('[data-testid="guide-top-apt-shortcut-pill"]');
        expect(topPills.length).toBe((article.featuredApartments || []).length);
        const topRivalBar = topJump!.querySelector('[data-testid="guide-top-rival-matchup"]');
        expect(topRivalBar).not.toBeNull();
        const topRivalRows = topRivalBar!.querySelectorAll(
          '[data-testid="guide-top-rival-matchup-row"]'
        );
        expect(topRivalRows.length).toBe(article.headToHeadComparisons!.length);

        // 2. Specific verification for #1 popular guide: dongtan-1-vs-2-comparison includes Lake Park & Sibeom flagships in Top 4 cards, Middle sections, and Bottom cards
        if (slug === 'dongtan-1-vs-2-comparison') {
          const topPreviewText = Array.from(topPreviewCards)
            .map((el) => el.textContent || '')
            .join(' ');
          expect(topPreviewText).toContain('동탄더샵레이크에듀타운');
          expect(topPreviewText).toContain('더샵센트럴시티');
          expect(topPreviewText).toContain('동탄린스트라우스 더레이크');
          expect(topPreviewText).toContain('솔빛마을 서해그랑블');

          const bodyEl = container.querySelector('#guide-article-body');
          expect(bodyEl?.textContent).toContain('동탄더샵레이크에듀타운');
          expect(bodyEl?.textContent).toContain('동탄린스트라우스 더레이크');
          const midZoneCards = bodyEl!.querySelectorAll(
            '[data-testid="guide-apt-preview-card-zone_section"]'
          );
          expect(midZoneCards.length).toBe(9);

          const bottomEl = container.querySelector('#guide-bottom-apt-preview-cards');
          expect(bottomEl?.textContent).toContain('동탄더샵레이크에듀타운');
          expect(bottomEl?.textContent).toContain('동탄린스트라우스 더레이크');
        }

        if (slug === 'dongtan-school-zone-top-apartments') {
          const previewMap = new Map(
            article.zoneSectionPreviews!.map((p) => [p.sectionHeadingMatch, p.apartments])
          );
          expect(previewMap.get('(1) 청계동 커뮤니티시범단지')).toContain(
            '시범반도유보라아이비파크4.0'
          );
          expect(previewMap.get('(3) 산척동 레이크 에듀타운')).toEqual([
            '동탄더샵레이크에듀타운',
            '더레이크시티부영5단지',
          ]);
        }

        // 3. In-body inline cross-links to other guides and canonical apartments
        const inlineGuideLinks = Array.from(
          container.querySelectorAll('#guide-article-body a[data-testid="guide-inline-cross-link"]')
        );
        expect(inlineGuideLinks.length).toBeGreaterThanOrEqual(3);
        for (const link of inlineGuideLinks) {
          const href = link.getAttribute('href') || '';
          expect(href.startsWith('/guide/')).toBe(true);
          const targetSlug = href.slice('/guide/'.length);
          expect(allGuideSlugSet.has(targetSlug)).toBe(true);
          expect(targetSlug).not.toBe(slug);
        }

        const inlineAptLinks = Array.from(
          container.querySelectorAll('#guide-article-body a[data-testid="guide-inline-apt-link"]')
        );
        expect(inlineAptLinks.length).toBeGreaterThan(0);
        for (const aptLink of inlineAptLinks) {
          const href = aptLink.getAttribute('href') || '';
          const decodedApt = decodeURIComponent(href.replace(/^\/apartment\//, ''));
          expect(txSummary[decodedApt]).toBeDefined();
        }

        // 4. Topic Cluster Cross-Linking Hub (6 cards + flagship apt pills + 5 cluster pillar pills)
        const clusterHub = container.querySelector('[data-testid="guide-topic-cluster-links"]');
        expect(clusterHub).not.toBeNull();
        const clusterCards = clusterHub!.querySelectorAll('[data-testid="guide-topic-cluster-card"]');
        expect(clusterCards.length).toBe(6);
        const clusterFlagshipLinks = clusterHub!.querySelectorAll(
          '[data-testid="guide-cluster-flagship-apt-link"]'
        );
        expect(clusterFlagshipLinks.length).toBeGreaterThanOrEqual(3);
        const clusterPillarPills = clusterHub!.querySelectorAll(
          '[data-testid="guide-cluster-pillar-pill"]'
        );
        expect(clusterPillarPills.length).toBe(5);

        // 5. Design & formatting invariants
        expect(container.querySelectorAll('.font-mono').length).toBe(0);
        const articleEl = container.querySelector('article');
        expect(articleEl?.textContent || '').not.toContain('**');
        expect(EMOJI_REGEX.test(articleEl?.textContent || '')).toBe(false);

        unmount();
      }
    });

    it('renders markdown links and bold tokens cleanly in renderInlineBold including links nested inside bold, parentheses in hrefs, and malformed URI sequences', () => {
      const lookup = new Map<string, string>([
        ['동탄더샵레이크에듀타운', '동탄더샵레이크에듀타운'],
      ]);
      const { container, unmount } = render(
        <div>
          {renderInlineBold(
            '비교: **[1동탄 vs 2동탄](/guide/dongtan-1-vs-2-comparison)** 및 **핵심 비교: [학군지 TOP 4](/guide/dongtan-school-zone-top-apartments) 분석** 그리고 [센트럴자이](/apartment/동탄역센트럴자이(A-10))와 [레이크에듀타운](/apartment/동탄더샵레이크에듀타운)과 [리슈빌](/apartment/동탄역 시범 리슈빌)과 [깨진인코딩](/apartment/%E0%A4%A) 및 **동탄더샵레이크에듀타운** 그리고 [호수권역](/zone/waterfront) **잔여토큰',
            lookup
          )}
        </div>
      );
      expect(container.textContent).not.toContain('**');
      expect(container.textContent).not.toContain('](/guide/');
      const guideLinks = container.querySelectorAll('a[data-testid="guide-inline-cross-link"]');
      expect(guideLinks.length).toBe(2);
      expect(guideLinks[0]?.getAttribute('href')).toBe('/guide/dongtan-1-vs-2-comparison');
      expect(guideLinks[1]?.getAttribute('href')).toBe('/guide/dongtan-school-zone-top-apartments');
      const aptLinks = container.querySelectorAll('a[data-testid="guide-inline-apt-link"]');
      expect(aptLinks.length).toBe(5);
      // Verify resolveCanonicalAptSlug fallback resolved '동탄역 시범 리슈빌' -> '동탄역시범리슈빌아파트' and '동탄역센트럴자이(A-10)' -> '동탄역센트럴자이A-10'
      const hrefs = Array.from(aptLinks).map((a) => decodeURIComponent(a.getAttribute('href') || ''));
      expect(hrefs).toContain('/apartment/동탄역시범리슈빌아파트');
      expect(hrefs).toContain('/apartment/동탄역센트럴자이A-10');
      unmount();
    });
  });
});
