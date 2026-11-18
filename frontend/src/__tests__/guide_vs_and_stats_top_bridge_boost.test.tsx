/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, within, renderHook, act } from '@testing-library/react';
import txSummaryRaw from '../../public/data/tx-summary.json';
import apartmentsByDongRaw from '../../public/data/apartments-by-dong.json';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/types/transaction';
import {
  computeUndervaluedComplexes,
  getDongtanStationAnalysisData,
} from '@/lib/stats/dongtanStationDistanceEngine';
import type { ApartmentStatRecord } from '@/lib/stats/types';
import { StatsUndervaluedTopBridge } from '@/components/stats/StatsUndervaluedTopBridge';
import {
  GuideTopMatchupBridge,
  formatMatchupPriceGapText,
  type ResolvedGuideHeadToHeadRow,
} from '@/components/guide/GuideTopMatchupBridge';
import { useAptComparison } from '@/components/consumer/hooks/useAptComparison';
import StatsPage from '@/app/stats/page';
import { StatsPageClient } from '@/app/stats/StatsPageClient';
import GuideArticlePage from '@/app/guide/[slug]/page';
import { GUIDE_ARTICLES, buildGuideAptMiniPreview } from '@/lib/data/guides';
import { auditSeoSemanticContainer, checkCopyBudget } from '@/lib/design-system/copyDiet';
import * as analytics from '@/lib/utils/analytics';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/stats',
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
  AdSlot: ({
    slotId,
    refreshSlotId,
    format,
  }: {
    slotId?: string;
    refreshSlotId?: string;
    format?: string;
  }) => (
    <div
      data-testid="ad-slot"
      data-slot-id={slotId ?? refreshSlotId}
      data-format={format}
    />
  ),
}));

const REAL_TX_MAP: Record<string, AptTxSummary> =
  ((txSummaryRaw as { summary?: Record<string, AptTxSummary> })?.summary ??
    (txSummaryRaw as unknown as Record<string, AptTxSummary>)) || {};

const REAL_SHEET_APARTMENTS: Record<string, DongApartment[]> =
  ((apartmentsByDongRaw as { byDong?: Record<string, DongApartment[]> })?.byDong || {}) as Record<
    string,
    DongApartment[]
  >;

