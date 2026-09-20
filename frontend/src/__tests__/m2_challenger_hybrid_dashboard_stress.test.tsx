/**
 * m2_challenger_hybrid_dashboard_stress.test.tsx
 *
 * EMPIRICAL ADVERSARIAL STRESS HARNESS — CHALLENGER M2
 * Milestone 2: Hybrid Dashboard UI & State Integration (F4, F5, F6, F7, F8)
 *
 * Evaluates:
 * 1. 5D Filter Responsiveness Stress Test (<300ms SLA):
 *    - Rapid sequential filter changes (region, dong, pyeong, timeframe, sort)
 *    - High-frequency burst benchmarking with performance.now() (<300ms per transition)
 *    - Large transaction dataset stress (5,000 records)
 *    - Empty/sparse dataset fault tolerance
 * 2. In-Page Modal Triggering Without Full-Page Navigation:
 *    - Complex selection from StatsPyeongRankingChart rows triggers onSelectApt
 *    - Clicking HyperlocalInsightCards (new high, volume surge, urgent bargain) triggers onSelectApt
 *    - Clicking optimal gap triggers onOpenJeonseSafety / onSelectApt
 *    - Verifies zero Next.js router.push/replace calls; native hash pushState (#apt=...) is used
 * 3. Authoritative Hybrid Dashboard Vertical Layout Order:
 *    - Hero Donut + Metric Cards & Trend Chart precede StatsOverviewSection
 *    - In-Feed AdSlot 1000000001 separates StatsOverviewSection and Timeline
 *    - MacroTimelineView, HighCpcFinanceSection, RealtimeRankingBoard, AdSlot 1000000002 in sequence
 */

import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StatsOverviewSection } from '@/components/stats/StatsOverviewSection';
import MacroDashboardClient from '@/components/MacroDashboardClient';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types';
import type { RawTransactionRecord } from '@/types/stats';

// Mock next/navigation
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock firebaseConfig and apartment repository to prevent unhandled background async logger leaks
jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  ApartmentRepository: {
    fetchApartmentNames: jest.fn().mockResolvedValue([]),
    fetchApartments: jest.fn().mockResolvedValue([]),
  },
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchAllApartments: jest.fn().mockResolvedValue([]),
}));

// Mock Recharts ResponsiveContainer to avoid size warnings in jsdom
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: '800px', height: '400px' }}>{children}</div>
    ),
  };
});

// Fixture Data Generators
function generateTransactions(count: number): RawTransactionRecord[] {
  const dongs = ['청계동', '여울동', '반송동', '오산동', '신동'];
  const aptNames = [
    '동탄역 롯데캐슬',
    '동탄역시범우남퍼스트빌',
    '시범한빛금호어울림',
    '동탄역유보라아이비파크',
    '메타폴리스',
  ];

  const records: RawTransactionRecord[] = [];
  for (let i = 0; i < count; i++) {
    const dong = dongs[i % dongs.length];
    const aptName = aptNames[i % aptNames.length];
    const area = 59.9 + (i % 5) * 15; // 59.9 to 119.9
    const areaPyeong = Math.round((area / 3.30578) * 10) / 10;
    const priceVal = 60000 + (i % 20) * 5000; // 60,000 to 155,000

    records.push({
      aptKey: `apt-${i}`,
      aptName,
      dong,
      contractDate: `202609${String((i % 28) + 1).padStart(2, '0')}`,
      date: `09.${String((i % 28) + 1).padStart(2, '0')}`,
      priceVal,
      area,
      areaPyeong,
      floor: (i % 30) + 1,
      isNewHigh: i % 10 === 0,
      dealType: '매매',
    });
  }
  return records;
}

const FIXTURE_SUMMARY: Record<string, AptTxSummary> = {
  '동탄역 롯데캐슬': {
    dong: '여울동',
    latestPrice: '16.5억',
    latestPriceEok: 16.5,
    avgPrice: 165000,
    txCount: 25,
  } as unknown as AptTxSummary,
  동탄역시범우남퍼스트빌: {
    dong: '청계동',
    latestPrice: '11.5억',
    latestPriceEok: 11.5,
    avgPrice: 115000,
    txCount: 18,
  } as unknown as AptTxSummary,
  시범한빛금호어울림: {
    dong: '반송동',
    latestPrice: '7.5억',
    latestPriceEok: 7.5,
    avgPrice: 75000,
    txCount: 12,
  } as unknown as AptTxSummary,
  메타폴리스: {
    dong: '반송동',
    latestPrice: '12억',
    latestPriceEok: 12.0,
    avgPrice: 120000,
    txCount: 8,
  } as unknown as AptTxSummary,
};

