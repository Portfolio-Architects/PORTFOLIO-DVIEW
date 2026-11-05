/**
 * @file m3_zone5_and_skeletons.test.tsx
 * @description Unit and Integration Verification Suite for Milestone 3:
 * - Feature 20: Lightweight #home-ssr-market-editorial in frontend/src/app/page.tsx
 * - Feature 21: 5-Zone Zero-CLS Skeleton Loaders in page.tsx, DashboardClient.tsx, and overview/page.tsx
 */

import React from 'react';
import { render } from '@testing-library/react';
import HomePage, { DashboardSkeleton as HomeDashboardSkeleton } from '@/app/page';
import { DashboardSkeleton as OverviewDashboardSkeleton } from '@/app/overview/page';
import { MacroDashboardSkeleton } from '@/components/DashboardClient';
import { ZONES } from '@/lib/zones';
import { GUIDE_ARTICLES } from '@/lib/data/guides';

jest.mock('@/app/globals.css', () => ({}));
jest.mock('next/font/local', () => () => ({
  variable: '--font-pretendard',
  className: 'mock-pretendard',
}));

jest.mock('@/lib/services/dashboardData', () => ({
  getInitialData: jest.fn().mockResolvedValue({
    txSummary: {
      '동탄역 롯데캐슬': { latestPrice: 160000, dong: '오산동', avg1MPrice: 155000, avg1MRentDeposit: 60000 },
      '동탄역 시범 우남퍼스트빌': { latestPrice: 110000, dong: '청계동', avg1MPrice: 105000, avg1MRentDeposit: 50000 },
    },
    recentTransactions: [
      { apartmentName: '동탄역 롯데캐슬', price: 160000, dong: '오산동', areaPyeong: 34, floor: 25, dealType: '매매', registeredDate: '2026-10-31' },
    ],
    sheetApartments: {},
    macroTrend: [],
  }),
}));

