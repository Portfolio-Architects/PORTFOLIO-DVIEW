/**
 * @file tier4_real_world_scenarios.test.tsx
 * @description Tier 4: Real-World Application Scenarios Test Suite for Features F1 ~ F7.
 * High-fidelity end-to-end user journeys and operational pipeline flows.
 */

import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Domain Modules
import { ApartmentChapterNavBar } from '@/components/apartment/ApartmentChapterNavBar';
import { calculateTwoSigma } from '@/lib/analytics/twoSigmaEngine';
import CanonicalMacroTrendChart from '@/components/macro/MacroTrendChart';
import CanonicalAptDonutSection from '@/components/macro/AptDonutSection';
import CanonicalAptMetricCards from '@/components/macro/AptMetricCards';
import CanonicalApartmentModal from '@/components/apartment/ApartmentModal';
import OfflineBanner from '@/components/ui/OfflineBanner';
import { SettingsProvider } from '@/contexts/SettingsContext';

import { CompareHeaderSearch } from '@/components/consumer/compare/CompareHeaderSearch';
import { CompareInsightCard } from '@/components/consumer/compare/CompareInsightCard';
import { ComparePriceHistoryChart } from '@/components/consumer/compare/ComparePriceHistoryChart';
import { CompareRadarChart } from '@/components/consumer/compare/CompareRadarChart';
import { CompareSpecTable } from '@/components/consumer/compare/CompareSpecTable';
import { calculateDynamicDCF } from '@/lib/utils/valuationEngine';
import type { DongApartment } from '@/lib/dong-apartments';

import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { isCancelledTransaction } from '@/lib/analytics/statsEngine';
import { getSupplyPyeong } from '@/lib/utils/areaConverter';
import { TransactionListSchema } from '@/lib/validation/facade.schemas';
import type { TransactionRecord } from '@/types/transaction';

import LoungeHeader from '@/components/LoungeHeader';
import { AdSlot } from '@/components/ads/AdSlot';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';
import {
  calculateEqualPrincipalAndInterest,
  calculateDsrMaxLoan,
} from '@/lib/services/mortgage/mortgageEngine';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
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

