import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  오산동: [
    { name: '동탄역 롯데캐슬 (테스트 특수문자)', dong: '오산동', txKey: 'os-1' } as DongApartment,
  ],
};

const mockTxSummaryData: Record<string, AptTxSummary> = {
  '동탄역 롯데캐슬 (테스트 특수문자)': {
    dong: '오산동',
    latestPrice: '16.5억',
    latestPriceEok: 16.5,
    avgPrice: 165000,
    txCount: 15,
  } as unknown as AptTxSummary,
};

const mockRecentTransactions = [
  {
    aptName: '동탄역 롯데캐슬 (테스트 특수문자)',
    txKey: 'tx-1',
    date: '2026-10-25',
    contractDate: '20261025',
    registeredDate: '2026-10-26',
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

describe('Empirical Challenger M4: 10 Telemetry Funnel Events & Edge Cases Stress Harness', () => {
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    trackEventSpy = jest.spyOn(analytics, 'trackEvent').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
  });

  describe('1. Schema Integrity & Payload Accuracy Across 10 GA4 Funnel Events', () => {
    it('Event 1: watchlist_toggle_favorite validates schema { apt_name, is_favorite, source } from watchlist', () => {
      localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역 롯데캐슬 (테스트 특수문자)']));

      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
          sheetApartments={mockSheetApartments}
        />
      );

      const favBtn = screen.getByTestId('watchlist-fav-toggle-동탄역 롯데캐슬 (테스트 특수문자)');
      fireEvent.click(favBtn);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'watchlist_toggle_favorite',
        expect.objectContaining({
          apt_name: '동탄역 롯데캐슬 (테스트 특수문자)',
          is_favorite: false,
          source: 'watchlist',
        })
      );
    });

    it('Event 1 (Timeline Source): watchlist_toggle_favorite validates schema from timeline', () => {
      const onToggle = jest.fn();
      render(
        <MacroTimelineView
          displayedTimelineData={[
            {
              date: '2026-10-25',
              items: [
                {
                  aptName: '동탄역 롯데캐슬 (테스트 특수문자)',
                  displayAptName: '동탄역 롯데캐슬 (테스트 특수문자)',
                  price: '16.5억',
                  priceWon: 165000,
                  area: '84㎡',
                  floor: 20,
                  dealType: '매매',
                  date: '2026-10-25',
                } as any,
              ],
            },
          ]}
          onToggleFavorite={onToggle}
        />
      );

      const favBtn = screen.getByTestId('timeline-fav-toggle-동탄역 롯데캐슬 (테스트 특수문자)');
      fireEvent.click(favBtn);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'watchlist_toggle_favorite',
        expect.objectContaining({
          apt_name: '동탄역 롯데캐슬 (테스트 특수문자)',
          is_favorite: true,
          source: 'timeline',
        })
      );
      expect(onToggle).toHaveBeenCalledWith('동탄역 롯데캐슬 (테스트 특수문자)');
    });

    it('Event 2: watchlist_card_click validates schema { apt_name }', () => {
      localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역 롯데캐슬 (테스트 특수문자)']));

      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
          sheetApartments={mockSheetApartments}
        />
      );

      const card = screen.getByTestId('watchlist-card-동탄역 롯데캐슬 (테스트 특수문자)');
      fireEvent.click(card);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'watchlist_card_click',
        expect.objectContaining({
          apt_name: '동탄역 롯데캐슬 (테스트 특수문자)',
        })
      );
    });

    it('Event 3: watchlist_onboarding_chip_click validates schema { apt_name } on cold-start', () => {
      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
          sheetApartments={mockSheetApartments}
          favoriteCounts={{ '동탄역 롯데캐슬 (테스트 특수문자)': 50 }}
        />
      );

      const chip = screen.getByTestId('watchlist-chip-동탄역 롯데캐슬 (테스트 특수문자)');
      fireEvent.click(chip);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'watchlist_onboarding_chip_click',
        expect.objectContaining({
          apt_name: '동탄역 롯데캐슬 (테스트 특수문자)',
        })
      );
    });

    it('Event 4: delta_badge_click validates schema { delta_count }', () => {
      localStorage.setItem('dview_last_visit_ts', (Date.now() - 24 * 3600 * 1000).toString());

      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
        />
      );

      const badge = screen.getByRole('button', { name: /신규 실거래/ });
      fireEvent.click(badge);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'delta_badge_click',
        expect.objectContaining({
          delta_count: expect.any(Number),
        })
      );
    });

    it('Event 5: ranking_tab_click validates schema { tab_id } across high, gap, surge', () => {
      render(
        <RealtimeRankingBoard
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
        />
      );

      const gapTab = screen.getByTestId('ranking-tab-gap');
      fireEvent.click(gapTab);
      expect(trackEventSpy).toHaveBeenCalledWith('ranking_tab_click', { tab_id: 'gap' });

      const surgeTab = screen.getByTestId('ranking-tab-surge');
      fireEvent.click(surgeTab);
      expect(trackEventSpy).toHaveBeenCalledWith('ranking_tab_click', { tab_id: 'surge' });

      const highTab = screen.getByTestId('ranking-tab-high');
      fireEvent.click(highTab);
      expect(trackEventSpy).toHaveBeenCalledWith('ranking_tab_click', { tab_id: 'high' });
    });

    it('Event 6: ranking_item_click validates schema { apt_name, rank, tab_id }', () => {
      render(
        <RealtimeRankingBoard
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
        />
      );

      const item1 = screen.getByTestId('ranking-item-1');
      fireEvent.click(item1);

      expect(trackEventSpy).toHaveBeenCalledWith('ranking_item_click', {
        apt_name: '동탄역 롯데캐슬 (테스트 특수문자)',
        rank: 1,
        tab_id: 'high',
      });
    });

    it('Event 7: push_modal_open validates schema { trigger: "hero_card" } with fallback apt name', () => {
      render(
        <RetentionActionCard
          selectedAptName={undefined}
          onOpenPushModal={jest.fn()}
        />
      );

      const pushBtn = screen.getByText('오전 7시 실거래 알림 받기').closest('button');
      fireEvent.click(pushBtn!);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'push_modal_open',
        expect.objectContaining({
          trigger: 'hero_card',
          apt_name: '동탄 전체',
        })
      );
    });

    it('Event 8: a2hs_modal_open validates schema { trigger: "hero_card" }', () => {
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
        })
      );
    });

    it('Event 9: timeline_segment_tab_click validates schema { segment } across all 4 segments', () => {
      render(
        <MacroTimelineView
          displayedTimelineData={[]}
          fullTimelineData={[]}
          pyeongRankings={[]}
        />
      );

      const favTab = screen.getByTestId('timeline-segment-favorites');
      fireEvent.click(favTab);
      expect(trackEventSpy).toHaveBeenCalledWith('timeline_segment_tab_click', { segment: 'favorites' });

      const newHighTab = screen.getByTestId('timeline-segment-new-high');
      fireEvent.click(newHighTab);
      expect(trackEventSpy).toHaveBeenCalledWith('timeline_segment_tab_click', { segment: 'new_high' });

      const rankingTab = screen.getByTestId('timeline-segment-ranking');
      fireEvent.click(rankingTab);
      expect(trackEventSpy).toHaveBeenCalledWith('timeline_segment_tab_click', { segment: 'ranking' });

      const allTab = screen.getByTestId('timeline-segment-all');
      fireEvent.click(allTab);
      expect(trackEventSpy).toHaveBeenCalledWith('timeline_segment_tab_click', { segment: 'all' });
    });

    it('Event 10: guide_card_click validates schema { guide_slug, guide_title }', () => {
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
      expect(guideCards.length).toBeGreaterThan(0);

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

  describe('2. Adversarial Edge Cases & Fault Tolerance Stress Testing', () => {
    it('survives corrupted dview_last_visit_ts in localStorage without crashing', () => {
      localStorage.setItem('dview_last_visit_ts', 'CORRUPTED_STRING_VALUE_!@#$%^');

      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
        />
      );

      expect(screen.getByTestId('personal-watchlist-bar')).toBeInTheDocument();
      const badge = screen.getByRole('button', { name: /신규 실거래/ });
      fireEvent.click(badge);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'delta_badge_click',
        expect.objectContaining({
          delta_count: expect.any(Number),
        })
      );
    });

    it('safely handles future timestamp in dview_last_visit_ts by falling back to 7-day window', () => {
      const futureTs = Date.now() + 1000 * 3600 * 24 * 365; // 1 year in future
      localStorage.setItem('dview_last_visit_ts', futureTs.toString());

      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions as any}
          txSummaryData={mockTxSummaryData}
        />
      );

      expect(screen.getByTestId('personal-watchlist-bar')).toBeInTheDocument();
      // Future timestamp is guarded (parsed <= Date.now()), falling back to 7-day label
      expect(screen.getByText(/동탄 최근 7일 신규 실거래/)).toBeInTheDocument();
    });

    it('handles empty recentTransactions gracefully across all components', () => {
      render(
        <PersonalWatchlistBar
          recentTransactions={[]}
          txSummaryData={{}}
        />
      );
      expect(screen.getByTestId('personal-watchlist-bar')).toBeInTheDocument();

      render(
        <RealtimeRankingBoard
          recentTransactions={[]}
          txSummaryData={{}}
        />
      );
      expect(screen.getByTestId('realtime-ranking-board')).toBeInTheDocument();
    });

    it('handles timeline favorite toggles consecutively without state inconsistency', () => {
      const onToggle = jest.fn();
      render(
        <MacroTimelineView
          displayedTimelineData={[
            {
              date: '2026-10-25',
              items: [
                {
                  aptName: '단지A',
                  displayAptName: '단지A',
                  price: '10억',
                  priceWon: 100000,
                  area: '84㎡',
                  floor: 10,
                  dealType: '매매',
                  date: '2026-10-25',
                } as any,
                {
                  aptName: '단지B',
                  displayAptName: '단지B',
                  price: '12억',
                  priceWon: 120000,
                  area: '84㎡',
                  floor: 15,
                  dealType: '매매',
                  date: '2026-10-25',
                } as any,
              ],
            },
          ]}
          onToggleFavorite={onToggle}
        />
      );

      const favA = screen.getByTestId('timeline-fav-toggle-단지A');
      const favB = screen.getByTestId('timeline-fav-toggle-단지B');

      fireEvent.click(favA);
      fireEvent.click(favB);

      const favEvents = trackEventSpy.mock.calls.filter(
        (call) => call[0] === 'watchlist_toggle_favorite'
      );
      expect(favEvents.length).toBe(2);
      expect(favEvents[0][1]).toEqual(
        expect.objectContaining({ apt_name: '단지A', source: 'timeline' })
      );
      expect(favEvents[1][1]).toEqual(
        expect.objectContaining({ apt_name: '단지B', source: 'timeline' })
      );
    });

    it('handles null selectedAptName in RetentionActionCard without crashing', () => {
      const handleOpenPush = jest.fn();
      render(
        <RetentionActionCard
          selectedAptName={null}
          onOpenPushModal={handleOpenPush}
        />
      );

      const pushBtn = screen.getByText('오전 7시 실거래 알림 받기').closest('button');
      fireEvent.click(pushBtn!);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'push_modal_open',
        expect.objectContaining({
          trigger: 'hero_card',
          apt_name: '동탄 전체',
        })
      );
      expect(handleOpenPush).toHaveBeenCalledWith('동탄 전체');
    });
  });
});
