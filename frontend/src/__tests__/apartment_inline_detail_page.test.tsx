/**
 * apartment_inline_detail_page.test.tsx
 *
 * Verification suite for Option 1 (모달 콘텐츠의 독립 상세 페이지화 — `inline` 본문 이식):
 * 1. `useApartmentModalState({ inline: true })` Frame-0 animation bypass
 * 2. `ApartmentModalHeader` (`inline={true}`) `<h2>` heading + `뒤로가기` button (`apt-inline-back-btn`)
 * 3. `DashboardClient` inline apartment page mode (`preselectedAptName` + `autoOpenPreselectedModal={false}`):
 *    - Synchronous `effectiveInlineReport` resolution on Frame 0
 *    - Elimination of duplicate Home `MacroDashboardClient`
 *    - Single-layer calculator modals (Compare, Mortgage, Tax, JeonseSafety, SellTiming) without modal-on-modal stacking
 *    - Back navigation (`router.back()` vs `router.push('/')` fallback) and canonical recirculation routing
 *    - Ghost/unknown apartment resilience and `autoOpenPreselectedModal={true}` backward compatibility
 */

import React from 'react';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useApartmentModalState } from '@/components/apartment/hooks/useApartmentModalState';
import { ApartmentModalHeader } from '@/components/apartment/ApartmentModalHeader';
import { ApartmentModalTransactionsTable } from '@/components/apartment/ApartmentModalTransactionsTable';
import { ApartmentChapterNavBar, APARTMENT_CHAPTERS } from '@/components/apartment/ApartmentChapterNavBar';
import { ApartmentModalSkeleton } from '@/components/ui/ApartmentModalSkeleton';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import DashboardClient from '@/components/DashboardClient';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import type { LocationScoreItem, TxSummaryItem } from '@/types/transaction';

// ---------------------------------------------------------------------------
// Mocks & Spies
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    prefetch: mockPrefetch,
  }),
  useParams: () => ({ id: 'gbcx' }),
  usePathname: () => '/apartment/동탄역롯데캐슬',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    fieldReports: [
      {
        id: 'zone-rep-1',
        apartmentName: '동탄역 롯데캐슬',
        dong: '오산동',
        author: 'D-VIEW',
        likes: 5,
        commentCount: 2,
        createdAt: null,
      },
    ],
  }),
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  ApartmentRepository: {
    fetchApartmentNames: jest.fn().mockResolvedValue([]),
    fetchApartments: jest.fn().mockResolvedValue([]),
  },
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchAllApartments: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    userProfile: null,
    anonProfile: null,
    handleLogin: jest.fn(),
    handleLogout: jest.fn(),
  }),
}));

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    showToast: jest.fn(),
    triggerCustomA2HSModal: jest.fn(),
  }),
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: [],
    userFavorites: [],
    toggleFavorite: jest.fn(),
    handleToggleFavorite: jest.fn(),
    isFavorite: () => false,
  }),
  isApartmentInFavorites: () => false,
}));

jest.mock('@/hooks/usePreloadApartmentTx', () => ({
  usePreloadApartmentTx: () => jest.fn(),
  getApartmentFileKey: (name: string) => name.replace(/\s+/g, ''),
}));

jest.mock('@/hooks/useStaticData', () => ({
  useApartmentsByDong: () => ({
    apartments: [{ name: '동탄역 롯데캐슬', dong: '여울동', householdCount: 940, yearBuilt: '2021년', brand: '롯데건설' }],
    byDong: { 여울동: [{ name: '동탄역 롯데캐슬', dong: '여울동', householdCount: 940 }] },
    isLoading: false,
  }),
  useTxData: () => ({
    txSummary: {
      동탄역롯데캐슬: {
        latestPrice: 145000,
        latestPriceDate: '2026-03-10',
        latestArea: 84,
        txCount: 42,
      },
    },
    typeMap: [],
    locationScores: {
      동탄역롯데캐슬: {
        aptName: '동탄역롯데캐슬',
        totalScore: 91,
      },
    },
    isLoading: false,
  }),
  useLocationScores: () => ({
    locationScores: {
      동탄역롯데캐슬: {
        aptName: '동탄역롯데캐슬',
        totalScore: 91,
      },
    },
    isLoading: false,
  }),
}));

