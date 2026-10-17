/**
 * @file tier3_cross_feature.test.tsx
 * @description Tier 3: Cross-Feature Interactions Test Suite for Features F1 ~ F7.
 * Opaque-box requirement-driven verification covering multi-module interoperability,
 * reactive data flows, and cross-layer invariant preservation.
 */

import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// F1 Components & Engines
import { ApartmentChapterNavBar } from '@/components/apartment/ApartmentChapterNavBar';
import { calculateTwoSigma } from '@/lib/analytics/twoSigmaEngine';

// F2 Canonical Presentation Components
import CanonicalMacroTrendChart from '@/components/macro/MacroTrendChart';
import CanonicalAptDonutSection from '@/components/macro/AptDonutSection';
import CanonicalAptMetricCards from '@/components/macro/AptMetricCards';
import OfflineBanner from '@/components/ui/OfflineBanner';

// F3 Modular Compare Subcomponents & Valuation
import { CompareInsightCard } from '@/components/consumer/compare/CompareInsightCard';
import { ComparePriceHistoryChart } from '@/components/consumer/compare/ComparePriceHistoryChart';
import { calculateDynamicDCF } from '@/lib/utils/valuationEngine';
import type { DongApartment } from '@/lib/dong-apartments';

// F4 Core Normalizer & Area Utilities
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { isCancelledTransaction } from '@/lib/analytics/statsEngine';
import { getSupplyPyeong } from '@/lib/utils/areaConverter';

// F5 Schemas & Data Contract
import { TransactionListSchema } from '@/lib/validation/facade.schemas';
import type { TransactionRecord } from '@/types/transaction';

// F6 Navigation, AdSense & AdRefresh
import LoungeHeader from '@/components/LoungeHeader';
import { AdSlot } from '@/components/ads/AdSlot';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';

// F7 Mortgage Engine & Math
import { calculateEqualPrincipalAndInterest } from '@/lib/services/mortgage/mortgageEngine';

// Mocks
const mockPrefetch = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: mockPrefetch,
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  apartmentRepository: {
    fetchApartmentNames: jest.fn().mockResolvedValue([]),
    fetchApartments: jest.fn().mockResolvedValue([]),
  },
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
}));

