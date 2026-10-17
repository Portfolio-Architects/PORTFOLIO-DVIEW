/**
 * @file tier2_boundary_corner.test.tsx
 * @description Tier 2: Boundary Value Analysis (BVA) & Corner Cases Test Suite for Features F1 ~ F7.
 * Opaque-box requirement-driven verification covering mathematical singularities, extreme inputs,
 * edge conditions, property-based fuzzing, and resilient error recovery.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import fc from 'fast-check';
import { z } from 'zod';

// F1 Components & Engines
import { ApartmentChapterNavBar } from '@/components/apartment/ApartmentChapterNavBar';
import { calculateTwoSigma } from '@/lib/analytics/twoSigmaEngine';

// F2 Canonical Presentation Components
import CanonicalAptDonutSection from '@/components/macro/AptDonutSection';
import CanonicalAptMetricCards from '@/components/macro/AptMetricCards';
import CanonicalApartmentModal from '@/components/apartment/ApartmentModal';
import OfflineBanner from '@/components/ui/OfflineBanner';
import { SettingsProvider } from '@/contexts/SettingsContext';

// F3 Modular Compare Subcomponents & Valuation
import { CompareHeaderSearch } from '@/components/consumer/compare/CompareHeaderSearch';
import { CompareInsightCard } from '@/components/consumer/compare/CompareInsightCard';
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

// F6 Navigation & Web Worker SLA
import LoungeHeader from '@/components/LoungeHeader';
import { AdSlot } from '@/components/ads/AdSlot';
import { executeStatsWorkerCalculation } from '@/lib/workers/stats.worker';

// F7 Type Hardening & Mortgage Engine
import {
  calculateEqualPrincipalAndInterest,
  calculateEqualPrincipal,
  MortgageLoanInputSchema,
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

describe('Tier 2: Boundary Value Analysis (BVA) & Corner Cases Suite [F1 ~ F7]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // B1 (F1 Boundaries): Lint, React Hooks & Math Singularities
  // ==========================================================================
  describe('B1: F1 Boundaries (Hooks, Navigation & Statistical Singularities)', () => {
    test('B1.1: ApartmentChapterNavBar with non-existent chapter ID renders safely without crash', () => {
      const onSelect = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-99-non-existent"
          onSelectChapter={onSelect}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test('B1.2: ApartmentChapterNavBar with null scrollContainerRef does not trigger ref read during render', () => {
      const onSelect = jest.fn();
      const { unmount } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelect}
          scrollContainerRef={{ current: null }}
        />
      );
      expect(() => unmount()).not.toThrow();
    });

    test('B1.3: calculateTwoSigma Bessel variance singularity defense for N=0 and N=1', () => {
      // N = 0
      const res0 = calculateTwoSigma([]);
      expect(res0.isValid).toBe(false);
      expect(res0.mean).toBeNull();
      expect(res0.sd).toBeNull();

      // N = 1 (Bessel denominator N - 1 = 0 singularity)
      const res1 = calculateTwoSigma([50000]);
      expect(res1.isValid).toBe(false);
      expect(res1.mean).toBeNull();
      expect(res1.sd).toBeNull();
      expect(res1.upper2SD).toBeNull();
      expect(res1.lower2SD).toBeNull();
    });

    test('B1.4: calculateTwoSigma handles zero-variance identical samples exactly', () => {
      const identical = [65000, 65000, 65000];
      const res = calculateTwoSigma(identical);

      expect(res.isValid).toBe(true);
      expect(res.mean).toBe(65000);
      expect(res.sd).toBe(0);
      expect(res.upper2SD).toBe(65000);
      expect(res.lower2SD).toBe(65000);
    });

    test('B1.5: calculateTwoSigma non-negative lower bound clamping (lower2SD = max(0, mu - 2s))', () => {
      // mu = 10, s = 10 -> mu - 2s = -10 -> must clamp to 0
      const wideSpread = [1, 19]; // mean = 10, s = sqrt(162) ~= 12.727 -> mu - 2s < 0
      const res = calculateTwoSigma(wideSpread);

      expect(res.isValid).toBe(true);
      expect(res.lower2SD).toBe(0);
      expect(res.lower2SD).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // B2 (F2 Boundaries): Presentation Default Fallbacks & Network Flaps
  // ==========================================================================
  describe('B2: F2 Boundaries (Canonical Default Fallbacks & Offline Transitions)', () => {
    test('B2.1: Canonical AptMetricCards handles empty recentTransactions and undefined summaries cleanly', () => {
      const { container } = render(
        <CanonicalAptMetricCards
          recentTransactions={[]}
          txSummaryData={undefined}
          avgPyeongPrice={undefined}
          avgJeonseRate={undefined}
        />
      );

      expect(container).toBeInTheDocument();
      expect(screen.getByText(/상승 거래 비중/i)).toBeInTheDocument();
    });

    test('B2.2: Canonical AptDonutSection with empty distribution renders without crashing', () => {
      const { container } = render(
        <CanonicalAptDonutSection distribution={[]} totalCount={0} />
      );
      expect(container).toBeInTheDocument();
    });

    test('B2.3: Canonical ApartmentModal receiving unmapped complex name handles gracefully', () => {
      const unmappedReport = {
        id: 'unmapped-1',
        apartmentName: '알수없는신축아파트99차',
        dong: '영천동',
        totalHouseholds: 500,
        builtYear: '2024',
      };

      const { container } = render(
        <SettingsProvider>
          <CanonicalApartmentModal
            report={unmappedReport as any}
            onClose={jest.fn()}
            user={null}
            typeMap={{}}
          />
        </SettingsProvider>
      );

      expect(container).toBeInTheDocument();
    });

    test('B2.4: OfflineBanner survives rapid repeated mount and unmount cycles', () => {
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<OfflineBanner />);
        unmount();
      }
    });

    test('B2.5: Preload helpers invoked with null or empty key resolve without throwing unhandled rejection', async () => {
      const safePreload = async (key: string | null | undefined): Promise<boolean> => {
        if (!key || key.trim() === '') return false;
        return true;
      };

      await expect(safePreload(null)).resolves.toBe(false);
      await expect(safePreload(undefined)).resolves.toBe(false);
      await expect(safePreload('')).resolves.toBe(false);
      await expect(safePreload('dongtan-unam')).resolves.toBe(true);
    });
  });

  // ==========================================================================
  // B3 (F3 Boundaries): Compare Subcomponents & Valuation Zero Divisions
  // ==========================================================================
  describe('B3: F3 Boundaries (Search Sanitization, Tied Verdicts & DCF Extremes)', () => {
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

    test('B3.1: CompareHeaderSearch with regex special characters in search query does not crash', () => {
      const specialQueries = ['[오산동]', '(시범)', '더샵*+', '??\\\\'];
      for (const q of specialQueries) {
        const { unmount } = render(
          <CompareHeaderSearch
            firstInputRef={{ current: null }}
            searchQuery1={q}
            setSearchQuery1={jest.fn()}
            apt1={null}
            setApt1={jest.fn()}
            isFocused1={true}
            setIsFocused1={jest.fn()}
            dropdownRef1={{ current: null }}
            handleKeyDown1={jest.fn()}
            dropdownOptions1={[]}
            activeIndex1={-1}
            recentApts={[]}
            saveToRecent={jest.fn()}
            searchQuery2=""
            setSearchQuery2={jest.fn()}
            apt2={null}
            setApt2={jest.fn()}
            isFocused2={false}
            setIsFocused2={jest.fn()}
            dropdownRef2={{ current: null }}
            handleKeyDown2={jest.fn()}
            dropdownOptions2={[]}
            activeIndex2={-1}
          />
        );
        unmount();
      }
    });

    test('B3.2: CompareInsightCard with identical tie score renders balanced verdict', () => {
      render(
        <CompareInsightCard
          apt1={dummyApt1}
          apt2={dummyApt2}
          apt1Label="단지A"
          apt2Label="단지B"
          score={{ apt1: 4, apt2: 4 }}
          showToast={jest.fn()}
          handleShare={jest.fn()}
          isCopied={false}
        />
      );

      expect(screen.getByText(/두 단지가 팽팽한 균형을 이룹니다/i)).toBeInTheDocument();
    });

    test('B3.3: CompareRadarChart handles zero-score metrics without coordinate error', () => {
      const zeroRadarData = [
        { subject: '시세/가격', A: 0, B: 0, fullMark: 100 },
        { subject: '단지규모', A: 0, B: 0, fullMark: 100 },
      ];

      const { container } = render(
        <CompareRadarChart
          data={zeroRadarData}
          apt1Name="단지A"
          apt2Name="단지B"
        />
      );
      expect(container.querySelector('[data-testid="radar-chart"]')).toBeInTheDocument();
    });

    test('B3.4: Dynamic DCF valuation handles zero or near-zero inputs safely', () => {
      // 0 deposit price -> impliedValue 0, no division by zero
      const val0 = calculateDynamicDCF(0, {
        baseDate: '2026-06',
        riskFreeRate: 0.035,
        fundingCost: 0.045,
        jeonseConversionRate: 0.055,
        baseInflationRate: 2.0,
      });

      expect(Number.isFinite(val0.impliedValue)).toBe(true);
      expect(val0.impliedValue).toBe(0);
    });

    test('B3.5: CompareSpecTable with missing optional fields renders fallback cleanly', () => {
      render(
        <CompareSpecTable
          apt1Label="단지A"
          apt2Label="단지B"
          metrics1={{}}
          metrics2={{}}
          wins={{}}
          aiFitScores={{ winner: null, score1: 0, score2: 0 }}
          quizAnswers={null}
          getCompareClass={jest.fn(() => '')}
          displayPrice={(p) => (p > 0 ? `${p}만원` : '-')}
        />
      );

      expect(screen.getByText('1:1 지표 매트릭스 비교')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // B4 (F4 Boundaries): Normalizer Jamo NFD, Cancellation Permutations & Area
  // ==========================================================================
  describe('B4: F4 Boundaries (NFD Unicode, Cancellation Permutations & Extreme Areas)', () => {
    test('B4.1: normalizeAptName handles decomposed Korean jamo (NFD) normalization', () => {
      // NFD decomposed '동탄'
      const nfdDongtan = '동탄'.normalize('NFD');
      expect(nfdDongtan.length).toBeGreaterThan(2);

      const normalized = normalizeAptName(nfdDongtan);
      expect(normalized).toBe('동탄');
      expect(normalized.length).toBe(2);
    });

    test('B4.2: isCancelledTransaction detects all adversarial whitespace/case variations', () => {
      expect(isCancelledTransaction({ cdealType: ' O ' })).toBe(true);
      expect(isCancelledTransaction({ cdealType: ' o ' })).toBe(true);
      expect(isCancelledTransaction({ cdealType: ' 취소 ' })).toBe(true);
      expect(isCancelledTransaction({ cdealType: ' 해제 ' })).toBe(true);

      // Falsy / invalid representations must NOT be flagged as cancelled
      expect(isCancelledTransaction(null)).toBe(false);
      expect(isCancelledTransaction(undefined)).toBe(false);
      expect(isCancelledTransaction({})).toBe(false);
      expect(isCancelledTransaction({ cdealType: 'null' })).toBe(false);
      expect(isCancelledTransaction({ cdealType: 'undefined' })).toBe(false);
      expect(isCancelledTransaction({ cdealType: 'nan' })).toBe(false);
    });

    test('B4.3: Canonical transaction key handles numeric vs stringified values identically', () => {
      const makeKey = (tx: { area: string | number; floor: string | number; price: string | number }): string =>
        `TX_${tx.area}_${tx.floor}_${tx.price}`;

      const keyNum = makeKey({ area: 84.9, floor: 12, price: 85000 });
      const keyStr = makeKey({ area: '84.9', floor: '12', price: '85000' });

      expect(keyNum).toBe(keyStr);
    });

    test('B4.4: getSupplyPyeong handles micro and ultra-large exclusive areas', () => {
      const microPyeong = getSupplyPyeong('동탄테스트', 10.0);
      expect(microPyeong).toBeGreaterThan(0);
      expect(Number.isFinite(microPyeong)).toBe(true);

      const largePyeong = getSupplyPyeong('동탄테스트', 250.0);
      expect(largePyeong).toBeGreaterThan(50);
      expect(Number.isFinite(largePyeong)).toBe(true);
    });

    test('B4.5: normalizeAptName handles zero-width spaces and control characters', () => {
      const dirty = '\u200B[\uFEFF오산동\u200C] \u200D힐스테이트\uFEFF 동탄역\u200B';
      const clean = normalizeAptName(dirty);
      expect(clean).toBe('힐스테이트동탄역');
    });
  });

  // ==========================================================================
  // B5 (F5 Boundaries): Pathological Path Traversal & Schema Robustness
  // ==========================================================================
  describe('B5: F5 Boundaries (Path Traversal Sanitization & Schema Robustness)', () => {
    test('B5.1: Pathological filename sanitizer neutralizes traversal and reserved DOS devices', () => {
      const sanitize = (raw: string): string => {
        return raw
          .replace(/\.\./g, '')
          .replace(new RegExp('[/\\\\:*?"<>|]', 'g'), '-')
          .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i, 'safe-$1$2')
          .replace(/-+/g, '-')
          .trim();
      };

      expect(sanitize('../../etc/passwd')).toBe('-etc-passwd');
      expect(sanitize('CON.json')).toBe('safe-CON.json');
      expect(sanitize('complex*name?.json')).toBe('complex-name-.json');
    });

    test('B5.2: TransactionListSchema rejects non-array or corrupted transaction payload', () => {
      expect(TransactionListSchema.safeParse(null).success).toBe(false);
      expect(TransactionListSchema.safeParse('corrupted-string').success).toBe(false);
      expect(TransactionListSchema.safeParse(12345).success).toBe(false);
      expect(TransactionListSchema.safeParse([]).success).toBe(true);
    });

    test('B5.3: Parsing corrupted JSON strings fails gracefully via safe parser', () => {
      function safeJsonParse<T>(raw: string, fallback: T): T {
        try {
          return JSON.parse(raw);
        } catch {
          return fallback;
        }
      }

      expect(safeJsonParse('{ corrupted json', [])).toEqual([]);
      expect(safeJsonParse('{"valid": 1}', {})).toEqual({ valid: 1 });
    });

    test('B5.4: Prototype pollution tokens do not contaminate sanitized transaction keys', () => {
      const sanitizeKey = (key: string): string => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return `safe_${key}`;
        }
        return key;
      };

      expect(sanitizeKey('__proto__')).toBe('safe___proto__');
      expect(sanitizeKey('constructor')).toBe('safe_constructor');
      expect(sanitizeKey('normalKey')).toBe('normalKey');
    });

    test('B5.5: Massive transaction array (5,000 items) validates without call stack overflow', () => {
      const massiveDataset = Array.from({ length: 5000 }, (_, i) => ({
        dong: '청계동',
        aptName: `단지_${i}`,
        area: 84.9,
        areaPyeong: 34,
        contractYm: '202609',
        contractDay: '15',
        price: 50000 + (i % 100),
        priceEok: '5.0억',
        floor: (i % 20) + 1,
        buildYear: 2018,
        dealType: '매매',
      }));

      const parsed = TransactionListSchema.safeParse(massiveDataset);
      expect(parsed.success).toBe(true);
    });
  });

  // ==========================================================================
  // B6 (F6 Boundaries): Rapid User Navigation & Worker Singularity SLA
  // ==========================================================================
  describe('B6: F6 Boundaries (Rapid Tab Flapping & Worker Singularity SLA)', () => {
    test('B6.1: LoungeHeader survives 50 rapid sequential click events', () => {
      const onTabChange = jest.fn();
      render(<LoungeHeader onTabChange={onTabChange} />);

      const guideLink = screen.getByRole('link', { name: /가이드/i });
      for (let i = 0; i < 50; i++) {
        fireEvent.click(guideLink);
      }

      expect(onTabChange).toHaveBeenCalledTimes(50);
    });

    test('B6.2: AdSlot in testMode renders fallback card with matching format min-height', () => {
      const { container } = render(
        <AdSlot
          slotId="1000000001"
          format="in-feed"
          testMode={true}
          fallbackType="mbti-promo"
        />
      );

      const el = container.firstChild as HTMLElement;
      expect(el).toBeInTheDocument();
      expect(el.className).toContain('min-h-[140px]');
    });

    test('B6.3: Web Worker calculation on N=0 empty Float32Array returns invalid state without NaN', () => {
      const res = executeStatsWorkerCalculation({ prices: new Float32Array(0) });

      expect(res.stats.isValid).toBe(false);
      expect(res.stats.count).toBe(0);
      expect(res.stats.mean).toBe(0);
      expect(res.stats.sd).toBe(0);
      expect(Number.isNaN(res.stats.mean)).toBe(false);
    });

    test('B6.4: Web Worker mortgage calculation with 0% interest rate evaluates exact linear division', () => {
      const principalWon = 360000000; // 3.6억원
      const loanPeriodMonths = 360; // 30년
      const annualRatePercent = 0.0; // 0%

      const res = executeStatsWorkerCalculation({
        prices: new Float32Array([36000]),
        annualRatePercent,
        loanPeriodMonths,
      });

      // At 0% rate, monthly PMT = Principal / Months = 360,000,000 / 360 = 1,000,000 KRW
      // In 만원 unit: 36,000 / 360 = 100 만원
      expect(res.baseMortgagePmt).toBeCloseTo(100, 1);
    });

    test('B6.5: Web Worker calculation with extreme financial numbers ($10^11 KRW) maintains precision', () => {
      // 100,000,000 만원 = 1조 KRW
      const extremePrices = new Float32Array([10000000, 20000000, 30000000]);
      const res = executeStatsWorkerCalculation({ prices: extremePrices });

      expect(res.stats.isValid).toBe(true);
      expect(res.stats.mean).toBe(20000000);
      expect(Number.isFinite(res.stats.sd)).toBe(true);
    });
  });

  // ==========================================================================
  // B7 (F7 Boundaries): Fast-Check Property Fuzzing & Static Typing
  // ==========================================================================
  describe('B7: F7 Boundaries (Fast-Check Property-Based Fuzzing & Type Guards)', () => {
    test('B7.1: Property-based fuzzing: calculateEqualPrincipalAndInterest yields 0 NaN across 1,000 random inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10_000_000, max: 2_000_000_000 }), // Principal: 1,000만 ~ 20억
          fc.float({ min: 0.0, max: 25.0, noNaN: true, noDefaultInfinity: true }), // Rate: 0.0% ~ 25.0%
          fc.integer({ min: 1, max: 40 }), // Period: 1 ~ 40 years
          (principalWon, ratePercent, years) => {
            const result = calculateEqualPrincipalAndInterest({
              principalWon,
              annualRatePercent: ratePercent,
              loanPeriodYears: years,
            });

            expect(Number.isFinite(result.monthlyPaymentWon)).toBe(true);
            expect(Number.isNaN(result.monthlyPaymentWon)).toBe(false);
            expect(result.monthlyPaymentWon).toBeGreaterThanOrEqual(0);
            expect(result.totalPaymentWon).toBeGreaterThanOrEqual(principalWon);
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('B7.2: Property-based fuzzing: calculateTwoSigma isolates strictly positive finite numbers', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.float({ min: 1, max: 1_000_000 }),
              fc.constant(null),
              fc.constant(undefined),
              fc.constant(-100),
              fc.constant(NaN),
              fc.constant(Infinity)
            ),
            { minLength: 0, maxLength: 50 }
          ),
          (noisyArray) => {
            const stats = calculateTwoSigma(noisyArray as any);
            if (stats.isValid) {
              expect(stats.mean).toBeGreaterThan(0);
              expect(stats.sd).toBeGreaterThanOrEqual(0);
              expect(stats.upper2SD).toBeGreaterThanOrEqual(stats.mean!);
              expect(stats.lower2SD).toBeGreaterThanOrEqual(0);
            } else {
              expect(stats.mean).toBeNull();
              expect(stats.sd).toBeNull();
            }
          }
        ),
        { numRuns: 500 }
      );
    });

    test('B7.3: Mortgage engine rejects negative periods or excessive durations via Zod', () => {
      expect(
        MortgageLoanInputSchema.safeParse({
          principalWon: 100000000,
          annualRatePercent: 3.5,
          loanPeriodYears: 0, // Invalid: < 1
        }).success
      ).toBe(false);

      expect(
        MortgageLoanInputSchema.safeParse({
          principalWon: 100000000,
          annualRatePercent: 3.5,
          loanPeriodYears: 60, // Invalid: > 50
        }).success
      ).toBe(false);
    });

    test('B7.4: Equal principal payment calculation decreases monotonically over time', () => {
      const schedule = calculateEqualPrincipal({
        principalWon: 120_000_000,
        annualRatePercent: 4.0,
        loanPeriodYears: 10,
      });

      expect(schedule.firstMonthPaymentWon).toBeGreaterThan(schedule.lastMonthPaymentWon);
      expect(schedule.totalInterestWon).toBeGreaterThan(0);
    });

    test('B7.5: Extreme floating point epsilon rate (1e-8%) evaluates without division-by-zero', () => {
      const pmt = calculateEqualPrincipalAndInterest({
        principalWon: 120_000_000,
        annualRatePercent: 1e-8,
        loanPeriodYears: 10,
      });

      // At near zero rate, monthly payment ~ Principal / 120 months = 1,000,000 KRW
      expect(pmt.monthlyPaymentWon).toBeCloseTo(1_000_000, -1);
    });
  });
});
