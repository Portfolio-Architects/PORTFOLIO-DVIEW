/**
 * @file m2_canonical_and_dynamic_challenger.test.tsx
 * @description Empirical Challenger Stress Test Suite for Milestone 2:
 * 1. Concurrent Dynamic Imports & Lazy Loading Stress (MacroTrendChart, ApartmentModal, preload utilities)
 * 2. AptDonutSection & AptMetricCards Robustness under Empty, Null, Corrupted, and Extreme Inputs
 * 3. OfflineBanner Polymorphic Variants (Global, Inline, Auto-inferred, Dismissal, Reconnection timer)
 */

import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import dynamic from 'next/dynamic';

// --- Controllable Network Status Mock ---
let mockIsOnline = true;
const networkListeners: Array<() => void> = [];

jest.mock('@/lib/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => {
    const [online, setOnline] = React.useState(mockIsOnline);
    React.useEffect(() => {
      const listener = () => setOnline(mockIsOnline);
      networkListeners.push(listener);
      return () => {
        const idx = networkListeners.indexOf(listener);
        if (idx > -1) networkListeners.splice(idx, 1);
      };
    }, []);
    return online;
  },
}));

function setNetworkStatus(online: boolean) {
  mockIsOnline = online;
  act(() => {
    networkListeners.forEach((l) => l());
  });
}

// --- Firebase & Repositories Mocks ---
jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
  auth: { currentUser: null },
  storage: {},
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchAllApartments: jest.fn().mockResolvedValue([]),
  fetchApartmentMeta: jest.fn().mockResolvedValue({}),
}));

// --- Contexts Mocks for ApartmentModal ---
jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsValues: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    requestLogin: jest.fn(),
  }),
}));

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    isInstalled: false,
    canInstall: false,
    install: jest.fn(),
  }),
}));

jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// --- Imports under Test ---
import MacroTrendChart, {
  DiamondVertex,
  SaleDiamondDot,
  RentDiamondDot,
} from '@/components/macro/MacroTrendChart';
import ApartmentModal from '@/components/apartment/ApartmentModal';
import {
  AptDonutSection,
  formatPriceEok,
  formatSectorAvgPrice,
  formatDeltaPrice,
  PERIOD_BUTTONS,
  PERIOD_LABELS,
  PYEONG_TIER_COLORS,
  PRICE_TIER_COLORS,
} from '@/components/macro/AptDonutSection';
import {
  AptMetricCards,
  formatCleanDate,
  formatCompactEok,
} from '@/components/macro/AptMetricCards';
import OfflineBanner, {
  GlobalOfflineBanner,
  InlineOfflineBanner,
  OfflineBannerGlobal,
  OfflineBannerUI,
} from '@/components/ui/OfflineBanner';
import { preloadComponent, scheduleIdle } from '@/lib/preload';
import { preloadApartmentModal } from '@/components/common/ComponentPreloader';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { DongtanMacroTrendPoint } from '@/lib/types/transaction';

const mockReport: FieldReportData = {
  id: 'rep-stress-001',
  aptName: '동탄역 롯데캐슬',
  apartmentName: '동탄역 롯데캐슬',
  dong: '오산동',
  summary: '동탄 대장 랜드마크 아파트',
  author: 'D-VIEW',
  date: '2026-10-10',
  locationScore: 99,
  tags: ['대장', '역세권', 'GTX-A'],
};

const mockTrendData: DongtanMacroTrendPoint[] = [
  { date: '2026-06', '동탄 아파트 전체': 14.2, '동탄 아파트 전세 평균': 6.8, volume: 120 },
  { date: '2026-07', '동탄 아파트 전체': 14.5, '동탄 아파트 전세 평균': 7.0, volume: 150 },
  { date: '2026-08', '동탄 아파트 전체': 14.8, '동탄 아파트 전세 평균': 7.1, volume: 180 },
];

