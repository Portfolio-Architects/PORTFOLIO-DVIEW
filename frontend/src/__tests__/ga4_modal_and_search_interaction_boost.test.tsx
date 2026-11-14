import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as analytics from '@/lib/utils/analytics';
import {
  trackEvent,
  trackApartmentView,
  trackSearchQuery,
} from '@/lib/utils/analytics';
import { MacroChartSection } from '@/components/macro/components/MacroChartSection';
import MacroDashboardClient from '@/components/MacroDashboardClient';
import { ZoneDonutFullscreenModal } from '@/components/macro/ZoneDonutFullscreenModal';
import { SearchSuggestionDropdown } from '@/components/explore/SearchSuggestionDropdown';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <svg data-testid="pie-chart">{children}</svg>
    ),
    Pie: ({ children }: { children: React.ReactNode }) => (
      <g data-testid="pie">{children}</g>
    ),
    Cell: ({ fill }: { fill?: string }) => (
      <path data-testid="pie-cell" fill={fill} />
    ),
    Tooltip: () => <div />,
  };
});

const mockSheetApartments: Record<string, DongApartment[]> = {
  오산동: [
    { name: '동탄역 롯데캐슬', dong: '오산동', txKey: '동탄역롯데캐슬', householdCount: 940 } as DongApartment,
    { name: '동탄역 린스트라우스', dong: '오산동', txKey: '동탄역린스트라우스', householdCount: 617 } as DongApartment,
  ],
  영천동: [
    { name: '힐스테이트 동탄역', dong: '영천동', txKey: '힐스테이트동탄역', householdCount: 443 } as DongApartment,
  ],
};

const mockTxSummaryData: Record<string, AptTxSummary> = {
  동탄역롯데캐슬: {
    dong: '오산동',
    latestPrice: 162000,
    latestPriceEok: 16.2,
    avgPrice: 162000,
    txCount: 14,
  } as unknown as AptTxSummary,
  힐스테이트동탄역: {
    dong: '영천동',
    latestPrice: 98000,
    latestPriceEok: 9.8,
    avgPrice: 98000,
    txCount: 8,
  } as unknown as AptTxSummary,
};

const mockRecentTransactions = [
  {
    aptName: '동탄역 롯데캐슬',
    txKey: '동탄역롯데캐슬',
    dong: '오산동',
    date: '10.29',
    contractDate: '20261029',
    priceVal: 16.2,
    priceEok: '16억 2,000만',
    area: 84.9,
    areaPyeong: 34.2,
    floor: 32,
    dealType: '매매',
    isNewHigh: true,
    delta: 0.6,
    deltaPercent: 3.8,
  },
];

const mockMacroTrendData: DongtanMacroTrendPoint[] = [
  { name: '26.10', price: 82000, rent: 46000, volume: 180 },
];

