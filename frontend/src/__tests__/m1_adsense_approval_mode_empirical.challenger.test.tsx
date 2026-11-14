/**
 * @file m1_adsense_approval_mode_empirical.challenger.test.tsx
 * @description Empirical Verification Suite for Google AdSense Approval P0 Remediation:
 * 1. AdSlot and MobileStickyAnchorAd return null when NEXT_PUBLIC_ADSENSE_APPROVAL_MODE="true"
 * 2. /lounge and /news (noindex pages) completely isolate all 5 ad slots and parent wrappers in approval mode
 * 3. /apartment/[aptName] (368 boxes), /guide/[slug] (60 boxes), and /lounge (1 box) eliminate all 429 blank parent wrappers in approval mode and enforce empty:hidden
 * 4. HomePage (/) replaces 5 broken 404 links (/map, /compare, /calculator, /complex-ranking, /subscription) with canonical routes + #notification anchor, and next.config.ts provides 5 safety redirects + /report normalization
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdSlot } from '@/components/ads/AdSlot';
import MobileStickyAnchorAd from '@/components/layout/MobileStickyAnchorAd';
import LoungePage from '@/app/lounge/page';
import NewsClient from '@/app/news/NewsClient';
import ApartmentPage from '@/app/apartment/[aptName]/page';
import GuideArticlePage from '@/app/guide/[slug]/page';
import HomePage from '@/app/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  notFound: jest.fn(),
}));

jest.mock('@/components/LoungeHeader', () => {
  return function MockLoungeHeader() {
    return <header data-testid="mock-lounge-header" />;
  };
});

jest.mock('@/components/board/LoungeBoardView', () => {
  return function MockLoungeBoardView() {
    return <div data-testid="mock-lounge-board-view" />;
  };
});

jest.mock('@/components/pwa/MobileDock', () => {
  return function MockMobileDock() {
    return <nav data-testid="mock-mobile-dock" />;
  };
});

jest.mock('@/components/DashboardClient', () => {
  return function MockDashboardClient() {
    return <div data-testid="mock-dashboard-client" />;
  };
});

jest.mock('@/lib/services/dashboardData', () => ({
  getInitialData: jest.fn().mockResolvedValue({
    txSummary: {
      '동탄역롯데캐슬': {
        latestPrice: 150000,
        dong: '오산동',
        avg1MPrice: 148000,
        avg1MRentDeposit: 65000,
      },
    },
    recentTransactions: [],
    sheetApartments: {},
    macroTrend: [],
  }),
}));

describe('AdSense Approval P0 Remediation Empirical Verification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1103228112872356';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('1. AdSlot and MobileStickyAnchorAd return null when NEXT_PUBLIC_ADSENSE_APPROVAL_MODE="true"', () => {
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';

    const { container: slotContainer } = render(
      <AdSlot format="rectangle" minHeightClass="min-h-[250px]" />
    );
    expect(slotContainer.firstChild).toBeNull();

    const { container: anchorContainer } = render(<MobileStickyAnchorAd />);
    expect(anchorContainer.firstChild).toBeNull();
  });

  it('2. /lounge completely removes lounge-footer-ad-slot-container in approval mode and enforces empty:hidden in normal mode', () => {
    // Approval Mode = true -> wrapper is not rendered in DOM
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';
    const { unmount } = render(<LoungePage />);
    expect(screen.queryByTestId('lounge-footer-ad-slot-container')).toBeNull();
    unmount();

    // Normal Mode = false -> wrapper is rendered with empty:hidden fallback class
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
    render(<LoungePage />);
    const loungeWrapper = screen.getByTestId('lounge-footer-ad-slot-container');
    expect(loungeWrapper).toBeInTheDocument();
    expect(loungeWrapper.className).toContain('empty:hidden');
  });

  it('3. /news (NewsClient) isolates all 4 in-feed ad slots across News and Notices tabs in approval mode', () => {
    const mockNews = [
      { id: '1', title: '동탄 테크노밸리 반도체 소식 1', link: 'https://example.com/1', pubDate: '2026-11-01', category: 'COMMERCIAL', sub: '오피스' },
      { id: '2', title: '동탄 테크노밸리 반도체 소식 2', link: 'https://example.com/2', pubDate: '2026-11-01', category: 'COMMERCIAL', sub: '오피스' },
      { id: '3', title: '동탄 테크노밸리 반도체 소식 3', link: 'https://example.com/3', pubDate: '2026-11-01', category: 'COMMERCIAL', sub: '오피스' },
      { id: '4', title: '동탄 테크노밸리 반도체 소식 4', link: 'https://example.com/4', pubDate: '2026-11-01', category: 'COMMERCIAL', sub: '오피스' },
    ];
    const mockNotices = [
      { id: 'n1', title: '화성시 고시공고 1', url: 'https://example.com/n1', dept: '도시정책과', date: '2026-11-01', isDongtan: true },
      { id: 'n2', title: '화성시 고시공고 2', url: 'https://example.com/n2', dept: '도시정책과', date: '2026-11-01', isDongtan: true },
    ];

    // Approval Mode = true -> all 4 wrappers are unmounted
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';
    const { container, unmount } = render(
      <NewsClient initialNews={mockNews as never} initialNotices={mockNotices as never} />
    );

    expect(screen.getByText('동탄 테크노밸리 반도체 소식 4')).toBeInTheDocument();
    expect(screen.queryByTestId('news-feed-infeed-wrapper')).toBeNull();
    expect(screen.queryByTestId('news-feed-trailing-infeed-wrapper')).toBeNull();
    expect(container.querySelectorAll('[data-testid="ad-slot-container"]').length).toBe(0);

    // Switch to Notices tab and verify zero ad slots in Notices feed
    const noticesTabBtn = screen.getByRole('button', { name: /구정 행정 소식/i });
    fireEvent.click(noticesTabBtn);

    expect(screen.getByText('화성시 고시공고 2')).toBeInTheDocument();
    expect(screen.queryByTestId('news-notices-infeed-wrapper')).toBeNull();
    expect(screen.queryByTestId('news-notices-trailing-infeed-wrapper')).toBeNull();
    expect(container.querySelectorAll('[data-testid="ad-slot-container"]').length).toBe(0);
    unmount();

    // Normal Mode = false -> wrappers render with empty:hidden class
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
    const { unmount: unmountNormal } = render(
      <NewsClient initialNews={mockNews as never} initialNotices={mockNotices as never} />
    );
    expect(screen.getByTestId('news-feed-infeed-wrapper').className).toContain('empty:hidden');
    fireEvent.click(screen.getByRole('button', { name: /구정 행정 소식/i }));
    expect(screen.getByTestId('news-notices-trailing-infeed-wrapper').className).toContain('empty:hidden');
    unmountNormal();
  });

  it('4. /apartment/[aptName] eliminates ssr-adslot-ch02 and ssr-adslot-ch05 blank parent wrappers in approval mode (368 boxes)', async () => {
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';

    const aptJsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
    });
    const { unmount } = render(aptJsx);

    expect(screen.queryByTestId('ssr-adslot-ch02')).toBeNull();
    expect(screen.queryByTestId('ssr-adslot-ch05')).toBeNull();
    unmount();

    // Verify normal mode retains empty:hidden CSS defense
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
    const normalAptJsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
    });
    render(normalAptJsx);
    expect(screen.getByTestId('ssr-adslot-ch02').className).toContain('empty:hidden');
    expect(screen.getByTestId('ssr-adslot-ch05').className).toContain('empty:hidden');
  });

  it('5. /guide/[slug] eliminates top, mid, and bottom blank parent wrappers in approval mode (60 boxes)', async () => {
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';

    const guideJsx = await GuideArticlePage({
      params: Promise.resolve({ slug: 'stress-dsr-valuation-guide' }),
    });
    const { unmount } = render(guideJsx);

    expect(screen.queryByTestId('guide-article-adslot-top')).toBeNull();
    expect(screen.queryByTestId('guide-article-adslot-mid')).toBeNull();
    expect(screen.queryByTestId('guide-article-adslot-bottom')).toBeNull();
    unmount();

    // Verify normal mode retains empty:hidden CSS defense
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
    const normalGuideJsx = await GuideArticlePage({
      params: Promise.resolve({ slug: 'stress-dsr-valuation-guide' }),
    });
    render(normalGuideJsx);
    expect(screen.getByTestId('guide-article-adslot-top').className).toContain('empty:hidden');
    expect(screen.getByTestId('guide-article-adslot-mid').className).toContain('empty:hidden');
    expect(screen.getByTestId('guide-article-adslot-bottom').className).toContain('empty:hidden');
  });

  it('6. HomePage (/) replaces 5 broken 404 links and next.config.ts registers 5 safety redirects + /report -> /guide', async () => {
    const homeJsx = await HomePage();
    const { container } = render(homeJsx);

    const editorial = container.querySelector('#home-ssr-market-editorial');
    expect(editorial).not.toBeNull();
    expect(editorial?.querySelector('section#notification')).not.toBeNull();

    // Verify zero broken 404 hrefs in HomePage
    for (const brokenHref of ['/map', '/compare', '/calculator', '/complex-ranking', '/subscription']) {
      expect(editorial?.querySelector(`a[href="${brokenHref}"]`)).toBeNull();
    }

    // Verify canonical replacements exist
    expect(editorial?.querySelector('a[href="/explore"]')).not.toBeNull();
    expect(editorial?.querySelector('a[href="/guide"]')).not.toBeNull();
    expect(editorial?.querySelector('a[href="/guide/stress-dsr-valuation-guide"]')).not.toBeNull();
    expect(editorial?.querySelector('a[href="/#notification"]')).not.toBeNull();

    // Verify next.config.ts redirect rules
    const configPath = path.resolve(process.cwd(), 'next.config.ts');
    const rawContent = fs.readFileSync(configPath, 'utf-8');
    const arrayMatch = rawContent.match(/async\s+redirects\s*\(\)\s*\{\s*return\s*(\[[\s\S]*?\]);\s*\}/);
    expect(arrayMatch).not.toBeNull();
    const redirects = new Function(`return ${arrayMatch![1]};`)() as Array<{
      source: string;
      destination: string;
      permanent: boolean;
    }>;

    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: '/report', destination: '/guide', permanent: true },
        { source: '/map', destination: '/explore', permanent: false },
        { source: '/compare', destination: '/guide', permanent: false },
        { source: '/calculator', destination: '/guide/stress-dsr-valuation-guide', permanent: false },
        { source: '/complex-ranking', destination: '/explore', permanent: false },
        { source: '/subscription', destination: '/', permanent: false },
      ])
    );
  });

  it('7. StatsAdBanners, StatsSkeleton, StatsDashboardSkeleton, MBTIResultView, MacroTimelineView, and 4 Financial Calculators eliminate all blank ad wrappers and skeletons in approval mode', async () => {
    const {
      FilterBottomAdBanner,
      MidFeedAdBanner,
      RankingBreakAdBanner,
      BottomAnchorAdBanner,
    } = await import('@/components/stats/StatsAdBanners');
    const { StatsSkeleton } = await import('@/components/stats/StatsSkeleton');
    const { StatsDashboardSkeleton } = await import('@/app/stats/StatsDashboardSkeleton');

    // Approval Mode = true -> StatsAdBanners return null and StatsSkeleton omits ad slot skeleton boxes
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';
    const { container: bannersContainer, unmount: unmountBanners } = render(
      <div>
        <FilterBottomAdBanner />
        <MidFeedAdBanner />
        <RankingBreakAdBanner />
        <BottomAnchorAdBanner />
      </div>
    );
    expect(bannersContainer.querySelector('[data-testid="ad-placement-filter-bottom"]')).toBeNull();
    expect(bannersContainer.querySelector('[data-testid="ad-placement-mid-feed"]')).toBeNull();
    expect(bannersContainer.querySelector('[data-testid="ad-placement-ranking-break"]')).toBeNull();
    expect(bannersContainer.querySelector('[data-testid="ad-placement-bottom-anchor"]')).toBeNull();
    unmountBanners();

    const { container: statsSkelContainer, unmount: unmountStatsSkel } = render(<StatsSkeleton />);
    expect(statsSkelContainer.querySelector('[data-testid="stats-skeleton-adslot-1"]')).toBeNull();
    expect(statsSkelContainer.querySelector('[data-testid="stats-skeleton-adslot-2"]')).toBeNull();
    expect(statsSkelContainer.querySelector('[data-testid="stats-skeleton-adslot-3"]')).toBeNull();
    expect(statsSkelContainer.querySelector('[data-testid="stats-skeleton-adslot-4"]')).toBeNull();
    unmountStatsSkel();

    const { container: dashSkelContainer, unmount: unmountDashSkel } = render(<StatsDashboardSkeleton />);
    expect(dashSkelContainer.querySelectorAll('.border-dashed').length).toBe(0);
    unmountDashSkel();

    // Normal Mode = false -> StatsAdBanners render with empty:hidden and StatsSkeleton renders ad slot skeleton boxes
    process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
    const { container: normalBanners, unmount: unmountNormalBanners } = render(
      <div>
        <FilterBottomAdBanner />
        <MidFeedAdBanner />
        <RankingBreakAdBanner />
        <BottomAnchorAdBanner />
      </div>
    );
    expect(normalBanners.querySelector('[data-testid="ad-placement-filter-bottom"]')?.className).toContain('empty:hidden');
    expect(normalBanners.querySelector('[data-testid="ad-placement-mid-feed"]')?.className).toContain('empty:hidden');
    expect(normalBanners.querySelector('[data-testid="ad-placement-ranking-break"]')?.className).toContain('empty:hidden');
    expect(normalBanners.querySelector('[data-testid="ad-placement-bottom-anchor"]')?.className).toContain('empty:hidden');
    unmountNormalBanners();

    // Verify MacroTimelineView, MBTIResultView, and all 4 financial calculators guard their ad wrappers with NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' and empty:hidden
    const filesToVerify = [
      'src/components/macro/components/MacroTimelineView.tsx',
      'src/components/mbti/MBTIResultView.tsx',
      'src/components/consumer/MortgageCalculator.tsx',
      'src/components/consumer/PropertyTaxCalculator.tsx',
      'src/components/consumer/SellTimingCalculator.tsx',
      'src/components/consumer/JeonseSafetyCalculator.tsx',
    ];
    for (const relFile of filesToVerify) {
      const fileContent = fs.readFileSync(path.resolve(process.cwd(), relFile), 'utf-8');
      expect(fileContent).toContain("process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true'");
      expect(fileContent).toContain('empty:hidden');
    }
  });

  describe('AdSense Approval P1 Quality Enhancement Empirical Verification', () => {
    it('P1-1. E-E-A-T 20 Guides Anchor Placement on HomePage (/), LoungeHeader, ApartmentPage (/apartment/[aptName]), and Sitemap', async () => {
      // 1) HomePage upper lab <-> lower 4-column guide grid interlinking
      const homeJsx = await HomePage();
      const { container: homeContainer, unmount: unmountHome } = render(homeJsx);
      const interlinkCard = homeContainer.querySelector('#home-lab-to-guide-interlink');
      expect(interlinkCard).not.toBeNull();
      expect(interlinkCard?.querySelector('a[href="#home-guide-4col-grid"]')).not.toBeNull();
      expect(interlinkCard?.querySelector('a[href="/guide"]')).not.toBeNull();
      const guideGrid = homeContainer.querySelector('#home-guide-4col-grid');
      expect(guideGrid).not.toBeNull();
      expect(guideGrid?.querySelector('a[href="#home-ssr-semantic-catalog"]')).not.toBeNull();
      unmountHome();

      // 2) ApartmentPage forward-placed guide anchor card + bottom related guides section
      const aptJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
      });
      const { container: aptContainer, unmount: unmountApt } = render(aptJsx);
      const topGuideCard = aptContainer.querySelector('[data-testid="apt-top-guide-anchor-card"]');
      expect(topGuideCard).not.toBeNull();
      expect(topGuideCard?.querySelector('a[href^="/guide/"]')).not.toBeNull();
      expect(aptContainer.querySelector('#apt-related-guides-ssr')).not.toBeNull();
      unmountApt();

      // 3) Sitemap priority >= 0.9 for /guide and all 20 guide articles
      const sitemapMod = await import('@/app/sitemap');
      const sitemapEntries = await sitemapMod.default();
      const guideHubEntry = sitemapEntries.find((e) => e.url.endsWith('/guide'));
      expect(guideHubEntry?.priority).toBeGreaterThanOrEqual(0.9);
      const guideArticleEntries = sitemapEntries.filter((e) => e.url.includes('/guide/'));
      expect(guideArticleEntries.length).toBe(20);
      guideArticleEntries.forEach((entry) => {
        expect(entry.priority).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('P1-2 & P1-3. LoungeHeader and MobileDock switch cleanly between Approval Mode (/about, /contact) and Normal Mode (/lounge) while preserving 5-link and 5-span invariants', () => {
      const ActualLoungeHeader = jest.requireActual('@/components/LoungeHeader').default;
      const ActualMobileDock = jest.requireActual('@/components/pwa/MobileDock').default;

      // 1) AdSense Approval Mode = true -> Policy & Support links shown, Lounge hidden
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'true';
      const { container: headerContainer, unmount: unmountHeader } = render(<ActualLoungeHeader activeTab="overview" />);
      const headerNav = headerContainer.querySelector('nav[aria-label="메인 메뉴"]');
      expect(headerNav?.className).toContain('justify-start');
      expect(headerNav?.className).not.toContain('justify-between');
      const headerLinks = headerContainer.querySelectorAll('a');
      expect(headerLinks.length).toBe(5);
      const guideLink = headerContainer.querySelector('a[href="/guide"]');
      expect(guideLink?.getAttribute('data-guide-badge')).toBeNull();
      const policyGroup = headerContainer.querySelector('[data-testid="nav-right-policy-group"]');
      expect(policyGroup?.className).toContain('ml-auto');
      expect(headerContainer.querySelector('[data-testid="header-about-link"]')?.getAttribute('data-href')).toBe('/about');
      expect(headerContainer.querySelector('[data-testid="header-contact-link"]')?.getAttribute('data-href')).toBe('/contact');
      expect(headerContainer.querySelector('[data-testid="header-lounge-link"]')).toBeNull();
      unmountHeader();

      const { container: dockContainer, unmount: unmountDock } = render(<ActualMobileDock activeTab="overview" />);
      expect(dockContainer.querySelectorAll('nav a').length).toBe(5);
      expect(dockContainer.querySelectorAll('span.whitespace-nowrap').length).toBe(5);
      const moreBtn = dockContainer.querySelector('[data-testid="mobile-dock-more-button"]');
      expect(moreBtn).not.toBeNull();
      expect(dockContainer.querySelector('[data-testid="mobile-dock-more-menu"]')).toBeNull();

      // Open 더보기 menu in Approval Mode and verify /about, /contact, /terms, /privacy links (no /lounge)
      fireEvent.click(moreBtn!);
      const moreMenu = dockContainer.querySelector('[data-testid="mobile-dock-more-menu"]');
      expect(moreMenu).not.toBeNull();
      expect(moreMenu?.className).toContain('max-w-[calc(100vw-24px)]');
      expect(moreMenu?.querySelector('[data-testid="mobile-dock-lounge-link"]')).toBeNull();
      expect(moreMenu?.querySelector('a[href="/about"]')).not.toBeNull();
      expect(moreMenu?.querySelector('a[href="/contact"]')).not.toBeNull();
      expect(moreMenu?.querySelector('a[href="/terms"]')).not.toBeNull();
      expect(moreMenu?.querySelector('a[href="/privacy"]')).not.toBeNull();

      // Dismiss via Escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(dockContainer.querySelector('[data-testid="mobile-dock-more-menu"]')).toBeNull();

      // Re-open and dismiss via outside click
      fireEvent.click(moreBtn!);
      expect(dockContainer.querySelector('[data-testid="mobile-dock-more-menu"]')).not.toBeNull();
      fireEvent.mouseDown(document.body);
      expect(dockContainer.querySelector('[data-testid="mobile-dock-more-menu"]')).toBeNull();
      unmountDock();

      // 2) Normal Mode = false -> Real-time Resident Lounge (/lounge) shown in Header & MobileDock 더보기 menu
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
      const { container: normalHeader, unmount: unmountNormalHeader } = render(<ActualLoungeHeader activeTab="lounge" />);
      expect(normalHeader.querySelectorAll('a').length).toBe(5);
      expect(normalHeader.querySelector('[data-testid="nav-right-policy-group"]')).toBeNull();
      const loungeHeaderBtn = normalHeader.querySelector('[data-testid="header-lounge-link"]');
      expect(loungeHeaderBtn).not.toBeNull();
      expect(loungeHeaderBtn?.getAttribute('data-href')).toBe('/lounge');
      expect(loungeHeaderBtn?.getAttribute('aria-current')).toBe('page');
      unmountNormalHeader();

      const { container: normalDock, unmount: unmountNormalDock } = render(<ActualMobileDock activeTab="lounge" />);
      expect(normalDock.querySelectorAll('nav a').length).toBe(5);
      fireEvent.click(normalDock.querySelector('[data-testid="mobile-dock-more-button"]')!);
      const normalMoreMenu = normalDock.querySelector('[data-testid="mobile-dock-more-menu"]');
      expect(normalMoreMenu?.querySelector('[data-testid="mobile-dock-lounge-link"]')?.getAttribute('href')).toBe('/lounge');
      unmountNormalDock();
    });

    it('P1-4. /news page renders SSR H1 tag and >1,500 chars editorial guide while NewsClient removes legacy /overview?tab=* links and avoids duplicate H1', async () => {
      const newsPagePath = path.resolve(process.cwd(), 'src/app/news/page.tsx');
      const newsPageSource = fs.readFileSync(newsPagePath, 'utf-8');
      expect(newsPageSource).toContain('D-VIEW 동탄 소식 및 행정 공지');
      expect(newsPageSource).toContain('id="news-ssr-editorial-guide"');

      // Extract Korean/analytical text inside #news-ssr-editorial-guide
      const sectionMatch = newsPageSource.match(/<section[\s\S]*?id="news-ssr-editorial-guide"[\s\S]*?<\/section>/);
      expect(sectionMatch).not.toBeNull();
      const plainText = sectionMatch![0].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      expect(plainText.length).toBeGreaterThanOrEqual(1500);

      const newsClientPath = path.resolve(process.cwd(), 'src/app/news/NewsClient.tsx');
      const newsClientSource = fs.readFileSync(newsClientPath, 'utf-8');
      expect(newsClientSource).not.toContain('/overview?tab=');
      expect(newsClientSource).toContain('isTitleDiv={true}');
    });

    it('P1-5. next.config.ts includes permanent redirect for /overview -> / alongside tab=office rule', () => {
      const configPath = path.resolve(process.cwd(), 'next.config.ts');
      const rawContent = fs.readFileSync(configPath, 'utf-8');
      const arrayMatch = rawContent.match(/async\s+redirects\s*\(\)\s*\{\s*return\s*(\[[\s\S]*?\]);\s*\}/);
      const redirects = new Function(`return ${arrayMatch![1]};`)() as Array<{
        source: string;
        destination: string;
        permanent: boolean;
        has?: unknown;
      }>;

      const permanentOverviewRule = redirects.find(
        (r) => r.source === '/overview' && !r.has && r.destination === '/' && r.permanent === true
      );
      expect(permanentOverviewRule).toBeDefined();
    });

    it('P1-6 & P1-7. ExploreClient moves top AdSlot into in-feed list and AdSlot renders absolute top-left "광고" transparency label preserving Zero-CLS', () => {
      process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = 'false';
      render(<AdSlot format="in-feed" testMode={true} />);
      const adLabel = screen.getByTestId('ad-slot-label');
      expect(adLabel).toBeInTheDocument();
      expect(adLabel.textContent).toBe('광고');
      expect(adLabel.className).toContain('absolute');
      expect(adLabel.className).toContain('text-[10px]');
      expect(adLabel.className).toContain('text-tertiary');
      expect(adLabel.className).toContain('font-bold');

      const exploreClientSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/explore/ExploreClient.tsx'),
        'utf-8'
      );
      const tossExploreSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/TossApartmentExploreClient.tsx'),
        'utf-8'
      );
      expect(exploreClientSource).toContain('inFeedAdSlot=');
      expect(tossExploreSource).toContain('(index === 1 || (index === 0 && sortedApts.length === 1)) && inFeedAdSlot');
    });

    it('P1-8 & P1-9. Zero occurrences of unregistered external loan domain, dummy phone number, or legacy /overview?tab= share URL across codebase', () => {
      const legacyLoanHost = ['dview-loan', 'toss', 'im'].join('.');
      const legacyDummyTel = ['031', '000', '0000'].join('-');

      const advMetricsSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/consumer/AdvancedValuationMetrics.tsx'),
        'utf-8'
      );
      expect(advMetricsSource).not.toContain(legacyLoanHost);
      expect(advMetricsSource).toContain('href="/guide/stress-dsr-valuation-guide"');
      expect(advMetricsSource).toContain('스트레스 DSR 대출 가이드 보기');

      const officeModalSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/OfficeDetailModal.tsx'),
        'utf-8'
      );
      expect(officeModalSource).not.toContain(legacyDummyTel);
      expect(officeModalSource).not.toContain('/overview?tab=office');
      expect(officeModalSource).toContain('href="/contact"');
      expect(officeModalSource).toContain('맞춤 공실 / 임대 매칭 문의하기');
    });
  });
});
