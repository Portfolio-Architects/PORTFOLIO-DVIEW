import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as analytics from '@/lib/utils/analytics';
import { PersonalWatchlistBar } from '@/components/macro/components/PersonalWatchlistBar';
import { RealtimeRankingBoard } from '@/components/ranking/RealtimeRankingBoard';
import { RetentionActionCard } from '@/components/macro/components/RetentionActionCard';
import { MacroTimelineView } from '@/components/macro/components/MacroTimelineView';
import MacroDashboardClient from '@/components/MacroDashboardClient';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock firebase
jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

const mockSheetApartments: Record<string, DongApartment[]> = {
  여울동: [
    { name: '동탄역 롯데캐슬', dong: '여울동', txKey: 'yeoul-1' } as DongApartment,
  ],
};

const mockTxSummaryData: Record<string, AptTxSummary> = {
  '동탄역 롯데캐슬': {
    dong: '여울동',
    latestPrice: '16.5억',
    latestPriceEok: 16.5,
    avgPrice: 165000,
    txCount: 15,
  } as unknown as AptTxSummary,
};

const mockRecentTransactions = [
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

const mockMacroTrendData: DongtanMacroTrendPoint[] = [
  { name: '26.07', price: 78000, rent: 45000, volume: 150 },
];

describe('M4 GA4 Retention Funnel Telemetry Verification (All 10 Events)', () => {
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    trackEventSpy = jest.spyOn(analytics, 'trackEvent').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
  });

  // Event 1 & 2 & 3 & 4: Watchlist Bar actions
  describe('Zone 1 Telemetry: PersonalWatchlistBar', () => {
    it('tracks 1. watchlist_toggle_favorite with source="watchlist"', async () => {
      // Setup favorites in localStorage
      localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역 롯데캐슬']));

      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
          sheetApartments={mockSheetApartments}
        />
      );

      const favToggleBtn = screen.getByTestId('watchlist-fav-toggle-동탄역 롯데캐슬');
      fireEvent.click(favToggleBtn);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'watchlist_toggle_favorite',
        expect.objectContaining({
          apt_name: '동탄역 롯데캐슬',
          is_favorite: false,
          source: 'watchlist',
        })
      );
    });

    it('tracks 2. watchlist_card_click with apt_name', () => {
      localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역 롯데캐슬']));

      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
          sheetApartments={mockSheetApartments}
        />
      );

      const card = screen.getByTestId('watchlist-card-동탄역 롯데캐슬');
      fireEvent.click(card);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'watchlist_card_click',
        expect.objectContaining({
          apt_name: '동탄역 롯데캐슬',
        })
      );
    });

    it('tracks 3. watchlist_onboarding_chip_click with apt_name on cold start', async () => {
      // 0 favorites
      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
          sheetApartments={mockSheetApartments}
          favoriteCounts={{ '동탄역 롯데캐슬': 100 }}
        />
      );

      const chip = screen.getByTestId('watchlist-chip-동탄역 롯데캐슬');
      fireEvent.click(chip);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'watchlist_onboarding_chip_click',
        expect.objectContaining({
          apt_name: '동탄역 롯데캐슬',
        })
      );
    });

    it('tracks 4. delta_badge_click with delta_count', () => {
      localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역 롯데캐슬']));
      // Set last visit to 3 days ago so delta is computed
      localStorage.setItem('dview_last_visit_ts', (Date.now() - 3 * 86400000).toString());

      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
        />
      );

      const deltaBtn = screen.getByRole('button', { name: /신규 실거래/ });
      fireEvent.click(deltaBtn);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'delta_badge_click',
        expect.objectContaining({
          delta_count: expect.any(Number),
        })
      );
    });
  });

  // Event 5 & 6: RealtimeRankingBoard actions
  describe('Zone 2 Telemetry: RealtimeRankingBoard', () => {
    it('tracks 5. ranking_tab_click with tab_id', () => {
      render(
        <RealtimeRankingBoard
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
        />
      );

      const gapTab = screen.getByTestId('ranking-tab-gap');
      fireEvent.click(gapTab);

      expect(trackEventSpy).toHaveBeenCalledWith('ranking_tab_click', {
        tab_id: 'gap',
      });

      const surgeTab = screen.getByTestId('ranking-tab-surge');
      fireEvent.click(surgeTab);

      expect(trackEventSpy).toHaveBeenCalledWith('ranking_tab_click', {
        tab_id: 'surge',
      });
    });

    it('tracks 6. ranking_item_click with apt_name, rank, tab_id', () => {
      render(
        <RealtimeRankingBoard
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
        />
      );

      const rank1Item = screen.getByTestId('ranking-item-1');
      fireEvent.click(rank1Item);

      expect(trackEventSpy).toHaveBeenCalledWith('ranking_item_click', {
        apt_name: '동탄역 롯데캐슬',
        rank: 1,
        tab_id: 'high',
      });
    });
  });

  // Event 7 & 8: RetentionActionCard actions
  describe('Zone 2 Telemetry: RetentionActionCard', () => {
    it('tracks 7. push_modal_open with trigger="hero_card"', () => {
      render(
        <RetentionActionCard
          selectedAptName="동탄역 롯데캐슬"
          onOpenPushModal={jest.fn()}
        />
      );

      const pushBtn = screen.getByText('오전 7시 실거래 알림 받기').closest('button');
      fireEvent.click(pushBtn!);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'push_modal_open',
        expect.objectContaining({
          trigger: 'hero_card',
          surface: 'zone2_terminal',
          apt_name: '동탄역 롯데캐슬',
        })
      );
    });

    it('tracks 8. a2hs_modal_open with trigger="hero_card"', () => {
      render(
        <RetentionActionCard
          onOpenPushModal={jest.fn()}
          onOpenA2HSModal={jest.fn()}
        />
      );

      const a2hsBtn = screen.getByText('홈 화면에 앱 추가').closest('button');
      fireEvent.click(a2hsBtn!);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'a2hs_modal_open',
        expect.objectContaining({
          trigger: 'hero_card',
          surface: 'zone2_terminal',
        })
      );
    });
  });

  // Event 9 & 1 (timeline source): MacroTimelineView
  describe('Zone 3 Telemetry: MacroTimelineView', () => {
    it('tracks 9. timeline_segment_tab_click with segment', () => {
      render(
        <MacroTimelineView
          displayedTimelineData={[]}
          fullTimelineData={[]}
        />
      );

      const favoritesTab = screen.getByRole('button', { name: /내 관심단지/ });
      fireEvent.click(favoritesTab);

      expect(trackEventSpy).toHaveBeenCalledWith('timeline_segment_tab_click', {
        segment: 'favorites',
      });

      const newHighTab = screen.getByRole('button', { name: /신고가 경신만/ });
      fireEvent.click(newHighTab);

      expect(trackEventSpy).toHaveBeenCalledWith('timeline_segment_tab_click', {
        segment: 'new_high',
      });
    });

    it('tracks 1 (timeline source). watchlist_toggle_favorite with source="timeline"', () => {
      const onToggleFav = jest.fn();
      render(
        <MacroTimelineView
          displayedTimelineData={[
            {
              date: '09.15',
              items: [
                {
                  aptName: '동탄역 롯데캐슬',
                  displayAptName: '동탄역 롯데캐슬',
                  price: '16.5억',
                  priceWon: 165000,
                  area: '84㎡',
                  floor: 20,
                  dealType: '매매',
                  date: '09.15',
                } as any,
              ],
            },
          ]}
          onToggleFavorite={onToggleFav}
        />
      );

      const favToggleBtn = screen.getByTestId('timeline-fav-toggle-동탄역 롯데캐슬');
      fireEvent.click(favToggleBtn);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'watchlist_toggle_favorite',
        expect.objectContaining({
          apt_name: '동탄역 롯데캐슬',
          is_favorite: true,
          source: 'timeline',
        })
      );
      expect(onToggleFav).toHaveBeenCalledWith('동탄역 롯데캐슬');
    });
  });

  // Event 10: Guide card click in MacroDashboardClient (Zone 4)
  describe('Zone 4 Telemetry: Guide Card Click', () => {
    it('tracks 10. guide_card_click with guide_slug and guide_title', () => {
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
            />
          </AuthProvider>
        </SettingsProvider>
      );

      const guideCards = screen.getAllByTestId(/^guide-card-/);
      expect(guideCards.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(guideCards[0]);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'guide_card_click',
        expect.objectContaining({
          guide_slug: expect.any(String),
          guide_title: expect.any(String),
        })
      );
    });
  });
});
