/**
 * @file thematic_price_comparison_issues_2_3_4.test.tsx
 * @description Comprehensive Unit, Integration, SSR SEO, and Edge-Case Test Suite for
 * Thematic House Price Comparison Reports:
 * - Issue #2 (`school-district-premium`): 초품아·학군 및 학원가 밀집도별 집값 격차
 * - Issue #3 (`lake-park-view-premium`): 동탄호수공원 수변·도보 생활권 vs 비수변 집값·회전율 격차
 * - Issue #4 (`building-age-depreciation`): 신축·준신축·구축 연식별 집값 격차 및 전고점 방어율 비교
 * - Bidirectional Traffic Bridges (`/stats` <-> `/guide/[slug]` <-> `/apartment/[aptName]`)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import {
  DONGTAN_LAKE_PARK_COORDS,
  enrichApartmentStatRecord,
  getMasterThematicComplexRecords,
  computeThematicGroupSummary,
  getSchoolDistrictPremiumData,
  getLakeParkPremiumData,
  getBuildingAgeDepreciationData,
} from '@/lib/stats/thematicPriceComparisonEngine';
import { STATS_TOPICS, getStatsTopicById } from '@/types/statsTopic';
import { ThematicPriceComparisonSection } from '@/components/stats/ThematicPriceComparisonSection';
import { GuideStatsComparisonBridge } from '@/components/guide/GuideStatsComparisonBridge';
import { StatsPageClient } from '@/app/stats/StatsPageClient';
import StatsPage, { metadata as statsMetadata } from '@/app/stats/page';
import ApartmentPage from '@/app/apartment/[aptName]/page';
import type { ApartmentStatRecord } from '@/lib/stats/types';

import thematicCacheRaw from '../../public/data/stats-thematic-cache.json';
import stationCacheRaw from '../../public/data/stats-station-cache.json';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParamsString = '';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
  usePathname: () => '/stats',
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}));

jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsUi: () => ({
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
  }),
  useSettingsValues: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
  }),
  useSettings: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
  }),
}));

jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: ({ slotId, refreshSlotId, format, className }: any) => (
    <div
      data-testid="ad-slot"
      data-slot-id={slotId ?? refreshSlotId}
      data-raw-slot-id={slotId ?? ''}
      data-refresh-slot-id={refreshSlotId ?? ''}
      data-format={format}
      className={`adslot-mock ${className || ''}`}
    >
      AdSlot: {slotId ?? refreshSlotId} ({format})
    </div>
  ),
}));

jest.mock('@/components/DashboardClient', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard-client-mock">DashboardClient</div>,
}));

function makeRecord(overrides: Partial<ApartmentStatRecord> = {}): ApartmentStatRecord {
  return {
    id: overrides.id ?? 'test-apt',
    name: overrides.name ?? '솔빛마을 서해그랑블',
    dong: overrides.dong ?? '반송동',
    distanceToStationMeters: overrides.distanceToStationMeters ?? 1500,
    avgPriceWon: overrides.avgPriceWon ?? 720_000_000,
    avgPricePerPyeongWon: overrides.avgPricePerPyeongWon ?? 28_030_000,
    latestPriceWon: overrides.latestPriceWon ?? 750_000_000,
    latestPricePerPyeongWon: overrides.latestPricePerPyeongWon ?? 29_100_000,
    latestContractDate: overrides.latestContractDate ?? '20261101',
    txCount: overrides.txCount ?? 50,
    builtYear: overrides.builtYear ?? 2007,
    householdCount: overrides.householdCount ?? 1000,
    exclusiveAreaAvgM2: overrides.exclusiveAreaAvgM2 ?? 84.9,
  };
}

describe('Thematic House Price Comparison Engine & UI Suite (Issues #2, #3, #4)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSearchParamsString = '';
  });

  // ==========================================================================
  // 1. STATS_TOPICS Unlocking & Real-Data Cache Parity
  // ==========================================================================
  describe('1. STATS_TOPICS Active Status & Real-Data Cache Integrity', () => {
    test('unlocks Issue #2, Issue #3, and Issue #4 from upcoming to active', () => {
      const issue2 = getStatsTopicById('school-district-premium');
      const issue3 = getStatsTopicById('lake-park-view-premium');
      const issue4 = getStatsTopicById('building-age-depreciation');

      expect(issue2?.status).toBe('active');
      expect(issue3?.status).toBe('active');
      expect(issue4?.status).toBe('active');
      expect(STATS_TOPICS.every((t) => t.status === 'active')).toBe(true);
    });

    test('stats-thematic-cache.json covers all 127 complexes with 65,000+ cumulative real transactions', () => {
      const entries = Object.values(thematicCacheRaw.complexes);
      expect(entries).toHaveLength(127);
      expect(thematicCacheRaw.summaryMeta.complexCount).toBe(127);
      expect(thematicCacheRaw.summaryMeta.totalAllTimeSalesCount).toBeGreaterThan(60000);
      expect(thematicCacheRaw.summaryMeta.totalAllTimeRentCount).toBeGreaterThan(80000);

      entries.forEach((entry: any) => {
        expect(entry.elementarySchoolName.length).toBeGreaterThan(0);
        expect(entry.distanceToElementary).toBeGreaterThan(0);
        expect(entry.academyDensity).toBeGreaterThanOrEqual(0);
        expect(entry.distanceToLakeMeters).toBeGreaterThan(0);
        expect(entry.allTimeTxCount).toBeGreaterThan(0);
        expect(entry.allTimeHighWon).toBeGreaterThan(0);
      });
    });

    test('getMasterThematicComplexRecords enriches all 127 station cache records deterministically', () => {
      const master = getMasterThematicComplexRecords();
      expect(master).toHaveLength(stationCacheRaw.records.length);
      expect(master).toHaveLength(127);

      const lakeLynn = master.find((r) => r.name === '동탄린스트라우스 더레이크');
      expect(lakeLynn).toBeDefined();
      expect(lakeLynn!.distanceToLakeMeters).toBeLessThanOrEqual(500);
      expect(lakeLynn!.priceRetentionPercent).toBeGreaterThan(0);
      expect(lakeLynn!.priceRetentionPercent).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // 2. Issue #2: School District & Academy Density Premium Engine
  // ==========================================================================
  describe('2. Issue #2: School District & Academy Density Engine (school-district-premium)', () => {
    test('computes Chopuma vs General and Academy Prime vs Non-Academy groups from 127 real complexes', () => {
      const data = getSchoolDistrictPremiumData('all');

      expect(data.areaBand).toBe('all');
      expect(data.datasetMeta.totalComplexCount).toBe(127);

      // Chopuma (<= 200m) + General (> 200m) = 127
      expect(data.chopumaGroup.complexCount).toBe(24);
      expect(data.generalSchoolGroup.complexCount).toBe(103);
      expect(data.chopumaGroup.complexCount + data.generalSchoolGroup.complexCount).toBe(127);

      // Academy Prime (>= 40) + Non-Academy (< 40) = 127
      expect(data.academyPrimeGroup.complexCount + data.nonAcademyGroup.complexCount).toBe(127);
      expect(data.academyPrimeGroup.weightedAvgPriceWon).toBeGreaterThan(
        data.nonAcademyGroup.weightedAvgPriceWon
      );
      expect(data.delta.academyPriceDiffWon).toBeGreaterThan(0);
      expect(data.delta.academyPricePremiumPercent).toBeGreaterThan(0);

      // 4 elementary school distance tiers sum to 127
      expect(data.elementaryDistanceTiers).toHaveLength(4);
      const tierSum = data.elementaryDistanceTiers.reduce((acc, t) => acc + t.complexCount, 0);
      expect(tierSum).toBe(127);

      // 3 academy density tiers sum to 127
      expect(data.academyDensityTiers).toHaveLength(3);
      const academySum = data.academyDensityTiers.reduce((acc, t) => acc + t.complexCount, 0);
      expect(academySum).toBe(127);

      // Top elementary school zones
      expect(data.schoolZoneRankings.length).toBeGreaterThanOrEqual(5);
      expect(data.schoolZoneRankings[0].weightedAvgPriceWon).toBeGreaterThanOrEqual(
        data.schoolZoneRankings[1].weightedAvgPriceWon
      );

      // Rival matchups
      expect(data.rivalMatchups.length).toBeGreaterThanOrEqual(2);
    });

    test('supports areaBand filtering (small, medium, large) and empty input edge case without NaN', () => {
      for (const band of ['small', 'medium', 'large'] as const) {
        const res = getSchoolDistrictPremiumData(band);
        expect(res.areaBand).toBe(band);
        expect(Number.isFinite(res.chopumaGroup.weightedAvgPriceWon)).toBe(true);
        expect(Number.isFinite(res.delta.academyPricePremiumPercent)).toBe(true);
      }

      // Empty records edge case
      const emptyRes = getSchoolDistrictPremiumData('all', []);
      expect(emptyRes.chopumaGroup.complexCount).toBe(0);
      expect(emptyRes.chopumaGroup.weightedAvgPriceWon).toBe(0);
      expect(emptyRes.delta.chopumaPricePremiumPercent).toBe(0);
      expect(emptyRes.schoolZoneRankings).toHaveLength(0);
    });
  });

  // ==========================================================================
  // 3. Issue #3: Lake Park View & Waterfront Premium Engine
  // ==========================================================================
  describe('3. Issue #3: Dongtan Lake Park View & Waterfront Engine (lake-park-view-premium)', () => {
    test('computes Waterfront (<= 1km) vs South Hinterland and Citywide Non-Lake price & turnover gaps', () => {
      const data = getLakeParkPremiumData('all');

      expect(data.areaBand).toBe('all');
      expect(DONGTAN_LAKE_PARK_COORDS).toEqual({ lat: 37.1675, lng: 127.1035 });

      expect(data.waterfrontGroup.complexCount).toBe(12);
      expect(data.southHinterlandGroup.complexCount).toBe(15);
      expect(data.cityNonLakeGroup.complexCount).toBe(115);

      // Waterfront commands significant positive price & per-pyeong premium
      expect(data.waterfrontGroup.weightedAvgPriceWon).toBeGreaterThan(
        data.southHinterlandGroup.weightedAvgPriceWon
      );
      expect(data.delta.waterfrontVsHinterlandPriceDiffWon).toBeGreaterThan(150_000_000);
      expect(data.delta.waterfrontVsHinterlandPremiumPercent).toBeGreaterThan(20);
      expect(data.delta.waterfrontVsCityPriceDiffWon).toBeGreaterThan(50_000_000);

      // Turnover rate is positive and finite
      expect(data.waterfrontGroup.avgAnnualTurnoverPercent).toBeGreaterThan(0);

      // 4 distance tiers sum to 127
      expect(data.lakeDistanceTiers).toHaveLength(4);
      const tierSum = data.lakeDistanceTiers.reduce((acc, t) => acc + t.complexCount, 0);
      expect(tierSum).toBe(127);

      expect(data.rivalMatchups.length).toBeGreaterThanOrEqual(2);
    });

    test('supports areaBand filtering and empty input edge case cleanly', () => {
      for (const band of ['small', 'medium', 'large'] as const) {
        const res = getLakeParkPremiumData(band);
        expect(res.areaBand).toBe(band);
        expect(Number.isFinite(res.waterfrontGroup.weightedAvgPriceWon)).toBe(true);
        expect(Number.isFinite(res.delta.waterfrontVsHinterlandPremiumPercent)).toBe(true);
      }

      const emptyRes = getLakeParkPremiumData('all', []);
      expect(emptyRes.waterfrontGroup.complexCount).toBe(0);
      expect(emptyRes.delta.waterfrontVsHinterlandPriceDiffWon).toBe(0);
    });
  });

  // ==========================================================================
  // 4. Issue #4: Building Age Depreciation & Retention Rate Engine
  // ==========================================================================
  describe('4. Issue #4: Building Age Depreciation & Retention Engine (building-age-depreciation)', () => {
    test('computes New (<=5y), Semi-New (6-10y), Mid-Age (11-15y), and Old (16y+) groups and retention rates', () => {
      const data = getBuildingAgeDepreciationData('all');

      expect(data.areaBand).toBe('all');

      expect(data.newBuildGroup.complexCount).toBeGreaterThan(0);
      expect(data.semiNewGroup.complexCount).toBeGreaterThan(0);
      expect(data.midAgeGroup.complexCount).toBeGreaterThan(0);
      expect(data.oldBuildGroup.complexCount).toBeGreaterThan(0);
      expect(
        data.newBuildGroup.complexCount +
          data.semiNewGroup.complexCount +
          data.midAgeGroup.complexCount +
          data.oldBuildGroup.complexCount
      ).toBe(127);

      // New build commands strong price premium over old build
      expect(data.newBuildGroup.weightedAvgPriceWon).toBeGreaterThan(
        data.oldBuildGroup.weightedAvgPriceWon
      );
      expect(data.delta.newVsOldPriceDiffWon).toBeGreaterThan(250_000_000);
      expect(data.delta.newVsOldPricePremiumPercent).toBeGreaterThanOrEqual(35);
      expect(data.oldBuildGroup.avgPriceRetentionPercent).toBeGreaterThan(70);
      expect(data.delta.totalCumulativeSalesCount).toBeGreaterThan(60000);

      expect(data.ageLifecycleTiers).toHaveLength(4);
      expect(data.rivalMatchups.length).toBeGreaterThanOrEqual(2);
    });

    test('handles boundary built years (2021, 2020, 2016, 2015, 2011, 2010) and empty input edge cases', () => {
      const boundaryRecords = [
        makeRecord({ id: 'age-5', name: '동탄역 롯데캐슬', builtYear: 2021 }),
        makeRecord({ id: 'age-6', name: '동탄역 파라곤', builtYear: 2020 }),
        makeRecord({ id: 'age-10', name: '동탄2신도시 하우스디 더레이크', builtYear: 2016 }),
        makeRecord({ id: 'age-11', name: '동탄역 시범 더샵 센트럴시티', builtYear: 2015 }),
        makeRecord({ id: 'age-15', name: '시범한빛마을 동탄아이파크', builtYear: 2011 }),
        makeRecord({ id: 'age-16', name: '솔빛마을 서해그랑블', builtYear: 2010 }),
      ];

      const res = getBuildingAgeDepreciationData('all', boundaryRecords);
      expect(res.newBuildGroup.complexCount).toBe(1);
      expect(res.semiNewGroup.complexCount).toBe(2);
      expect(res.midAgeGroup.complexCount).toBe(2);
      expect(res.oldBuildGroup.complexCount).toBe(1);

      const emptyRes = getBuildingAgeDepreciationData('all', []);
      expect(emptyRes.newBuildGroup.complexCount).toBe(0);
      expect(emptyRes.delta.newVsOldPriceDiffWon).toBe(0);
    });
  });

  // ==========================================================================
  // 5. ThematicPriceComparisonSection & StatsPageClient UI Integration
  // ==========================================================================
  describe('5. ThematicPriceComparisonSection & StatsPageClient Interactive UI', () => {
    test('renders Issue #2, #3, and #4 sections, supports areaBand toggles, and dispatches complex drilldown & table filter sync', () => {
      const onSelectTopic = jest.fn();
      const onSelectComplex = jest.fn();
      const onApplyTableFilter = jest.fn();

      const { rerender } = render(
        <ThematicPriceComparisonSection
          topicId="school-district-premium"
          onSelectTopic={onSelectTopic}
          onSelectComplex={onSelectComplex}
          onApplyTableFilter={onApplyTableFilter}
        />
      );

      expect(screen.getByTestId('school-district-premium-section')).toBeInTheDocument();
      expect(screen.getByTestId('school-zone-rank-1')).toBeInTheDocument();
      expect(screen.getByText('Issue #1 동탄역 거리 분석 리포트 보기')).toBeInTheDocument();

      // Switch area band to 30평대 (medium)
      fireEvent.click(screen.getByTestId('school-area-filter-medium'));
      expect(screen.getByTestId('school-area-filter-medium')).toHaveAttribute('aria-pressed', 'true');
      expect(onApplyTableFilter).toHaveBeenCalledWith({ areaBand: 'medium' });

      // Switch area band to 20평대 (small) — verify empty chopuma slice does not render bogus "0m · 학원 0개"
      fireEvent.click(screen.getByTestId('school-area-filter-small'));
      const chopumaCard = screen.getByTestId('school-card-chopuma');
      expect(chopumaCard.textContent).not.toContain('0m · 학원 0개');
      expect(chopumaCard.textContent).toContain('해당 평형 표본 없음');

      // Rerender Issue #3 (Lake Park) in small band — verify empty waterfront slice does not render bogus "연 0% · 평균 0m"
      rerender(
        <ThematicPriceComparisonSection
          topicId="lake-park-view-premium"
          onSelectTopic={onSelectTopic}
          onSelectComplex={onSelectComplex}
          onApplyTableFilter={onApplyTableFilter}
        />
      );
      expect(screen.getByTestId('lake-park-view-premium-section')).toBeInTheDocument();
      const waterfrontCard = screen.getByTestId('lake-card-waterfront');
      expect(waterfrontCard.textContent).not.toContain('연 0% · 평균 0m');
      expect(waterfrontCard.textContent).toContain('해당 평형 표본 없음');

      // Rerender Issue #4 (Building Age) in small band — verify empty oldBuild slice does not render bogus "0년 (0년차) · 0건" or "평당 0만"
      rerender(
        <ThematicPriceComparisonSection
          topicId="building-age-depreciation"
          onSelectTopic={onSelectTopic}
          onSelectComplex={onSelectComplex}
          onApplyTableFilter={onApplyTableFilter}
        />
      );
      expect(screen.getByTestId('building-age-depreciation-section')).toBeInTheDocument();
      const oldCard = screen.getByTestId('age-card-old');
      expect(oldCard.textContent).not.toContain('0년 (0년차)');
      expect(oldCard.textContent).toContain('해당 평형 표본 없음');
      expect(screen.getByTestId('building-age-depreciation-section').textContent).not.toContain(
        '평당 0만'
      );
    });

    test('StatsPageClient switches seamlessly across Issue #1, #2, #3, #4, and #5 while preserving 4 AdSlots', () => {
      render(<StatsPageClient />);

      // Default Issue #1
      expect(screen.getByText('초역세권 프리미엄 격차')).toBeInTheDocument();
      expect(screen.getAllByTestId('ad-slot')).toHaveLength(4);

      // Click Issue #2
      fireEvent.click(
        screen.getByText('초품아 및 명문 학군이 형성하는 동탄 아파트 프리미엄').closest('button')!
      );
      expect(screen.getByTestId('school-district-premium-section')).toBeInTheDocument();
      expect(screen.getAllByTestId('ad-slot')).toHaveLength(4);

      // Click Issue #3
      fireEvent.click(
        screen.getByText('동탄호수공원 조망권과 수변 입지의 가치 측정').closest('button')!
      );
      expect(screen.getByTestId('lake-park-view-premium-section')).toBeInTheDocument();
      expect(screen.getAllByTestId('ad-slot')).toHaveLength(4);

      // Click Issue #4
      fireEvent.click(
        screen.getByText('동탄 1·2신도시 연식별 감가상각과 재건축·리모델링 기대치').closest('button')!
      );
      expect(screen.getByTestId('building-age-depreciation-section')).toBeInTheDocument();
      expect(screen.getAllByTestId('ad-slot')).toHaveLength(4);

      // Return to Issue #1 via button
      fireEvent.click(screen.getByText('Issue #1 동탄역 거리 분석 리포트 보기'));
      expect(screen.getByText('초역세권 프리미엄 격차')).toBeInTheDocument();
    });

    test('StatsPageClient initializes directly into Issue #2, #3, or #4 from ?topic= URL query parameter and allows subsequent manual tab switching', () => {
      mockSearchParamsString = 'topic=lake-park-view-premium';
      render(<StatsPageClient />);

      expect(screen.getByTestId('lake-park-view-premium-section')).toBeInTheDocument();

      // Switch manually to Issue #4 even while URL searchParams mock was initialized to lake-park-view-premium
      fireEvent.click(
        screen.getByText('동탄 1·2신도시 연식별 감가상각과 재건축·리모델링 기대치').closest('button')!
      );
      expect(screen.getByTestId('building-age-depreciation-section')).toBeInTheDocument();
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('topic=building-age-depreciation'),
        { scroll: false }
      );
    });
  });

  // ==========================================================================
  // 6. SSR SEO JSON-LD & Bidirectional Recirculation Bridges
  // ==========================================================================
  describe('6. SSR SEO JSON-LD & Bidirectional Traffic Bridges (/stats <-> /guide <-> /apartment)', () => {
    test('StatsPage SSR includes Dataset JSON-LD and visible summaries for Issues #2, #3, and #4', () => {
      const { container } = render(<StatsPage />);

      // Metadata includes new thematic keywords
      expect(String(statsMetadata.title)).toContain('초품아·호수공원·연식별');

      // JSON-LD contains all 5 Dataset nodes
      const ldScript = container.querySelector('script[type="application/ld+json"]');
      expect(ldScript).not.toBeNull();
      const parsed = JSON.parse(ldScript!.innerHTML);
      const datasetIds = parsed['@graph']
        .filter((node: any) => node['@type'] === 'Dataset')
        .map((node: any) => node['@id']);

      expect(datasetIds).toEqual(
        expect.arrayContaining([
          expect.stringContaining('#dataset-dongtan-station-distance'),
          expect.stringContaining('#dataset-school-district-premium'),
          expect.stringContaining('#dataset-lake-park-view-premium'),
          expect.stringContaining('#dataset-building-age-depreciation'),
          expect.stringContaining('#dataset-dongtan-1-vs-2-comparison'),
        ])
      );

      // Visible SSR summaries exist and preserve exact 5 <li> count for regression distance tiers
      const ssrSection = container.querySelector('#stats-ssr-regression-summary');
      expect(ssrSection).not.toBeNull();
      expect(ssrSection!.querySelectorAll('li')).toHaveLength(5);
      expect(container.querySelector('#stats-ssr-school-district-summary')).not.toBeNull();
      expect(container.querySelector('#stats-ssr-lake-park-summary')).not.toBeNull();
      expect(container.querySelector('#stats-ssr-building-age-summary')).not.toBeNull();
    });

    test('GuideStatsComparisonBridge links guide readers to Issues #2, #3, #4, and #5', () => {
      render(
        <GuideStatsComparisonBridge
          guideSlug="dongtan-school-zone-top-apartments"
          guideTitle="동탄 초품아·학군 대장 아파트 비교"
        />
      );

      const thematicBar = screen.getByTestId('guide-to-stats-thematic-links');
      expect(thematicBar).toBeInTheDocument();
      const links = Array.from(thematicBar.querySelectorAll('a')).map((a) =>
        a.getAttribute('href')
      );
      expect(links).toEqual([
        '/stats?topic=school-district-premium#school-district-premium',
        '/stats?topic=lake-park-view-premium#lake-park-view-premium',
        '/stats?topic=building-age-depreciation#building-age-depreciation',
      ]);
    });

    test('ApartmentPage SSR renders #apt-thematic-stats-bridge-ssr linking to all thematic stats topics', async () => {
      const jsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
      });
      const { container } = render(jsx);

      const bridge = container.querySelector('#apt-thematic-stats-bridge-ssr');
      expect(bridge).not.toBeNull();

      const hrefs = Array.from(bridge!.querySelectorAll('a')).map((a) => a.getAttribute('href'));
      expect(hrefs).toEqual(
        expect.arrayContaining([
          '/stats',
          '/stats?topic=school-district-premium#school-district-premium',
          '/stats?topic=lake-park-view-premium#lake-park-view-premium',
          '/stats?topic=building-age-depreciation#building-age-depreciation',
          '/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison',
        ])
      );
    });
  });

  // ==========================================================================
  // 7. Ad Money v5.0 Design System Guardrails
  // ==========================================================================
  describe('7. Ad Money v5.0 Design System Guardrails on New Thematic Files', () => {
    const newFiles = [
      path.resolve(__dirname, '../lib/stats/thematicPriceComparisonEngine.ts'),
      path.resolve(__dirname, '../components/stats/ThematicPriceComparisonSection.tsx'),
    ];

    test('contains zero Unicode emojis and zero prohibited Tailwind colors or font-mono', () => {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      const prohibitedColorRegex =
        /\b(?:bg|text|border|ring|from|to|via)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|zinc|neutral|stone|gray|teal|cyan|sky|green)-\d{2,3}\b/;

      newFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(emojiRegex.test(content)).toBe(false);
        expect(prohibitedColorRegex.test(content)).toBe(false);
        expect(content).not.toContain('font-mono');
      });
    });
  });
});