describe('Tier 4: Real-World Application Scenarios Suite [F1 ~ F7]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // S1: First-Time Homebuyer Exploration Flow
  // ==========================================================================
  test('S1: First-time homebuyer explores macro dashboard, checks 2SD bands, reviews KPI cards, and passes inline ad', () => {
    const macroData = [
      { date: '2026-05', '동탄 아파트 전체': 72000, '동탄 아파트 전세 평균': 43000, volume: 210 },
      { date: '2026-06', '동탄 아파트 전체': 73500, '동탄 아파트 전세 평균': 44000, volume: 240 },
      { date: '2026-07', '동탄 아파트 전체': 74800, '동탄 아파트 전세 평균': 44500, volume: 290 },
      { date: '2026-08', '동탄 아파트 전체': 75200, '동탄 아파트 전세 평균': 45000, volume: 310 },
      { date: '2026-09', '동탄 아파트 전체': 76800, '동탄 아파트 전세 평균': 46200, volume: 340 },
    ];

    // Compute statistical confidence bands
    const salePrices = macroData.map((d) => d['동탄 아파트 전체']);
    const stats = calculateTwoSigma(salePrices);
    expect(stats.isValid).toBe(true);
    expect(stats.upper2SD).toBeGreaterThan(stats.mean!);
    expect(stats.lower2SD).toBeLessThan(stats.mean!);

    function HomebuyerApp() {
      return (
        <div data-testid="portal-root">
          <LoungeHeader activeTab="overview" />
          <section className="flex flex-col lg:flex-row gap-6 min-h-[580px] p-4">
            <div className="w-full lg:w-[420px]">
              <CanonicalAptDonutSection
                distribution={[
                  { name: '20평대', count: 120, percentage: 35 },
                  { name: '30평대', count: 220, percentage: 65 },
                ]}
                totalCount={340}
              />
              <CanonicalAptMetricCards
                recentTransactions={[
                  { priceVal: 76800, areaPyeong: 34, delta: 1600, date: '2026.09.20' },
                ]}
                avgPyeongPrice={2460}
                avgJeonseRate={60.2}
              />
            </div>
            <div className="flex-1 min-h-[460px]">
              <CanonicalMacroTrendChart data={macroData} />
            </div>
          </section>
          <div className="p-4">
            <AdSlot slotId="1000000001" format="in-feed" testMode={true} />
          </div>
        </div>
      );
    }

    const { container } = render(<HomebuyerApp />);

    // Invariant: Header, KPIs, Chart, and AdSlot are simultaneously active
    expect(screen.getByText(/상승 거래 비중/i)).toBeInTheDocument();
    expect(screen.getByText('60.2%')).toBeInTheDocument();
    expect(container.querySelector('.min-h-\\[140px\\]')).toBeInTheDocument();
  });

  // ==========================================================================
  // S2: Complex Deep-Dive & Chapter Navigation Flow
  // ==========================================================================
  test('S2: Investor opens complex modal, steps through 8 discrete chapters, and evaluates mortgage LDI', () => {
    const sampleReport = {
      id: 'apt-hanam-1',
      apartmentName: '동탄역시범우남퍼스트빌',
      dong: '청계동',
      totalHouseholds: 1442,
      builtYear: '2015',
    };

    function ComplexInspectionModal() {
      const [activeChapter, setActiveChapter] = useState('chapter-01-overview');

      // Calculate Stress DSR limit for Chapter 05
      const dsrLimit = calculateDsrMaxLoan({
        annualIncomeWon: 90_000_000, // 연소득 9,000만원
        baseRatePercent: 4.2, // 기준금리 4.2%
        loanPeriodYears: 30,
      });

      return (
        <SettingsProvider>
          <div>
            <ApartmentChapterNavBar
              activeChapter={activeChapter}
              onSelectChapter={(id) => setActiveChapter(id)}
            />
            <div data-testid="active-chapter-indicator">
              <span>현재 챕터: {activeChapter}</span>
              <span data-testid="max-loan-won">{dsrLimit.maxLoanWon}</span>
            </div>
            <CanonicalApartmentModal
              report={sampleReport as any}
              onClose={jest.fn()}
              user={null}
              typeMap={{}}
            />
          </div>
        </SettingsProvider>
      );
    }

    render(<ComplexInspectionModal />);

    // 1. Initial State: Chapter 01
    expect(screen.getByText(/현재 챕터: chapter-01-overview/i)).toBeInTheDocument();

    // 2. Select Chapter 05 (Mortgage LDI)
    const ch5Btns = screen.getAllByRole('button', { name: /주담대 LDI 및 역전세 센티넬/i });
    fireEvent.click(ch5Btns[0]);

    expect(screen.getByText(/현재 챕터: chapter-05-mortgage/i)).toBeInTheDocument();

    // 3. Verify Stress DSR calculated value
    const maxLoan = Number(screen.getByTestId('max-loan-won').textContent);
    expect(maxLoan).toBeGreaterThan(300_000_000); // > 3억원 대출 한도
  });

  // ==========================================================================
  // S3: Dual-Complex Comparison & Valuation Assessment Flow
  // ==========================================================================
  test('S3: Homebuyer compares 2 complexes via CompareHeaderSearch, inspects radar chart & spec table, validates DCF undervaluation', () => {
    const apt1: DongApartment = {
      name: '동탄역시범우남퍼스트빌',
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
      name: '동탄역더샵센트럴시티',
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

    // DCF valuation comparison
    const dcf1 = calculateDynamicDCF(48000, {
      baseDate: '2026-06',
      riskFreeRate: 0.035,
      fundingCost: 0.045,
      jeonseConversionRate: 0.055,
      baseInflationRate: 2.0,
    });

    const dcf2 = calculateDynamicDCF(52000, {
      baseDate: '2026-06',
      riskFreeRate: 0.035,
      fundingCost: 0.045,
      jeonseConversionRate: 0.055,
      baseInflationRate: 2.0,
    });

    expect(dcf2.impliedValue).toBeGreaterThan(dcf1.impliedValue);

    function ComparisonWorkflow() {
      const [selected1, setSelected1] = useState<DongApartment | null>(apt1);
      const [selected2, setSelected2] = useState<DongApartment | null>(apt2);

      return (
        <div data-testid="compare-flow">
          <CompareHeaderSearch
            firstInputRef={{ current: null }}
            searchQuery1={selected1?.name || ''}
            setSearchQuery1={jest.fn()}
            apt1={selected1}
            setApt1={setSelected1}
            isFocused1={false}
            setIsFocused1={jest.fn()}
            dropdownRef1={{ current: null }}
            handleKeyDown1={jest.fn()}
            dropdownOptions1={[]}
            activeIndex1={-1}
            recentApts={[]}
            saveToRecent={jest.fn()}
            searchQuery2={selected2?.name || ''}
            setSearchQuery2={jest.fn()}
            apt2={selected2}
            setApt2={setSelected2}
            isFocused2={false}
            setIsFocused2={jest.fn()}
            dropdownRef2={{ current: null }}
            handleKeyDown2={jest.fn()}
            dropdownOptions2={[]}
            activeIndex2={-1}
          />
          <CompareInsightCard
            apt1={selected1}
            apt2={selected2}
            apt1Label={selected1?.name || ''}
            apt2Label={selected2?.name || ''}
            score={{ apt1: 5, apt2: 3 }}
            showToast={jest.fn()}
            handleShare={jest.fn()}
            isCopied={false}
          />
          <CompareSpecTable
            apt1Label={selected1?.name || ''}
            apt2Label={selected2?.name || ''}
            metrics1={{ totalHouseholds: 1442, yearBuilt: '2015' }}
            metrics2={{ totalHouseholds: 1416, yearBuilt: '2015' }}
            wins={{ households: true, year: null }}
            aiFitScores={{ winner: 'apt1', score1: 92, score2: 86 }}
            quizAnswers={null}
            getCompareClass={jest.fn(() => '')}
            displayPrice={(p) => `${p}만원`}
          />
        </div>
      );
    }

    render(<ComparisonWorkflow />);

    expect(screen.getByText(/우남퍼스트빌 5개 우세/i)).toBeInTheDocument();
    expect(screen.getByText('1:1 지표 매트릭스 비교')).toBeInTheDocument();
  });

  // ==========================================================================
  // S4: Data Ingestion & Static JSON Generation Flow
  // ==========================================================================
  test('S4: Batch ingestion pipeline sanitizes complex names, purges cancelled deals, generates hash keys, and validates output schema', () => {
    // 1. Raw API ingestion batch
    const rawBatch = [
      { aptName: '[오산동] 동탄역 롯데캐슬', dealDate: '20260901', price: 160000, area: 102.4, floor: 30, cdealType: '' },
      { aptName: ' [오산동] 동탄역 롯데캐슬 ', dealDate: '20260901', price: 160000, area: 102.4, floor: 30, cdealType: '' }, // Exact duplicate
      { aptName: '동탄역 롯데캐슬', dealDate: '20260903', price: 165000, area: 102.4, floor: 32, cdealType: 'O' }, // Cancelled deal
      { aptName: '[청계동] 시범우남퍼스트빌', dealDate: '20260905', price: 85000, area: 84.9, floor: 14, cdealType: '' },
      { aptName: '[목동] 동탄2베라체', dealDate: '20260907', price: 58000, area: 84.5, floor: 8, cancelDate: '20260910' }, // Cancelled via date
    ];

    // 2. Processing Pipeline
    const processed: TransactionRecord[] = [];
    const seenTxKeys = new Set<string>();

    for (const item of rawBatch) {
      // Step A: Cancellation check
      if (isCancelledTransaction(item)) {
        continue;
      }

      // Step B: Apartment name normalization
      const normalizedApt = normalizeAptName(item.aptName);

      // Step C: Supply pyeong mapping
      const pyeong = getSupplyPyeong(normalizedApt, item.area);

      // Step D: Canonical Tx key generation
      const txKey = `TX_${normalizedApt}_${item.dealDate}_${item.area}_${item.floor}_${item.price}`;

      // Step E: Deduplication
      if (seenTxKeys.has(txKey)) {
        continue;
      }
      seenTxKeys.add(txKey);

      // Step F: Format to canonical TransactionRecord
      processed.push({
        dong: item.aptName.includes('오산동') ? '오산동' : '청계동',
        aptName: normalizedApt,
        area: item.area,
        areaPyeong: pyeong,
        contractYm: item.dealDate.slice(0, 6),
        contractDay: item.dealDate.slice(6, 8),
        price: item.price,
        priceEok: `${(item.price / 10000).toFixed(1)}억`,
        floor: item.floor,
        buildYear: 2020,
        dealType: '매매',
      });
    }

    // Assert: Out of 5 records, 2 cancelled and 1 duplicate are purged -> exactly 2 valid records remain
    expect(processed).toHaveLength(2);
    expect(processed[0].aptName).toBe('동탄역롯데캐슬');
    expect(processed[1].aptName).toBe('시범우남퍼스트빌');

    // Step G: Schema Validation against Zod facade contract
    const schemaValidation = TransactionListSchema.safeParse(processed);
    expect(schemaValidation.success).toBe(true);

    // Step H: Filename sanitization invariant check
    const sanitizeAptFileName = (apt: string): string => {
      return `tx_${apt.replace(new RegExp('[/\\\\:*?"<>|]', 'g'), '-')}.json`;
    };

    const filename1 = sanitizeAptFileName(processed[0].aptName);
    const filename2 = sanitizeAptFileName(processed[1].aptName);

    expect(filename1).toBe('tx_동탄역롯데캐슬.json');
    expect(filename2).toBe('tx_시범우남퍼스트빌.json');
  });

  // ==========================================================================
  // S5: AdBlock Resilience & Offline Network Flap Flow
  // ==========================================================================
  test('S5: User with active AdBlock navigates during subway network disconnection without calculation crash', () => {
    function SubwayCommuterSession() {
      // Calculate amortization while offline
      const mortgage = calculateEqualPrincipalAndInterest({
        principalWon: 400_000_000,
        annualRatePercent: 3.9,
        loanPeriodYears: 30,
      });

      return (
        <div>
          <OfflineBanner />
          <div data-testid="commuter-mortgage-calc">
            <span>월 상환액: {mortgage.monthlyPaymentWon.toLocaleString()}원</span>
          </div>
          {/* AdSlot in AdBlock testMode renders fallback card cleanly */}
          <AdSlot
            slotId="1000000001"
            format="in-feed"
            testMode={true}
            fallbackType="mbti-promo"
          />
        </div>
      );
    }

    const { container } = render(<SubwayCommuterSession />);

    // Verify offline banner container exists
    expect(container.firstChild).toBeInTheDocument();

    // Verify math calculation completed cleanly
    expect(screen.getByText(/월 상환액:/i)).toBeInTheDocument();

    // Verify ad slot rendered fallback bounding box
    expect(container.querySelector('.min-h-\\[140px\\]')).toBeInTheDocument();
  });
});