describe('GA4 Apartment Modal & Search Interaction Telemetry Boost Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_GA_ID: 'G-Y17BHJ77W6',
    };
    window.dataLayer = [];
    delete window.gtag;
    localStorage.clear();
    document.cookie = 'dview_is_admin=; Max-Age=0; path=/';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. trackApartmentView & trackSearchQuery Core Helpers & Edge Cases', () => {
    it('dispatches standardized apartment_view and search_query events to window.dataLayer', () => {
      const aptOk = trackApartmentView({
        apartment_name: '  동탄역 롯데캐슬  ',
        dong: '오산동',
        surface: 'dashboard_modal',
        view_type: 'modal',
      });
      expect(aptOk).toBe(true);

      const searchOk = trackSearchQuery({
        search_term: '  롯데캐슬 84  ',
        surface: 'dashboard_chart',
        results_count: 3,
      });
      expect(searchOk).toBe(true);

      const entries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>).map((e) =>
        Array.from(e)
      );
      expect(entries).toEqual([
        [
          'event',
          'apartment_view',
          {
            apartment_name: '동탄역 롯데캐슬',
            apt_name: '동탄역 롯데캐슬',
            dong: '오산동',
            surface: 'dashboard_modal',
            view_type: 'modal',
          },
        ],
        [
          'event',
          'search_query',
          {
            search_term: '롯데캐슬 84',
            query: '롯데캐슬 84',
            surface: 'dashboard_chart',
            results_count: 3,
          },
        ],
      ]);
    });

    it('rejects empty/whitespace-only inputs and truncates overly long search_term values to 100 chars', () => {
      expect(trackApartmentView({ apartment_name: '   ', surface: 'dashboard' })).toBe(false);
      expect(trackSearchQuery({ search_term: '   ', surface: 'dashboard_chart' })).toBe(false);
      expect(window.dataLayer).toHaveLength(0);

      const longQuery = '동'.repeat(140);
      expect(trackSearchQuery({ search_term: longQuery, surface: 'dashboard_chart' })).toBe(true);

      const entries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>).map((e) =>
        Array.from(e)
      );
      expect(entries).toHaveLength(1);
      const payload = entries[0][2] as Record<string, unknown>;
      expect((payload.search_term as string).length).toBe(100);
      expect((payload.query as string).length).toBe(100);
    });
  });

  describe('2. MacroChartSection Combobox Search & Selection Telemetry', () => {
    it('captures both search_query and apartment_view when user types and immediately selects an apartment before 1000ms debounce expires', () => {
      const trackSpy = jest.spyOn(analytics, 'trackEvent');
      jest.useFakeTimers();
      try {
        render(
          <MacroChartSection
            isDefaultAptSettingUp={false}
            mounted={true}
            selectedTimelineApt="동탄역 롯데캐슬"
            setSelectedTimelineApt={jest.fn()}
            preloadApartmentModal={jest.fn()}
            defaultTimelineApts={['동탄역 롯데캐슬']}
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            onSelectApt={jest.fn()}
            timeframe="1Y"
            setTimeframe={jest.fn()}
            isAptTxLoading={false}
            aptRealTxData={[]}
            mainLineData={[]}
            mainXTicks={[]}
            mainYTicks={[]}
            renderChart={() => <div data-testid="mock-chart" />}
          />
        );

        const searchInput = screen.getByLabelText('단지명 실시간 검색');
        // User types "힐스테이트" and clicks the matching option after only 150ms (< 1000ms debounce)
        fireEvent.change(searchInput, { target: { value: '힐스테이트' } });
        act(() => {
          jest.advanceTimersByTime(150);
        });

        const option = screen.getByRole('option', { name: /힐스테이트 동탄역/i });
        fireEvent.click(option);

        expect(trackSpy).toHaveBeenCalledWith(
          'search_query',
          expect.objectContaining({
            search_term: '힐스테이트',
            query: '힐스테이트',
            selected_apt: '힐스테이트 동탄역',
            surface: 'dashboard_chart',
            trigger: 'combobox_select',
          })
        );
        expect(trackSpy).toHaveBeenCalledWith(
          'apartment_view',
          expect.objectContaining({
            apartment_name: '힐스테이트 동탄역',
            apt_name: '힐스테이트 동탄역',
            dong: '영천동',
            surface: 'dashboard_chart',
            trigger: 'search_select',
            view_type: 'chart_preview',
          })
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('tracks search_query with results_count=0 when pressing Enter on a zero-match query', () => {
      const trackSpy = jest.spyOn(analytics, 'trackEvent');
      render(
        <MacroChartSection
          isDefaultAptSettingUp={false}
          mounted={true}
          selectedTimelineApt="동탄역 롯데캐슬"
          setSelectedTimelineApt={jest.fn()}
          preloadApartmentModal={jest.fn()}
          defaultTimelineApts={['동탄역 롯데캐슬']}
          sheetApartments={mockSheetApartments}
          txSummaryData={mockTxSummaryData}
          onSelectApt={jest.fn()}
          timeframe="1Y"
          setTimeframe={jest.fn()}
          isAptTxLoading={false}
          aptRealTxData={[]}
          mainLineData={[]}
          mainXTicks={[]}
          mainYTicks={[]}
          renderChart={() => <div data-testid="mock-chart" />}
        />
      );

      const searchInput = screen.getByLabelText('단지명 실시간 검색');
      fireEvent.change(searchInput, { target: { value: '존재하지않는단지명XYZ' } });
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      expect(trackSpy).toHaveBeenCalledWith('search_query', {
        search_term: '존재하지않는단지명XYZ',
        query: '존재하지않는단지명XYZ',
        surface: 'dashboard_chart',
        trigger: 'enter_no_match',
        results_count: 0,
      });
    });
  });

  describe('3. Main Dashboard (/) Timeline Click, Mobile Drawer & Detail Navigation Telemetry', () => {
    it('emits apartment_view on timeline item click (desktop chart preview & mobile drawer) and detail navigation', () => {
      const trackSpy = jest.spyOn(analytics, 'trackEvent');
      const onNavigateApartmentPage = jest.fn();

      // Desktop viewport (1280px)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      });

      render(
        <SettingsProvider>
          <AuthProvider>
            <MacroDashboardClient
              sheetApartments={mockSheetApartments}
              txSummaryData={mockTxSummaryData}
              macroTrendData={mockMacroTrendData}
              publicRentalSet={new Set()}
              fieldReportsMap={new Map()}
              favoriteCounts={{}}
              recentTransactions={mockRecentTransactions as any}
              onNavigateApartmentPage={onNavigateApartmentPage}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      // Click timeline card preview button -> invokes handleCardClick on desktop
      const previewBtn = screen.getByRole('button', {
        name: /실거래 분석 아파트 선택: 동탄역 롯데캐슬/,
      });
      fireEvent.click(previewBtn);

      expect(trackSpy).toHaveBeenCalledWith(
        'apartment_view',
        expect.objectContaining({
          apartment_name: '동탄역 롯데캐슬',
          apt_name: '동탄역 롯데캐슬',
          dong: '오산동',
          surface: 'dashboard_timeline_preview',
          view_type: 'chart_preview',
        })
      );

      // Click chart header detail CTA -> invokes handleNavigateDetailPage
      const detailCta = screen.getByTestId('chart-header-detail-cta');
      fireEvent.click(detailCta);

      expect(trackSpy).toHaveBeenCalledWith(
        'apartment_view',
        expect.objectContaining({
          apartment_name: '동탄역 롯데캐슬',
          apt_name: '동탄역 롯데캐슬',
          surface: 'chart_header',
          view_type: 'detail_page',
        })
      );

      // Mobile viewport (375px) -> clicking timeline card opens mobile drawer and tracks mobile_drawer view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      fireEvent.click(previewBtn);

      expect(trackSpy).toHaveBeenCalledWith(
        'apartment_view',
        expect.objectContaining({
          apartment_name: '동탄역 롯데캐슬',
          apt_name: '동탄역 롯데캐슬',
          surface: 'dashboard_mobile_drawer',
          view_type: 'mobile_drawer',
        })
      );
    });
  });

  describe('4. ZoneDonutFullscreenModal & SearchSuggestionDropdown Telemetry', () => {
    it('tracks debounced search_query and apartment_view on transaction row click inside ZoneDonutFullscreenModal', () => {
      const trackSpy = jest.spyOn(analytics, 'trackEvent');
      jest.useFakeTimers();
      try {
        render(
          <ZoneDonutFullscreenModal
            isOpen={true}
            onClose={jest.fn()}
            zoneSlices={[
              {
                name: '동탄역권',
                subName: '오산동·여울동',
                category: 'station',
                value: 100,
                count: 1,
                color: '#2563eb',
                items: mockRecentTransactions as any,
              },
            ]}
            totalCount={1}
            period="90d"
            onPeriodChange={jest.fn()}
            onSelectApt={jest.fn()}
          />
        );

        const searchInput = screen.getByTestId('fullscreen-search-input');
        fireEvent.change(searchInput, { target: { value: '롯데캐슬' } });

        act(() => {
          jest.advanceTimersByTime(1050);
        });

        expect(trackSpy).toHaveBeenCalledWith('search_query', {
          search_term: '롯데캐슬',
          query: '롯데캐슬',
          surface: 'donut_fullscreen_modal',
          zone: 'all',
        });

        const txRow = screen.getByTestId('fullscreen-tx-row-동탄역 롯데캐슬');
        fireEvent.click(txRow);

        expect(trackSpy).toHaveBeenCalledWith('apartment_view', {
          apartment_name: '동탄역 롯데캐슬',
          apt_name: '동탄역 롯데캐슬',
          dong: '오산동',
          zone: 'station',
          surface: 'donut_fullscreen_modal',
          view_type: 'modal_tx_click',
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('tracks search_query and apartment_view in SearchSuggestionDropdown for recommended keywords and apartment shortcuts', () => {
      const trackSpy = jest.spyOn(analytics, 'trackEvent');
      const handleSelectApt = jest.fn();

      const { rerender } = render(
        <SearchSuggestionDropdown
          searchQuery=""
          setSearchQuery={jest.fn()}
          setIsSearchFocused={jest.fn()}
          recommendedKeywords={['동탄역 롯데캐슬']}
          setCurrentCategory={jest.fn()}
          suggestionsApts={[]}
          suggestionsDongs={[]}
          suggestionsBrands={[]}
          handleSelectApt={handleSelectApt}
        />
      );

      fireEvent.click(screen.getByText('동탄역 롯데캐슬'));
      expect(trackSpy).toHaveBeenCalledWith('search_query', {
        search_term: '동탄역 롯데캐슬',
        query: '동탄역 롯데캐슬',
        surface: 'search_suggestion_dropdown',
        trigger: 'recommended_keyword',
      });

      rerender(
        <SearchSuggestionDropdown
          searchQuery="롯데"
          setSearchQuery={jest.fn()}
          setIsSearchFocused={jest.fn()}
          recommendedKeywords={[]}
          setCurrentCategory={jest.fn()}
          suggestionsApts={[
            {
              apt: { name: '동탄역 롯데캐슬', dong: '오산동' } as DongApartment,
              formattedHousehold: '940세대',
              formattedYearBuilt: '2021년',
              totalPrice: 162000,
              formattedPrice: '16.2억',
            } as any,
          ]}
          suggestionsDongs={[]}
          suggestionsBrands={[]}
          handleSelectApt={handleSelectApt}
        />
      );

      const aptOption = screen.getByRole('option', { name: /동탄역/ });
      fireEvent.click(aptOption);

      expect(trackSpy).toHaveBeenCalledWith('search_query', {
        search_term: '롯데',
        query: '롯데',
        selected_apt: '동탄역 롯데캐슬',
        surface: 'search_suggestion_dropdown',
        trigger: 'search_shortcut',
      });
      expect(trackSpy).toHaveBeenCalledWith('apartment_view', {
        apartment_name: '동탄역 롯데캐슬',
        apt_name: '동탄역 롯데캐슬',
        dong: '오산동',
        surface: 'search_suggestion_dropdown',
        trigger: 'search_shortcut',
        view_type: 'shortcut',
      });
    });
  });

  describe('5. ApartmentModal & MacroTimelineView Favorite Search Telemetry', () => {
    it('tracks apartment_view once per apartment on ApartmentModal mount and apartment_modal_chapter_view on chapter selection', async () => {
      const ApartmentModal = (await import('@/components/apartment/ApartmentModal')).default;
      const trackSpy = jest.spyOn(analytics, 'trackEvent');

      const mockReport = {
        id: 'rep-lotte-1',
        apartmentName: '동탄역 롯데캐슬',
        dong: '오산동',
        author: 'DVIEW',
        likes: 12,
        commentCount: 3,
        createdAt: null,
        metrics: {
          brand: '롯데캐슬',
          householdCount: 940,
          yearBuilt: 2021,
          parkingPerHousehold: 1.48,
        },
      };

      const { rerender } = render(
        <SettingsProvider>
          <AuthProvider>
            <ApartmentModal
              report={mockReport as any}
              onClose={jest.fn()}
              user={null}
              typeMap={{}}
              inline={false}
              sheetApartments={mockSheetApartments}
              txSummaryData={mockTxSummaryData}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      const aptViewCalls = trackSpy.mock.calls.filter((c) => c[0] === 'apartment_view');
      expect(aptViewCalls).toHaveLength(1);
      expect(aptViewCalls[0][1]).toMatchObject({
        apartment_name: '동탄역 롯데캐슬',
        apt_name: '동탄역 롯데캐슬',
        dong: '오산동',
        surface: 'apartment_modal',
        view_type: 'modal',
      });

      // Re-rendering with the same apartment must NOT duplicate apartment_view
      rerender(
        <SettingsProvider>
          <AuthProvider>
            <ApartmentModal
              report={{ ...mockReport, likes: 15 } as any}
              onClose={jest.fn()}
              user={null}
              typeMap={{}}
              inline={false}
              sheetApartments={mockSheetApartments}
              txSummaryData={mockTxSummaryData}
            />
          </AuthProvider>
        </SettingsProvider>
      );
      expect(trackSpy.mock.calls.filter((c) => c[0] === 'apartment_view')).toHaveLength(1);
    });

    it('tracks search_query when user searches and adds a favorite in MacroTimelineView', async () => {
      const { MacroTimelineView } = await import('@/components/macro/components/MacroTimelineView');
      const trackSpy = jest.spyOn(analytics, 'trackEvent');

      render(
        <MacroTimelineView
          displayedTimelineData={[]}
          fullTimelineData={[]}
          sheetApartments={mockSheetApartments}
        />
      );

      // Switch to favorites segment to reveal favorites-quick-add-input
      fireEvent.click(screen.getByTestId('timeline-segment-favorites'));
      const favSearchInput = screen.getByTestId('favorites-quick-add-input');
      fireEvent.change(favSearchInput, { target: { value: '힐스테이트' } });

      const addMatchBtn = screen.getByTestId('favorites-quick-add-btn-힐스테이트 동탄역');
      fireEvent.click(addMatchBtn);

      expect(trackSpy).toHaveBeenCalledWith('search_query', {
        search_term: '힐스테이트',
        query: '힐스테이트',
        selected_apt: '힐스테이트 동탄역',
        surface: 'timeline_favorites_add',
        trigger: 'favorites_empty_search',
      });
    });
  });

  describe('6. Multi-Surface Cascade Deduplication, Korean IME Guards & GA4 Custom Dimensions', () => {
    it('deduplicates parent-child apartment_view cascades (SearchSuggestionDropdown -> ExploreClient -> ApartmentModal) and resets on modal close', async () => {
      const ApartmentModal = (await import('@/components/apartment/ApartmentModal')).default;
      const { syncShallowModalCloseToDashboard } = await import('@/lib/ads/recirculationEngine');
      const trackSpy = jest.spyOn(analytics, 'trackEvent');

      const mockReport = {
        id: 'rep-lotte-1',
        apartmentName: '동탄역 롯데캐슬',
        dong: '오산동',
        author: 'DVIEW',
        likes: 12,
        commentCount: 3,
        createdAt: null,
        metrics: {
          brand: '롯데캐슬',
          householdCount: 940,
          yearBuilt: 2021,
          parkingPerHousehold: 1.48,
        },
      };

      // Simulate SearchSuggestionDropdown -> ExploreClient.handleAptClick -> ApartmentModal mount within 1 click
      render(
        <SearchSuggestionDropdown
          searchQuery="롯데"
          setSearchQuery={jest.fn()}
          setIsSearchFocused={jest.fn()}
          recommendedKeywords={[]}
          setCurrentCategory={jest.fn()}
          suggestionsApts={[
            {
              apt: { name: '동탄역 롯데캐슬', dong: '오산동' } as DongApartment,
              formattedHousehold: '940세대',
              formattedYearBuilt: '2021년',
              totalPrice: 162000,
              formattedPrice: '16.2억',
            } as any,
          ]}
          suggestionsDongs={[]}
          suggestionsBrands={['롯데캐슬']}
          handleSelectApt={(aptName) => {
            // Downstream ExploreClient.handleAptClick
            trackApartmentView({
              apartment_name: aptName,
              apt_name: aptName,
              dong: '오산동',
              surface: 'explore_catalog',
              view_type: 'modal',
            });
          }}
        />
      );

      // Click brand suggestion first -> must emit search_query with trigger='brand_suggestion'
      fireEvent.click(screen.getByRole('option', { name: '롯데캐슬' }));
      expect(trackSpy).toHaveBeenCalledWith('search_query', {
        search_term: '롯데캐슬',
        query: '롯데캐슬',
        surface: 'search_suggestion_dropdown',
        trigger: 'brand_suggestion',
      });

      // Click apartment shortcut -> fires SearchSuggestionDropdown -> ExploreClient -> ApartmentModal mount
      fireEvent.click(screen.getByRole('option', { name: /동탄역/ }));
      const { unmount } = render(
        <SettingsProvider>
          <AuthProvider>
            <ApartmentModal
              report={mockReport as any}
              onClose={jest.fn()}
              user={null}
              typeMap={{}}
              inline={false}
              sheetApartments={mockSheetApartments}
              txSummaryData={mockTxSummaryData}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      const aptViewCalls = trackSpy.mock.calls.filter((c) => c[0] === 'apartment_view');
      expect(aptViewCalls).toHaveLength(1);
      expect(aptViewCalls[0][1]).toMatchObject({
        apartment_name: '동탄역 롯데캐슬',
        surface: 'search_suggestion_dropdown',
        trigger: 'search_shortcut',
        view_type: 'shortcut',
      });

      // Close modal and immediately re-open the same apartment -> must NOT be suppressed
      unmount();
      syncShallowModalCloseToDashboard('/explore');

      trackApartmentView({
        apartment_name: '동탄역 롯데캐슬',
        dong: '오산동',
        surface: 'explore_catalog',
        view_type: 'modal',
      });
      expect(trackSpy.mock.calls.filter((c) => c[0] === 'apartment_view')).toHaveLength(2);
    });

    it('deduplicates ZoneDonutFullscreenModal row click -> MacroDashboardClient donut_fullscreen cascade and SearchSuggestionDropdown -> explore_catalog search_query cascade', () => {
      const trackSpy = jest.spyOn(analytics, 'trackEvent');

      render(
        <ZoneDonutFullscreenModal
          isOpen={true}
          onClose={jest.fn()}
          zoneSlices={[
            {
              name: '동탄역권',
              subName: '오산동·여울동',
              category: 'station',
              value: 100,
              count: 1,
              color: '#2563eb',
              items: mockRecentTransactions as any,
            },
          ]}
          totalCount={1}
          period="90d"
          onPeriodChange={jest.fn()}
          onSelectApt={(aptName, dong) => {
            // Simulates MacroDashboardClient handleNavigateDetailPage(aptName, dong, 'donut_fullscreen')
            trackApartmentView({
              apartment_name: aptName,
              apt_name: aptName,
              dong,
              surface: 'donut_fullscreen',
              view_type: 'detail_page',
            });
          }}
        />
      );

      fireEvent.click(screen.getByTestId('fullscreen-tx-row-동탄역 롯데캐슬'));
      const aptViewCalls = trackSpy.mock.calls.filter((c) => c[0] === 'apartment_view');
      expect(aptViewCalls).toHaveLength(1);
      expect(aptViewCalls[0][1]).toMatchObject({
        apartment_name: '동탄역 롯데캐슬',
        surface: 'donut_fullscreen_modal',
        view_type: 'modal_tx_click',
      });

      // Explicit suggestion search_query followed 1,000ms later by passive explore_catalog debounce
      expect(
        trackSearchQuery({
          search_term: '힐스테이트',
          query: '힐스테이트',
          surface: 'search_suggestion_dropdown',
          trigger: 'recommended_keyword',
        })
      ).toBe(true);
      expect(
        trackSearchQuery({
          search_term: '힐스테이트',
          query: '힐스테이트',
          surface: 'explore_catalog',
        })
      ).toBe(false);
      expect(trackSpy.mock.calls.filter((c) => c[0] === 'search_query')).toHaveLength(1);
    });

    it('guards Korean Hangul IME composition on Enter, truncates >100-char queries in components, and allows repeat searches after clearing', async () => {
      const { MacroTimelineView } = await import('@/components/macro/components/MacroTimelineView');
      const trackSpy = jest.spyOn(analytics, 'trackEvent');
      jest.useFakeTimers();
      try {
        render(
          <MacroChartSection
            isDefaultAptSettingUp={false}
            mounted={true}
            selectedTimelineApt="동탄역 롯데캐슬"
            setSelectedTimelineApt={jest.fn()}
            preloadApartmentModal={jest.fn()}
            defaultTimelineApts={['동탄역 롯데캐슬']}
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            onSelectApt={jest.fn()}
            timeframe="1Y"
            setTimeframe={jest.fn()}
            isAptTxLoading={false}
            aptRealTxData={[]}
            mainLineData={[]}
            mainXTicks={[]}
            mainYTicks={[]}
            renderChart={() => <div data-testid="mock-chart" />}
          />
        );

        const searchInput = screen.getByLabelText('단지명 실시간 검색');
        // Start Korean IME composition and press Enter mid-composition
        fireEvent.compositionStart(searchInput);
        fireEvent.change(searchInput, { target: { value: '없는단지명ㄱ' } });
        fireEvent.keyDown(searchInput, { key: 'Enter', keyCode: 229 });

        expect(trackSpy.mock.calls.filter((c) => c[0] === 'search_query')).toHaveLength(0);

        // End composition and press Enter -> now fires enter_no_match
        fireEvent.compositionEnd(searchInput);
        fireEvent.keyDown(searchInput, { key: 'Enter' });
        expect(trackSpy.mock.calls.filter((c) => c[0] === 'search_query')).toHaveLength(1);

        // Overly long query (>100 chars) in component is truncated to 100 chars via trackSearchQuery
        const longComponentQuery = '가'.repeat(135);
        fireEvent.change(searchInput, { target: { value: longComponentQuery } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });
        const longSearchCall = trackSpy.mock.calls
          .filter((c) => c[0] === 'search_query')
          .pop();
        expect(longSearchCall).toBeDefined();
        expect(((longSearchCall![1] as Record<string, unknown>).search_term as string).length).toBe(100);

        // Clear input and repeat the same search later -> must fire search_query again (not dropped by stale ref) and 0 legacy search_apartment
        fireEvent.change(searchInput, { target: { value: '힐스테이트' } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });
        const countAfterFirst = trackSpy.mock.calls.filter(
          (c) =>
            c[0] === 'search_query' &&
            (c[1] as any)?.search_term === '힐스테이트' &&
            (c[1] as any)?.trigger === 'debounce'
        ).length;
        expect(countAfterFirst).toBe(1);

        // Clear input and repeat the same search within 200ms (<1000ms debounce window) -> must fire again
        fireEvent.change(searchInput, { target: { value: '' } });
        act(() => {
          jest.advanceTimersByTime(200);
        });
        fireEvent.change(searchInput, { target: { value: '힐스테이트' } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });
        const countAfterRepeat = trackSpy.mock.calls.filter(
          (c) =>
            c[0] === 'search_query' &&
            (c[1] as any)?.search_term === '힐스테이트' &&
            (c[1] as any)?.trigger === 'debounce'
        ).length;
        expect(countAfterRepeat).toBe(2);
        expect(trackSpy.mock.calls.filter((c) => c[0] === 'search_apartment')).toHaveLength(0);

        // Also verify IME guard in MacroTimelineView favorites-quick-add-input
        render(
          <MacroTimelineView
            displayedTimelineData={[]}
            fullTimelineData={[]}
            sheetApartments={mockSheetApartments}
          />
        );
        fireEvent.click(screen.getByTestId('timeline-segment-favorites'));
        const favInput = screen.getByTestId('favorites-quick-add-input');
        fireEvent.compositionStart(favInput);
        fireEvent.change(favInput, { target: { value: '힐스테이트' } });
        fireEvent.keyDown(favInput, { key: 'Enter', keyCode: 229 });
        expect(
          trackSpy.mock.calls.filter(
            (c) =>
              c[0] === 'search_query' &&
              (c[1] as any)?.surface === 'timeline_favorites_add'
          )
        ).toHaveLength(0);

        fireEvent.compositionEnd(favInput);
        fireEvent.keyDown(favInput, { key: 'Enter' });
        expect(
          trackSpy.mock.calls.filter(
            (c) =>
              c[0] === 'search_query' &&
              (c[1] as any)?.surface === 'timeline_favorites_add'
          )
        ).toHaveLength(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('synchronizes results_count when sheetApartments hydrates mid-debounce and prevents duplicate search_query on parent onSelectApt re-renders', () => {
      const trackSpy = jest.spyOn(analytics, 'trackEvent');
      jest.useFakeTimers();
      try {
        const baseProps = {
          isDefaultAptSettingUp: false,
          mounted: true,
          selectedTimelineApt: '동탄역 롯데캐슬',
          setSelectedTimelineApt: jest.fn(),
          preloadApartmentModal: jest.fn(),
          defaultTimelineApts: ['동탄역 롯데캐슬'],
          txSummaryData: mockTxSummaryData,
          timeframe: '1Y' as const,
          setTimeframe: jest.fn(),
          isAptTxLoading: false,
          aptRealTxData: [],
          mainLineData: [],
          mainXTicks: [],
          mainYTicks: [],
          renderChart: () => <div data-testid="mock-chart" />,
        };

        // Initially mount with only 오산동 (0 matches for "힐스테이트")
        const { rerender } = render(
          <MacroChartSection
            {...baseProps}
            sheetApartments={{ 오산동: mockSheetApartments.오산동 }}
            onSelectApt={() => {}}
          />
        );

        const searchInput = screen.getByLabelText('단지명 실시간 검색');
        fireEvent.change(searchInput, { target: { value: '힐스테이트' } });

        // At 300ms (mid-debounce), sheetApartments hydrates with 영천동 ("힐스테이트 동탄역") and a new inline onSelectApt
        act(() => {
          jest.advanceTimersByTime(300);
        });
        rerender(
          <MacroChartSection
            {...baseProps}
            sheetApartments={mockSheetApartments}
            onSelectApt={() => {}}
          />
        );

        // Complete the 1000ms debounce -> results_count must reflect the newly hydrated match (1)
        act(() => {
          jest.advanceTimersByTime(750);
        });

        const searchQueryCallsAfterDebounce = trackSpy.mock.calls.filter(
          (c) => c[0] === 'search_query' && (c[1] as any)?.surface === 'dashboard_chart'
        );
        expect(searchQueryCallsAfterDebounce).toHaveLength(1);
        expect(searchQueryCallsAfterDebounce[0][1]).toMatchObject({
          search_term: '힐스테이트',
          trigger: 'debounce',
          results_count: 1,
        });

        // Subsequent parent re-render with a new inline onSelectApt while user starts typing another query must NOT re-emit stale search_query
        fireEvent.change(searchInput, { target: { value: '존재하지않는단지' } });
        act(() => {
          jest.advanceTimersByTime(200);
        });
        rerender(
          <MacroChartSection
            {...baseProps}
            sheetApartments={mockSheetApartments}
            onSelectApt={() => {}}
          />
        );
        expect(
          trackSpy.mock.calls.filter(
            (c) => c[0] === 'search_query' && (c[1] as any)?.surface === 'dashboard_chart'
          )
        ).toHaveLength(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('registers DVIEW_GA4_INTERACTION_DIMENSIONS in ga4CustomDimensions when includeInteractionDimensions=true', async () => {
      const {
        DVIEW_GA4_INTERACTION_DIMENSIONS,
        syncGa4CustomDefinitions,
      } = await import('@/lib/services/ga4CustomDimensions');

      expect(DVIEW_GA4_INTERACTION_DIMENSIONS.map((d) => d.parameterName)).toEqual([
        'search_term',
        'surface',
        'view_type',
        'trigger',
        'chapter_id',
        'selected_apt',
        'zone',
        'calculator_type',
        'tab_name',
      ]);

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ customDimensions: [], customMetrics: [] }),
      }) as unknown as typeof fetch;

      const res = await syncGa4CustomDefinitions({
        propertyId: '527874632',
        clientEmail: 'test@dview.iam.gserviceaccount.com',
        privateKey: 'MOCK_KEY',
        dryRun: true,
        includeInteractionDimensions: true,
        fetchFn: mockFetch,
        getAccessTokenFn: async () => 'mock-token',
      });

      expect(res.ok).toBe(true);
      expect(res.status).toBe('DRY_RUN');
      expect(res.plannedDimensions).toEqual(
        expect.arrayContaining([
          'apartment_name',
          'dong',
          'search_term',
          'surface',
          'view_type',
          'trigger',
          'chapter_id',
          'selected_apt',
          'zone',
          'calculator_type',
        ])
      );
    });

    it('unifies all apartment view events under apartment_view across SearchSuggestionDropdown (recent_shortcut & search_shortcut), ExploreClient, and DashboardClient without emitting legacy view_apartment', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const { addRecentApartment } = await import('@/lib/utils/recentApartments');
      const { resetAnalyticsInteractionState } = await import('@/lib/utils/analytics');
      const trackSpy = jest.spyOn(analytics, 'trackEvent');

      // 1) Recent viewed apartment shortcut in SearchSuggestionDropdown (empty query)
      resetAnalyticsInteractionState();
      addRecentApartment({ name: '힐스테이트 동탄역', dong: '영천동' });
      const handleSelectApt = jest.fn();

      const { unmount: unmountDropdown } = render(
        <SearchSuggestionDropdown
          searchQuery=""
          setSearchQuery={jest.fn()}
          setIsSearchFocused={jest.fn()}
          recommendedKeywords={[]}
          setCurrentCategory={jest.fn()}
          suggestionsApts={[]}
          suggestionsDongs={[]}
          suggestionsBrands={[]}
          handleSelectApt={handleSelectApt}
        />
      );

      const recentOption = screen.getByRole('option', { name: /힐스테이트 동탄역/ });
      fireEvent.click(recentOption);

      expect(handleSelectApt).toHaveBeenCalledWith('힐스테이트 동탄역');
      expect(trackSpy).toHaveBeenCalledWith('apartment_view', {
        apartment_name: '힐스테이트 동탄역',
        apt_name: '힐스테이트 동탄역',
        dong: '영천동',
        surface: 'search_suggestion_dropdown',
        trigger: 'recent_shortcut',
        view_type: 'shortcut',
      });
      expect(trackSpy.mock.calls.filter((c) => c[0] === 'view_apartment')).toHaveLength(0);
      unmountDropdown();

      // 2) ExploreClient #apt= hash deep-link & catalog selection emit apartment_view only (0 view_apartment)
      resetAnalyticsInteractionState();
      trackSpy.mockClear();
      window.history.replaceState(
        null,
        '',
        `/explore#apt=${encodeURIComponent('동탄역 롯데캐슬')}`
      );
      const ExploreClient = (await import('@/app/explore/ExploreClient')).default;
      const { unmount: unmountExplore } = render(
        <SettingsProvider>
          <AuthProvider>
            <ExploreClient
              initialDashboardData={{
                kpis: [],
                newsFeed: [],
                fieldReports: [],
                userReviews: [],
                dongtanApartments: ['동탄역 롯데캐슬'],
                txSummary: mockTxSummaryData,
                nameMapping: {},
              }}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      const exploreAptViews = trackSpy.mock.calls.filter((c) => c[0] === 'apartment_view');
      expect(exploreAptViews.length).toBeGreaterThanOrEqual(1);
      expect(exploreAptViews[0][1]).toMatchObject({
        apartment_name: '동탄역 롯데캐슬',
        apt_name: '동탄역 롯데캐슬',
        canonical_slug: '동탄역롯데캐슬',
        dong: '여울동',
        surface: 'explore_hash_modal',
        view_type: 'modal',
      });
      expect(trackSpy.mock.calls.filter((c) => c[0] === 'view_apartment')).toHaveLength(0);
      unmountExplore();

      // 3) Main Dashboard 4-hop cascade (donut_fullscreen_modal -> donut_fullscreen -> dashboard -> delayed >500ms apartment_modal)
      // and 3-hop detail cascade (timeline_detail -> dashboard -> delayed >500ms apartment_modal) emit exactly 1 apartment_view each
      resetAnalyticsInteractionState();
      trackSpy.mockClear();
      const baseTime = Date.now();
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(baseTime);
      try {
        expect(
          trackApartmentView({
            apartment_name: '동탄역 롯데캐슬',
            dong: '오산동',
            zone: 'station',
            surface: 'donut_fullscreen_modal',
            view_type: 'modal_tx_click',
          })
        ).toBe(true);
        // Hop 2: MacroDashboardClient handleNavigateDetailPage('donut_fullscreen')
        expect(
          trackApartmentView({
            apartment_name: '동탄역 롯데캐슬',
            dong: '오산동',
            surface: 'donut_fullscreen',
            view_type: 'detail_page',
          })
        ).toBe(false);
        // Hop 3: DashboardClient.handleAptClick ('dashboard', 'modal')
        expect(
          trackApartmentView({
            apartment_name: '동탄역 롯데캐슬',
            canonical_slug: '동탄역롯데캐슬',
            dong: '오산동',
            surface: 'dashboard',
            view_type: 'modal',
          })
        ).toBe(false);
        // Hop 4: Dynamic chunk for ApartmentModal resolves 2,000ms later (>500ms slow 3G)
        nowSpy.mockReturnValue(baseTime + 2000);
        expect(
          trackApartmentView({
            apartment_name: '동탄역롯데캐슬',
            canonical_slug: '동탄역롯데캐슬',
            dong: '오산동',
            surface: 'apartment_modal',
            view_type: 'modal',
          })
        ).toBe(false);
        expect(trackSpy.mock.calls.filter((c) => c[0] === 'apartment_view')).toHaveLength(1);

        // Timeline detail click -> DashboardClient.handleAptClick -> 1,800ms delayed ApartmentModal mount
        resetAnalyticsInteractionState();
        trackSpy.mockClear();
        nowSpy.mockReturnValue(baseTime + 5000);
        expect(
          trackApartmentView({
            apartment_name: '동탄역 푸르지오',
            dong: '영천동',
            surface: 'timeline_detail',
            view_type: 'detail_page',
          })
        ).toBe(true);
        expect(
          trackApartmentView({
            apartment_name: '동탄역 푸르지오',
            canonical_slug: '동탄역푸르지오',
            dong: '영천동',
            surface: 'dashboard',
            view_type: 'modal',
          })
        ).toBe(false);
        nowSpy.mockReturnValue(baseTime + 6800);
        expect(
          trackApartmentView({
            apartment_name: '동탄역푸르지오',
            canonical_slug: '동탄역푸르지오',
            dong: '영천동',
            surface: 'apartment_modal',
            view_type: 'modal',
          })
        ).toBe(false);
        expect(trackSpy.mock.calls.filter((c) => c[0] === 'apartment_view')).toHaveLength(1);
      } finally {
        nowSpy.mockRestore();
      }

      // 4) Source invariant: production components must never call trackEvent('view_apartment', ...)
      const productionFiles = [
        path.resolve(__dirname, '../components/explore/SearchSuggestionDropdown.tsx'),
        path.resolve(__dirname, '../app/explore/ExploreClient.tsx'),
        path.resolve(__dirname, '../components/DashboardClient.tsx'),
        path.resolve(__dirname, '../app/zone/[id]/ZoneDetailClient.tsx'),
      ];
      for (const filePath of productionFiles) {
        const src = fs.readFileSync(filePath, 'utf8');
        expect(src).not.toMatch(/trackEvent\(\s*['"]view_apartment['"]/);
      }
    });

    it('eliminates gtag reserved source parameter collision on watchlist_toggle_favorite across all UI surfaces and unifies search_apartment -> search_query in TossApartmentExploreClient and MacroDashboardClient', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const { ApartmentModalHeader } = await import(
        '@/components/apartment/ApartmentModalHeader'
      );
      const { AptRow } = await import('@/components/explore/AptRow');
      const { PersonalWatchlistBar } = await import(
        '@/components/macro/components/PersonalWatchlistBar'
      );
      const { MacroTimelineView } = await import(
        '@/components/macro/components/MacroTimelineView'
      );
      const TossApartmentExploreClient = (
        await import('@/components/TossApartmentExploreClient')
      ).default;
      const { resetAnalyticsInteractionState } = await import('@/lib/utils/analytics');

      // 1) Verify watchlist_toggle_favorite in window.dataLayer NEVER contains reserved `source` key across all surfaces
      window.dataLayer = [];
      const toggleFavMock = jest.fn();

      const { unmount: unmountHeader } = render(
        <ApartmentModalHeader
          report={{ apartmentName: '동탄역 롯데캐슬', dong: '오산동', sections: {} } as any}
          displayAptName="동탄역 롯데캐슬"
          isFavorite={false}
          onToggleFavorite={toggleFavMock}
          handleNativeShare={jest.fn()}
          handleCopySummary={jest.fn()}
          handleDownloadShareCard={jest.fn()}
          setIsPushModalOpen={jest.fn()}
          copiedStatus={null}
          isToolDropdownOpen={false}
          setIsToolDropdownOpen={jest.fn()}
          toolDropdownRef={{ current: null }}
          preloadCalculators={jest.fn()}
        />
      );
      fireEvent.click(screen.getByTestId('apt-detail-favorite-btn'));
      unmountHeader();

      const { unmount: unmountAptRow } = render(
        <AptRow
          item={{
            apt: { name: '힐스테이트 동탄역', dong: '영천동', householdCount: 400 } as any,
            txSummary: null,
            pyeongPrice: 3200,
            totalPrice: 112000,
            jeonsePrice: 62000,
            jeonseRatio: 55.3,
            volume3M: 12,
            turnoverRate: 3.0,
            viewCount: 50,
          } as any}
          index={0}
          currentCategory="rank-price"
          isFavorite={false}
          onToggleFavorite={toggleFavMock}
          onSelectApt={jest.fn()}
          areaUnit="p"
        />
      );
      fireEvent.click(screen.getByTestId('explore-fav-toggle-힐스테이트 동탄역'));
      unmountAptRow();

      localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역 롯데캐슬']));
      const { unmount: unmountWatchlist } = render(
        <PersonalWatchlistBar
          recentTransactions={[]}
          txSummaryData={mockTxSummaryData}
          sheetApartments={mockSheetApartments}
        />
      );
      fireEvent.click(screen.getByTestId('watchlist-fav-toggle-동탄역 롯데캐슬'));
      unmountWatchlist();

      const { unmount: unmountTimeline } = render(
        <MacroTimelineView
          displayedTimelineData={[
            {
              date: '10.25',
              items: [
                {
                  aptName: '동탄역 롯데캐슬',
                  displayAptName: '동탄역 롯데캐슬',
                  price: '16.5억',
                  priceWon: 165000,
                  area: '84㎡',
                  floor: 20,
                  dealType: '매매',
                  date: '10.25',
                } as any,
              ],
            },
          ]}
          onToggleFavorite={toggleFavMock}
        />
      );
      fireEvent.click(screen.getByTestId('timeline-fav-toggle-동탄역 롯데캐슬'));
      unmountTimeline();

      const dlFavEntries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>)
        .map((e) => Array.from(e))
        .filter((e) => e[0] === 'event' && e[1] === 'watchlist_toggle_favorite');

      expect(dlFavEntries).toHaveLength(4);
      for (const entry of dlFavEntries) {
        const payload = entry[2] as Record<string, unknown>;
        expect('source' in payload).toBe(false);
        expect(typeof payload.surface).toBe('string');
        expect((payload.surface as string).length).toBeGreaterThan(0);
      }
      expect(dlFavEntries[0][2]).toEqual({
        apt_name: '동탄역 롯데캐슬',
        is_favorite: true,
        surface: 'apartment_detail',
      });
      expect(dlFavEntries[1][2]).toEqual({
        apt_name: '힐스테이트 동탄역',
        is_favorite: true,
        surface: 'explore_list',
      });
      expect(dlFavEntries[2][2]).toMatchObject({
        apt_name: '동탄역 롯데캐슬',
        is_favorite: false,
        surface: 'zone1_bar',
        trigger: 'watchlist',
      });
      expect(dlFavEntries[3][2]).toEqual({
        apt_name: '동탄역 롯데캐슬',
        is_favorite: true,
        surface: 'timeline',
      });

      // 2) TossApartmentExploreClient debounced search emits unified search_query (0 search_apartment) and supports clear + quick retype
      jest.useFakeTimers();
      try {
        resetAnalyticsInteractionState();
        window.dataLayer = [];

        const { unmount: unmountExploreClient } = render(
          <SettingsProvider>
            <AuthProvider>
              <TossApartmentExploreClient
                sheetApartments={mockSheetApartments}
                txSummaryData={mockTxSummaryData}
                nameMapping={{}}
                fieldReportsMap={new Map()}
                publicRentalSet={new Set()}
                typeMap={{}}
                handleSelectApt={jest.fn()}
              />
            </AuthProvider>
          </SettingsProvider>
        );

        const exploreInput = screen.getByRole('combobox', { name: '단지명 검색' });
        fireEvent.change(exploreInput, { target: { value: '힐스테이트' } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });

        // Clear and retype within 200ms (<1000ms debounce) -> must emit second search_query
        fireEvent.change(exploreInput, { target: { value: '' } });
        act(() => {
          jest.advanceTimersByTime(200);
        });
        fireEvent.change(exploreInput, { target: { value: '힐스테이트' } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });

        const exploreEntries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>).map(
          (e) => Array.from(e)
        );
        expect(exploreEntries.filter((e) => e[1] === 'search_apartment')).toHaveLength(0);
        const exploreSearchQueries = exploreEntries.filter((e) => e[1] === 'search_query');
        expect(exploreSearchQueries).toHaveLength(2);
        expect(exploreSearchQueries[0][2]).toMatchObject({
          search_term: '힐스테이트',
          query: '힐스테이트',
          surface: 'explore_catalog',
          trigger: 'debounce',
        });
        unmountExploreClient();

        // 2b) MacroDashboardClient timeline search emits unified search_query (0 search_apartment) and supports clear + quick retype
        resetAnalyticsInteractionState();
        window.dataLayer = [];

        const { unmount: unmountDashboard } = render(
          <SettingsProvider>
            <AuthProvider>
              <MacroDashboardClient
                sheetApartments={mockSheetApartments}
                txSummaryData={mockTxSummaryData}
                macroTrendData={mockMacroTrendData}
                publicRentalSet={new Set()}
                fieldReportsMap={new Map()}
                favoriteCounts={{}}
                recentTransactions={mockRecentTransactions as any}
              />
            </AuthProvider>
          </SettingsProvider>
        );

        const timelineSearchInput = screen.getByPlaceholderText('단지명 검색...');
        fireEvent.change(timelineSearchInput, { target: { value: '롯데캐슬' } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });

        fireEvent.change(timelineSearchInput, { target: { value: '' } });
        act(() => {
          jest.advanceTimersByTime(200);
        });
        fireEvent.change(timelineSearchInput, { target: { value: '롯데캐슬' } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });

        const dashEntries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>).map(
          (e) => Array.from(e)
        );
        expect(dashEntries.filter((e) => e[1] === 'search_apartment')).toHaveLength(0);
        const dashSearchQueries = dashEntries.filter(
          (e) =>
            e[1] === 'search_query' &&
            (e[2] as Record<string, unknown>)?.surface === 'dashboard_timeline'
        );
        expect(dashSearchQueries).toHaveLength(2);
        expect(dashSearchQueries[0][2]).toEqual({
          search_term: '롯데캐슬',
          query: '롯데캐슬',
          surface: 'dashboard_timeline',
          trigger: 'debounce',
        });
        unmountDashboard();
      } finally {
        jest.useRealTimers();
      }

      // 3) Source invariant: zero legacy search_apartment calls in production components & ApartmentModalHeader uses surface
      const searchTargets = [
        path.resolve(__dirname, '../components/macro/components/MacroChartSection.tsx'),
        path.resolve(__dirname, '../components/MacroDashboardClient.tsx'),
        path.resolve(__dirname, '../components/TossApartmentExploreClient.tsx'),
      ];
      for (const filePath of searchTargets) {
        const src = fs.readFileSync(filePath, 'utf8');
        expect(src).not.toMatch(/trackEvent\(\s*['"]search_apartment['"]/);
      }
      const modalHeaderSrc = fs.readFileSync(
        path.resolve(__dirname, '../components/apartment/ApartmentModalHeader.tsx'),
        'utf8'
      );
      expect(modalHeaderSrc).not.toMatch(/\bsource\s*:\s*['"]apartment_detail['"]/);
      expect(modalHeaderSrc).toMatch(/\bsurface\s*:\s*['"]apartment_detail['"]/);
    });

    it('prevents search_query double-firing across enter_no_match, >100-char edits, modal reopen, Hangul IME Enter, and tracks PersonalWatchlistBar search', async () => {
      const { PersonalWatchlistBar } = await import(
        '@/components/macro/components/PersonalWatchlistBar'
      );
      const TossApartmentExploreClient = (
        await import('@/components/TossApartmentExploreClient')
      ).default;
      const { resetAnalyticsInteractionState } = await import('@/lib/utils/analytics');

      const originalNodeEnv = process.env.NODE_ENV;
      const originalGaId = process.env.NEXT_PUBLIC_GA_ID;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_GA_ID = 'G-Y17BHJ77W6';
      jest.useFakeTimers();

      try {
        // 1) MacroChartSection: pressing Enter on zero-match query must NOT double-fire at 1000ms debounce or spam on repeated Enter
        resetAnalyticsInteractionState();
        window.dataLayer = [];
        const { unmount: unmountChart } = render(
          <MacroChartSection
            isDefaultAptSettingUp={false}
            mounted={true}
            selectedTimelineApt="동탄역 롯데캐슬"
            setSelectedTimelineApt={jest.fn()}
            preloadApartmentModal={jest.fn()}
            defaultTimelineApts={['동탄역 롯데캐슬']}
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            onSelectApt={jest.fn()}
            timeframe="1Y"
            setTimeframe={jest.fn()}
            isAptTxLoading={false}
            aptRealTxData={[]}
            mainLineData={[]}
            mainXTicks={[]}
            mainYTicks={[]}
            renderChart={() => <div data-testid="mock-chart" />}
          />
        );
        const chartInput = screen.getByLabelText('단지명 실시간 검색');
        fireEvent.change(chartInput, { target: { value: '존재하지않는단지명XYZ' } });
        fireEvent.keyDown(chartInput, { key: 'Enter' });
        fireEvent.keyDown(chartInput, { key: 'Enter' });
        act(() => {
          jest.advanceTimersByTime(1200);
        });

        const chartQueries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>)
          .map((e) => Array.from(e))
          .filter((e) => e[1] === 'search_query');
        expect(chartQueries).toHaveLength(1);
        expect(chartQueries[0][2]).toMatchObject({
          search_term: '존재하지않는단지명XYZ',
          surface: 'dashboard_chart',
          trigger: 'enter_no_match',
          results_count: 0,
        });
        unmountChart();

        // 2) TossApartmentExploreClient: >100-char incremental typing (101 -> 102 chars) fires once, and Hangul IME Enter (keyCode 229) keeps dropdown open
        resetAnalyticsInteractionState();
        window.dataLayer = [];
        const { unmount: unmountExplore } = render(
          <SettingsProvider>
            <AuthProvider>
              <TossApartmentExploreClient
                sheetApartments={mockSheetApartments}
                txSummaryData={mockTxSummaryData}
                nameMapping={{}}
                fieldReportsMap={new Map()}
                publicRentalSet={new Set()}
                typeMap={{}}
                handleSelectApt={jest.fn()}
              />
            </AuthProvider>
          </SettingsProvider>
        );
        const exploreInput = screen.getByRole('combobox', { name: '단지명 검색' });
        fireEvent.focus(exploreInput);
        expect(exploreInput).toHaveAttribute('aria-expanded', 'true');
        fireEvent.keyDown(exploreInput, { key: 'Enter', keyCode: 229, isComposing: true });
        expect(exploreInput).toHaveAttribute('aria-expanded', 'true');

        const long101 = `${'가'.repeat(100)}A`;
        const long102 = `${'가'.repeat(100)}AB`;
        fireEvent.change(exploreInput, { target: { value: long101 } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });
        fireEvent.change(exploreInput, { target: { value: long102 } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });

        const exploreQueries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>)
          .map((e) => Array.from(e))
          .filter((e) => e[1] === 'search_query');
        expect(exploreQueries).toHaveLength(1);
        expect((exploreQueries[0][2] as Record<string, string>).search_term).toHaveLength(100);
        unmountExplore();

        // 3) ZoneDonutFullscreenModal: closing and re-opening modal with active search query must NOT re-fire duplicate search_query
        resetAnalyticsInteractionState();
        window.dataLayer = [];
        const donutSlices = [
          {
            name: '동탄역권',
            subName: '오산동·여울동',
            category: 'station',
            value: 100,
            count: 1,
            color: '#2563eb',
            items: mockRecentTransactions as any,
          },
        ];
        const { rerender: rerenderDonut, unmount: unmountDonut } = render(
          <ZoneDonutFullscreenModal
            isOpen={true}
            onClose={jest.fn()}
            zoneSlices={donutSlices as any}
            totalCount={1}
            period="90d"
            onPeriodChange={jest.fn()}
          />
        );
        const modalSearch = screen.getByTestId('fullscreen-search-input');
        fireEvent.change(modalSearch, { target: { value: '롯데캐슬' } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });
        rerenderDonut(
          <ZoneDonutFullscreenModal
            isOpen={false}
            onClose={jest.fn()}
            zoneSlices={donutSlices as any}
            totalCount={1}
            period="90d"
            onPeriodChange={jest.fn()}
          />
        );
        rerenderDonut(
          <ZoneDonutFullscreenModal
            isOpen={true}
            onClose={jest.fn()}
            zoneSlices={donutSlices as any}
            totalCount={1}
            period="90d"
            onPeriodChange={jest.fn()}
          />
        );
        act(() => {
          jest.advanceTimersByTime(1050);
        });

        const donutQueries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>)
          .map((e) => Array.from(e))
          .filter((e) => e[1] === 'search_query');
        expect(donutQueries).toHaveLength(1);
        expect(donutQueries[0][2]).toMatchObject({
          search_term: '롯데캐슬',
          surface: 'donut_fullscreen_modal',
        });
        unmountDonut();

        // 4) PersonalWatchlistBar: quick search emits unified search_query on 1000ms debounce and shortcut selection
        resetAnalyticsInteractionState();
        window.dataLayer = [];
        const { unmount: unmountWatchlist } = render(
          <PersonalWatchlistBar
            recentTransactions={[]}
            txSummaryData={mockTxSummaryData}
            sheetApartments={mockSheetApartments}
            onSelectApt={jest.fn()}
          />
        );
        const watchlistInput = screen.getByPlaceholderText('단지명 빠른 검색...');
        fireEvent.change(watchlistInput, { target: { value: '힐스테이트' } });
        act(() => {
          jest.advanceTimersByTime(1050);
        });
        const shortcutOption = screen.getByRole('button', { name: /힐스테이트 동탄역/ });
        fireEvent.click(shortcutOption);

        const watchlistQueries = (window.dataLayer as unknown as Array<ArrayLike<unknown>>)
          .map((e) => Array.from(e))
          .filter((e) => e[1] === 'search_query');
        expect(watchlistQueries).toHaveLength(2);
        expect(watchlistQueries[0][2]).toMatchObject({
          search_term: '힐스테이트',
          surface: 'zone1_watchlist_search',
          trigger: 'debounce',
          results_count: 1,
        });
        expect(watchlistQueries[1][2]).toMatchObject({
          search_term: '힐스테이트',
          selected_apt: '힐스테이트 동탄역',
          surface: 'zone1_watchlist_search',
          trigger: 'search_shortcut',
        });
        unmountWatchlist();
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
        process.env.NEXT_PUBLIC_GA_ID = originalGaId;
        jest.useRealTimers();
      }
    });
  });
});
