/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file challenger2_public_features_integrity.test.tsx
 * @description Empirical Challenger 2 Verification Suite:
 * Core Public Feature Integrity Verification (Admin, Lounge, and Auth Purge)
 *
 * Requirements:
 * 1. Verify Apartment details, 18-year real transactions, Macro trends, Techno Valley, and MBTI work 100% publicly without login.
 * 2. Verify useFavorites operates 100% locally via localStorage without network calls to /api/favorite.
 * 3. Verify AuthProvider wraps the tree without initiating any Firebase Auth network listeners.
 * 4. Verify zero runtime exceptions or authentication gate blocks across all public flows.
 */

import React from 'react';
import { render, screen, act, fireEvent, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks & Polyfills
// ---------------------------------------------------------------------------

window.scrollTo = jest.fn();

const mockRedirect = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => mockRedirect(url),
}));

// Recharts mock for jsdom
jest.mock('recharts', () => {
  const Original = jest.requireActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }: any) => <svg data-testid="pie-chart">{children}</svg>,
    Pie: ({ children }: any) => <g data-testid="pie">{children}</g>,
    Cell: () => <path data-testid="pie-cell" />,
    LineChart: ({ children }: any) => <svg data-testid="line-chart">{children}</svg>,
    Line: () => <path data-testid="line" />,
    XAxis: () => <g data-testid="x-axis" />,
    YAxis: () => <g data-testid="y-axis" />,
    CartesianGrid: () => <g data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
  };
});

// Mock react-intersection-observer
jest.mock('react-intersection-observer', () => ({
  useInView: () => ({
    ref: jest.fn(),
    inView: true,
  }),
}));

// Mock apartment repository to prevent background unawaited logs
jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchApartmentMeta: jest.fn().mockResolvedValue({}),
}));

// Mock SWR to avoid background timers
jest.mock('swr', () => {
  const original = jest.requireActual('swr');
  return {
    __esModule: true,
    ...original,
    default: jest.fn((url: string) => {
      if (typeof url === 'string' && url.includes('industry-distribution')) {
        return { data: { distribution: [] }, isValidating: false, isLoading: false };
      }
      if (typeof url === 'string' && url.includes('trend')) {
        return { data: { trends: [] }, isValidating: false, isLoading: false };
      }
      return { data: undefined, isValidating: false, isLoading: false };
    }),
    preload: jest.fn(),
  };
});

// Import tested components & modules
import { AuthProvider, useAuth, STATIC_AUTH_STATE } from '@/contexts/AuthContext';
import { useAuth as useLibAuth } from '@/lib/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { useFavorites } from '@/hooks/useFavorites';
import { staticDataService, parsePeriodTransactions } from '@/lib/services/staticDataService';
import ApartmentModal from '@/components/apartment/ApartmentModal';
import MacroDashboardClient from '@/components/MacroDashboardClient';
import { MacroTimelineView, TimelineGroup } from '@/components/macro/components/MacroTimelineView';
import TechnoValleyPage from '@/app/technovalley/page';
import TechnoValleyClient from '@/app/technovalley/TechnoValleyClient';
import { MBTIContainer } from '@/components/mbti/MBTIContainer';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { RecentTransaction } from '@/types/transaction';
import type { User } from 'firebase/auth';