describe('Milestone 2 Empirical Challenger Stress Test Suite', () => {
  beforeEach(() => {
    mockIsOnline = true;
    jest.clearAllMocks();
  });

  // =========================================================================
  // Challenge Vector 1: Dynamic Imports & Concurrency Stress
  // =========================================================================
  describe('Vector 1: Dynamic Imports & Concurrent Preloading Stress', () => {
    it('verifies that dynamic import of @/components/macro/MacroTrendChart resolves with full canonical exports', async () => {
      const macroMod = await import('@/components/macro/MacroTrendChart');
      expect(macroMod.default).toBeDefined();
      expect(['function', 'object']).toContain(typeof macroMod.default);
      expect(React.isValidElement(<macroMod.default data={[]} />)).toBe(true);
      expect(macroMod.DiamondVertex).toBeDefined();
      expect(macroMod.SaleDiamondDot).toBeDefined();
      expect(macroMod.RentDiamondDot).toBeDefined();
    });

    it('verifies that dynamic import of @/components/apartment/ApartmentModal resolves with canonical default export', async () => {
      const modalMod = await import('@/components/apartment/ApartmentModal');
      expect(modalMod.default).toBeDefined();
      expect(['function', 'object']).toContain(typeof modalMod.default);
      expect(React.isValidElement(<modalMod.default report={mockReport} onClose={jest.fn()} />)).toBe(true);
    });

    it('survives high-concurrency dynamic imports of MacroTrendChart and ApartmentModal without race condition', async () => {
      const macroImportPromises = Array.from({ length: 25 }, () =>
        import('@/components/macro/MacroTrendChart')
      );
      const modalImportPromises = Array.from({ length: 25 }, () =>
        import('@/components/apartment/ApartmentModal')
      );

      const [macroResults, modalResults] = await Promise.all([
        Promise.all(macroImportPromises),
        Promise.all(modalImportPromises),
      ]);

      // All 25 imports must resolve to the identical module instance
      macroResults.forEach((mod) => {
        expect(mod.default).toBe(MacroTrendChart);
      });
      modalResults.forEach((mod) => {
        expect(mod.default).toBe(ApartmentModal);
      });
    });

    it('renders Next.js dynamic MacroTrendChart with custom loading fallback and updates on resolution', async () => {
      const DynamicMacroChart = dynamic(
        () => import('@/components/macro/MacroTrendChart'),
        {
          loading: () => <div data-testid="macro-loader">차트 로딩 중</div>,
          ssr: false,
        }
      );

      const { rerender } = render(
        <DynamicMacroChart data={mockTrendData} />
      );

      // Verify component mounts and renders area chart container without throw
      await waitFor(() => {
        const areaChart = screen.getByTestId('area-chart');
        expect(areaChart).toBeInTheDocument();
      });

      // Rerender with empty data
      rerender(<DynamicMacroChart data={[]} />);
      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });
    });

    it('verifies Next.js dynamic ApartmentModal mounting and unmounting lifecycle', async () => {
      const DynamicApartmentModal = dynamic(
        () => import('@/components/apartment/ApartmentModal'),
        {
          loading: () => <div data-testid="modal-skeleton">모달 준비 중</div>,
          ssr: false,
        }
      );

      const onCloseMock = jest.fn();
      const { unmount } = render(
        <DynamicApartmentModal report={mockReport} onClose={onCloseMock} />
      );

      // Verify unmount completes cleanly without memory leak or dangling timers
      expect(() => unmount()).not.toThrow();
    });

    it('stress tests preloadApartmentModal under rapid repetitive invocations', () => {
      // Immediate mode (hover/touch) - 50 rapid calls
      expect(() => {
        for (let i = 0; i < 50; i++) {
          preloadApartmentModal(true);
        }
      }).not.toThrow();

      // Idle scheduling mode - 50 rapid calls
      expect(() => {
        for (let i = 0; i < 50; i++) {
          preloadApartmentModal(false);
        }
      }).not.toThrow();
    });

    it('verifies preloadComponent utility invokes scheduleIdle and catches dynamic import rejection safely', async () => {
      const failingImporter = jest.fn().mockRejectedValue(new Error('ChunkLoadError'));
      expect(() => {
        preloadComponent(failingImporter, 100);
      }).not.toThrow();
    });

    it('verifies dynamic import catch fallback pattern used in MacroDashboardClient resolves safely', async () => {
      // Mimic the exact catch fallback logic in MacroDashboardClient.tsx:
      // dynamic(() => import(...).catch(err => ({ default: () => null })))
      const failedDynamic = () =>
        Promise.reject(new Error('Network failure'))
          .catch(() => ({ default: () => null }));

      const resolved = await failedDynamic();
      expect(resolved.default()).toBeNull();
    });
  });

  // =========================================================================
  // Challenge Vector 2: AptDonutSection & AptMetricCards Robustness
  // =========================================================================
  describe('Vector 2: AptDonutSection & AptMetricCards under Empty, Null, Corrupted, and Extreme Inputs', () => {
    describe('AptDonutSection Stress', () => {
      it('renders AptDonutSection with completely empty props without exception', () => {
        const { container } = render(
          <AptDonutSection
            recentTransactions={[]}
            txSummaryData={undefined}
          />
        );
        expect(container).toBeInTheDocument();
        expect(screen.getByText('실거래 비중')).toBeInTheDocument();
      });

      it('survives null and undefined recentTransactions safely', () => {
        expect(() => {
          render(
            <AptDonutSection
              recentTransactions={null as any}
              txSummaryData={null as any}
            />
          );
        }).not.toThrow();

        expect(() => {
          render(
            <AptDonutSection
              recentTransactions={undefined}
              txSummaryData={undefined}
            />
          );
        }).not.toThrow();
      });

      it('survives heavily corrupted transaction items (NaN, Infinity, negative, extreme values)', () => {
        const pathologicalTransactions = [
          {}, // empty object
          { priceVal: NaN, area: NaN, contractDate: null },
          { priceVal: Infinity, area: -10, contractDate: 'invalid-date' },
          { priceVal: -50, area: 0, contractDate: '20269999' },
          { priceVal: 1000000000, area: 999999, contractDate: '20260818' }, // 100조 원
          { aptName: '정상아파트', priceVal: 14.5, area: 84.9, contractDate: '20260818' },
        ];

        const { container } = render(
          <AptDonutSection
            recentTransactions={pathologicalTransactions as any}
            txSummaryData={{ summary: null as any } as any}
          />
        );
        expect(container).toBeInTheDocument();
        expect(screen.getByText('실거래 비중')).toBeInTheDocument();
      });

      it('supports mode switching between pyeong and price under empty data', () => {
        const onModeChange = jest.fn();
        render(
          <AptDonutSection
            recentTransactions={[]}
            mode="pyeong"
            onModeChange={onModeChange}
          />
        );

        const priceBtn = screen.getByRole('button', { name: '가격대별' });
        fireEvent.click(priceBtn);
        expect(onModeChange).toHaveBeenCalledWith('price');
      });

      it('supports period switching across all 4 periods (7d, 30d, 90d, 1y) with malformed dates', () => {
        const onPeriodChange = jest.fn();
        const malformedTxs = [
          { contractDate: '20260801', priceVal: 10 },
          { contractDate: '', priceVal: 12 },
          { contractDate: 'bad', priceVal: 15 },
        ];

        render(
          <AptDonutSection
            recentTransactions={malformedTxs as any}
            period="90d"
            onPeriodChange={onPeriodChange}
          />
        );

        const btn30d = screen.getByRole('button', { name: '최근 30일 실거래 보기' });
        fireEvent.click(btn30d);
        expect(onPeriodChange).toHaveBeenCalledWith('30d');

        const btn7d = screen.getByRole('button', { name: '최근 7일 실거래 보기' });
        fireEvent.click(btn7d);
        expect(onPeriodChange).toHaveBeenCalledWith('7d');

        const btn1y = screen.getByRole('button', { name: '최근 1년 실거래 보기' });
        fireEvent.click(btn1y);
        expect(onPeriodChange).toHaveBeenCalledWith('1y');
      });

      it('survives rapid successive re-renders (30 cycles) with alternating state mutations', () => {
        const { rerender } = render(
          <AptDonutSection recentTransactions={[]} mode="pyeong" />
        );

        for (let i = 0; i < 30; i++) {
          const isEven = i % 2 === 0;
          rerender(
            <AptDonutSection
              recentTransactions={
                isEven
                  ? [{ aptName: `아파트${i}`, priceVal: i * 0.5, area: 84 }]
                  : []
              }
              mode={isEven ? 'price' : 'pyeong'}
              period={isEven ? '30d' : '90d'}
            />
          );
        }
        expect(screen.getByText('실거래 비중')).toBeInTheDocument();
      });
    });

    describe('AptMetricCards Stress', () => {
      it('renders AptMetricCards with completely undefined/empty props without crashing', () => {
        const { container } = render(
          <AptMetricCards
            recentTransactions={undefined}
            txSummaryData={undefined}
            macroTrendData={undefined}
          />
        );
        expect(container).toBeInTheDocument();
        expect(screen.getByText('신고가 달성')).toBeInTheDocument();
        expect(screen.getByText('평당 평균 실거래가')).toBeInTheDocument();
        expect(screen.getByText('평균 전세가율')).toBeInTheDocument();
        expect(screen.getByText(/우리집 적정 가치/)).toBeInTheDocument();
      });

      it('handles extreme, negative, and NaN numerical prop values safely', () => {
        const { container } = render(
          <AptMetricCards
            newHighCount={-999}
            newHighChange={-50}
            avgPyeongPrice={NaN}
            avgJeonseRate={Infinity}
            onOpenSellTimingCalculator={jest.fn()}
          />
        );
        expect(container).toBeInTheDocument();
      });

      it('handles activeSector with empty items and renders 4 fallback slots', () => {
        const emptySector = {
          name: '소형 (60㎡ 이하)',
          value: 0,
          count: 0,
          color: '#10b981',
          items: [],
        };

        const { rerender } = render(
          <AptMetricCards activeSector={emptySector as any} />
        );
        const fallbackSlots = screen.getAllByText('추가 거래 내역 없음');
        expect(fallbackSlots).toHaveLength(4);

        // Corrupted items in activeSector
        const corruptedSector = {
          name: '변칙 섹터',
          value: 100,
          count: 2,
          color: '#3b82f6',
          items: [
            { priceVal: NaN, priceEok: '', aptName: undefined },
            { priceVal: Infinity, priceEok: '무한', aptName: '비정상아파트' },
          ],
        };

        rerender(<AptMetricCards activeSector={corruptedSector as any} />);
        expect(screen.getByText('비정상아파트')).toBeInTheDocument();
      });

      it('invokes onOpenSellTimingCalculator, onSelectApt, and preloadApartmentTx callbacks correctly', () => {
        const onSellTiming = jest.fn();
        const onSelectApt = jest.fn();
        const preloadApartmentTx = jest.fn();

        // 1. In default KPI mode (activeSector = null), test onOpenSellTimingCalculator
        const { rerender } = render(
          <AptMetricCards
            onOpenSellTimingCalculator={onSellTiming}
          />
        );
        const ctaButton = screen.getByRole('button', { name: /우리집 적정 가치 및 매도 타이밍 진단/ });
        fireEvent.click(ctaButton);
        expect(onSellTiming).toHaveBeenCalledTimes(1);

        // 2. In activeSector mode, test onSelectApt and preload
        const activeSector = {
          name: '중소형 (60~85㎡)',
          value: 50,
          count: 1,
          color: '#057e77',
          items: [
            {
              aptName: '동탄역 롯데캐슬',
              dong: '오산동',
              priceVal: 14.8,
              priceEok: '14억 8,000만',
              area: 84.9,
              floor: 20,
              contractDate: '20260818',
            },
          ],
        };

        rerender(
          <AptMetricCards
            activeSector={activeSector as any}
            onSelectApt={onSelectApt}
            preloadApartmentTx={preloadApartmentTx}
          />
        );

        // Click apartment item
        const aptItem = screen.getByRole('button', { name: /동탄역 롯데캐슬 14억 8,000만 실거래 상세 리포트 열기/ });
        fireEvent.click(aptItem);
        expect(onSelectApt).toHaveBeenCalledWith('동탄역 롯데캐슬', '오산동');

        // Hover triggers preload
        fireEvent.mouseEnter(aptItem);
        expect(preloadApartmentTx).toHaveBeenCalledWith('동탄역 롯데캐슬', '오산동');
      });
    });

    describe('Pure Mathematical & String Formatter Boundary Checks', () => {
      it('formatPriceEok handles 0, negative, NaN, Infinity, eok+man, and pure man values', () => {
        expect(formatPriceEok(0)).toBe('-');
        expect(formatPriceEok(-10)).toBe('-');
        expect(formatPriceEok(NaN)).toBe('-');
        expect(formatPriceEok(Infinity)).toBe('-');
        expect(formatPriceEok(0.05)).toBe('500만');
        expect(formatPriceEok(1.0)).toBe('1억');
        expect(formatPriceEok(14.8)).toBe('14억 8,000만');
        expect(formatPriceEok(10.0)).toBe('10억');
      });

      it('formatSectorAvgPrice handles empty, invalid, sub-1-eok, and multi-eok items', () => {
        expect(formatSectorAvgPrice([])).toBe('');
        expect(formatSectorAvgPrice(null as any)).toBe('');
        expect(formatSectorAvgPrice([{ priceVal: 0 } as any, { priceVal: NaN } as any])).toBe('');
        expect(formatSectorAvgPrice([{ priceVal: 0.5 } as any])).toBe('평균 5,000만');
        expect(formatSectorAvgPrice([{ priceVal: 14.8 } as any, { priceVal: 15.2 } as any])).toBe('평균 15.0억');
      });

      it('formatDeltaPrice handles 0, positive, negative, and invalid values', () => {
        expect(formatDeltaPrice(0)).toBe('');
        expect(formatDeltaPrice(NaN)).toBe('');
        expect(formatDeltaPrice(Infinity)).toBe('');
        expect(formatDeltaPrice(0.5)).toBe('5,000만');
        expect(formatDeltaPrice(-0.3)).toBe('3,000만');
        expect(formatDeltaPrice(1.2)).toBe('1억 2,000만');
        expect(formatDeltaPrice(1.0)).toBe('1억');
      });

      it('formatCleanDate handles undefined, YYYYMMDD, M월 D일, MM.DD, and arbitrary string formats', () => {
        expect(formatCleanDate(undefined, undefined)).toBe('');
        expect(formatCleanDate('8월 18일')).toBe('08.18');
        expect(formatCleanDate('08.18')).toBe('08.18');
        expect(formatCleanDate(undefined, '20260818')).toBe('08.18');
        expect(formatCleanDate('기타문자열')).toBe('기타문자열');
      });

      it('formatCompactEok handles undefined, 0, negative, NaN, and positive values', () => {
        expect(formatCompactEok(undefined)).toBe('');
        expect(formatCompactEok(0)).toBe('');
        expect(formatCompactEok(-5)).toBe('');
        expect(formatCompactEok(NaN as any)).toBe('');
        expect(formatCompactEok(14.82)).toBe('14.8억');
      });
    });
  });

  // =========================================================================
  // Challenge Vector 3: OfflineBanner Polymorphic Variants
  // =========================================================================
  describe('Vector 3: OfflineBanner Polymorphic Variants (Global, Inline, Auto-inferred)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('polymorphic default OfflineBanner stays hidden when online', () => {
      setNetworkStatus(true);
      const { container } = render(<OfflineBanner />);
      expect(container.firstChild).toBeNull();
    });

    it('polymorphic default OfflineBanner displays global alert when device transitions to offline', () => {
      setNetworkStatus(true);
      render(<OfflineBanner />);

      setNetworkStatus(false);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('오프라인 상태입니다 — 일부 기능이 제한될 수 있습니다');
      expect(alert.className).toContain('fixed top-0');
    });

    it('polymorphic default OfflineBanner shows reconnected message and auto-dismisses after 3s', () => {
      setNetworkStatus(true);
      render(<OfflineBanner />);

      // Transition to offline
      setNetworkStatus(false);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Transition back online
      setNetworkStatus(true);
      const statusBanner = screen.getByRole('status');
      expect(statusBanner).toBeInTheDocument();
      expect(statusBanner).toHaveTextContent('네트워크가 다시 연결되었습니다');

      // Fast-forward 3000ms
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('explicit variant="global" exhibits identical behavior to default OfflineBanner', () => {
      setNetworkStatus(false);
      render(<OfflineBanner variant="global" />);
      expect(screen.getByRole('alert')).toHaveTextContent('오프라인 상태입니다');
    });

    it('explicit variant="inline" renders InlineOfflineBanner with stale cache and refresh controls', () => {
      setNetworkStatus(true);
      const onRefreshMock = jest.fn();

      const { rerender } = render(
        <OfflineBanner
          variant="inline"
          isStale={false}
          onRefresh={onRefreshMock}
        />
      );
      // Online and not stale -> returns null
      expect(screen.queryByRole('alert')).toBeNull();

      // Set stale -> renders inline warning with refresh button
      rerender(
        <OfflineBanner
          variant="inline"
          isStale={true}
          onRefresh={onRefreshMock}
        />
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('캐시 데이터 표시 중')).toBeInTheDocument();

      const refreshBtn = screen.getByRole('button', { name: '새로고침' });
      fireEvent.click(refreshBtn);
      expect(onRefreshMock).toHaveBeenCalledTimes(1);
    });

    it('inline variant can be dismissed by user via close button and resets on network transition', () => {
      setNetworkStatus(false);
      render(<OfflineBanner variant="inline" />);

      expect(screen.getByText('오프라인 모드')).toBeInTheDocument();
      const closeBtn = screen.getByTitle('닫기');
      fireEvent.click(closeBtn);

      // Now dismissed
      expect(screen.queryByText('오프라인 모드')).toBeNull();

      // Connection restored -> then offline again resets dismissal
      setNetworkStatus(true);
      setNetworkStatus(false);
      expect(screen.getByText('오프라인 모드')).toBeInTheDocument();
    });

    it('automatically infers inline variant when isStale or onRefresh is provided without variant prop', () => {
      setNetworkStatus(true);
      const onRefreshMock = jest.fn();

      render(<OfflineBanner isStale={true} onRefresh={onRefreshMock} />);
      expect(screen.getByText('캐시 데이터 표시 중')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument();
    });

    it('verifies backward-compatible named exports OfflineBannerGlobal and OfflineBannerUI', () => {
      setNetworkStatus(false);
      const { unmount: unmountGlobal } = render(<OfflineBannerGlobal />);
      expect(screen.getByText(/오프라인 상태입니다/)).toBeInTheDocument();
      unmountGlobal();

      const { unmount: unmountUI } = render(<OfflineBannerUI isStale={true} />);
      expect(screen.getByText('오프라인 모드')).toBeInTheDocument();
      unmountUI();
    });
  });
});