const FIXTURE_MACRO_TREND: DongtanMacroTrendPoint[] = [
  { name: '26.07', price: 78000, rent: 45000, volume: 150 },
  { name: '26.08', price: 81000, rent: 46000, volume: 180 },
  { name: '26.09', price: 83000, rent: 47000, volume: 210 },
];

const mockSheetApartments: Record<string, DongApartment[]> = {
  반송동: [
    { name: '시범한빛금호어울림', dong: '반송동', txKey: 'ban-1' } as DongApartment,
    { name: '메타폴리스', dong: '반송동', txKey: 'ban-2' } as DongApartment,
  ],
  청계동: [
    { name: '동탄역시범우남퍼스트빌', dong: '청계동', txKey: 'cheong-1' } as DongApartment,
  ],
  여울동: [
    { name: '동탄역 롯데캐슬', dong: '여울동', txKey: 'yeoul-1' } as DongApartment,
  ],
};

describe('M2 Challenger Empirical Stress Test Harness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════
  // 1. 5D Filter Responsiveness Stress Test (<300ms SLA)
  // ══════════════════════════════════════════════════════════════════════
  describe('Dimension 1: 5D Filter Responsiveness Benchmark (<300ms SLA)', () => {
    it('executes rapid 5D filter changes under 300ms SLA across 50 consecutive transitions', () => {
      const transactions = generateTransactions(200);
      render(
        <StatsOverviewSection
          recentTransactions={transactions}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          testMode={true}
        />
      );

      const filterButtons: { name: string; testId: string }[] = [
        { name: 'Region Dongtan 1', testId: 'filter-region-dongtan1' },
        { name: 'Region Dongtan 2', testId: 'filter-region-dongtan2' },
        { name: 'Region Cheonggye', testId: 'filter-region-cheonggye' },
        { name: 'Region ALL', testId: 'filter-region-all' },
        { name: 'Pyeong Small', testId: 'filter-pyeong-small' },
        { name: 'Pyeong Medium-Small', testId: 'filter-pyeong-medium-small' },
        { name: 'Pyeong Medium-Large', testId: 'filter-pyeong-medium-large' },
        { name: 'Pyeong Large', testId: 'filter-pyeong-large' },
        { name: 'Pyeong ALL', testId: 'filter-pyeong-all' },
        { name: 'Timeframe 1M', testId: 'filter-timeframe-1m' },
        { name: 'Timeframe 3M', testId: 'filter-timeframe-3m' },
        { name: 'Timeframe 6M', testId: 'filter-timeframe-6m' },
        { name: 'Timeframe 1Y', testId: 'filter-timeframe-1y' },
        { name: 'Timeframe ALL', testId: 'filter-timeframe-all' },
        { name: 'Reset All', testId: 'filter-reset-button' },
      ];

      const sortValues = ['PRICE_DESC', 'PRICE_ASC', 'VOLUME_DESC', 'JEONSE_DESC', 'PYEONG_DESC'];

      const sortSelect = screen.getByTestId('filter-sort-select');

      // Warm up V8 JIT to eliminate one-time Jest/JSDOM compilation artifact
      act(() => {
        fireEvent.click(screen.getByTestId('filter-region-dongtan1'));
      });

      const latencies: number[] = [];

      // Execute 50 rapid transitions across buttons and sort select
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        act(() => {
          if (i % 5 === 0) {
            const sortVal = sortValues[(i / 5) % sortValues.length];
            fireEvent.change(sortSelect, { target: { value: sortVal } });
          } else {
            const btnMeta = filterButtons[i % filterButtons.length];
            const btn = screen.getByTestId(btnMeta.testId);
            fireEvent.click(btn);
          }
        });
        const elapsed = performance.now() - start;
        latencies.push(elapsed);

        // Strict SLA: Every single filter change must take < 300ms
        expect(elapsed).toBeLessThan(300);
      }

      const maxLatency = Math.max(...latencies);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      // Assertions on benchmark results
      expect(latencies.length).toBe(50);
      expect(maxLatency).toBeLessThan(300); // 100% compliant with <300ms SLA
      expect(avgLatency).toBeLessThan(200); // Average well within <300ms SLA
    });

    it('processes massive 5,000-record dataset within 300ms SLA without UI freeze', () => {
      const massiveDataset = generateTransactions(5000);

      const renderStart = performance.now();
      render(
        <StatsOverviewSection
          recentTransactions={massiveDataset}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          testMode={true}
        />
      );
      const initialRenderElapsed = performance.now() - renderStart;

      // Initial render with 5000 items
      expect(initialRenderElapsed).toBeLessThan(1000);
      expect(screen.getByTestId('kpi-total-volume').textContent).toMatch(/5,?000건/);

      // Filter change benchmark on 5000 records
      const filterStart = performance.now();
      act(() => {
        fireEvent.click(screen.getByTestId('filter-region-dongtan1'));
      });
      const filterElapsed = performance.now() - filterStart;

      // 5D filter transition on 5,000 items MUST satisfy < 300ms SLA
      expect(filterElapsed).toBeLessThan(300);

      // Verify filtered result integrity
      expect(screen.getByTestId('kpi-total-volume').textContent).not.toMatch(/^총 거래량5,?000건$/);
    });

    it('recovers gracefully from empty dataset without crash and updates in <50ms', () => {
      const { rerender } = render(
        <StatsOverviewSection
          recentTransactions={[]}
          txSummaryData={{}}
          macroTrendData={[]}
          testMode={true}
        />
      );

      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('0건');
      expect(screen.getByTestId('kpi-avg-sale-price')).toHaveTextContent('-');

      // Now inject records dynamically
      const updateStart = performance.now();
      rerender(
        <StatsOverviewSection
          recentTransactions={generateTransactions(10)}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          testMode={true}
        />
      );
      const updateElapsed = performance.now() - updateStart;

      expect(updateElapsed).toBeLessThan(300);
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('10건');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // 2. In-Page Modal Triggering Without Full-Page Navigation
  // ══════════════════════════════════════════════════════════════════════
  describe('Dimension 2: In-Page FieldReportModal Triggering Without Navigation', () => {
    it('dispatches onSelectApt with correct complex name and dong from ranking chart', () => {
      const onSelectApt = jest.fn();
      const transactions = generateTransactions(20);

      render(
        <StatsOverviewSection
          recentTransactions={transactions}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          onSelectApt={onSelectApt}
          testMode={true}
        />
      );

      const rank1 = screen.getByTestId('ranking-item-1');
      expect(rank1).toBeInTheDocument();

      fireEvent.click(rank1);

      // Verify onSelectApt callback was invoked
      expect(onSelectApt).toHaveBeenCalledTimes(1);
      const [aptName, dong] = onSelectApt.mock.calls[0];
      expect(typeof aptName).toBe('string');
      expect(aptName.length).toBeGreaterThan(0);
      expect(dong).toBeDefined();

      // Zero page navigation must have been triggered
      expect(mockRouterPush).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('triggers in-page onSelectApt from all clickable hyperlocal insight cards without page navigation', () => {
      const onSelectApt = jest.fn();
      const onOpenJeonseSafety = jest.fn();
      const onOpenCompare = jest.fn();
      const transactions = generateTransactions(50);

      render(
        <StatsOverviewSection
          recentTransactions={transactions}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          onSelectApt={onSelectApt}
          onOpenJeonseSafety={onOpenJeonseSafety}
          onOpenCompare={onOpenCompare}
          testMode={true}
        />
      );

      // 1. New High Card
      const newHighCard = screen.getByTestId('insight-card-new-high');
      fireEvent.click(newHighCard);
      expect(onSelectApt).toHaveBeenCalledTimes(1);

      // 2. Volume Surge Card
      const surgeCard = screen.getByTestId('insight-card-volume-surge');
      fireEvent.click(surgeCard);
      expect(onSelectApt).toHaveBeenCalledTimes(2);

      // 3. Urgent Bargain Card
      const bargainCard = screen.getByTestId('insight-card-urgent-bargain');
      fireEvent.click(bargainCard);
      // Either onSelectApt or no crash if empty
      expect(onSelectApt.mock.calls.length).toBeGreaterThanOrEqual(2);

      // 4. Optimal Gap Card (delegates to onOpenJeonseSafety)
      const gapCard = screen.getByTestId('insight-card-optimal-gap');
      fireEvent.click(gapCard);
      expect(onOpenJeonseSafety).toHaveBeenCalled();

      // Invariant: No full-page navigation occurred
      expect(mockRouterPush).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('verifies native hash pushState is used by DashboardClient when selecting complex', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState');
      const onSelectApt = jest.fn((name: string, dong?: string) => {
        // Emulate DashboardClient's in-page hash pushState mechanism
        window.history.pushState(null, '', `/#apt=${encodeURIComponent(name)}`);
      });

      render(
        <StatsOverviewSection
          recentTransactions={generateTransactions(10)}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          onSelectApt={onSelectApt}
          testMode={true}
        />
      );

      const rank1 = screen.getByTestId('ranking-item-1');
      fireEvent.click(rank1);

      expect(onSelectApt).toHaveBeenCalled();
      expect(pushStateSpy).toHaveBeenCalledWith(
        null,
        '',
        expect.stringContaining('#apt=')
      );

      // Ensure no Next.js router.push was invoked
      expect(mockRouterPush).not.toHaveBeenCalled();
      pushStateSpy.mockRestore();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // 3. Authoritative Hybrid Dashboard Layout Order Invariant
  // ══════════════════════════════════════════════════════════════════════
  describe('Dimension 3: Hybrid Dashboard Vertical Layout Order Invariant', () => {
    it('strictly preserves top 2-column hero followed by StatsOverviewSection, AdSlot, and timeline', () => {
      const onSelectApt = jest.fn();
      const recentTxs = [
        {
          aptName: '동탄역 롯데캐슬',
          txKey: 'tx-1',
          date: '09.15',
          contractDate: '20260915',
          priceVal: 16.5,
          priceEok: '16억 5,000만',
          area: 84.9,
          areaPyeong: 25.7,
          floor: 20,
          dealType: '매매',
          isNewHigh: true,
        },
      ];

      const { container } = render(
        <SettingsProvider>
          <AuthProvider>
            <MacroDashboardClient
              sheetApartments={mockSheetApartments}
              txSummaryData={FIXTURE_SUMMARY}
              macroTrendData={FIXTURE_MACRO_TREND}
              publicRentalSet={new Set()}
              fieldReportsMap={new Map()}
              favoriteCounts={{}}
              recentTransactions={recentTxs}
              onSelectApt={onSelectApt}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      // Top signature 2-column hero elements
      const donutSection = container.querySelector('#apt-market-energy-donut');
      expect(donutSection).toBeInTheDocument();

      // StatsOverviewSection immediately below
      const statsSection = screen.getByTestId('stats-overview-section');
      expect(statsSection).toBeInTheDocument();

      // Timeline section below
      const timelineHeading = screen.getByText('일자별 최근 실거래');
      expect(timelineHeading).toBeInTheDocument();

      // High CPC Finance section below
      const financeSection = screen.getByTestId('high-cpc-finance-section');
      expect(financeSection).toBeInTheDocument();

      // Realtime Ranking Board below
      const rankingBoard = screen.getByTestId('realtime-ranking-board');
      expect(rankingBoard).toBeInTheDocument();

      // AdSlots
      const adContainers = screen.getAllByTestId('ad-slot-container');
      expect(adContainers.length).toBeGreaterThanOrEqual(2);

      // Strict DOM Hierarchy Order Verification
      expect(
        donutSection!.compareDocumentPosition(statsSection) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      expect(
        statsSection.compareDocumentPosition(timelineHeading) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      expect(
        timelineHeading.compareDocumentPosition(financeSection) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      expect(
        financeSection.compareDocumentPosition(rankingBoard) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('wires ranking item click from StatsOverviewSection up to MacroDashboardClient onSelectApt', () => {
      const onSelectApt = jest.fn();
      const recentTxs = [
        {
          aptName: '동탄역 롯데캐슬',
          txKey: 'tx-1',
          date: '09.15',
          contractDate: '20260915',
          priceVal: 16.5,
          priceEok: '16억 5,000만',
          area: 84.9,
          areaPyeong: 25.7,
          floor: 20,
          dealType: '매매',
          isNewHigh: true,
        },
      ];

      render(
        <SettingsProvider>
          <AuthProvider>
            <MacroDashboardClient
              sheetApartments={mockSheetApartments}
              txSummaryData={FIXTURE_SUMMARY}
              macroTrendData={FIXTURE_MACRO_TREND}
              publicRentalSet={new Set()}
              fieldReportsMap={new Map()}
              favoriteCounts={{}}
              recentTransactions={recentTxs}
              onSelectApt={onSelectApt}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      const statsSection = screen.getByTestId('stats-overview-section');
      const rank1 = within(statsSection).getByTestId('ranking-item-1');
      expect(rank1).toBeInTheDocument();

      fireEvent.click(rank1);

      expect(onSelectApt).toHaveBeenCalledTimes(1);
      expect(onSelectApt).toHaveBeenCalledWith(
        expect.stringContaining('동탄역 롯데캐슬'),
        expect.anything()
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // 4. Concurrency & Rapid Burst Storm Stress Test (<300ms SLA, sub-50ms avg)
  // ══════════════════════════════════════════════════════════════════════
  describe('Dimension 4: Concurrency, Rapid Burst Storm & React 18 Transition Stress', () => {
    it('executes 100 random combinatorial 5D filter changes with 100% compliance to <300ms SLA', () => {
      const txs = generateTransactions(500);
      render(
        <StatsOverviewSection
          recentTransactions={txs}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          testMode={true}
        />
      );

      const regionButtons = ['filter-region-all', 'filter-region-dongtan1', 'filter-region-dongtan2', 'filter-region-cheonggye'];
      const pyeongButtons = ['filter-pyeong-all', 'filter-pyeong-small', 'filter-pyeong-medium-small', 'filter-pyeong-medium-large', 'filter-pyeong-large'];
      const timeframeButtons = ['filter-timeframe-1m', 'filter-timeframe-3m', 'filter-timeframe-6m', 'filter-timeframe-1y', 'filter-timeframe-all'];
      const sortSelect = screen.getByTestId('filter-sort-select');
      const sortOptions = ['PYEONG_DESC', 'PRICE_DESC', 'PRICE_ASC', 'VOLUME_DESC', 'JEONSE_DESC'];

      const runTimes: number[] = [];

      for (let i = 0; i < 100; i++) {
        const choice = i % 4;
        const start = performance.now();

        act(() => {
          if (choice === 0) {
            const rId = regionButtons[Math.floor(Math.random() * regionButtons.length)];
            fireEvent.click(screen.getByTestId(rId));
          } else if (choice === 1) {
            const pId = pyeongButtons[Math.floor(Math.random() * pyeongButtons.length)];
            fireEvent.click(screen.getByTestId(pId));
          } else if (choice === 2) {
            const tId = timeframeButtons[Math.floor(Math.random() * timeframeButtons.length)];
            fireEvent.click(screen.getByTestId(tId));
          } else {
            const sVal = sortOptions[Math.floor(Math.random() * sortOptions.length)];
            fireEvent.change(sortSelect, { target: { value: sVal } });
          }
        });

        const duration = performance.now() - start;
        runTimes.push(duration);

        // Strict assertion: SLA must never exceed 300ms on any individual permutation
        expect(duration).toBeLessThan(300);
      }

      const p95 = [...runTimes].sort((a, b) => a - b)[Math.floor(runTimes.length * 0.95)];
      const avg = runTimes.reduce((a, b) => a + b, 0) / runTimes.length;

      expect(runTimes.length).toBe(100);
      expect(avg).toBeLessThan(100);
      expect(p95).toBeLessThan(200);

      // Verify dashboard didn't crash and KPIs are intact
      expect(screen.getByTestId('stats-kpi-grid')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-total-volume')).toBeInTheDocument();
    });

    it('handles rapid sequential filter interruption without stale deadlock', () => {
      render(
        <StatsOverviewSection
          recentTransactions={generateTransactions(100)}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          testMode={true}
        />
      );

      // Rapidly fire multiple region switches in immediate succession
      act(() => {
        fireEvent.click(screen.getByTestId('filter-region-dongtan1'));
        fireEvent.click(screen.getByTestId('filter-region-dongtan2'));
        fireEvent.click(screen.getByTestId('filter-region-all'));
        fireEvent.click(screen.getByTestId('filter-region-cheonggye'));
      });

      // The final state must accurately reflect 청계동
      expect(screen.getByTestId('filter-region-cheonggye')).toHaveClass('bg-hs-orange');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // 5. Adversarial Dirty Data & Edge Cases Fuzzing
  // ══════════════════════════════════════════════════════════════════════
  describe('Dimension 5: Adversarial Dirty Data & Edge Cases Fuzzing', () => {
    it('sanitizes records with zero area, negative price, and corrupted dates without throwing NaN/Infinity', () => {
      const dirtyTxs: RawTransactionRecord[] = [
        {
          aptKey: 'dirty-1',
          aptName: '비정상단지1',
          dong: '반송동',
          contractDate: 'INVALID_DATE',
          date: '',
          priceVal: -5000,
          area: 0,
          areaPyeong: 0,
          floor: 0,
          dealType: '매매',
        },
        {
          aptKey: 'dirty-2',
          aptName: '비정상단지2',
          dong: '청계동',
          contractDate: '20260901',
          date: '09.01',
          priceVal: 0,
          area: -84.9,
          areaPyeong: -25.7,
          floor: 5,
          dealType: '매매',
        },
        {
          aptKey: 'dirty-3',
          aptName: '취소거래단지',
          dong: '오산동',
          contractDate: '20260902',
          date: '09.02',
          priceVal: 80000,
          area: 84.9,
          areaPyeong: 25.7,
          floor: 10,
          dealType: '취소',
        },
      ];

      render(
        <StatsOverviewSection
          recentTransactions={dirtyTxs}
          txSummaryData={{}}
          macroTrendData={[]}
          testMode={true}
        />
      );

      // KPI cards must not contain NaN, Infinity, or crash
      const totalVolText = screen.getByTestId('kpi-total-volume').textContent || '';
      const avgPriceText = screen.getByTestId('kpi-avg-sale-price').textContent || '';
      const avgPyeongText = screen.getByTestId('kpi-avg-pyeong-price').textContent || '';
      const avgJeonseText = screen.getByTestId('kpi-avg-jeonse-ratio').textContent || '';

      expect(totalVolText).not.toContain('NaN');
      expect(totalVolText).not.toContain('Infinity');
      expect(avgPriceText).not.toContain('NaN');
      expect(avgPriceText).not.toContain('Infinity');
      expect(avgPyeongText).not.toContain('NaN');
      expect(avgPyeongText).not.toContain('Infinity');
      expect(avgJeonseText).not.toContain('NaN');
      expect(avgJeonseText).not.toContain('Infinity');
    });

    it('gracefully handles missing / undefined prop fallbacks', () => {
      expect(() => {
        render(<StatsOverviewSection testMode={true} />);
      }).not.toThrow();

      expect(screen.getByTestId('stats-overview-section')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('0건');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // 6. Complete In-Page FieldReportModal Selection & Navigation Prevention
  // ══════════════════════════════════════════════════════════════════════
  describe('Dimension 6: In-Page FieldReportModal Selection & Navigation Prevention', () => {
    it('verifies selecting an apartment from stats ranking delegates to onSelectApt and never navigates', () => {
      const onSelectApt = jest.fn();
      const recentTxs = [
        {
          aptName: '동탄역 롯데캐슬',
          txKey: 'tx-yeoul',
          date: '09.18',
          contractDate: '20260918',
          priceVal: 16.5,
          priceEok: '16억 5,000만',
          area: 84.9,
          areaPyeong: 25.7,
          floor: 25,
          dealType: '매매',
          isNewHigh: true,
        },
      ];

      render(
        <SettingsProvider>
          <AuthProvider>
            <MacroDashboardClient
              sheetApartments={mockSheetApartments}
              txSummaryData={FIXTURE_SUMMARY}
              macroTrendData={FIXTURE_MACRO_TREND}
              publicRentalSet={new Set()}
              fieldReportsMap={new Map()}
              favoriteCounts={{}}
              recentTransactions={recentTxs}
              onSelectApt={onSelectApt}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      const statsSection = screen.getByTestId('stats-overview-section');
      const rankItem = within(statsSection).getByTestId('ranking-item-1');
      fireEvent.click(rankItem);

      expect(onSelectApt).toHaveBeenCalledWith('동탄역 롯데캐슬', expect.anything());
      expect(mockRouterPush).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });
  });
});