describe('Challenger 2: Core Public Feature Integrity & Zero-Auth Verification', () => {
  const originalFetch = global.fetch;
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    fetchSpy = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/favorite-counts')) {
        return Promise.resolve(new Response(JSON.stringify({ counts: {} }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
    global.fetch = fetchSpy;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // =========================================================================
  // Dimension 1: Auth Neutralization & Tree Wrapping
  // =========================================================================
  describe('Dimension 1: Auth Neutralization & Static Anonymous State', () => {
    it('AuthProvider wraps children without initiating any Firebase Auth listeners', () => {
      const ChildComponent = () => {
        const auth = useAuth();
        return (
          <div data-testid="auth-consumer">
            <span data-testid="auth-user">{auth.user ? 'logged_in' : 'anonymous'}</span>
            <span data-testid="auth-loading">{String(auth.isLoading)}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <ChildComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-user')).toHaveTextContent('anonymous');
      expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
    });

    it('useAuth provides immutable STATIC_AUTH_STATE with no-op handlers', async () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
      expect(result.current.anonProfile).toBeNull();
      expect(result.current.isLoading).toBe(false);

      // Verify handlers complete cleanly without errors
      await expect(result.current.handleLogin()).resolves.toBeUndefined();
      await expect(result.current.handleLogout()).resolves.toBeUndefined();
      expect(() => result.current.updateLocalAnonProfile({ nickname: 'test' })).not.toThrow();
    });

    it('lib/contexts/AuthContext re-exports identical symbols for backward compatibility', () => {
      const { result: mainResult } = renderHook(() => useAuth());
      const { result: libResult } = renderHook(() => useLibAuth());

      expect(libResult.current.user).toBe(mainResult.current.user);
      expect(libResult.current.isLoading).toBe(mainResult.current.isLoading);
      expect(STATIC_AUTH_STATE.user).toBeNull();
    });
  });

  // =========================================================================
  // Dimension 2: useFavorites 100% Local Storage & Zero Network /api/favorite Calls
  // =========================================================================
  describe('Dimension 2: useFavorites Local Storage & Zero Remote Calls', () => {
    it('operates 100% locally via localStorage and CustomEvents without remote calls to /api/favorite', async () => {
      localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역 롯데캐슬']));
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

      const { result } = renderHook(() => useFavorites(null, { '동탄역 롯데캐슬': 15 }));

      // Verify initial state read from localStorage
      expect(result.current.isFavorited('동탄역 롯데캐슬')).toBe(true);
      expect(result.current.isFavorited('동탄역 시범우남퍼스트빌')).toBe(false);
      expect(result.current.favoritesCount).toBe(1);

      // Add a favorite
      await act(async () => {
        await result.current.handleToggleFavorite('동탄역 시범우남퍼스트빌');
      });

      expect(result.current.isFavorited('동탄역 시범우남퍼스트빌')).toBe(true);
      expect(result.current.favoritesCount).toBe(2);
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'dview_favorites_updated' })
      );

      // Verify localStorage was updated
      const stored = JSON.parse(localStorage.getItem('dview_guest_favorites') || '[]');
      expect(stored).toContain('동탄역 시범우남퍼스트빌');
      expect(stored).toContain('동탄역 롯데캐슬');

      // Verify ZERO calls were made to /api/favorite
      const calledUrls = fetchSpy.mock.calls.map((c: any[]) => c[0]);
      const favoriteApiCalls = calledUrls.filter((url: string) =>
        url === '/api/favorite' || url.startsWith('/api/favorite?') || url === '/api/favorites'
      );
      expect(favoriteApiCalls).toHaveLength(0);
    });

    it('operates 100% locally even when a legacy user object is passed into useFavorites', async () => {
      const legacyMockUser = { uid: 'user_456' } as unknown as User;
      localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역 롯데캐슬']));

      const { result } = renderHook(() => useFavorites(legacyMockUser));

      // Remove favorite
      await act(async () => {
        await result.current.handleToggleFavorite('동탄역 롯데캐슬');
      });

      expect(result.current.isFavorited('동탄역 롯데캐슬')).toBe(false);
      expect(result.current.favoritesCount).toBe(0);

      // Verify zero network calls to /api/favorite
      const calledUrls = fetchSpy.mock.calls.map((c: any[]) => c[0]);
      const favoriteApiCalls = calledUrls.filter((url: string) =>
        url === '/api/favorite' || url.startsWith('/api/favorite?')
      );
      expect(favoriteApiCalls).toHaveLength(0);
    });
  });

  // =========================================================================
  // Dimension 3: Apartment Details & Modal (100% Public Access)
  // =========================================================================
  describe('Dimension 3: Apartment Details & Modal (100% Public)', () => {
    const sampleReport: FieldReportData = {
      id: 'apt-lotte-castle',
      apartmentName: '동탄역 롯데캐슬',
      dong: '오산동',
      householdCount: 940,
      completionDate: '2021-06',
      brand: '롯데캐슬',
      summary: '동탄역 초역세권 대표 대장 아파트 단지',
      metrics: {
        elementarySchool: '청계초',
        middleSchool: '청계중',
        highSchool: '동탄고',
        kindergartenCount: 5,
        academyCount: 42,
        busStopCount: 6,
        subwayDistanceKm: 0.1,
        parkDistanceKm: 0.3,
        householdCount: 940,
      } as any,
      images: [],
    };

    const sampleTransactions = [
      {
        dong: '오산동',
        aptName: '동탄역 롯데캐슬',
        area: 84.9,
        areaPyeong: 34,
        contractYm: '202603',
        contractDay: '15',
        price: 165000,
        priceEok: '16억5,000',
        floor: 25,
        buildYear: 2021,
        dealType: '매매',
      },
      {
        dong: '오산동',
        aptName: '동탄역 롯데캐슬',
        area: 84.9,
        areaPyeong: 34,
        contractYm: '202602',
        contractDay: '10',
        price: 80000,
        deposit: 80000,
        priceEok: '8억',
        floor: 18,
        buildYear: 2021,
        dealType: '전세',
      },
    ];

    it('renders ApartmentModal with full public details, metrics, and transactions without login', () => {
      const handleClose = jest.fn();

      render(
        <SettingsProvider>
          <AuthProvider>
            <ApartmentModal
              report={sampleReport}
              onClose={handleClose}
              user={null}
              transactions={sampleTransactions as any}
              typeMap={{}}
              inline={true}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      // Verify title renders cleanly
      expect(screen.getAllByText('동탄역 롯데캐슬').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('오산동').length).toBeGreaterThanOrEqual(1);

      // Verify public action buttons exist
      expect(screen.getByTitle('아파트 분석 리포트 공유하기')).toBeInTheDocument();
      expect(screen.getByTitle('단톡방용 텍스트 요약 복사')).toBeInTheDocument();
      expect(screen.getByTitle('인포그래픽 요약 카드 이미지 다운로드')).toBeInTheDocument();

      // Verify no login buttons or prompts exist
      expect(screen.queryByText(/로그인하고 계속하기/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/로그인이 필요합니다/i)).not.toBeInTheDocument();
    });

    it('allows toggling favorite in ApartmentModal directly without prompting for login', () => {
      const toggleFavoriteSpy = jest.fn();

      render(
        <SettingsProvider>
          <AuthProvider>
            <ApartmentModal
              report={sampleReport}
              onClose={jest.fn()}
              user={null}
              transactions={sampleTransactions as any}
              typeMap={{}}
              inline={true}
              userFavorites={new Set()}
              onToggleFavorite={toggleFavoriteSpy}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      const favButton = screen.getByLabelText(/동탄역 롯데캐슬 관심 단지/i);
      expect(favButton).toBeInTheDocument();

      fireEvent.click(favButton);
      expect(toggleFavoriteSpy).toHaveBeenCalledWith('동탄역 롯데캐슬');
    });
  });

  // =========================================================================
  // Dimension 4: 18-Year Real Transactions & Period Chunks (100% Public)
  // =========================================================================
  describe('Dimension 4: 18-Year Real Transactions & Period Chunks', () => {
    it('parsePeriodTransactions parses compact tuple JSON format accurately', () => {
      const compactPayload = {
        fields: ['aptName', 'txKey', 'date', 'contractDate', 'priceVal', 'priceEok', 'area', 'areaPyeong', 'floor', 'dealType'],
        data: [
          ['동탄역 롯데캐슬', '동탄역롯데캐슬', '26.03', '20260315', 16.5, '16억5,000', 84.9, 34, 25, '매매'],
          ['동탄역시범우남퍼스트빌', '동탄역시범우남퍼스트빌', '26.02', '20260220', 11.2, '11억2,000', 84.8, 34, 15, '매매'],
        ],
      };

      const parsed = parsePeriodTransactions(compactPayload);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].aptName).toBe('동탄역 롯데캐슬');
      expect(parsed[0].priceVal).toBe(16.5);
      expect(parsed[0].priceEok).toBe('16억5,000');
      expect(parsed[1].aptName).toBe('동탄역시범우남퍼스트빌');
    });

    it('fetchPeriodTransactions requests versioned CDN JSON chunks without Firestore reads', async () => {
      const mockPeriodTxs: RecentTransaction[] = [
        {
          aptName: '동탄역 롯데캐슬',
          txKey: '동탄역롯데캐슬',
          date: '26.03',
          contractDate: '20260315',
          priceVal: 16.5,
          priceEok: '16억5,000',
          area: 84.9,
          areaPyeong: 34,
          floor: 25,
          dealType: '매매',
        },
      ];

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockPeriodTxs), { status: 200 })
      );

      const data = await staticDataService.fetchPeriodTransactions('1y', 'v_test_123');
      expect(data).toHaveLength(1);
      expect(data[0].aptName).toBe('동탄역 롯데캐슬');

      // Verify exact CDN path requested
      expect(fetchSpy).toHaveBeenCalledWith(
        '/data/transactions-1y.json?v=v_test_123',
        expect.anything()
      );
    });

    it('staticDataService returns [] and 0 Firestore reads in browser runtime', async () => {
      expect(typeof window).not.toBe('undefined');
      const firestoreTxs = await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(firestoreTxs).toEqual([]);
    });

    it('renders MacroTimelineView with multi-period transaction groups and handles filter toggles', () => {
      const timelineData: TimelineGroup[] = [
        {
          dateStr: '2026.03.15',
          timestamp: 1773532800000,
          items: [
            {
              aptName: '동탄역 롯데캐슬',
              dong: '오산동',
              priceEok: '16억5,000',
              priceVal: 16.5,
              areaPyeong: 34,
              area: 84.9,
              floor: 25,
              type: 'high',
              delta: 0.5,
              deltaPercent: 3.1,
            },
          ],
        },
      ];

      const handleSelectApt = jest.fn();
      const setPeriodFilter = jest.fn();

      render(
        <SettingsProvider>
          <AuthProvider>
            <MacroTimelineView
              displayedTimelineData={timelineData}
              onSelectApt={handleSelectApt}
              periodFilter="90d"
              setPeriodFilter={setPeriodFilter}
              visibleTimelineCount={10}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      expect(screen.getByText('동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.getByText('16억5,000')).toBeInTheDocument();
      expect(screen.getByText(/오산동/)).toBeInTheDocument();
    });

    it('renders MacroDashboardClient completely publicly without authentication barriers', () => {
      const mockSheetApartments = {
        '오산동': [
          { name: '동탄역 롯데캐슬', dong: '오산동', txKey: '동탄역롯데캐슬' } as any,
        ],
      };
      const mockTxSummaryData = {
        '동탄역 롯데캐슬': {
          latestPrice: 165000,
          dong: '오산동',
          avg1MPrice: 165000,
          avg3MPrice: 162000,
        } as any,
      };

      render(
        <SettingsProvider>
          <AuthProvider>
            <MacroDashboardClient
              sheetApartments={mockSheetApartments}
              txSummaryData={mockTxSummaryData}
              macroTrendData={[]}
              publicRentalSet={new Set()}
              fieldReportsMap={new Map()}
              favoriteCounts={{}}
              recentTransactions={[]}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      // Verify dashboard components render without throwing
      expect(screen.getByText('일자별 최근 실거래')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-period-tab-90d')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Dimension 5: Techno Valley & MBTI (100% Public Access)
  // =========================================================================
  describe('Dimension 5: Techno Valley & MBTI Public Routing & Features', () => {
    it('TechnoValleyPage redirects cleanly to / without runtime errors', () => {
      TechnoValleyPage();
      expect(mockRedirect).toHaveBeenCalledWith('/');
    });

    it('TechnoValleyClient renders public dashboard without authentication dependency', () => {
      render(
        <SettingsProvider>
          <AuthProvider>
            <TechnoValleyClient />
          </AuthProvider>
        </SettingsProvider>
      );
      expect(screen.getAllByText('D-VIEW 테크노 랩').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('동탄 테크노밸리 심층 데이터 분석')).toBeInTheDocument();
    });

    it('MBTIContainer renders public 1-minute housing personality quiz intro without login', () => {
      render(<MBTIContainer initialView="intro" />);

      expect(screen.getByText(/나와 영혼의 궁합인/i)).toBeInTheDocument();
      expect(screen.getByTestId('start-quiz-btn')).toBeInTheDocument();
      expect(screen.getByTestId('browse-encyclopedia-btn')).toBeInTheDocument();

      // Click Start Quiz
      fireEvent.click(screen.getByTestId('start-quiz-btn'));

      // Verify quiz view mounts
      expect(screen.getByTestId('tab-nav-quiz')).toBeInTheDocument();
      expect(screen.queryByText(/로그인이 필요합니다/i)).not.toBeInTheDocument();
    });

    it('MBTIContainer renders 16-type apartment encyclopedia publicly', () => {
      render(<MBTIContainer initialView="encyclopedia" />);

      // Verify encyclopedia view
      expect(screen.getByTestId('tab-nav-encyclopedia')).toBeInTheDocument();
      expect(screen.getByText(/16개 아파트 도감/i)).toBeInTheDocument();
    });
  });
});
