/**
 * @file dongtan_1_vs_2_stats_and_guide_bridge.test.tsx
 * @description Comprehensive unit, integration, and edge-case test suite for:
 * 1. 100% Real-Data Dongtan 1 vs Dongtan 2 House Price Comparison Engine (`dongtan1Vs2ComparisonEngine.ts`)
 * 2. Interactive Comparison Hub UI (`Dongtan1Vs2ComparisonSection.tsx` & `StatsPageClient.tsx`)
 * 3. Bidirectional Traffic & Revenue Recirculation (`/stats` <-> `/guide/dongtan-1-vs-2-comparison` via `GuideStatsComparisonBridge.tsx`)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DONGTAN_1_LEGAL_DONGS,
  DONGTAN_2_LEGAL_DONGS,
  classifyDongtanRegion,
  filterRecordsByAreaBand,
  computeRegionPriceSummary,
  computeDongtan1Vs2Delta,
  computePriceBracketDistribution,
  computeLegalDongPriceRankings,
  computeFlagshipRivalMatchups,
  getDongtan1Vs2ComparisonData,
  resolveStatsComplexCanonicalSlug,
} from '@/lib/stats/dongtan1Vs2ComparisonEngine';
import { getDongtanStationAnalysisData } from '@/lib/stats/dongtanStationDistanceEngine';
import type { ApartmentStatRecord } from '@/lib/stats/types';
import { Dongtan1Vs2ComparisonSection } from '@/components/stats/Dongtan1Vs2ComparisonSection';
import { GuideStatsComparisonBridge } from '@/components/guide/GuideStatsComparisonBridge';
import { StatsPageClient } from '@/app/stats/StatsPageClient';
import * as analytics from '@/lib/utils/analytics';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let currentMockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
  usePathname: () => '/stats',
  useSearchParams: () => currentMockSearchParams,
}));

jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: ({
    slotId,
    refreshSlotId,
    format,
  }: {
    slotId?: string;
    refreshSlotId?: string;
    format: string;
  }) => (
    <div
      data-testid="ad-slot"
      data-slot-id={slotId ?? refreshSlotId}
      data-format={format}
    />
  ),
}));

jest.spyOn(analytics, 'trackEvent').mockImplementation(() => {});
jest.spyOn(analytics, 'trackVirtualPageView').mockImplementation(() => {});

describe('Dongtan 1 vs Dongtan 2 House Price Comparison & Bidirectional Guide Bridge Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentMockSearchParams = new URLSearchParams();
  });

  // =========================================================================
  // 1. Real-Data Comparison Engine Verification
  // =========================================================================
  describe('1. Real-Data Comparison Engine (dongtan1Vs2ComparisonEngine)', () => {
    const fullData = getDongtan1Vs2ComparisonData('all');
    const masterPayload = getDongtanStationAnalysisData();

    test('partitions all 127 verified complexes into Dongtan 1 (38) and Dongtan 2 (89) with zero loss', () => {
      expect(fullData.dongtan1.complexCount).toBe(38);
      expect(fullData.dongtan2.complexCount).toBe(89);
      expect(fullData.dongtan1.complexCount + fullData.dongtan2.complexCount).toBe(
        masterPayload.allRecords.length
      );
    });

    test('preserves 100% of 1-year transaction volume across Dongtan 1 and Dongtan 2', () => {
      const totalMasterTx = masterPayload.allRecords.reduce((acc, r) => acc + r.txCount, 0);
      expect(fullData.dongtan1.txVolume1Y).toBeGreaterThan(1500);
      expect(fullData.dongtan2.txVolume1Y).toBeGreaterThan(5000);
      expect(fullData.dongtan1.txVolume1Y + fullData.dongtan2.txVolume1Y).toBe(totalMasterTx);
    });

    test('computes accurate real house prices and identifies flagship complexes for both regions', () => {
      // Dongtan 1 flagship is 메타폴리스 (14.85억원)
      expect(fullData.dongtan1.maxPriceComplexName).toBe('메타폴리스');
      expect(fullData.dongtan1.maxLatestPriceWon).toBe(1_485_000_000);
      expect(fullData.dongtan1.maxLatestPriceEokText).toBe('14.85억원');
      expect(fullData.dongtan1.weightedAvgPriceWon).toBeGreaterThan(600_000_000);
      expect(fullData.dongtan1.weightedAvgPyeongManwon).toBeGreaterThan(1800);

      // Dongtan 2 flagship is 동탄역 롯데캐슬 (26.2억원)
      expect(fullData.dongtan2.maxPriceComplexName).toBe('동탄역 롯데캐슬');
      expect(fullData.dongtan2.maxLatestPriceWon).toBe(2_620_000_000);
      expect(fullData.dongtan2.maxLatestPriceEokText).toBe('26.2억원');
      expect(fullData.dongtan2.weightedAvgPriceWon).toBeGreaterThan(
        fullData.dongtan1.weightedAvgPriceWon
      );
      expect(fullData.dongtan2.weightedAvgPyeongManwon).toBeGreaterThan(
        fullData.dongtan1.weightedAvgPyeongManwon
      );
    });

    test('computes head-to-head price delta and headline Q&A accurately', () => {
      const { delta, dongtan1, dongtan2 } = fullData;
      expect(delta.weightedPriceDiffWon).toBe(
        dongtan2.weightedAvgPriceWon - dongtan1.weightedAvgPriceWon
      );
      expect(delta.weightedPriceDiffWon).toBeGreaterThan(0);
      expect(delta.weightedPriceDiffEokText.startsWith('+')).toBe(true);
      expect(delta.pyeongPriceDiffManwon).toBe(
        dongtan2.weightedAvgPyeongManwon - dongtan1.weightedAvgPyeongManwon
      );
      expect(delta.builtYearDiffYears).toBe(dongtan2.avgBuiltYear - dongtan1.avgBuiltYear);
      expect(delta.builtYearDiffYears).toBeGreaterThanOrEqual(8);
      expect(delta.headlineQuestion).toContain('동탄1 vs 동탄2');
      expect(delta.headlineAnswer).toContain(dongtan1.weightedAvgPriceEokText);
      expect(delta.headlineAnswer).toContain(dongtan2.weightedAvgPriceEokText);
    });

    test('partitions complexes into 5 price brackets summing to exact region totals', () => {
      expect(fullData.priceBrackets).toHaveLength(5);
      const sumD1 = fullData.priceBrackets.reduce((acc, b) => acc + b.dongtan1Count, 0);
      const sumD2 = fullData.priceBrackets.reduce((acc, b) => acc + b.dongtan2Count, 0);
      expect(sumD1).toBe(fullData.dongtan1.complexCount);
      expect(sumD2).toBe(fullData.dongtan2.complexCount);

      // Over 15억 bracket has 0 complexes in Dongtan 1 (max is 14.85억) and multiple in Dongtan 2
      const over15 = fullData.priceBrackets.find((b) => b.bracketId === 'over15')!;
      expect(over15.dongtan1Count).toBe(0);
      expect(over15.dongtan2Count).toBeGreaterThan(0);
    });

    test('computes all 11 legal dongs sorted descending by weighted average price', () => {
      const rankings = fullData.dongRankings;
      expect(rankings).toHaveLength(
        DONGTAN_1_LEGAL_DONGS.length + DONGTAN_2_LEGAL_DONGS.length
      );
      for (let i = 0; i < rankings.length - 1; i++) {
        expect(rankings[i].weightedAvgPriceWon).toBeGreaterThanOrEqual(
          rankings[i + 1].weightedAvgPriceWon
        );
      }
      // 청계동 and 여울동 lead the rankings
      expect(['청계동', '여울동', '송동']).toContain(rankings[0].dong);
    });

    test('builds 4 flagship 1:1 rival matchups with canonical slugs and guide links', () => {
      const matchups = fullData.rivalMatchups;
      expect(matchups).toHaveLength(4);
      matchups.forEach((m) => {
        expect(m.dongtan1Complex.regionId).toBe('동탄1');
        expect(m.dongtan2Complex.regionId).toBe('동탄2');
        expect(m.dongtan1Complex.canonicalSlug.length).toBeGreaterThan(0);
        expect(m.dongtan2Complex.canonicalSlug.length).toBeGreaterThan(0);
        expect(m.dongtan1Complex.latestPriceWon).toBeGreaterThan(0);
        expect(m.dongtan2Complex.latestPriceWon).toBeGreaterThan(0);
        expect(m.relatedGuideSlug.length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // 2. Boundary Conditions & Edge Cases
  // =========================================================================
  describe('2. Boundary Conditions & Edge Cases', () => {
    test('handles empty record arrays gracefully without NaN or Infinity', () => {
      const emptyPayload = getDongtan1Vs2ComparisonData('all', []);
      expect(emptyPayload.dongtan1.complexCount).toBe(0);
      expect(emptyPayload.dongtan2.complexCount).toBe(0);
      expect(emptyPayload.dongtan1.weightedAvgPriceWon).toBe(0);
      expect(emptyPayload.dongtan1.weightedAvgPriceEokText).toBe('-');
      expect(emptyPayload.delta.weightedPriceDiffWon).toBe(0);
      expect(emptyPayload.delta.weightedPricePremiumPercent).toBe(0);
      expect(Number.isNaN(emptyPayload.delta.weightedPricePremiumPercent)).toBe(false);
      expect(emptyPayload.dongRankings).toHaveLength(0);
      expect(emptyPayload.rivalMatchups).toHaveLength(0);
    });

    test('handles single-region empty slice (<60㎡ small band where Dongtan 1 has 0 complexes and Dongtan 2 has 5) without bogus delta subtractions', () => {
      const smallPayload = getDongtan1Vs2ComparisonData('small');
      expect(smallPayload.dongtan1.complexCount).toBe(0);
      expect(smallPayload.dongtan2.complexCount).toBe(5);
      expect(smallPayload.dongtan2.weightedAvgPriceWon).toBeGreaterThan(500_000_000);

      // Must NOT subtract 0 from Dongtan 2's price or built year
      expect(smallPayload.delta.weightedPriceDiffWon).toBe(0);
      expect(smallPayload.delta.weightedPriceDiffEokText).toBe('-');
      expect(smallPayload.delta.pyeongPriceDiffManwon).toBe(0);
      expect(smallPayload.delta.builtYearDiffYears).toBe(0);
      expect(smallPayload.delta.headlineAnswer).toContain('동탄1신도시 해당 단지가 없으며');
      expect(smallPayload.delta.headlineAnswer).toContain(
        smallPayload.dongtan2.weightedAvgPriceEokText
      );
      expect(smallPayload.delta.headlineAnswer).not.toContain('평당 0만');
    });

    test('normalizes legacy 오산동 to 동탄2 (여울동)', () => {
      expect(classifyDongtanRegion('반송동')).toBe('동탄1');
      expect(classifyDongtanRegion('석우동')).toBe('동탄1');
      expect(classifyDongtanRegion('능동')).toBe('동탄1');
      expect(classifyDongtanRegion('오산동')).toBe('동탄2');
      expect(classifyDongtanRegion('여울동')).toBe('동탄2');
      expect(classifyDongtanRegion('청계동')).toBe('동탄2');
    });

    test('enforces exact area band boundaries (59.99㎡, 60.0㎡, 85.0㎡, 85.01㎡)', () => {
      const mockBase: ApartmentStatRecord = {
        id: 'test',
        name: '테스트단지',
        dong: '반송동',
        distanceToStationMeters: 1000,
        avgPriceWon: 700_000_000,
        avgPricePerPyeongWon: 21_000_000,
        latestPriceWon: 750_000_000,
        latestPricePerPyeongWon: 22_000_000,
        latestContractDate: '20261010',
        txCount: 10,
        builtYear: 2015,
        householdCount: 500,
        exclusiveAreaAvgM2: 60,
      };

      const boundaryRecords: ApartmentStatRecord[] = [
        { ...mockBase, id: '1', exclusiveAreaAvgM2: 59.99 },
        { ...mockBase, id: '2', exclusiveAreaAvgM2: 60.0 },
        { ...mockBase, id: '3', exclusiveAreaAvgM2: 85.0 },
        { ...mockBase, id: '4', exclusiveAreaAvgM2: 85.01 },
      ];

      expect(filterRecordsByAreaBand(boundaryRecords, 'small').map((r) => r.id)).toEqual(['1']);
      expect(filterRecordsByAreaBand(boundaryRecords, 'medium').map((r) => r.id)).toEqual([
        '2',
        '3',
      ]);
      expect(filterRecordsByAreaBand(boundaryRecords, 'large').map((r) => r.id)).toEqual(['4']);
    });

    test('enforces exact price bracket boundaries (6억, 9억, 12억, 15억)', () => {
      const base: ApartmentStatRecord = {
        id: 'b',
        name: '경계단지',
        dong: '청계동',
        distanceToStationMeters: 1000,
        avgPriceWon: 500_000_000,
        avgPricePerPyeongWon: 20_000_000,
        latestPriceWon: 600_000_000,
        latestPricePerPyeongWon: 20_000_000,
        txCount: 5,
        builtYear: 2018,
        householdCount: 500,
        exclusiveAreaAvgM2: 84,
      };

      const brackets = computePriceBracketDistribution([
        { ...base, name: '6억정각', latestPriceWon: 600_000_000 },
        { ...base, name: '6억초과', latestPriceWon: 600_000_001 },
        { ...base, name: '9억정각', latestPriceWon: 900_000_000 },
        { ...base, name: '12억정각', latestPriceWon: 1_200_000_000 },
        { ...base, name: '15억정각', latestPriceWon: 1_500_000_000 },
        { ...base, name: '15억초과', latestPriceWon: 1_500_000_001 },
      ]);

      expect(brackets.find((b) => b.bracketId === 'under6')?.dongtan2Count).toBe(1);
      expect(brackets.find((b) => b.bracketId === '6to9')?.dongtan2Count).toBe(2);
      expect(brackets.find((b) => b.bracketId === '9to12')?.dongtan2Count).toBe(1);
      expect(brackets.find((b) => b.bracketId === '12to15')?.dongtan2Count).toBe(1);
      expect(brackets.find((b) => b.bracketId === 'over15')?.dongtan2Count).toBe(1);
    });

    test('handles zero-transaction records using simple average fallback safely', () => {
      const zeroTxRecords: ApartmentStatRecord[] = [
        {
          id: 'z1',
          name: '무거래단지1',
          dong: '능동',
          distanceToStationMeters: 3000,
          avgPriceWon: 500_000_000,
          avgPricePerPyeongWon: 18_000_000,
          latestPriceWon: 0,
          latestPricePerPyeongWon: 0,
          txCount: 0,
          builtYear: 2008,
          householdCount: 400,
          exclusiveAreaAvgM2: 84,
        },
      ];

      const summary = computeRegionPriceSummary(zeroTxRecords, '동탄1');
      expect(summary.complexCount).toBe(1);
      expect(summary.txVolume1Y).toBe(0);
      expect(summary.weightedAvgPriceWon).toBe(500_000_000);
      expect(summary.avgLatestPriceWon).toBe(500_000_000);
    });
  });

  // =========================================================================
  // 3. Interactive UI & Bidirectional Traffic Recirculation
  // =========================================================================
  describe('3. Interactive UI & Bidirectional Recirculation (/stats <-> /guide)', () => {
    test('Dongtan1Vs2ComparisonSection renders scoreboard, brackets, matchups, dong rankings, and guide links', () => {
      render(<Dongtan1Vs2ComparisonSection />);

      expect(screen.getByTestId('dongtan-1-vs-2-comparison-section')).toBeInTheDocument();
      expect(screen.getByTestId('dongtan1-weighted-avg-price')).toBeInTheDocument();
      expect(screen.getByTestId('dongtan2-weighted-avg-price')).toBeInTheDocument();
      expect(screen.getByTestId('vs-weighted-price-diff')).toBeInTheDocument();

      // Primary Hero Guide CTA links to /guide/dongtan-1-vs-2-comparison
      const heroCta = screen.getByTestId('stats-to-guide-hero-cta');
      expect(heroCta).toHaveAttribute('href', '/guide/dongtan-1-vs-2-comparison');

      // Clicking the guide bridge CTA fires GA4 event
      fireEvent.click(heroCta);
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'stats_to_guide_bridge_click',
        expect.objectContaining({
          to_guide_slug: 'dongtan-1-vs-2-comparison',
        })
      );
    });

    test('Area band filter buttons dynamically recalculate Dongtan 1 vs Dongtan 2 house prices and handle <60㎡ empty Dongtan 1 slice cleanly', () => {
      const { container } = render(<Dongtan1Vs2ComparisonSection />);

      const initialD1Price = screen.getByTestId('dongtan1-weighted-avg-price').textContent;

      // Switch to 40평대+ 대형 (85㎡ 초과)
      const largeFilterBtn = screen.getByTestId('vs-area-filter-large');
      fireEvent.click(largeFilterBtn);

      const largeD1Price = screen.getByTestId('dongtan1-weighted-avg-price').textContent;
      expect(largeD1Price).not.toBe(initialD1Price);
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'stats_vs_area_filter_change',
        expect.objectContaining({ area_band: 'large' })
      );

      // Switch to 20평대 소형 (60㎡ 미만) where Dongtan 1 has 0 complexes
      const smallFilterBtn = screen.getByTestId('vs-area-filter-small');
      fireEvent.click(smallFilterBtn);

      expect(screen.getByTestId('dongtan1-weighted-avg-price').textContent).toBe('-');
      expect(screen.getByTestId('vs-weighted-price-diff').textContent).toBe('-');
      expect(container.textContent).toContain('해당 평형 단지 없음');
      expect(container.textContent).toContain('단일 권역 표본');
      expect(container.textContent).not.toContain('평당 0만원');
      expect(container.textContent).not.toContain('0년 (0년차)');
    });

    test('GuideStatsComparisonBridge renders live house price stats and links back to /stats comparison topic', () => {
      render(
        <GuideStatsComparisonBridge
          guideSlug="dongtan-1-vs-2-comparison"
          guideTitle="동탄1신도시 vs 동탄2신도시 전방위 입지·실거래 비교"
        />
      );

      expect(screen.getByTestId('guide-to-stats-comparison-bridge')).toBeInTheDocument();
      expect(screen.getByTestId('bridge-dongtan1-avg-price')).toBeInTheDocument();
      expect(screen.getByTestId('bridge-dongtan2-avg-price')).toBeInTheDocument();
      expect(screen.getByTestId('bridge-price-gap')).toBeInTheDocument();

      const primaryCta = screen.getByTestId('guide-to-stats-primary-cta');
      expect(primaryCta).toHaveAttribute(
        'href',
        '/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison'
      );

      fireEvent.click(primaryCta);
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'guide_to_stats_bridge_click',
        expect.objectContaining({
          from_guide_slug: 'dongtan-1-vs-2-comparison',
          to_stats_topic: 'dongtan-1-vs-2-comparison',
        })
      );
    });

    test('StatsPageClient switches to VS 특별판 topic, syncs URL query topic & popstate history, and syncs region + areaBand to drill-down table', () => {
      currentMockSearchParams = new URLSearchParams('topic=dongtan-1-vs-2-comparison');
      const { rerender } = render(<StatsPageClient />);

      // Comparison section is rendered as the primary view
      expect(screen.getByTestId('dongtan-1-vs-2-comparison-section')).toBeInTheDocument();
      expect(screen.getAllByTestId('ad-slot')).toHaveLength(4);

      // Select 30평대 중형 (60~85㎡) in the comparison section, then click "하단 상세 표에서 동탄1 단지 전체 보기"
      fireEvent.click(screen.getByTestId('vs-area-filter-medium'));
      fireEvent.click(screen.getByText('하단 상세 표에서 동탄1 단지 전체 보기'));

      const dongSelect = screen.getByLabelText('법정동 및 권역 선택') as HTMLSelectElement;
      expect(dongSelect.value).toBe('동탄1');

      // Simulate navigating back to /stats (query param topic removed)
      currentMockSearchParams = new URLSearchParams('');
      rerender(<StatsPageClient />);

      const issue1TopicBtn = screen.getByText('Issue #1').closest('button');
      expect(issue1TopicBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