describe('Milestone 3 — Zone 5 Implementation (SSR Market Editorial & Zero-CLS Skeletons)', () => {
  const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  describe('1. Feature 20: Lightweight #home-ssr-market-editorial Invariants', () => {
    it('preserves 100% of SEO crawling text, H2, and 3 methodology H3 articles', async () => {
      const HomeJsx = await HomePage();
      const { container } = render(HomeJsx);

      const editorial = container.querySelector('#home-ssr-market-editorial');
      expect(editorial).not.toBeNull();

      // Heading structure: H2 tag check
      const h2 = editorial?.querySelector('h2');
      expect(h2).not.toBeNull();
      expect(h2?.textContent).toContain('동탄 아파트 시세·집값 추이 그래프 밸류에이션 방법론');
      expect(h2?.textContent).toContain('권역별 심층 리포트');

      // Check lead paragraph
      expect(editorial?.textContent).toContain('184개 아파트 시세');
      expect(editorial?.textContent).toContain('56개 동탄테크노밸리 지식산업센터');

      // 3 methodology H3 articles
      const h3Elements = Array.from(editorial?.querySelectorAll('h3') || []).map(
        (el) => el.textContent?.trim()
      );
      expect(h3Elements).toContain('실거주 PER 및 전세가율 하방 경직성');
      expect(h3Elements).toContain('스트레스 DSR 40% 한도 및 주담대 감응도');
      expect(h3Elements).toContain('광역 교통망(GTX-A·트램·동인선) 입지 점수');

      // Methodology paragraph text checks
      expect(editorial?.textContent).toContain('Price-to-Jeonse Ratio');
      expect(editorial?.textContent).toContain('공시가격 126% 룰');
      expect(editorial?.textContent).toContain('복합환승센터(GTX-A·SRT)');
    });

    it('preserves all 7 ZONES links with IDs and labels', async () => {
      const HomeJsx = await HomePage();
      const { container } = render(HomeJsx);

      const editorial = container.querySelector('#home-ssr-market-editorial');
      expect(editorial).not.toBeNull();

      for (const zone of ZONES) {
        const zoneLink = editorial?.querySelector(`a[href="/zone/${zone.id}"]`);
        expect(zoneLink).not.toBeNull();
        expect(zoneLink?.textContent).toContain(zone.name);
        expect(zoneLink?.textContent).toContain(zone.dongLabel);
      }
    });

    it('preserves top 10 leader apartment links', async () => {
      const HomeJsx = await HomePage();
      const { container } = render(HomeJsx);

      const editorial = container.querySelector('#home-ssr-market-editorial');
      expect(editorial).not.toBeNull();

      // Check that apartment links exist inside the editorial section
      const aptLinks = Array.from(editorial?.querySelectorAll('a[href^="/apartment/"]') || []);
      expect(aptLinks.length).toBeGreaterThan(0);
      expect(aptLinks.length).toBeLessThanOrEqual(10);

      // Verify each link has proper formatting and tabular-nums
      for (const link of aptLinks) {
        expect(link.getAttribute('href')).toMatch(/^\/apartment\/.+/);
        expect(link.textContent?.trim().length).toBeGreaterThan(0);
      }
    });

    it('preserves all curated guide article links', async () => {
      const HomeJsx = await HomePage();
      const { container } = render(HomeJsx);

      const editorial = container.querySelector('#home-ssr-market-editorial');
      expect(editorial).not.toBeNull();

      for (const guide of GUIDE_ARTICLES) {
        const guideLink = editorial?.querySelector(`a[href="/guide/${guide.slug}"]`);
        expect(guideLink).not.toBeNull();
        expect(guideLink?.textContent).toContain(guide.title);
      }
    });

    it('preserves core hub navigation links (/explore, /guide, /guide/stress-dsr-valuation-guide, /stats, /lounge, /#notification) without 404 dead links', async () => {
      const HomeJsx = await HomePage();
      const { container } = render(HomeJsx);

      const editorial = container.querySelector('#home-ssr-market-editorial');
      expect(editorial).not.toBeNull();
      expect(editorial?.querySelector('#notification')).not.toBeNull();

      const requiredHubLinks = [
        '/explore',
        '/guide',
        '/guide/stress-dsr-valuation-guide',
        '/stats',
        '/lounge',
        '/#notification',
        '/technovalley',
        '/news',
        '/about',
        '/privacy',
        '/terms',
      ];

      for (const href of requiredHubLinks) {
        const link = editorial?.querySelector(`a[href="${href}"]`);
        expect(link).not.toBeNull();
      }

      const deadLinks = ['/map', '/compare', '/calculator', '/complex-ranking', '/subscription', '/mbti'];
      for (const deadHref of deadLinks) {
        expect(editorial?.querySelector(`a[href="${deadHref}"]`)).toBeNull();
      }
    });

    it('enforces borderless soft-surface styling and zero raw unicode emojis', async () => {
      const HomeJsx = await HomePage();
      const { container } = render(HomeJsx);

      const editorial = container.querySelector('#home-ssr-market-editorial');
      expect(editorial).not.toBeNull();

      // Check soft surface container class
      const innerContainer = editorial?.firstElementChild;
      expect(innerContainer?.className).toContain('bg-elevated');
      expect(innerContainer?.className).toContain('rounded-2xl');

      // Verify no heavy dark borders or shadows
      expect(innerContainer?.className).not.toContain('rounded-3xl');
      expect(innerContainer?.className).not.toContain('shadow-sm');

      // Strict Zero-Emoji Invariant
      expect(EMOJI_REGEX.test(editorial?.textContent || '')).toBe(false);
    });
  });

  describe('2. Feature 21: 5-Zone Zero-CLS Skeleton Loaders', () => {
    it('renders HomeDashboardSkeleton with all 5 zone proportions to prevent layout shift', () => {
      const { getByTestId, queryByTestId, container } = render(<HomeDashboardSkeleton />);
      const skeleton = getByTestId('dashboard-5zone-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.className).toContain('animate-pulse');

      // Top Header: h-14 sm:h-16
      const header = container.querySelector('header');
      expect(header).not.toBeNull();
      expect(header?.querySelector('.h-14')).not.toBeNull();

      // No phantom Watchlist Bar skeleton above Hero (Zero-CLS parity with MacroDashboardClient)
      expect(container.querySelector('.min-h-\\[88px\\]')).toBeNull();

      // Zone 2A: 6:6 Circular Donut Navigator + Connected 4-Card | Trend Chart Hero (12-col grid, min-h-[526px])
      const zone2a = getByTestId('skeleton-zone2a-hero');
      expect(zone2a).toBeInTheDocument();
      expect(zone2a.className).toContain('min-h-[526px]');
      expect(zone2a.querySelectorAll('.lg\\:col-span-6').length).toBe(2);

      // Prime Hero AdSlot 1 Skeleton directly below Hero (no phantom Financial Bridge skeleton)
      expect(queryByTestId('skeleton-donut-finance-bridge')).toBeNull();
      expect(getByTestId('skeleton-hero-ad-slot-1')).toBeInTheDocument();

      // Zone 3: Timeline (min-h-[420px])
      const timeline = container.querySelector('.min-h-\\[420px\\]');
      expect(timeline).not.toBeNull();

      // Zone 4: Finance, AdSlot 2, Guides 3-Pack, and Lower 7:5 Retention Hub
      const guides3Pack = container.querySelector('.md\\:grid-cols-3');
      expect(guides3Pack).not.toBeNull();
      const zone4b = getByTestId('skeleton-zone4b-retention');
      expect(zone4b).toBeInTheDocument();
      expect(zone4b.querySelector('.lg\\:col-span-7')).not.toBeNull();
      expect(zone4b.querySelector('.lg\\:col-span-5')).not.toBeNull();

      // Zone 5: Compact soft editorial container skeleton
      const zone5 = container.querySelector('.h-\\[180px\\]');
      expect(zone5).not.toBeNull();
    });

    it('renders MacroDashboardSkeleton in DashboardClient matching 5-Zone geometry', () => {
      const { getByTestId, queryByTestId, container } = render(<MacroDashboardSkeleton />);
      const skeleton = getByTestId('macrodashboard-5zone-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.className).toContain('animate-pulse');

      // No phantom Watchlist Bar skeleton
      expect(container.querySelector('.min-h-\\[88px\\]')).toBeNull();

      // Zone 2A (6:6 Donut + Trend Hero) and Prime AdSlot 1 (no phantom Financial Bridge skeleton)
      const zone2a = getByTestId('skeleton-zone2a-hero');
      expect(zone2a).toBeInTheDocument();
      expect(zone2a.querySelectorAll('.lg\\:col-span-6').length).toBe(2);
      expect(queryByTestId('skeleton-donut-finance-bridge')).toBeNull();
      expect(getByTestId('skeleton-hero-ad-slot-1')).toBeInTheDocument();

      // Zone 3 (Timeline)
      expect(container.querySelector('.min-h-\\[420px\\]')).not.toBeNull();

      // Zone 4 (Finance + AdSlot 2 + 3 Guides + Lower 7:5 Retention Hub)
      expect(container.querySelector('.md\\:grid-cols-3')).not.toBeNull();
      const zone4b = getByTestId('skeleton-zone4b-retention');
      expect(zone4b).toBeInTheDocument();
      expect(zone4b.querySelector('.lg\\:col-span-7')).not.toBeNull();
      expect(zone4b.querySelector('.lg\\:col-span-5')).not.toBeNull();
    });

    it('renders OverviewDashboardSkeleton in overview/page.tsx matching 5-Zone geometry', () => {
      const { getByTestId, queryByTestId, container } = render(<OverviewDashboardSkeleton />);
      const skeleton = getByTestId('overview-5zone-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.className).toContain('animate-pulse');

      // No phantom Watchlist Bar skeleton
      expect(container.querySelector('.min-h-\\[88px\\]')).toBeNull();

      // Zone 2A (6:6 Donut + Trend Hero) and Prime AdSlot 1 (no phantom Financial Bridge skeleton)
      const zone2a = getByTestId('skeleton-zone2a-hero');
      expect(zone2a).toBeInTheDocument();
      expect(zone2a.querySelectorAll('.lg\\:col-span-6').length).toBe(2);
      expect(queryByTestId('skeleton-donut-finance-bridge')).toBeNull();
      expect(getByTestId('skeleton-hero-ad-slot-1')).toBeInTheDocument();

      // Zone 3 (Timeline)
      expect(container.querySelector('.min-h-\\[420px\\]')).not.toBeNull();

      // Zone 4 (Finance + AdSlot 2 + 3 Guides + Lower 7:5 Retention Hub)
      expect(container.querySelector('.md\\:grid-cols-3')).not.toBeNull();
      const zone4b = getByTestId('skeleton-zone4b-retention');
      expect(zone4b).toBeInTheDocument();
      expect(zone4b.querySelector('.lg\\:col-span-7')).not.toBeNull();
      expect(zone4b.querySelector('.lg\\:col-span-5')).not.toBeNull();

      // Zone 5
      expect(container.querySelector('.h-\\[180px\\]')).not.toBeNull();
    });
  });
});
