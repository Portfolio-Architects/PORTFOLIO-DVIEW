/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import GuideArticlePage, {
  generateMetadata as generateGuideMetadata,
} from '@/app/guide/[slug]/page';
import GuideArticleContentClient, {
  type GuideArticleContentClientProps,
} from '@/components/guide/GuideArticleContentClient';
import sitemap from '@/app/sitemap';
import { GET as getFeedXml } from '@/app/feed.xml/route';
import { GET as getRssXml } from '@/app/rss.xml/route';
import {
  GUIDE_ARTICLES,
  buildGuideArticleJsonLd,
  getRelatedGuidesForGuide,
} from '@/lib/data/guides';
import {
  GUIDE_CARD_SUMMARY_MAP,
  GUIDE_CARD_TITLE_MAP,
  getGuideCardSummary,
  getGuideCardTitle,
} from '@/lib/guide/guideCardDisplay';
import {
  auditSeoSemanticContainer,
  hasVerboseProseEnding,
  measureCopyLength,
  truncateToCopyBudget,
} from '@/lib/design-system/copyDiet';
import { collectAndAuditNaverSeoReadiness } from '@/lib/seo/naverSearchAdvisorAudit';
import { recommendDviewSeoAction } from '@/lib/services/searchConsoleCtr';

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
  usePathname: () => '/guide/dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis',
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
  AdSlot: function MockAdSlot({ refreshSlotId }: { refreshSlotId: string }) {
    return <div data-testid={`mock-adslot-${refreshSlotId}`} />;
  },
}));

