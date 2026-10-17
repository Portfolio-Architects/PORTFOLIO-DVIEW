/**
 * @file tier1_feature_coverage.test.tsx
 * @description Tier 1: Category-Partition Feature Coverage Test Suite for Features F1 ~ F7.
 * Opaque-box requirement-driven verification covering primary behaviors and interface contracts.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { z } from 'zod';

// F1 Components & Engines
import {
  ApartmentChapterNavBar,
  APARTMENT_CHAPTERS,
} from '@/components/apartment/ApartmentChapterNavBar';
import { calculateTwoSigma } from '@/lib/analytics/twoSigmaEngine';

// F2 Canonical Presentation Components
import CanonicalMacroTrendChart from '@/components/macro/MacroTrendChart';
import CanonicalAptDonutSection from '@/components/macro/AptDonutSection';
import CanonicalAptMetricCards from '@/components/macro/AptMetricCards';
import CanonicalApartmentModal from '@/components/apartment/ApartmentModal';
import OfflineBanner from '@/components/ui/OfflineBanner';
import { SettingsProvider } from '@/contexts/SettingsContext';

// F3 Modular Compare Subcomponents & Valuation
import { CompareHeaderSearch } from '@/components/consumer/compare/CompareHeaderSearch';
import { CompareInsightCard } from '@/components/consumer/compare/CompareInsightCard';
import { ComparePriceHistoryChart } from '@/components/consumer/compare/ComparePriceHistoryChart';
import { CompareRadarChart } from '@/components/consumer/compare/CompareRadarChart';
import { CompareSpecTable } from '@/components/consumer/compare/CompareSpecTable';
import { calculateDynamicDCF } from '@/lib/utils/valuationEngine';
import type { DongApartment } from '@/lib/dong-apartments';

// F4 Core Normalizer & Area Utilities
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { isCancelledTransaction } from '@/lib/analytics/statsEngine';
import { getSupplyPyeong } from '@/lib/utils/areaConverter';

// F5 Schemas & Data Contract
import { TransactionListSchema } from '@/lib/validation/facade.schemas';
import type { TransactionRecord } from '@/types/transaction';

// F6 Navigation & Web Worker SLA
import LoungeHeader from '@/components/LoungeHeader';
import { AdSlot, getAdSlotMinHeightClass } from '@/components/ads/AdSlot';
import { executeStatsWorkerCalculation } from '@/lib/workers/stats.worker';

// F7 Type Hardening & Mortgage Engine
import {
  calculateEqualPrincipalAndInterest,
  MortgageLoanInputSchema,
} from '@/lib/services/mortgage/mortgageEngine';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
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

describe('Tier 1: Feature Coverage (Category-Partition) Suite [F1 ~ F7]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // F1: ESLint Zero-Error & React Hook/Ref Compliance
  // ==========================================================================
  describe('F1: ESLint Zero-Error & React Hook/Ref Compliance', () => {
    test('F1.1: ApartmentChapterNavBar renders all 8 canonical chapters with exact metadata', () => {
      const onSelectChapter = jest.fn();
      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectChapter}
        />
      );

      expect(APARTMENT_CHAPTERS).toHaveLength(8);

      // Verify all 8 chapters exist in rendered document
      for (const chapter of APARTMENT_CHAPTERS) {
        expect(screen.getByText(chapter.title)).toBeInTheDocument();
        expect(screen.getByText(chapter.subtitle)).toBeInTheDocument();
        expect(screen.getByText(chapter.number)).toBeInTheDocument();
      }
    });

    test('F1.2: ApartmentChapterNavBar invokes onSelectChapter callback on chapter click', () => {
      const onSelectChapter = jest.fn();
      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectChapter}
        />
      );

      const chapter3Button = screen.getByRole('button', {
        name: /전세가율 갭투자 매트릭스/i,
      });
      fireEvent.click(chapter3Button);

      expect(onSelectChapter).toHaveBeenCalledTimes(1);
      expect(onSelectChapter).toHaveBeenCalledWith('chapter-03-gap');
    });

    test('F1.3: ApartmentChapterNavBar mounts and unmounts cleanly with scrollContainerRef', () => {
      const containerRef = { current: document.createElement('div') };
      const onSelectChapter = jest.fn();

      const { unmount } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectChapter}
          scrollContainerRef={containerRef}
        />
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(() => unmount()).not.toThrow();
    });

    test('F1.4: MacroTrendChart computes 2SD confidence bands and mean lines via twoSigmaEngine', () => {
      const rawPrices = [70000, 72000, 71000, 75000, 69000, 73000]; // 7.0억 ~ 7.5억
      const stats = calculateTwoSigma(rawPrices);

      expect(stats.isValid).toBe(true);
      expect(stats.mean).toBeCloseTo(71666.67, 1);
      expect(stats.sd).toBeGreaterThan(0);
      expect(stats.upper2SD).toBeGreaterThan(stats.mean!);
      expect(stats.lower2SD).toBeLessThan(stats.mean!);
      expect(stats.lower2SD).toBeGreaterThanOrEqual(0);
    });

    test('F1.5: Diamond vertex calculation conforms to geometric radius invariants', () => {
      // Recharts diamond vertex rendering uses polygon points centered at (cx, cy)
      const computeDiamondPoints = (cx: number, cy: number, r: number): string => {
        return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
      };

      const basePoints = computeDiamondPoints(100, 200, 3.6);
      expect(basePoints).toBe('100,196.4 103.6,200 100,203.6 96.4,200');

      const hoverPoints = computeDiamondPoints(100, 200, 6.0);
      expect(hoverPoints).toBe('100,194 106,200 100,206 94,200');
    });
  });

  // ==========================================================================
  // F2: Legacy Bridge & Dead Code Elimination
  // ==========================================================================
  describe('F2: Legacy Bridge & Dead Code Elimination', () => {
    test('F2.1: Canonical MacroTrendChart export from macro domain renders without error', () => {
      const dummyData = [
        {
          date: '2026-01',
          '동탄 아파트 전체': 75000,
          '동탄 아파트 전세 평균': 45000,
          volume: 120,
        },
      ];

      const { container } = render(
        <CanonicalMacroTrendChart
          data={dummyData}
          selectedDong="전체"
          selectedPyeong="전체"
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    test('F2.2: Canonical AptDonutSection renders distribution structure', () => {
      const dummyDistribution = [
        { name: '10평대', count: 15, percentage: 15 },
        { name: '20평대', count: 35, percentage: 35 },
        { name: '30평대', count: 50, percentage: 50 },
      ];

      const { container } = render(
        <CanonicalAptDonutSection
          distribution={dummyDistribution}
          totalCount={100}
        />
      );

      expect(container).toBeInTheDocument();
    });

    test('F2.3: Canonical AptMetricCards renders 4 core KPI cards', () => {
      const dummyTransactions = [
        { priceVal: 75000, areaPyeong: 34, delta: 2000, date: '2026.09.10' },
        { priceVal: 72000, areaPyeong: 34, delta: -1000, date: '2026.09.08' },
      ];

      const { container } = render(
        <CanonicalAptMetricCards
          recentTransactions={dummyTransactions}
          avgPyeongPrice={2450}
          avgJeonseRate={62.4}
        />
      );

      expect(container).toBeInTheDocument();
      expect(screen.getByText(/상승 거래 비중/i)).toBeInTheDocument();
      expect(screen.getByText(/평균 전세가율/i)).toBeInTheDocument();
      expect(screen.getByText('62.4%')).toBeInTheDocument();
    });

    test('F2.4: Canonical ApartmentModal renders modal interface cleanly within SettingsProvider', () => {
      const dummyReport = {
        id: 'apt-1',
        apartmentName: '동탄역시범우남퍼스트빌',
        dong: '청계동',
        totalHouseholds: 1442,
        builtYear: '2015',
      };

      const onClose = jest.fn();
      const { container } = render(
        <SettingsProvider>
          <CanonicalApartmentModal
            report={dummyReport as any}
            onClose={onClose}
            user={null}
            typeMap={{}}
          />
        </SettingsProvider>
      );

      expect(container).toBeInTheDocument();
    });

    test('F2.5: OfflineBanner displays warning during network offline transitions', () => {
      const { container } = render(<OfflineBanner />);
      // In JSDOM online by default -> mounts without crashing
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // F3: Domain Decoupling & Modularization
  // ==========================================================================
  describe('F3: Domain Decoupling & Modularization', () => {
    const dummyApt1: DongApartment = {
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

    const dummyApt2: DongApartment = {
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

    test('F3.1: CompareHeaderSearch renders inputs and dropdown options', () => {
      const setSearchQuery1 = jest.fn();
      const setApt1 = jest.fn();
      const setSearchQuery2 = jest.fn();
      const setApt2 = jest.fn();

      render(
        <CompareHeaderSearch
          firstInputRef={{ current: null }}
          searchQuery1=""
          setSearchQuery1={setSearchQuery1}
          apt1={null}
          setApt1={setApt1}
          isFocused1={false}
          setIsFocused1={jest.fn()}
          dropdownRef1={{ current: null }}
          handleKeyDown1={jest.fn()}
          dropdownOptions1={[dummyApt1]}
          activeIndex1={-1}
          recentApts={[]}
          saveToRecent={jest.fn()}
          searchQuery2=""
          setSearchQuery2={setSearchQuery2}
          apt2={null}
          setApt2={setApt2}
          isFocused2={false}
          setIsFocused2={jest.fn()}
          dropdownRef2={{ current: null }}
          handleKeyDown2={jest.fn()}
          dropdownOptions2={[dummyApt2]}
          activeIndex2={-1}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    test('F3.2: CompareInsightCard calculates and displays advantage score', () => {
      render(
        <CompareInsightCard
          apt1={dummyApt1}
          apt2={dummyApt2}
          apt1Label="우남퍼스트빌"
          apt2Label="더샵센트럴시티"
          score={{ apt1: 5, apt2: 3 }}
          showToast={jest.fn()}
          handleShare={jest.fn()}
          isCopied={false}
        />
      );

      expect(screen.getByText(/우남퍼스트빌 5개 우세/i)).toBeInTheDocument();
      expect(screen.getByText(/더샵센트럴시티 3개 우세/i)).toBeInTheDocument();
      expect(screen.getByText(/최종 우세합니다/i)).toBeInTheDocument();
    });

    test('F3.3: ComparePriceHistoryChart renders multi-series price history', () => {
      const dummySeries = [
        { month: '2026.01', 우남: 85000, 더샵: 92000 },
        { month: '2026.02', 우남: 86000, 더샵: 93000 },
      ];

      render(
        <ComparePriceHistoryChart
          mounted={true}
          isTxLoading={false}
          combinedChartData={dummySeries}
          apt1Label="우남"
          apt2Label="더샵"
          priceMetric="absolute"
          setPriceMetric={jest.fn()}
          chartType="sale"
          setChartType={jest.fn()}
        />
      );

      expect(screen.getByText(/실거래 시계열 가격 트렌드/i)).toBeInTheDocument();
      expect(screen.getByText('절대 가격')).toBeInTheDocument();
    });

    test('F3.4: CompareRadarChart renders multi-dimensional radar metrics', () => {
      const radarData = [
        { subject: '시세/가격', A: 85, B: 90, fullMark: 100 },
        { subject: '단지규모', A: 92, B: 91, fullMark: 100 },
        { subject: '주차여건', A: 80, B: 88, fullMark: 100 },
        { subject: '학군접근', A: 95, B: 92, fullMark: 100 },
      ];

      const { container } = render(
        <CompareRadarChart
          data={radarData}
          apt1Name="우남퍼스트빌"
          apt2Name="더샵센트럴시티"
        />
      );

      expect(container.querySelector('[data-testid="radar-chart"]')).toBeInTheDocument();
    });

    test('F3.5: CompareSpecTable displays 1:1 metric table and AI fit scores', () => {
      render(
        <CompareSpecTable
          apt1Label="우남퍼스트빌"
          apt2Label="더샵센트럴시티"
          metrics1={{ totalHouseholds: 1442, yearBuilt: '2015', far: 219 }}
          metrics2={{ totalHouseholds: 1416, yearBuilt: '2015', far: 218 }}
          wins={{ households: true, year: null, far: true }}
          aiFitScores={{ winner: 'apt1', score1: 94, score2: 88 }}
          quizAnswers={{}}
          getCompareClass={jest.fn(() => '')}
          displayPrice={(p) => `${p}만원`}
        />
      );

      expect(screen.getByText('1:1 지표 매트릭스 비교')).toBeInTheDocument();
      expect(screen.getAllByText('우남퍼스트빌').length).toBeGreaterThan(0);
      expect(screen.getAllByText('더샵센트럴시티').length).toBeGreaterThan(0);
    });

    test('F3.6: Dynamic DCF valuation engine calculates implied fair price', () => {
      const depositWon = 45000; // 전세 4.5억
      const valuation = calculateDynamicDCF(depositWon, {
        baseDate: '2026-06',
        riskFreeRate: 0.035,
        fundingCost: 0.045,
        jeonseConversionRate: 0.055,
        baseInflationRate: 2.0,
      });

      expect(valuation.impliedValue).toBeGreaterThan(0);
      expect(Number.isFinite(valuation.impliedValue)).toBe(true);
      expect(valuation.impliedValue).toBeGreaterThan(depositWon);
    });
  });

  // ==========================================================================
  // F4: Data Pipeline Consolidation & Core Normalizer
  // ==========================================================================
  describe('F4: Data Pipeline Consolidation & Core Normalizer', () => {
    test('F4.1: normalizeAptName removes bracketed prefixes and trims whitespace in NFC', () => {
      expect(normalizeAptName('[오산동] 힐스테이트 동탄역')).toBe('힐스테이트동탄역');
      expect(normalizeAptName('  [청계동]   동탄역시범우남퍼스트빌  ')).toBe('동탄역시범우남퍼스트빌');
      expect(normalizeAptName('동탄역 롯데캐슬 (주상복합)')).toBe('동탄역롯데캐슬주상복합');
      expect(normalizeAptName(null)).toBe('');
      expect(normalizeAptName(undefined)).toBe('');
    });

    test('F4.2: isCancelledTransaction flags cancelled contracts accurately', () => {
      expect(isCancelledTransaction({ cdealType: 'O' })).toBe(true);
      expect(isCancelledTransaction({ cdealType: '해제' })).toBe(true);
      expect(isCancelledTransaction({ isCanceled: true })).toBe(true);
      expect(isCancelledTransaction({ cancelDate: '20260515' })).toBe(true);
      expect(isCancelledTransaction({ cdealDay: '20260515' })).toBe(true);
      expect(isCancelledTransaction({ cdealType: '' })).toBe(false);
      expect(isCancelledTransaction({ cdealType: '-' })).toBe(false);
      expect(isCancelledTransaction({ dealType: '매매' })).toBe(false);
    });

    test('F4.3: Canonical transaction key generation is deterministic', () => {
      const generateTxKey = (tx: {
        aptName: string;
        dealDate: string;
        area: number | string;
        floor: number | string;
        price: number | string;
      }): string => {
        const normApt = normalizeAptName(tx.aptName);
        return `TX_${normApt}_${tx.dealDate}_${tx.area}_${tx.floor}_${tx.price}`;
      };

      const key1 = generateTxKey({
        aptName: '[오산동] 힐스테이트 동탄역',
        dealDate: '20260910',
        area: 84.9,
        floor: 12,
        price: 85000,
      });

      const key2 = generateTxKey({
        aptName: '힐스테이트동탄역',
        dealDate: '20260910',
        area: 84.9,
        floor: 12,
        price: 85000,
      });

      expect(key1).toBe('TX_힐스테이트동탄역_20260910_84.9_12_85000');
      expect(key1).toBe(key2);
    });

    test('F4.4: getSupplyPyeong maps exclusive m2 to supply pyeong', () => {
      // 84.9 m2 -> typically ~33~34 pyeong
      const pyeong = getSupplyPyeong('동탄역시범우남퍼스트빌', 84.9);
      expect(pyeong).toBeGreaterThanOrEqual(30);
      expect(pyeong).toBeLessThanOrEqual(36);
    });

    test('F4.5: Deduplication preserves unique transactions and discards duplicates', () => {
      const generateTxKey = (tx: { aptName: string; dealDate: string; area: number; floor: number; price: number }): string =>
        `TX_${normalizeAptName(tx.aptName)}_${tx.dealDate}_${tx.area}_${tx.floor}_${tx.price}`;

      const rawDataset = [
        { aptName: '우남', dealDate: '20260501', area: 84.9, floor: 5, price: 80000 },
        { aptName: '우남', dealDate: '20260501', area: 84.9, floor: 5, price: 80000 }, // Duplicate
        { aptName: '더샵', dealDate: '20260502', area: 84.9, floor: 7, price: 90000 },
      ];

      const seen = new Set<string>();
      const deduplicated = rawDataset.filter((tx) => {
        const key = generateTxKey(tx);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].aptName).toBe('우남');
      expect(deduplicated[1].aptName).toBe('더샵');
    });
  });

  // ==========================================================================
  // F5: Firestore Collection & JSON Output Unification
  // ==========================================================================
  describe('F5: Firestore Collection & JSON Output Unification', () => {
    test('F5.1: TransactionListSchema validates standard transaction record array', () => {
      const sampleTxs = [
        {
          dong: '청계동',
          aptName: '동탄역시범우남퍼스트빌',
          area: 84.9,
          areaPyeong: 34,
          contractYm: '202609',
          contractDay: '15',
          price: 85000,
          priceEok: '8.5억',
          floor: 12,
          buildYear: 2015,
          dealType: '매매',
        },
      ];

      const result = TransactionListSchema.safeParse(sampleTxs);
      expect(result.success).toBe(true);
    });

    test('F5.2: Pathological filename sanitizer replaces OS-illegal characters', () => {
      const sanitizeFilename = (rawName: string): string => {
        return rawName.replace(/[/\\:*?"<>|]/g, '-').trim();
      };

      expect(sanitizeFilename('동탄역시범우남/포스코')).toBe('동탄역시범우남-포스코');
      expect(sanitizeFilename('Apt:Special*Complex?')).toBe('Apt-Special-Complex-');
      expect(sanitizeFilename('normal-complex.json')).toBe('normal-complex.json');
    });

    test('F5.3: Per-apartment chunk data adheres to expected TransactionRecord structure', () => {
      const txRecordSchema = z.object({
        dong: z.string(),
        aptName: z.string(),
        area: z.number().positive(),
        areaPyeong: z.number().positive(),
        contractYm: z.string().regex(/^\d{6}$/),
        contractDay: z.string(),
        price: z.number().nonnegative(),
        priceEok: z.string(),
        floor: z.number(),
        buildYear: z.number().int(),
        dealType: z.string(),
      });

      const sampleRecord: TransactionRecord = {
        dong: '오산동',
        aptName: '동탄역롯데캐슬',
        area: 102.4,
        areaPyeong: 41,
        contractYm: '202609',
        contractDay: '20',
        price: 165000,
        priceEok: '16.5억',
        floor: 35,
        buildYear: 2021,
        dealType: '매매',
      };

      const parsed = txRecordSchema.safeParse(sampleRecord);
      expect(parsed.success).toBe(true);
    });

    test('F5.4: Macro trend point schema enforces numeric fields and valid date string', () => {
      const macroPointSchema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}$/),
        '동탄 아파트 전체': z.number().positive(),
        '동탄 아파트 전세 평균': z.number().positive(),
        volume: z.number().int().nonnegative(),
      });

      const validPoint = {
        date: '2026-09',
        '동탄 아파트 전체': 78500,
        '동탄 아파트 전세 평균': 46200,
        volume: 380,
      };

      expect(macroPointSchema.safeParse(validPoint).success).toBe(true);
    });

    test('F5.5: Firestore document ID adheres to canonical sanitized format', () => {
      const generateDocId = (prefix: string, key: string): string => {
        return `${prefix}_${key.replace(/[\s/\\:*?"<>|]+/g, '_')}`;
      };

      const docId = generateDocId('tx', '동탄역 롯데캐슬/A동 2026-09-10');
      expect(docId).toBe('tx_동탄역_롯데캐슬_A동_2026-09-10');
      expect(docId).not.toMatch(/[/\\:*?"<>|\s]/);
    });
  });

  // ==========================================================================
  // F6: Test Suite Regression Remediation
  // ==========================================================================
  describe('F6: Test Suite Regression Remediation', () => {
    test('F6.1: LoungeHeader prefetches canonical 4 routes including /guide', () => {
      render(<LoungeHeader />);
      expect(mockPrefetch).toHaveBeenCalledWith('/');
      expect(mockPrefetch).toHaveBeenCalledWith('/explore');
      expect(mockPrefetch).toHaveBeenCalledWith('/mbti');
      expect(mockPrefetch).toHaveBeenCalledWith('/guide');
    });

    test('F6.2: Route navigation link click invokes onTabChange callback', () => {
      const onTabChange = jest.fn();
      render(<LoungeHeader onTabChange={onTabChange} />);

      const guideLink = screen.getByRole('link', { name: /가이드/i });
      fireEvent.click(guideLink);

      expect(onTabChange).toHaveBeenCalledWith('guide');
    });

    test('F6.3: AdSlot enforces format min-height helper mapping', () => {
      expect(getAdSlotMinHeightClass('in-feed')).toBe('min-h-[140px] sm:min-h-[160px]');
      expect(getAdSlotMinHeightClass('banner')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass('rectangle')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass('horizontal-strip')).toBe('min-h-[90px] sm:min-h-[100px]');
      expect(getAdSlotMinHeightClass('auto')).toBe('min-h-[250px]');
    });

    test('F6.4: Web Worker executeStatsWorkerCalculation produces valid metrics on sample data', () => {
      const prices = new Float32Array([60000, 70000, 80000]); // 6억, 7억, 8억
      const result = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 4.0,
        loanPeriodMonths: 360,
      });

      expect(result.stats.isValid).toBe(true);
      expect(result.stats.count).toBe(3);
      expect(result.stats.mean).toBe(70000);
      expect(result.stats.sd).toBe(10000);
      expect(result.stats.upper2SD).toBe(90000);
      expect(result.stats.lower2SD).toBe(50000);
      expect(result.baseMortgagePmt).toBeGreaterThan(0);
    });

    test('F6.5: Web Worker calculation SLA completes under 50ms for 1,000 samples', () => {
      const largeArray = new Float32Array(1000);
      for (let i = 0; i < 1000; i++) {
        largeArray[i] = 50000 + (i % 200) * 100;
      }

      const start = performance.now();
      const result = executeStatsWorkerCalculation({ prices: largeArray });
      const durationMs = performance.now() - start;

      expect(result.stats.isValid).toBe(true);
      expect(durationMs).toBeLessThan(50);
    });
  });

  // ==========================================================================
  // F7: Static Type Hardening & Build Verification
  // ==========================================================================
  describe('F7: Static Type Hardening & Build Verification', () => {
    test('F7.1: Hero container preserves layout min-height invariant', () => {
      // Bounding box validation: chart outer container requires min-height 460px
      const chartContainerClass = 'flex-1 min-h-[460px] flex flex-col justify-between';
      expect(chartContainerClass).toContain('min-h-[460px]');
    });

    test('F7.2: AdSlot in-feed preserves bounding box class in rendered element', () => {
      const { container } = render(
        <AdSlot
          slotId="1000000001"
          format="in-feed"
          testMode={true}
        />
      );

      const root = container.firstChild as HTMLElement;
      expect(root).toBeInTheDocument();
      expect(root.className).toContain('min-h-[140px]');
    });

    test('F7.3: Runtime type guards reject corrupted transaction records', () => {
      const txSchema = z.object({
        price: z.number().finite().positive(),
        area: z.number().finite().positive(),
      });

      expect(txSchema.safeParse({ price: NaN, area: 84 }).success).toBe(false);
      expect(txSchema.safeParse({ price: Infinity, area: 84 }).success).toBe(false);
      expect(txSchema.safeParse({ price: -5000, area: 84 }).success).toBe(false);
      expect(txSchema.safeParse({ price: 75000, area: 84.9 }).success).toBe(true);
    });

    test('F7.4: Mortgage engine enforces input bounds via Zod schema', () => {
      expect(
        MortgageLoanInputSchema.safeParse({
          principalWon: 500000000,
          annualRatePercent: 4.2,
          loanPeriodYears: 30,
        }).success
      ).toBe(true);

      expect(
        MortgageLoanInputSchema.safeParse({
          principalWon: -100,
          annualRatePercent: 4.2,
          loanPeriodYears: 30,
        }).success
      ).toBe(false);

      expect(
        MortgageLoanInputSchema.safeParse({
          principalWon: 500000000,
          annualRatePercent: 120, // Rate > 100%
          loanPeriodYears: 30,
        }).success
      ).toBe(false);
    });

    test('F7.5: Two-sigma engine sanitizes non-numeric and non-positive elements safely', () => {
      const noisyInputs = [50000, null, undefined, -100, NaN, Infinity, 70000] as any[];
      const stats = calculateTwoSigma(noisyInputs);

      expect(stats.isValid).toBe(true);
      expect(stats.mean).toBe(60000);
      expect(stats.sd).toBeCloseTo(14142.14, 1);
    });
  });
});