describe('Top Recirculation Bridge Boost: /guide/dongtan-1-vs-2-comparison & /stats', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    analytics.resetVirtualPageViewLedger();
  });

  // =========================================================================
  // 1. Deterministic Real-Data Undervalued Engine & Mathematical Edge Cases
  // =========================================================================
  describe('1. computeUndervaluedComplexes Engine (Real Data + Edge Cases)', () => {
    it('extracts verified undervalued TOP 4 complexes across all, station_core, and dongtan1 scopes with 100% canonical slug coverage', () => {
      const allSummary = computeUndervaluedComplexes(undefined, { scope: 'all', limit: 4 });
      expect(allSummary.modelType).toBe('multi_ols_log_dist_age');
      expect(allSummary.sampleComplexCount).toBe(127);
      expect(allSummary.rSquared).toBeGreaterThan(0.6);
      expect(allSummary.items).toHaveLength(4);

      for (let i = 0; i < allSummary.items.length; i++) {
        const item = allSummary.items[i];
        expect(item.rank).toBe(i + 1);
        expect(item.discountPercent).toBeLessThan(-0.5);
        expect(item.discountPerPyeongManwon).toBeLessThan(0);
        expect(item.actualPyeongManwon).toBeLessThan(item.expectedPyeongManwon);
        expect(item.txCount).toBeGreaterThanOrEqual(15);
        expect(item.householdCount).toBeGreaterThanOrEqual(300);
        expect(item.canonicalSlug).not.toContain(' ');
        expect(REAL_TX_MAP[item.canonicalSlug]).toBeDefined();
        if (i > 0) {
          expect(item.discountPercent).toBeGreaterThanOrEqual(
            allSummary.items[i - 1].discountPercent
          );
        }
      }

      const stationCore = computeUndervaluedComplexes(undefined, {
        scope: 'station_core',
        limit: 4,
      });
      expect(stationCore.items.length).toBeGreaterThanOrEqual(3);
      stationCore.items.forEach((item) => {
        expect(item.distanceToStationMeters).toBeLessThanOrEqual(1800);
        expect(REAL_TX_MAP[item.canonicalSlug]).toBeDefined();
      });

      const dongtan1 = computeUndervaluedComplexes(undefined, {
        scope: 'dongtan1',
        limit: 4,
      });
      expect(dongtan1.items.length).toBeGreaterThanOrEqual(3);
      dongtan1.items.forEach((item) => {
        expect(item.regionId).toBe('동탄1');
        expect(['반송동', '석우동', '능동']).toContain(item.dong);
        expect(REAL_TX_MAP[item.canonicalSlug]).toBeDefined();
      });
    });

    it('handles empty, single-record, non-positive limits, zero-variance, collinear age, and NaN/Infinity inputs without crashing', () => {
      expect(computeUndervaluedComplexes([])).toMatchObject({
        modelType: 'degenerate',
        rSquared: 0,
        items: [],
      });

      const baseRec: ApartmentStatRecord = {
        id: 'r1',
        name: '테스트단지A',
        dong: '여울동',
        distanceToStationMeters: 800,
        avgPriceWon: 800_000_000,
        avgPricePerPyeongWon: 24_000_000,
        latestPriceWon: 820_000_000,
        txCount: 20,
        builtYear: 2018,
        householdCount: 500,
        exclusiveAreaAvgM2: 84,
      };

      expect(computeUndervaluedComplexes([baseRec]).items).toEqual([]);
      expect(
        computeUndervaluedComplexes(
          [baseRec, { ...baseRec, id: 'r2', avgPricePerPyeongWon: 30_000_000 }],
          { limit: 0 }
        ).items
      ).toEqual([]);
      expect(
        computeUndervaluedComplexes(
          [baseRec, { ...baseRec, id: 'r2', avgPricePerPyeongWon: 30_000_000 }],
          { limit: -2 }
        ).items
      ).toEqual([]);

      // Zero variance in price -> degenerate, 0 undervalued items
      const zeroVar = computeUndervaluedComplexes([
        baseRec,
        { ...baseRec, id: 'r2', name: '테스트단지B', distanceToStationMeters: 2000 },
        { ...baseRec, id: 'r3', name: '테스트단지C', distanceToStationMeters: 3000 },
      ]);
      expect(zeroVar.modelType).toBe('degenerate');
      expect(zeroVar.items).toEqual([]);

      // Collinear age (all builtYear = 2018, n = 4) -> falls back to semi_log_dist cleanly
      const sameAgeRecords: ApartmentStatRecord[] = [
        {
          ...baseRec,
          id: 'a1',
          name: '역세권A',
          distanceToStationMeters: 500,
          avgPricePerPyeongWon: 40_000_000,
        },
        {
          ...baseRec,
          id: 'a2',
          name: '역세권저평가B',
          distanceToStationMeters: 600,
          avgPricePerPyeongWon: 24_000_000,
        },
        {
          ...baseRec,
          id: 'a3',
          name: '준역세C',
          distanceToStationMeters: 1500,
          avgPricePerPyeongWon: 29_000_000,
        },
        {
          ...baseRec,
          id: 'a4',
          name: '외곽D',
          distanceToStationMeters: 3000,
          avgPricePerPyeongWon: 22_000_000,
        },
      ];
      const semiLogRes = computeUndervaluedComplexes(sameAgeRecords, { limit: 2 });
      expect(semiLogRes.modelType).toBe('semi_log_dist');
      expect(semiLogRes.items.length).toBeGreaterThanOrEqual(1);
      expect(semiLogRes.items[0].name).toBe('역세권저평가B');
      expect(Number.isFinite(semiLogRes.items[0].discountPercent)).toBe(true);

      // Corrupted NaN/0 records mixed in -> safely ignored
      const dirtyRes = computeUndervaluedComplexes([
        ...sameAgeRecords,
        { ...baseRec, id: 'bad1', distanceToStationMeters: NaN, avgPricePerPyeongWon: 20_000_000 },
        { ...baseRec, id: 'bad2', distanceToStationMeters: 0, avgPricePerPyeongWon: 20_000_000 },
        { ...baseRec, id: 'bad3', distanceToStationMeters: 1000, avgPricePerPyeongWon: -500 },
      ]);
      expect(dirtyRes.sampleComplexCount).toBe(4);
      expect(dirtyRes.items[0].name).toBe('역세권저평가B');
    });
  });

  // =========================================================================
  // 2. /stats Top Undervalued Bridge UI, Ordering, Telemetry & SSR Audit
  // =========================================================================
  describe('2. /stats Above-the-Fold StatsUndervaluedTopBridge & SSR Page', () => {
    it('renders StatsUndervaluedTopBridge above AdSlot #1 on StatsPageClient, adheres to Copy Diet budgets, preserves 4 AdSlots, and passes SEO anti-cloaking audit', () => {
      const { container } = render(<StatsPage />);

      const bridge = container.querySelector('[data-testid="stats-top-undervalued-bridge"]');
      const adSlots = container.querySelectorAll('[data-testid="ad-slot"]');
      expect(bridge).not.toBeNull();
      expect(adSlots).toHaveLength(4);

      // Bridge must appear BEFORE AdSlot #1 in DOM order (above-the-fold priority)
      const orderMask = bridge!.compareDocumentPosition(adSlots[0]);
      expect(orderMask & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Copy Diet budget check on sectionTitle & sectionSubtitle
      const h2Text = bridge!.querySelector('h2')?.textContent || '';
      const subText = bridge!.querySelector('p')?.textContent || '';
      expect(checkCopyBudget(h2Text, 'sectionTitle').withinBudget).toBe(true);
      expect(checkCopyBudget(subText, 'sectionSubtitle').withinBudget).toBe(true);
      expect(checkCopyBudget(subText, 'sectionSubtitle').hasVerboseEnding).toBe(false);

      // SSR regression summary also exposes undervalued complexes with canonical links
      const ssrUndervalued = container.querySelector('#stats-ssr-undervalued-summary');
      expect(ssrUndervalued).not.toBeNull();
      expect(ssrUndervalued!.querySelectorAll('a[href^="/apartment/"]').length).toBe(4);

      // Passes Ad Money v5.1 anti-cloaking & single-H1 semantic audit
      const seoAudit = auditSeoSemanticContainer(container);
      expect(seoAudit.valid).toBe(true);
    });

    it('switches scopes, resets stale area/age filters on table jump, and emits GA4 custom dimensions with modified-click PV guard', () => {
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
      const trackPvSpy = jest.spyOn(analytics, 'trackVirtualPageView');

      const payload = getDongtanStationAnalysisData();
      const { container } = render(
        <StatsPageClient
          initialPayload={payload}
          initialFilters={{ areaBand: 'large', buildingAge: 'under5', dong: 'all', sortBy: 'distance' }}
        />
      );

      const cards = screen.getAllByTestId('stats-undervalued-apt-card');
      expect(cards).toHaveLength(4);

      // Normal click on Card #1 -> emits stats_undervalued_card_click + registered GA4 custom dims + virtual PV
      fireEvent.click(cards[0]);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'stats_undervalued_card_click',
        expect.objectContaining({
          scope: 'all',
          rank: 1,
          surface: 'stats_top_undervalued_bridge',
          view_type: 'detail_page',
          trigger: 'undervalued_rank_1',
        })
      );
      expect(trackPvSpy).toHaveBeenCalledTimes(1);

      // Modified click (Ctrl+Click) -> emits event, suppresses duplicate virtual PV
      fireEvent.click(cards[1], { ctrlKey: true });
      expect(trackPvSpy).toHaveBeenCalledTimes(1);

      // Switch to 동탄1 학군·실속 scope
      fireEvent.click(screen.getByTestId('stats-undervalued-scope-dongtan1'));
      expect(trackEventSpy).toHaveBeenCalledWith(
        'stats_undervalued_scope_change',
        expect.objectContaining({
          scope: 'dongtan1',
          surface: 'stats_top_undervalued_bridge',
          trigger: 'scope_dongtan1',
        })
      );
      const d1Cards = screen.getAllByTestId('stats-undervalued-apt-card');
      d1Cards.forEach((card) => {
        expect(['반송동', '석우동', '능동']).toContain(card.getAttribute('data-apt-dong'));
      });

      // Compare CTA links to /explore?calc=compare&apt1=...&apt2=... and emits registered GA4 custom dims
      const compareCta = screen.getByTestId('stats-undervalued-compare-cta');
      expect(compareCta.getAttribute('href')).toMatch(/^\/explore\?calc=compare&apt1=.+&apt2=.+/);
      fireEvent.click(compareCta);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'stats_undervalued_compare_click',
        expect.objectContaining({
          scope: 'dongtan1',
          calculator_type: 'compare',
          surface: 'stats_top_undervalued_bridge',
          trigger: 'undervalued_compare_cta',
        })
      );

      // Clicking table jump resets stale areaBand='large' & buildingAge='under5' and shows all 38 동탄1 complexes
      fireEvent.click(screen.getByTestId('stats-undervalued-table-jump-btn'));
      expect(container.textContent).toContain('총 38개 단지 추출');
    });

    it('renders graceful empty state when records slice has 0 undervalued items', () => {
      render(<StatsUndervaluedTopBridge records={[]} />);
      expect(screen.getByTestId('stats-undervalued-empty')).toHaveTextContent(
        '선택 조건에서 회귀 기대가 하회 단지가 없습니다.'
      );
      expect(screen.queryByTestId('stats-undervalued-compare-cta')).toBeNull();
    });
  });

  // =========================================================================
  // 3. /guide/dongtan-1-vs-2-comparison Top 1:1 Matchup Bridge & Edge Cases
  // =========================================================================
  describe('3. /guide/dongtan-1-vs-2-comparison Above-the-Fold 1:1 Matchup Bridge', () => {
    it('renders GuideTopMatchupBridge above #guide-key-takeaways on VS comparison guides with accurate per-guide /stats deep links and omits it on non-VS guides', async () => {
      const vsJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: 'dongtan-1-vs-2-comparison' }),
      });
      const { container: vsContainer, unmount: unmountVs } = render(vsJsx);

      const topMatchupBridge = vsContainer.querySelector('#guide-top-h2h-matchup-bridge');
      const keyTakeaways = vsContainer.querySelector('#guide-key-takeaways');
      expect(topMatchupBridge).not.toBeNull();
      expect(keyTakeaways).not.toBeNull();

      // Must appear ABOVE #guide-key-takeaways so landing users see 1:1 real-data cards first
      const posMask = topMatchupBridge!.compareDocumentPosition(keyTakeaways!);
      expect(posMask & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Copy Diet budget check on sectionTitle & sectionSubtitle
      const h2Text = topMatchupBridge!.querySelector('h2')?.textContent || '';
      const subText = topMatchupBridge!.querySelector('p')?.textContent || '';
      expect(checkCopyBudget(h2Text, 'sectionTitle').withinBudget).toBe(true);
      expect(checkCopyBudget(subText, 'sectionSubtitle').withinBudget).toBe(true);
      expect(checkCopyBudget(subText, 'sectionSubtitle').hasVerboseEnding).toBe(false);

      // 4 matchup tabs (including 메타폴리스 vs 동탄역롯데캐슬)
      expect(vsContainer.querySelectorAll('[data-testid^="guide-top-h2h-tab-"]')).toHaveLength(4);

      // Active pair renders 2 clickable apartment cards with pure canonical /apartment/ hrefs
      const pairCards = within(topMatchupBridge as HTMLElement).getAllByTestId(
        'guide-top-h2h-apt-cta'
      );
      expect(pairCards).toHaveLength(2);
      pairCards.forEach((card) => {
        const href = card.getAttribute('href') || '';
        expect(href).toMatch(/^\/apartment\/[^?#%]+|^\/apartment\/%[0-9A-F]{2}/i);
        expect(href).not.toContain('%20');
      });

      const statsCta = within(topMatchupBridge as HTMLElement).getByTestId(
        'guide-top-h2h-stats-cta'
      );
      expect(statsCta.getAttribute('href')).toBe(
        '/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison'
      );

      const seoAudit = auditSeoSemanticContainer(vsContainer);
      expect(seoAudit.valid).toBe(true);
      unmountVs();

      // Lake vs Station VS guide links to lake-park-view-premium stats topic
      const lakeVsJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: 'dongtan-lake-vs-station-comparison' }),
      });
      const { container: lakeContainer, unmount: unmountLake } = render(lakeVsJsx);
      expect(
        lakeContainer.querySelector('[data-testid="guide-top-h2h-stats-cta"]')?.getAttribute('href')
      ).toBe('/stats?topic=lake-park-view-premium#lake-park-view-premium');
      unmountLake();

      // Remodeling / Age VS guide links to building-age-depreciation stats topic
      const ageVsJsx = await GuideArticlePage({
        params: Promise.resolve({
          slug: 'dongtan-reconstruction-remodeling-1st-new-town-outlook',
        }),
      });
      const { container: ageContainer, unmount: unmountAge } = render(ageVsJsx);
      expect(
        ageContainer.querySelector('[data-testid="guide-top-h2h-stats-cta"]')?.getAttribute('href')
      ).toBe('/stats?topic=building-age-depreciation#building-age-depreciation');
      unmountAge();

      // Non-VS finance guide omits top matchup bridge
      const dsrJsx = await GuideArticlePage({
        params: Promise.resolve({ slug: 'stress-dsr-valuation-guide' }),
      });
      const { container: dsrContainer, unmount: unmountDsr } = render(dsrJsx);
      expect(dsrContainer.querySelector('#guide-top-h2h-matchup-bridge')).toBeNull();
      unmountDsr();
    });

    it('switches 1:1 matchups, updates CompareModal deep link, and emits guide_apt_preview_click + compare/stats recirculation events', () => {
      const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
      const trackPvSpy = jest.spyOn(analytics, 'trackVirtualPageView');

      const article = GUIDE_ARTICLES.find((a) => a.slug === 'dongtan-1-vs-2-comparison')!;
      const matchups: ResolvedGuideHeadToHeadRow[] = (article.headToHeadComparisons || []).map(
        (m) => {
          const left = buildGuideAptMiniPreview(m.leftApt)!;
          const right = buildGuideAptMiniPreview(m.rightApt)!;
          return { ...m, left, right };
        }
      );

      render(
        <GuideTopMatchupBridge
          guideSlug={article.slug}
          guideTitle={article.title}
          matchups={matchups}
        />
      );

      // Switch to Matchup #4 (메타폴리스 vs 동탄역롯데캐슬)
      fireEvent.click(screen.getByTestId('guide-top-h2h-tab-3'));
      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_top_matchup_tab_select',
        expect.objectContaining({
          guide_slug: 'dongtan-1-vs-2-comparison',
          matchup_index: 4,
          surface: 'guide_top_matchup_bridge',
        })
      );

      const pairCards = screen.getAllByTestId('guide-top-h2h-apt-cta');
      expect(pairCards[0].getAttribute('data-apt-slug')).toBe('METAPOLIS');
      expect(pairCards[1].getAttribute('data-apt-slug')).toBe('동탄역롯데캐슬');
      expect(screen.getByTestId('guide-top-h2h-price-gap').textContent).toMatch(/매매 격차 \+/);

      // Click Left (1동탄 METAPOLIS) card -> fires guide_apt_preview_click (article_top) + virtual PV
      fireEvent.click(pairCards[0]);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_apt_preview_click',
        expect.objectContaining({
          guide_slug: 'dongtan-1-vs-2-comparison',
          placement: 'article_top',
          apartment_name: 'METAPOLIS',
        })
      );
      expect(trackPvSpy).toHaveBeenCalledTimes(1);

      // Modified click on Right card -> suppresses duplicate virtual PV
      fireEvent.click(pairCards[1], { metaKey: true });
      expect(trackPvSpy).toHaveBeenCalledTimes(1);

      // Click 1:1 Compare Modal CTA -> routes to /explore?calc=compare&apt1=METAPOLIS&apt2=동탄역롯데캐슬
      const compareBtn = screen.getByTestId('guide-top-h2h-compare-modal-cta');
      expect(compareBtn.getAttribute('href')).toBe(
        `/explore?calc=compare&apt1=METAPOLIS&apt2=${encodeURIComponent('동탄역롯데캐슬')}`
      );
      fireEvent.click(compareBtn);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_matchup_compare_click',
        expect.objectContaining({
          guide_slug: 'dongtan-1-vs-2-comparison',
          apt1: 'METAPOLIS',
          apt2: '동탄역롯데캐슬',
          apartment_name: 'METAPOLIS',
          calculator_type: 'compare',
          surface: 'guide_top_matchup_bridge',
        })
      );

      // Click Stats CTA -> fires guide_to_stats_bridge_click
      fireEvent.click(screen.getByTestId('guide-top-h2h-stats-cta'));
      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_to_stats_bridge_click',
        expect.objectContaining({
          from_guide_slug: 'dongtan-1-vs-2-comparison',
          to_stats_topic: 'dongtan-1-vs-2-comparison',
          placement: 'article_top_matchup_bridge',
          surface: 'guide_top_matchup_bridge',
        })
      );
    });

    it('handles empty matchups, IEEE-754 float hundredths (2.3억 / 4.6억), and zero/equal price edge cases cleanly', () => {
      expect(formatMatchupPriceGapText(100000, 123000)).toBe('매매 격차 +2.3억');
      expect(formatMatchupPriceGapText(146000, 100000)).toBe('매매 격차 -4.6억');
      expect(formatMatchupPriceGapText(100000, 112500)).toBe('매매 격차 +1.25억');
      expect(formatMatchupPriceGapText(0, 100000)).toBeNull();

      const { container: emptyContainer, unmount: unmountEmpty } = render(
        <GuideTopMatchupBridge
          guideSlug="dongtan-1-vs-2-comparison"
          guideTitle="테스트"
          matchups={[]}
        />
      );
      expect(emptyContainer.firstChild).toBeNull();
      unmountEmpty();

      const baseItem = buildGuideAptMiniPreview('솔빛마을서해그랑블')!;
      const zeroPriceMatchup: ResolvedGuideHeadToHeadRow = {
        title: '동일가·0원 경계 테스트',
        subtitle: '경계값 검증',
        leftLabel: '좌측',
        rightLabel: '우측',
        verdict: '정상 동작 확인',
        left: { ...baseItem, latestPrice: 85000, jeonseRatio: 0, latestDate: '' },
        right: {
          ...baseItem,
          canonicalSlug: '더샵센트럴시티',
          latestPrice: 85050,
          jeonseRatio: 0,
          txCount: 0,
        },
      };

      const { container } = render(
        <GuideTopMatchupBridge
          guideSlug="dongtan-lake-vs-station-comparison"
          guideTitle="호수 vs 역세권"
          matchups={[zeroPriceMatchup]}
        />
      );
      expect(container.textContent).toContain('매매 실거래 동률');
      expect(container.textContent).not.toContain('NaN');
      expect(container.textContent).not.toContain('undefined');
    });
  });

  // =========================================================================
  // 4. End-to-End Compare Deep-Link Resolution Against Real 183-Complex Catalog
  // =========================================================================
  describe('4. useAptComparison Canonical Slug Resolution & Case-Sensitive File Keys', () => {
    it('resolves both apt1 and apt2 for every VS-cluster guide matchup and every /stats undervalued scope without blank slots, and preserves uppercase/hyphenated tx-data file keys', async () => {
      const requestedUrls: string[] = [];
      global.fetch = jest.fn((url: string) => {
        requestedUrls.push(decodeURIComponent(String(url)));
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }) as unknown as typeof fetch;

      // 1) All VS-cluster guide head-to-head matchups (including METAPOLIS, 솔빛마을서해그랑블, 롯데캐슬, 동탄역센트럴자이A-10)
      const vsGuides = GUIDE_ARTICLES.filter(
        (g) => g.slug === 'dongtan-1-vs-2-comparison' || g.topicClusterId === 'vs-region-comparison'
      );
      expect(vsGuides.length).toBeGreaterThanOrEqual(5);

      for (const guide of vsGuides) {
        for (const m of guide.headToHeadComparisons || []) {
          const leftPreview = buildGuideAptMiniPreview(m.leftApt)!;
          const rightPreview = buildGuideAptMiniPreview(m.rightApt)!;
          expect(leftPreview).toBeDefined();
          expect(rightPreview).toBeDefined();

          const { result, unmount } = renderHook(() =>
            useAptComparison({
              isOpen: true,
              initialAptIds: [leftPreview.canonicalSlug, rightPreview.canonicalSlug],
              sheetApartments: REAL_SHEET_APARTMENTS,
              txSummaryData: REAL_TX_MAP,
            })
          );

          await act(async () => {});

          expect(result.current.apt1).not.toBeNull();
          expect(result.current.apt2).not.toBeNull();
          expect(result.current.metrics1?.avg3MPrice).toBeGreaterThan(0);
          expect(result.current.metrics2?.avg3MPrice).toBeGreaterThan(0);
          unmount();
        }
      }

      // Case-sensitive & hyphenated Linux Static CDN file keys must NOT be lowercased or hyphen-stripped
      expect(requestedUrls.some((u) => u.includes('/tx-data/METAPOLIS.json'))).toBe(true);
      expect(requestedUrls.some((u) => u.includes('/tx-data/metapolis.json'))).toBe(false);
      expect(requestedUrls.some((u) => u.includes('/tx-data/동탄역센트럴자이A-10.json'))).toBe(true);

      // 2) All 3 scopes of /stats undervalued TOP 1 & TOP 2 compare deep links
      for (const scope of ['all', 'station_core', 'dongtan1'] as const) {
        const summary = computeUndervaluedComplexes(undefined, { scope, limit: 4 });
        expect(summary.items.length).toBeGreaterThanOrEqual(2);
        const [top1, top2] = summary.items;

        const { result, unmount } = renderHook(() =>
          useAptComparison({
            isOpen: true,
            initialAptIds: [top1.canonicalSlug, top2.canonicalSlug],
            sheetApartments: REAL_SHEET_APARTMENTS,
            txSummaryData: REAL_TX_MAP,
          })
        );

        await act(async () => {});

        expect(result.current.apt1).not.toBeNull();
        expect(result.current.apt2).not.toBeNull();
        unmount();
      }
    });
  });
});