const TRANSFER_HUB_SLUG = 'dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis';
const RAIL_NETWORK_SLUG = 'gtx-a-tram-rail-network';
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('GTX-A 삼성역 무정차 통과(2026.11 최신 일정) 기존 가이드 2편 최신화 검증', () => {
  it('preserves canonical URLs without GTX-A cannibalization and updates metadata/FAQs/facts for both guides', async () => {
    expect(GUIDE_ARTICLES).toHaveLength(25);

    const hubArticle = GUIDE_ARTICLES.find((g) => g.slug === TRANSFER_HUB_SLUG)!;
    const railArticle = GUIDE_ARTICLES.find((g) => g.slug === RAIL_NETWORK_SLUG)!;
    expect(hubArticle).toBeDefined();
    expect(railArticle).toBeDefined();

    // Updated date synchronized to 2026-11-19 while preserving original publication date
    expect(hubArticle.date).toBe('2026-11-14');
    expect(hubArticle.updatedDate).toBe('2026-11-19');
    expect(railArticle.date).toBe('2026-10-10');
    expect(railArticle.updatedDate).toBe('2026-11-19');

    // Distinct SERP titles (anti-cannibalization) & non-truncated SERP length budgets
    expect(hubArticle.title).toContain('GTX-A 삼성역 무정차 통과');
    expect(hubArticle.seoTitle).toContain('GTX-A 삼성역 무정차 통과');
    expect(railArticle.title).toContain('트램 1·2호선');
    expect(railArticle.seoTitle).toContain('트램 1·2호선');
    expect(hubArticle.seoTitle).not.toBe(railArticle.seoTitle);
    expect(hubArticle.title).not.toBe(railArticle.title);
    for (const article of [hubArticle, railArticle]) {
      expect(article.title.length).toBeLessThanOrEqual(60);
      expect((article.seoTitle || article.title).length).toBeLessThanOrEqual(60);
      expect((article.seoDescription || article.description).length).toBeLessThanOrEqual(155);
      expect(article.description.length).toBeLessThanOrEqual(165);
      const compactH1 = truncateToCopyBudget(article.title, 'pageH1');
      expect((compactH1.match(/\(/g) || []).length).toBe((compactH1.match(/\)/g) || []).length);
    }

    // Core Nov 2026 official facts present in primary guide
    const hubSerialized = JSON.stringify(hubArticle);
    expect(EMOJI_REGEX.test(hubSerialized)).toBe(false);
    expect(hubArticle.content).toContain('영동대로 복합개발 3공구');
    expect(hubArticle.content).toContain('철근 누락');
    expect(hubArticle.content).toContain('2026년 연내 시행이 무산');
    expect(hubArticle.content).toContain('한국콘크리트학회 검증 용역');
    expect(hubArticle.content).toContain('정부합동점검단');
    expect(hubArticle.content).toContain('2026년 12월');
    expect(hubArticle.content).toContain('2027년 상반기');
    expect(hubArticle.content).toContain('영업시운전');
    expect(hubArticle.content).toContain('2028년');

    // Strengthened FAQs and JSON-LD synchronization
    expect(hubArticle.faqs?.length).toBeGreaterThanOrEqual(7);
    expect(railArticle.faqs?.length).toBeGreaterThanOrEqual(4);
    expect(hubArticle.faqs?.[0].question).toContain('무정차 통과');
    expect(railArticle.faqs?.some((f) => f.question.includes('무정차 통과'))).toBe(true);

    for (const article of [hubArticle, railArticle]) {
      const meta = await generateGuideMetadata({
        params: Promise.resolve({ slug: article.slug }),
      });
      const openGraph = meta.openGraph as { modifiedTime?: string; publishedTime?: string } | undefined;
      expect(openGraph?.modifiedTime).toBe('2026-11-19');
      expect(openGraph?.publishedTime).toBe(article.date);

      const jsonLd = buildGuideArticleJsonLd(article, 'https://dongtanview.com');
      const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
      const articleNode = graph.find((n) => n['@type'] === 'Article')!;
      const faqNode = graph.find((n) => n['@type'] === 'FAQPage')!;
      expect(articleNode.dateModified).toBe('2026-11-19');
      expect(articleNode.datePublished).toBe(article.date);
      expect((faqNode.mainEntity as unknown[]).length).toBe(article.faqs?.length);
    }

    // Bidirectional cluster related rankings
    expect(getRelatedGuidesForGuide(hubArticle, 6).map((g) => g.slug)).toContain(RAIL_NETWORK_SLUG);
    expect(getRelatedGuidesForGuide(railArticle, 6).map((g) => g.slug)).toContain(TRANSFER_HUB_SLUG);
    expect(railArticle.relatedGuideSlugs?.[0]).toBe(TRANSFER_HUB_SLUG);
  });

  it('renders both guides cleanly via SSR with bidirectional body inline cross-links, updatedDate badge, tables, zone previews, and zero markdown leaks', async () => {
    const cases = [
      {
        slug: TRANSFER_HUB_SLUG,
        expectedCrossLinkHref: `/guide/${RAIL_NETWORK_SLUG}`,
        expectedTimelineText: '2026년 12월 예정',
      },
      {
        slug: RAIL_NETWORK_SLUG,
        expectedCrossLinkHref: `/guide/${TRANSFER_HUB_SLUG}`,
        expectedTimelineText: '이르면 2027년 상반기 전망',
      },
    ] as const;

    for (const spec of cases) {
      const jsx = await GuideArticlePage({
        params: Promise.resolve({ slug: spec.slug }),
      });
      const { container, unmount } = render(jsx);

      const articleEl = container.querySelector('article');
      expect(articleEl).not.toBeNull();
      const articleText = articleEl!.textContent || '';

      // Visible updatedDate badge with semantic <time>, tabular-nums, and zero font-mono
      const updatedBadge = container.querySelector('[data-testid="guide-article-updated-date"]');
      expect(updatedBadge).not.toBeNull();
      expect(updatedBadge!.textContent?.trim()).toBe('업데이트 2026-11-19');
      expect(updatedBadge!.className).toContain('tabular-nums');
      const updatedTimeEl = updatedBadge!.querySelector('time');
      expect(updatedTimeEl?.getAttribute('datetime')).toBe('2026-11-19');
      expect(container.querySelectorAll('.font-mono')).toHaveLength(0);

      // Bidirectional body inline cross-links present
      const crossLinks = Array.from(
        container.querySelectorAll('[data-testid="guide-inline-cross-link"]')
      );
      const crossHrefs = crossLinks.map((a) => a.getAttribute('href'));
      expect(crossHrefs).toContain(spec.expectedCrossLinkHref);

      // Timeline table + domain table + live apartments table rendered cleanly with semantic <th scope="col"> & break-keep long cells
      const tables = Array.from(articleEl!.querySelectorAll('table'));
      expect(tables.length).toBeGreaterThanOrEqual(3);
      const timelineTable = tables.find((t) => (t.textContent || '').includes(spec.expectedTimelineText));
      expect(timelineTable).toBeDefined();
      const timelineHeaders = Array.from(timelineTable!.querySelectorAll('thead th'));
      expect(timelineHeaders.length).toBeGreaterThanOrEqual(3);
      for (const th of timelineHeaders) {
        expect(th.getAttribute('scope')).toBe('col');
      }
      const timelineCells = Array.from(timelineTable!.querySelectorAll('tbody td'));
      expect(timelineCells.some((td) => td.className.includes('break-keep'))).toBe(true);

      // Both section zone previews matched (no broken sectionHeadingMatch)
      const zonePreviews = container.querySelectorAll('[data-testid="guide-zone-section-preview"]');
      expect(zonePreviews.length).toBe(2);

      // In rail guide, Chapter 1 subsection (3) timeline must appear BEFORE the first zone preview (no mid-chapter split)
      if (spec.slug === RAIL_NETWORK_SLUG) {
        const timelineH4 = Array.from(articleEl!.querySelectorAll('h4')).find((h) =>
          (h.textContent || '').includes('(3) GTX-A 삼성역 무정차 통과')
        );
        expect(timelineH4).toBeDefined();
        expect(
          timelineH4!.compareDocumentPosition(zonePreviews[0]) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
      }

      // Inline apartment links should NOT falsely bind timeline/policy bold phrases
      const inlineAptLinks = Array.from(
        container.querySelectorAll('[data-testid="guide-inline-apt-link"]')
      );
      for (const link of inlineAptLinks) {
        const label = (link.textContent || '').trim();
        expect(label).not.toContain('무정차');
        expect(label).not.toContain('보강 공법');
        expect(label).not.toContain('한국콘크리트학회');
        expect(link.getAttribute('href')).toMatch(/^\/apartment\/.+/);
      }

      // Zero leaked markdown / Mermaid / emojis & valid semantic SEO container
      expect(articleText).not.toContain('**');
      expect(articleText).not.toContain(':---');
      expect(articleText).not.toContain('flowchart TD');
      expect(EMOJI_REGEX.test(articleText)).toBe(false);

      const seoAudit = auditSeoSemanticContainer(container);
      expect(seoAudit.valid).toBe(true);
      expect(seoAudit.h1Count).toBe(1);
      expect(seoAudit.adSlotsInsideAccordionCount).toBe(0);

      unmount();
    }
  });

  it('handles updatedDate edge cases cleanly in GuideArticleContentClient (omitted, whitespace-only, or equal to date)', async () => {
    // Real guide where updatedDate === date ('2026-11-14') must NOT show duplicate updated badge
    const sameDateJsx = await GuideArticlePage({
      params: Promise.resolve({
        slug: 'seoul-bundang-suwon-relocation-to-dongtan-zone-comparison',
      }),
    });
    const { container: sameDateContainer, unmount: unmountSame } = render(sameDateJsx);
    expect(sameDateContainer.querySelector('[data-testid="guide-article-updated-date"]')).toBeNull();
    unmountSame();

    // Direct client component boundary checks: undefined, whitespace-only, padded identical date
    const baseProps: GuideArticleContentClientProps = {
      article: {
        slug: 'test-slug',
        title: '테스트 가이드',
        subtitle: '테스트 서브타이틀',
        description: '테스트 설명',
        category: '교통망 심층 분석',
        date: '2026-11-14',
        updatedDate: undefined,
        readingTime: '5분',
        author: 'D-VIEW',
        keyTakeaways: ['핵심 요약'],
        tags: ['GTX-A'],
        faqs: [],
        content: '### 1. 테스트\n\n테스트 본문입니다.',
      },
      topicCluster: null,
      clusterPillars: [],
      topAcquisitionRoutes: [],
      totalGuidesCount: 23,
      isTopLandingGuide: false,
      showTopMatchupBridge: false,
      emphasizeCorporateTaxQuickBar: false,
      adsenseApprovalMode: true,
      tocSections: [],
      aptCatalog: {},
      topRepSlugs: [],
      featuredSlugs: [],
      clusterFlagshipSlugs: [],
      lakeEduSlug: null,
      primaryPreviewSlug: null,
      primaryCalcSlug: null,
      fallbackMidRepSlugs: [],
      zoneSectionConfigs: [],
      headToHeadConfigs: [],
      featuredZoneItems: [],
      minPriceStr: null,
      maxPriceStr: null,
      sameMinMaxPrice: false,
      latestVerifiedTxDate: '2026-11-14',
      clusterRelatedGuides: [],
      otherArticles: [],
      inlineAptTokenMap: {},
    };

    for (const edgeUpdatedDate of [
      undefined,
      '',
      '   ',
      ' 2026-11-14 ',
      '2026-10-31',
      'invalid-date',
      '2026-02-30',
      '2026-13-01',
    ]) {
      const { container, unmount } = render(
        <GuideArticleContentClient
          {...baseProps}
          article={{ ...baseProps.article, updatedDate: edgeUpdatedDate }}
        />
      );
      expect(container.querySelector('[data-testid="guide-article-updated-date"]')).toBeNull();
      unmount();
    }

    // Valid newer date with whitespace trims cleanly
    const { container: validContainer, unmount: unmountValid } = render(
      <GuideArticleContentClient
        {...baseProps}
        article={{ ...baseProps.article, updatedDate: ' 2026-11-19 ' }}
      />
    );
    const badge = validContainer.querySelector('[data-testid="guide-article-updated-date"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent?.trim()).toBe('업데이트 2026-11-19');
    unmountValid();
  });

  it('propagates 2026-11-19 updatedDate to sitemap, RSS/feed XML, Naver SEO audit, and Copy Diet compliant guide cards', async () => {
    // 1. Guide hub card display Copy Diet compliance
    for (const slug of [TRANSFER_HUB_SLUG, RAIL_NETWORK_SLUG]) {
      const title = getGuideCardTitle(slug, '');
      const summary = getGuideCardSummary(slug, '', '');
      expect(GUIDE_CARD_TITLE_MAP[slug]).toBe(title);
      expect(GUIDE_CARD_SUMMARY_MAP[slug]).toBe(summary);
      expect(measureCopyLength(title)).toBeLessThanOrEqual(34);
      expect(measureCopyLength(summary)).toBeLessThanOrEqual(50);
      expect(hasVerboseProseEnding(summary)).toBe(false);
    }
    expect(GUIDE_CARD_TITLE_MAP[TRANSFER_HUB_SLUG]).toContain('삼성역 무정차');

    // 2. Sitemap lastModified reflects 2026-11-19
    const sitemapEntries = await sitemap();
    for (const slug of [TRANSFER_HUB_SLUG, RAIL_NETWORK_SLUG]) {
      const entry = sitemapEntries.find((e) => e.url.endsWith(`/guide/${slug}`));
      expect(entry).toBeDefined();
      expect(new Date(entry!.lastModified as string | Date).toISOString()).toBe(
        '2026-11-19T00:00:00.000Z'
      );
    }

    // 3. RSS/feed XML pubDate and updated titles
    const [feedRes, rssRes] = await Promise.all([getFeedXml(), getRssXml()]);
    const [feedXml, rssXml] = await Promise.all([feedRes.text(), rssRes.text()]);
    for (const xml of [feedXml, rssXml]) {
      const hubItemMatch = xml.match(
        new RegExp(`<item>[\\s\\S]*?/guide/${TRANSFER_HUB_SLUG}[\\s\\S]*?</item>`)
      );
      const railItemMatch = xml.match(
        new RegExp(`<item>[\\s\\S]*?/guide/${RAIL_NETWORK_SLUG}[\\s\\S]*?</item>`)
      );
      expect(hubItemMatch).not.toBeNull();
      expect(railItemMatch).not.toBeNull();
      expect(hubItemMatch![0]).toContain('<pubDate>Thu, 19 Nov 2026 00:00:00 GMT</pubDate>');
      expect(hubItemMatch![0]).toContain('GTX-A 삼성역 무정차 통과 시기');
      expect(railItemMatch![0]).toContain('<pubDate>Thu, 19 Nov 2026 00:00:00 GMT</pubDate>');
    }

    // 4. Naver Search Advisor + GEO full readiness audit passes 6/6
    const auditReport = await collectAndAuditNaverSeoReadiness();
    expect(auditReport.passed).toBe(true);
    expect(auditReport.passedCount).toBe(6);

    // 5. Internal GSC CTR routing distinguishes GTX-A Samseong non-stop vs tram network vs Samsung semiconductor commute
    const aptKeys = ['동탄역롯데캐슬', '더샵센트럴시티', '동탄역푸르지오'];
    for (const nonstopQuery of [
      'GTX-A 삼성역 무정차 통과 시기',
      'GTX-A 삼성역 무정차 통근',
      '영동대로 복합환승센터 GTX-A 개통',
      '동탄역 GTX-A 삼성역 출퇴근',
    ]) {
      expect(
        recommendDviewSeoAction(
          { query: nonstopQuery, clicks: 0, impressions: 30, ctr: 0, position: 6 },
          aptKeys
        ).targetRoute
      ).toBe(`/guide/${TRANSFER_HUB_SLUG}`);
    }
    expect(
      recommendDviewSeoAction(
        { query: '동탄 트램 노선도 정거장', clicks: 0, impressions: 25, ctr: 0, position: 8 },
        aptKeys
      ).targetRoute
    ).toBe(`/guide/${RAIL_NETWORK_SLUG}`);
    expect(
      recommendDviewSeoAction(
        { query: '삼성전자 출퇴근 동탄 아파트', clicks: 0, impressions: 20, ctr: 0, position: 7 },
        aptKeys
      ).targetRoute
    ).toBe('/guide/dongtan-job-proximity-commuter-comparison');
  });
});