jest.mock('@/hooks/useDashboardMeta', () => ({
  useDashboardMeta: () => ({
    sheetApartments: {
      여울동: [{ name: '동탄역 롯데캐슬', dong: '여울동', householdCount: 940, yearBuilt: '2021년', brand: '롯데건설' }],
    },
    typeMap: [],
    nameMapping: {},
    publicRentalSet: new Set<string>(),
    triggerFetch: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('@/components/MacroDashboardClient', () => {
  return function MockMacroDashboardClient(props: {
    onSelectApt?: (name: string, dong?: string) => void;
    isSplitMode?: boolean;
  }) {
    return (
      <div
        data-testid="mock-macro-dashboard-client"
        data-split-mode={String(Boolean(props.isSplitMode))}
      >
        Macro Dashboard Home
        <button
          data-testid="mock-dashboard-select-apt"
          onClick={() => props.onSelectApt?.('동탄역 롯데캐슬', '여울동')}
        >
          상세 리포트 보기
        </button>
        <button
          data-testid="mock-dashboard-select-second-apt"
          onClick={() => props.onSelectApt?.('동탄역시범우남퍼스트빌', '청계동')}
        >
          다른 단지 선택
        </button>
      </div>
    );
  };
});

jest.mock('@/components/LoungeHeader', () => {
  return function MockLoungeHeader() {
    return <header data-testid="mock-lounge-header">Header</header>;
  };
});

jest.mock('@/components/pwa/MobileDock', () => {
  return function MockMobileDock(props: { activeTab?: string; onTabClick?: unknown }) {
    return (
      <nav
        data-testid="mock-mobile-dock"
        data-active-tab={props.activeTab || ''}
        data-has-tab-click={String(Boolean(props.onTabClick))}
      >
        Dock
      </nav>
    );
  };
});

jest.mock('@/components/PageHeroHeader', () => {
  return function MockPageHeroHeader() {
    return <div data-testid="mock-hero-header">Hero Header</div>;
  };
});

// Synchronous dynamic component mocks for DashboardClient
jest.mock('next/dynamic', () => {
  return (loader: () => Promise<unknown>) => {
    const loaderSrc = loader.toString();

    if (loaderSrc.includes('ApartmentModal')) {
      return function MockFieldReportModal(props: Record<string, unknown>) {
        const isInline = Boolean(props.inline);
        const report = props.report as FieldReportData | undefined;
        return (
          <div
            data-testid={isInline ? 'mock-inline-field-report-modal' : 'mock-popup-field-report-modal'}
            data-apt-name={report?.apartmentName || ''}
            data-dong={report?.dong || ''}
            data-tx-key={report?.txKey || ''}
            data-has-transactions-prop={String(props.transactions !== undefined)}
          >
            <button
              data-testid={isInline ? 'inline-close-btn' : 'popup-close-btn'}
              onClick={() => (props.onClose as () => void)?.()}
            >
              Close
            </button>
            <button
              data-testid="trigger-select-peer-apt"
              onClick={() =>
                (props.onSelectApartment as (apt: string, dong?: string) => void)?.(
                  '동탄역린스트라우스',
                  '오산동'
                )
              }
            >
              Select Peer Apt
            </button>
            <button
              data-testid="trigger-open-compare"
              onClick={() =>
                (props.onOpenCompare as (apt: string) => void)?.(report?.apartmentName || '동탄역롯데캐슬')
              }
            >
              Open Compare
            </button>
            <button
              data-testid="trigger-open-mortgage"
              onClick={() =>
                (props.onOpenMortgage as (apt: string, price?: number) => void)?.(
                  report?.apartmentName || '동탄역롯데캐슬',
                  145000
                )
              }
            >
              Open Mortgage
            </button>
            <button
              data-testid="trigger-open-tax"
              onClick={() =>
                (props.onOpenTaxCalculator as (apt: string, price?: number) => void)?.(
                  report?.apartmentName || '동탄역롯데캐슬',
                  145000
                )
              }
            >
              Open Tax
            </button>
            <button
              data-testid="trigger-open-jeonse-safety"
              onClick={() =>
                (props.onOpenJeonseSafety as (apt: string, sale?: number, jeonse?: number) => void)?.(
                  report?.apartmentName || '동탄역롯데캐슬',
                  145000,
                  80000
                )
              }
            >
              Open Jeonse Safety
            </button>
            <button
              data-testid="trigger-open-sell-timing"
              onClick={() =>
                (props.onOpenSellTimingCalculator as (apt: string, price?: number) => void)?.(
                  report?.apartmentName || '동탄역롯데캐슬',
                  145000
                )
              }
            >
              Open Sell Timing
            </button>
          </div>
        );
      };
    }

    if (loaderSrc.includes('AptCompareModal')) {
      return function MockAptCompareModal(props: Record<string, unknown>) {
        return (
          <div data-testid="mock-apt-compare-modal" data-initial-apt={String(props.initialAptA || '')}>
            <button data-testid="close-compare-modal" onClick={() => (props.onClose as () => void)?.()}>
              Close Compare
            </button>
            <button
              data-testid="compare-select-apt"
              onClick={() => (props.onSelectApartment as (apt: string) => void)?.('동탄역 시범 더샵 센트럴시티')}
            >
              Select Peer Apt
            </button>
          </div>
        );
      };
    }

    if (loaderSrc.includes('MortgageCalculator')) {
      return function MockMortgageCalculator(props: Record<string, unknown>) {
        return (
          <div data-testid="mock-mortgage-modal" data-apt={String(props.initialAptName || '')}>
            <button data-testid="close-mortgage-modal" onClick={() => (props.onClose as () => void)?.()}>
              Close Mortgage
            </button>
          </div>
        );
      };
    }

    if (loaderSrc.includes('PropertyTaxCalculator')) {
      return function MockPropertyTaxCalculator(props: Record<string, unknown>) {
        return (
          <div data-testid="mock-tax-modal" data-apt={String(props.initialAptName || '')}>
            <button data-testid="close-tax-modal" onClick={() => (props.onClose as () => void)?.()}>
              Close Tax
            </button>
          </div>
        );
      };
    }

    if (loaderSrc.includes('JeonseSafetyCalculator')) {
      return function MockJeonseSafetyCalculator(props: Record<string, unknown>) {
        return (
          <div data-testid="mock-jeonse-safety-modal" data-apt={String(props.initialAptName || '')}>
            <button data-testid="close-jeonse-safety-modal" onClick={() => (props.onClose as () => void)?.()}>
              Close Jeonse Safety
            </button>
          </div>
        );
      };
    }

    if (loaderSrc.includes('SellTimingCalculator')) {
      return function MockSellTimingCalculator(props: Record<string, unknown>) {
        return (
          <div data-testid="mock-sell-timing-modal" data-apt={String(props.initialAptName || '')}>
            <button data-testid="close-sell-timing-modal" onClick={() => (props.onClose as () => void)?.()}>
              Close Sell Timing
            </button>
          </div>
        );
      };
    }

    return () => null;
  };
});

describe('Option 1: Inline Apartment Detail Page Architecture Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.scrollTo = jest.fn();
  });

  // -------------------------------------------------------------------------
  // 1. useApartmentModalState Frame-0 Animation Bypass
  // -------------------------------------------------------------------------
  describe('1. useApartmentModalState inline mode', () => {
    it('initializes isAnimationFinished=true immediately on Frame 0 when inline=true', () => {
      const { result } = renderHook(() => useApartmentModalState({ inline: true }));
      expect(result.current.isAnimationFinished).toBe(true);
    });

    it('initializes isAnimationFinished=false and waits 300ms when inline=false', () => {
      jest.useFakeTimers();
      try {
        const { result } = renderHook(() => useApartmentModalState({ inline: false }));
        expect(result.current.isAnimationFinished).toBe(false);
        act(() => {
          jest.advanceTimersByTime(300);
        });
        expect(result.current.isAnimationFinished).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // -------------------------------------------------------------------------
  // 2. ApartmentModalHeader inline mode (`<h2>` heading + `뒤로가기` button)
  // -------------------------------------------------------------------------
  describe('2. ApartmentModalHeader inline semantics & back button', () => {
    const sampleReport: FieldReportData = {
      id: 'apt-동탄역롯데캐슬',
      apartmentName: '동탄역 롯데캐슬',
      dong: '여울동',
      author: 'System',
      content: '',
      rating: 5,
      metrics: {} as FieldReportData['metrics'],
      images: [],
      likes: 0,
      commentCount: 0,
      createdAt: new Date(),
    };

    const baseHeaderProps = {
      report: sampleReport,
      displayAptName: '동탄역 롯데캐슬',
      onClose: jest.fn(),
      handleNativeShare: jest.fn(),
      handleCopySummary: jest.fn(),
      handleDownloadShareCard: jest.fn(),
      setIsPushModalOpen: jest.fn(),
      copiedStatus: 'idle' as const,
      isToolDropdownOpen: false,
      setIsToolDropdownOpen: jest.fn(),
      toolDropdownRef: { current: null },
      preloadCalculators: jest.fn(),
    };

    it('renders <h2> instead of <h1> and exposes apt-inline-back-btn when inline=true and onBack is provided', () => {
      const handleBack = jest.fn();
      const { container } = render(
        <ApartmentModalHeader
          {...baseHeaderProps}
          onBack={handleBack}
          inline={true}
        />
      );

      // Must use <h2> in inline mode to preserve single-<h1> SEO invariant on /apartment/[aptName]
      expect(container.querySelector('h1')).toBeNull();
      const h2 = container.querySelector('h2');
      expect(h2).not.toBeNull();
      expect(h2?.textContent).toContain('동탄역 롯데캐슬');

      // Back button must be rendered and functional
      const backBtn = screen.getByTestId('apt-inline-back-btn');
      expect(backBtn).toBeInTheDocument();
      expect(backBtn).toHaveTextContent('뒤로가기');
      fireEvent.click(backBtn);
      expect(handleBack).toHaveBeenCalledTimes(1);
    });

    it('renders <h1> and close (X) button when inline=false', () => {
      const handleClose = jest.fn();
      const { container } = render(
        <ApartmentModalHeader
          {...baseHeaderProps}
          onClose={handleClose}
          inline={false}
        />
      );

      expect(container.querySelector('h1')).not.toBeNull();
      expect(screen.queryByTestId('apt-inline-back-btn')).toBeNull();
    });

    it('renders ApartmentModalSkeleton inline without fixed portal backdrop when inline=true', () => {
      render(<ApartmentModalSkeleton inline={true} />);
      const inlineSkeleton = screen.getByTestId('apartment-inline-skeleton');
      expect(inlineSkeleton).toBeInTheDocument();
      expect(inlineSkeleton.className).not.toContain('fixed');
      expect(document.body.querySelector('.fixed.inset-0.z-\\[9999\\]')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 3. DashboardClient Inline Detail Page Orchestration
  // -------------------------------------------------------------------------
  describe('3. DashboardClient inline detail page mode (preselectedAptName + autoOpenPreselectedModal=false)', () => {
    const scopedInitialData: DashboardInitialDataLocal = {
      txSummary: {
        동탄역롯데캐슬: {
          latestPrice: 145000,
          latestPriceDate: '2026-03-10',
          latestArea: 84,
          txCount: 42,
        } as unknown as TxSummaryItem,
      },
      locationScores: {
        동탄역롯데캐슬: {
          aptName: '동탄역롯데캐슬',
          totalScore: 91,
        } as unknown as LocationScoreItem,
      },
      apartmentMeta: {
        동탄역롯데캐슬: {
          dong: '여울동',
          txKey: '동탄역롯데캐슬',
          householdCount: 940,
          yearBuilt: '2021년',
          brand: '롯데건설',
        },
      },
    };

    it('renders inline FieldReportModal on Frame 0 and suppresses duplicate Home MacroDashboardClient', () => {
      render(
        <DashboardClient
          initialDashboardData={scopedInitialData}
          preselectedAptName="동탄역롯데캐슬"
          autoOpenPreselectedModal={false}
          hideHeader={true}
        />
      );

      // 1. Inline detail view container is rendered
      expect(screen.getByTestId('apartment-inline-detail-view')).toBeInTheDocument();

      // 2. Inline FieldReportModal is rendered with resolved metadata
      const inlineModal = screen.getByTestId('mock-inline-field-report-modal');
      expect(inlineModal).toBeInTheDocument();
      expect(inlineModal).toHaveAttribute('data-dong', '여울동');
      expect(inlineModal).toHaveAttribute('data-tx-key', '동탄역롯데캐슬');

      // 3. Popup FieldReportModal is NOT rendered
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();

      // 4. Duplicate Home MacroDashboardClient is NOT rendered
      expect(screen.queryByTestId('mock-macro-dashboard-client')).toBeNull();
    });

    it('opens and closes calculator modals (Compare, Mortgage, Tax, JeonseSafety, SellTiming) as a single layer without spawning a popup ApartmentModal or corrupting window.location.pathname', () => {
      window.history.replaceState({}, '', '/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');

      render(
        <DashboardClient
          initialDashboardData={scopedInitialData}
          preselectedAptName="동탄역롯데캐슬"
          autoOpenPreselectedModal={false}
          hideHeader={true}
        />
      );

      // Compare Modal lifecycle
      fireEvent.click(screen.getByTestId('trigger-open-compare'));
      expect(screen.getByTestId('mock-apt-compare-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();
      expect(window.location.pathname).toBe('/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
      fireEvent.click(screen.getByTestId('close-compare-modal'));
      expect(screen.queryByTestId('mock-apt-compare-modal')).toBeNull();
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();
      expect(screen.getByTestId('mock-inline-field-report-modal')).toBeInTheDocument();
      expect(window.location.pathname).toBe('/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');

      // Mortgage Modal lifecycle
      fireEvent.click(screen.getByTestId('trigger-open-mortgage'));
      expect(screen.getByTestId('mock-mortgage-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();
      expect(window.location.pathname).toBe('/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
      fireEvent.click(screen.getByTestId('close-mortgage-modal'));
      expect(screen.queryByTestId('mock-mortgage-modal')).toBeNull();
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();
      expect(window.location.pathname).toBe('/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');

      // Tax Modal lifecycle
      fireEvent.click(screen.getByTestId('trigger-open-tax'));
      expect(screen.getByTestId('mock-tax-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();
      expect(window.location.pathname).toBe('/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
      fireEvent.click(screen.getByTestId('close-tax-modal'));
      expect(screen.queryByTestId('mock-tax-modal')).toBeNull();
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();
      expect(window.location.pathname).toBe('/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');

      // Jeonse Safety Modal lifecycle
      fireEvent.click(screen.getByTestId('trigger-open-jeonse-safety'));
      expect(screen.getByTestId('mock-jeonse-safety-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();
      fireEvent.click(screen.getByTestId('close-jeonse-safety-modal'));
      expect(screen.queryByTestId('mock-jeonse-safety-modal')).toBeNull();

      // Sell Timing Modal lifecycle
      fireEvent.click(screen.getByTestId('trigger-open-sell-timing'));
      expect(screen.getByTestId('mock-sell-timing-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();
      fireEvent.click(screen.getByTestId('close-sell-timing-modal'));
      expect(screen.queryByTestId('mock-sell-timing-modal')).toBeNull();
    });

    it('updates inline report immediately when preselectedAptName prop changes across apartments', () => {
      const { rerender } = render(
        <DashboardClient
          initialDashboardData={scopedInitialData}
          preselectedAptName="동탄역롯데캐슬"
          autoOpenPreselectedModal={false}
          hideHeader={true}
        />
      );

      expect(screen.getByTestId('mock-inline-field-report-modal')).toHaveAttribute(
        'data-apt-name',
        '동탄역 롯데캐슬'
      );

      rerender(
        <DashboardClient
          initialDashboardData={scopedInitialData}
          preselectedAptName="동탄역시범더샵센트럴시티"
          autoOpenPreselectedModal={false}
          hideHeader={true}
        />
      );

      expect(screen.getByTestId('mock-inline-field-report-modal')).toHaveAttribute(
        'data-apt-name',
        '동탄역 시범 더샵 센트럴시티'
      );
    });

    it('navigates to canonical /apartment/[slug] when selecting a peer apartment inside AptCompareModal on inline page', () => {
      render(
        <DashboardClient
          initialDashboardData={scopedInitialData}
          preselectedAptName="동탄역롯데캐슬"
          autoOpenPreselectedModal={false}
          hideHeader={true}
        />
      );

      fireEvent.click(screen.getByTestId('trigger-open-compare'));
      fireEvent.click(screen.getByTestId('compare-select-apt'));

      expect(mockPush).toHaveBeenCalledTimes(1);
      const pushedUrl = mockPush.mock.calls[0][0] as string;
      expect(pushedUrl).toMatch(/^\/apartment\//);
    });

    it('calls router.back() when history.length > 1 (same-origin) and falls back to router.push("/") when history.length <= 1 or referrer is external', () => {
      const historyLengthSpy = jest.spyOn(window.history, 'length', 'get');
      const referrerSpy = jest.spyOn(document, 'referrer', 'get');

      // Case A: history.length > 1 and same-origin/empty referrer
      historyLengthSpy.mockReturnValue(3);
      referrerSpy.mockReturnValue('');
      const { unmount } = render(
        <DashboardClient
          initialDashboardData={scopedInitialData}
          preselectedAptName="동탄역롯데캐슬"
          autoOpenPreselectedModal={false}
          hideHeader={true}
        />
      );
      fireEvent.click(screen.getByTestId('inline-close-btn'));
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();
      unmount();

      // Case B: history.length <= 1 (direct landing in new tab)
      mockBack.mockClear();
      mockPush.mockClear();
      historyLengthSpy.mockReturnValue(1);
      const { unmount: unmountB } = render(
        <DashboardClient
          initialDashboardData={scopedInitialData}
          preselectedAptName="동탄역롯데캐슬"
          autoOpenPreselectedModal={false}
          hideHeader={true}
        />
      );
      fireEvent.click(screen.getByTestId('inline-close-btn'));
      expect(mockBack).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
      unmountB();

      // Case C: history.length > 1 but external referrer (e.g. Google search in same tab)
      mockBack.mockClear();
      mockPush.mockClear();
      historyLengthSpy.mockReturnValue(4);
      referrerSpy.mockReturnValue('https://www.google.com/search?q=dview');
      render(
        <DashboardClient
          initialDashboardData={scopedInitialData}
          preselectedAptName="동탄역롯데캐슬"
          autoOpenPreselectedModal={false}
          hideHeader={true}
        />
      );
      fireEvent.click(screen.getByTestId('inline-close-btn'));
      expect(mockBack).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');

      historyLengthSpy.mockRestore();
      referrerSpy.mockRestore();
    });

    it('gracefully renders inline stub report for unrecognized/ghost apartment name without crashing', () => {
      render(
        <DashboardClient
          initialDashboardData={{}}
          preselectedAptName="존재하지않는가상테스트단지999"
          autoOpenPreselectedModal={false}
          hideHeader={true}
        />
      );

      expect(screen.getByTestId('apartment-inline-detail-view')).toBeInTheDocument();
      const inlineModal = screen.getByTestId('mock-inline-field-report-modal');
      expect(inlineModal).toHaveAttribute('data-apt-name', '존재하지않는가상테스트단지999');
      expect(screen.queryByTestId('mock-macro-dashboard-client')).toBeNull();
    });

    it('preserves Home MacroDashboardClient when preselectedAptName is not set', () => {
      render(<DashboardClient initialDashboardData={scopedInitialData} />);

      expect(screen.getByTestId('mock-macro-dashboard-client')).toBeInTheDocument();
      expect(screen.queryByTestId('apartment-inline-detail-view')).toBeNull();
      const dock = screen.getByTestId('mock-mobile-dock');
      expect(dock).toHaveAttribute('data-active-tab', 'overview');
      expect(dock).toHaveAttribute('data-has-tab-click', 'true');
    });

    it('configures MobileDock with activeTab="explore" and native link navigation (no pushState tab override) in inline apartment detail mode', () => {
      render(
        <DashboardClient
          initialDashboardData={scopedInitialData}
          preselectedAptName="동탄역롯데캐슬"
          autoOpenPreselectedModal={false}
          hideHeader={true}
        />
      );

      const dock = screen.getByTestId('mock-mobile-dock');
      expect(dock).toHaveAttribute('data-active-tab', 'explore');
      expect(dock).toHaveAttribute('data-has-tab-click', 'false');
    });
  });

  describe('5. useApartmentDetails SSR metrics & txKey fallback before sheetApartments loads', () => {
    it('preserves SSR-seeded selectedReport.metrics and resolves aptTxSummary via selectedReport.txKey when sheetApartments is empty', () => {
      const ssrSeededReport: FieldReportData = {
        id: 'ssr-inline-동탄역롯데캐슬',
        apartmentName: '동탄역 롯데캐슬 (공식명)',
        dong: '여울동',
        txKey: '동탄역롯데캐슬',
        author: 'DVIEW',
        createdAt: '',
        premiumScores: {
          subwayScore: 0,
          starbucksScore: 0,
          elementaryScore: 0,
          middleScore: 0,
          highScore: 0,
          academyScore: 0,
          departmentStoreScore: 0,
          supermarketScore: 0,
          parkScore: 0,
          brandScore: 0,
          scaleScore: 0,
          ageScore: 0,
          totalPremiumScore: 0,
        },
        metrics: {
          distanceToSubway: 0,
          subwayStationName: '',
          distanceToIndeokwon: 0,
          indeokwonStationName: '',
          distanceToTram: 0,
          tramStationName: '',
          distanceToStarbucks: 0,
          starbucksName: '',
          starbucksAddress: '',
          distanceToElementary: 0,
          elementarySchoolName: '',
          distanceToMiddle: 0,
          middleSchoolName: '',
          distanceToHigh: 0,
          highSchoolName: '',
          academyDensity: 0,
          academyCategories: {},
          restaurantDensity: 0,
          restaurantCategories: {},
          distanceToSupermarket: 0,
          supermarketName: '',
          distanceToMcDonalds: 0,
          mcDonaldsName: '',
          mcDonaldsAddress: '',
          distanceToOliveYoung: 0,
          oliveYoungName: '',
          oliveYoungAddress: '',
          distanceToDaiso: 0,
          daisoName: '',
          daisoAddress: '',
          distanceToMajorHospital: 0,
          majorHospitalName: '',
          distanceToPark: 0,
          parkName: '',
          parkArea: 0,
          brand: '롯데건설',
          householdCount: 940,
          far: 499,
          bcr: 48,
          parkingPerHousehold: 1.45,
          yearBuilt: '2021년',
        },
        content: {
          pros: '',
          cons: '',
          GtxEffect: '',
          undergroundParking: '',
          landscaping: '',
          community: '',
          commercial: '',
        },
        images: [],
        likes: 0,
        commentCount: 0,
      };

      const txMap: Record<string, TxSummaryItem> = {
        동탄역롯데캐슬: {
          latestPrice: 145000,
          latestPriceDate: '2026-03-10',
          latestArea: 84,
          txCount: 42,
        } as TxSummaryItem,
      };

      const locScores: Record<string, LocationScoreItem> = {
        동탄역롯데캐슬: {
          aptName: '동탄역롯데캐슬',
          totalScore: 91,
        } as LocationScoreItem,
      };

      const { result } = renderHook(() =>
        useApartmentDetails(
          ssrSeededReport,
          {}, // Empty sheetApartments simulating Frame 0 before /data/apartments-by-dong.json resolves
          {},
          null,
          txMap,
          locScores
        )
      );

      expect(result.current.resolvedReport?.metrics.householdCount).toBe(940);
      expect(result.current.resolvedReport?.metrics.yearBuilt).toBe('2021년');
      expect(result.current.resolvedReport?.metrics.brand).toBe('롯데건설');
      expect(result.current.resolvedReport?.metrics.parkingPerHousehold).toBe(1.45);
      expect(result.current.aptTxSummary?.latestPrice).toBe(145000);
    });
  });

  describe('6. ApartmentChapterNavBar design & scroll-spy contract', () => {
    it('renders chapter number badges with tabular-nums and zero font-mono classes', () => {
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
        />
      );

      expect(container.querySelectorAll('.font-mono').length).toBe(0);
      expect(container.querySelectorAll('.tabular-nums').length).toBe(APARTMENT_CHAPTERS.length);
    });
  });

  describe('7. Animated Master-Detail Split Workspace (Desktop Split Inspector md:max-w-[780px] xl:max-w-[880px] md:h-dvh + Mobile Bottom Sheet h-[94dvh])', () => {
    it('renders ApartmentModalSkeleton (inline=false) as an in-place desktop Master-Detail inspector and mobile 94dvh bottom sheet', () => {
      render(<ApartmentModalSkeleton inline={false} />);
      const modalSkeleton = screen.getByTestId('apartment-modal-skeleton');
      expect(modalSkeleton).toBeInTheDocument();
      expect(modalSkeleton.className).toContain('h-[94dvh]');
      expect(modalSkeleton.className).toContain('md:h-dvh');
      expect(modalSkeleton.className).toContain('lg:w-[780px]');
      expect(modalSkeleton.className).toContain('xl:w-[880px]');
      expect(modalSkeleton.className).toContain('shrink-0');
      expect(modalSkeleton.className).toContain('md:max-w-[780px]');
      expect(modalSkeleton.className).toContain('xl:max-w-[880px]');
      expect(modalSkeleton.className).toContain('rounded-t-3xl');
      expect(modalSkeleton.className).toContain('md:rounded-l-3xl');

      const splitBackdrop = modalSkeleton.parentElement;
      expect(splitBackdrop?.className).toContain('items-end');
      expect(splitBackdrop?.className).toContain('md:justify-end');
      expect(splitBackdrop?.className).toContain('md:static');
      expect(splitBackdrop?.className).toContain('md:bg-transparent');
    });

    it('stacks transaction chart and table at full width in inspector mode (inline=false) while keeping 35%/65% split in inline page mode (inline=true)', () => {
      const baseTableProps = {
        isAnimationFinished: true,
        isTxLoading: false,
        filteredTransactions: [],
        typeMap: {},
        chartType: 'sale' as const,
        setChartType: jest.fn(),
        normalizeAptName: (n: string) => n,
        displayAptName: '동탄역 롯데캐슬',
        dong: '여울동',
        apartmentName: '동탄역롯데캐슬',
        filterOutliers: true,
        handleToggleFilter: jest.fn(),
        areaFilterChips: ['전체', '34평'],
        selectedAreaFilter: '전체',
        setSelectedAreaFilter: jest.fn(),
        renderTransactionTable: () => <div data-testid="tx-table-node">Table</div>,
        renderTransactionChart: () => <div data-testid="tx-chart-node">Chart</div>,
        renderTransactionSummaryMetrics: () => <div data-testid="tx-metrics-node">Metrics</div>,
      };

      const { unmount } = render(<ApartmentModalTransactionsTable {...baseTableProps} inline={false} />);
      const inspectorTableWrapper = screen.getByTestId('tx-table-node').parentElement;
      expect(inspectorTableWrapper?.className).toContain('w-full');
      expect(inspectorTableWrapper?.className).not.toContain('md:w-[35%]');
      unmount();

      render(<ApartmentModalTransactionsTable {...baseTableProps} inline={true} />);
      const inlineTableWrapper = screen.getByTestId('tx-table-node').parentElement;
      expect(inlineTableWrapper?.className).toContain('md:w-[35%]');
    });

    it('animates the page layout into a Master-Detail Split Workspace on apartment selection, allows simultaneous Master interaction to switch apartments, and restores full width on close', () => {
      window.history.replaceState({}, '', '/');

      render(<DashboardClient initialDashboardData={{}} />);

      const workspace = screen.getByTestId('master-detail-workspace');
      const masterPane = screen.getByTestId('master-workspace-pane');
      const detailPane = screen.getByTestId('detail-workspace-pane');
      const dashboardHome = screen.getByTestId('mock-macro-dashboard-client');

      // Initial state: unsplit full-width Master pane, collapsed Detail pane (preserving md:h-dvh to prevent diagonal height animation)
      expect(workspace).toHaveAttribute('data-split-open', 'false');
      expect(masterPane.className).toContain('w-full');
      expect(masterPane.className).toContain('transition-all');
      expect(masterPane.className).not.toContain('lg:w-[calc(100%-780px)]');
      expect(detailPane).toHaveAttribute('aria-hidden', 'true');
      expect(detailPane.className).toContain('w-0');
      expect(detailPane.className).toContain('md:h-dvh');
      expect(detailPane.className).toContain('md:sticky');
      expect(detailPane.className).toContain('opacity-0');
      expect(dashboardHome).toHaveAttribute('data-split-mode', 'false');
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();

      // Click [상세 리포트 보기] on Master dashboard
      fireEvent.click(screen.getByTestId('mock-dashboard-select-apt'));

      // 1. Workspace splits with animated width classes on both Master and Detail panes and clips overflow during transition
      expect(workspace).toHaveAttribute('data-split-open', 'true');
      expect(masterPane.className).toContain('md:w-[calc(100%-52vw)]');
      expect(masterPane.className).toContain('lg:w-[calc(100%-780px)]');
      expect(masterPane.className).toContain('xl:w-[calc(100%-880px)]');
      expect(detailPane).toHaveAttribute('aria-hidden', 'false');
      expect(detailPane.className).toContain('lg:w-[780px]');
      expect(detailPane.className).toContain('xl:w-[880px]');
      expect(detailPane.className).toContain('md:h-dvh');
      expect(detailPane.className).toContain('md:sticky');
      expect(detailPane.className).toContain('md:overflow-hidden');
      expect(detailPane.className).toContain('opacity-100');
      expect(dashboardHome).toHaveAttribute('data-split-mode', 'true');

      // 2. Detail inspector renders inside the right Detail pane
      const popupInspector = screen.getByTestId('mock-popup-field-report-modal');
      expect(detailPane).toContainElement(popupInspector);
      expect(popupInspector).toHaveAttribute('data-apt-name', '동탄역 롯데캐슬');

      // 3. Does NOT call router.push to navigate away to a separate page
      expect(mockPush).not.toHaveBeenCalled();
      expect(decodeURIComponent(window.location.pathname)).toContain('/apartment/');

      // 4. Simultaneous Master-Detail interaction: clicking another apartment in the Left Master pane updates the Right Detail pane in-place
      fireEvent.click(screen.getByTestId('mock-dashboard-select-second-apt'));
      expect(workspace).toHaveAttribute('data-split-open', 'true');
      expect(screen.getByTestId('mock-popup-field-report-modal')).toHaveAttribute(
        'data-apt-name',
        '동탄역시범우남퍼스트빌'
      );

      // 5. Closing the Detail pane smoothly restores the Master pane to 100% full width
      fireEvent.click(screen.getByTestId('popup-close-btn'));
      expect(workspace).toHaveAttribute('data-split-open', 'false');
      expect(masterPane.className).not.toContain('lg:w-[calc(100%-780px)]');
      expect(detailPane).toHaveAttribute('aria-hidden', 'true');
      expect(detailPane.className).toContain('w-0');
      expect(dashboardHome).toHaveAttribute('data-split-mode', 'false');
      expect(screen.queryByTestId('mock-popup-field-report-modal')).toBeNull();
    });

    it('ZoneDetailClient opens apartments in-place inside Master-Detail split workspace without passing hardcoded empty transactions or navigating away on peer apartment selection', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ZoneDetailClient = require('@/app/zone/[id]/ZoneDetailClient').default;
      window.history.replaceState({}, '', '/zone/gbcx');
      mockPush.mockClear();

      render(<ZoneDetailClient />);

      const workspace = screen.getByTestId('master-detail-workspace');
      expect(workspace).toHaveAttribute('data-split-open', 'false');

      // Click apartment card in ZoneDetailClient
      fireEvent.click(screen.getByRole('button', { name: /리포트: 동탄역 롯데캐슬/ }));

      expect(workspace).toHaveAttribute('data-split-open', 'true');
      const popupInspector = screen.getByTestId('mock-popup-field-report-modal');
      expect(popupInspector).toHaveAttribute('data-apt-name', '동탄역 롯데캐슬');
      // Must NOT pass hardcoded transactions={[]} which suppresses useApartmentDetails transaction loader
      expect(popupInspector).toHaveAttribute('data-has-transactions-prop', 'false');

      // Selecting an unindexed peer apartment inside the inspector updates the split pane in-place without router.push
      fireEvent.click(screen.getByTestId('trigger-select-peer-apt'));
      expect(mockPush).not.toHaveBeenCalled();
      expect(workspace).toHaveAttribute('data-split-open', 'true');
      expect(screen.getByTestId('mock-popup-field-report-modal')).toHaveAttribute(
        'data-apt-name',
        '동탄역린스트라우스'
      );
    });

    it('keeps top GNB header (LoungeHeader / Zone header) at 100% full width outside master-workspace-pane and offsets detail-workspace-pane below sticky header on desktop', () => {
      window.history.replaceState({}, '', '/');

      const { unmount } = render(<DashboardClient initialDashboardData={{}} />);
      const header = screen.getByTestId('mock-lounge-header');
      const workspace = screen.getByTestId('master-detail-workspace');
      const masterPane = screen.getByTestId('master-workspace-pane');
      const detailPane = screen.getByTestId('detail-workspace-pane');

      // LoungeHeader must NOT be inside master-workspace-pane or master-detail-workspace so it never shrinks when split opens
      expect(masterPane).not.toContainElement(header);
      expect(workspace).not.toContainElement(header);

      // Open split inspector and verify header remains outside narrowed master pane while detail pane offsets below 80px header
      fireEvent.click(screen.getByTestId('mock-dashboard-select-apt'));
      expect(workspace).toHaveAttribute('data-split-open', 'true');
      expect(masterPane).not.toContainElement(header);
      expect(detailPane.className).toContain('md:top-[80px]');
      expect(detailPane.className).toContain('md:max-h-[calc(100dvh-80px)]');
      unmount();

      // Also verify ZoneDetailClient top header is outside master-workspace-pane
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ZoneDetailClient = require('@/app/zone/[id]/ZoneDetailClient').default;
      window.history.replaceState({}, '', '/zone/gbcx');
      render(<ZoneDetailClient />);
      const zoneMasterPane = screen.getByTestId('master-workspace-pane');
      const zoneDetailPane = screen.getByTestId('detail-workspace-pane');
      const backToZonesBtn = screen.getByRole('button', { name: /전체 권역/ });
      expect(zoneMasterPane).not.toContainElement(backToZonesBtn);
      expect(zoneDetailPane.className).toContain('md:top-16');
      expect(zoneDetailPane.className).toContain('md:max-h-[calc(100dvh-64px)]');
    });
  });
});