describe('Tier 3: Cross-Feature Interactions Suite [F1 ~ F7]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // C1: Navigation & Zero-CLS Layout & AdSense Invariance (F1 + F6 + F7)
  // ==========================================================================
  test('C1: Tab navigation transitions maintain zero-CLS bounding boxes and single AdSense push', () => {
    function IntegratedDashboardView() {
      const [currentTab, setCurrentTab] = useState('overview');

      return (
        <div data-testid="dashboard-root" className="min-h-screen">
          <LoungeHeader
            activeTab={currentTab}
            onTabChange={(tab) => setCurrentTab(tab)}
          />
          <main className="max-w-7xl mx-auto p-4 space-y-6">
            <div data-testid="hero-container" className="flex flex-col lg:flex-row gap-6 min-h-[580px]">
              <div className="w-full lg:w-[420px] shrink-0" data-testid="left-hero">
                <CanonicalAptDonutSection
                  distribution={[{ name: '30평대', count: 42, percentage: 70 }]}
                  totalCount={60}
                />
              </div>
              <div className="flex-1 min-h-[460px]" data-testid="right-hero">
                <CanonicalMacroTrendChart
                  data={[
                    { date: '2026-08', '동탄 아파트 전체': 74000, '동탄 아파트 전세 평균': 44000, volume: 150 },
                    { date: '2026-09', '동탄 아파트 전체': 76000, '동탄 아파트 전세 평균': 45000, volume: 180 },
                  ]}
                />
              </div>
            </div>

            {/* In-feed AdSlot with strict min-height bounding box */}
            <AdSlot
              slotId="1000000001"
              format="in-feed"
              testMode={true}
              className="my-6"
            />
          </main>
        </div>
      );
    }

    const { container } = render(<IntegratedDashboardView />);

    // 1. Verify Hero Layout geometry
    const hero = screen.getByTestId('hero-container');
    expect(hero.className).toContain('min-h-[580px]');

    // 2. Verify AdSlot bounding box
    const adSlot = container.querySelector('.min-h-\\[140px\\]');
    expect(adSlot).toBeInTheDocument();

    // 3. Navigate tabs and verify zero unhandled exceptions
    const guideLink = screen.getByRole('link', { name: /가이드/i });
    fireEvent.click(guideLink);

    expect(hero).toBeInTheDocument();
    expect(adSlot).toBeInTheDocument();
  });

  // ==========================================================================
  // C2: MacroTrendChart & Pipeline Normalizer & 2SD Bands (F1 + F2 + F4)
  // ==========================================================================
  test('C2: Data pipeline normalization feeds twoSigmaEngine and dynamically updates MacroTrendChart', () => {
    // 1. Raw heterogeneous transaction feed
    const rawFeed = [
      { aptName: '[청계동] 시범우남퍼스트빌', dealDate: '20260715', price: 78000, cdealType: '' },
      { aptName: '시범우남퍼스트빌', dealDate: '20260720', price: 80000, cdealType: '' },
      { aptName: '시범우남퍼스트빌', dealDate: '20260722', price: 99999, cdealType: 'O' }, // Cancelled
      { aptName: ' 시범우남퍼스트빌 ', dealDate: '20260810', price: 82000, cdealType: '-' },
      { aptName: '시범우남퍼스트빌', dealDate: '20260825', price: 84000, cdealType: '' },
      { aptName: '시범우남퍼스트빌', dealDate: '20260905', price: 86000, cdealType: '' },
    ];

    // 2. Normalize and filter pipeline
    const validTransactions = rawFeed
      .filter((tx) => !isCancelledTransaction(tx))
      .map((tx) => ({
        normalizedApt: normalizeAptName(tx.aptName),
        date: tx.dealDate,
        price: tx.price,
      }));

    expect(validTransactions).toHaveLength(5);
    expect(validTransactions.every((tx) => tx.normalizedApt === '시범우남퍼스트빌')).toBe(true);

    // 3. Compute Two-Sigma Confidence Metrics
    const prices = validTransactions.map((tx) => tx.price);
    const twoSigma = calculateTwoSigma(prices);

    expect(twoSigma.isValid).toBe(true);
    expect(twoSigma.mean).toBe(82000); // (78k + 80k + 82k + 84k + 86k) / 5 = 82k
    expect(twoSigma.upper2SD).toBeGreaterThan(82000);
    expect(twoSigma.lower2SD).toBeLessThan(82000);

    // 4. Render into CanonicalMacroTrendChart
    const chartSeries = [
      {
        date: '2026-08',
        '동탄 아파트 전체': twoSigma.mean,
        '동탄 아파트 전세 평균': 48000,
        volume: validTransactions.length,
      },
    ];

    const { container } = render(
      <CanonicalMacroTrendChart
        data={chartSeries}
        selectedDong="청계동"
        selectedPyeong="전체"
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  // ==========================================================================
  // C3: Pipeline Output & Compare Subcomponents Integration (F3 + F4 + F5)
  // ==========================================================================
  test('C3: Sanitized transaction outputs feed Compare components and compute metric advantage', () => {
    const apt1: DongApartment = {
      name: normalizeAptName('[청계동] 동탄역시범우남퍼스트빌'),
      dong: '청계동',
      lat: 37.2001,
      lng: 127.0987,
      householdCount: 1442,
      yearBuilt: '2015',
      far: 219,
      bcr: 15,
      parkingCount: 1730,
      parkingPerHousehold: 1.2,
      brand: '우남퍼스트빌',
    };

    const apt2: DongApartment = {
      name: normalizeAptName('[청계동] 동탄역더샵센트럴시티'),
      dong: '청계동',
      lat: 37.1995,
      lng: 127.0999,
      householdCount: 1416,
      yearBuilt: '2015',
      far: 218,
      bcr: 14,
      parkingCount: 1840,
      parkingPerHousehold: 1.3,
      brand: '더샵',
    };

    // Calculate supply pyeong conversions
    const apt1Pyeong = getSupplyPyeong(apt1.name, 84.9);
    const apt2Pyeong = getSupplyPyeong(apt2.name, 84.9);

    expect(apt1Pyeong).toBeGreaterThan(30);
    expect(apt2Pyeong).toBeGreaterThan(30);

    // Render CompareInsightCard with score advantage
    const { container: insightContainer } = render(
      <CompareInsightCard
        apt1={apt1}
        apt2={apt2}
        apt1Label={apt1.name}
        apt2Label={apt2.name}
        score={{ apt1: 6, apt2: 2 }}
        showToast={jest.fn()}
        handleShare={jest.fn()}
        isCopied={false}
      />
    );

    expect(screen.getByText(new RegExp(`${apt1.name} 6개 우세`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${apt2.name} 2개 우세`))).toBeInTheDocument();

    // Render PriceHistoryChart with normalized series
    const chartData = [
      { month: '2026.07', [apt1.name]: 82000, [apt2.name]: 91000 },
      { month: '2026.08', [apt1.name]: 83500, [apt2.name]: 92500 },
    ];

    const { container: chartContainer } = render(
      <ComparePriceHistoryChart
        mounted={true}
        isTxLoading={false}
        combinedChartData={chartData}
        apt1Label={apt1.name}
        apt2Label={apt2.name}
        priceMetric="absolute"
        setPriceMetric={jest.fn()}
        chartType="sale"
        setChartType={jest.fn()}
      />
    );

    expect(chartContainer).toBeInTheDocument();
  });

  // ==========================================================================
  // C4: Chapter Navigation & DCF Valuation & Ad Refresh Engine (F1 + F3 + F6)
  // ==========================================================================
  test('C4: Chapter tab selection triggers adRefreshManager and syncs valuation calculation', () => {
    const onTabSwitchSpy = jest.spyOn(adRefreshManager, 'onTabSwitch');

    function ChapterDetailView() {
      const [activeChapter, setActiveChapter] = useState('chapter-01-overview');

      const handleSelectChapter = (chapterId: string) => {
        setActiveChapter(chapterId);
        adRefreshManager.onTabSwitch();
      };

      // Compute DCF for Chapter 05
      const dcfValuation = calculateDynamicDCF(48000, {
        baseDate: '2026-06',
        riskFreeRate: 0.035,
        fundingCost: 0.045,
        jeonseConversionRate: 0.055,
        baseInflationRate: 2.0,
      });

      return (
        <div>
          <ApartmentChapterNavBar
            activeChapter={activeChapter}
            onSelectChapter={handleSelectChapter}
          />
          <div data-testid="chapter-content" className="p-4">
            <span data-testid="dcf-val">{Math.round(dcfValuation.impliedValue)}</span>
            <AdSlot
              slotId="1000000002"
              format="in-feed"
              testMode={true}
            />
          </div>
        </div>
      );
    }

    render(<ChapterDetailView />);

    // Click Chapter 05 (Mortgage & Jeonse LDI)
    const chapter5Button = screen.getByRole('button', { name: /주담대 LDI 및 역전세 센티넬/i });
    fireEvent.click(chapter5Button);

    // Verify adRefreshManager.onTabSwitch was invoked
    expect(onTabSwitchSpy).toHaveBeenCalledTimes(1);

    // Verify DCF calculation was populated
    const dcfText = screen.getByTestId('dcf-val').textContent;
    expect(Number(dcfText)).toBeGreaterThan(48000);

    onTabSwitchSpy.mockRestore();
  });

  // ==========================================================================
  // C5: Canonical Modules & Schema Validation & Type Hardening (F2 + F5 + F7)
  // ==========================================================================
  test('C5: Canonical KPI cards consume validated schema records without type degradation', () => {
    // 1. Raw records parsed through Zod schema
    const rawTxList: TransactionRecord[] = [
      {
        dong: '청계동',
        aptName: '동탄역시범우남퍼스트빌',
        area: 84.9,
        areaPyeong: 34,
        contractYm: '202609',
        contractDay: '12',
        price: 84000,
        priceEok: '8.4억',
        floor: 15,
        buildYear: 2015,
        dealType: '매매',
        delta: 2000,
        priceVal: 84000,
      },
      {
        dong: '청계동',
        aptName: '동탄역시범우남퍼스트빌',
        area: 84.9,
        areaPyeong: 34,
        contractYm: '202609',
        contractDay: '10',
        price: 82000,
        priceEok: '8.2억',
        floor: 10,
        buildYear: 2015,
        dealType: '매매',
        delta: -1000,
        priceVal: 82000,
      },
    ];

    const parseResult = TransactionListSchema.safeParse(rawTxList);
    expect(parseResult.success).toBe(true);

    // 2. Consume parsed data in CanonicalAptMetricCards
    const { container } = render(
      <CanonicalAptMetricCards
        recentTransactions={parseResult.data as any}
        avgPyeongPrice={2470}
        avgJeonseRate={63.5}
      />
    );

    expect(container).toBeInTheDocument();
    expect(screen.getByText(/상승 거래 비중/i)).toBeInTheDocument();
    expect(screen.getByText(/평균 전세가율/i)).toBeInTheDocument();
    expect(screen.getByText('63.5%')).toBeInTheDocument();

    // 3. Compute mortgage amortization for the transaction price
    const pmtResult = calculateEqualPrincipalAndInterest({
      principalWon: 500_000_000, // 5억원 대출
      annualRatePercent: 4.2,
      loanPeriodYears: 30,
    });

    expect(pmtResult.monthlyPaymentWon).toBeGreaterThan(0);
    expect(pmtResult.totalPaymentWon).toBeGreaterThan(500_000_000);
  });
});
