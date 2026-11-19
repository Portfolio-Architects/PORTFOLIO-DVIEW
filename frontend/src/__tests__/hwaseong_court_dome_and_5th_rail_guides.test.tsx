/**
 * @jest-environment jsdom
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, fireEvent } from '@testing-library/react';
import GuideArticlePage, {
  generateMetadata as generateGuideMetadata,
} from '@/app/guide/[slug]/page';
import NewsClient from '@/app/news/NewsClient';
import sitemap from '@/app/sitemap';
import { GET as getFeedXml } from '@/app/feed.xml/route';
import { GET as getRssXml } from '@/app/rss.xml/route';
import {
  GUIDE_ARTICLES,
  GUIDE_TOPIC_CLUSTERS,
  buildGuideArticleJsonLd,
  buildGuideAptMiniPreview,
  getRelatedGuidesForGuide,
} from '@/lib/data/guides';
import {
  GUIDE_CARD_SUMMARY_MAP,
  GUIDE_CARD_TITLE_MAP,
  getCompactGuideCategory,
  getGuideCardSummary,
  getGuideCardTitle,
} from '@/lib/guide/guideCardDisplay';
import {
  hasVerboseProseEnding,
  measureCopyLength,
  truncateToCopyBudget,
} from '@/lib/design-system/copyDiet';
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
  usePathname: () => '/news',
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

const DOME_COURT_SLUG = 'byeongjeom-dome-stadium-hwaseong-court-dongtan-impact';
const RAIL_5TH_SLUG = 'dongtan-bundang-sinbundang-semiconductor-line-5th-rail-plan';
const GTX_HUB_SLUG = 'dongtan-station-transfer-hub-gtx-a-samseong-commute-analysis';
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe('화성시법원·병점 돔구장 및 분당선·신분당선·5차 철도망 반도체선 신규 가이드 & 필터 통합 검증', () => {
  it('registers both new guides (#24, #25) in GUIDE_ARTICLES, topic cluster, Copy Diet maps, sitemap, and RSS/Feed', async () => {
    expect(GUIDE_ARTICLES).toHaveLength(25);

    const domeCourt = GUIDE_ARTICLES.find((g) => g.slug === DOME_COURT_SLUG)!;
    const rail5th = GUIDE_ARTICLES.find((g) => g.slug === RAIL_5TH_SLUG)!;
    expect(domeCourt).toBeDefined();
    expect(rail5th).toBeDefined();

    // Cluster & cross-linking integrity
    const railCluster = GUIDE_TOPIC_CLUSTERS.find((c) => c.id === 'rail-urban-infra-cluster')!;
    expect(railCluster.guideSlugs).toContain(DOME_COURT_SLUG);
    expect(railCluster.guideSlugs).toContain(RAIL_5TH_SLUG);

    for (const article of [domeCourt, rail5th]) {
      expect(article.date).toBe('2026-11-19');
      expect(article.updatedDate).toBe('2026-11-19');
      expect(article.title.length).toBeLessThanOrEqual(60);
      expect((article.seoTitle || article.title).length).toBeLessThanOrEqual(60);
      expect((article.seoDescription || article.description).length).toBeLessThanOrEqual(155);
      expect(article.description.length).toBeLessThanOrEqual(165);
      expect(EMOJI_REGEX.test(JSON.stringify(article))).toBe(false);
      expect(article.faqs?.length).toBeGreaterThanOrEqual(4);

      // Copy Diet card display maps
      expect(GUIDE_CARD_TITLE_MAP[article.slug]).toBeDefined();
      expect(GUIDE_CARD_SUMMARY_MAP[article.slug]).toBeDefined();
      const cardTitle = getGuideCardTitle(article.slug, article.title);
      const cardSummary = getGuideCardSummary(article.slug, article.subtitle, article.description);
      expect(hasVerboseProseEnding(cardTitle)).toBe(false);
      expect(hasVerboseProseEnding(cardSummary)).toBe(false);
      expect(measureCopyLength(getCompactGuideCategory(article.category))).toBeLessThanOrEqual(10);
      const compactH1 = truncateToCopyBudget(article.title, 'pageH1');
      expect((compactH1.match(/\(/g) || []).length).toBe((compactH1.match(/\)/g) || []).length);

      // Every featured apartment resolves to verified MOLIT real-transaction data (> 0)
      for (const aptKey of article.featuredApartments || []) {
        const preview = buildGuideAptMiniPreview(aptKey);
        expect(preview).not.toBeNull();
        expect(preview!.latestPrice).toBeGreaterThan(0);
      }

      // Related guides include sibling GTX-A hub in Top-6
      const topRelated = getRelatedGuidesForGuide(article, 6).map((g) => g.slug);
      expect(topRelated).toContain(GTX_HUB_SLUG);

      // Metadata & JSON-LD checks
      const meta = await generateGuideMetadata({
        params: Promise.resolve({ slug: article.slug }),
      });
      expect(meta.title).toBe(article.seoTitle);
      expect(meta.description).toBe(article.seoDescription);
      const jsonLd = buildGuideArticleJsonLd(article, 'https://dongtanview.com');
      const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
      expect(graph.some((n) => n['@type'] === 'Article')).toBe(true);
      expect(graph.some((n) => n['@type'] === 'FAQPage')).toBe(true);
    }

    // Balanced, fact-checked core assertions
    expect(domeCourt.content).toContain('병점동 893번지');
    expect(domeCourt.content).toContain('2032년 3월 1일 개원 목표');
    expect(domeCourt.content).toContain('공모 심사 중 (미확정)');
    expect(domeCourt.content).toContain('평택시');
    expect(domeCourt.content).toContain('약 84%가 사유지');

    expect(rail5th.content).toContain('기흥~동탄2~오산대');
    expect(rail5th.content).toContain('호매실~봉담');
    expect(rail5th.content).toContain('2026년 12월 말');
    expect(rail5th.content).toContain('등록 17개 단지 중 최근 유가 매매 단지가 2곳');
    expect(rail5th.content).toContain('반도체고속도로');
    expect(rail5th.content).toContain('JTX');

    // Sitemap & RSS/Feed exposure
    const sitemapEntries = await sitemap({ id: 0 });
    expect(sitemapEntries).toHaveLength(183);
    expect(sitemapEntries.some((e) => e.url.endsWith(`/guide/${DOME_COURT_SLUG}`))).toBe(true);
    expect(sitemapEntries.some((e) => e.url.endsWith(`/guide/${RAIL_5TH_SLUG}`))).toBe(true);

    const [feedRes, rssRes] = await Promise.all([getFeedXml(), getRssXml()]);
    const [feedXml, rssXml] = await Promise.all([feedRes.text(), rssRes.text()]);
    expect(feedXml).toContain(`/guide/${DOME_COURT_SLUG}`);
    expect(feedXml).toContain(`/guide/${RAIL_5TH_SLUG}`);
    expect(rssXml).toContain(`/guide/${DOME_COURT_SLUG}`);
    expect(rssXml).toContain(`/guide/${RAIL_5TH_SLUG}`);
  });

  it('renders both new SSR guide pages cleanly with Zero-CLS slots, tables, FAQs, and zero font-mono', async () => {
    for (const slug of [DOME_COURT_SLUG, RAIL_5TH_SLUG]) {
      const PageJsx = await GuideArticlePage({
        params: Promise.resolve({ slug }),
      });
      const { container, unmount } = render(PageJsx);
      expect(container.querySelectorAll('.font-mono')).toHaveLength(0);
      expect(container.querySelector('#guide-article-body')).not.toBeNull();
      expect(container.querySelector('#guide-head-to-head-comparison')).not.toBeNull();
      expect(container.querySelector('#guide-faq-section')).not.toBeNull();
      expect(container.querySelectorAll('table').length).toBeGreaterThanOrEqual(2);
      expect(container.textContent).not.toContain('```');
      expect(container.textContent).not.toContain('**');
      unmount();
    }
  });

  it('routes GSC search queries accurately to both new guides without hijacking GTX-A 삼성역 무정차 routing', () => {
    const queryRow = (query: string) => ({
      query,
      clicks: 0,
      impressions: 120,
      ctr: 0,
      position: 9.5,
    });

    const domeRec = recommendDviewSeoAction(queryRow('병점역 돔구장 위치 공청회'));
    expect(domeRec.targetRoute).toBe(`/guide/${DOME_COURT_SLUG}`);

    const courtRec = recommendDviewSeoAction(queryRow('화성시법원 병점복합타운 개원'));
    expect(courtRec.targetRoute).toBe(`/guide/${DOME_COURT_SLUG}`);

    const bundangRec = recommendDviewSeoAction(queryRow('분당선 연장 기흥 동탄 오산 예타'));
    expect(bundangRec.targetRoute).toBe(`/guide/${RAIL_5TH_SLUG}`);

    const sinbundangRec = recommendDviewSeoAction(queryRow('신분당선 연장 호매실 봉담 4차 철도망'));
    expect(sinbundangRec.targetRoute).toBe(`/guide/${RAIL_5TH_SLUG}`);

    const semiRailRec = recommendDviewSeoAction(queryRow('반도체선 5차 국가철도망 동탄 남사'));
    expect(semiRailRec.targetRoute).toBe(`/guide/${RAIL_5TH_SLUG}`);

    const jtxRec = recommendDviewSeoAction(queryRow('JTX 동탄지선 민자적격성'));
    expect(jtxRec.targetRoute).toBe(`/guide/${RAIL_5TH_SLUG}`);

    // Non-regression: GTX-A 삼성역 무정차 still routes to GTX transfer hub guide
    const gtxNonstopRec = recommendDviewSeoAction(queryRow('GTX-A 삼성역 무정차 통과 시기'));
    expect(gtxNonstopRec.targetRoute).toBe(`/guide/${GTX_HUB_SLUG}`);
  });

  it('classifies 반도체선/국가철도망 news under 부동산 & 정책 tab rather than 테크노밸리 & 산업 in NewsClient', () => {
    const sampleNews = [
      {
        id: 1,
        category: '부동산',
        sub: '경기일보',
        title: '반도체선 제5차 국가철도망 구축계획 반영 총력전',
        link: 'https://example.com/1',
        pubDate: '2026-11-19',
      },
      {
        id: 2,
        category: '산업',
        sub: '한국경제',
        title: '삼성전자 화성·용인 반도체 파운드리 라인 증설 발표',
        link: 'https://example.com/2',
        pubDate: '2026-11-19',
      },
    ];

    const { container, getByRole, unmount } = render(
      <NewsClient initialNews={sampleNews} initialNotices={[]} />
    );

    const realEstateTab = getByRole('button', { name: /부동산 & 정책/ });
    fireEvent.click(realEstateTab);
    expect(container.textContent).toContain('반도체선 제5차 국가철도망 구축계획 반영 총력전');
    expect(container.textContent).not.toContain('삼성전자 화성·용인 반도체 파운드리 라인 증설 발표');

    const industryTab = getByRole('button', { name: /테크노밸리 & 산업/ });
    fireEvent.click(industryTab);
    expect(container.textContent).toContain('삼성전자 화성·용인 반도체 파운드리 라인 증설 발표');
    expect(container.textContent).not.toContain('반도체선 제5차 국가철도망 구축계획 반영 총력전');

    unmount();
  });

  it('keeps 병점·진안 송산동 exception and dynamic GUIDE_ARTICLES.length across notice/news filter layers', () => {
    const rootDir = process.cwd();
    const cronSrc = fs.readFileSync(
      path.join(rootDir, 'src/app/api/cron/sync-local-notices/route.ts'),
      'utf8'
    );
    const repoSrc = fs.readFileSync(
      path.join(rootDir, 'src/lib/repositories/news.repository.ts'),
      'utf8'
    );
    const macroSrc = fs.readFileSync(
      path.join(rootDir, 'src/components/MacroDashboardClient.tsx'),
      'utf8'
    );
    const newsPageSrc = fs.readFileSync(path.join(rootDir, 'src/app/news/page.tsx'), 'utf8');

    expect(cronSrc).toContain('isByeongjeomSongsanDong');
    expect(cronSrc).toContain('반도체선');
    expect(cronSrc).toContain('화성시법원');
    expect(repoSrc).toContain('isByeongjeomSongsanDong');
    expect(macroSrc).toContain('isByeongjeomSongsanDong');
    expect(macroSrc).toContain('반도체선');
    expect(newsPageSrc).toContain('GUIDE_ARTICLES.length');
    expect(newsPageSrc).not.toContain('23편의 동탄 권역별');
  });
});
